export type BmadSeedTransition = {
  from: string;
  to: string;
};

export type BmadWorkflowSeed = {
  key: string;
  displayName: string;
  module: string;
  ownerWorkUnitRef: string;
  ownerWorkUnitType: string;
  transition: BmadSeedTransition | null;
  enabled: boolean;
  definitionJson: {
    id: string;
    name: string;
    steps: Array<{
      id: string;
      type: "form" | "agent" | "action" | "invoke" | "branch" | "display";
      templateRef?: string;
      overrides?: Record<string, unknown>;
    }>;
  };
};

export type BmadWorkflowDefinitionsSeedFile = {
  version: string;
  methodologyVersionKey: string;
  promptCatalogRef: string;
  stepTemplateRef: string;
  workflows: BmadWorkflowSeed[];
};

export type BmadTransitionAllowedWorkflow = {
  workflowKey: string;
  priority: number | null;
  enabled: boolean;
  bindingDefaultsJson?: Record<string, unknown>;
};

export type BmadTransitionBinding = {
  workUnitRef: string;
  workUnitType: string;
  fromState: string;
  toState: string;
  allowed: BmadTransitionAllowedWorkflow[];
};

export type BmadTransitionAllowedSeedFile = {
  version: string;
  methodologyVersionKey: string;
  source: string;
  bindings: BmadTransitionBinding[];
};
