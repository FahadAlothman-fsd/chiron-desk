import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ProjectWorkUnitRepository,
  RepositoryError,
  type CreateProjectWorkUnitParams,
  type ProjectWorkUnitRow,
  type UpdateActiveTransitionExecutionPointerParams,
} from "@chiron/workflow-engine";
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
        const rows = await db.insert(projectWorkUnits).values(params).returning();
        const created = rows[0];
        if (!created) {
          throw new Error("Failed to create project work unit");
        }

        return toProjectWorkUnitRow(created);
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
