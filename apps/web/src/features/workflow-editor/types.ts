import type {
  FormFieldValueType,
  FormStepFieldPayload,
  WorkflowContextFactCardinality,
  WorkflowContextFactKind,
} from "@chiron/contracts/methodology/workflow";

export type WorkflowEditorMetadata = {
  workflowDefinitionId: string;
  key: string;
  displayName: string;
  descriptionMarkdown: string;
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

export type WorkflowEditorStep = {
  stepId: string;
  stepType: WorkflowEditorStepType;
  payload: WorkflowFormStepPayload;
};

export type WorkflowEditorEdge = {
  edgeId: string;
  fromStepKey: string;
  toStepKey: string;
  descriptionMarkdown: string;
};

export type WorkflowEditorGuidance = {
  humanMarkdown: string;
  agentMarkdown: string;
};

export type WorkflowEditorPickerOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
  badges?: readonly WorkflowEditorPickerBadge[];
};

export type WorkflowEditorPickerBadge = {
  label: string;
  tone:
    | "source-methodology"
    | "source-current-work-unit"
    | "cardinality"
    | "external-fact"
    | "bound-fact"
    | "workflow-reference"
    | "artifact-reference"
    | "type-string"
    | "type-number"
    | "type-boolean"
    | "type-json"
    | "type-work-unit"
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
  valueType?: FormFieldValueType;
  externalFactDefinitionId?: string;
  allowedWorkflowDefinitionIds: string[];
  artifactSlotDefinitionId?: string;
  workUnitTypeKey?: string;
  includedFactKeys: string[];
};

export type WorkflowContextFactDefinitionItem = {
  contextFactDefinitionId: string;
  label: string;
  descriptionMarkdown: string;
  key: string;
  kind: WorkflowContextFactKind;
  cardinality: WorkflowContextFactCardinality;
  guidance: WorkflowEditorGuidance;
  valueType?: FormFieldValueType;
  externalFactDefinitionId?: string;
  allowedWorkflowDefinitionIds: string[];
  artifactSlotDefinitionId?: string;
  workUnitTypeKey?: string;
  includedFactKeys: string[];
  summary: string;
};

export type WorkflowContextFactMutationHandlers = {
  onCreateContextFact?: (draft: WorkflowContextFactDraft) => Promise<void>;
  onUpdateContextFact?: (factKey: string, draft: WorkflowContextFactDraft) => Promise<void>;
  onDeleteContextFact?: (factKey: string) => Promise<void>;
};

export type WorkflowFormStepMutationHandlers = {
  onCreateFormStep?: (payload: WorkflowFormStepPayload) => Promise<void>;
  onUpdateFormStep?: (stepId: string, payload: WorkflowFormStepPayload) => Promise<void>;
  onDeleteFormStep?: (stepId: string) => Promise<void>;
};

export type WorkflowEditorSelection =
  | { kind: "step"; stepId: string }
  | { kind: "edge"; edgeId: string }
  | null;
