import OpenAI from "openai";

import type { LlmJsonSchemaRequest, LlmProvider } from "@/lib/analysis/llm/types";

export class OpenAiProvider implements LlmProvider {
  async generateJson({ system, userContent, schemaName, schema }: LlmJsonSchemaRequest): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY must be configured to run an investigation.");
    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: "gpt-5.6",
      input: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    });
    if (!response.output_text) throw new Error("GPT returned an empty investigation.");
    return response.output_text;
  }
}
