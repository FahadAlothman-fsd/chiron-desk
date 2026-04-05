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
    work_unit_fact_definition_id TEXT NOT NULL
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
      VALUES ('ctx-1', 'wf-1', 'initiative_name', 'plain_value_fact', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (id, context_fact_definition_id, value_type)
      VALUES ('ctx-pv-1', 'ctx-1', 'string')
    `);

    const facts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId!({
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      }),
    );

    expect(facts).toEqual([
      { kind: "plain_value_fact", key: "initiative_name", cardinality: "one", valueType: "string" },
    ]);
  });
});
