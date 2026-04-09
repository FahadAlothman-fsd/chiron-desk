import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import {
  GitQueryService,
  GitQueryServiceLive,
  InvalidPathError,
  NotAGitRepoError,
} from "../services/git-query-service";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      try {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 25 });
      } catch {
        // ignore tempdir cleanup races in tests
      }
    }
  }
});

describe("git query service", () => {
  it("detects whether a configured root is a git repo", async () => {
    const repoDir = createRepo();
    const nonRepoDir = mkdtempSync(join(tmpdir(), "chiron-sandbox-non-repo-"));
    tempDirs.push(nonRepoDir);

    expect(await run((service) => service.isGitRepo(repoDir))).toBe(true);
    expect(await run((service) => service.isGitRepo(nonRepoDir))).toBe(false);
  });

  it("validates and normalizes repo-relative file paths", async () => {
    const repoDir = createRepo();

    await expect(
      run((service) => service.validateRepoRelativePath(repoDir, "src//nested\\file.ts")),
    ).resolves.toBe(true);
    await expect(
      run((service) => service.normalizeRepoRelativePath(repoDir, "src//nested\\file.ts")),
    ).resolves.toBe("src/nested/file.ts");

    await expect(
      runError((service) => service.validateRepoRelativePath(repoDir, "../escape.txt")),
    ).resolves.toMatchObject({
      _tag: "InvalidPathError",
      filePath: "../escape.txt",
    } satisfies Partial<InvalidPathError>);

    await expect(
      runError((service) => service.validateRepoRelativePath(repoDir, "/absolute.txt")),
    ).resolves.toMatchObject({
      _tag: "InvalidPathError",
      filePath: "/absolute.txt",
    } satisfies Partial<InvalidPathError>);
  });

  it("resolves commit hashes, blob hashes, and file listings", async () => {
    const repoDir = createRepo({
      "artifact.txt": "root\n",
      "docs/guide.md": "guide\n",
      "src/nested/file.ts": "export const value = 1;\n",
    });

    const headCommit = git(repoDir, ["rev-parse", "HEAD"]);
    const nestedBlobHash = git(repoDir, ["ls-tree", "HEAD", "--", "src/nested/file.ts"]).split(
      /\s+/,
    )[2];

    await expect(run((service) => service.resolveCommitHash(repoDir, "HEAD"))).resolves.toBe(
      headCommit,
    );
    await expect(
      run((service) =>
        service.resolveBlobHash({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "src/nested/file.ts",
        }),
      ),
    ).resolves.toBe(nestedBlobHash);

    await expect(
      run((service) =>
        service.resolveBlobHash({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "missing.txt",
        }),
      ),
    ).resolves.toBeNull();

    await expect(
      run((service) =>
        service.listFilesAtCommit({
          rootPath: repoDir,
          commitHash: headCommit,
        }),
      ),
    ).resolves.toEqual(["artifact.txt", "docs/guide.md", "src/nested/file.ts"]);

    await expect(
      run((service) =>
        service.listFilesAtCommit({
          rootPath: repoDir,
          commitHash: headCommit,
          directory: "src",
        }),
      ),
    ).resolves.toEqual(["src/nested/file.ts"]);
  });

  it("supports artifact-backed membership and identity checks", async () => {
    const repoDir = createRepo({
      "artifact.txt": "artifact\n",
      "docs/guide.md": "guide\n",
    });

    const headCommit = git(repoDir, ["rev-parse", "HEAD"]);
    const artifactBlobHash =
      git(repoDir, ["ls-tree", "HEAD", "--", "artifact.txt"]).split(/\s+/)[2] ?? "";

    await expect(
      run((service) =>
        service.hasFileAtCommit({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "artifact.txt",
        }),
      ),
    ).resolves.toBe(true);

    await expect(
      run((service) =>
        service.hasFileAtCommit({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "missing.txt",
        }),
      ),
    ).resolves.toBe(false);

    await expect(
      run((service) =>
        service.matchesBlobHash({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "artifact.txt",
          blobHash: artifactBlobHash,
        }),
      ),
    ).resolves.toBe(true);

    await expect(
      run((service) =>
        service.matchesBlobHash({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "artifact.txt",
          blobHash: "deadbeef",
        }),
      ),
    ).resolves.toBe(false);
  });

  it("returns typed not-a-git-repo and invalid-path errors", async () => {
    const nonRepoDir = mkdtempSync(join(tmpdir(), "chiron-sandbox-errors-"));
    tempDirs.push(nonRepoDir);

    await expect(
      runError((service) => service.resolveCommitHash(nonRepoDir, "HEAD")),
    ).resolves.toMatchObject({
      _tag: "NotAGitRepoError",
      rootPath: nonRepoDir,
    } satisfies Partial<NotAGitRepoError>);

    const repoDir = createRepo({ "artifact.txt": "artifact\n" });
    const headCommit = git(repoDir, ["rev-parse", "HEAD"]);

    await expect(
      runError((service) =>
        service.resolveBlobHash({
          rootPath: repoDir,
          commitHash: headCommit,
          filePath: "../artifact.txt",
        }),
      ),
    ).resolves.toMatchObject({
      _tag: "InvalidPathError",
      rootPath: repoDir,
      filePath: "../artifact.txt",
    } satisfies Partial<InvalidPathError>);
  });
});

function createRepo(files: Record<string, string> = { "artifact.txt": "seed\n" }): string {
  const repoDir = mkdtempSync(join(tmpdir(), "chiron-sandbox-git-"));
  tempDirs.push(repoDir);

  execFileSync("git", ["init", repoDir]);
  execFileSync("git", ["-C", repoDir, "config", "user.email", "test@example.com"]);
  execFileSync("git", ["-C", repoDir, "config", "user.name", "Test User"]);

  for (const [filePath, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(repoDir, filePath)), { recursive: true });
    writeFileSync(join(repoDir, filePath), contents, "utf8");
  }

  execFileSync("git", ["-C", repoDir, "add", "."]);
  execFileSync("git", ["-C", repoDir, "commit", "-m", "seed"]);

  return repoDir;
}

function git(repoDir: string, args: readonly string[]): string {
  return execFileSync("git", ["-C", repoDir, ...args])
    .toString("utf8")
    .trim();
}

function run<A>(
  operation: (service: GitQueryService["Type"]) => Effect.Effect<A, unknown>,
): Promise<A> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* GitQueryService;
      return yield* operation(service);
    }).pipe(Effect.provide(GitQueryServiceLive)),
  );
}

function runError<E>(
  operation: (service: GitQueryService["Type"]) => Effect.Effect<unknown, E>,
): Promise<E> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* GitQueryService;
      return yield* operation(service).pipe(Effect.flip);
    }).pipe(Effect.provide(GitQueryServiceLive)),
  );
}
