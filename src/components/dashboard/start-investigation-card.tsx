"use client";

import { useState } from "react";
import Link from "next/link";
import { GitBranch, Plus } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RepositoryPicker } from "@/components/dashboard/repository-picker";
import { cn } from "@/lib/utils";
import type { GitHubRepository } from "@/lib/github/repositories";

export function StartInvestigationCard() {
  const [repository, setRepository] = useState<GitHubRepository | null>(null);

  return (
    <div className="mt-10">
      <RepositoryPicker onRepositorySelect={setRepository} />

      <Card className="mt-5 border border-white/10 bg-[#0d111b] shadow-2xl shadow-black/20">
        <CardHeader>
          <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300">
            <GitBranch className="size-5" />
          </div>
          <CardTitle className="text-xl text-white">Start an investigation</CardTitle>
          <CardDescription className="max-w-md leading-6 text-slate-400">
            {repository
              ? `Investigate an issue in ${repository.fullName}.`
              : "Select a repository above to begin."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {repository ? (
            <Link
              href="/dashboard/investigate"
              className={cn(buttonVariants(), "mt-2 bg-cyan-300 text-slate-950 hover:bg-cyan-200")}
            >
              <Plus data-icon="inline-start" /> New investigation
            </Link>
          ) : (
            <Button disabled className="mt-2 bg-cyan-300 text-slate-950 disabled:opacity-70">
              <Plus data-icon="inline-start" /> New investigation
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
