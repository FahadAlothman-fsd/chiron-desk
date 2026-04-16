import type {
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
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";
import { WorkflowContextExternalPrefillService } from "./workflow-context-external-prefill-service";

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-work-unit-execution.startInvokeWorkUnitTarget",
    cause: new Error(cause),
  });

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasRelativePath = (
  value: unknown,
): value is { relativePath: string; sourceContextFactDefinitionId?: string } =>
  isPlainRecord(value) &&
  typeof value.relativePath === "string" &&
  value.relativePath.trim().length > 0;

const isFilePathPlainContextFact = (contextFact: {
  kind: string;
  valueType?: string;
  cardinality: string;
  validationJson?: unknown;
}): boolean =>
  contextFact.kind === "plain_value_fact" &&
  contextFact.valueType === "string" &&
  contextFact.cardinality === "one" &&
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
    const contextExternalPrefillService = yield* Effect.serviceOption(
      WorkflowContextExternalPrefillService,
    );

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
          { relativePath: string; sourceContextFactDefinitionId?: string } | null
        >();
        for (const runtimeValue of input.runtimeArtifactValues ?? []) {
          if (overrideArtifactValuesByDefinitionId.has(runtimeValue.artifactSlotDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for artifact slot '${runtimeValue.artifactSlotDefinitionId}'`,
            );
          }

          if (runtimeValue.clear === true || !runtimeValue.relativePath) {
            overrideArtifactValuesByDefinitionId.set(runtimeValue.artifactSlotDefinitionId, null);
            continue;
          }

          overrideArtifactValuesByDefinitionId.set(runtimeValue.artifactSlotDefinitionId, {
            relativePath: runtimeValue.relativePath,
            ...(typeof runtimeValue.sourceContextFactDefinitionId === "string"
              ? { sourceContextFactDefinitionId: runtimeValue.sourceContextFactDefinitionId }
              : {}),
          });
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
          { relativePath: string; sourceContextFactDefinitionId?: string }
        >();
        for (const binding of invokeBindings) {
          if (binding.destination.kind === "artifact_slot") {
            const destinationArtifactSlotDefinitionId =
              binding.destination.artifactSlotDefinitionId;

            if (overrideArtifactValuesByDefinitionId.has(destinationArtifactSlotDefinitionId)) {
              const overrideArtifactValue = overrideArtifactValuesByDefinitionId.get(
                destinationArtifactSlotDefinitionId,
              );
              if (overrideArtifactValue) {
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
              sourceContextFact.kind === "artifact_reference_fact" &&
              sourceContextFact.artifactSlotDefinitionId === destinationArtifactSlotDefinitionId
            ) {
              const sourceValue = sourceInstances[0]?.valueJson;
              if (!hasRelativePath(sourceValue)) {
                return yield* makeCommandError(
                  `artifact source for '${destinationArtifactSlotDefinitionId}' must contain a relativePath`,
                );
              }

              resolvedArtifactValuesByDefinitionId.set(destinationArtifactSlotDefinitionId, {
                relativePath: sourceValue.relativePath,
                sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
              });
              continue;
            }

            if (isFilePathPlainContextFact(sourceContextFact)) {
              const sourceValue = sourceInstances[0]?.valueJson;
              if (typeof sourceValue !== "string" || sourceValue.trim().length === 0) {
                return yield* makeCommandError(
                  `plain file-path context fact '${binding.source.contextFactDefinitionId}' must contain a non-empty string`,
                );
              }

              resolvedArtifactValuesByDefinitionId.set(destinationArtifactSlotDefinitionId, {
                relativePath: sourceValue.trim(),
                sourceContextFactDefinitionId: binding.source.contextFactDefinitionId,
              });
              continue;
            }

            if (sourceContextFact.kind === "work_unit_draft_spec_fact") {
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
              ? sourceInstances.map((instance) => instance.valueJson)
              : sourceInstances[0]?.valueJson;
          resolvedWorkUnitFactValuesByDefinitionId.set(destinationFactDefinitionId, resolvedValue);
        }

        const [factSchemas, artifactSlots] = yield* Effect.all([
          lifecycleRepo.findFactSchemas(
            projectPin.methodologyVersionId,
            invokeWorkUnitTarget.workUnitDefinitionId,
          ),
          methodologyRepo.findArtifactSlotsByWorkUnitType({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: targetWorkUnitType.key,
          }),
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

        const initialFactDefinitions: Array<{
          factDefinitionId: string;
          initialValueJson?: unknown;
          initialReferencedProjectWorkUnitId?: string | null;
        }> = [];
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

          if (factSchema.defaultValueJson === null || factSchema.defaultValueJson === undefined) {
            continue;
          }

          const defaultFactDefinition = toInitialFactDefinition({
            factDefinitionId: factSchema.id,
            factType: factSchema.factType,
            value: factSchema.defaultValueJson,
          });

          if (defaultFactDefinition) {
            initialFactDefinitions.push(defaultFactDefinition);
          }
        }

        const started = yield* invokeRepo.startInvokeWorkUnitTargetAtomically({
          projectId: input.projectId,
          invokeWorkUnitTargetExecutionId: invokeWorkUnitTarget.id,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          transitionDefinitionId: invokeWorkUnitTarget.transitionDefinitionId,
          workflowDefinitionId: input.workflowDefinitionId,
          initialFactDefinitions,
          initialArtifactSlotDefinitions: artifactSlots.flatMap((slot) =>
            resolvedArtifactValuesByDefinitionId.has(slot.id)
              ? [
                  {
                    artifactSlotDefinitionId: slot.id,
                    files: [
                      {
                        filePath: resolvedArtifactValuesByDefinitionId.get(slot.id)!.relativePath,
                        memberStatus: "present" as const,
                      },
                    ],
                  },
                ]
              : [],
          ),
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

        return started;
      });

    return InvokeWorkUnitExecutionService.of({
      startInvokeWorkUnitTarget,
    });
  }),
);
