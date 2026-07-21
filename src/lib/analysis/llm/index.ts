import { AnthropicProvider } from "@/lib/analysis/llm/anthropic-provider";
import { OllamaProvider } from "@/lib/analysis/llm/ollama-provider";
import { OpenAiProvider } from "@/lib/analysis/llm/openai-provider";
import type { LlmProvider } from "@/lib/analysis/llm/types";

export type { LlmJsonSchemaRequest, LlmProvider } from "@/lib/analysis/llm/types";

// LLM_PROVIDER=openai (default) | claude | ollama
export function getLlmProvider(): LlmProvider {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "openai") return new OpenAiProvider();
  if (provider === "claude") return new AnthropicProvider();
  if (provider === "ollama") return new OllamaProvider();
  throw new Error(`Unsupported LLM_PROVIDER "${provider}". Use "openai", "claude", or "ollama".`);
}
