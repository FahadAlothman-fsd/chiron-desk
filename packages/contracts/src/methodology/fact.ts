import { Schema } from "effect";

export const FactType = Schema.Literal("string", "number", "boolean", "json");
export type FactType = typeof FactType.Type;

export const FactSchema = Schema.Struct({
  key: Schema.NonEmptyString,
  factType: FactType,
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  defaultValue: Schema.optional(Schema.Unknown),
});
export type FactSchema = typeof FactSchema.Type;
