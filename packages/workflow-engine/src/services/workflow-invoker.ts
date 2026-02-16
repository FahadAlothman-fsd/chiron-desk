import { Context, Effect } from "effect";
import { Layer } from "effect";

export type InvokeWorkflowInput = {
  executionId: string;
  workflowId?: string;
  workflowKey?: string;
  variables: Record<string, unknown>;
  waitForCompletion?: boolean;
};

export type InvokeWorkflowResult = {
  childExecutionId: string;
  outputVariables?: Record<string, unknown>;
};

export type ChildWorkflowExecutionInput = {
  parentExecutionId: string;
  workflowId?: string;
  workflowKey?: string;
  variables: Record<string, unknown>;
  waitForCompletion?: boolean;
};

export type ChildWorkflowExecutionResult = {
  childExecutionId: string;
  outputVariables?: Record<string, unknown>;
};

export type ChildWorkflowExecutorImpl = {
  execute: (
    input: ChildWorkflowExecutionInput,
  ) => Effect.Effect<ChildWorkflowExecutionResult, unknown, never>;
};

export class ChildWorkflowExecutor extends Context.Tag("ChildWorkflowExecutor")<
  ChildWorkflowExecutor,
  ChildWorkflowExecutorImpl
>() {}

export type WorkflowInvokerImpl = {
  invoke: (input: InvokeWorkflowInput) => Effect.Effect<InvokeWorkflowResult, unknown, never>;
};

export class WorkflowInvoker extends Context.Tag("WorkflowInvoker")<
  WorkflowInvoker,
  WorkflowInvokerImpl
>() {}

export const ChildWorkflowExecutorUnimplementedLive = Layer.succeed(ChildWorkflowExecutor, {
  execute: () =>
    Effect.fail(
      new Error(
        "Child workflow executor is not configured. Provide ChildWorkflowExecutor live layer.",
      ),
    ),
} satisfies ChildWorkflowExecutorImpl);

export const ChildWorkflowExecutorLive = (execute: ChildWorkflowExecutorImpl["execute"]) =>
  Layer.succeed(ChildWorkflowExecutor, {
    execute,
  } satisfies ChildWorkflowExecutorImpl);

export const WorkflowInvokerLive = Layer.effect(
  WorkflowInvoker,
  Effect.gen(function* () {
    const childWorkflowExecutor = yield* ChildWorkflowExecutor;

    return {
      invoke: (input) =>
        Effect.gen(function* () {
          if (!input.workflowId && !input.workflowKey) {
            return yield* Effect.fail(
              new Error("Invoke step requires workflowRef.id or workflowRef.key"),
            );
          }

          return yield* childWorkflowExecutor.execute({
            parentExecutionId: input.executionId,
            workflowId: input.workflowId,
            workflowKey: input.workflowKey,
            variables: input.variables,
            waitForCompletion: input.waitForCompletion,
          });
        }),
    } satisfies WorkflowInvokerImpl;
  }),
);
