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
  WorkflowContextFactRepository,
} from "@chiron/workflow-engine";

import { createProjectFactRepoLayer } from "../../runtime-repositories/project-fact-repository";
import { createProjectWorkUnitRepoLayer } from "../../runtime-repositories/project-work-unit-repository";
import { createWorkUnitFactRepoLayer } from "../../runtime-repositories/work-unit-fact-repository";
import { createWorkflowContextFactRepoLayer } from "../../runtime-repositories/workflow-context-fact-repository";
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
    work_unit_key TEXT NOT NULL,
    instance_number INTEGER NOT NULL,
    display_name TEXT,
    current_state_id TEXT NOT NULL,
    active_transition_execution_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
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
    current_step_execution_id TEXT,
    superseded_by_workflow_execution_id TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    superseded_at INTEGER
  )`,
  `CREATE TABLE methodology_workflow_context_fact_definitions (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_kind TEXT NOT NULL,
    label TEXT,
    description_json TEXT,
    cardinality TEXT NOT NULL,
    guidance_json TEXT,
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
  `CREATE TABLE workflow_execution_context_facts (
    id TEXT PRIMARY KEY,
    workflow_execution_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    instance_id TEXT NOT NULL,
    instance_order INTEGER NOT NULL,
    value_json TEXT,
    source_step_execution_id TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE workflow_execution_context_fact_records (
    id TEXT PRIMARY KEY,
    workflow_execution_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    instance_id TEXT,
    verb TEXT NOT NULL,
    value_json TEXT,
    source_step_execution_id TEXT,
    created_at INTEGER NOT NULL
  )`,
];

describe("runtime fact CRUD repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-runtime-fact-crud-${randomUUID()}.db`;
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
      createWorkflowContextFactRepoLayer(db),
    );

  const run = <A, S>(
    tag: { readonly Type: S },
    fn: (repo: S) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* tag as never;
        return yield* fn(repo as S);
      }).pipe(Effect.provide(runtimeLayer())),
    );

  it("assigns immutable work-unit keys, monotonic instance numbers, and many-only display names", async () => {
    const storyOne = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-story",
        displayName: "Alpha Story",
        currentStateId: "state-story",
      }),
    );
    const storyTwo = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-story",
        displayName: "Beta Story",
        currentStateId: "state-story",
      }),
    );
    const setup = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-setup",
        displayName: "Ignored",
        currentStateId: "state-setup",
      }),
    );

    expect(storyOne.workUnitKey).toBe("story-1");
    expect(storyOne.instanceNumber).toBe(1);
    expect(storyOne.displayName).toBe("Alpha Story");
    expect(storyTwo.workUnitKey).toBe("story-2");
    expect(storyTwo.instanceNumber).toBe(2);
    expect(storyTwo.displayName).toBe("Beta Story");
    expect(setup.workUnitKey).toBe("setup-1");
    expect(setup.instanceNumber).toBe(1);
    expect(setup.displayName).toBeNull();
  });

  it("updates and logically deletes project facts without crossing into hard-delete semantics", async () => {
    const created = await run(ProjectFactRepository, (repo) =>
      repo.createFactInstance({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
        valueJson: "P1",
      }),
    );

    const updated = await run(ProjectFactRepository, (repo) =>
      repo.updateFactInstance!({
        projectFactInstanceId: created.id,
        valueJson: "P0",
      }),
    );

    expect(updated?.valueJson).toBe("P0");

    const currentAfterUpdate = await run(ProjectFactRepository, (repo) =>
      repo.getCurrentValuesByDefinition({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
      }),
    );

    expect(currentAfterUpdate).toHaveLength(1);
    expect(currentAfterUpdate[0]?.id).toBe(updated?.id);

    const deleted = await run(ProjectFactRepository, (repo) =>
      repo.logicallyDeleteFactInstance!({ projectFactInstanceId: updated!.id }),
    );

    expect(deleted?.status).toBe("deleted");

    const currentAfterDelete = await run(ProjectFactRepository, (repo) =>
      repo.getCurrentValuesByDefinition({
        projectId: "project-1",
        factDefinitionId: "project-fact-priority",
      }),
    );

    expect(currentAfterDelete).toEqual([]);
  });

  it("updates and logically deletes work-unit facts while keeping family boundaries intact", async () => {
    const source = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-story",
        displayName: "Source Story",
        currentStateId: "state-story",
      }),
    );
    const target = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-story",
        displayName: "Target Story",
        currentStateId: "state-story",
      }),
    );
    const replacement = await run(ProjectWorkUnitRepository, (repo) =>
      repo.createProjectWorkUnit({
        projectId: "project-1",
        workUnitTypeId: "wu-type-story",
        displayName: "Replacement Story",
        currentStateId: "state-story",
      }),
    );

    const created = await run(WorkUnitFactRepository, (repo) =>
      repo.createFactInstance({
        projectWorkUnitId: source.id,
        factDefinitionId: "wu-fact-link",
        referencedProjectWorkUnitId: target.id,
      }),
    );

    const updated = await run(WorkUnitFactRepository, (repo) =>
      repo.updateFactInstance!({
        workUnitFactInstanceId: created.id,
        referencedProjectWorkUnitId: replacement.id,
      }),
    );

    expect(updated?.referencedProjectWorkUnitId).toBe(replacement.id);
    expect(updated?.valueJson).toBeNull();

    const currentAfterUpdate = await run(WorkUnitFactRepository, (repo) =>
      repo.getCurrentValuesByDefinition({
        projectWorkUnitId: source.id,
        factDefinitionId: "wu-fact-link",
      }),
    );

    expect(currentAfterUpdate).toHaveLength(1);
    expect(currentAfterUpdate[0]?.id).toBe(updated?.id);

    const deleted = await run(WorkUnitFactRepository, (repo) =>
      repo.logicallyDeleteFactInstance!({ workUnitFactInstanceId: updated!.id }),
    );

    expect(deleted?.status).toBe("deleted");

    const currentAfterDelete = await run(WorkUnitFactRepository, (repo) =>
      repo.getCurrentValuesByDefinition({
        projectWorkUnitId: source.id,
        factDefinitionId: "wu-fact-link",
      }),
    );

    expect(currentAfterDelete).toEqual([]);
  });

  it("supports workflow-context create/update/remove/delete with persisted CRUD records", async () => {
    const first = await run(WorkflowContextFactRepository, (repo) =>
      repo.createFactValue({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        valueJson: "Draft outline",
      }),
    );
    const second = await run(WorkflowContextFactRepository, (repo) =>
      repo.createFactValue({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        valueJson: "Review checklist",
      }),
    );

    expect(first.instanceOrder).toBe(0);
    expect(second.instanceOrder).toBe(1);

    const updated = await run(WorkflowContextFactRepository, (repo) =>
      repo.updateFactValue({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        instanceId: first.instanceId,
        valueJson: "Updated outline",
      }),
    );

    expect(updated?.instanceId).toBe(first.instanceId);
    expect(updated?.instanceOrder).toBe(0);

    const removed = await run(WorkflowContextFactRepository, (repo) =>
      repo.removeFactValue({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        instanceId: second.instanceId,
      }),
    );

    expect(removed).toBe(true);

    const recreated = await run(WorkflowContextFactRepository, (repo) =>
      repo.createFactValue({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
        valueJson: "Late note",
      }),
    );

    expect(recreated.instanceOrder).toBe(1);

    const currentAfterRemove = await run(WorkflowContextFactRepository, (repo) =>
      repo.listCurrentFactValuesByDefinition({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
      }),
    );

    expect(currentAfterRemove.map((row) => row.instanceOrder)).toEqual([0, 1]);
    expect(currentAfterRemove.map((row) => row.valueJson)).toEqual([
      "Updated outline",
      "Late note",
    ]);

    const deletedCount = await run(WorkflowContextFactRepository, (repo) =>
      repo.deleteFactValues({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
      }),
    );

    expect(deletedCount).toBe(2);

    const currentAfterDelete = await run(WorkflowContextFactRepository, (repo) =>
      repo.listCurrentFactValuesByDefinition({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
      }),
    );

    expect(currentAfterDelete).toEqual([]);

    const records = await run(WorkflowContextFactRepository, (repo) =>
      repo.listFactRecordsByDefinition({
        workflowExecutionId: "wfexec-1",
        contextFactDefinitionId: "ctx-notes",
      }),
    );

    expect(records.map((row) => row.verb)).toEqual([
      "create",
      "create",
      "update",
      "remove",
      "create",
      "delete",
    ]);
  });
});

async function seedAnchors(db: LibSQLDatabase<typeof schema>): Promise<void> {
  const now = Date.now();

  await db.run(
    sql`INSERT INTO projects (id, name, project_root_path, created_at, updated_at) VALUES ('project-1', 'Project 1', NULL, ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO methodology_work_unit_types (id, methodology_version_id, key, display_name, cardinality, created_at, updated_at) VALUES ('wu-type-story', 'version-1', 'story', 'Story', 'many_per_project', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO methodology_work_unit_types (id, methodology_version_id, key, display_name, cardinality, created_at, updated_at) VALUES ('wu-type-setup', 'version-1', 'setup', 'Setup', 'one_per_project', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_lifecycle_states (id, methodology_version_id, work_unit_type_id, key, display_name, created_at, updated_at) VALUES ('state-story', 'version-1', 'wu-type-story', 'todo', 'Todo', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_lifecycle_states (id, methodology_version_id, work_unit_type_id, key, display_name, created_at, updated_at) VALUES ('state-setup', 'version-1', 'wu-type-setup', 'todo', 'Todo', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO methodology_fact_definitions (id, methodology_version_id, key, fact_type, cardinality, created_at, updated_at) VALUES ('project-fact-priority', 'version-1', 'priority', 'string', 'one', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_fact_definitions (id, methodology_version_id, work_unit_type_id, name, key, fact_type, cardinality, created_at, updated_at) VALUES ('wu-fact-link', 'version-1', 'wu-type-story', 'Link', 'link', 'work_unit_reference', 'one', ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO project_work_units (id, project_id, work_unit_type_id, work_unit_key, instance_number, display_name, current_state_id, active_transition_execution_id, created_at, updated_at) VALUES ('seed-work-unit', 'project-1', 'wu-type-story', 'story-0', 0, NULL, 'state-story', NULL, ${now}, ${now})`,
  );
  await db.run(
    sql`INSERT INTO transition_executions (id, project_work_unit_id, transition_id, status, started_at) VALUES ('transition-1', 'seed-work-unit', 'transition-definition-1', 'active', ${now})`,
  );
  await db.run(
    sql`INSERT INTO workflow_executions (id, transition_execution_id, workflow_id, workflow_role, status, started_at) VALUES ('wfexec-1', 'transition-1', 'workflow-1', 'primary', 'active', ${now})`,
  );
  await db.run(
    sql`INSERT INTO methodology_workflow_context_fact_definitions (id, workflow_definition_id, fact_key, fact_kind, label, cardinality, created_at, updated_at) VALUES ('ctx-notes', 'workflow-1', 'notes', 'plain_fact', 'Notes', 'many', ${now}, ${now})`,
  );
}
