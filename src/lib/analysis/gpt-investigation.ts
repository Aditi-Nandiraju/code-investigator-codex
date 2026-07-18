import OpenAI from "openai";

import type { RepositoryContext } from "@/lib/github/repository-context";
import type { CreateAnalysisInput } from "@/lib/analysis/engine";

export type InvestigationResult = {
  issueSummary: string;
  relevantFiles: Array<{ path: string; confidence: number; evidence: Array<{ snippet: string; matchedTerms: string[]; reasoning: string; startLine: number | null; endLine: number | null }>; reasoning: string }>;
  implementationPlan: Array<{ step: number; title: string; detail: string; files: string[] }>;
};

const schema = {
  type: "object", additionalProperties: false, required: ["issueSummary", "relevantFiles", "implementationPlan"],
  properties: {
    issueSummary: { type: "string" },
    relevantFiles: { type: "array", items: { type: "object", additionalProperties: false, required: ["path", "confidence", "reasoning", "evidence"], properties: {
      path: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 }, reasoning: { type: "string" }, evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["snippet", "matchedTerms", "reasoning", "startLine", "endLine"], properties: { snippet: { type: "string" }, matchedTerms: { type: "array", items: { type: "string" } }, reasoning: { type: "string" }, startLine: { type: ["integer", "null"] }, endLine: { type: ["integer", "null"] } } } },
    } } },
    implementationPlan: { type: "array", items: { type: "object", additionalProperties: false, required: ["step", "title", "detail", "files"], properties: { step: { type: "integer" }, title: { type: "string" }, detail: { type: "string" }, files: { type: "array", items: { type: "string" } } } } },
  },
} as const;

function validateResult(value: unknown, context: RepositoryContext): InvestigationResult {
  if (!value || typeof value !== "object") throw new Error("GPT returned an invalid investigation.");
  const result = value as InvestigationResult;
  const knownFiles = new Map(context.files.map((file) => [file.path, file.content ?? ""]));
  if (typeof result.issueSummary !== "string" || !Array.isArray(result.relevantFiles) || !Array.isArray(result.implementationPlan)) throw new Error("GPT returned an incomplete investigation.");
  for (const finding of result.relevantFiles) {
    if (!knownFiles.has(finding.path) || typeof finding.confidence !== "number" || finding.confidence < 0 || finding.confidence > 1 || !Array.isArray(finding.evidence)) throw new Error("GPT returned an unsupported file reference.");
    const content = knownFiles.get(finding.path) ?? "";
    for (const evidence of finding.evidence) {
      if (typeof evidence.snippet !== "string" || (evidence.snippet && (!content || !content.includes(evidence.snippet)))) throw new Error("GPT returned evidence outside the supplied repository context.");
      if (!evidence.matchedTerms.every((term) => typeof term === "string" && content.toLowerCase().includes(term.toLowerCase()))) throw new Error("GPT returned an unsupported matched term.");
      const lineCount = content ? content.split("\n").length : 0;
      if ((evidence.startLine !== null && (evidence.startLine < 1 || evidence.startLine > lineCount)) || (evidence.endLine !== null && (evidence.endLine < 1 || evidence.endLine > lineCount))) throw new Error("GPT returned an invalid evidence line range.");
    }
  }
  for (const step of result.implementationPlan) if (!step.files.every((file) => knownFiles.has(file))) throw new Error("GPT plan referenced an unknown file.");
  return result;
}

export async function generateInvestigation(input: CreateAnalysisInput, context: RepositoryContext) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY must be configured to run an investigation.");
  const client = new OpenAI({ apiKey });
  const contextPayload = context.files.map(({ path, content, size, sha }) => ({ path, size, sha, content: content ?? "[content unavailable]" }));
  const response = await client.responses.create({
    model: "gpt-5.6",
    input: [
      { role: "system", content: "You are Code Investigator's explainable software investigation engine. Use only the supplied issue and repository context. Never infer or invent code, files, behavior, or evidence. Select at most 12 files. Every evidence snippet must be copied exactly from the supplied file content. If evidence is unavailable, use an empty snippet and explain that limitation." },
      { role: "user", content: JSON.stringify({ issue: { number: input.issueNumber, title: input.issueTitle, body: input.issueBody }, repository: { metadata: context.metadata, files: contextPayload } }) },
    ],
    text: { format: { type: "json_schema", name: "code_investigator_investigation", strict: true, schema } },
  });
  if (!response.output_text) throw new Error("GPT returned an empty investigation.");
  let parsed: unknown;
  try { parsed = JSON.parse(response.output_text); } catch { throw new Error("GPT returned malformed JSON."); }
  return validateResult(parsed, context);
}
