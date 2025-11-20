/**
 * Model Provider Abstraction Pattern
 * Allows adding new providers (Anthropic, OpenAI, etc.) without refactoring core logic
 */

export interface Model {
	id: string;
	name: string;
	provider: string;
	contextLength: number;
	inputPrice: number; // Per 1M tokens
	outputPrice: number; // Per 1M tokens
	toolCall?: boolean;
	reasoning?: boolean;
	modalities?: {
		input: string[];
		output: string[];
	};
	knowledge?: string;
	releaseDate?: string;
}

export interface ModelProvider {
	name: string;
	fetchModels(apiKey: string): Promise<Model[]>;
	testApiKey(apiKey: string): Promise<boolean>;
}

/**
 * OpenRouter Provider Implementation
 */
export class OpenRouterProvider implements ModelProvider {
	name = "openrouter";
	private baseUrl = "https://openrouter.ai/api/v1";

	async fetchModels(apiKey: string): Promise<Model[]> {
		try {
			const response = await fetch(`${this.baseUrl}/models`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				if (response.status === 401) {
					throw new Error("Invalid API key");
				}
				throw new Error(`OpenRouter API error: ${response.statusText}`);
			}

			const data = await response.json();

			// OpenRouter models format
			return (data.data || []).map((model: any) => ({
				id: model.id,
				name: model.name || model.id,
				provider: this.extractProvider(model.id),
				contextLength: model.context_length || 0,
				inputPrice: this.parsePrice(model.pricing?.prompt),
				outputPrice: this.parsePrice(model.pricing?.completion),
			}));
		} catch (error) {
			throw new Error(
				`Failed to fetch models: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	async testApiKey(apiKey: string): Promise<boolean> {
		try {
			// Use /auth/key endpoint which actually validates the API key
			// The /models endpoint returns 200 even for invalid keys
			const response = await fetch(`${this.baseUrl}/auth/key`, {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			// 200 = Valid API key
			// 401 = Invalid API key
			// Any other status = API error
			return response.status === 200;
		} catch {
			return false;
		}
	}

	private extractProvider(modelId: string): string {
		// OpenRouter model IDs are typically in format: "provider/model-name"
		const parts = modelId.split("/");
		if (parts.length > 1) {
			return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
		}
		return "Unknown";
	}

	private parsePrice(priceString: string | undefined): number {
		if (!priceString) return 0;
		// OpenRouter prices are per token, convert to per 1M tokens
		return Number.parseFloat(priceString) * 1_000_000;
	}
}

/**
 * Provider Registry
 * Add new providers here for future extensibility
 */
const providerRegistry = new Map<string, ModelProvider>([
	["openrouter", new OpenRouterProvider()],
	// Future providers can be added here:
	// ["anthropic", new AnthropicProvider()],
	// ["openai", new OpenAIProvider()],
]);

export function getProvider(name: string): ModelProvider | undefined {
	return providerRegistry.get(name);
}

/**
 * Formatting utilities
 */
export function formatContextLength(tokens: number): string {
	if (tokens >= 1_000_000) {
		return `${(tokens / 1_000_000).toFixed(0)}M`;
	}
	if (tokens >= 1_000) {
		return `${(tokens / 1_000).toFixed(0)}k`;
	}
	return `${tokens}`;
}

export function formatPrice(inputPrice: number, outputPrice: number): string {
	const formatSingle = (price: number) => {
		if (price === 0) return "$0";
		if (price < 1) return `$${price.toFixed(2)}`;
		return `$${Math.round(price)}`;
	};

	return `${formatSingle(inputPrice)}/${formatSingle(outputPrice)}`;
}

/**
 * Fetch all models from OpenRouter API (no auth required for public endpoint)
 * Gets all 341+ models with full metadata
 */
export async function fetchModelsFromOpenRouter(): Promise<Model[]> {
	try {
		const response = await fetch("https://openrouter.ai/api/v1/models");

		if (!response.ok) {
			throw new Error(
				`OpenRouter API error: ${response.status} ${response.statusText}`,
			);
		}

		const data = await response.json();

		// Convert OpenRouter format to our Model interface
		return (data.data || []).map((model: any) => {
			// Parse modalities from architecture - keep all modalities including "text"
			const inputModalities = model.architecture?.input_modalities || [];
			const outputModalities = model.architecture?.output_modalities || [];

			return {
				id: model.id,
				name: model.name || model.id,
				provider: extractProviderFromId(model.id),
				contextLength: model.context_length || 0,
				inputPrice: Number.parseFloat(model.pricing?.prompt || "0") * 1_000_000, // Convert to per 1M tokens
				outputPrice:
					Number.parseFloat(model.pricing?.completion || "0") * 1_000_000,
				toolCall: model.supported_parameters?.includes("tools") || false,
				reasoning:
					(model.pricing?.internal_reasoning &&
						Number.parseFloat(model.pricing.internal_reasoning) > 0) ||
					model.supported_parameters?.includes("reasoning") ||
					model.supported_parameters?.includes("include_reasoning") ||
					false,
				modalities:
					inputModalities.length > 0 || outputModalities.length > 0
						? {
								input: inputModalities,
								output: outputModalities,
							}
						: undefined,
				knowledge: model.created
					? new Date(model.created * 1000).toISOString().split("T")[0]
					: undefined,
				releaseDate: model.created
					? new Date(model.created * 1000).toISOString().split("T")[0]
					: undefined,
			};
		});
	} catch (error) {
		console.error("Failed to fetch from OpenRouter:", error);
		throw new Error(
			`Failed to fetch models from OpenRouter: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Extract provider name from model ID (e.g., "anthropic/claude-3" -> "Anthropic")
 */
function extractProviderFromId(modelId: string): string {
	const parts = modelId.split("/");
	if (parts.length > 1) {
		const provider = parts[0];
		return provider.charAt(0).toUpperCase() + provider.slice(1);
	}
	return "OpenRouter";
}
