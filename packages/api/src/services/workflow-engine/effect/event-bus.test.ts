import { describe, expect, test } from "bun:test";
import { Chunk, Effect, Fiber, Stream } from "effect";
import {
	type WorkflowEvent,
	WorkflowEventBus,
	WorkflowEventBusLive,
} from "./event-bus";

describe("WorkflowEventBus", () => {
	test("publishes and receives events", async () => {
		const program = Effect.gen(function* () {
			const bus = yield* WorkflowEventBus;

			const event: WorkflowEvent = {
				_tag: "WorkflowStarted",
				executionId: "exec-1",
				workflowId: "wf-1",
			};

			const fiber = yield* bus.stream.pipe(
				Stream.take(1),
				Stream.runCollect,
				Effect.fork,
			);

			yield* Effect.sleep("10 millis");
			yield* bus.publish(event);

			const collected = yield* Fiber.join(fiber);
			expect(Chunk.toArray(collected)).toEqual([event]);
		});

		await Effect.runPromise(
			Effect.scoped(Effect.provide(program, WorkflowEventBusLive)),
		);
	});
});
