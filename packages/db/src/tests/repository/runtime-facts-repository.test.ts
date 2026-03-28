import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { sql } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import {
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  WorkUnitFactRepository,
} from "@chiron/workflow-engine";

import { createProjectFactRepoLayer } from "../../runtime-repositories/project-fact-repository";
import { createProjectWorkUnitRepoLayer } from "../../runtime-repositories/project-work-unit-repository";
import { createWorkUnitFactRepoLayer } from "../../runtime-repositories/work-unit-fact-repository";
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
  `CREATE TABLE methodology_fact_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    fact_type TEXT NOT NULL,
    cardinality TEXT,
    default_value_json TEXT,
    description_json TEXT,
    guidance_json TEXT,
    validation_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE work_unit_fact_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    name TEXT,
    key TEXT NOT NULL,
    fact_type TEXT NOT NULL,
    cardinality TEXT NOT NULL,
    description TEXT,
    default_value_json TEXT,
    guidance_json TEXT,
    validation_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, key)
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
  `CREATE TABLE project_fact_instances (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    fact_definition_id TEXT NOT NULL,
    value_json TEXT,
    status TEXT NOT NULL,
    superseded_by_fact_instance_id TEXT,
    produced_by_transition_execution_id TEXT,
    produced_by_workflow_execution_id TEXT,
    authored_by_user_id TEXT,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE work_unit_fact_instances (
    id TEXT PRIMARY KEY,
    project_work_unit_id TEXT NOT NULL,
    fact_definition_id TEXT NOT NULL,
    value_json TEXT,
    referenced_project_work_unit_id TEXT,
    status TEXT NOT NULL,
    superseded_by_fact_instance_id TEXT,
    produced_by_transition_execution_id TEXT,
    produced_by_workflow_execution_id TEXT,
    authored_by_user_id TEXT,
    created_at INTEGER NOT NULL
  )`,
];

describe("runtime fact repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-runtime-facts-${randomUUID()}.db`;
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
    Layer.mergeAll(
      createProjectWorkUnitRepoLayer(db),
      createProjectFactRepoLayer(db),
      createWorkUnitFactRepoLayer(db),
    );

  const runProjectFactRepo = <A>(
    fn: (repo: ProjectFactRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectFactRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  const runWorkUnitFactRepo = <A>(
    fn: (repo: WorkUnitFactRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* WorkUnitFactRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  const runProjectWorkUnitRepo = <A>(
    fn: (repo: ProjectWorkUnitRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* ProjectWorkUnitRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  it("reconstructs current project facts from immutable lineage", async () => {
    const oldRow = await runProjectFactRepo((repo) =>
      repo.createFactInstance({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
        valueJson: "P1",
      }),
    );

    const latestRow = await runProjectFactRepo((repo) =>
      repo.createFactInstance({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
        valueJson: "P0",
      }),
    );

    await runProjectFactRepo((repo) =>
      repo.supersedeFactInstance({
        projectFactInstanceId: oldRow.id,
        supersededByProjectFactInstanceId: latestRow.id,
      }),
    );

    await runProjectFactRepo((repo) =>
      repo.createFactInstance({
        projectId: "project-1",
        factDefinitionId: "project-fact-budget",
        valueJson: 5,
      }),
    );

    const currentPriority = await runProjectFactRepo((repo) =>
      repo.getCurrentValuesByDefinition({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
      }),
    );

    expect(currentPriority).toHaveLength(1);
    expect(currentPriority[0]?.id).toBe(latestRow.id);
    expect(currentPriority[0]?.valueJson).toBe("P0");

    const currentProjectFacts = await runProjectFactRepo((repo) =>
      repo.listFactsByProject({ projectId: "project-1" }),
    );

    expect(currentProjectFacts.map((row) => row.id)).toContain(latestRow.id);
    expect(currentProjectFacts.map((row) => row.id)).not.toContain(oldRow.id);
    expect(currentProjectFacts).toHaveLength(2);
  });

  it("supports primitive and work-unit-reference fact writes with direct references", async () => {
    const source = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );
    const target = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );
    const replacementTarget = await runProjectWorkUnitRepo((repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-1",
        currentStateId: "state-1",
      }),
    );

    const sourceWorkUnitId = source.id;
    const targetWorkUnitId = target.id;
    const replacementTargetWorkUnitId = replacementTarget.id;

    const primitiveRow = await runWorkUnitFactRepo((repo) =>
      repo.createFactInstance({
        projectWorkUnitId: sourceWorkUnitId,
        factDefinitionId: "wu-fact-score",
        valueJson: 10,
      }),
    );

    const firstReferenceRow = await runWorkUnitFactRepo((repo) =>
      repo.createFactInstance({
        projectWorkUnitId: sourceWorkUnitId,
        factDefinitionId: "wu-fact-link",
        referencedProjectWorkUnitId: targetWorkUnitId,
      }),
    );

    expect(firstReferenceRow.referencedProjectWorkUnitId).toBe(targetWorkUnitId);
    expect(firstReferenceRow.valueJson).toBeNull();

    const replacementReferenceRow = await runWorkUnitFactRepo((repo) =>
      repo.createFactInstance({
        projectWorkUnitId: sourceWorkUnitId,
        factDefinitionId: "wu-fact-link",
        referencedProjectWorkUnitId: replacementTargetWorkUnitId,
      }),
    );

    await runWorkUnitFactRepo((repo) =>
      repo.supersedeFactInstance({
        workUnitFactInstanceId: firstReferenceRow.id,
        supersededByWorkUnitFactInstanceId: replacementReferenceRow.id,
      }),
    );

    const currentReferences = await runWorkUnitFactRepo((repo) =>
      repo.getCurrentValuesByDefinition({
        projectWorkUnitId: sourceWorkUnitId,
        factDefinitionId: "wu-fact-link",
      }),
    );

    expect(currentReferences).toHaveLength(1);
    expect(currentReferences[0]?.id).toBe(replacementReferenceRow.id);
    expect(currentReferences[0]?.referencedProjectWorkUnitId).toBe(replacementTargetWorkUnitId);

    const listed = await runWorkUnitFactRepo((repo) =>
      repo.listFactsByWorkUnit({ projectWorkUnitId: sourceWorkUnitId }),
    );

    expect(listed.map((row) => row.id)).toContain(primitiveRow.id);
    expect(listed.map((row) => row.id)).toContain(replacementReferenceRow.id);
    expect(listed.map((row) => row.id)).not.toContain(firstReferenceRow.id);
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
    sql`INSERT INTO methodology_fact_definitions (id, methodology_version_id, key, fact_type, cardinality, default_value_json, description_json, guidance_json, validation_json, created_at, updated_at) VALUES ('project-fact-priority', 'version-1', 'priority', 'string', 'one', NULL, NULL, NULL, NULL, ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO methodology_fact_definitions (id, methodology_version_id, key, fact_type, cardinality, default_value_json, description_json, guidance_json, validation_json, created_at, updated_at) VALUES ('project-fact-budget', 'version-1', 'budget', 'number', 'one', NULL, NULL, NULL, NULL, ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_fact_definitions (id, methodology_version_id, work_unit_type_id, name, key, fact_type, cardinality, description, default_value_json, guidance_json, validation_json, created_at, updated_at) VALUES ('wu-fact-score', 'version-1', 'wu-type-1', 'Score', 'score', 'number', 'one', NULL, NULL, NULL, NULL, ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_fact_definitions (id, methodology_version_id, work_unit_type_id, name, key, fact_type, cardinality, description, default_value_json, guidance_json, validation_json, created_at, updated_at) VALUES ('wu-fact-link', 'version-1', 'wu-type-1', 'Link', 'link', 'work_unit_reference', 'one', NULL, NULL, NULL, NULL, ${Date.now()}, ${Date.now()})`,
  );
}
