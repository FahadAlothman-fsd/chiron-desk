import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  WorkUnitFactRepository,
  type CreateVersionedWorkUnitFactSuccessorParams,
  type DeleteWorkUnitFactInstanceParams,
  type ManualUpdateWorkUnitFactInstanceParams,
  type WorkUnitFactInstanceRow,
} from "@chiron/workflow-engine";
import { workUnitFactInstances } from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;
type DBLike = Pick<DB, "select" | "insert" | "update">;

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toRow(row: typeof workUnitFactInstances.$inferSelect): WorkUnitFactInstanceRow {
  return {
    id: row.id,
    projectWorkUnitId: row.projectWorkUnitId,
    factDefinitionId: row.factDefinitionId,
    valueJson: row.valueJson,
    referencedProjectWorkUnitId: row.referencedProjectWorkUnitId,
    status: row.status,
    supersededByFactInstanceId: row.supersededByFactInstanceId,
    producedByTransitionExecutionId: row.producedByTransitionExecutionId,
    producedByWorkflowExecutionId: row.producedByWorkflowExecutionId,
    authoredByUserId: row.authoredByUserId,
    createdAt: row.createdAt,
  };
}

async function getFactRowById(db: DBLike, workUnitFactInstanceId: string) {
  const rows = await db
    .select()
    .from(workUnitFactInstances)
    .where(eq(workUnitFactInstances.id, workUnitFactInstanceId))
    .limit(1);

  return rows[0] ?? null;
}

async function insertWorkUnitFactRow(
  db: DBLike,
  params: {
    projectWorkUnitId: string;
    factDefinitionId: string;
    valueJson?: unknown;
    referencedProjectWorkUnitId?: string | null;
    status: WorkUnitFactInstanceRow["status"];
    producedByTransitionExecutionId?: string | null;
    producedByWorkflowExecutionId?: string | null;
    authoredByUserId?: string | null;
  },
) {
  const inserted = await db
    .insert(workUnitFactInstances)
    .values({
      projectWorkUnitId: params.projectWorkUnitId,
      factDefinitionId: params.factDefinitionId,
      valueJson:
        params.referencedProjectWorkUnitId === undefined ||
        params.referencedProjectWorkUnitId === null
          ? (params.valueJson ?? null)
          : null,
      referencedProjectWorkUnitId: params.referencedProjectWorkUnitId ?? null,
      status: params.status,
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
      producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
      authoredByUserId: params.authoredByUserId ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create work-unit fact instance");
  }

  return row;
}

async function supersedeWorkUnitFactRow(
  db: DBLike,
  workUnitFactInstanceId: string,
  supersededByWorkUnitFactInstanceId: string,
) {
  await db
    .update(workUnitFactInstances)
    .set({
      status: "superseded",
      supersededByFactInstanceId: supersededByWorkUnitFactInstanceId,
    })
    .where(eq(workUnitFactInstances.id, workUnitFactInstanceId));
}

const ACTIVE_CURRENT_FACT_FILTER = and(
  eq(workUnitFactInstances.status, "active"),
  isNull(workUnitFactInstances.supersededByFactInstanceId),
);

export function createWorkUnitFactRepoLayer(db: DB): Layer.Layer<WorkUnitFactRepository> {
  return Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: (params) =>
      dbEffect("runtime.workUnitFacts.createFactInstance", async () => {
        const inserted = await db
          .insert(workUnitFactInstances)
          .values({
            projectWorkUnitId: params.projectWorkUnitId,
            factDefinitionId: params.factDefinitionId,
            valueJson:
              params.referencedProjectWorkUnitId === undefined ||
              params.referencedProjectWorkUnitId === null
                ? (params.valueJson ?? null)
                : null,
            referencedProjectWorkUnitId: params.referencedProjectWorkUnitId ?? null,
            status: "active",
            supersededByFactInstanceId: null,
            producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
            producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
            authoredByUserId: params.authoredByUserId ?? null,
          })
          .returning();

        const row = inserted[0];
        if (!row) {
          throw new Error("Failed to create work-unit fact instance");
        }

        return toRow(row);
      }),

    getCurrentValuesByDefinition: ({ projectWorkUnitId, factDefinitionId }) =>
      dbEffect("runtime.workUnitFacts.getCurrentValuesByDefinition", async () => {
        const rows = await db
          .select()
          .from(workUnitFactInstances)
          .where(
            and(
              eq(workUnitFactInstances.projectWorkUnitId, projectWorkUnitId),
              eq(workUnitFactInstances.factDefinitionId, factDefinitionId),
              ACTIVE_CURRENT_FACT_FILTER,
            ),
          )
          .orderBy(desc(workUnitFactInstances.createdAt), desc(workUnitFactInstances.id));

        return rows.map(toRow);
      }),

    listFactsByWorkUnit: ({ projectWorkUnitId }) =>
      dbEffect("runtime.workUnitFacts.listFactsByWorkUnit", async () => {
        const rows = await db
          .select()
          .from(workUnitFactInstances)
          .where(
            and(
              eq(workUnitFactInstances.projectWorkUnitId, projectWorkUnitId),
              ACTIVE_CURRENT_FACT_FILTER,
            ),
          )
          .orderBy(
            asc(workUnitFactInstances.factDefinitionId),
            desc(workUnitFactInstances.createdAt),
            desc(workUnitFactInstances.id),
          );

        return rows.map(toRow);
      }),

    supersedeFactInstance: ({ workUnitFactInstanceId, supersededByWorkUnitFactInstanceId }) =>
      dbEffect("runtime.workUnitFacts.supersedeFactInstance", async () => {
        await supersedeWorkUnitFactRow(
          db,
          workUnitFactInstanceId,
          supersededByWorkUnitFactInstanceId,
        );
      }),

    manualUpdateFactInstance: (params: ManualUpdateWorkUnitFactInstanceParams) =>
      dbEffect("runtime.workUnitFacts.manualUpdateFactInstance", async () => {
        const updated = await db
          .update(workUnitFactInstances)
          .set({
            ...(params.valueJson !== undefined ? { valueJson: params.valueJson } : {}),
            ...(params.referencedProjectWorkUnitId !== undefined
              ? { referencedProjectWorkUnitId: params.referencedProjectWorkUnitId }
              : {}),
            ...(params.producedByTransitionExecutionId !== undefined
              ? { producedByTransitionExecutionId: params.producedByTransitionExecutionId }
              : {}),
            ...(params.producedByWorkflowExecutionId !== undefined
              ? { producedByWorkflowExecutionId: params.producedByWorkflowExecutionId }
              : {}),
            ...(params.authoredByUserId !== undefined
              ? { authoredByUserId: params.authoredByUserId }
              : {}),
          })
          .where(eq(workUnitFactInstances.id, params.workUnitFactInstanceId))
          .returning();

        const row = updated[0];
        return row ? toRow(row) : null;
      }),

    createVersionedFactSuccessor: (params: CreateVersionedWorkUnitFactSuccessorParams) =>
      dbEffect("runtime.workUnitFacts.createVersionedFactSuccessor", async () => {
        return db.transaction(async (tx) => {
          const existing = await getFactRowById(tx, params.previousWorkUnitFactInstanceId);
          if (!existing) {
            return null;
          }

          const successor = await insertWorkUnitFactRow(tx, {
            projectWorkUnitId: existing.projectWorkUnitId,
            factDefinitionId: existing.factDefinitionId,
            ...(params.valueJson !== undefined ? { valueJson: params.valueJson } : {}),
            ...(params.referencedProjectWorkUnitId !== undefined
              ? { referencedProjectWorkUnitId: params.referencedProjectWorkUnitId }
              : {}),
            status: "active",
            ...(params.producedByTransitionExecutionId !== undefined
              ? { producedByTransitionExecutionId: params.producedByTransitionExecutionId }
              : {}),
            ...(params.producedByWorkflowExecutionId !== undefined
              ? { producedByWorkflowExecutionId: params.producedByWorkflowExecutionId }
              : {}),
            ...(params.authoredByUserId !== undefined
              ? { authoredByUserId: params.authoredByUserId }
              : {}),
          });

          await supersedeWorkUnitFactRow(tx, existing.id, successor.id);
          return toRow(successor);
        });
      }),

    logicallyDeleteFactInstance: (params: DeleteWorkUnitFactInstanceParams) =>
      dbEffect("runtime.workUnitFacts.logicallyDeleteFactInstance", async () => {
        return db.transaction(async (tx) => {
          const existing = await getFactRowById(tx, params.workUnitFactInstanceId);
          if (!existing) {
            return null;
          }

          const tombstone = await insertWorkUnitFactRow(tx, {
            projectWorkUnitId: existing.projectWorkUnitId,
            factDefinitionId: existing.factDefinitionId,
            status: "deleted",
            ...(params.producedByTransitionExecutionId !== undefined
              ? { producedByTransitionExecutionId: params.producedByTransitionExecutionId }
              : {}),
            ...(params.producedByWorkflowExecutionId !== undefined
              ? { producedByWorkflowExecutionId: params.producedByWorkflowExecutionId }
              : {}),
            ...(params.authoredByUserId !== undefined
              ? { authoredByUserId: params.authoredByUserId }
              : {}),
          });

          await supersedeWorkUnitFactRow(tx, existing.id, tombstone.id);
          return toRow(tombstone);
        });
      }),
  });
}
