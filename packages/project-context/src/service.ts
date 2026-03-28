import {
  MethodologyRepository,
  type RepositoryError as MethodologyRepositoryError,
} from "@chiron/methodology-engine";
import type {
  GetProjectPinLineageInput,
  PinProjectMethodologyVersionInput,
  ProjectMethodologyPinEvent,
  RepinProjectMethodologyVersionInput,
  ValidationDiagnostic,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Context, Effect, Layer } from "effect";
import {
  ProjectContextRepository,
  type ProjectMethodologyPinEventRow,
  type ProjectMethodologyPinRow,
  type ProjectRow,
} from "./repository";
import type { RepositoryError as ProjectContextRepositoryError } from "./errors";

type RepositoryError = MethodologyRepositoryError | ProjectContextRepositoryError;

export interface ProjectMethodologyPinState {
  projectId: string;
  methodologyVersionId: string;
  methodologyId: string;
  methodologyKey: string;
  publishedVersion: string;
  actorId: string | null;
  timestamp: string;
}

export interface PinProjectMethodologyVersionResult {
  pinned: boolean;
  diagnostics: ValidationResult;
  pin?: ProjectMethodologyPinState;
}

export interface RepinProjectMethodologyVersionResult {
  repinned: boolean;
  diagnostics: ValidationResult;
  pin?: ProjectMethodologyPinState;
}

export interface ProjectSummary {
  id: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
}

const PROJECT_NAME_ADJECTIVES = [
  "Aurora",
  "Atlas",
  "Beacon",
  "Comet",
  "Harbor",
  "Nimbus",
  "Orchid",
  "Summit",
] as const;

const PROJECT_NAME_NOUNS = [
  "Bridge",
  "Compass",
  "Engine",
  "Forge",
  "Journey",
  "Ledger",
  "Studio",
  "Workspace",
] as const;

export class ProjectContextService extends Context.Tag("ProjectContextService")<
  ProjectContextService,
  {
    readonly pinProjectMethodologyVersion: (
      input: PinProjectMethodologyVersionInput,
      actorId: string | null,
    ) => Effect.Effect<PinProjectMethodologyVersionResult, RepositoryError>;
    readonly repinProjectMethodologyVersion: (
      input: RepinProjectMethodologyVersionInput,
      actorId: string | null,
    ) => Effect.Effect<RepinProjectMethodologyVersionResult, RepositoryError>;
    readonly getProjectPinLineage: (
      input: GetProjectPinLineageInput,
    ) => Effect.Effect<readonly ProjectMethodologyPinEvent[], RepositoryError>;
    readonly getProjectMethodologyPin: (
      projectId: string,
    ) => Effect.Effect<ProjectMethodologyPinState | null, RepositoryError>;
    readonly createProject: (
      projectId: string,
      name?: string,
    ) => Effect.Effect<ProjectSummary, RepositoryError>;
    readonly listProjects: () => Effect.Effect<readonly ProjectSummary[], RepositoryError>;
    readonly getProjectById: (
      projectId: string,
    ) => Effect.Effect<ProjectSummary | null, RepositoryError>;
  }
>() {}

export const ProjectContextServiceLive = Layer.effect(
  ProjectContextService,
  Effect.gen(function* () {
    const methodologyRepo = yield* MethodologyRepository;
    const projectRepo = yield* ProjectContextRepository;

    const pinProjectMethodologyVersion = (
      input: PinProjectMethodologyVersionInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const timestamp = new Date().toISOString();
        const definitions = yield* methodologyRepo.listDefinitions();
        const definition =
          definitions.find((candidate) => candidate.id === input.methodologyId) ?? null;
        if (!definition) {
          return {
            pinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                  "project.pin.target",
                  timestamp,
                  "existing published methodology version",
                  `${input.methodologyId}@${input.versionId}`,
                  "Select an existing published version and retry",
                ),
              ],
            },
          };
        }

        const target = yield* methodologyRepo.findVersionById(input.versionId);

        if (!target || target.methodologyId !== input.methodologyId) {
          return {
            pinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                  "project.pin.target",
                  timestamp,
                  "existing published methodology version",
                  `${input.methodologyId}@${input.versionId}`,
                  "Select an existing published version and retry",
                ),
              ],
            },
          };
        }

        if (target.status !== "active") {
          return {
            pinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
                  "project.pin.target",
                  timestamp,
                  "active published methodology version",
                  `${definition.key}@${target.version} status=${target.status}`,
                  "Select a compatible published version for the methodology",
                ),
              ],
            },
          };
        }

        const currentPin = yield* projectRepo.findProjectPin(input.projectId);
        const pinWrite = yield* projectRepo
          .pinProjectMethodologyVersion({
            projectId: input.projectId,
            methodologyVersionId: target.id,
            actorId,
            previousVersion: currentPin?.publishedVersion ?? null,
            newVersion: target.version,
          })
          .pipe(
            Effect.catchAll((error) => {
              if (error.code === "PROJECT_PIN_ATOMICITY_GUARD_ABORTED") {
                return Effect.succeed({
                  pin: null,
                  diagnostics: {
                    valid: false,
                    diagnostics: [
                      makeProjectPinDiagnostic(
                        "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
                        "project.pin.persistence",
                        timestamp,
                        "pin pointer and lineage event committed atomically",
                        "transaction aborted due to persistence guard",
                        "Investigate persistence failure and retry once resolved",
                      ),
                    ],
                  },
                } as const);
              }
              return Effect.fail(error);
            }),
          );

        if ("diagnostics" in pinWrite) {
          return {
            pinned: false,
            diagnostics: pinWrite.diagnostics,
          };
        }

        return {
          pinned: true,
          diagnostics: { valid: true, diagnostics: [] },
          pin: toProjectPinState(pinWrite.pin),
        };
      });

    const repinProjectMethodologyVersion = (
      input: RepinProjectMethodologyVersionInput,
      actorId: string | null,
    ) =>
      Effect.gen(function* () {
        const timestamp = new Date().toISOString();
        const definitions = yield* methodologyRepo.listDefinitions();
        const definition =
          definitions.find((candidate) => candidate.id === input.methodologyId) ?? null;
        if (!definition) {
          return {
            repinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                  "project.pin.target",
                  timestamp,
                  "existing published methodology version",
                  `${input.methodologyId}@${input.versionId}`,
                  "Select an existing published version and retry",
                ),
              ],
            },
          };
        }

        const target = yield* methodologyRepo.findVersionById(input.versionId);

        if (!target || target.methodologyId !== input.methodologyId) {
          return {
            repinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_NOT_FOUND",
                  "project.pin.target",
                  timestamp,
                  "existing published methodology version",
                  `${input.methodologyId}@${input.versionId}`,
                  "Select an existing published version and retry",
                ),
              ],
            },
          };
        }

        if (target.status !== "active") {
          return {
            repinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE",
                  "project.pin.target",
                  timestamp,
                  "active published methodology version",
                  `${definition.key}@${target.version} status=${target.status}`,
                  "Select a compatible published version for the methodology",
                ),
              ],
            },
          };
        }

        const hasExecutions = yield* projectRepo.hasExecutionHistoryForRepin(input.projectId);
        if (hasExecutions) {
          return {
            repinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
                  "project.repin.policy",
                  timestamp,
                  "project without persisted executions",
                  "persisted executions detected",
                  "Use migration workflow when available in later epic scope",
                ),
              ],
            },
          };
        }

        const currentPin = yield* projectRepo.findProjectPin(input.projectId);
        if (!currentPin) {
          return {
            repinned: false,
            diagnostics: {
              valid: false,
              diagnostics: [
                makeProjectPinDiagnostic(
                  "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
                  "project.repin.policy",
                  timestamp,
                  "project with an existing pinned methodology version",
                  "no current project methodology pin found",
                  "Pin the project to a published version before attempting repin",
                ),
              ],
            },
          };
        }
        const repinWrite = yield* projectRepo
          .repinProjectMethodologyVersion({
            projectId: input.projectId,
            methodologyVersionId: target.id,
            actorId,
            previousVersion: currentPin.publishedVersion,
            newVersion: target.version,
          })
          .pipe(
            Effect.catchAll((error) => {
              if (error.code === "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY") {
                return Effect.succeed({
                  pin: null,
                  diagnostics: {
                    valid: false,
                    diagnostics: [
                      makeProjectPinDiagnostic(
                        "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY",
                        "project.repin.policy",
                        timestamp,
                        "project without persisted executions for repin",
                        "found persisted executions for project methodology pin",
                        "Use migration workflow when available in later epic scope",
                      ),
                    ],
                  },
                } as const);
              }
              if (error.code === "PROJECT_REPIN_REQUIRES_EXISTING_PIN") {
                return Effect.succeed({
                  pin: null,
                  diagnostics: {
                    valid: false,
                    diagnostics: [
                      makeProjectPinDiagnostic(
                        "PROJECT_REPIN_REQUIRES_EXISTING_PIN",
                        "project.repin.policy",
                        timestamp,
                        "project with an existing pinned methodology version",
                        "no current project methodology pin found",
                        "Pin the project to a published version before attempting repin",
                      ),
                    ],
                  },
                } as const);
              }
              if (error.code === "PROJECT_PIN_ATOMICITY_GUARD_ABORTED") {
                return Effect.succeed({
                  pin: null,
                  diagnostics: {
                    valid: false,
                    diagnostics: [
                      makeProjectPinDiagnostic(
                        "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
                        "project.pin.persistence",
                        timestamp,
                        "pin pointer and lineage event committed atomically",
                        "transaction aborted due to persistence guard",
                        "Investigate persistence failure and retry once resolved",
                      ),
                    ],
                  },
                } as const);
              }
              return Effect.fail(error);
            }),
          );

        if ("diagnostics" in repinWrite) {
          return {
            repinned: false,
            diagnostics: repinWrite.diagnostics,
          };
        }

        return {
          repinned: true,
          diagnostics: { valid: true, diagnostics: [] },
          pin: toProjectPinState(repinWrite.pin),
        };
      });

    const getProjectPinLineage = (
      input: GetProjectPinLineageInput,
    ): Effect.Effect<readonly ProjectMethodologyPinEvent[], RepositoryError> =>
      projectRepo
        .getProjectPinLineage({ projectId: input.projectId })
        .pipe(Effect.map((events) => events.map((event) => toProjectPinEvent(event))));

    const getProjectMethodologyPin = (
      projectId: string,
    ): Effect.Effect<ProjectMethodologyPinState | null, RepositoryError> =>
      projectRepo
        .findProjectPin(projectId)
        .pipe(Effect.map((pin) => (pin ? toProjectPinState(pin) : null)));

    const createProject = (
      projectId: string,
      name?: string,
    ): Effect.Effect<ProjectSummary, RepositoryError> =>
      projectRepo
        .createProject({ projectId, ...(name !== undefined ? { name } : {}) })
        .pipe(Effect.map((project) => toProjectSummary(project)));

    const listProjects = (): Effect.Effect<readonly ProjectSummary[], RepositoryError> =>
      projectRepo
        .listProjects()
        .pipe(Effect.map((projects) => projects.map((project) => toProjectSummary(project))));

    const getProjectById = (
      projectId: string,
    ): Effect.Effect<ProjectSummary | null, RepositoryError> =>
      projectRepo
        .getProjectById({ projectId })
        .pipe(Effect.map((project) => (project ? toProjectSummary(project) : null)));

    return ProjectContextService.of({
      pinProjectMethodologyVersion,
      repinProjectMethodologyVersion,
      getProjectPinLineage,
      getProjectMethodologyPin,
      createProject,
      listProjects,
      getProjectById,
    });
  }),
);

const makeProjectPinDiagnostic = (
  code:
    | "PROJECT_PIN_TARGET_VERSION_NOT_FOUND"
    | "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"
    | "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY"
    | "PROJECT_REPIN_REQUIRES_EXISTING_PIN"
    | "PROJECT_PIN_ATOMICITY_GUARD_ABORTED",
  scope: "project.pin.target" | "project.repin.policy" | "project.pin.persistence",
  timestamp: string,
  required: string,
  observed: string,
  remediation: string,
): ValidationDiagnostic => ({
  code,
  scope,
  blocking: true,
  required,
  observed,
  remediation,
  timestamp,
  evidenceRef: null,
});

const toProjectPinState = (pin: ProjectMethodologyPinRow): ProjectMethodologyPinState => ({
  projectId: pin.projectId,
  methodologyVersionId: pin.methodologyVersionId,
  methodologyId: pin.methodologyId,
  methodologyKey: pin.methodologyKey,
  publishedVersion: pin.publishedVersion,
  actorId: pin.actorId,
  timestamp: pin.updatedAt.toISOString(),
});

const toProjectPinEvent = (event: ProjectMethodologyPinEventRow): ProjectMethodologyPinEvent => ({
  id: event.id,
  projectId: event.projectId,
  eventType: event.eventType,
  actorId: event.actorId,
  previousVersion: event.previousVersion,
  newVersion: event.newVersion,
  timestamp: event.createdAt.toISOString(),
  evidenceRef: event.evidenceRef,
});

const normalizeProjectDisplayName = (project: ProjectRow): string => {
  const candidate = project.name?.trim();
  if (candidate && candidate.length > 0) {
    return candidate;
  }
  const timestamp = project.createdAt.getTime();
  const adjective = PROJECT_NAME_ADJECTIVES[Math.abs(timestamp) % PROJECT_NAME_ADJECTIVES.length];
  const noun =
    PROJECT_NAME_NOUNS[Math.abs(Math.floor(timestamp / 1000)) % PROJECT_NAME_NOUNS.length];
  return `${adjective} ${noun}`;
};

const toProjectSummary = (project: ProjectRow): ProjectSummary => ({
  id: project.id,
  displayName: normalizeProjectDisplayName(project),
  createdAt: project.createdAt.toISOString(),
  updatedAt: project.updatedAt.toISOString(),
});
