"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, GitFork, LockKeyhole, RefreshCw, Search, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { GitHubRepository } from "@/lib/github/repositories";

const selectedRepositoryKey = "code-investigator:selected-repository";

function getStoredRepository() {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(selectedRepositoryKey);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as GitHubRepository;
  } catch {
    window.localStorage.removeItem(selectedRepositoryKey);
    return null;
  }
}

export function RepositoryPicker({
  onRepositorySelect,
}: {
  onRepositorySelect?: (repository: GitHubRepository | null) => void;
} = {}) {
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selected, setSelected] = useState<GitHubRepository | null>(getStoredRepository);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onRepositorySelect?.(selected);
    // Notifies the parent whenever the selected repository changes, including the initial value restored from localStorage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  async function loadRepositories() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/repositories", { cache: "no-store" });
      const body = (await response.json()) as { repositories?: GitHubRepository[]; error?: string };

      if (!response.ok) throw new Error(body.error ?? "Unable to load repositories.");

      setRepositories(body.repositories ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load repositories.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // The fetch lifecycle intentionally updates loading/data/error state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadRepositories();
  }, []);

  const filteredRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return repositories;

    return repositories.filter((repository) =>
      `${repository.fullName} ${repository.description ?? ""} ${repository.language ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, repositories]);

  function selectRepository(repository: GitHubRepository) {
    setSelected(repository);
    window.localStorage.setItem(selectedRepositoryKey, JSON.stringify(repository));
  }

  return (
    <Card className="border border-white/10 bg-[#0d111b] shadow-2xl shadow-black/20">
      <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle className="text-xl text-white">Choose a repository</CardTitle>
          <CardDescription className="mt-1 text-slate-400">
            Select the codebase you want Code Investigator to investigate next.
          </CardDescription>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <label className="relative min-w-0 flex-1 sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <input
              aria-label="Search repositories"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search repositories"
              className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/50 focus:ring-2 focus:ring-cyan-300/20"
            />
          </label>
          <Button aria-label="Refresh repositories" variant="outline" size="icon" onClick={() => void loadRepositories()} disabled={isLoading} className="border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white">
            <RefreshCw className={isLoading ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {selected && (
          <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-medium tracking-wide text-cyan-300">SELECTED REPOSITORY</p>
              <p className="mt-1 truncate font-medium text-white">{selected.fullName}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">Saved locally</span>
          </div>
        )}

        {isLoading && <div className="grid gap-3 md:grid-cols-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-36 bg-white/5" />)}</div>}

        {!isLoading && error && (
          <div role="alert" className="rounded-lg border border-red-300/20 bg-red-300/[0.06] p-5 text-sm text-red-100">
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadRepositories()} className="mt-4 border-red-200/20 bg-transparent text-red-100 hover:bg-red-200/10">Try again</Button>
          </div>
        )}

        {!isLoading && !error && filteredRepositories.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 px-5 py-10 text-center text-sm text-slate-500">
            {repositories.length === 0 ? "No repositories were found for this GitHub account." : "No repositories match your search."}
          </div>
        )}

        {!isLoading && !error && filteredRepositories.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredRepositories.map((repository) => {
              const isSelected = selected?.id === repository.id;
              return (
                <button key={repository.id} type="button" onClick={() => selectRepository(repository)} className={`group rounded-xl border p-4 text-left transition-colors ${isSelected ? "border-cyan-300/50 bg-cyan-300/[0.08]" : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05]"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {repository.isPrivate ? <LockKeyhole className="size-4 shrink-0 text-amber-300" /> : <GitFork className="size-4 shrink-0 text-cyan-300" />}
                      <span className="truncate font-medium text-white">{repository.fullName}</span>
                    </div>
                    <ExternalLink className="size-3.5 shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
                  </div>
                  <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{repository.description ?? "No description provided."}</p>
                  <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                    {repository.language && <span>{repository.language}</span>}
                    <span className="flex items-center gap-1"><Star className="size-3" /> {repository.stars}</span>
                    {isSelected && <span className="ml-auto font-medium text-cyan-300">Selected</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
