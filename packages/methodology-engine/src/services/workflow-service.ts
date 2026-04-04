import type {
  CreateWorkUnitWorkflowInput,
  DeleteWorkUnitWorkflowInput,
  WorkflowMetadataDialogInput,
  UpdateWorkUnitWorkflowInput,
} from "@chiron/contracts/methodology/workflow";
import type { WorkflowDefinition } from "@chiron/contracts/methodology/version";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository } from "../repository";
import type { UpdateDraftResult } from "../version-service";
import { MethodologyVersionServiceLive as CoreMethodologyVersionServiceLive } from "../version-service";
import type { MethodologyVersionRow } from "../repository";

type WorkflowMetadataRepository = {
  readonly updateWorkflowMetadataByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workUnitTypeKey: string;
    readonly workflowDefinitionId: string;
    readonly key: string;
    readonly displayName: string | null;
    readonly descriptionJson: unknown;
  }) => Effect.Effect<
    {
      readonly workflowDefinitionId: string;
      readonly key: string;
      readonly displayName: string | null;
      readonly descriptionJson: unknown;
    },
    RepositoryError
  >;
};

export class WorkflowService extends Context.Tag("WorkflowService")<
  WorkflowService,
  {
    readonly listWorkUnitWorkflows: (input: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
    }) => Effect.Effect<readonly WorkflowDefinition[], RepositoryError>;
    readonly createWorkUnitWorkflow: (
      input: CreateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateWorkUnitWorkflow: (
      input: UpdateWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteWorkUnitWorkflow: (
      input: DeleteWorkUnitWorkflowInput,
      actorId: string | null,
    ) => Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateWorkflowDefinition: (
      input: {
        readonly versionId: string;
        readonly workUnitKey: string;
        readonly workflowKey: string;
        readonly definition: unknown;
      },
      actorId: string | null,
    ) => Effect.Effect<void, never>;
    readonly updateWorkflowMetadata: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: WorkflowMetadataDialogInput;
      },
      actorId: string | null,
    ) => Effect.Effect<
      {
        readonly workflow: {
          readonly workflowDefinitionId: string;
          readonly key: string;
          readonly displayName: string | null;
          readonly descriptionJson: unknown;
        };
      },
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

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
    cause: new Error("Workflow metadata repository capability is not configured"),
  });

export const WorkflowServiceLive = Layer.effect(
  WorkflowService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      WorkflowMetadataRepository;
    const coreService = yield* CoreMethodologyVersionServiceLive;

    const listWorkUnitWorkflows = (input: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
    }): Effect.Effect<readonly WorkflowDefinition[], RepositoryError> =>
      repo.listWorkflowsByWorkUnitType
        ? repo.listWorkflowsByWorkUnitType({
            versionId: input.versionId,
            workUnitTypeKey: input.workUnitTypeKey,
          })
        : Effect.fail(
            new RepositoryError({
              operation: "methodology.listWorkUnitWorkflows",
              cause: new Error("Workflow CRUD repository capability is not configured"),
            }),
          );

    const createWorkUnitWorkflow = (
      input: CreateWorkUnitWorkflowInput,
      actorId: string | null,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureDraftVersion(existing);

        if (!repo.createWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.createWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        const resolvedActorId = actorId ?? "system";

        yield* repo.createWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
          },
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: resolvedActorId,
          changedFieldsJson: {
            operation: "create_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflow.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          resolvedActorId,
        );

        return { version: existing, diagnostics };
      });

    const updateWorkUnitWorkflow = (
      input: UpdateWorkUnitWorkflowInput,
      actorId: string | null,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureDraftVersion(existing);

        if (!repo.updateWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.updateWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        const resolvedActorId = actorId ?? "system";

        yield* repo.updateWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
          workflow: {
            ...input.workflow,
            workUnitTypeKey: input.workUnitTypeKey,
          },
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: resolvedActorId,
          changedFieldsJson: {
            operation: "update_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflowKey,
            nextWorkflowKey: input.workflow.key,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          resolvedActorId,
        );

        return { version: existing, diagnostics };
      });

    const deleteWorkUnitWorkflow = (
      input: DeleteWorkUnitWorkflowInput,
      actorId: string | null,
    ): Effect.Effect<
      UpdateDraftResult,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    > =>
      Effect.gen(function* () {
        const existing = yield* repo.findVersionById(input.versionId);
        if (!existing) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureDraftVersion(existing);

        if (!repo.deleteWorkflow) {
          return yield* new RepositoryError({
            operation: "methodology.deleteWorkUnitWorkflow",
            cause: new Error("Workflow CRUD repository capability is not configured"),
          });
        }

        const resolvedActorId = actorId ?? "system";

        yield* repo.deleteWorkflow({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowKey: input.workflowKey,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: resolvedActorId,
          changedFieldsJson: {
            operation: "delete_workflow",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowKey: input.workflowKey,
          },
          diagnosticsJson: null,
        });

        const diagnostics = yield* coreService.validateDraftVersion(
          { versionId: input.versionId },
          resolvedActorId,
        );

        return { version: existing, diagnostics };
      });

    const updateWorkflowMetadata = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly payload: WorkflowMetadataDialogInput;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(input.versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId: input.versionId });
        }

        yield* ensureDraftVersion(version);

        if (!repo.updateWorkflowMetadataByDefinitionId) {
          return yield* Effect.fail(
            missingCapability("workflowMetadata.updateWorkflowMetadataByDefinitionId"),
          );
        }

        const workflow = yield* repo.updateWorkflowMetadataByDefinitionId({
          versionId: input.versionId,
          workUnitTypeKey: input.workUnitTypeKey,
          workflowDefinitionId: input.workflowDefinitionId,
          key: input.payload.key,
          displayName: input.payload.displayName ?? null,
          descriptionJson: input.payload.descriptionJson ?? null,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_workflow_metadata",
            workUnitTypeKey: input.workUnitTypeKey,
            workflowDefinitionId: input.workflowDefinitionId,
          },
          diagnosticsJson: null,
        });

        return { workflow };
      });

    return WorkflowService.of({
      listWorkUnitWorkflows,
      createWorkUnitWorkflow,
      updateWorkUnitWorkflow,
      deleteWorkUnitWorkflow,
      updateWorkflowDefinition: () => Effect.void,
      updateWorkflowMetadata,
    });
  }),
);
