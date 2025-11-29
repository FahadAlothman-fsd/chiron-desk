/**
 * Model Loader Service
 *
 * Provides abstraction for loading AI models from different providers
 * (OpenRouter, OpenAI, Anthropic, etc.)
 */

import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export interface ModelConfig {
	provider: "openrouter" | "openai" | "anthropic";
	modelId: string;
	apiKey: string; // REQUIRED: User's API key from database
	enableThinking?: boolean; // Enable extended thinking for supported models (Claude 3.7+)
}

/**
 * Load an AI model based on provider and model ID
 *
 * @param config - Model configuration with provider and modelId
 * @returns AI SDK model instance
 *
 * @example
 * ```ts
 * // OpenRouter (free)
 * const model = loadModel({
 *   provider: "openrouter",
 *   modelId: "openrouter/polaris-alpha"
 * });
 *
 * // OpenAI
 * const model = loadModel({
 *   provider: "openai",
 *   modelId: "gpt-4o-mini"
 * });
 *
 * // Anthropic
 * const model = loadModel({
 *   provider: "anthropic",
 *   modelId: "claude-3-5-sonnet-20241022"
 * });
 * ```
 */
/**
 * Custom fetch wrapper to fix malformed tool calling responses from some OpenRouter models
 * Some models (like gpt-oss-120b) return empty strings for tool_calls.type instead of "function"
 */
function createOpenRouterFetchWithFix(apiKey: string): typeof fetch {
	return async (url: RequestInfo | URL, init?: RequestInit) => {
		const response = await fetch(url, init);

		// Only intercept streaming responses
		if (
			!response.body ||
			!response.headers.get("content-type")?.includes("text/event-stream")
		) {
			return response;
		}

		// Create a transform stream to fix malformed chunks
		const reader = response.body.getReader();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						// Decode the chunk
						const text = new TextDecoder().decode(value);

						// Fix malformed tool_calls with empty type fields
						const fixed = text.replace(/"type":""/g, '"type":"function"');

						controller.enqueue(new TextEncoder().encode(fixed));
					}
					controller.close();
				} catch (error) {
					controller.error(error);
				}
			},
		});

		return new Response(stream, {
			headers: response.headers,
			status: response.status,
			statusText: response.statusText,
		});
	};
}

export function loadModel(config: ModelConfig): any {
	switch (config.provider) {
		case "openrouter": {
			if (!config.apiKey) {
				throw new Error(
					"OpenRouter API key is required. Please configure it in Settings.",
				);
			}
			const provider = createOpenRouter({
				apiKey: config.apiKey,
				fetch: createOpenRouterFetchWithFix(config.apiKey),
			});
			return provider(config.modelId);
		}

		case "openai": {
			if (!config.apiKey) {
				throw new Error(
					"OpenAI API key is required. Please configure it in Settings.",
				);
			}
			return openai(config.modelId, { apiKey: config.apiKey });
		}

		case "anthropic": {
			if (!config.apiKey) {
				throw new Error(
					"Anthropic API key is required. Please configure it in Settings.",
				);
			}

			// Enable extended thinking for Claude 3.7+ models if requested
			const modelOptions: any = { apiKey: config.apiKey };
			if (config.enableThinking && config.modelId.includes("claude-3")) {
				// Extended thinking is enabled via the model call, not model creation
				// We'll pass this through metadata for the agent to use
				modelOptions._enableThinking = true;
			}

			return anthropic(config.modelId, modelOptions);
		}

		default:
			throw new Error(
				`Unsupported model provider: ${(config as ModelConfig).provider}`,
			);
	}
}

/**
 * Get default model configuration
 * Uses free OpenRouter model by default
 */
export function getDefaultModelConfig(): ModelConfig {
	return {
		provider: "openrouter",
		modelId: "openrouter/polaris-alpha", // FREE, excellent for tool calling
	};
}

/**
 * Parse model configuration from agent record
 * Falls back to default if not configured
 */
export function parseModelConfig(agentLlmModel?: string | null): ModelConfig {
	if (!agentLlmModel) {
		return getDefaultModelConfig();
	}

	// Expected format: "provider:modelId" e.g., "openrouter:openrouter/polaris-alpha"
	const parts = agentLlmModel.split(":");
	if (parts.length !== 2) {
		console.warn(
			`[ModelLoader] Invalid model format: ${agentLlmModel}, using default`,
		);
		return getDefaultModelConfig();
	}

	const [provider, modelId] = parts;
	if (
		provider !== "openrouter" &&
		provider !== "openai" &&
		provider !== "anthropic"
	) {
		console.warn(
			`[ModelLoader] Unsupported provider: ${provider}, using default`,
		);
		return getDefaultModelConfig();
	}

	return {
		provider: provider as "openrouter" | "openai" | "anthropic",
		modelId,
	};
}
