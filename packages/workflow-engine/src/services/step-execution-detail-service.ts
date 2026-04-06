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
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";

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
      if (isJsonSubSchema(value.subSchema)) {
        return {
          kind: "json-schema",
          schemaDialect:
            typeof value.schemaDialect === "string" && value.schemaDialect.length > 0
              ? value.schemaDialect
              : "draft-2020-12",
          schema: "schema" in value ? value.schema : undefined,
          subSchema: value.subSchema,
        };
      }

      return {
        kind: "json-schema",
        schemaDialect:
          typeof value.schemaDialect === "string" && value.schemaDialect.length > 0
            ? value.schemaDialect
            : "draft-2020-12",
        schema: "schema" in value ? value.schema : undefined,
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

  if (validation.subSchema?.type === "object") {
    return validation.subSchema.fields.map((field) => ({
      key: field.key,
      label: humanizeKey(field.key),
      factType: field.type,
      cardinality: field.cardinality,
      required: "defaultValue" in field ? true : false,
      description: extractMarkdown(field.description),
      validation,
    }));
  }

  if (!isRecord(validation.schema) || !isRecord(validation.schema.properties)) {
    return undefined;
  }

  const required = Array.isArray(validation.schema.required)
    ? new Set(
        validation.schema.required.filter((entry): entry is string => typeof entry === "string"),
      )
    : new Set<string>();

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
        validation,
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
    value: workflowDefinitionId,
    label: labelsById.get(workflowDefinitionId) ?? workflowDefinitionId,
  }));
}

function resolveFieldValue(
  payload: unknown,
  field: Pick<RuntimeFormResolvedField, "fieldKey" | "contextFactDefinitionId" | "widget">,
): unknown {
  if (isRecord(payload)) {
    if (field.fieldKey in payload) {
      return payload[field.fieldKey];
    }
    if (field.contextFactDefinitionId in payload) {
      return payload[field.contextFactDefinitionId];
    }
  }

  return field.widget.renderedMultiplicity === "many" ? [] : null;
}

function buildResolvedField(params: {
  field: FormFieldBinding;
  contextFact: WorkflowContextFactDto;
  factSchemas: ReturnType<typeof buildFactSchemaLookup>;
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
    case "plain_value_fact":
      return {
        ...base,
        widget: buildPrimitiveWidget({
          valueType: params.contextFact.valueType,
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
        }),
      };
    case "definition_backed_external_fact": {
      const external = params.factSchemas.byKey.get(params.contextFact.externalFactDefinitionId);

      return {
        ...base,
        widget: buildPrimitiveWidget({
          valueType: (external?.factType ?? "json") as FactType,
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          validation: external?.validationJson,
          externalBindingKey: params.contextFact.externalFactDefinitionId,
        }),
      };
    }
    case "bound_external_fact": {
      const external = params.factSchemas.byKey.get(params.contextFact.externalFactDefinitionId);

      return {
        ...base,
        widget: {
          control: "reference",
          valueType: (external?.factType ?? "json") as FactType,
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          externalBindingKey: params.contextFact.externalFactDefinitionId,
          emptyState:
            "No eligible existing instances are available yet. Create the required fact first.",
        },
      };
    }
    case "workflow_reference_fact":
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
    case "artifact_reference_fact":
      return {
        ...base,
        widget: {
          control: "artifact-reference",
          valueType: "json",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          artifactSlotDefinitionId: params.contextFact.artifactSlotDefinitionId,
        },
      };
    case "work_unit_draft_spec_fact":
      return {
        ...base,
        widget: {
          control: "draft-spec",
          valueType: "json",
          cardinality: params.contextFact.cardinality,
          renderedMultiplicity,
          nestedFields: params.contextFact.includedFactDefinitionIds.flatMap((factDefinitionId) => {
            const fact = params.factSchemas.byId.get(factDefinitionId);
            if (!fact) {
              return [];
            }

            return [
              buildDraftSpecNestedField({
                fact,
                workUnitTypes: params.workUnitTypes,
                projectWorkUnits: params.projectWorkUnits,
              }),
            ];
          }),
        },
      };
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
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;

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

        const completionEnabled =
          stepExecution.status === "active" &&
          stepExecution.stepType === "form" &&
          !!formState?.submittedAt &&
          formState.submittedPayloadJson !== null &&
          formState.submittedPayloadJson !== undefined;

        const body: GetRuntimeStepExecutionDetailOutput["body"] =
          stepExecution.stepType === "form"
            ? yield* Effect.gen(function* () {
                const projectPin = yield* projectContextRepo.findProjectPin(
                  workflowDetail.projectId,
                );
                if (!projectPin) {
                  return yield* Effect.fail(
                    makeDetailError("project methodology pin missing for step detail"),
                  );
                }

                const [project, workUnitTypes, factSchemas, projectWorkUnits] = yield* Effect.all([
                  projectContextRepo.getProjectById({ projectId: workflowDetail.projectId }),
                  lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
                  lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId),
                  projectWorkUnitRepo.listProjectWorkUnitsByProject(workflowDetail.projectId),
                ]);

                const workUnitType = workUnitTypes.find(
                  (candidate) => candidate.id === workflowDetail.workUnitTypeId,
                );
                if (!workUnitType) {
                  return yield* Effect.fail(
                    makeDetailError("work unit type missing for runtime step detail"),
                  );
                }

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
                      })).map((workflow) => ({
                        key: workflow.key,
                        ...(workflow.workflowDefinitionId
                          ? { workflowDefinitionId: workflow.workflowDefinitionId }
                          : {}),
                        ...(workflow.displayName ? { displayName: workflow.displayName } : {}),
                      }))
                    : [];

                const formDefinition = workflowEditor.formDefinitions.find(
                  (definition) => definition.stepId === stepExecution.stepDefinitionId,
                );
                if (!formDefinition) {
                  return yield* Effect.fail(
                    makeDetailError("form definition missing for runtime step detail"),
                  );
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
                        helpText: field.helpText,
                        required: field.required,
                        ...(field.uiMultiplicityMode
                          ? { uiMultiplicityMode: field.uiMultiplicityMode }
                          : {}),
                      },
                      contextFact,
                      factSchemas: factSchemasLookup,
                      workflowOptions,
                      workUnitTypes,
                      projectWorkUnits,
                    }),
                  ];
                });

                const normalizePayload = (payload: unknown) =>
                  Object.fromEntries(
                    fields.map((field) => [field.fieldKey, resolveFieldValue(payload, field)]),
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
                  lineage: {
                    previousStepExecutionId: stepExecution.previousStepExecutionId ?? undefined,
                    nextStepExecutionId: nextStep?.id,
                  },
                } satisfies GetRuntimeStepExecutionDetailOutput["body"];
              })
            : {
                stepType: stepExecution.stepType as Exclude<
                  GetRuntimeStepExecutionDetailOutput["body"]["stepType"],
                  "form"
                >,
                mode: "deferred",
                defaultMessage: `${stepExecution.stepType} step detail remains read-only in this slice.`,
              };

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
