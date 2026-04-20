import { access } from "node:fs/promises";
import path from "node:path";

import { CheckRepoActions, simpleGit, type SimpleGit, type SimpleGitOptions } from "simple-git";
import { Context, Effect, Layer } from "effect";
import * as Schema from "effect/Schema";

export class SandboxGitInvalidPathError extends Schema.TaggedError<SandboxGitInvalidPathError>()(
  "SandboxGitInvalidPathError",
  {
    rootPath: Schema.String,
    filePath: Schema.String,
    message: Schema.String,
  },
) {}

export type SandboxGitAvailability =
  | {
      readonly status: "available";
      readonly version: string;
    }
  | {
      readonly status: "git_not_installed";
      readonly message: string;
    }
  | {
      readonly status: "not_a_repo";
      readonly message: string;
    };

export type SandboxGitFileResolution =
  | {
      readonly status: "git_not_installed";
      readonly message: string;
      readonly relativePath: string;
    }
  | {
      readonly status: "not_a_repo";
      readonly message: string;
      readonly relativePath: string;
    }
  | {
      readonly status: "missing";
      readonly relativePath: string;
    }
  | {
      readonly status: "not_committed";
      readonly relativePath: string;
      readonly tracked: boolean;
      readonly untracked: boolean;
      readonly staged: boolean;
      readonly modified: boolean;
      readonly deleted: boolean;
    }
  | {
      readonly status: "committed";
      readonly relativePath: string;
      readonly gitCommitHash: string | null;
      readonly gitBlobHash: string;
      readonly gitCommitSubject: string | null;
      readonly gitCommitBody: string | null;
    };

export type SandboxGitArtifactComparison =
  | {
      readonly status: "unchanged";
      readonly relativePath: string;
      readonly gitCommitHash: string | null;
      readonly gitBlobHash: string;
      readonly gitCommitSubject: string | null;
      readonly gitCommitBody: string | null;
    }
  | {
      readonly status: "changed";
      readonly relativePath: string;
      readonly gitCommitHash: string | null;
      readonly gitBlobHash: string;
      readonly gitCommitSubject: string | null;
      readonly gitCommitBody: string | null;
    }
  | {
      readonly status: "deleted";
      readonly relativePath: string;
      readonly gitCommitHash: string | null;
      readonly gitBlobHash: string | null;
      readonly gitCommitSubject: string | null;
      readonly gitCommitBody: string | null;
    };

export interface SandboxGitServiceOptions {
  readonly binary?: string | readonly string[];
  readonly maxConcurrentProcesses?: number;
}

export class SandboxGitService extends Context.Tag(
  "@chiron/sandbox-engine/services/SandboxGitService",
)<
  SandboxGitService,
  {
    readonly getAvailability: (
      rootPath: string,
    ) => Effect.Effect<SandboxGitAvailability, SandboxGitInvalidPathError>;
    readonly normalizeRepoRelativePath: (
      rootPath: string,
      filePath: string,
    ) => Effect.Effect<string, SandboxGitInvalidPathError>;
    readonly resolveArtifactReference: (params: {
      rootPath: string;
      filePath: string;
    }) => Effect.Effect<SandboxGitFileResolution, SandboxGitInvalidPathError>;
    readonly compareRecordedArtifactReference: (params: {
      recorded: {
        readonly relativePath: string;
        readonly gitCommitHash?: string | null;
        readonly gitBlobHash?: string | null;
        readonly gitCommitSubject?: string | null;
        readonly gitCommitBody?: string | null;
      };
      current: Extract<
        SandboxGitFileResolution,
        { readonly status: "committed" | "missing" | "not_committed" }
      >;
    }) => Effect.Effect<SandboxGitArtifactComparison, never>;
  }
>() {}

export const makeSandboxGitService = (options: SandboxGitServiceOptions = {}) =>
  Layer.effect(
    SandboxGitService,
    Effect.sync(() => {
      const createClient = (rootPath?: string): SimpleGit => {
        const config = {
          baseDir: rootPath ?? process.cwd(),
          maxConcurrentProcesses: options.maxConcurrentProcesses ?? 1,
          config: [],
          trimmed: false,
          ...(typeof options.binary !== "undefined"
            ? {
                binary: options.binary as unknown as Exclude<SimpleGitOptions["binary"], undefined>,
              }
            : {}),
        } as SimpleGitOptions;

        return simpleGit(config);
      };

      const getAvailability = (rootPath: string) =>
        Effect.gen(function* () {
          const version = yield* getVersion();
          if (version.status !== "available") {
            return version;
          }

          const repoState = yield* ensureRepo(rootPath);
          return repoState.status === "available" ? version : repoState;
        });

      const resolveArtifactReference = ({
        rootPath,
        filePath,
      }: {
        rootPath: string;
        filePath: string;
      }) =>
        Effect.gen(function* () {
          const relativePath = yield* normalizeRepoRelativePath(rootPath, filePath);
          const availability = yield* getAvailability(rootPath);

          if (availability.status === "git_not_installed") {
            return {
              status: "git_not_installed",
              message: availability.message,
              relativePath,
            } satisfies SandboxGitFileResolution;
          }

          if (availability.status === "not_a_repo") {
            return {
              status: "not_a_repo",
              message: availability.message,
              relativePath,
            } satisfies SandboxGitFileResolution;
          }

          const client = createClient(rootPath);
          const status = yield* gitTryPromise(
            () => client.status(["--", relativePath]),
            rootPath,
            "status",
          );

          const untracked = status.not_added.includes(relativePath);
          const staged =
            status.staged.includes(relativePath) ||
            status.created.includes(relativePath) ||
            status.deleted.includes(relativePath);
          const modified = status.modified.includes(relativePath);
          const deleted = status.deleted.includes(relativePath);
          const tracked = !untracked;

          if (untracked || staged || modified || deleted) {
            return {
              status: "not_committed",
              relativePath,
              tracked,
              untracked,
              staged,
              modified,
              deleted,
            } satisfies SandboxGitFileResolution;
          }

          const exists = yield* fileExists(rootPath, relativePath);
          if (!exists) {
            return { status: "missing", relativePath } satisfies SandboxGitFileResolution;
          }

          const gitBlobHash = yield* gitTryPromise(
            () => client.raw(["ls-tree", "HEAD", "--", relativePath]),
            rootPath,
            "ls-tree",
          ).pipe(Effect.map(parseBlobHash));

          if (!gitBlobHash) {
            return { status: "missing", relativePath } satisfies SandboxGitFileResolution;
          }

          const gitCommitHash = yield* gitTryPromise(
            () => client.raw(["log", "-1", "--format=%H", "--", relativePath]),
            rootPath,
            "log",
          ).pipe(
            Effect.map((stdout) => {
              const trimmed = stdout.trim();
              return trimmed.length > 0 ? trimmed : null;
            }),
          );

          const gitCommitSubject = yield* gitTryPromise(
            () => client.raw(["log", "-1", "--format=%s", "--", relativePath]),
            rootPath,
            "log-subject",
          ).pipe(Effect.map(toNullableTrimmed));

          const gitCommitBody = yield* gitTryPromise(
            () => client.raw(["log", "-1", "--format=%b", "--", relativePath]),
            rootPath,
            "log-body",
          ).pipe(Effect.map(toNullableTrimmed));

          return {
            status: "committed",
            relativePath,
            gitCommitHash,
            gitBlobHash,
            gitCommitSubject,
            gitCommitBody,
          } satisfies SandboxGitFileResolution;
        });

      const compareRecordedArtifactReference = ({
        recorded,
        current,
      }: {
        recorded: {
          readonly relativePath: string;
          readonly gitCommitHash?: string | null;
          readonly gitBlobHash?: string | null;
          readonly gitCommitSubject?: string | null;
          readonly gitCommitBody?: string | null;
        };
        current: Extract<
          SandboxGitFileResolution,
          { readonly status: "committed" | "missing" | "not_committed" }
        >;
      }) =>
        Effect.succeed(
          current.status === "missing" || (current.status === "not_committed" && current.deleted)
            ? ({
                status: "deleted",
                relativePath: recorded.relativePath,
                gitCommitHash: recorded.gitCommitHash ?? null,
                gitBlobHash: recorded.gitBlobHash ?? null,
                gitCommitSubject: recorded.gitCommitSubject ?? null,
                gitCommitBody: recorded.gitCommitBody ?? null,
              } satisfies SandboxGitArtifactComparison)
            : current.status === "committed" &&
                current.relativePath === recorded.relativePath &&
                current.gitCommitHash === (recorded.gitCommitHash ?? null) &&
                current.gitBlobHash === recorded.gitBlobHash
              ? ({
                  status: "unchanged",
                  relativePath: current.relativePath,
                  gitCommitHash: current.gitCommitHash,
                  gitBlobHash: current.gitBlobHash,
                  gitCommitSubject: current.gitCommitSubject,
                  gitCommitBody: current.gitCommitBody,
                } satisfies SandboxGitArtifactComparison)
              : ({
                  status: "changed",
                  relativePath:
                    current.status === "committed" ? current.relativePath : recorded.relativePath,
                  gitCommitHash:
                    current.status === "committed"
                      ? current.gitCommitHash
                      : (recorded.gitCommitHash ?? null),
                  gitBlobHash:
                    current.status === "committed"
                      ? current.gitBlobHash
                      : (recorded.gitBlobHash ?? ""),
                  gitCommitSubject:
                    current.status === "committed"
                      ? current.gitCommitSubject
                      : (recorded.gitCommitSubject ?? null),
                  gitCommitBody:
                    current.status === "committed"
                      ? current.gitCommitBody
                      : (recorded.gitCommitBody ?? null),
                } satisfies SandboxGitArtifactComparison),
        );

      const getVersion = () =>
        Effect.promise(() => createClient().version()).pipe(
          Effect.map((version) => {
            const normalized = version.toString();
            return version.installed
              ? ({ status: "available", version: normalized } as const)
              : ({
                  status: "git_not_installed",
                  message: "Git is not installed or is not available on PATH.",
                } as const);
          }),
          Effect.catchAllCause(() =>
            Effect.succeed({
              status: "git_not_installed",
              message: "Git is not installed or is not available on PATH.",
            } as const),
          ),
        );

      const ensureRepo = (rootPath: string) =>
        Effect.promise(() => createClient(rootPath).checkIsRepo(CheckRepoActions.IN_TREE)).pipe(
          Effect.map((isRepo) =>
            isRepo
              ? ({ status: "available", version: "" } as const)
              : ({
                  status: "not_a_repo",
                  message: "Project root directory is not a git repository.",
                } as const),
          ),
          Effect.catchAllCause((cause) =>
            isNotRepoError(cause)
              ? Effect.succeed({
                  status: "not_a_repo",
                  message: "Project root directory is not a git repository.",
                } as const)
              : Effect.succeed({
                  status: "not_a_repo",
                  message: "Project root directory is not a git repository.",
                } as const),
          ),
        );

      return SandboxGitService.of({
        getAvailability,
        normalizeRepoRelativePath,
        resolveArtifactReference,
        compareRecordedArtifactReference,
      });
    }),
  );

export const SandboxGitServiceLive = makeSandboxGitService();

function normalizeRepoRelativePath(
  rootPath: string,
  filePath: string,
): Effect.Effect<string, SandboxGitInvalidPathError> {
  const candidate = filePath;
  if (candidate.length === 0) {
    return Effect.fail(
      new SandboxGitInvalidPathError({
        rootPath,
        filePath,
        message: "Path must not be empty.",
      }),
    );
  }

  if (candidate.includes("\0")) {
    return Effect.fail(
      new SandboxGitInvalidPathError({
        rootPath,
        filePath,
        message: "Path must not contain null bytes.",
      }),
    );
  }

  const posixCandidate = candidate.replaceAll("\\", "/");
  const normalized = path.posix.normalize(posixCandidate);

  if (
    path.posix.isAbsolute(normalized) ||
    normalized === "." ||
    normalized === ".." ||
    normalized.startsWith("../")
  ) {
    return Effect.fail(
      new SandboxGitInvalidPathError({
        rootPath,
        filePath,
        message: "Path must stay within the repository root.",
      }),
    );
  }

  return Effect.succeed(normalized);
}

function gitTryPromise<A>(
  operation: () => Promise<A>,
  rootPath: string,
  command: string,
): Effect.Effect<A, never> {
  return Effect.promise(operation).pipe(
    Effect.catchAllCause((cause) =>
      Effect.die(
        new Error(`Git command failed for ${rootPath}: ${command}`, {
          cause,
        }),
      ),
    ),
  );
}

function parseBlobHash(stdout: string): string | null {
  const line = stdout.trim();
  if (line.length === 0) {
    return null;
  }

  const parts = line.split(/\s+/);
  return parts.length >= 3 ? (parts[2] ?? null) : null;
}

function toNullableTrimmed(stdout: string): string | null {
  const trimmed = stdout.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isNotRepoError(cause: unknown): boolean {
  if (!(cause instanceof Error)) {
    return false;
  }

  const message = cause.message.toLowerCase();
  return (
    message.includes("not a git repository") ||
    message.includes("cannot use simple-git on a directory that does not exist")
  );
}

function fileExists(rootPath: string, relativePath: string): Effect.Effect<boolean> {
  return Effect.promise(async () => {
    try {
      await access(path.join(rootPath, relativePath));
      return true;
    } catch {
      return false;
    }
  });
}
