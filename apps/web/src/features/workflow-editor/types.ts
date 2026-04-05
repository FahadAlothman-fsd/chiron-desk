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

export type WorkflowFormStepPayload = {
  key: string;
  label?: string;
  descriptionJson?: { markdown: string };
  fields: FormStepFieldPayload[];
  guidance: WorkflowEditorGuidance;
};

export type WorkflowEditorStep = {
  stepId: string;
  stepType: "form";
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
