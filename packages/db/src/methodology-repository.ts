import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  MethodologyRepository,
  type WorkflowActionStepDefinitionReadModel,
  type BranchStepDefinitionReadModel,
  RepositoryError,
  type RepositoryErrorCode,
  type CreateDraftParams,
  type GetPublicationEvidenceParams,
  type GetBranchStepDefinitionParams,
  type UpdateDraftParams,
  type GetActionStepDefinitionParams,
  type GetInvokeStepDefinitionParams,
  type GetVersionEventsParams,
  type InvokeStepDefinitionReadModel,
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
  type WorkflowAgentStepDefinitionReadModel,
} from "@chiron/methodology-engine";
import type {
  PublicationEvidence,
  ValidationResult,
  MethodologyVersionDefinition,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import type {
  ActionStepPayload,
  BranchStepPayload,
  FormStepPayload,
  InvokeStepPayload,
  WorkflowContextFactDto,
  WorkflowEdgeDto,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step/design-time";
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
  methodologyWorkflowAgentSteps,
  methodologyWorkflowAgentStepExplicitReadGrants,
  methodologyWorkflowAgentStepWriteItems,
  methodologyWorkflowAgentStepWriteItemRequirements,
  methodologyWorkflowActionStepActions,
  methodologyWorkflowActionStepActionItems,
  methodologyWorkflowActionSteps,
  methodologyWorkflowBranchRouteConditions,
  methodologyWorkflowBranchRouteGroups,
  methodologyWorkflowBranchRoutes,
  methodologyWorkflowBranchSteps,
  methodologyTransitionWorkflowBindings,
  workUnitFactDefinitions,
  methodologyArtifactSlotDefinitions,
  methodologyArtifactSlotTemplates,
  methodologyWorkflowContextFactArtifactReferences,
  methodologyWorkflowContextFactDefinitions,
  methodologyWorkflowContextFactDraftSpecFields,
  methodologyWorkflowContextFactDraftSpecSelections,
  methodologyWorkflowContextFactDraftSpecs,
  methodologyWorkflowContextFactExternalBindings,
  methodologyWorkflowInvokeBindings,
  methodologyWorkflowInvokeSteps,
  methodologyWorkflowInvokeTransitions,
  methodologyWorkflowContextFactPlainValues,
  methodologyWorkflowContextFactWorkflowReferences,
} from "./schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;
type StepRow = typeof methodologyWorkflowSteps.$inferSelect;
type InvokeStepRow = typeof methodologyWorkflowInvokeSteps.$inferSelect;
type InvokeBindingRow = typeof methodologyWorkflowInvokeBindings.$inferSelect;
type InvokeTransitionRow = typeof methodologyWorkflowInvokeTransitions.$inferSelect;
type ActionStepRow = typeof methodologyWorkflowActionSteps.$inferSelect;
type ActionStepActionRow = typeof methodologyWorkflowActionStepActions.$inferSelect;
type ActionStepActionItemRow = typeof methodologyWorkflowActionStepActionItems.$inferSelect;
type BranchRouteRow = typeof methodologyWorkflowBranchRoutes.$inferSelect;
type BranchRouteGroupRow = typeof methodologyWorkflowBranchRouteGroups.$inferSelect;
type BranchRouteConditionRow = typeof methodologyWorkflowBranchRouteConditions.$inferSelect;

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

type FactValueType = "string" | "number" | "boolean" | "json" | "work_unit";

function normalizeMethodologyFactValidationForStorage(validation: unknown): unknown {
  if (!validation || typeof validation !== "object") {
    return validation ?? null;
  }

  const record = validation as Record<string, unknown>;
  if (record.kind !== "json-schema") {
    return validation;
  }

  const existingSubSchema =
    typeof record.subSchema === "object" && record.subSchema !== null
      ? (record.subSchema as Record<string, unknown>)
      : null;
  if (existingSubSchema && Array.isArray(existingSubSchema.fields)) {
    return validation;
  }

  const schema =
    typeof record.schema === "object" && record.schema !== null
      ? (record.schema as Record<string, unknown>)
      : null;
  const properties =
    schema && typeof schema.properties === "object" && schema.properties !== null
      ? (schema.properties as Record<string, unknown>)
      : null;
  if (!properties) {
    return validation;
  }

  const fields = Object.entries(properties)
    .map(([key, property]) => {
      const propertyRecord =
        typeof property === "object" && property !== null
          ? (property as Record<string, unknown>)
          : null;
      const type = propertyRecord?.type;
      if (type !== "string" && type !== "number" && type !== "boolean") {
        return null;
      }

      const field: Record<string, unknown> = {
        key,
        type,
        cardinality:
          propertyRecord?.cardinality === "many" || propertyRecord?.cardinality === "one"
            ? propertyRecord.cardinality
            : "one",
      };

      if (typeof propertyRecord?.title === "string" && propertyRecord.title.trim().length > 0) {
        field.displayName = propertyRecord.title.trim();
      }

      const fieldValidation =
        typeof propertyRecord?.validation !== "undefined"
          ? propertyRecord.validation
          : propertyRecord && typeof propertyRecord["x-validation"] !== "undefined"
            ? propertyRecord["x-validation"]
            : undefined;
      if (typeof fieldValidation !== "undefined") {
        field.validation = fieldValidation;
      }

      return field;
    })
    .filter((field): field is Record<string, unknown> => field !== null);

  return {
    ...record,
    subSchema: {
      type: "object",
      fields,
    },
  };
}

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

async function validateDraftSpecSelections(
  db: DB | TransactionClient,
  workUnitDefinitionId: string,
  selectedWorkUnitFactDefinitionIds: readonly string[],
  selectedArtifactSlotDefinitionIds: readonly string[],
): Promise<void> {
  const workUnitRows = await db
    .select({ id: methodologyWorkUnitTypes.id })
    .from(methodologyWorkUnitTypes)
    .where(eq(methodologyWorkUnitTypes.id, workUnitDefinitionId))
    .limit(1);

  if (workUnitRows.length === 0) {
    throw new Error(`Draft-spec work-unit definition '${workUnitDefinitionId}' does not exist`);
  }

  if (selectedWorkUnitFactDefinitionIds.length > 0) {
    const factRows = await db
      .select({ id: workUnitFactDefinitions.id })
      .from(workUnitFactDefinitions)
      .where(
        and(
          eq(workUnitFactDefinitions.workUnitTypeId, workUnitDefinitionId),
          inArray(workUnitFactDefinitions.id, selectedWorkUnitFactDefinitionIds),
        ),
      );

    if (factRows.length !== selectedWorkUnitFactDefinitionIds.length) {
      throw new Error(
        "One or more selected draft-spec fact definitions do not exist on the chosen work-unit type",
      );
    }
  }

  if (selectedArtifactSlotDefinitionIds.length > 0) {
    const artifactRows = await db
      .select({ id: methodologyArtifactSlotDefinitions.id })
      .from(methodologyArtifactSlotDefinitions)
      .where(
        and(
          eq(methodologyArtifactSlotDefinitions.workUnitTypeId, workUnitDefinitionId),
          inArray(methodologyArtifactSlotDefinitions.id, selectedArtifactSlotDefinitionIds),
        ),
      );

    if (artifactRows.length !== selectedArtifactSlotDefinitionIds.length) {
      throw new Error(
        "One or more selected draft-spec artifact slots do not exist on the chosen work-unit type",
      );
    }
  }
}

function getContextFactDescriptionJson(value: unknown): { readonly markdown: string } | undefined {
  if (isRecord(value) && typeof value.markdown === "string") {
    return { markdown: value.markdown };
  }

  return undefined;
}

function getInvokeBindingDestinationKey(binding: {
  readonly destination:
    | { readonly kind: "work_unit_fact"; readonly workUnitFactDefinitionId: string }
    | { readonly kind: "artifact_slot"; readonly artifactSlotDefinitionId: string };
}): string {
  return binding.destination.kind === "work_unit_fact"
    ? `work_unit_fact:${binding.destination.workUnitFactDefinitionId}`
    : `artifact_slot:${binding.destination.artifactSlotDefinitionId}`;
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

function getAgentCompletionRequirements(
  value: unknown,
): AgentStepDesignTimePayload["completionRequirements"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) =>
    isRecord(item) && typeof item.contextFactDefinitionId === "string"
      ? [{ contextFactDefinitionId: item.contextFactDefinitionId }]
      : [],
  );
}

function resolveWorkflowContextFactDefinitionId(
  factByIdentifier: ReadonlyMap<string, WorkflowContextFactDto>,
  identifier: string,
): string {
  const fact = factByIdentifier.get(identifier);
  if (!fact || typeof fact.contextFactDefinitionId !== "string") {
    throw new RepositoryError({
      operation: "methodology.agentStep.resolveWorkflowContextFactDefinitionId",
      cause: new Error(`Unknown workflow context fact '${identifier}'`),
    });
  }

  return fact.contextFactDefinitionId;
}

function normalizeAgentStepPayload(
  workflowDefinitionId: string,
  factByIdentifier: ReadonlyMap<string, WorkflowContextFactDto>,
  payload: AgentStepDesignTimePayload,
): {
  readonly payload: AgentStepDesignTimePayload;
  readonly explicitReadGrantDefinitionIds: readonly string[];
  readonly writeItems: readonly {
    readonly writeItemId: string;
    readonly contextFactDefinitionId: string;
    readonly contextFactKind: AgentStepDesignTimePayload["writeItems"][number]["contextFactKind"];
    readonly label?: string;
    readonly order: number;
    readonly requirementContextFactDefinitionIds: readonly string[];
  }[];
} {
  const explicitReadGrantDefinitionIds: string[] = [];
  const seenExplicitReadGrantIds = new Set<string>();

  for (const grant of payload.explicitReadGrants) {
    const contextFactDefinitionId = resolveWorkflowContextFactDefinitionId(
      factByIdentifier,
      grant.contextFactDefinitionId,
    );

    if (seenExplicitReadGrantIds.has(contextFactDefinitionId)) {
      throw new RepositoryError({
        operation: "methodology.agentStep.normalizeAgentStepPayload",
        cause: new Error(
          `Agent step '${payload.key}' cannot grant explicit read access to context fact '${contextFactDefinitionId}' more than once`,
        ),
      });
    }

    seenExplicitReadGrantIds.add(contextFactDefinitionId);
    explicitReadGrantDefinitionIds.push(contextFactDefinitionId);
  }

  const writeItems: Array<{
    readonly writeItemId: string;
    readonly contextFactDefinitionId: string;
    readonly contextFactKind: AgentStepDesignTimePayload["writeItems"][number]["contextFactKind"];
    readonly label?: string;
    readonly order: number;
    readonly requirementContextFactDefinitionIds: readonly string[];
  }> = [];
  const seenWriteItemIds = new Set<string>();
  const seenWriteItemContextFactIds = new Set<string>();

  for (const item of payload.writeItems) {
    const contextFactDefinitionId = resolveWorkflowContextFactDefinitionId(
      factByIdentifier,
      item.contextFactDefinitionId,
    );
    const fact = factByIdentifier.get(contextFactDefinitionId);

    if (!fact) {
      throw new RepositoryError({
        operation: "methodology.agentStep.normalizeAgentStepPayload",
        cause: new Error(
          `Workflow '${workflowDefinitionId}' is missing context fact '${contextFactDefinitionId}' for agent step '${payload.key}'`,
        ),
      });
    }

    if (seenWriteItemIds.has(item.writeItemId)) {
      throw new RepositoryError({
        operation: "methodology.agentStep.normalizeAgentStepPayload",
        cause: new Error(
          `Agent step '${payload.key}' cannot define write card '${item.writeItemId}' more than once`,
        ),
      });
    }

    if (seenWriteItemContextFactIds.has(contextFactDefinitionId)) {
      throw new RepositoryError({
        operation: "methodology.agentStep.normalizeAgentStepPayload",
        cause: new Error(
          `Agent step '${payload.key}' cannot define more than one write card for context fact '${contextFactDefinitionId}'`,
        ),
      });
    }

    if (fact.kind !== item.contextFactKind) {
      throw new RepositoryError({
        operation: "methodology.agentStep.normalizeAgentStepPayload",
        cause: new Error(
          `Agent step '${payload.key}' write card '${item.writeItemId}' expected context fact kind '${fact.kind}' for '${contextFactDefinitionId}', received '${item.contextFactKind}'`,
        ),
      });
    }

    seenWriteItemIds.add(item.writeItemId);
    seenWriteItemContextFactIds.add(contextFactDefinitionId);

    const requirementContextFactDefinitionIds: string[] = [];
    const seenRequirementIds = new Set<string>();

    for (const requirementContextFactDefinitionId of item.requirementContextFactDefinitionIds) {
      const resolvedRequirementId = resolveWorkflowContextFactDefinitionId(
        factByIdentifier,
        requirementContextFactDefinitionId,
      );

      if (resolvedRequirementId === contextFactDefinitionId) {
        throw new RepositoryError({
          operation: "methodology.agentStep.normalizeAgentStepPayload",
          cause: new Error(
            `Agent step '${payload.key}' write card '${item.writeItemId}' cannot depend on its own context fact '${contextFactDefinitionId}'`,
          ),
        });
      }

      if (seenRequirementIds.has(resolvedRequirementId)) {
        throw new RepositoryError({
          operation: "methodology.agentStep.normalizeAgentStepPayload",
          cause: new Error(
            `Agent step '${payload.key}' write card '${item.writeItemId}' cannot depend on context fact '${resolvedRequirementId}' more than once`,
          ),
        });
      }

      seenRequirementIds.add(resolvedRequirementId);
      requirementContextFactDefinitionIds.push(resolvedRequirementId);
    }

    writeItems.push({
      writeItemId: item.writeItemId,
      contextFactDefinitionId,
      contextFactKind: item.contextFactKind,
      ...(item.label ? { label: item.label } : {}),
      order: item.order,
      requirementContextFactDefinitionIds,
    });
  }

  const completionRequirementIds = payload.completionRequirements.map((requirement) => ({
    contextFactDefinitionId: resolveWorkflowContextFactDefinitionId(
      factByIdentifier,
      requirement.contextFactDefinitionId,
    ),
  }));

  const harnessSelection = {
    harness: payload.harnessSelection?.harness ?? "opencode",
    ...(payload.harnessSelection?.agent ? { agent: payload.harnessSelection.agent } : {}),
    ...(payload.harnessSelection?.model ? { model: payload.harnessSelection.model } : {}),
  };

  const runtimePolicy = {
    sessionStart: payload.runtimePolicy?.sessionStart ?? "explicit",
    continuationMode: payload.runtimePolicy?.continuationMode ?? "bootstrap_only",
    liveStreamCount: payload.runtimePolicy?.liveStreamCount ?? 1,
    bootstrapPromptNoReply: payload.runtimePolicy?.bootstrapPromptNoReply ?? true,
    nativeMessageLog: payload.runtimePolicy?.nativeMessageLog ?? false,
    persistedWritePolicy: payload.runtimePolicy?.persistedWritePolicy ?? "applied_only",
  };

  return {
    payload: {
      ...payload,
      harnessSelection,
      explicitReadGrants: explicitReadGrantDefinitionIds.map((contextFactDefinitionId) => ({
        contextFactDefinitionId,
      })),
      writeItems: writeItems.map((item) => ({
        writeItemId: item.writeItemId,
        contextFactDefinitionId: item.contextFactDefinitionId,
        contextFactKind: item.contextFactKind,
        ...(item.label ? { label: item.label } : {}),
        order: item.order,
        requirementContextFactDefinitionIds: [...item.requirementContextFactDefinitionIds],
      })),
      completionRequirements: completionRequirementIds,
      runtimePolicy,
    },
    explicitReadGrantDefinitionIds,
    writeItems,
  };
}

async function syncAgentStepDefinition(
  tx: TransactionClient,
  versionId: string,
  workflowDefinitionId: string,
  stepId: string,
  payload: AgentStepDesignTimePayload,
): Promise<AgentStepDesignTimePayload> {
  const facts = await readWorkflowContextFacts(tx, versionId, workflowDefinitionId);
  const factByIdentifier = buildFactIdentifierMap(facts);
  const normalized = normalizeAgentStepPayload(workflowDefinitionId, factByIdentifier, payload);

  await tx
    .delete(methodologyWorkflowAgentStepExplicitReadGrants)
    .where(eq(methodologyWorkflowAgentStepExplicitReadGrants.agentStepId, stepId));

  const existingWriteItemRows = await tx
    .select({ id: methodologyWorkflowAgentStepWriteItems.id })
    .from(methodologyWorkflowAgentStepWriteItems)
    .where(eq(methodologyWorkflowAgentStepWriteItems.agentStepId, stepId));

  if (existingWriteItemRows.length > 0) {
    await tx.delete(methodologyWorkflowAgentStepWriteItemRequirements).where(
      inArray(
        methodologyWorkflowAgentStepWriteItemRequirements.writeItemRowId,
        existingWriteItemRows.map((row) => row.id),
      ),
    );
  }

  await tx
    .delete(methodologyWorkflowAgentStepWriteItems)
    .where(eq(methodologyWorkflowAgentStepWriteItems.agentStepId, stepId));

  await tx
    .insert(methodologyWorkflowAgentSteps)
    .values({
      stepId,
      objective: normalized.payload.objective,
      instructionsMarkdown: normalized.payload.instructionsMarkdown,
      harness: normalized.payload.harnessSelection.harness,
      agentKey: normalized.payload.harnessSelection.agent ?? null,
      modelJson: normalized.payload.harnessSelection.model ?? null,
      completionRequirementsJson: normalized.payload.completionRequirements,
      sessionStart: normalized.payload.runtimePolicy.sessionStart,
      continuationMode: normalized.payload.runtimePolicy.continuationMode,
      liveStreamCount: normalized.payload.runtimePolicy.liveStreamCount,
      bootstrapPromptNoReply: normalized.payload.runtimePolicy.bootstrapPromptNoReply,
      nativeMessageLog: normalized.payload.runtimePolicy.nativeMessageLog,
      persistedWritePolicy: normalized.payload.runtimePolicy.persistedWritePolicy,
    })
    .onConflictDoUpdate({
      target: methodologyWorkflowAgentSteps.stepId,
      set: {
        objective: normalized.payload.objective,
        instructionsMarkdown: normalized.payload.instructionsMarkdown,
        harness: normalized.payload.harnessSelection.harness,
        agentKey: normalized.payload.harnessSelection.agent ?? null,
        modelJson: normalized.payload.harnessSelection.model ?? null,
        completionRequirementsJson: normalized.payload.completionRequirements,
        sessionStart: normalized.payload.runtimePolicy.sessionStart,
        continuationMode: normalized.payload.runtimePolicy.continuationMode,
        liveStreamCount: normalized.payload.runtimePolicy.liveStreamCount,
        bootstrapPromptNoReply: normalized.payload.runtimePolicy.bootstrapPromptNoReply,
        nativeMessageLog: normalized.payload.runtimePolicy.nativeMessageLog,
        persistedWritePolicy: normalized.payload.runtimePolicy.persistedWritePolicy,
      },
    });

  if (normalized.explicitReadGrantDefinitionIds.length > 0) {
    await tx.insert(methodologyWorkflowAgentStepExplicitReadGrants).values(
      normalized.explicitReadGrantDefinitionIds.map((contextFactDefinitionId) => ({
        agentStepId: stepId,
        contextFactDefinitionId,
      })),
    );
  }

  if (normalized.writeItems.length > 0) {
    const insertedWriteItems = await tx
      .insert(methodologyWorkflowAgentStepWriteItems)
      .values(
        normalized.writeItems.map((item) => ({
          agentStepId: stepId,
          writeItemId: item.writeItemId,
          contextFactDefinitionId: item.contextFactDefinitionId,
          contextFactKind: item.contextFactKind,
          label: item.label ?? null,
          sortOrder: item.order,
        })),
      )
      .returning({
        id: methodologyWorkflowAgentStepWriteItems.id,
        writeItemId: methodologyWorkflowAgentStepWriteItems.writeItemId,
      });

    const writeItemRowIdByWriteItemId = new Map(
      insertedWriteItems.map((item) => [item.writeItemId, item.id]),
    );
    const requirementRows = normalized.writeItems.flatMap((item) => {
      const writeItemRowId = writeItemRowIdByWriteItemId.get(item.writeItemId);
      if (!writeItemRowId) {
        throw new Error(
          `Missing persisted write item '${item.writeItemId}' for agent step '${stepId}'`,
        );
      }

      return item.requirementContextFactDefinitionIds.map((contextFactDefinitionId) => ({
        writeItemRowId,
        contextFactDefinitionId,
      }));
    });

    if (requirementRows.length > 0) {
      await tx.insert(methodologyWorkflowAgentStepWriteItemRequirements).values(requirementRows);
    }
  }

  return normalized.payload;
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
    await tx.delete(methodologyWorkflowContextFactDraftSpecSelections).where(
      inArray(
        methodologyWorkflowContextFactDraftSpecSelections.draftSpecId,
        draftSpecRows.map((row) => row.id),
      ),
    );
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
        validationJson: fact.validationJson ?? null,
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
        .values({
          contextFactDefinitionId: definitionId,
          workUnitDefinitionId: fact.workUnitDefinitionId,
        })
        .returning({ id: methodologyWorkflowContextFactDraftSpecs.id });
      const draftSpecId = rows[0]?.id;
      if (!draftSpecId) {
        throw new Error(`Failed to create draft-spec payload for context fact '${fact.key}'`);
      }

      const selectionRows = [
        ...fact.selectedWorkUnitFactDefinitionIds.map((definitionId, index) => ({
          draftSpecId,
          selectionType: "fact",
          definitionId,
          sortOrder: index,
        })),
        ...fact.selectedArtifactSlotDefinitionIds.map((definitionId, index) => ({
          draftSpecId,
          selectionType: "artifact",
          definitionId,
          sortOrder: fact.selectedWorkUnitFactDefinitionIds.length + index,
        })),
      ];

      if (selectionRows.length > 0) {
        await tx.insert(methodologyWorkflowContextFactDraftSpecSelections).values(selectionRows);
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
    methodologyFactRows,
    workUnitFactRows,
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
    db
      .select({
        id: methodologyFactDefinitions.id,
        key: methodologyFactDefinitions.key,
        factType: methodologyFactDefinitions.valueType,
        validationJson: methodologyFactDefinitions.validationJson,
      })
      .from(methodologyFactDefinitions)
      .where(eq(methodologyFactDefinitions.methodologyVersionId, versionId))
      .catch(() => []),
    db
      .select({
        id: workUnitFactDefinitions.id,
        workUnitTypeId: workUnitFactDefinitions.workUnitTypeId,
        key: workUnitFactDefinitions.key,
        factType: workUnitFactDefinitions.factType,
        validationJson: workUnitFactDefinitions.validationJson,
      })
      .from(workUnitFactDefinitions)
      .where(eq(workUnitFactDefinitions.methodologyVersionId, versionId))
      .catch(() => []),
  ]);

  const draftSpecIds = draftSpecRows.map((row) => row.id);
  const draftSpecSelectionRows =
    draftSpecIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowContextFactDraftSpecSelections)
          .where(
            inArray(methodologyWorkflowContextFactDraftSpecSelections.draftSpecId, draftSpecIds),
          )
          .orderBy(
            asc(methodologyWorkflowContextFactDraftSpecSelections.draftSpecId),
            asc(methodologyWorkflowContextFactDraftSpecSelections.sortOrder),
            asc(methodologyWorkflowContextFactDraftSpecSelections.id),
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
  const draftSelectionsByDraftSpecId = new Map<string, typeof draftSpecSelectionRows>();
  for (const row of draftSpecSelectionRows) {
    const entries = draftSelectionsByDraftSpecId.get(row.draftSpecId) ?? [];
    entries.push(row);
    draftSelectionsByDraftSpecId.set(row.draftSpecId, entries);
  }

  const externalDefinitionByBindingKey = new Map<
    string,
    {
      readonly factType: string;
      readonly validationJson: unknown;
      readonly workUnitTypeId?: string;
    }
  >();
  for (const definition of [...methodologyFactRows, ...workUnitFactRows]) {
    externalDefinitionByBindingKey.set(definition.id, definition);
    externalDefinitionByBindingKey.set(definition.key, definition);
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
          valueType: row.valueType as Extract<
            FactValueType,
            "string" | "number" | "boolean" | "json"
          >,
          ...(typeof row.validationJson === "undefined" || row.validationJson === null
            ? {}
            : { validationJson: row.validationJson }),
        };
      }
      case "definition_backed_external_fact":
      case "bound_external_fact": {
        const row = externalByDefinitionId.get(definition.id);
        if (!row) {
          throw new Error(`Missing external fact payload for '${definition.factKey}'`);
        }

        const externalDefinition = externalDefinitionByBindingKey.get(row.bindingKey);
        const valueType =
          externalDefinition?.factType === "string" ||
          externalDefinition?.factType === "number" ||
          externalDefinition?.factType === "boolean" ||
          externalDefinition?.factType === "json" ||
          externalDefinition?.factType === "work_unit"
            ? (externalDefinition.factType as FactValueType)
            : undefined;

        return {
          kind: definition.factKind,
          key: definition.factKey,
          ...metadata,
          cardinality: definition.cardinality as "one" | "many",
          externalFactDefinitionId: row.bindingKey,
          ...(valueType ? { valueType } : {}),
          ...(externalDefinition?.workUnitTypeId
            ? { workUnitDefinitionId: externalDefinition.workUnitTypeId }
            : {}),
          ...(typeof externalDefinition?.validationJson !== "undefined"
            ? { validationJson: externalDefinition.validationJson }
            : {}),
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
          workUnitDefinitionId: row.workUnitDefinitionId,
          selectedWorkUnitFactDefinitionIds: (draftSelectionsByDraftSpecId.get(row.id) ?? [])
            .filter((selection) => selection.selectionType === "fact")
            .map((selection) => selection.definitionId),
          selectedArtifactSlotDefinitionIds: (draftSelectionsByDraftSpecId.get(row.id) ?? [])
            .filter((selection) => selection.selectionType === "artifact")
            .map((selection) => selection.definitionId),
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

async function readWorkflowAgentDefinitions(
  db: DB | TransactionClient,
  versionId: string,
  workflowDefinitionId: string,
): Promise<readonly WorkflowAgentStepDefinitionReadModel[]> {
  const stepRows = await db
    .select({
      id: methodologyWorkflowSteps.id,
      key: methodologyWorkflowSteps.key,
      displayName: methodologyWorkflowSteps.displayName,
      configJson: methodologyWorkflowSteps.configJson,
      guidanceJson: methodologyWorkflowSteps.guidanceJson,
      objective: methodologyWorkflowAgentSteps.objective,
      instructionsMarkdown: methodologyWorkflowAgentSteps.instructionsMarkdown,
      harness: methodologyWorkflowAgentSteps.harness,
      agentKey: methodologyWorkflowAgentSteps.agentKey,
      modelJson: methodologyWorkflowAgentSteps.modelJson,
      completionRequirementsJson: methodologyWorkflowAgentSteps.completionRequirementsJson,
      sessionStart: methodologyWorkflowAgentSteps.sessionStart,
      continuationMode: methodologyWorkflowAgentSteps.continuationMode,
      liveStreamCount: methodologyWorkflowAgentSteps.liveStreamCount,
      bootstrapPromptNoReply: methodologyWorkflowAgentSteps.bootstrapPromptNoReply,
      nativeMessageLog: methodologyWorkflowAgentSteps.nativeMessageLog,
      persistedWritePolicy: methodologyWorkflowAgentSteps.persistedWritePolicy,
    })
    .from(methodologyWorkflowSteps)
    .innerJoin(
      methodologyWorkflowAgentSteps,
      eq(methodologyWorkflowAgentSteps.stepId, methodologyWorkflowSteps.id),
    )
    .where(
      and(
        eq(methodologyWorkflowSteps.workflowId, workflowDefinitionId),
        eq(methodologyWorkflowSteps.type, "agent"),
      ),
    )
    .orderBy(asc(methodologyWorkflowSteps.createdAt), asc(methodologyWorkflowSteps.id));

  if (stepRows.length === 0) {
    return [];
  }

  const stepIds = stepRows.map((row) => row.id);
  const [explicitReadGrantRows, writeItemRows] = await Promise.all([
    db
      .select()
      .from(methodologyWorkflowAgentStepExplicitReadGrants)
      .where(inArray(methodologyWorkflowAgentStepExplicitReadGrants.agentStepId, stepIds))
      .orderBy(
        asc(methodologyWorkflowAgentStepExplicitReadGrants.agentStepId),
        asc(methodologyWorkflowAgentStepExplicitReadGrants.contextFactDefinitionId),
      ),
    db
      .select()
      .from(methodologyWorkflowAgentStepWriteItems)
      .where(inArray(methodologyWorkflowAgentStepWriteItems.agentStepId, stepIds))
      .orderBy(
        asc(methodologyWorkflowAgentStepWriteItems.agentStepId),
        asc(methodologyWorkflowAgentStepWriteItems.sortOrder),
        asc(methodologyWorkflowAgentStepWriteItems.id),
      ),
  ]);

  const writeItemRowIds = writeItemRows.map((row) => row.id);
  const writeItemRequirementRows =
    writeItemRowIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowAgentStepWriteItemRequirements)
          .where(
            inArray(
              methodologyWorkflowAgentStepWriteItemRequirements.writeItemRowId,
              writeItemRowIds,
            ),
          )
          .orderBy(
            asc(methodologyWorkflowAgentStepWriteItemRequirements.writeItemRowId),
            asc(methodologyWorkflowAgentStepWriteItemRequirements.contextFactDefinitionId),
          );

  const facts = await readWorkflowContextFacts(db, versionId, workflowDefinitionId);
  const factByDefinitionId = new Map(
    facts
      .filter(
        (fact): fact is WorkflowContextFactDto & { readonly contextFactDefinitionId: string } =>
          typeof fact.contextFactDefinitionId === "string",
      )
      .map((fact) => [fact.contextFactDefinitionId, fact]),
  );

  const explicitReadGrantsByStepId = new Map<string, typeof explicitReadGrantRows>();
  for (const row of explicitReadGrantRows) {
    const entries = explicitReadGrantsByStepId.get(row.agentStepId) ?? [];
    entries.push(row);
    explicitReadGrantsByStepId.set(row.agentStepId, entries);
  }

  const writeItemsByStepId = new Map<string, typeof writeItemRows>();
  for (const row of writeItemRows) {
    const entries = writeItemsByStepId.get(row.agentStepId) ?? [];
    entries.push(row);
    writeItemsByStepId.set(row.agentStepId, entries);
  }

  const requirementsByWriteItemRowId = new Map<string, typeof writeItemRequirementRows>();
  for (const row of writeItemRequirementRows) {
    const entries = requirementsByWriteItemRowId.get(row.writeItemRowId) ?? [];
    entries.push(row);
    requirementsByWriteItemRowId.set(row.writeItemRowId, entries);
  }

  return stepRows.map((step) => {
    const configJson = isRecord(step.configJson) ? step.configJson : {};
    const descriptionJson =
      isRecord(configJson.descriptionJson) &&
      typeof configJson.descriptionJson.markdown === "string"
        ? (configJson.descriptionJson as { readonly markdown: string })
        : undefined;

    return {
      stepId: step.id,
      payload: {
        key: step.key,
        ...(step.displayName ? { label: step.displayName } : {}),
        ...(descriptionJson ? { descriptionJson } : {}),
        objective: step.objective,
        instructionsMarkdown: step.instructionsMarkdown,
        harnessSelection: {
          harness: step.harness as AgentStepDesignTimePayload["harnessSelection"]["harness"],
          ...(step.agentKey ? { agent: step.agentKey } : {}),
          ...(step.modelJson
            ? {
                model: step.modelJson as NonNullable<
                  AgentStepDesignTimePayload["harnessSelection"]["model"]
                >,
              }
            : {}),
        },
        explicitReadGrants: (explicitReadGrantsByStepId.get(step.id) ?? []).map((row) => ({
          contextFactDefinitionId: row.contextFactDefinitionId,
        })),
        writeItems: (writeItemsByStepId.get(step.id) ?? []).map((row) => ({
          writeItemId: row.writeItemId,
          contextFactDefinitionId: row.contextFactDefinitionId,
          contextFactKind: (factByDefinitionId.get(row.contextFactDefinitionId)?.kind ??
            row.contextFactKind) as AgentStepDesignTimePayload["writeItems"][number]["contextFactKind"],
          ...(row.label ? { label: row.label } : {}),
          order: row.sortOrder,
          requirementContextFactDefinitionIds: (requirementsByWriteItemRowId.get(row.id) ?? []).map(
            (requirement) => requirement.contextFactDefinitionId,
          ),
        })),
        completionRequirements: getAgentCompletionRequirements(step.completionRequirementsJson),
        runtimePolicy: {
          sessionStart:
            step.sessionStart as AgentStepDesignTimePayload["runtimePolicy"]["sessionStart"],
          continuationMode:
            step.continuationMode as AgentStepDesignTimePayload["runtimePolicy"]["continuationMode"],
          liveStreamCount:
            step.liveStreamCount as AgentStepDesignTimePayload["runtimePolicy"]["liveStreamCount"],
          bootstrapPromptNoReply:
            step.bootstrapPromptNoReply as AgentStepDesignTimePayload["runtimePolicy"]["bootstrapPromptNoReply"],
          nativeMessageLog:
            step.nativeMessageLog as AgentStepDesignTimePayload["runtimePolicy"]["nativeMessageLog"],
          persistedWritePolicy:
            step.persistedWritePolicy as AgentStepDesignTimePayload["runtimePolicy"]["persistedWritePolicy"],
        },
        ...(getAudienceGuidance(step.guidanceJson)
          ? { guidance: getAudienceGuidance(step.guidanceJson) }
          : {}),
      },
    } satisfies WorkflowAgentStepDefinitionReadModel;
  });
}

function buildActionStepPayload(
  step: StepRow,
  actionStep: ActionStepRow,
  actions: readonly ActionStepActionRow[],
  itemsByActionRowId: ReadonlyMap<string, readonly ActionStepActionItemRow[]>,
): ActionStepPayload {
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
    executionMode: actionStep.executionMode as ActionStepPayload["executionMode"],
    actions: actions.map((action) => ({
      actionId: action.actionId,
      actionKey: action.actionKey,
      ...(action.label ? { label: action.label } : {}),
      enabled: action.enabled,
      sortOrder: action.sortOrder,
      actionKind: "propagation",
      contextFactDefinitionId: action.contextFactDefinitionId,
      contextFactKind:
        action.contextFactKind as ActionStepPayload["actions"][number]["contextFactKind"],
      items: (itemsByActionRowId.get(action.id) ?? []).map((item) => ({
        itemId: item.itemId,
        itemKey: item.itemKey,
        ...(item.label ? { label: item.label } : {}),
        sortOrder: item.sortOrder,
        ...(item.targetContextFactDefinitionId
          ? { targetContextFactDefinitionId: item.targetContextFactDefinitionId }
          : {}),
      })),
    })),
  };
}

function normalizeActionStepPayload(
  workflowDefinitionId: string,
  factByIdentifier: ReadonlyMap<string, WorkflowContextFactDto>,
  payload: ActionStepPayload,
): ActionStepPayload {
  if (payload.actions.length < 1) {
    throw new RepositoryError({
      operation: "methodology.actionStep.normalizeActionStepPayload",
      cause: new Error(`Action step '${payload.key}' must contain at least one action`),
    });
  }

  const seenActionIds = new Set<string>();
  const seenActionKeys = new Set<string>();
  const seenActionSortOrders = new Set<number>();
  const normalizedActions = payload.actions.map((action) => {
    if (seenActionIds.has(action.actionId)) {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(
          `Action step '${payload.key}' cannot define action '${action.actionId}' more than once`,
        ),
      });
    }

    if (seenActionKeys.has(action.actionKey)) {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(
          `Action step '${payload.key}' cannot define action key '${action.actionKey}' more than once`,
        ),
      });
    }

    if (seenActionSortOrders.has(action.sortOrder)) {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(
          `Action step '${payload.key}' cannot reuse action sort order '${action.sortOrder}'`,
        ),
      });
    }

    const fact = factByIdentifier.get(action.contextFactDefinitionId);
    const contextFactDefinitionId = fact?.contextFactDefinitionId ?? action.contextFactDefinitionId;

    if (!fact || typeof fact.contextFactDefinitionId !== "string") {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(
          `Workflow '${workflowDefinitionId}' is missing context fact '${action.contextFactDefinitionId}' for action '${action.actionId}'`,
        ),
      });
    }

    if (
      fact.kind !== "definition_backed_external_fact" &&
      fact.kind !== "bound_external_fact" &&
      fact.kind !== "artifact_reference_fact"
    ) {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(
          `Action '${action.actionId}' cannot target workflow context fact '${contextFactDefinitionId}' of kind '${fact.kind}'`,
        ),
      });
    }

    seenActionIds.add(action.actionId);
    seenActionKeys.add(action.actionKey);
    seenActionSortOrders.add(action.sortOrder);

    if (action.items.length < 1) {
      throw new RepositoryError({
        operation: "methodology.actionStep.normalizeActionStepPayload",
        cause: new Error(`Action '${action.actionId}' must contain at least one propagation item`),
      });
    }

    const seenItemIds = new Set<string>();
    const seenItemKeys = new Set<string>();
    const seenItemSortOrders = new Set<number>();

    return {
      ...action,
      contextFactDefinitionId,
      items: action.items.map((item) => {
        if (seenItemIds.has(item.itemId)) {
          throw new RepositoryError({
            operation: "methodology.actionStep.normalizeActionStepPayload",
            cause: new Error(
              `Action '${action.actionId}' cannot define item '${item.itemId}' more than once`,
            ),
          });
        }

        if (seenItemKeys.has(item.itemKey)) {
          throw new RepositoryError({
            operation: "methodology.actionStep.normalizeActionStepPayload",
            cause: new Error(
              `Action '${action.actionId}' cannot define item key '${item.itemKey}' more than once`,
            ),
          });
        }

        if (seenItemSortOrders.has(item.sortOrder)) {
          throw new RepositoryError({
            operation: "methodology.actionStep.normalizeActionStepPayload",
            cause: new Error(
              `Action '${action.actionId}' cannot reuse item sort order '${item.sortOrder}'`,
            ),
          });
        }

        seenItemIds.add(item.itemId);
        seenItemKeys.add(item.itemKey);
        seenItemSortOrders.add(item.sortOrder);

        const targetFact = item.targetContextFactDefinitionId
          ? factByIdentifier.get(item.targetContextFactDefinitionId)
          : fact;
        const targetContextFactDefinitionId = item.targetContextFactDefinitionId
          ? (targetFact?.contextFactDefinitionId ?? item.targetContextFactDefinitionId)
          : undefined;

        if (
          item.targetContextFactDefinitionId &&
          (!targetFact || typeof targetFact.contextFactDefinitionId !== "string")
        ) {
          throw new RepositoryError({
            operation: "methodology.actionStep.normalizeActionStepPayload",
            cause: new Error(
              `Action '${action.actionId}' item '${item.itemId}' targets unknown context fact '${item.targetContextFactDefinitionId}'`,
            ),
          });
        }

        if (
          targetFact &&
          targetFact.kind !== "definition_backed_external_fact" &&
          targetFact.kind !== "bound_external_fact" &&
          targetFact.kind !== "artifact_reference_fact"
        ) {
          throw new RepositoryError({
            operation: "methodology.actionStep.normalizeActionStepPayload",
            cause: new Error(
              `Action '${action.actionId}' item '${item.itemId}' cannot target workflow context fact '${targetContextFactDefinitionId}' of kind '${targetFact.kind}'`,
            ),
          });
        }

        return {
          ...item,
          ...(targetContextFactDefinitionId ? { targetContextFactDefinitionId } : {}),
        };
      }),
    };
  });

  return {
    ...payload,
    actions: normalizedActions,
  };
}

async function syncActionStepDefinition(
  tx: TransactionClient,
  versionId: string,
  workflowDefinitionId: string,
  stepId: string,
  payload: ActionStepPayload,
): Promise<ActionStepPayload> {
  const facts = await readWorkflowContextFacts(tx, versionId, workflowDefinitionId);
  const factByIdentifier = buildFactIdentifierMap(facts);
  const normalizedPayload = normalizeActionStepPayload(
    workflowDefinitionId,
    factByIdentifier,
    payload,
  );

  await tx
    .insert(methodologyWorkflowActionSteps)
    .values({
      stepId,
      executionMode: normalizedPayload.executionMode,
    })
    .onConflictDoUpdate({
      target: methodologyWorkflowActionSteps.stepId,
      set: { executionMode: normalizedPayload.executionMode },
    });

  const existingActions = await tx
    .select()
    .from(methodologyWorkflowActionStepActions)
    .where(eq(methodologyWorkflowActionStepActions.actionStepId, stepId))
    .orderBy(
      asc(methodologyWorkflowActionStepActions.sortOrder),
      asc(methodologyWorkflowActionStepActions.id),
    );

  const existingActionsByActionId = new Map(existingActions.map((row) => [row.actionId, row]));
  const retainedActionRowIds = existingActions
    .filter((row) => normalizedPayload.actions.some((action) => action.actionId === row.actionId))
    .map((row) => row.id);

  if (retainedActionRowIds.length > 0) {
    for (const [index, rowId] of retainedActionRowIds.entries()) {
      await tx
        .update(methodologyWorkflowActionStepActions)
        .set({ actionKey: `__reconciling__${index}__${rowId}` })
        .where(eq(methodologyWorkflowActionStepActions.id, rowId));
    }
  }

  const payloadActionIds = new Set(normalizedPayload.actions.map((action) => action.actionId));
  const removedActionRowIds = existingActions
    .filter((row) => !payloadActionIds.has(row.actionId))
    .map((row) => row.id);
  if (removedActionRowIds.length > 0) {
    await tx
      .delete(methodologyWorkflowActionStepActions)
      .where(inArray(methodologyWorkflowActionStepActions.id, removedActionRowIds));
  }

  for (const action of normalizedPayload.actions) {
    const existingAction = existingActionsByActionId.get(action.actionId);

    if (existingAction) {
      await tx
        .update(methodologyWorkflowActionStepActions)
        .set({
          actionKey: action.actionKey,
          label: action.label ?? null,
          enabled: action.enabled,
          sortOrder: action.sortOrder,
          actionKind: action.actionKind,
          contextFactDefinitionId: action.contextFactDefinitionId,
          contextFactKind: action.contextFactKind,
        })
        .where(eq(methodologyWorkflowActionStepActions.id, existingAction.id));

      const existingItems = await tx
        .select()
        .from(methodologyWorkflowActionStepActionItems)
        .where(eq(methodologyWorkflowActionStepActionItems.actionRowId, existingAction.id))
        .orderBy(
          asc(methodologyWorkflowActionStepActionItems.sortOrder),
          asc(methodologyWorkflowActionStepActionItems.id),
        );
      const existingItemsByItemId = new Map(existingItems.map((row) => [row.itemId, row]));
      const retainedItemRowIds = existingItems
        .filter((row) => action.items.some((item) => item.itemId === row.itemId))
        .map((row) => row.id);

      if (retainedItemRowIds.length > 0) {
        for (const [index, rowId] of retainedItemRowIds.entries()) {
          await tx
            .update(methodologyWorkflowActionStepActionItems)
            .set({ itemKey: `__reconciling__${index}__${rowId}` })
            .where(eq(methodologyWorkflowActionStepActionItems.id, rowId));
        }
      }

      const payloadItemIds = new Set(action.items.map((item) => item.itemId));
      const removedItemRowIds = existingItems
        .filter((row) => !payloadItemIds.has(row.itemId))
        .map((row) => row.id);
      if (removedItemRowIds.length > 0) {
        await tx
          .delete(methodologyWorkflowActionStepActionItems)
          .where(inArray(methodologyWorkflowActionStepActionItems.id, removedItemRowIds));
      }

      for (const item of action.items) {
        const existingItem = existingItemsByItemId.get(item.itemId);
        if (existingItem) {
          await tx
            .update(methodologyWorkflowActionStepActionItems)
            .set({
              itemKey: item.itemKey,
              label: item.label ?? null,
              targetContextFactDefinitionId: item.targetContextFactDefinitionId ?? null,
              sortOrder: item.sortOrder,
            })
            .where(eq(methodologyWorkflowActionStepActionItems.id, existingItem.id));
        } else {
          await tx.insert(methodologyWorkflowActionStepActionItems).values({
            actionRowId: existingAction.id,
            itemId: item.itemId,
            itemKey: item.itemKey,
            label: item.label ?? null,
            targetContextFactDefinitionId: item.targetContextFactDefinitionId ?? null,
            sortOrder: item.sortOrder,
          });
        }
      }
    } else {
      const inserted = await tx
        .insert(methodologyWorkflowActionStepActions)
        .values({
          actionStepId: stepId,
          actionId: action.actionId,
          actionKey: action.actionKey,
          label: action.label ?? null,
          enabled: action.enabled,
          sortOrder: action.sortOrder,
          actionKind: action.actionKind,
          contextFactDefinitionId: action.contextFactDefinitionId,
          contextFactKind: action.contextFactKind,
        })
        .returning({ id: methodologyWorkflowActionStepActions.id });

      const actionRowId = inserted[0]?.id;
      if (!actionRowId) {
        throw new Error(`Failed to persist action '${action.actionId}' for step '${stepId}'`);
      }

      if (action.items.length > 0) {
        await tx.insert(methodologyWorkflowActionStepActionItems).values(
          action.items.map((item) => ({
            actionRowId,
            itemId: item.itemId,
            itemKey: item.itemKey,
            label: item.label ?? null,
            targetContextFactDefinitionId: item.targetContextFactDefinitionId ?? null,
            sortOrder: item.sortOrder,
          })),
        );
      }
    }
  }

  return normalizedPayload;
}

async function readActionStepDefinition(
  db: DB | TransactionClient,
  params: GetActionStepDefinitionParams,
): Promise<WorkflowActionStepDefinitionReadModel | null> {
  const workflow = await findWorkflowRow(db, {
    versionId: params.versionId,
    workflowDefinitionId: params.workflowDefinitionId,
  });
  if (!workflow) {
    throw new Error(
      `Workflow not found for versionId=${params.versionId}, workflowDefinitionId=${params.workflowDefinitionId}`,
    );
  }

  const rows = await db
    .select({
      id: methodologyWorkflowSteps.id,
      key: methodologyWorkflowSteps.key,
      type: methodologyWorkflowSteps.type,
      displayName: methodologyWorkflowSteps.displayName,
      configJson: methodologyWorkflowSteps.configJson,
      guidanceJson: methodologyWorkflowSteps.guidanceJson,
      executionMode: methodologyWorkflowActionSteps.executionMode,
    })
    .from(methodologyWorkflowSteps)
    .innerJoin(
      methodologyWorkflowActionSteps,
      eq(methodologyWorkflowActionSteps.stepId, methodologyWorkflowSteps.id),
    )
    .where(
      and(
        eq(methodologyWorkflowSteps.id, params.stepId),
        eq(methodologyWorkflowSteps.workflowId, params.workflowDefinitionId),
        eq(methodologyWorkflowSteps.type, "action"),
      ),
    )
    .limit(1);

  const step = rows[0];
  if (!step) {
    return null;
  }

  const actionRows = await db
    .select()
    .from(methodologyWorkflowActionStepActions)
    .where(eq(methodologyWorkflowActionStepActions.actionStepId, params.stepId))
    .orderBy(
      asc(methodologyWorkflowActionStepActions.sortOrder),
      asc(methodologyWorkflowActionStepActions.id),
    );
  const actionRowIds = actionRows.map((row) => row.id);
  const itemRows =
    actionRowIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowActionStepActionItems)
          .where(inArray(methodologyWorkflowActionStepActionItems.actionRowId, actionRowIds))
          .orderBy(
            asc(methodologyWorkflowActionStepActionItems.actionRowId),
            asc(methodologyWorkflowActionStepActionItems.sortOrder),
            asc(methodologyWorkflowActionStepActionItems.id),
          );

  const itemsByActionRowId = new Map<string, ActionStepActionItemRow[]>();
  for (const row of itemRows) {
    const entries = itemsByActionRowId.get(row.actionRowId) ?? [];
    entries.push(row);
    itemsByActionRowId.set(row.actionRowId, entries);
  }

  return {
    stepId: step.id,
    payload: buildActionStepPayload(
      {
        id: step.id,
        methodologyVersionId: params.versionId,
        workflowId: params.workflowDefinitionId,
        key: step.key,
        type: step.type,
        displayName: step.displayName,
        configJson: step.configJson,
        guidanceJson: step.guidanceJson,
        createdAt: new Date(0),
        updatedAt: new Date(0),
      },
      { stepId: step.id, executionMode: step.executionMode },
      actionRows,
      itemsByActionRowId,
    ),
  };
}

function buildInvokePayload(
  step: StepRow,
  invokeStep: InvokeStepRow,
  bindings: readonly InvokeBindingRow[],
  transitions: readonly InvokeTransitionRow[],
): InvokeStepPayload {
  const payloadBase = {
    key: step.key,
    ...(step.displayName ? { label: step.displayName } : {}),
    ...(getContextFactDescriptionJson(
      isRecord(step.configJson) ? step.configJson.descriptionJson : undefined,
    )
      ? {
          descriptionJson: getContextFactDescriptionJson(
            isRecord(step.configJson) ? step.configJson.descriptionJson : undefined,
          ),
        }
      : {}),
    ...(getAudienceGuidance(step.guidanceJson)
      ? { guidance: getAudienceGuidance(step.guidanceJson) }
      : {}),
  };

  if (invokeStep.targetKind === "workflow" && invokeStep.sourceMode === "fixed_set") {
    return {
      ...payloadBase,
      targetKind: "workflow",
      sourceMode: "fixed_set",
      workflowDefinitionIds: Array.isArray(invokeStep.workflowDefinitionIds)
        ? invokeStep.workflowDefinitionIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    };
  }

  if (invokeStep.targetKind === "workflow" && invokeStep.sourceMode === "context_fact_backed") {
    if (!invokeStep.contextFactDefinitionId) {
      throw new Error(`Invoke step '${step.id}' is missing context-fact source`);
    }

    return {
      ...payloadBase,
      targetKind: "workflow",
      sourceMode: "context_fact_backed",
      contextFactDefinitionId: invokeStep.contextFactDefinitionId,
    };
  }

  const workUnitPayloadBase = {
    ...payloadBase,
    bindings: bindings.map((binding) => {
      const destination =
        binding.destinationKind === "work_unit_fact" && binding.workUnitFactDefinitionId
          ? {
              kind: "work_unit_fact" as const,
              workUnitFactDefinitionId: binding.workUnitFactDefinitionId,
            }
          : binding.destinationKind === "artifact_slot" && binding.artifactSlotDefinitionId
            ? {
                kind: "artifact_slot" as const,
                artifactSlotDefinitionId: binding.artifactSlotDefinitionId,
              }
            : null;

      if (!destination) {
        throw new Error(`Invoke binding '${binding.id}' is missing destination metadata`);
      }

      const source =
        binding.sourceKind === "context_fact" && binding.contextFactDefinitionId
          ? {
              kind: "context_fact" as const,
              contextFactDefinitionId: binding.contextFactDefinitionId,
            }
          : binding.sourceKind === "literal"
            ? {
                kind: "literal" as const,
                value: binding.literalValueJson as string | number | boolean,
              }
            : binding.sourceKind === "runtime"
              ? { kind: "runtime" as const }
              : null;

      if (!source) {
        throw new Error(`Invoke binding '${binding.id}' is missing source metadata`);
      }

      return { destination, source };
    }),
    activationTransitions: transitions.map((transition) => ({
      transitionId: transition.transitionId,
      workflowDefinitionIds: Array.isArray(transition.workflowDefinitionIds)
        ? transition.workflowDefinitionIds.filter(
            (value): value is string => typeof value === "string",
          )
        : [],
    })),
  };

  if (invokeStep.targetKind === "work_unit" && invokeStep.sourceMode === "fixed_set") {
    if (!invokeStep.workUnitDefinitionId) {
      throw new Error(`Invoke step '${step.id}' is missing work-unit target`);
    }

    return {
      ...workUnitPayloadBase,
      targetKind: "work_unit",
      sourceMode: "fixed_set",
      workUnitDefinitionId: invokeStep.workUnitDefinitionId,
    };
  }

  if (!invokeStep.contextFactDefinitionId) {
    throw new Error(`Invoke step '${step.id}' is missing context-fact source`);
  }

  return {
    ...workUnitPayloadBase,
    targetKind: "work_unit",
    sourceMode: "context_fact_backed",
    contextFactDefinitionId: invokeStep.contextFactDefinitionId,
  };
}

async function syncInvokeStepDefinition(
  tx: TransactionClient,
  versionId: string,
  stepId: string,
  payload: InvokeStepPayload,
): Promise<void> {
  await tx
    .insert(methodologyWorkflowInvokeSteps)
    .values({
      stepId,
      targetKind: payload.targetKind,
      sourceMode: payload.sourceMode,
      workflowDefinitionIds:
        payload.targetKind === "workflow" && payload.sourceMode === "fixed_set"
          ? payload.workflowDefinitionIds
          : null,
      workUnitDefinitionId:
        payload.targetKind === "work_unit" && payload.sourceMode === "fixed_set"
          ? payload.workUnitDefinitionId
          : null,
      contextFactDefinitionId:
        payload.sourceMode === "context_fact_backed" ? payload.contextFactDefinitionId : null,
      configJson: null,
    })
    .onConflictDoUpdate({
      target: methodologyWorkflowInvokeSteps.stepId,
      set: {
        targetKind: payload.targetKind,
        sourceMode: payload.sourceMode,
        workflowDefinitionIds:
          payload.targetKind === "workflow" && payload.sourceMode === "fixed_set"
            ? payload.workflowDefinitionIds
            : null,
        workUnitDefinitionId:
          payload.targetKind === "work_unit" && payload.sourceMode === "fixed_set"
            ? payload.workUnitDefinitionId
            : null,
        contextFactDefinitionId:
          payload.sourceMode === "context_fact_backed" ? payload.contextFactDefinitionId : null,
        configJson: null,
      },
    });

  const desiredBindings =
    payload.targetKind === "work_unit"
      ? payload.bindings.map((binding, index) => ({
          ...binding,
          destinationKey: getInvokeBindingDestinationKey(binding),
          sortOrder: index,
        }))
      : [];
  const existingBindings = await tx
    .select()
    .from(methodologyWorkflowInvokeBindings)
    .where(eq(methodologyWorkflowInvokeBindings.invokeStepId, stepId));
  const existingBindingByDestinationKey = new Map(
    existingBindings.map((row) => [row.destinationKey, row]),
  );
  const desiredDestinationKeys = new Set(desiredBindings.map((binding) => binding.destinationKey));

  if (existingBindings.length > 0) {
    const bindingIdsToDelete = existingBindings
      .filter((row) => !desiredDestinationKeys.has(row.destinationKey))
      .map((row) => row.id);
    if (bindingIdsToDelete.length > 0) {
      await tx
        .delete(methodologyWorkflowInvokeBindings)
        .where(inArray(methodologyWorkflowInvokeBindings.id, bindingIdsToDelete));
    }
  }

  for (const binding of desiredBindings) {
    const existing = existingBindingByDestinationKey.get(binding.destinationKey);
    const destinationFields =
      binding.destination.kind === "work_unit_fact"
        ? {
            destinationKind: "work_unit_fact" as const,
            destinationKey: binding.destinationKey,
            workUnitFactDefinitionId: binding.destination.workUnitFactDefinitionId,
            artifactSlotDefinitionId: null,
          }
        : {
            destinationKind: "artifact_slot" as const,
            destinationKey: binding.destinationKey,
            workUnitFactDefinitionId: null,
            artifactSlotDefinitionId: binding.destination.artifactSlotDefinitionId,
          };
    const sourceFields =
      binding.source.kind === "context_fact"
        ? {
            sourceKind: "context_fact" as const,
            contextFactDefinitionId: binding.source.contextFactDefinitionId,
            literalValueJson: null,
          }
        : binding.source.kind === "literal"
          ? {
              sourceKind: "literal" as const,
              contextFactDefinitionId: null,
              literalValueJson: binding.source.value,
            }
          : {
              sourceKind: "runtime" as const,
              contextFactDefinitionId: null,
              literalValueJson: null,
            };
    if (existing) {
      await tx
        .update(methodologyWorkflowInvokeBindings)
        .set({
          ...destinationFields,
          ...sourceFields,
          sortOrder: binding.sortOrder,
        })
        .where(eq(methodologyWorkflowInvokeBindings.id, existing.id));
      continue;
    }

    await tx.insert(methodologyWorkflowInvokeBindings).values({
      invokeStepId: stepId,
      ...destinationFields,
      ...sourceFields,
      sortOrder: binding.sortOrder,
    });
  }

  const desiredTransitions =
    payload.targetKind === "work_unit"
      ? (
          await validateInvokeActivationTransitionIds(
            tx,
            versionId,
            payload,
            payload.activationTransitions,
          )
        ).map((transition, index) => ({ ...transition, sortOrder: index }))
      : [];
  const existingTransitions = await tx
    .select()
    .from(methodologyWorkflowInvokeTransitions)
    .where(eq(methodologyWorkflowInvokeTransitions.invokeStepId, stepId));
  const existingTransitionById = new Map(existingTransitions.map((row) => [row.transitionId, row]));
  const desiredTransitionIds = new Set(
    desiredTransitions.map((transition) => transition.transitionId),
  );

  if (existingTransitions.length > 0) {
    const transitionIdsToDelete = existingTransitions
      .filter((row) => !desiredTransitionIds.has(row.transitionId))
      .map((row) => row.id);
    if (transitionIdsToDelete.length > 0) {
      await tx
        .delete(methodologyWorkflowInvokeTransitions)
        .where(inArray(methodologyWorkflowInvokeTransitions.id, transitionIdsToDelete));
    }
  }

  for (const transition of desiredTransitions) {
    const existing = existingTransitionById.get(transition.transitionId);
    if (existing) {
      await tx
        .update(methodologyWorkflowInvokeTransitions)
        .set({
          workflowDefinitionIds: transition.workflowDefinitionIds,
          sortOrder: transition.sortOrder,
        })
        .where(eq(methodologyWorkflowInvokeTransitions.id, existing.id));
      continue;
    }

    await tx.insert(methodologyWorkflowInvokeTransitions).values({
      invokeStepId: stepId,
      transitionId: transition.transitionId,
      workflowDefinitionIds: transition.workflowDefinitionIds,
      sortOrder: transition.sortOrder,
    });
  }
}

async function validateInvokeActivationTransitionIds(
  tx: TransactionClient,
  versionId: string,
  payload: Extract<InvokeStepPayload, { targetKind: "work_unit" }>,
  transitions: readonly { transitionId: string; workflowDefinitionIds: readonly string[] }[],
): Promise<Array<{ transitionId: string; workflowDefinitionIds: string[] }>> {
  if (transitions.length === 0) {
    return [];
  }

  const requestedTransitionIds = [
    ...new Set(transitions.map((transition) => transition.transitionId)),
  ];

  const transitionRows = await tx
    .select({
      id: workUnitLifecycleTransitions.id,
      workUnitTypeId: workUnitLifecycleTransitions.workUnitTypeId,
    })
    .from(workUnitLifecycleTransitions)
    .where(
      and(
        eq(workUnitLifecycleTransitions.methodologyVersionId, versionId),
        inArray(workUnitLifecycleTransitions.id, requestedTransitionIds),
      ),
    );

  const targetWorkUnitTypeId =
    payload.sourceMode === "fixed_set" ? payload.workUnitDefinitionId : null;

  const transitionById = new Map(transitionRows.map((row) => [row.id, row]));

  for (const transitionId of requestedTransitionIds) {
    if (!transitionById.has(transitionId)) {
      throw new Error(
        `Invoke activation transition id '${transitionId}' does not exist for version '${versionId}'.`,
      );
    }
  }

  if (targetWorkUnitTypeId) {
    for (const transition of transitions) {
      const matched = transitionById.get(transition.transitionId);
      if (!matched) {
        continue;
      }
      if (matched.workUnitTypeId !== targetWorkUnitTypeId) {
        throw new Error(
          `Invoke activation transition id '${transition.transitionId}' does not belong to work unit '${targetWorkUnitTypeId}'.`,
        );
      }
    }
  }

  const normalized = transitions.map((transition) => ({
    transitionId: transition.transitionId,
    workflowDefinitionIds: [...transition.workflowDefinitionIds],
  }));

  const seenIds = new Set<string>();
  for (const transition of normalized) {
    if (seenIds.has(transition.transitionId)) {
      throw new Error(
        `Invoke activation transitions must resolve to unique transition ids; duplicate '${transition.transitionId}' found.`,
      );
    }
    seenIds.add(transition.transitionId);
  }

  return normalized;
}

async function readInvokeStepDefinition(
  db: DB | TransactionClient,
  params: GetInvokeStepDefinitionParams,
): Promise<InvokeStepDefinitionReadModel | null> {
  const workflow = await findWorkflowRow(db, {
    versionId: params.versionId,
    workflowDefinitionId: params.workflowDefinitionId,
  });
  if (!workflow) {
    throw new Error(
      `Workflow not found for versionId=${params.versionId}, workflowDefinitionId=${params.workflowDefinitionId}`,
    );
  }

  const stepRows = await db
    .select({
      step: methodologyWorkflowSteps,
      invoke: methodologyWorkflowInvokeSteps,
    })
    .from(methodologyWorkflowSteps)
    .innerJoin(
      methodologyWorkflowInvokeSteps,
      eq(methodologyWorkflowInvokeSteps.stepId, methodologyWorkflowSteps.id),
    )
    .where(
      and(
        eq(methodologyWorkflowSteps.workflowId, params.workflowDefinitionId),
        eq(methodologyWorkflowSteps.id, params.stepId),
        eq(methodologyWorkflowSteps.type, "invoke"),
      ),
    )
    .limit(1);
  const row = stepRows[0];
  if (!row) {
    return null;
  }

  const [bindingRows, transitionRows] = await Promise.all([
    db
      .select()
      .from(methodologyWorkflowInvokeBindings)
      .where(eq(methodologyWorkflowInvokeBindings.invokeStepId, params.stepId))
      .orderBy(
        asc(methodologyWorkflowInvokeBindings.sortOrder),
        asc(methodologyWorkflowInvokeBindings.id),
      ),
    db
      .select()
      .from(methodologyWorkflowInvokeTransitions)
      .where(eq(methodologyWorkflowInvokeTransitions.invokeStepId, params.stepId))
      .orderBy(
        asc(methodologyWorkflowInvokeTransitions.sortOrder),
        asc(methodologyWorkflowInvokeTransitions.id),
      ),
  ]);

  return {
    stepId: params.stepId,
    payload: buildInvokePayload(row.step, row.invoke, bindingRows, transitionRows),
  };
}

function buildBranchPayload(
  step: StepRow,
  branchStep: typeof methodologyWorkflowBranchSteps.$inferSelect,
  routes: readonly BranchRouteRow[],
  groups: readonly BranchRouteGroupRow[],
  conditions: readonly BranchRouteConditionRow[],
): BranchStepPayload {
  const toBranchConditionOperator = (operator: string) => {
    if (operator === "exists" || operator === "equals") {
      return operator;
    }

    throw new Error(
      `Unsupported stored branch condition operator '${operator}' for Plan A authoring`,
    );
  };

  const groupsByRouteDbId = new Map<string, readonly BranchRouteGroupRow[]>();
  for (const group of groups) {
    const entries = groupsByRouteDbId.get(group.routeId) ?? [];
    groupsByRouteDbId.set(group.routeId, [...entries, group]);
  }

  const conditionsByGroupDbId = new Map<string, readonly BranchRouteConditionRow[]>();
  for (const condition of conditions) {
    const entries = conditionsByGroupDbId.get(condition.groupId) ?? [];
    conditionsByGroupDbId.set(condition.groupId, [...entries, condition]);
  }

  return {
    key: step.key,
    ...(step.displayName ? { label: step.displayName } : {}),
    ...(getContextFactDescriptionJson(
      isRecord(step.configJson) ? step.configJson.descriptionJson : undefined,
    )
      ? {
          descriptionJson: getContextFactDescriptionJson(
            isRecord(step.configJson) ? step.configJson.descriptionJson : undefined,
          ),
        }
      : {}),
    ...(getAudienceGuidance(step.guidanceJson)
      ? { guidance: getAudienceGuidance(step.guidanceJson) }
      : {}),
    defaultTargetStepId: branchStep.defaultTargetStepId,
    routes: routes.map((route) => ({
      routeId: route.routeId,
      targetStepId: route.targetStepId,
      conditionMode: route.conditionMode as "all" | "any",
      groups: (groupsByRouteDbId.get(route.id) ?? []).map((group) => ({
        groupId: group.groupId,
        mode: group.mode as "all" | "any",
        conditions: (conditionsByGroupDbId.get(group.id) ?? []).map((condition) => ({
          conditionId: condition.conditionId,
          contextFactDefinitionId: condition.contextFactDefinitionId,
          subFieldKey: condition.subFieldKey,
          operator: toBranchConditionOperator(condition.operator),
          isNegated: condition.isNegated,
          comparisonJson: condition.comparisonJson,
        })),
      })),
    })),
  };
}

async function syncBranchStepDefinition(
  tx: TransactionClient,
  stepId: string,
  payload: BranchStepPayload,
): Promise<void> {
  await tx
    .insert(methodologyWorkflowBranchSteps)
    .values({
      stepId,
      defaultTargetStepId: payload.defaultTargetStepId,
      configJson: null,
    })
    .onConflictDoUpdate({
      target: methodologyWorkflowBranchSteps.stepId,
      set: {
        defaultTargetStepId: payload.defaultTargetStepId,
        configJson: null,
      },
    });

  const existingRoutes = await tx
    .select()
    .from(methodologyWorkflowBranchRoutes)
    .where(eq(methodologyWorkflowBranchRoutes.branchStepId, stepId));
  const existingRouteByRouteId = new Map(existingRoutes.map((row) => [row.routeId, row]));
  const desiredRouteIds = new Set(payload.routes.map((route) => route.routeId));
  const routeDbIdsToDelete = existingRoutes
    .filter((row) => !desiredRouteIds.has(row.routeId))
    .map((row) => row.id);
  if (routeDbIdsToDelete.length > 0) {
    await tx
      .delete(methodologyWorkflowBranchRoutes)
      .where(inArray(methodologyWorkflowBranchRoutes.id, routeDbIdsToDelete));
  }

  const routeDbIdByRouteId = new Map<string, string>();
  for (const [index, route] of payload.routes.entries()) {
    const existing = existingRouteByRouteId.get(route.routeId);
    if (existing) {
      await tx
        .update(methodologyWorkflowBranchRoutes)
        .set({
          targetStepId: route.targetStepId,
          conditionMode: route.conditionMode,
          sortOrder: index,
        })
        .where(eq(methodologyWorkflowBranchRoutes.id, existing.id));
      routeDbIdByRouteId.set(route.routeId, existing.id);
      continue;
    }

    const inserted = await tx
      .insert(methodologyWorkflowBranchRoutes)
      .values({
        branchStepId: stepId,
        routeId: route.routeId,
        targetStepId: route.targetStepId,
        conditionMode: route.conditionMode,
        sortOrder: index,
      })
      .returning({ id: methodologyWorkflowBranchRoutes.id });
    const routeDbId = inserted[0]?.id;
    if (!routeDbId) {
      throw new Error(`Failed to persist branch route '${route.routeId}'`);
    }
    routeDbIdByRouteId.set(route.routeId, routeDbId);
  }

  const routeDbIds = [...routeDbIdByRouteId.values()];
  const existingGroups =
    routeDbIds.length === 0
      ? []
      : await tx
          .select()
          .from(methodologyWorkflowBranchRouteGroups)
          .where(inArray(methodologyWorkflowBranchRouteGroups.routeId, routeDbIds));
  const existingGroupByRouteAndGroupId = new Map(
    existingGroups.map((row) => [`${row.routeId}:${row.groupId}`, row]),
  );
  const desiredGroupKeys = new Set(
    payload.routes.flatMap((route) =>
      route.groups.map(
        (group) => `${routeDbIdByRouteId.get(route.routeId) ?? ""}:${group.groupId}`,
      ),
    ),
  );
  const groupDbIdsToDelete = existingGroups
    .filter((row) => !desiredGroupKeys.has(`${row.routeId}:${row.groupId}`))
    .map((row) => row.id);
  if (groupDbIdsToDelete.length > 0) {
    await tx
      .delete(methodologyWorkflowBranchRouteGroups)
      .where(inArray(methodologyWorkflowBranchRouteGroups.id, groupDbIdsToDelete));
  }

  const groupDbIdByRouteAndGroupId = new Map<string, string>();
  for (const route of payload.routes) {
    const routeDbId = routeDbIdByRouteId.get(route.routeId);
    if (!routeDbId) {
      throw new Error(`Branch route '${route.routeId}' is missing a persisted row`);
    }

    for (const [groupIndex, group] of route.groups.entries()) {
      const key = `${routeDbId}:${group.groupId}`;
      const existing = existingGroupByRouteAndGroupId.get(key);
      if (existing) {
        await tx
          .update(methodologyWorkflowBranchRouteGroups)
          .set({ mode: group.mode, sortOrder: groupIndex })
          .where(eq(methodologyWorkflowBranchRouteGroups.id, existing.id));
        groupDbIdByRouteAndGroupId.set(key, existing.id);
        continue;
      }

      const inserted = await tx
        .insert(methodologyWorkflowBranchRouteGroups)
        .values({
          routeId: routeDbId,
          groupId: group.groupId,
          mode: group.mode,
          sortOrder: groupIndex,
        })
        .returning({ id: methodologyWorkflowBranchRouteGroups.id });
      const groupDbId = inserted[0]?.id;
      if (!groupDbId) {
        throw new Error(`Failed to persist branch group '${group.groupId}'`);
      }
      groupDbIdByRouteAndGroupId.set(key, groupDbId);
    }
  }

  const groupDbIds = [...groupDbIdByRouteAndGroupId.values()];
  const existingConditions =
    groupDbIds.length === 0
      ? []
      : await tx
          .select()
          .from(methodologyWorkflowBranchRouteConditions)
          .where(inArray(methodologyWorkflowBranchRouteConditions.groupId, groupDbIds));
  const existingConditionByGroupAndConditionId = new Map(
    existingConditions.map((row) => [`${row.groupId}:${row.conditionId}`, row]),
  );
  const desiredConditionKeys = new Set(
    payload.routes.flatMap((route) =>
      route.groups.flatMap((group) => {
        const groupDbId = groupDbIdByRouteAndGroupId.get(
          `${routeDbIdByRouteId.get(route.routeId) ?? ""}:${group.groupId}`,
        );
        return group.conditions.map((condition) => `${groupDbId ?? ""}:${condition.conditionId}`);
      }),
    ),
  );
  const conditionDbIdsToDelete = existingConditions
    .filter((row) => !desiredConditionKeys.has(`${row.groupId}:${row.conditionId}`))
    .map((row) => row.id);
  if (conditionDbIdsToDelete.length > 0) {
    await tx
      .delete(methodologyWorkflowBranchRouteConditions)
      .where(inArray(methodologyWorkflowBranchRouteConditions.id, conditionDbIdsToDelete));
  }

  for (const route of payload.routes) {
    const routeDbId = routeDbIdByRouteId.get(route.routeId);
    if (!routeDbId) continue;

    for (const group of route.groups) {
      const groupDbId = groupDbIdByRouteAndGroupId.get(`${routeDbId}:${group.groupId}`);
      if (!groupDbId) continue;

      for (const [conditionIndex, condition] of group.conditions.entries()) {
        const key = `${groupDbId}:${condition.conditionId}`;
        const existing = existingConditionByGroupAndConditionId.get(key);
        if (existing) {
          await tx
            .update(methodologyWorkflowBranchRouteConditions)
            .set({
              contextFactDefinitionId: condition.contextFactDefinitionId,
              subFieldKey: condition.subFieldKey,
              operator: condition.operator,
              isNegated: condition.isNegated,
              comparisonJson: condition.comparisonJson,
              sortOrder: conditionIndex,
            })
            .where(eq(methodologyWorkflowBranchRouteConditions.id, existing.id));
          continue;
        }

        await tx.insert(methodologyWorkflowBranchRouteConditions).values({
          groupId: groupDbId,
          conditionId: condition.conditionId,
          contextFactDefinitionId: condition.contextFactDefinitionId,
          subFieldKey: condition.subFieldKey,
          operator: condition.operator,
          isNegated: condition.isNegated,
          comparisonJson: condition.comparisonJson,
          sortOrder: conditionIndex,
        });
      }
    }
  }
}

async function readBranchStepDefinition(
  db: DB | TransactionClient,
  params: GetBranchStepDefinitionParams,
): Promise<BranchStepDefinitionReadModel | null> {
  const workflow = await findWorkflowRow(db, {
    versionId: params.versionId,
    workflowDefinitionId: params.workflowDefinitionId,
  });
  if (!workflow) {
    throw new Error(
      `Workflow not found for versionId=${params.versionId}, workflowDefinitionId=${params.workflowDefinitionId}`,
    );
  }

  const stepRows = await db
    .select({
      step: methodologyWorkflowSteps,
      branch: methodologyWorkflowBranchSteps,
    })
    .from(methodologyWorkflowSteps)
    .innerJoin(
      methodologyWorkflowBranchSteps,
      eq(methodologyWorkflowBranchSteps.stepId, methodologyWorkflowSteps.id),
    )
    .where(
      and(
        eq(methodologyWorkflowSteps.workflowId, params.workflowDefinitionId),
        eq(methodologyWorkflowSteps.id, params.stepId),
        eq(methodologyWorkflowSteps.type, "branch"),
      ),
    )
    .limit(1);
  const row = stepRows[0];
  if (!row) {
    return null;
  }

  const routes = await db
    .select()
    .from(methodologyWorkflowBranchRoutes)
    .where(eq(methodologyWorkflowBranchRoutes.branchStepId, params.stepId))
    .orderBy(
      asc(methodologyWorkflowBranchRoutes.sortOrder),
      asc(methodologyWorkflowBranchRoutes.id),
    );
  const routeDbIds = routes.map((route) => route.id);
  const groups =
    routeDbIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowBranchRouteGroups)
          .where(inArray(methodologyWorkflowBranchRouteGroups.routeId, routeDbIds))
          .orderBy(
            asc(methodologyWorkflowBranchRouteGroups.sortOrder),
            asc(methodologyWorkflowBranchRouteGroups.id),
          );
  const groupDbIds = groups.map((group) => group.id);
  const conditions =
    groupDbIds.length === 0
      ? []
      : await db
          .select()
          .from(methodologyWorkflowBranchRouteConditions)
          .where(inArray(methodologyWorkflowBranchRouteConditions.groupId, groupDbIds))
          .orderBy(
            asc(methodologyWorkflowBranchRouteConditions.sortOrder),
            asc(methodologyWorkflowBranchRouteConditions.id),
          );

  return {
    stepId: params.stepId,
    payload: buildBranchPayload(row.step, row.branch, routes, groups, conditions),
  };
}

async function deleteWorkflowStepDefinition(
  tx: TransactionClient,
  workflow: Awaited<ReturnType<typeof findWorkflowRow>>,
  workflowDefinitionId: string,
  stepId: string,
): Promise<void> {
  if (!workflow) {
    throw new Error(`Workflow not found for workflowDefinitionId=${workflowDefinitionId}`);
  }

  const outgoingEdges = await tx
    .select({ id: methodologyWorkflowEdges.id, toStepId: methodologyWorkflowEdges.toStepId })
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

  const successorId = outgoingEdges.length === 1 ? (outgoingEdges[0]?.toStepId ?? null) : null;
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
          workflowMetadata && Object.keys(workflowMetadata).length > 0 ? workflowMetadata : null,
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
        descriptionJson:
          "descriptionJson" in edge && edge.descriptionJson !== undefined
            ? edge.descriptionJson
            : null,
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

          if (params.rewriteWorkflowGraph !== false) {
            await syncWorkflowGraph(
              tx,
              ver.id,
              params.workflows,
              params.transitionWorkflowBindings,
              params.guidance,
            );
          }

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
              validationJson: normalizeMethodologyFactValidationForStorage(v.validation),
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

          if (params.rewriteWorkflowGraph !== false) {
            await syncWorkflowGraph(
              tx,
              ver.id,
              params.workflows,
              params.transitionWorkflowBindings,
              params.guidance,
            );
          }

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
                validationJson: normalizeMethodologyFactValidationForStorage(v.validation),
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
            descriptionJson: methodologyWorkflowEdges.descriptionJson,
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
            ...(edgeRow.descriptionJson
              ? { descriptionJson: edgeRow.descriptionJson as { readonly markdown: string } }
              : {}),
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
              descriptionJson:
                "descriptionJson" in edge && edge.descriptionJson !== undefined
                  ? edge.descriptionJson
                  : null,
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
              descriptionJson:
                "descriptionJson" in edge && edge.descriptionJson !== undefined
                  ? edge.descriptionJson
                  : null,
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
            id: methodologyFactDefinitions.id,
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
            workUnitTypeId,
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

    findInvokeBindingWorkUnitFactDefinitionsByIds: ({ versionId, ids }) =>
      dbEffect("methodology.findInvokeBindingWorkUnitFactDefinitionsByIds", async () => {
        if (ids.length === 0) {
          return [];
        }

        return db
          .select({
            id: workUnitFactDefinitions.id,
            workUnitTypeId: workUnitFactDefinitions.workUnitTypeId,
            key: workUnitFactDefinitions.key,
            factType: workUnitFactDefinitions.factType,
            cardinality: workUnitFactDefinitions.cardinality,
            validationJson: workUnitFactDefinitions.validationJson,
          })
          .from(workUnitFactDefinitions)
          .where(
            and(
              eq(workUnitFactDefinitions.methodologyVersionId, versionId),
              inArray(workUnitFactDefinitions.id, ids),
            ),
          );
      }),

    findInvokeBindingArtifactSlotDefinitionsByIds: ({ versionId, ids }) =>
      dbEffect("methodology.findInvokeBindingArtifactSlotDefinitionsByIds", async () => {
        if (ids.length === 0) {
          return [];
        }

        const rows = await db
          .select({
            id: methodologyArtifactSlotDefinitions.id,
            workUnitTypeId: methodologyArtifactSlotDefinitions.workUnitTypeId,
            key: methodologyArtifactSlotDefinitions.key,
            cardinality: methodologyArtifactSlotDefinitions.cardinality,
          })
          .from(methodologyArtifactSlotDefinitions)
          .where(
            and(
              eq(methodologyArtifactSlotDefinitions.methodologyVersionId, versionId),
              inArray(methodologyArtifactSlotDefinitions.id, ids),
            ),
          );

        return rows.map((row) => ({
          ...row,
          cardinality: row.cardinality === "fileset" ? ("fileset" as const) : ("single" as const),
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
            await validateDraftSpecSelections(
              tx,
              fact.workUnitDefinitionId,
              fact.selectedWorkUnitFactDefinitionIds,
              fact.selectedArtifactSlotDefinitionIds,
            );
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
            await validateDraftSpecSelections(
              tx,
              fact.workUnitDefinitionId,
              fact.selectedWorkUnitFactDefinitionIds,
              fact.selectedArtifactSlotDefinitionIds,
            );
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
                descriptionJson: null,
              });

              const successorId = outgoingEdges[0]?.toStepId ?? null;
              if (successorId) {
                await tx.insert(methodologyWorkflowEdges).values({
                  methodologyVersionId: versionId,
                  workflowId: workflowDefinitionId,
                  fromStepId: step.id,
                  toStepId: successorId,
                  edgeKey: null,
                  descriptionJson: null,
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

    createActionStepDefinition: ({ versionId, workflowDefinitionId, afterStepKey, payload }) =>
      dbEffect("methodology.createActionStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .insert(methodologyWorkflowSteps)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflowDefinitionId,
              key: payload.key,
              type: "action",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .returning();
          const step = rows[0];
          if (!step) {
            throw new Error(`Failed to create action step '${payload.key}'`);
          }

          const normalizedPayload = await syncActionStepDefinition(
            tx,
            versionId,
            workflowDefinitionId,
            step.id,
            payload,
          );

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
                descriptionJson: null,
              });

              const successorId = outgoingEdges[0]?.toStepId ?? null;
              if (successorId) {
                await tx.insert(methodologyWorkflowEdges).values({
                  methodologyVersionId: versionId,
                  workflowId: workflowDefinitionId,
                  fromStepId: step.id,
                  toStepId: successorId,
                  edgeKey: null,
                  descriptionJson: null,
                });
              }
            }
          }

          return { stepId: step.id, payload: normalizedPayload };
        }),
      ),

    updateActionStepDefinition: ({ versionId, workflowDefinitionId, stepId, payload }) =>
      dbEffect("methodology.updateActionStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: payload.key,
              type: "action",
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
            throw new Error(`Action step '${stepId}' not found`);
          }

          const normalizedPayload = await syncActionStepDefinition(
            tx,
            versionId,
            workflowDefinitionId,
            stepId,
            payload,
          );

          return { stepId, payload: normalizedPayload };
        }),
      ),

    deleteActionStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.deleteActionStepDefinition", () =>
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

    getActionStepDefinition: (params) =>
      dbEffect("methodology.getActionStepDefinition", () => readActionStepDefinition(db, params)),

    listAgentStepDefinitions: ({ versionId, workflowDefinitionId }) =>
      dbEffect("methodology.listAgentStepDefinitions", async () => {
        const workflow = await findWorkflowRow(db, { versionId, workflowDefinitionId });
        if (!workflow) {
          throw new Error(
            `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
          );
        }

        return readWorkflowAgentDefinitions(db, versionId, workflowDefinitionId);
      }),

    getAgentStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.getAgentStepDefinition", async () => {
        const workflow = await findWorkflowRow(db, { versionId, workflowDefinitionId });
        if (!workflow) {
          throw new Error(
            `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
          );
        }

        const definitions = await readWorkflowAgentDefinitions(db, versionId, workflowDefinitionId);
        const definition = definitions.find((entry) => entry.stepId === stepId);
        if (!definition) {
          throw new Error(
            `Agent step '${stepId}' not found for workflowDefinitionId=${workflowDefinitionId}`,
          );
        }

        return definition;
      }),

    createAgentStepDefinition: ({ versionId, workflowDefinitionId, afterStepKey, payload }) =>
      dbEffect("methodology.createAgentStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .insert(methodologyWorkflowSteps)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflowDefinitionId,
              key: payload.key,
              type: "agent",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .returning();
          const step = rows[0];
          if (!step) {
            throw new Error(`Failed to create agent step '${payload.key}'`);
          }

          const normalizedPayload = await syncAgentStepDefinition(
            tx,
            versionId,
            workflowDefinitionId,
            step.id,
            payload,
          );

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
                descriptionJson: null,
              });

              const successorId = outgoingEdges[0]?.toStepId ?? null;
              if (successorId) {
                await tx.insert(methodologyWorkflowEdges).values({
                  methodologyVersionId: versionId,
                  workflowId: workflowDefinitionId,
                  fromStepId: step.id,
                  toStepId: successorId,
                  edgeKey: null,
                  descriptionJson: null,
                });
              }
            }
          }

          return { stepId: step.id, payload: normalizedPayload };
        }),
      ),

    updateAgentStepDefinition: ({ versionId, workflowDefinitionId, stepId, payload }) =>
      dbEffect("methodology.updateAgentStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: payload.key,
              type: "agent",
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
            throw new Error(`Agent step '${stepId}' not found`);
          }

          const normalizedPayload = await syncAgentStepDefinition(
            tx,
            versionId,
            workflowDefinitionId,
            stepId,
            payload,
          );

          return { stepId, payload: normalizedPayload };
        }),
      ),

    deleteAgentStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.deleteAgentStepDefinition", () =>
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

    createInvokeStepDefinition: ({ versionId, workflowDefinitionId, payload }) =>
      dbEffect("methodology.createInvokeStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .insert(methodologyWorkflowSteps)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflowDefinitionId,
              key: payload.key,
              type: "invoke",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .returning();
          const step = rows[0];
          if (!step) {
            throw new Error(`Failed to create invoke step '${payload.key}'`);
          }

          await syncInvokeStepDefinition(tx, versionId, step.id, payload);

          return { stepId: step.id, payload } satisfies InvokeStepDefinitionReadModel;
        }),
      ),

    updateInvokeStepDefinition: ({ versionId, workflowDefinitionId, stepId, payload }) =>
      dbEffect("methodology.updateInvokeStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: payload.key,
              type: "invoke",
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
            throw new Error(`Invoke step '${stepId}' not found`);
          }

          await syncInvokeStepDefinition(tx, versionId, stepId, payload);

          return { stepId, payload } satisfies InvokeStepDefinitionReadModel;
        }),
      ),

    deleteInvokeStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.deleteInvokeStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          await deleteWorkflowStepDefinition(tx, workflow, workflowDefinitionId, stepId);
        }),
      ),

    getInvokeStepDefinition: (params) =>
      dbEffect("methodology.getInvokeStepDefinition", () => readInvokeStepDefinition(db, params)),

    createBranchStepDefinition: ({ versionId, workflowDefinitionId, payload }) =>
      dbEffect("methodology.createBranchStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .insert(methodologyWorkflowSteps)
            .values({
              methodologyVersionId: versionId,
              workflowId: workflowDefinitionId,
              key: payload.key,
              type: "branch",
              displayName: payload.label ?? null,
              configJson: { descriptionJson: payload.descriptionJson ?? null },
              guidanceJson: payload.guidance ?? null,
            })
            .returning();
          const step = rows[0];
          if (!step) {
            throw new Error(`Failed to create branch step '${payload.key}'`);
          }

          await syncBranchStepDefinition(tx, step.id, payload);

          return { stepId: step.id, payload } satisfies BranchStepDefinitionReadModel;
        }),
      ),

    updateBranchStepDefinition: ({ versionId, workflowDefinitionId, stepId, payload }) =>
      dbEffect("methodology.updateBranchStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          const rows = await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: payload.key,
              type: "branch",
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
            throw new Error(`Branch step '${stepId}' not found`);
          }

          await syncBranchStepDefinition(tx, stepId, payload);

          return { stepId, payload } satisfies BranchStepDefinitionReadModel;
        }),
      ),

    deleteBranchStepDefinition: ({ versionId, workflowDefinitionId, stepId }) =>
      dbEffect("methodology.deleteBranchStepDefinition", () =>
        db.transaction(async (tx) => {
          const workflow = await findWorkflowRow(tx, { versionId, workflowDefinitionId });
          if (!workflow) {
            throw new Error(
              `Workflow not found for versionId=${versionId}, workflowDefinitionId=${workflowDefinitionId}`,
            );
          }

          await deleteWorkflowStepDefinition(tx, workflow, workflowDefinitionId, stepId);
        }),
      ),

    getBranchStepDefinition: (params) =>
      dbEffect("methodology.getBranchStepDefinition", () => readBranchStepDefinition(db, params)),

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
          ...(edge.descriptionJson
            ? { descriptionJson: edge.descriptionJson as { readonly markdown: string } }
            : {}),
        }));
      }),

    createWorkflowEdgeByDefinitionId: ({
      versionId,
      workflowDefinitionId,
      fromStepKey,
      toStepKey,
      descriptionJson,
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
              descriptionJson: descriptionJson ?? null,
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
            ...(edge.descriptionJson
              ? { descriptionJson: edge.descriptionJson as { readonly markdown: string } }
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
              descriptionJson: descriptionJson ?? null,
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
            ...(edge.descriptionJson
              ? { descriptionJson: edge.descriptionJson as { readonly markdown: string } }
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

        const steps: WorkflowStepReadModel[] = await Promise.all(
          stepRows.map(async (step) => {
            const stepType = asWorkflowStepType(step.type);

            if (stepType === "form") {
              const definition = formDefinitionByStepId.get(step.id);
              return {
                stepId: step.id,
                stepType: "form",
                payload: definition?.payload ?? buildFormPayload(step, []),
              };
            }

            if (stepType === "invoke") {
              const definition = await readInvokeStepDefinition(db, {
                versionId,
                workflowDefinitionId,
                stepId: step.id,
              });
              if (!definition) {
                throw new Error(`Invoke step definition '${step.id}' could not be resolved`);
              }

              return {
                stepId: step.id,
                stepType: "invoke",
                payload: definition.payload,
              };
            }

            if (stepType === "branch") {
              const definition = await readBranchStepDefinition(db, {
                versionId,
                workflowDefinitionId,
                stepId: step.id,
              });
              if (!definition) {
                throw new Error(`Branch step definition '${step.id}' could not be resolved`);
              }

              return {
                stepId: step.id,
                stepType: "branch",
                payload: definition.payload,
              };
            }

            return {
              stepId: step.id,
              stepType,
              stepKey: step.key,
              mode: "deferred",
              defaultMessage: DEFERRED_STEP_MESSAGE,
            };
          }),
        );

        const edges: WorkflowEditorDefinitionReadModel["edges"] = edgeRows.map((edge) => ({
          edgeId: edge.id,
          fromStepKey: edge.fromStepId ? (stepKeyById.get(edge.fromStepId) ?? null) : null,
          toStepKey: edge.toStepId ? (stepKeyById.get(edge.toStepId) ?? null) : null,
          edgeOwner: "normal",
          ...(edge.descriptionJson
            ? { descriptionJson: edge.descriptionJson as { readonly markdown: string } }
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
