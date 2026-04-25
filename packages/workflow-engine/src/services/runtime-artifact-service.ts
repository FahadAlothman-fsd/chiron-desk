import { execFile } from "node:child_process";
import { promisify } from "node:util";

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
import { MethodologyVersionBoundaryService } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { SandboxGitService } from "@chiron/sandbox-engine";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";

const execFileAsync = promisify(execFile);

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

type RuntimeArtifactIdentityContext = {
  readonly workUnitTypeKey: string;
  readonly workUnitTypeName: string;
  readonly currentStateKey: string;
  readonly currentStateLabel: string;
};

type RuntimeArtifactSlotDefinition = GetArtifactSlotsOutput["slots"][number]["slotDefinition"];

const toArtifactKind = (cardinality?: string): "single_file" | "file_set" =>
  cardinality === "fileset" ? "file_set" : "single_file";

const toFallbackSlotDefinition = (slotDefinitionId: string): RuntimeArtifactSlotDefinition => ({
  slotDefinitionId,
  slotKey: slotDefinitionId,
  slotName: slotDefinitionId,
  artifactKind: "single_file",
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
    const projectContextRepository = yield* ProjectContextRepository;
    const methodologyVersionService = yield* MethodologyVersionBoundaryService;
    const sandboxGitService = yield* SandboxGitService;

    const loadProjectRootPath = (
      projectId: string,
    ): Effect.Effect<string | null, RepositoryError> =>
      Effect.gen(function* () {
        const project = yield* projectContextRepository.getProjectById({ projectId });
        return project?.projectRootPath ?? null;
      });

    const resolveGitCommitDate = (params: {
      readonly rootPath: string | null;
      readonly gitCommitHash: string | null | undefined;
    }): Effect.Effect<string | null, never> =>
      !params.rootPath || !params.gitCommitHash
        ? Effect.succeed(null)
        : Effect.tryPromise({
            try: async () => {
              const { stdout } = await execFileAsync(
                "git",
                ["show", "-s", "--format=%cI", params.gitCommitHash],
                { cwd: params.rootPath },
              );
              const normalized = stdout.trim();
              return normalized.length > 0 ? normalized : null;
            },
            catch: () => null,
          });

    const resolveLatestCurrentFileState = (params: {
      readonly rootPath: string | null;
      readonly filePath: string;
    }): Effect.Effect<
      | NonNullable<
          NonNullable<
            GetArtifactSlotDetailOutput["currentArtifactInstance"]["files"][number]["latestCurrent"]
          >
        >
      | undefined,
      never
    > =>
      !params.rootPath
        ? Effect.succeed(undefined)
        : sandboxGitService
            .resolveArtifactReference({
              rootPath: params.rootPath,
              filePath: params.filePath,
            })
            .pipe(
              Effect.flatMap((resolution) =>
                Effect.gen(function* () {
                  if (resolution.status === "committed") {
                    const gitCommitDate = yield* resolveGitCommitDate({
                      rootPath: params.rootPath,
                      gitCommitHash: resolution.gitCommitHash,
                    });

                    return {
                      status: "committed" as const,
                      relativePath: resolution.relativePath,
                      gitCommitHash: resolution.gitCommitHash,
                      gitCommitTitle: resolution.gitCommitSubject,
                      gitCommitDate,
                    };
                  }

                  if (resolution.status === "not_committed") {
                    return {
                      status: "not_committed" as const,
                      relativePath: resolution.relativePath,
                      tracked: resolution.tracked,
                      untracked: resolution.untracked,
                      staged: resolution.staged,
                      modified: resolution.modified,
                      deleted: resolution.deleted,
                    };
                  }

                  if (resolution.status === "missing") {
                    return {
                      status: "missing" as const,
                      relativePath: resolution.relativePath,
                    };
                  }

                  return {
                    status: resolution.status,
                    relativePath: resolution.relativePath,
                    message: resolution.message,
                  } as const;
                }),
              ),
              Effect.catchAll(() => Effect.succeed(undefined)),
            );

    const toArtifactInstanceFile = (params: {
      readonly rootPath: string | null;
      readonly member: {
        readonly filePath: string;
        readonly gitCommitHash: string | null;
        readonly gitCommitTitle: string | null;
      };
    }): Effect.Effect<
      GetArtifactSlotDetailOutput["currentArtifactInstance"]["files"][number],
      never
    > =>
      Effect.gen(function* () {
        const gitCommitDate = yield* resolveGitCommitDate({
          rootPath: params.rootPath,
          gitCommitHash: params.member.gitCommitHash,
        });
        const latestCurrent = yield* resolveLatestCurrentFileState({
          rootPath: params.rootPath,
          filePath: params.member.filePath,
        });

        return {
          filePath: params.member.filePath,
          gitCommitHash: params.member.gitCommitHash,
          gitCommitTitle: params.member.gitCommitTitle,
          ...(gitCommitDate ? { gitCommitDate } : {}),
          ...(latestCurrent ? { latestCurrent } : {}),
        };
      });

    const loadIdentityContext = (params: {
      readonly projectId: string;
      readonly projectWorkUnitId: string;
      readonly workUnit: {
        readonly id: string;
        readonly workUnitTypeId: string;
        readonly currentStateId: string | null;
      } | null;
    }): Effect.Effect<RuntimeArtifactIdentityContext, RepositoryError> =>
      Effect.gen(function* () {
        const fallback = toWorkUnitIdentity(params.workUnit, params.projectWorkUnitId);
        const pin = yield* projectContextRepository.findProjectPin(params.projectId);
        if (!pin || !params.workUnit) {
          return {
            workUnitTypeKey: fallback.workUnitTypeKey,
            workUnitTypeName: fallback.workUnitTypeName,
            currentStateKey: fallback.currentStateKey,
            currentStateLabel: fallback.currentStateLabel,
          };
        }

        const workspaceSnapshot = yield* methodologyVersionService.getVersionWorkspaceSnapshot(
          pin.methodologyVersionId,
        );
        const workUnitType =
          workspaceSnapshot.workUnitTypes.find(
            (candidate) => candidate.id === params.workUnit?.workUnitTypeId,
          ) ?? null;
        const currentState =
          workUnitType?.lifecycleStates.find(
            (state) => state.key === (params.workUnit?.currentStateId ?? undefined),
          ) ?? null;

        return {
          workUnitTypeKey: workUnitType?.key ?? fallback.workUnitTypeKey,
          workUnitTypeName:
            workUnitType?.displayName ?? workUnitType?.key ?? fallback.workUnitTypeName,
          currentStateKey: params.workUnit.currentStateId ?? fallback.currentStateKey,
          currentStateLabel:
            currentState?.displayName ??
            currentState?.key ??
            params.workUnit.currentStateId ??
            fallback.currentStateLabel,
        };
      });

    const loadSlotDefinitions = (params: {
      readonly projectId: string;
      readonly workUnit: {
        readonly workUnitTypeId: string;
      } | null;
      readonly slotDefinitionIds?: readonly string[];
    }): Effect.Effect<readonly RuntimeArtifactSlotDefinition[], RepositoryError> =>
      Effect.gen(function* () {
        if (!params.workUnit) {
          return (params.slotDefinitionIds ?? []).map((slotDefinitionId) =>
            toFallbackSlotDefinition(slotDefinitionId),
          );
        }

        const pin = yield* projectContextRepository.findProjectPin(params.projectId);
        if (!pin) {
          return (params.slotDefinitionIds ?? []).map((slotDefinitionId) =>
            toFallbackSlotDefinition(slotDefinitionId),
          );
        }

        const workspaceSnapshot = yield* methodologyVersionService.getVersionWorkspaceSnapshot(
          pin.methodologyVersionId,
        );
        const workUnitType = workspaceSnapshot.workUnitTypes.find(
          (candidate) => candidate.id === params.workUnit?.workUnitTypeId,
        );
        if (!workUnitType) {
          return (params.slotDefinitionIds ?? []).map((slotDefinitionId) =>
            toFallbackSlotDefinition(slotDefinitionId),
          );
        }

        const definitions = yield* methodologyVersionService.getWorkUnitArtifactSlots({
          versionId: pin.methodologyVersionId,
          workUnitTypeKey: workUnitType.key,
        });

        const allowedIds = params.slotDefinitionIds ? new Set(params.slotDefinitionIds) : null;
        const filtered = allowedIds
          ? definitions.filter((definition) => allowedIds.has(definition.id))
          : definitions;

        return filtered.map((definition) => ({
          slotDefinitionId: definition.id,
          slotKey: definition.key,
          ...(definition.displayName ? { slotName: definition.displayName } : {}),
          artifactKind: toArtifactKind(definition.cardinality),
          ...(definition.description ? { description: definition.description } : {}),
          ...(definition.guidance ? { guidance: definition.guidance } : {}),
          ...(definition.rules ? { rules: definition.rules } : {}),
        }));
      });

    const getArtifactSlots = (
      input: GetArtifactSlotsInput,
      options?: RuntimeArtifactSlotsOptions,
    ): Effect.Effect<GetArtifactSlotsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const workUnit = yield* projectWorkUnitRepository.getProjectWorkUnitById(
          input.projectWorkUnitId,
        );
        const [identity, slotDefinitions] = yield* Effect.all([
          loadIdentityContext({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            workUnit,
          }),
          loadSlotDefinitions({
            projectId: input.projectId,
            workUnit,
            slotDefinitionIds: options?.slotDefinitionIds,
          }),
        ]);

        const slots = yield* Effect.forEach(
          slotDefinitions,
          (slotDefinition) =>
            Effect.gen(function* () {
              const currentState = yield* artifactRepository.getCurrentSnapshotBySlot({
                projectWorkUnitId: input.projectWorkUnitId,
                slotDefinitionId: slotDefinition.slotDefinitionId,
              });

              return {
                slotDefinition,
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
                  slotDefinitionId: slotDefinition.slotDefinitionId,
                },
              };
            }),
          { concurrency: 4 },
        );

        return {
          workUnit: {
            ...toWorkUnitIdentity(workUnit, input.projectWorkUnitId),
            workUnitTypeKey: identity.workUnitTypeKey,
            workUnitTypeName: identity.workUnitTypeName,
            currentStateKey: identity.currentStateKey,
            currentStateLabel: identity.currentStateLabel,
          },
          slots,
        };
      });

    const getArtifactSlotDetail = (
      input: GetArtifactSlotDetailInput,
    ): Effect.Effect<GetArtifactSlotDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, identity, slotDefinitions, currentState, projectRootPath] =
          yield* Effect.all([
            projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
            Effect.flatMap(
              projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
              (resolvedWorkUnit) =>
                loadIdentityContext({
                  projectId: input.projectId,
                  projectWorkUnitId: input.projectWorkUnitId,
                  workUnit: resolvedWorkUnit,
                }),
            ),
            Effect.flatMap(
              projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
              (resolvedWorkUnit) =>
                loadSlotDefinitions({
                  projectId: input.projectId,
                  workUnit: resolvedWorkUnit,
                  slotDefinitionIds: [input.slotDefinitionId],
                }),
            ),
            artifactRepository.getCurrentSnapshotBySlot({
              projectWorkUnitId: input.projectWorkUnitId,
              slotDefinitionId: input.slotDefinitionId,
            }),
            loadProjectRootPath(input.projectId),
          ]);
        const slotDefinition =
          slotDefinitions[0] ?? toFallbackSlotDefinition(input.slotDefinitionId);
        const files = yield* Effect.forEach(
          currentState.members,
          (member) =>
            toArtifactInstanceFile({
              rootPath: projectRootPath,
              member: {
                filePath: member.filePath,
                gitCommitHash: member.gitCommitHash ?? null,
                gitCommitTitle: member.gitCommitTitle ?? null,
              },
            }),
          { concurrency: 4 },
        );

        return {
          workUnit: {
            ...toWorkUnitIdentity(workUnit, input.projectWorkUnitId),
            workUnitTypeKey: identity.workUnitTypeKey,
            workUnitTypeName: identity.workUnitTypeName,
            currentStateKey: identity.currentStateKey,
            currentStateLabel: identity.currentStateLabel,
          },
          slotDefinition,
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
            files,
          },
        };
      });

    const getArtifactInstanceDialog = (
      input: GetArtifactInstanceDialogInput,
    ): Effect.Effect<GetArtifactInstanceDialogOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, identity, slotDefinitions, currentState] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          Effect.flatMap(
            projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
            (resolvedWorkUnit) =>
              loadIdentityContext({
                projectId: input.projectId,
                projectWorkUnitId: input.projectWorkUnitId,
                workUnit: resolvedWorkUnit,
              }),
          ),
          Effect.flatMap(
            projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
            (resolvedWorkUnit) =>
              loadSlotDefinitions({
                projectId: input.projectId,
                workUnit: resolvedWorkUnit,
                slotDefinitionIds: [input.slotDefinitionId],
              }),
          ),
          artifactRepository.getCurrentSnapshotBySlot({
            projectWorkUnitId: input.projectWorkUnitId,
            slotDefinitionId: input.slotDefinitionId,
          }),
        ]);
        const selected = currentState.snapshot;
        const slotDefinition =
          slotDefinitions[0] ?? toFallbackSlotDefinition(input.slotDefinitionId);

        return {
          workUnit: {
            projectWorkUnitId: input.projectWorkUnitId,
            workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
            workUnitTypeKey: identity.workUnitTypeKey,
            workUnitTypeName: identity.workUnitTypeName,
          },
          slotDefinition,
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
