/**
 * AIProviderService - Effect-wrapped AI provider integration
 *
 * Provides Effect-native streaming and generation capabilities with
 * multi-provider support: OpenRouter, OpenCode, Anthropic, OpenAI.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
	generateText as aiGenerateText,
	streamText as aiStreamText,
	type CoreMessage,
	type CoreTool,
	type FinishReason,
	type LanguageModel,
} from "ai";
import { opencode } from "ai-sdk-provider-opencode-sdk";
import { Context, Data, Effect, Layer, Stream } from "effect";
import { ConfigService } from "./config-service";

// ===== ERRORS =====

export class AIProviderError extends Data.TaggedError("AIProviderError")<{
	readonly cause: unknown;
	readonly provider: string;
	readonly operation: "load" | "stream" | "generate";
	readonly retryable: boolean;
	readonly retryAfterMs?: number;
}> {}

export class ModelNotFoundError extends Data.TaggedError("ModelNotFoundError")<{
	readonly modelId: string;
	readonly provider: string;
}> {}

export class StreamingError extends Data.TaggedError("StreamingError")<{
	readonly cause: unknown;
	readonly phase: "read" | "emit" | "complete";
	readonly partialText?: string;
}> {}

// ===== TYPES =====

export type AIProvider = "openrouter" | "opencode" | "openai" | "anthropic";

export interface ModelConfig {
	provider: AIProvider;
	modelId: string;
	apiKey?: string;
	enableThinking?: boolean;
}

export interface StreamTextParams {
	model: LanguageModel;
	messages: CoreMessage[];
	tools?: Record<string, CoreTool>;
	maxTokens?: number;
	temperature?: number;
	system?: string;
	abortSignal?: AbortSignal;
}

export interface GenerateTextParams extends StreamTextParams {}

export interface ToolCall {
	toolCallId: string;
	toolName: string;
	args: unknown;
}

export interface ToolResult {
	toolCallId: string;
	toolName: string;
	result: unknown;
}

export interface TokenUsage {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
}

export interface GenerateTextResult {
	text: string;
	finishReason: FinishReason;
	usage: TokenUsage;
	toolCalls: ToolCall[];
	toolResults: ToolResult[];
}

/** Effect-wrapped streaming result */
export interface StreamResult {
	/** Effect Stream of text deltas only */
	textStream: Stream.Stream<string, StreamingError>;

	/** Effect Stream of ALL events (text, tool calls, finish, errors) */
	fullStream: Stream.Stream<TextStreamPart, StreamingError>;

	/** Effect that resolves to complete text when stream finishes */
	text: Effect.Effect<string, StreamingError>;

	/** Effect that resolves to all tool calls made */
	toolCalls: Effect.Effect<ToolCall[], StreamingError>;

	/** Effect that resolves to tool results after execution */
	toolResults: Effect.Effect<ToolResult[], StreamingError>;

	/** Effect for finish reason */
	finishReason: Effect.Effect<FinishReason, StreamingError>;

	/** Effect for token usage stats */
	usage: Effect.Effect<TokenUsage, StreamingError>;

	/** Abort the stream */
	abort: () => Effect.Effect<void, never>;
}

/** Text stream part types from AI-SDK */
export type TextStreamPart =
	| { type: "text-delta"; textDelta: string }
	| { type: "tool-call"; toolCallId: string; toolName: string; args: unknown }
	| {
			type: "tool-result";
			toolCallId: string;
			toolName: string;
			result: unknown;
	  }
	| { type: "finish"; finishReason: FinishReason; usage: TokenUsage }
	| { type: "error"; error: unknown };

// ===== HELPERS =====

/** Wrap AsyncIterable to Effect Stream */
function asyncIterableToStream<A>(
	iterable: AsyncIterable<A>,
): Stream.Stream<A, StreamingError> {
	return Stream.fromAsyncIterable(
		iterable,
		(error) => new StreamingError({ cause: error, phase: "read" }),
	);
}

/** Wrap Promise to Effect */
function promiseToEffect<A>(
	promise: Promise<A>,
	phase: "read" | "emit" | "complete",
): Effect.Effect<A, StreamingError> {
	return Effect.tryPromise({
		try: () => promise,
		catch: (error) => new StreamingError({ cause: error, phase }),
	});
}

/** Check if error is rate limit (429) */
function isRateLimitError(error: unknown): boolean {
	if (error instanceof Error) {
		return (
			error.message.includes("429") || error.message.includes("rate limit")
		);
	}
	return false;
}

/** Extract retry-after from error if present */
function extractRetryAfter(error: unknown): number | undefined {
	if (error instanceof Error && "headers" in error) {
		const headers = (error as { headers?: Record<string, string> }).headers;
		const retryAfter = headers?.["retry-after"];
		if (retryAfter) {
			return Number.parseInt(retryAfter, 10) * 1000;
		}
	}
	return undefined;
}

function createOpenRouterFetchWithFix(): (
	url: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response> {
	return async (url: RequestInfo | URL, init?: RequestInit) => {
		const response = await fetch(url, init);

		if (
			!response.body ||
			!response.headers.get("content-type")?.includes("text/event-stream")
		) {
			return response;
		}

		const reader = response.body.getReader();
		const stream = new ReadableStream({
			async start(controller) {
				try {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const text = new TextDecoder().decode(value);
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

function loadModelFromConfig(
	config: ModelConfig & { apiKey: string },
): LanguageModel {
	switch (config.provider) {
		case "openrouter": {
			const provider = createOpenRouter({
				apiKey: config.apiKey,
				fetch: createOpenRouterFetchWithFix(),
			});
			return provider(config.modelId) as LanguageModel;
		}

		case "opencode": {
			return opencode(config.modelId) as LanguageModel;
		}

		case "openai": {
			const openaiProvider = createOpenAI({ apiKey: config.apiKey });
			return openaiProvider(config.modelId) as LanguageModel;
		}

		case "anthropic": {
			const anthropicProvider = createAnthropic({ apiKey: config.apiKey });
			return anthropicProvider(config.modelId) as LanguageModel;
		}

		default:
			throw new Error(
				`Unsupported model provider: ${(config as ModelConfig).provider}`,
			);
	}
}

function getDefaultModelConfig(): ModelConfig {
	return {
		provider: "openrouter",
		modelId: "openrouter/polaris-alpha",
	};
}

function parseModelConfigString(modelString?: string | null): ModelConfig {
	if (!modelString) {
		return getDefaultModelConfig();
	}

	const parts = modelString.split(":");
	if (parts.length !== 2) {
		console.warn(
			`[AIProvider] Invalid model format: ${modelString}, using default`,
		);
		return getDefaultModelConfig();
	}

	const [provider, modelId] = parts;
	const validProviders: AIProvider[] = [
		"openrouter",
		"opencode",
		"openai",
		"anthropic",
	];

	if (!validProviders.includes(provider as AIProvider)) {
		console.warn(
			`[AIProvider] Unsupported provider: ${provider}, using default`,
		);
		return getDefaultModelConfig();
	}

	return {
		provider: provider as AIProvider,
		modelId: modelId as string,
	};
}

// ===== SERVICE INTERFACE =====

export interface AIProviderService {
	readonly _tag: "AIProviderService";

	/** Load an AI model from config (wraps model-loader.ts) */
	loadModel: (
		config: ModelConfig,
	) => Effect.Effect<LanguageModel, ModelNotFoundError | AIProviderError>;

	/** Stream text generation with tool support - returns Effect-wrapped streams */
	streamText: (
		params: StreamTextParams,
	) => Effect.Effect<StreamResult, AIProviderError>;

	/** Single-call text generation */
	generateText: (
		params: GenerateTextParams,
	) => Effect.Effect<GenerateTextResult, AIProviderError>;

	/** Parse "provider:modelId" string format */
	parseModelString: (
		modelString: string,
	) => Effect.Effect<ModelConfig, AIProviderError>;
}

// ===== CONTEXT TAG =====

export const AIProviderService =
	Context.GenericTag<AIProviderService>("AIProviderService");

// ===== LIVE IMPLEMENTATION =====

export const AIProviderServiceLive = Layer.effect(
	AIProviderService,
	Effect.gen(function* () {
		const configService = yield* ConfigService;

		const getApiKey = (provider: AIProvider): string | undefined => {
			switch (provider) {
				case "openrouter":
					return configService.get("openrouterApiKey");
				case "opencode":
					return "opencode-no-key-needed";
				case "openai":
					return configService.get("openaiApiKey");
				case "anthropic":
					return configService.get("anthropicApiKey");
			}
		};

		return {
			_tag: "AIProviderService" as const,

			loadModel: (config: ModelConfig) =>
				Effect.try({
					try: () => {
						const apiKey = config.apiKey || getApiKey(config.provider);
						if (!apiKey) {
							throw new Error(
								`API key required for provider: ${config.provider}`,
							);
						}
						return loadModelFromConfig({
							provider: config.provider,
							modelId: config.modelId,
							apiKey,
							enableThinking: config.enableThinking,
						});
					},
					catch: (error) => {
						if (error instanceof Error && error.message.includes("not found")) {
							return new ModelNotFoundError({
								modelId: config.modelId,
								provider: config.provider,
							});
						}
						return new AIProviderError({
							cause: error,
							provider: config.provider,
							operation: "load",
							retryable: false,
						});
					},
				}),

			streamText: (params: StreamTextParams) =>
				Effect.tryPromise({
					try: async () => {
						const abortController = new AbortController();

						const result = aiStreamText({
							model: params.model,
							messages: params.messages,
							tools: params.tools,
							maxTokens: params.maxTokens,
							temperature: params.temperature,
							system: params.system,
							abortSignal: params.abortSignal || abortController.signal,
						});

						// Wrap raw AI-SDK result into Effect-friendly StreamResult
						const streamResult: StreamResult = {
							textStream: asyncIterableToStream(result.textStream),

							fullStream: asyncIterableToStream(
								result.fullStream as AsyncIterable<TextStreamPart>,
							),

							text: promiseToEffect(result.text, "complete"),

							toolCalls: promiseToEffect(
								result.toolCalls.then((calls) =>
									calls.map((c) => ({
										toolCallId: c.toolCallId,
										toolName: c.toolName,
										args: c.args,
									})),
								),
								"complete",
							),

							toolResults: promiseToEffect(
								result.toolResults.then((results) =>
									results.map((r) => ({
										toolCallId: r.toolCallId,
										toolName: r.toolName,
										result: r.result,
									})),
								),
								"complete",
							),

							finishReason: promiseToEffect(result.finishReason, "complete"),

							usage: promiseToEffect(
								result.usage.then((u) => ({
									promptTokens: u.promptTokens,
									completionTokens: u.completionTokens,
									totalTokens: u.totalTokens,
								})),
								"complete",
							),

							abort: () => Effect.sync(() => abortController.abort()),
						};

						return streamResult;
					},
					catch: (error) =>
						new AIProviderError({
							cause: error,
							provider: "unknown",
							operation: "stream",
							retryable: isRateLimitError(error),
							retryAfterMs: extractRetryAfter(error),
						}),
				}),

			generateText: (params: GenerateTextParams) =>
				Effect.tryPromise({
					try: async () => {
						const result = await aiGenerateText({
							model: params.model,
							messages: params.messages,
							tools: params.tools,
							maxTokens: params.maxTokens,
							temperature: params.temperature,
							system: params.system,
							abortSignal: params.abortSignal,
						});

						return {
							text: result.text,
							finishReason: result.finishReason,
							usage: {
								promptTokens: result.usage.promptTokens,
								completionTokens: result.usage.completionTokens,
								totalTokens: result.usage.totalTokens,
							},
							toolCalls: result.toolCalls.map((c) => ({
								toolCallId: c.toolCallId,
								toolName: c.toolName,
								args: c.args,
							})),
							toolResults: result.toolResults.map((r) => ({
								toolCallId: r.toolCallId,
								toolName: r.toolName,
								result: r.result,
							})),
						};
					},
					catch: (error) =>
						new AIProviderError({
							cause: error,
							provider: "unknown",
							operation: "generate",
							retryable: isRateLimitError(error),
							retryAfterMs: extractRetryAfter(error),
						}),
				}),

			parseModelString: (modelString: string) =>
				Effect.try({
					try: () => parseModelConfigString(modelString),
					catch: (error) =>
						new AIProviderError({
							cause: error,
							provider: "unknown",
							operation: "load",
							retryable: false,
						}),
				}),
		};
	}),
);
