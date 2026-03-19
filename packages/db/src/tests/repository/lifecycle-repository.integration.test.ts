import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { createLifecycleRepoLayer } from "../../lifecycle-repository";
import * as schema from "../../schema";
import { methodologyVersions } from "../../schema/methodology";

const VALIDATION_OK: ValidationResult = {
  valid: true,
  diagnostics: [],
};

const SCHEMA_SQL = [
  `CREATE TABLE methodology_versions (
    id TEXT PRIMARY KEY,
    methodology_id TEXT NOT NULL,
    version TEXT NOT NULL,
    status TEXT NOT NULL,
    display_name TEXT NOT NULL,
    definition_extensions_json TEXT,
    created_at INTEGER NOT NULL,
    retired_at INTEGER,
    UNIQUE(methodology_id, version)
  )`,
  `CREATE TABLE methodology_version_events (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    actor_id TEXT,
    changed_fields_json TEXT,
    diagnostics_json TEXT,
    created_at INTEGER NOT NULL
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
  `CREATE TABLE methodology_agent_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description TEXT,
    persona TEXT NOT NULL,
    default_model_json TEXT,
    mcp_servers_json TEXT,
    capabilities_json TEXT,
    prompt_template_json TEXT,
    prompt_template_version INTEGER NOT NULL DEFAULT 1,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE methodology_lifecycle_states (
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
  `CREATE TABLE methodology_lifecycle_transitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    transition_key TEXT NOT NULL,
    from_state_id TEXT,
    to_state_id TEXT NOT NULL,
    gate_class TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, transition_key)
  )`,
  `CREATE TABLE methodology_transition_condition_sets (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    phase TEXT NOT NULL,
    mode TEXT NOT NULL,
    groups_json TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(transition_id, key)
  )`,
  `CREATE TABLE methodology_fact_schemas (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    name TEXT,
    key TEXT NOT NULL,
    fact_type TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    default_value_json TEXT,
    guidance_json TEXT,
    validation_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(work_unit_type_id, key)
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    display_name TEXT,
    metadata_json TEXT,
    input_contract_json TEXT,
    output_contract_json TEXT,
    guidance_json TEXT,
    definition_json TEXT NOT NULL,
    execution_modes_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(methodology_version_id, key)
  )`,
  `CREATE TABLE methodology_transition_workflow_bindings (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    guidance_json TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE(transition_id, workflow_id)
  )`,
];

describe("lifecycle repository integration", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-lifecycle-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }
  });

  afterEach(async () => {
    if (client) {
      client.close();
    }

    if (dbPath) {
      rmSync(dbPath, { force: true });
    }
  });

  const runRepo = <A>(
    fn: (repo: LifecycleRepository["Type"]) => Effect.Effect<A, unknown>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* LifecycleRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createLifecycleRepoLayer(db))),
    );

  it("persists and reloads work unit guidance json", async () => {
    await db.insert(methodologyVersions).values({
      id: "version-guided",
      methodologyId: "methodology-guided",
      version: "draft",
      status: "draft",
      displayName: "Guided Draft",
      definitionExtensions: {},
      createdAt: new Date(),
      retiredAt: null,
    });

    await runRepo((repo) =>
      repo.saveLifecycleDefinition({
        versionId: "version-guided",
        actorId: "operator-1",
        validationResult: VALIDATION_OK,
        changedFieldsJson: { workUnitTypes: true },
        workUnitTypes: [
          {
            key: "WU.INTAKE",
            displayName: "Intake",
            description: "Collect intake guidance.",
            guidance: {
              human: { markdown: "Ask the operator for intake context." },
              agent: { markdown: "Extract the structured intake summary." },
            },
            cardinality: "many_per_project",
            lifecycleStates: [{ key: "done" }],
            lifecycleTransitions: [
              {
                transitionKey: "start",
                fromState: undefined,
                toState: "done",
                gateClass: "start_gate",
                conditionSets: [],
              },
            ],
            factSchemas: [],
          },
        ],
        agentTypes: [],
      }),
    );

    const rows = await runRepo((repo) => repo.findWorkUnitTypes("version-guided"));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      guidanceJson: {
        human: { markdown: "Ask the operator for intake context." },
        agent: { markdown: "Extract the structured intake summary." },
      },
    });
  });
});
