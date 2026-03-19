import { and, asc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  LifecycleRepository,
  RepositoryError,
  type SaveLifecycleDefinitionParams,
  type SaveLifecycleResult,
  type AgentTypeRow,
  type WorkUnitTypeRow,
  type LifecycleStateRow,
  type LifecycleTransitionRow,
  type FactSchemaRow,
  type TransitionConditionSetRow,
  type TransitionWorkflowBindingRow,
} from "@chiron/methodology-engine";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "@chiron/methodology-engine";
import {
  methodologyWorkUnitTypes,
  methodologyAgentTypes,
  methodologyWorkflows,
  methodologyTransitionWorkflowBindings,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
  transitionConditionSets,
  methodologyFactSchemas,
  methodologyVersions,
  methodologyVersionEvents,
} from "./schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toWorkUnitTypeRow(row: typeof methodologyWorkUnitTypes.$inferSelect): WorkUnitTypeRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    key: row.key,
    displayName: row.displayName,
    descriptionJson: row.descriptionJson,
    guidanceJson: row.guidanceJson,
    cardinality: row.cardinality,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toLifecycleStateRow(row: typeof workUnitLifecycleStates.$inferSelect): LifecycleStateRow {
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
  row: typeof workUnitLifecycleTransitions.$inferSelect,
): LifecycleTransitionRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    workUnitTypeId: row.workUnitTypeId,
    fromStateId: row.fromStateId,
    toStateId: row.toStateId,
    transitionKey: row.transitionKey,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toFactSchemaRow(row: typeof methodologyFactSchemas.$inferSelect): FactSchemaRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    workUnitTypeId: row.workUnitTypeId,
    name: row.name,
    key: row.key,
    factType: row.factType,
    description: row.description,
    defaultValueJson: row.defaultValueJson,
    guidanceJson: row.guidanceJson,
    validationJson: row.validationJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTransitionConditionSetRow(
  row: typeof transitionConditionSets.$inferSelect,
): TransitionConditionSetRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    transitionId: row.transitionId,
    key: row.key,
    phase: row.phase,
    mode: row.mode,
    groupsJson: row.groupsJson,
    guidanceJson: row.guidanceJson,
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
    promptTemplateJson: row.promptTemplateJson,
    promptTemplateVersion: row.promptTemplateVersion,
    defaultModelJson: row.defaultModelJson,
    mcpServersJson: row.mcpServersJson,
    capabilitiesJson: row.capabilitiesJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toTransitionWorkflowBindingRow(row: {
  id: string;
  methodologyVersionId: string;
  transitionId: string;
  transitionKey: string;
  workflowId: string;
  workflowKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TransitionWorkflowBindingRow {
  return {
    id: row.id,
    methodologyVersionId: row.methodologyVersionId,
    transitionId: row.transitionId,
    transitionKey: row.transitionKey,
    workflowId: row.workflowId,
    workflowKey: row.workflowKey,
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
    definitionExtensions: row.definitionExtensions,
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
      dbEffect("lifecycle.findWorkUnitTypes", async () => {
        const rows = await db
          .select()
          .from(methodologyWorkUnitTypes)
          .where(eq(methodologyWorkUnitTypes.methodologyVersionId, versionId))
          .orderBy(asc(methodologyWorkUnitTypes.key));
        return rows.map(toWorkUnitTypeRow) as readonly WorkUnitTypeRow[];
      }),

    findLifecycleStates: (versionId: string, workUnitTypeId?: string) =>
      dbEffect("lifecycle.findLifecycleStates", async () => {
        const conditions = [eq(workUnitLifecycleStates.methodologyVersionId, versionId)];
        if (workUnitTypeId) {
          conditions.push(eq(workUnitLifecycleStates.workUnitTypeId, workUnitTypeId));
        }
        const rows = await db
          .select()
          .from(workUnitLifecycleStates)
          .where(and(...conditions))
          .orderBy(asc(workUnitLifecycleStates.key));
        return rows.map(toLifecycleStateRow) as readonly LifecycleStateRow[];
      }),

    findLifecycleTransitions: (
      versionId: string,
      options?: { workUnitTypeId?: string; fromStateId?: string | null; toStateId?: string },
    ) =>
      dbEffect("lifecycle.findLifecycleTransitions", async () => {
        let conditions = [eq(workUnitLifecycleTransitions.methodologyVersionId, versionId)];

        if (options?.workUnitTypeId) {
          conditions.push(eq(workUnitLifecycleTransitions.workUnitTypeId, options.workUnitTypeId));
        }

        if (options?.fromStateId === null) {
          conditions.push(isNull(workUnitLifecycleTransitions.fromStateId));
        } else if (options?.fromStateId !== undefined) {
          conditions.push(eq(workUnitLifecycleTransitions.fromStateId, options.fromStateId));
        }

        if (options?.toStateId) {
          conditions.push(eq(workUnitLifecycleTransitions.toStateId, options.toStateId));
        }

        const rows = await db
          .select()
          .from(workUnitLifecycleTransitions)
          .where(and(...conditions))
          .orderBy(asc(workUnitLifecycleTransitions.transitionKey));

        return rows.map(toLifecycleTransitionRow) as readonly LifecycleTransitionRow[];
      }),

    findFactSchemas: (versionId: string, workUnitTypeId?: string) =>
      dbEffect("lifecycle.findFactSchemas", async () => {
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
    findTransitionConditionSets: (versionId: string, transitionId?: string) =>
      dbEffect("lifecycle.findTransitionConditionSets", async () => {
        const conditions = [eq(transitionConditionSets.methodologyVersionId, versionId)];

        if (transitionId) {
          conditions.push(eq(transitionConditionSets.transitionId, transitionId));
        }

        const rows = await db
          .select()
          .from(transitionConditionSets)
          .where(and(...conditions))
          .orderBy(
            asc(transitionConditionSets.transitionId),
            asc(transitionConditionSets.phase),
            asc(transitionConditionSets.key),
          );

        return rows.map(toTransitionConditionSetRow) as readonly TransitionConditionSetRow[];
      }),

    findAgentTypes: (versionId: string) =>
      dbEffect("lifecycle.findAgentTypes", async () => {
        const rows = await db
          .select()
          .from(methodologyAgentTypes)
          .where(eq(methodologyAgentTypes.methodologyVersionId, versionId))
          .orderBy(asc(methodologyAgentTypes.key));
        return rows.map(toAgentTypeRow) as readonly AgentTypeRow[];
      }),

    findTransitionWorkflowBindings: (versionId: string, transitionId?: string) =>
      dbEffect("lifecycle.findTransitionWorkflowBindings", async () => {
        const conditions = [
          eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId),
        ];
        if (transitionId) {
          conditions.push(eq(methodologyTransitionWorkflowBindings.transitionId, transitionId));
        }

        const rows = await db
          .select({
            id: methodologyTransitionWorkflowBindings.id,
            methodologyVersionId: methodologyTransitionWorkflowBindings.methodologyVersionId,
            transitionId: methodologyTransitionWorkflowBindings.transitionId,
            transitionKey: workUnitLifecycleTransitions.transitionKey,
            workflowId: methodologyTransitionWorkflowBindings.workflowId,
            workflowKey: methodologyWorkflows.key,
            createdAt: methodologyTransitionWorkflowBindings.createdAt,
            updatedAt: methodologyTransitionWorkflowBindings.updatedAt,
          })
          .from(methodologyTransitionWorkflowBindings)
          .innerJoin(
            workUnitLifecycleTransitions,
            eq(methodologyTransitionWorkflowBindings.transitionId, workUnitLifecycleTransitions.id),
          )
          .leftJoin(
            methodologyWorkflows,
            eq(methodologyTransitionWorkflowBindings.workflowId, methodologyWorkflows.id),
          )
          .where(and(...conditions))
          .orderBy(
            asc(workUnitLifecycleTransitions.transitionKey),
            asc(methodologyWorkflows.key),
            asc(methodologyTransitionWorkflowBindings.id),
          );

        return rows.map(toTransitionWorkflowBindingRow) as readonly TransitionWorkflowBindingRow[];
      }),

    saveLifecycleDefinition: (params: SaveLifecycleDefinitionParams) =>
      dbEffect("lifecycle.saveLifecycleDefinition", () =>
        db.transaction(async (tx) => {
          const versionRows = await tx
            .select({ id: methodologyVersions.id, status: methodologyVersions.status })
            .from(methodologyVersions)
            .where(eq(methodologyVersions.id, params.versionId))
            .limit(1);
          const versionRow = versionRows[0];
          if (!versionRow) {
            throw new Error("VERSION_NOT_FOUND");
          }
          if (versionRow.status !== "draft") {
            throw new Error("PUBLISHED_CONTRACT_IMMUTABLE");
          }

          const existingBindingRows = await tx
            .select({
              transitionKey: workUnitLifecycleTransitions.transitionKey,
              workflowKey: methodologyWorkflows.key,
            })
            .from(methodologyTransitionWorkflowBindings)
            .innerJoin(
              workUnitLifecycleTransitions,
              eq(
                methodologyTransitionWorkflowBindings.transitionId,
                workUnitLifecycleTransitions.id,
              ),
            )
            .leftJoin(
              methodologyWorkflows,
              eq(methodologyTransitionWorkflowBindings.workflowId, methodologyWorkflows.id),
            )
            .where(
              eq(methodologyTransitionWorkflowBindings.methodologyVersionId, params.versionId),
            );

          const existingBindingsByTransition = new Map<string, string[]>();
          for (const row of existingBindingRows) {
            if (!row.workflowKey) {
              continue;
            }

            const previous = existingBindingsByTransition.get(row.transitionKey) ?? [];
            previous.push(row.workflowKey);
            existingBindingsByTransition.set(row.transitionKey, previous);
          }

          // Delete existing lifecycle data for this version (full replace)
          await tx
            .delete(transitionConditionSets)
            .where(eq(transitionConditionSets.methodologyVersionId, params.versionId));

          await tx
            .delete(workUnitLifecycleTransitions)
            .where(eq(workUnitLifecycleTransitions.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyFactSchemas)
            .where(eq(methodologyFactSchemas.methodologyVersionId, params.versionId));

          await tx
            .delete(workUnitLifecycleStates)
            .where(eq(workUnitLifecycleStates.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyWorkUnitTypes)
            .where(eq(methodologyWorkUnitTypes.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyAgentTypes)
            .where(eq(methodologyAgentTypes.methodologyVersionId, params.versionId));

          await tx
            .delete(methodologyTransitionWorkflowBindings)
            .where(
              eq(methodologyTransitionWorkflowBindings.methodologyVersionId, params.versionId),
            );

          // Insert new work unit types
          const workUnitTypeRows: WorkUnitTypeRow[] = [];
          const transitionIdByKey = new Map<string, string>();

          for (const wut of params.workUnitTypes) {
            const wutRows = await tx
              .insert(methodologyWorkUnitTypes)
              .values({
                methodologyVersionId: params.versionId,
                key: wut.key,
                displayName: wut.displayName ?? null,
                descriptionJson: wut.description ? { text: wut.description } : null,
                guidanceJson: wut.guidance ?? null,
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
              await tx.insert(workUnitLifecycleStates).values({
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
                name: fact.name ?? null,
                key: fact.key,
                factType: fact.factType,
                description: fact.description ?? null,
                defaultValueJson: fact.defaultValue ?? null,
                guidanceJson: (fact.guidance ?? null) as unknown,
                validationJson: fact.validation ?? null,
              });
            }
          }

          for (const agent of params.agentTypes) {
            const promptMarkdown = agent.promptTemplate?.markdown ?? agent.persona;
            await tx.insert(methodologyAgentTypes).values({
              methodologyVersionId: params.versionId,
              key: agent.key,
              displayName: agent.displayName ?? null,
              description: agent.description ?? null,
              persona: agent.persona,
              promptTemplateJson: { markdown: promptMarkdown },
              promptTemplateVersion: 1,
              defaultModelJson: agent.defaultModel ?? null,
              mcpServersJson: agent.mcpServers ?? null,
              capabilitiesJson: agent.capabilities ?? null,
            });
          }

          // Now insert transitions (need state IDs first, so query for them)
          const allStates = await tx
            .select()
            .from(workUnitLifecycleStates)
            .where(eq(workUnitLifecycleStates.methodologyVersionId, params.versionId));

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
                .insert(workUnitLifecycleTransitions)
                .values({
                  methodologyVersionId: params.versionId,
                  workUnitTypeId: wutRow.id,
                  fromStateId: fromStateId,
                  toStateId: toStateId,
                  transitionKey: transition.transitionKey,
                })
                .returning();

              const transRow = transRows[0];
              if (!transRow) {
                throw new Error(
                  `Failed to insert transition '${transition.transitionKey}' for work unit type '${wut.key}'`,
                );
              }

              transitionIdByKey.set(transition.transitionKey, transRow.id);

              for (const conditionSet of transition.conditionSets) {
                await tx.insert(transitionConditionSets).values({
                  methodologyVersionId: params.versionId,
                  transitionId: transRow.id,
                  key: conditionSet.key,
                  phase: conditionSet.phase,
                  mode: conditionSet.mode,
                  groupsJson: conditionSet.groups,
                  guidanceJson: conditionSet.guidance ?? null,
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

          const workflowRows = await tx
            .select({ id: methodologyWorkflows.id, key: methodologyWorkflows.key })
            .from(methodologyWorkflows)
            .where(eq(methodologyWorkflows.methodologyVersionId, params.versionId));
          const workflowIdByKey = new Map(workflowRows.map((row) => [row.key, row.id]));

          for (const [transitionKey, workflowKeys] of existingBindingsByTransition.entries()) {
            const transitionId = transitionIdByKey.get(transitionKey);
            if (!transitionId) {
              continue;
            }

            const uniqueWorkflowKeys = [...new Set(workflowKeys)].filter(
              (value) => value.length > 0,
            );
            for (const workflowKey of uniqueWorkflowKeys) {
              const workflowId = workflowIdByKey.get(workflowKey);
              if (!workflowId) {
                continue;
              }

              await tx.insert(methodologyTransitionWorkflowBindings).values({
                methodologyVersionId: params.versionId,
                transitionId,
                workflowId,
                guidanceJson: null,
              });
            }
          }

          const version = toVersionRow(existingVersionRow);

          // Record lifecycle updated event
          const eventRows = await tx
            .insert(methodologyVersionEvents)
            .values({
              methodologyVersionId: params.versionId,
              eventType: "updated",
              actorId: params.actorId,
              changedFieldsJson: params.changedFieldsJson,
              diagnosticsJson: params.validationResult,
            })
            .returning();
          const eventRow = eventRows[0];
          if (!eventRow) {
            throw new Error(`Failed to record updated event for version '${params.versionId}'`);
          }

          return {
            version,
            events: [toEventRow(eventRow)],
          } as SaveLifecycleResult;
        }),
      ),

    recordLifecycleEvent: (event: Omit<MethodologyVersionEventRow, "id" | "createdAt">) =>
      dbEffect("lifecycle.recordLifecycleEvent", async () => {
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
