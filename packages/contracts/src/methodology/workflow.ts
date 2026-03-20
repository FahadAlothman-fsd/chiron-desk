import * as Schema from "effect/Schema";
import { WorkflowDefinition } from "./version.js";

export const ListWorkUnitWorkflowsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
});
export type ListWorkUnitWorkflowsInput = typeof ListWorkUnitWorkflowsInput.Type;

export const CreateWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflow: WorkflowDefinition,
});
export type CreateWorkUnitWorkflowInput = typeof CreateWorkUnitWorkflowInput.Type;

export const UpdateWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflowKey: Schema.NonEmptyString,
  workflow: WorkflowDefinition,
});
export type UpdateWorkUnitWorkflowInput = typeof UpdateWorkUnitWorkflowInput.Type;

export const DeleteWorkUnitWorkflowInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  workflowKey: Schema.NonEmptyString,
});
export type DeleteWorkUnitWorkflowInput = typeof DeleteWorkUnitWorkflowInput.Type;
