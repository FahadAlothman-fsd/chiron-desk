import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { Effect } from "effect";
import { afterEach, describe, expect, it } from "vitest";

import { makeSandboxGitService, SandboxGitService } from "../services/sandbox-git-service";

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

describe("sandbox git service", () => {
  it("resolves committed file metadata from a clean repository", async () => {
    const repoDir = createRepo({ "docs/setup.md": "hello\n" });

    const result = await run((service) =>
      service.resolveArtifactReference({
        rootPath: repoDir,
        filePath: "docs/setup.md",
      }),
    );

    expect(result.status).toBe("committed");
    if (result.status !== "committed") {
      throw new Error("expected committed result");
    }

    expect(result.relativePath).toBe("docs/setup.md");
    expect(result.gitCommitHash).toMatch(/^[a-f0-9]{40}$/);
    expect(result.gitBlobHash).toMatch(/^[a-f0-9]{40}$/);
    expect(result.gitCommitSubject).toBe("seed");
    expect(result.gitCommitBody).toBeNull();
  });

  it("reports untracked and modified files as not_committed", async () => {
    const repoDir = createRepo({ "docs/setup.md": "hello\n" });

    writeFileSync(join(repoDir, "docs/setup.md"), "hello again\n", "utf8");
    mkdirSync(join(repoDir, "notes"), { recursive: true });
    writeFileSync(join(repoDir, "notes/todo.md"), "draft\n", "utf8");

    const modified = await run((service) =>
      service.resolveArtifactReference({
        rootPath: repoDir,
        filePath: "docs/setup.md",
      }),
    );
    const untracked = await run((service) =>
      service.resolveArtifactReference({
        rootPath: repoDir,
        filePath: "notes/todo.md",
      }),
    );

    expect(modified).toMatchObject({
      status: "not_committed",
      relativePath: "docs/setup.md",
      modified: true,
    });
    expect(untracked).toMatchObject({
      status: "not_committed",
      relativePath: "notes/todo.md",
      untracked: true,
    });
  });

  it("reports missing files and non-repositories distinctly", async () => {
    const repoDir = createRepo({ "docs/setup.md": "hello\n" });
    const nonRepoDir = mkdtempSync(join(tmpdir(), "chiron-sandbox-non-repo-"));
    tempDirs.push(nonRepoDir);

    const missing = await run((service) =>
      service.resolveArtifactReference({
        rootPath: repoDir,
        filePath: "docs/missing.md",
      }),
    );
    const nonRepo = await run((service) => service.getAvailability(nonRepoDir));

    expect(missing).toEqual({ status: "missing", relativePath: "docs/missing.md" });
    expect(nonRepo).toMatchObject({ status: "not_a_repo" });
  });

  it("reports git_not_installed when configured binary is unavailable", async () => {
    const repoDir = createRepo({ "docs/setup.md": "hello\n" });

    const result = await run(
      (service) =>
        service.resolveArtifactReference({
          rootPath: repoDir,
          filePath: "docs/setup.md",
        }),
      { binary: "git-binary-that-does-not-exist" },
    );

    expect(result).toMatchObject({ status: "git_not_installed" });
  });

  it("compares recorded metadata as unchanged, changed, and deleted", async () => {
    const unchanged = await run((service) =>
      service.compareRecordedArtifactReference({
        recorded: {
          relativePath: "docs/setup.md",
          gitCommitHash: "commit-1",
          gitBlobHash: "blob-1",
          gitCommitSubject: "subject-1",
          gitCommitBody: "body-1",
        },
        current: {
          status: "committed",
          relativePath: "docs/setup.md",
          gitCommitHash: "commit-1",
          gitBlobHash: "blob-1",
          gitCommitSubject: "subject-1",
          gitCommitBody: "body-1",
        },
      }),
    );
    const changed = await run((service) =>
      service.compareRecordedArtifactReference({
        recorded: {
          relativePath: "docs/setup.md",
          gitCommitHash: "commit-1",
          gitBlobHash: "blob-1",
          gitCommitSubject: "subject-1",
          gitCommitBody: "body-1",
        },
        current: {
          status: "committed",
          relativePath: "docs/setup.md",
          gitCommitHash: "commit-2",
          gitBlobHash: "blob-2",
          gitCommitSubject: "subject-2",
          gitCommitBody: "body-2",
        },
      }),
    );
    const deleted = await run((service) =>
      service.compareRecordedArtifactReference({
        recorded: {
          relativePath: "docs/setup.md",
          gitCommitHash: "commit-1",
          gitBlobHash: "blob-1",
          gitCommitSubject: "subject-1",
          gitCommitBody: "body-1",
        },
        current: {
          status: "not_committed",
          relativePath: "docs/setup.md",
          tracked: true,
          untracked: false,
          staged: false,
          modified: false,
          deleted: true,
        },
      }),
    );

    expect(unchanged).toEqual({
      status: "unchanged",
      relativePath: "docs/setup.md",
      gitCommitHash: "commit-1",
      gitBlobHash: "blob-1",
      gitCommitSubject: "subject-1",
      gitCommitBody: "body-1",
    });
    expect(changed).toEqual({
      status: "changed",
      relativePath: "docs/setup.md",
      gitCommitHash: "commit-2",
      gitBlobHash: "blob-2",
      gitCommitSubject: "subject-2",
      gitCommitBody: "body-2",
    });
    expect(deleted).toEqual({
      status: "deleted",
      relativePath: "docs/setup.md",
      gitCommitHash: "commit-1",
      gitBlobHash: "blob-1",
      gitCommitSubject: "subject-1",
      gitCommitBody: "body-1",
    });
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

function run<A>(
  operation: (service: SandboxGitService["Type"]) => Effect.Effect<A, unknown>,
  options?: Parameters<typeof makeSandboxGitService>[0],
): Promise<A> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const service = yield* SandboxGitService;
      return yield* operation(service);
    }).pipe(Effect.provide(makeSandboxGitService(options))),
  );
}
