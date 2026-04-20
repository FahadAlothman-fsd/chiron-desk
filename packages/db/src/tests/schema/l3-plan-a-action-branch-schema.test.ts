import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

import * as methodologySchema from "../../schema/methodology";
import * as runtimeSchema from "../../schema/runtime";

const drizzleNameSymbol = Symbol.for("drizzle:Name");
const drizzleInlineForeignKeysSymbol = Symbol.for("drizzle:SQLiteInlineForeignKeys");
const drizzleExtraConfigBuilderSymbol = Symbol.for("drizzle:ExtraConfigBuilder");
const drizzleExtraConfigColumnsSymbol = Symbol.for("drizzle:ExtraConfigColumns");

const SCHEMA_SQL = [
  `CREATE TABLE methodology_versions (id TEXT PRIMARY KEY)`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE CASCADE
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
    FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (workflow_id) REFERENCES methodology_workflows(id) ON DELETE CASCADE,
    UNIQUE(workflow_id, key)
  )`,
  `CREATE TABLE methodology_workflow_context_fact_definitions (
    id TEXT PRIMARY KEY,
    workflow_definition_id TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_kind TEXT NOT NULL,
    cardinality TEXT NOT NULL,
    FOREIGN KEY (workflow_definition_id) REFERENCES methodology_workflows(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_action_steps (
    step_id TEXT PRIMARY KEY,
    execution_mode TEXT NOT NULL,
    FOREIGN KEY (step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE,
    CONSTRAINT methodology_workflow_action_steps_execution_mode_check CHECK (execution_mode in ('sequential', 'parallel'))
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
    FOREIGN KEY (action_step_id) REFERENCES methodology_workflow_action_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    CONSTRAINT methodology_workflow_action_step_actions_kind_check CHECK (action_kind = 'propagation'),
    CONSTRAINT methodology_workflow_action_step_actions_fact_kind_check CHECK (
      context_fact_kind in ('bound_fact', 'artifact_slot_reference_fact')
    ),
    UNIQUE(action_step_id, action_id)
  )`,
  `CREATE INDEX methodology_workflow_action_step_actions_step_order_idx ON methodology_workflow_action_step_actions (action_step_id, sort_order)`,
  `CREATE INDEX methodology_workflow_action_step_actions_step_fact_idx ON methodology_workflow_action_step_actions (action_step_id, context_fact_definition_id)`,
  `CREATE TABLE methodology_workflow_action_step_action_items (
    id TEXT PRIMARY KEY,
    action_row_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_key TEXT NOT NULL,
    label TEXT,
    target_context_fact_definition_id TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (action_row_id) REFERENCES methodology_workflow_action_step_actions(id) ON DELETE CASCADE,
    FOREIGN KEY (target_context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(action_row_id, item_id)
  )`,
  `CREATE INDEX methodology_workflow_action_step_action_items_action_order_idx ON methodology_workflow_action_step_action_items (action_row_id, sort_order)`,
  `CREATE INDEX methodology_workflow_action_step_action_items_target_fact_idx ON methodology_workflow_action_step_action_items (target_context_fact_definition_id)`,
];

function getTableName(table: unknown): string {
  return (table as Record<symbol, string | undefined>)[drizzleNameSymbol] ?? "";
}

function getExtraConfigs(table: unknown): Array<{
  config?: { name?: string; unique?: boolean; columns?: Array<{ name: string }> };
  name?: string;
}> {
  const builder = (table as Record<symbol, ((columns: unknown) => unknown[]) | undefined>)[
    drizzleExtraConfigBuilderSymbol
  ];
  const columns = (table as Record<symbol, unknown>)[drizzleExtraConfigColumnsSymbol];
  return builder
    ? (builder(columns) as Array<{
        config?: { name?: string; unique?: boolean; columns?: Array<{ name: string }> };
        name?: string;
      }>)
    : [];
}

function getInlineForeignKey(table: unknown, index = 0) {
  return (
    table as Record<symbol, Array<{ reference: () => { foreignTable: unknown } }> | undefined>
  )[drizzleInlineForeignKeysSymbol]?.[index];
}

function getConfigByName(table: unknown, name: string) {
  const entry = getExtraConfigs(table).find(
    (configEntry) => configEntry.config?.name === name || configEntry.name === name,
  );
  return entry?.config ?? entry;
}

async function expectConstraintFailure(promise: Promise<unknown>) {
  await expect(promise).rejects.toThrow(/constraint|check|foreign key|unique/i);
}

describe("l3 plan a action/branch schema", () => {
  let client: Client;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-plan-a-action-schema-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    await client.execute("PRAGMA foreign_keys = ON");

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`INSERT INTO methodology_versions (id) VALUES ('version-1')`);
    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, key)
      VALUES ('workflow-1', 'version-1', 'wu.story.action')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_steps (
        id, methodology_version_id, workflow_id, key, type, display_name, config_json, guidance_json
      ) VALUES (
        'step-action',
        'version-1',
        'workflow-1',
        'propagate-context',
        'action',
        'Propagate context',
        '{"descriptionJson":{"markdown":"Shared metadata lives here"}}',
        '{"human":{"markdown":"Review before running"},"agent":{"markdown":"Preserve IDs"}}'
      )
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (
        id, workflow_definition_id, fact_key, fact_kind, cardinality
      ) VALUES
        ('ctx-external', 'workflow-1', 'external_status', 'bound_fact', 'one'),
        ('ctx-artifact', 'workflow-1', 'prd_artifact', 'artifact_slot_reference_fact', 'many')
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  it("action methodology keeps common step metadata on the shared workflow step row", async () => {
    expect(getTableName(methodologySchema.methodologyWorkflowActionSteps)).toBe(
      "methodology_workflow_action_steps",
    );
    expect(getTableName(methodologySchema.methodologyWorkflowActionStepActions)).toBe(
      "methodology_workflow_action_step_actions",
    );
    expect(getTableName(methodologySchema.methodologyWorkflowActionStepActionItems)).toBe(
      "methodology_workflow_action_step_action_items",
    );
    expect(
      methodologySchema.methodologyWorkflowActionStepActionItems.targetContextFactDefinitionId,
    ).toBeDefined();

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowActionSteps,
        "methodology_workflow_action_steps_execution_mode_check",
      ),
    ).toBeDefined();
    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowActionStepActions,
        "methodology_workflow_action_step_actions_kind_check",
      ),
    ).toBeDefined();
    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowActionStepActions,
        "methodology_workflow_action_step_actions_fact_kind_check",
      ),
    ).toBeDefined();

    const stepColumns = await client.execute(`PRAGMA table_info(methodology_workflow_steps)`);
    const actionStepColumns = await client.execute(
      `PRAGMA table_info(methodology_workflow_action_steps)`,
    );

    expect(stepColumns.rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(["display_name", "config_json", "guidance_json"]),
    );
    expect(actionStepColumns.rows.map((row) => row.name)).toEqual(["step_id", "execution_mode"]);

    const actionItemColumns = await client.execute(
      `PRAGMA table_info(methodology_workflow_action_step_action_items)`,
    );
    expect(actionItemColumns.rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(["target_context_fact_definition_id"]),
    );
  });

  it("action methodology enforces propagation-only child tables and nested ownership", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_action_steps (step_id, execution_mode)
      VALUES ('step-action', 'sequential')
    `);

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_action_steps (step_id, execution_mode)
        VALUES ('step-action', 'batched')
      `),
    );

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_action_step_actions (
          id, action_step_id, action_id, action_key, sort_order, action_kind, context_fact_definition_id, context_fact_kind
        ) VALUES (
          'row-invalid-kind',
          'step-action',
          'action-1',
          'propagate-prd',
          10,
          'materialize_directory',
          'ctx-artifact',
          'artifact_slot_reference_fact'
        )
      `),
    );

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_action_step_actions (
          id, action_step_id, action_id, action_key, sort_order, action_kind, context_fact_definition_id, context_fact_kind
        ) VALUES (
          'row-invalid-fact-kind',
          'step-action',
          'action-1',
          'propagate-prd',
          10,
          'propagation',
          'ctx-artifact',
          'plain_fact'
        )
      `),
    );

    await client.execute(`
      INSERT INTO methodology_workflow_action_step_actions (
        id, action_step_id, action_id, action_key, sort_order, action_kind, context_fact_definition_id, context_fact_kind
      ) VALUES (
        'row-action-1',
        'step-action',
        'action-1',
        'propagate-prd',
        10,
        'propagation',
        'ctx-artifact',
        'artifact_slot_reference_fact'
      )
    `);

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_action_step_action_items (
          id, action_row_id, item_id, item_key, target_context_fact_definition_id, sort_order
        ) VALUES (
          'item-bad-parent',
          'missing-action-row',
          'item-1',
          'prd-artifact',
          NULL,
          10
        )
      `),
    );

    await client.execute(`
      INSERT INTO methodology_workflow_action_step_action_items (
        id, action_row_id, item_id, item_key, target_context_fact_definition_id, sort_order
      ) VALUES (
        'item-1-row',
        'row-action-1',
        'item-1',
        'prd-artifact',
        'ctx-artifact',
        10
      )
    `);

    await client.execute(
      `DELETE FROM methodology_workflow_action_step_actions WHERE id = 'row-action-1'`,
    );
    const remainingItems = await client.execute(
      `SELECT COUNT(*) AS count FROM methodology_workflow_action_step_action_items`,
    );
    expect(Number(remainingItems.rows[0]?.count ?? 0)).toBe(0);

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowActionStepActionItems,
        "methodology_workflow_action_step_action_items_target_fact_idx",
      ),
    ).toMatchObject({ columns: [{ name: "target_context_fact_definition_id" }] });
  });
});

describe("l3 plan a action/branch schema branch runtime", () => {
  it("adds branch runtime root and route cache tables", () => {
    expect(getTableName(runtimeSchema.branchStepExecutions)).toBe("branch_step_executions");
    expect(getTableName(runtimeSchema.branchStepExecutionRoutes)).toBe(
      "branch_step_execution_routes",
    );

    expect(runtimeSchema.branchStepExecutions.stepExecutionId).toBeDefined();
    expect(runtimeSchema.branchStepExecutions.selectedTargetStepId).toBeDefined();
    expect(runtimeSchema.branchStepExecutions.savedAt).toBeDefined();
    expect(runtimeSchema.branchStepExecutionRoutes.routeId).toBeDefined();
    expect(runtimeSchema.branchStepExecutionRoutes.targetStepId).toBeDefined();
    expect(runtimeSchema.branchStepExecutionRoutes.sortOrder).toBeDefined();
    expect(runtimeSchema.branchStepExecutionRoutes.isValid).toBeDefined();
    expect(runtimeSchema.branchStepExecutionRoutes.evaluationTreeJson).toBeDefined();
  });

  it("branch runtime keeps one root row per step execution and cascades cached routes from the root", () => {
    expect(
      getConfigByName(runtimeSchema.branchStepExecutions, "branch_step_executions_step_idx"),
    ).toMatchObject({ unique: true, columns: [{ name: "step_execution_id" }] });
    expect(
      getConfigByName(
        runtimeSchema.branchStepExecutionRoutes,
        "branch_step_execution_routes_root_route_idx",
      ),
    ).toMatchObject({
      unique: true,
      columns: [{ name: "branch_step_execution_id" }, { name: "route_id" }],
    });

    const rootStepFk = getInlineForeignKey(runtimeSchema.branchStepExecutions, 0);
    const rootTargetFk = getInlineForeignKey(runtimeSchema.branchStepExecutions, 1);
    const routeRootFk = getInlineForeignKey(runtimeSchema.branchStepExecutionRoutes, 0);
    const routeTargetFk = getInlineForeignKey(runtimeSchema.branchStepExecutionRoutes, 1);

    expect(getTableName(rootStepFk?.reference().foreignTable)).toBe("step_executions");
    expect(getTableName(rootTargetFk?.reference().foreignTable)).toBe("methodology_workflow_steps");
    expect(getTableName(routeRootFk?.reference().foreignTable)).toBe("branch_step_executions");
    expect(getTableName(routeTargetFk?.reference().foreignTable)).toBe(
      "methodology_workflow_steps",
    );
  });
});
