import type {
  CheckArtifactSlotCurrentStateInput,
  CheckArtifactSlotCurrentStateOutput,
  GetArtifactInstanceDialogInput,
  GetArtifactInstanceDialogOutput,
  GetArtifactSlotDetailInput,
  GetArtifactSlotDetailOutput,
  GetArtifactSlotsInput,
  GetArtifactSlotsOutput,
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
    readonly getArtifactInstanceDialog: (
      input: GetArtifactInstanceDialogInput,
    ) => Effect.Effect<GetArtifactInstanceDialogOutput, RepositoryError>;
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
                currentArtifactInstance: {
                  exists: currentState.exists,
                  ...(currentState.snapshot
                    ? { artifactInstanceId: currentState.snapshot.id }
                    : {}),
                  ...(currentState.snapshot
                    ? { updatedAt: currentState.snapshot.createdAt.toISOString() }
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
                            ? {
                                workflowExecutionId:
                                  currentState.snapshot.recordedByWorkflowExecutionId,
                              }
                            : {}),
                          ...(currentState.snapshot.recordedByUserId
                            ? { userId: currentState.snapshot.recordedByUserId }
                            : {}),
                        },
                      }
                    : {}),
                  fileCount: currentState.members.length,
                  previewFiles: currentState.members.slice(0, 3).map((member) => ({
                    filePath: member.filePath,
                    gitCommitHash: member.gitCommitHash ?? null,
                    gitCommitTitle: member.gitCommitTitle ?? null,
                  })),
                },
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
        const [workUnit, currentState] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          artifactRepository.getCurrentSnapshotBySlot({
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
          currentArtifactInstance: {
            exists: currentState.exists,
            ...(currentState.snapshot ? { artifactInstanceId: currentState.snapshot.id } : {}),
            ...(currentState.snapshot
              ? { updatedAt: currentState.snapshot.createdAt.toISOString() }
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
            fileCount: currentState.members.length,
            files: currentState.members.map((member) => ({
              filePath: member.filePath,
              gitCommitHash: member.gitCommitHash ?? null,
              gitCommitTitle: member.gitCommitTitle ?? null,
            })),
          },
        };
      });

    const getArtifactInstanceDialog = (
      input: GetArtifactInstanceDialogInput,
    ): Effect.Effect<GetArtifactInstanceDialogOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, currentState] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          artifactRepository.getCurrentSnapshotBySlot({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
        ]);
        const selected = currentState.snapshot;

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
              currentState.members.length > 1 ? ("file_set" as const) : ("single_file" as const),
          },
          artifactInstance: {
            exists: currentState.exists,
            ...(selected
              ? { artifactInstanceId: selected.id }
              : { artifactInstanceId: input.artifactInstanceId }),
            ...(selected ? { updatedAt: selected.createdAt.toISOString() } : {}),
            ...(selected
              ? {
                  recordedBy: {
                    ...(selected.recordedByTransitionExecutionId
                      ? { transitionExecutionId: selected.recordedByTransitionExecutionId }
                      : {}),
                    ...(selected.recordedByWorkflowExecutionId
                      ? { workflowExecutionId: selected.recordedByWorkflowExecutionId }
                      : {}),
                    ...(selected.recordedByUserId ? { userId: selected.recordedByUserId } : {}),
                  },
                }
              : {}),
            fileCount: currentState.members.length,
            files: currentState.members.map((member) => ({
              filePath: member.filePath,
              gitCommitHash: member.gitCommitHash ?? null,
              gitCommitTitle: member.gitCommitTitle ?? null,
            })),
          },
        };
      });

    const checkArtifactSlotCurrentState = (
      input: CheckArtifactSlotCurrentStateInput,
    ): Effect.Effect<CheckArtifactSlotCurrentStateOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [freshness, currentState] = yield* Effect.all([
          artifactRepository.checkFreshness({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
          artifactRepository.getCurrentSnapshotBySlot({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
        ]);

        return {
          result:
            freshness.freshness === "unavailable"
              ? ("unavailable" as const)
              : freshness.freshness === "stale"
                ? ("changed" as const)
                : ("unchanged" as const),
          ...(currentState.snapshot ? { artifactInstanceId: currentState.snapshot.id } : {}),
          currentArtifactInstanceExists: freshness.exists,
        } satisfies CheckArtifactSlotCurrentStateOutput;
      });

    return RuntimeArtifactService.of({
      getArtifactSlots,
      getArtifactSlotDetail,
      getArtifactInstanceDialog,
      checkArtifactSlotCurrentState,
    });
  }),
);
