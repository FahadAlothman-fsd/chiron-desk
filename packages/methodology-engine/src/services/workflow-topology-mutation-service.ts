import type { WorkflowEdgeDto } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer } from "effect";

import {
  RepositoryError,
  ValidationDecodeError,
  VersionNotDraftError,
  VersionNotFoundError,
} from "../errors";
import { MethodologyRepository, type MethodologyVersionRow } from "../repository";

type WorkflowTopologyRepository = {
  readonly listWorkflowEdgesByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
  }) => Effect.Effect<readonly WorkflowEdgeDto[], RepositoryError>;
  readonly createWorkflowEdgeByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly fromStepKey: string | null;
    readonly toStepKey: string | null;
    readonly descriptionJson: unknown;
  }) => Effect.Effect<WorkflowEdgeDto, RepositoryError>;
  readonly updateWorkflowEdgeByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly edgeId: string;
    readonly fromStepKey: string | null;
    readonly toStepKey: string | null;
    readonly descriptionJson: unknown;
  }) => Effect.Effect<WorkflowEdgeDto, RepositoryError>;
  readonly deleteWorkflowEdgeByDefinitionId?: (input: {
    readonly versionId: string;
    readonly workflowDefinitionId: string;
    readonly edgeId: string;
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

const hasCompetingOutgoingEdge = (
  edges: readonly WorkflowEdgeDto[],
  edgeId: string | null,
  fromStepKey: string | null,
) => {
  if (!fromStepKey) {
    return false;
  }

  return edges.some(
    (edge) => edge.fromStepKey === fromStepKey && (edgeId === null || edge.edgeId !== edgeId),
  );
};

const missingCapability = (operation: string) =>
  new RepositoryError({
    operation,
    cause: new Error("Workflow topology repository capability is not configured"),
  });

export class WorkflowTopologyMutationService extends Context.Tag("WorkflowTopologyMutationService")<
  WorkflowTopologyMutationService,
  {
    readonly createEdge: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly fromStepKey: string | null;
        readonly toStepKey: string | null;
        readonly descriptionJson?: { readonly markdown: string };
      },
      actorId: string | null,
    ) => Effect.Effect<
      WorkflowEdgeDto,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly updateEdge: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly edgeId: string;
        readonly fromStepKey: string | null;
        readonly toStepKey: string | null;
        readonly descriptionJson?: { readonly markdown: string };
      },
      actorId: string | null,
    ) => Effect.Effect<
      WorkflowEdgeDto,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
    readonly deleteEdge: (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly edgeId: string;
      },
      actorId: string | null,
    ) => Effect.Effect<
      void,
      VersionNotFoundError | VersionNotDraftError | ValidationDecodeError | RepositoryError
    >;
  }
>() {}

export const WorkflowTopologyMutationServiceLive = Layer.effect(
  WorkflowTopologyMutationService,
  Effect.gen(function* () {
    const repo = (yield* MethodologyRepository) as MethodologyRepository["Type"] &
      WorkflowTopologyRepository;

    const ensureDraftAndCapabilities = (versionId: string) =>
      Effect.gen(function* () {
        const version = yield* repo.findVersionById(versionId);
        if (!version) {
          return yield* new VersionNotFoundError({ versionId });
        }

        yield* ensureDraftVersion(version);

        if (
          !repo.listWorkflowEdgesByDefinitionId ||
          !repo.createWorkflowEdgeByDefinitionId ||
          !repo.updateWorkflowEdgeByDefinitionId ||
          !repo.deleteWorkflowEdgeByDefinitionId
        ) {
          return yield* Effect.fail(missingCapability("workflowTopology.edgeMutations"));
        }
      });

    const createEdge = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly fromStepKey: string | null;
        readonly toStepKey: string | null;
        readonly descriptionJson?: { readonly markdown: string };
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraftAndCapabilities(input.versionId);

        const existingEdges = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });

        if (hasCompetingOutgoingEdge(existingEdges, null, input.fromStepKey)) {
          return yield* new ValidationDecodeError({
            message: "Slice-1 allows exactly one outgoing edge per source step",
          });
        }

        const created = yield* repo.createWorkflowEdgeByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson ?? null,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "create_workflow_edge",
            workflowDefinitionId: input.workflowDefinitionId,
            workUnitTypeKey: input.workUnitTypeKey,
            edgeId: created.edgeId,
          },
          diagnosticsJson: null,
        });

        return created;
      });

    const updateEdge = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly edgeId: string;
        readonly fromStepKey: string | null;
        readonly toStepKey: string | null;
        readonly descriptionJson?: { readonly markdown: string };
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraftAndCapabilities(input.versionId);

        const existingEdges = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
        });

        if (hasCompetingOutgoingEdge(existingEdges, input.edgeId, input.fromStepKey)) {
          return yield* new ValidationDecodeError({
            message: "Slice-1 allows exactly one outgoing edge per source step",
          });
        }

        const updated = yield* repo.updateWorkflowEdgeByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          edgeId: input.edgeId,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson ?? null,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "update_workflow_edge",
            workflowDefinitionId: input.workflowDefinitionId,
            workUnitTypeKey: input.workUnitTypeKey,
            edgeId: updated.edgeId,
          },
          diagnosticsJson: null,
        });

        return updated;
      });

    const deleteEdge = (
      input: {
        readonly versionId: string;
        readonly workUnitTypeKey: string;
        readonly workflowDefinitionId: string;
        readonly edgeId: string;
      },
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        yield* ensureDraftAndCapabilities(input.versionId);

        yield* repo.deleteWorkflowEdgeByDefinitionId!({
          versionId: input.versionId,
          workflowDefinitionId: input.workflowDefinitionId,
          edgeId: input.edgeId,
        });

        yield* repo.recordEvent({
          methodologyVersionId: input.versionId,
          eventType: "workflows_updated",
          actorId: actorId ?? "system",
          changedFieldsJson: {
            operation: "delete_workflow_edge",
            workflowDefinitionId: input.workflowDefinitionId,
            workUnitTypeKey: input.workUnitTypeKey,
            edgeId: input.edgeId,
          },
          diagnosticsJson: null,
        });
      });

    return WorkflowTopologyMutationService.of({
      createEdge,
      updateEdge,
      deleteEdge,
    });
  }),
);
