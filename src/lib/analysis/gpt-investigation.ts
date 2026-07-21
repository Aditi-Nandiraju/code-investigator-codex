import type { RepositoryContext, RepositoryTreeEntry } from "@/lib/github/repository-context";
import type { CreateAnalysisInput } from "@/lib/analysis/engine";
import { getLlmProvider } from "@/lib/analysis/llm";
import { extractMentionedFiles } from "@/lib/analysis/mentioned-files";

export type InvestigationResult = {
  issueSummary: string;
  relevantFiles: Array<{ path: string; confidence: number; evidence: Array<{ snippet: string; matchedTerms: string[]; reasoning: string; startLine: number | null; endLine: number | null }>; reasoning: string }>;
  implementationPlan: Array<{ step: number; title: string; detail: string; files: string[] }>;
};

// What the model actually returns: no copied snippet text, and no file path string either —
// just a numeric fileId chosen from the indexed list we hand it, plus a line-range pointer.
// Picking an integer from a small closed set is far more reliable for a local model than
// reproducing an exact path string, which is where the hallucinations were coming from.
type RawInvestigationResult = {
  issueSummary: string;
  relevantFiles: Array<{ fileId: number; confidence: number; evidence: Array<{ matchedTerms: string[]; reasoning: string; startLine: number | null; endLine: number | null }>; reasoning: string }>;
  implementationPlan: Array<{ step: number; title: string; detail: string; fileIds: number[] }>;
};

const schema = {
  type: "object", additionalProperties: false, required: ["issueSummary", "relevantFiles", "implementationPlan"],
  properties: {
    issueSummary: { type: "string" },
    relevantFiles: { type: "array", items: { type: "object", additionalProperties: false, required: ["fileId", "confidence", "reasoning", "evidence"], properties: {
      fileId: { type: "integer", minimum: 0 }, confidence: { type: "number", minimum: 0, maximum: 1 }, reasoning: { type: "string" }, evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["matchedTerms", "reasoning", "startLine", "endLine"], properties: { matchedTerms: { type: "array", items: { type: "string" } }, reasoning: { type: "string" }, startLine: { type: ["integer", "null"] }, endLine: { type: ["integer", "null"] } } } },
    } } },
    implementationPlan: { type: "array", items: { type: "object", additionalProperties: false, required: ["step", "title", "detail", "fileIds"], properties: { step: { type: "integer" }, title: { type: "string" }, detail: { type: "string" }, fileIds: { type: "array", items: { type: "integer", minimum: 0 } } } } },
  },
} as const;

function extractSnippet(content: string, startLine: number | null, endLine: number | null): string {
  if (startLine === null || endLine === null || !content) return "";
  const lines = content.split("\n");
  return lines.slice(Math.max(0, startLine - 1), endLine).join("\n");
}

function validateResult(value: unknown, fileList: RepositoryTreeEntry[]): InvestigationResult {
  if (!value || typeof value !== "object") throw new Error("GPT returned an invalid investigation.");
  const result = value as RawInvestigationResult;
  const isValidFileId = (id: unknown): id is number => typeof id === "number" && Number.isInteger(id) && id >= 0 && id < fileList.length;
  if (typeof result.issueSummary !== "string" || !Array.isArray(result.relevantFiles) || !Array.isArray(result.implementationPlan)) throw new Error("GPT returned an incomplete investigation.");
  for (const finding of result.relevantFiles) {
    // ==== TEMP DEBUG LOGGING — remove after diagnosing "unsupported file reference" issue ====
    if (!isValidFileId(finding.fileId)) {
      console.log("[FILE REFERENCE DEBUG] fileId returned by model:", JSON.stringify(finding.fileId));
      console.log("[FILE REFERENCE DEBUG] valid fileId range: 0 to", fileList.length - 1);
      console.log("[FILE REFERENCE DEBUG] indexed file list:", JSON.stringify(fileList.map((file, id) => ({ id, path: file.path })), null, 2));
    }
    // ==== END TEMP DEBUG LOGGING ====
    // Ollama's schema-constrained decoding enforces field shape but not numeric min/max, so
    // confidence occasionally comes back as a percentage (e.g. 100) instead of a 0-1 decimal.
    // Coerce only that narrow, observed failure mode — anything still out of [0,1] after this still throws.
    if (typeof finding.confidence === "number" && finding.confidence > 1 && finding.confidence <= 100) {
      const original = finding.confidence;
      finding.confidence = finding.confidence / 100;
      console.warn(`[OLLAMA] Coerced confidence ${original} -> ${finding.confidence} for fileId ${finding.fileId} (returned as a percentage instead of a 0-1 decimal).`);
    }
    if (!isValidFileId(finding.fileId) || typeof finding.confidence !== "number" || finding.confidence < 0 || finding.confidence > 1 || !Array.isArray(finding.evidence)) throw new Error("GPT returned an unsupported file reference.");
    const content = fileList[finding.fileId].content ?? "";
    const lineCount = content ? content.split("\n").length : 0;
    for (const evidence of finding.evidence) {
      if ((evidence.startLine !== null && (evidence.startLine < 1 || evidence.startLine > lineCount)) || (evidence.endLine !== null && (evidence.endLine < 1 || evidence.endLine > lineCount))) throw new Error("GPT returned an invalid evidence line range.");
      // ==== TEMP DEBUG LOGGING — remove after diagnosing "unsupported matched term" issue ====
      const invalidTerms = evidence.matchedTerms.filter((term) => typeof term !== "string" || !content.toLowerCase().includes(term.toLowerCase()));
      if (invalidTerms.length > 0) {
        console.log("[MATCHED TERM DEBUG] fileId:", finding.fileId, "path:", fileList[finding.fileId].path);
        console.log("[MATCHED TERM DEBUG] all matchedTerms returned by model:", JSON.stringify(evidence.matchedTerms));
        console.log("[MATCHED TERM DEBUG] term(s) that failed content.toLowerCase().includes(term.toLowerCase()):", JSON.stringify(invalidTerms));
        console.log("[MATCHED TERM DEBUG] reported startLine/endLine:", evidence.startLine, evidence.endLine);
        console.log("[MATCHED TERM DEBUG] file content length:", content.length);
      }
      // ==== END TEMP DEBUG LOGGING ====
      if (!evidence.matchedTerms.every((term) => typeof term === "string" && content.toLowerCase().includes(term.toLowerCase()))) throw new Error("GPT returned an unsupported matched term.");
    }
  }
  result.implementationPlan = result.implementationPlan.map((step) => ({
    ...step,
    fileIds: step.fileIds.filter((id) => {
      const valid = isValidFileId(id);
      if (!valid) console.warn(`[PLAN SANITIZE] Dropped hallucinated fileId ${JSON.stringify(id)} from step ${step.step} ("${step.title}") — not a valid index into the supplied repository file list.`);
      return valid;
    }),
  }));

  return {
    issueSummary: result.issueSummary,
    implementationPlan: result.implementationPlan.map((step) => ({
      step: step.step,
      title: step.title,
      detail: step.detail,
      files: step.fileIds.map((id) => fileList[id].path),
    })),
    relevantFiles: result.relevantFiles.map((finding) => {
      const file = fileList[finding.fileId];
      const content = file.content ?? "";
      return {
        path: file.path,
        confidence: finding.confidence,
        reasoning: finding.reasoning,
        evidence: finding.evidence.map((evidence) => ({
          snippet: extractSnippet(content, evidence.startLine, evidence.endLine),
          matchedTerms: evidence.matchedTerms,
          reasoning: evidence.reasoning,
          startLine: evidence.startLine,
          endLine: evidence.endLine,
        })),
      };
    }),
  };
}

function buildSystemPrompt(usingMentionedFiles: boolean): string {
  const base =
    "You are Code Investigator's explainable software investigation engine. Use only the supplied issue and repository context. Never infer or invent code, files, behavior, or evidence. " +
    "Each file in the supplied repository list has a numeric \"id\". Reference files ONLY by that integer id — relevantFiles[].fileId and implementationPlan[].fileIds must be ids copied exactly from the supplied file list. Never invent an id, and never reference a file by its path string. " +
    "Do not reproduce or paraphrase file content yourself. For each piece of evidence, report only the exact startLine and endLine (1-indexed, inclusive) in the referenced file where the evidence appears — the system will extract the exact text from those line numbers on your behalf. If no specific line range applies, set startLine and endLine to null. " +
    "confidence must be a decimal number between 0 and 1 (for example 0.8) — never a percentage or whole number like 80 or 100.";

  if (usingMentionedFiles) {
    return (
      base +
      " The repository file list below is not the full repository — it has already been narrowed down to exactly the files the issue explicitly names. You do not need to decide which files are relevant; that has already been decided. " +
      "Produce exactly one relevantFiles entry for every fileId in the supplied list — do not omit any, and do not add any fileId outside this list. Your job for each one is only to explain why it's relevant and to locate supporting evidence within it."
    );
  }

  return base + " Select at most 12 files.";
}

export async function generateInvestigation(input: CreateAnalysisInput, context: RepositoryContext) {
  const mentionedFiles = extractMentionedFiles(`${input.issueTitle}\n\n${input.issueBody}`, context.files);
  const usingMentionedFiles = mentionedFiles.length > 0;
  // The backend is the single source of truth for which files are relevant whenever the issue
  // names them explicitly — in that case only those files (not the whole repo) go into the
  // prompt, so the model has nothing else to reference and can't hallucinate a different one.
  const activeFiles = usingMentionedFiles ? mentionedFiles : context.files;

  const contextPayload = activeFiles.map(({ path, content, size, sha }, id) => ({ id, path, size, sha, content: content ?? "[content unavailable]" }));
  const provider = getLlmProvider();
  const outputText = await provider.generateJson({
    system: buildSystemPrompt(usingMentionedFiles),
    userContent: JSON.stringify({ issue: { number: input.issueNumber, title: input.issueTitle, body: input.issueBody }, repository: { metadata: context.metadata, files: contextPayload } }),
    schemaName: "code_investigator_investigation",
    schema,
  });
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    // ==== TEMP DEBUG LOGGING — remove after diagnosing "malformed JSON" issue ====
    console.log("[OLLAMA DEBUG] JSON.parse() error:");
    console.log(error);
    // ==== END TEMP DEBUG LOGGING ====
    throw new Error("The model returned malformed JSON.");
  }
  let investigation: InvestigationResult;
  try {
    investigation = validateResult(parsed, activeFiles);
  } catch (error) {
    // ==== TEMP DEBUG LOGGING — remove after diagnosing "malformed JSON" issue ====
    console.log("[OLLAMA DEBUG] validateResult() rejected the parsed result:");
    console.log(error);
    // ==== END TEMP DEBUG LOGGING ====
    throw error;
  }

  // Guarantee coverage regardless of model compliance: every explicitly-mentioned file must
  // appear in the result, even if the model's response omitted one.
  if (usingMentionedFiles) {
    const coveredPaths = new Set(investigation.relevantFiles.map((finding) => finding.path));
    for (const file of mentionedFiles) {
      if (!coveredPaths.has(file.path)) {
        investigation.relevantFiles.push({
          path: file.path,
          confidence: 1,
          reasoning: "This file was explicitly referenced in the issue text.",
          evidence: [],
        });
      }
    }
  }

  return investigation;
}
