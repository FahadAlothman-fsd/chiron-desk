import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { MethodologyRepository } from "@chiron/methodology-engine";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { createMethodologyRepoLayer } from "../../methodology-repository";
import * as schema from "../../schema";

const SCHEMA_SQL = [
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
  `CREATE TABLE methodology_work_unit_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_fact_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    name TEXT,
    key TEXT NOT NULL,
    value_type TEXT NOT NULL,
    cardinality TEXT NOT NULL,
    description_json TEXT,
    guidance_json TEXT,
    default_value_json TEXT,
    validation_json TEXT
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
  `CREATE TABLE methodology_workflow_context_fact_definitions (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_kind TEXT NOT NULL,
    label TEXT,
    description_json TEXT,
    cardinality TEXT NOT NULL DEFAULT 'one',
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
  `CREATE TABLE methodology_workflow_context_fact_work_unit_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    link_type_definition_id TEXT,
    target_work_unit_definition_id TEXT
  )`,
  `CREATE TABLE methodology_workflow_context_fact_artifact_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    artifact_slot_key TEXT NOT NULL
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_specs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    work_unit_definition_id TEXT
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_selections (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    selection_type TEXT NOT NULL,
    definition_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL
  )`,
];

describe("methodology repository context-fact list", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-methodology-context-facts-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, key, display_name)
      VALUES ('wf-1', 'ver-1', 'wu.setup', 'Setup workflow')
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const runRepo = <A>(
    fn: (repo: MethodologyRepository["Type"]) => Effect.Effect<A, unknown>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* MethodologyRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createMethodologyRepoLayer(db))),
    );

  it("returns empty list when workflow exists with no context facts", async () => {
    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual([]);
  });

  it("returns persisted plain_value context facts", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (id, workflow_definition_id, fact_key, fact_kind, cardinality)
      VALUES ('ctx-1', 'wf-1', 'initiative_name', 'plain_fact', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (id, context_fact_definition_id, value_type, validation_json)
      VALUES ('ctx-pv-1', 'ctx-1', 'string', NULL)
    `);

    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual([
      {
        kind: "plain_fact",
        contextFactDefinitionId: "ctx-1",
        key: "initiative_name",
        cardinality: "one",
        type: "string",
      },
    ]);
  });

  it("returns persisted plain_value validationJson", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (id, workflow_definition_id, fact_key, fact_kind, cardinality)
      VALUES ('ctx-json', 'wf-1', 'json_plain', 'plain_fact', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (id, context_fact_definition_id, value_type, validation_json)
      VALUES (
        'ctx-pv-json',
        'ctx-json',
        'json',
        json('{"kind":"json-schema","schemaDialect":"draft-2020-12","schema":{"type":"object","additionalProperties":false,"properties":{"project_root":{"type":"string"}}},"subSchema":{"type":"object","fields":[{"key":"project_root","type":"string","cardinality":"one","validation":{"kind":"path","pathKind":"directory","normalization":{"mode":"posix","trimWhitespace":true},"safety":{"disallowAbsolute":true,"preventTraversal":true}}}]}}')
      )
    `);

    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "plain_fact",
          key: "json_plain",
          cardinality: "one",
          type: "json",
          validationJson: expect.objectContaining({
            kind: "json-schema",
            subSchema: expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({ key: "project_root", type: "string" }),
              ]),
            }),
          }),
        }),
      ]),
    );
  });

  it("round-trips plain_value validationJson through create and update repository writes", async () => {
    const created = await runRepo((repo) =>
      repo.createWorkflowContextFactByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
        fact: {
          kind: "plain_fact",
          key: "json_round_trip",
          cardinality: "one",
          type: "json",
          validationJson: {
            kind: "json-schema",
            subSchema: {
              type: "object",
              fields: [{ key: "project_root", type: "string", cardinality: "one" }],
            },
          },
        },
      }),
    );

    await runRepo((repo) =>
      repo.updateWorkflowContextFactByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
        contextFactDefinitionId: created.contextFactDefinitionId,
        fact: {
          kind: "plain_fact",
          key: "json_round_trip",
          cardinality: "one",
          type: "json",
          validationJson: {
            kind: "json-schema",
            subSchema: {
              type: "object",
              fields: [
                { key: "project_root", type: "string", cardinality: "one" },
                { key: "review_notes", type: "string", cardinality: "many" },
              ],
            },
          },
        },
      }),
    );

    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "plain_fact",
          contextFactDefinitionId: created.contextFactDefinitionId,
          key: "json_round_trip",
          type: "json",
          validationJson: expect.objectContaining({
            kind: "json-schema",
            subSchema: expect.objectContaining({
              fields: expect.arrayContaining([
                expect.objectContaining({ key: "project_root", type: "string" }),
                expect.objectContaining({ key: "review_notes", type: "string" }),
              ]),
            }),
          }),
        }),
      ]),
    );
  });

  it("hydrates definition-backed external work-unit facts with valueType and workUnitDefinitionId", async () => {
    await client.execute(`
      INSERT INTO methodology_work_unit_types (id, methodology_version_id, key)
      VALUES ('wut-story', 'ver-1', 'story')
    `);
    await client.execute(`
      INSERT INTO work_unit_fact_definitions (
        id,
        methodology_version_id,
        work_unit_type_id,
        name,
        key,
        fact_type,
        cardinality,
        validation_json
      )
      VALUES (
        'ext-current-story',
        'ver-1',
        'wut-story',
        'Current Story Ref',
        'current_story_ref',
        'work_unit',
        'one',
        NULL
      )
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (id, workflow_definition_id, fact_key, fact_kind, cardinality)
      VALUES ('ctx-external-work-unit', 'wf-1', 'current_story', 'bound_fact', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_external_bindings (id, context_fact_definition_id, provider, binding_key)
      VALUES ('ctx-external-binding', 'ctx-external-work-unit', 'bound_fact', 'ext-current-story')
    `);

    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "bound_fact",
          contextFactDefinitionId: "ctx-external-work-unit",
          key: "current_story",
          cardinality: "one",
          factDefinitionId: "ext-current-story",
          valueType: "work_unit",
          workUnitDefinitionId: "wut-story",
        }),
      ]),
    );
  });
});
