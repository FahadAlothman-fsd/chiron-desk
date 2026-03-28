import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { sql } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { ArtifactRepository, ProjectWorkUnitRepository } from "@chiron/workflow-engine";

import { createArtifactRepoLayer } from "../../runtime-repositories/artifact-repository";
import { createProjectWorkUnitRepoLayer } from "../../runtime-repositories/project-work-unit-repository";
import * as schema from "../../schema";

const SCHEMA_SQL = [
  `CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT,
    project_root_path TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_work_unit_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    cardinality TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE work_unit_lifecycle_states (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, key)
  )`,
  `CREATE TABLE methodology_artifact_slot_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    cardinality TEXT NOT NULL,
    rules_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, work_unit_type_id, key)
  )`,
  `CREATE TABLE transition_executions (
    id TEXT PRIMARY KEY,
    project_work_unit_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    status TEXT NOT NULL,
    primary_workflow_execution_id TEXT,
    superseded_by_transition_execution_id TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    superseded_at INTEGER
  )`,
  `CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY,
    transition_execution_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_role TEXT NOT NULL,
    status TEXT NOT NULL,
    superseded_by_workflow_execution_id TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    superseded_at INTEGER
  )`,
  `CREATE TABLE project_work_units (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    current_state_id TEXT NOT NULL,
    active_transition_execution_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_artifact_snapshots (
    id TEXT PRIMARY KEY,
    project_work_unit_id TEXT NOT NULL,
    slot_definition_id TEXT NOT NULL,
    recorded_by_transition_execution_id TEXT,
    recorded_by_workflow_execution_id TEXT,
    recorded_by_user_id TEXT,
    superseded_by_project_artifact_snapshot_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE artifact_snapshot_files (
    id TEXT PRIMARY KEY,
    artifact_snapshot_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    member_status TEXT NOT NULL,
    git_commit_hash TEXT,
    git_blob_hash TEXT
  )`,
];

describe("runtime artifact repository", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;
  const tempDirs: string[] = [];

  beforeEach(async () => {
    dbPath = `/tmp/chiron-runtime-artifacts-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await seedAnchors(db);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
    for (const dir of tempDirs) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const runtimeLayer = () =>
    Layer.mergeAll(createProjectWorkUnitRepoLayer(db), createArtifactRepoLayer(db));

  const runProjectWorkUnitRepo = <A>(
    fn: (repo: ProjectWorkUnitRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectWorkUnitRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  const runArtifactRepo = <A>(
    fn: (repo: ArtifactRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ArtifactRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  it("reconstructs lineage current-state and returns exists=false for zero live members", async () => {
    const workUnit = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );

    const snapshot1 = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );

    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: snapshot1.id,
        files: [
          { filePath: "docs/a.md", memberStatus: "present" },
          { filePath: "docs/b.md", memberStatus: "present" },
        ],
      }),
    );

    const snapshot2 = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
        supersededByProjectArtifactSnapshotId: snapshot1.id,
      }),
    );

    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: snapshot2.id,
        files: [
          { filePath: "docs/b.md", memberStatus: "removed" },
          { filePath: "docs/c.md", memberStatus: "present" },
        ],
      }),
    );

    const snapshot3 = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
        supersededByProjectArtifactSnapshotId: snapshot2.id,
      }),
    );

    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: snapshot3.id,
        files: [
          { filePath: "docs/a.md", memberStatus: "removed" },
          { filePath: "docs/c.md", memberStatus: "removed" },
        ],
      }),
    );

    const current = await runArtifactRepo((repo) =>
      repo.getCurrentSnapshotBySlot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );

    expect(current.snapshot?.id).toBe(snapshot3.id);
    expect(current.exists).toBe(false);
    expect(current.members).toEqual([]);

    const lineage = await runArtifactRepo((repo) =>
      repo.listLineageHistory({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );

    expect(lineage).toHaveLength(3);
    expect(lineage[0]?.snapshot.id).toBe(snapshot3.id);
    expect(lineage[1]?.snapshot.id).toBe(snapshot2.id);
    expect(lineage[2]?.snapshot.id).toBe(snapshot1.id);
  });

  it("reports fresh then stale against project_root_path git context", async () => {
    const workUnit = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );

    const repoDir = mkdtempSync(join(tmpdir(), "chiron-artifact-freshness-"));
    tempDirs.push(repoDir);
    execFileSync("git", ["init", repoDir]);
    execFileSync("git", ["-C", repoDir, "config", "user.email", "test@example.com"]);
    execFileSync("git", ["-C", repoDir, "config", "user.name", "Test User"]);

    writeFileSync(join(repoDir, "artifact.txt"), "v1\n", "utf8");
    execFileSync("git", ["-C", repoDir, "add", "artifact.txt"]);
    execFileSync("git", ["-C", repoDir, "commit", "-m", "seed"]);

    const gitCommitHash = execFileSync("git", [
      "-C",
      repoDir,
      "log",
      "-1",
      "--format=%H",
      "--",
      "artifact.txt",
    ])
      .toString("utf8")
      .trim();
    const gitBlobHash = execFileSync("git", [
      "-C",
      repoDir,
      "ls-tree",
      "HEAD",
      "--",
      "artifact.txt",
    ])
      .toString("utf8")
      .trim()
      .split(/\s+/)[2];

    await db.run(sql`UPDATE projects SET project_root_path = ${repoDir} WHERE id = 'project-1'`);

    const snapshot = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: snapshot.id,
        files: [
          {
            filePath: "artifact.txt",
            memberStatus: "present",
            gitCommitHash,
            gitBlobHash: gitBlobHash ?? null,
          },
        ],
      }),
    );

    const fresh = await runArtifactRepo((repo) =>
      repo.checkFreshness({
        projectId: "project-1",
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );
    expect(fresh).toEqual({ exists: true, freshness: "fresh" });

    writeFileSync(join(repoDir, "artifact.txt"), "v2\n", "utf8");
    execFileSync("git", ["-C", repoDir, "add", "artifact.txt"]);
    execFileSync("git", ["-C", repoDir, "commit", "-m", "change"]);

    const stale = await runArtifactRepo((repo) =>
      repo.checkFreshness({
        projectId: "project-1",
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );
    expect(stale).toEqual({ exists: true, freshness: "stale" });
  });

  it("returns unavailable freshness when project_root_path is missing", async () => {
    const workUnit = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );
    const snapshot = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: snapshot.id,
        files: [{ filePath: "artifact.txt", memberStatus: "present", gitCommitHash: "abc123" }],
      }),
    );

    const result = await runArtifactRepo((repo) =>
      repo.checkFreshness({
        projectId: "project-1",
        projectWorkUnitId: workUnit.id,
        slotDefinitionId: "slot-1",
      }),
    );

    expect(result.exists).toBe(true);
    expect(result.freshness).toBe("unavailable");
  });
});

async function seedAnchors(db: LibSQLDatabase<typeof schema>): Promise<void> {
  await db.run(
    sql`INSERT INTO projects (id, name, project_root_path, created_at, updated_at) VALUES ('project-1', 'Project 1', NULL, ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO methodology_work_unit_types (id, methodology_version_id, key, cardinality, created_at, updated_at) VALUES ('wu-type-1', 'version-1', 'task', 'many_per_project', ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_lifecycle_states (id, methodology_version_id, work_unit_type_id, key, created_at, updated_at) VALUES ('state-1', 'version-1', 'wu-type-1', 'todo', ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO methodology_artifact_slot_definitions (id, methodology_version_id, work_unit_type_id, key, cardinality, rules_json, created_at, updated_at) VALUES ('slot-1', 'version-1', 'wu-type-1', 'brief', 'fileset', NULL, ${Date.now()}, ${Date.now()})`,
  );
}
