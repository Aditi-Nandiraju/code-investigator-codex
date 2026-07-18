import { AnalysisStatus, StepStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { buildRepositoryContext } from "@/lib/github/repository-context";
import { generateInvestigation } from "@/lib/analysis/gpt-investigation";

export type CreateAnalysisInput = { repoOwner: string; repoName: string; issueNumber: number; issueTitle: string; issueBody: string };

export async function runAnalysis(userId: string, input: CreateAnalysisInput) {
  const analysis = await prisma.analysis.create({ data: { ...input, userId, status: AnalysisStatus.PENDING } });
  await prisma.investigationStep.createMany({ data: [
    { analysisId: analysis.id, order: 1, label: "Fetch repository tree" },
    { analysisId: analysis.id, order: 2, label: "Filter repository context" },
    { analysisId: analysis.id, order: 3, label: "Prepare investigation context" },
  ] });

  try {
    await prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.RUNNING } });
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, order: 1 }, data: { status: StepStatus.ACTIVE, startedAt: new Date() } });
    const context = await buildRepositoryContext(userId, input.repoOwner, input.repoName);
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, order: 1 }, data: { status: StepStatus.DONE, completedAt: new Date(), detail: `${context.tree.length} tree entries fetched.` } });
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, order: 2 }, data: { status: StepStatus.DONE, completedAt: new Date(), detail: `${context.files.length} source files retained after filtering.` } });
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, order: 3 }, data: { status: StepStatus.ACTIVE, startedAt: new Date() } });
    const investigation = await generateInvestigation(input, context);
    await prisma.finding.createMany({ data: investigation.relevantFiles.map((finding) => ({
      analysisId: analysis.id,
      filePath: finding.path,
      confidence: finding.confidence,
      reasoning: finding.reasoning,
      matchedTerms: [...new Set(finding.evidence.flatMap((evidence) => evidence.matchedTerms))],
      snippet: finding.evidence.map((evidence) => evidence.snippet).filter(Boolean).join("\n\n") || null,
      snippetStartLine: finding.evidence.find((evidence) => evidence.startLine !== null)?.startLine ?? null,
      snippetEndLine: [...finding.evidence].reverse().find((evidence) => evidence.endLine !== null)?.endLine ?? null,
      impactedBy: [],
    })) });
    const completed = await prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.COMPLETE, caseSummary: { issueSummary: investigation.issueSummary, repository: context.metadata }, plan: investigation.implementationPlan } });
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, order: 3 }, data: { status: StepStatus.DONE, completedAt: new Date(), detail: "Repository context is ready for the analysis stage." } });
    return completed;
  } catch (error) {
    await prisma.analysis.update({ where: { id: analysis.id }, data: { status: AnalysisStatus.FAILED, caseSummary: { error: error instanceof Error ? error.message : "Analysis failed." } } });
    await prisma.investigationStep.updateMany({ where: { analysisId: analysis.id, status: { in: [StepStatus.PENDING, StepStatus.ACTIVE] } }, data: { status: StepStatus.FAILED, detail: "Repository context could not be prepared." } });
    throw error;
  }
}
