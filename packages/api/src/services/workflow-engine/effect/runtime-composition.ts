import { db, eq, workflowExecutions, workflows } from "@chiron/db";
import { Effect, Layer } from "effect";
import type { ExecutionState } from "../../../../../workflow-engine/src/services/execution-context";
import { WorkflowEngineRuntimeLive } from "../../../../../workflow-engine/src/services/live";
import { ChildWorkflowExecutorLive } from "../../../../../workflow-engine/src/services/workflow-invoker";
import { executeWorkflow } from "./executor";

const resolveWorkflowId = (workflowId?: string, workflowKey?: string): Promise<string> =>
  Effect.runPromise(
    Effect.gen(function* () {
      if (workflowId) {
        return workflowId;
      }

      if (!workflowKey) {
        return yield* Effect.fail(
          new Error("Child workflow invocation requires workflowId or workflowKey"),
        );
      }

      const row = yield* Effect.promise(() =>
        db.query.workflows.findFirst({
          where: eq(workflows.name, workflowKey),
          columns: { id: true },
        }),
      );

      if (!row) {
        return yield* Effect.fail(new Error(`Workflow key not found: ${workflowKey}`));
      }

      return row.id;
    }),
  );

export const WorkflowEngineRuntimeForApiLive = (initialState: ExecutionState) =>
  WorkflowEngineRuntimeLive(initialState).pipe(
    Layer.provideMerge(
      ChildWorkflowExecutorLive((input) =>
        Effect.gen(function* () {
          const resolvedWorkflowId = yield* Effect.promise(() =>
            resolveWorkflowId(input.workflowId, input.workflowKey),
          );

          const childExecutionId = yield* Effect.promise(() =>
            executeWorkflow({
              workflowId: resolvedWorkflowId,
              userId: initialState.userId ?? "system",
              projectId: initialState.projectId,
              parentExecutionId: input.parentExecutionId,
              initialVariables: input.variables,
            }),
          );

          if (!input.waitForCompletion) {
            return { childExecutionId };
          }

          const childExecution = yield* Effect.promise(() =>
            db.query.workflowExecutions.findFirst({
              where: eq(workflowExecutions.id, childExecutionId),
              columns: { variables: true },
            }),
          );

          return {
            childExecutionId,
            outputVariables: childExecution?.variables ?? {},
          };
        }),
      ),
    ),
  );
