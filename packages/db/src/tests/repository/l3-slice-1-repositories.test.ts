import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect, Layer } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import {
  FormStepRepository,
  createFormStepRepoLayer,
} from "../../repositories/form-step-repository";
import {
  WorkflowContextFactRepository,
  createWorkflowContextFactRepoLayer,
} from "../../repositories/workflow-context-fact-repository";
import {
  StepExecutionRepository,
  createStepExecutionRepoLayer,
} from "../../repositories/step-execution-repository";
import * as schema from "../../schema";

const SCHEMA_SQL = [
  `CREATE TABLE methodology_versions (id TEXT PRIMARY KEY)`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_steps (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
    display_name TEXT,
    config_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE methodology_workflow_form_steps (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT,
    description_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE methodology_workflow_form_fields (
    id TEXT PRIMARY KEY,
    form_step_id TEXT NOT NULL,
    key TEXT NOT NULL,
    label TEXT,
    value_type TEXT NOT NULL,
    required INTEGER NOT NULL,
    input_json TEXT NOT NULL,
    description_json TEXT,
    sort_order INTEGER NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_definitions (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_kind TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE methodology_workflow_context_fact_plain_values (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    value_type TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_external_bindings (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    binding_key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_workflow_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    workflow_definition_id TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_work_unit_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    work_unit_type_key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_artifact_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    artifact_slot_key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_specs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_fields (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    value_type TEXT NOT NULL,
    required INTEGER NOT NULL,
    description_json TEXT
  )`,
  `CREATE TABLE workflow_executions (
    id TEXT PRIMARY KEY,
    transition_execution_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    workflow_role TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at INTEGER NOT NULL
  )`,
  `CREATE TABLE step_executions (
    id TEXT PRIMARY KEY,
    workflow_execution_id TEXT NOT NULL,
    step_definition_id TEXT NOT NULL,
    step_type TEXT NOT NULL,
    status TEXT NOT NULL,
    activated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
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

describe("l3 slice-1 repositories", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-slice-1-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });
    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`INSERT INTO methodology_versions (id) VALUES ('version-1')`);
    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, key, display_name, created_at, updated_at)
      VALUES ('workflow-1', 'version-1', 'wu.setup.form', 'Setup workflow', strftime('%s','now') * 1000, strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO workflow_executions (id, transition_execution_id, workflow_id, workflow_role, status, started_at)
      VALUES ('wexec-1', 'tx-1', 'workflow-1', 'primary', 'active', strftime('%s','now') * 1000)
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const run = <A>(
    program: Effect.Effect<
      A,
      unknown,
      FormStepRepository | WorkflowContextFactRepository | StepExecutionRepository
    >,
  ): Promise<A> =>
    Effect.runPromise(
      program.pipe(
        Effect.provide(
          Layer.mergeAll(
            createFormStepRepoLayer(db),
            createWorkflowContextFactRepoLayer(db),
            createStepExecutionRepoLayer(db),
          ),
        ),
      ),
    );

  it("persists and updates form steps/fields", async () => {
    const created = await run(
      Effect.gen(function* () {
        const repo = yield* FormStepRepository;
        return yield* repo.createFormStep({
          workflowId: "workflow-1",
          stepDefinition: {
            key: "capture-setup-context",
            label: "Capture setup context",
            descriptionJson: { markdown: "Collect baseline setup facts" },
            fields: [
              {
                key: "initiativeName",
                label: "Initiative",
                valueType: "string",
                required: true,
                inputJson: { kind: "text", multiline: false },
                descriptionJson: { markdown: "Team-visible initiative title" },
                sortOrder: 0,
              },
            ],
          },
        });
      }),
    );

    expect(created.fields).toHaveLength(1);

    const updated = await run(
      Effect.gen(function* () {
        const repo = yield* FormStepRepository;
        return yield* repo.updateFormStep({
          formStepId: created.formStep.id,
          stepDefinition: {
            key: "capture-setup-context",
            label: "Capture setup context (v2)",
            descriptionJson: { markdown: "Updated" },
            fields: [],
          },
        });
      }),
    );
    expect(updated?.formStep.label).toBe("Capture setup context (v2)");
  });

  it("enforces one outgoing edge invariant per step", async () => {
    const [stepA, stepB, stepC] = await run(
      Effect.gen(function* () {
        const repo = yield* FormStepRepository;
        const a = yield* repo.createFormStep({
          workflowId: "workflow-1",
          stepDefinition: { key: "a", label: null, descriptionJson: null, fields: [] },
        });
        const b = yield* repo.createFormStep({
          workflowId: "workflow-1",
          stepDefinition: { key: "b", label: null, descriptionJson: null, fields: [] },
        });
        const c = yield* repo.createFormStep({
          workflowId: "workflow-1",
          stepDefinition: { key: "c", label: null, descriptionJson: null, fields: [] },
        });
        return [a.formStep, b.formStep, c.formStep] as const;
      }),
    );

    await run(
      Effect.gen(function* () {
        const repo = yield* FormStepRepository;
        yield* repo.createEdge({
          workflowId: "workflow-1",
          fromStepId: stepA.id,
          toStepId: stepB.id,
          edgeKey: "a->b",
        });
      }),
    );

    await expect(
      run(
        Effect.gen(function* () {
          const repo = yield* FormStepRepository;
          yield* repo.createEdge({
            workflowId: "workflow-1",
            fromStepId: stepA.id,
            toStepId: stepC.id,
            edgeKey: "a->c",
          });
        }),
      ),
    ).rejects.toThrow(/An error has occurred/);
  });

  it("persists all 7 context-fact kinds", async () => {
    const keys = await run(
      Effect.gen(function* () {
        const repo = yield* WorkflowContextFactRepository;

        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "plain.fact",
          factKind: "plain_value",
          payload: { valueType: "string" },
        });
        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "external.fact",
          factKind: "external_binding",
          payload: { provider: "project", bindingKey: "projectRootPath" },
        });
        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "wf.ref",
          factKind: "workflow_reference",
          payload: { workflowDefinitionId: "workflow-2" },
        });
        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "wu.ref",
          factKind: "work_unit_reference",
          payload: { workUnitTypeKey: "WU.STORY" },
        });
        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "artifact.ref",
          factKind: "artifact_reference",
          payload: { artifactSlotKey: "ART.PRD" },
        });
        const draftSpec = yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "draft.spec",
          factKind: "draft_spec",
          payload: {},
        });
        yield* repo.createContextFactDefinition({
          workflowId: "workflow-1",
          factKey: "draft.spec.field",
          factKind: "draft_spec_field",
          payload: {
            draftSpecId: draftSpec.id,
            fieldKey: "title",
            valueType: "string",
            required: true,
            descriptionJson: { markdown: "Story title" },
          },
        });

        const rows = yield* repo.listContextFactDefinitions("workflow-1");
        return rows.map((row) => row.factKind).toSorted();
      }),
    );

    expect(keys).toEqual([
      "artifact_reference",
      "draft_spec",
      "draft_spec_field",
      "external_binding",
      "plain_value",
      "work_unit_reference",
      "workflow_reference",
    ]);
  });

  it("persists runtime step execution state and context facts", async () => {
    const state = await run(
      Effect.gen(function* () {
        const formRepo = yield* FormStepRepository;
        const runtimeRepo = yield* StepExecutionRepository;

        const step = yield* formRepo.createFormStep({
          workflowId: "workflow-1",
          stepDefinition: { key: "setup", label: "Setup", descriptionJson: null, fields: [] },
        });

        const execution = yield* runtimeRepo.createStepExecution({
          workflowExecutionId: "wexec-1",
          stepDefinitionId: step.formStep.id,
          stepType: "form",
          status: "active",
          progressionData: { stage: "collecting" },
        });

        yield* runtimeRepo.upsertFormStepExecutionState({
          stepExecutionId: execution.id,
          draftValuesJson: { initiativeName: "Chiron" },
          submittedSnapshotJson: { initiativeName: "Chiron" },
          submittedAt: new Date(),
        });

        yield* runtimeRepo.writeWorkflowExecutionContextFact({
          workflowExecutionId: "wexec-1",
          factKey: "initiative_name",
          factKind: "plain_value",
          valueJson: "Chiron",
          sourceStepExecutionId: execution.id,
        });

        return yield* runtimeRepo.getFormStepExecutionState(execution.id);
      }),
    );

    expect(state?.draftValuesJson).toMatchObject({ initiativeName: "Chiron" });
    expect(state?.submittedSnapshotJson).toMatchObject({ initiativeName: "Chiron" });
  });
});
