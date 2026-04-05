import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

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

const validateFieldBindings = (
  payload: FormStepPayload,
  facts: readonly WorkflowContextFactDto[],
): Effect.Effect<void, ValidationDecodeError> =>
  Effect.gen(function* () {
    const factByIdentifier = new Map<string, WorkflowContextFactDto>();
    const seen = new Set<string>();

    for (const fact of facts) {
      factByIdentifier.set(fact.key, fact);
      if (typeof fact.contextFactDefinitionId === "string") {
        factByIdentifier.set(fact.contextFactDefinitionId, fact);
      }
    }

    for (const field of payload.fields) {
      if (seen.has(field.contextFactDefinitionId)) {
        return yield* new ValidationDecodeError({
          message: `Form step cannot bind context fact '${field.contextFactDefinitionId}' more than once`,
        });
      }

      seen.add(field.contextFactDefinitionId);

      const fact = factByIdentifier.get(field.contextFactDefinitionId);
      if (!fact) {
        return yield* new ValidationDecodeError({
          message: `Unknown workflow context fact '${field.contextFactDefinitionId}'`,
        });
      }

      if (fact.cardinality === "one" && field.uiMultiplicityMode !== undefined) {
        return yield* new ValidationDecodeError({
          message: `Field '${field.fieldKey}' cannot override multiplicity for one-cardinality context fact '${field.contextFactDefinitionId}'`,
        });
      }
    }
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
    const repo = yield* MethodologyRepository;

    const ensureDraft = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        yield* ensureDraftVersion(version);
      });

    const validatePayload = (
      workflowDefinitionId: string,
      versionId: string,
      payload: FormStepPayload,
    ) =>
      Effect.gen(function* () {
        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId,
          workflowDefinitionId,
        });

        yield* validateFieldBindings(payload, facts);
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
        yield* validatePayload(input.workflowDefinitionId, input.versionId, input.payload);

        const created = yield* repo.createFormStepDefinition({
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
        yield* validatePayload(input.workflowDefinitionId, input.versionId, input.payload);

        const updated = yield* repo.updateFormStepDefinition({
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

        yield* repo.deleteFormStepDefinition({
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
