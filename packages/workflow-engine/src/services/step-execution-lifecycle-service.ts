import { Context, Effect, Layer } from "effect";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RepositoryError } from "../errors";
import { BranchStepRuntimeRepository } from "../repositories/branch-step-runtime-repository";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import { evaluateRoutes } from "./branch-route-evaluator";
import { StepProgressionService } from "./step-progression-service";

const makeLifecycleError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "step-execution-lifecycle",
    cause: new Error(cause),
  });

export class StepExecutionLifecycleService extends Context.Tag(
  "@chiron/workflow-engine/services/StepExecutionLifecycleService",
)<
  StepExecutionLifecycleService,
  {
    readonly activateFirstStepExecution: (
      workflowExecutionId: string,
    ) => Effect.Effect<RuntimeStepExecutionRow, RepositoryError>;
    readonly activateStepExecution: (params: {
      workflowExecutionId: string;
      stepDefinitionId: string;
      stepType: string;
      previousStepExecutionId: string | null;
    }) => Effect.Effect<RuntimeStepExecutionRow, RepositoryError>;
    readonly completeStepExecution: (params: {
      stepExecutionId: string;
    }) => Effect.Effect<RuntimeStepExecutionRow, RepositoryError>;
    readonly getStepExecutionStatus: (
      stepExecutionId: string,
    ) => Effect.Effect<RuntimeStepExecutionRow["status"] | null, RepositoryError>;
  }
>() {}

export const StepExecutionLifecycleServiceLive = Layer.effect(
  StepExecutionLifecycleService,
  Effect.gen(function* () {
    const workflowRepo = yield* WorkflowExecutionRepository;
    const stepRepo = yield* StepExecutionRepository;
    const branchRuntimeRepo = yield* BranchStepRuntimeRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const progression = yield* StepProgressionService;

    const createBranchActivationState = (params: {
      workflowExecutionId: string;
      workflowId: string;
      stepExecutionId: string;
      stepDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        const workflowDetail = yield* executionReadRepo.getWorkflowExecutionDetail(
          params.workflowExecutionId,
        );
        if (!workflowDetail) {
          return yield* makeLifecycleError("workflow execution detail not found");
        }

        const projectPin = yield* projectContextRepo.findProjectPin(workflowDetail.projectId);
        if (!projectPin) {
          return yield* makeLifecycleError("project methodology pin missing");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (entry) => entry.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makeLifecycleError("workflow work-unit type not found");
        }

        const [branchDefinition, workflowEditor, contextFacts] = yield* Effect.all([
          methodologyRepo.getBranchStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: params.workflowId,
            stepId: params.stepDefinitionId,
          }),
          methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
            workflowDefinitionId: params.workflowId,
          }),
          stepRepo.listWorkflowExecutionContextFacts(params.workflowExecutionId),
        ]);

        if (!branchDefinition) {
          return yield* makeLifecycleError("branch step definition not found");
        }

        const evaluations = evaluateRoutes({
          routes: branchDefinition.payload.routes.map((route, index) => ({
            ...route,
            sortOrder: index,
          })),
          contextFacts,
          contextFactDefinitions: workflowEditor.contextFacts,
        });

        yield* branchRuntimeRepo.createOnActivation({
          stepExecutionId: params.stepExecutionId,
          routes: evaluations.map((route) => ({
            routeId: route.routeId,
            targetStepId: route.targetStepId,
            sortOrder: route.sortOrder,
            conditionMode: route.conditionMode,
            isValid: route.isValid,
            evaluationTreeJson: route.evaluationTree,
          })),
        });
      });

    const activateStepExecution = ({
      workflowExecutionId,
      stepDefinitionId,
      stepType,
      previousStepExecutionId,
    }: {
      workflowExecutionId: string;
      stepDefinitionId: string;
      stepType: string;
      previousStepExecutionId: string | null;
    }) =>
      Effect.gen(function* () {
        const workflowExecution = yield* workflowRepo.getWorkflowExecutionById(workflowExecutionId);
        if (!workflowExecution) {
          return yield* makeLifecycleError("workflow execution not found");
        }

        const existing = yield* stepRepo.findStepExecutionByWorkflowAndDefinition({
          workflowExecutionId,
          stepDefinitionId,
        });

        if (existing) {
          if (existing.status === "active") {
            return existing;
          }

          return yield* makeLifecycleError(
            "step definition already has a completed execution in this workflow",
          );
        }

        const conflictingActive = workflowExecution.currentStepExecutionId
          ? yield* Effect.gen(function* () {
              const currentStepExecutionId = workflowExecution.currentStepExecutionId;
              if (!currentStepExecutionId) {
                return null;
              }

              const currentStep = yield* stepRepo.getStepExecutionById(currentStepExecutionId);

              if (!currentStep || currentStep.status !== "active") {
                return null;
              }

              return currentStep.stepDefinitionId !== stepDefinitionId ? currentStep : null;
            })
          : null;

        if (conflictingActive) {
          return yield* makeLifecycleError(
            `workflow already has an active step execution for '${conflictingActive.stepDefinitionId}'`,
          );
        }

        const createdStepExecution = yield* stepRepo.createStepExecution({
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          status: "active",
          previousStepExecutionId,
        });

        if (stepType === "form") {
          yield* stepRepo.createFormStepExecutionState({
            stepExecutionId: createdStepExecution.id,
          });
        } else if (stepType === "branch") {
          yield* createBranchActivationState({
            workflowExecutionId,
            workflowId: workflowExecution.workflowId,
            stepExecutionId: createdStepExecution.id,
            stepDefinitionId,
          });
        }

        yield* workflowRepo.setCurrentStepExecutionId({
          workflowExecutionId,
          currentStepExecutionId: createdStepExecution.id,
        });

        return createdStepExecution;
      });

    const activateFirstStepExecution = (workflowExecutionId: string) =>
      Effect.gen(function* () {
        const workflowExecution = yield* workflowRepo.getWorkflowExecutionById(workflowExecutionId);
        if (!workflowExecution) {
          return yield* makeLifecycleError("workflow execution not found");
        }

        const entryStep = yield* progression.resolveEntryStepDefinition(
          workflowExecution.workflowId,
        );
        if (entryStep.state === "invalid_definition") {
          return yield* makeLifecycleError(`workflow definition is invalid: ${entryStep.reason}`);
        }

        return yield* activateStepExecution({
          workflowExecutionId,
          stepDefinitionId: entryStep.entryStep.id,
          stepType: entryStep.entryStep.type,
          previousStepExecutionId: null,
        });
      });

    const completeStepExecution = ({ stepExecutionId }: { stepExecutionId: string }) =>
      Effect.gen(function* () {
        const existing = yield* stepRepo.getStepExecutionById(stepExecutionId);
        if (!existing) {
          return yield* makeLifecycleError("step execution not found");
        }

        if (existing.status === "completed") {
          return existing;
        }

        const completed = yield* stepRepo.completeStepExecution({
          stepExecutionId,
        });
        if (!completed) {
          return yield* makeLifecycleError("step execution not found");
        }
        return completed;
      });

    const getStepExecutionStatus = (stepExecutionId: string) =>
      Effect.gen(function* () {
        const step = yield* stepRepo.getStepExecutionById(stepExecutionId);
        return step?.status ?? null;
      });

    return StepExecutionLifecycleService.of({
      activateFirstStepExecution,
      activateStepExecution,
      completeStepExecution,
      getStepExecutionStatus,
    });
  }),
);
