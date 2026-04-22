import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { MethodologyRepository } from "@chiron/methodology-engine";
import { SandboxGitService, type SandboxGitFileResolution } from "@chiron/sandbox-engine";
import { Context, Effect, Layer } from "effect";
import * as Schema from "effect/Schema";
import path from "node:path";

import type { RepositoryError } from "../../errors";
import type { RuntimeWorkflowExecutionContextFactRow } from "../../repositories/step-execution-repository";

export const ARTIFACT_SNAPSHOT_FILE_STATUSES = ["present", "deleted"] as const;
export type ArtifactSnapshotFileStatus = (typeof ARTIFACT_SNAPSHOT_FILE_STATUSES)[number];

export class ArtifactSlotReferencePayloadError extends Schema.TaggedError<ArtifactSlotReferencePayloadError>()(
  "ArtifactSlotReferencePayloadError",
  {
    slotDefinitionId: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export class ArtifactSlotReferencePathValidationError extends Schema.TaggedError<ArtifactSlotReferencePathValidationError>()(
  "ArtifactSlotReferencePathValidationError",
  {
    slotDefinitionId: Schema.NonEmptyString,
    filePath: Schema.String,
    message: Schema.String,
  },
) {}

export class ArtifactSlotReferenceFolderBindingError extends Schema.TaggedError<ArtifactSlotReferenceFolderBindingError>()(
  "ArtifactSlotReferenceFolderBindingError",
  {
    slotDefinitionId: Schema.NonEmptyString,
    contextFactDefinitionId: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export type ArtifactSlotReferenceServiceError =
  | ArtifactSlotReferencePayloadError
  | ArtifactSlotReferencePathValidationError
  | ArtifactSlotReferenceFolderBindingError
  | RepositoryError;

export interface ArtifactSlotReferenceFactFile {
  readonly filePath: string;
  readonly status: ArtifactSnapshotFileStatus;
  readonly gitCommitHash?: string | null;
  readonly gitBlobHash?: string | null;
  readonly gitCommitSubject?: string | null;
  readonly gitCommitBody?: string | null;
}

export interface ArtifactSlotReferenceFactValue {
  readonly slotDefinitionId: string;
  readonly files: readonly ArtifactSlotReferenceFactFile[];
}

type ArtifactSnapshotFileCommand = {
  readonly filePath: string;
  readonly operation: "record_present_file" | "record_deleted_file" | "remove_from_slot";
};

type NormalizedArtifactSlotRules = {
  readonly repoRelativePathRegex?: RegExp;
  readonly folderPathContextFactDefinitionId?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export class ArtifactSlotReferenceService extends Context.Tag(
  "@chiron/workflow-engine/services/runtime/ArtifactSlotReferenceService",
)<
  ArtifactSlotReferenceService,
  {
    readonly normalizeWriteValues: (params: {
      readonly methodologyVersionId: string;
      readonly workUnitTypeKey: string;
      readonly contextFactDefinitionId: string;
      readonly slotDefinitionId: string;
      readonly projectRootPath: string;
      readonly workflowContextFacts: readonly WorkflowContextFactDto[];
      readonly contextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
      readonly rawCurrentValues: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
    }) => Effect.Effect<
      readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: ArtifactSlotReferenceFactValue;
      }[],
      ArtifactSlotReferenceServiceError
    >;
  }
>() {}

export const ArtifactSlotReferenceServiceLive = Layer.effect(
  ArtifactSlotReferenceService,
  Effect.gen(function* () {
    const methodologyRepo = yield* MethodologyRepository;
    const sandboxGit = yield* SandboxGitService;

    const normalizeWriteValues: ArtifactSlotReferenceService["Type"]["normalizeWriteValues"] = (
      params,
    ) =>
      Effect.gen(function* () {
        const slotDefinitions = yield* methodologyRepo.findArtifactSlotsByWorkUnitType({
          versionId: params.methodologyVersionId,
          workUnitTypeKey: params.workUnitTypeKey,
        });
        const slotDefinition = slotDefinitions.find(
          (slot) => slot.id === params.slotDefinitionId || slot.key === params.slotDefinitionId,
        );
        if (!slotDefinition) {
          return yield* new ArtifactSlotReferencePayloadError({
            slotDefinitionId: params.slotDefinitionId,
            message: `Artifact slot '${params.slotDefinitionId}' was not found for work-unit type '${params.workUnitTypeKey}'.`,
          });
        }

        const rules = normalizeSlotRules(slotDefinition.rulesJson);
        const folderBasePath = yield* resolveFolderBasePath({
          slotDefinitionId: params.slotDefinitionId,
          workflowContextFacts: params.workflowContextFacts,
          contextFacts: params.contextFacts,
          projectRootPath: params.projectRootPath,
          ...(rules.folderPathContextFactDefinitionId
            ? { folderPathContextFactDefinitionId: rules.folderPathContextFactDefinitionId }
            : {}),
          sandboxGit,
        });

        const existingByOrder = new Map(
          params.contextFacts
            .filter((fact) => fact.contextFactDefinitionId === params.contextFactDefinitionId)
            .map((fact) => [fact.instanceOrder, fact.valueJson] as const),
        );

        return yield* Effect.forEach(params.rawCurrentValues, (value) =>
          Effect.gen(function* () {
            const existing = parseArtifactSlotReferenceFactValue(
              existingByOrder.get(value.instanceOrder),
              {
                fallbackSlotDefinitionId: params.slotDefinitionId,
              },
            );
            const commands = yield* parseArtifactSnapshotCommands(
              value.valueJson,
              params.slotDefinitionId,
            );
            const files = yield* resolveCommandsToFiles({
              slotDefinitionId: params.slotDefinitionId,
              projectRootPath: params.projectRootPath,
              folderBasePath,
              ...(rules.repoRelativePathRegex
                ? { repoRelativePathRegex: rules.repoRelativePathRegex }
                : {}),
              commands,
              existingFiles: existing?.files ?? [],
              sandboxGit,
            });

            return {
              contextFactDefinitionId: value.contextFactDefinitionId,
              instanceOrder: value.instanceOrder,
              valueJson: {
                slotDefinitionId: slotDefinition.id,
                files,
              } satisfies ArtifactSlotReferenceFactValue,
            };
          }),
        );
      });

    return ArtifactSlotReferenceService.of({ normalizeWriteValues });
  }),
);

export function parseArtifactSlotReferenceFactValue(
  valueJson: unknown,
  options: { readonly fallbackSlotDefinitionId?: string } = {},
): ArtifactSlotReferenceFactValue | null {
  if (!isRecord(valueJson)) {
    return null;
  }

  if (typeof valueJson.slotDefinitionId === "string" && Array.isArray(valueJson.files)) {
    const files = valueJson.files.flatMap((file) => {
      if (!isRecord(file) || typeof file.filePath !== "string") {
        return [];
      }

      const status = file.status === "deleted" ? "deleted" : "present";
      return [
        {
          filePath: file.filePath,
          status,
          ...(typeof file.gitCommitHash === "string" || file.gitCommitHash === null
            ? { gitCommitHash: file.gitCommitHash }
            : {}),
          ...(typeof file.gitBlobHash === "string" || file.gitBlobHash === null
            ? { gitBlobHash: file.gitBlobHash }
            : {}),
          ...(typeof file.gitCommitSubject === "string" || file.gitCommitSubject === null
            ? { gitCommitSubject: file.gitCommitSubject }
            : {}),
          ...(typeof file.gitCommitBody === "string" || file.gitCommitBody === null
            ? { gitCommitBody: file.gitCommitBody }
            : {}),
        } satisfies ArtifactSlotReferenceFactFile,
      ];
    });

    return {
      slotDefinitionId: valueJson.slotDefinitionId,
      files: sortArtifactFiles(files),
    };
  }

  if (options.fallbackSlotDefinitionId && typeof valueJson.relativePath === "string") {
    return {
      slotDefinitionId: options.fallbackSlotDefinitionId,
      files: [
        {
          filePath: valueJson.relativePath,
          status: valueJson.deleted === true ? "deleted" : "present",
          ...(typeof valueJson.gitCommitHash === "string" || valueJson.gitCommitHash === null
            ? { gitCommitHash: valueJson.gitCommitHash }
            : {}),
          ...(typeof valueJson.gitBlobHash === "string" || valueJson.gitBlobHash === null
            ? { gitBlobHash: valueJson.gitBlobHash }
            : {}),
          ...(typeof valueJson.gitCommitSubject === "string" || valueJson.gitCommitSubject === null
            ? { gitCommitSubject: valueJson.gitCommitSubject }
            : {}),
          ...(typeof valueJson.gitCommitBody === "string" || valueJson.gitCommitBody === null
            ? { gitCommitBody: valueJson.gitCommitBody }
            : {}),
        },
      ],
    };
  }

  return null;
}

function parseArtifactSnapshotCommands(
  valueJson: unknown,
  slotDefinitionId: string,
): Effect.Effect<readonly ArtifactSnapshotFileCommand[], ArtifactSlotReferencePayloadError> {
  if (Array.isArray(valueJson)) {
    return Effect.forEach(valueJson, (entry) =>
      parseArtifactSnapshotCommand(entry, slotDefinitionId),
    );
  }

  if (isRecord(valueJson) && Array.isArray(valueJson.files)) {
    if (
      typeof valueJson.slotDefinitionId === "string" &&
      valueJson.slotDefinitionId !== slotDefinitionId
    ) {
      return Effect.fail(
        new ArtifactSlotReferencePayloadError({
          slotDefinitionId,
          message: `Artifact snapshot payload must persist canonical slotDefinitionId '${slotDefinitionId}'.`,
        }),
      );
    }

    return Effect.forEach(valueJson.files, (entry) =>
      parseArtifactSnapshotCommand(entry, slotDefinitionId),
    );
  }

  return Effect.forEach([valueJson], (entry) =>
    parseArtifactSnapshotCommand(entry, slotDefinitionId),
  );
}

function parseArtifactSnapshotCommand(
  valueJson: unknown,
  slotDefinitionId: string,
): Effect.Effect<ArtifactSnapshotFileCommand, ArtifactSlotReferencePayloadError> {
  if (!isRecord(valueJson)) {
    return Effect.fail(
      new ArtifactSlotReferencePayloadError({
        slotDefinitionId,
        message:
          "Artifact snapshot writes must provide a file object, files array, or { slotDefinitionId, files } payload.",
      }),
    );
  }

  const rawPath =
    typeof valueJson.filePath === "string"
      ? valueJson.filePath
      : typeof valueJson.path === "string"
        ? valueJson.path
        : typeof valueJson.relativePath === "string"
          ? valueJson.relativePath
          : null;

  if (!rawPath || rawPath.trim().length === 0) {
    return Effect.fail(
      new ArtifactSlotReferencePayloadError({
        slotDefinitionId,
        message: "Artifact snapshot file entries require a non-empty path.",
      }),
    );
  }

  const operation =
    valueJson.operation === "record_deleted_file" || valueJson.operation === "remove_from_slot"
      ? valueJson.operation
      : valueJson.status === "deleted"
        ? "record_deleted_file"
        : "record_present_file";

  return Effect.succeed({ filePath: rawPath, operation });
}

function normalizeSlotRules(rulesJson: unknown): NormalizedArtifactSlotRules {
  if (!isRecord(rulesJson)) {
    return {};
  }

  const rawPattern =
    typeof rulesJson.repoRelativePathRegex === "string"
      ? rulesJson.repoRelativePathRegex
      : typeof rulesJson.pathRegex === "string"
        ? rulesJson.pathRegex
        : typeof rulesJson.pathPattern === "string"
          ? rulesJson.pathPattern
          : undefined;

  const folderPathContextFactDefinitionId =
    typeof rulesJson.folderPathContextFactDefinitionId === "string"
      ? rulesJson.folderPathContextFactDefinitionId
      : typeof rulesJson.folderContextFactDefinitionId === "string"
        ? rulesJson.folderContextFactDefinitionId
        : typeof rulesJson.basePathContextFactDefinitionId === "string"
          ? rulesJson.basePathContextFactDefinitionId
          : undefined;

  return {
    ...(rawPattern ? { repoRelativePathRegex: new RegExp(`^(?:${rawPattern})$`) } : {}),
    ...(folderPathContextFactDefinitionId ? { folderPathContextFactDefinitionId } : {}),
  };
}

function resolveFolderBasePath(params: {
  readonly slotDefinitionId: string;
  readonly workflowContextFacts: readonly WorkflowContextFactDto[];
  readonly contextFacts: readonly RuntimeWorkflowExecutionContextFactRow[];
  readonly projectRootPath: string;
  readonly folderPathContextFactDefinitionId?: string;
  readonly sandboxGit: SandboxGitService["Type"];
}): Effect.Effect<string, ArtifactSlotReferenceFolderBindingError> {
  return Effect.gen(function* () {
    if (!params.folderPathContextFactDefinitionId) {
      return "";
    }

    const boundContextFactDefinitionId = resolveContextFactDefinitionId({
      workflowContextFacts: params.workflowContextFacts,
      identifier: params.folderPathContextFactDefinitionId,
    });

    if (!boundContextFactDefinitionId) {
      return yield* new ArtifactSlotReferenceFolderBindingError({
        slotDefinitionId: params.slotDefinitionId,
        contextFactDefinitionId: params.folderPathContextFactDefinitionId,
        message: `Folder binding context fact '${params.folderPathContextFactDefinitionId}' was not found.`,
      });
    }

    const current = params.contextFacts
      .filter((fact) => fact.contextFactDefinitionId === boundContextFactDefinitionId)
      .sort((left, right) => left.instanceOrder - right.instanceOrder)[0];

    if (!current) {
      return "";
    }

    const rawFolderPath = extractStringValue(current.valueJson);
    if (!rawFolderPath || rawFolderPath.trim().length === 0) {
      return "";
    }

    return yield* params.sandboxGit
      .normalizeRepoRelativePath(params.projectRootPath, rawFolderPath.trim())
      .pipe(
        Effect.mapError(
          (error) =>
            new ArtifactSlotReferenceFolderBindingError({
              slotDefinitionId: params.slotDefinitionId,
              contextFactDefinitionId: boundContextFactDefinitionId,
              message: error.message,
            }),
        ),
      );
  });
}

function resolveCommandsToFiles(params: {
  readonly slotDefinitionId: string;
  readonly projectRootPath: string;
  readonly folderBasePath: string;
  readonly repoRelativePathRegex?: RegExp;
  readonly commands: readonly ArtifactSnapshotFileCommand[];
  readonly existingFiles: readonly ArtifactSlotReferenceFactFile[];
  readonly sandboxGit: SandboxGitService["Type"];
}): Effect.Effect<readonly ArtifactSlotReferenceFactFile[], ArtifactSlotReferenceServiceError> {
  return Effect.gen(function* () {
    const filesByPath = new Map(params.existingFiles.map((file) => [file.filePath, file] as const));

    for (const command of params.commands) {
      const repoRelativePath = yield* normalizeArtifactRepoRelativePath({
        slotDefinitionId: params.slotDefinitionId,
        projectRootPath: params.projectRootPath,
        folderBasePath: params.folderBasePath,
        filePath: command.filePath,
        ...(params.repoRelativePathRegex
          ? { repoRelativePathRegex: params.repoRelativePathRegex }
          : {}),
        sandboxGit: params.sandboxGit,
      });

      if (command.operation === "remove_from_slot") {
        filesByPath.delete(repoRelativePath);
        continue;
      }

      const existing = filesByPath.get(repoRelativePath);
      const resolved = yield* resolveArtifactFile({
        slotDefinitionId: params.slotDefinitionId,
        projectRootPath: params.projectRootPath,
        repoRelativePath,
        operation: command.operation,
        ...(existing ? { existing } : {}),
        sandboxGit: params.sandboxGit,
      });
      filesByPath.set(repoRelativePath, resolved);
    }

    return sortArtifactFiles([...filesByPath.values()]);
  });
}

function normalizeArtifactRepoRelativePath(params: {
  readonly slotDefinitionId: string;
  readonly projectRootPath: string;
  readonly folderBasePath: string;
  readonly filePath: string;
  readonly repoRelativePathRegex?: RegExp;
  readonly sandboxGit: SandboxGitService["Type"];
}): Effect.Effect<string, ArtifactSlotReferencePathValidationError> {
  return params.sandboxGit
    .normalizeRepoRelativePath(
      params.projectRootPath,
      params.folderBasePath.length > 0
        ? path.posix.join(params.folderBasePath, params.filePath)
        : params.filePath,
    )
    .pipe(
      Effect.mapError(
        (error) =>
          new ArtifactSlotReferencePathValidationError({
            slotDefinitionId: params.slotDefinitionId,
            filePath: params.filePath,
            message: error.message,
          }),
      ),
      Effect.flatMap((repoRelativePath) => {
        if (params.repoRelativePathRegex && !params.repoRelativePathRegex.test(repoRelativePath)) {
          return Effect.fail(
            new ArtifactSlotReferencePathValidationError({
              slotDefinitionId: params.slotDefinitionId,
              filePath: repoRelativePath,
              message: `Artifact path '${repoRelativePath}' does not match the slot path rules.`,
            }),
          );
        }

        return Effect.succeed(repoRelativePath);
      }),
    );
}

function resolveArtifactFile(params: {
  readonly slotDefinitionId: string;
  readonly projectRootPath: string;
  readonly repoRelativePath: string;
  readonly operation: "record_present_file" | "record_deleted_file";
  readonly existing?: ArtifactSlotReferenceFactFile;
  readonly sandboxGit: SandboxGitService["Type"];
}): Effect.Effect<ArtifactSlotReferenceFactFile, ArtifactSlotReferenceServiceError> {
  return Effect.gen(function* () {
    const resolution = yield* params.sandboxGit
      .resolveArtifactReference({
        rootPath: params.projectRootPath,
        filePath: params.repoRelativePath,
      })
      .pipe(
        Effect.mapError(
          (error) =>
            new ArtifactSlotReferencePathValidationError({
              slotDefinitionId: params.slotDefinitionId,
              filePath: params.repoRelativePath,
              message: error.message,
            }),
        ),
      );

    if (params.operation === "record_present_file") {
      yield* validatePresentResolution({
        slotDefinitionId: params.slotDefinitionId,
        filePath: params.repoRelativePath,
        resolution,
      });

      if (resolution.status !== "committed") {
        return yield* Effect.dieMessage("validated committed resolution must stay committed");
      }

      return committedResolutionToFile(resolution, "present");
    }

    if (
      params.existing &&
      (resolution.status === "committed" ||
        resolution.status === "missing" ||
        resolution.status === "not_committed")
    ) {
      const comparison = yield* params.sandboxGit.compareRecordedArtifactReference({
        recorded: {
          relativePath: params.existing.filePath,
          ...(params.existing.gitCommitHash !== undefined
            ? { gitCommitHash: params.existing.gitCommitHash }
            : {}),
          ...(params.existing.gitBlobHash !== undefined
            ? { gitBlobHash: params.existing.gitBlobHash }
            : {}),
          ...(params.existing.gitCommitSubject !== undefined
            ? { gitCommitSubject: params.existing.gitCommitSubject }
            : {}),
          ...(params.existing.gitCommitBody !== undefined
            ? { gitCommitBody: params.existing.gitCommitBody }
            : {}),
        },
        current: resolution,
      });

      if (comparison.status === "deleted") {
        return {
          filePath: comparison.relativePath,
          status: "deleted",
          gitCommitHash: comparison.gitCommitHash,
          gitBlobHash: comparison.gitBlobHash,
          gitCommitSubject: comparison.gitCommitSubject,
          gitCommitBody: comparison.gitCommitBody,
        };
      }
    }

    if (resolution.status === "committed") {
      return committedResolutionToFile(resolution, "deleted");
    }

    return {
      filePath: params.repoRelativePath,
      status: "deleted",
      ...(params.existing?.gitCommitHash !== undefined
        ? { gitCommitHash: params.existing.gitCommitHash }
        : {}),
      ...(params.existing?.gitBlobHash !== undefined
        ? { gitBlobHash: params.existing.gitBlobHash }
        : {}),
      ...(params.existing?.gitCommitSubject !== undefined
        ? { gitCommitSubject: params.existing.gitCommitSubject }
        : {}),
      ...(params.existing?.gitCommitBody !== undefined
        ? { gitCommitBody: params.existing.gitCommitBody }
        : {}),
    };
  });
}

function validatePresentResolution(params: {
  readonly slotDefinitionId: string;
  readonly filePath: string;
  readonly resolution: SandboxGitFileResolution;
}): Effect.Effect<void, ArtifactSlotReferencePathValidationError> {
  switch (params.resolution.status) {
    case "git_not_installed":
      return Effect.fail(
        new ArtifactSlotReferencePathValidationError({
          slotDefinitionId: params.slotDefinitionId,
          filePath: params.filePath,
          message: "Git is not installed or is not available on PATH.",
        }),
      );
    case "not_a_repo":
      return Effect.fail(
        new ArtifactSlotReferencePathValidationError({
          slotDefinitionId: params.slotDefinitionId,
          filePath: params.filePath,
          message: "Project root directory is not a git repository.",
        }),
      );
    case "missing":
      return Effect.fail(
        new ArtifactSlotReferencePathValidationError({
          slotDefinitionId: params.slotDefinitionId,
          filePath: params.filePath,
          message: `Artifact path '${params.filePath}' does not exist in the project repository.`,
        }),
      );
    case "not_committed":
      return Effect.fail(
        new ArtifactSlotReferencePathValidationError({
          slotDefinitionId: params.slotDefinitionId,
          filePath: params.filePath,
          message: `Artifact path '${params.filePath}' is not committed yet.`,
        }),
      );
    case "committed":
      return Effect.void;
  }
}

function committedResolutionToFile(
  resolution: Extract<SandboxGitFileResolution, { readonly status: "committed" }>,
  status: ArtifactSnapshotFileStatus,
): ArtifactSlotReferenceFactFile {
  return {
    filePath: resolution.relativePath,
    status,
    gitCommitHash: resolution.gitCommitHash,
    gitBlobHash: resolution.gitBlobHash,
    gitCommitSubject: resolution.gitCommitSubject,
    gitCommitBody: resolution.gitCommitBody,
  };
}

function resolveContextFactDefinitionId(params: {
  readonly workflowContextFacts: readonly WorkflowContextFactDto[];
  readonly identifier: string;
}): string | null {
  const matched = params.workflowContextFacts.find(
    (fact) => fact.contextFactDefinitionId === params.identifier || fact.key === params.identifier,
  );

  return matched && typeof matched.contextFactDefinitionId === "string"
    ? matched.contextFactDefinitionId
    : null;
}

function extractStringValue(valueJson: unknown): string | null {
  if (typeof valueJson === "string") {
    return valueJson;
  }

  if (!isRecord(valueJson)) {
    return null;
  }

  if (typeof valueJson.value === "string") {
    return valueJson.value;
  }

  return null;
}

function sortArtifactFiles(files: readonly ArtifactSlotReferenceFactFile[]) {
  return [...files].sort((left, right) => left.filePath.localeCompare(right.filePath));
}
