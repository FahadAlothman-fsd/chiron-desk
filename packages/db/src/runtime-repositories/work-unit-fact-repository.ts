import { and, asc, desc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  WorkUnitFactRepository,
  type WorkUnitFactInstanceRow,
} from "@chiron/workflow-engine";
import { workUnitFactInstances } from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;

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
        await db
          .update(workUnitFactInstances)
          .set({
            status: "superseded",
            supersededByFactInstanceId: supersededByWorkUnitFactInstanceId,
          })
          .where(eq(workUnitFactInstances.id, workUnitFactInstanceId));
      }),
  });
}
