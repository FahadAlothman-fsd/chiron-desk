import type {
  FactCardinality,
  FactType,
  FactValidation,
  PathValidationConfig,
} from "@chiron/contracts/methodology/fact";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import type {
  GetRuntimeStepExecutionDetailInput,
  GetRuntimeStepExecutionDetailOutput,
  RuntimeFormFieldOption,
  RuntimeFormNestedField,
  RuntimeFormResolvedField,
  RuntimeFormResolvedFieldWidget,
} from "@chiron/contracts/runtime/executions";
import {
  LifecycleRepository,
  MethodologyRepository,
  type FactSchemaRow,
} from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { BranchStepRuntimeRepository } from "../repositories/branch-step-runtime-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import {
  normalizeRuntimeBoundFactFieldValue,
  toCanonicalRuntimeBoundFactEnvelope,
} from "./runtime-bound-fact-value";
import { ActionStepDetailService } from "./action-step-detail-service";
import {
  evaluateRoutes,
  getSuggestedTarget,
  toProjectWorkUnitInstanceSummaries,
} from "./branch-route-evaluator";
import { InvokeStepDetailService } from "./invoke-step-detail-service";
import { StepProgressionService } from "./step-progression-service";

const makeDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "step-execution-detail",
    cause: new Error(cause),
  });

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const extractMarkdown = (value: unknown): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const markdown = value.markdown;
  return typeof markdown === "string" && markdown.length > 0 ? markdown : undefined;
};

const humanizeKey = (value: string): string =>
  value
    .replaceAll(/[._-]+/g, " ")
    .split(" ")
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const stringifyOptionLabel = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
};

type FormFieldBinding = {
  contextFactDefinitionId: string;
  fieldLabel: string;
  fieldKey: string;
  helpText?: string | null;
  required?: boolean;
  uiMultiplicityMode?: "one" | "many" | undefined;
};

type WorkflowListItem = {
  workflowDefinitionId?: string | undefined;
  key: string;
  displayName?: string | undefined;
};

type RuntimeFactInstanceOptionSource = {
  id: string;
  valueJson: unknown;
  referencedProjectWorkUnitId?: string | null;
};

function isJsonSubSchema(
  value: unknown,
): value is NonNullable<Extract<FactValidation, { kind: "json-schema" }>["subSchema"]> {
  return isRecord(value) && value.type === "object" && Array.isArray(value.fields);
}

function parseValidation(value: unknown): FactValidation | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  switch (value.kind) {
    case "none":
      return { kind: "none" };
    case "path":
      return isRecord(value.path)
        ? ({ kind: "path", path: value.path as PathValidationConfig } satisfies FactValidation)
        : null;
    case "allowed-values":
      return Array.isArray(value.values)
        ? ({ kind: "allowed-values", values: value.values } satisfies FactValidation)
        : null;
    case "json-schema":
      return {
        kind: "json-schema",
        schemaDialect:
          typeof value.schemaDialect === "string" && value.schemaDialect.length > 0
            ? value.schemaDialect
            : "draft-2020-12",
        schema: "schema" in value ? value.schema : undefined,
        ...(isJsonSubSchema(value.subSchema) ? { subSchema: value.subSchema } : {}),
      };
    default:
      return null;
  }
}

function optionListFromValidation(
  validation: FactValidation | null,
): RuntimeFormFieldOption[] | undefined {
  if (!validation) {
    return undefined;
  }

  if (validation.kind === "allowed-values") {
    return validation.values.map((entry) => ({
      value: entry,
      label: stringifyOptionLabel(entry),
    }));
  }

  if (validation.kind !== "json-schema" || !isRecord(validation.schema)) {
    return undefined;
  }

  const enumValues = validation.schema.enum;
  if (!Array.isArray(enumValues)) {
    return undefined;
  }

  return enumValues.map((entry) => ({ value: entry, label: stringifyOptionLabel(entry) }));
}

function nestedFieldsFromValidation(
  validation: FactValidation | null,
): RuntimeFormNestedField[] | undefined {
  if (!validation || validation.kind !== "json-schema") {
    return undefined;
  }

  const required = Array.isArray(validation.schema?.required)
    ? new Set(
        validation.schema.required.filter((entry): entry is string => typeof entry === "string"),
      )
    : new Set<string>();

  if (validation.subSchema?.type === "object") {
    return validation.subSchema.fields.map((field) => ({
      key: field.key,
      label: humanizeKey(field.key),
      factType: field.type,
      cardinality: field.cardinality,
      required: required.has(field.key),
      description: extractMarkdown(field.description),
      ...(field.validation ? { validation: field.validation } : {}),
      ...(field.validation
        ? { options: optionListFromValidation(parseValidation(field.validation)) }
        : {}),
    }));
  }

  if (!isRecord(validation.schema) || !isRecord(validation.schema.properties)) {
    return undefined;
  }

  return Object.entries(validation.schema.properties).flatMap(([key, property]) => {
    if (!isRecord(property) || typeof property.type !== "string") {
      return [];
    }

    const factType =
      property.type === "string" ||
      property.type === "number" ||
      property.type === "boolean" ||
      property.type === "json" ||
      property.type === "work_unit"
        ? (property.type as FactType)
        : property.type === "object"
          ? ("json" as const)
          : null;

    if (!factType) {
      return [];
    }

    return [
      {
        key,
        label: humanizeKey(key),
        factType,
        cardinality:
          property.cardinality === "many" || property.cardinality === "one"
            ? (property.cardinality as FactCardinality)
            : ("one" as const),
        required: required.has(key),
        ...(property.validation ? { validation: property.validation } : {}),
        ...(property.validation
          ? { options: optionListFromValidation(parseValidation(property.validation)) }
          : {}),
      } satisfies RuntimeFormNestedField,
    ];
  });
}

function workUnitOptionsFromValidation(params: {
  validationJson: unknown;
  workUnitTypes: readonly { id: string; key: string; displayName: string | null }[];
  projectWorkUnits: readonly { id: string; workUnitTypeId: string }[];
}): {
  options?: RuntimeFormFieldOption[];
  workUnitTypeKey?: string;
  emptyState?: string;
} {
  if (!isRecord(params.validationJson) || typeof params.validationJson.workUnitKey !== "string") {
    return {};
  }

  const workUnitTypeKey = params.validationJson.workUnitKey;
  const workUnitType = params.workUnitTypes.find(
    (entry) =>
      entry.key === workUnitTypeKey || entry.key.toLowerCase() === workUnitTypeKey.toLowerCase(),
  );

  if (!workUnitType) {
    return { workUnitTypeKey };
  }

  const options = params.projectWorkUnits
    .filter((workUnit) => workUnit.workUnitTypeId === workUnitType.id)
    .map((workUnit) => ({
      value: { projectWorkUnitId: workUnit.id },
      label: `${workUnitType.displayName ?? workUnitType.key}:${workUnit.id.slice(0, 8)}`,
    }));

  return {
    workUnitTypeKey: workUnitType.key,
    ...(options.length > 0 ? { options } : {}),
    ...(options.length === 0
      ? {
          emptyState: `No ${workUnitType.displayName ?? workUnitType.key} work units are available yet.`,
        }
      : {}),
  };
}

function buildRuntimeFactInstanceOption(params: {
  instance: RuntimeFactInstanceOptionSource;
  factLabel: string;
  projectWorkUnitsById: ReadonlyMap<string, { id: string; workUnitTypeId: string }>;
}): RuntimeFormFieldOption {
  const runtimeValue =
    typeof params.instance.referencedProjectWorkUnitId === "string"
      ? { projectWorkUnitId: params.instance.referencedProjectWorkUnitId }
      : params.instance.valueJson;

  if (typeof params.instance.referencedProjectWorkUnitId === "string") {
    const projectWorkUnit = params.projectWorkUnitsById.get(
      params.instance.referencedProjectWorkUnitId,
    );
    const label = projectWorkUnit
      ? `${projectWorkUnit.workUnitTypeId}:${projectWorkUnit.id.slice(0, 8)}`
      : params.instance.referencedProjectWorkUnitId;

    return {
      value: toCanonicalRuntimeBoundFactEnvelope({
        instanceId: params.instance.id,
        value: runtimeValue,
      }),
      label,
      description: `${params.factLabel} reference`,
    };
  }

  return {
    value: toCanonicalRuntimeBoundFactEnvelope({
      instanceId: params.instance.id,
      value: runtimeValue,
    }),
    label: stringifyOptionLabel(params.instance.valueJson),
    description: params.factLabel,
  };
}

function resolveBoundExternalFactOptions(params: {
  bindingKey: string;
  methodologyFactDefinitions: readonly {
    id: string;
    key: string;
    name: string | null;
    cardinality: string | null;
  }[];
  workUnitFactSchemas: readonly FactSchemaRow[];
  projectFactInstances: readonly {
    id: string;
    factDefinitionId: string;
    valueJson: unknown;
  }[];
  currentWorkUnitFactInstances: readonly {
    id: string;
    factDefinitionId: string;
    valueJson: unknown;
    referencedProjectWorkUnitId: string | null;
  }[];
  projectWorkUnits: readonly { id: string; workUnitTypeId: string }[];
}): RuntimeFormFieldOption[] | undefined {
  const workUnitFactById = params.workUnitFactSchemas.find((fact) => fact.id === params.bindingKey);
  const workUnitFactByKey = params.workUnitFactSchemas.find(
    (fact) => fact.key === params.bindingKey,
  );
  const methodologyFactByKey = params.methodologyFactDefinitions.find(
    (fact) => fact.key === params.bindingKey,
  );
  const workUnitFact = workUnitFactById
    ? workUnitFactById
    : !methodologyFactByKey
      ? workUnitFactByKey
      : undefined;
  const projectWorkUnitsById = new Map(
    params.projectWorkUnits.map((workUnit) => [workUnit.id, workUnit]),
  );

  if (workUnitFact) {
    const options = params.currentWorkUnitFactInstances
      .filter((instance) => instance.factDefinitionId === workUnitFact.id)
      .map((instance) =>
        buildRuntimeFactInstanceOption({
          instance,
          factLabel: workUnitFact.name ?? humanizeKey(workUnitFact.key),
          projectWorkUnitsById,
        }),
      );

    return options.length > 0 ? options : undefined;
  }

  const methodologyFactById = params.methodologyFactDefinitions.find(
    (fact) => fact.id === params.bindingKey,
  );
  const methodologyFact = methodologyFactById
    ? methodologyFactById
    : !workUnitFactByKey
      ? methodologyFactByKey
      : undefined;
  if (!methodologyFact) {
    return undefined;
  }

  const options = params.projectFactInstances
    .filter((instance) => instance.factDefinitionId === methodologyFact.id)
    .map((instance) =>
      buildRuntimeFactInstanceOption({
        instance,
        factLabel: methodologyFact.name ?? humanizeKey(methodologyFact.key),
        projectWorkUnitsById,
      }),
    );

  return options.length > 0 ? options : undefined;
}

function buildDraftSpecNestedField(params: {
  fact: FactSchemaRow;
  workUnitTypes: readonly { id: string; key: string; displayName: string | null }[];
  projectWorkUnits: readonly { id: string; workUnitTypeId: string }[];
}): RuntimeFormNestedField {
  const validation = parseValidation(params.fact.validationJson);
  const nestedFields = nestedFieldsFromValidation(validation);
  const workUnitOptions =
    params.fact.factType === "work_unit"
      ? workUnitOptionsFromValidation({
          validationJson: params.fact.validationJson,
          workUnitTypes: params.workUnitTypes,
          projectWorkUnits: params.projectWorkUnits,
        })
      : {};

  return {
    key: params.fact.key,
    label: params.fact.name ?? humanizeKey(params.fact.key),
    factType: params.fact.factType as FactType,
    cardinality: (params.fact.cardinality ?? "one") as FactCardinality,
    required: false,
    description: params.fact.description ?? undefined,
    validation: params.fact.validationJson,
    ...(nestedFields && nestedFields.length > 0 ? { nestedFields } : {}),
    ...(workUnitOptions.options ? { options: workUnitOptions.options } : {}),
    ...(workUnitOptions.emptyState ? { emptyState: workUnitOptions.emptyState } : {}),
    ...(workUnitOptions.workUnitTypeKey
      ? { workUnitTypeKey: workUnitOptions.workUnitTypeKey }
      : {}),
  } satisfies RuntimeFormNestedField;
}

function buildPrimitiveWidget(params: {
  valueType: FactType;
  cardinality: FactCardinality;
  renderedMultiplicity: "one" | "many";
  validation?: unknown;
  externalBindingKey?: string;
}): RuntimeFormResolvedFieldWidget {
  const validation = parseValidation(params.validation);
  const options = optionListFromValidation(validation);
  const nestedFields = nestedFieldsFromValidation(validation);

  const control = (() => {
    if (params.valueType === "work_unit") {
      return "reference" as const;
    }
    if (params.valueType === "boolean") {
      return "checkbox" as const;
    }
    if (params.valueType === "number") {
      return "number" as const;
    }
    if (params.valueType === "json") {
      return "json" as const;
    }
    if (validation?.kind === "path") {
      return "path" as const;
    }
    if (options && options.length > 0) {
      return "select" as const;
    }
    return "text" as const;
  })();

  return {
    control,
    valueType: params.valueType,
    cardinality: params.cardinality,
    renderedMultiplicity: params.renderedMultiplicity,
    ...(options && options.length > 0 ? { options } : {}),
    ...(validation?.kind === "path" ? { pathConfig: validation.path } : {}),
    ...(nestedFields && nestedFields.length > 0 ? { nestedFields } : {}),
    ...(params.externalBindingKey ? { externalBindingKey: params.externalBindingKey } : {}),
  } satisfies RuntimeFormResolvedFieldWidget;
}

function buildFactSchemaLookup(rows: readonly FactSchemaRow[], currentWorkUnitTypeId: string) {
  const ordered = [...rows].sort((left, right) => {
    const leftPriority = left.workUnitTypeId === currentWorkUnitTypeId ? 0 : 1;
    const rightPriority = right.workUnitTypeId === currentWorkUnitTypeId ? 0 : 1;

    return (
      leftPriority - rightPriority ||
      left.key.localeCompare(right.key) ||
      left.id.localeCompare(right.id)
    );
  });

  const byId = new Map<string, FactSchemaRow>();
  const byKey = new Map<string, FactSchemaRow>();

  for (const row of ordered) {
    if (!byId.has(row.id)) {
      byId.set(row.id, row);
    }
    if (!byKey.has(row.key)) {
      byKey.set(row.key, row);
    }
  }

  return { byId, byKey };
}

function resolveWorkflowOptions(
  allowedWorkflowDefinitionIds: readonly string[],
  workflows: readonly WorkflowListItem[],
): RuntimeFormFieldOption[] {
  const labelsById = new Map(
    workflows
      .filter(
        (
          workflow,
        ): workflow is { workflowDefinitionId: string; key: string; displayName?: string } =>
          typeof workflow.workflowDefinitionId === "string",
      )
      .map(
        (workflow) =>
          [workflow.workflowDefinitionId, workflow.displayName ?? workflow.key] as const,
      ),
  );

  return allowedWorkflowDefinitionIds.map((workflowDefinitionId) => ({
    value: { workflowDefinitionId },
    label: labelsById.get(workflowDefinitionId) ?? workflowDefinitionId,
  }));
}

function resolveFieldValue(
  payload: unknown,
  field: Pick<
    RuntimeFormResolvedField,
    "fieldKey" | "contextFactDefinitionId" | "contextFactKind" | "widget"
  >,
  fallbackPayload?: Record<string, unknown>,
): unknown {
  const normalizeValue = (value: unknown) => normalizeRuntimeBoundFactFieldValue(field, value);

  if (isRecord(payload)) {
    if (field.fieldKey in payload) {
      return normalizeValue(payload[field.fieldKey]);
    }
    if (field.contextFactDefinitionId in payload) {
      return normalizeValue(payload[field.contextFactDefinitionId]);
    }
  }

  if (fallbackPayload) {
    if (field.fieldKey in fallbackPayload) {
      return normalizeValue(fallbackPayload[field.fieldKey]);
    }
    if (field.contextFactDefinitionId in fallbackPayload) {
      return normalizeValue(fallbackPayload[field.contextFactDefinitionId]);
    }
  }

  return field.widget.renderedMultiplicity === "many" ? [] : null;
}

function mapContextFactValueForField(params: {
  field: Pick<RuntimeFormResolvedField, "contextFactKind" | "widget">;
  valueJson: unknown;
}): unknown {
  return normalizeRuntimeBoundFactFieldValue(params.field, params.valueJson);
}

function buildContextPrefillPayload(params: {
  fields: readonly RuntimeFormResolvedField[];
  contextFacts: readonly {
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
  }[];
}): Record<string, unknown> {
  const rowsByContextFactDefinitionId = new Map<
    string,
    Array<{ instanceOrder: number; valueJson: unknown }>
  >();

  for (const row of params.contextFacts) {
    const existing = rowsByContextFactDefinitionId.get(row.contextFactDefinitionId);
    if (existing) {
      existing.push({ instanceOrder: row.instanceOrder, valueJson: row.valueJson });
    } else {
      rowsByContextFactDefinitionId.set(row.contextFactDefinitionId, [
        { instanceOrder: row.instanceOrder, valueJson: row.valueJson },
      ]);
    }
  }

  return Object.fromEntries(
    params.fields.flatMap((field) => {
      const rows = rowsByContextFactDefinitionId.get(field.contextFactDefinitionId);
      if (!rows || rows.length === 0) {
        return [];
      }

      const values = [...rows]
        .sort((left, right) => left.instanceOrder - right.instanceOrder)
        .map((row) => mapContextFactValueForField({ field, valueJson: row.valueJson }));

      return [
        [
          field.fieldKey,
          field.widget.renderedMultiplicity === "many" ? values : (values[0] ?? null),
        ],
      ];
    }),
  );
}

function buildResolvedField(params: {
  field: FormFieldBinding;
  contextFact: WorkflowContextFactDto;
  factSchemas: ReturnType<typeof buildFactSchemaLookup>;
  methodologyFactDefinitions: readonly {
    id: string;
    key: string;
    name: string | null;
    cardinality: string | null;
  }[];
  artifactSlotDefinitions: readonly { id: string; key: string; displayName: string | null }[];
  projectFactInstances: readonly { id: string; factDefinitionId: string; valueJson: unknown }[];
  currentWorkUnitFactInstances: readonly {
    id: string;
    factDefinitionId: string;
    valueJson: unknown;
    referencedProjectWorkUnitId: string | null;
  }[];
  workflowOptions: readonly WorkflowListItem[];
  workUnitTypes: readonly { id: string; key: string; displayName: string | null }[];
  projectWorkUnits: readonly { id: string; workUnitTypeId: string }[];
}): RuntimeFormResolvedField {
  const renderedMultiplicity = params.field.uiMultiplicityMode ?? params.contextFact.cardinality;

  const base = {
    fieldKey: params.field.fieldKey,
    fieldLabel: params.field.fieldLabel,
    ...(params.field.helpText ? { helpText: params.field.helpText } : {}),
    required: params.field.required ?? false,
    contextFactDefinitionId: params.field.contextFactDefinitionId,
    contextFactKey: params.contextFact.key,
    contextFactKind: params.contextFact.kind,
  } as const;

  switch (params.contextFact.kind) {
    case "plain_fact":
    case "plain_value_fact":
      return {
        ...base,
        widget: buildPrimitiveWidget({
          valueType: ("type" in params.contextFact
            ? params.contextFact.type
            : params.contextFact.valueType) as FactType,
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          validation:
            "validationJson" in params.contextFact ? params.contextFact.validationJson : undefined,
        }),
      };
    case "bound_fact": {
      const externalBindingId = params.contextFact.factDefinitionId;
      const workUnitFactSchemas = [...params.factSchemas.byId.values()];
      const externalById = params.factSchemas.byId.get(externalBindingId);
      const externalByKey = params.factSchemas.byKey.get(externalBindingId);
      const methodologyByKey = params.methodologyFactDefinitions.find(
        (fact) => fact.key === externalBindingId,
      );
      const external = externalById ? externalById : !methodologyByKey ? externalByKey : undefined;
      const externalDefinitionById = params.methodologyFactDefinitions.find(
        (fact) => fact.id === externalBindingId,
      );
      const externalDefinition = externalDefinitionById
        ? externalDefinitionById
        : !workUnitFactSchemas.some((fact) => fact.key === externalBindingId)
          ? methodologyByKey
          : undefined;
      const bindingLabel =
        external?.name ?? externalDefinition?.name ?? humanizeKey(externalBindingId);
      const externalCardinality =
        external?.cardinality === "many" || externalDefinition?.cardinality === "many"
          ? "many"
          : "one";
      const isReferenceFact =
        params.contextFact.valueType === "work_unit" ||
        typeof params.contextFact.workUnitDefinitionId === "string";
      const boundOptions = resolveBoundExternalFactOptions({
        bindingKey: externalBindingId,
        methodologyFactDefinitions: params.methodologyFactDefinitions,
        workUnitFactSchemas: [...params.factSchemas.byId.values()],
        projectFactInstances: params.projectFactInstances,
        currentWorkUnitFactInstances: params.currentWorkUnitFactInstances,
        projectWorkUnits: params.projectWorkUnits,
      });
      const boundValueWidget = buildPrimitiveWidget({
        valueType: (params.contextFact.valueType ?? external?.factType ?? "json") as FactType,
        cardinality: params.contextFact.cardinality,
        renderedMultiplicity,
        validation: external?.validationJson,
      });

      return {
        ...base,
        widget: isReferenceFact
          ? {
              control: "reference",
              valueType: (params.contextFact.valueType ?? external?.factType ?? "json") as FactType,
              cardinality: params.contextFact.cardinality,
              renderedMultiplicity,
              boundValueWidget,
              externalBindingKey: externalBindingId,
              externalCardinality,
              bindingLabel,
              ...(boundOptions
                ? {
                    options: boundOptions,
                  }
                : {
                    emptyState:
                      "No eligible existing instances are available yet. Create the required fact first.",
                  }),
            }
          : {
              ...buildPrimitiveWidget({
                valueType: (params.contextFact.valueType ??
                  external?.factType ??
                  "json") as FactType,
                cardinality: params.contextFact.cardinality,
                renderedMultiplicity,
                validation: external?.validationJson,
                externalBindingKey: externalBindingId,
              }),
              externalCardinality,
              boundValueWidget,
              bindingLabel,
              ...(boundOptions
                ? {
                    options: boundOptions,
                  }
                : {
                    emptyState:
                      "No eligible existing instances are available yet. Create the required fact first.",
                  }),
            },
      };
    }
    case "work_unit_reference_fact":
      return {
        ...base,
        widget: {
          control: "reference",
          valueType: "work_unit",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          emptyState: "No eligible work units are available yet.",
        },
      };
    case "workflow_ref_fact":
      return {
        ...base,
        widget: {
          control: "workflow-reference",
          valueType: "json",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          options: resolveWorkflowOptions(
            params.contextFact.allowedWorkflowDefinitionIds,
            params.workflowOptions,
          ),
        },
      };
    case "artifact_slot_reference_fact": {
      const artifactSlotDefinitionId = params.contextFact.slotDefinitionId;
      const artifactSlot = params.artifactSlotDefinitions.find(
        (slot) => slot.id === artifactSlotDefinitionId || slot.key === artifactSlotDefinitionId,
      );

      return {
        ...base,
        widget: {
          control: "artifact-reference",
          valueType: "json",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          artifactSlotDefinitionId,
          bindingLabel:
            artifactSlot?.displayName ?? artifactSlot?.key ?? humanizeKey(artifactSlotDefinitionId),
        },
      };
    }
    case "work_unit_draft_spec_fact": {
      const includedFacts = params.contextFact.selectedWorkUnitFactDefinitionIds.flatMap(
        (factDefinitionId) => {
          const fact = params.factSchemas.byId.get(factDefinitionId);
          return fact ? [fact] : [];
        },
      );
      const boundWorkUnitTypeId = includedFacts[0]?.workUnitTypeId;
      const boundWorkUnitType = params.workUnitTypes.find(
        (workUnitType) => workUnitType.id === boundWorkUnitTypeId,
      );

      return {
        ...base,
        widget: {
          control: "draft-spec",
          valueType: "json",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          ...(boundWorkUnitType
            ? { bindingLabel: boundWorkUnitType.displayName ?? humanizeKey(boundWorkUnitType.key) }
            : {}),
          nestedFields: includedFacts.map((fact) =>
            buildDraftSpecNestedField({
              fact,
              workUnitTypes: params.workUnitTypes,
              projectWorkUnits: params.projectWorkUnits,
            }),
          ),
        },
      };
    }
  }
}

export class StepExecutionDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/StepExecutionDetailService",
)<
  StepExecutionDetailService,
  {
    readonly getRuntimeStepExecutionDetail: (
      input: GetRuntimeStepExecutionDetailInput,
    ) => Effect.Effect<GetRuntimeStepExecutionDetailOutput | null, RepositoryError>;
  }
>() {}

export const StepExecutionDetailServiceLive = Layer.effect(
  StepExecutionDetailService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const branchRuntimeRepo = yield* BranchStepRuntimeRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;
    const actionStepDetailService = yield* ActionStepDetailService;
    const invokeStepDetailService = yield* InvokeStepDetailService;
    const progression = yield* StepProgressionService;

    const getRuntimeStepExecutionDetail = (input: GetRuntimeStepExecutionDetailInput) =>
      Effect.gen(function* () {
        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return null;
        }

        const workflowDetail = yield* readRepo.getWorkflowExecutionDetail(
          stepExecution.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== input.projectId) {
          return null;
        }

        const [formState, stepExecutions] = yield* Effect.all([
          stepRepo.getFormStepExecutionState(stepExecution.id),
          stepRepo.listStepExecutionsForWorkflow(stepExecution.workflowExecutionId),
        ]);

        const nextStep = stepExecutions.find((candidate) => {
          if (candidate.id === stepExecution.id) {
            return false;
          }

          return candidate.previousStepExecutionId === stepExecution.id;
        });
        const lineage = {
          previousStepExecutionId: stepExecution.previousStepExecutionId ?? undefined,
          nextStepExecutionId: nextStep?.id,
        };
        const nextStepResolution =
          stepExecution.status === "completed" && !nextStep
            ? yield* progression.getNextStepDefinition({
                workflowExecutionId: stepExecution.workflowExecutionId,
                workflowId: workflowDetail.workflowExecution.workflowId,
                fromStepDefinitionId: stepExecution.stepDefinitionId,
                fromStepExecutionId: stepExecution.id,
              })
            : null;
        const nextStepSummary = nextStep
          ? {
              state: nextStep.status,
              nextStepDefinitionId: nextStep.stepDefinitionId,
              nextStepExecutionId: nextStep.id,
            }
          : nextStepResolution?.state === "next_step_ready"
            ? {
                state: "inactive" as const,
                nextStepDefinitionId: nextStepResolution.nextStep.id,
              }
            : undefined;

        const body: GetRuntimeStepExecutionDetailOutput["body"] =
          stepExecution.stepType === "form"
            ? yield* Effect.gen(function* () {
                const projectPin = yield* projectContextRepo.findProjectPin(
                  workflowDetail.projectId,
                );
                if (!projectPin) {
                  return yield* makeDetailError("project methodology pin missing for step detail");
                }

                const [
                  project,
                  workUnitTypes,
                  factSchemas,
                  methodologyFactDefinitions,
                  projectWorkUnits,
                  projectFactInstances,
                  currentWorkUnitFactInstances,
                  workflowExecutionContextFacts,
                ] = yield* Effect.all([
                  projectContextRepo.getProjectById({ projectId: workflowDetail.projectId }),
                  lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
                  lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId),
                  methodologyRepo.findFactDefinitionsByVersionId(projectPin.methodologyVersionId),
                  projectWorkUnitRepo.listProjectWorkUnitsByProject(workflowDetail.projectId),
                  projectFactRepo.listFactsByProject({ projectId: workflowDetail.projectId }),
                  workUnitFactRepo.listFactsByWorkUnit({
                    projectWorkUnitId: workflowDetail.projectWorkUnitId,
                  }),
                  stepRepo.listWorkflowExecutionContextFacts(stepExecution.workflowExecutionId),
                ]);

                const workUnitType = workUnitTypes.find(
                  (candidate) => candidate.id === workflowDetail.workUnitTypeId,
                );
                if (!workUnitType) {
                  return yield* makeDetailError("work unit type missing for runtime step detail");
                }

                const artifactSlotDefinitions =
                  yield* methodologyRepo.findArtifactSlotsByWorkUnitType({
                    versionId: projectPin.methodologyVersionId,
                    workUnitTypeKey: workUnitType.key,
                  });

                const workflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
                  versionId: projectPin.methodologyVersionId,
                  workUnitTypeKey: workUnitType.key,
                  workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
                });

                const workflowOptions: readonly WorkflowListItem[] =
                  methodologyRepo.listWorkflowsByWorkUnitType
                    ? (yield* methodologyRepo.listWorkflowsByWorkUnitType({
                        versionId: projectPin.methodologyVersionId,
                        workUnitTypeKey: workUnitType.key,
                      })).map(
                        (workflow): WorkflowListItem => ({
                          key: workflow.key,
                          ...(typeof workflow.workflowDefinitionId === "string"
                            ? { workflowDefinitionId: workflow.workflowDefinitionId }
                            : {}),
                          ...(typeof workflow.displayName === "string"
                            ? { displayName: workflow.displayName }
                            : {}),
                        }),
                      )
                    : [];

                const formDefinition = workflowEditor.formDefinitions.find(
                  (definition) => definition.stepId === stepExecution.stepDefinitionId,
                );
                if (!formDefinition) {
                  return yield* makeDetailError("form definition missing for runtime step detail");
                }

                const factLookup = new Map(
                  workflowEditor.contextFacts.flatMap((fact) =>
                    typeof fact.contextFactDefinitionId === "string"
                      ? [[fact.contextFactDefinitionId, fact] as const]
                      : [],
                  ),
                );

                const factSchemasLookup = buildFactSchemaLookup(
                  factSchemas,
                  workflowDetail.workUnitTypeId,
                );
                const fields = formDefinition.payload.fields.flatMap((field) => {
                  const contextFact = factLookup.get(field.contextFactDefinitionId);
                  if (!contextFact) {
                    return [];
                  }

                  return [
                    buildResolvedField({
                      field: {
                        contextFactDefinitionId: field.contextFactDefinitionId,
                        fieldLabel: field.fieldLabel,
                        fieldKey: field.fieldKey,
                        ...(typeof field.helpText === "string" ? { helpText: field.helpText } : {}),
                        required: field.required,
                        ...(field.uiMultiplicityMode
                          ? { uiMultiplicityMode: field.uiMultiplicityMode }
                          : {}),
                      },
                      contextFact,
                      factSchemas: factSchemasLookup,
                      methodologyFactDefinitions,
                      artifactSlotDefinitions,
                      projectFactInstances,
                      currentWorkUnitFactInstances,
                      workflowOptions,
                      workUnitTypes,
                      projectWorkUnits,
                    }),
                  ];
                });

                const contextPrefillPayload = buildContextPrefillPayload({
                  fields,
                  contextFacts: workflowExecutionContextFacts,
                });

                const normalizePayload = (payload: unknown) =>
                  Object.fromEntries(
                    fields.map((field) => [
                      field.fieldKey,
                      resolveFieldValue(payload, field, contextPrefillPayload),
                    ]),
                  );

                return {
                  stepType: "form",
                  page: {
                    formKey: formDefinition.payload.key,
                    ...(formDefinition.payload.label
                      ? { formLabel: formDefinition.payload.label }
                      : {}),
                    ...(extractMarkdown(formDefinition.payload.descriptionJson)
                      ? {
                          descriptionMarkdown: extractMarkdown(
                            formDefinition.payload.descriptionJson,
                          ),
                        }
                      : {}),
                    ...(project?.projectRootPath
                      ? { projectRootPath: project.projectRootPath }
                      : {}),
                    fields,
                  },
                  draft: {
                    payloadMode: "latest_only",
                    payload: normalizePayload(formState?.draftPayloadJson),
                    lastSavedAt: toIso(formState?.lastDraftSavedAt ?? null),
                  },
                  saveDraftAction: {
                    kind: "save_form_step_draft",
                    enabled: stepExecution.status === "active",
                    reasonIfDisabled:
                      stepExecution.status !== "active"
                        ? "Only active Form steps can save draft state."
                        : undefined,
                  },
                  submission: {
                    payloadMode: "latest_only",
                    payload: normalizePayload(formState?.submittedPayloadJson),
                    submittedAt: toIso(formState?.submittedAt ?? null),
                  },
                  submitAction: {
                    kind: "submit_form_step",
                    enabled: stepExecution.status === "active",
                    reasonIfDisabled:
                      stepExecution.status !== "active"
                        ? "Only active Form steps can be submitted."
                        : undefined,
                  },
                  lineage,
                  ...(nextStepSummary ? { nextStep: nextStepSummary } : {}),
                } satisfies GetRuntimeStepExecutionDetailOutput["body"];
              })
            : stepExecution.stepType === "action"
              ? {
                  ...(yield* actionStepDetailService.buildActionStepExecutionDetailBody({
                    projectId: input.projectId,
                    stepExecution,
                    workflowDetail,
                  })),
                  lineage,
                  ...(nextStepSummary ? { nextStep: nextStepSummary } : {}),
                }
              : stepExecution.stepType === "branch"
                ? yield* Effect.gen(function* () {
                    const projectPin = yield* projectContextRepo.findProjectPin(
                      workflowDetail.projectId,
                    );
                    if (!projectPin) {
                      return yield* makeDetailError(
                        "project methodology pin missing for branch step detail",
                      );
                    }

                    const [
                      workUnitTypes,
                      branchState,
                      contextFacts,
                      lifecycleStates,
                      projectWorkUnits,
                    ] = yield* Effect.all([
                      lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
                      branchRuntimeRepo.loadWithRoutes(stepExecution.id),
                      stepRepo.listWorkflowExecutionContextFacts(stepExecution.workflowExecutionId),
                      lifecycleRepo.findLifecycleStates(projectPin.methodologyVersionId),
                      projectWorkUnitRepo.listProjectWorkUnitsByProject(workflowDetail.projectId),
                    ]);

                    const workUnitType = workUnitTypes.find(
                      (candidate) => candidate.id === workflowDetail.workUnitTypeId,
                    );
                    if (!workUnitType) {
                      return yield* makeDetailError(
                        "work unit type missing for branch step detail",
                      );
                    }

                    if (!branchState) {
                      return yield* makeDetailError(
                        "branch runtime state missing for branch step detail",
                      );
                    }

                    const [branchDefinition, workflowEditor] = yield* Effect.all([
                      methodologyRepo.getBranchStepDefinition({
                        versionId: projectPin.methodologyVersionId,
                        workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
                        stepId: stepExecution.stepDefinitionId,
                      }),
                      methodologyRepo.getWorkflowEditorDefinition({
                        versionId: projectPin.methodologyVersionId,
                        workUnitTypeKey: workUnitType.key,
                        workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
                      }),
                    ]);

                    if (!branchDefinition) {
                      return yield* makeDetailError(
                        "branch definition missing for branch step detail",
                      );
                    }

                    const conditionalRoutes = evaluateRoutes({
                      routes: branchDefinition.payload.routes.map((route, index) => ({
                        ...route,
                        sortOrder: index,
                      })),
                      contextFacts,
                      contextFactDefinitions: workflowEditor.contextFacts,
                      projectWorkUnitInstances: toProjectWorkUnitInstanceSummaries({
                        projectWorkUnits,
                        workUnitTypeKeysById: new Map(
                          workUnitTypes.map((row) => [row.id, row.key] as const),
                        ),
                        stateKeysById: new Map(
                          lifecycleStates.map((row) => [row.id, row.key] as const),
                        ),
                      }),
                    });

                    const defaultTargetStepId =
                      branchDefinition.payload.defaultTargetStepId ?? null;
                    const suggestion = getSuggestedTarget({
                      evaluations: conditionalRoutes,
                      defaultTargetStepId,
                    });

                    const validConditionalTargets = conditionalRoutes
                      .filter((route) => route.isValid)
                      .map((route) => route.targetStepId);
                    const validTargets = new Set(
                      validConditionalTargets.length > 0
                        ? validConditionalTargets
                        : defaultTargetStepId
                          ? [defaultTargetStepId]
                          : [],
                    );

                    const selectedTargetStepId = branchState.branch.selectedTargetStepId;
                    const persistedSelectionValid =
                      typeof selectedTargetStepId === "string" &&
                      validTargets.has(selectedTargetStepId);
                    const blockingReason =
                      selectedTargetStepId === null
                        ? "Branch completion is blocked until a valid target selection is explicitly saved."
                        : persistedSelectionValid
                          ? undefined
                          : "Branch completion is blocked because the saved target selection is no longer valid.";

                    return {
                      stepType: "branch",
                      resolutionContract: "explicit_save_selection_v1",
                      persistedSelection: {
                        selectedTargetStepId,
                        isValid: persistedSelectionValid,
                        savedAt: toIso(branchState.branch.savedAt),
                        ...(blockingReason ? { blockingReason } : {}),
                      },
                      suggestion: {
                        suggestedTargetStepId: suggestion.suggestedTargetStepId,
                        source: suggestion.source,
                        ...(suggestion.routeId ? { routeId: suggestion.routeId } : {}),
                      },
                      conditionalRoutes: conditionalRoutes.map((route) => ({
                        routeId: route.routeId,
                        targetStepId: route.targetStepId,
                        sortOrder: route.sortOrder,
                        isValid: route.isValid,
                        conditionMode: route.conditionMode,
                        evaluationTree: route.evaluationTree,
                      })),
                      defaultTargetStepId,
                      saveSelectionAction: {
                        kind: "save_branch_step_selection",
                        enabled: stepExecution.status === "active",
                        reasonIfDisabled:
                          stepExecution.status !== "active"
                            ? "Only active Branch steps can save a target selection."
                            : undefined,
                      },
                      completionSummary: {
                        mode: "explicit_saved_selection",
                        eligible: persistedSelectionValid,
                        ...(blockingReason ? { reasonIfIneligible: blockingReason } : {}),
                      },
                      lineage,
                      ...(nextStepSummary ? { nextStep: nextStepSummary } : {}),
                    } satisfies GetRuntimeStepExecutionDetailOutput["body"];
                  })
                : stepExecution.stepType === "invoke"
                  ? {
                      ...(yield* invokeStepDetailService.buildInvokeStepExecutionDetailBody({
                        projectId: input.projectId,
                        stepExecution,
                        workflowDetail,
                      })),
                      lineage,
                      ...(nextStepSummary ? { nextStep: nextStepSummary } : {}),
                    }
                  : {
                      stepType: stepExecution.stepType as Exclude<
                        GetRuntimeStepExecutionDetailOutput["body"]["stepType"],
                        "form" | "invoke" | "action" | "branch"
                      >,
                      mode: "deferred",
                      defaultMessage: `${stepExecution.stepType} step detail remains read-only in this slice.`,
                      lineage,
                      ...(nextStepSummary ? { nextStep: nextStepSummary } : {}),
                    };

        const completionEnabled =
          stepExecution.status === "active" &&
          (stepExecution.stepType === "agent" ||
            (stepExecution.stepType === "form" &&
              !!formState?.submittedAt &&
              formState.submittedPayloadJson !== null &&
              formState.submittedPayloadJson !== undefined) ||
            (stepExecution.stepType === "action" &&
              body.stepType === "action" &&
              "completionSummary" in body &&
              body.completionSummary.eligible) ||
            (stepExecution.stepType === "branch" &&
              body.stepType === "branch" &&
              body.completionSummary.eligible) ||
            (stepExecution.stepType === "invoke" &&
              body.stepType === "invoke" &&
              body.completionSummary.eligible));

        return {
          shell: {
            stepExecutionId: stepExecution.id,
            workflowExecutionId: stepExecution.workflowExecutionId,
            stepDefinitionId: stepExecution.stepDefinitionId,
            stepType:
              stepExecution.stepType as GetRuntimeStepExecutionDetailOutput["shell"]["stepType"],
            status: stepExecution.status,
            activatedAt: stepExecution.activatedAt.toISOString(),
            completedAt: toIso(stepExecution.completedAt),
            completionAction: {
              kind: "complete_step_execution",
              visible: stepExecution.status === "active",
              enabled: completionEnabled,
              reasonIfDisabled:
                stepExecution.status !== "active"
                  ? "Step execution is already completed."
                  : completionEnabled
                    ? undefined
                    : body.stepType === "action" && "completionSummary" in body
                      ? body.completionSummary.reasonIfIneligible
                      : body.stepType === "branch"
                        ? body.completionSummary.reasonIfIneligible
                        : body.stepType === "invoke"
                          ? body.completionSummary.reasonIfIneligible
                          : "Form steps can complete only after a submitted payload is present.",
            },
          },
          body,
        } satisfies GetRuntimeStepExecutionDetailOutput;
      }).pipe(
        Effect.catchTag("RepositoryError", (error) => Effect.fail(error)),
        Effect.catchAll((error) =>
          error instanceof RepositoryError
            ? Effect.fail(error)
            : Effect.fail(makeDetailError("failed to build runtime step execution detail")),
        ),
      );

    return StepExecutionDetailService.of({
      getRuntimeStepExecutionDetail,
    });
  }),
);
