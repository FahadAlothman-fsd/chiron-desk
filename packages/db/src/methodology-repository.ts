import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
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
  type VersionWorkspaceStats,
  type WorkflowSnapshot,
  type DeleteWorkUnitTypeParams,
  type ReplaceWorkUnitFactsParams,
  type ReplaceWorkUnitTransitionConditionSetsParams,
  type UpsertWorkUnitLifecycleStateParams,
  type DeleteWorkUnitLifecycleStateParams,
  type UpsertWorkUnitLifecycleTransitionParams,
  type SaveWorkUnitLifecycleTransitionBundleParams,
  type DeleteWorkUnitLifecycleTransitionParams,
  type WorkflowEditorDefinitionReadModel,
  type WorkflowFormDefinitionReadModel,
} from "@chiron/methodology-engine";
import type {
  PublicationEvidence,
  ValidationResult,
  MethodologyVersionDefinition,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import type {
  FormStepPayload,
  WorkflowContextFactDto,
  WorkflowEdgeDto,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import {
  methodologyDefinitions,
  methodologyVersions,
  methodologyVersionEvents,
  methodologyFactDefinitions,
  methodologyLinkTypeDefinitions,
  methodologyWorkUnitTypes,
  methodologyAgentTypes,
  workUnitLifecycleStates,
  workUnitLifecycleTransitions,
  transitionConditionSets,
  methodologyWorkflows,
  methodologyWorkflowSteps,
  methodologyWorkflowEdges,
  methodologyWorkflowFormFields,
  methodologyTransitionWorkflowBindings,
  workUnitFactDefinitions,
  methodologyArtifactSlotDefinitions,
  methodologyArtifactSlotTemplates,
  methodologyWorkflowContextFactArtifactReferences,
  methodologyWorkflowContextFactDefinitions,
  methodologyWorkflowContextFactDraftSpecFields,
  methodologyWorkflowContextFactDraftSpecs,
  methodologyWorkflowContextFactExternalBindings,
  methodologyWorkflowContextFactPlainValues,
  methodologyWorkflowContextFactWorkflowReferences,
} from "./schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

function extractMarkdown(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as { markdown?: unknown }).markdown === "string"
  ) {
    return (value as { markdown: string }).markdown;
  }

  return null;
}

const DEFERRED_STEP_MESSAGE = "Deferred in slice-1";

type FactValueType = "string" | "number" | "boolean" | "json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseFormFieldInput(inputJson: unknown): {
  readonly contextFactDefinitionId: string | null;
  readonly uiMultiplicityMode?: "one" | "many";
} {
  if (!isRecord(inputJson)) {
    return { contextFactDefinitionId: null };
  }

  const contextFactDefinitionId =
    typeof inputJson.contextFactDefinitionId === "string"
      ? inputJson.contextFactDefinitionId
      : null;
  const uiMultiplicityMode =
    inputJson.uiMultiplicityMode === "one" || inputJson.uiMultiplicityMode === "many"
      ? inputJson.uiMultiplicityMode
      : undefined;

  return { contextFactDefinitionId, ...(uiMultiplicityMode ? { uiMultiplicityMode } : {}) };
}

function getAudienceGuidance(
  value: unknown,
):
  | { readonly human: { readonly markdown: string }; readonly agent: { readonly markdown: string } }
  | undefined {
  if (!isRecord(value) || !isRecord(value.human) || !isRecord(value.agent)) {
    return undefined;
  }

  if (typeof value.human.markdown !== "string" || typeof value.agent.markdown !== "string") {
    return undefined;
  }

  return {
    human: { markdown: value.human.markdown },
    agent: { markdown: value.agent.markdown },
  };
}

function getFormFieldBindingReference(inputJson: unknown): string | null {
  return parseFormFieldInput(inputJson).contextFactDefinitionId;
}

function buildFactIdentifierMap(facts: readonly WorkflowContextFactDto[]) {
  const factByIdentifier = new Map<string, WorkflowContextFactDto>();

  for (const fact of facts) {
    factByIdentifier.set(fact.key, fact);
    if (typeof fact.contextFactDefinitionId === "string") {
      factByIdentifier.set(fact.contextFactDefinitionId, fact);
    }
  }

  return factByIdentifier;
}

async function inferDraftSpecWorkUnitTypeKey(
  db: DB | TransactionClient,
  includedFactDefinitionIds: readonly string[],
): Promise<string> {
  if (includedFactDefinitionIds.length === 0) {
    throw new Error(
      "Work-unit draft spec facts must include at least one work-unit fact definition",
    );
  }

  const rows = await db
    .select({ id: workUnitFactDefinitions.id, workUnitTypeKey: methodologyWorkUnitTypes.key })
    .from(workUnitFactDefinitions)
    .innerJoin(
      methodologyWorkUnitTypes,
      eq(workUnitFactDefinitions.workUnitTypeId, methodologyWorkUnitTypes.id),
    )
    .where(inArray(workUnitFactDefinitions.id, includedFactDefinitionIds));

  if (rows.length !== includedFactDefinitionIds.length) {
    throw new Error("One or more selected draft-spec fact definitions do not exist");
  }

  const uniqueWorkUnitTypeKeys = [...new Set(rows.map((row) => row.workUnitTypeKey))].filter(
    Boolean,
  );
  if (uniqueWorkUnitTypeKeys.length !== 1) {
    throw new Error(
      "Selected draft-spec fact definitions must belong to exactly one work-unit type",
    );
  }

  return uniqueWorkUnitTypeKeys[0] ?? "";
}

function getContextFactDescriptionJson(value: unknown): { readonly markdown: string } | undefined {
  if (isRecord(value) && typeof value.markdown === "string") {
    return { markdown: value.markdown };
  }

  return undefined;
}

function deriveStoredFieldValueType(fact: WorkflowContextFactDto | undefined): string {
  if (!fact) {
    return "json";
  }

  switch (fact.kind) {
    case "plain_value_fact":
      return fact.valueType;
    case "definition_backed_external_fact":
    case "bound_external_fact":
    case "workflow_reference_fact":
    case "artifact_reference_fact":
    case "work_unit_draft_spec_fact":
      return "json";
  }
}

function buildFormPayload(
  step: typeof methodologyWorkflowSteps.$inferSelect,
  fields: readonly (typeof methodologyWorkflowFormFields.$inferSelect)[],
): FormStepPayload {
  const configJson = isRecord(step.configJson) ? step.configJson : {};
  const descriptionJson =
    isRecord(configJson.descriptionJson) && typeof configJson.descriptionJson.markdown === "string"
      ? (configJson.descriptionJson as { readonly markdown: string })
      : undefined;

  return {
    key: step.key,
    ...(step.displayName ? { label: step.displayName } : {}),
    ...(descriptionJson ? { descriptionJson } : {}),
    ...(getAudienceGuidance(step.guidanceJson)
      ? { guidance: getAudienceGuidance(step.guidanceJson) }
      : {}),
    fields: fields.map((field) => {
      const binding = parseFormFieldInput(field.inputJson);
      return {
        contextFactDefinitionId: binding.contextFactDefinitionId ?? field.key,
        fieldLabel: field.label ?? field.key,
        fieldKey: field.key,
        helpText: extractMarkdown(field.descriptionJson),
        required: field.required,
        ...(binding.uiMultiplicityMode ? { uiMultiplicityMode: binding.uiMultiplicityMode } : {}),
      };
    }),
  };
}

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

async function findWorkflowRow(
  db: DB | TransactionClient,
  params: { versionId: string; workflowDefinitionId: string; workUnitTypeKey?: string },
): Promise<{
  readonly id: string;
  readonly key: string;
  readonly displayName: string | null;
  readonly descriptionJson: unknown;
  readonly metadataJson: unknown;
  readonly methodologyVersionId: string;
  readonly workUnitTypeKey: string | null;
} | null> {
  const rows = await db
    .select({
      id: methodologyWorkflows.id,
      key: methodologyWorkflows.key,
      displayName: methodologyWorkflows.displayName,
      descriptionJson: methodologyWorkflows.descriptionJson,
      metadataJson: methodologyWorkflows.metadataJson,
      methodologyVersionId: methodologyWorkflows.methodologyVersionId,
      workUnitTypeKey: methodologyWorkUnitTypes.key,
    })
    .from(methodologyWorkflows)
    .leftJoin(
      methodologyWorkUnitTypes,
      eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
    )
    .where(
      and(
        eq(methodologyWorkflows.methodologyVersionId, params.versionId),
        or(
          eq(methodologyWorkflows.id, params.workflowDefinitionId),
          eq(methodologyWorkflows.key, params.workflowDefinitionId),
        ),
      ),
    )
    .limit(1);

  const row = rows[0] ?? null;
  if (!row) {
    return null;
  }

  if (params.workUnitTypeKey && row.workUnitTypeKey !== params.workUnitTypeKey) {
    return null;
  }

  return row;
}

async function deleteContextFactSubtypeRows(
  tx: TransactionClient,
  definitionId: string,
): Promise<void> {
  const draftSpecRows = await tx
    .select({ id: methodologyWorkflowContextFactDraftSpecs.id })
    .from(methodologyWorkflowContextFactDraftSpecs)
    .where(eq(methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId, definitionId));

  if (draftSpecRows.length > 0) {
    await tx.delete(methodologyWorkflowContextFactDraftSpecFields).where(
      inArray(
        methodologyWorkflowContextFactDraftSpecFields.draftSpecId,
        draftSpecRows.map((row) => row.id),
      ),
    );
  }

  await tx
    .delete(methodologyWorkflowContextFactDraftSpecs)
    .where(eq(methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId, definitionId));
  await tx
    .delete(methodologyWorkflowContextFactPlainValues)
    .where(eq(methodologyWorkflowContextFactPlainValues.contextFactDefinitionId, definitionId));
  await tx
    .delete(methodologyWorkflowContextFactExternalBindings)
    .where(
      eq(methodologyWorkflowContextFactExternalBindings.contextFactDefinitionId, definitionId),
    );
  await tx
    .delete(methodologyWorkflowContextFactWorkflowReferences)
    .where(
      eq(methodologyWorkflowContextFactWorkflowReferences.contextFactDefinitionId, definitionId),
    );
  await tx
    .delete(methodologyWorkflowContextFactArtifactReferences)
    .where(
      eq(methodologyWorkflowContextFactArtifactReferences.contextFactDefinitionId, definitionId),
    );
}

async function insertContextFactSubtypeRow(
  tx: TransactionClient,
  definitionId: string,
  fact: WorkflowContextFactDto,
): Promise<void> {
  switch (fact.kind) {
    case "plain_value_fact":
      await tx.insert(methodologyWorkflowContextFactPlainValues).values({
        contextFactDefinitionId: definitionId,
        valueType: fact.valueType,
      });
      return;
    case "definition_backed_external_fact":
    case "bound_external_fact":
      await tx.insert(methodologyWorkflowContextFactExternalBindings).values({
        contextFactDefinitionId: definitionId,
        provider: fact.kind,
        bindingKey: fact.externalFactDefinitionId,
      });
      return;
    case "workflow_reference_fact":
      // Insert multiple rows - one for each allowed workflow
      if (fact.allowedWorkflowDefinitionIds.length > 0) {
        await tx.insert(methodologyWorkflowContextFactWorkflowReferences).values(
          fact.allowedWorkflowDefinitionIds.map((workflowId) => ({
            contextFactDefinitionId: definitionId,
            workflowDefinitionId: workflowId,
          })),
        );
      }
      return;
    case "artifact_reference_fact":
      await tx.insert(methodologyWorkflowContextFactArtifactReferences).values({
        contextFactDefinitionId: definitionId,
        artifactSlotKey: fact.artifactSlotDefinitionId,
      });
      return;
    case "work_unit_draft_spec_fact": {
      const rows = await tx
        .insert(methodologyWorkflowContextFactDraftSpecs)
        .values({ contextFactDefinitionId: definitionId })
        .returning({ id: methodologyWorkflowContextFactDraftSpecs.id });
      const draftSpecId = rows[0]?.id;
      if (!draftSpecId) {
        throw new Error(`Failed to create draft-spec payload for context fact '${fact.key}'`);
      }

      if (fact.includedFactDefinitionIds.length > 0) {
        await tx.insert(methodologyWorkflowContextFactDraftSpecFields).values(
          fact.includedFactDefinitionIds.map((workUnitFactDefinitionId) => ({
            draftSpecId,
            workUnitFactDefinitionId,
          })),
        );
      }

      return;
    }
  }
}

async function readWorkflowContextFacts(
  db: DB | TransactionClient,
  versionId: string,
  workflowDefinitionId: string,
): Promise<readonly WorkflowContextFactDto[]> {
  const workflow = await findWorkflowRow(db, { versionId, workflowDefinitionId });
  if (!workflow) {
    throw new Error(
      `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
    );
  }

  const definitionRows = await db
    .select({
      id: methodologyWorkflowContextFactDefinitions.id,
      factKey: methodologyWorkflowContextFactDefinitions.factKey,
      factKind: methodologyWorkflowContextFactDefinitions.factKind,
      label: methodologyWorkflowContextFactDefinitions.label,
      descriptionJson: methodologyWorkflowContextFactDefinitions.descriptionJson,
      cardinality: methodologyWorkflowContextFactDefinitions.cardinality,
      guidanceJson: methodologyWorkflowContextFactDefinitions.guidanceJson,
    })
    .from(methodologyWorkflowContextFactDefinitions)
    .where(eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowDefinitionId))
    .orderBy(
      asc(methodologyWorkflowContextFactDefinitions.createdAt),
      asc(methodologyWorkflowContextFactDefinitions.id),
    );

  if (definitionRows.length === 0) {
    return [];
  }

  const definitionIds = definitionRows.map((row) => row.id);
  const [
    plainValueRows,
    externalBindingRows,
    workflowReferenceRows,
    artifactReferenceRows,
    draftSpecRows,
  ] = await Promise.all([
    db
      .select()
      .from(methodologyWorkflowContextFactPlainValues)
      .where(
        inArray(methodologyWorkflowContextFactPlainValues.contextFactDefinitionId, definitionIds),
      ),
    db
      .select()
      .from(methodologyWorkflowContextFactExternalBindings)
      .where(
        inArray(
          methodologyWorkflowContextFactExternalBindings.contextFactDefinitionId,
          definitionIds,
        ),
      ),
    db
      .select()
      .from(methodologyWorkflowContextFactWorkflowReferences)
      .where(
        inArray(
          methodologyWorkflowContextFactWorkflowReferences.contextFactDefinitionId,
          definitionIds,
        ),
      ),
    db
      .select()
      .from(methodologyWorkflowContextFactArtifactReferences)
      .where(
        inArray(
          methodologyWorkflowContextFactArtifactReferences.contextFactDefinitionId,
          definitionIds,
        ),
      ),
    db
      .select()
      .from(methodologyWorkflowContextFactDraftSpecs)
      .where(
        inArray(methodologyWorkflowContextFactDraftSpecs.contextFactDefinitionId, definitionIds),
      ),
  ]);

  const draftSpecIds = draftSpecRows.map((row) => row.id);
  const draftSpecFieldRows =
    draftSpecIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowContextFactDraftSpecFields)
          .where(inArray(methodologyWorkflowContextFactDraftSpecFields.draftSpecId, draftSpecIds))
          .orderBy(
            asc(methodologyWorkflowContextFactDraftSpecFields.draftSpecId),
            asc(methodologyWorkflowContextFactDraftSpecFields.workUnitFactDefinitionId),
          );

  const plainByDefinitionId = new Map(
    plainValueRows.map((row) => [row.contextFactDefinitionId, row]),
  );
  const externalByDefinitionId = new Map(
    externalBindingRows.map((row) => [row.contextFactDefinitionId, row]),
  );
  const artifactReferenceByDefinitionId = new Map(
    artifactReferenceRows.map((row) => [row.contextFactDefinitionId, row]),
  );
  const draftSpecByDefinitionId = new Map(
    draftSpecRows.map((row) => [row.contextFactDefinitionId, row]),
  );
  const draftFieldsByDraftSpecId = new Map<string, typeof draftSpecFieldRows>();
  for (const row of draftSpecFieldRows) {
    const entries = draftFieldsByDraftSpecId.get(row.draftSpecId) ?? [];
    entries.push(row);
    draftFieldsByDraftSpecId.set(row.draftSpecId, entries);
  }

  return definitionRows.map((definition): WorkflowContextFactDto => {
    const metadata = {
      contextFactDefinitionId: definition.id,
      ...(typeof definition.label === "string" ? { label: definition.label } : {}),
      ...(getContextFactDescriptionJson(definition.descriptionJson)
        ? { descriptionJson: getContextFactDescriptionJson(definition.descriptionJson) }
        : {}),
      ...(getAudienceGuidance(definition.guidanceJson)
        ? { guidance: getAudienceGuidance(definition.guidanceJson) }
        : {}),
    };

    switch (definition.factKind) {
      case "plain_value_fact": {
        const row = plainByDefinitionId.get(definition.id);
        if (!row) {
          throw new Error(`Missing plain_value_fact payload for '${definition.factKey}'`);
        }

        return {
          kind: "plain_value_fact",
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          valueType: row.valueType as FactValueType,
        };
      }
      case "definition_backed_external_fact":
      case "bound_external_fact": {
        const row = externalByDefinitionId.get(definition.id);
        if (!row) {
          throw new Error(`Missing external fact payload for '${definition.factKey}'`);
        }

        return {
          kind: definition.factKind,
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          externalFactDefinitionId: row.bindingKey,
        };
      }
      case "workflow_reference_fact": {
        const rows = workflowReferenceRows.filter(
          (row) => row.contextFactDefinitionId === definition.id,
        );
        if (rows.length === 0) {
          throw new Error(`Missing workflow reference payload for '${definition.factKey}'`);
        }

        const allowedWorkflowDefinitionIds = rows.map((row) => row.workflowDefinitionId);

        return {
          kind: "workflow_reference_fact",
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          allowedWorkflowDefinitionIds,
        };
      }
      case "artifact_reference_fact": {
        const row = artifactReferenceByDefinitionId.get(definition.id);
        if (!row) {
          throw new Error(`Missing artifact reference payload for '${definition.factKey}'`);
        }

        return {
          kind: "artifact_reference_fact",
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          artifactSlotDefinitionId: row.artifactSlotKey,
        };
      }
      case "work_unit_draft_spec_fact": {
        const row = draftSpecByDefinitionId.get(definition.id);
        if (!row) {
          throw new Error(`Missing draft spec payload for '${definition.factKey}'`);
        }

        return {
          kind: "work_unit_draft_spec_fact",
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          includedFactDefinitionIds: (draftFieldsByDraftSpecId.get(row.id) ?? []).map(
            (field) => field.workUnitFactDefinitionId,
          ),
        };
      }
      default:
        throw new Error(`Unsupported context fact kind '${definition.factKind}'`);
    }
  });
}

async function readWorkflowFormDefinitions(
  db: DB | TransactionClient,
  workflowDefinitionId: string,
): Promise<readonly WorkflowFormDefinitionReadModel[]> {
  const stepRows = await db
    .select()
    .from(methodologyWorkflowSteps)
    .where(
      and(
        eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
        eq(methodologyWorkflowSteps.type, "form"),
      ),
    )
    .orderBy(asc(methodologyWorkflowSteps.createdAt), asc(methodologyWorkflowSteps.id));

  if (stepRows.length === 0) {
    return [];
  }

  const fieldRows = await db
    .select()
    .from(methodologyWorkflowFormFields)
    .where(
      inArray(
        methodologyWorkflowFormFields.formStepId,
        stepRows.map((row) => row.id),
      ),
    )
    .orderBy(
      asc(methodologyWorkflowFormFields.formStepId),
      asc(methodologyWorkflowFormFields.sortOrder),
    );

  const fieldsByStepId = new Map<string, typeof fieldRows>();
  for (const row of fieldRows) {
    const entries = fieldsByStepId.get(row.formStepId) ?? [];
    entries.push(row);
    fieldsByStepId.set(row.formStepId, entries);
  }

  return stepRows.map((step) => ({
    stepId: step.id,
    payload: buildFormPayload(step, fieldsByStepId.get(step.id) ?? []),
  }));
}

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
              key: v.key,
              name: v.name ?? null,
              valueType: v.factType,
              cardinality: v.cardinality ?? "one",
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
                cardinality: v.cardinality ?? "one",
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
              workUnitTypeKey: methodologyWorkUnitTypes.key,
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
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(workUnitLifecycleTransitions.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .innerJoin(
              methodologyWorkflows,
              eq(methodologyTransitionWorkflowBindings.workflowId, methodologyWorkflows.id),
            )
            .where(eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId))
            .orderBy(
              asc(methodologyWorkUnitTypes.key),
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

        const transitionWorkflowBindings: Record<string, Record<string, string[]>> = {};
        const guidanceByWorkUnitType: Record<string, unknown> = {};
        const guidanceByAgentType: Record<string, unknown> = {};
        const guidanceByTransition: Record<string, unknown> = {};
        const guidanceByWorkflow: Record<string, unknown> = {};
        for (const bindingRow of bindingRows) {
          const workUnitTypeKey = bindingRow.workUnitTypeKey;
          let workUnitBindings = transitionWorkflowBindings[workUnitTypeKey];
          if (!workUnitBindings) {
            workUnitBindings = {};
            transitionWorkflowBindings[workUnitTypeKey] = workUnitBindings;
          }
          const current = workUnitBindings[bindingRow.transitionKey] ?? [];
          current.push(bindingRow.workflowKey);
          workUnitBindings[bindingRow.transitionKey] = current;
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

    findVersionWorkspaceStats: (versionId: string) =>
      dbEffect("methodology.findVersionWorkspaceStats", async () => {
        const rows = await db
          .select({
            workUnitTypes:
              sql<number>`(select count(*) from ${methodologyWorkUnitTypes} where ${methodologyWorkUnitTypes.methodologyVersionId} = ${versionId})`.as(
                "workUnitTypes",
              ),
            states:
              sql<number>`(select count(*) from ${workUnitLifecycleStates} where ${workUnitLifecycleStates.methodologyVersionId} = ${versionId})`.as(
                "states",
              ),
            transitions:
              sql<number>`(select count(*) from ${workUnitLifecycleTransitions} where ${workUnitLifecycleTransitions.methodologyVersionId} = ${versionId})`.as(
                "transitions",
              ),
            workflows:
              sql<number>`(select count(*) from ${methodologyWorkflows} where ${methodologyWorkflows.methodologyVersionId} = ${versionId})`.as(
                "workflows",
              ),
            factDefinitions:
              sql<number>`(select count(*) from ${methodologyFactDefinitions} where ${methodologyFactDefinitions.methodologyVersionId} = ${versionId})`.as(
                "factDefinitions",
              ),
          })
          .from(methodologyVersions)
          .where(eq(methodologyVersions.id, versionId))
          .limit(1);

        const row = rows[0];

        return {
          workUnitTypes: row?.workUnitTypes ?? 0,
          states: row?.states ?? 0,
          transitions: row?.transitions ?? 0,
          workflows: row?.workflows ?? 0,
          factDefinitions: row?.factDefinitions ?? 0,
        } satisfies VersionWorkspaceStats;
      }),

    listWorkflowsByWorkUnitType: ({ versionId, workUnitTypeKey }) =>
      dbEffect("methodology.listWorkflowsByWorkUnitType", async () => {
        const workflowRows = await db
          .select({
            id: methodologyWorkflows.id,
            key: methodologyWorkflows.key,
            displayName: methodologyWorkflows.displayName,
            descriptionJson: methodologyWorkflows.descriptionJson,
            workUnitTypeKey: methodologyWorkUnitTypes.key,
            metadataJson: methodologyWorkflows.metadataJson,
            guidanceJson: methodologyWorkflows.guidanceJson,
          })
          .from(methodologyWorkflows)
          .innerJoin(
            methodologyWorkUnitTypes,
            eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
          )
          .where(
            and(
              eq(methodologyWorkflows.methodologyVersionId, versionId),
              eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
            ),
          )
          .orderBy(asc(methodologyWorkflows.key));

        if (workflowRows.length === 0) {
          return [] as const;
        }

        const workflowIdSet = new Set(workflowRows.map((row) => row.id));

        const stepRows = await db
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
          .orderBy(asc(methodologyWorkflowSteps.workflowId), asc(methodologyWorkflowSteps.key));

        const edgeRows = await db
          .select({
            workflowId: methodologyWorkflowEdges.workflowId,
            fromStepId: methodologyWorkflowEdges.fromStepId,
            toStepId: methodologyWorkflowEdges.toStepId,
            edgeKey: methodologyWorkflowEdges.edgeKey,
            conditionJson: methodologyWorkflowEdges.conditionJson,
          })
          .from(methodologyWorkflowEdges)
          .where(eq(methodologyWorkflowEdges.methodologyVersionId, versionId))
          .orderBy(asc(methodologyWorkflowEdges.workflowId), asc(methodologyWorkflowEdges.id));

        const stepsByWorkflowId = new Map<string, typeof stepRows>();
        const stepKeyById = new Map<string, string>();
        for (const stepRow of stepRows) {
          if (!workflowIdSet.has(stepRow.workflowId)) {
            continue;
          }
          const steps = stepsByWorkflowId.get(stepRow.workflowId) ?? [];
          steps.push(stepRow);
          stepsByWorkflowId.set(stepRow.workflowId, steps);
          stepKeyById.set(stepRow.id, stepRow.key);
        }

        const edgesByWorkflowId = new Map<string, typeof edgeRows>();
        for (const edgeRow of edgeRows) {
          if (!workflowIdSet.has(edgeRow.workflowId)) {
            continue;
          }
          const edges = edgesByWorkflowId.get(edgeRow.workflowId) ?? [];
          edges.push(edgeRow);
          edgesByWorkflowId.set(edgeRow.workflowId, edges);
        }

        return workflowRows.map((workflowRow) => ({
          workflowDefinitionId: workflowRow.id,
          key: workflowRow.key,
          ...(workflowRow.displayName ? { displayName: workflowRow.displayName } : {}),
          ...(workflowRow.descriptionJson
            ? { description: workflowRow.descriptionJson as WorkflowDefinition["description"] }
            : {}),
          workUnitTypeKey: workflowRow.workUnitTypeKey,
          ...(workflowRow.metadataJson
            ? { metadata: workflowRow.metadataJson as WorkflowDefinition["metadata"] }
            : {}),
          ...(workflowRow.guidanceJson
            ? { guidance: workflowRow.guidanceJson as WorkflowDefinition["guidance"] }
            : {}),
          steps: (stepsByWorkflowId.get(workflowRow.id) ?? []).map((stepRow) => ({
            key: stepRow.key,
            type: asWorkflowStepType(stepRow.type),
            ...(stepRow.displayName ? { displayName: stepRow.displayName } : {}),
            ...(stepRow.configJson ? { config: stepRow.configJson } : {}),
            ...(stepRow.guidanceJson
              ? {
                  guidance: stepRow.guidanceJson as WorkflowDefinition["steps"][number]["guidance"],
                }
              : {}),
          })),
          edges: (edgesByWorkflowId.get(workflowRow.id) ?? []).map((edgeRow) => ({
            fromStepKey: edgeRow.fromStepId ? (stepKeyById.get(edgeRow.fromStepId) ?? null) : null,
            toStepKey: edgeRow.toStepId ? (stepKeyById.get(edgeRow.toStepId) ?? null) : null,
            ...(edgeRow.edgeKey ? { edgeKey: edgeRow.edgeKey } : {}),
            ...(edgeRow.conditionJson ? { condition: edgeRow.conditionJson } : {}),
          })),
        }));
      }),

    createWorkflow: ({ versionId, workUnitTypeKey, workflow }) =>
      dbEffect("methodology.createWorkflow", () =>
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

          const workflowRows = await tx
            .insert(methodologyWorkflows)
            .values({
              methodologyVersionId: versionId,
              workUnitTypeId,
              key: workflow.key,
              displayName: workflow.displayName ?? null,
              metadataJson: workflow.metadata ?? null,
              guidanceJson: workflow.guidance ?? null,
            })
            .returning({ id: methodologyWorkflows.id });
          const workflowId = workflowRows[0]?.id;
          if (!workflowId) {
            return;
          }

          const stepIdByKey = new Map<string, string>();
          for (const step of workflow.steps) {
            const stepRows = await tx
              .insert(methodologyWorkflowSteps)
              .values({
                methodologyVersionId: versionId,
                workflowId,
                key: step.key,
                type: step.type,
                displayName: step.displayName ?? null,
                configJson: step.config ?? null,
                guidanceJson: step.guidance ?? null,
              })
              .returning({ id: methodologyWorkflowSteps.id });
            const stepId = stepRows[0]?.id;
            if (stepId) {
              stepIdByKey.set(step.key, stepId);
            }
          }

          for (const edge of workflow.edges) {
            const fromStepId =
              edge.fromStepKey === null ? null : (stepIdByKey.get(edge.fromStepKey) ?? null);
            const toStepId =
              edge.toStepKey === null ? null : (stepIdByKey.get(edge.toStepKey) ?? null);

            await tx.insert(methodologyWorkflowEdges).values({
              methodologyVersionId: versionId,
              workflowId,
              fromStepId,
              toStepId,
              edgeKey: edge.edgeKey ?? null,
              conditionJson: edge.condition ?? null,
              guidanceJson: null,
            });
          }
        }),
      ),

    updateWorkflow: ({ versionId, workUnitTypeKey, workflowKey, workflow }) =>
      dbEffect("methodology.updateWorkflow", () =>
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

          const existingRows = await tx
            .select({ id: methodologyWorkflows.id })
            .from(methodologyWorkflows)
            .where(
              and(
                eq(methodologyWorkflows.methodologyVersionId, versionId),
                eq(methodologyWorkflows.workUnitTypeId, workUnitTypeId),
                eq(methodologyWorkflows.key, workflowKey),
              ),
            )
            .limit(1);
          const existingId = existingRows[0]?.id;
          if (!existingId) {
            return;
          }

          await tx
            .update(methodologyWorkflows)
            .set({
              key: workflow.key,
              displayName: workflow.displayName ?? null,
              metadataJson: workflow.metadata ?? null,
              guidanceJson: workflow.guidance ?? null,
              workUnitTypeId,
            })
            .where(eq(methodologyWorkflows.id, existingId));

          await tx
            .delete(methodologyWorkflowEdges)
            .where(eq(methodologyWorkflowEdges.workflowId, existingId));
          await tx
            .delete(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.workflowId, existingId));

          const stepIdByKey = new Map<string, string>();
          for (const step of workflow.steps) {
            const stepRows = await tx
              .insert(methodologyWorkflowSteps)
              .values({
                methodologyVersionId: versionId,
                workflowId: existingId,
                key: step.key,
                type: step.type,
                displayName: step.displayName ?? null,
                configJson: step.config ?? null,
                guidanceJson: step.guidance ?? null,
              })
              .returning({ id: methodologyWorkflowSteps.id });
            const stepId = stepRows[0]?.id;
            if (stepId) {
              stepIdByKey.set(step.key, stepId);
            }
          }

          for (const edge of workflow.edges) {
            const fromStepId =
              edge.fromStepKey === null ? null : (stepIdByKey.get(edge.fromStepKey) ?? null);
            const toStepId =
              edge.toStepKey === null ? null : (stepIdByKey.get(edge.toStepKey) ?? null);

            await tx.insert(methodologyWorkflowEdges).values({
              methodologyVersionId: versionId,
              workflowId: existingId,
              fromStepId,
              toStepId,
              edgeKey: edge.edgeKey ?? null,
              conditionJson: edge.condition ?? null,
              guidanceJson: null,
            });
          }
        }),
      ),

    deleteWorkflow: ({ versionId, workUnitTypeKey, workflowKey }) =>
      dbEffect("methodology.deleteWorkflow", () =>
        db.transaction(async (tx) => {
          const rows = await tx
            .select({ id: methodologyWorkflows.id })
            .from(methodologyWorkflows)
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(
              and(
                eq(methodologyWorkflows.methodologyVersionId, versionId),
                eq(methodologyWorkflows.key, workflowKey),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const workflowId = rows[0]?.id;
          if (!workflowId) {
            return false;
          }

          await tx.delete(methodologyWorkflows).where(eq(methodologyWorkflows.id, workflowId));
          return true;
        }),
      ),

    replaceTransitionWorkflowBindings: ({
      versionId,
      workUnitTypeKey,
      transitionKey,
      workflowKeys,
    }) =>
      dbEffect("methodology.replaceTransitionWorkflowBindings", () =>
        db.transaction(async (tx) => {
          const transitionRows = await tx
            .select({ id: workUnitLifecycleTransitions.id })
            .from(workUnitLifecycleTransitions)
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(workUnitLifecycleTransitions.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(
              and(
                eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                eq(workUnitLifecycleTransitions.transitionKey, transitionKey),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const transitionId = transitionRows[0]?.id;
          if (!transitionId) {
            return;
          }

          await tx
            .delete(methodologyTransitionWorkflowBindings)
            .where(
              and(
                eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId),
                eq(methodologyTransitionWorkflowBindings.transitionId, transitionId),
              ),
            );

          const uniqueWorkflowKeys = [...new Set(workflowKeys)].filter((key) => key.length > 0);
          if (uniqueWorkflowKeys.length === 0) {
            return;
          }

          const workflowRows = await tx
            .select({ id: methodologyWorkflows.id, key: methodologyWorkflows.key })
            .from(methodologyWorkflows)
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(
              and(
                eq(methodologyWorkflows.methodologyVersionId, versionId),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            );

          const workflowIdByKey = new Map(workflowRows.map((row) => [row.key, row.id]));

          for (const workflowKey of uniqueWorkflowKeys) {
            const workflowId = workflowIdByKey.get(workflowKey);
            if (!workflowId) {
              continue;
            }

            await tx.insert(methodologyTransitionWorkflowBindings).values({
              methodologyVersionId: versionId,
              transitionId,
              workflowId,
            });
          }
        }),
      ),

    deleteWorkUnitType: ({ versionId, workUnitTypeKey }: DeleteWorkUnitTypeParams) =>
      dbEffect("methodology.deleteWorkUnitType", () =>
        db.transaction(async (tx) => {
          const rows = await tx
            .select({ id: methodologyWorkUnitTypes.id })
            .from(methodologyWorkUnitTypes)
            .where(
              and(
                eq(methodologyWorkUnitTypes.methodologyVersionId, versionId),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const workUnitTypeId = rows[0]?.id;
          if (!workUnitTypeId) {
            return false;
          }

          await tx
            .delete(methodologyWorkUnitTypes)
            .where(eq(methodologyWorkUnitTypes.id, workUnitTypeId));
          return true;
        }),
      ),

    replaceWorkUnitFacts: ({ versionId, workUnitTypeKey, facts }: ReplaceWorkUnitFactsParams) =>
      dbEffect("methodology.replaceWorkUnitFacts", () =>
        db.transaction(async (tx) => {
          const rows = await tx
            .select({ id: methodologyWorkUnitTypes.id })
            .from(methodologyWorkUnitTypes)
            .where(
              and(
                eq(methodologyWorkUnitTypes.methodologyVersionId, versionId),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const workUnitTypeId = rows[0]?.id;
          if (!workUnitTypeId) {
            return false;
          }

          await tx
            .delete(workUnitFactDefinitions)
            .where(
              and(
                eq(workUnitFactDefinitions.methodologyVersionId, versionId),
                eq(workUnitFactDefinitions.workUnitTypeId, workUnitTypeId),
              ),
            );

          if (facts.length > 0) {
            await tx.insert(workUnitFactDefinitions).values(
              facts.map((fact) => ({
                methodologyVersionId: versionId,
                workUnitTypeId,
                key: fact.key,
                name: fact.name ?? null,
                factType: fact.factType,
                cardinality: fact.cardinality ?? "one",
                descriptionJson: fact.description ?? null,
                defaultValueJson: fact.defaultValue ?? null,
                guidanceJson: fact.guidance ?? null,
                validationJson: fact.validation ?? null,
              })),
            );
          }

          return true;
        }),
      ),

    upsertWorkUnitLifecycleState: ({
      versionId,
      workUnitTypeKey,
      state,
    }: UpsertWorkUnitLifecycleStateParams) =>
      dbEffect("methodology.upsertWorkUnitLifecycleState", () =>
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
            return false;
          }

          const stateRows = await tx
            .select({ id: workUnitLifecycleStates.id })
            .from(workUnitLifecycleStates)
            .where(
              and(
                eq(workUnitLifecycleStates.methodologyVersionId, versionId),
                eq(workUnitLifecycleStates.workUnitTypeId, workUnitTypeId),
                eq(workUnitLifecycleStates.key, state.key),
              ),
            )
            .limit(1);

          const existingStateId = stateRows[0]?.id;

          if (existingStateId) {
            await tx
              .update(workUnitLifecycleStates)
              .set({
                displayName: state.displayName ?? null,
                descriptionJson: state.description ?? null,
                guidanceJson: state.guidance ?? null,
              })
              .where(eq(workUnitLifecycleStates.id, existingStateId));

            return true;
          }

          await tx.insert(workUnitLifecycleStates).values({
            methodologyVersionId: versionId,
            workUnitTypeId,
            key: state.key,
            displayName: state.displayName ?? null,
            descriptionJson: state.description ?? null,
            guidanceJson: state.guidance ?? null,
          });

          return true;
        }),
      ),

    deleteWorkUnitLifecycleState: ({
      versionId,
      workUnitTypeKey,
      stateKey,
      strategy,
    }: DeleteWorkUnitLifecycleStateParams) =>
      dbEffect("methodology.deleteWorkUnitLifecycleState", () =>
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
            return false;
          }

          const stateRows = await tx
            .select({ id: workUnitLifecycleStates.id })
            .from(workUnitLifecycleStates)
            .where(
              and(
                eq(workUnitLifecycleStates.methodologyVersionId, versionId),
                eq(workUnitLifecycleStates.workUnitTypeId, workUnitTypeId),
                eq(workUnitLifecycleStates.key, stateKey),
              ),
            )
            .limit(1);
          const stateId = stateRows[0]?.id;
          if (!stateId) {
            return false;
          }

          if (strategy === "cleanup") {
            await tx
              .delete(workUnitLifecycleTransitions)
              .where(
                and(
                  eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                  eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                  sql`${workUnitLifecycleTransitions.fromStateId} = ${stateId} OR ${workUnitLifecycleTransitions.toStateId} = ${stateId}`,
                ),
              );
          } else {
            await tx
              .delete(workUnitLifecycleTransitions)
              .where(
                and(
                  eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                  eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                  eq(workUnitLifecycleTransitions.toStateId, stateId),
                ),
              );

            await tx
              .update(workUnitLifecycleTransitions)
              .set({ fromStateId: null })
              .where(
                and(
                  eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                  eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                  eq(workUnitLifecycleTransitions.fromStateId, stateId),
                ),
              );
          }

          await tx.delete(workUnitLifecycleStates).where(eq(workUnitLifecycleStates.id, stateId));

          return true;
        }),
      ),

    upsertWorkUnitLifecycleTransition: ({
      versionId,
      workUnitTypeKey,
      transition,
    }: UpsertWorkUnitLifecycleTransitionParams) =>
      dbEffect("methodology.upsertWorkUnitLifecycleTransition", () =>
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
            return false;
          }

          const stateRows = await tx
            .select({ id: workUnitLifecycleStates.id, key: workUnitLifecycleStates.key })
            .from(workUnitLifecycleStates)
            .where(
              and(
                eq(workUnitLifecycleStates.methodologyVersionId, versionId),
                eq(workUnitLifecycleStates.workUnitTypeId, workUnitTypeId),
              ),
            );
          const stateIdByKey = new Map(stateRows.map((stateRow) => [stateRow.key, stateRow.id]));

          const toStateId = stateIdByKey.get(transition.toState);
          if (!toStateId) {
            return false;
          }

          const fromStateId = transition.fromState
            ? (stateIdByKey.get(transition.fromState) ?? null)
            : null;

          const transitionRows = await tx
            .select({ id: workUnitLifecycleTransitions.id })
            .from(workUnitLifecycleTransitions)
            .where(
              and(
                eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                eq(workUnitLifecycleTransitions.transitionKey, transition.transitionKey),
              ),
            )
            .limit(1);

          let transitionId = transitionRows[0]?.id;
          if (transitionId) {
            await tx
              .update(workUnitLifecycleTransitions)
              .set({
                fromStateId,
                toStateId,
                guidanceJson: null,
              })
              .where(eq(workUnitLifecycleTransitions.id, transitionId));
          } else {
            const insertedRows = await tx
              .insert(workUnitLifecycleTransitions)
              .values({
                methodologyVersionId: versionId,
                workUnitTypeId,
                transitionKey: transition.transitionKey,
                fromStateId,
                toStateId,
                guidanceJson: null,
              })
              .returning({ id: workUnitLifecycleTransitions.id });

            transitionId = insertedRows[0]?.id;
          }

          return !!transitionId;
        }),
      ),

    saveWorkUnitLifecycleTransitionBundle: ({
      versionId,
      workUnitTypeKey,
      transition,
      conditionSets,
      workflowKeys,
    }: SaveWorkUnitLifecycleTransitionBundleParams) =>
      dbEffect("methodology.saveWorkUnitLifecycleTransitionBundle", () =>
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
            return false;
          }

          const stateRows = await tx
            .select({ id: workUnitLifecycleStates.id, key: workUnitLifecycleStates.key })
            .from(workUnitLifecycleStates)
            .where(
              and(
                eq(workUnitLifecycleStates.methodologyVersionId, versionId),
                eq(workUnitLifecycleStates.workUnitTypeId, workUnitTypeId),
              ),
            );
          const stateIdByKey = new Map(stateRows.map((stateRow) => [stateRow.key, stateRow.id]));

          const toStateId = stateIdByKey.get(transition.toState);
          if (!toStateId) {
            return false;
          }

          const fromStateId = transition.fromState
            ? (stateIdByKey.get(transition.fromState) ?? null)
            : null;

          const transitionRows = await tx
            .select({ id: workUnitLifecycleTransitions.id })
            .from(workUnitLifecycleTransitions)
            .where(
              and(
                eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                eq(workUnitLifecycleTransitions.transitionKey, transition.transitionKey),
              ),
            )
            .limit(1);

          let transitionId = transitionRows[0]?.id;
          if (transitionId) {
            await tx
              .update(workUnitLifecycleTransitions)
              .set({
                fromStateId,
                toStateId,
                guidanceJson: null,
              })
              .where(eq(workUnitLifecycleTransitions.id, transitionId));
          } else {
            const insertedRows = await tx
              .insert(workUnitLifecycleTransitions)
              .values({
                methodologyVersionId: versionId,
                workUnitTypeId,
                transitionKey: transition.transitionKey,
                fromStateId,
                toStateId,
                guidanceJson: null,
              })
              .returning({ id: workUnitLifecycleTransitions.id });

            transitionId = insertedRows[0]?.id;
          }

          if (!transitionId) {
            return false;
          }

          await tx
            .delete(transitionConditionSets)
            .where(
              and(
                eq(transitionConditionSets.methodologyVersionId, versionId),
                eq(transitionConditionSets.transitionId, transitionId),
              ),
            );

          if (conditionSets.length > 0) {
            await tx.insert(transitionConditionSets).values(
              conditionSets.map((conditionSet) => ({
                methodologyVersionId: versionId,
                transitionId,
                key: conditionSet.key,
                phase: conditionSet.phase,
                mode: conditionSet.mode,
                groupsJson: conditionSet.groups,
              })),
            );
          }

          await tx
            .delete(methodologyTransitionWorkflowBindings)
            .where(
              and(
                eq(methodologyTransitionWorkflowBindings.methodologyVersionId, versionId),
                eq(methodologyTransitionWorkflowBindings.transitionId, transitionId),
              ),
            );

          const uniqueWorkflowKeys = [...new Set(workflowKeys)].filter((key) => key.length > 0);
          if (uniqueWorkflowKeys.length === 0) {
            return true;
          }

          const workflowRows = await tx
            .select({ id: methodologyWorkflows.id, key: methodologyWorkflows.key })
            .from(methodologyWorkflows)
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(methodologyWorkflows.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(
              and(
                eq(methodologyWorkflows.methodologyVersionId, versionId),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            );

          const workflowIdByKey = new Map(workflowRows.map((row) => [row.key, row.id]));

          for (const workflowKey of uniqueWorkflowKeys) {
            const workflowId = workflowIdByKey.get(workflowKey);
            if (!workflowId) {
              continue;
            }

            await tx.insert(methodologyTransitionWorkflowBindings).values({
              methodologyVersionId: versionId,
              transitionId,
              workflowId,
            });
          }

          return true;
        }),
      ),

    deleteWorkUnitLifecycleTransition: ({
      versionId,
      workUnitTypeKey,
      transitionKey,
    }: DeleteWorkUnitLifecycleTransitionParams) =>
      dbEffect("methodology.deleteWorkUnitLifecycleTransition", () =>
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
            return false;
          }

          const deletedRows = await tx
            .delete(workUnitLifecycleTransitions)
            .where(
              and(
                eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                eq(workUnitLifecycleTransitions.workUnitTypeId, workUnitTypeId),
                eq(workUnitLifecycleTransitions.transitionKey, transitionKey),
              ),
            )
            .returning({ id: workUnitLifecycleTransitions.id });

          return deletedRows.length > 0;
        }),
      ),

    replaceWorkUnitTransitionConditionSets: ({
      versionId,
      workUnitTypeKey,
      transitionKey,
      conditionSets,
    }: ReplaceWorkUnitTransitionConditionSetsParams) =>
      dbEffect("methodology.replaceWorkUnitTransitionConditionSets", () =>
        db.transaction(async (tx) => {
          const transitionRows = await tx
            .select({ id: workUnitLifecycleTransitions.id })
            .from(workUnitLifecycleTransitions)
            .innerJoin(
              methodologyWorkUnitTypes,
              eq(workUnitLifecycleTransitions.workUnitTypeId, methodologyWorkUnitTypes.id),
            )
            .where(
              and(
                eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
                eq(workUnitLifecycleTransitions.transitionKey, transitionKey),
                eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
              ),
            )
            .limit(1);
          const transitionId = transitionRows[0]?.id;
          if (!transitionId) {
            return false;
          }

          await tx
            .delete(transitionConditionSets)
            .where(
              and(
                eq(transitionConditionSets.methodologyVersionId, versionId),
                eq(transitionConditionSets.transitionId, transitionId),
              ),
            );

          if (conditionSets.length > 0) {
            await tx.insert(transitionConditionSets).values(
              conditionSets.map((conditionSet) => ({
                methodologyVersionId: versionId,
                transitionId,
                key: conditionSet.key,
                phase: conditionSet.phase,
                mode: conditionSet.mode,
                groupsJson: conditionSet.groups,
              })),
            );
          }

          return true;
        }),
      ),

    findFactSchemasByVersionId: (versionId: string) =>
      dbEffect("methodology.findFactSchemasByVersionId", async () => {
        const rows = await db
          .select({
            id: workUnitFactDefinitions.id,
            name: workUnitFactDefinitions.name,
            key: workUnitFactDefinitions.key,
            factType: workUnitFactDefinitions.factType,
            descriptionJson: workUnitFactDefinitions.descriptionJson,
            defaultValueJson: workUnitFactDefinitions.defaultValueJson,
            guidanceJson: workUnitFactDefinitions.guidanceJson,
            validationJson: workUnitFactDefinitions.validationJson,
          })
          .from(workUnitFactDefinitions)
          .where(eq(workUnitFactDefinitions.methodologyVersionId, versionId))
          .orderBy(asc(workUnitFactDefinitions.key));

        return rows.map((row) => ({
          id: row.id,
          name: row.name,
          key: row.key,
          factType: row.factType,
          description: extractMarkdown(row.descriptionJson),
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
            cardinality: methodologyFactDefinitions.cardinality,
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

          // Get existing slots with their ids for id-first matching
          const existingSlots = await tx
            .select({
              id: methodologyArtifactSlotDefinitions.id,
              key: methodologyArtifactSlotDefinitions.key,
            })
            .from(methodologyArtifactSlotDefinitions)
            .where(
              and(
                eq(methodologyArtifactSlotDefinitions.methodologyVersionId, versionId),
                eq(methodologyArtifactSlotDefinitions.workUnitTypeId, workUnitTypeId),
              ),
            );

          const existingSlotMap = new Map(existingSlots.map((s) => [s.id, s]));
          const processedSlotIds = new Set<string>();

          for (const slot of slots) {
            let slotDefinitionId: string;

            const existingSlot = existingSlotMap.get(slot.id);
            if (!existingSlot) {
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
              const insertedSlotId = insertedSlotRows[0]?.id;
              if (!insertedSlotId) {
                throw new Error("Failed to insert artifact slot definition");
              }
              slotDefinitionId = insertedSlotId;
            } else {
              await tx
                .update(methodologyArtifactSlotDefinitions)
                .set({
                  key: slot.key,
                  displayName: slot.displayName,
                  descriptionJson: slot.descriptionJson,
                  guidanceJson: slot.guidanceJson,
                  cardinality: slot.cardinality,
                  rulesJson: slot.rulesJson,
                  updatedAt: new Date(),
                })
                .where(eq(methodologyArtifactSlotDefinitions.id, slot.id));
              slotDefinitionId = slot.id;
              processedSlotIds.add(slot.id);
            }

            if (!slotDefinitionId) {
              continue;
            }

            // Handle templates with id-first logic
            if (slot.templates.length > 0) {
              const existingTemplates = await tx
                .select({
                  id: methodologyArtifactSlotTemplates.id,
                  key: methodologyArtifactSlotTemplates.key,
                })
                .from(methodologyArtifactSlotTemplates)
                .where(eq(methodologyArtifactSlotTemplates.slotDefinitionId, slotDefinitionId));

              const existingTemplateMap = new Map(existingTemplates.map((t) => [t.id, t]));
              const processedTemplateIds = new Set<string>();

              for (const template of slot.templates) {
                const existingTemplate = existingTemplateMap.get(template.id);
                if (!existingTemplate) {
                  await tx.insert(methodologyArtifactSlotTemplates).values({
                    methodologyVersionId: versionId,
                    slotDefinitionId,
                    key: template.key,
                    displayName: template.displayName,
                    descriptionJson: template.descriptionJson,
                    guidanceJson: template.guidanceJson,
                    content: template.content,
                  });
                } else {
                  await tx
                    .update(methodologyArtifactSlotTemplates)
                    .set({
                      key: template.key,
                      displayName: template.displayName,
                      descriptionJson: template.descriptionJson,
                      guidanceJson: template.guidanceJson,
                      content: template.content,
                      updatedAt: new Date(),
                    })
                    .where(eq(methodologyArtifactSlotTemplates.id, template.id));
                  processedTemplateIds.add(template.id);
                }
              }

              // Delete templates that weren't in the incoming list
              const templatesToDelete = existingTemplates.filter(
                (t) => !processedTemplateIds.has(t.id),
              );
              for (const template of templatesToDelete) {
                await tx
                  .delete(methodologyArtifactSlotTemplates)
                  .where(eq(methodologyArtifactSlotTemplates.id, template.id));
              }
            } else {
              // No templates in incoming slot - delete all existing templates
              await tx
                .delete(methodologyArtifactSlotTemplates)
                .where(eq(methodologyArtifactSlotTemplates.slotDefinitionId, slotDefinitionId));
            }
          }

          // Delete slots that weren't in the incoming list
          const slotsToDelete = existingSlots.filter((s) => !processedSlotIds.has(s.id));
          for (const slot of slotsToDelete) {
            await tx
              .delete(methodologyArtifactSlotTemplates)
              .where(eq(methodologyArtifactSlotTemplates.slotDefinitionId, slot.id));
            await tx
              .delete(methodologyArtifactSlotDefinitions)
              .where(eq(methodologyArtifactSlotDefinitions.id, slot.id));
          }
        }),
      ),

    findArtifactSlotsByWorkUnitType: ({ versionId, workUnitTypeKey }) =>
      dbEffect("methodology.findArtifactSlotsByWorkUnitType", async () => {
        const workUnitTypeRows = await db
          .select({ id: methodologyWorkUnitTypes.id })
          .from(methodologyWorkUnitTypes)
          .where(
            and(
              eq(methodologyWorkUnitTypes.methodologyVersionId, versionId),
              eq(methodologyWorkUnitTypes.key, workUnitTypeKey),
            ),
          )
          .limit(1);

        const workUnitTypeId = workUnitTypeRows[0]?.id;
        if (!workUnitTypeId) {
          return [];
        }

        const rows = await db
          .select({
            slotId: methodologyArtifactSlotDefinitions.id,
            slotKey: methodologyArtifactSlotDefinitions.key,
            slotDisplayName: methodologyArtifactSlotDefinitions.displayName,
            slotDescriptionJson: methodologyArtifactSlotDefinitions.descriptionJson,
            slotGuidanceJson: methodologyArtifactSlotDefinitions.guidanceJson,
            slotCardinality: methodologyArtifactSlotDefinitions.cardinality,
            slotRulesJson: methodologyArtifactSlotDefinitions.rulesJson,
            templateId: methodologyArtifactSlotTemplates.id,
            templateKey: methodologyArtifactSlotTemplates.key,
            templateDisplayName: methodologyArtifactSlotTemplates.displayName,
            templateDescriptionJson: methodologyArtifactSlotTemplates.descriptionJson,
            templateGuidanceJson: methodologyArtifactSlotTemplates.guidanceJson,
            templateContent: methodologyArtifactSlotTemplates.content,
          })
          .from(methodologyArtifactSlotDefinitions)
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
              eq(methodologyArtifactSlotDefinitions.workUnitTypeId, workUnitTypeId),
            ),
          )
          .orderBy(
            asc(methodologyArtifactSlotDefinitions.key),
            asc(methodologyArtifactSlotTemplates.key),
          );

        const slots = new Map<
          string,
          {
            id: string;
            key: string;
            displayName: string | null;
            descriptionJson: unknown;
            guidanceJson: unknown;
            cardinality: "single" | "fileset";
            rulesJson: unknown;
            templates: Array<{
              id: string;
              key: string;
              displayName: string | null;
              descriptionJson: unknown;
              guidanceJson: unknown;
              content: string | null;
            }>;
          }
        >();

        for (const row of rows) {
          const existing = slots.get(row.slotId);
          if (existing) {
            if (row.templateId && row.templateKey) {
              existing.templates.push({
                id: row.templateId,
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
            id: row.slotId,
            key: row.slotKey,
            displayName: row.slotDisplayName,
            descriptionJson: row.slotDescriptionJson,
            guidanceJson: row.slotGuidanceJson,
            cardinality:
              row.slotCardinality === "fileset" ? ("fileset" as const) : ("single" as const),
            rulesJson: row.slotRulesJson,
            templates: [] as Array<{
              id: string;
              key: string;
              displayName: string | null;
              descriptionJson: unknown;
              guidanceJson: unknown;
              content: string | null;
            }>,
          };

          if (row.templateId && row.templateKey) {
            slot.templates.push({
              id: row.templateId,
              key: row.templateKey,
              displayName: row.templateDisplayName,
              descriptionJson: row.templateDescriptionJson,
              guidanceJson: row.templateGuidanceJson,
              content: row.templateContent,
            });
          }

          slots.set(row.slotId, slot);
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

    listWorkflowContextFactsByDefinitionId: ({ versionId, workflowDefinitionId }) =>
      dbEffect("methodology.listWorkflowContextFactsByDefinitionId", () =>
        readWorkflowContextFacts(db, versionId, workflowDefinitionId),
      ),

    createWorkflowContextFactByDefinitionId: ({ versionId, workflowDefinitionId, fact }) =>
      dbEffect("methodology.createWorkflowContextFactByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          if (fact.kind === "work_unit_draft_spec_fact") {
            await inferDraftSpecWorkUnitTypeKey(tx, fact.includedFactDefinitionIds);
          }

          const rows = await tx
            .insert(methodologyWorkflowContextFactDefinitions)
            .values({
              workflowId: workflowDefinitionId,
              factKey: fact.key,
              factKind: fact.kind,
              label: fact.label ?? null,
              descriptionJson: fact.descriptionJson ?? null,
              cardinality: fact.cardinality,
              guidanceJson: fact.guidance ?? null,
            })
            .returning({ id: methodologyWorkflowContextFactDefinitions.id });

          const definitionId = rows[0]?.id;
          if (!definitionId) {
            throw new Error(`Failed to create workflow context fact '${fact.key}'`);
          }

          await insertContextFactSubtypeRow(tx, definitionId, fact);
          return {
            ...fact,
            contextFactDefinitionId: definitionId,
          };
        }),
      ),

    updateWorkflowContextFactByDefinitionId: ({
      versionId,
      workflowDefinitionId,
      contextFactDefinitionId,
      fact,
    }) =>
      dbEffect("methodology.updateWorkflowContextFactByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          if (fact.kind === "work_unit_draft_spec_fact") {
            await inferDraftSpecWorkUnitTypeKey(tx, fact.includedFactDefinitionIds);
          }

          const existingRows = await tx
            .select({ id: methodologyWorkflowContextFactDefinitions.id })
            .from(methodologyWorkflowContextFactDefinitions)
            .where(
              and(
                eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowContextFactDefinitions.id, contextFactDefinitionId),
              ),
            )
            .limit(1);
          const definitionId = existingRows[0]?.id;
          if (!definitionId) {
            throw new Error(`Workflow context fact '${contextFactDefinitionId}' not found`);
          }

          await tx
            .update(methodologyWorkflowContextFactDefinitions)
            .set({
              factKey: fact.key,
              factKind: fact.kind,
              label: fact.label ?? null,
              descriptionJson: fact.descriptionJson ?? null,
              cardinality: fact.cardinality,
              guidanceJson: fact.guidance ?? null,
            })
            .where(eq(methodologyWorkflowContextFactDefinitions.id, definitionId));

          await deleteContextFactSubtypeRows(tx, definitionId);
          await insertContextFactSubtypeRow(tx, definitionId, fact);

          return fact;
        }),
      ),

    deleteWorkflowContextFactByDefinitionId: ({
      versionId,
      workflowDefinitionId,
      contextFactDefinitionId,
    }) =>
      dbEffect("methodology.deleteWorkflowContextFactByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const definitionRows = await tx
            .select({
              id: methodologyWorkflowContextFactDefinitions.id,
              factKey: methodologyWorkflowContextFactDefinitions.factKey,
            })
            .from(methodologyWorkflowContextFactDefinitions)
            .where(
              and(
                eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowContextFactDefinitions.id, contextFactDefinitionId),
              ),
            )
            .limit(1);
          const definitionId = definitionRows[0]?.id;
          const factKey = definitionRows[0]?.factKey;
          if (!definitionId) {
            throw new Error(`Workflow context fact '${contextFactDefinitionId}' not found`);
          }

          const boundFieldRows = await tx
            .select({
              inputJson: methodologyWorkflowFormFields.inputJson,
              fieldKey: methodologyWorkflowFormFields.key,
            })
            .from(methodologyWorkflowFormFields)
            .innerJoin(
              methodologyWorkflowSteps,
              eq(methodologyWorkflowFormFields.formStepId, methodologyWorkflowSteps.id),
            )
            .where(
              and(
                eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowSteps.type, "form"),
              ),
            );

          const boundField = boundFieldRows.find((row) => {
            const binding = getFormFieldBindingReference(row.inputJson);
            return binding === factKey || binding === definitionId;
          });
          if (boundField) {
            throw new RepositoryError({
              operation: "methodology.deleteWorkflowContextFactByDefinitionId",
              cause: new Error(
                `Workflow context fact '${factKey}' is still bound by form field '${boundField.fieldKey}'`,
              ),
            });
          }

          await tx
            .delete(methodologyWorkflowContextFactDefinitions)
            .where(
              and(
                eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowContextFactDefinitions.id, contextFactDefinitionId),
              ),
            );
        }),
      ),

    createFormStepDefinition: ({ versionId, workflowDefinitionId, afterStepKey, payload }) =>
      dbEffect("methodology.createFormStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const facts = await readWorkflowContextFacts(tx, versionId, workflowDefinitionId);
          const factByIdentifier = buildFactIdentifierMap(facts);

          const rows = await tx
            .insert(methodologyWorkflowSteps)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflowDefinitionId,
              key: payload.key,
              type: "form",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .returning();
          const step = rows[0];
          if (!step) {
            throw new Error(`Failed to create form step '${payload.key}'`);
          }

          if (payload.fields.length > 0) {
            await tx.insert(methodologyWorkflowFormFields).values(
              payload.fields.map((field, index) => {
                const fact = factByIdentifier.get(field.contextFactDefinitionId);
                const contextFactDefinitionId =
                  fact?.contextFactDefinitionId ?? field.contextFactDefinitionId;

                return {
                  formStepId: step.id,
                  key: field.fieldKey,
                  label: field.fieldLabel,
                  valueType: deriveStoredFieldValueType(fact),
                  required: field.required,
                  inputJson: {
                    contextFactDefinitionId,
                    ...(field.uiMultiplicityMode
                      ? { uiMultiplicityMode: field.uiMultiplicityMode }
                      : {}),
                  },
                  descriptionJson: field.helpText ? { markdown: field.helpText } : null,
                  sortOrder: index,
                };
              }),
            );
          }

          if (afterStepKey) {
            const predecessorRows = await tx
              .select({ id: methodologyWorkflowSteps.id })
              .from(methodologyWorkflowSteps)
              .where(
                and(
                  eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
                  eq(methodologyWorkflowSteps.key, afterStepKey),
                ),
              )
              .limit(1);

            const predecessorId = predecessorRows[0]?.id;
            if (predecessorId) {
              const outgoingEdges = await tx
                .select({
                  id: methodologyWorkflowEdges.id,
                  toStepId: methodologyWorkflowEdges.toStepId,
                })
                .from(methodologyWorkflowEdges)
                .where(
                  and(
                    eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId),
                    eq(methodologyWorkflowEdges.fromStepId, predecessorId),
                  ),
                );

              await tx
                .delete(methodologyWorkflowEdges)
                .where(
                  and(
                    eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId),
                    eq(methodologyWorkflowEdges.fromStepId, predecessorId),
                  ),
                );

              await tx.insert(methodologyWorkflowEdges).values({
                methodologyVersionId: versionId,
                workflowId: workflowDefinitionId,
                fromStepId: predecessorId,
                toStepId: step.id,
                edgeKey: null,
                conditionJson: null,
                guidanceJson: null,
              });

              const successorId = outgoingEdges[0]?.toStepId ?? null;
              if (successorId) {
                await tx.insert(methodologyWorkflowEdges).values({
                  methodologyVersionId: versionId,
                  workflowId: workflowDefinitionId,
                  fromStepId: step.id,
                  toStepId: successorId,
                  edgeKey: null,
                  conditionJson: null,
                  guidanceJson: null,
                });
              }
            }
          }

          return { stepId: step.id, payload };
        }),
      ),

    updateFormStepDefinition: ({ versionId, workflowDefinitionId, stepId, payload }) =>
      dbEffect("methodology.updateFormStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const facts = await readWorkflowContextFacts(tx, versionId, workflowDefinitionId);
          const factByIdentifier = buildFactIdentifierMap(facts);

          const rows = await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: payload.key,
              type: "form",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .where(
              and(
                eq(methodologyWorkflowSteps.id, stepId),
                eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
              ),
            )
            .returning({ id: methodologyWorkflowSteps.id });

          if (rows.length === 0) {
            throw new Error(`Form step '${stepId}' not found`);
          }

          await tx
            .delete(methodologyWorkflowFormFields)
            .where(eq(methodologyWorkflowFormFields.formStepId, stepId));

          if (payload.fields.length > 0) {
            await tx.insert(methodologyWorkflowFormFields).values(
              payload.fields.map((field, index) => {
                const fact = factByIdentifier.get(field.contextFactDefinitionId);
                const contextFactDefinitionId =
                  fact?.contextFactDefinitionId ?? field.contextFactDefinitionId;

                return {
                  formStepId: stepId,
                  key: field.fieldKey,
                  label: field.fieldLabel,
                  valueType: deriveStoredFieldValueType(fact),
                  required: field.required,
                  inputJson: {
                    contextFactDefinitionId,
                    ...(field.uiMultiplicityMode
                      ? { uiMultiplicityMode: field.uiMultiplicityMode }
                      : {}),
                  },
                  descriptionJson: field.helpText ? { markdown: field.helpText } : null,
                  sortOrder: index,
                };
              }),
            );
          }

          return { stepId, payload };
        }),
      ),

    deleteFormStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.deleteFormStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const outgoingEdges = await tx
            .select({
              id: methodologyWorkflowEdges.id,
              toStepId: methodologyWorkflowEdges.toStepId,
            })
            .from(methodologyWorkflowEdges)
            .where(
              and(
                eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowEdges.fromStepId, stepId),
              ),
            );
          const incomingEdges = await tx
            .select({ id: methodologyWorkflowEdges.id })
            .from(methodologyWorkflowEdges)
            .where(
              and(
                eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId),
                eq(methodologyWorkflowEdges.toStepId, stepId),
              ),
            );

          const successorId =
            outgoingEdges.length === 1 ? (outgoingEdges[0]?.toStepId ?? null) : null;
          if (successorId) {
            for (const edge of incomingEdges) {
              await tx
                .update(methodologyWorkflowEdges)
                .set({ toStepId: successorId })
                .where(eq(methodologyWorkflowEdges.id, edge.id));
            }
          }

          await tx
            .delete(methodologyWorkflowEdges)
            .where(
              and(
                eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId),
                or(
                  eq(methodologyWorkflowEdges.fromStepId, stepId),
                  eq(methodologyWorkflowEdges.toStepId, stepId),
                ),
              ),
            );

          const workflowMetadata =
            workflow.metadataJson &&
            typeof workflow.metadataJson === "object" &&
            workflow.metadataJson !== null &&
            !Array.isArray(workflow.metadataJson)
              ? { ...(workflow.metadataJson as Record<string, unknown>) }
              : null;

          if (workflowMetadata?.entryStepId === stepId) {
            delete workflowMetadata.entryStepId;
            await tx
              .update(methodologyWorkflows)
              .set({
                metadataJson:
                  workflowMetadata && Object.keys(workflowMetadata).length > 0
                    ? workflowMetadata
                    : null,
              })
              .where(eq(methodologyWorkflows.id, workflowDefinitionId));
          }

          await tx
            .delete(methodologyWorkflowSteps)
            .where(
              and(
                eq(methodologyWorkflowSteps.id, stepId),
                eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
              ),
            );
        }),
      ),

    listWorkflowEdgesByDefinitionId: ({ versionId, workflowDefinitionId }) =>
      dbEffect("methodology.listWorkflowEdgesByDefinitionId", async () => {
        const workflow = await findWorkflowRow(db, { versionId, workflowDefinitionId });
        if (!workflow) {
          throw new Error(
            `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
          );
        }

        const [stepRows, edgeRows] = await Promise.all([
          db
            .select({ id: methodologyWorkflowSteps.id, key: methodologyWorkflowSteps.key })
            .from(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.workflowId, workflow.id)),
          db
            .select()
            .from(methodologyWorkflowEdges)
            .where(eq(methodologyWorkflowEdges.workflowId, workflow.id))
            .orderBy(asc(methodologyWorkflowEdges.createdAt), asc(methodologyWorkflowEdges.id)),
        ]);

        const stepKeyById = new Map(stepRows.map((row) => [row.id, row.key]));

        return edgeRows.map((edge) => ({
          edgeId: edge.id,
          fromStepKey: edge.fromStepId ? (stepKeyById.get(edge.fromStepId) ?? null) : null,
          toStepKey: edge.toStepId ? (stepKeyById.get(edge.toStepId) ?? null) : null,
          ...(edge.guidanceJson !== null && edge.guidanceJson !== undefined
            ? { descriptionJson: edge.guidanceJson as { readonly markdown: string } }
            : {}),
          ...(edge.conditionJson !== null && edge.conditionJson !== undefined
            ? { condition: edge.conditionJson }
            : {}),
        }));
      }),

    createWorkflowEdgeByDefinitionId: ({
      versionId,
      workflowDefinitionId,
      fromStepKey,
      toStepKey,
      descriptionJson,
      condition,
    }) =>
      dbEffect("methodology.createWorkflowEdgeByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const stepRows = await tx
            .select({ id: methodologyWorkflowSteps.id, key: methodologyWorkflowSteps.key })
            .from(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.workflowId, workflow.id));

          const stepIdByKey = new Map(stepRows.map((row) => [row.key, row.id]));
          const fromStepId = fromStepKey === null ? null : (stepIdByKey.get(fromStepKey) ?? null);
          const toStepId = toStepKey === null ? null : (stepIdByKey.get(toStepKey) ?? null);

          if (fromStepKey !== null && fromStepId === null) {
            throw new Error(`Workflow edge references unknown fromStepKey '${fromStepKey}'`);
          }

          if (toStepKey !== null && toStepId === null) {
            throw new Error(`Workflow edge references unknown toStepKey '${toStepKey}'`);
          }

          const rows = await tx
            .insert(methodologyWorkflowEdges)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflow.id,
              fromStepId,
              toStepId,
              edgeKey: null,
              conditionJson: condition,
              guidanceJson: descriptionJson,
            })
            .returning();

          const edge = rows[0];
          if (!edge) {
            throw new Error("Failed to create workflow edge");
          }

          return {
            edgeId: edge.id,
            fromStepKey,
            toStepKey,
            ...(edge.guidanceJson !== null && edge.guidanceJson !== undefined
              ? { descriptionJson: edge.guidanceJson as { readonly markdown: string } }
              : {}),
            ...(edge.conditionJson !== null && edge.conditionJson !== undefined
              ? { condition: edge.conditionJson }
              : {}),
          } satisfies WorkflowEdgeDto;
        }),
      ),

    updateWorkflowEdgeByDefinitionId: ({
      versionId,
      workflowDefinitionId,
      edgeId,
      fromStepKey,
      toStepKey,
      descriptionJson,
      condition,
    }) =>
      dbEffect("methodology.updateWorkflowEdgeByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const stepRows = await tx
            .select({ id: methodologyWorkflowSteps.id, key: methodologyWorkflowSteps.key })
            .from(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.workflowId, workflow.id));

          const stepIdByKey = new Map(stepRows.map((row) => [row.key, row.id]));
          const fromStepId = fromStepKey === null ? null : (stepIdByKey.get(fromStepKey) ?? null);
          const toStepId = toStepKey === null ? null : (stepIdByKey.get(toStepKey) ?? null);

          if (fromStepKey !== null && fromStepId === null) {
            throw new Error(`Workflow edge references unknown fromStepKey '${fromStepKey}'`);
          }

          if (toStepKey !== null && toStepId === null) {
            throw new Error(`Workflow edge references unknown toStepKey '${toStepKey}'`);
          }

          const rows = await tx
            .update(methodologyWorkflowEdges)
            .set({
              fromStepId,
              toStepId,
              conditionJson: condition,
              guidanceJson: descriptionJson,
            })
            .where(
              and(
                eq(methodologyWorkflowEdges.id, edgeId),
                eq(methodologyWorkflowEdges.workflowId, workflow.id),
              ),
            )
            .returning();

          const edge = rows[0];
          if (!edge) {
            throw new Error(`Workflow edge '${edgeId}' not found`);
          }

          return {
            edgeId: edge.id,
            fromStepKey,
            toStepKey,
            ...(edge.guidanceJson !== null && edge.guidanceJson !== undefined
              ? { descriptionJson: edge.guidanceJson as { readonly markdown: string } }
              : {}),
            ...(edge.conditionJson !== null && edge.conditionJson !== undefined
              ? { condition: edge.conditionJson }
              : {}),
          } satisfies WorkflowEdgeDto;
        }),
      ),

    deleteWorkflowEdgeByDefinitionId: ({ versionId, workflowDefinitionId, edgeId }) =>
      dbEffect("methodology.deleteWorkflowEdgeByDefinitionId", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          await tx
            .delete(methodologyWorkflowEdges)
            .where(
              and(
                eq(methodologyWorkflowEdges.id, edgeId),
                eq(methodologyWorkflowEdges.workflowId, workflow.id),
              ),
            );
        }),
      ),

    getWorkflowEditorDefinition: ({ versionId, workUnitTypeKey, workflowDefinitionId }) =>
      dbEffect("methodology.getWorkflowEditorDefinition", async () => {
        const workflow = await findWorkflowRow(db, {
          versionId,
          workflowDefinitionId,
          workUnitTypeKey,
        });
        if (!workflow) {
          throw new Error(
            `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
          );
        }

        const [stepRows, edgeRows, formDefinitions, contextFacts] = await Promise.all([
          db
            .select()
            .from(methodologyWorkflowSteps)
            .where(eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId))
            .orderBy(asc(methodologyWorkflowSteps.createdAt), asc(methodologyWorkflowSteps.id)),
          db
            .select()
            .from(methodologyWorkflowEdges)
            .where(eq(methodologyWorkflowEdges.workflowId, workflowDefinitionId))
            .orderBy(asc(methodologyWorkflowEdges.createdAt), asc(methodologyWorkflowEdges.id)),
          readWorkflowFormDefinitions(db, workflowDefinitionId),
          readWorkflowContextFacts(db, versionId, workflowDefinitionId),
        ]);

        const stepKeyById = new Map(stepRows.map((row) => [row.id, row.key]));
        const formDefinitionByStepId = new Map(formDefinitions.map((row) => [row.stepId, row]));

        const steps: WorkflowStepReadModel[] = stepRows.map((step) => {
          const stepType = asWorkflowStepType(step.type);

          if (stepType === "form") {
            const definition = formDefinitionByStepId.get(step.id);
            return {
              stepId: step.id,
              stepType: "form",
              payload: definition?.payload ?? buildFormPayload(step, []),
            };
          }

          return {
            stepId: step.id,
            stepType,
            mode: "deferred",
            defaultMessage: DEFERRED_STEP_MESSAGE,
          };
        });

        const edges: WorkflowEdgeDto[] = edgeRows.map((edge) => ({
          edgeId: edge.id,
          fromStepKey: edge.fromStepId ? (stepKeyById.get(edge.fromStepId) ?? null) : null,
          toStepKey: edge.toStepId ? (stepKeyById.get(edge.toStepId) ?? null) : null,
          ...(edge.guidanceJson !== null && edge.guidanceJson !== undefined
            ? { descriptionJson: edge.guidanceJson as { readonly markdown: string } }
            : {}),
          ...(edge.conditionJson !== null && edge.conditionJson !== undefined
            ? { condition: edge.conditionJson }
            : {}),
        }));

        return {
          workflow: {
            workflowDefinitionId: workflow.id,
            key: workflow.key,
            displayName: workflow.displayName,
            descriptionJson: workflow.descriptionJson,
            ...(workflow.metadataJson ? { metadata: workflow.metadataJson } : {}),
          },
          steps,
          edges,
          contextFacts,
          formDefinitions,
        } satisfies WorkflowEditorDefinitionReadModel;
      }),

    updateWorkflowMetadataByDefinitionId: (input: {
      versionId: string;
      workUnitTypeKey: string;
      workflowDefinitionId: string;
      key: string;
      displayName: string | null;
      descriptionJson: unknown;
      entryStepId: string | null;
    }) =>
      dbEffect("methodology.updateWorkflowMetadataByDefinitionId", async () => {
        const workflow = await findWorkflowRow(db, {
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          workUnitTypeKey: input.workUnitTypeKey,
        });

        if (!workflow) {
          throw new Error("Workflow not found");
        }

        if (input.entryStepId) {
          const matchingStepRows = await db
            .select({ id: methodologyWorkflowSteps.id })
            .from(methodologyWorkflowSteps)
            .where(
              and(
                eq(methodologyWorkflowSteps.id, input.entryStepId),
                eq(methodologyWorkflowSteps.workflowId, workflow.id),
              ),
            )
            .limit(1);

          if (matchingStepRows.length === 0) {
            throw new Error(`Workflow entry step '${input.entryStepId}' not found`);
          }
        }

        const metadataJson =
          workflow.metadataJson &&
          typeof workflow.metadataJson === "object" &&
          workflow.metadataJson !== null &&
          !Array.isArray(workflow.metadataJson)
            ? { ...(workflow.metadataJson as Record<string, unknown>) }
            : {};

        if (input.entryStepId) {
          metadataJson.entryStepId = input.entryStepId;
        } else {
          delete metadataJson.entryStepId;
        }

        const updated = await db
          .update(methodologyWorkflows)
          .set({
            key: input.key,
            displayName: input.displayName,
            descriptionJson: input.descriptionJson,
            metadataJson: Object.keys(metadataJson).length > 0 ? metadataJson : null,
          })
          .where(eq(methodologyWorkflows.id, workflow.id))
          .returning();

        if (updated.length === 0) {
          throw new Error("Workflow not found");
        }

        const row = updated[0]!;
        return {
          workflowDefinitionId: row.id,
          key: row.key,
          displayName: row.displayName,
          descriptionJson: row.descriptionJson,
          ...(row.metadataJson ? { metadata: row.metadataJson } : {}),
        };
      }),
  });
}
