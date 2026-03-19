import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { availableStorySeedIds, getStorySeedPlan } from "../../story-seed-fixtures";

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

  return import("../../seed/methodology");
}

describe("methodology seed integrity", () => {
  it("keeps all story seed plans free of forbidden canonical extension keys", () => {
    for (const storySeedId of availableStorySeedIds) {
      const plan = Effect.runSync(getStorySeedPlan(storySeedId));

      for (const version of plan.methodologyVersions) {
        const versionRecord = version as Record<string, unknown>;
        const definitionExtensions =
          versionRecord.definitionExtensions &&
          typeof versionRecord.definitionExtensions === "object"
            ? (versionRecord.definitionExtensions as Record<string, unknown>)
            : {};

        for (const forbiddenKey of FORBIDDEN_EXTENSION_KEYS) {
          expect(definitionExtensions[forbiddenKey]).toBeUndefined();
        }
      }
    }
  });

  it("keeps the canonical slice metadata-only until L2 implementation", async () => {
    const {
      METHODOLOGY_CANONICAL_TABLE_SEED_ORDER,
      methodologyCanonicalTableSeedRows,
      methodologySeedSlices,
    } = await loadMethodologySeedArtifacts();

    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).toContain("transition_condition_sets");
    expect(METHODOLOGY_CANONICAL_TABLE_SEED_ORDER).not.toContain(
      "methodology_transition_required_links",
    );
    expect(Object.keys(methodologySeedSlices)).toEqual(["baseline_metadata"]);
    expect(methodologySeedSlices.baseline_metadata.slice).toBe("baseline_metadata");
    expect(methodologySeedSlices.baseline_metadata.workUnitKeys).toEqual([]);
    expect(methodologySeedSlices.baseline_metadata.workflowKeys).toEqual([]);

    expect(methodologyCanonicalTableSeedRows.methodology_work_unit_types).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.work_unit_lifecycle_states).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.work_unit_lifecycle_transitions).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.transition_condition_sets).toHaveLength(0);

    expect(methodologyCanonicalTableSeedRows.methodology_transition_workflow_bindings).toHaveLength(
      0,
    );
    expect(methodologyCanonicalTableSeedRows.methodology_workflows).toHaveLength(0);
    expect(methodologyCanonicalTableSeedRows.methodology_workflow_steps).toHaveLength(0);

    const factDefinitions = methodologyCanonicalTableSeedRows.methodology_fact_definitions;
    expect(factDefinitions).toHaveLength(2);
    for (const factDefinition of factDefinitions) {
      expect(factDefinition.guidanceJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
      expect(factDefinition.descriptionJson).toMatchObject({
        human: { markdown: expect.any(String) },
        agent: { markdown: expect.any(String) },
      });
    }
  });
});
