import { and, asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  TransitionExecutionRepository,
  type CreateTransitionExecutionParams,
  type StartTransitionExecutionParams,
  type SwitchActiveTransitionExecutionParams,
  type SwitchActiveTransitionExecutionResult,
  type TransitionExecutionRow,
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

async function readActiveTransitionExecutionForWorkUnit(
  db: DB | Parameters<Parameters<DB["transaction"]>[0]>[0],
  projectWorkUnitId: string,
): Promise<TransitionExecutionRow | null> {
  const rows = await db
    .select({ transitionExecution: transitionExecutions })
    .from(projectWorkUnits)
    .innerJoin(
      transitionExecutions,
      eq(projectWorkUnits.activeTransitionExecutionId, transitionExecutions.id),
    )
    .where(eq(projectWorkUnits.id, projectWorkUnitId))
    .limit(1);

  return rows[0] ? toTransitionExecutionRow(rows[0].transitionExecution) : null;
}

export function createTransitionExecutionRepoLayer(
  db: DB,
): Layer.Layer<TransitionExecutionRepository> {
  return Layer.succeed(TransitionExecutionRepository, {
    createTransitionExecution: (params: CreateTransitionExecutionParams) =>
      dbEffect("transition-execution.create", async () => {
        const rows = await db
          .insert(transitionExecutions)
          .values({
            projectWorkUnitId: params.projectWorkUnitId,
            transitionId: params.transitionId,
            status: params.status ?? "active",
            primaryWorkflowExecutionId: params.primaryWorkflowExecutionId ?? null,
            supersededByTransitionExecutionId: params.supersededByTransitionExecutionId ?? null,
            completedAt: params.completedAt ?? null,
            supersededAt: params.supersededAt ?? null,
          })
          .returning();

        const inserted = rows[0];
        if (!inserted) {
          throw new Error("Failed to create transition execution");
        }

        return toTransitionExecutionRow(inserted);
      }),

    startTransitionExecution: (params: StartTransitionExecutionParams) =>
      dbEffect("transition-execution.start", async () => {
        return db.transaction(async (tx) => {
          const transitionRows = await tx
            .insert(transitionExecutions)
            .values({
              projectWorkUnitId: params.projectWorkUnitId,
              transitionId: params.transitionId,
              status: "active",
            })
            .returning();

          const started = transitionRows[0];
          if (!started) {
            throw new Error("Failed to insert transition execution");
          }

          await tx
            .update(projectWorkUnits)
            .set({ activeTransitionExecutionId: started.id })
            .where(eq(projectWorkUnits.id, params.projectWorkUnitId));

          return toTransitionExecutionRow(started);
        });
      }),

    switchActiveTransitionExecution: (params: SwitchActiveTransitionExecutionParams) =>
      dbEffect("transition-execution.switch", async () => {
        return db.transaction(async (tx) => {
          const active = await readActiveTransitionExecutionForWorkUnit(
            tx,
            params.projectWorkUnitId,
          );

          const startedRows = await tx
            .insert(transitionExecutions)
            .values({
              projectWorkUnitId: params.projectWorkUnitId,
              transitionId: params.transitionId,
              status: "active",
            })
            .returning();

          const started = startedRows[0];
          if (!started) {
            throw new Error("Failed to insert switched transition execution");
          }

          let superseded: TransitionExecutionRow | null = null;
          if (active) {
            const supersededRows = await tx
              .update(transitionExecutions)
              .set({
                status: "superseded",
                supersededByTransitionExecutionId: started.id,
                supersededAt: new Date(),
              })
              .where(
                and(
                  eq(transitionExecutions.id, active.id),
                  eq(transitionExecutions.status, "active"),
                ),
              )
              .returning();
            superseded = supersededRows[0] ? toTransitionExecutionRow(supersededRows[0]) : null;

            if (active.primaryWorkflowExecutionId) {
              await tx
                .update(workflowExecutions)
                .set({ status: "parent_superseded", supersededAt: new Date() })
                .where(
                  and(
                    eq(workflowExecutions.id, active.primaryWorkflowExecutionId),
                    eq(workflowExecutions.status, "active"),
                  ),
                );
            }
          }

          await tx
            .update(projectWorkUnits)
            .set({ activeTransitionExecutionId: started.id })
            .where(eq(projectWorkUnits.id, params.projectWorkUnitId));

          return {
            started: toTransitionExecutionRow(started),
            superseded,
          } satisfies SwitchActiveTransitionExecutionResult;
        });
      }),

    getActiveTransitionExecutionForWorkUnit: (projectWorkUnitId: string) =>
      dbEffect("transition-execution.getActiveForWorkUnit", async () => {
        return readActiveTransitionExecutionForWorkUnit(db, projectWorkUnitId);
      }),

    getTransitionExecutionById: (transitionExecutionId: string) =>
      dbEffect("transition-execution.getById", async () => {
        const rows = await db
          .select()
          .from(transitionExecutions)
          .where(eq(transitionExecutions.id, transitionExecutionId))
          .orderBy(asc(transitionExecutions.startedAt), asc(transitionExecutions.id))
          .limit(1);

        return rows[0] ? toTransitionExecutionRow(rows[0]) : null;
      }),

    completeTransitionExecutionAtomically: ({
      transitionExecutionId,
      projectWorkUnitId,
      newStateId,
      newStateKey,
      newStateLabel,
    }) =>
      dbEffect("transition-execution.completeAtomic", async () => {
        return db.transaction(async (tx) => {
          const completedRows = await tx
            .update(transitionExecutions)
            .set({
              status: "completed",
              completedAt: new Date(),
              supersededByTransitionExecutionId: null,
              supersededAt: null,
            })
            .where(
              and(
                eq(transitionExecutions.id, transitionExecutionId),
                eq(transitionExecutions.projectWorkUnitId, projectWorkUnitId),
                eq(transitionExecutions.status, "active"),
              ),
            )
            .returning({ id: transitionExecutions.id });

          if (completedRows.length === 0) {
            throw new Error("Failed to complete transition execution atomically");
          }

          const workUnitRows = await tx
            .update(projectWorkUnits)
            .set({
              currentStateId: newStateId,
              activeTransitionExecutionId: null,
            })
            .where(
              and(
                eq(projectWorkUnits.id, projectWorkUnitId),
                eq(projectWorkUnits.activeTransitionExecutionId, transitionExecutionId),
              ),
            )
            .returning({ id: projectWorkUnits.id });

          if (workUnitRows.length === 0) {
            throw new Error("Failed to update project work unit state atomically");
          }

          return {
            transitionExecutionId,
            projectWorkUnitId,
            newStateId,
            newStateKey,
            newStateLabel,
          };
        });
      }),
  });
}
