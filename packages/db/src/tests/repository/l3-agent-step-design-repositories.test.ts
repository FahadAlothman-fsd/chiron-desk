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
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    UNIQUE(workflow_id, key)
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
  `CREATE TABLE methodology_workflow_agent_steps (
     step_id TEXT PRIMARY KEY,
     objective TEXT NOT NULL,
     instructions_markdown TEXT NOT NULL,
     harness TEXT NOT NULL DEFAULT 'opencode',
     agent_key TEXT,
     model_json TEXT,
     completion_requirements_json TEXT NOT NULL DEFAULT '[]',
    session_start TEXT NOT NULL DEFAULT 'explicit',
    continuation_mode TEXT NOT NULL DEFAULT 'bootstrap_only',
    live_stream_count INTEGER NOT NULL DEFAULT 1,
    native_message_log INTEGER NOT NULL DEFAULT 0,
    persisted_write_policy TEXT NOT NULL DEFAULT 'applied_only',
    FOREIGN KEY(step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_agent_step_explicit_read_grants (
    id TEXT PRIMARY KEY,
    agent_step_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    FOREIGN KEY(agent_step_id) REFERENCES methodology_workflow_agent_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(agent_step_id, context_fact_definition_id)
  )`,
  `CREATE TABLE methodology_workflow_agent_step_write_items (
    id TEXT PRIMARY KEY,
    agent_step_id TEXT NOT NULL,
    write_item_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    context_fact_kind TEXT NOT NULL,
    label TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(agent_step_id) REFERENCES methodology_workflow_agent_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(agent_step_id, write_item_id),
    UNIQUE(agent_step_id, context_fact_definition_id)
  )`,
  `CREATE TABLE methodology_workflow_agent_step_write_item_requirements (
    id TEXT PRIMARY KEY,
    write_item_row_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    FOREIGN KEY(write_item_row_id) REFERENCES methodology_workflow_agent_step_write_items(id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(write_item_row_id, context_fact_definition_id)
  )`,
];

describe("l3 agent-step design repository", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-agent-step-design-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    await client.execute("PRAGMA foreign_keys = ON");
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
      VALUES ('workflow-1', 'version-1', 'wut-1', 'wu.story.agent', 'Story agent workflow')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (
        id, workflow_definition_id, fact_key, fact_kind, label, cardinality
      ) VALUES
        ('ctx-project-context', 'workflow-1', 'project_context', 'plain_value_fact', 'Project context', 'one'),
        ('ctx-prd-artifact', 'workflow-1', 'prd_artifact', 'artifact_reference_fact', 'PRD artifact', 'many'),
        ('ctx-review-notes', 'workflow-1', 'review_notes', 'plain_value_fact', 'Review notes', 'many')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (id, context_fact_definition_id, value_type, validation_json)
      VALUES
        ('plain-project-context', 'ctx-project-context', 'json', NULL),
        ('plain-review-notes', 'ctx-review-notes', 'string', NULL)
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_artifact_refs (id, context_fact_definition_id, artifact_slot_key)
      VALUES ('artifact-prd', 'ctx-prd-artifact', 'ART.PRD')
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

  async function getCount(tableName: string): Promise<number> {
    const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  it("loads and saves agent-step child rows, explicit reads, write cards, and context-fact requirements", async () => {
    const created = await runRepo((repo) =>
      repo.createAgentStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        afterStepKey: null,
        payload: {
          key: "draft-prd",
          label: "Draft PRD",
          descriptionJson: { markdown: "Draft the PRD using the shared context." },
          objective: "Create a first PRD draft.",
          instructionsMarkdown: "Focus on scope, constraints, and outcomes.",
          harnessSelection: {
            harness: "opencode",
            agent: "explore",
            model: { provider: "openai", model: "gpt-5.4" },
          },
          explicitReadGrants: [{ contextFactDefinitionId: "ctx-project-context" }],
          writeItems: [
            {
              writeItemId: "write-prd",
              contextFactDefinitionId: "ctx-prd-artifact",
              contextFactKind: "artifact_reference_fact",
              label: "PRD artifact",
              order: 10,
              requirementContextFactDefinitionIds: ["ctx-project-context"],
            },
          ],
          completionRequirements: [{ contextFactDefinitionId: "ctx-prd-artifact" }],
          runtimePolicy: {
            sessionStart: "explicit",
            continuationMode: "bootstrap_only",
            liveStreamCount: 1,
            nativeMessageLog: false,
            persistedWritePolicy: "applied_only",
          },
          guidance: {
            human: { markdown: "Review the first draft before approving it." },
            agent: { markdown: "Do not invent unavailable facts." },
          },
        },
      }),
    );

    expect(created.payload.explicitReadGrants).toEqual([
      { contextFactDefinitionId: "ctx-project-context" },
    ]);
    expect(created.payload.writeItems).toEqual([
      {
        writeItemId: "write-prd",
        contextFactDefinitionId: "ctx-prd-artifact",
        contextFactKind: "artifact_reference_fact",
        label: "PRD artifact",
        order: 10,
        requirementContextFactDefinitionIds: ["ctx-project-context"],
      },
    ]);

    const listedAfterCreate = await runRepo((repo) =>
      repo.listAgentStepDefinitions({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
      }),
    );

    expect(listedAfterCreate).toEqual([
      {
        stepId: created.stepId,
        payload: expect.objectContaining({
          key: "draft-prd",
          harnessSelection: {
            harness: "opencode",
            agent: "explore",
            model: { provider: "openai", model: "gpt-5.4" },
          },
          objective: "Create a first PRD draft.",
          explicitReadGrants: [{ contextFactDefinitionId: "ctx-project-context" }],
          writeItems: [
            {
              writeItemId: "write-prd",
              contextFactDefinitionId: "ctx-prd-artifact",
              contextFactKind: "artifact_reference_fact",
              label: "PRD artifact",
              order: 10,
              requirementContextFactDefinitionIds: ["ctx-project-context"],
            },
          ],
          completionRequirements: [{ contextFactDefinitionId: "ctx-prd-artifact" }],
        }),
      },
    ]);

    expect(await getCount("methodology_workflow_agent_steps")).toBe(1);
    expect(await getCount("methodology_workflow_agent_step_explicit_read_grants")).toBe(1);
    expect(await getCount("methodology_workflow_agent_step_write_items")).toBe(1);
    expect(await getCount("methodology_workflow_agent_step_write_item_requirements")).toBe(1);

    const requirementRows = await client.execute(`
      SELECT r.context_fact_definition_id AS context_fact_definition_id, w.write_item_id AS write_item_id
      FROM methodology_workflow_agent_step_write_item_requirements r
      INNER JOIN methodology_workflow_agent_step_write_items w ON w.id = r.write_item_row_id
    `);
    expect(requirementRows.rows).toEqual([
      {
        context_fact_definition_id: "ctx-project-context",
        write_item_id: "write-prd",
      },
    ]);

    const updated = await runRepo((repo) =>
      repo.updateAgentStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
        payload: {
          key: "draft-prd-v2",
          label: "Draft PRD v2",
          objective: "Revise the PRD using reviewer notes.",
          instructionsMarkdown: "Integrate feedback before finalizing the draft.",
          harnessSelection: {
            harness: "opencode",
            agent: "build",
            model: { provider: "openai", model: "gpt-5.4" },
          },
          explicitReadGrants: [{ contextFactDefinitionId: "ctx-review-notes" }],
          writeItems: [
            {
              writeItemId: "write-prd",
              contextFactDefinitionId: "ctx-prd-artifact",
              contextFactKind: "artifact_reference_fact",
              label: "Updated PRD artifact",
              order: 20,
              requirementContextFactDefinitionIds: ["ctx-review-notes"],
            },
          ],
          completionRequirements: [{ contextFactDefinitionId: "ctx-prd-artifact" }],
        },
      }),
    );

    expect(updated.payload.explicitReadGrants).toEqual([
      { contextFactDefinitionId: "ctx-review-notes" },
    ]);
    expect(updated.payload.harnessSelection).toEqual({
      harness: "opencode",
      agent: "build",
      model: { provider: "openai", model: "gpt-5.4" },
    });
    expect(updated.payload.writeItems[0]).toMatchObject({
      label: "Updated PRD artifact",
      order: 20,
      requirementContextFactDefinitionIds: ["ctx-review-notes"],
    });

    await runRepo((repo) =>
      repo.deleteAgentStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
      }),
    );

    expect(await getCount("methodology_workflow_steps")).toBe(0);
    expect(await getCount("methodology_workflow_agent_steps")).toBe(0);
    expect(await getCount("methodology_workflow_agent_step_explicit_read_grants")).toBe(0);
    expect(await getCount("methodology_workflow_agent_step_write_items")).toBe(0);
    expect(await getCount("methodology_workflow_agent_step_write_item_requirements")).toBe(0);
  });

  it("rejects duplicate explicit reads deterministically", async () => {
    const result = await runRepo((repo) =>
      Effect.either(
        repo.createAgentStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "draft-prd",
            objective: "Create a first PRD draft.",
            instructionsMarkdown: "Use the context as-is.",
            explicitReadGrants: [
              { contextFactDefinitionId: "ctx-project-context" },
              { contextFactDefinitionId: "ctx-project-context" },
            ],
            writeItems: [],
            completionRequirements: [],
          },
        }),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(String((result.left as { cause: unknown }).cause)).toContain(
        "cannot grant explicit read access",
      );
    }
  });

  it("rejects duplicate write cards for the same context fact deterministically", async () => {
    const result = await runRepo((repo) =>
      Effect.either(
        repo.createAgentStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "draft-prd",
            objective: "Create a first PRD draft.",
            instructionsMarkdown: "Use the context as-is.",
            explicitReadGrants: [],
            writeItems: [
              {
                writeItemId: "write-prd-a",
                contextFactDefinitionId: "ctx-prd-artifact",
                contextFactKind: "artifact_reference_fact",
                order: 10,
                requirementContextFactDefinitionIds: [],
              },
              {
                writeItemId: "write-prd-b",
                contextFactDefinitionId: "ctx-prd-artifact",
                contextFactKind: "artifact_reference_fact",
                order: 20,
                requirementContextFactDefinitionIds: [],
              },
            ],
            completionRequirements: [],
          },
        }),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(String((result.left as { cause: unknown }).cause)).toContain(
        "cannot define more than one write card",
      );
    }
  });

  it("rejects self-dependency requirements deterministically", async () => {
    const result = await runRepo((repo) =>
      Effect.either(
        repo.createAgentStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "draft-prd",
            objective: "Create a first PRD draft.",
            instructionsMarkdown: "Use the context as-is.",
            explicitReadGrants: [],
            writeItems: [
              {
                writeItemId: "write-prd",
                contextFactDefinitionId: "ctx-prd-artifact",
                contextFactKind: "artifact_reference_fact",
                order: 10,
                requirementContextFactDefinitionIds: ["ctx-prd-artifact"],
              },
            ],
            completionRequirements: [],
          },
        }),
      ),
    );

    expect(result._tag).toBe("Left");
    if (result._tag === "Left") {
      expect(String((result.left as { cause: unknown }).cause)).toContain(
        "cannot depend on its own context fact",
      );
    }
  });
});
