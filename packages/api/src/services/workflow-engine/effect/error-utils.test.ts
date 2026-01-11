import { describe, expect, test } from "bun:test";
import { Effect, Exit } from "effect";
import { withRetry, withTimeout } from "./error-utils";
import { StepTimeoutError } from "./errors";

describe("error-utils", () => {
	describe("withRetry", () => {
		test("succeeds on first attempt", async () => {
			const effect = Effect.succeed("success");
			const result = await Effect.runPromise(withRetry(effect));
			expect(result).toBe("success");
		});

		test("retries on failure then succeeds", async () => {
			let attempts = 0;
			const effect = Effect.gen(function* () {
				attempts++;
				if (attempts < 2) {
					return yield* Effect.fail("temporary-error");
				}
				return "success";
			});

			const result = await Effect.runPromise(
				withRetry(effect, { baseDelayMs: 10 }),
			);
			expect(result).toBe("success");
			expect(attempts).toBe(2);
		});
	});

	describe("withTimeout", () => {
		test("succeeds within timeout", async () => {
			const effect = Effect.succeed("success");
			const result = await Effect.runPromise(
				withTimeout(effect, 1000, "step-1"),
			);
			expect(result).toBe("success");
		});

		test("fails with StepTimeoutError when exceeded", async () => {
			const effect = Effect.gen(function* () {
				yield* Effect.sleep("100 millis");
				return "success";
			});

			const exit = await Effect.runPromiseExit(
				withTimeout(effect, 10, "step-1"),
			);

			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const error = exit.cause;
				expect(error._tag).toBe("Fail");
			}
		});
	});
});
