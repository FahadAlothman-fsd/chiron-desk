import type {
  SaveInvokeWorkUnitTargetDraftInput,
  SaveInvokeWorkUnitTargetDraftOutput,
  SingletonAutoAttachWarning,
  StartInvokeWorkUnitTargetInput,
  StartInvokeWorkUnitTargetOutput,
} from "@chiron/contracts/runtime/executions";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";
import { Option } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";
import { resolveAutoAttachedProjectWorkUnit } from "./runtime-auto-attach";
import {
  RuntimeGateService,
  type RuntimeGateProjectedArtifactSlotValue,
  type RuntimeGateProjectedWorkUnitFactValue,
} from "./runtime-gate-service";
import { unwrapRuntimeBoundFactEnvelope } from "./runtime-bound-fact-value";
import { toRuntimeConditionTree } from "./transition-gate-conditions";
import { WorkflowContextExternalPrefillService } from "./workflow-context-external-prefill-service";

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-work-unit-execution.startInvokeWorkUnitTarget",
    cause: new Error(cause),
  });

const mapGateError = (error: unknown): RepositoryError =>
  error instanceof RepositoryError
    ? error
    : new RepositoryError({
        operation: "invoke-work-unit-execution.startInvokeWorkUnitTarget",
        cause: error instanceof Error ? error : new Error(String(error)),
      });

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const normalizeToItems = (value: unknown): readonly unknown[] => {
  if (value === null || value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
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

const dedupeByCanonicalKey = <T extends { canonicalKey: string }>(
  items: readonly T[],
): readonly T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const item of items) {
    if (seen.has(item.canonicalKey)) {
      continue;
    }

    seen.add(item.canonicalKey);
    deduped.push(item);
  }

  return deduped;
};

const uniqueTransitionDefinitions = <T extends { transitionId: string }>(
  transitions: readonly T[],
): readonly T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const transition of transitions) {
    if (seen.has(transition.transitionId)) {
      continue;
    }

    seen.add(transition.transitionId);
    deduped.push(transition);
  }

  return deduped;
};

export interface FrozenInvokeDraftFactValue {
  readonly workUnitFactDefinitionId: string;
  readonly value: unknown;
}

export interface FrozenInvokeDraftArtifactFile {
  readonly relativePath?: string;
  readonly sourceContextFactDefinitionId?: string;
  readonly clear: boolean;
}

export interface FrozenInvokeDraftArtifactSlot {
  readonly artifactSlotDefinitionId: string;
  readonly files: readonly FrozenInvokeDraftArtifactFile[];
}

export interface FrozenInvokeDraftTemplate {
  readonly draftKey: string;
  readonly workUnitDefinitionId: string;
  readonly factValues: readonly FrozenInvokeDraftFactValue[];
  readonly artifactSlots: readonly FrozenInvokeDraftArtifactSlot[];
}

type ResolvedSourceDraftTemplate = FrozenInvokeDraftTemplate & { readonly canonicalKey: string };

const normalizeDraftFactValues = (value: unknown): readonly FrozenInvokeDraftFactValue[] => {
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

const normalizeDraftArtifactSlots = (value: unknown): readonly FrozenInvokeDraftArtifactSlot[] => {
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
                    } satisfies FrozenInvokeDraftArtifactFile,
                  ]
                : [],
            )
          : [];

        return [{ artifactSlotDefinitionId, files } satisfies FrozenInvokeDraftArtifactSlot];
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
  const slots = new Map<string, FrozenInvokeDraftArtifactFile[]>();
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

  return [...slots.entries()].map(
    ([artifactSlotDefinitionId, files]) =>
      ({
        artifactSlotDefinitionId,
        files,
      }) satisfies FrozenInvokeDraftArtifactSlot,
  );
};

const normalizeSourceDraftTemplate = (
  value: unknown,
  defaultWorkUnitDefinitionId: string,
): ResolvedSourceDraftTemplate | null => {
  if (!isPlainRecord(value)) {
    return null;
  }

  const workUnitDefinitionId =
    asNonEmptyString(value.workUnitDefinitionId) ??
    asNonEmptyString(value.workUnitTypeId) ??
    defaultWorkUnitDefinitionId;
  if (workUnitDefinitionId !== defaultWorkUnitDefinitionId) {
    return null;
  }

  const draftKey =
    asNonEmptyString(value.draftKey) ??
    asNonEmptyString(value.canonicalKey) ??
    stableStringify(value);

  return {
    draftKey,
    canonicalKey: draftKey,
    workUnitDefinitionId,
    factValues: normalizeDraftFactValues(value),
    artifactSlots: normalizeDraftArtifactSlots(value),
  };
};

const isContextBackedSourceMode = (sourceMode: string): boolean =>
  sourceMode === "fact_backed" || sourceMode === "context_fact_backed";

const toTemplateValueFromInitialFactDefinition = (definition: {
  factDefinitionId: string;
  initialValueJson?: unknown;
  initialReferencedProjectWorkUnitId?: string | null;
}): FrozenInvokeDraftFactValue => ({
  workUnitFactDefinitionId: definition.factDefinitionId,
  value:
    definition.initialReferencedProjectWorkUnitId === undefined ||
    definition.initialReferencedProjectWorkUnitId === null
      ? (definition.initialValueJson ?? null)
      : { projectWorkUnitId: definition.initialReferencedProjectWorkUnitId },
});

const buildFrozenDraftTemplate = (params: {
  draftKey: string;
  workUnitDefinitionId: string;
  initialFactDefinitions: ReadonlyArray<{
    factDefinitionId: string;
    initialValueJson?: unknown;
    initialReferencedProjectWorkUnitId?: string | null;
  }>;
  initialArtifactSlotDefinitions: ReadonlyArray<{
    artifactSlotDefinitionId: string;
    files?: ReadonlyArray<{
      filePath: string;
      memberStatus: "present";
    }>;
  }>;
}): FrozenInvokeDraftTemplate => ({
  draftKey: params.draftKey,
  workUnitDefinitionId: params.workUnitDefinitionId,
  factValues: params.initialFactDefinitions.map(toTemplateValueFromInitialFactDefinition),
  artifactSlots: params.initialArtifactSlotDefinitions.map((slot) => ({
    artifactSlotDefinitionId: slot.artifactSlotDefinitionId,
    files: (slot.files ?? []).map((file) => ({
      relativePath: file.filePath,
      clear: false,
    })),
  })),
});

const hasRelativePath = (
  value: unknown,
): value is { relativePath: string; sourceContextFactDefinitionId?: string } =>
  isPlainRecord(value) &&
  typeof value.relativePath === "string" &&
  value.relativePath.trim().length > 0;

type RuntimeArtifactOverrideFile = {
  relativePath: string;
  sourceContextFactDefinitionId?: string;
};

const normalizeRuntimeArtifactOverrideFiles = (value: {
  relativePath?: string;
  sourceContextFactDefinitionId?: string;
  clear?: boolean;
  files?: ReadonlyArray<{
    relativePath?: string;
    sourceContextFactDefinitionId?: string;
    clear?: boolean;
  }>;
}): RuntimeArtifactOverrideFile[] | null => {
  if (value.clear === true) {
    return null;
  }

  const files = Array.isArray(value.files)
    ? value.files.flatMap((file) => {
        if (!file || file.clear === true || typeof file.relativePath !== "string") {
          return [];
        }

        const relativePath = file.relativePath.trim();
        if (relativePath.length === 0) {
          return [];
        }

        return [
          {
            relativePath,
            ...(typeof file.sourceContextFactDefinitionId === "string"
              ? { sourceContextFactDefinitionId: file.sourceContextFactDefinitionId }
              : {}),
          } satisfies RuntimeArtifactOverrideFile,
        ];
      })
    : [];

  if (files.length > 0) {
    return files;
  }

  if (typeof value.relativePath === "string" && value.relativePath.trim().length > 0) {
    return [
      {
        relativePath: value.relativePath.trim(),
        ...(typeof value.sourceContextFactDefinitionId === "string"
          ? { sourceContextFactDefinitionId: value.sourceContextFactDefinitionId }
          : {}),
      } satisfies RuntimeArtifactOverrideFile,
    ];
  }

  return null;
};

const isFilePathPlainContextFact = (contextFact: {
  kind: string;
  valueType?: string | undefined;
  cardinality: string;
  validationJson?: unknown | undefined;
}): boolean =>
  contextFact.kind === "plain_value_fact" &&
  contextFact.valueType === "string" &&
  (contextFact.cardinality === "one" || contextFact.cardinality === "many") &&
  isPlainRecord(contextFact.validationJson) &&
  contextFact.validationJson.kind === "path" &&
  isPlainRecord(contextFact.validationJson.path) &&
  contextFact.validationJson.path.pathKind === "file";

const toInitialFactDefinition = (params: {
  factDefinitionId: string;
  factType: string;
  value: unknown;
}) => {
  if (params.value === undefined || params.value === null) {
    return null;
  }

  if (params.factType !== "work_unit") {
    return {
      factDefinitionId: params.factDefinitionId,
      initialValueJson: params.value,
    };
  }

  if (
    isPlainRecord(params.value) &&
    typeof params.value.projectWorkUnitId === "string" &&
    params.value.projectWorkUnitId.length > 0
  ) {
    return {
      factDefinitionId: params.factDefinitionId,
      initialReferencedProjectWorkUnitId: params.value.projectWorkUnitId,
    };
  }

  return null;
};

export class InvokeWorkUnitExecutionService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeWorkUnitExecutionService",
)<
  InvokeWorkUnitExecutionService,
  {
    readonly startInvokeWorkUnitTarget: (
      input: StartInvokeWorkUnitTargetInput,
    ) => Effect.Effect<StartInvokeWorkUnitTargetOutput, RepositoryError>;
    readonly saveInvokeWorkUnitTargetDraft: (
      input: SaveInvokeWorkUnitTargetDraftInput,
    ) => Effect.Effect<SaveInvokeWorkUnitTargetDraftOutput, RepositoryError>;
  }
>() {}

export const InvokeWorkUnitExecutionServiceLive = Layer.effect(
  InvokeWorkUnitExecutionService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const stepRepo = yield* StepExecutionRepository;
    const readRepo = yield* ExecutionReadRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const projectWorkUnitRepo = yield* Effect.serviceOption(ProjectWorkUnitRepository);
    const runtimeGate = yield* RuntimeGateService;
    const contextExternalPrefillService = yield* Effect.serviceOption(
      WorkflowContextExternalPrefillService,
    );

    const prepareInvokeWorkUnitTargetDraft = (
      input: Pick<
        SaveInvokeWorkUnitTargetDraftInput,
        | "projectId"
        | "stepExecutionId"
        | "invokeWorkUnitTargetExecutionId"
        | "runtimeFactValues"
        | "runtimeArtifactValues"
      > & { workflowDefinitionId?: string },
    ) =>
      Effect.gen(function* () {
        const baseLogContext = {
          service: "invoke-work-unit-execution",
          projectId: input.projectId,
          stepExecutionId: input.stepExecutionId,
          invokeWorkUnitTargetExecutionId: input.invokeWorkUnitTargetExecutionId,
          selectedWorkflowDefinitionId: input.workflowDefinitionId,
        } as const;

        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeCommandError("step execution not found");
        }

        const workflowDetail = yield* readRepo.getWorkflowExecutionDetail(
          stepExecution.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== input.projectId) {
          return yield* makeCommandError("step execution does not belong to project");
        }
        if (stepExecution.status !== "active") {
          return yield* makeCommandError("step execution is not active");
        }

        const projectPin = yield* projectContextRepo.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeCommandError("project methodology pin missing");
        }

        const invokeStepExecutionState =
          yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(input.stepExecutionId);
        if (!invokeStepExecutionState) {
          return yield* makeCommandError("invoke step execution state not found");
        }

        const invokeWorkUnitTarget = yield* invokeRepo.getInvokeWorkUnitTargetExecutionById(
          input.invokeWorkUnitTargetExecutionId,
        );
        if (!invokeWorkUnitTarget) {
          return yield* makeCommandError("invoke work-unit target execution not found");
        }
        if (invokeWorkUnitTarget.invokeStepExecutionStateId !== invokeStepExecutionState.id) {
          return yield* makeCommandError(
            "invoke work-unit target execution does not belong to step execution",
          );
        }

        if (
          invokeWorkUnitTarget.projectWorkUnitId &&
          invokeWorkUnitTarget.transitionExecutionId &&
          invokeWorkUnitTarget.workflowDefinitionId &&
          invokeWorkUnitTarget.workflowExecutionId
        ) {
          return yield* makeCommandError("invoke work-unit target execution already started");
        }

        if (
          invokeWorkUnitTarget.projectWorkUnitId ||
          invokeWorkUnitTarget.transitionExecutionId ||
          invokeWorkUnitTarget.workflowDefinitionId ||
          invokeWorkUnitTarget.workflowExecutionId
        ) {
          return yield* makeCommandError("invoke work-unit target execution is partially started");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return yield* makeCommandError("parent work-unit type not found");
        }

        const invokeDefinition = yield* methodologyRepo.getInvokeStepDefinition({
          versionId: projectPin.methodologyVersionId,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          stepId: stepExecution.stepDefinitionId,
        });
        if (!invokeDefinition || invokeDefinition.payload.targetKind !== "work_unit") {
          return yield* makeCommandError("step execution is not a work-unit invoke step");
        }

        const transitionConfig = invokeDefinition.payload.activationTransitions.find(
          (candidate) => candidate.transitionId === invokeWorkUnitTarget.transitionDefinitionId,
        );
        if (!transitionConfig) {
          return yield* makeCommandError("invoke work-unit target transition is blocked");
        }
        if (
          typeof input.workflowDefinitionId === "string" &&
          !transitionConfig.workflowDefinitionIds.includes(input.workflowDefinitionId)
        ) {
          return yield* makeCommandError("selected workflow definition is not valid for target");
        }

        const targetWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === invokeWorkUnitTarget.workUnitDefinitionId,
        );
        if (!targetWorkUnitType) {
          return yield* makeCommandError("target work-unit type not found");
        }

        const parentWorkflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: parentWorkUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const workflowContextFacts = yield* stepRepo.listWorkflowExecutionContextFacts(
          stepExecution.workflowExecutionId,
        );

        const overrideFactValuesByDefinitionId = new Map<string, unknown>();
        for (const runtimeValue of input.runtimeFactValues ?? []) {
          if (overrideFactValuesByDefinitionId.has(runtimeValue.workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for work-unit fact '${runtimeValue.workUnitFactDefinitionId}'`,
            );
          }

          overrideFactValuesByDefinitionId.set(
            runtimeValue.workUnitFactDefinitionId,
            runtimeValue.valueJson,
          );
        }

        const overrideArtifactValuesByDefinitionId = new Map<
          string,
          RuntimeArtifactOverrideFile[] | null
        >();
        for (const runtimeValue of input.runtimeArtifactValues ?? []) {
          if (overrideArtifactValuesByDefinitionId.has(runtimeValue.artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for artifact slot '${runtimeValue.artifactSlotDefinitionId}'`,
            );
          }

          overrideArtifactValuesByDefinitionId.set(
            runtimeValue.artifactSlotDefinitionId,
            normalizeRuntimeArtifactOverrideFiles(runtimeValue),
          );
        }

        const contextFactsByDefinitionId = new Map(
          parentWorkflowEditor.contextFacts.flatMap((fact) =>
            typeof fact.contextFactDefinitionId === "string"
              ? [[fact.contextFactDefinitionId, fact] as const]
              : [],
          ),
        );
        const workflowContextFactInstancesByDefinitionId = new Map<
          string,
          RuntimeWorkflowExecutionContextFactRow[]
        >();
        for (const factInstance of workflowContextFacts) {
          const entries =
            workflowContextFactInstancesByDefinitionId.get(factInstance.contextFactDefinitionId) ??
            [];
          entries.push(factInstance);
          workflowContextFactInstancesByDefinitionId.set(
            factInstance.contextFactDefinitionId,
            entries,
          );
        }
        for (const [definitionId, instances] of workflowContextFactInstancesByDefinitionId) {
          workflowContextFactInstancesByDefinitionId.set(
            definitionId,
            [...instances].sort((left, right) => left.instanceOrder - right.instanceOrder),
          );
        }

        const uniqueActivationTransitions = uniqueTransitionDefinitions(
          invokeDefinition.payload.activationTransitions,
        );

        const resolveSourceDraftTemplate = (contextFactDefinitionId: string) => {
          const contextFact = contextFactsByDefinitionId.get(contextFactDefinitionId);
          if (!contextFact || contextFact.kind !== "work_unit_draft_spec_fact") {
            return undefined;
          }

          const sourceDraftTemplates = dedupeByCanonicalKey(
            (workflowContextFactInstancesByDefinitionId.get(contextFactDefinitionId) ?? [])
              .flatMap((fact) => normalizeToItems(fact.valueJson))
              .flatMap((value) => {
                const normalized = normalizeSourceDraftTemplate(
                  value,
                  invokeWorkUnitTarget.workUnitDefinitionId,
                );
                return normalized ? [normalized] : [];
              }),
          );

          if (sourceDraftTemplates.length === 0) {
            return undefined;
          }

          if (
            uniqueActivationTransitions.length > 0 &&
            typeof invokeWorkUnitTarget.resolutionOrder === "number"
          ) {
            return sourceDraftTemplates[
              Math.floor(invokeWorkUnitTarget.resolutionOrder / uniqueActivationTransitions.length)
            ];
          }

          return sourceDraftTemplates[0];
        };

        const invokeBindings = invokeDefinition.payload.bindings;
        const workUnitFactDestinationIds = new Set(
          invokeBindings.flatMap((binding) =>
            binding.destination.kind === "work_unit_fact"
              ? [binding.destination.workUnitFactDefinitionId]
              : [],
          ),
        );
        for (const workUnitFactDefinitionId of overrideFactValuesByDefinitionId.keys()) {
          if (!workUnitFactDestinationIds.has(workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `runtime value provided for unknown binding destination '${workUnitFactDefinitionId}'`,
            );
          }
        }

        const artifactSlotDestinationIds = new Set(
          invokeBindings.flatMap((binding) =>
            binding.destination.kind === "artifact_slot"
              ? [binding.destination.artifactSlotDefinitionId]
              : [],
          ),
        );
        for (const artifactSlotDefinitionId of overrideArtifactValuesByDefinitionId.keys()) {
          if (!artifactSlotDestinationIds.has(artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `runtime value provided for unknown artifact binding destination '${artifactSlotDefinitionId}'`,
            );
          }
        }

        const resolvedWorkUnitFactValuesByDefinitionId = new Map<string, unknown>();
        const resolvedArtifactValuesByDefinitionId = new Map<
          string,
          RuntimeArtifactOverrideFile[]
        >();
        for (const binding of invokeBindings) {
          if (binding.destination.kind === "artifact_slot") {
            const destinationArtifactSlotDefinitionId =
              binding.destination.artifactSlotDefinitionId;

            if (overrideArtifactValuesByDefinitionId.has(destinationArtifactSlotDefinitionId)) {
              const overrideArtifactValue = overrideArtifactValuesByDefinitionId.get(
                destinationArtifactSlotDefinitionId,
              );
              if (overrideArtifactValue && overrideArtifactValue.length > 0) {
                resolvedArtifactValuesByDefinitionId.set(
                  destinationArtifactSlotDefinitionId,
                  overrideArtifactValue,
                );
              }
              continue;
            }

            if (binding.source.kind === "literal") {
              return yield* makeCommandError(
                `artifact-slot binding '${destinationArtifactSlotDefinitionId}' does not support literal values`,
              );
            }

            if (binding.source.kind === "runtime") {
              return yield* makeCommandError(
                `missing runtime value for artifact slot '${destinationArtifactSlotDefinitionId}'`,
              );
            }

            const sourceContextFact = contextFactsByDefinitionId.get(
              binding.source.contextFactDefinitionId,
            );
            if (!sourceContextFact) {
              return yield* makeCommandError(
                `invoke binding references unknown context fact '${binding.source.contextFactDefinitionId}'`,
              );
            }

            const sourceInstances =
              workflowContextFactInstancesByDefinitionId.get(
                binding.source.contextFactDefinitionId,
              ) ?? [];
            if (sourceInstances.length === 0) {
              return yield* makeCommandError(
                `no runtime context value found for context fact '${binding.source.contextFactDefinitionId}'`,
              );
            }

            if (
              sourceContextFact.kind === "artifact_slot_reference_fact" &&
              sourceContextFact.slotDefinitionId === destinationArtifactSlotDefinitionId
            ) {
              const sourceValue = sourceInstances[0]?.valueJson;
              if (!hasRelativePath(sourceValue)) {
                return yield* makeCommandError(
                  `artifact source for '${destinationArtifactSlotDefinitionId}' must contain a relativePath`,
                );
              }

              const resolvedFiles =
                sourceContextFact.cardinality === "many"
                  ? sourceInstances.flatMap((instance) =>
                      hasRelativePath(instance.valueJson)
                        ? [
                            {
                              relativePath: instance.valueJson.relativePath,
                              sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                            } satisfies RuntimeArtifactOverrideFile,
                          ]
                        : [],
                    )
                  : [
                      {
                        relativePath: sourceValue.relativePath,
                        sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                      } satisfies RuntimeArtifactOverrideFile,
                    ];

              resolvedArtifactValuesByDefinitionId.set(
                destinationArtifactSlotDefinitionId,
                resolvedFiles,
              );
              continue;
            }

            if (isFilePathPlainContextFact(sourceContextFact)) {
              const resolvedFiles = sourceInstances.flatMap((instance) =>
                typeof instance.valueJson === "string" && instance.valueJson.trim().length > 0
                  ? [
                      {
                        relativePath: instance.valueJson.trim(),
                        sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                      } satisfies RuntimeArtifactOverrideFile,
                    ]
                  : [],
              );
              if (resolvedFiles.length === 0) {
                return yield* makeCommandError(
                  `plain file-path context fact '${binding.source.contextFactDefinitionId}' must contain a non-empty string`,
                );
              }

              resolvedArtifactValuesByDefinitionId.set(
                destinationArtifactSlotDefinitionId,
                resolvedFiles,
              );
              continue;
            }

            return yield* makeCommandError(
              `context fact '${binding.source.contextFactDefinitionId}' is not a supported artifact source`,
            );
          }

          const destinationFactDefinitionId = binding.destination.workUnitFactDefinitionId;
          if (overrideFactValuesByDefinitionId.has(destinationFactDefinitionId)) {
            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              overrideFactValuesByDefinitionId.get(destinationFactDefinitionId),
            );
            continue;
          }

          if (binding.source.kind === "literal") {
            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              binding.source.value,
            );
            continue;
          }

          if (binding.source.kind === "runtime") {
            return yield* makeCommandError(
              `missing runtime value for work-unit fact '${destinationFactDefinitionId}'`,
            );
          }

          const sourceContextFact = contextFactsByDefinitionId.get(
            binding.source.contextFactDefinitionId,
          );
          if (!sourceContextFact) {
            return yield* makeCommandError(
              `invoke binding references unknown context fact '${binding.source.contextFactDefinitionId}'`,
            );
          }

          if (sourceContextFact.kind === "work_unit_draft_spec_fact") {
            const sourceDraftTemplate = resolveSourceDraftTemplate(
              binding.source.contextFactDefinitionId,
            );
            const factValue = sourceDraftTemplate?.factValues.find(
              (entry) => entry.workUnitFactDefinitionId === destinationFactDefinitionId,
            );
            if (factValue) {
              resolvedWorkUnitFactValuesByDefinitionId.set(
                destinationFactDefinitionId,
                factValue.value,
              );
            }
            continue;
          }

          const sourceInstances =
            workflowContextFactInstancesByDefinitionId.get(
              binding.source.contextFactDefinitionId,
            ) ?? [];
          if (sourceInstances.length === 0) {
            return yield* makeCommandError(
              `no runtime context value found for context fact '${binding.source.contextFactDefinitionId}'`,
            );
          }

          const resolvedValue =
            sourceContextFact.cardinality === "many"
              ? sourceInstances.map((instance) =>
                  sourceContextFact.kind === "bound_fact"
                    ? unwrapRuntimeBoundFactEnvelope(instance.valueJson)
                    : instance.valueJson,
                )
              : sourceContextFact.kind === "bound_fact"
                ? unwrapRuntimeBoundFactEnvelope(sourceInstances[0]?.valueJson)
                : sourceInstances[0]?.valueJson;
          resolvedWorkUnitFactValuesByDefinitionId.set(destinationFactDefinitionId, resolvedValue);
        }

        const [factSchemas, artifactSlots, availableWorkUnitTypes, projectWorkUnits] =
          yield* Effect.all([
            lifecycleRepo.findFactSchemas(
              projectPin.methodologyVersionId,
              invokeWorkUnitTarget.workUnitDefinitionId,
            ),
            methodologyRepo.findArtifactSlotsByWorkUnitType({
              versionId: projectPin.methodologyVersionId,
              workUnitTypeKey: targetWorkUnitType.key,
            }),
            lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
            Option.isSome(projectWorkUnitRepo)
              ? projectWorkUnitRepo.value.listProjectWorkUnitsByProject(input.projectId)
              : Effect.succeed([]),
          ]);

        const targetFactDefinitionIds = new Set(factSchemas.map((factSchema) => factSchema.id));
        for (const factDefinitionId of resolvedWorkUnitFactValuesByDefinitionId.keys()) {
          if (!targetFactDefinitionIds.has(factDefinitionId)) {
            return yield* makeCommandError(
              `invoke binding destination fact '${factDefinitionId}' is not available on target work unit`,
            );
          }
        }

        const targetArtifactSlotDefinitionIds = new Set(artifactSlots.map((slot) => slot.id));
        for (const artifactSlotDefinitionId of resolvedArtifactValuesByDefinitionId.keys()) {
          if (!targetArtifactSlotDefinitionIds.has(artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `invoke binding destination artifact slot '${artifactSlotDefinitionId}' is not available on target work unit`,
            );
          }
        }

        const frozenSourceDraft =
          isContextBackedSourceMode(invokeDefinition.payload.sourceMode) &&
          "contextFactDefinitionId" in invokeDefinition.payload
            ? resolveSourceDraftTemplate(invokeDefinition.payload.contextFactDefinitionId)
            : undefined;

        const initialFactDefinitions: Array<{
          factDefinitionId: string;
          initialValueJson?: unknown;
          initialReferencedProjectWorkUnitId?: string | null;
        }> = [];
        const warnings: SingletonAutoAttachWarning[] = [];
        for (const factSchema of factSchemas) {
          if (resolvedWorkUnitFactValuesByDefinitionId.has(factSchema.id)) {
            const initialFactDefinition = toInitialFactDefinition({
              factDefinitionId: factSchema.id,
              factType: factSchema.factType,
              value: resolvedWorkUnitFactValuesByDefinitionId.get(factSchema.id),
            });

            if (!initialFactDefinition && factSchema.factType === "work_unit") {
              return yield* makeCommandError(
                `work-unit fact '${factSchema.id}' requires a { projectWorkUnitId: string } value`,
              );
            }

            if (initialFactDefinition) {
              initialFactDefinitions.push(initialFactDefinition);
            }
            continue;
          }

          if (factSchema.factType === "work_unit" && factSchema.cardinality === "one") {
            const resolution = resolveAutoAttachedProjectWorkUnit({
              targetWorkUnitDefinitionId: factSchema.targetWorkUnitDefinitionId ?? undefined,
              projectWorkUnits,
              workUnitTypes: availableWorkUnitTypes,
              factDefinitionId: factSchema.id,
            });

            if (resolution.warning) {
              warnings.push(resolution.warning);
            }

            if (resolution.projectWorkUnitId) {
              initialFactDefinitions.push({
                factDefinitionId: factSchema.id,
                initialReferencedProjectWorkUnitId: resolution.projectWorkUnitId,
              });
            }
          }
        }

        const initialArtifactSlotDefinitions = artifactSlots.flatMap((slot) =>
          resolvedArtifactValuesByDefinitionId.has(slot.id)
            ? [
                {
                  artifactSlotDefinitionId: slot.id,
                  files: resolvedArtifactValuesByDefinitionId.get(slot.id)!.map((file) => ({
                    filePath: file.relativePath,
                    memberStatus: "present" as const,
                  })),
                },
              ]
            : [],
        );

        const frozenDraftTemplateJson = buildFrozenDraftTemplate({
          draftKey:
            frozenSourceDraft?.draftKey ??
            `${invokeWorkUnitTarget.workUnitDefinitionId}:${invokeWorkUnitTarget.transitionDefinitionId}:${invokeWorkUnitTarget.resolutionOrder ?? 0}`,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          initialFactDefinitions,
          initialArtifactSlotDefinitions,
        });

        return {
          baseLogContext,
          invokeWorkUnitTarget,
          initialFactDefinitions,
          initialArtifactSlotDefinitions,
          frozenDraftTemplateJson,
          warnings,
        };
      });

    const startInvokeWorkUnitTarget = (input: StartInvokeWorkUnitTargetInput) =>
      Effect.gen(function* () {
        const baseLogContext = {
          service: "invoke-work-unit-execution",
          projectId: input.projectId,
          stepExecutionId: input.stepExecutionId,
          invokeWorkUnitTargetExecutionId: input.invokeWorkUnitTargetExecutionId,
          selectedWorkflowDefinitionId: input.workflowDefinitionId,
        } as const;

        yield* Effect.logInfo("invoke work-unit target start requested").pipe(
          Effect.annotateLogs(baseLogContext),
        );

        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeCommandError("step execution not found");
        }

        const workflowDetail = yield* readRepo.getWorkflowExecutionDetail(
          stepExecution.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== input.projectId) {
          return yield* makeCommandError("step execution does not belong to project");
        }
        if (stepExecution.status !== "active") {
          return yield* makeCommandError("step execution is not active");
        }

        const projectPin = yield* projectContextRepo.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeCommandError("project methodology pin missing");
        }

        const invokeStepExecutionState =
          yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(input.stepExecutionId);
        if (!invokeStepExecutionState) {
          return yield* makeCommandError("invoke step execution state not found");
        }

        const invokeWorkUnitTarget = yield* invokeRepo.getInvokeWorkUnitTargetExecutionById(
          input.invokeWorkUnitTargetExecutionId,
        );
        if (!invokeWorkUnitTarget) {
          return yield* makeCommandError("invoke work-unit target execution not found");
        }
        if (invokeWorkUnitTarget.invokeStepExecutionStateId !== invokeStepExecutionState.id) {
          return yield* makeCommandError(
            "invoke work-unit target execution does not belong to step execution",
          );
        }

        if (
          invokeWorkUnitTarget.projectWorkUnitId &&
          invokeWorkUnitTarget.transitionExecutionId &&
          invokeWorkUnitTarget.workflowDefinitionId &&
          invokeWorkUnitTarget.workflowExecutionId
        ) {
          yield* Effect.logInfo("invoke work-unit target already started").pipe(
            Effect.annotateLogs({
              ...baseLogContext,
              existingProjectWorkUnitId: invokeWorkUnitTarget.projectWorkUnitId,
              existingTransitionExecutionId: invokeWorkUnitTarget.transitionExecutionId,
              existingWorkflowExecutionId: invokeWorkUnitTarget.workflowExecutionId,
            }),
          );

          return {
            invokeWorkUnitTargetExecutionId: invokeWorkUnitTarget.id,
            projectWorkUnitId: invokeWorkUnitTarget.projectWorkUnitId,
            transitionExecutionId: invokeWorkUnitTarget.transitionExecutionId,
            workflowExecutionId: invokeWorkUnitTarget.workflowExecutionId,
            result: "already_started",
          } satisfies StartInvokeWorkUnitTargetOutput;
        }

        if (
          invokeWorkUnitTarget.projectWorkUnitId ||
          invokeWorkUnitTarget.transitionExecutionId ||
          invokeWorkUnitTarget.workflowDefinitionId ||
          invokeWorkUnitTarget.workflowExecutionId
        ) {
          return yield* makeCommandError("invoke work-unit target execution is partially started");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return yield* makeCommandError("parent work-unit type not found");
        }

        const invokeDefinition = yield* methodologyRepo.getInvokeStepDefinition({
          versionId: projectPin.methodologyVersionId,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          stepId: stepExecution.stepDefinitionId,
        });
        if (!invokeDefinition || invokeDefinition.payload.targetKind !== "work_unit") {
          return yield* makeCommandError("step execution is not a work-unit invoke step");
        }

        const transitionConfig = invokeDefinition.payload.activationTransitions.find(
          (candidate) => candidate.transitionId === invokeWorkUnitTarget.transitionDefinitionId,
        );
        if (!transitionConfig) {
          return yield* makeCommandError("invoke work-unit target transition is blocked");
        }
        if (!transitionConfig.workflowDefinitionIds.includes(input.workflowDefinitionId)) {
          return yield* makeCommandError("selected workflow definition is not valid for target");
        }

        const targetWorkUnitType = workUnitTypes.find(
          (candidate) => candidate.id === invokeWorkUnitTarget.workUnitDefinitionId,
        );
        if (!targetWorkUnitType) {
          return yield* makeCommandError("target work-unit type not found");
        }

        const parentWorkflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: parentWorkUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const workflowContextFacts = yield* stepRepo.listWorkflowExecutionContextFacts(
          stepExecution.workflowExecutionId,
        );

        const overrideFactValuesByDefinitionId = new Map<string, unknown>();
        for (const runtimeValue of input.runtimeFactValues ?? []) {
          if (overrideFactValuesByDefinitionId.has(runtimeValue.workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for work-unit fact '${runtimeValue.workUnitFactDefinitionId}'`,
            );
          }

          overrideFactValuesByDefinitionId.set(
            runtimeValue.workUnitFactDefinitionId,
            runtimeValue.valueJson,
          );
        }

        const overrideArtifactValuesByDefinitionId = new Map<
          string,
          RuntimeArtifactOverrideFile[] | null
        >();
        for (const runtimeValue of input.runtimeArtifactValues ?? []) {
          if (overrideArtifactValuesByDefinitionId.has(runtimeValue.artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for artifact slot '${runtimeValue.artifactSlotDefinitionId}'`,
            );
          }

          overrideArtifactValuesByDefinitionId.set(
            runtimeValue.artifactSlotDefinitionId,
            normalizeRuntimeArtifactOverrideFiles(runtimeValue),
          );
        }

        const contextFactsByDefinitionId = new Map(
          parentWorkflowEditor.contextFacts.flatMap((fact) =>
            typeof fact.contextFactDefinitionId === "string"
              ? [[fact.contextFactDefinitionId, fact] as const]
              : [],
          ),
        );
        const workflowContextFactInstancesByDefinitionId = new Map<
          string,
          RuntimeWorkflowExecutionContextFactRow[]
        >();
        for (const factInstance of workflowContextFacts) {
          const entries =
            workflowContextFactInstancesByDefinitionId.get(factInstance.contextFactDefinitionId) ??
            [];
          entries.push(factInstance);
          workflowContextFactInstancesByDefinitionId.set(
            factInstance.contextFactDefinitionId,
            entries,
          );
        }
        for (const [definitionId, instances] of workflowContextFactInstancesByDefinitionId) {
          workflowContextFactInstancesByDefinitionId.set(
            definitionId,
            [...instances].sort((left, right) => left.instanceOrder - right.instanceOrder),
          );
        }

        const uniqueActivationTransitions = uniqueTransitionDefinitions(
          invokeDefinition.payload.activationTransitions,
        );

        const resolveSourceDraftTemplate = (contextFactDefinitionId: string) => {
          const contextFact = contextFactsByDefinitionId.get(contextFactDefinitionId);
          if (!contextFact || contextFact.kind !== "work_unit_draft_spec_fact") {
            return undefined;
          }

          const sourceDraftTemplates = dedupeByCanonicalKey(
            (workflowContextFactInstancesByDefinitionId.get(contextFactDefinitionId) ?? [])
              .flatMap((fact) => normalizeToItems(fact.valueJson))
              .flatMap((value) => {
                const normalized = normalizeSourceDraftTemplate(
                  value,
                  invokeWorkUnitTarget.workUnitDefinitionId,
                );
                return normalized ? [normalized] : [];
              }),
          );

          if (sourceDraftTemplates.length === 0) {
            return undefined;
          }

          if (
            uniqueActivationTransitions.length > 0 &&
            typeof invokeWorkUnitTarget.resolutionOrder === "number"
          ) {
            return sourceDraftTemplates[
              Math.floor(invokeWorkUnitTarget.resolutionOrder / uniqueActivationTransitions.length)
            ];
          }

          return sourceDraftTemplates[0];
        };

        const invokeBindings = invokeDefinition.payload.bindings;
        const workUnitFactDestinationIds = new Set(
          invokeBindings.flatMap((binding) =>
            binding.destination.kind === "work_unit_fact"
              ? [binding.destination.workUnitFactDefinitionId]
              : [],
          ),
        );

        for (const workUnitFactDefinitionId of overrideFactValuesByDefinitionId.keys()) {
          if (!workUnitFactDestinationIds.has(workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `runtime value provided for unknown binding destination '${workUnitFactDefinitionId}'`,
            );
          }
        }

        const artifactSlotDestinationIds = new Set(
          invokeBindings.flatMap((binding) =>
            binding.destination.kind === "artifact_slot"
              ? [binding.destination.artifactSlotDefinitionId]
              : [],
          ),
        );
        for (const artifactSlotDefinitionId of overrideArtifactValuesByDefinitionId.keys()) {
          if (!artifactSlotDestinationIds.has(artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `runtime value provided for unknown artifact binding destination '${artifactSlotDefinitionId}'`,
            );
          }
        }

        const resolvedWorkUnitFactValuesByDefinitionId = new Map<string, unknown>();
        const resolvedArtifactValuesByDefinitionId = new Map<
          string,
          RuntimeArtifactOverrideFile[]
        >();
        for (const binding of invokeBindings) {
          if (binding.destination.kind === "artifact_slot") {
            const destinationArtifactSlotDefinitionId =
              binding.destination.artifactSlotDefinitionId;

            if (overrideArtifactValuesByDefinitionId.has(destinationArtifactSlotDefinitionId)) {
              const overrideArtifactValue = overrideArtifactValuesByDefinitionId.get(
                destinationArtifactSlotDefinitionId,
              );
              if (overrideArtifactValue && overrideArtifactValue.length > 0) {
                resolvedArtifactValuesByDefinitionId.set(
                  destinationArtifactSlotDefinitionId,
                  overrideArtifactValue,
                );
              }
              continue;
            }

            if (binding.source.kind === "literal") {
              return yield* makeCommandError(
                `artifact-slot binding '${destinationArtifactSlotDefinitionId}' does not support literal values`,
              );
            }

            if (binding.source.kind === "runtime") {
              return yield* makeCommandError(
                `missing runtime value for artifact slot '${destinationArtifactSlotDefinitionId}'`,
              );
            }

            const sourceContextFact = contextFactsByDefinitionId.get(
              binding.source.contextFactDefinitionId,
            );
            if (!sourceContextFact) {
              return yield* makeCommandError(
                `invoke binding references unknown context fact '${binding.source.contextFactDefinitionId}'`,
              );
            }

            const sourceInstances =
              workflowContextFactInstancesByDefinitionId.get(
                binding.source.contextFactDefinitionId,
              ) ?? [];
            if (sourceInstances.length === 0) {
              return yield* makeCommandError(
                `no runtime context value found for context fact '${binding.source.contextFactDefinitionId}'`,
              );
            }

            if (
              sourceContextFact.kind === "artifact_slot_reference_fact" &&
              sourceContextFact.slotDefinitionId === destinationArtifactSlotDefinitionId
            ) {
              const sourceValue = sourceInstances[0]?.valueJson;
              if (!hasRelativePath(sourceValue)) {
                return yield* makeCommandError(
                  `artifact source for '${destinationArtifactSlotDefinitionId}' must contain a relativePath`,
                );
              }

              const resolvedFiles =
                sourceContextFact.cardinality === "many"
                  ? sourceInstances.flatMap((instance) =>
                      hasRelativePath(instance.valueJson)
                        ? [
                            {
                              relativePath: instance.valueJson.relativePath,
                              sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                            } satisfies RuntimeArtifactOverrideFile,
                          ]
                        : [],
                    )
                  : [
                      {
                        relativePath: sourceValue.relativePath,
                        sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                      } satisfies RuntimeArtifactOverrideFile,
                    ];

              resolvedArtifactValuesByDefinitionId.set(
                destinationArtifactSlotDefinitionId,
                resolvedFiles,
              );
              continue;
            }

            if (isFilePathPlainContextFact(sourceContextFact)) {
              const resolvedFiles = sourceInstances.flatMap((instance) =>
                typeof instance.valueJson === "string" && instance.valueJson.trim().length > 0
                  ? [
                      {
                        relativePath: instance.valueJson.trim(),
                        sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
                      } satisfies RuntimeArtifactOverrideFile,
                    ]
                  : [],
              );
              if (resolvedFiles.length === 0) {
                return yield* makeCommandError(
                  `plain file-path context fact '${binding.source.contextFactDefinitionId}' must contain a non-empty string`,
                );
              }

              resolvedArtifactValuesByDefinitionId.set(
                destinationArtifactSlotDefinitionId,
                resolvedFiles,
              );
              continue;
            }

            return yield* makeCommandError(
              `context fact '${binding.source.contextFactDefinitionId}' is not a supported artifact source`,
            );
          }

          const destinationFactDefinitionId = binding.destination.workUnitFactDefinitionId;
          if (overrideFactValuesByDefinitionId.has(destinationFactDefinitionId)) {
            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              overrideFactValuesByDefinitionId.get(destinationFactDefinitionId),
            );
            continue;
          }

          if (binding.source.kind === "literal") {
            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              binding.source.value,
            );
            continue;
          }

          if (binding.source.kind === "runtime") {
            return yield* makeCommandError(
              `missing runtime value for work-unit fact '${destinationFactDefinitionId}'`,
            );
          }

          const sourceContextFact = contextFactsByDefinitionId.get(
            binding.source.contextFactDefinitionId,
          );
          if (!sourceContextFact) {
            return yield* makeCommandError(
              `invoke binding references unknown context fact '${binding.source.contextFactDefinitionId}'`,
            );
          }

          if (sourceContextFact.kind === "work_unit_draft_spec_fact") {
            const sourceDraftTemplate = resolveSourceDraftTemplate(
              binding.source.contextFactDefinitionId,
            );
            const factValue = sourceDraftTemplate?.factValues.find(
              (entry) => entry.workUnitFactDefinitionId === destinationFactDefinitionId,
            );
            if (factValue) {
              resolvedWorkUnitFactValuesByDefinitionId.set(
                destinationFactDefinitionId,
                factValue.value,
              );
            }
            continue;
          }

          const sourceInstances =
            workflowContextFactInstancesByDefinitionId.get(
              binding.source.contextFactDefinitionId,
            ) ?? [];
          if (sourceInstances.length === 0) {
            return yield* makeCommandError(
              `no runtime context value found for context fact '${binding.source.contextFactDefinitionId}'`,
            );
          }

          const resolvedValue =
            sourceContextFact.cardinality === "many"
              ? sourceInstances.map((instance) =>
                  sourceContextFact.kind === "bound_fact"
                    ? unwrapRuntimeBoundFactEnvelope(instance.valueJson)
                    : instance.valueJson,
                )
              : sourceContextFact.kind === "bound_fact"
                ? unwrapRuntimeBoundFactEnvelope(sourceInstances[0]?.valueJson)
                : sourceInstances[0]?.valueJson;
          resolvedWorkUnitFactValuesByDefinitionId.set(destinationFactDefinitionId, resolvedValue);
        }

        const [factSchemas, artifactSlots, availableWorkUnitTypes, projectWorkUnits] =
          yield* Effect.all([
            lifecycleRepo.findFactSchemas(
              projectPin.methodologyVersionId,
              invokeWorkUnitTarget.workUnitDefinitionId,
            ),
            methodologyRepo.findArtifactSlotsByWorkUnitType({
              versionId: projectPin.methodologyVersionId,
              workUnitTypeKey: targetWorkUnitType.key,
            }),
            lifecycleRepo.findWorkUnitTypes(projectPin.methodologyVersionId),
            Option.isSome(projectWorkUnitRepo)
              ? projectWorkUnitRepo.value.listProjectWorkUnitsByProject(input.projectId)
              : Effect.succeed([]),
          ]);

        const targetFactDefinitionIds = new Set(factSchemas.map((factSchema) => factSchema.id));
        for (const factDefinitionId of resolvedWorkUnitFactValuesByDefinitionId.keys()) {
          if (!targetFactDefinitionIds.has(factDefinitionId)) {
            return yield* makeCommandError(
              `invoke binding destination fact '${factDefinitionId}' is not available on target work unit`,
            );
          }
        }

        const targetArtifactSlotDefinitionIds = new Set(artifactSlots.map((slot) => slot.id));
        for (const artifactSlotDefinitionId of resolvedArtifactValuesByDefinitionId.keys()) {
          if (!targetArtifactSlotDefinitionIds.has(artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `invoke binding destination artifact slot '${artifactSlotDefinitionId}' is not available on target work unit`,
            );
          }
        }

        const frozenSourceDraft =
          isContextBackedSourceMode(invokeDefinition.payload.sourceMode) &&
          "contextFactDefinitionId" in invokeDefinition.payload
            ? resolveSourceDraftTemplate(invokeDefinition.payload.contextFactDefinitionId)
            : undefined;

        const initialFactDefinitions: Array<{
          factDefinitionId: string;
          initialValueJson?: unknown;
          initialReferencedProjectWorkUnitId?: string | null;
        }> = [];
        const warnings: SingletonAutoAttachWarning[] = [];
        for (const factSchema of factSchemas) {
          if (resolvedWorkUnitFactValuesByDefinitionId.has(factSchema.id)) {
            const initialFactDefinition = toInitialFactDefinition({
              factDefinitionId: factSchema.id,
              factType: factSchema.factType,
              value: resolvedWorkUnitFactValuesByDefinitionId.get(factSchema.id),
            });

            if (!initialFactDefinition && factSchema.factType === "work_unit") {
              return yield* makeCommandError(
                `work-unit fact '${factSchema.id}' requires a { projectWorkUnitId: string } value`,
              );
            }

            if (initialFactDefinition) {
              initialFactDefinitions.push(initialFactDefinition);
            }
            continue;
          }

          if (factSchema.factType === "work_unit" && factSchema.cardinality === "one") {
            const resolution = resolveAutoAttachedProjectWorkUnit({
              targetWorkUnitDefinitionId: factSchema.targetWorkUnitDefinitionId ?? undefined,
              projectWorkUnits,
              workUnitTypes: availableWorkUnitTypes,
              factDefinitionId: factSchema.id,
            });

            if (resolution.warning) {
              warnings.push(resolution.warning);
            }

            if (resolution.projectWorkUnitId) {
              initialFactDefinitions.push({
                factDefinitionId: factSchema.id,
                initialReferencedProjectWorkUnitId: resolution.projectWorkUnitId,
              });
            }
          }

          continue;
        }

        const initialArtifactSlotDefinitions = artifactSlots.flatMap((slot) =>
          resolvedArtifactValuesByDefinitionId.has(slot.id)
            ? [
                {
                  artifactSlotDefinitionId: slot.id,
                  files: resolvedArtifactValuesByDefinitionId.get(slot.id)!.map((file) => ({
                    filePath: file.relativePath,
                    memberStatus: "present" as const,
                  })),
                },
              ]
            : [],
        );

        const transitionConditionSets = yield* lifecycleRepo.findTransitionConditionSets(
          projectPin.methodologyVersionId,
          invokeWorkUnitTarget.transitionDefinitionId,
        );
        const startGateConditionTree = toRuntimeConditionTree(
          transitionConditionSets
            .filter((conditionSet) => conditionSet.phase !== "completion")
            .sort((left, right) => left.key.localeCompare(right.key)),
        );
        const projectedWorkUnitFactsByDefinitionId = new Map<
          string,
          RuntimeGateProjectedWorkUnitFactValue[]
        >();
        for (const definition of initialFactDefinitions) {
          const entries =
            projectedWorkUnitFactsByDefinitionId.get(definition.factDefinitionId) ?? [];
          entries.push({
            valueJson: definition.initialValueJson ?? null,
            referencedProjectWorkUnitId: definition.initialReferencedProjectWorkUnitId ?? null,
          });
          projectedWorkUnitFactsByDefinitionId.set(definition.factDefinitionId, entries);
        }

        const projectedArtifactSlotsByDefinitionId = new Map<
          string,
          RuntimeGateProjectedArtifactSlotValue
        >();
        for (const definition of initialArtifactSlotDefinitions) {
          projectedArtifactSlotsByDefinitionId.set(definition.artifactSlotDefinitionId, {
            exists: (definition.files?.length ?? 0) > 0,
            freshness: (definition.files?.length ?? 0) > 0 ? "fresh" : "unavailable",
          });
        }

        const gate = yield* runtimeGate
          .evaluateStartGate({
            projectId: input.projectId,
            conditionTree: startGateConditionTree,
            projectedWorkUnitFactsByDefinitionId,
            projectedArtifactSlotsByDefinitionId,
          })
          .pipe(Effect.mapError(mapGateError));

        if (gate.result !== "available") {
          return yield* makeCommandError(gate.firstReason ?? "invoke target start gate failed");
        }

        const frozenDraftTemplateJson = buildFrozenDraftTemplate({
          draftKey:
            frozenSourceDraft?.draftKey ??
            `${invokeWorkUnitTarget.workUnitDefinitionId}:${invokeWorkUnitTarget.transitionDefinitionId}:${invokeWorkUnitTarget.resolutionOrder ?? 0}`,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          initialFactDefinitions,
          initialArtifactSlotDefinitions,
        });

        const started = yield* invokeRepo.startInvokeWorkUnitTargetAtomically({
          projectId: input.projectId,
          invokeWorkUnitTargetExecutionId: invokeWorkUnitTarget.id,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          transitionDefinitionId: invokeWorkUnitTarget.transitionDefinitionId,
          workflowDefinitionId: input.workflowDefinitionId,
          frozenDraftTemplateJson,
          initialFactDefinitions,
          initialArtifactSlotDefinitions,
        });

        yield* Effect.logInfo("invoke work-unit target atomic start completed").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            startedProjectWorkUnitId: started.projectWorkUnitId,
            startedTransitionExecutionId: started.transitionExecutionId,
            startedWorkflowExecutionId: started.workflowExecutionId,
            prefillServiceAvailable: Option.isSome(contextExternalPrefillService),
          }),
        );

        if (Option.isSome(contextExternalPrefillService)) {
          const prefillResult =
            yield* contextExternalPrefillService.value.prefillFromExternalBindings({
              projectId: input.projectId,
              workflowExecutionId: started.workflowExecutionId,
            });

          warnings.push(...prefillResult.warnings);

          yield* Effect.logInfo("invoke work-unit target prefill completed").pipe(
            Effect.annotateLogs({
              ...baseLogContext,
              startedWorkflowExecutionId: started.workflowExecutionId,
              prefillInsertedCount: prefillResult.insertedCount,
            }),
          );
        } else {
          yield* Effect.logWarning(
            "invoke work-unit target prefill skipped: service unavailable",
          ).pipe(
            Effect.annotateLogs({
              ...baseLogContext,
              startedWorkflowExecutionId: started.workflowExecutionId,
            }),
          );
        }

        return warnings.length > 0 ? { ...started, warnings } : started;
      });

    const saveInvokeWorkUnitTargetDraft = (input: SaveInvokeWorkUnitTargetDraftInput) =>
      Effect.gen(function* () {
        const prepared = yield* prepareInvokeWorkUnitTargetDraft(input);

        const saved = yield* invokeRepo.saveInvokeWorkUnitTargetDraft({
          invokeWorkUnitTargetExecutionId: prepared.invokeWorkUnitTarget.id,
          frozenDraftTemplateJson: prepared.frozenDraftTemplateJson,
        });

        return prepared.warnings.length > 0 ? { ...saved, warnings: prepared.warnings } : saved;
      });

    return InvokeWorkUnitExecutionService.of({
      startInvokeWorkUnitTarget,
      saveInvokeWorkUnitTargetDraft,
    });
  }),
);
