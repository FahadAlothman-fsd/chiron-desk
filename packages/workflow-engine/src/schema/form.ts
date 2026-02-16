import * as Schema from "effect/Schema";

export const ValidationSchema = Schema.Struct({
  required: Schema.optional(Schema.Boolean),
  minLength: Schema.optional(Schema.Number),
  maxLength: Schema.optional(Schema.Number),
  min: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  pattern: Schema.optional(Schema.String),
  customMessage: Schema.optional(Schema.String),
});

export const DataSourceSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("static"),
    options: Schema.Array(
      Schema.Struct({
        label: Schema.String,
        value: Schema.String,
        meta: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
      }),
    ),
  }),
  Schema.Struct({
    kind: Schema.Literal("table"),
    table: Schema.Union(
      Schema.Literal("agents"),
      Schema.Literal("artifacts"),
      Schema.Literal("workflows"),
      Schema.Literal("stories"),
      Schema.Literal("snapshots"),
    ),
    valueKey: Schema.optional(Schema.String),
    labelKey: Schema.optional(Schema.String),
    valuePath: Schema.optional(Schema.String),
    labelPath: Schema.optional(Schema.String),
    metaKeys: Schema.optional(Schema.Array(Schema.String)),
    searchField: Schema.optional(Schema.String),
    filters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    query: Schema.optional(Schema.String),
    limit: Schema.optional(Schema.Number),
  }),
  Schema.Struct({
    kind: Schema.Literal("search"),
    query: Schema.String,
    filters: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown })),
    limit: Schema.optional(Schema.Number),
  }),
);

export const FormFieldSchema = Schema.Struct({
  key: Schema.String,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  type: Schema.Union(
    Schema.Literal("string"),
    Schema.Literal("text"),
    Schema.Literal("markdown"),
    Schema.Literal("number"),
    Schema.Literal("boolean"),
    Schema.Literal("array"),
    Schema.Literal("object"),
  ),
  ref: Schema.optional(
    Schema.Union(
      Schema.Literal("path"),
      Schema.Literal("relative-path"),
      Schema.Literal("file"),
      Schema.Literal("artifact"),
      Schema.Literal("snapshot"),
      Schema.Literal("execution"),
      Schema.Literal("agent"),
      Schema.Literal("workflow"),
      Schema.Literal("project"),
      Schema.Literal("repo"),
      Schema.Literal("enum"),
    ),
  ),
  dataSource: Schema.optional(DataSourceSchema),
  multiple: Schema.optional(Schema.Boolean),
  maxSelections: Schema.optional(Schema.Number),
  dependsOn: Schema.optional(Schema.Array(Schema.String)),
  validation: Schema.optional(ValidationSchema),
  outputVariable: Schema.optional(Schema.String),
});

export const FormStepSchema = Schema.Struct({
  type: Schema.Literal("form"),
  id: Schema.String,
  title: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  helpText: Schema.optional(Schema.String),
  submitLabel: Schema.optional(Schema.String),
  autoSave: Schema.optional(Schema.Boolean),
  validationMode: Schema.optional(
    Schema.Union(Schema.Literal("onChange"), Schema.Literal("onBlur"), Schema.Literal("onSubmit")),
  ),
  fields: Schema.Array(FormFieldSchema),
});

export type FormStepConfig = Schema.Schema.Type<typeof FormStepSchema>;
