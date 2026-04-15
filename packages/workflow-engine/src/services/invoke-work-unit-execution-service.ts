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
import { StepExecutionRepository } from "../repositories/step-execution-repository";

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

        return yield* invokeRepo.startInvokeWorkUnitTargetAtomically({
          projectId: input.projectId,
          invokeWorkUnitTargetExecutionId: invokeWorkUnitTarget.id,
          workUnitDefinitionId: invokeWorkUnitTarget.workUnitDefinitionId,
          transitionDefinitionId: invokeWorkUnitTarget.transitionDefinitionId,
          workflowDefinitionId: input.workflowDefinitionId,
          initialFactDefinitions: factSchemas.map((factSchema) => ({
            factDefinitionId: factSchema.id,
            defaultValueJson: factSchema.defaultValueJson ?? null,
          })),
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
