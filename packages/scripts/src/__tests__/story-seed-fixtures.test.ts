import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { getStorySeedPlan } from "../story-seed-fixtures";

describe("story seed fixtures", () => {
  it("returns canonical Story 2.7 BMAD seed data", () => {
    const plan = Effect.runSync(getStorySeedPlan("2-7"));

    expect(plan.storyId).toBe("2-7");
    expect(plan.methodologyDefinitions).toHaveLength(1);
    expect(plan.methodologyDefinitions[0]?.key).toBe("bmad.v1");
    expect(plan.methodologyVersions).toHaveLength(1);

    const published = plan.methodologyVersions[0];

    expect(published?.status).toBe("active");
    expect(published?.displayName).toBe("BMAD v1");
  });

  it("returns an Effect error for unknown story", () => {
    const error = Effect.runSync(Effect.flip(getStorySeedPlan("999")));

    expect(error._tag).toBe("StorySeedNotFoundError");
    expect(error.storyId).toBe("999");
    expect(error.availableStorySeedIds).toEqual(["2-7"]);
  });
});
