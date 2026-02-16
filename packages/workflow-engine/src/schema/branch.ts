import * as Schema from "effect/Schema";

export const ConditionSchema: Schema.Schema<any> = Schema.Union(
  Schema.Struct({ op: Schema.Literal("exists"), var: Schema.String }),
  Schema.Struct({
    op: Schema.Literal("equals"),
    var: Schema.String,
    value: Schema.Union(Schema.String, Schema.Number, Schema.Boolean),
  }),
  Schema.Struct({ op: Schema.Literal("contains"), var: Schema.String, value: Schema.String }),
  Schema.Struct({
    op: Schema.Union(
      Schema.Literal("gt"),
      Schema.Literal("gte"),
      Schema.Literal("lt"),
      Schema.Literal("lte"),
    ),
    var: Schema.String,
    value: Schema.Number,
  }),
  Schema.Struct({
    op: Schema.Literal("and"),
    all: Schema.Array(Schema.suspend(() => ConditionSchema)),
  }),
  Schema.Struct({
    op: Schema.Literal("or"),
    any: Schema.Array(Schema.suspend(() => ConditionSchema)),
  }),
  Schema.Struct({ op: Schema.Literal("not"), cond: Schema.suspend(() => ConditionSchema) }),
);

export const BranchStepSchema = Schema.Struct({
  type: Schema.Literal("branch"),
  id: Schema.String,
  title: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  branches: Schema.Array(
    Schema.Struct({
      when: ConditionSchema,
      next: Schema.Struct({
        stepId: Schema.optional(Schema.String),
        pathKey: Schema.optional(Schema.String),
      }),
      label: Schema.optional(Schema.String),
    }),
  ),
  defaultNext: Schema.optional(
    Schema.Struct({
      stepId: Schema.optional(Schema.String),
      pathKey: Schema.optional(Schema.String),
    }),
  ),
  allowOverride: Schema.optional(Schema.Boolean),
  overrideMode: Schema.optional(Schema.Union(Schema.Literal("before"), Schema.Literal("after"))),
});

export type BranchStepConfig = Schema.Schema.Type<typeof BranchStepSchema>;
