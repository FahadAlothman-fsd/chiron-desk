import { and, asc, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ExecutionReadRepository,
  RepositoryError,
  type ActiveWorkflowExecutionReadModel,
  type TransitionExecutionDetailReadModel,
  type WorkflowExecutionDetailReadModel,
  type TransitionExecutionRow,
  type WorkflowExecutionRow,
} from "@chiron/workflow-engine";
import { projectWorkUnits, transitionExecutions, workflowExecutions } from "../schema/runtime";

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

function toTransitionExecutionRow(
  row: typeof transitionExecutions.$inferSelect,
): TransitionExecutionRow {
  return {
    id: row.id,
    projectWorkUnitId: row.projectWorkUnitId,
    transitionId: row.transitionId,
    status: row.status,
    primaryWorkflowExecutionId: row.primaryWorkflowExecutionId,
    supersededByTransitionExecutionId: row.supersededByTransitionExecutionId,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    supersededAt: row.supersededAt,
  };
}

function toWorkflowExecutionRow(row: typeof workflowExecutions.$inferSelect): WorkflowExecutionRow {
  return {
    id: row.id,
    transitionExecutionId: row.transitionExecutionId,
    workflowId: row.workflowId,
    workflowRole: row.workflowRole,
    status: row.status,
    currentStepExecutionId: row.currentStepExecutionId,
    supersededByWorkflowExecutionId: row.supersededByWorkflowExecutionId,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    supersededAt: row.supersededAt,
  };
}

export function createExecutionReadRepoLayer(db: DB): Layer.Layer<ExecutionReadRepository> {
  return Layer.succeed(ExecutionReadRepository, {
    getTransitionExecutionDetail: (transitionExecutionId: string) =>
      dbEffect("execution-read.getTransitionExecutionDetail", async () => {
        const rows = await db
          .select({
            transitionExecution: transitionExecutions,
            projectWorkUnit: projectWorkUnits,
            primaryWorkflowExecution: workflowExecutions,
          })
          .from(transitionExecutions)
          .innerJoin(
            projectWorkUnits,
            eq(projectWorkUnits.id, transitionExecutions.projectWorkUnitId),
          )
          .leftJoin(
            workflowExecutions,
            eq(transitionExecutions.primaryWorkflowExecutionId, workflowExecutions.id),
          )
          .where(eq(transitionExecutions.id, transitionExecutionId))
          .limit(1);

        const row = rows[0];
        if (!row) {
          return null;
        }

        return {
          transitionExecution: toTransitionExecutionRow(row.transitionExecution),
          projectId: row.projectWorkUnit.projectId,
          workUnitTypeId: row.projectWorkUnit.workUnitTypeId,
          currentStateId: row.projectWorkUnit.currentStateId,
          activeTransitionExecutionId: row.projectWorkUnit.activeTransitionExecutionId,
          primaryWorkflowExecution: row.primaryWorkflowExecution
            ? toWorkflowExecutionRow(row.primaryWorkflowExecution)
            : null,
        } satisfies TransitionExecutionDetailReadModel;
      }),

    listTransitionExecutionsForWorkUnit: (projectWorkUnitId: string) =>
      dbEffect("execution-read.listTransitionExecutionsForWorkUnit", async () => {
        const rows = await db
          .select()
          .from(transitionExecutions)
          .where(eq(transitionExecutions.projectWorkUnitId, projectWorkUnitId))
          .orderBy(desc(transitionExecutions.startedAt), desc(transitionExecutions.id));

        return rows.map(toTransitionExecutionRow);
      }),

    getWorkflowExecutionDetail: (workflowExecutionId: string) =>
      dbEffect("execution-read.getWorkflowExecutionDetail", async () => {
        const rows = await db
          .select({
            workflowExecution: workflowExecutions,
            transitionExecution: transitionExecutions,
            projectWorkUnit: projectWorkUnits,
          })
          .from(workflowExecutions)
          .innerJoin(
            transitionExecutions,
            eq(transitionExecutions.id, workflowExecutions.transitionExecutionId),
          )
          .innerJoin(
            projectWorkUnits,
            eq(projectWorkUnits.id, transitionExecutions.projectWorkUnitId),
          )
          .where(eq(workflowExecutions.id, workflowExecutionId))
          .limit(1);

        const row = rows[0];
        if (!row) {
          return null;
        }

        return {
          workflowExecution: toWorkflowExecutionRow(row.workflowExecution),
          transitionExecution: toTransitionExecutionRow(row.transitionExecution),
          projectId: row.projectWorkUnit.projectId,
          projectWorkUnitId: row.projectWorkUnit.id,
          workUnitTypeId: row.projectWorkUnit.workUnitTypeId,
          currentStateId: row.projectWorkUnit.currentStateId,
        } satisfies WorkflowExecutionDetailReadModel;
      }),

    listWorkflowExecutionsForTransition: (transitionExecutionId: string) =>
      dbEffect("execution-read.listWorkflowExecutionsForTransition", async () => {
        const rows = await db
          .select()
          .from(workflowExecutions)
          .where(eq(workflowExecutions.transitionExecutionId, transitionExecutionId))
          .orderBy(desc(workflowExecutions.startedAt), desc(workflowExecutions.id));

        return rows.map(toWorkflowExecutionRow);
      }),

    listActiveWorkflowExecutionsByProject: (projectId: string) =>
      dbEffect("execution-read.listActiveWorkflowExecutionsByProject", async () => {
        const rows = await db
          .select({
            workflowExecution: workflowExecutions,
            transitionExecution: transitionExecutions,
            projectWorkUnit: projectWorkUnits,
          })
          .from(workflowExecutions)
          .innerJoin(
            transitionExecutions,
            eq(transitionExecutions.id, workflowExecutions.transitionExecutionId),
          )
          .innerJoin(
            projectWorkUnits,
            eq(projectWorkUnits.id, transitionExecutions.projectWorkUnitId),
          )
          .where(
            and(
              eq(projectWorkUnits.projectId, projectId),
              eq(workflowExecutions.status, "active"),
              eq(transitionExecutions.status, "active"),
            ),
          )
          .orderBy(asc(workflowExecutions.startedAt), asc(workflowExecutions.id));

        return rows.map((row) => {
          return {
            workflowExecution: toWorkflowExecutionRow(row.workflowExecution),
            transitionExecution: toTransitionExecutionRow(row.transitionExecution),
            projectWorkUnitId: row.projectWorkUnit.id,
            projectId: row.projectWorkUnit.projectId,
          } satisfies ActiveWorkflowExecutionReadModel;
        });
      }),
  });
}
