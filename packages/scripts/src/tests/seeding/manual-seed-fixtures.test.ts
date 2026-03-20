import { describe, expect, it } from "vitest";

import { BASELINE_MANUAL_SEED_PLAN } from "../../manual-seed-fixtures";

describe("manual seed fixtures", () => {
  it("returns canonical baseline manual seed data", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.planId).toBe("baseline_manual");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0]?.key).toBe("bmad.v1");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(1);

    const published = BASELINE_MANUAL_SEED_PLAN.methodologyVersions[0];

    expect(published?.status).toBe("active");
    expect(published?.displayName).toBe("BMAD v1");
    expect(published?.id).toBe("mver_bmad_v1_active");
  });

  it("includes deterministic operator login account", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.users).toEqual([
      {
        name: "Chiron Operator",
        email: "operator@chiron.local",
        password: "chiron-operator-123",
      },
    ]);
  });
});
