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
        readonly contextFactDefinitionId: string;
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
        readonly contextFactDefinitionId: string;
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
    const repo = yield* MethodologyRepository;

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

        const existing = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });
        if (existing.some((entry) => entry.key === input.fact.key)) {
          return yield* new ValidationDecodeError({
            message: `Workflow context fact key '${input.fact.key}' already exists`,
          });
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
        readonly contextFactDefinitionId: string;
        readonly fact: WorkflowContextFactDto;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureVersion(input.versionId);
        yield* ensureDraftVersion(version);

        const existing = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });
        const current = existing.find(
          (fact) => fact.contextFactDefinitionId === input.contextFactDefinitionId,
        );
        if (!current) {
          return yield* new ValidationDecodeError({
            message: `Workflow context fact '${input.contextFactDefinitionId}' does not exist`,
          });
        }

        if (current.kind !== input.fact.kind) {
          return yield* new ValidationDecodeError({
            message: `Workflow context fact kind is locked for '${current.key}'`,
          });
        }

        const duplicateKey = existing.some(
          (fact) =>
            fact.contextFactDefinitionId !== input.contextFactDefinitionId &&
            fact.key === input.fact.key,
        );
        if (duplicateKey) {
          return yield* new ValidationDecodeError({
            message: `Workflow context fact key '${input.fact.key}' already exists`,
          });
        }

        const updated = yield* repo.updateWorkflowContextFactByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          contextFactDefinitionId: input.contextFactDefinitionId,
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
        readonly contextFactDefinitionId: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* ensureVersion(input.versionId);
        yield* ensureDraftVersion(version);

        yield* repo.deleteWorkflowContextFactByDefinitionId({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          contextFactDefinitionId: input.contextFactDefinitionId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_context_fact",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
            contextFactDefinitionId: input.contextFactDefinitionId,
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
