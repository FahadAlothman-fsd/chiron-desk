/**
 * AIProviderService - Effect-wrapped AI provider integration
 *
 * Wraps the existing model-loader.ts and AI-SDK to provide Effect-native
 * streaming and generation capabilities.
 */

import {
	generateText as aiGenerateText,
	streamText as aiStreamText,
	type CoreMessage,
	type CoreTool,
	type FinishReason,
	type LanguageModel,
} from "ai";
import { Context, Data, Effect, Layer, Stream } from "effect";
import { loadModel, parseModelConfig } from "../../mastra/model-loader";
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

export interface ModelConfig {
	provider: "openrouter" | "openai" | "anthropic";
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

		const getApiKey = (
			provider: "openrouter" | "openai" | "anthropic",
		): string | undefined => {
			switch (provider) {
				case "openrouter":
					return configService.get("openrouterApiKey");
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
						return loadModel({
							provider: config.provider,
							modelId: config.modelId,
							apiKey,
							enableThinking: config.enableThinking,
						}) as LanguageModel;
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
					try: () => {
						const parsed = parseModelConfig(modelString);
						return {
							provider: parsed.provider,
							modelId: parsed.modelId,
							apiKey: parsed.apiKey,
							enableThinking: parsed.enableThinking,
						};
					},
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
