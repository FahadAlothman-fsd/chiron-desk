import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { BranchStepRuntimeRepository } from "@chiron/workflow-engine";

import { MethodologyRepository } from "@chiron/methodology-engine";
import { createMethodologyRepoLayer } from "../../methodology-repository";
import { createBranchStepRuntimeRepoLayer } from "../../runtime-repositories/branch-step-runtime-repository";
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
  `CREATE TABLE methodology_workflow_context_fact_artifact_refs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    artifact_slot_key TEXT NOT NULL
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
  `CREATE TABLE methodology_workflow_action_steps (
    step_id TEXT PRIMARY KEY,
    execution_mode TEXT NOT NULL,
    FOREIGN KEY(step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_action_step_actions (
    id TEXT PRIMARY KEY,
    action_step_id TEXT NOT NULL,
    action_id TEXT NOT NULL,
    action_key TEXT NOT NULL,
    label TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL,
    action_kind TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    context_fact_kind TEXT NOT NULL,
    FOREIGN KEY(action_step_id) REFERENCES methodology_workflow_action_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(action_step_id, action_id)
  )`,
  `CREATE TABLE methodology_workflow_action_step_action_items (
    id TEXT PRIMARY KEY,
    action_row_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    label TEXT,
    target_context_fact_definition_id TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(action_row_id) REFERENCES methodology_workflow_action_step_actions(id) ON DELETE CASCADE,
    FOREIGN KEY(target_context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(action_row_id, item_id)
  )`,
];

describe("l3 plan a action/branch methodology repository", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-plan-a-action-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    await client.execute("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`INSERT INTO methodology_versions (id) VALUES ('version-1')`);
    await client.execute(`
      INSERT INTO methodology_work_unit_types (id, methodology_version_id, key)
      VALUES ('wut-story', 'version-1', 'WU.STORY')
    `);
    await client.execute(`
      INSERT INTO methodology_workflows (
        id, methodology_version_id, work_unit_type_id, key, display_name, metadata_json
      ) VALUES (
        'workflow-1',
        'version-1',
        'wut-story',
        'wu.story.action',
        'Story action workflow',
        '{"entryStepId":"step-start"}'
      )
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_steps (
        id, methodology_version_id, workflow_id, key, type, display_name
      ) VALUES
        ('step-start', 'version-1', 'workflow-1', 'start', 'display', 'Start'),
        ('step-end', 'version-1', 'workflow-1', 'end', 'display', 'End')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_edges (
        id, methodology_version_id, workflow_id, from_step_id, to_step_id
      ) VALUES ('edge-1', 'version-1', 'workflow-1', 'step-start', 'step-end')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (
        id, workflow_definition_id, fact_key, fact_kind, label, cardinality
      ) VALUES
        ('ctx-def-backed', 'workflow-1', 'external_status', 'bound_fact', 'External status', 'one'),
        ('ctx-def-backed-2', 'workflow-1', 'external_status_secondary', 'bound_fact', 'External status secondary', 'one'),
        ('ctx-bound', 'workflow-1', 'bound_status', 'bound_fact', 'Bound status', 'one'),
        ('ctx-artifact', 'workflow-1', 'prd_artifact', 'artifact_slot_reference_fact', 'PRD artifact', 'many'),
        ('ctx-plain', 'workflow-1', 'summary', 'plain_fact', 'Summary', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_external_bindings (
        id, context_fact_definition_id, provider, binding_key
      ) VALUES
        ('binding-def-backed', 'ctx-def-backed', 'bound_fact', 'external-status'),
        ('binding-def-backed-2', 'ctx-def-backed-2', 'bound_fact', 'external-status-secondary'),
        ('binding-bound', 'ctx-bound', 'bound_fact', 'bound-status')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_artifact_refs (
        id, context_fact_definition_id, artifact_slot_key
      ) VALUES ('artifact-ref', 'ctx-artifact', 'ART.PRD')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (
        id, context_fact_definition_id, value_type, validation_json
      ) VALUES ('plain-summary', 'ctx-plain', 'string', NULL)
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

  async function getRows(tableName: string) {
    const result = await client.execute(`SELECT * FROM ${tableName}`);
    return result.rows;
  }

  it("action design-time persists whole-step graphs with stable action and item IDs through delta reconciliation", async () => {
    const created = await runRepo((repo) =>
      repo.createActionStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        afterStepKey: "start",
        payload: {
          key: "propagate-context",
          label: "Propagate context",
          descriptionJson: { markdown: "Propagate eligible workflow context outward." },
          guidance: {
            human: { markdown: "Review the graph before saving." },
            agent: { markdown: "Keep unchanged IDs stable." },
          },
          executionMode: "sequential",
          actions: [
            {
              actionId: "action-1",
              actionKey: "propagate-status",
              label: "Propagate status",
              enabled: true,
              sortOrder: 10,
              actionKind: "propagation",
              contextFactDefinitionId: "ctx-def-backed",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "item-1",
                  itemKey: "external-status",
                  label: "External status",
                  sortOrder: 10,
                },
                {
                  itemId: "item-2",
                  itemKey: "external-status-audit",
                  label: "External status audit",
                  sortOrder: 20,
                  targetContextFactDefinitionId: "ctx-def-backed-2",
                },
              ],
            },
            {
              actionId: "action-2",
              actionKey: "propagate-prd",
              label: "Propagate PRD",
              enabled: false,
              sortOrder: 20,
              actionKind: "propagation",
              contextFactDefinitionId: "ctx-artifact",
              contextFactKind: "artifact_slot_reference_fact",
              items: [
                {
                  itemId: "item-3",
                  itemKey: "prd-artifact",
                  label: "PRD artifact",
                  sortOrder: 10,
                },
              ],
            },
          ],
        },
      }),
    );

    const actionRowsAfterCreate = await getRows("methodology_workflow_action_step_actions");
    const itemRowsAfterCreate = await getRows("methodology_workflow_action_step_action_items");
    const action1RowId = String(
      actionRowsAfterCreate.find((row) => row.action_id === "action-1")?.id ?? "",
    );
    const item1RowId = String(
      itemRowsAfterCreate.find((row) => row.item_id === "item-1")?.id ?? "",
    );
    const item2RowId = String(
      itemRowsAfterCreate.find((row) => row.item_id === "item-2")?.id ?? "",
    );

    expect(created.payload.actions).toHaveLength(2);
    expect(action1RowId).not.toBe("");
    expect(item1RowId).not.toBe("");
    expect(item2RowId).not.toBe("");

    const stepRow = (await getRows("methodology_workflow_steps")).find(
      (row) => row.id === created.stepId,
    );
    expect(String(stepRow?.config_json ?? "")).toContain(
      "Propagate eligible workflow context outward.",
    );
    expect(String(stepRow?.guidance_json ?? "")).toContain("Keep unchanged IDs stable.");

    const updated = await runRepo((repo) =>
      repo.updateActionStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
        payload: {
          key: "propagate-context-v2",
          label: "Propagate context v2",
          descriptionJson: { markdown: "Save the entire action graph by delta." },
          executionMode: "parallel",
          actions: [
            {
              actionId: "action-1",
              actionKey: "propagate-status-updated",
              label: "Propagate status (updated)",
              enabled: true,
              sortOrder: 30,
              actionKind: "propagation",
              contextFactDefinitionId: "ctx-def-backed",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "item-1",
                  itemKey: "external-status",
                  label: "External status",
                  sortOrder: 10,
                  targetContextFactDefinitionId: "ctx-def-backed-2",
                },
                {
                  itemId: "item-4",
                  itemKey: "external-status-summary",
                  label: "External status summary",
                  sortOrder: 20,
                },
              ],
            },
            {
              actionId: "action-3",
              actionKey: "propagate-bound-status",
              label: "Propagate bound status",
              enabled: true,
              sortOrder: 40,
              actionKind: "propagation",
              contextFactDefinitionId: "ctx-bound",
              contextFactKind: "bound_fact",
              items: [
                {
                  itemId: "item-5",
                  itemKey: "bound-status",
                  label: "Bound status",
                  sortOrder: 10,
                },
              ],
            },
          ],
        },
      }),
    );

    expect(updated.payload.executionMode).toBe("parallel");
    expect(updated.payload.actions.map((action) => action.actionId)).toEqual([
      "action-1",
      "action-3",
    ]);

    const actionRowsAfterUpdate = await getRows("methodology_workflow_action_step_actions");
    const itemRowsAfterUpdate = await getRows("methodology_workflow_action_step_action_items");
    expect(actionRowsAfterUpdate).toHaveLength(2);
    expect(itemRowsAfterUpdate).toHaveLength(3);

    expect(actionRowsAfterUpdate.find((row) => row.action_id === "action-1")?.id).toBe(
      action1RowId,
    );
    expect(itemRowsAfterUpdate.find((row) => row.item_id === "item-1")?.id).toBe(item1RowId);
    expect(
      itemRowsAfterUpdate.find((row) => row.item_id === "item-1")
        ?.target_context_fact_definition_id,
    ).toBe("ctx-def-backed-2");
    expect(itemRowsAfterUpdate.find((row) => row.item_id === "item-2")).toBeUndefined();
    expect(actionRowsAfterUpdate.find((row) => row.action_id === "action-2")).toBeUndefined();

    const loaded = await runRepo((repo) =>
      repo.getActionStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
      }),
    );

    expect(loaded).toEqual({
      stepId: created.stepId,
      payload: {
        key: "propagate-context-v2",
        label: "Propagate context v2",
        descriptionJson: { markdown: "Save the entire action graph by delta." },
        executionMode: "parallel",
        actions: [
          {
            actionId: "action-1",
            actionKey: "propagate-status-updated",
            label: "Propagate status (updated)",
            enabled: true,
            sortOrder: 30,
            actionKind: "propagation",
            contextFactDefinitionId: "ctx-def-backed",
            contextFactKind: "bound_fact",
            items: [
              {
                itemId: "item-1",
                itemKey: "external-status",
                label: "External status",
                sortOrder: 10,
                targetContextFactDefinitionId: "ctx-def-backed-2",
              },
              {
                itemId: "item-4",
                itemKey: "external-status-summary",
                label: "External status summary",
                sortOrder: 20,
              },
            ],
          },
          {
            actionId: "action-3",
            actionKey: "propagate-bound-status",
            label: "Propagate bound status",
            enabled: true,
            sortOrder: 40,
            actionKind: "propagation",
            contextFactDefinitionId: "ctx-bound",
            contextFactKind: "bound_fact",
            items: [
              {
                itemId: "item-5",
                itemKey: "bound-status",
                label: "Bound status",
                sortOrder: 10,
              },
            ],
          },
        ],
      },
    });

    const edges = await getRows("methodology_workflow_edges");
    expect(edges.map((edge) => [edge.from_step_id, edge.to_step_id])).toEqual([
      ["step-start", created.stepId],
      [created.stepId, "step-end"],
    ]);

    await runRepo((repo) =>
      repo.deleteActionStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
      }),
    );

    expect(await getRows("methodology_workflow_action_steps")).toHaveLength(0);
    expect(await getRows("methodology_workflow_action_step_actions")).toHaveLength(0);
    expect(await getRows("methodology_workflow_action_step_action_items")).toHaveLength(0);
    expect((await getRows("methodology_workflow_steps")).map((row) => row.id)).not.toContain(
      created.stepId,
    );
  });

  it("action design-time rejects empty graphs and invalid context-fact kinds deterministically", async () => {
    const emptyResult = await runRepo((repo) =>
      Effect.either(
        repo.createActionStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "empty-action-step",
            executionMode: "sequential",
            actions: [],
          },
        }),
      ),
    );

    expect(emptyResult._tag).toBe("Left");
    if (emptyResult._tag === "Left") {
      expect(String((emptyResult.left as { cause: unknown }).cause)).toContain(
        "must contain at least one action",
      );
    }

    const invalidKindResult = await runRepo((repo) =>
      Effect.either(
        repo.createActionStepDefinition({
          versionId: "version-1",
          workflowDefinitionId: "workflow-1",
          afterStepKey: null,
          payload: {
            key: "invalid-kind",
            executionMode: "sequential",
            actions: [
              {
                actionId: "action-invalid",
                actionKey: "propagate-summary",
                enabled: true,
                sortOrder: 10,
                actionKind: "propagation",
                contextFactDefinitionId: "ctx-plain",
                contextFactKind: "artifact_slot_reference_fact",
                items: [{ itemId: "item-invalid", itemKey: "summary", sortOrder: 10 }],
              },
            ],
          },
        }),
      ),
    );

    expect(invalidKindResult._tag).toBe("Left");
    if (invalidKindResult._tag === "Left") {
      expect(String((invalidKindResult.left as { cause: unknown }).cause)).toContain(
        "cannot target workflow context fact 'ctx-plain' of kind 'plain_fact'",
      );
    }
  });
});

const BRANCH_RUNTIME_SCHEMA_SQL = [
  `CREATE TABLE methodology_workflow_steps (id TEXT PRIMARY KEY)`,
  `CREATE TABLE transition_executions (id TEXT PRIMARY KEY, project_work_unit_id TEXT NOT NULL, transition_id TEXT NOT NULL, status TEXT NOT NULL, started_at INTEGER NOT NULL)`,
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
    activated_at INTEGER NOT NULL,
    completed_at INTEGER,
    previous_step_execution_id TEXT,
    FOREIGN KEY (workflow_execution_id) REFERENCES workflow_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (step_definition_id) REFERENCES methodology_workflow_steps(id) ON DELETE RESTRICT,
    FOREIGN KEY (previous_step_execution_id) REFERENCES step_executions(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE branch_step_executions (
    id TEXT PRIMARY KEY,
    step_execution_id TEXT NOT NULL,
    selected_target_step_id TEXT,
    saved_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (step_execution_id) REFERENCES step_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (selected_target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE RESTRICT,
    UNIQUE(step_execution_id)
  )`,
  `CREATE TABLE branch_step_execution_routes (
    id TEXT PRIMARY KEY,
    branch_step_execution_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    target_step_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    condition_mode TEXT NOT NULL,
    is_valid INTEGER NOT NULL,
    evaluation_tree_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    FOREIGN KEY (branch_step_execution_id) REFERENCES branch_step_executions(id) ON DELETE CASCADE,
    FOREIGN KEY (target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE RESTRICT,
    UNIQUE(branch_step_execution_id, route_id)
  )`,
];

describe("l3 plan a action/branch runtime repository branch runtime", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-plan-a-branch-runtime-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    await client.execute("PRAGMA foreign_keys = ON");
    for (const statement of BRANCH_RUNTIME_SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(
      `INSERT INTO methodology_workflow_steps (id) VALUES ('step-branch'), ('step-a'), ('step-b')`,
    );
    await client.execute(`
      INSERT INTO transition_executions (id, project_work_unit_id, transition_id, status, started_at)
      VALUES ('tx-1', 'wu-1', 'transition-1', 'active', strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO workflow_executions (id, transition_execution_id, workflow_id, workflow_role, status, started_at)
      VALUES ('wfexec-1', 'tx-1', 'workflow-1', 'primary', 'active', strftime('%s','now') * 1000)
    `);
    await client.execute(`
      INSERT INTO step_executions (
        id, workflow_execution_id, step_definition_id, step_type, status, activated_at, completed_at, previous_step_execution_id
      ) VALUES (
        'step-exec-1', 'wfexec-1', 'step-branch', 'branch', 'active', strftime('%s','now') * 1000, NULL, NULL
      )
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  const runBranchRepo = <A>(
    fn: (repo: BranchStepRuntimeRepository["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const repo = yield* BranchStepRuntimeRepository;
        return yield* fn(repo);
      }).pipe(Effect.provide(createBranchStepRuntimeRepoLayer(db))),
    );

  it("branch runtime creates one root row per activation and caches ordered route evaluations", async () => {
    const first = await runBranchRepo((repo) =>
      repo.createOnActivation({
        stepExecutionId: "step-exec-1",
        routes: [
          {
            routeId: "route-b",
            targetStepId: "step-b",
            sortOrder: 20,
            conditionMode: "any",
            isValid: false,
            evaluationTreeJson: {
              mode: "any",
              met: false,
              reason: "No ANY branch satisfied",
              conditions: [],
              groups: [],
            },
          },
          {
            routeId: "route-a",
            targetStepId: "step-a",
            sortOrder: 10,
            conditionMode: "all",
            isValid: true,
            evaluationTreeJson: {
              mode: "all",
              met: true,
              conditions: [],
              groups: [],
            },
          },
        ],
      }),
    );

    const second = await runBranchRepo((repo) =>
      repo.createOnActivation({
        stepExecutionId: "step-exec-1",
        routes: [
          {
            routeId: "route-c",
            targetStepId: "step-a",
            sortOrder: 30,
            conditionMode: "all",
            isValid: true,
          },
        ],
      }),
    );

    expect(first.branch.stepExecutionId).toBe("step-exec-1");
    expect(first.branch.selectedTargetStepId).toBeNull();
    expect(first.branch.savedAt).toBeNull();
    expect(first.routes.map((route) => route.routeId)).toEqual(["route-a", "route-b"]);
    expect(first.routes.map((route) => route.sortOrder)).toEqual([10, 20]);
    expect(second.branch.id).toBe(first.branch.id);
    expect(second.routes.map((route) => route.routeId)).toEqual(["route-a", "route-b"]);

    const rootRows = await client.execute(`SELECT COUNT(*) AS count FROM branch_step_executions`);
    const routeRows = await client.execute(
      `SELECT COUNT(*) AS count FROM branch_step_execution_routes`,
    );
    expect(Number(rootRows.rows[0]?.count ?? 0)).toBe(1);
    expect(Number(routeRows.rows[0]?.count ?? 0)).toBe(2);
  });

  it("branch runtime saves explicit target selection in place and loads it with cached routes", async () => {
    await runBranchRepo((repo) =>
      repo.createOnActivation({
        stepExecutionId: "step-exec-1",
        routes: [
          {
            routeId: "route-a",
            targetStepId: "step-a",
            sortOrder: 10,
            conditionMode: "all",
            isValid: true,
          },
        ],
      }),
    );

    const saved = await runBranchRepo((repo) =>
      repo.saveSelection({
        stepExecutionId: "step-exec-1",
        selectedTargetStepId: "step-a",
      }),
    );

    const loaded = await runBranchRepo((repo) => repo.loadWithRoutes("step-exec-1"));

    expect(saved?.selectedTargetStepId).toBe("step-a");
    expect(saved?.savedAt).toBeInstanceOf(Date);
    expect(loaded?.branch.selectedTargetStepId).toBe("step-a");
    expect(loaded?.branch.savedAt).toBeInstanceOf(Date);
    expect(loaded?.routes).toHaveLength(1);
    expect(loaded?.routes[0]).toMatchObject({ routeId: "route-a", isValid: true });
  });

  it("branch runtime rejects missing step or target foreign keys", async () => {
    await expect(
      runBranchRepo((repo) =>
        repo.createOnActivation({
          stepExecutionId: "missing-step-exec",
        }),
      ),
    ).rejects.toThrow();

    await runBranchRepo((repo) => repo.createOnActivation({ stepExecutionId: "step-exec-1" }));

    await expect(
      runBranchRepo((repo) =>
        repo.saveSelection({
          stepExecutionId: "step-exec-1",
          selectedTargetStepId: "missing-target-step",
        }),
      ),
    ).rejects.toThrow();
  });
});
