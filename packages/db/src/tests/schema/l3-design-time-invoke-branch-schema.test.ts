import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";

import * as methodologySchema from "../../schema/methodology";

const drizzleNameSymbol = Symbol.for("drizzle:Name");
const drizzleInlineForeignKeysSymbol = Symbol.for("drizzle:SQLiteInlineForeignKeys");
const drizzleExtraConfigBuilderSymbol = Symbol.for("drizzle:ExtraConfigBuilder");
const drizzleExtraConfigColumnsSymbol = Symbol.for("drizzle:ExtraConfigColumns");

const SCHEMA_SQL = [
  `CREATE TABLE methodology_versions (id TEXT PRIMARY KEY)`,
  `CREATE TABLE methodology_work_unit_types (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    key TEXT NOT NULL,
    FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE work_unit_lifecycle_transitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    transition_key TEXT NOT NULL,
    FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (work_unit_type_id) REFERENCES methodology_work_unit_types(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflows (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT,
    key TEXT NOT NULL,
    FOREIGN KEY (methodology_version_id) REFERENCES methodology_versions(id) ON DELETE CASCADE,
    FOREIGN KEY (work_unit_type_id) REFERENCES methodology_work_unit_types(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE methodology_workflow_steps (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    key TEXT NOT NULL,
    type TEXT NOT NULL,
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
  `CREATE TABLE methodology_workflow_invoke_steps (
    step_id TEXT PRIMARY KEY,
    target_kind TEXT NOT NULL,
    source_mode TEXT NOT NULL,
    workflow_definition_ids TEXT,
    work_unit_definition_id TEXT,
    context_fact_definition_id TEXT,
    config_json TEXT,
    FOREIGN KEY (step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (work_unit_definition_id) REFERENCES methodology_work_unit_types(id) ON DELETE CASCADE,
    FOREIGN KEY (context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    CONSTRAINT methodology_workflow_invoke_steps_target_source_check CHECK (
      (
        target_kind = 'workflow'
        AND source_mode = 'fixed_set'
        AND workflow_definition_ids IS NOT NULL
        AND work_unit_definition_id IS NULL
        AND context_fact_definition_id IS NULL
      ) OR (
        target_kind = 'workflow'
        AND source_mode = 'context_fact_backed'
        AND workflow_definition_ids IS NULL
        AND work_unit_definition_id IS NULL
        AND context_fact_definition_id IS NOT NULL
      ) OR (
        target_kind = 'work_unit'
        AND source_mode = 'fixed_set'
        AND workflow_definition_ids IS NULL
        AND work_unit_definition_id IS NOT NULL
        AND context_fact_definition_id IS NULL
      ) OR (
        target_kind = 'work_unit'
        AND source_mode = 'context_fact_backed'
        AND workflow_definition_ids IS NULL
        AND work_unit_definition_id IS NULL
        AND context_fact_definition_id IS NOT NULL
      )
    )
  )`,
  `CREATE INDEX methodology_workflow_invoke_steps_target_idx ON methodology_workflow_invoke_steps (target_kind, source_mode)`,
  `CREATE INDEX methodology_workflow_invoke_steps_work_unit_idx ON methodology_workflow_invoke_steps (work_unit_definition_id)`,
  `CREATE INDEX methodology_workflow_invoke_steps_context_fact_idx ON methodology_workflow_invoke_steps (context_fact_definition_id)`,
  `CREATE TABLE methodology_workflow_invoke_bindings (
    id TEXT PRIMARY KEY,
    invoke_step_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    binding_type TEXT NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (invoke_step_id) REFERENCES methodology_workflow_invoke_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(invoke_step_id, target_path)
  )`,
  `CREATE INDEX methodology_workflow_invoke_bindings_step_order_idx ON methodology_workflow_invoke_bindings (invoke_step_id, sort_order)`,
  `CREATE TABLE methodology_workflow_invoke_transitions (
    id TEXT PRIMARY KEY,
    invoke_step_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    workflow_definition_ids TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (invoke_step_id) REFERENCES methodology_workflow_invoke_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (transition_id) REFERENCES work_unit_lifecycle_transitions(id) ON DELETE CASCADE,
    UNIQUE(invoke_step_id, transition_id)
  )`,
  `CREATE INDEX methodology_workflow_invoke_transitions_step_order_idx ON methodology_workflow_invoke_transitions (invoke_step_id, sort_order)`,
  `CREATE TABLE methodology_workflow_branch_steps (
    step_id TEXT PRIMARY KEY,
    default_target_step_id TEXT,
    config_json TEXT,
    FOREIGN KEY (step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (default_target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE SET NULL
  )`,
  `CREATE INDEX methodology_workflow_branch_steps_default_target_idx ON methodology_workflow_branch_steps (default_target_step_id)`,
  `CREATE TABLE methodology_workflow_branch_routes (
    id TEXT PRIMARY KEY,
    branch_step_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    target_step_id TEXT NOT NULL,
    condition_mode TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (branch_step_id) REFERENCES methodology_workflow_branch_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY (target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE RESTRICT,
    CONSTRAINT methodology_workflow_branch_routes_condition_mode_check CHECK (condition_mode in ('all', 'any')),
    UNIQUE(branch_step_id, route_id),
    UNIQUE(branch_step_id, target_step_id)
  )`,
  `CREATE INDEX methodology_workflow_branch_routes_step_order_idx ON methodology_workflow_branch_routes (branch_step_id, sort_order)`,
  `CREATE TABLE methodology_workflow_branch_route_groups (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (route_id) REFERENCES methodology_workflow_branch_routes(id) ON DELETE CASCADE,
    CONSTRAINT methodology_workflow_branch_route_groups_mode_check CHECK (mode in ('all', 'any')),
    UNIQUE(route_id, group_id)
  )`,
  `CREATE INDEX methodology_workflow_branch_route_groups_route_order_idx ON methodology_workflow_branch_route_groups (route_id, sort_order)`,
  `CREATE TABLE methodology_workflow_branch_route_conditions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    context_fact_kind TEXT NOT NULL,
    operator TEXT NOT NULL,
    is_negated INTEGER NOT NULL DEFAULT 0,
    comparison_json TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (group_id) REFERENCES methodology_workflow_branch_route_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(group_id, condition_id)
  )`,
  `CREATE INDEX methodology_workflow_branch_route_conditions_group_order_idx ON methodology_workflow_branch_route_conditions (group_id, sort_order)`,
  `CREATE TABLE methodology_workflow_context_fact_draft_specs (
    id TEXT PRIMARY KEY,
    context_fact_definition_id TEXT NOT NULL,
    work_unit_definition_id TEXT NOT NULL,
    FOREIGN KEY (context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY (work_unit_definition_id) REFERENCES methodology_work_unit_types(id) ON DELETE CASCADE,
    UNIQUE(context_fact_definition_id)
  )`,
  `CREATE INDEX methodology_wf_ctx_draft_spec_work_unit_idx ON methodology_workflow_context_fact_draft_specs (work_unit_definition_id)`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_selections (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    selection_type TEXT NOT NULL,
    definition_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (draft_spec_id) REFERENCES methodology_workflow_context_fact_draft_specs(id) ON DELETE CASCADE,
    CONSTRAINT methodology_wf_ctx_draft_spec_selection_type_check CHECK (selection_type in ('fact', 'artifact')),
    UNIQUE(draft_spec_id, selection_type, definition_id)
  )`,
  `CREATE INDEX methodology_wf_ctx_draft_spec_selection_order_idx ON methodology_workflow_context_fact_draft_spec_selections (draft_spec_id, sort_order)`,
];

function getTableName(table: unknown): string {
  return (table as Record<symbol, string | undefined>)[drizzleNameSymbol] ?? "";
}

function getInlineForeignKey(table: unknown, index = 0) {
  return (
    table as Record<
      symbol,
      | Array<{ onDelete: string | undefined; reference: () => { foreignTable: unknown } }>
      | undefined
    >
  )[drizzleInlineForeignKeysSymbol]?.[index];
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

function getConfigByName(table: unknown, name: string) {
  const entry = getExtraConfigs(table).find(
    (configEntry) => configEntry.config?.name === name || configEntry.name === name,
  );
  return entry?.config ?? entry;
}

async function expectConstraintFailure(promise: Promise<unknown>) {
  await expect(promise).rejects.toThrow(/constraint|check|unique|foreign key/i);
}

describe("l3 design-time invoke + branch schema", () => {
  let client: Client;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-design-time-invoke-branch-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    await client.execute("PRAGMA foreign_keys = ON");

    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`INSERT INTO methodology_versions (id) VALUES ('version-1')`);
    await client.execute(`
      INSERT INTO methodology_work_unit_types (id, methodology_version_id, key)
      VALUES
        ('wut-epic', 'version-1', 'WU.EPIC'),
        ('wut-story', 'version-1', 'WU.STORY')
    `);
    await client.execute(`
      INSERT INTO work_unit_lifecycle_transitions (id, methodology_version_id, work_unit_type_id, transition_key)
      VALUES ('transition-activate', 'version-1', 'wut-story', 'activate')
    `);
    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, work_unit_type_id, key)
      VALUES ('workflow-1', 'version-1', 'wut-epic', 'wu.epic.plan')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_steps (id, methodology_version_id, workflow_id, key, type)
      VALUES
        ('step-branch', 'version-1', 'workflow-1', 'branch', 'branch'),
        ('step-invoke', 'version-1', 'workflow-1', 'invoke', 'invoke'),
        ('step-review', 'version-1', 'workflow-1', 'review', 'display'),
        ('step-complete', 'version-1', 'workflow-1', 'complete', 'display'),
        ('step-default', 'version-1', 'workflow-1', 'default', 'display')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (
        id, workflow_definition_id, fact_key, fact_kind, cardinality
      ) VALUES
        ('ctx-selected-workflows', 'workflow-1', 'selected_workflows', 'workflow_reference_fact', 'many'),
        ('ctx-story-draft', 'workflow-1', 'story_draft', 'work_unit_draft_spec_fact', 'one'),
        ('ctx-branch-input', 'workflow-1', 'branch_input', 'plain_value_fact', 'one')
    `);
  });

  afterEach(async () => {
    client?.close();
    rmSync(dbPath, { force: true });
  });

  it("exposes invoke, branch, and draft-spec tables with locked columns and foreign keys", () => {
    expect(methodologySchema.methodologyWorkflowInvokeSteps.stepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.targetKind).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.sourceMode).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.workflowDefinitionIds).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.workUnitDefinitionId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.contextFactDefinitionId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeSteps.configJson).toBeDefined();

    expect(methodologySchema.methodologyWorkflowInvokeBindings.invokeStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeBindings.destinationKind).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeBindings.destinationKey).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowInvokeBindings.workUnitFactDefinitionId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowInvokeBindings.artifactSlotDefinitionId,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeBindings.sourceKind).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowInvokeBindings.contextFactDefinitionId,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeBindings.literalValueJson).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeBindings.sortOrder).toBeDefined();

    expect(methodologySchema.methodologyWorkflowInvokeTransitions.invokeStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeTransitions.transitionId).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowInvokeTransitions.workflowDefinitionIds,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowInvokeTransitions.sortOrder).toBeDefined();

    expect(methodologySchema.methodologyWorkflowBranchSteps.stepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchSteps.defaultTargetStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchSteps.configJson).toBeDefined();

    expect(methodologySchema.methodologyWorkflowBranchRoutes.branchStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRoutes.routeId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRoutes.targetStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRoutes.conditionMode).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRoutes.sortOrder).toBeDefined();

    expect(methodologySchema.methodologyWorkflowBranchRouteGroups.routeId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteGroups.groupId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteGroups.mode).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteGroups.sortOrder).toBeDefined();

    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.groupId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.conditionId).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowBranchRouteConditions.contextFactDefinitionId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowBranchRouteConditions.contextFactKind,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.operator).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.isNegated).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.comparisonJson).toBeDefined();
    expect(methodologySchema.methodologyWorkflowBranchRouteConditions.sortOrder).toBeDefined();

    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecs.workUnitDefinitionId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecSelections.draftSpecId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecSelections.selectionType,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecSelections.definitionId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecSelections.sortOrder,
    ).toBeDefined();

    const invokeStepFk = getInlineForeignKey(methodologySchema.methodologyWorkflowInvokeSteps);
    const invokeWorkUnitFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowInvokeSteps,
      1,
    );
    const invokeContextFactFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowInvokeSteps,
      2,
    );
    expect(getTableName(invokeStepFk?.reference().foreignTable)).toBe("methodology_workflow_steps");
    expect(getTableName(invokeWorkUnitFk?.reference().foreignTable)).toBe(
      "methodology_work_unit_types",
    );
    expect(getTableName(invokeContextFactFk?.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
    expect(invokeStepFk?.onDelete).toBe("cascade");

    const branchRouteBranchFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowBranchRoutes,
    );
    const branchRouteTargetFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowBranchRoutes,
      1,
    );
    expect(getTableName(branchRouteBranchFk?.reference().foreignTable)).toBe(
      "methodology_workflow_branch_steps",
    );
    expect(getTableName(branchRouteTargetFk?.reference().foreignTable)).toBe(
      "methodology_workflow_steps",
    );
    expect(branchRouteBranchFk?.onDelete).toBe("cascade");
    expect(branchRouteTargetFk?.onDelete).toBe("restrict");

    const draftSpecContextFactFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowContextFactDraftSpecs,
    );
    const draftSpecWorkUnitFk = getInlineForeignKey(
      methodologySchema.methodologyWorkflowContextFactDraftSpecs,
      1,
    );
    expect(getTableName(draftSpecContextFactFk?.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
    expect(getTableName(draftSpecWorkUnitFk?.reference().foreignTable)).toBe(
      "methodology_work_unit_types",
    );
  });

  it("declares locked unique indices and checks for invoke, branch, and draft-spec selections", () => {
    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowInvokeSteps,
        "methodology_workflow_invoke_steps_target_source_check",
      ),
    ).toBeDefined();

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowInvokeTransitions,
        "methodology_workflow_invoke_transitions_step_transition_idx",
      ),
    ).toMatchObject({ unique: true });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowBranchRoutes,
        "methodology_workflow_branch_routes_step_route_idx",
      ),
    ).toMatchObject({ unique: true, columns: [{ name: "branch_step_id" }, { name: "route_id" }] });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowBranchRoutes,
        "methodology_workflow_branch_routes_step_target_idx",
      ),
    ).toMatchObject({
      unique: true,
      columns: [{ name: "branch_step_id" }, { name: "target_step_id" }],
    });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowBranchRouteGroups,
        "methodology_workflow_branch_route_groups_route_group_idx",
      ),
    ).toMatchObject({ unique: true, columns: [{ name: "route_id" }, { name: "group_id" }] });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowBranchRouteConditions,
        "methodology_workflow_branch_route_conditions_group_condition_idx",
      ),
    ).toMatchObject({ unique: true, columns: [{ name: "group_id" }, { name: "condition_id" }] });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowContextFactDraftSpecSelections,
        "methodology_wf_ctx_draft_spec_selection_def_idx",
      ),
    ).toMatchObject({
      unique: true,
      columns: [{ name: "draft_spec_id" }, { name: "selection_type" }, { name: "definition_id" }],
    });

    expect(
      getConfigByName(
        methodologySchema.methodologyWorkflowContextFactDraftSpecSelections,
        "methodology_wf_ctx_draft_spec_selection_type_check",
      ),
    ).toBeDefined();
  });

  it("enforces cascade deletes across invoke, branch, and draft-spec child rows", async () => {
    await client.execute(`
      INSERT INTO methodology_workflow_invoke_steps (
        step_id, target_kind, source_mode, work_unit_definition_id, config_json
      ) VALUES ('step-invoke', 'work_unit', 'fixed_set', 'wut-story', '{"fanOut":true}')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_invoke_bindings (
        id, invoke_step_id, context_fact_definition_id, binding_type, source_path, target_path, sort_order
      ) VALUES (
        'invoke-binding-1',
        'step-invoke',
        'ctx-branch-input',
        'input',
        '$.facts.branch_input',
        '$.draft.requirements',
        0
      )
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_invoke_transitions (
        id, invoke_step_id, transition_id, workflow_definition_ids, sort_order
      ) VALUES (
        'invoke-transition-1',
        'step-invoke',
        'transition-activate',
        '["workflow-1"]',
        0
      )
    `);

    await client.execute(`
      INSERT INTO methodology_workflow_branch_steps (
        step_id, default_target_step_id, config_json
      ) VALUES ('step-branch', 'step-default', '{"label":"Branch"}')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_branch_routes (
        id, branch_step_id, route_id, target_step_id, condition_mode, sort_order
      ) VALUES ('branch-route-1', 'step-branch', 'route-review', 'step-review', 'all', 0)
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_branch_route_groups (
        id, route_id, group_id, mode, sort_order
      ) VALUES ('branch-group-1', 'branch-route-1', 'group-review', 'all', 0)
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_branch_route_conditions (
        id,
        group_id,
        condition_id,
        context_fact_definition_id,
        context_fact_kind,
        operator,
        is_negated,
        comparison_json,
        sort_order
      ) VALUES (
        'branch-condition-1',
        'branch-group-1',
        'condition-review',
        'ctx-branch-input',
        'plain_value_fact',
        'equals',
        0,
        '{"value":"needs_review"}',
        0
      )
    `);

    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_draft_specs (
        id, context_fact_definition_id, work_unit_definition_id
      ) VALUES ('draft-spec-1', 'ctx-story-draft', 'wut-story')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_draft_spec_selections (
        id, draft_spec_id, selection_type, definition_id, sort_order
      ) VALUES
        ('draft-selection-1', 'draft-spec-1', 'fact', 'wf-story-summary', 0),
        ('draft-selection-2', 'draft-spec-1', 'artifact', 'artifact-story-doc', 1)
    `);

    await client.execute(`DELETE FROM methodology_workflow_steps WHERE id = 'step-invoke'`);
    expect(
      Number(
        (await client.execute(`SELECT COUNT(*) AS count FROM methodology_workflow_invoke_steps`))
          .rows[0]?.count,
      ),
    ).toBe(0);
    expect(
      Number(
        (await client.execute(`SELECT COUNT(*) AS count FROM methodology_workflow_invoke_bindings`))
          .rows[0]?.count,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await client.execute(
            `SELECT COUNT(*) AS count FROM methodology_workflow_invoke_transitions`,
          )
        ).rows[0]?.count,
      ),
    ).toBe(0);

    await client.execute(`DELETE FROM methodology_workflow_steps WHERE id = 'step-branch'`);
    expect(
      Number(
        (await client.execute(`SELECT COUNT(*) AS count FROM methodology_workflow_branch_steps`))
          .rows[0]?.count,
      ),
    ).toBe(0);
    expect(
      Number(
        (await client.execute(`SELECT COUNT(*) AS count FROM methodology_workflow_branch_routes`))
          .rows[0]?.count,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await client.execute(
            `SELECT COUNT(*) AS count FROM methodology_workflow_branch_route_groups`,
          )
        ).rows[0]?.count,
      ),
    ).toBe(0);
    expect(
      Number(
        (
          await client.execute(
            `SELECT COUNT(*) AS count FROM methodology_workflow_branch_route_conditions`,
          )
        ).rows[0]?.count,
      ),
    ).toBe(0);

    await client.execute(
      `DELETE FROM methodology_workflow_context_fact_draft_specs WHERE id = 'draft-spec-1'`,
    );
    expect(
      Number(
        (
          await client.execute(
            `SELECT COUNT(*) AS count FROM methodology_workflow_context_fact_draft_spec_selections`,
          )
        ).rows[0]?.count,
      ),
    ).toBe(0);
  });

  it("rejects invalid invoke, branch, and draft-spec structural states", async () => {
    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_invoke_steps (
          step_id, target_kind, source_mode, workflow_definition_ids, context_fact_definition_id
        ) VALUES (
          'step-invoke',
          'workflow',
          'fixed_set',
          '["workflow-1"]',
          'ctx-selected-workflows'
        )
      `),
    );

    await client.execute(`
      INSERT INTO methodology_workflow_branch_steps (
        step_id, default_target_step_id, config_json
      ) VALUES ('step-branch', 'step-default', '{"label":"Branch"}')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_branch_routes (
        id, branch_step_id, route_id, target_step_id, condition_mode, sort_order
      ) VALUES ('branch-route-1', 'step-branch', 'route-review', 'step-review', 'all', 0)
    `);

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_branch_routes (
          id, branch_step_id, route_id, target_step_id, condition_mode, sort_order
        ) VALUES ('branch-route-2', 'step-branch', 'route-complete', 'step-review', 'any', 1)
      `),
    );

    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_draft_specs (
        id, context_fact_definition_id, work_unit_definition_id
      ) VALUES ('draft-spec-1', 'ctx-story-draft', 'wut-story')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_draft_spec_selections (
        id, draft_spec_id, selection_type, definition_id, sort_order
      ) VALUES ('draft-selection-1', 'draft-spec-1', 'fact', 'wf-story-summary', 0)
    `);

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_context_fact_draft_spec_selections (
          id, draft_spec_id, selection_type, definition_id, sort_order
        ) VALUES ('draft-selection-2', 'draft-spec-1', 'fact', 'wf-story-summary', 1)
      `),
    );

    await expectConstraintFailure(
      client.execute(`
        INSERT INTO methodology_workflow_context_fact_draft_spec_selections (
          id, draft_spec_id, selection_type, definition_id, sort_order
        ) VALUES ('draft-selection-3', 'draft-spec-1', 'unknown', 'artifact-story-doc', 2)
      `),
    );
  });
});
