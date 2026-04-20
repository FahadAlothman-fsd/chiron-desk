import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { sql } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { ArtifactRepository, ProjectWorkUnitRepository } from "@chiron/workflow-engine";

import {
  createArtifactRepoLayer,
  findActiveArtifactConditionPrerequisites,
} from "../../runtime-repositories/artifact-repository";
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
    work_unit_key TEXT NOT NULL,
    instance_number INTEGER NOT NULL,
    display_name TEXT,
    current_state_id TEXT NOT NULL,
    active_transition_execution_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_artifact_instances (
    id TEXT PRIMARY KEY,
    project_work_unit_id TEXT NOT NULL,
    slot_definition_id TEXT NOT NULL,
    recorded_by_transition_execution_id TEXT,
    recorded_by_workflow_execution_id TEXT,
    recorded_by_user_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE project_artifact_instance_files (
    id TEXT PRIMARY KEY,
    artifact_instance_id TEXT NOT NULL,
    file_path TEXT NOT NULL,
    git_commit_hash TEXT,
    git_blob_hash TEXT,
    git_commit_title TEXT,
    git_commit_body TEXT,
    updated_at INTEGER NOT NULL
  )`,
];

describe("runtime condition prerequisites", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-runtime-condition-prereqs-${randomUUID()}.db`;
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

  it("computes artifact existence prerequisites from current artifact instances", async () => {
    const project1WorkUnit = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );
    const project2WorkUnit = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-2",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );

    const project1Existing = await runArtifactRepo((repo) =>
      repo.createSnapshot({ projectWorkUnitId: project1WorkUnit.id, slotDefinitionId: "slot-1" }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: project1Existing.id,
        files: [{ filePath: "docs/one.md" }],
      }),
    );

    const project1BaseRemoved = await runArtifactRepo((repo) =>
      repo.createSnapshot({ projectWorkUnitId: project1WorkUnit.id, slotDefinitionId: "slot-2" }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: project1BaseRemoved.id,
        files: [{ filePath: "docs/two.md" }],
      }),
    );
    const project1RemovedHead = await runArtifactRepo((repo) =>
      repo.createSnapshot({
        projectWorkUnitId: project1WorkUnit.id,
        slotDefinitionId: "slot-2",
      }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: project1RemovedHead.id,
        files: [{ filePath: "docs/two.md", memberStatus: "removed" }],
      }),
    );

    const project2Existing = await runArtifactRepo((repo) =>
      repo.createSnapshot({ projectWorkUnitId: project2WorkUnit.id, slotDefinitionId: "slot-1" }),
    );
    await runArtifactRepo((repo) =>
      repo.addSnapshotFiles({
        artifactSnapshotId: project2Existing.id,
        files: [{ filePath: "docs/other.md" }],
      }),
    );

    const prereqs = await findActiveArtifactConditionPrerequisites(db, { projectId: "project-1" });

    const bySlot = new Map(prereqs.map((row) => [row.slotDefinitionId, row]));
    expect(prereqs).toHaveLength(2);
    expect(bySlot.get("slot-1")?.projectWorkUnitId).toBe(project1WorkUnit.id);
    expect(bySlot.get("slot-1")?.exists).toBe(true);
    expect(bySlot.get("slot-2")?.projectWorkUnitId).toBe(project1WorkUnit.id);
    expect(bySlot.get("slot-2")?.exists).toBe(false);
  });
});

async function seedAnchors(db: LibSQLDatabase<typeof schema>): Promise<void> {
  await db.run(
    sql`INSERT INTO projects (id, name, project_root_path, created_at, updated_at) VALUES ('project-1', 'Project 1', NULL, ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO projects (id, name, project_root_path, created_at, updated_at) VALUES ('project-2', 'Project 2', NULL, ${Date.now()}, ${Date.now()})`,
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
  await db.run(
    sql`INSERT INTO methodology_artifact_slot_definitions (id, methodology_version_id, work_unit_type_id, key, cardinality, rules_json, created_at, updated_at) VALUES ('slot-2', 'version-1', 'wu-type-1', 'handoff', 'fileset', NULL, ${Date.now()}, ${Date.now()})`,
  );
}
