import "dotenv/config";

import { OllamaProvider } from "@/lib/analysis/llm/ollama-provider";

const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/$/, "");
const model = process.env.MODEL_NAME || "qwen2.5:latest";

const testSchema = {
  type: "object",
  additionalProperties: false,
  required: ["greeting", "number"],
  properties: {
    greeting: { type: "string" },
    number: { type: "integer" },
  },
} as const;

const systemPrompt = "You are a JSON-only test assistant.";
const userPrompt = 'Return a JSON object with a friendly "greeting" (string) and a "number" field set to 42.';

async function main() {
  console.log("=== Ollama provider smoke test ===");
  console.log("OLLAMA_BASE_URL:", baseUrl);
  console.log("MODEL_NAME:", model);
  console.log();

  // Stage 1: raw wire call, so you can see exactly what Ollama sends back
  // before the provider's extraction logic touches it.
  console.log("--- Stage 1: raw POST /api/chat ---");
  try {
    const rawResponse = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${systemPrompt}\n\nRespond with ONLY valid JSON matching the required schema. Do not include any explanation, commentary, or markdown code fences — output raw JSON and nothing else.`,
          },
          { role: "user", content: userPrompt },
        ],
        format: testSchema,
        stream: false,
      }),
    });

    console.log(`Connection: succeeded (HTTP ${rawResponse.status})`);
    const rawBody = await rawResponse.text();
    console.log("Raw response body:");
    console.log(rawBody);
    console.log();
  } catch (error) {
    console.log("Connection: FAILED");
    console.log(" ", error instanceof Error ? error.message : error);
    process.exitCode = 1;
    return;
  }

  // Stage 2: through the real OllamaProvider — the exact code path the app uses.
  console.log("--- Stage 2: OllamaProvider.generateJson() (production code path) ---");
  const provider = new OllamaProvider();
  try {
    const extracted = await provider.generateJson({
      system: systemPrompt,
      userContent: userPrompt,
      schemaName: "test_schema",
      schema: testSchema,
    });

    console.log("generateJson() succeeded. Extracted text:");
    console.log(extracted);
    console.log();

    try {
      const parsed: unknown = JSON.parse(extracted);
      console.log("Parsed JSON:");
      console.log(JSON.stringify(parsed, null, 2));
      console.log();

      const record = parsed as Record<string, unknown>;
      const errors: string[] = [];
      if (typeof record.greeting !== "string") errors.push('"greeting" is missing or not a string.');
      if (typeof record.number !== "number") errors.push('"number" is missing or not a number.');

      console.log(errors.length === 0 ? "Schema check: passed" : "Schema check: FAILED");
      for (const err of errors) console.log(" -", err);
    } catch (parseError) {
      console.log("JSON parsing: FAILED");
      console.log(" ", parseError instanceof Error ? parseError.message : parseError);
      process.exitCode = 1;
    }
  } catch (providerError) {
    console.log("generateJson() threw an error:");
    console.log(" ", providerError instanceof Error ? providerError.message : providerError);
    process.exitCode = 1;
  }
}

main();
