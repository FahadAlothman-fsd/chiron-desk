import type {
  CompleteWorkflowExecutionInput,
  CompleteWorkflowExecutionOutput,
  RetrySameWorkflowExecutionInput,
  RetrySameWorkflowExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";

const makeCommandError = (operation: string, cause: string): RepositoryError =>
  new RepositoryError({ operation, cause: new Error(cause) });

export class WorkflowExecutionCommandService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowExecutionCommandService",
)<
  WorkflowExecutionCommandService,
  {
    readonly retrySameWorkflowExecution: (
      input: RetrySameWorkflowExecutionInput,
    ) => Effect.Effect<RetrySameWorkflowExecutionOutput, RepositoryError>;
    readonly completeWorkflowExecution: (
      input: CompleteWorkflowExecutionInput,
    ) => Effect.Effect<CompleteWorkflowExecutionOutput, RepositoryError>;
  }
>() {}

export const WorkflowExecutionCommandServiceLive = Layer.effect(
  WorkflowExecutionCommandService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;

    const assertWorkflowTerminalCompletion = (params: {
      workflowExecutionId: string;
      workflowId: string;
      currentStepExecutionId?: string | null;
    }) =>
      Effect.gen(function* () {
        const stepExecutions = yield* stepRepo.listStepExecutionsForWorkflow(
          params.workflowExecutionId,
        );
        const currentStepExecution = params.currentStepExecutionId
          ? yield* stepRepo.getStepExecutionById(params.currentStepExecutionId)
          : null;

        if (currentStepExecution?.status === "active") {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution still has an active step",
          );
        }

        const stepDefinitions = yield* stepRepo.listWorkflowStepDefinitions(params.workflowId);
        const workflowEdges = yield* stepRepo.listWorkflowEdges(params.workflowId);

        const completedSteps = stepExecutions
          .filter((stepExecution) => stepExecution.status === "completed")
          .slice()
          .sort((left, right) => {
            const leftTime = left.completedAt?.getTime() ?? left.activatedAt.getTime();
            const rightTime = right.completedAt?.getTime() ?? right.activatedAt.getTime();
            return rightTime - leftTime;
          });
        const latestCompletedStep = completedSteps[0];

        if (!latestCompletedStep) {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution has no completed terminal step",
          );
        }

        const nextEdge = workflowEdges.find(
          (edge) => edge.fromStepId === latestCompletedStep.stepDefinitionId,
        );
        if (!nextEdge?.toStepId) {
          return latestCompletedStep;
        }

        const nextStepDefinition = stepDefinitions.find((step) => step.id === nextEdge.toStepId);
        if (!nextStepDefinition) {
          return latestCompletedStep;
        }

        return yield* makeCommandError(
          "workflow-execution-command.completeWorkflowExecution",
          "workflow execution is not terminal yet",
        );
      });

    const retrySameWorkflowExecution = (input: RetrySameWorkflowExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail) {
          return yield* makeCommandError(
            "workflow-execution-command.retrySameWorkflowExecution",
            "workflow execution not found",
          );
        }
        if (detail.projectId !== input.projectId) {
          return yield* makeCommandError(
            "workflow-execution-command.retrySameWorkflowExecution",
            "workflow execution does not belong to project",
          );
        }
        if (detail.transitionExecution.status !== "active") {
          return yield* makeCommandError(
            "workflow-execution-command.retrySameWorkflowExecution",
            "parent transition execution must be active",
          );
        }
        if (
          detail.workflowExecution.status !== "active" &&
          detail.workflowExecution.status !== "completed"
        ) {
          return yield* makeCommandError(
            "workflow-execution-command.retrySameWorkflowExecution",
            "workflow execution is not retryable",
          );
        }

        const created = yield* workflowRepo.createWorkflowExecution({
          transitionExecutionId: detail.workflowExecution.transitionExecutionId,
          workflowId: detail.workflowExecution.workflowId,
          workflowRole: detail.workflowExecution.workflowRole,
          status: "active",
        });

        if (detail.workflowExecution.status === "active") {
          yield* workflowRepo.markWorkflowExecutionSuperseded({
            workflowExecutionId: detail.workflowExecution.id,
            supersededByWorkflowExecutionId: created.id,
          });
        }

        if (detail.workflowExecution.workflowRole === "primary") {
          yield* workflowRepo.updateTransitionPrimaryWorkflowExecutionPointer({
            transitionExecutionId: detail.workflowExecution.transitionExecutionId,
            primaryWorkflowExecutionId: created.id,
          });
        }

        return {
          transitionExecutionId: detail.workflowExecution.transitionExecutionId,
          workflowExecutionId: created.id,
          workflowRole: detail.workflowExecution.workflowRole,
        } satisfies RetrySameWorkflowExecutionOutput;
      });

    const completeWorkflowExecution = (input: CompleteWorkflowExecutionInput) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail) {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution not found",
          );
        }
        if (detail.projectId !== input.projectId) {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution does not belong to project",
          );
        }
        if (detail.workflowExecution.status !== "active") {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution is not active",
          );
        }

        yield* assertWorkflowTerminalCompletion({
          workflowExecutionId: input.workflowExecutionId,
          workflowId: detail.workflowExecution.workflowId,
          ...(detail.workflowExecution.currentStepExecutionId !== undefined
            ? { currentStepExecutionId: detail.workflowExecution.currentStepExecutionId }
            : {}),
        });

        const completed = yield* workflowRepo.markWorkflowExecutionCompleted(
          input.workflowExecutionId,
        );
        if (!completed) {
          return yield* makeCommandError(
            "workflow-execution-command.completeWorkflowExecution",
            "workflow execution could not be marked completed",
          );
        }

        return {
          workflowExecutionId: completed.id,
          status: "completed",
        } satisfies CompleteWorkflowExecutionOutput;
      });

    return WorkflowExecutionCommandService.of({
      retrySameWorkflowExecution,
      completeWorkflowExecution,
    });
  }),
);
