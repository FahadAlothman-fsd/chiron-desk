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

  it("returns an Effect error for unknown story", () => {
    const error = Effect.runSync(Effect.flip(getStorySeedPlan("999")));

    expect(error._tag).toBe("StorySeedNotFoundError");
    expect(error.storyId).toBe("999");
    expect(error.availableStorySeedIds).toEqual(["2-1"]);
  });
});
