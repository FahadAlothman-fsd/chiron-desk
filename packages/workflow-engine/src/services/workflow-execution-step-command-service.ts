import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import {
  FormStepExecutionService,
  type SaveFormStepDraftInput,
  type SaveFormStepDraftOutput,
} from "./form-step-execution-service";
import { StepExecutionLifecycleService } from "./step-execution-lifecycle-service";
import { StepProgressionService } from "./step-progression-service";
import type {
  SubmitFormStepExecutionInput,
  SubmitFormStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";

export interface ActivateFirstWorkflowStepExecutionInput {
  projectId: string;
  workflowExecutionId: string;
}

export interface ActivateFirstWorkflowStepExecutionOutput {
  stepExecutionId: string;
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
    readonly activateFirstWorkflowStepExecution: (
      input: ActivateFirstWorkflowStepExecutionInput,
    ) => Effect.Effect<ActivateFirstWorkflowStepExecutionOutput, RepositoryError>;
    readonly saveFormStepDraft: (
      input: SaveFormStepDraftInput,
    ) => Effect.Effect<SaveFormStepDraftOutput, RepositoryError>;
    readonly submitFormStep: (
      input: SubmitFormStepExecutionInput,
    ) => Effect.Effect<SubmitFormStepExecutionOutput, RepositoryError>;
  }
>() {}

export const WorkflowExecutionStepCommandServiceLive = Layer.effect(
  WorkflowExecutionStepCommandService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const stepRepo = yield* StepExecutionRepository;
    const progression = yield* StepProgressionService;
    const lifecycle = yield* StepExecutionLifecycleService;
    const formExecution = yield* FormStepExecutionService;

    const assertWorkflowOwnership = (input: { projectId: string; workflowExecutionId: string }) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail || detail.projectId !== input.projectId) {
          return yield* makeCommandError("workflow execution does not belong to project");
        }
        return detail;
      });

    const activateFirstWorkflowStepExecution = (input: ActivateFirstWorkflowStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertWorkflowOwnership(input);

        const existing = yield* stepRepo.listStepExecutionsForWorkflow(input.workflowExecutionId);
        if (existing.length > 0) {
          return { stepExecutionId: existing[0]!.id };
        }

        const workflowExecution = yield* workflowRepo.getWorkflowExecutionById(
          input.workflowExecutionId,
        );
        if (!workflowExecution) {
          return yield* makeCommandError("workflow execution not found");
        }

        const firstStep = yield* progression.getFirstStepDefinition(workflowExecution.workflowId);
        if (!firstStep) {
          return yield* makeCommandError("workflow has no executable first step");
        }

        const activated = yield* lifecycle.activateStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepDefinitionId: firstStep.id,
          stepType: firstStep.type,
          progressionData: {
            activation: "first_step",
            source: "execution_detail_ui",
          },
        });

        return { stepExecutionId: activated.id };
      });

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

    return WorkflowExecutionStepCommandService.of({
      activateFirstWorkflowStepExecution,
      saveFormStepDraft,
      submitFormStep,
    });
  }),
);
