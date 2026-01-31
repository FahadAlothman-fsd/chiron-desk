import type { ProviderAdapter } from "./provider-adapter";

export const createPassThroughAdapter = (
  provider: ProviderAdapter["provider"],
): ProviderAdapter => ({
  provider,
  prepareRequest: ({ messages, tools }) => ({
    messages,
    tools,
  }),
});
