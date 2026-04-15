import type {
  StartInvokeWorkUnitTargetInput,
  StartInvokeWorkUnitTargetOutput,
} from "@chiron/contracts/runtime/executions";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-work-unit-execution.startInvokeWorkUnitTarget",
    cause: new Error(cause),
  });

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

    const startInvokeWorkUnitTarget = (input: StartInvokeWorkUnitTargetInput) =>
      Effect.gen(function* () {
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

        const runtimeFactValuesByDefinitionId = new Map<string, unknown>();
        for (const runtimeValue of input.runtimeFactValues ?? []) {
          if (runtimeFactValuesByDefinitionId.has(runtimeValue.workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `duplicate runtime value provided for work-unit fact '${runtimeValue.workUnitFactDefinitionId}'`,
            );
          }

          runtimeFactValuesByDefinitionId.set(
            runtimeValue.workUnitFactDefinitionId,
            runtimeValue.valueJson,
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

        const invokeBindings = invokeDefinition.payload.bindings;
        const runtimeWorkUnitFactDestinationIds = new Set(
          invokeBindings.flatMap((binding) =>
            binding.destination.kind === "work_unit_fact" && binding.source.kind === "runtime"
              ? [binding.destination.workUnitFactDefinitionId]
              : [],
          ),
        );

        for (const workUnitFactDefinitionId of runtimeFactValuesByDefinitionId.keys()) {
          if (!runtimeWorkUnitFactDestinationIds.has(workUnitFactDefinitionId)) {
            return yield* makeCommandError(
              `runtime value provided for non-runtime binding destination '${workUnitFactDefinitionId}'`,
            );
          }
        }

        if (invokeBindings.some((binding) => binding.destination.kind === "artifact_slot")) {
          return yield* makeCommandError(
            "artifact-slot bindings are not supported for invoke work-unit starts",
          );
        }

        const resolvedWorkUnitFactValuesByDefinitionId = new Map<string, unknown>();
        for (const binding of invokeBindings) {
          if (binding.destination.kind !== "work_unit_fact") {
            continue;
          }

          const destinationFactDefinitionId = binding.destination.workUnitFactDefinitionId;
          if (binding.source.kind === "literal") {
            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              binding.source.value,
            );
            continue;
          }

          if (binding.source.kind === "runtime") {
            if (!runtimeFactValuesByDefinitionId.has(destinationFactDefinitionId)) {
              return yield* makeCommandError(
                `missing runtime value for work-unit fact '${destinationFactDefinitionId}'`,
              );
            }

            resolvedWorkUnitFactValuesByDefinitionId.set(
              destinationFactDefinitionId,
              runtimeFactValuesByDefinitionId.get(destinationFactDefinitionId),
            );
            continue;
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

        return yield* invokeRepo.startInvokeWorkUnitTargetAtomically({
          projectId: input.projectId,
          invokeWorkUnitTargetExecutionId: invokeWorkUnitTarget.id,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          transitionDefinitionId: invokeWorkUnitTarget.transitionDefinitionId,
          workflowDefinitionId: input.workflowDefinitionId,
          initialFactDefinitions: factSchemas.flatMap((factSchema) => {
            if (resolvedWorkUnitFactValuesByDefinitionId.has(factSchema.id)) {
              return [
                {
                  factDefinitionId: factSchema.id,
                  initialValueJson: resolvedWorkUnitFactValuesByDefinitionId.get(factSchema.id),
                },
              ];
            }

            if (factSchema.defaultValueJson === null || factSchema.defaultValueJson === undefined) {
              return [];
            }

            return [
              {
                factDefinitionId: factSchema.id,
                initialValueJson: factSchema.defaultValueJson,
              },
            ];
          }),
          initialArtifactSlotDefinitions: artifactSlots.map((slot) => ({
            artifactSlotDefinitionId: slot.id,
          })),
        });
      });

    return InvokeWorkUnitExecutionService.of({
      startInvokeWorkUnitTarget,
    });
  }),
);
