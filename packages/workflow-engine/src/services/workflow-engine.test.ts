import { describe, expect, it } from "bun:test";
import { Effect, Fiber, Layer, Stream } from "effect";
import { makeActionHandler } from "../handlers/action-handler";
import { makeFormHandler } from "../handlers/form-handler";
import { ApprovalGateway } from "./approval-gateway";
import { ApprovalGatewayLive } from "./approval-gateway";
import { ActionServiceLive } from "./action-service";
import type { WorkflowEvent } from "./event-bus";
import { WorkflowEventBus } from "./event-bus";
import type { ExecutionState } from "./execution-context";
import { ExecutionContext } from "./execution-context";
import { ExecutionContextLive } from "./execution-context";
import { StepHandlerRegistryLive } from "./step-registry";
import { VariableServiceLive } from "./variable-service";
import { WorkflowEngine, WorkflowEngineLive } from "./workflow-engine";

const makeInitialState = (): ExecutionState => ({
  executionId: "exec-integration-1",
  workflowId: "wf-integration",
  variables: {},
  currentStepNumber: 0,
});

const makeTestRuntime = (initialState: ExecutionState) => {
  const executionContextLayer = ExecutionContextLive(initialState);
  const variableServiceLayer = Layer.provide(VariableServiceLive, executionContextLayer);
  const actionServiceLayer = Layer.provide(ActionServiceLive, variableServiceLayer);

  return Layer.mergeAll(
    executionContextLayer,
    variableServiceLayer,
    ApprovalGatewayLive,
    actionServiceLayer,
    StepHandlerRegistryLive({
      form: makeFormHandler(),
      action: makeActionHandler(),
    }),
    Layer.succeed(WorkflowEngine, WorkflowEngineLive),
  );
};

describe("workflow-engine integration", () => {
  it("supports execute -> requiresUserInput -> continue", async () => {
    const events: WorkflowEvent[] = [];

    await Effect.runPromise(
      Effect.gen(function* () {
        const engine = yield* WorkflowEngine;
        const executionContext = yield* ExecutionContext;

        yield* engine.execute({
          executionId: "exec-integration-1",
          workflow: {
            id: "wf-integration",
            name: "Integration Workflow",
            steps: [
              {
                type: "form",
                id: "form-1",
                fields: [
                  {
                    key: "name",
                    type: "string",
                    validation: { required: true },
                  },
                ],
              },
              {
                type: "action",
                id: "action-1",
                actions: [
                  {
                    id: "set-greeting",
                    kind: "variable",
                    operation: "set",
                    name: "greeting",
                    value: "Hello {{name}}",
                  },
                ],
              },
            ],
          },
        });

        const pausedState = yield* executionContext.getState();
        expect(pausedState.variables.name).toBeUndefined();
        expect(pausedState.variables["__workflow.currentStepIndex"]).toBe(0);

        yield* engine.continue({
          userInput: { name: "Ada" },
        });

        const resumedState = yield* executionContext.getState();
        expect(resumedState.variables.name).toBe("Ada");
        expect(resumedState.variables.greeting).toBe("Hello Ada");
        const workflowCompletedCount = events.filter(
          (event) => event._tag === "WorkflowCompleted",
        ).length;
        expect(workflowCompletedCount).toBe(1);
      }).pipe(
        Effect.provide(makeTestRuntime(makeInitialState())),
        Effect.provideService(WorkflowEventBus, {
          publish: (event) =>
            Effect.sync(() => {
              events.push(event);
              return true;
            }),
          stream: Stream.empty,
        }),
      ),
    );
  });

  it("emits ApprovalResolved and clears pending approval on submitApproval", async () => {
    const events: WorkflowEvent[] = [];

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const engine = yield* WorkflowEngine;
        const approvalGateway = yield* ApprovalGateway;

        const requestFiber = yield* approvalGateway
          .request({
            toolCallId: "call-approve-1",
            toolName: "write_file",
            executionId: "exec-integration-1",
            stepId: "step-approve-1",
            args: { path: "README.md" },
          })
          .pipe(Effect.fork);

        yield* Effect.yieldNow();

        yield* engine.submitApproval({
          toolCallId: "call-approve-1",
          toolName: "write_file",
          stepId: "step-approve-1",
          action: "edit",
          editedArgs: { path: "README.md", mode: "safe" },
          feedback: "Adjusted to safe mode",
        });

        const resolution = yield* Fiber.join(requestFiber);
        const resolveAgain = yield* approvalGateway.resolve({
          toolCallId: "call-approve-1",
          toolName: "write_file",
          action: "approve",
        });

        return { resolution, resolveAgain };
      }).pipe(
        Effect.provide(makeTestRuntime(makeInitialState())),
        Effect.provideService(WorkflowEventBus, {
          publish: (event) =>
            Effect.sync(() => {
              events.push(event);
              return true;
            }),
          stream: Stream.empty,
        }),
      ),
    );

    expect(result.resolution.action).toBe("edit");
    expect(result.resolution.editedArgs).toEqual({ path: "README.md", mode: "safe" });
    expect(result.resolveAgain).toBe(false);

    const approvalResolvedEvent = events.find((event) => event._tag === "ApprovalResolved");
    expect(approvalResolvedEvent).toBeDefined();
    if (approvalResolvedEvent && approvalResolvedEvent._tag === "ApprovalResolved") {
      expect(approvalResolvedEvent.toolCallId).toBe("call-approve-1");
      expect(approvalResolvedEvent.action).toBe("edit");
    }
  });
});
