import { describe, expect, it } from "bun:test";
import { Effect, Stream } from "effect";
import type { TextStreamPart } from "./ai-provider-service";
import {
	aiStreamToEffectStream,
	collectStreamText,
	processStreamWithCallback,
	StreamingError,
} from "./streaming-adapter";

async function* createMockAsyncIterable<T>(items: T[]): AsyncIterable<T> {
	for (const item of items) {
		yield item;
	}
}

function createMockTextStream(chunks: string[]): AsyncIterable<TextStreamPart> {
	const parts: TextStreamPart[] = chunks.map((chunk) => ({
		type: "text-delta" as const,
		textDelta: chunk,
	}));
	parts.push({
		type: "finish" as const,
		finishReason: "stop" as any,
		usage: {
			promptTokens: 10,
			completionTokens: chunks.length,
			totalTokens: 10 + chunks.length,
		},
	});
	return createMockAsyncIterable(parts);
}

describe("StreamingAdapter", () => {
	describe("aiStreamToEffectStream", () => {
		it("should convert async iterable to Effect Stream", async () => {
			const items = [1, 2, 3, 4, 5];
			const asyncIterable = createMockAsyncIterable(items);

			const effectStream = aiStreamToEffectStream(asyncIterable);
			const result = await Effect.runPromise(Stream.runCollect(effectStream));

			expect(Array.from(result)).toEqual(items);
		});

		it("should handle empty async iterable", async () => {
			const asyncIterable = createMockAsyncIterable<number>([]);

			const effectStream = aiStreamToEffectStream(asyncIterable);
			const result = await Effect.runPromise(Stream.runCollect(effectStream));

			expect(Array.from(result)).toEqual([]);
		});

		it("should propagate errors as StreamingError", async () => {
			async function* errorIterable(): AsyncIterable<number> {
				yield 1;
				throw new Error("Test error");
			}

			const effectStream = aiStreamToEffectStream(errorIterable());
			const result = await Effect.runPromiseExit(
				Stream.runCollect(effectStream),
			);

			expect(result._tag).toBe("Failure");
		});
	});

	describe("collectStreamText", () => {
		it("should collect all text from stream", async () => {
			const stream = createMockTextStream(["Hello", " ", "World", "!"]);

			const result = await Effect.runPromise(collectStreamText(stream));

			expect(result.text).toBe("Hello World!");
			expect(result.tokenCount).toBe(4);
		});

		it("should handle empty stream", async () => {
			const stream = createMockAsyncIterable<TextStreamPart>([
				{
					type: "finish",
					finishReason: "stop" as any,
					usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
				},
			]);

			const result = await Effect.runPromise(collectStreamText(stream));

			expect(result.text).toBe("");
			expect(result.tokenCount).toBe(0);
		});

		it("should ignore non-text-delta parts for text accumulation", async () => {
			const parts: TextStreamPart[] = [
				{ type: "text-delta", textDelta: "Hello" },
				{ type: "tool-call", toolCallId: "tc1", toolName: "test", args: {} },
				{ type: "text-delta", textDelta: " World" },
				{
					type: "finish",
					finishReason: "stop" as any,
					usage: { promptTokens: 0, completionTokens: 2, totalTokens: 2 },
				},
			];
			const stream = createMockAsyncIterable(parts);

			const result = await Effect.runPromise(collectStreamText(stream));

			expect(result.text).toBe("Hello World");
			expect(result.tokenCount).toBe(2);
		});
	});

	describe("processStreamWithCallback", () => {
		it("should call onChunk for each text delta", async () => {
			const chunks: string[] = [];
			const stream = createMockTextStream(["A", "B", "C"]);

			await Effect.runPromise(
				processStreamWithCallback(stream, (chunk) => chunks.push(chunk)),
			);

			expect(chunks).toEqual(["A", "B", "C"]);
		});

		it("should call onComplete with full text and count", async () => {
			let completedText = "";
			let completedCount = 0;
			const stream = createMockTextStream(["Hello", " ", "World"]);

			await Effect.runPromise(
				processStreamWithCallback(
					stream,
					() => {},
					undefined,
					(text, count) => {
						completedText = text;
						completedCount = count;
					},
				),
			);

			expect(completedText).toBe("Hello World");
			expect(completedCount).toBe(3);
		});

		it("should call onToolCall for tool-call parts", async () => {
			const toolCalls: Array<{ name: string; args: unknown }> = [];
			const parts: TextStreamPart[] = [
				{ type: "text-delta", textDelta: "Calling tool..." },
				{
					type: "tool-call",
					toolCallId: "tc1",
					toolName: "calculator",
					args: { a: 1, b: 2 },
				},
				{
					type: "finish",
					finishReason: "tool-calls" as any,
					usage: { promptTokens: 0, completionTokens: 1, totalTokens: 1 },
				},
			];
			const stream = createMockAsyncIterable(parts);

			await Effect.runPromise(
				processStreamWithCallback(
					stream,
					() => {},
					(name, args) => toolCalls.push({ name, args }),
				),
			);

			expect(toolCalls).toEqual([{ name: "calculator", args: { a: 1, b: 2 } }]);
		});

		it("should call onError for error parts", async () => {
			let errorReceived: unknown = null;
			const parts: TextStreamPart[] = [
				{ type: "text-delta", textDelta: "Starting..." },
				{ type: "error", error: new Error("Stream error") },
			];
			const stream = createMockAsyncIterable(parts);

			await Effect.runPromise(
				processStreamWithCallback(
					stream,
					() => {},
					undefined,
					undefined,
					(error) => {
						errorReceived = error;
					},
				),
			);

			expect(errorReceived).toBeDefined();
		});

		it("should return accumulated text", async () => {
			const stream = createMockTextStream(["Test", " ", "Output"]);

			const result = await Effect.runPromise(
				processStreamWithCallback(stream, () => {}),
			);

			expect(result).toBe("Test Output");
		});
	});
});
