import type { LlmJsonSchemaRequest, LlmProvider } from "@/lib/analysis/llm/types";

const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "qwen2.5:latest";

// Ollama's newer chat API accepts a JSON schema object as `format` for
// schema-constrained decoding. Older versions/models may ignore it, so the
// system prompt also spells out the JSON-only requirement, and the response
// is run through robust extraction below regardless of `format` support.
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return candidate;
  return candidate.slice(start, end + 1);
}

export class OllamaProvider implements LlmProvider {
  async generateJson({ system, userContent, schema }: LlmJsonSchemaRequest): Promise<string> {
    const baseUrl = (process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
    const model = process.env.MODEL_NAME || DEFAULT_MODEL;

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "cudaMalloc out of memory" issue ====
    console.log("[OLLAMA DEBUG] ---- generateJson() called ----");
    console.log("[OLLAMA DEBUG] process.env.MODEL_NAME (raw):", JSON.stringify(process.env.MODEL_NAME));
    console.log("[OLLAMA DEBUG] process.env.OLLAMA_BASE_URL (raw):", JSON.stringify(process.env.OLLAMA_BASE_URL));
    console.log("[OLLAMA DEBUG] Resolved baseUrl:", baseUrl);
    console.log("[OLLAMA DEBUG] Resolved model:", model);
    // ==== END TEMP DEBUG LOGGING ====

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "cudaMalloc out of memory" issue ====
    // Health check: what models does this Ollama instance actually report, and
    // does the configured MODEL_NAME exist among them? Best-effort only — a
    // failure here is logged but must not affect the real request below.
    try {
      const tagsResponse = await fetch(`${baseUrl}/api/tags`);
      const tagsBody = (await tagsResponse.json()) as { models?: Array<{ name: string }> };
      const installedNames = (tagsBody.models ?? []).map((m) => m.name);
      console.log("[OLLAMA DEBUG] GET /api/tags HTTP status:", tagsResponse.status);
      console.log("[OLLAMA DEBUG] Installed models:", JSON.stringify(installedNames));
      console.log("[OLLAMA DEBUG] Configured MODEL_NAME exists in installed models?", installedNames.includes(model));
    } catch (healthCheckError) {
      console.log("[OLLAMA DEBUG] /api/tags health check failed:", healthCheckError instanceof Error ? healthCheckError.message : healthCheckError);
    }
    // ==== END TEMP DEBUG LOGGING ====

    const strictSystem = `${system}\n\nRespond with ONLY valid JSON matching the required schema. Do not include any explanation, commentary, or markdown code fences — output raw JSON and nothing else.\n\nEvidence rules: do not reproduce file content yourself. Report only "startLine" and "endLine" (1-indexed, inclusive) pointing at where the evidence appears in the referenced file — the system extracts the exact text from those line numbers for you. Prefer ranges under 5 lines. If no specific line range applies, set both to null rather than guessing.`;
    const requestBody = {
      model,
      messages: [
        { role: "system", content: strictSystem },
        { role: "user", content: userContent },
      ],
      format: schema,
      stream: false,
      // Deterministic extraction task — randomness only increases the odds of the model
      // drifting from the supplied ids/line-ranges toward its own invented content.
      options: { temperature: 0 },
    };

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "cudaMalloc out of memory" issue ====
    console.log("[OLLAMA DEBUG] Exact request body sent to POST /api/chat:");
    console.log(JSON.stringify(requestBody, null, 2));
    // ==== END TEMP DEBUG LOGGING ====

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      throw new Error(`Unable to reach Ollama at ${baseUrl}. Is it running? (${error instanceof Error ? error.message : "unknown error"})`);
    }

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "cudaMalloc out of memory" issue ====
    console.log("[OLLAMA DEBUG] POST /api/chat full HTTP status:", response.status, response.statusText);
    // ==== END TEMP DEBUG LOGGING ====

    const rawResponseText = await response.text();

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "cudaMalloc out of memory" issue ====
    console.log("[OLLAMA DEBUG] Complete raw response body from Ollama (before any parsing):");
    console.log(rawResponseText);
    // ==== END TEMP DEBUG LOGGING ====

    if (!response.ok) {
      throw new Error(`Ollama request failed (${response.status}): ${rawResponseText || response.statusText}`);
    }

    const body = JSON.parse(rawResponseText) as { message?: { content?: string } };

    const content = body.message?.content;
    if (!content) throw new Error("Ollama returned an empty investigation.");

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "malformed JSON" issue ====
    console.log("[OLLAMA DEBUG] Raw message content before extraction:");
    console.log(content);
    // ==== END TEMP DEBUG LOGGING ====

    const jsonText = extractJson(content);
    if (!jsonText) throw new Error("Ollama returned no JSON content.");

    // ==== TEMP DEBUG LOGGING — remove after diagnosing "malformed JSON" issue ====
    console.log("[OLLAMA DEBUG] Extracted JSON string after extraction:");
    console.log(jsonText);
    // ==== END TEMP DEBUG LOGGING ====

    return jsonText;
  }
}
