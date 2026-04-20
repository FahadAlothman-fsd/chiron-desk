import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ProjectFactRepository,
  RepositoryError,
  type ProjectFactInstanceRow,
  type DeleteProjectFactInstanceParams,
  type UpdateProjectFactInstanceParams,
} from "@chiron/workflow-engine";
import { projectFactInstances } from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;
type DBLike = Pick<DB, "select" | "insert" | "update">;

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toRow(row: typeof projectFactInstances.$inferSelect): ProjectFactInstanceRow {
  return {
    id: row.id,
    projectId: row.projectId,
    factDefinitionId: row.factDefinitionId,
    valueJson: row.valueJson,
    status: row.status,
    supersededByFactInstanceId: row.supersededByFactInstanceId,
    producedByTransitionExecutionId: row.producedByTransitionExecutionId,
    producedByWorkflowExecutionId: row.producedByWorkflowExecutionId,
    authoredByUserId: row.authoredByUserId,
    createdAt: row.createdAt,
  };
}

async function getFactRowById(db: DBLike, projectFactInstanceId: string) {
  const rows = await db
    .select()
    .from(projectFactInstances)
    .where(eq(projectFactInstances.id, projectFactInstanceId))
    .limit(1);

  return rows[0] ?? null;
}

async function insertProjectFactRow(
  db: DBLike,
  params: {
    projectId: string;
    factDefinitionId: string;
    valueJson: unknown;
    status: ProjectFactInstanceRow["status"];
    producedByTransitionExecutionId?: string | null;
    producedByWorkflowExecutionId?: string | null;
    authoredByUserId?: string | null;
  },
) {
  const inserted = await db
    .insert(projectFactInstances)
    .values({
      projectId: params.projectId,
      factDefinitionId: params.factDefinitionId,
      valueJson: params.valueJson,
      status: params.status,
      supersededByFactInstanceId: null,
      producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
      producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
      authoredByUserId: params.authoredByUserId ?? null,
    })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create project fact instance");
  }

  return row;
}

async function supersedeProjectFactRow(
  db: DBLike,
  projectFactInstanceId: string,
  supersededByProjectFactInstanceId: string,
) {
  await db
    .update(projectFactInstances)
    .set({
      status: "superseded",
      supersededByFactInstanceId: supersededByProjectFactInstanceId,
    })
    .where(eq(projectFactInstances.id, projectFactInstanceId));
}

const ACTIVE_CURRENT_FACT_FILTER = and(
  eq(projectFactInstances.status, "active"),
  isNull(projectFactInstances.supersededByFactInstanceId),
);

export function createProjectFactRepoLayer(db: DB): Layer.Layer<ProjectFactRepository> {
  return Layer.succeed(ProjectFactRepository, {
    createFactInstance: (params) =>
      dbEffect("runtime.projectFacts.createFactInstance", async () => {
        const inserted = await db
          .insert(projectFactInstances)
          .values({
            projectId: params.projectId,
            factDefinitionId: params.factDefinitionId,
            valueJson: params.valueJson,
            status: "active",
            supersededByFactInstanceId: null,
            producedByTransitionExecutionId: params.producedByTransitionExecutionId ?? null,
            producedByWorkflowExecutionId: params.producedByWorkflowExecutionId ?? null,
            authoredByUserId: params.authoredByUserId ?? null,
          })
          .returning();

        const row = inserted[0];
        if (!row) {
          throw new Error("Failed to create project fact instance");
        }

        return toRow(row);
      }),

    getCurrentValuesByDefinition: ({ projectId, factDefinitionId }) =>
      dbEffect("runtime.projectFacts.getCurrentValuesByDefinition", async () => {
        const rows = await db
          .select()
          .from(projectFactInstances)
          .where(
            and(
              eq(projectFactInstances.projectId, projectId),
              eq(projectFactInstances.factDefinitionId, factDefinitionId),
              ACTIVE_CURRENT_FACT_FILTER,
            ),
          )
          .orderBy(desc(projectFactInstances.createdAt), desc(projectFactInstances.id));

        return rows.map(toRow);
      }),

    listFactsByProject: ({ projectId }) =>
      dbEffect("runtime.projectFacts.listFactsByProject", async () => {
        const rows = await db
          .select()
          .from(projectFactInstances)
          .where(and(eq(projectFactInstances.projectId, projectId), ACTIVE_CURRENT_FACT_FILTER))
          .orderBy(
            asc(projectFactInstances.factDefinitionId),
            desc(projectFactInstances.createdAt),
            desc(projectFactInstances.id),
          );

        return rows.map(toRow);
      }),

    supersedeFactInstance: ({ projectFactInstanceId, supersededByProjectFactInstanceId }) =>
      dbEffect("runtime.projectFacts.supersedeFactInstance", async () => {
        await supersedeProjectFactRow(db, projectFactInstanceId, supersededByProjectFactInstanceId);
      }),

    updateFactInstance: (params: UpdateProjectFactInstanceParams) =>
      dbEffect("runtime.projectFacts.updateFactInstance", async () => {
        return db.transaction(async (tx) => {
          const existing = await getFactRowById(tx, params.projectFactInstanceId);
          if (!existing) {
            return null;
          }

          const updated = await insertProjectFactRow(tx, {
            projectId: existing.projectId,
            factDefinitionId: existing.factDefinitionId,
            valueJson: params.valueJson,
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

          await supersedeProjectFactRow(tx, existing.id, updated.id);
          return toRow(updated);
        });
      }),

    logicallyDeleteFactInstance: (params: DeleteProjectFactInstanceParams) =>
      dbEffect("runtime.projectFacts.logicallyDeleteFactInstance", async () => {
        return db.transaction(async (tx) => {
          const existing = await getFactRowById(tx, params.projectFactInstanceId);
          if (!existing) {
            return null;
          }

          const tombstone = await insertProjectFactRow(tx, {
            projectId: existing.projectId,
            factDefinitionId: existing.factDefinitionId,
            valueJson: null,
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

          await supersedeProjectFactRow(tx, existing.id, tombstone.id);
          return toRow(tombstone);
        });
      }),
  });
}
