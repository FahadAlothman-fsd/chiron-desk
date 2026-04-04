import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

type FormStepRepository = {
  readonly createWorkflowFormStep?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly afterStepKey: string | null;
    readonly payload: FormStepPayload;
  }) => Effect.Effect<
    {
      readonly stepId: string;
      readonly payload: FormStepPayload;
    },
    RepositoryError
  >;
  readonly updateWorkflowFormStep?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly stepId: string;
    readonly payload: FormStepPayload;
  }) => Effect.Effect<
    {
      readonly stepId: string;
      readonly payload: FormStepPayload;
    },
    RepositoryError
  >;
  readonly deleteWorkflowFormStep?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly stepId: string;
  }) => Effect.Effect<void, RepositoryError>;
};

const ensureDraftVersion = (
  version: MethodologyVersionRow,
): Effect.Effect<void, VersionNotDraftError> =>
  version.status === "draft"
    ? Effect.void
    : Effect.fail(
        new VersionNotDraftError({
          versionId: version.id,
          currentStatus: version.status,
        }),
      );

const missingCapability = (operation: string) =>
  new RepositoryError({
    operation,
    cause: new Error("Form-step repository capability is not configured"),
  });

export class FormStepDefinitionService extends Context.Tag("FormStepDefinitionService")<
  FormStepDefinitionService,
  {
    readonly createFormStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: FormStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: FormStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateFormStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: FormStepPayload;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly stepId: string;
        readonly payload: FormStepPayload;
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteFormStep: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      void,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const FormStepDefinitionServiceLive = Layer.effect(
  FormStepDefinitionService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      FormStepRepository;

    const ensureDraft = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        yield* ensureDraftVersion(version);
      });

    const createFormStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly afterStepKey: string | null;
        readonly payload: FormStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        if (!repo.createWorkflowFormStep) {
          return yield* Effect.fail(missingCapability("formStep.createWorkflowFormStep"));
        }

        const created = yield* repo.createWorkflowFormStep({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          afterStepKey: input.afterStepKey,
          payload: input.payload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_form_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: created.stepId,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const updateFormStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
        readonly payload: FormStepPayload;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        if (!repo.updateWorkflowFormStep) {
          return yield* Effect.fail(missingCapability("formStep.updateWorkflowFormStep"));
        }

        const updated = yield* repo.updateWorkflowFormStep({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
          payload: input.payload,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_form_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: updated.stepId,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const deleteFormStep = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly stepId: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraft(input.versionId);
        if (!repo.deleteWorkflowFormStep) {
          return yield* Effect.fail(missingCapability("formStep.deleteWorkflowFormStep"));
        }

        yield* repo.deleteWorkflowFormStep({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          stepId: input.stepId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_form_step",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            stepId: input.stepId,
          },
          diagnosticsJson: null,
        });
      });

    return FormStepDefinitionService.of({
      createFormStep,
      updateFormStep,
      deleteFormStep,
    });
  }),
);
