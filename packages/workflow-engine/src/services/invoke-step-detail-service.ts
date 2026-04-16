import type { FactCardinality, FactType } from "@chiron/contracts/methodology/fact";
import type {
  RuntimeFormFieldOption,
  RuntimeInvokeStepExecutionDetailBody,
  RuntimeInvokeTargetStatus,
} from "@chiron/contracts/runtime/executions";
import type {
  InvokeStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { type WorkflowExecutionDetailReadModel } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../repositories/step-execution-repository";
import { TransitionExecutionRepository } from "../repositories/transition-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { InvokeCompletionService } from "./invoke-completion-service";

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
};

type TransitionSummary = {
  transitionDefinitionId: string;
  transitionDefinitionKey?: string;
  transitionLabel: string;
};

type WorkUnitInvokePayload = Extract<InvokeStepPayload, { targetKind: "work_unit" }>;

const makeDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-step-detail",
    cause: new Error(cause),
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

const workUnitOptionsFromValidation = (params: {
  validationJson: unknown;
  workUnitTypes: readonly WorkUnitTypeSummary[];
  projectWorkUnits: readonly { id: string; workUnitTypeId: string }[];
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
      label: `${workUnitType.name}:${shortId(workUnit.id)}`,
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

const isFilePathPlainContextFact = (contextFact: WorkflowContextFactDto): boolean =>
  contextFact.kind === "plain_value_fact" &&
  contextFact.valueType === "string" &&
  contextFact.cardinality === "one" &&
  isPlainRecord(contextFact.validationJson) &&
  contextFact.validationJson.kind === "path" &&
  isPlainRecord(contextFact.validationJson.path) &&
  contextFact.validationJson.path.pathKind === "file";

const toRelativePathOptionValue = (params: {
  relativePath: string;
  sourceContextFactDefinitionId: string;
}) => ({
  relativePath: params.relativePath,
  sourceContextFactDefinitionId: params.sourceContextFactDefinitionId,
});

const artifactOptionsFromContextFacts = (params: {
  destinationArtifactSlotDefinitionId: string;
  workflowContextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  workflowEditorContextFacts: readonly WorkflowContextFactDto[];
}): {
  editorOptions?: RuntimeFormFieldOption[];
  editorEmptyState?: string;
} => {
  const contextFactsByDefinitionId = new Map(
    params.workflowEditorContextFacts.flatMap((contextFact) =>
      typeof contextFact.contextFactDefinitionId === "string"
        ? [[contextFact.contextFactDefinitionId, contextFact] as const]
        : [],
    ),
  );

  const options = params.workflowContextFacts.flatMap((instance) => {
    const contextFact = contextFactsByDefinitionId.get(instance.contextFactDefinitionId);
    if (!contextFact || typeof contextFact.contextFactDefinitionId !== "string") {
      return [];
    }

    if (
      contextFact.kind === "artifact_reference_fact" &&
      contextFact.artifactSlotDefinitionId === params.destinationArtifactSlotDefinitionId &&
      isPlainRecord(instance.valueJson) &&
      typeof instance.valueJson.relativePath === "string" &&
      instance.valueJson.relativePath.trim().length > 0
    ) {
      return [
        {
          value: toRelativePathOptionValue({
            relativePath: instance.valueJson.relativePath,
            sourceContextFactDefinitionId: contextFact.contextFactDefinitionId,
          }),
          label: `${getContextFactLabel(contextFact)}: ${instance.valueJson.relativePath}`,
        } satisfies RuntimeFormFieldOption,
      ];
    }

    if (isFilePathPlainContextFact(contextFact) && typeof instance.valueJson === "string") {
      const relativePath = instance.valueJson.trim();
      if (relativePath.length === 0) {
        return [];
      }

      return [
        {
          value: toRelativePathOptionValue({
            relativePath,
            sourceContextFactDefinitionId: contextFact.contextFactDefinitionId,
          }),
          label: `${getContextFactLabel(contextFact)}: ${relativePath}`,
        } satisfies RuntimeFormFieldOption,
      ];
    }

    return [];
  });

  return options.length > 0
    ? { editorOptions: options }
    : {
        editorEmptyState:
          "No eligible artifact sources are available yet. Use a matching artifact-reference fact or a file-path plain fact.",
      };
};

const shortId = (value: string): string => value.slice(0, 8);

const formatWorkUnitLabel = (name: string, projectWorkUnitId?: string): string =>
  projectWorkUnitId ? `${name} (${shortId(projectWorkUnitId)})` : name;

const getContextFactLabel = (contextFact: WorkflowContextFactDto): string =>
  contextFact.label ?? humanizeKey(contextFact.key);

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
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;
    const stepRepo = yield* StepExecutionRepository;
    const transitionRepo = yield* TransitionExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const invokeCompletionService = yield* InvokeCompletionService;

    const buildInvokeStepExecutionDetailBody = ({
      projectId,
      stepExecution,
      workflowDetail,
    }: BuildInvokeStepExecutionDetailBodyParams) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(projectId);
        if (!projectPin) {
          return yield* Effect.fail(
            makeDetailError("project methodology pin missing for invoke step detail"),
          );
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return yield* Effect.fail(
            makeDetailError("parent work-unit type missing for invoke step detail"),
          );
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
          return yield* Effect.fail(
            makeDetailError("invoke step definition missing for runtime detail"),
          );
        }

        const invokePayloadRaw =
          typeof invokeDefinition === "object" && invokeDefinition !== null
            ? ((invokeDefinition as { payload?: unknown }).payload as InvokeStepPayload | undefined)
            : undefined;
        const invokeTargetKind = invokePayloadRaw?.targetKind;
        if (invokeTargetKind !== "workflow" && invokeTargetKind !== "work_unit") {
          return yield* Effect.fail(
            makeDetailError("invoke step payload missing for runtime detail"),
          );
        }
        const invokePayload = invokePayloadRaw as InvokeStepPayload;
        const workUnitInvokePayload: WorkUnitInvokePayload | null =
          invokePayload.targetKind === "work_unit" ? invokePayload : null;

        const invokeState = yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(
          stepExecution.id,
        );
        if (!invokeState) {
          return yield* Effect.fail(makeDetailError("invoke step execution state not found"));
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

          for (const transition of transitions) {
            transitionsById.set(transition.id, {
              transitionDefinitionId: transition.id,
              transitionDefinitionKey: transition.transitionKey,
              transitionLabel: humanizeKey(transition.transitionKey),
            });
          }

          statesByWorkUnitTypeId.set(
            workUnitTypeId,
            new Map(
              states.map(
                (state) => [state.id, state.displayName ?? humanizeKey(state.key)] as const,
              ),
            ),
          );

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
          invokePayload.sourceMode === "context_fact_backed"
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

        const invokeBindingPreview: RuntimeInvokeStepExecutionDetailBody["workUnitTargets"][number]["bindingPreview"] =
          invokeTargetKind === "work_unit"
            ? (workUnitInvokePayload?.bindings ?? []).map((binding) => {
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
                          (fact) => fact.contextFactDefinitionId === sourceContextFactDefinitionId,
                        )
                        .sort((left, right) => left.instanceOrder - right.instanceOrder)
                    : [];
                  const resolvedValueJson =
                    binding.source.kind === "literal"
                      ? binding.source.value
                      : binding.source.kind === "context_fact"
                        ? sourceInstances.length === 0
                          ? undefined
                          : sourceContextFact?.cardinality === "many"
                            ? sourceInstances.map((instance) => instance.valueJson)
                            : sourceInstances[0]?.valueJson
                        : undefined;

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

                  return {
                    destinationKind: "work_unit_fact",
                    destinationDefinitionId: binding.destination.workUnitFactDefinitionId,
                    destinationLabel:
                      destination?.label ??
                      humanizeKey(binding.destination.workUnitFactDefinitionId),
                    destinationFactType,
                    destinationCardinality: destination?.cardinality,
                    ...(workUnitEditorMetadata.editorOptions
                      ? { editorOptions: workUnitEditorMetadata.editorOptions }
                      : bindingEditorOptions
                        ? { editorOptions: bindingEditorOptions }
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
                    resolvedValueJson,
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
                const resolvedValueJson =
                  binding.source.kind === "literal"
                    ? binding.source.value
                    : binding.source.kind === "context_fact"
                      ? sourceContextFact?.kind === "artifact_reference_fact" &&
                        sourceContextFact.artifactSlotDefinitionId ===
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
                          : undefined
                      : undefined;

                const artifactEditorMetadata = artifactOptionsFromContextFacts({
                  destinationArtifactSlotDefinitionId: binding.destination.artifactSlotDefinitionId,
                  workflowContextFacts,
                  workflowEditorContextFacts: workflowEditor.contextFacts,
                });

                return {
                  destinationKind: "artifact_slot",
                  destinationDefinitionId: binding.destination.artifactSlotDefinitionId,
                  destinationLabel:
                    destination?.label ?? humanizeKey(binding.destination.artifactSlotDefinitionId),
                  ...(artifactEditorMetadata.editorOptions
                    ? { editorOptions: artifactEditorMetadata.editorOptions }
                    : {}),
                  ...(artifactEditorMetadata.editorEmptyState
                    ? { editorEmptyState: artifactEditorMetadata.editorEmptyState }
                    : {}),
                  sourceKind: binding.source.kind,
                  sourceContextFactDefinitionId: sourceContextFactDefinitionId,
                  sourceContextFactKey: sourceContextFact?.key,
                  resolvedValueJson,
                  requiresRuntimeValue: binding.source.kind === "runtime",
                };
              })
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
              workUnitBindingDebugSummary: JSON.stringify(workUnitBindingDebugSummary),
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
            ? contextFact.kind === "workflow_reference_fact"
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

        const workUnitTargets = workUnitTargetRows.map((row) => {
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

          const blockedReason = !fullyStarted
            ? availablePrimaryWorkflows.length === 0
              ? "No primary workflows are available for this transition."
              : partiallyStarted
                ? "Invoke target is in a partially started state."
                : undefined
            : !transitionExecution
              ? "Started transition execution could not be resolved."
              : transitionExecution.status === "superseded"
                ? "Started transition path was superseded before completion."
                : undefined;

          const status: RuntimeInvokeTargetStatus = !partiallyStarted
            ? availablePrimaryWorkflows.length === 0
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

          const currentWorkUnitStateLabel =
            projectWorkUnit?.currentStateId && projectWorkUnit.workUnitTypeId
              ? (statesByWorkUnitTypeId
                  .get(projectWorkUnit.workUnitTypeId)
                  ?.get(projectWorkUnit.currentStateId) ?? projectWorkUnit.currentStateId)
              : undefined;
          const startedFactInstancesByDefinitionId = new Map(
            (row.projectWorkUnitId
              ? (startedFactInstancesByWorkUnitId.get(row.projectWorkUnitId) ?? [])
              : []
            )
              .filter((fact) => fact.status === "active")
              .map((fact) => [fact.factDefinitionId, fact] as const),
          );
          const rowBindingPreview = invokeBindingPreview.map((binding) => {
            if (binding.destinationKind !== "work_unit_fact") {
              return binding;
            }

            const startedFactInstance = startedFactInstancesByDefinitionId.get(
              binding.destinationDefinitionId,
            );
            if (!startedFactInstance) {
              return binding;
            }

            const hydratedValue =
              startedFactInstance.referencedProjectWorkUnitId !== null
                ? { projectWorkUnitId: startedFactInstance.referencedProjectWorkUnitId }
                : startedFactInstance.valueJson;

            return {
              ...binding,
              resolvedValueJson: hydratedValue,
            };
          });

          return {
            workUnitLabel: formatWorkUnitLabel(
              getWorkUnitTypeName(workUnitType, row.workUnitDefinitionId),
              row.projectWorkUnitId ?? undefined,
            ),
            transitionLabel: getTransitionLabel(transition, row.transitionDefinitionId),
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
          sourceContextFactInstanceValues: sourceContextFactInstances.map(
            (instance) => instance.valueJson,
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
        } satisfies RuntimeInvokeStepExecutionDetailBody;
      });

    return InvokeStepDetailService.of({
      buildInvokeStepExecutionDetailBody,
    });
  }),
);
