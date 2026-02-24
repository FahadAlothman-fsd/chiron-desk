import { and, asc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Data, Effect, Layer } from "effect";
import {
  LifecycleRepository,
  type SaveLifecycleDefinitionParams,
  type SaveLifecycleResult,
  type AgentTypeRow,
  type WorkUnitTypeRow,
  type LifecycleStateRow,
  type LifecycleTransitionRow,
  type FactSchemaRow,
  type TransitionRequiredLinkRow,
} from "@chiron/methodology-engine";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "@chiron/methodology-engine";
import {
  methodologyWorkUnitTypes,
  methodologyAgentTypes,
  methodologyLifecycleStates,
  methodologyLifecycleTransitions,
  methodologyFactSchemas,
  methodologyTransitionRequiredLinks,
  methodologyVersions,
  methodologyVersionEvents,
} from "./schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

function dbEffect<A>(fn: () => Promise<A>): Effect.Effect<A> {
  return Effect.tryPromise({
    try: fn,
    catch: (e) => new DatabaseError({ cause: e }),
  }).pipe(Effect.orDie);
}

function toWorkUnitTypeRow(row: typeof methodologyWorkUnitTypes.$inferSelect): WorkUnitTypeRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    key: row.key,
    displayName: row.displayName,
    descriptionJson: row.descriptionJson,
    cardinality: row.cardinality,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLifecycleStateRow(
  row: typeof methodologyLifecycleStates.$inferSelect,
): LifecycleStateRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    workUnitTypeId: row.workUnitTypeId,
    key: row.key,
    displayName: row.displayName,
    descriptionJson: row.descriptionJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLifecycleTransitionRow(
  row: typeof methodologyLifecycleTransitions.$inferSelect,
): LifecycleTransitionRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    workUnitTypeId: row.workUnitTypeId,
    fromStateId: row.fromStateId,
    toStateId: row.toStateId,
    transitionKey: row.transitionKey,
    gateClass: row.gateClass,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toFactSchemaRow(row: typeof methodologyFactSchemas.$inferSelect): FactSchemaRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    workUnitTypeId: row.workUnitTypeId,
    key: row.key,
    factType: row.factType,
    required: row.required,
    defaultValueJson: row.defaultValueJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTransitionRequiredLinkRow(
  row: typeof methodologyTransitionRequiredLinks.$inferSelect,
): TransitionRequiredLinkRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    transitionId: row.transitionId,
    linkTypeKey: row.linkTypeKey,
    strength: row.strength,
    required: row.required,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toAgentTypeRow(row: typeof methodologyAgentTypes.$inferSelect): AgentTypeRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    key: row.key,
    displayName: row.displayName,
    description: row.description,
    persona: row.persona,
    defaultModelJson: row.defaultModelJson,
    mcpServersJson: row.mcpServersJson,
    capabilitiesJson: row.capabilitiesJson,
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

export function createLifecycleRepoLayer(db: DB): Layer.Layer<LifecycleRepository> {
  return Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: (versionId: string) =>
      dbEffect(async () => {
        const rows = await db
          .select()
          .from(methodologyWorkUnitTypes)
          .where(eq(methodologyWorkUnitTypes.methodologyVersionId, versionId))
          .orderBy(asc(methodologyWorkUnitTypes.key));
        return rows.map(toWorkUnitTypeRow) as readonly WorkUnitTypeRow[];
      }),

    findLifecycleStates: (versionId: string, workUnitTypeId?: string) =>
      dbEffect(async () => {
        const conditions = [eq(methodologyLifecycleStates.methodologyVersionId, versionId)];
        if (workUnitTypeId) {
          conditions.push(eq(methodologyLifecycleStates.workUnitTypeId, workUnitTypeId));
        }
        const rows = await db
          .select()
          .from(methodologyLifecycleStates)
          .where(and(...conditions))
          .orderBy(asc(methodologyLifecycleStates.key));
        return rows.map(toLifecycleStateRow) as readonly LifecycleStateRow[];
      }),

    findLifecycleTransitions: (
      versionId: string,
      options?: { workUnitTypeId?: string; fromStateId?: string | null; toStateId?: string },
    ) =>
      dbEffect(async () => {
        let conditions = [eq(methodologyLifecycleTransitions.methodologyVersionId, versionId)];

        if (options?.workUnitTypeId) {
          conditions.push(
            eq(methodologyLifecycleTransitions.workUnitTypeId, options.workUnitTypeId),
          );
        }

        if (options?.fromStateId === null) {
          conditions.push(isNull(methodologyLifecycleTransitions.fromStateId));
        } else if (options?.fromStateId !== undefined) {
          conditions.push(eq(methodologyLifecycleTransitions.fromStateId, options.fromStateId));
        }

        if (options?.toStateId) {
          conditions.push(eq(methodologyLifecycleTransitions.toStateId, options.toStateId));
        }

        const rows = await db
          .select()
          .from(methodologyLifecycleTransitions)
          .where(and(...conditions))
          .orderBy(asc(methodologyLifecycleTransitions.transitionKey));

        return rows.map(toLifecycleTransitionRow) as readonly LifecycleTransitionRow[];
      }),

    findFactSchemas: (versionId: string, workUnitTypeId?: string) =>
      dbEffect(async () => {
        const conditions = [eq(methodologyFactSchemas.methodologyVersionId, versionId)];
        if (workUnitTypeId) {
          conditions.push(eq(methodologyFactSchemas.workUnitTypeId, workUnitTypeId));
        }
        const rows = await db
          .select()
          .from(methodologyFactSchemas)
          .where(and(...conditions))
          .orderBy(asc(methodologyFactSchemas.key));
        return rows.map(toFactSchemaRow) as readonly FactSchemaRow[];
      }),

    findTransitionRequiredLinks: (versionId: string, transitionId?: string) =>
      dbEffect(async () => {
        let conditions = [eq(methodologyTransitionRequiredLinks.methodologyVersionId, versionId)];

        if (transitionId) {
          conditions.push(eq(methodologyTransitionRequiredLinks.transitionId, transitionId));
        }

        const rows = await db
          .select()
          .from(methodologyTransitionRequiredLinks)
          .where(and(...conditions))
          .orderBy(asc(methodologyTransitionRequiredLinks.linkTypeKey));

        return rows.map(toTransitionRequiredLinkRow) as readonly TransitionRequiredLinkRow[];
      }),

    findAgentTypes: (versionId: string) =>
      dbEffect(async () => {
        const rows = await db
          .select()
          .from(methodologyAgentTypes)
          .where(eq(methodologyAgentTypes.methodologyVersionId, versionId))
          .orderBy(asc(methodologyAgentTypes.key));
        return rows.map(toAgentTypeRow) as readonly AgentTypeRow[];
      }),

    saveLifecycleDefinition: (params: SaveLifecycleDefinitionParams) =>
      dbEffect(() =>
        db.transaction(async (tx) => {
          // Delete existing lifecycle data for this version (full replace)
          await tx
            .delete(methodologyTransitionRequiredLinks)
            .where(eq(methodologyTransitionRequiredLinks.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyLifecycleTransitions)
            .where(eq(methodologyLifecycleTransitions.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyFactSchemas)
            .where(eq(methodologyFactSchemas.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyLifecycleStates)
            .where(eq(methodologyLifecycleStates.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyWorkUnitTypes)
            .where(eq(methodologyWorkUnitTypes.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyAgentTypes)
            .where(eq(methodologyAgentTypes.methodologyVersionId, params.versionId));

          // Insert new work unit types
          const workUnitTypeRows: WorkUnitTypeRow[] = [];
          for (const wut of params.workUnitTypes) {
            const wutRows = await tx
              .insert(methodologyWorkUnitTypes)
              .values({
                methodologyVersionId: params.versionId,
                key: wut.key,
                displayName: wut.displayName ?? null,
                descriptionJson: wut.description ? { text: wut.description } : null,
                cardinality: wut.cardinality,
              })
              .returning();
            const wutRow = wutRows[0];
            if (!wutRow) {
              throw new Error(`Failed to insert work unit type '${wut.key}'`);
            }
            workUnitTypeRows.push(toWorkUnitTypeRow(wutRow));

            // Insert lifecycle states for this work unit type
            for (const state of wut.lifecycleStates) {
              await tx.insert(methodologyLifecycleStates).values({
                methodologyVersionId: params.versionId,
                workUnitTypeId: wutRow.id,
                key: state.key,
                displayName: state.displayName ?? null,
                descriptionJson: state.description ? { text: state.description } : null,
              });
            }

            // Insert fact schemas for this work unit type
            for (const fact of wut.factSchemas) {
              await tx.insert(methodologyFactSchemas).values({
                methodologyVersionId: params.versionId,
                workUnitTypeId: wutRow.id,
                key: fact.key,
                factType: fact.factType,
                required: fact.required ?? true,
                defaultValueJson: fact.defaultValue ?? null,
              });
            }
          }

          for (const agent of params.agentTypes) {
            await tx.insert(methodologyAgentTypes).values({
              methodologyVersionId: params.versionId,
              key: agent.key,
              displayName: agent.displayName ?? null,
              description: agent.description ?? null,
              persona: agent.persona,
              defaultModelJson: agent.defaultModel ?? null,
              mcpServersJson: agent.mcpServers ?? null,
              capabilitiesJson: agent.capabilities ?? null,
            });
          }

          // Now insert transitions (need state IDs first, so query for them)
          const allStates = await tx
            .select()
            .from(methodologyLifecycleStates)
            .where(eq(methodologyLifecycleStates.methodologyVersionId, params.versionId));

          for (const wut of params.workUnitTypes) {
            const wutRow = workUnitTypeRows.find((w) => w.key === wut.key);
            if (!wutRow) {
              throw new Error(`Work unit type '${wut.key}' was not found after insertion`);
            }
            const wutStates = allStates.filter((s) => s.workUnitTypeId === wutRow.id);
            const stateIdByKey = new Map(wutStates.map((s) => [s.key, s.id]));

            for (const transition of wut.lifecycleTransitions) {
              const fromStateId = transition.fromState
                ? (stateIdByKey.get(transition.fromState) ?? null)
                : null; // null = __absent__
              const toStateId = stateIdByKey.get(transition.toState);

              if (!toStateId)
                throw new Error(
                  `toStateId not found for transition '${transition.transitionKey}' targeting state '${transition.toState}' — validation should have caught this`,
                );

              const transRows = await tx
                .insert(methodologyLifecycleTransitions)
                .values({
                  methodologyVersionId: params.versionId,
                  workUnitTypeId: wutRow.id,
                  fromStateId: fromStateId,
                  toStateId: toStateId,
                  transitionKey: transition.transitionKey,
                  gateClass: transition.gateClass,
                })
                .returning();

              const transRow = transRows[0];
              if (!transRow) {
                throw new Error(
                  `Failed to insert transition '${transition.transitionKey}' for work unit type '${wut.key}'`,
                );
              }

              // Insert required links for this transition
              for (const link of transition.requiredLinks ?? []) {
                await tx.insert(methodologyTransitionRequiredLinks).values({
                  methodologyVersionId: params.versionId,
                  transitionId: transRow.id,
                  linkTypeKey: link.linkTypeKey,
                  strength: link.strength ?? "hard",
                  required: link.required ?? true,
                });
              }
            }
          }

          const existingVersionRows = await tx
            .select()
            .from(methodologyVersions)
            .where(eq(methodologyVersions.id, params.versionId));
          const existingVersionRow = existingVersionRows[0];
          if (!existingVersionRow) {
            throw new Error(
              `Methodology version '${params.versionId}' not found during lifecycle save`,
            );
          }

          const mergedDefinitionJson =
            typeof existingVersionRow.definitionJson === "object" &&
            existingVersionRow.definitionJson !== null
              ? {
                  ...(existingVersionRow.definitionJson as Record<string, unknown>),
                  workUnitTypes: params.workUnitTypes,
                  agentTypes: params.agentTypes,
                }
              : {
                  workUnitTypes: params.workUnitTypes,
                  agentTypes: params.agentTypes,
                };

          const updatedVersionRows = await tx
            .update(methodologyVersions)
            .set({ definitionJson: mergedDefinitionJson })
            .where(eq(methodologyVersions.id, params.versionId))
            .returning();
          const updatedVersionRow = updatedVersionRows[0];
          if (!updatedVersionRow) {
            throw new Error(
              `Failed to update definitionJson for methodology version '${params.versionId}'`,
            );
          }
          const version = toVersionRow(updatedVersionRow);

          // Record lifecycle updated event
          const eventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: params.versionId,
              eventType: "lifecycle_updated",
              actorId: params.actorId,
              changedFieldsJson: params.changedFieldsJson,
              diagnosticsJson: params.validationResult,
            })
            .returning();
          const eventRow = eventRows[0];
          if (!eventRow) {
            throw new Error(
              `Failed to record lifecycle_updated event for version '${params.versionId}'`,
            );
          }

          return {
            version,
            events: [toEventRow(eventRow)],
          } as SaveLifecycleResult;
        }),
      ),

    recordLifecycleEvent: (event: Omit<MethodologyVersionEventRow, "id" | "createdAt">) =>
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
        const row = rows[0];
        if (!row) {
          throw new Error(
            `Failed to record lifecycle event '${event.eventType}' for version '${event.methodologyVersionId}'`,
          );
        }
        return toEventRow(row);
      }),
  });
}
