import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { sql } from "drizzle-orm";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import {
  ExecutionReadRepository,
  ProjectWorkUnitRepository,
  TransitionExecutionRepository,
  WorkflowExecutionRepository,
  type WorkflowExecutionRow,
} from "@chiron/workflow-engine";

import { createExecutionReadRepoLayer } from "../../runtime-repositories/execution-read-repository";
import { createProjectWorkUnitRepoLayer } from "../../runtime-repositories/project-work-unit-repository";
import { createTransitionExecutionRepoLayer } from "../../runtime-repositories/transition-execution-repository";
import { createWorkflowExecutionRepoLayer } from "../../runtime-repositories/workflow-execution-repository";
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
  `CREATE TABLE work_unit_lifecycle_transitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    transition_key TEXT NOT NULL,
    from_state_id TEXT,
    to_state_id TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, transition_key)
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    display_name TEXT,
    metadata_json TEXT,
    guidance_json TEXT,
    definition_json TEXT,
    execution_modes_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
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
];

describe("runtime execution repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-runtime-executions-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await seedRuntimeAnchors(db);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const runtimeLayer = () =>
    Layer.mergeAll(
      createProjectWorkUnitRepoLayer(db),
      createTransitionExecutionRepoLayer(db),
      createWorkflowExecutionRepoLayer(db),
      createExecutionReadRepoLayer(db),
    );

  const run = <A>(
    program: Effect.Effect<
      A,
      unknown,
      | ProjectWorkUnitRepository
      | TransitionExecutionRepository
      | WorkflowExecutionRepository
      | ExecutionReadRepository
    >,
  ): Promise<A> => Effect.runPromise(program.pipe(Effect.provide(runtimeLayer())));

  it("switch supersedes active transition and prevents double-active transitions", async () => {
    const workUnit = await run(
      Effect.gen(function* () {
        const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
        return yield* projectWorkUnitRepo.createProjectWorkUnit({
          projectId: "project-1",
          workUnitTypeId: "wu-type-1",
          currentStateId: "state-1",
        });
      }),
    );

    const first = await run(
      Effect.gen(function* () {
        const transitionRepo = yield* TransitionExecutionRepository;
        return yield* transitionRepo.startTransitionExecution({
          projectWorkUnitId: workUnit.id,
          transitionId: "transition-1",
        });
      }),
    );

    const switched = await run(
      Effect.gen(function* () {
        const transitionRepo = yield* TransitionExecutionRepository;
        return yield* transitionRepo.switchActiveTransitionExecution({
          projectWorkUnitId: workUnit.id,
          transitionId: "transition-2",
        });
      }),
    );

    expect(switched.superseded?.id).toBe(first.id);
    expect(switched.superseded?.status).toBe("superseded");

    const transitions = await run(
      Effect.gen(function* () {
        const readRepo = yield* ExecutionReadRepository;
        return yield* readRepo.listTransitionExecutionsForWorkUnit(workUnit.id);
      }),
    );

    const activeTransitions = transitions.filter((row) => row.status === "active");
    expect(activeTransitions).toHaveLength(1);
    expect(activeTransitions[0]?.id).toBe(switched.started.id);
  });

  it("retry supersedes prior workflow and keeps single active primary attempt", async () => {
    const workUnit = await run(
      Effect.gen(function* () {
        const projectWorkUnitRepo = yield* ProjectWorkUnitRepository;
        return yield* projectWorkUnitRepo.createProjectWorkUnit({
          projectId: "project-1",
          workUnitTypeId: "wu-type-1",
          currentStateId: "state-1",
        });
      }),
    );

    const transition = await run(
      Effect.gen(function* () {
        const transitionRepo = yield* TransitionExecutionRepository;
        return yield* transitionRepo.startTransitionExecution({
          projectWorkUnitId: workUnit.id,
          transitionId: "transition-1",
        });
      }),
    );

    const firstWorkflow = await run(
      Effect.gen(function* () {
        const workflowRepo = yield* WorkflowExecutionRepository;
        return yield* workflowRepo.createWorkflowExecution({
          transitionExecutionId: transition.id,
          workflowId: "workflow-1",
          workflowRole: "primary",
          status: "active",
        });
      }),
    );

    await run(
      Effect.gen(function* () {
        const workflowRepo = yield* WorkflowExecutionRepository;
        return yield* workflowRepo.updateTransitionPrimaryWorkflowExecutionPointer({
          transitionExecutionId: transition.id,
          primaryWorkflowExecutionId: firstWorkflow.id,
        });
      }),
    );

    const retried = await run(
      Effect.gen(function* () {
        const workflowRepo = yield* WorkflowExecutionRepository;
        return yield* workflowRepo.retryWorkflowExecution(firstWorkflow.id);
      }),
    );

    expect(retried).not.toBeNull();
    expect(retried?.superseded.id).toBe(firstWorkflow.id);
    expect(retried?.superseded.status).toBe("superseded");
    expect(retried?.retried.status).toBe("active");
    expect(retried?.retried.workflowId).toBe(firstWorkflow.workflowId);

    const allWorkflows: readonly WorkflowExecutionRow[] = await run(
      Effect.gen(function* () {
        const readRepo = yield* ExecutionReadRepository;
        return yield* readRepo.listWorkflowExecutionsForTransition(transition.id);
      }),
    );

    const activePrimary = allWorkflows.filter(
      (row) => row.workflowRole === "primary" && row.status === "active",
    );
    expect(activePrimary).toHaveLength(1);
    expect(activePrimary[0]?.id).toBe(retried?.retried.id);

    const transitionDetail = await run(
      Effect.gen(function* () {
        const readRepo = yield* ExecutionReadRepository;
        return yield* readRepo.getTransitionExecutionDetail(transition.id);
      }),
    );
    expect(transitionDetail?.primaryWorkflowExecution?.id).toBe(retried?.retried.id);
  });
});

async function seedRuntimeAnchors(db: LibSQLDatabase<typeof schema>): Promise<void> {
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
    sql`INSERT INTO work_unit_lifecycle_transitions (id, methodology_version_id, work_unit_type_id, transition_key, from_state_id, to_state_id, created_at, updated_at) VALUES ('transition-1', 'version-1', 'wu-type-1', 'start', NULL, 'state-1', ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO work_unit_lifecycle_transitions (id, methodology_version_id, work_unit_type_id, transition_key, from_state_id, to_state_id, created_at, updated_at) VALUES ('transition-2', 'version-1', 'wu-type-1', 'switch', 'state-1', 'state-1', ${Date.now()}, ${Date.now()})`,
  );
  await db.run(
    sql`INSERT INTO methodology_workflows (id, methodology_version_id, work_unit_type_id, key, display_name, metadata_json, guidance_json, definition_json, execution_modes_json, created_at, updated_at) VALUES ('workflow-1', 'version-1', 'wu-type-1', 'wf-1', 'WF 1', NULL, NULL, '{}', NULL, ${Date.now()}, ${Date.now()})`,
  );
}
