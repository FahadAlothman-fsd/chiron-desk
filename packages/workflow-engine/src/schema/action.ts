import * as Schema from "effect/Schema";

export const ActionBaseSchema = Schema.Struct({
  id: Schema.String,
  kind: Schema.Union(
    Schema.Literal("snapshot"),
    Schema.Literal("artifact"),
    Schema.Literal("directory"),
    Schema.Literal("git"),
    Schema.Literal("env"),
    Schema.Literal("file"),
    Schema.Literal("variable"),
  ),
  operation: Schema.String,
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
  requiresApproval: Schema.optional(Schema.Boolean),
  outputVariable: Schema.optional(Schema.String),
});

export const ActionConfigSchema = Schema.extend(
  ActionBaseSchema,
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

export const ActionStepSchema = Schema.Struct({
  type: Schema.Literal("action"),
  id: Schema.String,
  title: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  actions: Schema.Array(ActionConfigSchema),
  stopOnError: Schema.optional(Schema.Boolean),
  outputVariables: Schema.optional(Schema.Array(Schema.String)),
});

export type ActionStepConfig = Schema.Schema.Type<typeof ActionStepSchema>;
