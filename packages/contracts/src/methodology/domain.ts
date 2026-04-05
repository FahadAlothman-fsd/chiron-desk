export interface WorkflowStepEntity {
  readonly key: string;
  readonly type: "form" | "agent" | "action" | "invoke" | "branch" | "display";
  readonly displayName?: string;
  readonly config?: unknown;
}

export interface WorkflowEdgeEntity {
  readonly fromStepKey: string | null;
  readonly toStepKey: string | null;
  readonly edgeKey?: string;
}

export interface WorkflowEntity {
  readonly key: string;
  readonly displayName?: string;
  readonly workUnitTypeKey?: string;
  readonly steps: readonly WorkflowStepEntity[];
  readonly edges: readonly WorkflowEdgeEntity[];
}

export interface TransitionWorkflowBindingEntity {
  readonly transitionKey: string;
  readonly workflowKeys: readonly string[];
}
