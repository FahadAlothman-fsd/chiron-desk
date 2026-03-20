import { and, asc, eq, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  MethodologyRepository,
  RepositoryError,
  type RepositoryErrorCode,
  type CreateDraftParams,
  type GetPublicationEvidenceParams,
  type UpdateDraftParams,
  type GetVersionEventsParams,
  type MethodologyDefinitionRow,
  type MethodologyVersionRow,
  type MethodologyVersionEventRow,
  type MethodologyFactDefinitionRow,
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
  workUnitLifecycleTransitions,
  methodologyWorkflows,
  methodologyWorkflowSteps,
  methodologyWorkflowEdges,
  methodologyTransitionWorkflowBindings,
  methodologyFactSchemas,
  methodologyArtifactSlotDefinitions,
  methodologyArtifactSlotTemplates,
} from "./schema/methodology";

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
    archivedAt: row.archivedAt,
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

/** Default page size for paginated queries. */
const DEFAULT_EVENT_LIMIT = 100;

const KNOWN_PUBLISH_ERROR_CODES = new Set<RepositoryErrorCode>([
  "FORBIDDEN_EXTENSION_KEYS",
  "VERSION_NOT_FOUND",
  "PUBLISHED_CONTRACT_IMMUTABLE",
  "PUBLISH_VERSION_ALREADY_EXISTS",
  "PUBLISH_CONCURRENT_WRITE_CONFLICT",
  "PUBLISH_ATOMICITY_GUARD_ABORTED",
]);

const FORBIDDEN_EXTENSION_KEYS = [
  "workUnitTypes",
  "agentTypes",
  "transitions",
  "workflows",
  "transitionWorkflowBindings",
  "factDefinitions",
  "linkTypeDefinitions",
] as const;

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
    catch: (cause) =>
      cause instanceof RepositoryError ? cause : new RepositoryError({ operation, cause }),
  });
}

function assertDefinitionExtensionsAreNonCanonical(
  definitionExtensions: unknown,
  operation: string,
): void {
  if (!definitionExtensions || typeof definitionExtensions !== "object") {
    return;
  }

  const record = definitionExtensions as Record<string, unknown>;
  const forbiddenKeys = FORBIDDEN_EXTENSION_KEYS.filter((key) => key in record);
  if (forbiddenKeys.length === 0) {
    return;
  }

  throw new RepositoryError({
    operation,
    code: "FORBIDDEN_EXTENSION_KEYS",
    cause: {
      diagnosticRef: "forbidden-extension-keys-diagnostics",
      scope: "definition_extensions_json",
      forbiddenKeys,
      message: `Forbidden canonical keys in definition_extensions_json: ${forbiddenKeys.join(", ")}`,
    },
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
      id: workUnitLifecycleTransitions.id,
      transitionKey: workUnitLifecycleTransitions.transitionKey,
    })
    .from(workUnitLifecycleTransitions)
    .where(eq(workUnitLifecycleTransitions.methodologyVersionId, versionId));
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
        metadataJson: workflow.metadata ?? null,
        guidanceJson: workflow.guidance ?? guidance?.byWorkflow?.[workflowKey] ?? null,
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
          guidanceJson: step.guidance ?? null,
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
          .where(isNull(methodologyDefinitions.archivedAt))
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

    updateDefinition: (key: string, displayName: string) =>
      dbEffect("methodology.updateDefinition", async () => {
        const updated = await db
          .update(methodologyDefinitions)
          .set({ name: displayName })
          .where(eq(methodologyDefinitions.key, key))
          .returning();

        return updated[0] ? toDefinitionRow(updated[0]) : null;
      }),

    archiveDefinition: (key: string) =>
      dbEffect("methodology.archiveDefinition", async () => {
        const archived = await db
          .update(methodologyDefinitions)
          .set({ archivedAt: new Date() })
          .where(eq(methodologyDefinitions.key, key))
          .returning();

        return archived[0] ? toDefinitionRow(archived[0]) : null;
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

    archiveVersion: (versionId: string) =>
      dbEffect("methodology.archiveVersion", async () => {
        const archived = await db
          .update(methodologyVersions)
          .set({ status: "archived", retiredAt: new Date() })
          .where(eq(methodologyVersions.id, versionId))
          .returning();

        return archived[0] ? toVersionRow(archived[0]) : null;
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
          assertDefinitionExtensionsAreNonCanonical(
            params.definitionExtensions,
            "methodology.createDraft",
          );

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
              name: v.name ?? null,
              key: v.key,
              valueType: v.factType,
              descriptionJson: v.description ?? null,
              guidanceJson: v.guidance ?? null,
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
                name: l.name ?? null,
                descriptionJson: l.description ?? null,
                guidanceJson: l.guidance ?? null,
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
          assertDefinitionExtensionsAreNonCanonical(
            params.definitionExtensions,
            "methodology.updateDraft",
          );

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
                name: v.name ?? null,
                key: v.key,
                valueType: v.factType,
                descriptionJson: v.description ?? null,
                guidanceJson: v.guidance ?? null,
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
                  name: l.name ?? null,
                  descriptionJson: l.description ?? null,
                  guidanceJson: l.guidance ?? null,
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

    findLinkTypeDefinitionsByVersionId: (versionId: string) =>
      dbEffect("methodology.findLinkTypeDefinitionsByVersionId", async () => {
        const rows = await db
          .select()
          .from(methodologyLinkTypeDefinitions)
          .where(eq(methodologyLinkTypeDefinitions.methodologyVersionId, versionId))
          .orderBy(asc(methodologyLinkTypeDefinitions.key));

        return rows.map((row) => ({
          id: row.id,
          methodologyVersionId: row.methodologyVersionId,
          key: row.key,
          name: row.name,
          descriptionJson: row.descriptionJson,
          guidanceJson: row.guidanceJson,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }));
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
              metadataJson: methodologyWorkflows.metadataJson,
              guidanceJson: methodologyWorkflows.guidanceJson,
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
              guidanceJson: methodologyWorkflowSteps.guidanceJson,
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
              transitionKey: workUnitLifecycleTransitions.transitionKey,
              workflowKey: methodologyWorkflows.key,
              guidanceJson: methodologyTransitionWorkflowBindings.guidanceJson,
            })
            .from(methodologyTransitionWorkflowBindings)
            .innerJoin(
              workUnitLifecycleTransitions,
              eq(
                methodologyTransitionWorkflowBindings.transitionId,
                workUnitLifecycleTransitions.id,
              ),
            )
            .innerJoin(
              methodologyWorkflows,
              eq(methodologyTransitionWorkflowBindings.workflowId, methodologyWorkflows.id),
            )
            .where(eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId))
            .orderBy(
              asc(workUnitLifecycleTransitions.transitionKey),
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
          metadata: workflowRow.metadataJson as WorkflowDefinition["metadata"] | undefined,
          guidance: workflowRow.guidanceJson as WorkflowDefinition["guidance"] | undefined,
          steps: (stepsByWorkflowId.get(workflowRow.id) ?? []).map((stepRow) => ({
            key: stepRow.key,
            type: asWorkflowStepType(stepRow.type),
            displayName: stepRow.displayName ?? undefined,
            config: stepRow.configJson ?? undefined,
            guidance: stepRow.guidanceJson as
              | WorkflowDefinition["steps"][number]["guidance"]
              | undefined,
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
        const guidanceByWorkflow: Record<string, unknown> = {};
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

        for (const row of workflowRows) {
          if (row.guidanceJson !== null && row.guidanceJson !== undefined) {
            guidanceByWorkflow[row.key] = row.guidanceJson;
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
          Object.keys(guidanceByWorkflow).length > 0 ||
          globalGuidance !== undefined
            ? {
                global: globalGuidance,
                byWorkUnitType: guidanceByWorkUnitType,
                byAgentType: guidanceByAgentType,
                byTransition: guidanceByTransition,
                byWorkflow: guidanceByWorkflow,
              }
            : undefined;

        return {
          workflows,
          transitionWorkflowBindings,
          ...(guidance ? { guidance } : {}),
        } satisfies WorkflowSnapshot;
      }),

    findFactSchemasByVersionId: (versionId: string) =>
      dbEffect("methodology.findFactSchemasByVersionId", async () => {
        const rows = await db
          .select({
            name: methodologyFactSchemas.name,
            key: methodologyFactSchemas.key,
            factType: methodologyFactSchemas.factType,
            description: methodologyFactSchemas.description,
            defaultValueJson: methodologyFactSchemas.defaultValueJson,
            guidanceJson: methodologyFactSchemas.guidanceJson,
            validationJson: methodologyFactSchemas.validationJson,
          })
          .from(methodologyFactSchemas)
          .where(eq(methodologyFactSchemas.methodologyVersionId, versionId))
          .orderBy(asc(methodologyFactSchemas.key));

        return rows.map((row) => ({
          name: row.name,
          key: row.key,
          factType: row.factType,
          description: row.description,
          defaultValueJson: row.defaultValueJson,
          guidanceJson: row.guidanceJson,
          validationJson: row.validationJson,
        }));
      }),

    findFactDefinitionsByVersionId: (versionId: string) =>
      dbEffect("methodology.findFactDefinitionsByVersionId", async () => {
        const rows = await db
          .select({
            name: methodologyFactDefinitions.name,
            key: methodologyFactDefinitions.key,
            valueType: methodologyFactDefinitions.valueType,
            descriptionJson: methodologyFactDefinitions.descriptionJson,
            guidanceJson: methodologyFactDefinitions.guidanceJson,
            defaultValueJson: methodologyFactDefinitions.defaultValueJson,
            validationJson: methodologyFactDefinitions.validationJson,
          })
          .from(methodologyFactDefinitions)
          .where(eq(methodologyFactDefinitions.methodologyVersionId, versionId))
          .orderBy(asc(methodologyFactDefinitions.key));

        return rows as readonly MethodologyFactDefinitionRow[];
      }),

    replaceArtifactSlotsForWorkUnitType: ({ versionId, workUnitTypeKey, slots }) =>
      dbEffect("methodology.replaceArtifactSlotsForWorkUnitType", () =>
        db.transaction(async (tx) => {
          const workUnitRows = await tx
            .select({ id: methodologyWorkUnitTypes.id })
            .from(methodologyWorkUnitTypes)
            .where(
              and(
                eq(methodologyWorkUnitTypes.methodologyVersionId, versionId),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const workUnitTypeId = workUnitRows[0]?.id;

          if (!workUnitTypeId) {
            return;
          }

          const existingSlots = await tx
            .select({ id: methodologyArtifactSlotDefinitions.id })
            .from(methodologyArtifactSlotDefinitions)
            .where(
              and(
                eq(methodologyArtifactSlotDefinitions.methodologyVersionId, versionId),
                eq(methodologyArtifactSlotDefinitions.workUnitTypeId, workUnitTypeId),
              ),
            );

          if (existingSlots.length > 0) {
            const slotIds = existingSlots.map((row) => row.id);
            for (const slotId of slotIds) {
              await tx
                .delete(methodologyArtifactSlotTemplates)
                .where(eq(methodologyArtifactSlotTemplates.slotDefinitionId, slotId));
            }
            await tx
              .delete(methodologyArtifactSlotDefinitions)
              .where(
                and(
                  eq(methodologyArtifactSlotDefinitions.methodologyVersionId, versionId),
                  eq(methodologyArtifactSlotDefinitions.workUnitTypeId, workUnitTypeId),
                ),
              );
          }

          for (const slot of slots) {
            const insertedSlotRows = await tx
              .insert(methodologyArtifactSlotDefinitions)
              .values({
                methodologyVersionId: versionId,
                workUnitTypeId,
                key: slot.key,
                displayName: slot.displayName,
                descriptionJson: slot.descriptionJson,
                guidanceJson: slot.guidanceJson,
                cardinality: slot.cardinality,
                rulesJson: slot.rulesJson,
              })
              .returning({ id: methodologyArtifactSlotDefinitions.id });
            const slotDefinitionId = insertedSlotRows[0]?.id;

            if (!slotDefinitionId || slot.templates.length === 0) {
              continue;
            }

            await tx.insert(methodologyArtifactSlotTemplates).values(
              slot.templates.map((template) => ({
                methodologyVersionId: versionId,
                slotDefinitionId,
                key: template.key,
                displayName: template.displayName,
                descriptionJson: template.descriptionJson,
                guidanceJson: template.guidanceJson,
                content: template.content,
              })),
            );
          }
        }),
      ),

    findArtifactSlotsByWorkUnitType: ({ versionId, workUnitTypeKey }) =>
      dbEffect("methodology.findArtifactSlotsByWorkUnitType", async () => {
        const rows = await db
          .select({
            slotKey: methodologyArtifactSlotDefinitions.key,
            slotDisplayName: methodologyArtifactSlotDefinitions.displayName,
            slotDescriptionJson: methodologyArtifactSlotDefinitions.descriptionJson,
            slotGuidanceJson: methodologyArtifactSlotDefinitions.guidanceJson,
            slotCardinality: methodologyArtifactSlotDefinitions.cardinality,
            slotRulesJson: methodologyArtifactSlotDefinitions.rulesJson,
            templateKey: methodologyArtifactSlotTemplates.key,
            templateDisplayName: methodologyArtifactSlotTemplates.displayName,
            templateDescriptionJson: methodologyArtifactSlotTemplates.descriptionJson,
            templateGuidanceJson: methodologyArtifactSlotTemplates.guidanceJson,
            templateContent: methodologyArtifactSlotTemplates.content,
          })
          .from(methodologyArtifactSlotDefinitions)
          .innerJoin(
            methodologyWorkUnitTypes,
            eq(methodologyArtifactSlotDefinitions.workUnitTypeId, methodologyWorkUnitTypes.id),
          )
          .leftJoin(
            methodologyArtifactSlotTemplates,
            eq(
              methodologyArtifactSlotDefinitions.id,
              methodologyArtifactSlotTemplates.slotDefinitionId,
            ),
          )
          .where(
            and(
              eq(methodologyArtifactSlotDefinitions.methodologyVersionId, versionId),
              eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
            ),
          )
          .orderBy(
            asc(methodologyArtifactSlotDefinitions.key),
            asc(methodologyArtifactSlotTemplates.key),
          );

        const slots = new Map<
          string,
          {
            key: string;
            displayName: string | null;
            descriptionJson: unknown;
            guidanceJson: unknown;
            cardinality: "single" | "fileset";
            rulesJson: unknown;
            templates: Array<{
              key: string;
              displayName: string | null;
              descriptionJson: unknown;
              guidanceJson: unknown;
              content: string | null;
            }>;
          }
        >();

        for (const row of rows) {
          const existing = slots.get(row.slotKey);
          if (existing) {
            if (row.templateKey) {
              existing.templates.push({
                key: row.templateKey,
                displayName: row.templateDisplayName,
                descriptionJson: row.templateDescriptionJson,
                guidanceJson: row.templateGuidanceJson,
                content: row.templateContent,
              });
            }
            continue;
          }

          const slot = {
            key: row.slotKey,
            displayName: row.slotDisplayName,
            descriptionJson: row.slotDescriptionJson,
            guidanceJson: row.slotGuidanceJson,
            cardinality:
              row.slotCardinality === "fileset" ? ("fileset" as const) : ("single" as const),
            rulesJson: row.slotRulesJson,
            templates: [] as Array<{
              key: string;
              displayName: string | null;
              descriptionJson: unknown;
              guidanceJson: unknown;
              content: string | null;
            }>,
          };

          if (row.templateKey) {
            slot.templates.push({
              key: row.templateKey,
              displayName: row.templateDisplayName,
              descriptionJson: row.templateDescriptionJson,
              guidanceJson: row.templateGuidanceJson,
              content: row.templateContent,
            });
          }

          slots.set(row.slotKey, slot);
        }

        return [...slots.values()];
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
