import { Context, Effect, Layer } from "effect";
import { MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import {
  FormStepExecutionService,
  type SaveFormStepDraftInput,
  type SaveFormStepDraftOutput,
} from "./form-step-execution-service";
import { InvokeCompletionService } from "./invoke-completion-service";
import { InvokeTargetResolutionService } from "./invoke-target-resolution-service";
import { StepProgressionService } from "./step-progression-service";
import { StepExecutionTransactionService } from "./step-execution-transaction-service";
import type {
  SubmitFormStepExecutionInput,
  SubmitFormStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";

export interface ActivateWorkflowStepExecutionInput {
  projectId: string;
  workflowExecutionId: string;
}

export interface ActivateWorkflowStepExecutionOutput {
  stepExecutionId: string;
}

export type ActivateFirstWorkflowStepExecutionInput = ActivateWorkflowStepExecutionInput;
export type ActivateFirstWorkflowStepExecutionOutput = ActivateWorkflowStepExecutionOutput;

export interface CompleteStepExecutionInput {
  projectId: string;
  workflowExecutionId: string;
  stepExecutionId: string;
}

export interface CompleteStepExecutionOutput {
  stepExecutionId: string;
  status: "completed";
}

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "workflow-execution-step-command",
    cause: new Error(cause),
  });

export class WorkflowExecutionStepCommandService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowExecutionStepCommandService",
)<
  WorkflowExecutionStepCommandService,
  {
    readonly activateWorkflowStepExecution: (
      input: ActivateWorkflowStepExecutionInput,
    ) => Effect.Effect<ActivateWorkflowStepExecutionOutput, RepositoryError>;
    readonly activateFirstWorkflowStepExecution: (
      input: ActivateFirstWorkflowStepExecutionInput,
    ) => Effect.Effect<ActivateFirstWorkflowStepExecutionOutput, RepositoryError>;
    readonly saveFormStepDraft: (
      input: SaveFormStepDraftInput,
    ) => Effect.Effect<SaveFormStepDraftOutput, RepositoryError>;
    readonly submitFormStep: (
      input: SubmitFormStepExecutionInput,
    ) => Effect.Effect<SubmitFormStepExecutionOutput, RepositoryError>;
    readonly completeStepExecution: (
      input: CompleteStepExecutionInput,
    ) => Effect.Effect<CompleteStepExecutionOutput, RepositoryError>;
  }
>() {}

export const WorkflowExecutionStepCommandServiceLive = Layer.effect(
  WorkflowExecutionStepCommandService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const formExecution = yield* FormStepExecutionService;
    const invokeTargetResolution = yield* InvokeTargetResolutionService;
    const progression = yield* StepProgressionService;
    const tx = yield* StepExecutionTransactionService;
    const invokeCompletion = yield* InvokeCompletionService;

    const assertWorkflowOwnership = (input: { projectId: string; workflowExecutionId: string }) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail || detail.projectId !== input.projectId) {
          return yield* makeCommandError("workflow execution does not belong to project");
        }
        return detail;
      });

    const ensureInvokeStepMaterialized = (params: {
      projectId: string;
      workflowExecutionId: string;
      workflowDefinitionId: string;
      stepExecutionId: string;
      stepDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(params.projectId);
        if (!projectPin) {
          return yield* makeCommandError("project methodology pin missing");
        }

        const invokeDefinition = yield* methodologyRepo.getInvokeStepDefinition({
          versionId: projectPin.methodologyVersionId,
          workflowDefinitionId: params.workflowDefinitionId,
          stepId: params.stepDefinitionId,
        });

        if (!invokeDefinition) {
          return yield* makeCommandError("invoke step definition not found");
        }

        return yield* invokeTargetResolution.materializeTargetsForActivation({
          workflowExecutionId: params.workflowExecutionId,
          stepExecutionId: params.stepExecutionId,
          invokeStepDefinitionId: params.stepDefinitionId,
          invokeStep: invokeDefinition.payload,
        });
      });

    const activateWorkflowStepExecution = (input: ActivateWorkflowStepExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* assertWorkflowOwnership(input);

        const existing = yield* stepRepo.listStepExecutionsForWorkflow(input.workflowExecutionId);
        if (existing.length === 0) {
          const activated = yield* tx.activateFirstStepExecution(input.workflowExecutionId);
          const activatedStep = yield* stepRepo.getStepExecutionById(activated.stepExecutionId);
          if (!activatedStep) {
            return yield* makeCommandError("activated step execution not found");
          }

          if (activatedStep.stepType === "invoke") {
            yield* ensureInvokeStepMaterialized({
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              workflowDefinitionId: detail.workflowExecution.workflowId,
              stepExecutionId: activatedStep.id,
              stepDefinitionId: activatedStep.stepDefinitionId,
            });
          }

          return activated;
        }

        const currentStepExecutionId = detail.workflowExecution.currentStepExecutionId;
        if (!currentStepExecutionId) {
          return yield* makeCommandError("workflow current step pointer is missing for activation");
        }

        const currentStepExecution = yield* stepRepo.getStepExecutionById(currentStepExecutionId);
        if (!currentStepExecution) {
          return yield* makeCommandError("workflow current step execution was not found");
        }

        if (currentStepExecution.status === "active") {
          if (currentStepExecution.stepType === "invoke") {
            yield* ensureInvokeStepMaterialized({
              projectId: input.projectId,
              workflowExecutionId: input.workflowExecutionId,
              workflowDefinitionId: detail.workflowExecution.workflowId,
              stepExecutionId: currentStepExecution.id,
              stepDefinitionId: currentStepExecution.stepDefinitionId,
            });
          }

          return { stepExecutionId: currentStepExecution.id };
        }

        const nextStep = yield* progression.getNextStepDefinition({
          workflowId: detail.workflowExecution.workflowId,
          fromStepDefinitionId: currentStepExecution.stepDefinitionId,
        });

        if (!nextStep) {
          return yield* makeCommandError("workflow has no next step ready for activation");
        }

        const activated = yield* tx.activateStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepDefinitionId: nextStep.id,
          stepType: nextStep.type,
          previousStepExecutionId: currentStepExecution.id,
        });

        if (nextStep.type === "invoke") {
          yield* ensureInvokeStepMaterialized({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
            workflowDefinitionId: detail.workflowExecution.workflowId,
            stepExecutionId: activated.stepExecutionId,
            stepDefinitionId: nextStep.id,
          });
        }

        return activated;
      });

    const activateFirstWorkflowStepExecution = (input: ActivateFirstWorkflowStepExecutionInput) =>
      activateWorkflowStepExecution(input);

    const saveFormStepDraft = (input: SaveFormStepDraftInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        return yield* formExecution.saveFormStepDraft(input);
      });

    const submitFormStep = (input: SubmitFormStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        return yield* formExecution.submitFormStep(input);
      });

    const completeStepExecution = (input: CompleteStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);
        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeCommandError("step execution not found");
        }

        if (stepExecution.stepType === "invoke" && stepExecution.status !== "completed") {
          const eligibility = yield* invokeCompletion.getCompletionEligibility({
            projectId: input.projectId,
            workflowExecutionId: input.workflowExecutionId,
            stepExecutionId: input.stepExecutionId,
          });
          if (!eligibility.eligible) {
            return yield* makeCommandError(
              eligibility.reasonIfIneligible ?? "invoke step is not eligible for completion",
            );
          }
        }

        return yield* tx.completeStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepExecutionId: input.stepExecutionId,
        });
      });

    return WorkflowExecutionStepCommandService.of({
      activateWorkflowStepExecution,
      activateFirstWorkflowStepExecution,
      saveFormStepDraft,
      submitFormStep,
      completeStepExecution,
    });
  }),
);
