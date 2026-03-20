import type {
  CreateWorkUnitWorkflowInput,
  DeleteWorkUnitWorkflowInput,
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

export const WorkflowServiceLive = Layer.effect(
  WorkflowService,
  Effect.gen(function* () {
    const repo = yield* MethodologyRepository;
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
          return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
        }

        yield* ensureDraftVersion(existing);

        if (!repo.createWorkflow) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "methodology.createWorkUnitWorkflow",
              cause: new Error("Workflow CRUD repository capability is not configured"),
            }),
          );
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
          return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
        }

        yield* ensureDraftVersion(existing);

        if (!repo.updateWorkflow) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "methodology.updateWorkUnitWorkflow",
              cause: new Error("Workflow CRUD repository capability is not configured"),
            }),
          );
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
          return yield* Effect.fail(new VersionNotFoundError({ versionId: input.versionId }));
        }

        yield* ensureDraftVersion(existing);

        if (!repo.deleteWorkflow) {
          return yield* Effect.fail(
            new RepositoryError({
              operation: "methodology.deleteWorkUnitWorkflow",
              cause: new Error("Workflow CRUD repository capability is not configured"),
            }),
          );
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

    return WorkflowService.of({
      listWorkUnitWorkflows,
      createWorkUnitWorkflow,
      updateWorkUnitWorkflow,
      deleteWorkUnitWorkflow,
      updateWorkflowDefinition: () => Effect.void,
    });
  }),
);
