import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { Context, Effect, Layer } from "effect";
import * as Schema from "effect/Schema";

const execFileAsync = promisify(execFile);

type GitExecError = Error & {
  readonly code?: number | string;
  readonly stderr?: string;
  readonly stdout?: string;
};

export class NotAGitRepoError extends Schema.TaggedError<NotAGitRepoError>()("NotAGitRepoError", {
  rootPath: Schema.String,
  message: Schema.String,
}) {}

export class InvalidPathError extends Schema.TaggedError<InvalidPathError>()("InvalidPathError", {
  rootPath: Schema.String,
  filePath: Schema.String,
  message: Schema.String,
}) {}

export class GitQueryService extends Context.Tag("@chiron/sandbox-engine/services/GitQueryService")<
  GitQueryService,
  {
    readonly isGitRepo: (rootPath: string) => Effect.Effect<boolean>;
    readonly validateRepoRelativePath: (
      rootPath: string,
      filePath: string,
    ) => Effect.Effect<boolean, InvalidPathError>;
    readonly normalizeRepoRelativePath: (
      rootPath: string,
      filePath: string,
    ) => Effect.Effect<string, InvalidPathError>;
    readonly resolveCommitHash: (
      rootPath: string,
      ref: string,
    ) => Effect.Effect<string, NotAGitRepoError>;
    readonly resolveBlobHash: (params: {
      rootPath: string;
      commitHash: string;
      filePath: string;
    }) => Effect.Effect<string | null, NotAGitRepoError | InvalidPathError>;
    readonly listFilesAtCommit: (params: {
      rootPath: string;
      commitHash: string;
      directory?: string;
    }) => Effect.Effect<readonly string[], NotAGitRepoError | InvalidPathError>;
    readonly hasFileAtCommit: (params: {
      rootPath: string;
      commitHash: string;
      filePath: string;
    }) => Effect.Effect<boolean, NotAGitRepoError | InvalidPathError>;
    readonly matchesBlobHash: (params: {
      rootPath: string;
      commitHash: string;
      filePath: string;
      blobHash: string;
    }) => Effect.Effect<boolean, NotAGitRepoError | InvalidPathError>;
  }
>() {}

export const GitQueryServiceLive = Layer.effect(
  GitQueryService,
  Effect.sync(() => {
    const isGitRepo = (rootPath: string) =>
      Effect.promise(async () => {
        try {
          const { stdout } = await execFileAsync("git", [
            "-C",
            rootPath,
            "rev-parse",
            "--is-inside-work-tree",
          ]);
          return stdout.trim() === "true";
        } catch {
          return false;
        }
      });

    const ensureGitRepo = (rootPath: string): Effect.Effect<void, NotAGitRepoError> =>
      isGitRepo(rootPath).pipe(
        Effect.flatMap((insideGitRepo) =>
          insideGitRepo
            ? Effect.void
            : Effect.fail(
                new NotAGitRepoError({
                  rootPath,
                  message: "Configured root path is not a git repository.",
                }),
              ),
        ),
      );

    const validateRepoRelativePath = (rootPath: string, filePath: string) =>
      normalizeRepoRelativePath(rootPath, filePath).pipe(Effect.as(true));

    const resolveCommitHash = (rootPath: string, ref: string) =>
      Effect.gen(function* () {
        yield* ensureGitRepo(rootPath);
        const stdout = yield* runGit(rootPath, [
          "rev-parse",
          "--verify",
          "--end-of-options",
          `${ref}^{commit}`,
        ]);
        return stdout.trim();
      });

    const resolveBlobHash = ({
      rootPath,
      commitHash,
      filePath,
    }: {
      rootPath: string;
      commitHash: string;
      filePath: string;
    }) =>
      Effect.gen(function* () {
        yield* ensureGitRepo(rootPath);
        const normalizedPath = yield* normalizeRepoRelativePath(rootPath, filePath);
        const stdout = yield* runGit(rootPath, ["ls-tree", commitHash, "--", normalizedPath]);
        return parseBlobHash(stdout);
      });

    const listFilesAtCommit = ({
      rootPath,
      commitHash,
      directory,
    }: {
      rootPath: string;
      commitHash: string;
      directory?: string;
    }) =>
      Effect.gen(function* () {
        yield* ensureGitRepo(rootPath);
        const args = ["ls-tree", "-r", "--name-only", commitHash] as string[];

        if (directory !== undefined) {
          const normalizedDirectory = yield* normalizeRepoRelativePath(rootPath, directory);
          args.push("--", normalizedDirectory);
        }

        const stdout = yield* runGit(rootPath, args);
        return stdout
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.length > 0);
      });

    const hasFileAtCommit = (params: { rootPath: string; commitHash: string; filePath: string }) =>
      resolveBlobHash(params).pipe(Effect.map((blobHash) => blobHash !== null));

    const matchesBlobHash = ({
      blobHash,
      ...rest
    }: {
      rootPath: string;
      commitHash: string;
      filePath: string;
      blobHash: string;
    }) =>
      resolveBlobHash(rest).pipe(Effect.map((resolvedBlobHash) => resolvedBlobHash === blobHash));

    return GitQueryService.of({
      isGitRepo,
      validateRepoRelativePath,
      normalizeRepoRelativePath,
      resolveCommitHash,
      resolveBlobHash,
      listFilesAtCommit,
      hasFileAtCommit,
      matchesBlobHash,
    });
  }),
);

function normalizeRepoRelativePath(
  rootPath: string,
  filePath: string,
): Effect.Effect<string, InvalidPathError> {
  const candidate = filePath;
  if (candidate.length === 0) {
    return Effect.fail(
      new InvalidPathError({
        rootPath,
        filePath,
        message: "Path must not be empty.",
      }),
    );
  }

  if (candidate.includes("\0")) {
    return Effect.fail(
      new InvalidPathError({
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
      new InvalidPathError({
        rootPath,
        filePath,
        message: "Path must stay within the repository root.",
      }),
    );
  }

  return Effect.succeed(normalized);
}

function runGit(
  rootPath: string,
  args: readonly string[],
): Effect.Effect<string, NotAGitRepoError> {
  return Effect.async<string, NotAGitRepoError>((resume) => {
    execFileAsync("git", ["-C", rootPath, ...args])
      .then(({ stdout }) => resume(Effect.succeed(stdout)))
      .catch((cause) => {
        const gitError = cause as GitExecError;
        const stderr = gitError.stderr ?? "";

        if (stderr.includes("not a git repository")) {
          resume(
            Effect.fail(
              new NotAGitRepoError({
                rootPath,
                message: "Configured root path is not a git repository.",
              }),
            ),
          );
          return;
        }

        resume(
          Effect.die(
            new Error(
              `Git command failed for ${rootPath}: git ${args.join(" ")}\n${stderr}`.trim(),
              { cause },
            ),
          ),
        );
      });
  });
}

function parseBlobHash(stdout: string): string | null {
  const line = stdout.trim();
  if (line.length === 0) {
    return null;
  }

  const parts = line.split(/\s+/);
  return parts.length >= 3 ? (parts[2] ?? null) : null;
}
