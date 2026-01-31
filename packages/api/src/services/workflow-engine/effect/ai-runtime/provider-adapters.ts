import type { AIProvider } from "../ai-provider-service";
import type { ProviderAdapter } from "./provider-adapter";
import { anthropicAdapter } from "./anthropic-adapter";
import { openAiAdapter } from "./openai-adapter";
import { openRouterAdapter } from "./openrouter-adapter";
import { opencodeAdapter } from "./opencode-adapter";
import { createPassThroughAdapter } from "./pass-through-adapter";

const adapterMap = new Map<AIProvider, ProviderAdapter>([
  ["openrouter", openRouterAdapter],
  ["openai", openAiAdapter],
  ["anthropic", anthropicAdapter],
  ["opencode", opencodeAdapter],
]);

export const getProviderAdapter = (provider: AIProvider): ProviderAdapter => {
  return adapterMap.get(provider) ?? createPassThroughAdapter(provider);
};
