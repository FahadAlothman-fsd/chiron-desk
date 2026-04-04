import type {
  SubmitFormStepExecutionInput,
  SubmitFormStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { StepExecutionTransactionService } from "./step-execution-transaction-service";

export interface SaveFormStepDraftInput {
  projectId: string;
  workflowExecutionId: string;
  stepExecutionId: string;
  values: Record<string, unknown>;
}

export interface SaveFormStepDraftOutput {
  stepExecutionId: string;
  status: "draft_saved";
}

const makeFormExecutionError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "form-step-execution",
    cause: new Error(cause),
  });

const splitWrites = (values: Record<string, unknown>) => {
  const contextWrites = Object.entries(values)
    .filter(([key]) => !key.startsWith("project."))
    .map(([factKey, valueJson]) => ({
      factKey,
      factKind: "plain_value",
      valueJson,
    }));

  const authoritativeProjectFactWrites = Object.entries(values)
    .filter(([key]) => key.startsWith("project."))
    .map(([key, valueJson]) => ({
      factDefinitionId: key.slice("project.".length),
      valueJson,
      mode: "set" as const,
    }))
    .filter((write) => write.factDefinitionId.length > 0);

  return { contextWrites, authoritativeProjectFactWrites };
};

export class FormStepExecutionService extends Context.Tag(
  "@chiron/workflow-engine/services/FormStepExecutionService",
)<
  FormStepExecutionService,
  {
    readonly saveFormStepDraft: (
      input: SaveFormStepDraftInput,
    ) => Effect.Effect<SaveFormStepDraftOutput, RepositoryError>;
    readonly submitFormStep: (
      input: SubmitFormStepExecutionInput,
    ) => Effect.Effect<SubmitFormStepExecutionOutput, RepositoryError>;
  }
>() {}

export const FormStepExecutionServiceLive = Layer.effect(
  FormStepExecutionService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const tx = yield* StepExecutionTransactionService;

    const assertStepOwnership = (params: {
      projectId: string;
      workflowExecutionId: string;
      stepExecutionId: string;
    }) =>
      Effect.gen(function* () {
        const [workflowDetail, step] = yield* Effect.all([
          readRepo.getWorkflowExecutionDetail(params.workflowExecutionId),
          stepRepo.getStepExecutionById(params.stepExecutionId),
        ]);

        if (!workflowDetail || workflowDetail.projectId !== params.projectId) {
          return yield* makeFormExecutionError("workflow execution is not part of this project");
        }

        if (!step || step.workflowExecutionId !== params.workflowExecutionId) {
          return yield* makeFormExecutionError(
            "step execution does not belong to workflow execution",
          );
        }

        if (step.stepType !== "form") {
          return yield* makeFormExecutionError("runtime commands are Form-only in slice-1");
        }

        return { workflowDetail, step };
      });

    const saveFormStepDraft = (input: SaveFormStepDraftInput) =>
      Effect.gen(function* () {
        yield* assertStepOwnership(input);

        const existingState = yield* stepRepo.getFormStepExecutionState(input.stepExecutionId);

        yield* stepRepo.upsertFormStepExecutionState({
          stepExecutionId: input.stepExecutionId,
          draftValuesJson: input.values,
          submittedSnapshotJson: existingState?.submittedSnapshotJson ?? null,
          submittedAt: existingState?.submittedAt ?? null,
        });

        return {
          stepExecutionId: input.stepExecutionId,
          status: "draft_saved",
        } satisfies SaveFormStepDraftOutput;
      });

    const submitFormStep = (input: SubmitFormStepExecutionInput) =>
      Effect.gen(function* () {
        const { workflowDetail } = yield* assertStepOwnership(input);

        const existingState = yield* stepRepo.getFormStepExecutionState(input.stepExecutionId);
        if (existingState?.submittedAt) {
          return yield* makeFormExecutionError("form step is already submitted");
        }

        const writes = splitWrites(input.values);

        const submitted = yield* tx.submitFormStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepExecutionId: input.stepExecutionId,
          submittedValues: input.values,
          contextWrites: writes.contextWrites.map((write) => ({
            workflowExecutionId: input.workflowExecutionId,
            sourceStepExecutionId: input.stepExecutionId,
            factKey: write.factKey,
            factKind: write.factKind,
            valueJson: write.valueJson,
          })),
          authoritativeProjectFactWrites: writes.authoritativeProjectFactWrites.map((write) => ({
            projectId: workflowDetail.projectId,
            factDefinitionId: write.factDefinitionId,
            valueJson: write.valueJson,
            mode: write.mode,
          })),
        });

        return {
          stepExecutionId: submitted.stepExecutionId,
          status: "captured",
        } satisfies SubmitFormStepExecutionOutput;
      });

    return FormStepExecutionService.of({
      saveFormStepDraft,
      submitFormStep,
    });
  }),
);
