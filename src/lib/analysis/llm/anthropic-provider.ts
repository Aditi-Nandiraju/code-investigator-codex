import Anthropic from "@anthropic-ai/sdk";

import type { LlmJsonSchemaRequest, LlmProvider } from "@/lib/analysis/llm/types";

const DEFAULT_MODEL = "claude-opus-4-8";

export class AnthropicProvider implements LlmProvider {
  async generateJson({ system, userContent, schema }: LlmJsonSchemaRequest): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY must be configured to run an investigation.");
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: process.env.MODEL_NAME || DEFAULT_MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: userContent }],
      output_config: { format: { type: "json_schema", schema } },
    });
    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || !textBlock.text) throw new Error("Claude returned an empty investigation.");
    return textBlock.text;
  }
}
