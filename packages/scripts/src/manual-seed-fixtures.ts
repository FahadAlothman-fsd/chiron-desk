export type ManualSeedUser = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
};

export type ManualSeedMethodologyDefinition = {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly descriptionJson: Record<string, unknown>;
};

export type ManualSeedMethodologyVersion = {
  readonly id: string;
  readonly methodologyId: string;
  readonly version: string;
  readonly status: "draft" | "active" | "retired";
  readonly displayName: string;
  readonly retiredAt: Date | null;
};

export type ManualSeedPlan = {
  readonly planId: "baseline_manual";
  readonly users: readonly ManualSeedUser[];
  readonly methodologyDefinitions: readonly ManualSeedMethodologyDefinition[];
  readonly methodologyVersions: readonly ManualSeedMethodologyVersion[];
};

export const BASELINE_MANUAL_SEED_PLAN: ManualSeedPlan = {
  planId: "baseline_manual",
  users: [
    {
      name: "Chiron Operator",
      email: "operator@chiron.local",
      password: "chiron-operator-123",
    },
  ],
  methodologyDefinitions: [
    {
      id: "mdef_bmad_v1",
      key: "bmad.slice-a.v1",
      name: "BMAD v1 — Slice A",
      descriptionJson: {
        markdown:
          "Refined Slice-A canonical methodology definition for setup, brainstorming, and research.",
      },
    },
  ],
  methodologyVersions: [
    {
      id: "mver_bmad_v1_draft",
      methodologyId: "mdef_bmad_v1",
      version: "v1-slice-a-draft",
      status: "draft",
      displayName: "BMAD v1 — Slice A (Draft)",
      retiredAt: null,
    },
    {
      id: "mver_bmad_v1_active",
      methodologyId: "mdef_bmad_v1",
      version: "v1-slice-a",
      status: "active",
      displayName: "BMAD v1 — Slice A",
      retiredAt: null,
    },
  ],
};
