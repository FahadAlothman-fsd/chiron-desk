import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import {
  StepContextMutationService,
  type StepContextReplaceInput,
} from "./step-context-mutation-service";
import { StepExecutionLifecycleService } from "./step-execution-lifecycle-service";

export interface SubmitFormStepExecutionParams {
  workflowExecutionId: string;
  stepExecutionId: string;
  submittedValues: Record<string, unknown>;
  contextReplace: StepContextReplaceInput;
}

export interface SubmitFormStepExecutionResult {
  stepExecutionId: string;
  status: "captured";
}

export interface CompleteStepExecutionParams {
  workflowExecutionId: string;
  stepExecutionId: string;
}

export interface CompleteStepExecutionResult {
  stepExecutionId: string;
  status: "completed";
}

const makeTransactionError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "step-execution-transaction",
    cause: new Error(cause),
  });

export class StepExecutionTransactionService extends Context.Tag(
  "@chiron/workflow-engine/services/StepExecutionTransactionService",
)<
  StepExecutionTransactionService,
  {
    readonly activateFirstStepExecution: (
      workflowExecutionId: string,
    ) => Effect.Effect<{ stepExecutionId: string }, RepositoryError>;
    readonly activateStepExecution: (params: {
      workflowExecutionId: string;
      stepDefinitionId: string;
      stepType: string;
      previousStepExecutionId: string | null;
    }) => Effect.Effect<{ stepExecutionId: string }, RepositoryError>;
    readonly submitFormStepExecution: (
      params: SubmitFormStepExecutionParams,
    ) => Effect.Effect<SubmitFormStepExecutionResult, RepositoryError>;
    readonly completeStepExecution: (
      params: CompleteStepExecutionParams,
    ) => Effect.Effect<CompleteStepExecutionResult, RepositoryError>;
  }
>() {}

export const StepExecutionTransactionServiceLive = Layer.effect(
  StepExecutionTransactionService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const lifecycle = yield* StepExecutionLifecycleService;
    const contextMutation = yield* StepContextMutationService;

    const activateFirstStepExecution = (workflowExecutionId: string) =>
      Effect.gen(function* () {
        const stepExecution = yield* lifecycle.activateFirstStepExecution(workflowExecutionId);
        return { stepExecutionId: stepExecution.id };
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
        const stepExecution = yield* lifecycle.activateStepExecution({
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          previousStepExecutionId,
        });

        return { stepExecutionId: stepExecution.id };
      });

    const submitFormStepExecution = ({
      workflowExecutionId,
      stepExecutionId,
      submittedValues,
      contextReplace,
    }: SubmitFormStepExecutionParams) =>
      Effect.gen(function* () {
        const [workflowExecution, stepExecution] = yield* Effect.all([
          workflowRepo.getWorkflowExecutionById(workflowExecutionId),
          stepRepo.getStepExecutionById(stepExecutionId),
        ]);

        if (!workflowExecution) {
          return yield* makeTransactionError("workflow execution not found");
        }
        if (!stepExecution || stepExecution.workflowExecutionId !== workflowExecutionId) {
          return yield* makeTransactionError(
            "step execution does not belong to workflow execution",
          );
        }

        const existingState = yield* stepRepo.getFormStepExecutionState(stepExecutionId);
        const now = new Date();

        yield* stepRepo.upsertFormStepExecutionState({
          stepExecutionId,
          draftPayloadJson: submittedValues,
          submittedPayloadJson: submittedValues,
          lastDraftSavedAt: existingState?.lastDraftSavedAt ?? null,
          submittedAt: now,
        });

        yield* contextMutation.replaceContextFacts({
          ...contextReplace,
          workflowExecutionId,
          sourceStepExecutionId: stepExecutionId,
        });

        return {
          stepExecutionId,
          status: "captured",
        } satisfies SubmitFormStepExecutionResult;
      });

    const completeStepExecution = ({
      workflowExecutionId,
      stepExecutionId,
    }: CompleteStepExecutionParams) =>
      Effect.gen(function* () {
        const [workflowExecution, stepExecution] = yield* Effect.all([
          workflowRepo.getWorkflowExecutionById(workflowExecutionId),
          stepRepo.getStepExecutionById(stepExecutionId),
        ]);

        if (!workflowExecution) {
          return yield* makeTransactionError("workflow execution not found");
        }
        if (!stepExecution || stepExecution.workflowExecutionId !== workflowExecutionId) {
          return yield* makeTransactionError(
            "step execution does not belong to workflow execution",
          );
        }

        yield* lifecycle.completeStepExecution({
          stepExecutionId,
        });

        return {
          stepExecutionId,
          status: "completed",
        } satisfies CompleteStepExecutionResult;
      });

    return StepExecutionTransactionService.of({
      activateFirstStepExecution,
      activateStepExecution,
      submitFormStepExecution,
      completeStepExecution,
    });
  }),
);
