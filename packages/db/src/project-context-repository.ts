import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ProjectContextRepository,
  RepositoryError,
  type RepositoryErrorCode,
  type GetProjectPinLineageParams,
  type PinProjectMethodologyVersionParams,
  type ProjectMethodologyPinEventRow,
  type ProjectMethodologyPinRow,
  type ProjectRow,
} from "@chiron/project-context";
import { methodologyDefinitions, methodologyVersions } from "./schema/methodology";
import {
  projectExecutions,
  projectMethodologyPinEvents,
  projectMethodologyPins,
  projects,
} from "./schema/project";

type DB = LibSQLDatabase<Record<string, unknown>>;

const KNOWN_PROJECT_PIN_ERROR_CODES = new Set<RepositoryErrorCode>([
  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
  "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
  "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
  "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
  "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
]);

function dbEffect<T>(
  operation: string,
  execute: () => Promise<T>,
): Effect.Effect<T, RepositoryError> {
  return Effect.tryPromise({
    try: execute,
    catch: (cause) =>
      new RepositoryError({
        operation,
        cause,
      }),
  });
}

function toProjectPinRow(
  row: typeof projectMethodologyPins.$inferSelect,
): ProjectMethodologyPinRow {
  return {
    projectId: row.projectId,
    methodologyVersionId: row.methodologyVersionId,
    methodologyId: row.methodologyId,
    methodologyKey: row.methodologyKey,
    publishedVersion: row.publishedVersion,
    actorId: row.actorId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toProjectPinEventRow(
  row: typeof projectMethodologyPinEvents.$inferSelect,
): ProjectMethodologyPinEventRow {
  return {
    id: row.id,
    projectId: row.projectId,
    eventType: row.eventType,
    actorId: row.actorId,
    previousVersion: row.previousVersion,
    newVersion: row.newVersion,
    evidenceRef: row.evidenceRef,
    createdAt: row.createdAt,
  };
}

function toProjectRow(row: typeof projects.$inferSelect): ProjectRow {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createProjectContextRepoLayer(db: DB): Layer.Layer<ProjectContextRepository> {
  return Layer.succeed(ProjectContextRepository, {
    createProject: ({ projectId, name }) =>
      dbEffect("project-context.createProject", async () => {
        await db.insert(projects).values({ id: projectId, name }).onConflictDoNothing({
          target: projects.id,
        });

        const row = (
          await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        )[0];

        if (!row) {
          throw new RepositoryError({
            operation: "project-context.createProject",
            code: "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
            cause: new Error("Unable to read project after create"),
          });
        }

        return toProjectRow(row);
      }),

    listProjects: () =>
      dbEffect("project-context.listProjects", async () => {
        const rows = await db
          .select()
          .from(projects)
          .orderBy(asc(projects.createdAt), asc(projects.id));
        return rows.map((row) => toProjectRow(row));
      }),

    getProjectById: ({ projectId }) =>
      dbEffect("project-context.getProjectById", async () => {
        const row = (
          await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        )[0];

        return row ? toProjectRow(row) : null;
      }),

    findProjectPin: (projectId: string) =>
      dbEffect("project-context.findProjectPin", async () => {
        const rows = await db
          .select()
          .from(projectMethodologyPins)
          .where(eq(projectMethodologyPins.projectId, projectId))
          .limit(1);
        return rows[0] ? toProjectPinRow(rows[0]) : null;
      }),

    hasPersistedExecutions: (projectId: string) =>
      dbEffect("project-context.hasPersistedExecutions", async () => {
        const rows = await db
          .select({ id: projectExecutions.id })
          .from(projectExecutions)
          .where(eq(projectExecutions.projectId, projectId))
          .limit(1);
        return rows.length > 0;
      }),

    pinProjectMethodologyVersion: (params: PinProjectMethodologyVersionParams) =>
      Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            const versionRows = await tx
              .select()
              .from(methodologyVersions)
              .where(eq(methodologyVersions.id, params.methodologyVersionId))
              .limit(1);
            const version = versionRows[0];
            if (!version) {
              throw new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND");
            }
            if (version.status !== "active") {
              throw new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE");
            }

            const definitionRows = await tx
              .select()
              .from(methodologyDefinitions)
              .where(eq(methodologyDefinitions.id, version.methodologyId))
              .limit(1);
            const definition = definitionRows[0];
            if (!definition) {
              throw new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE");
            }

            await tx.insert(projects).values({ id: params.projectId }).onConflictDoNothing();

            await tx
              .insert(projectMethodologyPins)
              .values({
                projectId: params.projectId,
                methodologyVersionId: version.id,
                methodologyId: version.methodologyId,
                methodologyKey: definition.key,
                publishedVersion: params.newVersion,
                actorId: params.actorId,
              })
              .onConflictDoUpdate({
                target: projectMethodologyPins.projectId,
                set: {
                  methodologyVersionId: version.id,
                  methodologyId: version.methodologyId,
                  methodologyKey: definition.key,
                  publishedVersion: params.newVersion,
                  actorId: params.actorId,
                  updatedAt: new Date(),
                },
              });

            const eventId = crypto.randomUUID();
            const eventRows = await tx
              .insert(projectMethodologyPinEvents)
              .values({
                id: eventId,
                projectId: params.projectId,
                eventType: params.previousVersion ? "repinned" : "pinned",
                actorId: params.actorId,
                previousVersion: params.previousVersion,
                newVersion: params.newVersion,
                evidenceRef: `project-pin-event:${eventId}`,
              })
              .returning();

            if (eventRows.length === 0) {
              throw new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED");
            }

            const pinRows = await tx
              .select()
              .from(projectMethodologyPins)
              .where(eq(projectMethodologyPins.projectId, params.projectId))
              .limit(1);

            if (pinRows.length === 0) {
              throw new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED");
            }

            return {
              pin: toProjectPinRow(pinRows[0]!),
              event: toProjectPinEventRow(eventRows[0]!),
            };
          }),
        catch: (cause) => {
          if (cause instanceof Error) {
            if (KNOWN_PROJECT_PIN_ERROR_CODES.has(cause.message as RepositoryErrorCode)) {
              return new RepositoryError({
                operation: "project-context.pinProjectMethodologyVersion",
                cause,
                code: cause.message as RepositoryErrorCode,
              });
            }

            if (cause.message.includes("project_methodology_pin_events")) {
              return new RepositoryError({
                operation: "project-context.pinProjectMethodologyVersion",
                cause: new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED"),
                code: "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
              });
            }
          }

          return new RepositoryError({
            operation: "project-context.pinProjectMethodologyVersion",
            cause,
          });
        },
      }),

    repinProjectMethodologyVersion: (params: PinProjectMethodologyVersionParams) =>
      Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            const executionRows = await tx
              .select({ id: projectExecutions.id })
              .from(projectExecutions)
              .where(eq(projectExecutions.projectId, params.projectId))
              .limit(1);
            if (executionRows.length > 0) {
              throw new Error("PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY");
            }

            const existingPinRows = await tx
              .select({ projectId: projectMethodologyPins.projectId })
              .from(projectMethodologyPins)
              .where(eq(projectMethodologyPins.projectId, params.projectId))
              .limit(1);
            if (existingPinRows.length === 0) {
              throw new Error("PROJECT_REPIN_REQUIRES_EXISTING_PIN");
            }

            const versionRows = await tx
              .select()
              .from(methodologyVersions)
              .where(eq(methodologyVersions.id, params.methodologyVersionId))
              .limit(1);
            const version = versionRows[0];
            if (!version) {
              throw new Error("PROJECT_PIN_TARGET_VERSION_NOT_FOUND");
            }
            if (version.status !== "active") {
              throw new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE");
            }

            const definitionRows = await tx
              .select()
              .from(methodologyDefinitions)
              .where(eq(methodologyDefinitions.id, version.methodologyId))
              .limit(1);
            const definition = definitionRows[0];
            if (!definition) {
              throw new Error("PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE");
            }

            await tx.insert(projects).values({ id: params.projectId }).onConflictDoNothing();

            await tx
              .insert(projectMethodologyPins)
              .values({
                projectId: params.projectId,
                methodologyVersionId: version.id,
                methodologyId: version.methodologyId,
                methodologyKey: definition.key,
                publishedVersion: params.newVersion,
                actorId: params.actorId,
              })
              .onConflictDoUpdate({
                target: projectMethodologyPins.projectId,
                set: {
                  methodologyVersionId: version.id,
                  methodologyId: version.methodologyId,
                  methodologyKey: definition.key,
                  publishedVersion: params.newVersion,
                  actorId: params.actorId,
                  updatedAt: new Date(),
                },
              });

            const eventId = crypto.randomUUID();
            const eventRows = await tx
              .insert(projectMethodologyPinEvents)
              .values({
                id: eventId,
                projectId: params.projectId,
                eventType: "repinned",
                actorId: params.actorId,
                previousVersion: params.previousVersion,
                newVersion: params.newVersion,
                evidenceRef: `project-pin-event:${eventId}`,
              })
              .returning();

            if (eventRows.length === 0) {
              throw new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED");
            }

            const pinRows = await tx
              .select()
              .from(projectMethodologyPins)
              .where(eq(projectMethodologyPins.projectId, params.projectId))
              .limit(1);

            if (pinRows.length === 0) {
              throw new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED");
            }

            return {
              pin: toProjectPinRow(pinRows[0]!),
              event: toProjectPinEventRow(eventRows[0]!),
            };
          }),
        catch: (cause) => {
          if (cause instanceof Error) {
            if (KNOWN_PROJECT_PIN_ERROR_CODES.has(cause.message as RepositoryErrorCode)) {
              return new RepositoryError({
                operation: "project-context.repinProjectMethodologyVersion",
                cause,
                code: cause.message as RepositoryErrorCode,
              });
            }

            if (cause.message.includes("project_methodology_pin_events")) {
              return new RepositoryError({
                operation: "project-context.repinProjectMethodologyVersion",
                cause: new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED"),
                code: "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
              });
            }
          }

          return new RepositoryError({
            operation: "project-context.repinProjectMethodologyVersion",
            cause,
          });
        },
      }),

    getProjectPinLineage: (params: GetProjectPinLineageParams) =>
      dbEffect("project-context.getProjectPinLineage", async () => {
        const rows = await db
          .select()
          .from(projectMethodologyPinEvents)
          .where(eq(projectMethodologyPinEvents.projectId, params.projectId))
          .orderBy(asc(projectMethodologyPinEvents.createdAt), asc(projectMethodologyPinEvents.id));

        return rows.map((row) => toProjectPinEventRow(row));
      }),
  });
}
