import { and, asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  MethodologyRepository,
  RepositoryError,
  type RepositoryErrorCode,
  type CreateDraftParams,
  type GetProjectPinLineageParams,
  type GetPublicationEvidenceParams,
  type PinProjectMethodologyVersionParams,
  type ProjectMethodologyPinEventRow,
  type ProjectMethodologyPinRow,
  type UpdateDraftParams,
  type GetVersionEventsParams,
  type MethodologyDefinitionRow,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type PublishDraftVersionParams,
  type WorkflowSnapshot,
} from "@chiron/methodology-engine";
import type {
  PublicationEvidence,
  ValidationResult,
  MethodologyVersionDefinition,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import {
  methodologyDefinitions,
  methodologyVersions,
  methodologyVersionEvents,
  methodologyFactDefinitions,
  methodologyLinkTypeDefinitions,
  methodologyWorkUnitTypes,
  methodologyAgentTypes,
  methodologyLifecycleTransitions,
  methodologyWorkflows,
  methodologyWorkflowSteps,
  methodologyWorkflowEdges,
  methodologyTransitionWorkflowBindings,
  methodologyFactSchemas,
} from "./schema/methodology";
import {
  projectExecutions,
  projectMethodologyPinEvents,
  projectMethodologyPins,
  projects,
} from "./schema/project";

type DB = LibSQLDatabase<Record<string, unknown>>;

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

/** Default page size for paginated queries. */
const DEFAULT_EVENT_LIMIT = 100;

const KNOWN_PUBLISH_ERROR_CODES = new Set<RepositoryErrorCode>([
  "VERSION_NOT_FOUND",
  "PUBLISHED_CONTRACT_IMMUTABLE",
  "PUBLISH_VERSION_ALREADY_EXISTS",
  "PUBLISH_CONCURRENT_WRITE_CONFLICT",
  "PUBLISH_ATOMICITY_GUARD_ABORTED",
]);

const KNOWN_PROJECT_PIN_ERROR_CODES = new Set<RepositoryErrorCode>([
  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
  "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
  "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
  "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
  "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
]);

function asWorkflowStepType(
  value: string,
): "form" | "agent" | "action" | "invoke" | "branch" | "display" {
  switch (value) {
    case "form":
    case "agent":
    case "action":
    case "invoke":
    case "branch":
    case "display":
      return value;
    default:
      throw new Error(`Unknown workflow step type '${value}' in persisted snapshot`);
  }
}

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

type TransactionClient = Parameters<Parameters<DB["transaction"]>[0]>[0];

async function syncWorkflowGraph(
  tx: TransactionClient,
  versionId: string,
  workflows: readonly WorkflowDefinition[],
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"],
  guidance: MethodologyVersionDefinition["guidance"] | undefined,
): Promise<void> {
  await tx
    .delete(methodologyTransitionWorkflowBindings)
    .where(eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId));
  await tx
    .delete(methodologyWorkflowEdges)
    .where(eq(methodologyWorkflowEdges.methodologyVersionId, versionId));
  await tx
    .delete(methodologyWorkflowSteps)
    .where(eq(methodologyWorkflowSteps.methodologyVersionId, versionId));
  await tx
    .delete(methodologyWorkflows)
    .where(eq(methodologyWorkflows.methodologyVersionId, versionId));

  const workflowEntries = workflows;
  const rawBindingMap = transitionWorkflowBindings;

  const workUnitRows = await tx
    .select({ id: methodologyWorkUnitTypes.id, key: methodologyWorkUnitTypes.key })
    .from(methodologyWorkUnitTypes)
    .where(eq(methodologyWorkUnitTypes.methodologyVersionId, versionId));
  const workUnitTypeIdByKey = new Map(workUnitRows.map((row) => [row.key, row.id]));

  const agentRows = await tx
    .select({ id: methodologyAgentTypes.id, key: methodologyAgentTypes.key })
    .from(methodologyAgentTypes)
    .where(eq(methodologyAgentTypes.methodologyVersionId, versionId));
  const agentTypeIdByKey = new Map(agentRows.map((row) => [row.key, row.id]));

  if (guidance?.byWorkUnitType) {
    for (const [workUnitTypeKey, guidanceValue] of Object.entries(guidance.byWorkUnitType)) {
      const workUnitTypeId = workUnitTypeIdByKey.get(workUnitTypeKey);
      if (!workUnitTypeId) {
        continue;
      }

      await tx
        .update(methodologyWorkUnitTypes)
        .set({ guidanceJson: guidanceValue ?? null })
        .where(eq(methodologyWorkUnitTypes.id, workUnitTypeId));
    }
  }

  if (guidance?.byAgentType) {
    for (const [agentTypeKey, guidanceValue] of Object.entries(guidance.byAgentType)) {
      const agentTypeId = agentTypeIdByKey.get(agentTypeKey);
      if (!agentTypeId) {
        continue;
      }

      await tx
        .update(methodologyAgentTypes)
        .set({ guidanceJson: guidanceValue ?? null })
        .where(eq(methodologyAgentTypes.id, agentTypeId));
    }
  }

  const transitionRows = await tx
    .select({
      id: methodologyLifecycleTransitions.id,
      transitionKey: methodologyLifecycleTransitions.transitionKey,
    })
    .from(methodologyLifecycleTransitions)
    .where(eq(methodologyLifecycleTransitions.methodologyVersionId, versionId));
  const transitionIdByKey = new Map(transitionRows.map((row) => [row.transitionKey, row.id]));

  const workflowIdByKey = new Map<string, string>();

  for (const workflow of workflowEntries) {
    const workflowKey = workflow.key;
    if (!workflowKey) {
      continue;
    }

    const workflowDisplayName = workflow.displayName ?? null;
    const workUnitTypeKey = workflow.workUnitTypeKey ?? null;

    const workflowRows = await tx
      .insert(methodologyWorkflows)
      .values({
        methodologyVersionId: versionId,
        workUnitTypeId: workUnitTypeKey ? (workUnitTypeIdByKey.get(workUnitTypeKey) ?? null) : null,
        key: workflowKey,
        displayName: workflowDisplayName,
        guidanceJson: null,
      })
      .returning();
    const workflowRow = workflowRows[0];
    if (!workflowRow) {
      throw new Error(`Failed to persist workflow '${workflowKey}'`);
    }
    workflowIdByKey.set(workflowKey, workflowRow.id);

    const stepEntries = workflow.steps;
    const stepIdByKey = new Map<string, string>();

    for (const step of stepEntries) {
      const stepKey = step.key;
      const stepType = step.type;
      if (!stepKey || !stepType) {
        continue;
      }

      const stepRows = await tx
        .insert(methodologyWorkflowSteps)
        .values({
          methodologyVersionId: versionId,
          workflowId: workflowRow.id,
          key: stepKey,
          type: stepType,
          displayName: step.displayName ?? null,
          configJson: step.config ?? null,
          guidanceJson: null,
        })
        .returning();

      const stepRow = stepRows[0];
      if (!stepRow) {
        throw new Error(`Failed to persist step '${workflowKey}.${stepKey}'`);
      }

      stepIdByKey.set(stepKey, stepRow.id);
    }

    const edgeEntries = workflow.edges;
    for (const edge of edgeEntries) {
      const fromStepKey = edge.fromStepKey;
      const toStepKey = edge.toStepKey;

      const fromStepId = fromStepKey === null ? null : (stepIdByKey.get(fromStepKey) ?? null);
      const toStepId = toStepKey === null ? null : (stepIdByKey.get(toStepKey) ?? null);

      if (fromStepKey !== null && fromStepId === null) {
        throw new Error(
          `Workflow '${workflowKey}' edge references unknown fromStepKey '${fromStepKey}'`,
        );
      }

      if (toStepKey !== null && toStepId === null) {
        throw new Error(
          `Workflow '${workflowKey}' edge references unknown toStepKey '${toStepKey}'`,
        );
      }

      await tx.insert(methodologyWorkflowEdges).values({
        methodologyVersionId: versionId,
        workflowId: workflowRow.id,
        fromStepId,
        toStepId,
        edgeKey: edge.edgeKey ?? null,
        conditionJson: edge.condition ?? null,
        guidanceJson: null,
      });
    }
  }

  for (const [transitionKey, boundWorkflowKeys] of Object.entries(rawBindingMap)) {
    const transitionId = transitionIdByKey.get(transitionKey);
    if (!transitionId || !Array.isArray(boundWorkflowKeys)) {
      continue;
    }

    const uniqueWorkflowKeys = [...new Set(boundWorkflowKeys)].filter(
      (value): value is string => typeof value === "string" && value.length > 0,
    );

    for (const workflowKey of uniqueWorkflowKeys) {
      const workflowId = workflowIdByKey.get(workflowKey);
      if (!workflowId) {
        continue;
      }

      await tx.insert(methodologyTransitionWorkflowBindings).values({
        methodologyVersionId: versionId,
        transitionId,
        workflowId,
        guidanceJson: guidance?.byTransition?.[transitionKey] ?? null,
      });
    }
  }
}

export function createMethodologyRepoLayer(db: DB): Layer.Layer<MethodologyRepository> {
  return Layer.succeed(MethodologyRepository, {
    listDefinitions: () =>
      dbEffect("methodology.listDefinitions", async () => {
        const rows = await db
          .select()
          .from(methodologyDefinitions)
          .orderBy(asc(methodologyDefinitions.updatedAt), asc(methodologyDefinitions.key));

        return rows.map((row) => toDefinitionRow(row));
      }),

    createDefinition: (key: string, displayName: string) =>
      dbEffect("methodology.createDefinition", async () => {
        const inserted = await db
          .insert(methodologyDefinitions)
          .values({
            key,
            name: displayName,
            descriptionJson: {},
          })
          .returning();

        const row = inserted[0];
        if (!row) {
          throw new Error("Failed to create methodology definition");
        }

        return toDefinitionRow(row);
      }),

    findDefinitionByKey: (key: string) =>
      dbEffect("methodology.findDefinitionByKey", async () => {
        const rows = await db
          .select()
          .from(methodologyDefinitions)
          .where(eq(methodologyDefinitions.key, key))
          .limit(1);
        return rows[0] ? toDefinitionRow(rows[0]) : null;
      }),

    listVersionsByMethodologyId: (methodologyId: string) =>
      dbEffect("methodology.listVersionsByMethodologyId", async () => {
        const rows = await db
          .select()
          .from(methodologyVersions)
          .where(eq(methodologyVersions.methodologyId, methodologyId))
          .orderBy(asc(methodologyVersions.createdAt), asc(methodologyVersions.id));

        return rows.map((row) => toVersionRow(row));
      }),

    findVersionById: (id: string) =>
      dbEffect("methodology.findVersionById", async () => {
        const rows = await db
          .select()
          .from(methodologyVersions)
          .where(eq(methodologyVersions.id, id))
          .limit(1);
        return rows[0] ? toVersionRow(rows[0]) : null;
      }),

    findVersionByMethodologyAndVersion: (methodologyId: string, version: string) =>
      dbEffect("methodology.findVersionByMethodologyAndVersion", async () => {
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
      dbEffect("methodology.createDraft", () =>
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
              definitionExtensions: params.definitionExtensions,
            })
            .returning();

          const ver = versionRows[0]!;

          await syncWorkflowGraph(
            tx,
            ver.id,
            params.workflows,
            params.transitionWorkflowBindings,
            params.guidance,
          );

          if (params.factDefinitions?.length) {
            const factValues = params.factDefinitions.map((v) => ({
              methodologyVersionId: ver.id,
              key: v.key,
              valueType: v.valueType,
              descriptionJson: v.description ?? null,
              required: v.required,
              defaultValueJson: v.defaultValue ?? null,
              validationJson: v.validation ?? null,
            }));

            await tx.insert(methodologyFactDefinitions).values(factValues);
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
              changedFieldsJson: params.definitionExtensions,
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
      dbEffect("methodology.updateDraft", () =>
        db.transaction(async (tx) => {
          const versionRows = await tx
            .update(methodologyVersions)
            .set({
              displayName: params.displayName,
              version: params.version,
              definitionExtensions: params.definitionExtensions,
            })
            .where(
              and(
                eq(methodologyVersions.id, params.versionId),
                eq(methodologyVersions.status, "draft"),
              ),
            )
            .returning();

          if (versionRows.length === 0) {
            throw new Error("PUBLISHED_CONTRACT_IMMUTABLE");
          }

          const ver = versionRows[0]!;

          await syncWorkflowGraph(
            tx,
            ver.id,
            params.workflows,
            params.transitionWorkflowBindings,
            params.guidance,
          );

          if (params.factDefinitions !== undefined) {
            await tx
              .delete(methodologyFactDefinitions)
              .where(eq(methodologyFactDefinitions.methodologyVersionId, params.versionId));

            if (params.factDefinitions.length > 0) {
              const factValues = params.factDefinitions.map((v) => ({
                methodologyVersionId: ver.id,
                key: v.key,
                valueType: v.valueType,
                descriptionJson: v.description ?? null,
                required: v.required,
                defaultValueJson: v.defaultValue ?? null,
                validationJson: v.validation ?? null,
              }));

              await tx.insert(methodologyFactDefinitions).values(factValues);
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
      dbEffect("methodology.getVersionEvents", async () => {
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
      dbEffect("methodology.recordEvent", async () => {
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
      dbEffect("methodology.findLinkTypeKeys", async () => {
        const rows = await db
          .select({ key: methodologyLinkTypeDefinitions.key })
          .from(methodologyLinkTypeDefinitions)
          .where(eq(methodologyLinkTypeDefinitions.methodologyVersionId, versionId))
          .orderBy(asc(methodologyLinkTypeDefinitions.key));
        return rows.map((r) => r.key) as readonly string[];
      }),

    findWorkflowSnapshot: (versionId: string) =>
      dbEffect("methodology.findWorkflowSnapshot", async () => {
        const [
          workflowRows,
          stepRows,
          edgeRows,
          bindingRows,
          workUnitGuidanceRows,
          agentGuidanceRows,
          versionRows,
        ] = await Promise.all([
          db
            .select({
              id: methodologyWorkflows.id,
              key: methodologyWorkflows.key,
              displayName: methodologyWorkflows.displayName,
              workUnitTypeKey: methodologyWorkUnitTypes.key,
            })
            .from(methodologyWorkflows)
            .leftJoin(
              methodologyWorkUnitTypes,
              eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(eq(methodologyWorkflows.methodologyVersionId, versionId))
            .orderBy(asc(methodologyWorkflows.key)),
          db
            .select({
              id: methodologyWorkflowSteps.id,
              workflowId: methodologyWorkflowSteps.workflowId,
              key: methodologyWorkflowSteps.key,
              type: methodologyWorkflowSteps.type,
              displayName: methodologyWorkflowSteps.displayName,
              configJson: methodologyWorkflowSteps.configJson,
            })
            .from(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.methodologyVersionId, versionId))
            .orderBy(asc(methodologyWorkflowSteps.workflowId), asc(methodologyWorkflowSteps.key)),
          db
            .select({
              id: methodologyWorkflowEdges.id,
              workflowId: methodologyWorkflowEdges.workflowId,
              fromStepId: methodologyWorkflowEdges.fromStepId,
              toStepId: methodologyWorkflowEdges.toStepId,
              edgeKey: methodologyWorkflowEdges.edgeKey,
              conditionJson: methodologyWorkflowEdges.conditionJson,
            })
            .from(methodologyWorkflowEdges)
            .where(eq(methodologyWorkflowEdges.methodologyVersionId, versionId))
            .orderBy(asc(methodologyWorkflowEdges.workflowId), asc(methodologyWorkflowEdges.id)),
          db
            .select({
              transitionKey: methodologyLifecycleTransitions.transitionKey,
              workflowKey: methodologyWorkflows.key,
              guidanceJson: methodologyTransitionWorkflowBindings.guidanceJson,
            })
            .from(methodologyTransitionWorkflowBindings)
            .innerJoin(
              methodologyLifecycleTransitions,
              eq(
                methodologyTransitionWorkflowBindings.transitionId,
                methodologyLifecycleTransitions.id,
              ),
            )
            .innerJoin(
              methodologyWorkflows,
              eq(methodologyTransitionWorkflowBindings.workflowId, methodologyWorkflows.id),
            )
            .where(eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId))
            .orderBy(
              asc(methodologyLifecycleTransitions.transitionKey),
              asc(methodologyWorkflows.key),
              asc(methodologyTransitionWorkflowBindings.id),
            ),
          db
            .select({
              key: methodologyWorkUnitTypes.key,
              guidanceJson: methodologyWorkUnitTypes.guidanceJson,
            })
            .from(methodologyWorkUnitTypes)
            .where(eq(methodologyWorkUnitTypes.methodologyVersionId, versionId)),
          db
            .select({
              key: methodologyAgentTypes.key,
              guidanceJson: methodologyAgentTypes.guidanceJson,
            })
            .from(methodologyAgentTypes)
            .where(eq(methodologyAgentTypes.methodologyVersionId, versionId)),
          db
            .select({ definitionExtensions: methodologyVersions.definitionExtensions })
            .from(methodologyVersions)
            .where(eq(methodologyVersions.id, versionId)),
        ]);

        const stepsByWorkflowId = new Map<string, typeof stepRows>();
        const stepKeyById = new Map<string, string>();
        for (const stepRow of stepRows) {
          const steps = stepsByWorkflowId.get(stepRow.workflowId) ?? [];
          steps.push(stepRow);
          stepsByWorkflowId.set(stepRow.workflowId, steps);
          stepKeyById.set(stepRow.id, stepRow.key);
        }

        const edgesByWorkflowId = new Map<string, typeof edgeRows>();
        for (const edgeRow of edgeRows) {
          const edges = edgesByWorkflowId.get(edgeRow.workflowId) ?? [];
          edges.push(edgeRow);
          edgesByWorkflowId.set(edgeRow.workflowId, edges);
        }

        const workflows = workflowRows.map((workflowRow) => ({
          key: workflowRow.key,
          displayName: workflowRow.displayName ?? undefined,
          workUnitTypeKey: workflowRow.workUnitTypeKey ?? undefined,
          steps: (stepsByWorkflowId.get(workflowRow.id) ?? []).map((stepRow) => ({
            key: stepRow.key,
            type: asWorkflowStepType(stepRow.type),
            displayName: stepRow.displayName ?? undefined,
            config: stepRow.configJson ?? undefined,
          })),
          edges: (edgesByWorkflowId.get(workflowRow.id) ?? []).map((edgeRow) => ({
            fromStepKey: edgeRow.fromStepId ? (stepKeyById.get(edgeRow.fromStepId) ?? null) : null,
            toStepKey: edgeRow.toStepId ? (stepKeyById.get(edgeRow.toStepId) ?? null) : null,
            edgeKey: edgeRow.edgeKey ?? undefined,
            condition: edgeRow.conditionJson ?? undefined,
          })),
        }));

        const transitionWorkflowBindings: Record<string, string[]> = {};
        const guidanceByWorkUnitType: Record<string, unknown> = {};
        const guidanceByAgentType: Record<string, unknown> = {};
        const guidanceByTransition: Record<string, unknown> = {};
        for (const bindingRow of bindingRows) {
          const current = transitionWorkflowBindings[bindingRow.transitionKey] ?? [];
          current.push(bindingRow.workflowKey);
          transitionWorkflowBindings[bindingRow.transitionKey] = current;

          if (
            bindingRow.guidanceJson !== null &&
            bindingRow.guidanceJson !== undefined &&
            !(bindingRow.transitionKey in guidanceByTransition)
          ) {
            guidanceByTransition[bindingRow.transitionKey] = bindingRow.guidanceJson;
          }
        }

        for (const row of workUnitGuidanceRows) {
          if (row.guidanceJson !== null && row.guidanceJson !== undefined) {
            guidanceByWorkUnitType[row.key] = row.guidanceJson;
          }
        }

        for (const row of agentGuidanceRows) {
          if (row.guidanceJson !== null && row.guidanceJson !== undefined) {
            guidanceByAgentType[row.key] = row.guidanceJson;
          }
        }

        const versionExtension = versionRows[0]?.definitionExtensions;
        const globalGuidance =
          typeof versionExtension === "object" &&
          versionExtension !== null &&
          "guidance" in versionExtension &&
          typeof (versionExtension as { guidance?: unknown }).guidance === "object" &&
          (versionExtension as { guidance?: unknown }).guidance !== null &&
          "global" in
            ((versionExtension as { guidance?: unknown }).guidance as Record<string, unknown>)
            ? (((versionExtension as { guidance?: unknown }).guidance as { global?: unknown })
                .global ?? undefined)
            : undefined;

        const guidance =
          Object.keys(guidanceByTransition).length > 0 ||
          Object.keys(guidanceByWorkUnitType).length > 0 ||
          Object.keys(guidanceByAgentType).length > 0 ||
          globalGuidance !== undefined
            ? {
                global: globalGuidance,
                byWorkUnitType: guidanceByWorkUnitType,
                byAgentType: guidanceByAgentType,
                byTransition: guidanceByTransition,
              }
            : undefined;

        return {
          workflows,
          transitionWorkflowBindings,
          guidance,
        } satisfies WorkflowSnapshot;
      }),

    findFactSchemasByVersionId: (versionId: string) =>
      dbEffect("methodology.findFactSchemasByVersionId", async () => {
        const rows = await db
          .select({
            key: methodologyFactSchemas.key,
            factType: methodologyFactSchemas.factType,
            required: methodologyFactSchemas.required,
            defaultValueJson: methodologyFactSchemas.defaultValueJson,
            guidanceJson: methodologyFactSchemas.guidanceJson,
          })
          .from(methodologyFactSchemas)
          .where(eq(methodologyFactSchemas.methodologyVersionId, versionId))
          .orderBy(asc(methodologyFactSchemas.key));

        return rows.map((row) => ({
          key: row.key,
          factType: row.factType,
          required: row.required,
          defaultValueJson: row.defaultValueJson,
          guidanceJson: row.guidanceJson,
        }));
      }),

    publishDraftVersion: (params: PublishDraftVersionParams) =>
      Effect.tryPromise({
        try: () =>
          db.transaction(async (tx) => {
            const existingRows = await tx
              .select()
              .from(methodologyVersions)
              .where(eq(methodologyVersions.id, params.versionId))
              .limit(1);
            const existing = existingRows[0];
            if (!existing) {
              throw new Error("VERSION_NOT_FOUND");
            }

            if (existing.status !== "draft") {
              throw new Error("PUBLISH_CONCURRENT_WRITE_CONFLICT");
            }

            const duplicateRows = await tx
              .select({ id: methodologyVersions.id })
              .from(methodologyVersions)
              .where(
                and(
                  eq(methodologyVersions.methodologyId, existing.methodologyId),
                  eq(methodologyVersions.version, params.publishedVersion),
                ),
              )
              .limit(1);

            if (duplicateRows.length > 0 && duplicateRows[0]!.id !== params.versionId) {
              throw new Error("PUBLISH_VERSION_ALREADY_EXISTS");
            }

            const versionRows = await tx
              .update(methodologyVersions)
              .set({
                version: params.publishedVersion,
                status: "active",
              })
              .where(
                and(
                  eq(methodologyVersions.id, params.versionId),
                  eq(methodologyVersions.status, "draft"),
                ),
              )
              .returning();

            if (versionRows.length === 0) {
              throw new Error("PUBLISH_CONCURRENT_WRITE_CONFLICT");
            }

            const eventRows = await tx
              .insert(methodologyVersionEvents)
              .values({
                methodologyVersionId: params.versionId,
                eventType: "published",
                actorId: params.actorId,
                changedFieldsJson: {
                  sourceDraftRef: `draft:${params.versionId}`,
                  publishedVersion: params.publishedVersion,
                },
                diagnosticsJson: params.validationSummary,
              })
              .returning();

            if (eventRows.length === 0) {
              throw new Error("PUBLISH_ATOMICITY_GUARD_ABORTED");
            }

            return {
              version: toVersionRow(versionRows[0]!),
              event: toEventRow(eventRows[0]!),
            };
          }),
        catch: (cause) => {
          if (cause instanceof Error) {
            if (KNOWN_PUBLISH_ERROR_CODES.has(cause.message as RepositoryErrorCode)) {
              return new RepositoryError({
                operation: "methodology.publishDraftVersion",
                cause,
                code: cause.message as RepositoryErrorCode,
              });
            }

            if (cause.message.includes("methodology_version_events")) {
              return new RepositoryError({
                operation: "methodology.publishDraftVersion",
                cause: new Error("PUBLISH_ATOMICITY_GUARD_ABORTED"),
                code: "PUBLISH_ATOMICITY_GUARD_ABORTED",
              });
            }
          }
          return new RepositoryError({ operation: "methodology.publishDraftVersion", cause });
        },
      }),

    findProjectPin: (projectId: string) =>
      dbEffect("methodology.findProjectPin", async () => {
        const rows = await db
          .select()
          .from(projectMethodologyPins)
          .where(eq(projectMethodologyPins.projectId, projectId))
          .limit(1);
        return rows[0] ? toProjectPinRow(rows[0]) : null;
      }),

    hasPersistedExecutions: (projectId: string) =>
      dbEffect("methodology.hasPersistedExecutions", async () => {
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
                operation: "methodology.pinProjectMethodologyVersion",
                cause,
                code: cause.message as RepositoryErrorCode,
              });
            }

            if (cause.message.includes("project_methodology_pin_events")) {
              return new RepositoryError({
                operation: "methodology.pinProjectMethodologyVersion",
                cause: new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED"),
                code: "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
              });
            }
          }

          return new RepositoryError({
            operation: "methodology.pinProjectMethodologyVersion",
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
                operation: "methodology.repinProjectMethodologyVersion",
                cause,
                code: cause.message as RepositoryErrorCode,
              });
            }

            if (cause.message.includes("project_methodology_pin_events")) {
              return new RepositoryError({
                operation: "methodology.repinProjectMethodologyVersion",
                cause: new Error("PROJECT_PIN_ATOMICITY_GUARD_ABORTED"),
                code: "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
              });
            }
          }

          return new RepositoryError({
            operation: "methodology.repinProjectMethodologyVersion",
            cause,
          });
        },
      }),

    getProjectPinLineage: (params: GetProjectPinLineageParams) =>
      dbEffect("methodology.getProjectPinLineage", async () => {
        const rows = await db
          .select()
          .from(projectMethodologyPinEvents)
          .where(eq(projectMethodologyPinEvents.projectId, params.projectId))
          .orderBy(asc(projectMethodologyPinEvents.createdAt), asc(projectMethodologyPinEvents.id));

        return rows.map((row) => toProjectPinEventRow(row));
      }),

    getPublicationEvidence: (params: GetPublicationEvidenceParams) =>
      dbEffect("methodology.getPublicationEvidence", async () => {
        const rows = await db
          .select()
          .from(methodologyVersionEvents)
          .where(
            and(
              eq(methodologyVersionEvents.methodologyVersionId, params.methodologyVersionId),
              eq(methodologyVersionEvents.eventType, "published"),
            ),
          )
          .orderBy(asc(methodologyVersionEvents.createdAt), asc(methodologyVersionEvents.id));

        return rows.map((row) => {
          const changed =
            typeof row.changedFieldsJson === "object" && row.changedFieldsJson !== null
              ? (row.changedFieldsJson as Record<string, unknown>)
              : {};
          const diagnostics =
            typeof row.diagnosticsJson === "object" && row.diagnosticsJson !== null
              ? (row.diagnosticsJson as ValidationResult)
              : ({ valid: false, diagnostics: [] } satisfies ValidationResult);

          const sourceDraftRef =
            typeof changed.sourceDraftRef === "string"
              ? changed.sourceDraftRef
              : `draft:${params.methodologyVersionId}`;
          const publishedVersion =
            typeof changed.publishedVersion === "string" ? changed.publishedVersion : "";

          return {
            actorId: row.actorId,
            timestamp: row.createdAt.toISOString(),
            sourceDraftRef,
            publishedVersion,
            validationSummary: diagnostics,
            evidenceRef: row.id,
          } satisfies PublicationEvidence;
        }) as readonly PublicationEvidence[];
      }),
  });
}
