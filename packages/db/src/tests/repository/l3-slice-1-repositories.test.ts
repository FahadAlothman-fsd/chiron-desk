import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { MethodologyRepository } from "@chiron/methodology-engine";
import { createMethodologyRepoLayer } from "../../methodology-repository";
import * as schema from "../../schema";

const SCHEMA_SQL = [
  `CREATE TABLE methodology_versions (id TEXT PRIMARY KEY)`,
  `CREATE TABLE methodology_work_unit_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    metadata_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
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
    label TEXT,
    description_json TEXT,
    cardinality TEXT NOT NULL,
    guidance_json TEXT,
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
];

describe("l3 slice-1 methodology repository", () => {
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
      INSERT INTO methodology_work_unit_types (id, methodology_version_id, key)
      VALUES ('wut-1', 'version-1', 'WU.STORY')
    `);
    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, work_unit_type_id, key, display_name)
      VALUES ('workflow-1', 'version-1', 'wut-1', 'wu.story.setup', 'Story setup')
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const runRepo = <A>(
    fn: (repo: MethodologyRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* MethodologyRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createMethodologyRepoLayer(db))),
    );

  it("supports context-fact CRUD and editor-definition reads on the app-wired repo", async () => {
    await runRepo((repo) =>
      Effect.gen(function* () {
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "plain_value_fact",
            key: "summary",
            cardinality: "one",
            valueType: "string",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "definition_backed_external_fact",
            key: "repository_root",
            cardinality: "one",
            externalFactDefinitionId: "ext-root",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "bound_external_fact",
            key: "repository_type",
            cardinality: "one",
            externalFactDefinitionId: "ext-type",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "workflow_reference_fact",
            key: "supporting_workflows",
            cardinality: "many",
            allowedWorkflowDefinitionIds: ["wf-2", "wf-3"],
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "artifact_reference_fact",
            key: "prd_artifact",
            cardinality: "many",
            artifactSlotDefinitionId: "ART.PRD",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "work_unit_draft_spec_fact",
            key: "story_draft",
            cardinality: "many",
            workUnitTypeKey: "WU.STORY",
            includedFactKeys: ["title", "acceptance_criteria"],
          },
        });

        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });

        expect(facts.map((fact) => fact.kind).sort()).toEqual(
          [
            "artifact_reference_fact",
            "bound_external_fact",
            "definition_backed_external_fact",
            "plain_value_fact",
            "workflow_reference_fact",
            "work_unit_draft_spec_fact",
          ].sort(),
        );

        const createdStep = yield* repo.createFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "capture-context",
            label: "Capture context",
            descriptionJson: { markdown: "Collect reusable context" },
            fields: [
              {
                contextFactDefinitionId: "summary",
                fieldLabel: "Summary",
                fieldKey: "summary",
                helpText: "Required summary",
                required: true,
              },
            ],
          },
        });

        const updatedStep = yield* repo.updateFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          stepId: createdStep.stepId,
          payload: {
            key: "capture-context-v2",
            label: "Capture context v2",
            descriptionJson: { markdown: "Collect more reusable context" },
            fields: [
              {
                contextFactDefinitionId: "summary",
                fieldLabel: "Summary",
                fieldKey: "summary",
                helpText: "Required summary",
                required: true,
              },
              {
                contextFactDefinitionId: "supporting_workflows",
                fieldLabel: "Supporting workflows",
                fieldKey: "supportingWorkflows",
                helpText: null,
                required: false,
                uiMultiplicityMode: "one",
              },
            ],
          },
        });

        expect(updatedStep.payload.fields).toHaveLength(2);

        const editor = yield* repo.getWorkflowEditorDefinition({
          versionId: "version-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "workflow-1",
        });

        expect(editor.contextFacts.map((fact) => fact.key)).toContain("summary");
        expect(editor.formDefinitions).toEqual([
          {
            stepId: createdStep.stepId,
            payload: updatedStep.payload,
          },
        ]);
        expect(editor.steps).toContainEqual({
          stepId: createdStep.stepId,
          stepType: "form",
          payload: updatedStep.payload,
        });

        const deleteAttempt = yield* Effect.either(
          repo.deleteWorkflowContextFactByDefinitionId({
            versionId: "version-1",
            workflowDefinitionId: "workflow-1",
            factKey: "summary",
          }),
        );
        expect(deleteAttempt._tag).toBe("Left");

        yield* repo.deleteFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          stepId: createdStep.stepId,
        });

        yield* repo.deleteWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          factKey: "summary",
        });

        const remainingFacts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });
        expect(remainingFacts.map((fact) => fact.key)).not.toContain("summary");
      }),
    );
  });

  it("rewires shell-step edges deterministically for form-step insert/delete", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_steps (id, methodology_version_id, workflow_id, key, type, display_name)
      VALUES
        ('step-start', 'version-1', 'workflow-1', 'start', 'display', 'Start'),
        ('step-agent', 'version-1', 'workflow-1', 'agent', 'agent', 'Agent')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_edges (id, methodology_version_id, workflow_id, from_step_id, to_step_id)
      VALUES ('edge-1', 'version-1', 'workflow-1', 'step-start', 'step-agent')
    `);

    await runRepo((repo) =>
      Effect.gen(function* () {
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "plain_value_fact",
            key: "summary",
            cardinality: "one",
            valueType: "string",
          },
        });

        const inserted = yield* repo.createFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: "start",
          payload: {
            key: "capture",
            label: "Capture",
            fields: [
              {
                contextFactDefinitionId: "summary",
                fieldLabel: "Summary",
                fieldKey: "summary",
                helpText: null,
                required: true,
              },
            ],
          },
        });

        const editorAfterInsert = yield* repo.getWorkflowEditorDefinition({
          versionId: "version-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "workflow-1",
        });

        expect(
          editorAfterInsert.edges
            .map((edge) => [edge.fromStepKey, edge.toStepKey] as const)
            .sort((a, b) =>
              `${a[0] ?? ""}->${a[1] ?? ""}`.localeCompare(`${b[0] ?? ""}->${b[1] ?? ""}`),
            ),
        ).toEqual([
          ["capture", "agent"],
          ["start", "capture"],
        ]);

        yield* repo.deleteFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          stepId: inserted.stepId,
        });

        const editorAfterDelete = yield* repo.getWorkflowEditorDefinition({
          versionId: "version-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "workflow-1",
        });

        expect(editorAfterDelete.edges.map((edge) => [edge.fromStepKey, edge.toStepKey])).toEqual([
          ["start", "agent"],
        ]);
      }),
    );
  });
});
