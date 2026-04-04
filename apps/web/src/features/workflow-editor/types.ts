import type { FormStepPayload } from "@chiron/contracts/methodology/workflow";

export type WorkflowEditorMetadata = {
  workflowDefinitionId: string;
  key: string;
  displayName: string;
  descriptionMarkdown: string;
};

export type WorkflowEditorStep = {
  stepId: string;
  stepType: "form";
  payload: FormStepPayload;
};

export type WorkflowEditorEdge = {
  edgeId: string;
  fromStepKey: string;
  toStepKey: string;
  descriptionMarkdown: string;
};

export type WorkflowContextFactDefinitionItem = {
  contextFactDefinitionId: string;
  key: string;
  kind: string;
  valueType?: string;
  summary?: string;
};

export type WorkflowEditorSelection =
  | { kind: "step"; stepId: string }
  | { kind: "edge"; edgeId: string }
  | null;
