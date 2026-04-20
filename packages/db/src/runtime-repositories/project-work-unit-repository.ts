import { and, asc, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ProjectWorkUnitRepository,
  RepositoryError,
  type CreateProjectWorkUnitParams,
  type ProjectWorkUnitRow,
  type UpdateActiveTransitionExecutionPointerParams,
} from "@chiron/workflow-engine";
import { methodologyWorkUnitTypes } from "../schema/methodology";
import { projectWorkUnits } from "../schema/runtime";

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

function toProjectWorkUnitRow(row: typeof projectWorkUnits.$inferSelect): ProjectWorkUnitRow {
  return {
    id: row.id,
    projectId: row.projectId,
    workUnitTypeId: row.workUnitTypeId,
    workUnitKey: row.workUnitKey,
    instanceNumber: row.instanceNumber,
    displayName: row.displayName,
    currentStateId: row.currentStateId,
    activeTransitionExecutionId: row.activeTransitionExecutionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createProjectWorkUnitRepoLayer(db: DB): Layer.Layer<ProjectWorkUnitRepository> {
  return Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: (params: CreateProjectWorkUnitParams) =>
      dbEffect("project-work-unit.create", async () => {
        return db.transaction(async (tx) => {
          const workUnitTypes = await tx
            .select({
              key: methodologyWorkUnitTypes.key,
              cardinality: methodologyWorkUnitTypes.cardinality,
            })
            .from(methodologyWorkUnitTypes)
            .where(eq(methodologyWorkUnitTypes.id, params.workUnitTypeId))
            .limit(1);

          const workUnitType = workUnitTypes[0];
          if (!workUnitType) {
            throw new Error(`Unknown work unit type '${params.workUnitTypeId}'`);
          }

          const [latest] = await tx
            .select({ instanceNumber: projectWorkUnits.instanceNumber })
            .from(projectWorkUnits)
            .where(
              and(
                eq(projectWorkUnits.projectId, params.projectId),
                eq(projectWorkUnits.workUnitTypeId, params.workUnitTypeId),
              ),
            )
            .orderBy(desc(projectWorkUnits.instanceNumber), desc(projectWorkUnits.id))
            .limit(1);

          const nextInstanceNumber = (latest?.instanceNumber ?? 0) + 1;
          const rows = await tx
            .insert(projectWorkUnits)
            .values({
              projectId: params.projectId,
              workUnitTypeId: params.workUnitTypeId,
              workUnitKey: `${workUnitType.key}-${nextInstanceNumber}`,
              instanceNumber: nextInstanceNumber,
              displayName:
                workUnitType.cardinality === "many_per_project"
                  ? (params.displayName ?? null)
                  : null,
              currentStateId: params.currentStateId,
            })
            .returning();

          const created = rows[0];
          if (!created) {
            throw new Error("Failed to create project work unit");
          }

          return toProjectWorkUnitRow(created);
        });
      }),

    listProjectWorkUnitsByProject: (projectId: string) =>
      dbEffect("project-work-unit.listByProject", async () => {
        const rows = await db
          .select()
          .from(projectWorkUnits)
          .where(eq(projectWorkUnits.projectId, projectId))
          .orderBy(asc(projectWorkUnits.createdAt), asc(projectWorkUnits.id));

        return rows.map(toProjectWorkUnitRow);
      }),

    getProjectWorkUnitById: (projectWorkUnitId: string) =>
      dbEffect("project-work-unit.getById", async () => {
        const rows = await db
          .select()
          .from(projectWorkUnits)
          .where(eq(projectWorkUnits.id, projectWorkUnitId))
          .limit(1);

        return rows[0] ? toProjectWorkUnitRow(rows[0]) : null;
      }),

    updateActiveTransitionExecutionPointer: (
      params: UpdateActiveTransitionExecutionPointerParams,
    ) =>
      dbEffect("project-work-unit.updateActiveTransitionPointer", async () => {
        const rows = await db
          .update(projectWorkUnits)
          .set({ activeTransitionExecutionId: params.activeTransitionExecutionId })
          .where(eq(projectWorkUnits.id, params.projectWorkUnitId))
          .returning();

        return rows[0] ? toProjectWorkUnitRow(rows[0]) : null;
      }),
  });
}
