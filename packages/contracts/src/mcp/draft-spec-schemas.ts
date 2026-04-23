import * as Schema from "effect/Schema";

export const DraftSpecSelectedFactSchema = Schema.Struct({
  factKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  valueType: Schema.Literal("string", "number", "boolean", "json", "work_unit"),
  cardinality: Schema.Literal("one", "many"),
  validation: Schema.optional(Schema.Unknown),
});
export type DraftSpecSelectedFactSchema = typeof DraftSpecSelectedFactSchema.Type;

export const DraftSpecSelectedArtifactSchema = Schema.Struct({
  slotKey: Schema.NonEmptyString,
  label: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  rules: Schema.optional(Schema.Unknown),
});
export type DraftSpecSelectedArtifactSchema = typeof DraftSpecSelectedArtifactSchema.Type;
