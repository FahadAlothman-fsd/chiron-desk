import { Data, Effect, Stream } from "effect";
import type { TextStreamPart } from "./ai-provider-service";
import type { WorkflowEventBus } from "./event-bus";

export class StreamingError extends Data.TaggedError("StreamingError")<{
	readonly cause: unknown;
	readonly phase: "read" | "emit" | "complete";
	readonly partialText?: string;
}> {}

export interface StreamChunkEvent {
	type: "ai:stream:chunk";
	executionId: string;
	sessionId: string;
	chunk: string;
	tokenIndex: number;
}

export interface StreamCompleteEvent {
	type: "ai:stream:complete";
	executionId: string;
	sessionId: string;
	fullText: string;
	totalTokens: number;
	durationMs: number;
}

export interface StreamErrorEvent {
	type: "ai:stream:error";
	executionId: string;
	sessionId: string;
	error: string;
}

export interface ToolCallEvent {
	type: "ai:tool:call";
	executionId: string;
	sessionId: string;
	toolName: string;
	toolCallId: string;
	args: unknown;
}

export interface ToolResultEvent {
	type: "ai:tool:result";
	executionId: string;
	sessionId: string;
	toolName: string;
	toolCallId: string;
	result: unknown;
}

export type StreamEvent =
	| StreamChunkEvent
	| StreamCompleteEvent
	| StreamErrorEvent
	| ToolCallEvent
	| ToolResultEvent;

export function aiStreamToEffectStream<A>(
	asyncIterable: AsyncIterable<A>,
): Stream.Stream<A, StreamingError> {
	return Stream.fromAsyncIterable(
		asyncIterable,
		(error) => new StreamingError({ cause: error, phase: "read" }),
	);
}

export function streamToEventBus(
	stream: AsyncIterable<TextStreamPart>,
	eventBus: WorkflowEventBus,
	executionId: string,
	sessionId: string,
): Effect.Effect<string, StreamingError> {
	return Effect.gen(function* () {
		let fullText = "";
		let tokenIndex = 0;
		const startTime = Date.now();

		const effectStream = aiStreamToEffectStream(stream);

		yield* Stream.runForEach(effectStream, (part) =>
			Effect.gen(function* () {
				switch (part.type) {
					case "text-delta":
						fullText += part.textDelta;
						tokenIndex++;
						yield* eventBus.publish({
							_tag: "TextChunk",
							executionId,
							chunk: part.textDelta,
						});
						break;

					case "tool-call":
						yield* eventBus.publish({
							_tag: "ToolCallStarted",
							executionId,
							stepId: sessionId,
							toolName: part.toolName,
							args: part.args,
						});
						break;

					case "tool-result":
						yield* eventBus.publish({
							_tag: "ToolCallCompleted",
							executionId,
							stepId: sessionId,
							toolName: part.toolName,
							result: part.result,
						});
						break;

					case "finish":
						break;

					case "error":
						yield* Effect.fail(
							new StreamingError({
								cause: part.error,
								phase: "read",
								partialText: fullText,
							}),
						);
						break;
				}
			}),
		);

		const durationMs = Date.now() - startTime;

		yield* eventBus.publish({
			_tag: "TextChunk",
			executionId,
			chunk: `[STREAM_COMPLETE] ${tokenIndex} tokens in ${durationMs}ms`,
		});

		return fullText;
	}).pipe(
		Effect.catchAll((error) =>
			Effect.fail(
				error instanceof StreamingError
					? error
					: new StreamingError({ cause: error, phase: "complete" }),
			),
		),
	);
}

export async function* eventBusToAsyncGenerator(
	eventBus: WorkflowEventBus,
	executionId: string,
	filter?: (event: StreamEvent) => boolean,
): AsyncGenerator<StreamEvent, void, unknown> {
	const stream = eventBus.stream;

	const asyncIterable = Stream.toAsyncIterable(stream);
	const iterator = asyncIterable[Symbol.asyncIterator]();

	try {
		while (true) {
			const { value, done } = await iterator.next();
			if (done) break;

			if (value._tag === "TextChunk" && value.executionId === executionId) {
				const event: StreamChunkEvent = {
					type: "ai:stream:chunk",
					executionId,
					sessionId: executionId,
					chunk: value.chunk,
					tokenIndex: 0,
				};

				if (!filter || filter(event)) {
					yield event;
				}

				if (value.chunk.startsWith("[STREAM_COMPLETE]")) {
					break;
				}
			}

			if (
				value._tag === "ToolCallStarted" &&
				value.executionId === executionId
			) {
				const event: ToolCallEvent = {
					type: "ai:tool:call",
					executionId,
					sessionId: value.stepId,
					toolName: value.toolName,
					toolCallId: `${value.toolName}-${Date.now()}`,
					args: value.args,
				};

				if (!filter || filter(event)) {
					yield event;
				}
			}

			if (
				value._tag === "ToolCallCompleted" &&
				value.executionId === executionId
			) {
				const event: ToolResultEvent = {
					type: "ai:tool:result",
					executionId,
					sessionId: value.stepId,
					toolName: value.toolName,
					toolCallId: `${value.toolName}-${Date.now()}`,
					result: value.result,
				};

				if (!filter || filter(event)) {
					yield event;
				}
			}
		}
	} finally {
		if (iterator.return) {
			await iterator.return(undefined);
		}
	}
}

export function processStreamWithCallback(
	stream: AsyncIterable<TextStreamPart>,
	onChunk: (chunk: string) => void,
	onToolCall?: (toolName: string, args: unknown) => void,
	onComplete?: (fullText: string, tokenCount: number) => void,
	onError?: (error: unknown) => void,
): Effect.Effect<string, StreamingError> {
	return Effect.gen(function* () {
		let fullText = "";
		let tokenCount = 0;

		const effectStream = aiStreamToEffectStream(stream);

		yield* Stream.runForEach(effectStream, (part) =>
			Effect.sync(() => {
				switch (part.type) {
					case "text-delta":
						fullText += part.textDelta;
						tokenCount++;
						onChunk(part.textDelta);
						break;

					case "tool-call":
						onToolCall?.(part.toolName, part.args);
						break;

					case "error":
						onError?.(part.error);
						break;

					case "finish":
						break;
				}
			}),
		);

		onComplete?.(fullText, tokenCount);
		return fullText;
	}).pipe(
		Effect.catchAll((error) => {
			onError?.(error);
			return Effect.fail(
				error instanceof StreamingError
					? error
					: new StreamingError({ cause: error, phase: "complete" }),
			);
		}),
	);
}

export function collectStreamText(
	stream: AsyncIterable<TextStreamPart>,
): Effect.Effect<{ text: string; tokenCount: number }, StreamingError> {
	return Effect.gen(function* () {
		let text = "";
		let tokenCount = 0;

		const effectStream = aiStreamToEffectStream(stream);

		yield* Stream.runForEach(effectStream, (part) =>
			Effect.sync(() => {
				if (part.type === "text-delta") {
					text += part.textDelta;
					tokenCount++;
				}
			}),
		);

		return { text, tokenCount };
	});
}
