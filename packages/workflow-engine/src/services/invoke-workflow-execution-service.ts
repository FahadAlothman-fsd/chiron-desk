import type {
  StartInvokeWorkflowTargetInput,
  StartInvokeWorkflowTargetOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { InvokeExecutionRepository } from "../repositories/invoke-execution-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";

const makeCommandError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "invoke-workflow-execution",
    cause: new Error(cause),
  });

export class InvokeWorkflowExecutionService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeWorkflowExecutionService",
)<
  InvokeWorkflowExecutionService,
  {
    readonly startInvokeWorkflowTarget: (
      input: StartInvokeWorkflowTargetInput,
    ) => Effect.Effect<StartInvokeWorkflowTargetOutput, RepositoryError>;
  }
>() {}

export const InvokeWorkflowExecutionServiceLive = Layer.effect(
  InvokeWorkflowExecutionService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const stepRepo = yield* StepExecutionRepository;

    const startInvokeWorkflowTarget = (input: StartInvokeWorkflowTargetInput) =>
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

        const invokeStepExecutionState =
          yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(input.stepExecutionId);
        if (!invokeStepExecutionState) {
          return yield* makeCommandError("invoke step execution state not found");
        }

        const invokeWorkflowTarget = yield* invokeRepo.getInvokeWorkflowTargetExecutionById(
          input.invokeWorkflowTargetExecutionId,
        );
        if (!invokeWorkflowTarget) {
          return yield* makeCommandError("invoke workflow target execution not found");
        }

        if (invokeWorkflowTarget.invokeStepExecutionStateId !== invokeStepExecutionState.id) {
          return yield* makeCommandError(
            "invoke workflow target execution does not belong to step execution",
          );
        }

        return yield* invokeRepo.startInvokeWorkflowTargetAtomically({
          invokeWorkflowTargetExecutionId: invokeWorkflowTarget.id,
          transitionExecutionId: workflowDetail.workflowExecution.transitionExecutionId,
          workflowDefinitionId: invokeWorkflowTarget.workflowDefinitionId,
        });
      });

    return InvokeWorkflowExecutionService.of({
      startInvokeWorkflowTarget,
    });
  }),
);
