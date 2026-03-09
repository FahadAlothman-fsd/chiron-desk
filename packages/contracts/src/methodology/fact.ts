import { Schema } from "effect";

export const MarkdownContent = Schema.Struct({ markdown: Schema.String });
export type MarkdownContent = typeof MarkdownContent.Type;

export const AudienceMarkdownJson = Schema.Struct({
  human: MarkdownContent,
  agent: MarkdownContent,
});
export type AudienceMarkdownJson = typeof AudienceMarkdownJson.Type;

export const FactType = Schema.Literal("string", "number", "boolean", "json");
export type FactType = typeof FactType.Type;

export const FactGuidance = AudienceMarkdownJson;
export type FactGuidance = typeof FactGuidance.Type;

export const PathKind = Schema.Literal("file", "directory");
export type PathKind = typeof PathKind.Type;

export const FactValidation = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("path"),
    path: Schema.Struct({
      pathKind: PathKind,
      normalization: Schema.optionalWith(
        Schema.Struct({
          mode: Schema.optionalWith(Schema.Literal("posix"), { default: () => "posix" }),
          trimWhitespace: Schema.optionalWith(Schema.Boolean, { default: () => true }),
        }),
        {
          default: () => ({ mode: "posix", trimWhitespace: true }),
        },
      ),
      safety: Schema.optionalWith(
        Schema.Struct({
          disallowAbsolute: Schema.optionalWith(Schema.Boolean, { default: () => true }),
          preventTraversal: Schema.optionalWith(Schema.Boolean, { default: () => true }),
        }),
        {
          default: () => ({ disallowAbsolute: true, preventTraversal: true }),
        },
      ),
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("json-schema"),
    schemaDialect: Schema.NonEmptyString,
    schema: Schema.Unknown,
  }),
);
export type FactValidation = typeof FactValidation.Type;

export const FactSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  factType: FactType,
  defaultValue: Schema.optional(Schema.Unknown),
  description: Schema.optional(Schema.String),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optionalWith(FactValidation, { default: () => ({ kind: "none" as const }) }),
});
export type FactSchema = typeof FactSchema.Type;

export const MethodologyFactDefinitionInput = Schema.Struct({
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  factType: FactType,
  defaultValue: Schema.optional(Schema.Unknown),
  description: Schema.optional(AudienceMarkdownJson),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optionalWith(FactValidation, { default: () => ({ kind: "none" as const }) }),
});
export type MethodologyFactDefinitionInput = typeof MethodologyFactDefinitionInput.Type;
