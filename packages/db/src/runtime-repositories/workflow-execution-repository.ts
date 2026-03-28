import { and, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  WorkflowExecutionRepository,
  type CreateWorkflowExecutionParams,
  type RetryWorkflowExecutionResult,
  type WorkflowExecutionRow,
} from "@chiron/workflow-engine";
import { transitionExecutions, workflowExecutions } from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;

function dbEffect<T>(
  operation: string,
  execute: () => Promise<T>,
): Effect.Effect<T, RepositoryError> {
  return Effect.tryPromise({
    try: execute,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toWorkflowExecutionRow(row: typeof workflowExecutions.$inferSelect): WorkflowExecutionRow {
  return {
    id: row.id,
    transitionExecutionId: row.transitionExecutionId,
    workflowId: row.workflowId,
    workflowRole: row.workflowRole,
    status: row.status,
    supersededByWorkflowExecutionId: row.supersededByWorkflowExecutionId,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    supersededAt: row.supersededAt,
  };
}

export function createWorkflowExecutionRepoLayer(db: DB): Layer.Layer<WorkflowExecutionRepository> {
  return Layer.succeed(WorkflowExecutionRepository, {
    createWorkflowExecution: (params: CreateWorkflowExecutionParams) =>
      dbEffect("workflow-execution.create", async () => {
        const rows = await db
          .insert(workflowExecutions)
          .values({
            transitionExecutionId: params.transitionExecutionId,
            workflowId: params.workflowId,
            workflowRole: params.workflowRole,
            status: params.status ?? "active",
            supersededByWorkflowExecutionId: params.supersededByWorkflowExecutionId ?? null,
            completedAt: params.completedAt ?? null,
            supersededAt: params.supersededAt ?? null,
          })
          .returning();

        const created = rows[0];
        if (!created) {
          throw new Error("Failed to create workflow execution");
        }

        return toWorkflowExecutionRow(created);
      }),

    getWorkflowExecutionById: (workflowExecutionId: string) =>
      dbEffect("workflow-execution.getById", async () => {
        const rows = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.id, workflowExecutionId))
          .limit(1);

        return rows[0] ? toWorkflowExecutionRow(rows[0]) : null;
      }),

    markWorkflowExecutionCompleted: (workflowExecutionId: string) =>
      dbEffect("workflow-execution.markCompleted", async () => {
        const rows = await db
          .update(workflowExecutions)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(workflowExecutions.id, workflowExecutionId))
          .returning();

        return rows[0] ? toWorkflowExecutionRow(rows[0]) : null;
      }),

    markWorkflowExecutionSuperseded: ({ workflowExecutionId, supersededByWorkflowExecutionId }) =>
      dbEffect("workflow-execution.markSuperseded", async () => {
        const rows = await db
          .update(workflowExecutions)
          .set({
            status: "superseded",
            supersededByWorkflowExecutionId,
            supersededAt: new Date(),
          })
          .where(eq(workflowExecutions.id, workflowExecutionId))
          .returning();

        return rows[0] ? toWorkflowExecutionRow(rows[0]) : null;
      }),

    updateTransitionPrimaryWorkflowExecutionPointer: ({
      transitionExecutionId,
      primaryWorkflowExecutionId,
    }) =>
      dbEffect("workflow-execution.updateTransitionPrimaryPointer", async () => {
        await db
          .update(transitionExecutions)
          .set({ primaryWorkflowExecutionId })
          .where(eq(transitionExecutions.id, transitionExecutionId));
      }),

    retryWorkflowExecution: (workflowExecutionId: string) =>
      dbEffect("workflow-execution.retry", async () => {
        return db.transaction(async (tx) => {
          const previousRows = await tx
            .select()
            .from(workflowExecutions)
            .where(eq(workflowExecutions.id, workflowExecutionId))
            .limit(1);

          const previous = previousRows[0];
          if (!previous) {
            return null;
          }

          const retryRows = await tx
            .insert(workflowExecutions)
            .values({
              transitionExecutionId: previous.transitionExecutionId,
              workflowId: previous.workflowId,
              workflowRole: previous.workflowRole,
              status: "active",
            })
            .returning();

          const retried = retryRows[0];
          if (!retried) {
            throw new Error("Failed to create retry workflow execution");
          }

          const supersededRows = await tx
            .update(workflowExecutions)
            .set({
              status: "superseded",
              supersededByWorkflowExecutionId: retried.id,
              supersededAt: new Date(),
            })
            .where(
              and(eq(workflowExecutions.id, previous.id), eq(workflowExecutions.status, "active")),
            )
            .returning();

          const superseded = supersededRows[0] ? toWorkflowExecutionRow(supersededRows[0]) : null;

          if (previous.workflowRole === "primary") {
            await tx
              .update(transitionExecutions)
              .set({ primaryWorkflowExecutionId: retried.id })
              .where(eq(transitionExecutions.id, previous.transitionExecutionId));
          }

          if (!superseded) {
            return null;
          }

          return {
            retried: toWorkflowExecutionRow(retried),
            superseded,
          } satisfies RetryWorkflowExecutionResult;
        });
      }),
  });
}
