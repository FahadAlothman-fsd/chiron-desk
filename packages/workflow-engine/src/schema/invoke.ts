import * as Schema from "effect/Schema";

export const InvokeStepSchema = Schema.Struct({
  type: Schema.Literal("invoke"),
  id: Schema.String,
  title: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  forEach: Schema.optional(
    Schema.Struct({
      itemsVar: Schema.String,
      itemVar: Schema.String,
    }),
  ),
  workflowRef: Schema.Struct({
    id: Schema.optional(Schema.String),
    key: Schema.optional(Schema.String),
  }),
  inputMapping: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
  executionMode: Schema.optional(
    Schema.Union(Schema.Literal("sequential"), Schema.Literal("parallel")),
  ),
  concurrency: Schema.optional(Schema.Number),
  output: Schema.optional(
    Schema.Struct({
      mode: Schema.Union(
        Schema.Literal("reference"),
        Schema.Literal("variables"),
        Schema.Literal("namespace"),
      ),
      target: Schema.String,
      selectors: Schema.optional(Schema.Array(Schema.String)),
    }),
  ),
  waitForCompletion: Schema.optional(Schema.Boolean),
  onChildError: Schema.optional(
    Schema.Union(Schema.Literal("fail"), Schema.Literal("continue"), Schema.Literal("pause")),
  ),
});

export type InvokeStepConfig = Schema.Schema.Type<typeof InvokeStepSchema>;
