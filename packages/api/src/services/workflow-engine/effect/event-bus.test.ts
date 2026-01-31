import { describe, expect, test } from "bun:test";
import { Chunk, Effect, Fiber, Stream } from "effect";
import { type WorkflowEvent, WorkflowEventBus, WorkflowEventBusLive } from "./event-bus";

describe("WorkflowEventBus", () => {
  test("publishes and receives events", async () => {
    const program = Effect.gen(function* () {
      const bus = yield* WorkflowEventBus;

      const event: WorkflowEvent = {
        _tag: "WorkflowStarted",
        executionId: "exec-1",
        workflowId: "wf-1",
      };

      const fiber = yield* bus.stream.pipe(Stream.take(1), Stream.runCollect, Effect.fork);

      yield* Effect.sleep("10 millis");
      yield* bus.publish(event);

      const collected = yield* Fiber.join(fiber);
      expect(Chunk.toArray(collected)).toEqual([event]);
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, WorkflowEventBusLive)));
  });

  test("preserves event order for streaming subscribers", async () => {
    const program = Effect.gen(function* () {
      const bus = yield* WorkflowEventBus;

      const events: WorkflowEvent[] = [
        {
          _tag: "TextChunk",
          executionId: "exec-2",
          stepId: "step-1",
          content: "Hello",
        },
        {
          _tag: "ToolCallStarted",
          executionId: "exec-2",
          stepId: "step-1",
          toolName: "update_description",
          toolType: "update-variable",
          toolCallId: "tool-call-1",
          args: { a: 1 },
        },
        {
          _tag: "ToolCallCompleted",
          executionId: "exec-2",
          stepId: "step-1",
          toolName: "update_description",
          toolType: "update-variable",
          toolCallId: "tool-call-1",
          result: 2,
        },
        {
          _tag: "ApprovalRequested",
          executionId: "exec-2",
          stepId: "step-1",
          toolName: "update_project_name",
          toolType: "update-variable",
          toolCallId: "tool-call-2",
          args: { q: "ok" },
          riskLevel: "high",
        },
        {
          _tag: "StepCompleted",
          executionId: "exec-2",
          stepId: "step-1",
          stepNumber: 1,
          result: { done: true },
        },
      ];

      const fiber = yield* bus.stream.pipe(
        Stream.take(events.length),
        Stream.runCollect,
        Effect.fork,
      );

      yield* Effect.sleep("10 millis");
      for (const event of events) {
        yield* bus.publish(event);
      }

      const collected = yield* Fiber.join(fiber);
      expect(Chunk.toArray(collected)).toEqual(events);
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, WorkflowEventBusLive)));
  });

  test("delivers completion after streaming chunks", async () => {
    const program = Effect.gen(function* () {
      const bus = yield* WorkflowEventBus;
      const events: WorkflowEvent[] = [
        {
          _tag: "TextChunk",
          executionId: "exec-3",
          stepId: "step-2",
          content: "Working",
        },
        {
          _tag: "StepCompleted",
          executionId: "exec-3",
          stepId: "step-2",
          stepNumber: 2,
        },
      ];

      const fiber = yield* bus.stream.pipe(
        Stream.take(events.length),
        Stream.runCollect,
        Effect.fork,
      );

      yield* Effect.sleep("10 millis");
      for (const event of events) {
        yield* bus.publish(event);
      }

      const collected = yield* Fiber.join(fiber);
      expect(Chunk.toArray(collected)).toEqual(events);
    });

    await Effect.runPromise(Effect.scoped(Effect.provide(program, WorkflowEventBusLive)));
  });
});
