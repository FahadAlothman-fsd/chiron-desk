import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
} from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
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
      progressionData?: unknown;
    }) => Effect.Effect<RuntimeStepExecutionRow, RepositoryError>;
    readonly completeStepExecution: (params: {
      stepExecutionId: string;
      progressionData?: unknown;
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
    const progression = yield* StepProgressionService;

    const activateStepExecution = ({
      workflowExecutionId,
      stepDefinitionId,
      stepType,
      progressionData,
    }: {
      workflowExecutionId: string;
      stepDefinitionId: string;
      stepType: string;
      progressionData?: unknown;
    }) =>
      Effect.gen(function* () {
        const existing = yield* stepRepo.findStepExecutionByWorkflowAndDefinition({
          workflowExecutionId,
          stepDefinitionId,
        });
        if (existing) {
          return existing;
        }

        return yield* stepRepo.createStepExecution({
          workflowExecutionId,
          stepDefinitionId,
          stepType,
          status: "active",
          progressionData: progressionData ?? null,
        });
      });

    const activateFirstStepExecution = (workflowExecutionId: string) =>
      Effect.gen(function* () {
        const workflowExecution = yield* workflowRepo.getWorkflowExecutionById(workflowExecutionId);
        if (!workflowExecution) {
          return yield* makeLifecycleError("workflow execution not found");
        }

        const firstStep = yield* progression.getFirstStepDefinition(workflowExecution.workflowId);
        if (!firstStep) {
          return yield* makeLifecycleError("workflow has no step definitions");
        }

        return yield* activateStepExecution({
          workflowExecutionId,
          stepDefinitionId: firstStep.id,
          stepType: firstStep.type,
          progressionData: { activation: "first_step" },
        });
      });

    const completeStepExecution = ({
      stepExecutionId,
      progressionData,
    }: {
      stepExecutionId: string;
      progressionData?: unknown;
    }) =>
      Effect.gen(function* () {
        const completed = yield* stepRepo.completeStepExecution({
          stepExecutionId,
          progressionData: progressionData ?? null,
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
