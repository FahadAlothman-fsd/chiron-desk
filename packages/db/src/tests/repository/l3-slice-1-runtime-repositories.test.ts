import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { StepExecutionRepository } from "@chiron/workflow-engine";

import { createStepExecutionRepoLayer } from "../../runtime-repositories/step-execution-repository";
import * as schema from "../../schema";

const SCHEMA_SQL = [
  `CREATE TABLE methodology_workflows (id TEXT PRIMARY KEY, methodology_version_id TEXT NOT NULL, key TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE methodology_workflow_steps (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    display_name TEXT,
    config_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_edges (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    from_step_id TEXT,
    to_step_id TEXT,
    edge_key TEXT,
    condition_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE transition_executions (
    id TEXT PRIMARY KEY,
    project_work_unit_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL
  )`,
  `CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY,
    transition_execution_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_role TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_form_steps (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT,
    description_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE step_executions (
    id TEXT PRIMARY KEY,
    workflow_execution_id TEXT NOT NULL,
    step_definition_id TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL,
    activated_at INTEGER NOT NULL,
    completed_at INTEGER,
    progression_data TEXT
  )`,
  `CREATE TABLE form_step_execution_state (
    id TEXT PRIMARY KEY,
    step_execution_id TEXT NOT NULL,
    draft_values_json TEXT,
    submitted_snapshot_json TEXT,
    submitted_at INTEGER
  )`,
  `CREATE TABLE workflow_execution_context_facts (
    id TEXT PRIMARY KEY,
    workflow_execution_id TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_kind TEXT NOT NULL,
    value_json TEXT,
    source_step_execution_id TEXT
  )`,
];

describe("l3 slice-1 runtime repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-slice-1-runtime-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });
    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, key, created_at, updated_at)
      VALUES ('workflow-1', 'version-1', 'wu.setup.form', strftime('%s','now') * 1000, strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_steps (
        id, methodology_version_id, workflow_id, key, type, display_name, config_json, guidance_json, created_at, updated_at
      ) VALUES
        ('step-1', 'version-1', 'workflow-1', 'capture', 'form', 'Capture', NULL, NULL, strftime('%s','now') * 1000, strftime('%s','now') * 1000),
        ('step-2', 'version-1', 'workflow-1', 'confirm', 'form', 'Confirm', NULL, NULL, strftime('%s','now') * 1000, strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_edges (
        id, methodology_version_id, workflow_id, from_step_id, to_step_id, edge_key, condition_json, guidance_json, created_at, updated_at
      ) VALUES
        ('edge-1', 'version-1', 'workflow-1', 'step-1', 'step-2', 'capture->confirm', NULL, NULL, strftime('%s','now') * 1000, strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO transition_executions (id, project_work_unit_id, transition_id, status, started_at)
      VALUES ('tx-1', 'wu-1', 'transition-1', 'active', strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO workflow_executions (id, transition_execution_id, workflow_id, workflow_role, status, started_at)
      VALUES ('wfexec-1', 'tx-1', 'workflow-1', 'primary', 'active', strftime('%s','now') * 1000)
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const run = <A>(program: Effect.Effect<A, unknown, StepExecutionRepository>): Promise<A> =>
    Effect.runPromise(program.pipe(Effect.provide(createStepExecutionRepoLayer(db))));

  it("persists lifecycle rows, form state, context facts, and topology reads", async () => {
    const result = await run(
      Effect.gen(function* () {
        const repo = yield* StepExecutionRepository;

        const stepExecution = yield* repo.createStepExecution({
          workflowExecutionId: "wfexec-1",
          stepDefinitionId: "step-1",
          stepType: "form",
          status: "active",
          progressionData: { activation: "first_step" },
        });

        const lookup = yield* repo.findStepExecutionByWorkflowAndDefinition({
          workflowExecutionId: "wfexec-1",
          stepDefinitionId: "step-1",
        });

        const completed = yield* repo.completeStepExecution({
          stepExecutionId: stepExecution.id,
          progressionData: { progressedTo: "step-2" },
        });

        const state = yield* repo.upsertFormStepExecutionState({
          stepExecutionId: stepExecution.id,
          draftValuesJson: { initiativeName: "Chiron" },
          submittedSnapshotJson: { initiativeName: "Chiron" },
          submittedAt: new Date(),
        });

        const contextFact = yield* repo.writeWorkflowExecutionContextFact({
          workflowExecutionId: "wfexec-1",
          factKey: "initiative_name",
          factKind: "plain_value",
          valueJson: "Chiron",
          sourceStepExecutionId: stepExecution.id,
        });

        const listedFacts = yield* repo.listWorkflowExecutionContextFacts("wfexec-1");
        const stepDefs = yield* repo.listWorkflowStepDefinitions("workflow-1");
        const edges = yield* repo.listWorkflowEdges("workflow-1");

        return { lookup, completed, state, contextFact, listedFacts, stepDefs, edges };
      }),
    );

    expect(result.lookup?.id).toBeDefined();
    expect(result.completed?.status).toBe("completed");
    expect(result.state.submittedSnapshotJson).toMatchObject({ initiativeName: "Chiron" });
    expect(result.contextFact.factKey).toBe("initiative_name");
    expect(result.listedFacts).toHaveLength(1);
    expect(result.stepDefs.map((row) => row.id)).toEqual(["step-1", "step-2"]);
    expect(result.edges.map((row) => row.id)).toEqual(["edge-1"]);
  });
});
