import * as Schema from "effect/Schema";

export const PlateDocumentSchema = Schema.Record({ key: Schema.String, value: Schema.Unknown });

export const DisplayStepSchema = Schema.Struct({
  type: Schema.Literal("display"),
  id: Schema.String,
  title: Schema.optional(Schema.String),
  message: Schema.optional(Schema.String),
  content: Schema.optional(PlateDocumentSchema),
  tabs: Schema.optional(
    Schema.Array(
      Schema.Struct({
        key: Schema.String,
        title: Schema.String,
        content: PlateDocumentSchema,
      }),
    ),
  ),
  nextStep: Schema.optional(Schema.String),
});

export type DisplayStepConfig = Schema.Schema.Type<typeof DisplayStepSchema>;
