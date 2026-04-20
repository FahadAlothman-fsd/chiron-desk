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
  `CREATE TABLE work_unit_fact_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    name TEXT,
    key TEXT NOT NULL,
    fact_type TEXT NOT NULL,
    cardinality TEXT NOT NULL,
    description_json TEXT,
    guidance_json TEXT,
    default_value_json TEXT,
    validation_json TEXT
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
    value_type TEXT NOT NULL,
    validation_json TEXT
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
  `CREATE TABLE methodology_workflow_context_fact_work_unit_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    link_type_definition_id TEXT,
    target_work_unit_definition_id TEXT
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_specs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    work_unit_definition_id TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_selections (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    selection_type TEXT NOT NULL,
    definition_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL
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
      INSERT INTO work_unit_fact_definitions (id, methodology_version_id, work_unit_type_id, name, key, fact_type, cardinality, description_json, guidance_json, default_value_json, validation_json)
      VALUES
        ('fact-title', 'version-1', 'wut-1', 'Title', 'title', 'string', 'one', NULL, NULL, NULL, NULL),
        ('fact-acceptance-criteria', 'version-1', 'wut-1', 'Acceptance Criteria', 'acceptance_criteria', 'json', 'many', NULL, NULL, NULL, NULL)
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
            kind: "plain_fact",
            contextFactDefinitionId: "ctx-summary",
            key: "summary",
            label: "Summary",
            descriptionJson: { markdown: "Reusable summary for downstream workflow steps" },
            guidance: {
              human: { markdown: "Capture the reusable summary." },
              agent: { markdown: "Preserve the authored summary." },
            },
            cardinality: "one",
            type: "string",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "bound_fact",
            key: "repository_root",
            cardinality: "one",
            factDefinitionId: "ext-root",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "bound_fact",
            key: "repository_type",
            cardinality: "one",
            factDefinitionId: "ext-type",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "workflow_ref_fact",
            contextFactDefinitionId: "ctx-supporting-workflows",
            key: "supporting_workflows",
            cardinality: "many",
            allowedWorkflowDefinitionIds: ["wf-2", "wf-3"],
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "artifact_slot_reference_fact",
            key: "prd_artifact",
            cardinality: "many",
            slotDefinitionId: "ART.PRD",
          },
        });
        yield* repo.createWorkflowContextFactByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fact: {
            kind: "work_unit_draft_spec_fact",
            key: "story_draft",
            cardinality: "many",
            workUnitDefinitionId: "wut-1",
            selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-acceptance-criteria"],
            selectedArtifactSlotDefinitionIds: [],
          },
        });

        const facts = yield* repo.listWorkflowContextFactsByDefinitionId({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });
        const summaryFactId = facts.find((fact) => fact.key === "summary")?.contextFactDefinitionId;
        const supportingWorkflowsFactId = facts.find(
          (fact) => fact.key === "supporting_workflows",
        )?.contextFactDefinitionId;

        expect(summaryFactId).toEqual(expect.any(String));
        expect(supportingWorkflowsFactId).toEqual(expect.any(String));

        expect(facts.map((fact) => fact.kind).sort()).toEqual(
          [
            "artifact_slot_reference_fact",
            "bound_fact",
            "bound_fact",
            "plain_fact",
            "workflow_ref_fact",
            "work_unit_draft_spec_fact",
          ].sort(),
        );
        expect(facts).toContainEqual({
          kind: "plain_fact",
          contextFactDefinitionId: expect.any(String),
          key: "summary",
          label: "Summary",
          descriptionJson: { markdown: "Reusable summary for downstream workflow steps" },
          guidance: {
            human: { markdown: "Capture the reusable summary." },
            agent: { markdown: "Preserve the authored summary." },
          },
          cardinality: "one",
          type: "string",
        });
        expect(facts).toContainEqual({
          kind: "workflow_ref_fact",
          contextFactDefinitionId: expect.any(String),
          key: "supporting_workflows",
          cardinality: "many",
          allowedWorkflowDefinitionIds: ["wf-2", "wf-3"],
        });

        const createdStep = yield* repo.createFormStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "capture-context",
            label: "Capture context",
            descriptionJson: { markdown: "Collect reusable context" },
            guidance: {
              human: { markdown: "Ask for the reusable context." },
              agent: { markdown: "Normalize the reusable context." },
            },
            fields: [
              {
                contextFactDefinitionId: summaryFactId!,
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
            guidance: {
              human: { markdown: "Confirm the reusable context." },
              agent: { markdown: "Keep workflow references ordered." },
            },
            fields: [
              {
                contextFactDefinitionId: summaryFactId!,
                fieldLabel: "Summary",
                fieldKey: "summary",
                helpText: "Required summary",
                required: true,
              },
              {
                contextFactDefinitionId: supportingWorkflowsFactId!,
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
        expect(editor.contextFacts).toContainEqual({
          kind: "plain_fact",
          contextFactDefinitionId: expect.any(String),
          key: "summary",
          label: "Summary",
          descriptionJson: { markdown: "Reusable summary for downstream workflow steps" },
          guidance: {
            human: { markdown: "Capture the reusable summary." },
            agent: { markdown: "Preserve the authored summary." },
          },
          cardinality: "one",
          type: "string",
        });
        expect(editor.formDefinitions).toEqual([
          {
            stepId: createdStep.stepId,
            payload: expect.objectContaining({
              key: "capture-context-v2",
              label: "Capture context v2",
              descriptionJson: { markdown: "Collect more reusable context" },
              guidance: {
                human: { markdown: "Confirm the reusable context." },
                agent: { markdown: "Keep workflow references ordered." },
              },
              fields: expect.arrayContaining([
                expect.objectContaining({
                  contextFactDefinitionId: expect.any(String),
                  fieldLabel: "Summary",
                  fieldKey: "summary",
                }),
                expect.objectContaining({
                  contextFactDefinitionId: expect.any(String),
                  fieldLabel: "Supporting workflows",
                  fieldKey: "supportingWorkflows",
                  uiMultiplicityMode: "one",
                }),
              ]),
            }),
          },
        ]);
        expect(editor.steps).toContainEqual(
          expect.objectContaining({
            stepId: createdStep.stepId,
            stepType: "form",
            payload: expect.objectContaining({
              key: "capture-context-v2",
              fields: expect.arrayContaining([
                expect.objectContaining({ fieldKey: "summary" }),
                expect.objectContaining({ fieldKey: "supportingWorkflows" }),
              ]),
            }),
          }),
        );

        const deleteAttempt = yield* Effect.either(
          repo.deleteWorkflowContextFactByDefinitionId({
            versionId: "version-1",
            workflowDefinitionId: "workflow-1",
            contextFactDefinitionId: summaryFactId!,
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
          contextFactDefinitionId: summaryFactId!,
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
            kind: "plain_fact",
            contextFactDefinitionId: "ctx-summary",
            key: "summary",
            cardinality: "one",
            type: "string",
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
                contextFactDefinitionId: "ctx-summary",
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

  it("supports workflow edge mutations on the app-wired repo", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_steps (id, methodology_version_id, workflow_id, key, type, display_name)
      VALUES
        ('step-a', 'version-1', 'workflow-1', 'step-a', 'form', 'Step A'),
        ('step-b', 'version-1', 'workflow-1', 'step-b', 'form', 'Step B'),
        ('step-c', 'version-1', 'workflow-1', 'step-c', 'form', 'Step C')
    `);

    await runRepo((repo) =>
      Effect.gen(function* () {
        const created = yield* repo.createWorkflowEdgeByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          fromStepKey: "step-a",
          toStepKey: "step-b",
          descriptionJson: { markdown: "A to B" },
        });

        expect(created).toMatchObject({
          fromStepKey: "step-a",
          toStepKey: "step-b",
          descriptionJson: { markdown: "A to B" },
        });

        const listedAfterCreate = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });
        expect(listedAfterCreate).toHaveLength(1);

        const updated = yield* repo.updateWorkflowEdgeByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          edgeId: created.edgeId,
          fromStepKey: "step-a",
          toStepKey: "step-c",
          descriptionJson: { markdown: "A to C" },
        });

        expect(updated).toMatchObject({
          edgeId: created.edgeId,
          fromStepKey: "step-a",
          toStepKey: "step-c",
          descriptionJson: { markdown: "A to C" },
        });

        const listedAfterUpdate = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });
        expect(listedAfterUpdate).toEqual([
          expect.objectContaining({
            edgeId: created.edgeId,
            fromStepKey: "step-a",
            toStepKey: "step-c",
            descriptionJson: { markdown: "A to C" },
          }),
        ]);

        yield* repo.deleteWorkflowEdgeByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          edgeId: created.edgeId,
        });

        const listedAfterDelete = yield* repo.listWorkflowEdgesByDefinitionId!({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
        });
        expect(listedAfterDelete).toEqual([]);
      }),
    );
  });
});
