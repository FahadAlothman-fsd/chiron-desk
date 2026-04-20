import { and, asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  WorkflowContextFactRepository,
  type CreateWorkflowContextFactValueParams,
  type DeleteWorkflowContextFactValuesParams,
  type RemoveWorkflowContextFactValueParams,
  type UpdateWorkflowContextFactValueParams,
  type WorkflowContextFactRecordRow,
  type WorkflowContextFactValueRow,
} from "@chiron/workflow-engine";
import {
  workflowExecutionContextFactRecords,
  workflowExecutionContextFacts,
} from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;
type DBLike = Pick<DB, "select" | "insert" | "update" | "delete">;

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toValueRow(
  row: typeof workflowExecutionContextFacts.$inferSelect,
): WorkflowContextFactValueRow {
  return {
    id: row.id,
    workflowExecutionId: row.workflowExecutionId,
    contextFactDefinitionId: row.contextFactDefinitionId,
    instanceId: row.instanceId,
    instanceOrder: row.instanceOrder,
    valueJson: row.valueJson,
    sourceStepExecutionId: row.sourceStepExecutionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toRecordRow(
  row: typeof workflowExecutionContextFactRecords.$inferSelect,
): WorkflowContextFactRecordRow {
  return {
    id: row.id,
    workflowExecutionId: row.workflowExecutionId,
    contextFactDefinitionId: row.contextFactDefinitionId,
    instanceId: row.instanceId,
    verb: row.verb,
    valueJson: row.valueJson,
    sourceStepExecutionId: row.sourceStepExecutionId,
    createdAt: row.createdAt,
  };
}

async function listCurrentRowsByDefinition(
  db: DBLike,
  workflowExecutionId: string,
  contextFactDefinitionId: string,
) {
  return db
    .select()
    .from(workflowExecutionContextFacts)
    .where(
      and(
        eq(workflowExecutionContextFacts.workflowExecutionId, workflowExecutionId),
        eq(workflowExecutionContextFacts.contextFactDefinitionId, contextFactDefinitionId),
      ),
    )
    .orderBy(
      asc(workflowExecutionContextFacts.instanceOrder),
      asc(workflowExecutionContextFacts.createdAt),
      asc(workflowExecutionContextFacts.id),
    );
}

async function insertRecord(
  db: DBLike,
  params: {
    workflowExecutionId: string;
    contextFactDefinitionId: string;
    instanceId: string | null;
    verb: WorkflowContextFactRecordRow["verb"];
    valueJson: unknown;
    sourceStepExecutionId?: string | null;
  },
) {
  await db.insert(workflowExecutionContextFactRecords).values({
    workflowExecutionId: params.workflowExecutionId,
    contextFactDefinitionId: params.contextFactDefinitionId,
    instanceId: params.instanceId,
    verb: params.verb,
    valueJson: params.valueJson,
    sourceStepExecutionId: params.sourceStepExecutionId ?? null,
  });
}

export function createWorkflowContextFactRepoLayer(
  db: DB,
): Layer.Layer<WorkflowContextFactRepository> {
  return Layer.succeed(WorkflowContextFactRepository, {
    createFactValue: (params: CreateWorkflowContextFactValueParams) =>
      dbEffect("runtime.workflowContextFacts.createFactValue", async () => {
        return db.transaction(async (tx) => {
          const currentRows = await listCurrentRowsByDefinition(
            tx,
            params.workflowExecutionId,
            params.contextFactDefinitionId,
          );
          const nextInstanceOrder = (currentRows.at(-1)?.instanceOrder ?? -1) + 1;
          const inserted = await tx
            .insert(workflowExecutionContextFacts)
            .values({
              workflowExecutionId: params.workflowExecutionId,
              contextFactDefinitionId: params.contextFactDefinitionId,
              instanceOrder: nextInstanceOrder,
              valueJson: params.valueJson,
              sourceStepExecutionId: params.sourceStepExecutionId ?? null,
            })
            .returning();

          const row = inserted[0];
          if (!row) {
            throw new Error("Failed to create workflow-context fact value");
          }

          await insertRecord(tx, {
            workflowExecutionId: params.workflowExecutionId,
            contextFactDefinitionId: params.contextFactDefinitionId,
            instanceId: row.instanceId,
            verb: "create",
            valueJson: params.valueJson,
            ...(params.sourceStepExecutionId !== undefined
              ? { sourceStepExecutionId: params.sourceStepExecutionId }
              : {}),
          });

          return toValueRow(row);
        });
      }),

    updateFactValue: (params: UpdateWorkflowContextFactValueParams) =>
      dbEffect("runtime.workflowContextFacts.updateFactValue", async () => {
        return db.transaction(async (tx) => {
          const updated = await tx
            .update(workflowExecutionContextFacts)
            .set({
              valueJson: params.valueJson,
              sourceStepExecutionId: params.sourceStepExecutionId ?? null,
            })
            .where(
              and(
                eq(workflowExecutionContextFacts.workflowExecutionId, params.workflowExecutionId),
                eq(
                  workflowExecutionContextFacts.contextFactDefinitionId,
                  params.contextFactDefinitionId,
                ),
                eq(workflowExecutionContextFacts.instanceId, params.instanceId),
              ),
            )
            .returning();

          const row = updated[0] ?? null;
          if (!row) {
            return null;
          }

          await insertRecord(tx, {
            workflowExecutionId: params.workflowExecutionId,
            contextFactDefinitionId: params.contextFactDefinitionId,
            instanceId: params.instanceId,
            verb: "update",
            valueJson: params.valueJson,
            ...(params.sourceStepExecutionId !== undefined
              ? { sourceStepExecutionId: params.sourceStepExecutionId }
              : {}),
          });

          return toValueRow(row);
        });
      }),

    removeFactValue: (params: RemoveWorkflowContextFactValueParams) =>
      dbEffect("runtime.workflowContextFacts.removeFactValue", async () => {
        return db.transaction(async (tx) => {
          const removed = await tx
            .delete(workflowExecutionContextFacts)
            .where(
              and(
                eq(workflowExecutionContextFacts.workflowExecutionId, params.workflowExecutionId),
                eq(
                  workflowExecutionContextFacts.contextFactDefinitionId,
                  params.contextFactDefinitionId,
                ),
                eq(workflowExecutionContextFacts.instanceId, params.instanceId),
              ),
            )
            .returning();

          if (removed.length === 0) {
            return false;
          }

          await insertRecord(tx, {
            workflowExecutionId: params.workflowExecutionId,
            contextFactDefinitionId: params.contextFactDefinitionId,
            instanceId: params.instanceId,
            verb: "remove",
            valueJson: null,
            ...(params.sourceStepExecutionId !== undefined
              ? { sourceStepExecutionId: params.sourceStepExecutionId }
              : {}),
          });

          return true;
        });
      }),

    deleteFactValues: (params: DeleteWorkflowContextFactValuesParams) =>
      dbEffect("runtime.workflowContextFacts.deleteFactValues", async () => {
        return db.transaction(async (tx) => {
          const removed = await tx
            .delete(workflowExecutionContextFacts)
            .where(
              and(
                eq(workflowExecutionContextFacts.workflowExecutionId, params.workflowExecutionId),
                eq(
                  workflowExecutionContextFacts.contextFactDefinitionId,
                  params.contextFactDefinitionId,
                ),
              ),
            )
            .returning();

          if (removed.length > 0) {
            await insertRecord(tx, {
              workflowExecutionId: params.workflowExecutionId,
              contextFactDefinitionId: params.contextFactDefinitionId,
              instanceId: null,
              verb: "delete",
              valueJson: removed.length,
              ...(params.sourceStepExecutionId !== undefined
                ? { sourceStepExecutionId: params.sourceStepExecutionId }
                : {}),
            });
          }

          return removed.length;
        });
      }),

    listCurrentFactValuesByDefinition: ({ workflowExecutionId, contextFactDefinitionId }) =>
      dbEffect("runtime.workflowContextFacts.listCurrentFactValuesByDefinition", async () => {
        const rows = await listCurrentRowsByDefinition(
          db,
          workflowExecutionId,
          contextFactDefinitionId,
        );
        return rows.map(toValueRow);
      }),

    listCurrentFactsByWorkflowExecution: (workflowExecutionId: string) =>
      dbEffect("runtime.workflowContextFacts.listCurrentFactsByWorkflowExecution", async () => {
        const rows = await db
          .select()
          .from(workflowExecutionContextFacts)
          .where(eq(workflowExecutionContextFacts.workflowExecutionId, workflowExecutionId))
          .orderBy(
            asc(workflowExecutionContextFacts.contextFactDefinitionId),
            asc(workflowExecutionContextFacts.instanceOrder),
            asc(workflowExecutionContextFacts.createdAt),
            asc(workflowExecutionContextFacts.id),
          );

        return rows.map(toValueRow);
      }),

    listFactRecordsByDefinition: ({ workflowExecutionId, contextFactDefinitionId }) =>
      dbEffect("runtime.workflowContextFacts.listFactRecordsByDefinition", async () => {
        const rows = await db
          .select()
          .from(workflowExecutionContextFactRecords)
          .where(
            and(
              eq(workflowExecutionContextFactRecords.workflowExecutionId, workflowExecutionId),
              eq(
                workflowExecutionContextFactRecords.contextFactDefinitionId,
                contextFactDefinitionId,
              ),
            ),
          )
          .orderBy(
            asc(workflowExecutionContextFactRecords.createdAt),
            asc(workflowExecutionContextFactRecords.id),
          );

        return rows.map(toRecordRow);
      }),
  });
}
