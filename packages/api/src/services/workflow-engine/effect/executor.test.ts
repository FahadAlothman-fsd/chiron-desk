import { describe, expect, test } from "bun:test";
import { Chunk, Effect, Fiber, Layer, Stream } from "effect";
import { ConfigServiceLive } from "./config-service";
import { MaxStepsExceededError } from "./errors";
import { WorkflowEventBus, WorkflowEventBusLive } from "./event-bus";
import { ExecutionContextLive, type ExecutionState } from "./execution-context";
import { executeWorkflow, type WorkflowDefinition } from "./executor";
import { StepHandlerRegistryLive } from "./step-registry";

const testInitialState: ExecutionState = {
	executionId: "test-exec-1",
	workflowId: "test-wf-1",
	projectId: "test-proj-1",
	parentExecutionId: null,
	variables: {},
	currentStepNumber: 0,
};

const testWorkflow: WorkflowDefinition = {
	id: "test-wf-1",
	steps: [
		{ type: "display-output", config: { message: "Step 1" } },
		{ type: "display-output", config: { message: "Step 2" } },
	],
};

const TestLayer = Layer.mergeAll(
	ExecutionContextLive(testInitialState),
	WorkflowEventBusLive,
	StepHandlerRegistryLive,
	ConfigServiceLive,
);

describe("executeWorkflow", () => {
	test("executes all steps in order", async () => {
		const program = Effect.gen(function* () {
			const eventBus = yield* WorkflowEventBus;

			const eventFiber = yield* eventBus.stream.pipe(
				Stream.take(6),
				Stream.runCollect,
				Effect.fork,
			);

			yield* Effect.sleep("10 millis");
			yield* executeWorkflow(testWorkflow, testInitialState);

			const events = yield* Fiber.join(eventFiber);
			const eventTags = Chunk.toArray(events).map((e) => e._tag);

			expect(eventTags).toContain("WorkflowStarted");
			expect(eventTags).toContain("WorkflowCompleted");
			expect(eventTags.filter((t) => t === "StepStarted").length).toBe(2);
			expect(eventTags.filter((t) => t === "StepCompleted").length).toBe(2);
		});

		await Effect.runPromise(Effect.scoped(Effect.provide(program, TestLayer)));
	});

	test("fails with MaxStepsExceededError when limit reached", async () => {
		const manyStepsWorkflow: WorkflowDefinition = {
			id: "many-steps",
			steps: Array.from({ length: 150 }, (_, i) => ({
				type: "display-output",
				config: { message: `Step ${i}` },
			})),
		};

		const program = executeWorkflow(manyStepsWorkflow, testInitialState);

		const result = await Effect.runPromiseExit(
			Effect.scoped(Effect.provide(program, TestLayer)),
		);

		expect(result._tag).toBe("Failure");
	});
});
