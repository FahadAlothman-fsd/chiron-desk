import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import {
  FormStepExecutionService,
  type SaveFormStepDraftInput,
  type SaveFormStepDraftOutput,
} from "./form-step-execution-service";
import { InvokeCompletionService } from "./invoke-completion-service";
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
    const formExecution = yield* FormStepExecutionService;
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

    const activateWorkflowStepExecution = (input: ActivateWorkflowStepExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* assertWorkflowOwnership(input);

        const existing = yield* stepRepo.listStepExecutionsForWorkflow(input.workflowExecutionId);
        if (existing.length === 0) {
          return yield* tx.activateFirstStepExecution(input.workflowExecutionId);
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
          return { stepExecutionId: currentStepExecution.id };
        }

        const nextStep = yield* progression.getNextStepDefinition({
          workflowId: detail.workflowExecution.workflowId,
          fromStepDefinitionId: currentStepExecution.stepDefinitionId,
        });

        if (!nextStep) {
          return yield* makeCommandError("workflow has no next step ready for activation");
        }

        return yield* tx.activateStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepDefinitionId: nextStep.id,
          stepType: nextStep.type,
          previousStepExecutionId: currentStepExecution.id,
        });
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
