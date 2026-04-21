import type {
  AgentStepDesignTimePayload,
  AgentStepRuntimePolicy,
} from "@chiron/contracts/agent-step";
import type {
  ActionStepPayload,
  BranchRouteConditionPayload,
  BranchRouteGroupPayload,
  BranchRoutePayload,
  BranchStepPayload,
  FormStepFieldPayload,
  InvokeActivationTransitionPayload,
  InvokeBindingPayload,
  WorkflowContextFactCardinality,
  WorkflowContextFactKind,
  WorkflowContextFactValueType,
} from "@chiron/contracts/methodology/workflow";

export type WorkflowEditorMetadata = {
  workflowDefinitionId: string;
  key: string;
  displayName: string;
  descriptionMarkdown: string;
  entryStepId: string | null;
};

export type WorkflowEditorNodePosition = {
  x: number;
  y: number;
};

export type WorkflowFormStepPayload = {
  key: string;
  label?: string;
  descriptionJson?: { markdown: string };
  fields: FormStepFieldPayload[];
  guidance: WorkflowEditorGuidance;
};

export type WorkflowAgentStepPayload = Omit<AgentStepDesignTimePayload, "guidance"> & {
  descriptionJson?: { markdown: string };
  guidance?: {
    human: { markdown: string };
    agent: { markdown: string };
  };
};

export type WorkflowActionStepPayload = ActionStepPayload;

export type WorkflowBranchStepPayload = BranchStepPayload;

export type WorkflowBranchRoutePayload = BranchRoutePayload;

export type WorkflowBranchRouteGroupPayload = BranchRouteGroupPayload;

export type WorkflowBranchRouteConditionPayload = BranchRouteConditionPayload;

export type WorkflowConditionOperand = {
  operandType:
    | "string"
    | "number"
    | "boolean"
    | "work_unit"
    | "workflow_ref"
    | "artifact_snapshot"
    | "json_object";
  cardinality: "one" | "many";
  freshnessCapable: boolean;
};

export type WorkflowDraftSpecSubFieldOption = WorkflowEditorPickerOption & {
  kind: "fact" | "artifact";
  operandType: WorkflowConditionOperand["operandType"];
  cardinality: "one" | "many";
  freshnessCapable: boolean;
  validationKind?: "none" | "path" | "allowed-values";
  allowedValues?: readonly string[];
  workUnitStateOptions?: readonly WorkflowEditorPickerOption[];
};

export type WorkflowConditionOperator = {
  key: string;
  label: string;
  requiresComparison: boolean;
  supportsOperand: (operand: WorkflowConditionOperand) => boolean;
  validateComparison: (comparison: unknown, operand: WorkflowConditionOperand) => boolean;
};

export type WorkflowProjectedEdgeOwner = "branch_default" | "branch_conditional";

type WorkflowInvokeStepShared = {
  key: string;
  label?: string;
  descriptionJson?: { markdown: string };
  guidance?: {
    human: { markdown: string };
    agent: { markdown: string };
  };
};

export type WorkflowInvokeStepPayload =
  | (WorkflowInvokeStepShared & {
      targetKind: "workflow";
      sourceMode: "fixed";
      workflowDefinitionIds: string[];
    })
  | (WorkflowInvokeStepShared & {
      targetKind: "workflow";
      sourceMode: "fact_backed";
      contextFactDefinitionId: string;
    })
  | (WorkflowInvokeStepShared & {
      targetKind: "work_unit";
      sourceMode: "fixed";
      workUnitDefinitionId: string;
      bindings: InvokeBindingPayload[];
      activationTransitions: InvokeActivationTransitionPayload[];
    })
  | (WorkflowInvokeStepShared & {
      targetKind: "work_unit";
      sourceMode: "fact_backed";
      contextFactDefinitionId: string;
      bindings: InvokeBindingPayload[];
      activationTransitions: InvokeActivationTransitionPayload[];
    });

export type WorkflowInvokeWorkUnitFactDefinition = {
  id: string;
  key: string;
  label: string;
  valueType: "string" | "number" | "boolean" | "json" | "work_unit";
  cardinality: "one" | "many";
  validationJson?: unknown;
};

export type WorkflowInvokeArtifactSlotDefinition = {
  id: string;
  key: string;
  label: string;
  cardinality: "single" | "fileset";
};

export type WorkflowHarnessDiscoveryModel = {
  provider: string;
  model: string;
  label: string;
  isDefault: boolean;
  supportsReasoning: boolean;
  supportsTools: boolean;
  supportsAttachments: boolean;
};

export type WorkflowHarnessDiscoveryProvider = {
  provider: string;
  label: string;
  defaultModel?: string;
  models: readonly WorkflowHarnessDiscoveryModel[];
};

export type WorkflowHarnessDiscoveryAgent = {
  key: string;
  label: string;
  description?: string;
  mode: "subagent" | "primary" | "all";
  defaultModel?: { provider: string; model: string };
};

export type WorkflowHarnessDiscoveryMetadata = {
  harness: "opencode";
  discoveredAt: string;
  agents: readonly WorkflowHarnessDiscoveryAgent[];
  providers: readonly WorkflowHarnessDiscoveryProvider[];
  models: readonly WorkflowHarnessDiscoveryModel[];
};

export const DEFAULT_AGENT_STEP_RUNTIME_POLICY: AgentStepRuntimePolicy = {
  sessionStart: "explicit",
  continuationMode: "bootstrap_only",
  liveStreamCount: 1,
  bootstrapPromptNoReply: true,
  nativeMessageLog: false,
  persistedWritePolicy: "applied_only",
};

export type WorkflowEditorStepType = "form" | "agent" | "action" | "invoke" | "branch" | "display";

export const STEP_TYPE_LABELS: Record<WorkflowEditorStepType, string> = {
  form: "Form",
  agent: "Agent",
  action: "Action",
  invoke: "Invoke",
  branch: "Branch",
  display: "Display",
};

export const STEP_TYPE_ICON_CODES: Record<
  WorkflowEditorStepType,
  "45" | "58" | "08" | "33" | "61" | "22"
> = {
  form: "45",
  agent: "58",
  action: "08",
  invoke: "33",
  branch: "61",
  display: "22",
};

export const STEP_TYPE_COLORS: Record<
  WorkflowEditorStepType,
  "sky" | "violet" | "emerald" | "amber" | "rose" | "slate"
> = {
  form: "sky",
  agent: "violet",
  action: "emerald",
  invoke: "amber",
  branch: "rose",
  display: "slate",
};

export type WorkflowEditorStep =
  | {
      stepId: string;
      stepType: "form";
      payload: WorkflowFormStepPayload;
    }
  | {
      stepId: string;
      stepType: "agent";
      payload: WorkflowAgentStepPayload;
    }
  | {
      stepId: string;
      stepType: "action";
      payload: WorkflowActionStepPayload;
    }
  | {
      stepId: string;
      stepType: "invoke";
      payload: WorkflowInvokeStepPayload;
    }
  | {
      stepId: string;
      stepType: "branch";
      payload: WorkflowBranchStepPayload;
    }
  | {
      stepId: string;
      stepType: Exclude<WorkflowEditorStepType, "form" | "agent" | "action" | "invoke" | "branch">;
      payload: WorkflowFormStepPayload;
    };

export type WorkflowEditorEdge = {
  edgeId: string;
  fromStepKey: string;
  toStepKey: string;
  descriptionMarkdown: string;
  edgeOwner?: WorkflowProjectedEdgeOwner;
  branchStepId?: string;
  routeId?: string;
};

export type WorkflowEditorGuidance = {
  humanMarkdown: string;
  agentMarkdown: string;
};

export type WorkflowEditorPickerOption = {
  value: string;
  label: string;
  secondaryLabel?: string;
  description?: string;
  searchText?: string;
  disabled?: boolean;
  disabledReason?: string;
  badges?: readonly WorkflowEditorPickerBadge[];
  valueType?: "string" | "number" | "boolean" | "json" | "work_unit";
  validationJson?: unknown;
  workUnitDefinitionId?: string;
};

export type WorkflowEditorPickerBadge = {
  label: string;
  tone:
    | "source-methodology"
    | "source-current-work-unit"
    | "cardinality"
    | "bound-fact"
    | "workflow-ref"
    | "artifact-snapshot"
    | "type-string"
    | "type-number"
    | "type-boolean"
    | "type-json"
    | "type-work-unit"
    | "validation-path"
    | "validation-allowed-values"
    | "validation-number"
    | "work-unit-definition";
};

export type WorkflowEditorFieldDraft = FormStepFieldPayload & {
  localId: string;
};

export type WorkflowContextFactDraft = {
  key: string;
  label: string;
  descriptionMarkdown: string;
  kind: WorkflowContextFactKind;
  cardinality: WorkflowContextFactCardinality;
  guidance: WorkflowEditorGuidance;
  type?: WorkflowContextFactValueType;
  valueType?: WorkflowContextFactValueType;
  factDefinitionId?: string;
  externalFactDefinitionId?: string;
  workUnitStateOptions?: readonly WorkflowEditorPickerOption[];
  allowedWorkflowDefinitionIds: readonly string[];
  slotDefinitionId?: string;
  artifactSlotDefinitionId?: string;
  linkTypeDefinitionId?: string;
  workUnitDefinitionId?: string;
  targetWorkUnitDefinitionId?: string;
  workUnitTypeKey?: string;
  selectedWorkUnitFactDefinitionIds: readonly string[];
  selectedArtifactSlotDefinitionIds: readonly string[];
  validationJson?: unknown;
  includedFactDefinitionIds: readonly string[];
};

export type WorkflowContextFactDefinitionItem = {
  contextFactDefinitionId: string;
  label: string;
  descriptionMarkdown: string;
  key: string;
  kind: WorkflowContextFactKind;
  cardinality: WorkflowContextFactCardinality;
  guidance: WorkflowEditorGuidance;
  type?: WorkflowContextFactValueType;
  valueType?: WorkflowContextFactValueType;
  factDefinitionId?: string;
  externalFactDefinitionId?: string;
  workUnitStateOptions?: readonly WorkflowEditorPickerOption[];
  allowedWorkflowDefinitionIds: readonly string[];
  slotDefinitionId?: string;
  artifactSlotDefinitionId?: string;
  linkTypeDefinitionId?: string;
  workUnitDefinitionId?: string;
  targetWorkUnitDefinitionId?: string;
  workUnitTypeKey?: string;
  selectedWorkUnitFactDefinitionIds?: readonly string[];
  selectedArtifactSlotDefinitionIds?: readonly string[];
  validationJson?: unknown;
  draftSpecSubFieldOptions?: readonly WorkflowDraftSpecSubFieldOption[];
  includedFactDefinitionIds: readonly string[];
  summary: string;
};

export type WorkflowContextFactMutationHandlers = {
  onCreateContextFact?: (
    draft: WorkflowContextFactDraft,
  ) => Promise<WorkflowContextFactDefinitionItem>;
  onUpdateContextFact?: (
    contextFactDefinitionId: string,
    draft: WorkflowContextFactDraft,
  ) => Promise<void>;
  onDeleteContextFact?: (contextFactDefinitionId: string) => Promise<void>;
};

export type WorkflowFormStepMutationHandlers = {
  onCreateFormStep?: (payload: WorkflowFormStepPayload) => Promise<void>;
  onUpdateFormStep?: (stepId: string, payload: WorkflowFormStepPayload) => Promise<void>;
  onDeleteFormStep?: (stepId: string) => Promise<void>;
};

export type WorkflowAgentStepMutationHandlers = {
  onCreateAgentStep?: (payload: WorkflowAgentStepPayload) => Promise<void>;
  onUpdateAgentStep?: (stepId: string, payload: WorkflowAgentStepPayload) => Promise<void>;
  onDeleteAgentStep?: (stepId: string) => Promise<void>;
  discoverHarnessMetadata?: () => Promise<WorkflowHarnessDiscoveryMetadata>;
};

export type WorkflowActionStepMutationHandlers = {
  onCreateActionStep?: (payload: WorkflowActionStepPayload) => Promise<void>;
  onUpdateActionStep?: (stepId: string, payload: WorkflowActionStepPayload) => Promise<void>;
  onDeleteActionStep?: (stepId: string) => Promise<void>;
};

export type WorkflowInvokeStepMutationHandlers = {
  onCreateInvokeStep?: (payload: WorkflowInvokeStepPayload) => Promise<void>;
  onUpdateInvokeStep?: (stepId: string, payload: WorkflowInvokeStepPayload) => Promise<void>;
  onDeleteInvokeStep?: (stepId: string) => Promise<void>;
};

export type WorkflowBranchStepMutationHandlers = {
  onCreateBranchStep?: (payload: WorkflowBranchStepPayload) => Promise<void>;
  onUpdateBranchStep?: (stepId: string, payload: WorkflowBranchStepPayload) => Promise<void>;
  onDeleteBranchStep?: (stepId: string) => Promise<void>;
};

export type WorkflowEditorSelection =
  | { kind: "step"; stepId: string }
  | { kind: "edge"; edgeId: string }
  | null;
