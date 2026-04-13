import * as Schema from "effect/Schema";
import { AudienceGuidance, GuidanceMarkdownContent } from "./guidance.js";

export const MarkdownContent = GuidanceMarkdownContent;
export type MarkdownContent = typeof MarkdownContent.Type;

export const AudienceMarkdownJson = AudienceGuidance;
export type AudienceMarkdownJson = typeof AudienceMarkdownJson.Type;

export const FactType = Schema.Literal("string", "number", "boolean", "json", "work_unit");
export type FactType = typeof FactType.Type;

export const JsonSubSchemaFieldType = Schema.Literal("string", "number", "boolean");
export type JsonSubSchemaFieldType = typeof JsonSubSchemaFieldType.Type;

export const FactCardinality = Schema.Literal("one", "many");
export type FactCardinality = typeof FactCardinality.Type;

export const FactGuidance = AudienceMarkdownJson;
export type FactGuidance = typeof FactGuidance.Type;

export const PathKind = Schema.Literal("file", "directory");
export type PathKind = typeof PathKind.Type;

export const PathValidationConfig = Schema.Struct({
  pathKind: PathKind,
  normalization: Schema.Struct({
    mode: Schema.Literal("posix"),
    trimWhitespace: Schema.Boolean,
  }),
  safety: Schema.Struct({
    disallowAbsolute: Schema.Boolean,
    preventTraversal: Schema.Boolean,
  }),
});
export type PathValidationConfig = typeof PathValidationConfig.Type;

export const FactValidation = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("none"),
  }),
  Schema.Struct({
    kind: Schema.Literal("path"),
    path: PathValidationConfig,
  }),
  Schema.Struct({
    kind: Schema.Literal("allowed-values"),
    values: Schema.Array(Schema.Unknown),
  }),
  Schema.Struct({
    kind: Schema.Literal("json-schema"),
    schemaDialect: Schema.NonEmptyString,
    schema: Schema.Unknown,
    subSchema: Schema.optional(
      Schema.Struct({
        type: Schema.Literal("object"),
        fields: Schema.Array(
          Schema.Union(
            Schema.Struct({
              key: Schema.NonEmptyString,
              type: JsonSubSchemaFieldType,
              cardinality: FactCardinality,
              description: Schema.optional(GuidanceMarkdownContent),
              guidance: Schema.optional(FactGuidance),
              validation: Schema.optional(Schema.Unknown),
            }),
            Schema.Struct({
              key: Schema.NonEmptyString,
              type: JsonSubSchemaFieldType,
              cardinality: Schema.Literal("one"),
              defaultValue: Schema.optional(Schema.Unknown),
              description: Schema.optional(GuidanceMarkdownContent),
              guidance: Schema.optional(FactGuidance),
              validation: Schema.optional(Schema.Unknown),
            }),
          ),
        ),
      }),
    ),
  }),
);
export type FactValidation = typeof FactValidation.Type;

export const FactSchema = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  factType: FactType,
  cardinality: Schema.optional(FactCardinality),
  defaultValue: Schema.optional(Schema.Unknown),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optionalWith(FactValidation, { default: () => ({ kind: "none" as const }) }),
});
export type FactSchema = typeof FactSchema.Type;

export const MethodologyFactDefinitionInput = Schema.Struct({
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  factType: FactType,
  cardinality: Schema.optional(FactCardinality),
  defaultValue: Schema.optional(Schema.Unknown),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optionalWith(FactValidation, { default: () => ({ kind: "none" as const }) }),
});
export type MethodologyFactDefinitionInput = typeof MethodologyFactDefinitionInput.Type;

export const CreateMethodologyFactInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  fact: MethodologyFactDefinitionInput,
});
export type CreateMethodologyFactInput = typeof CreateMethodologyFactInput.Type;

export const UpdateMethodologyFactInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  factKey: Schema.NonEmptyString,
  fact: MethodologyFactDefinitionInput,
});
export type UpdateMethodologyFactInput = typeof UpdateMethodologyFactInput.Type;

export const DeleteMethodologyFactInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  factKey: Schema.NonEmptyString,
});
export type DeleteMethodologyFactInput = typeof DeleteMethodologyFactInput.Type;

export const GetWorkUnitFactsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
});
export type GetWorkUnitFactsInput = typeof GetWorkUnitFactsInput.Type;

export const ReplaceWorkUnitFactsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  facts: Schema.Array(FactSchema),
});
export type ReplaceWorkUnitFactsInput = typeof ReplaceWorkUnitFactsInput.Type;
