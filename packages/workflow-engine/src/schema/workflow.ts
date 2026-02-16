import * as Schema from "effect/Schema";
import { AgentStepSchema } from "./agent";
import { ActionStepSchema } from "./action";
import { BranchStepSchema } from "./branch";
import { DisplayStepSchema } from "./display";
import { FormStepSchema } from "./form";
import { InvokeStepSchema } from "./invoke";

export const WorkflowStepSchema = Schema.Union(
  FormStepSchema,
  AgentStepSchema,
  ActionStepSchema,
  InvokeStepSchema,
  BranchStepSchema,
  DisplayStepSchema,
);

export const WorkflowSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  steps: Schema.Array(WorkflowStepSchema),
});

export type WorkflowStep = Schema.Schema.Type<typeof WorkflowStepSchema>;
export type WorkflowConfig = Schema.Schema.Type<typeof WorkflowSchema>;
