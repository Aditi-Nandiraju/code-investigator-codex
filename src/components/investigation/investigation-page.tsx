"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FolderGit2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IssueInput } from "@/components/investigation/issue-input";
import { AnalysisStatus, type InvestigationState } from "@/components/investigation/analysis-status";
import type { TimelineStep } from "@/components/investigation/investigation-timeline";
import { parseIssueUrl } from "@/lib/github/issue-url";

type Repository = { fullName: string; name: string; id: number };
type Issue = { number: number; title: string; body: string | null };
const repositoryKey = "code-investigator:selected-repository";
const POLL_INTERVAL_MS = 2000;

function getStoredRepository(): Repository | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = window.localStorage.getItem(repositoryKey);
    return saved ? JSON.parse(saved) as Repository : null;
  } catch { return null; }
}

export function InvestigationPage() {
  const router = useRouter();
  const [repository] = useState<Repository | null>(getStoredRepository);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<InvestigationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<TimelineStep[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const submittingRef = useRef(false);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function start() {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setError(null);
    setState("validating");

    try {
      const parsed = parseIssueUrl(url);
      if (!repository) { setError("Select a repository before starting an investigation."); setState("failed"); return; }
      if (!parsed || parsed.owner.toLowerCase() !== repository.fullName.split("/")[0].toLowerCase() || parsed.repo.toLowerCase() !== repository.name.toLowerCase()) {
        setError("Paste a valid issue URL from the selected repository.");
        setState("failed");
        return;
      }

      const issueResponse = await fetch(`/api/issues?owner=${encodeURIComponent(parsed.owner)}&repo=${encodeURIComponent(parsed.repo)}&number=${parsed.number}`, { cache: "no-store" });
      const issueBody = await issueResponse.json() as { issues?: Issue[]; error?: string };
      if (!activeRef.current) return;
      if (!issueResponse.ok || !issueBody.issues?.[0]) throw new Error(issueBody.error ?? "That issue could not be loaded.");

      setState("starting");
      const response = await fetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoOwner: parsed.owner, repoName: parsed.repo, issueNumber: issueBody.issues[0].number, issueTitle: issueBody.issues[0].title, issueBody: issueBody.issues[0].body ?? "" }),
      });
      const body = await response.json() as { analysis?: { id: string; steps?: TimelineStep[] }; error?: string };
      if (!activeRef.current) return;
      if (!response.ok || !body.analysis) throw new Error(body.error ?? "Unable to start analysis.");

      const analysisId = body.analysis.id;
      setSteps(body.analysis.steps ?? []);
      setState("running");

      const poll = async () => {
        try {
          const statusResponse = await fetch(`/api/analyses/${analysisId}`, { cache: "no-store" });
          const status = await statusResponse.json() as { analysis?: { status: string; steps: TimelineStep[]; caseSummary?: { error?: string } }; error?: string };
          if (!activeRef.current) return;
          if (!statusResponse.ok || !status.analysis) throw new Error(status.error ?? "Unable to read analysis status.");

          setSteps(status.analysis.steps ?? []);

          if (status.analysis.status === "COMPLETE") {
            stopPolling();
            router.push(`/analyses/${analysisId}`);
            return;
          }
          if (status.analysis.status === "FAILED") {
            stopPolling();
            setError(status.analysis.caseSummary?.error ?? "The investigation failed.");
            setState("failed");
          }
        } catch (pollError) {
          if (!activeRef.current) return;
          stopPolling();
          setError(pollError instanceof Error ? pollError.message : "Unable to read analysis status.");
          setState("failed");
        }
      };

      await poll();
      if (activeRef.current && !pollRef.current) {
        pollRef.current = setInterval(() => void poll(), POLL_INTERVAL_MS);
      }
    } catch (startError) {
      if (!activeRef.current) return;
      stopPolling();
      setError(startError instanceof Error ? startError.message : "Unable to start investigation.");
      setState("failed");
    } finally {
      submittingRef.current = false;
    }
  }

  function reset() {
    stopPolling();
    setState("idle");
    setError(null);
    setSteps([]);
  }

  return (
    <main className="min-h-screen bg-[#07090f] px-6 py-10 text-slate-100 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="size-4" /> Back to dashboard
        </Link>
        <div className="mt-10">
          <p className="text-sm font-medium text-cyan-300">NEW INVESTIGATION</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">Understand the issue before changing code.</h1>
          <p className="mt-4 text-slate-400">Give Code Investigator a selected repository and a GitHub issue. It will build an evidence-backed investigation.</p>
        </div>
        <Card className="mt-8 border border-white/10 bg-[#0d111b]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FolderGit2 className="size-5 text-cyan-300" /> Selected repository
            </CardTitle>
          </CardHeader>
          <CardContent>
            {repository ? (
              <p className="font-medium text-cyan-100">{repository.fullName}</p>
            ) : (
              <div className="rounded-lg border border-dashed border-white/10 p-4 text-sm text-slate-500">No repository selected. Return to the dashboard and choose one first.</div>
            )}
          </CardContent>
        </Card>
        <Card className="mt-5 border border-white/10 bg-[#0d111b]">
          <CardContent className="p-5">
            <IssueInput value={url} onChange={setUrl} onSubmit={() => void start()} disabled={state === "validating" || state === "starting" || state === "running"} />
          </CardContent>
        </Card>
        <AnalysisStatus state={state} error={error} steps={steps} />
        {state !== "idle" && (
          <Button variant="ghost" className="mt-5 text-slate-400" onClick={reset}>Reset</Button>
        )}
      </div>
    </main>
  );
}
