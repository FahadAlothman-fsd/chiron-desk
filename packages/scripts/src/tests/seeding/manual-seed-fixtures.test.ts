import { describe, expect, it } from "vitest";

import { BASELINE_MANUAL_SEED_PLAN } from "../../manual-seed-fixtures";

describe("manual seed fixtures", () => {
  it("returns canonical baseline manual seed data", () => {
    expect(BASELINE_MANUAL_SEED_PLAN.planId).toBe("baseline_manual");
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions).toHaveLength(1);
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyDefinitions[0]).toMatchObject({
      id: "mdef_bmad_v1",
      key: "bmad.slice-a.v1",
      name: "BMAD v1 — Slice A",
      descriptionJson: {
        markdown:
          "Refined Slice-A canonical methodology definition for setup through architecture.",
      },
    });
    expect(BASELINE_MANUAL_SEED_PLAN.methodologyVersions).toHaveLength(2);

    const draft = BASELINE_MANUAL_SEED_PLAN.methodologyVersions.find(
      (version) => version.status === "draft",
    );
    const active = BASELINE_MANUAL_SEED_PLAN.methodologyVersions.find(
      (version) => version.status === "active",
    );

    expect(draft).toMatchObject({
      id: "mver_bmad_v1_draft",
      methodologyId: "mdef_bmad_v1",
      version: "v1-slice-a-draft",
      status: "draft",
      displayName: "BMAD v1 — Slice A (Draft)",
      retiredAt: null,
    });

    expect(active).toMatchObject({
      id: "mver_bmad_v1_active",
      methodologyId: "mdef_bmad_v1",
      version: "v1-slice-a",
      status: "active",
      displayName: "BMAD v1 — Slice A",
      retiredAt: null,
    });
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
