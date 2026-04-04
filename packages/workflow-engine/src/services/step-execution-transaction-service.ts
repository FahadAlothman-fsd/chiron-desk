import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository";
import {
  StepContextMutationService,
  type StepContextWriteInput,
} from "./step-context-mutation-service";
import { StepExecutionLifecycleService } from "./step-execution-lifecycle-service";
import { StepProgressionService } from "./step-progression-service";

export interface SubmitFormStepExecutionParams {
  workflowExecutionId: string;
  stepExecutionId: string;
  submittedValues: Record<string, unknown>;
  contextWrites: readonly StepContextWriteInput[];
  authoritativeProjectFactWrites?: ReadonlyArray<{
    projectId: string;
    factDefinitionId: string;
    valueJson: unknown;
    mode: "add" | "set";
  }>;
}

export interface SubmitFormStepExecutionResult {
  stepExecutionId: string;
  status: "captured";
  nextStepExecutionId?: string;
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
    readonly submitFormStepExecution: (
      params: SubmitFormStepExecutionParams,
    ) => Effect.Effect<SubmitFormStepExecutionResult, RepositoryError>;
  }
>() {}

export const StepExecutionTransactionServiceLive = Layer.effect(
  StepExecutionTransactionService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const workflowRepo = yield* WorkflowExecutionRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const lifecycle = yield* StepExecutionLifecycleService;
    const progression = yield* StepProgressionService;
    const contextMutation = yield* StepContextMutationService;

    const activateFirstStepExecution = (workflowExecutionId: string) =>
      Effect.gen(function* () {
        const stepExecution = yield* lifecycle.activateFirstStepExecution(workflowExecutionId);
        return { stepExecutionId: stepExecution.id };
      });

    const submitFormStepExecution = ({
      workflowExecutionId,
      stepExecutionId,
      submittedValues,
      contextWrites,
      authoritativeProjectFactWrites,
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

        const now = new Date();

        yield* stepRepo.upsertFormStepExecutionState({
          stepExecutionId,
          draftValuesJson: submittedValues,
          submittedSnapshotJson: submittedValues,
          submittedAt: now,
        });

        yield* lifecycle.completeStepExecution({
          stepExecutionId,
          progressionData: {
            submittedAt: now.toISOString(),
            contextWriteCount: contextWrites.length,
          },
        });

        if (contextWrites.length > 0) {
          yield* contextMutation.writeContextFacts(
            contextWrites.map((write) => ({
              ...write,
              workflowExecutionId,
              sourceStepExecutionId: stepExecutionId,
            })),
          );
        }

        for (const write of authoritativeProjectFactWrites ?? []) {
          const created = yield* projectFactRepo.createFactInstance({
            projectId: write.projectId,
            factDefinitionId: write.factDefinitionId,
            valueJson: write.valueJson,
            producedByWorkflowExecutionId: workflowExecutionId,
          });

          if (write.mode === "set") {
            const current = yield* projectFactRepo.getCurrentValuesByDefinition({
              projectId: write.projectId,
              factDefinitionId: write.factDefinitionId,
            });
            for (const active of current) {
              if (active.id === created.id) {
                continue;
              }
              yield* projectFactRepo.supersedeFactInstance({
                projectFactInstanceId: active.id,
                supersededByProjectFactInstanceId: created.id,
              });
            }
          }
        }

        const nextStep = yield* progression.getNextStepDefinition({
          workflowId: workflowExecution.workflowId,
          fromStepDefinitionId: stepExecution.stepDefinitionId,
        });

        if (!nextStep) {
          return {
            stepExecutionId,
            status: "captured",
          } satisfies SubmitFormStepExecutionResult;
        }

        const nextExecution = yield* lifecycle.activateStepExecution({
          workflowExecutionId,
          stepDefinitionId: nextStep.id,
          stepType: nextStep.type,
          progressionData: {
            activatedFromStepExecutionId: stepExecutionId,
          },
        });

        return {
          stepExecutionId,
          status: "captured",
          nextStepExecutionId: nextExecution.id,
        } satisfies SubmitFormStepExecutionResult;
      });

    return StepExecutionTransactionService.of({
      activateFirstStepExecution,
      submitFormStepExecution,
    });
  }),
);
