import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import {
  ChildWorkflowExecutorLive,
  ChildWorkflowExecutorUnimplementedLive,
  WorkflowInvoker,
  WorkflowInvokerLive,
} from "./workflow-invoker";

describe("workflow-invoker", () => {
  it("fails when child workflow executor is not configured", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const invoker = yield* WorkflowInvoker;
        return yield* invoker.invoke({
          executionId: "exec-parent",
          workflowId: "child-workflow",
          variables: { a: 1 },
        });
      }).pipe(
        Effect.provide(WorkflowInvokerLive),
        Effect.provide(ChildWorkflowExecutorUnimplementedLive),
      ),
    );

    expect(exit._tag).toBe("Failure");
  });

  it("delegates invocation to configured child workflow executor", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const invoker = yield* WorkflowInvoker;
        return yield* invoker.invoke({
          executionId: "exec-parent",
          workflowId: "child-workflow",
          variables: { input: "x" },
          waitForCompletion: true,
        });
      }).pipe(
        Effect.provide(WorkflowInvokerLive),
        Effect.provide(
          ChildWorkflowExecutorLive((input) =>
            Effect.succeed({
              childExecutionId: `${input.parentExecutionId}:${input.workflowId}`,
              outputVariables: input.waitForCompletion
                ? { echoed: input.variables.input }
                : undefined,
            }),
          ),
        ),
      ),
    );

    expect(result.childExecutionId).toBe("exec-parent:child-workflow");
    expect(result.outputVariables).toEqual({ echoed: "x" });
  });

  it("fails when invoke call has no workflow id or key", async () => {
    const exit = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const invoker = yield* WorkflowInvoker;
        return yield* invoker.invoke({
          executionId: "exec-parent",
          variables: {},
        });
      }).pipe(
        Effect.provide(WorkflowInvokerLive),
        Effect.provide(
          ChildWorkflowExecutorLive(() => Effect.succeed({ childExecutionId: "unused" })),
        ),
      ),
    );

    expect(exit._tag).toBe("Failure");
  });
});
