import { and, asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Data, Effect, Layer } from "effect";
import {
  MethodologyRepository,
  type CreateDraftParams,
  type UpdateDraftParams,
  type GetVersionEventsParams,
  type MethodologyDefinitionRow,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
} from "@chiron/methodology-engine";
import {
  methodologyDefinitions,
  methodologyVersions,
  methodologyVersionEvents,
  methodologyFactDefinitions,
  methodologyLinkTypeDefinitions,
} from "./schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

function toDefinitionRow(
  row: typeof methodologyDefinitions.$inferSelect,
): MethodologyDefinitionRow {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    descriptionJson: row.descriptionJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toVersionRow(row: typeof methodologyVersions.$inferSelect): MethodologyVersionRow {
  return {
    id: row.id,
    methodologyId: row.methodologyId,
    version: row.version,
    status: row.status,
    displayName: row.displayName,
    definitionJson: row.definitionJson,
    createdAt: row.createdAt,
    retiredAt: row.retiredAt,
  };
}

function toEventRow(row: typeof methodologyVersionEvents.$inferSelect): MethodologyVersionEventRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    eventType: row.eventType,
    actorId: row.actorId,
    changedFieldsJson: row.changedFieldsJson,
    diagnosticsJson: row.diagnosticsJson,
    createdAt: row.createdAt,
  };
}

/** Default page size for paginated queries. */
const DEFAULT_EVENT_LIMIT = 100;

function dbEffect<A>(fn: () => Promise<A>): Effect.Effect<A> {
  return Effect.tryPromise({
    try: fn,
    catch: (e) => new DatabaseError({ cause: e }),
  }).pipe(Effect.orDie);
}

export function createMethodologyRepoLayer(db: DB): Layer.Layer<MethodologyRepository> {
  return Layer.succeed(MethodologyRepository, {
    findDefinitionByKey: (key: string) =>
      dbEffect(async () => {
        const rows = await db
          .select()
          .from(methodologyDefinitions)
          .where(eq(methodologyDefinitions.key, key))
          .limit(1);
        return rows[0] ? toDefinitionRow(rows[0]) : null;
      }),

    findVersionById: (id: string) =>
      dbEffect(async () => {
        const rows = await db
          .select()
          .from(methodologyVersions)
          .where(eq(methodologyVersions.id, id))
          .limit(1);
        return rows[0] ? toVersionRow(rows[0]) : null;
      }),

    findVersionByMethodologyAndVersion: (methodologyId: string, version: string) =>
      dbEffect(async () => {
        const rows = await db
          .select()
          .from(methodologyVersions)
          .where(
            and(
              eq(methodologyVersions.methodologyId, methodologyId),
              eq(methodologyVersions.version, version),
            ),
          )
          .limit(1);
        return rows[0] ? toVersionRow(rows[0]) : null;
      }),

    createDraft: (params: CreateDraftParams) =>
      dbEffect(() =>
        db.transaction(async (tx) => {
          let defRows = await tx
            .select()
            .from(methodologyDefinitions)
            .where(eq(methodologyDefinitions.key, params.methodologyKey))
            .limit(1);

          if (defRows.length === 0) {
            defRows = await tx
              .insert(methodologyDefinitions)
              .values({
                key: params.methodologyKey,
                name: params.displayName,
                descriptionJson: null,
              })
              .returning();
          }

          const def = defRows[0]!;

          const versionRows = await tx
            .insert(methodologyVersions)
            .values({
              methodologyId: def.id,
              version: params.version,
              status: "draft",
              displayName: params.displayName,
              definitionJson: params.definitionJson,
            })
            .returning();

          const ver = versionRows[0]!;

          if (params.factDefinitions?.length) {
            await tx.insert(methodologyFactDefinitions).values(
              params.factDefinitions.map((v) => ({
                methodologyVersionId: ver.id,
                key: v.key,
                valueType: v.valueType,
                descriptionJson: v.description ?? null,
                required: v.required,
                defaultValueJson: v.defaultValue ?? null,
                validationJson: v.validation ?? null,
              })),
            );
          }

          if (params.linkTypeDefinitions?.length) {
            await tx.insert(methodologyLinkTypeDefinitions).values(
              params.linkTypeDefinitions.map((l) => ({
                methodologyVersionId: ver.id,
                key: l.key,
                descriptionJson: l.description ?? null,
                allowedStrengthsJson: l.allowedStrengths,
              })),
            );
          }

          const createdEventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: ver.id,
              eventType: "created",
              actorId: params.actorId,
              changedFieldsJson: params.definitionJson,
              diagnosticsJson: null,
            })
            .returning();

          const validatedEventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: ver.id,
              eventType: "validated",
              actorId: params.actorId,
              changedFieldsJson: null,
              diagnosticsJson: params.validationDiagnostics,
            })
            .returning();

          return {
            version: toVersionRow(ver),
            events: [toEventRow(createdEventRows[0]!), toEventRow(validatedEventRows[0]!)] as const,
          };
        }),
      ),

    updateDraft: (params: UpdateDraftParams) =>
      dbEffect(() =>
        db.transaction(async (tx) => {
          const versionRows = await tx
            .update(methodologyVersions)
            .set({
              displayName: params.displayName,
              version: params.version,
              definitionJson: params.definitionJson,
            })
            .where(eq(methodologyVersions.id, params.versionId))
            .returning();

          const ver = versionRows[0]!;

          if (params.factDefinitions !== undefined) {
            await tx
              .delete(methodologyFactDefinitions)
              .where(eq(methodologyFactDefinitions.methodologyVersionId, params.versionId));
            if (params.factDefinitions.length > 0) {
              await tx.insert(methodologyFactDefinitions).values(
                params.factDefinitions.map((v) => ({
                  methodologyVersionId: ver.id,
                  key: v.key,
                  valueType: v.valueType,
                  descriptionJson: v.description ?? null,
                  required: v.required,
                  defaultValueJson: v.defaultValue ?? null,
                  validationJson: v.validation ?? null,
                })),
              );
            }
          }

          if (params.linkTypeDefinitions !== undefined) {
            await tx
              .delete(methodologyLinkTypeDefinitions)
              .where(eq(methodologyLinkTypeDefinitions.methodologyVersionId, params.versionId));
            if (params.linkTypeDefinitions.length > 0) {
              await tx.insert(methodologyLinkTypeDefinitions).values(
                params.linkTypeDefinitions.map((l) => ({
                  methodologyVersionId: ver.id,
                  key: l.key,
                  descriptionJson: l.description ?? null,
                  allowedStrengthsJson: l.allowedStrengths,
                })),
              );
            }
          }

          const updatedEventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: ver.id,
              eventType: "updated",
              actorId: params.actorId,
              changedFieldsJson: params.changedFieldsJson,
              diagnosticsJson: null,
            })
            .returning();

          const validatedEventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: ver.id,
              eventType: "validated",
              actorId: params.actorId,
              changedFieldsJson: null,
              diagnosticsJson: params.validationDiagnostics,
            })
            .returning();

          return {
            version: toVersionRow(ver),
            events: [toEventRow(updatedEventRows[0]!), toEventRow(validatedEventRows[0]!)] as const,
          };
        }),
      ),

    getVersionEvents: (params: GetVersionEventsParams) =>
      dbEffect(async () => {
        const limit = params.limit ?? DEFAULT_EVENT_LIMIT;
        const offset = params.offset ?? 0;
        const rows = await db
          .select()
          .from(methodologyVersionEvents)
          .where(eq(methodologyVersionEvents.methodologyVersionId, params.versionId))
          .orderBy(asc(methodologyVersionEvents.createdAt), asc(methodologyVersionEvents.id))
          .limit(limit)
          .offset(offset);
        return rows.map(toEventRow) as readonly MethodologyVersionEventRow[];
      }),

    recordEvent: (event: Omit<MethodologyVersionEventRow, "id" | "createdAt">) =>
      dbEffect(async () => {
        const rows = await db
          .insert(methodologyVersionEvents)
          .values({
            methodologyVersionId: event.methodologyVersionId,
            eventType: event.eventType,
            actorId: event.actorId,
            changedFieldsJson: event.changedFieldsJson,
            diagnosticsJson: event.diagnosticsJson,
          })
          .returning();
        return toEventRow(rows[0]!);
      }),

    findLinkTypeKeys: (versionId: string) =>
      dbEffect(async () => {
        const rows = await db
          .select({ key: methodologyLinkTypeDefinitions.key })
          .from(methodologyLinkTypeDefinitions)
          .where(eq(methodologyLinkTypeDefinitions.methodologyVersionId, versionId))
          .orderBy(asc(methodologyLinkTypeDefinitions.key));
        return rows.map((r) => r.key) as readonly string[];
      }),
  });
}
