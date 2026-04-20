import type {
  SubmitFormStepExecutionInput,
  SubmitFormStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import type { FormStepFieldPayload } from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import {
  readRuntimeBoundFactEnvelope,
  toCanonicalRuntimeBoundFactEnvelope,
} from "./runtime-bound-fact-value";
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

const normalizeFormPayloadValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(normalizeFormPayloadValue);
  }

  const envelope = readRuntimeBoundFactEnvelope(value);
  return envelope ? toCanonicalRuntimeBoundFactEnvelope(envelope) : value;
};

const normalizeFormPayload = (values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, normalizeFormPayloadValue(value)]),
  );

const isPresentSubmittedValue = (value: unknown): boolean => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.some(isPresentSubmittedValue);
  }

  if (isPlainRecord(value)) {
    return Object.keys(value).length > 0;
  }

  return true;
};

const validateSubmissionAgainstFields = ({
  values,
  fields,
}: {
  values: Record<string, unknown>;
  fields: readonly FormStepFieldPayload[];
}) => {
  if (!validateReadyToSubmitPayload(values)) {
    return "submitted payload must be a JSON-compatible object ready for submit";
  }

  const knownFieldKeys = new Set(fields.map((field) => field.fieldKey));
  const unknownKeys = Object.keys(values).filter((key) => !knownFieldKeys.has(key));
  if (unknownKeys.length > 0) {
    return `submitted payload contains unknown field keys: ${unknownKeys.join(", ")}`;
  }

  const missingRequired = fields.filter(
    (field) => field.required && !isPresentSubmittedValue(values[field.fieldKey]),
  );

  if (missingRequired.length > 0) {
    return `required form fields are missing: ${missingRequired
      .map((field) => field.fieldKey)
      .join(", ")}`;
  }

  return null;
};

const buildContextReplacement = ({
  values,
  fields,
}: {
  values: Record<string, unknown>;
  fields: readonly FormStepFieldPayload[];
}) => {
  const affectedContextFactDefinitionIds = fields.map((field) => field.contextFactDefinitionId);
  const currentValues = fields.flatMap((field) => {
    const valueJson = values[field.fieldKey];

    if (valueJson === null || valueJson === undefined || valueJson === "") {
      return [];
    }

    if (Array.isArray(valueJson)) {
      return valueJson.flatMap((entry, instanceOrder) =>
        entry === null || entry === undefined || entry === ""
          ? []
          : [
              {
                contextFactDefinitionId: field.contextFactDefinitionId,
                instanceOrder,
                valueJson: entry,
              },
            ],
      );
    }

    return [
      {
        contextFactDefinitionId: field.contextFactDefinitionId,
        instanceOrder: 0,
        valueJson,
      },
    ];
  });

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
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const projectContextRepo = yield* ProjectContextRepository;

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

        const normalizedValues = normalizeFormPayload(input.values);

        const existingState = yield* stepRepo.getFormStepExecutionState(input.stepExecutionId);

        const now = new Date();

        yield* stepRepo.upsertFormStepExecutionState({
          stepExecutionId: input.stepExecutionId,
          draftPayloadJson: normalizedValues,
          submittedPayloadJson: existingState?.submittedPayloadJson ?? null,
          lastDraftSavedAt: now,
          submittedAt: existingState?.submittedAt ?? null,
        });

        return {
          stepExecutionId: input.stepExecutionId,
          status: "draft_saved",
        } satisfies SaveFormStepDraftOutput;
      });

    const loadFormFields = (params: {
      projectId: string;
      workflowExecutionId: string;
      stepExecutionId: string;
    }) =>
      Effect.gen(function* () {
        const { workflowDetail, step } = yield* assertStepOwnership(params);

        const projectPin = yield* projectContextRepo.findProjectPin(workflowDetail.projectId);
        if (!projectPin) {
          return yield* makeFormExecutionError("project methodology pin missing for form submit");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );

        if (!workUnitType) {
          return yield* makeFormExecutionError("work unit type missing for form submit");
        }

        const workflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: workUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const formDefinition = workflowEditor.formDefinitions.find(
          (definition) => definition.stepId === step.stepDefinitionId,
        );

        if (!formDefinition) {
          return yield* makeFormExecutionError("form definition missing for step execution");
        }

        return formDefinition.payload.fields;
      });

    const submitFormStep = (input: SubmitFormStepExecutionInput) =>
      Effect.gen(function* () {
        yield* assertStepOwnership(input);

        const fields = yield* loadFormFields(input);

        const submissionValidationError = validateSubmissionAgainstFields({
          values: input.values,
          fields,
        });
        if (submissionValidationError) {
          return yield* makeFormExecutionError(submissionValidationError);
        }

        const normalizedValues = normalizeFormPayload(input.values);

        const contextReplace = buildContextReplacement({
          values: normalizedValues,
          fields,
        });

        const submitted = yield* tx.submitFormStepExecution({
          workflowExecutionId: input.workflowExecutionId,
          stepExecutionId: input.stepExecutionId,
          submittedValues: normalizedValues,
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
