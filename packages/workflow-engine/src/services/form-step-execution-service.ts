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

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isJsonCompatible = (value: unknown): boolean => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonCompatible);
  }

  if (isPlainRecord(value)) {
    return Object.values(value).every(isJsonCompatible);
  }

  return false;
};

const validateStructuralPayload = (values: Record<string, unknown>) =>
  isPlainRecord(values) &&
  Object.keys(values).every((key) => key.length > 0) &&
  isJsonCompatible(values);

const validateReadyToSubmitPayload = (values: Record<string, unknown>) =>
  validateStructuralPayload(values);

const buildContextReplacement = (values: Record<string, unknown>) => {
  const affectedContextFactDefinitionIds = Object.keys(values);
  const currentValues = Object.entries(values).flatMap(([contextFactDefinitionId, valueJson]) =>
    Array.isArray(valueJson)
      ? valueJson.map((entry, instanceOrder) => ({
          contextFactDefinitionId,
          instanceOrder,
          valueJson: entry,
        }))
      : [
          {
            contextFactDefinitionId,
            instanceOrder: 0,
            valueJson,
          },
        ],
  );

  return {
    affectedContextFactDefinitionIds,
    currentValues,
  };
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

        if (!validateStructuralPayload(input.values)) {
          return yield* makeFormExecutionError("draft payload must be a JSON-compatible object");
        }

        const existingState = yield* stepRepo.getFormStepExecutionState(input.stepExecutionId);

        const now = new Date();

        yield* stepRepo.upsertFormStepExecutionState({
          stepExecutionId: input.stepExecutionId,
          draftPayloadJson: input.values,
          submittedPayloadJson: existingState?.submittedPayloadJson ?? null,
          lastDraftSavedAt: now,
          submittedAt: existingState?.submittedAt ?? null,
        });

        return {
          stepExecutionId: input.stepExecutionId,
          status: "draft_saved",
        } satisfies SaveFormStepDraftOutput;
      });

    const submitFormStep = (input: SubmitFormStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertStepOwnership(input);

        if (!validateReadyToSubmitPayload(input.values)) {
          return yield* makeFormExecutionError(
            "submitted payload must be a JSON-compatible object ready for submit",
          );
        }

        const contextReplace = buildContextReplacement(input.values);

        const submitted = yield* tx.submitFormStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepExecutionId: input.stepExecutionId,
          submittedValues: input.values,
          contextReplace: {
            workflowExecutionId: input.workflowExecutionId,
            sourceStepExecutionId: input.stepExecutionId,
            affectedContextFactDefinitionIds: contextReplace.affectedContextFactDefinitionIds,
            currentValues: contextReplace.currentValues,
          },
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
