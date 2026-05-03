import type { FactCardinality, FactType } from "@chiron/contracts/methodology/fact";
import type { RuntimeConditionTree } from "@chiron/contracts/runtime/conditions";
import type {
  RuntimeFormFieldOption,
  RuntimeFormNestedField,
  RuntimeInvokeStepExecutionDetailBody,
  RuntimeInvokeTargetStatus,
} from "@chiron/contracts/runtime/executions";
import type {
  InvokeStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitService } from "@chiron/sandbox-engine";
import { Context, Effect, Layer, Option } from "effect";
import type { ArtifactCurrentState } from "../repositories/artifact-repository";

import { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { type WorkflowExecutionDetailReadModel } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { InvokeCompletionService } from "./invoke-completion-service";
import {
  RuntimeGateService,
  type RuntimeGateProjectedArtifactSlotValue,
  type RuntimeGateProjectedWorkUnitFactValue,
} from "./runtime-gate-service";
import { parseArtifactSlotReferenceFactValue } from "./runtime/artifact-slot-reference-service";
import {
  readRuntimeBoundFactEnvelope,
  toCanonicalRuntimeBoundFactEnvelope,
  unwrapRuntimeBoundFactEnvelope,
} from "./runtime-bound-fact-value";
import { toRuntimeConditionTree } from "./transition-gate-conditions";

export interface BuildInvokeStepExecutionDetailBodyParams {
  projectId: string;
  stepExecution: RuntimeStepExecutionRow;
  workflowDetail: WorkflowExecutionDetailReadModel;
}

type WorkflowDefinitionSummary = {
  workflowDefinitionId: string;
  workflowDefinitionKey?: string;
  workflowDefinitionName?: string;
  workUnitTypeKey?: string;
};

type WorkUnitTypeSummary = {
  id: string;
  key: string;
  name: string;
  cardinality?: string;
};

type RuntimeProjectWorkUnitOption = {
  id: string;
  workUnitTypeId: string;
  displayName?: string | null;
};

type TransitionSummary = {
  transitionDefinitionId: string;
  transitionDefinitionKey?: string;
  transitionLabel: string;
  transitionFromStateLabel?: string;
  transitionToStateLabel?: string;
};

type WorkUnitInvokePayload = Extract<InvokeStepPayload, { targetKind: "work_unit" }>;

type FrozenInvokeDraftTemplateLike = {
  draftKey: string;
  workUnitDefinitionId: string;
  factValues: ReadonlyArray<{ workUnitFactDefinitionId: string; value: unknown }>;
  artifactSlots: ReadonlyArray<{
    artifactSlotDefinitionId: string;
    files: ReadonlyArray<{
      relativePath?: string;
      sourceContextFactDefinitionId?: string;
      clear: boolean;
    }>;
  }>;
};

const makeDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-step-detail",
    cause: new Error(cause),
  });

const mapGateError = (error: unknown): RepositoryError =>
  error instanceof RepositoryError
    ? error
    : new RepositoryError({
        operation: "invoke-step-detail",
        cause: error instanceof Error ? error : new Error(String(error)),
      });

const humanizeKey = (value: string): string =>
  value
    .replaceAll(/[._-]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringifyOptionLabel = (value: unknown): string => {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const optionListFromValidation = (
  validationJson: unknown,
): RuntimeFormFieldOption[] | undefined => {
  if (!isPlainRecord(validationJson)) {
    return undefined;
  }

  if (validationJson.kind === "allowed-values" && Array.isArray(validationJson.values)) {
    return validationJson.values.map((entry) => ({
      value: entry,
      label: stringifyOptionLabel(entry),
    }));
  }

  if (validationJson.kind !== "json-schema" || !isPlainRecord(validationJson.schema)) {
    return undefined;
  }

  const enumValues = validationJson.schema.enum;
  if (!Array.isArray(enumValues)) {
    return undefined;
  }

  return enumValues.map((entry) => ({ value: entry, label: stringifyOptionLabel(entry) }));
};

const extractMarkdown = (value: unknown): string | undefined =>
  isPlainRecord(value) && typeof value.markdown === "string" ? value.markdown : undefined;

const getJsonSchemaPropertyValidation = (property: unknown): unknown => {
  if (!isPlainRecord(property)) {
    return undefined;
  }

  if ("x-validation" in property) {
    return property["x-validation"];
  }

  return property.validation;
};

const editorNestedFieldsFromValidation = (params: {
  validationJson: unknown;
  workUnitTypes: readonly WorkUnitTypeSummary[];
  projectWorkUnits: readonly RuntimeProjectWorkUnitOption[];
}): RuntimeFormNestedField[] | undefined => {
  if (!isPlainRecord(params.validationJson) || params.validationJson.kind !== "json-schema") {
    return undefined;
  }

  const schema = isPlainRecord(params.validationJson.schema) ? params.validationJson.schema : null;
  const schemaProperties = isPlainRecord(schema?.properties) ? schema.properties : null;
  const required = Array.isArray(schema?.required)
    ? new Set(schema.required.filter((entry): entry is string => typeof entry === "string"))
    : new Set<string>();
  const subSchema = isPlainRecord(params.validationJson.subSchema)
    ? params.validationJson.subSchema
    : null;

  const buildNestedField = (params: {
    key: string;
    label?: string;
    factType: FactType;
    cardinality: FactCardinality;
    required: boolean;
    description?: string;
    validation?: unknown;
  }): RuntimeFormNestedField => {
    const validationOptions = optionListFromValidation(params.validation);
    const workUnitMetadata =
      params.factType === "work_unit" || hasWorkUnitValidationKey(params.validation)
        ? workUnitOptionsFromValidation({
            validationJson: params.validation,
            workUnitTypes: params.workUnitTypes,
            projectWorkUnits: params.projectWorkUnits,
          })
        : {};

    return {
      key: params.key,
      label: params.label ?? humanizeKey(params.key),
      factType: params.factType,
      cardinality: params.cardinality,
      required: params.required,
      ...(params.description ? { description: params.description } : {}),
      ...(typeof params.validation !== "undefined" ? { validation: params.validation } : {}),
      ...(workUnitMetadata.editorOptions
        ? { options: workUnitMetadata.editorOptions }
        : validationOptions
          ? { options: validationOptions }
          : {}),
      ...(workUnitMetadata.editorEmptyState
        ? { emptyState: workUnitMetadata.editorEmptyState }
        : {}),
      ...(workUnitMetadata.editorWorkUnitTypeKey
        ? { workUnitTypeKey: workUnitMetadata.editorWorkUnitTypeKey }
        : {}),
    };
  };

  if (subSchema && subSchema.type === "object" && Array.isArray(subSchema.fields)) {
    return subSchema.fields.flatMap((field) => {
      if (!isPlainRecord(field) || typeof field.key !== "string") {
        return [];
      }

      if (
        field.type !== "string" &&
        field.type !== "number" &&
        field.type !== "boolean" &&
        field.type !== "json" &&
        field.type !== "work_unit"
      ) {
        return [];
      }

      const propertyValidation = schemaProperties
        ? getJsonSchemaPropertyValidation(schemaProperties[field.key])
        : undefined;

      return [
        buildNestedField({
          key: field.key,
          label: typeof field.displayName === "string" ? field.displayName : undefined,
          factType: field.type,
          cardinality: field.cardinality === "many" ? "many" : "one",
          required: required.has(field.key),
          description: extractMarkdown(field.description),
          validation: field.validation ?? propertyValidation,
        }),
      ];
    });
  }

  if (!schemaProperties) {
    return undefined;
  }

  const nestedFields = Object.entries(schemaProperties).flatMap(([key, property]) => {
    if (!isPlainRecord(property)) {
      return [];
    }

    const propertyType = property.type;
    const factType =
      propertyType === "string" ||
      propertyType === "number" ||
      propertyType === "boolean" ||
      propertyType === "json" ||
      propertyType === "work_unit"
        ? (propertyType as FactType)
        : propertyType === "object"
          ? ("json" as const)
          : null;

    if (!factType) {
      return [];
    }

    const cardinality =
      property.cardinality === "many" || property.cardinality === "one"
        ? (property.cardinality as FactCardinality)
        : propertyType === "array"
          ? ("many" as const)
          : ("one" as const);

    const propertyValidation =
      propertyType === "array" && isPlainRecord(property.items)
        ? (getJsonSchemaPropertyValidation(property.items) ??
          getJsonSchemaPropertyValidation(property))
        : getJsonSchemaPropertyValidation(property);

    return [
      buildNestedField({
        key,
        label: typeof property.title === "string" ? property.title : undefined,
        factType:
          propertyType === "array" &&
          isPlainRecord(property.items) &&
          (property.items.type === "string" ||
            property.items.type === "number" ||
            property.items.type === "boolean")
            ? (property.items.type as FactType)
            : factType,
        cardinality,
        required: required.has(key),
        description: typeof property.description === "string" ? property.description : undefined,
        validation: propertyValidation,
      }),
    ];
  });

  return nestedFields.length > 0 ? nestedFields : undefined;
};

const workUnitOptionsFromValidation = (params: {
  validationJson: unknown;
  workUnitTypes: readonly WorkUnitTypeSummary[];
  projectWorkUnits: readonly RuntimeProjectWorkUnitOption[];
}): {
  editorOptions?: RuntimeFormFieldOption[];
  editorWorkUnitTypeKey?: string;
  editorEmptyState?: string;
} => {
  if (
    !isPlainRecord(params.validationJson) ||
    typeof params.validationJson.workUnitKey !== "string"
  ) {
    return {};
  }

  const workUnitTypeKey = params.validationJson.workUnitKey;
  const workUnitType = params.workUnitTypes.find(
    (entry) =>
      entry.key === workUnitTypeKey || entry.key.toLowerCase() === workUnitTypeKey.toLowerCase(),
  );

  if (!workUnitType) {
    return { editorWorkUnitTypeKey: workUnitTypeKey };
  }

  const editorOptions = params.projectWorkUnits
    .filter((workUnit) => workUnit.workUnitTypeId === workUnitType.id)
    .map((workUnit) => ({
      value: { projectWorkUnitId: workUnit.id },
      label:
        typeof workUnit.displayName === "string" && workUnit.displayName.trim().length > 0
          ? workUnit.displayName.trim()
          : workUnitType.cardinality === "many_per_project"
            ? `${workUnitType.key}:${shortId(workUnit.id)}`
            : workUnitType.name,
    }));

  return {
    editorWorkUnitTypeKey: workUnitType.key,
    ...(editorOptions.length > 0 ? { editorOptions } : {}),
    ...(editorOptions.length === 0
      ? {
          editorEmptyState: `No ${workUnitType.name} work units are available yet.`,
        }
      : {}),
  };
};

const hasWorkUnitValidationKey = (validationJson: unknown): boolean =>
  isPlainRecord(validationJson) && typeof validationJson.workUnitKey === "string";

const isFilePathPlainContextFact = (contextFact: WorkflowContextFactDto | undefined): boolean =>
  !!contextFact &&
  contextFact.kind === "plain_value_fact" &&
  contextFact.valueType === "string" &&
  contextFact.cardinality === "one" &&
  isPlainRecord(contextFact.validationJson) &&
  contextFact.validationJson.kind === "path" &&
  isPlainRecord(contextFact.validationJson.path) &&
  contextFact.validationJson.path.pathKind === "file";

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const isManyProjectCardinality = (value: string | null | undefined): boolean =>
  value === "many" || value === "many_per_project";

const hasRelativePath = (value: unknown): value is { relativePath: string } =>
  isPlainRecord(value) && typeof value.relativePath === "string" && value.relativePath.length > 0;

const hasProjectWorkUnitId = (value: unknown): value is { projectWorkUnitId: string } =>
  isPlainRecord(value) &&
  typeof value.projectWorkUnitId === "string" &&
  value.projectWorkUnitId.length > 0;

const normalizeInvokeFactValue = (params: {
  destinationFactType: FactType | undefined;
  value: unknown;
}): unknown => {
  if (params.destinationFactType !== "work_unit") {
    return params.value;
  }

  if (hasProjectWorkUnitId(params.value)) {
    return params.value;
  }

  return typeof params.value === "string" && params.value.length > 0
    ? { projectWorkUnitId: params.value }
    : undefined;
};

const resolveInvokeDraftFactValue = (params: {
  factValues: ReadonlyArray<{ workUnitFactDefinitionId: string; value: unknown }>;
  destinationDefinitionId: string;
  destinationFactType: FactType | undefined;
  destinationCardinality: FactCardinality | undefined;
}): unknown => {
  const matchedEntries = params.factValues.filter(
    (entry) => entry.workUnitFactDefinitionId === params.destinationDefinitionId,
  );

  if (matchedEntries.length === 0) {
    return undefined;
  }

  const normalizedEntries = matchedEntries.flatMap((entry) => {
    if (params.destinationCardinality === "many" && Array.isArray(entry.value)) {
      return entry.value
        .map((value) =>
          normalizeInvokeFactValue({
            destinationFactType: params.destinationFactType,
            value,
          }),
        )
        .filter((value) => typeof value !== "undefined");
    }

    const normalizedValue = normalizeInvokeFactValue({
      destinationFactType: params.destinationFactType,
      value: entry.value,
    });

    return typeof normalizedValue === "undefined" ? [] : [normalizedValue];
  });

  if (params.destinationCardinality === "many") {
    return normalizedEntries;
  }

  return normalizedEntries[0];
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isPlainRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
};

const normalizeFrozenDraftTemplate = (value: unknown): FrozenInvokeDraftTemplateLike | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  if (
    typeof value.draftKey !== "string" ||
    typeof value.workUnitDefinitionId !== "string" ||
    !Array.isArray(value.factValues) ||
    !Array.isArray(value.artifactSlots)
  ) {
    return null;
  }

  const factValues = value.factValues.flatMap((entry) =>
    isPlainRecord(entry) && typeof entry.workUnitFactDefinitionId === "string" && "value" in entry
      ? [{ workUnitFactDefinitionId: entry.workUnitFactDefinitionId, value: entry.value }]
      : [],
  );
  const artifactSlots = value.artifactSlots.flatMap((entry) => {
    if (!isPlainRecord(entry) || typeof entry.artifactSlotDefinitionId !== "string") {
      return [];
    }

    const files = Array.isArray(entry.files)
      ? entry.files.flatMap((file) =>
          isPlainRecord(file)
            ? [
                {
                  ...(typeof file.relativePath === "string"
                    ? { relativePath: file.relativePath }
                    : {}),
                  ...(typeof file.sourceContextFactDefinitionId === "string"
                    ? { sourceContextFactDefinitionId: file.sourceContextFactDefinitionId }
                    : {}),
                  clear: file.clear === true,
                },
              ]
            : [],
        )
      : [];

    return [{ artifactSlotDefinitionId: entry.artifactSlotDefinitionId, files }];
  });

  if (
    factValues.length !== value.factValues.length ||
    artifactSlots.length !== value.artifactSlots.length
  ) {
    return null;
  }

  return {
    draftKey: value.draftKey,
    workUnitDefinitionId: value.workUnitDefinitionId,
    factValues,
    artifactSlots,
  };
};

const toProjectedArtifactSlotValue = (
  value: unknown,
): RuntimeGateProjectedArtifactSlotValue | null => {
  if (isPlainRecord(value) && Array.isArray(value.files)) {
    return toProjectedArtifactSlotValue(value.files);
  }

  if (Array.isArray(value)) {
    const resolvedEntries = value.flatMap((entry) => {
      if (typeof entry === "string") {
        return entry.trim().length > 0 ? [entry.trim()] : [];
      }

      if (isPlainRecord(entry) && Array.isArray(entry.files)) {
        return entry.files.flatMap((file) => {
          if (typeof file === "string") {
            return file.trim().length > 0 ? [file.trim()] : [];
          }

          return hasRelativePath(file) ? [file.relativePath] : [];
        });
      }

      return hasRelativePath(entry) ? [entry.relativePath] : [];
    });

    return resolvedEntries.length > 0 ? { exists: true, freshness: "fresh" } : null;
  }

  if (typeof value === "string") {
    return value.trim().length > 0 ? { exists: true, freshness: "fresh" } : null;
  }

  if (hasRelativePath(value)) {
    return { exists: true, freshness: "fresh" };
  }

  return null;
};

const toProjectedWorkUnitFactValue = (
  destinationFactType: FactType | undefined,
  value: unknown,
): RuntimeGateProjectedWorkUnitFactValue | null => {
  if (typeof value === "undefined") {
    return null;
  }

  if (destinationFactType === "work_unit") {
    return hasProjectWorkUnitId(value)
      ? {
          valueJson: null,
          referencedProjectWorkUnitId: value.projectWorkUnitId,
        }
      : null;
  }

  return { valueJson: value };
};

const toChildFactDisplayValue = (params: {
  destinationFactType: FactType | undefined;
  destinationCardinality: FactCardinality | undefined;
  factInstances: readonly {
    referencedProjectWorkUnitId: string | null;
    valueJson: unknown;
  }[];
}): unknown => {
  const values = params.factInstances.flatMap((factInstance) => {
    if (params.destinationFactType === "work_unit") {
      return factInstance.referencedProjectWorkUnitId !== null
        ? [{ projectWorkUnitId: factInstance.referencedProjectWorkUnitId }]
        : [];
    }

    if (params.destinationCardinality === "many" && Array.isArray(factInstance.valueJson)) {
      return factInstance.valueJson;
    }

    return typeof factInstance.valueJson === "undefined" ? [] : [factInstance.valueJson];
  });

  if (params.destinationCardinality === "many") {
    return values;
  }

  return values[0];
};

const toChildArtifactDisplayValue = (params: {
  destinationCardinality: FactCardinality | undefined;
  artifactState: ArtifactCurrentState;
}): unknown => {
  const presentMembers = params.artifactState.members.filter(
    (member) => member.memberStatus === "present",
  );
  if (params.destinationCardinality === "many") {
    return presentMembers.map((member) => ({ relativePath: member.filePath }));
  }

  return presentMembers[0]?.filePath ? { relativePath: presentMembers[0].filePath } : undefined;
};

type ResolvedInvokeDraftTemplate = {
  canonicalKey: string;
  factValues: ReadonlyArray<{ workUnitFactDefinitionId: string; value: unknown }>;
  artifactSlots: ReadonlyArray<{
    artifactSlotDefinitionId: string;
    files: ReadonlyArray<{
      relativePath?: string;
      sourceContextFactDefinitionId?: string;
      clear: boolean;
    }>;
  }>;
};

const normalizeDraftFactValues = (value: unknown): ResolvedInvokeDraftTemplate["factValues"] => {
  const entries = isPlainRecord(value)
    ? Array.isArray(value.factValues)
      ? value.factValues
      : Array.isArray(value.facts)
        ? value.facts
        : []
    : [];

  return entries.flatMap((entry) => {
    if (!isPlainRecord(entry)) {
      return [];
    }

    const workUnitFactDefinitionId =
      asNonEmptyString(entry.workUnitFactDefinitionId) ?? asNonEmptyString(entry.factDefinitionId);
    if (!workUnitFactDefinitionId) {
      return [];
    }

    return [{ workUnitFactDefinitionId, value: "value" in entry ? entry.value : entry.valueJson }];
  });
};

const normalizeDraftArtifactSlots = (
  value: unknown,
): ResolvedInvokeDraftTemplate["artifactSlots"] => {
  if (!isPlainRecord(value)) {
    return [];
  }

  const groupedSlots = Array.isArray(value.artifactSlots)
    ? value.artifactSlots.flatMap((entry) => {
        if (!isPlainRecord(entry)) {
          return [];
        }

        const artifactSlotDefinitionId =
          asNonEmptyString(entry.artifactSlotDefinitionId) ??
          asNonEmptyString(entry.slotDefinitionId);
        if (!artifactSlotDefinitionId) {
          return [];
        }

        const files = Array.isArray(entry.files)
          ? entry.files.flatMap((file) =>
              isPlainRecord(file)
                ? [
                    {
                      ...(typeof file.relativePath === "string"
                        ? { relativePath: file.relativePath }
                        : {}),
                      ...(typeof file.sourceContextFactDefinitionId === "string"
                        ? { sourceContextFactDefinitionId: file.sourceContextFactDefinitionId }
                        : {}),
                      clear: file.clear === true,
                    },
                  ]
                : [],
            )
          : [];

        return [{ artifactSlotDefinitionId, files }];
      })
    : [];

  if (groupedSlots.length > 0) {
    return groupedSlots;
  }

  const flatEntries = Array.isArray(value.artifactValues)
    ? value.artifactValues
    : Array.isArray(value.artifacts)
      ? value.artifacts
      : [];
  const slots = new Map<
    string,
    Array<{ relativePath?: string; sourceContextFactDefinitionId?: string; clear: boolean }>
  >();
  for (const entry of flatEntries) {
    if (!isPlainRecord(entry)) {
      continue;
    }

    const artifactSlotDefinitionId =
      asNonEmptyString(entry.artifactSlotDefinitionId) ?? asNonEmptyString(entry.slotDefinitionId);
    if (!artifactSlotDefinitionId) {
      continue;
    }

    const files = slots.get(artifactSlotDefinitionId) ?? [];
    files.push({
      ...(typeof entry.relativePath === "string" ? { relativePath: entry.relativePath } : {}),
      ...(typeof entry.sourceContextFactDefinitionId === "string"
        ? { sourceContextFactDefinitionId: entry.sourceContextFactDefinitionId }
        : {}),
      clear: entry.clear === true,
    });
    slots.set(artifactSlotDefinitionId, files);
  }

  return [...slots.entries()].map(([artifactSlotDefinitionId, files]) => ({
    artifactSlotDefinitionId,
    files,
  }));
};

const normalizeSourceDraftTemplate = (
  value: unknown,
  defaultWorkUnitDefinitionId?: string,
): ResolvedInvokeDraftTemplate | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const workUnitDefinitionId =
    asNonEmptyString(value.workUnitDefinitionId) ??
    asNonEmptyString(value.workUnitTypeId) ??
    defaultWorkUnitDefinitionId ??
    "";
  if (
    typeof defaultWorkUnitDefinitionId === "string" &&
    defaultWorkUnitDefinitionId.length > 0 &&
    workUnitDefinitionId !== defaultWorkUnitDefinitionId
  ) {
    return null;
  }

  return {
    canonicalKey:
      asNonEmptyString(value.draftKey) ??
      asNonEmptyString(value.canonicalKey) ??
      stableStringify(value),
    factValues: normalizeDraftFactValues(value),
    artifactSlots: normalizeDraftArtifactSlots(value),
  };
};

const resolveDraftTemplateFromContextInstances = (params: {
  sourceContextFact: WorkflowContextFactDto | undefined;
  sourceInstances: readonly { valueJson: unknown }[];
}): ResolvedInvokeDraftTemplate | null => {
  if (params.sourceContextFact?.kind !== "work_unit_draft_spec_fact") {
    return null;
  }

  const deduped = new Map<string, ResolvedInvokeDraftTemplate>();
  for (const instance of params.sourceInstances) {
    const normalized = normalizeSourceDraftTemplate(
      instance.valueJson,
      params.sourceContextFact.workUnitDefinitionId,
    );
    if (!normalized || deduped.has(normalized.canonicalKey)) {
      continue;
    }

    deduped.set(normalized.canonicalKey, normalized);
  }

  return [...deduped.values()][0] ?? null;
};

const getContextFactValueTypeLabel = (
  contextFact: WorkflowContextFactDto | undefined,
): string | undefined => {
  if (!contextFact) {
    return undefined;
  }

  switch (contextFact.kind) {
    case "plain_fact":
      return contextFact.type;
    case "plain_value_fact":
      return contextFact.valueType;
    case "bound_fact":
      return contextFact.valueType;
    case "artifact_slot_reference_fact":
      return "artifact_snapshot";
    case "workflow_ref_fact":
      return "workflow_reference";
    case "work_unit_reference_fact":
      return "work_unit_reference";
    case "work_unit_draft_spec_fact":
      return "work_unit_draft_spec";
  }
};

const toRelativePathOptionValue = (params: {
  relativePath: string;
  sourceContextFactDefinitionId: string;
}) => ({
  relativePath: params.relativePath,
  sourceContextFactDefinitionId: params.sourceContextFactDefinitionId,
});

const formatArtifactResolutionWarning = (params: {
  contextFactLabel: string;
  relativePath: string;
  reason: string;
}): string =>
  `${params.contextFactLabel}: ${params.relativePath} will not be mapped (${params.reason}).`;

const artifactOptionsFromContextFacts = (params: {
  destinationArtifactSlotDefinitionId: string;
  workflowContextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  workflowEditorContextFacts: readonly WorkflowContextFactDto[];
  projectRootPath?: string;
  sandboxGit: SandboxGitService["Type"];
}): {
  editorOptions?: RuntimeFormFieldOption[];
  editorEmptyState?: string;
  sourceWarnings?: string[];
} => {
  const contextFactsByDefinitionId = new Map(
    params.workflowEditorContextFacts.flatMap((contextFact) =>
      typeof contextFact.contextFactDefinitionId === "string"
        ? [[contextFact.contextFactDefinitionId, contextFact] as const]
        : [],
    ),
  );

  const warnings: string[] = [];
  const options = params.workflowContextFacts.flatMap((instance) => {
    const contextFact = contextFactsByDefinitionId.get(instance.contextFactDefinitionId);
    if (!contextFact || typeof contextFact.contextFactDefinitionId !== "string") {
      return [];
    }

    const contextFactLabel = getContextFactLabel(contextFact);

    const resolveRelativePath = (relativePath: string) => {
      if (!params.projectRootPath) {
        warnings.push(
          formatArtifactResolutionWarning({
            contextFactLabel,
            relativePath,
            reason: "project root path is unavailable",
          }),
        );
        return null;
      }

      return Effect.runSyncExit(
        params.sandboxGit.resolveArtifactReference({
          rootPath: params.projectRootPath,
          filePath: relativePath,
        }),
      );
    };

    const toMappedOption = (relativePath: string) => {
      const resolution = resolveRelativePath(relativePath);
      if (!resolution || resolution._tag !== "Success") {
        return [];
      }

      const value = resolution.value;
      if (value.status !== "committed") {
        const reason =
          value.status === "missing"
            ? "file is missing from the repo"
            : value.status === "not_committed"
              ? "file is not committed in git"
              : value.status === "git_not_installed" || value.status === "not_a_repo"
                ? value.message
                : "file could not be resolved";
        warnings.push(formatArtifactResolutionWarning({ contextFactLabel, relativePath, reason }));
        return [];
      }

      return [
        {
          value: toRelativePathOptionValue({
            relativePath: value.relativePath,
            sourceContextFactDefinitionId: contextFact.contextFactDefinitionId,
          }),
          label: `${contextFactLabel}: ${value.relativePath}`,
        } satisfies RuntimeFormFieldOption,
      ];
    };

    if (
      contextFact.kind === "artifact_slot_reference_fact" &&
      contextFact.slotDefinitionId === params.destinationArtifactSlotDefinitionId &&
      isPlainRecord(instance.valueJson) &&
      typeof instance.valueJson.relativePath === "string" &&
      instance.valueJson.relativePath.trim().length > 0
    ) {
      return toMappedOption(instance.valueJson.relativePath.trim());
    }

    if (isFilePathPlainContextFact(contextFact) && typeof instance.valueJson === "string") {
      const relativePath = instance.valueJson.trim();
      if (relativePath.length === 0) {
        return [];
      }

      return toMappedOption(relativePath);
    }

    return [];
  });

  return options.length > 0
    ? { editorOptions: options, ...(warnings.length > 0 ? { sourceWarnings: warnings } : {}) }
    : {
        editorEmptyState:
          "No eligible artifact sources are available yet. Use a matching artifact-reference fact or a file-path plain fact.",
        ...(warnings.length > 0 ? { sourceWarnings: warnings } : {}),
      };
};

const shortId = (value: string): string => value.slice(0, 8);

const formatWorkUnitLabel = (name: string, projectWorkUnitId?: string): string =>
  projectWorkUnitId ? `${name} (${shortId(projectWorkUnitId)})` : name;

const getContextFactLabel = (contextFact: WorkflowContextFactDto): string =>
  contextFact.label ?? humanizeKey(contextFact.key);

const getContextFactWorkUnitDefinitionName = (params: {
  contextFact: WorkflowContextFactDto | undefined;
  workUnitTypeById: ReadonlyMap<string, WorkUnitTypeSummary>;
}): string | undefined => {
  const workUnitDefinitionId =
    params.contextFact?.kind === "work_unit_draft_spec_fact"
      ? params.contextFact.workUnitDefinitionId
      : undefined;
  return workUnitDefinitionId
    ? getWorkUnitTypeName(params.workUnitTypeById.get(workUnitDefinitionId), workUnitDefinitionId)
    : undefined;
};

const normalizeContextFactInstanceValue = (params: {
  contextFact: WorkflowContextFactDto | undefined;
  valueJson: unknown;
}): unknown => {
  if (params.contextFact?.kind !== "bound_fact") {
    return params.valueJson;
  }

  const envelope = readRuntimeBoundFactEnvelope(params.valueJson);
  return envelope ? toCanonicalRuntimeBoundFactEnvelope(envelope) : params.valueJson;
};

const resolveBindingSourceValue = (params: {
  sourceContextFact: WorkflowContextFactDto | undefined;
  sourceInstances: readonly { valueJson: unknown }[];
}): unknown => {
  if (params.sourceInstances.length === 0) {
    return undefined;
  }

  if (params.sourceContextFact?.kind === "bound_fact") {
    return params.sourceContextFact.cardinality === "many"
      ? params.sourceInstances.map((instance) => unwrapRuntimeBoundFactEnvelope(instance.valueJson))
      : unwrapRuntimeBoundFactEnvelope(params.sourceInstances[0]?.valueJson);
  }

  return params.sourceContextFact?.cardinality === "many"
    ? params.sourceInstances.map((instance) => instance.valueJson)
    : params.sourceInstances[0]?.valueJson;
};

const getWorkflowDefinitionName = (
  summary: WorkflowDefinitionSummary | undefined,
  workflowDefinitionId: string,
): string =>
  summary?.workflowDefinitionName ??
  summary?.workflowDefinitionKey ??
  humanizeKey(workflowDefinitionId);

const getWorkUnitTypeName = (
  summary: WorkUnitTypeSummary | undefined,
  workUnitDefinitionId: string,
): string => summary?.name ?? humanizeKey(workUnitDefinitionId);

const getTransitionLabel = (
  summary: TransitionSummary | undefined,
  transitionDefinitionId: string,
): string =>
  summary?.transitionLabel ??
  humanizeKey(summary?.transitionDefinitionKey ?? transitionDefinitionId);

const toPropagationPreview = (params: {
  targetKind: InvokeStepPayload["targetKind"];
  outputs: readonly WorkflowContextFactDto[];
}): RuntimeInvokeStepExecutionDetailBody["propagationPreview"] => {
  const outputs = params.outputs.flatMap((contextFact) =>
    typeof contextFact.contextFactDefinitionId === "string"
      ? [
          {
            label: getContextFactLabel(contextFact),
            contextFactDefinitionId: contextFact.contextFactDefinitionId,
            contextFactKey: contextFact.key,
          },
        ]
      : [],
  );

  const summary =
    outputs.length === 0
      ? params.targetKind === "workflow"
        ? "No workflow-reference outputs will be written on invoke completion."
        : "No work-unit draft-spec outputs will be written on invoke completion."
      : params.targetKind === "workflow"
        ? `On step completion, ${outputs.length} workflow reference output${outputs.length === 1 ? "" : "s"} will be written.`
        : `On step completion, ${outputs.length} work-unit draft-spec output${outputs.length === 1 ? "" : "s"} will be written.`;

  return {
    mode: "on_step_completion",
    summary,
    outputs,
  };
};

export class InvokeStepDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeStepDetailService",
)<
  InvokeStepDetailService,
  {
    readonly buildInvokeStepExecutionDetailBody: (
      params: BuildInvokeStepExecutionDetailBodyParams,
    ) => Effect.Effect<RuntimeInvokeStepExecutionDetailBody, RepositoryError>;
  }
>() {}

export const InvokeStepDetailServiceLive = Layer.effect(
  InvokeStepDetailService,
  Effect.gen(function* () {
    const projectContextRepo = yield* Effect.serviceOption(ProjectContextRepository);
    const sandboxGit = yield* SandboxGitService;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const artifactRepo = yield* ArtifactRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;
    const stepRepo = yield* StepExecutionRepository;
    const transitionRepo = yield* TransitionExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const invokeCompletionService = yield* InvokeCompletionService;
    const runtimeGate = yield* RuntimeGateService;

    const buildInvokeStepExecutionDetailBody = ({
      projectId,
      stepExecution,
      workflowDetail,
    }: BuildInvokeStepExecutionDetailBodyParams) =>
      Effect.gen(function* () {
        const projectPin = Option.isSome(projectContextRepo)
          ? yield* projectContextRepo.value.findProjectPin(projectId)
          : {
              projectId,
              methodologyVersionId: "unknown-version",
              methodologyId: "unknown-methodology",
              methodologyKey: "unknown",
              publishedVersion: "unknown",
              actorId: null,
              createdAt: new Date(0),
              updatedAt: new Date(0),
            };
        if (!projectPin) {
          return yield* makeDetailError("project methodology pin missing for invoke step detail");
        }
        const project = Option.isSome(projectContextRepo)
          ? yield* projectContextRepo.value.getProjectById({ projectId })
          : null;

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return yield* makeDetailError("parent work-unit type missing for invoke step detail");
        }

        const [workflowEditor, invokeDefinition] = yield* Effect.all([
          methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: parentWorkUnitType.key,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          }),
          methodologyRepo.getInvokeStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            stepId: stepExecution.stepDefinitionId,
          }),
        ]);

        if (!invokeDefinition) {
          return yield* makeDetailError("invoke step definition missing for runtime detail");
        }

        const invokePayloadRaw =
          typeof invokeDefinition === "object" && invokeDefinition !== null
            ? ((invokeDefinition as { payload?: unknown }).payload as InvokeStepPayload | undefined)
            : undefined;
        const invokeTargetKind = invokePayloadRaw?.targetKind;
        if (invokeTargetKind !== "workflow" && invokeTargetKind !== "work_unit") {
          return yield* makeDetailError("invoke step payload missing for runtime detail");
        }
        const invokePayload = invokePayloadRaw as InvokeStepPayload;
        const workUnitInvokePayload: WorkUnitInvokePayload | null =
          invokePayload.targetKind === "work_unit" ? invokePayload : null;

        const invokeState = yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(
          stepExecution.id,
        );
        if (!invokeState) {
          return yield* makeDetailError("invoke step execution state not found");
        }

        const [
          workflowTargetRows,
          workUnitTargetRows,
          completionEligibility,
          workflowContextFacts,
          projectWorkUnits,
        ] = yield* Effect.all([
          invokeRepo.listInvokeWorkflowTargetExecutions(invokeState.id),
          invokeRepo.listInvokeWorkUnitTargetExecutions(invokeState.id),
          invokeCompletionService.getCompletionEligibility({
            projectId,
            workflowExecutionId: stepExecution.workflowExecutionId,
            stepExecutionId: stepExecution.id,
          }),
          stepRepo.listWorkflowExecutionContextFacts(stepExecution.workflowExecutionId),
          projectWorkUnitRepo.listProjectWorkUnitsByProject(projectId),
        ]);

        const workUnitTypeById = new Map(
          workUnitTypes.map(
            (workUnitType) =>
              [
                workUnitType.id,
                {
                  id: workUnitType.id,
                  key: workUnitType.key,
                  name: workUnitType.displayName ?? humanizeKey(workUnitType.key),
                  cardinality: workUnitType.cardinality,
                } satisfies WorkUnitTypeSummary,
              ] as const,
          ),
        );

        const allWorkflowDefinitions = methodologyRepo.listWorkflowsByWorkUnitType
          ? (yield* Effect.forEach(workUnitTypes, (workUnitType) =>
              methodologyRepo.listWorkflowsByWorkUnitType!({
                versionId: projectPin.methodologyVersionId,
                workUnitTypeKey: workUnitType.key,
              }),
            )).flat()
          : [];

        const workflowDefinitionsById = new Map(
          allWorkflowDefinitions.flatMap((workflow) =>
            typeof workflow.workflowDefinitionId === "string"
              ? [
                  [
                    workflow.workflowDefinitionId,
                    {
                      workflowDefinitionId: workflow.workflowDefinitionId,
                      workflowDefinitionKey: workflow.key,
                      workflowDefinitionName: workflow.displayName ?? humanizeKey(workflow.key),
                      ...(typeof workflow.workUnitTypeKey === "string"
                        ? { workUnitTypeKey: workflow.workUnitTypeKey }
                        : {}),
                    } satisfies WorkflowDefinitionSummary,
                  ] as const,
                ]
              : [],
          ),
        );

        const relevantWorkUnitTypeIds = new Set<string>();
        if (invokeTargetKind === "work_unit") {
          for (const row of workUnitTargetRows) {
            relevantWorkUnitTypeIds.add(row.workUnitDefinitionId);
          }
        }

        const allFactSchemas =
          invokeTargetKind === "work_unit"
            ? yield* lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId)
            : [];

        const transitionsById = new Map<string, TransitionSummary>();
        const startGateTreesByTransitionId = new Map<string, RuntimeConditionTree>();
        const completionGateTreesByTransitionId = new Map<string, RuntimeConditionTree>();
        const statesByWorkUnitTypeId = new Map<string, Map<string, string>>();
        const workUnitFactDefinitionsById = new Map<
          string,
          {
            id: string;
            key: string;
            label: string;
            factType: FactType;
            cardinality: FactCardinality;
            validationJson: unknown;
          }
        >();
        const artifactSlotDefinitionsById = new Map<
          string,
          {
            id: string;
            key: string;
            label: string;
          }
        >();
        for (const workUnitTypeId of relevantWorkUnitTypeIds) {
          const workUnitType = workUnitTypeById.get(workUnitTypeId);
          if (!workUnitType) {
            continue;
          }

          const [transitions, states, factSchemas, artifactSlots] = yield* Effect.all([
            lifecycleRepo.findLifecycleTransitions(projectPin.methodologyVersionId, {
              workUnitTypeId,
            }),
            lifecycleRepo.findLifecycleStates(projectPin.methodologyVersionId, workUnitTypeId),
            lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId, workUnitTypeId),
            methodologyRepo.findArtifactSlotsByWorkUnitType({
              versionId: projectPin.methodologyVersionId,
              workUnitTypeKey: workUnitType.key,
            }),
          ]);
          const stateLabels = new Map(
            states.map((state) => [state.id, state.displayName ?? humanizeKey(state.key)] as const),
          );

          for (const transition of transitions) {
            const conditionSets = yield* lifecycleRepo.findTransitionConditionSets(
              projectPin.methodologyVersionId,
              transition.id,
            );
            transitionsById.set(transition.id, {
              transitionDefinitionId: transition.id,
              transitionDefinitionKey: transition.transitionKey,
              transitionLabel: humanizeKey(transition.transitionKey),
              transitionFromStateLabel:
                transition.fromStateId !== null
                  ? (stateLabels.get(transition.fromStateId) ?? transition.fromStateId)
                  : "Activation",
              transitionToStateLabel:
                transition.toStateId !== null
                  ? (stateLabels.get(transition.toStateId) ?? transition.toStateId)
                  : undefined,
            });
            startGateTreesByTransitionId.set(
              transition.id,
              toRuntimeConditionTree(
                conditionSets
                  .filter((conditionSet) => conditionSet.phase !== "completion")
                  .sort((left, right) => left.key.localeCompare(right.key)),
              ),
            );
            completionGateTreesByTransitionId.set(
              transition.id,
              toRuntimeConditionTree(
                conditionSets
                  .filter((conditionSet) => conditionSet.phase === "completion")
                  .sort((left, right) => left.key.localeCompare(right.key)),
              ),
            );
          }

          statesByWorkUnitTypeId.set(workUnitTypeId, stateLabels);

          for (const factSchema of factSchemas) {
            if (!workUnitFactDefinitionsById.has(factSchema.id)) {
              workUnitFactDefinitionsById.set(factSchema.id, {
                id: factSchema.id,
                key: factSchema.key,
                label: humanizeKey(factSchema.key),
                factType: factSchema.factType as FactType,
                cardinality: factSchema.cardinality === "many" ? "many" : "one",
                validationJson: factSchema.validationJson,
              });
            }
          }

          for (const slot of artifactSlots) {
            if (!artifactSlotDefinitionsById.has(slot.id)) {
              artifactSlotDefinitionsById.set(slot.id, {
                id: slot.id,
                key: slot.key,
                label: slot.displayName ?? humanizeKey(slot.key),
                cardinality: slot.cardinality === "fileset" ? "many" : "one",
              });
            }
          }
        }

        for (const factSchema of allFactSchemas) {
          if (!workUnitFactDefinitionsById.has(factSchema.id)) {
            workUnitFactDefinitionsById.set(factSchema.id, {
              id: factSchema.id,
              key: factSchema.key,
              label: humanizeKey(factSchema.key),
              factType: factSchema.factType as FactType,
              cardinality: factSchema.cardinality === "many" ? "many" : "one",
              validationJson: factSchema.validationJson,
            });
          }
        }

        const contextFactsByDefinitionId = new Map(
          workflowEditor.contextFacts.flatMap((contextFact) =>
            typeof contextFact.contextFactDefinitionId === "string"
              ? [[contextFact.contextFactDefinitionId, contextFact] as const]
              : [],
          ),
        );

        const sourceContextFactDefinitionId =
          invokePayload.sourceMode === "fact_backed"
            ? invokePayload.contextFactDefinitionId
            : undefined;
        const sourceContextFact = sourceContextFactDefinitionId
          ? contextFactsByDefinitionId.get(sourceContextFactDefinitionId)
          : undefined;
        const sourceContextFactInstances = sourceContextFactDefinitionId
          ? workflowContextFacts
              .filter((fact) => fact.contextFactDefinitionId === sourceContextFactDefinitionId)
              .sort((left, right) => left.instanceOrder - right.instanceOrder)
          : [];
        const sourceDraftTemplate = resolveDraftTemplateFromContextInstances({
          sourceContextFact,
          sourceInstances: sourceContextFactInstances,
        });

        const draftSpecBindingPreview: RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number]["bindingPreview"] =
          invokeTargetKind === "work_unit" &&
          sourceContextFact?.kind === "work_unit_draft_spec_fact"
            ? [
                ...sourceContextFact.selectedWorkUnitFactDefinitionIds.flatMap((definitionId) => {
                  const destination = workUnitFactDefinitionsById.get(definitionId);
                  const bindingEditorOptions = optionListFromValidation(
                    destination?.validationJson,
                  );
                  const workUnitEditorMetadata =
                    destination &&
                    (destination.factType === "work_unit" ||
                      hasWorkUnitValidationKey(destination.validationJson))
                      ? workUnitOptionsFromValidation({
                          validationJson: destination.validationJson,
                          workUnitTypes: [...workUnitTypeById.values()],
                          projectWorkUnits,
                        })
                      : {};
                  const destinationFactType =
                    destination?.factType === "string" &&
                    workUnitEditorMetadata.editorWorkUnitTypeKey
                      ? ("work_unit" as const)
                      : destination?.factType;
                  const authoredPrefillValueJson = resolveInvokeDraftFactValue({
                    factValues: sourceDraftTemplate?.factValues ?? [],
                    destinationDefinitionId: definitionId,
                    destinationFactType,
                    destinationCardinality: destination?.cardinality,
                  });
                  const editorNestedFields = destination
                    ? editorNestedFieldsFromValidation({
                        validationJson: destination.validationJson,
                        workUnitTypes: [...workUnitTypeById.values()],
                        projectWorkUnits,
                      })
                    : undefined;

                  return [
                    {
                      destinationKind: "work_unit_fact" as const,
                      destinationDefinitionId: definitionId,
                      destinationLabel: destination?.label ?? humanizeKey(definitionId),
                      destinationFactType,
                      destinationCardinality: destination?.cardinality,
                      ...(destination?.validationJson
                        ? { validation: destination.validationJson }
                        : {}),
                      ...(workUnitEditorMetadata.editorOptions
                        ? { editorOptions: workUnitEditorMetadata.editorOptions }
                        : bindingEditorOptions
                          ? { editorOptions: bindingEditorOptions }
                          : {}),
                      ...(editorNestedFields && editorNestedFields.length > 0
                        ? { editorNestedFields }
                        : {}),
                      ...(workUnitEditorMetadata.editorEmptyState
                        ? { editorEmptyState: workUnitEditorMetadata.editorEmptyState }
                        : {}),
                      ...(workUnitEditorMetadata.editorWorkUnitTypeKey
                        ? { editorWorkUnitTypeKey: workUnitEditorMetadata.editorWorkUnitTypeKey }
                        : {}),
                      sourceKind: "context_fact" as const,
                      sourceContextFactDefinitionId,
                      sourceContextFactKey: sourceContextFact.key,
                      sourceContextFactLabel: getContextFactLabel(sourceContextFact),
                      sourceContextFactKind: sourceContextFact.kind,
                      sourceContextFactCardinality: sourceContextFact.cardinality,
                      sourceContextFactValueType: getContextFactValueTypeLabel(sourceContextFact),
                      ...(typeof authoredPrefillValueJson !== "undefined"
                        ? {
                            authoredPrefillValueJson,
                            resolvedValueJson: authoredPrefillValueJson,
                          }
                        : {}),
                      requiresRuntimeValue: false,
                    },
                  ];
                }),
                ...sourceContextFact.selectedArtifactSlotDefinitionIds.map((definitionId) => {
                  const destination = artifactSlotDefinitionsById.get(definitionId);
                  const authoredPrefillValueJson = sourceDraftTemplate?.artifactSlots
                    .find((entry) => entry.artifactSlotDefinitionId === definitionId)
                    ?.files.find((file) => file.clear !== true)?.relativePath;
                  const artifactEditorMetadata = artifactOptionsFromContextFacts({
                    destinationArtifactSlotDefinitionId: definitionId,
                    workflowContextFacts,
                    workflowEditorContextFacts: workflowEditor.contextFacts,
                    projectRootPath: project?.projectRootPath ?? undefined,
                    sandboxGit,
                  });

                  return {
                    destinationKind: "artifact_slot" as const,
                    destinationDefinitionId: definitionId,
                    destinationLabel: destination?.label ?? humanizeKey(definitionId),
                    destinationCardinality: destination?.cardinality,
                    ...(artifactEditorMetadata.editorOptions
                      ? { editorOptions: artifactEditorMetadata.editorOptions }
                      : {}),
                    ...(artifactEditorMetadata.editorEmptyState
                      ? { editorEmptyState: artifactEditorMetadata.editorEmptyState }
                      : {}),
                    sourceKind: "context_fact" as const,
                    sourceContextFactDefinitionId,
                    sourceContextFactKey: sourceContextFact.key,
                    sourceContextFactLabel: getContextFactLabel(sourceContextFact),
                    sourceContextFactKind: sourceContextFact.kind,
                    sourceContextFactCardinality: sourceContextFact.cardinality,
                    sourceContextFactValueType: getContextFactValueTypeLabel(sourceContextFact),
                    ...(artifactEditorMetadata.sourceWarnings?.length
                      ? { sourceWarnings: artifactEditorMetadata.sourceWarnings }
                      : {}),
                    ...(typeof authoredPrefillValueJson !== "undefined"
                      ? {
                          authoredPrefillValueJson: { relativePath: authoredPrefillValueJson },
                          resolvedValueJson: { relativePath: authoredPrefillValueJson },
                        }
                      : {}),
                    requiresRuntimeValue: false,
                  };
                }),
              ]
            : [];

        const invokeBindingPreview: RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number]["bindingPreview"] =
          invokeTargetKind === "work_unit"
            ? [
                ...draftSpecBindingPreview,
                ...(workUnitInvokePayload?.bindings ?? []).map((binding) => {
                  if (binding.destination.kind === "work_unit_fact") {
                    const destination = workUnitFactDefinitionsById.get(
                      binding.destination.workUnitFactDefinitionId,
                    );
                    const sourceContextFactDefinitionId =
                      binding.source.kind === "context_fact"
                        ? binding.source.contextFactDefinitionId
                        : undefined;
                    const sourceContextFact = sourceContextFactDefinitionId
                      ? contextFactsByDefinitionId.get(sourceContextFactDefinitionId)
                      : undefined;
                    const sourceInstances = sourceContextFactDefinitionId
                      ? workflowContextFacts
                          .filter(
                            (fact) =>
                              fact.contextFactDefinitionId === sourceContextFactDefinitionId,
                          )
                          .sort((left, right) => left.instanceOrder - right.instanceOrder)
                      : [];
                    const bindingEditorOptions = optionListFromValidation(
                      destination?.validationJson,
                    );
                    const workUnitEditorMetadata =
                      destination &&
                      (destination.factType === "work_unit" ||
                        hasWorkUnitValidationKey(destination.validationJson))
                        ? workUnitOptionsFromValidation({
                            validationJson: destination.validationJson,
                            workUnitTypes: [...workUnitTypeById.values()],
                            projectWorkUnits,
                          })
                        : {};
                    const destinationFactType =
                      destination?.factType === "string" &&
                      workUnitEditorMetadata.editorWorkUnitTypeKey
                        ? ("work_unit" as const)
                        : destination?.factType;
                    const authoredPrefillValueJson =
                      binding.source.kind === "literal"
                        ? binding.source.value
                        : binding.source.kind === "context_fact"
                          ? sourceContextFact?.kind === "work_unit_draft_spec_fact"
                            ? resolveInvokeDraftFactValue({
                                factValues: sourceDraftTemplate?.factValues ?? [],
                                destinationDefinitionId:
                                  binding.destination.workUnitFactDefinitionId,
                                destinationFactType,
                                destinationCardinality: destination?.cardinality,
                              })
                            : resolveBindingSourceValue({ sourceContextFact, sourceInstances })
                          : undefined;
                    const editorNestedFields = destination
                      ? editorNestedFieldsFromValidation({
                          validationJson: destination.validationJson,
                          workUnitTypes: [...workUnitTypeById.values()],
                          projectWorkUnits,
                        })
                      : undefined;

                    return {
                      destinationKind: "work_unit_fact",
                      destinationDefinitionId: binding.destination.workUnitFactDefinitionId,
                      destinationLabel:
                        destination?.label ??
                        humanizeKey(binding.destination.workUnitFactDefinitionId),
                      destinationFactType,
                      destinationCardinality: destination?.cardinality,
                      ...(destination?.validationJson
                        ? { validation: destination.validationJson }
                        : {}),
                      ...(workUnitEditorMetadata.editorOptions
                        ? { editorOptions: workUnitEditorMetadata.editorOptions }
                        : bindingEditorOptions
                          ? { editorOptions: bindingEditorOptions }
                          : {}),
                      ...(editorNestedFields && editorNestedFields.length > 0
                        ? { editorNestedFields }
                        : {}),
                      ...(workUnitEditorMetadata.editorEmptyState
                        ? { editorEmptyState: workUnitEditorMetadata.editorEmptyState }
                        : {}),
                      ...(workUnitEditorMetadata.editorWorkUnitTypeKey
                        ? { editorWorkUnitTypeKey: workUnitEditorMetadata.editorWorkUnitTypeKey }
                        : {}),
                      sourceKind: binding.source.kind,
                      sourceContextFactDefinitionId: sourceContextFactDefinitionId,
                      sourceContextFactKey: sourceContextFact?.key,
                      sourceContextFactLabel: sourceContextFact
                        ? getContextFactLabel(sourceContextFact)
                        : undefined,
                      sourceContextFactKind: sourceContextFact?.kind,
                      sourceContextFactCardinality: sourceContextFact?.cardinality,
                      sourceContextFactValueType: getContextFactValueTypeLabel(sourceContextFact),
                      ...(typeof authoredPrefillValueJson !== "undefined"
                        ? {
                            authoredPrefillValueJson,
                            resolvedValueJson: authoredPrefillValueJson,
                          }
                        : {}),
                      requiresRuntimeValue: binding.source.kind === "runtime",
                    };
                  }

                  const destination = artifactSlotDefinitionsById.get(
                    binding.destination.artifactSlotDefinitionId,
                  );
                  const sourceContextFactDefinitionId =
                    binding.source.kind === "context_fact"
                      ? binding.source.contextFactDefinitionId
                      : undefined;
                  const sourceContextFact = sourceContextFactDefinitionId
                    ? contextFactsByDefinitionId.get(sourceContextFactDefinitionId)
                    : undefined;
                  const sourceInstances = sourceContextFactDefinitionId
                    ? workflowContextFacts
                        .filter(
                          (fact) => fact.contextFactDefinitionId === sourceContextFactDefinitionId,
                        )
                        .sort((left, right) => left.instanceOrder - right.instanceOrder)
                    : [];
                  const authoredPrefillValueJson =
                    binding.source.kind === "literal"
                      ? binding.source.value
                      : binding.source.kind === "context_fact"
                        ? sourceContextFact?.kind === "artifact_slot_reference_fact" &&
                          sourceContextFact.slotDefinitionId ===
                            binding.destination.artifactSlotDefinitionId
                          ? sourceInstances.length === 0
                            ? undefined
                            : sourceContextFact.cardinality === "many"
                              ? sourceInstances.map((instance) => instance.valueJson)
                              : sourceInstances[0]?.valueJson
                          : isFilePathPlainContextFact(sourceContextFact)
                            ? sourceInstances.length === 0
                              ? undefined
                              : sourceInstances[0]?.valueJson
                            : sourceContextFact?.kind === "work_unit_draft_spec_fact"
                              ? sourceDraftTemplate?.artifactSlots
                                  .find(
                                    (slot) =>
                                      slot.artifactSlotDefinitionId ===
                                      binding.destination.artifactSlotDefinitionId,
                                  )
                                  ?.files.find((file) => file.clear !== true)?.relativePath
                              : undefined
                        : undefined;

                  const artifactEditorMetadata = artifactOptionsFromContextFacts({
                    destinationArtifactSlotDefinitionId:
                      binding.destination.artifactSlotDefinitionId,
                    workflowContextFacts,
                    workflowEditorContextFacts: workflowEditor.contextFacts,
                    projectRootPath: project?.projectRootPath ?? undefined,
                    sandboxGit,
                  });

                  return {
                    destinationKind: "artifact_slot",
                    destinationDefinitionId: binding.destination.artifactSlotDefinitionId,
                    destinationLabel:
                      destination?.label ??
                      humanizeKey(binding.destination.artifactSlotDefinitionId),
                    destinationCardinality: destination?.cardinality,
                    ...(artifactEditorMetadata.editorOptions
                      ? { editorOptions: artifactEditorMetadata.editorOptions }
                      : {}),
                    ...(artifactEditorMetadata.editorEmptyState
                      ? { editorEmptyState: artifactEditorMetadata.editorEmptyState }
                      : {}),
                    sourceKind: binding.source.kind,
                    sourceContextFactDefinitionId: sourceContextFactDefinitionId,
                    sourceContextFactKey: sourceContextFact?.key,
                    sourceContextFactLabel: sourceContextFact
                      ? getContextFactLabel(sourceContextFact)
                      : undefined,
                    sourceContextFactKind: sourceContextFact?.kind,
                    sourceContextFactCardinality: sourceContextFact?.cardinality,
                    sourceContextFactValueType: getContextFactValueTypeLabel(sourceContextFact),
                    ...(artifactEditorMetadata.sourceWarnings?.length
                      ? { sourceWarnings: artifactEditorMetadata.sourceWarnings }
                      : {}),
                    ...(typeof authoredPrefillValueJson !== "undefined"
                      ? {
                          authoredPrefillValueJson,
                          resolvedValueJson: authoredPrefillValueJson,
                        }
                      : {}),
                    requiresRuntimeValue: binding.source.kind === "runtime",
                  };
                }),
              ]
            : [];

        const workUnitBindingDebugSummary = invokeBindingPreview
          .filter((binding) => binding.destinationKind === "work_unit_fact")
          .map((binding) => ({
            destinationDefinitionId: binding.destinationDefinitionId,
            destinationFactType: binding.destinationFactType,
            destinationCardinality: binding.destinationCardinality,
            editorWorkUnitTypeKey: binding.editorWorkUnitTypeKey,
            editorOptionsCount: binding.editorOptions?.length ?? 0,
            sourceKind: binding.sourceKind,
          }));

        if (workUnitBindingDebugSummary.length > 0) {
          yield* Effect.logInfo("invoke binding preview metadata").pipe(
            Effect.annotateLogs({
              service: "invoke-step-detail",
              stepExecutionId: stepExecution.id,
              workflowExecutionId: stepExecution.workflowExecutionId,
              invokeStepDefinitionId: stepExecution.stepDefinitionId,
              sourceMode: invokePayload.sourceMode,
              workUnitBindingDebugSummaryCount: workUnitBindingDebugSummary.length,
            }),
          );
        }

        const childWorkflowRows = yield* Effect.forEach(
          workflowTargetRows
            .map((row) => row.workflowExecutionId)
            .filter((value): value is string => typeof value === "string"),
          (workflowExecutionId) => workflowRepo.getWorkflowExecutionById(workflowExecutionId),
        );
        const childWorkflowsById = new Map(
          childWorkflowRows.flatMap((workflow) =>
            workflow ? [[workflow.id, workflow] as const] : [],
          ),
        );

        const childWorkflowStepRows = yield* Effect.forEach(
          childWorkflowRows
            .flatMap((workflow) =>
              typeof workflow?.currentStepExecutionId === "string"
                ? [workflow.currentStepExecutionId]
                : [],
            )
            .filter((value): value is string => typeof value === "string"),
          (stepExecutionId) => stepRepo.getStepExecutionById(stepExecutionId),
        );
        const childWorkflowStepRowsById = new Map(
          childWorkflowStepRows.flatMap((row) => (row ? [[row.id, row] as const] : [])),
        );

        const childWorkflowEditorsById = new Map<string, typeof workflowEditor>();
        for (const workflow of childWorkflowRows) {
          if (!workflow) {
            continue;
          }
          const workflowDefinition = workflowDefinitionsById.get(workflow.workflowId);
          if (
            !workflowDefinition?.workUnitTypeKey ||
            childWorkflowEditorsById.has(workflow.workflowId)
          ) {
            continue;
          }

          const editor = yield* methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workflowDefinition.workUnitTypeKey,
            workflowDefinitionId: workflow.workflowId,
          });
          childWorkflowEditorsById.set(workflow.workflowId, editor);
        }

        const childTransitionRows = yield* Effect.forEach(
          workUnitTargetRows
            .map((row) => row.transitionExecutionId)
            .filter((value): value is string => typeof value === "string"),
          (transitionExecutionId) =>
            transitionRepo.getTransitionExecutionById(transitionExecutionId),
        );
        const childTransitionsById = new Map(
          childTransitionRows.flatMap((transition) =>
            transition ? [[transition.id, transition] as const] : [],
          ),
        );

        const startedProjectWorkUnits = yield* Effect.forEach(
          workUnitTargetRows
            .map((row) => row.projectWorkUnitId)
            .filter((value): value is string => typeof value === "string"),
          (projectWorkUnitId) => projectWorkUnitRepo.getProjectWorkUnitById(projectWorkUnitId),
        );
        const startedProjectWorkUnitFacts = yield* Effect.forEach(
          startedProjectWorkUnits.flatMap((workUnit) => (workUnit ? [workUnit.id] : [])),
          (projectWorkUnitId) => workUnitFactRepo.listFactsByWorkUnit({ projectWorkUnitId }),
        );
        const projectWorkUnitsById = new Map(
          startedProjectWorkUnits.flatMap((workUnit) =>
            workUnit ? [[workUnit.id, workUnit] as const] : [],
          ),
        );
        const startedFactInstancesByWorkUnitId = new Map(
          startedProjectWorkUnits.flatMap((workUnit, index) =>
            workUnit ? [[workUnit.id, startedProjectWorkUnitFacts[index] ?? []] as const] : [],
          ),
        );

        const propagationWorkUnitDefinitionIds = new Set(
          workUnitTargetRows.map((row) => row.workUnitDefinitionId),
        );

        const propagationOutputs = workflowEditor.contextFacts.filter((contextFact) =>
          invokeTargetKind === "workflow"
            ? contextFact.kind === "workflow_ref_fact"
            : contextFact.kind === "work_unit_draft_spec_fact" &&
              propagationWorkUnitDefinitionIds.has(contextFact.workUnitDefinitionId),
        );

        const workflowTargets = workflowTargetRows.map((row) => {
          const workflowDefinition = workflowDefinitionsById.get(row.workflowDefinitionId);
          const childWorkflow = row.workflowExecutionId
            ? childWorkflowsById.get(row.workflowExecutionId)
            : undefined;

          const status: RuntimeInvokeTargetStatus = !row.workflowExecutionId
            ? "not_started"
            : !childWorkflow
              ? "unavailable"
              : childWorkflow.status === "completed"
                ? "completed"
                : childWorkflow.status === "active"
                  ? "active"
                  : "failed";

          const activeChildStepLabel =
            status === "active" && childWorkflow?.currentStepExecutionId
              ? (() => {
                  const currentStepRow = childWorkflowStepRowsById.get(
                    childWorkflow.currentStepExecutionId,
                  );
                  const editor = childWorkflowEditorsById.get(childWorkflow.workflowId);
                  const stepDefinition = currentStepRow
                    ? editor?.steps.find((step) => step.stepId === currentStepRow.stepDefinitionId)
                    : undefined;
                  const stepPayload =
                    stepDefinition && "payload" in stepDefinition ? stepDefinition.payload : null;

                  return (
                    stepPayload?.label ??
                    (stepPayload?.key ? humanizeKey(stepPayload.key) : undefined)
                  );
                })()
              : undefined;

          return {
            label: getWorkflowDefinitionName(workflowDefinition, row.workflowDefinitionId),
            status,
            activeChildStepLabel,
            invokeWorkflowTargetExecutionId: row.id,
            workflowDefinitionId: row.workflowDefinitionId,
            workflowDefinitionKey: workflowDefinition?.workflowDefinitionKey,
            workflowDefinitionName: workflowDefinition?.workflowDefinitionName,
            workflowExecutionId: row.workflowExecutionId ?? undefined,
            actions: {
              ...(!row.workflowExecutionId
                ? {
                    start: {
                      kind: "start_invoke_workflow_target" as const,
                      enabled: stepExecution.status === "active",
                      reasonIfDisabled:
                        stepExecution.status !== "active"
                          ? "Only active invoke steps can start child workflows."
                          : undefined,
                      invokeWorkflowTargetExecutionId: row.id,
                    },
                  }
                : {}),
              ...(row.workflowExecutionId
                ? {
                    openWorkflow: {
                      kind: "open_workflow_execution" as const,
                      workflowExecutionId: row.workflowExecutionId,
                      target: {
                        page: "workflow-execution-detail" as const,
                        workflowExecutionId: row.workflowExecutionId,
                      },
                    },
                  }
                : {}),
            },
          } satisfies RuntimeInvokeStepExecutionDetailBody["workflowTargets"][number];
        });

        const workflowOptionsByTransitionId = new Map<
          string,
          RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number]["availablePrimaryWorkflows"]
        >(
          invokeTargetKind === "work_unit"
            ? (workUnitInvokePayload?.activationTransitions ?? []).map((transition) => [
                transition.transitionId,
                transition.workflowDefinitionIds.map((workflowDefinitionId) => {
                  const summary = workflowDefinitionsById.get(workflowDefinitionId);
                  return {
                    workflowDefinitionId,
                    workflowDefinitionKey: summary?.workflowDefinitionKey,
                    workflowDefinitionName: getWorkflowDefinitionName(
                      summary,
                      workflowDefinitionId,
                    ),
                  };
                }),
              ])
            : [],
        );

        const buildWorkUnitTarget = (row: (typeof workUnitTargetRows)[number]) =>
          Effect.gen(function* () {
            const workUnitType = workUnitTypeById.get(row.workUnitDefinitionId);
            const transition = transitionsById.get(row.transitionDefinitionId);
            const availablePrimaryWorkflows =
              workflowOptionsByTransitionId.get(row.transitionDefinitionId) ?? [];
            const selectedWorkflow = row.workflowDefinitionId
              ? workflowDefinitionsById.get(row.workflowDefinitionId)
              : undefined;
            const projectWorkUnit = row.projectWorkUnitId
              ? projectWorkUnitsById.get(row.projectWorkUnitId)
              : undefined;
            const transitionExecution = row.transitionExecutionId
              ? childTransitionsById.get(row.transitionExecutionId)
              : undefined;

            const partiallyStarted =
              !!row.projectWorkUnitId ||
              !!row.transitionExecutionId ||
              !!row.workflowDefinitionId ||
              !!row.workflowExecutionId;
            const fullyStarted =
              !!row.projectWorkUnitId &&
              !!row.transitionExecutionId &&
              !!row.workflowDefinitionId &&
              !!row.workflowExecutionId;

            const currentWorkUnitStateLabel =
              projectWorkUnit?.currentStateId && projectWorkUnit.workUnitTypeId
                ? (statesByWorkUnitTypeId
                    .get(projectWorkUnit.workUnitTypeId)
                    ?.get(projectWorkUnit.currentStateId) ?? projectWorkUnit.currentStateId)
                : undefined;
            const startedFactInstancesByDefinitionId = new Map<
              string,
              (typeof startedProjectWorkUnitFacts)[number]
            >();
            for (const fact of row.projectWorkUnitId
              ? (startedFactInstancesByWorkUnitId.get(row.projectWorkUnitId) ?? [])
              : []) {
              if (fact.status !== "active") {
                continue;
              }

              const entries = startedFactInstancesByDefinitionId.get(fact.factDefinitionId) ?? [];
              entries.push(fact);
              startedFactInstancesByDefinitionId.set(fact.factDefinitionId, entries);
            }
            const actualArtifactStatesByDefinitionId = new Map<string, ArtifactCurrentState>();
            if (row.projectWorkUnitId) {
              const artifactBindings = invokeBindingPreview.filter(
                (
                  binding,
                ): binding is Extract<typeof binding, { destinationKind: "artifact_slot" }> =>
                  binding.destinationKind === "artifact_slot",
              );
              const artifactStates = yield* Effect.forEach(artifactBindings, (binding) =>
                artifactRepo.getCurrentSnapshotBySlot({
                  projectWorkUnitId: row.projectWorkUnitId!,
                  slotDefinitionId: binding.destinationDefinitionId,
                }),
              );
              for (const [index, binding] of artifactBindings.entries()) {
                const state = artifactStates[index];
                if (state) {
                  actualArtifactStatesByDefinitionId.set(binding.destinationDefinitionId, state);
                }
              }
            }
            const childWorkflow = row.workflowExecutionId
              ? childWorkflowsById.get(row.workflowExecutionId)
              : undefined;
            const frozenDraftTemplate = normalizeFrozenDraftTemplate(row.frozenDraftTemplateJson);
            const rowBindingPreview = invokeBindingPreview.map((binding) => {
              if (!row.projectWorkUnitId && frozenDraftTemplate) {
                if (binding.destinationKind === "work_unit_fact") {
                  const savedFactValue = resolveInvokeDraftFactValue({
                    factValues: frozenDraftTemplate.factValues,
                    destinationDefinitionId: binding.destinationDefinitionId,
                    destinationFactType: binding.destinationFactType,
                    destinationCardinality: binding.destinationCardinality,
                  });
                  if (typeof savedFactValue !== "undefined") {
                    return {
                      ...binding,
                      savedDraftValueJson: savedFactValue,
                      resolvedValueJson: savedFactValue,
                    };
                  }
                } else {
                  const savedArtifactSlot = frozenDraftTemplate.artifactSlots.find(
                    (entry) => entry.artifactSlotDefinitionId === binding.destinationDefinitionId,
                  );
                  if (savedArtifactSlot) {
                    const presentFiles = savedArtifactSlot.files.filter(
                      (file) => file.clear !== true,
                    );
                    const resolvedValueJson =
                      binding.destinationCardinality === "many"
                        ? presentFiles.map((file) => ({
                            ...(file.relativePath ? { relativePath: file.relativePath } : {}),
                            ...(file.sourceContextFactDefinitionId
                              ? {
                                  sourceContextFactDefinitionId: file.sourceContextFactDefinitionId,
                                }
                              : {}),
                          }))
                        : presentFiles[0]?.relativePath
                          ? {
                              relativePath: presentFiles[0].relativePath,
                              ...(presentFiles[0].sourceContextFactDefinitionId
                                ? {
                                    sourceContextFactDefinitionId:
                                      presentFiles[0].sourceContextFactDefinitionId,
                                  }
                                : {}),
                            }
                          : undefined;
                    return {
                      ...binding,
                      ...(typeof resolvedValueJson !== "undefined"
                        ? { savedDraftValueJson: resolvedValueJson }
                        : {}),
                      ...(typeof resolvedValueJson !== "undefined" ? { resolvedValueJson } : {}),
                    };
                  }
                }
              }

              if (binding.destinationKind !== "work_unit_fact") {
                const artifactState = actualArtifactStatesByDefinitionId.get(
                  binding.destinationDefinitionId,
                );
                if (!artifactState) {
                  return binding;
                }

                const actualChildValueJson = toChildArtifactDisplayValue({
                  destinationCardinality: binding.destinationCardinality,
                  artifactState,
                });

                return {
                  ...binding,
                  ...(typeof actualChildValueJson !== "undefined" ? { actualChildValueJson } : {}),
                  ...(typeof actualChildValueJson !== "undefined"
                    ? { resolvedValueJson: actualChildValueJson }
                    : {}),
                };
              }

              const startedFactInstances = startedFactInstancesByDefinitionId.get(
                binding.destinationDefinitionId,
              );
              if (!startedFactInstances || startedFactInstances.length === 0) {
                return binding;
              }

              const actualChildValueJson = toChildFactDisplayValue({
                destinationFactType: binding.destinationFactType,
                destinationCardinality: binding.destinationCardinality,
                factInstances: startedFactInstances,
              });

              return {
                ...binding,
                ...(typeof actualChildValueJson !== "undefined" ? { actualChildValueJson } : {}),
                ...(typeof actualChildValueJson !== "undefined"
                  ? { resolvedValueJson: actualChildValueJson }
                  : {}),
              };
            });

            const projectedWorkUnitFactsByDefinitionId = new Map<
              string,
              RuntimeGateProjectedWorkUnitFactValue[]
            >();
            const projectedArtifactSlotsByDefinitionId = new Map<
              string,
              RuntimeGateProjectedArtifactSlotValue
            >();
            for (const binding of rowBindingPreview) {
              if (binding.destinationKind === "work_unit_fact") {
                const projectedValue = toProjectedWorkUnitFactValue(
                  binding.destinationFactType,
                  binding.resolvedValueJson,
                );
                if (!projectedValue) {
                  continue;
                }

                const entries =
                  projectedWorkUnitFactsByDefinitionId.get(binding.destinationDefinitionId) ?? [];
                entries.push(projectedValue);
                projectedWorkUnitFactsByDefinitionId.set(binding.destinationDefinitionId, entries);
                continue;
              }

              const projectedArtifact = toProjectedArtifactSlotValue(binding.resolvedValueJson);
              if (projectedArtifact) {
                projectedArtifactSlotsByDefinitionId.set(
                  binding.destinationDefinitionId,
                  projectedArtifact,
                );
              }
            }

            const startGateConditionTree = startGateTreesByTransitionId.get(
              row.transitionDefinitionId,
            ) ?? {
              mode: "all",
              conditions: [],
              groups: [],
            };
            const startGateEvaluation = yield* runtimeGate
              .evaluateStartGateExhaustive({
                projectId,
                ...(row.projectWorkUnitId ? { projectWorkUnitId: row.projectWorkUnitId } : {}),
                conditionTree: startGateConditionTree,
                projectedWorkUnitFactsByDefinitionId,
                projectedArtifactSlotsByDefinitionId,
              })
              .pipe(Effect.mapError(mapGateError));
            const completionGateConditionTree = completionGateTreesByTransitionId.get(
              row.transitionDefinitionId,
            ) ?? {
              mode: "all",
              conditions: [],
              groups: [],
            };
            const completionGateEvaluation =
              row.projectWorkUnitId &&
              transitionExecution &&
              transitionExecution.status === "active"
                ? yield* runtimeGate
                    .evaluateCompletionGateExhaustive({
                      projectId,
                      projectWorkUnitId: row.projectWorkUnitId,
                      conditionTree: completionGateConditionTree,
                    })
                    .pipe(Effect.mapError(mapGateError))
                : null;
            const startGateBlockingReason =
              startGateEvaluation.result !== "available"
                ? (startGateEvaluation.firstReason ?? "Start gate failed.")
                : undefined;
            const completionGate =
              row.projectWorkUnitId && transitionExecution?.status === "active"
                ? childWorkflow?.status === "active"
                  ? {
                      panelState: "workflow_running" as const,
                      evaluatedAt: completionGateEvaluation?.evaluatedAt,
                    }
                  : completionGateEvaluation?.result === "available"
                    ? {
                        panelState: "passing" as const,
                        conditionTree: completionGateConditionTree,
                        evaluationTree: completionGateEvaluation.evaluationTree,
                        evaluatedAt: completionGateEvaluation.evaluatedAt,
                      }
                    : {
                        panelState: "failing" as const,
                        conditionTree: completionGateConditionTree,
                        evaluationTree: completionGateEvaluation?.evaluationTree,
                        firstBlockingReason: completionGateEvaluation?.firstReason,
                        evaluatedAt: completionGateEvaluation?.evaluatedAt,
                      }
                : undefined;

            const blockedReason = !fullyStarted
              ? availablePrimaryWorkflows.length === 0
                ? "No primary workflows are available for this transition."
                : partiallyStarted
                  ? "Invoke target is in a partially started state."
                  : startGateBlockingReason
                    ? startGateBlockingReason
                    : undefined
              : !transitionExecution
                ? "Started transition execution could not be resolved."
                : transitionExecution.status === "superseded"
                  ? "Started transition path was superseded before completion."
                  : undefined;

            const status: RuntimeInvokeTargetStatus = !partiallyStarted
              ? availablePrimaryWorkflows.length === 0
                ? "blocked"
                : startGateBlockingReason
                  ? "blocked"
                  : "not_started"
              : !fullyStarted
                ? "failed"
                : !transitionExecution || !projectWorkUnit
                  ? "unavailable"
                  : transitionExecution.status === "completed"
                    ? "completed"
                    : transitionExecution.status === "active"
                      ? "active"
                      : "failed";

            return {
              workUnitLabel: formatWorkUnitLabel(
                getWorkUnitTypeName(workUnitType, row.workUnitDefinitionId),
                row.projectWorkUnitId ?? undefined,
              ),
              targetFamilyKey: `${row.workUnitDefinitionId}:${row.transitionDefinitionId}`,
              workUnitCardinality: isManyProjectCardinality(workUnitType?.cardinality)
                ? "many_per_project"
                : "one_per_project",
              transitionLabel: getTransitionLabel(transition, row.transitionDefinitionId),
              transitionFromStateLabel: transition?.transitionFromStateLabel,
              transitionToStateLabel: transition?.transitionToStateLabel,
              workflowLabel: row.workflowDefinitionId
                ? getWorkflowDefinitionName(selectedWorkflow, row.workflowDefinitionId)
                : undefined,
              currentWorkUnitStateLabel,
              status,
              blockedReason,
              availablePrimaryWorkflows,
              invokeWorkUnitTargetExecutionId: row.id,
              projectWorkUnitId: row.projectWorkUnitId ?? undefined,
              workUnitDefinitionId: row.workUnitDefinitionId,
              workUnitDefinitionKey: workUnitType?.key,
              workUnitDefinitionName: workUnitType?.name,
              transitionDefinitionId: row.transitionDefinitionId,
              transitionDefinitionKey: transition?.transitionDefinitionKey,
              workflowDefinitionId: row.workflowDefinitionId ?? undefined,
              workflowDefinitionKey: selectedWorkflow?.workflowDefinitionKey,
              transitionExecutionId: row.transitionExecutionId ?? undefined,
              workflowExecutionId: row.workflowExecutionId ?? undefined,
              childSummary:
                projectWorkUnit && currentWorkUnitStateLabel
                  ? {
                      projectWorkUnitId: projectWorkUnit.id,
                      label:
                        typeof projectWorkUnit.displayName === "string" &&
                        projectWorkUnit.displayName.trim().length > 0
                          ? projectWorkUnit.displayName.trim()
                          : isManyProjectCardinality(workUnitType?.cardinality)
                            ? `${workUnitType?.key ?? row.workUnitDefinitionId}:${shortId(projectWorkUnit.id)}`
                            : getWorkUnitTypeName(workUnitType, row.workUnitDefinitionId),
                      currentStateLabel: currentWorkUnitStateLabel,
                      transitionExecutionId: row.transitionExecutionId ?? undefined,
                      transitionStatus: transitionExecution?.status,
                      workflowExecutionId: row.workflowExecutionId ?? undefined,
                      workflowStatus: childWorkflow?.status,
                    }
                  : undefined,
              startGate: {
                conditionTree: startGateConditionTree,
                evaluationTree: startGateEvaluation.evaluationTree,
                firstBlockingReason: startGateEvaluation.firstReason,
                evaluatedAt: startGateEvaluation.evaluatedAt,
              },
              completionGate,
              actions: {
                ...(!fullyStarted
                  ? {
                      start: {
                        kind: "start_invoke_work_unit_target" as const,
                        enabled:
                          stepExecution.status === "active" &&
                          status !== "blocked" &&
                          availablePrimaryWorkflows.length > 0,
                        reasonIfDisabled:
                          stepExecution.status !== "active"
                            ? "Only active invoke steps can start child work units."
                            : status === "blocked"
                              ? blockedReason
                              : availablePrimaryWorkflows.length === 0
                                ? "No primary workflows are available for this transition."
                                : undefined,
                        invokeWorkUnitTargetExecutionId: row.id,
                      },
                    }
                  : {}),
                ...(row.projectWorkUnitId
                  ? {
                      openWorkUnit: {
                        kind: "open_work_unit" as const,
                        projectWorkUnitId: row.projectWorkUnitId,
                        target: {
                          page: "work-unit-overview" as const,
                          projectWorkUnitId: row.projectWorkUnitId,
                        },
                      },
                    }
                  : {}),
                ...(row.transitionExecutionId
                  ? {
                      openTransition: {
                        kind: "open_transition_execution" as const,
                        transitionExecutionId: row.transitionExecutionId,
                        target: {
                          page: "transition-execution-detail" as const,
                          transitionExecutionId: row.transitionExecutionId,
                        },
                      },
                    }
                  : {}),
                ...(row.workflowExecutionId
                  ? {
                      openWorkflow: {
                        kind: "open_workflow_execution" as const,
                        workflowExecutionId: row.workflowExecutionId,
                        target: {
                          page: "workflow-execution-detail" as const,
                          workflowExecutionId: row.workflowExecutionId,
                        },
                      },
                    }
                  : {}),
              },
              bindingPreview: rowBindingPreview,
            } satisfies RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number];
          });

        const workUnitTargets = yield* Effect.forEach(workUnitTargetRows, buildWorkUnitTarget);

        const relevantTargets = invokeTargetKind === "workflow" ? workflowTargets : workUnitTargets;
        const completedTargets = relevantTargets.filter(
          (target) => target.status === "completed",
        ).length;
        const reasonIfIneligible = completionEligibility.reasonIfIneligible ?? undefined;

        return {
          stepType: "invoke",
          targetKind: invokeTargetKind,
          sourceMode: invokePayload.sourceMode,
          sourceContextFactDefinitionId,
          sourceContextFactKey: sourceContextFact?.key,
          sourceContextFactLabel: sourceContextFact
            ? getContextFactLabel(sourceContextFact)
            : undefined,
          sourceContextFactKind: sourceContextFact?.kind,
          sourceContextFactCardinality: sourceContextFact?.cardinality,
          sourceContextFactValueType: getContextFactValueTypeLabel(sourceContextFact),
          sourceContextFactWorkUnitDefinitionName: getContextFactWorkUnitDefinitionName({
            contextFact: sourceContextFact,
            workUnitTypeById,
          }),
          sourceContextFactInstanceValues: sourceContextFactInstances.map((instance) =>
            normalizeContextFactInstanceValue({
              contextFact: sourceContextFact,
              valueJson: instance.valueJson,
            }),
          ),
          workflowTargets,
          workUnitTargets,
          completionSummary: {
            mode: "manual",
            eligible: completionEligibility.eligible,
            reasonIfIneligible,
            totalTargets: relevantTargets.length,
            completedTargets,
          },
          propagationPreview: toPropagationPreview({
            targetKind: invokeTargetKind,
            outputs: propagationOutputs,
          }),
          lineage: {},
        } satisfies RuntimeInvokeStepExecutionDetailBody;
      });

    return InvokeStepDetailService.of({
      buildInvokeStepExecutionDetailBody,
    });
  }),
);
