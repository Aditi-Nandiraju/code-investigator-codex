import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CircleAlert, FileCode2, ListChecks, Search } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { InvestigationTimeline } from "@/components/investigation/investigation-timeline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ImplementationPlanStep = { step: number; title: string; detail: string; files: string[] };
type CaseSummary = { issueSummary?: string; error?: string };

const statusBadgeStyles: Record<string, string> = {
  COMPLETE: "bg-emerald-300/10 text-emerald-200",
  FAILED: "bg-red-300/10 text-red-200",
  RUNNING: "bg-cyan-300/10 text-cyan-200",
  PENDING: "bg-white/10 text-slate-300",
};

export default async function AnalysisPage({ params }: { params: Promise<{ analysisId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const { analysisId } = await params;
  const analysis = await prisma.analysis.findFirst({
    where: { id: analysisId, userId: session.user.id },
    include: { steps: { orderBy: { order: "asc" } }, findings: true },
  });

  if (!analysis) notFound();

  const caseSummary = analysis.caseSummary as unknown as CaseSummary | null;
  const plan = (analysis.plan as unknown as ImplementationPlanStep[] | null) ?? [];
  const findings = [...analysis.findings].sort((a, b) => b.confidence - a.confidence);

  return (
    <main className="min-h-screen bg-[#07090f] text-slate-100">
      <header className="border-b border-white/10 bg-[#0a0d15]/80 px-6 py-4 backdrop-blur lg:px-10">
        <div className="mx-auto max-w-5xl">
          <Link href="/dashboard" className="flex w-fit items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-cyan-300">
              {analysis.repoOwner}/{analysis.repoName} #{analysis.issueNumber}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">{analysis.issueTitle}</h1>
          </div>
          <Badge className={statusBadgeStyles[analysis.status] ?? statusBadgeStyles.PENDING}>{analysis.status}</Badge>
        </div>

        {analysis.status === "FAILED" && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-lg border border-red-300/20 bg-red-300/[0.06] p-5 text-sm text-red-100">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>{caseSummary?.error ?? "This investigation failed."}</p>
          </div>
        )}

        {(analysis.status === "PENDING" || analysis.status === "RUNNING") && (
          <div className="mt-6 rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-5 text-sm text-cyan-100">
            This investigation is still in progress. Refresh this page to check for updates.
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="border border-white/10 bg-[#0d111b]">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300">
                  <Search className="size-4" />
                </div>
                <CardTitle className="text-white">Issue summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-slate-400">
                  {caseSummary?.issueSummary ?? "No summary is available for this investigation yet."}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#0d111b]">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300">
                  <FileCode2 className="size-4" />
                </div>
                <CardTitle className="text-white">Findings</CardTitle>
                <CardDescription className="text-slate-400">
                  {findings.length
                    ? `${findings.length} file${findings.length === 1 ? "" : "s"} with evidence-backed relevance.`
                    : "No relevant files were identified."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {findings.map((finding) => (
                  <div key={finding.id} className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate font-mono text-sm text-white">{finding.filePath}</span>
                      <div className="flex items-center gap-2">
                        {finding.riskLevel && <Badge variant="outline">{finding.riskLevel} risk</Badge>}
                        <Badge className="bg-cyan-300/10 text-cyan-200">{Math.round(finding.confidence * 100)}% confidence</Badge>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{finding.reasoning}</p>
                    {finding.matchedTerms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {finding.matchedTerms.map((term) => (
                          <span key={term} className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">{term}</span>
                        ))}
                      </div>
                    )}
                    {finding.snippet && (
                      <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-white/8 bg-[#090c13] p-3 text-xs leading-5 text-slate-300">
                        <code>{finding.snippet}</code>
                      </pre>
                    )}
                    {(finding.snippetStartLine !== null || finding.snippetEndLine !== null) && (
                      <p className="mt-2 text-xs text-slate-500">
                        Lines {finding.snippetStartLine ?? "?"}–{finding.snippetEndLine ?? "?"}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border border-white/10 bg-[#0d111b]">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-cyan-300/10 text-cyan-300">
                  <ListChecks className="size-4" />
                </div>
                <CardTitle className="text-white">Implementation plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.length === 0 && (
                  <p className="text-sm text-slate-500">No implementation plan is available for this investigation.</p>
                )}
                {plan.map((step) => (
                  <div key={step.step} className="rounded-lg border border-white/8 bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-white">
                      Step {step.step}: {step.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</p>
                    {step.files.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {step.files.map((file) => (
                          <span key={file} className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs text-slate-300">{file}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="border border-white/10 bg-[#0d111b]">
              <CardHeader>
                <CardTitle className="text-white">Investigation timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <InvestigationTimeline steps={analysis.steps} />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
