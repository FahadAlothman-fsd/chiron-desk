import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { getStorySeedPlan } from "../story-seed-fixtures";

describe("story seed fixtures", () => {
  it("returns deterministic Story 2.1 seed data", () => {
    const plan = Effect.runSync(getStorySeedPlan("2-1"));

    expect(plan.storyId).toBe("2-1");
    expect(plan.users).toEqual([
      {
        name: "Chiron Operator",
        email: "operator@chiron.local",
        password: "chiron-operator-123",
      },
    ]);
    expect(plan.methodologyDefinitions).toHaveLength(3);
    expect(plan.methodologyVersions).toHaveLength(3);
    expect(plan.methodologyVersions.some((version) => version.status === "draft")).toBe(true);
  });

  it("returns canonical Story 2.2 BMAD seed data", () => {
    const plan = Effect.runSync(getStorySeedPlan("2-2"));

    expect(plan.storyId).toBe("2-2");
    expect(plan.methodologyDefinitions).toHaveLength(1);
    expect(plan.methodologyDefinitions[0]?.key).toBe("bmad.v1");
    expect(plan.methodologyVersions).toHaveLength(1);

    const draft = plan.methodologyVersions[0];
    expect(draft?.status).toBe("draft");

    const extensions = draft?.definitionExtensions as {
      workUnitTypes?: Array<{ key: string; cardinality: string }>;
      workflows?: Array<{ key: string; workUnitTypeKey?: string }>;
      transitionWorkflowBindings?: Record<string, string[]>;
    };

    expect(extensions.workflows?.length).toBeGreaterThan(0);
    expect(Object.keys(extensions.transitionWorkflowBindings ?? {}).length).toBeGreaterThan(0);

    const cardinalityByKey = Object.fromEntries(
      (extensions.workUnitTypes ?? []).map((workUnitType) => [
        workUnitType.key,
        workUnitType.cardinality,
      ]),
    );

    expect(cardinalityByKey["WU.PRD"]).toBe("one_per_project");
    expect(cardinalityByKey["WU.BRAINSTORMING"]).toBe("many_per_project");
  });

  it("returns an Effect error for unknown story", () => {
    const error = Effect.runSync(Effect.flip(getStorySeedPlan("999")));

    expect(error._tag).toBe("StorySeedNotFoundError");
    expect(error.storyId).toBe("999");
    expect(error.availableStorySeedIds).toEqual(["2-1", "2-2"]);
  });
});
