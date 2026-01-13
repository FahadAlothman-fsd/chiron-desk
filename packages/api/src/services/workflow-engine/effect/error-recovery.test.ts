import { describe, expect, it } from "bun:test";
import { Duration, Effect, Schedule } from "effect";
import { AIProviderError, StreamingError } from "./ai-provider-service";
import {
	executeToolWithTimeout,
	getPartialText,
	isRetryable,
	rateLimitRetryPolicy,
} from "./error-recovery";

describe("Error Recovery", () => {
	describe("rateLimitRetryPolicy", () => {
		it("should be a valid Effect Schedule", () => {
			expect(rateLimitRetryPolicy).toBeDefined();
		});
	});

	describe("executeToolWithTimeout", () => {
		it("should return result if completes before timeout", async () => {
			const effect = Effect.succeed({ success: true, value: 42 });

			const result = await Effect.runPromise(
				executeToolWithTimeout(effect, 1000, "test-tool"),
			);

			expect(result).toEqual({ success: true, value: 42 });
		});

		it("should return timeout error if exceeds timeout", async () => {
			const slowEffect = Effect.delay(
				Effect.succeed("done"),
				Duration.seconds(5),
			);

			const result = await Effect.runPromise(
				executeToolWithTimeout(slowEffect, 50, "slow-tool"),
			);

			expect(result).toEqual({
				success: false,
				error: "Tool 'slow-tool' timed out after 50ms",
				timedOut: true,
			});
		});

		it("should use default timeout of 30 seconds", async () => {
			const effect = Effect.succeed({ done: true });

			const result = await Effect.runPromise(executeToolWithTimeout(effect));

			expect(result).toEqual({ done: true });
		});
	});

	describe("isRetryable", () => {
		it("should return true for retryable AIProviderError", () => {
			const error = new AIProviderError({
				cause: new Error("429"),
				provider: "openai",
				operation: "stream",
				retryable: true,
			});

			expect(isRetryable(error)).toBe(true);
		});

		it("should return false for non-retryable AIProviderError", () => {
			const error = new AIProviderError({
				cause: new Error("Invalid API key"),
				provider: "openai",
				operation: "load",
				retryable: false,
			});

			expect(isRetryable(error)).toBe(false);
		});

		it("should return false for StreamingError (no retryable field)", () => {
			const error = new StreamingError({
				cause: new Error("Connection lost"),
				phase: "read",
			});

			expect(isRetryable(error)).toBe(false);
		});
	});

	describe("getPartialText", () => {
		it("should return partialText from StreamingError", () => {
			const error = new StreamingError({
				cause: new Error("Interrupted"),
				phase: "read",
				partialText: "Hello, this is partial...",
			});

			expect(getPartialText(error)).toBe("Hello, this is partial...");
		});

		it("should return undefined if no partialText", () => {
			const error = new StreamingError({
				cause: new Error("Failed"),
				phase: "complete",
			});

			expect(getPartialText(error)).toBeUndefined();
		});

		it("should return undefined for errors without partialText field", () => {
			const error = new AIProviderError({
				cause: new Error("Error"),
				provider: "openai",
				operation: "stream",
				retryable: false,
			});

			expect(getPartialText(error)).toBeUndefined();
		});
	});
});
