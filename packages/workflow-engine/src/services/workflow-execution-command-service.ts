import type {
  RetrySameWorkflowExecutionInput,
  RetrySameWorkflowExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
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
  }
>() {}

export const WorkflowExecutionCommandServiceLive = Layer.effect(
  WorkflowExecutionCommandService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;

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

    return WorkflowExecutionCommandService.of({ retrySameWorkflowExecution });
  }),
);
