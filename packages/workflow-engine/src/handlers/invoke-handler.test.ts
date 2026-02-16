import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { makeInvokeHandler } from "./invoke-handler";
import { WorkflowInvoker } from "../services/workflow-invoker";

describe("invoke-handler", () => {
  it("stores child execution reference by default", async () => {
    const handler = makeInvokeHandler();

    const result = await Effect.runPromise(
      handler({
        executionId: "exec-1",
        step: {
          type: "invoke",
          id: "invoke-1",
          workflowRef: { id: "child-workflow" },
        },
        variables: { inputValue: 1 },
      }).pipe(
        Effect.provideService(WorkflowInvoker, {
          invoke: () => Effect.succeed({ childExecutionId: "child-exec-1" }),
        }),
      ),
    );

    expect(result.outputVariables).toEqual({ "invoke-1.child": "child-exec-1" });
    expect(result.requiresUserInput).toBe(false);
  });

  it("writes returned variables directly when output mode is variables", async () => {
    const handler = makeInvokeHandler();

    const result = await Effect.runPromise(
      handler({
        executionId: "exec-1",
        step: {
          type: "invoke",
          id: "invoke-2",
          workflowRef: { key: "child.key" },
          output: { mode: "variables", target: "ignored-by-handler" },
        },
        variables: { inputValue: 1 },
      }).pipe(
        Effect.provideService(WorkflowInvoker, {
          invoke: () =>
            Effect.succeed({
              childExecutionId: "child-exec-2",
              outputVariables: { score: 42, status: "ok" },
            }),
        }),
      ),
    );

    expect(result.outputVariables).toEqual({ score: 42, status: "ok" });
  });

  it("stores namespaced object when output mode is namespace", async () => {
    const handler = makeInvokeHandler();

    const result = await Effect.runPromise(
      handler({
        executionId: "exec-1",
        step: {
          type: "invoke",
          id: "invoke-3",
          workflowRef: { id: "child-workflow" },
          output: { mode: "namespace", target: "childResult" },
        },
        variables: { inputValue: 1 },
      }).pipe(
        Effect.provideService(WorkflowInvoker, {
          invoke: () =>
            Effect.succeed({
              childExecutionId: "child-exec-3",
              outputVariables: { done: true },
            }),
        }),
      ),
    );

    expect(result.outputVariables).toEqual({ childResult: { done: true } });
  });
});
