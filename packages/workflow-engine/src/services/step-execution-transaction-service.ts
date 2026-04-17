import { Context, Effect, Layer } from "effect";
import type { WorkflowContextFactKind } from "@chiron/contracts/methodology/workflow";

import { RepositoryError } from "../errors";
import {
  AgentStepExecutionAppliedWriteRepository,
  type AgentStepExecutionAppliedWriteRow,
} from "../repositories/agent-step-execution-applied-write-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import {
  StepContextMutationService,
  type StepContextReplaceInput,
} from "./step-context-mutation-service";
import type { ReplaceRuntimeWorkflowExecutionContextFactValue } from "../repositories/step-execution-repository";
import { StepExecutionLifecycleService } from "./step-execution-lifecycle-service";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ActionStepRuntimeService } from "./action-step-runtime-service";
import { InvokeCompletionService } from "./invoke-completion-service";
import { InvokePropagationService } from "./invoke-propagation-service";
import { StepProgressionService } from "./step-progression-service";

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

export interface ApplyAgentStepWriteParams {
  workflowExecutionId: string;
  stepExecutionId: string;
  writeItemId: string;
  contextFactDefinitionId: string;
  contextFactKind: WorkflowContextFactKind;
  currentValues: readonly ReplaceRuntimeWorkflowExecutionContextFactValue[];
}

export interface ApplyAgentStepWriteResult {
  stepExecutionId: string;
  writeItemId: string;
  appliedWrites: readonly AgentStepExecutionAppliedWriteRow[];
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
    readonly applyAgentStepWrite: (
      params: ApplyAgentStepWriteParams,
    ) => Effect.Effect<ApplyAgentStepWriteResult, RepositoryError>;
  }
>() {}

export const StepExecutionTransactionServiceLive = Layer.effect(
  StepExecutionTransactionService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const lifecycle = yield* StepExecutionLifecycleService;
    const contextMutation = yield* StepContextMutationService;
    const appliedWriteRepo = yield* AgentStepExecutionAppliedWriteRepository;
    const actionRuntime = yield* ActionStepRuntimeService;
    const invokeCompletion = yield* InvokeCompletionService;
    const invokePropagation = yield* InvokePropagationService;
    const progression = yield* StepProgressionService;

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

        if (stepExecution.status === "completed") {
          return {
            stepExecutionId,
            status: "completed",
          } satisfies CompleteStepExecutionResult;
        }

        if (stepExecution.stepType === "action") {
          const workflowDetail =
            yield* executionReadRepo.getWorkflowExecutionDetail(workflowExecutionId);
          if (!workflowDetail) {
            return yield* makeTransactionError("workflow execution detail not found");
          }

          const eligibility = yield* actionRuntime.getCompletionEligibility({
            projectId: workflowDetail.projectId,
            stepExecutionId,
          });
          if (!eligibility.eligible) {
            return yield* makeTransactionError(
              eligibility.reasonIfIneligible ?? "action step is not eligible for completion",
            );
          }
        }

        if (stepExecution.stepType === "invoke") {
          const workflowDetail =
            yield* executionReadRepo.getWorkflowExecutionDetail(workflowExecutionId);
          if (!workflowDetail) {
            return yield* makeTransactionError("workflow execution detail not found");
          }

          const eligibility = yield* invokeCompletion.getCompletionEligibility({
            projectId: workflowDetail.projectId,
            workflowExecutionId,
            stepExecutionId,
          });
          if (!eligibility.eligible) {
            return yield* makeTransactionError(
              eligibility.reasonIfIneligible ?? "invoke step is not eligible for completion",
            );
          }

          yield* invokePropagation.propagateInvokeCompletionOutputs({
            projectId: workflowDetail.projectId,
            workflowExecutionId,
            stepExecutionId,
          });
        } else if (stepExecution.stepType === "branch") {
          const nextStepResolution = yield* progression.getNextStepDefinition({
            workflowExecutionId,
            workflowId: workflowExecution.workflowId,
            fromStepDefinitionId: stepExecution.stepDefinitionId,
            fromStepExecutionId: stepExecution.id,
          });

          if (nextStepResolution.state === "blocked") {
            return yield* makeTransactionError(nextStepResolution.reason);
          }
        }

        yield* lifecycle.completeStepExecution({
          stepExecutionId,
        });

        return {
          stepExecutionId,
          status: "completed",
        } satisfies CompleteStepExecutionResult;
      });

    const applyAgentStepWrite = ({
      workflowExecutionId,
      stepExecutionId,
      writeItemId,
      contextFactDefinitionId,
      contextFactKind,
      currentValues,
    }: ApplyAgentStepWriteParams) =>
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

        const replaced = yield* contextMutation.replaceContextFacts({
          workflowExecutionId,
          sourceStepExecutionId: stepExecutionId,
          affectedContextFactDefinitionIds: [contextFactDefinitionId],
          currentValues,
        });

        const appliedWrites = yield* Effect.forEach(replaced, (row) =>
          appliedWriteRepo.createAppliedWrite({
            stepExecutionId,
            writeItemId,
            contextFactDefinitionId: row.contextFactDefinitionId,
            contextFactKind,
            instanceOrder: row.instanceOrder,
            appliedValueJson: row.valueJson,
          }),
        );

        return {
          stepExecutionId,
          writeItemId,
          appliedWrites,
        } satisfies ApplyAgentStepWriteResult;
      });

    return StepExecutionTransactionService.of({
      activateFirstStepExecution,
      activateStepExecution,
      submitFormStepExecution,
      completeStepExecution,
      applyAgentStepWrite,
    });
  }),
);
