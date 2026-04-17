import type {
  CheckArtifactSlotCurrentStateInput,
  CheckArtifactSlotCurrentStateOutput,
  GetArtifactSlotDetailInput,
  GetArtifactSlotDetailOutput,
  GetArtifactSlotsInput,
  GetArtifactSlotsOutput,
  GetArtifactSnapshotDialogInput,
  GetArtifactSnapshotDialogOutput,
} from "@chiron/contracts/runtime/artifacts";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";

export interface RuntimeArtifactSlotsOptions {
  readonly slotDefinitionIds?: readonly string[];
}

const toWorkUnitIdentity = (
  workUnit: {
    readonly id: string;
    readonly workUnitTypeId: string;
    readonly currentStateId: string | null;
  } | null,
  projectWorkUnitId: string,
): GetArtifactSlotsOutput["workUnit"] => ({
  projectWorkUnitId,
  workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
  workUnitTypeKey: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
  workUnitTypeName: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
  currentStateId: workUnit?.currentStateId ?? "unknown-state",
  currentStateKey: workUnit?.currentStateId ?? "unknown-state",
  currentStateLabel: workUnit?.currentStateId ?? "unknown-state",
});

export class RuntimeArtifactService extends Context.Tag("RuntimeArtifactService")<
  RuntimeArtifactService,
  {
    readonly getArtifactSlots: (
      input: GetArtifactSlotsInput,
      options?: RuntimeArtifactSlotsOptions,
    ) => Effect.Effect<GetArtifactSlotsOutput, RepositoryError>;
    readonly getArtifactSlotDetail: (
      input: GetArtifactSlotDetailInput,
    ) => Effect.Effect<GetArtifactSlotDetailOutput, RepositoryError>;
    readonly getArtifactSnapshotDialog: (
      input: GetArtifactSnapshotDialogInput,
    ) => Effect.Effect<GetArtifactSnapshotDialogOutput, RepositoryError>;
    readonly checkArtifactSlotCurrentState: (
      input: CheckArtifactSlotCurrentStateInput,
    ) => Effect.Effect<CheckArtifactSlotCurrentStateOutput, RepositoryError>;
  }
>() {}

export const RuntimeArtifactServiceLive = Layer.effect(
  RuntimeArtifactService,
  Effect.gen(function* () {
    const artifactRepository = yield* ArtifactRepository;
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;

    const getArtifactSlots = (
      input: GetArtifactSlotsInput,
      options?: RuntimeArtifactSlotsOptions,
    ): Effect.Effect<GetArtifactSlotsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const workUnit = yield* projectWorkUnitRepository.getProjectWorkUnitById(
          input.projectWorkUnitId,
        );
        const slotDefinitionIds = options?.slotDefinitionIds ?? [];

        const slots = yield* Effect.forEach(
          slotDefinitionIds,
          (slotDefinitionId) =>
            Effect.gen(function* () {
              const currentState = yield* artifactRepository.getCurrentSnapshotBySlot({
                projectWorkUnitId: input.projectWorkUnitId,
                slotDefinitionId,
              });
              const lineage = yield* artifactRepository.listLineageHistory({
                projectWorkUnitId: input.projectWorkUnitId,
                slotDefinitionId,
              });
              const latestHead = lineage[0]?.snapshot;

              return {
                slotDefinition: {
                  slotDefinitionId,
                  slotKey: slotDefinitionId,
                  slotName: slotDefinitionId,
                  artifactKind:
                    currentState.members.length > 1
                      ? ("file_set" as const)
                      : ("single_file" as const),
                },
                currentEffectiveSnapshot: {
                  exists: currentState.exists,
                  ...(currentState.snapshot
                    ? { projectArtifactSnapshotId: currentState.snapshot.id }
                    : {}),
                  ...(currentState.snapshot
                    ? { createdAt: currentState.snapshot.createdAt.toISOString() }
                    : {}),
                  memberCounts: {
                    currentCount: currentState.members.length,
                  },
                  previewMembers: currentState.members.slice(0, 3).map((member) => ({
                    artifactSnapshotFileId: member.id,
                    filePath: member.filePath,
                    ...(member.gitBlobHash ? { gitBlobHash: member.gitBlobHash } : {}),
                    ...(member.gitCommitHash ? { gitCommitHash: member.gitCommitHash } : {}),
                  })),
                },
                ...(latestHead
                  ? {
                      latestLineageHead: {
                        projectArtifactSnapshotId: latestHead.id,
                        createdAt: latestHead.createdAt.toISOString(),
                      },
                    }
                  : {}),
                target: {
                  page: "artifact-slot-detail" as const,
                  slotDefinitionId,
                },
              };
            }),
          { concurrency: 4 },
        );

        return {
          workUnit: toWorkUnitIdentity(workUnit, input.projectWorkUnitId),
          slots,
        };
      });

    const getArtifactSlotDetail = (
      input: GetArtifactSlotDetailInput,
    ): Effect.Effect<GetArtifactSlotDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, currentState, lineage] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          artifactRepository.getCurrentSnapshotBySlot({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
          artifactRepository.listLineageHistory({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
        ]);

        return {
          workUnit: toWorkUnitIdentity(workUnit, input.projectWorkUnitId),
          slotDefinition: {
            slotDefinitionId: input.slotDefinitionId,
            slotKey: input.slotDefinitionId,
            slotName: input.slotDefinitionId,
            artifactKind:
              currentState.members.length > 1 ? ("file_set" as const) : ("single_file" as const),
          },
          currentEffectiveSnapshot: {
            exists: currentState.exists,
            ...(currentState.snapshot
              ? { projectArtifactSnapshotId: currentState.snapshot.id }
              : {}),
            ...(currentState.snapshot
              ? { createdAt: currentState.snapshot.createdAt.toISOString() }
              : {}),
            ...(currentState.snapshot
              ? {
                  recordedBy: {
                    ...(currentState.snapshot.recordedByTransitionExecutionId
                      ? {
                          transitionExecutionId:
                            currentState.snapshot.recordedByTransitionExecutionId,
                        }
                      : {}),
                    ...(currentState.snapshot.recordedByWorkflowExecutionId
                      ? { workflowExecutionId: currentState.snapshot.recordedByWorkflowExecutionId }
                      : {}),
                    ...(currentState.snapshot.recordedByUserId
                      ? { userId: currentState.snapshot.recordedByUserId }
                      : {}),
                  },
                }
              : {}),
            memberCounts: {
              currentCount: currentState.members.length,
            },
            members: currentState.members.map((member) => ({
              artifactSnapshotFileId: member.id,
              filePath: member.filePath,
              ...(member.gitBlobHash ? { gitBlobHash: member.gitBlobHash } : {}),
              ...(member.gitCommitHash ? { gitCommitHash: member.gitCommitHash } : {}),
            })),
          },
          lineage: lineage.map((entry) => ({
            projectArtifactSnapshotId: entry.snapshot.id,
            ...(entry.snapshot.supersededByProjectArtifactSnapshotId
              ? {
                  supersedesProjectArtifactSnapshotId:
                    entry.snapshot.supersededByProjectArtifactSnapshotId,
                }
              : {}),
            createdAt: entry.snapshot.createdAt.toISOString(),
            recordedBy: {
              ...(entry.snapshot.recordedByTransitionExecutionId
                ? { transitionExecutionId: entry.snapshot.recordedByTransitionExecutionId }
                : {}),
              ...(entry.snapshot.recordedByWorkflowExecutionId
                ? { workflowExecutionId: entry.snapshot.recordedByWorkflowExecutionId }
                : {}),
              ...(entry.snapshot.recordedByUserId
                ? { userId: entry.snapshot.recordedByUserId }
                : {}),
            },
            memberCounts: {
              deltaRowCount: entry.deltaMembers.length,
              effectiveCount: entry.effectiveMembers.length,
            },
            actions: {
              inspectSnapshot: {
                kind: "open_artifact_snapshot_dialog" as const,
                projectArtifactSnapshotId: entry.snapshot.id,
              },
            },
          })),
        };
      });

    const getArtifactSnapshotDialog = (
      input: GetArtifactSnapshotDialogInput,
    ): Effect.Effect<GetArtifactSnapshotDialogOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, lineage] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          artifactRepository.listLineageHistory({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
        ]);

        const selected = lineage.find(
          (entry) => entry.snapshot.id === input.projectArtifactSnapshotId,
        ) ?? {
          snapshot: {
            id: input.projectArtifactSnapshotId,
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
            recordedByTransitionExecutionId: null,
            recordedByWorkflowExecutionId: null,
            recordedByUserId: null,
            supersededByProjectArtifactSnapshotId: null,
            createdAt: new Date(0),
          },
          deltaMembers: [],
          effectiveMembers: [],
        };

        return {
          workUnit: {
            projectWorkUnitId: input.projectWorkUnitId,
            workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
            workUnitTypeKey: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
            workUnitTypeName: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          },
          slotDefinition: {
            slotDefinitionId: input.slotDefinitionId,
            slotKey: input.slotDefinitionId,
            slotName: input.slotDefinitionId,
            artifactKind:
              selected.effectiveMembers.length > 1
                ? ("file_set" as const)
                : ("single_file" as const),
          },
          snapshot: {
            projectArtifactSnapshotId: selected.snapshot.id,
            ...(selected.snapshot.supersededByProjectArtifactSnapshotId
              ? {
                  supersedesProjectArtifactSnapshotId:
                    selected.snapshot.supersededByProjectArtifactSnapshotId,
                }
              : {}),
            createdAt: selected.snapshot.createdAt.toISOString(),
            recordedBy: {
              ...(selected.snapshot.recordedByTransitionExecutionId
                ? { transitionExecutionId: selected.snapshot.recordedByTransitionExecutionId }
                : {}),
              ...(selected.snapshot.recordedByWorkflowExecutionId
                ? { workflowExecutionId: selected.snapshot.recordedByWorkflowExecutionId }
                : {}),
              ...(selected.snapshot.recordedByUserId
                ? { userId: selected.snapshot.recordedByUserId }
                : {}),
            },
            deltaMembers: selected.deltaMembers.map((member) => ({
              artifactSnapshotFileId: member.id,
              filePath: member.filePath,
              memberStatus: member.memberStatus,
              ...(member.gitBlobHash ? { gitBlobHash: member.gitBlobHash } : {}),
              ...(member.gitCommitHash ? { gitCommitHash: member.gitCommitHash } : {}),
            })),
            effectiveMemberCounts: {
              currentCount: selected.effectiveMembers.length,
            },
          },
        };
      });

    const checkArtifactSlotCurrentState = (
      input: CheckArtifactSlotCurrentStateInput,
    ): Effect.Effect<CheckArtifactSlotCurrentStateOutput, RepositoryError> =>
      artifactRepository
        .checkFreshness({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          slotDefinitionId: input.slotDefinitionId,
        })
        .pipe(
          Effect.map((freshness) => ({
            result:
              freshness.freshness === "unavailable"
                ? ("unavailable" as const)
                : freshness.freshness === "stale"
                  ? ("changed" as const)
                  : ("unchanged" as const),
            currentEffectiveSnapshotExists: freshness.exists,
          })),
        );

    return RuntimeArtifactService.of({
      getArtifactSlots,
      getArtifactSlotDetail,
      getArtifactSnapshotDialog,
      checkArtifactSlotCurrentState,
    });
  }),
);
