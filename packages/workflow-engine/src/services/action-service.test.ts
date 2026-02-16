import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { type ExecutionState, ExecutionContextLive } from "./execution-context";
import { ActionService, ActionServiceLive } from "./action-service";
import { VariableServiceLive } from "./variable-service";

const makeInitialState = (variables: Record<string, unknown> = {}): ExecutionState => ({
  executionId: "exec-action-test",
  workflowId: "wf-action-test",
  variables,
  currentStepNumber: 0,
});

describe("action-service", () => {
  it("executes variable append and increment operations", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const actionService = yield* ActionService;

        yield* actionService.execute({
          executionId: "exec-action-test",
          stepId: "step-1",
          action: {
            id: "append-1",
            kind: "variable",
            operation: "append",
            target: "items",
            value: "{{name}}",
          },
          variables: { name: "Ada" },
        });

        const increment = yield* actionService.execute({
          executionId: "exec-action-test",
          stepId: "step-1",
          action: {
            id: "inc-1",
            kind: "variable",
            operation: "increment",
            target: "count",
            by: 2,
          },
          variables: {},
        });

        return increment;
      }).pipe(
        Effect.provide(ActionServiceLive),
        Effect.provide(VariableServiceLive),
        Effect.provide(
          ExecutionContextLive(makeInitialState({ items: [], count: 1, name: "Ada" })),
        ),
      ),
    );

    expect(result.outputVariable).toBe("count");
    expect(result.outputValue).toBe(3);
  });

  it("renders file templates and reads env values", async () => {
    process.env.ACTION_SERVICE_TEST_ENV = "enabled";

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const actionService = yield* ActionService;

        const rendered = yield* actionService.execute({
          executionId: "exec-action-test",
          stepId: "step-2",
          action: {
            id: "tpl-1",
            kind: "file",
            operation: "template",
            content: "Hello {{name}}",
            outputVariable: "rendered",
          },
          variables: { name: "Grace" },
        });

        const env = yield* actionService.execute({
          executionId: "exec-action-test",
          stepId: "step-2",
          action: {
            id: "env-1",
            kind: "env",
            operation: "get",
            name: "ACTION_SERVICE_TEST_ENV",
          },
          variables: {},
        });

        return { rendered, env };
      }).pipe(
        Effect.provide(ActionServiceLive),
        Effect.provide(VariableServiceLive),
        Effect.provide(ExecutionContextLive(makeInitialState({ name: "Grace" }))),
      ),
    );

    expect(result.rendered.outputVariable).toBe("rendered");
    expect(result.rendered.outputValue).toBe("Hello Grace");
    expect(result.env.outputValue).toBe("enabled");
  });
});
