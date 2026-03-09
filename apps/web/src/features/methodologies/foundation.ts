export const RUNTIME_DEFERRED_RATIONALE = "Workflow runtime execution unlocks in Epic 3+";

export type DeterministicState = "normal" | "loading" | "blocked" | "failed" | "success";

export type MethodologyCatalogItem = {
  methodologyId: string;
  methodologyKey: string;
  displayName: string;
  hasDraftVersion: boolean;
  availableVersions: number;
  updatedAt: string;
};

export type MethodologyVersionSummary = {
  id: string;
  version: string;
  status: string;
  displayName: string;
  createdAt: string;
  retiredAt: string | null;
};

export type MethodologyDetails = {
  methodologyId: string;
  methodologyKey: string;
  displayName: string;
  descriptionJson: unknown;
  createdAt: string;
  updatedAt: string;
  versions: readonly MethodologyVersionSummary[];
};

export function getDeterministicState(input: {
  isLoading: boolean;
  hasError: boolean;
  isBlocked?: boolean;
  hasData?: boolean;
}): DeterministicState {
  if (input.isBlocked) {
    return "blocked";
  }
  if (input.isLoading) {
    return "loading";
  }
  if (input.hasError) {
    return "failed";
  }
  if (input.hasData) {
    return "success";
  }
  return "normal";
}

export function sortCatalogDeterministically(
  items: readonly MethodologyCatalogItem[],
): MethodologyCatalogItem[] {
  return [...items].sort((a, b) => {
    const byUpdated = a.updatedAt.localeCompare(b.updatedAt);
    if (byUpdated !== 0) {
      return byUpdated;
    }

    return a.methodologyKey.localeCompare(b.methodologyKey);
  });
}

export function selectLatestDraft(
  versions: readonly MethodologyVersionSummary[],
): MethodologyVersionSummary | null {
  const drafts = versions.filter((version) => version.status === "draft");
  if (drafts.length === 0) {
    return null;
  }

  return (
    [...drafts].sort((a, b) => {
      const byCreatedAt = a.createdAt.localeCompare(b.createdAt);
      if (byCreatedAt !== 0) {
        return byCreatedAt;
      }
      return a.id.localeCompare(b.id);
    })[drafts.length - 1] ?? null
  );
}

export const DEFAULT_DEFINITION = {
  workUnitTypes: [
    {
      key: "task",
      cardinality: "one_per_project",
      lifecycleStates: [{ key: "done" }],
      lifecycleTransitions: [
        {
          transitionKey: "start",
          fromState: "__absent__",
          toState: "done",
          gateClass: "start_gate",
          conditionSets: [],
        },
      ],
      factSchemas: [],
    },
  ],
  agentTypes: [],
  artifactTemplates: [],
  workflows: [
    {
      key: "default-wf",
      steps: [{ key: "s1", type: "form" }],
      edges: [
        { fromStepKey: null, toStepKey: "s1", edgeKey: "entry" },
        { fromStepKey: "s1", toStepKey: null, edgeKey: "done" },
      ],
    },
  ],
  transitionWorkflowBindings: {
    start: ["default-wf"],
  },
} as const;
