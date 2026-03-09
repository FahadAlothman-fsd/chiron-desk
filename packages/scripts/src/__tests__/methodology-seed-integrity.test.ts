import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { getStorySeedPlan } from "../story-seed-fixtures";

const FORBIDDEN_EXTENSION_KEYS = [
  "workUnitTypes",
  "agentTypes",
  "transitions",
  "workflows",
  "transitionWorkflowBindings",
  "factDefinitions",
  "linkTypeDefinitions",
] as const;

async function loadMethodologySeedArtifacts() {
  process.env.DATABASE_URL ??= "file:test.db";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-for-methodology-seeds-123";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.CORS_ORIGIN ??= "http://localhost:3000";

  return import("../seed/methodology");
}

describe("methodology seed integrity", () => {
  it("keeps story seed plans free of forbidden canonical extension keys", () => {
    const plan = Effect.runSync(getStorySeedPlan("2-7"));

    for (const version of plan.methodologyVersions) {
      const versionRecord = version as Record<string, unknown>;
      const definitionExtensions =
        versionRecord.definitionExtensions && typeof versionRecord.definitionExtensions === "object"
          ? (versionRecord.definitionExtensions as Record<string, unknown>)
          : {};

      for (const forbiddenKey of FORBIDDEN_EXTENSION_KEYS) {
        expect(definitionExtensions[forbiddenKey]).toBeUndefined();
      }
    }
  });

  it("keeps the onboarding slice canonical and project-context only", async () => {
    const {
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      methodologySeedSlices,
    } = await loadMethodologySeedArtifacts();

    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).toContain(
      "methodology_transition_condition_sets",
    );
    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).not.toContain(
      "methodology_transition_required_links",
    );
    expect(Object.keys(methodologySeedSlices)).toEqual(["project_context"]);
    expect(methodologySeedSlices.project_context.workUnitKey).toBe("WU.PROJECT_CONTEXT");

    expect(methodologyCanonicalTableSeedRows.methodology_work_unit_types).toHaveLength(1);
    expect(methodologyCanonicalTableSeedRows.methodology_work_unit_types[0]?.key).toBe(
      "WU.PROJECT_CONTEXT",
    );

    expect(methodologyCanonicalTableSeedRows.methodology_lifecycle_states).toHaveLength(1);
    expect(methodologyCanonicalTableSeedRows.methodology_lifecycle_states[0]?.key).toBe("done");
    expect(
      methodologyCanonicalTableSeedRows.methodology_lifecycle_states[0]?.descriptionJson,
    ).toMatchObject({
      human: { markdown: expect.any(String) },
      agent: { markdown: expect.any(String) },
    });
    expect(
      methodologyCanonicalTableSeedRows.methodology_lifecycle_states[0]?.guidanceJson,
    ).toMatchObject({
      human: { markdown: expect.any(String) },
      agent: { markdown: expect.any(String) },
    });

    expect(methodologyCanonicalTableSeedRows.methodology_lifecycle_transitions).toHaveLength(1);
    expect(methodologyCanonicalTableSeedRows.methodology_lifecycle_transitions[0]).toMatchObject({
      transitionKey: "__absent__->done",
      fromStateId: null,
      gateClass: "start_gate",
    });

    expect(methodologyCanonicalTableSeedRows.methodology_transition_condition_sets).toHaveLength(2);
    expect(
      methodologyCanonicalTableSeedRows.methodology_transition_condition_sets.map((row) => row.key),
    ).toEqual(["gate.activate.wu.project_context", "gate.complete.wu.project_context"]);
    expect(
      methodologyCanonicalTableSeedRows.methodology_transition_condition_sets.map(
        (row) => row.phase,
      ),
    ).toEqual(["start", "completion"]);

    expect(methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings).toHaveLength(
      2,
    );
    expect(methodologySeedSlices.project_context.workflowKeys).toEqual([
      "document-project",
      "generate-project-context",
    ]);

    const workflows = methodologyCanonicalTableSeedRows.methodology_workflows;
    expect(workflows).toHaveLength(2);
    for (const workflow of workflows) {
      expect(workflow.metadataJson).toMatchObject({ module: "bmm" });
      expect(workflow.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
      expect(workflow.inputContractJson).toMatchObject({
        kind: "workflow-io.v1",
      });
      expect(workflow.outputContractJson).toMatchObject({
        kind: "workflow-io.v1",
      });
    }

    for (const step of methodologyCanonicalTableSeedRows.methodology_workflow_steps) {
      expect(step.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }

    for (const conditionSet of methodologyCanonicalTableSeedRows.methodology_transition_condition_sets) {
      expect(conditionSet.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }
  });
});
