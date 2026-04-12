import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { createClient, type Client } from "@libsql/client";
import { Effect } from "effect";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import {
  ConditionValidator,
  ConditionValidatorLive,
  MethodologyRepository,
} from "@chiron/methodology-engine";
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
  `CREATE TABLE methodology_artifact_slot_definitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    key TEXT NOT NULL,
    display_name TEXT,
    description_json TEXT,
    guidance_json TEXT,
    cardinality TEXT NOT NULL,
    rules_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE work_unit_lifecycle_transitions (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    work_unit_type_id TEXT NOT NULL,
    from_state_id TEXT,
    to_state_id TEXT,
    transition_key TEXT NOT NULL,
    description_json TEXT,
    guidance_json TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
  )`,
  `CREATE TABLE transition_condition_sets (
    id TEXT PRIMARY KEY,
    methodology_version_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    key TEXT NOT NULL,
    phase TEXT NOT NULL,
    mode TEXT NOT NULL,
    groups_json TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
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
    context_fact_definition_id TEXT NOT NULL,
    work_unit_definition_id TEXT NOT NULL,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY(work_unit_definition_id) REFERENCES methodology_work_unit_types(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_selections (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    selection_type TEXT NOT NULL,
    definition_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(draft_spec_id) REFERENCES methodology_workflow_context_fact_draft_specs(id) ON DELETE CASCADE,
    UNIQUE(draft_spec_id, selection_type, definition_id)
  )`,
  `CREATE TABLE methodology_workflow_context_fact_draft_spec_fields (
    id TEXT PRIMARY KEY,
    draft_spec_id TEXT NOT NULL,
    work_unit_fact_definition_id TEXT NOT NULL,
    FOREIGN KEY(draft_spec_id) REFERENCES methodology_workflow_context_fact_draft_specs(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_invoke_steps (
    step_id TEXT PRIMARY KEY,
    target_kind TEXT NOT NULL,
    source_mode TEXT NOT NULL,
    workflow_definition_ids TEXT,
    work_unit_definition_id TEXT,
    context_fact_definition_id TEXT,
    config_json TEXT,
    FOREIGN KEY(step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY(work_unit_definition_id) REFERENCES methodology_work_unit_types(id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE methodology_workflow_invoke_bindings (
    id TEXT PRIMARY KEY,
    invoke_step_id TEXT NOT NULL,
    destination_kind TEXT NOT NULL,
    destination_key TEXT NOT NULL,
    work_unit_fact_definition_id TEXT,
    artifact_slot_definition_id TEXT,
    source_kind TEXT NOT NULL,
    context_fact_definition_id TEXT,
    literal_value_json TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(invoke_step_id) REFERENCES methodology_workflow_invoke_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY(work_unit_fact_definition_id) REFERENCES work_unit_fact_definitions(id) ON DELETE CASCADE,
    FOREIGN KEY(artifact_slot_definition_id) REFERENCES methodology_artifact_slot_definitions(id) ON DELETE CASCADE,
    UNIQUE(invoke_step_id, destination_key)
  )`,
  `CREATE TABLE methodology_workflow_invoke_transitions (
    id TEXT PRIMARY KEY,
    invoke_step_id TEXT NOT NULL,
    transition_id TEXT NOT NULL,
    workflow_definition_ids TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(invoke_step_id) REFERENCES methodology_workflow_invoke_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(transition_id) REFERENCES work_unit_lifecycle_transitions(id) ON DELETE CASCADE,
    UNIQUE(invoke_step_id, transition_id)
  )`,
  `CREATE TABLE methodology_workflow_branch_steps (
    step_id TEXT PRIMARY KEY,
    default_target_step_id TEXT,
    config_json TEXT,
    FOREIGN KEY(step_id) REFERENCES methodology_workflow_steps(id) ON DELETE CASCADE,
    FOREIGN KEY(default_target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE methodology_workflow_branch_routes (
    id TEXT PRIMARY KEY,
    branch_step_id TEXT NOT NULL,
    route_id TEXT NOT NULL,
    target_step_id TEXT NOT NULL,
    condition_mode TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(branch_step_id) REFERENCES methodology_workflow_branch_steps(step_id) ON DELETE CASCADE,
    FOREIGN KEY(target_step_id) REFERENCES methodology_workflow_steps(id) ON DELETE RESTRICT,
    UNIQUE(branch_step_id, route_id),
    UNIQUE(branch_step_id, target_step_id)
  )`,
  `CREATE TABLE methodology_workflow_branch_route_groups (
    id TEXT PRIMARY KEY,
    route_id TEXT NOT NULL,
    group_id TEXT NOT NULL,
    mode TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(route_id) REFERENCES methodology_workflow_branch_routes(id) ON DELETE CASCADE,
    UNIQUE(route_id, group_id)
  )`,
  `CREATE TABLE methodology_workflow_branch_route_conditions (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    context_fact_definition_id TEXT NOT NULL,
    sub_field_key TEXT,
    operator TEXT NOT NULL,
    is_negated INTEGER NOT NULL DEFAULT 0,
    comparison_json TEXT,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY(group_id) REFERENCES methodology_workflow_branch_route_groups(id) ON DELETE CASCADE,
    FOREIGN KEY(context_fact_definition_id) REFERENCES methodology_workflow_context_fact_definitions(id) ON DELETE CASCADE,
    UNIQUE(group_id, condition_id)
  )`,
];

describe("l3 design-time invoke/branch methodology repository", () => {
  let client: Client;
  let db: LibSQLDatabase<typeof schema>;
  let dbPath: string;

  beforeEach(async () => {
    dbPath = `/tmp/chiron-l3-invoke-branch-repo-${randomUUID()}.db`;
    client = createClient({ url: `file:${dbPath}` });
    db = drizzle(client, { schema });

    await client.execute("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA_SQL) {
      await client.execute(statement);
    }

    await client.execute(`INSERT INTO methodology_versions (id) VALUES ('version-1')`);
    await client.execute(`
      INSERT INTO methodology_work_unit_types (id, methodology_version_id, key)
      VALUES
        ('wut-story', 'version-1', 'WU.STORY'),
        ('wut-epic', 'version-1', 'WU.EPIC')
    `);
    await client.execute(`
      INSERT INTO work_unit_fact_definitions (
        id, methodology_version_id, work_unit_type_id, name, key, fact_type, cardinality
      ) VALUES
        ('fact-title', 'version-1', 'wut-story', 'Title', 'title', 'string', 'one'),
        ('fact-summary', 'version-1', 'wut-story', 'Summary', 'summary', 'string', 'one')
    `);
    await client.execute(`
      INSERT INTO methodology_artifact_slot_definitions (
        id, methodology_version_id, work_unit_type_id, key, display_name, cardinality
      ) VALUES ('artifact-prd', 'version-1', 'wut-story', 'ART.PRD', 'PRD', 'single')
    `);
    await client.execute(`
      INSERT INTO work_unit_lifecycle_transitions (
        id, methodology_version_id, work_unit_type_id, transition_key
      ) VALUES ('transition-ready', 'version-1', 'wut-story', 'draft_to_ready')
    `);
    await client.execute(`
      INSERT INTO transition_condition_sets (
        id, methodology_version_id, transition_id, key, phase, mode, groups_json
      ) VALUES ('gate-1', 'version-1', 'transition-ready', 'gate.ready', 'start', 'all', '[]')
    `);
    await client.execute(`
      INSERT INTO methodology_workflows (id, methodology_version_id, work_unit_type_id, key, display_name)
      VALUES
        ('workflow-1', 'version-1', 'wut-story', 'wu.story.main', 'Story main'),
        ('workflow-aux', 'version-1', 'wut-story', 'wu.story.aux', 'Story aux')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_steps (
        id, methodology_version_id, workflow_id, key, type, display_name
      ) VALUES
        ('step-start', 'version-1', 'workflow-1', 'start', 'display', 'Start'),
        ('step-default', 'version-1', 'workflow-1', 'default-target', 'display', 'Default target'),
        ('step-route-a', 'version-1', 'workflow-1', 'route-a-target', 'display', 'Route A target'),
        ('step-route-b', 'version-1', 'workflow-1', 'route-b-target', 'display', 'Route B target')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_definitions (
        id, workflow_definition_id, fact_key, fact_kind, label, cardinality
      ) VALUES
        ('ctx-status', 'workflow-1', 'status', 'plain_value_fact', 'Status', 'one'),
        ('ctx-summary', 'workflow-1', 'summary', 'plain_value_fact', 'Summary', 'one'),
        ('ctx-artifact', 'workflow-1', 'prd_artifact', 'artifact_reference_fact', 'PRD artifact', 'many')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_plain_values (id, context_fact_definition_id, value_type)
      VALUES
        ('plain-status', 'ctx-status', 'string'),
        ('plain-summary', 'ctx-summary', 'string')
    `);
    await client.execute(`
      INSERT INTO methodology_workflow_context_fact_artifact_refs (id, context_fact_definition_id, artifact_slot_key)
      VALUES ('artifact-ref', 'ctx-artifact', 'ART.PRD')
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

  const runConditionValidator = <A>(
    fn: (validator: ConditionValidator["Type"]) => Effect.Effect<A, unknown, never>,
  ): Promise<A> =>
    Effect.runPromise(
      Effect.gen(function* () {
        const validator = yield* ConditionValidator;
        return yield* fn(validator);
      }).pipe(Effect.provide(ConditionValidatorLive)),
    );

  async function getCount(tableName: string): Promise<number> {
    const result = await client.execute(`SELECT COUNT(*) AS count FROM ${tableName}`);
    return Number(result.rows[0]?.count ?? 0);
  }

  it("persists invoke steps, reconciles omitted children, and preserves transition-gate storage", async () => {
    const created = await runRepo((repo) =>
      repo.createInvokeStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        payload: {
          key: "invoke-story-work",
          label: "Invoke story work",
          descriptionJson: { markdown: "Invoke a story workflow" },
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wut-story",
          bindings: [
            {
              destination: {
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "fact-title",
              },
              source: {
                kind: "context_fact",
                contextFactDefinitionId: "ctx-summary",
              },
            },
            {
              destination: {
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "fact-summary",
              },
              source: {
                kind: "context_fact",
                contextFactDefinitionId: "ctx-status",
              },
            },
          ],
          activationTransitions: [
            {
              transitionId: "transition-ready",
              workflowDefinitionIds: ["workflow-1", "workflow-aux"],
            },
          ],
        },
      }),
    );

    expect(created.payload.bindings).toHaveLength(2);
    expect(await getCount("methodology_workflow_invoke_bindings")).toBe(2);
    expect(await getCount("methodology_workflow_invoke_transitions")).toBe(1);
    expect(await getCount("transition_condition_sets")).toBe(1);

    const updated = await runRepo((repo) =>
      repo.updateInvokeStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
        payload: {
          key: "invoke-story-work-v2",
          label: "Invoke story work v2",
          targetKind: "work_unit",
          sourceMode: "fixed_set",
          workUnitDefinitionId: "wut-story",
          bindings: [
            {
              destination: {
                kind: "work_unit_fact",
                workUnitFactDefinitionId: "fact-title",
              },
              source: {
                kind: "context_fact",
                contextFactDefinitionId: "ctx-summary",
              },
            },
          ],
          activationTransitions: [],
        },
      }),
    );

    expect(updated.payload.key).toBe("invoke-story-work-v2");
    expect(updated.payload.bindings).toHaveLength(1);
    expect(updated.payload.activationTransitions).toEqual([]);
    expect(await getCount("methodology_workflow_invoke_bindings")).toBe(1);
    expect(await getCount("methodology_workflow_invoke_transitions")).toBe(0);
    expect(await getCount("transition_condition_sets")).toBe(1);

    const loaded = await runRepo((repo) =>
      repo.getInvokeStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
      }),
    );

    expect(loaded).toEqual({ stepId: created.stepId, payload: updated.payload });
  });

  it("persists branch steps with routes/groups/conditions and deletes omitted child rows", async () => {
    const created = await runRepo((repo) =>
      repo.createBranchStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        payload: {
          key: "branch-on-status",
          label: "Branch on status",
          defaultTargetStepId: "step-default",
          routes: [
            {
              routeId: "route-a",
              targetStepId: "step-route-a",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-a",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "cond-a1",
                      contextFactDefinitionId: "ctx-status",
                      subFieldKey: null,
                      operator: "equals",
                      isNegated: false,
                      comparisonJson: { value: "ready" },
                    },
                    {
                      conditionId: "cond-a2",
                      contextFactDefinitionId: "ctx-summary",
                      subFieldKey: null,
                      operator: "exists",
                      isNegated: false,
                      comparisonJson: null,
                    },
                  ],
                },
              ],
            },
            {
              routeId: "route-b",
              targetStepId: "step-route-b",
              conditionMode: "any",
              groups: [
                {
                  groupId: "group-b",
                  mode: "any",
                  conditions: [
                    {
                      conditionId: "cond-b1",
                      contextFactDefinitionId: "ctx-artifact",
                      subFieldKey: null,
                      operator: "exists",
                      isNegated: false,
                      comparisonJson: null,
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(await getCount("methodology_workflow_branch_routes")).toBe(2);
    expect(await getCount("methodology_workflow_branch_route_groups")).toBe(2);
    expect(await getCount("methodology_workflow_branch_route_conditions")).toBe(3);

    const updated = await runRepo((repo) =>
      repo.updateBranchStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
        payload: {
          key: "branch-on-status-v2",
          label: "Branch on status v2",
          defaultTargetStepId: "step-default",
          routes: [
            {
              routeId: "route-a",
              targetStepId: "step-route-a",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-a",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "cond-a1",
                      contextFactDefinitionId: "ctx-status",
                      subFieldKey: null,
                      operator: "equals",
                      isNegated: false,
                      comparisonJson: { value: "ready" },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }),
    );

    expect(updated.payload.routes).toHaveLength(1);
    expect(updated.payload.routes[0]?.groups[0]?.conditions).toHaveLength(1);
    expect(await getCount("methodology_workflow_branch_routes")).toBe(1);
    expect(await getCount("methodology_workflow_branch_route_groups")).toBe(1);
    expect(await getCount("methodology_workflow_branch_route_conditions")).toBe(1);

    const loaded = await runRepo((repo) =>
      repo.getBranchStepDefinition({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        stepId: created.stepId,
      }),
    );
    expect(loaded).toEqual({ stepId: created.stepId, payload: updated.payload });
  });

  it("round-trips redesigned draft-spec context facts with work-unit and typed selections", async () => {
    const createdFact = await runRepo((repo) =>
      repo.createWorkflowContextFactByDefinitionId({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
        fact: {
          kind: "work_unit_draft_spec_fact",
          key: "story_draft_spec",
          label: "Story draft spec",
          cardinality: "many",
          workUnitDefinitionId: "wut-story",
          selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-summary"],
          selectedArtifactSlotDefinitionIds: ["artifact-prd"],
        },
      }),
    );

    expect(createdFact.workUnitDefinitionId).toBe("wut-story");
    expect(await getCount("methodology_workflow_context_fact_draft_specs")).toBe(1);
    expect(await getCount("methodology_workflow_context_fact_draft_spec_selections")).toBe(3);

    const listedFacts = await runRepo((repo) =>
      repo.listWorkflowContextFactsByDefinitionId({
        versionId: "version-1",
        workflowDefinitionId: "workflow-1",
      }),
    );
    expect(listedFacts).toContainEqual({
      kind: "work_unit_draft_spec_fact",
      contextFactDefinitionId: expect.any(String),
      key: "story_draft_spec",
      label: "Story draft spec",
      cardinality: "many",
      workUnitDefinitionId: "wut-story",
      selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-summary"],
      selectedArtifactSlotDefinitionIds: ["artifact-prd"],
    });
  });

  it("validates branch condition operators for workflow-context-fact conditions only", async () => {
    await expect(
      runConditionValidator((validator) =>
        validator.validateCondition(
          {
            conditionId: "cond-valid",
            contextFactDefinitionId: "ctx-status",
            subFieldKey: null,
            operator: "equals",
            isNegated: false,
            comparisonJson: { value: "ready" },
          },
          { operandType: "string", cardinality: "one", freshnessCapable: false },
        ),
      ),
    ).resolves.toBeUndefined();

    const unsupportedOperator = await runConditionValidator((validator) =>
      Effect.either(
        validator.validateCondition(
          {
            conditionId: "cond-invalid-op",
            contextFactDefinitionId: "ctx-status",
            subFieldKey: null,
            operator: "regex",
            isNegated: false,
            comparisonJson: { value: "ready" },
          },
          { operandType: "string", cardinality: "one", freshnessCapable: false },
        ),
      ),
    );
    expect(unsupportedOperator._tag).toBe("Left");

    const unsupportedFactKind = await runConditionValidator((validator) =>
      Effect.either(
        validator.validateCondition(
          {
            conditionId: "cond-invalid-kind",
            contextFactDefinitionId: "ctx-status",
            subFieldKey: null,
            operator: "fresh",
            isNegated: false,
            comparisonJson: null,
          },
          { operandType: "json_object", cardinality: "one", freshnessCapable: false },
        ),
      ),
    );
    expect(unsupportedFactKind._tag).toBe("Left");
  });
});
