import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

type WorkflowContextFactRepository = {
  readonly listWorkflowContextFactsByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
  }) => Effect.Effect<readonly WorkflowContextFactDto[], RepositoryError>;
  readonly createWorkflowContextFactByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly fact: WorkflowContextFactDto;
  }) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
  readonly updateWorkflowContextFactByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly factKey: string;
    readonly fact: WorkflowContextFactDto;
  }) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
  readonly deleteWorkflowContextFactByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly factKey: string;
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
    cause: new Error("Workflow context-fact repository capability is not configured"),
  });

export class WorkflowContextFactDefinitionService extends Context.Tag(
  "WorkflowContextFactDefinitionService",
)<
  WorkflowContextFactDefinitionService,
  {
    readonly list: (input: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
    }) => Effect.Effect<
      readonly WorkflowContextFactDto[],
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
    readonly create: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly fact: WorkflowContextFactDto;
      },
      actorId: string | null,
    ) => Effect.Effect<
      WorkflowContextFactDto,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly update: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly factKey: string;
        readonly fact: WorkflowContextFactDto;
      },
      actorId: string | null,
    ) => Effect.Effect<
      WorkflowContextFactDto,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly delete: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly factKey: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      void,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkflowContextFactDefinitionServiceLive = Layer.effect(
  WorkflowContextFactDefinitionService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      WorkflowContextFactRepository;

    const ensureVersion = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }
        return version;
      });

    const list = (input: { readonly versionId: string; readonly workflowDefinitionId: string }) =>
      Effect.gen(function* () {
        yield* ensureVersion(input.versionId);

        if (!repo.listWorkflowContextFactsByDefinitionId) {
          return yield* Effect.fail(missingCapability("workflowContextFact.list"));
        }

        return yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });
      });

    const create = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly fact: WorkflowContextFactDto;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureVersion(input.versionId);
        yield* ensureDraftVersion(version);
        if (!repo.createWorkflowContextFactByDefinitionId) {
          return yield* Effect.fail(missingCapability("workflowContextFact.create"));
        }

        const created = yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          fact: input.fact,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_context_fact",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            factKey: created.key,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const update = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly factKey: string;
        readonly fact: WorkflowContextFactDto;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureVersion(input.versionId);
        yield* ensureDraftVersion(version);
        if (!repo.updateWorkflowContextFactByDefinitionId) {
          return yield* Effect.fail(missingCapability("workflowContextFact.update"));
        }

        const updated = yield* repo.updateWorkflowContextFactByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          factKey: input.factKey,
          fact: input.fact,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_context_fact",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            factKey: updated.key,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const remove = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly factKey: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureVersion(input.versionId);
        yield* ensureDraftVersion(version);
        if (!repo.deleteWorkflowContextFactByDefinitionId) {
          return yield* Effect.fail(missingCapability("workflowContextFact.delete"));
        }

        yield* repo.deleteWorkflowContextFactByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          factKey: input.factKey,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_context_fact",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            factKey: input.factKey,
          },
          diagnosticsJson: null,
        });
      });

    return WorkflowContextFactDefinitionService.of({
      list,
      create,
      update,
      delete: remove,
    });
  }),
);
