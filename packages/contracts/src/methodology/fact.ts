import * as Schema from "effect/Schema";
import { AudienceGuidance, GuidanceMarkdownContent } from "./guidance.js";
import { DescriptionJson } from "../shared/invariants.js";

export const MarkdownContent = GuidanceMarkdownContent;
export type MarkdownContent = typeof MarkdownContent.Type;

export const AudienceMarkdownJson = AudienceGuidance;
export type AudienceMarkdownJson = typeof AudienceMarkdownJson.Type;

export const PlainFactType = Schema.Literal("string", "number", "boolean", "json");
export type PlainFactType = typeof PlainFactType.Type;

// Legacy flat fact typing remains for migration safety while canonical surfaces move to kind + type.
export const FactType = Schema.Literal("string", "number", "boolean", "json", "work_unit");
export type FactType = typeof FactType.Type;

export const JsonSubSchemaFieldType = Schema.Literal("string", "number", "boolean");
export type JsonSubSchemaFieldType = typeof JsonSubSchemaFieldType.Type;

export const FactCardinality = Schema.Literal("one", "many");
export type FactCardinality = typeof FactCardinality.Type;

export const FactGuidance = AudienceMarkdownJson;
export type FactGuidance = typeof FactGuidance.Type;

export const CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS = [
  "plain_fact",
  "bound_fact",
  "workflow_ref_fact",
  "artifact_slot_reference_fact",
  "work_unit_reference_fact",
  "work_unit_draft_spec_fact",
] as const;
export const CanonicalWorkflowContextFactKind = Schema.Literal(
  ...CANONICAL_WORKFLOW_CONTEXT_FACT_KINDS,
);
export type CanonicalWorkflowContextFactKind = typeof CanonicalWorkflowContextFactKind.Type;

export const WorkflowContextFactMetadata = Schema.Struct({
  contextFactDefinitionId: Schema.optional(Schema.NonEmptyString),
  label: Schema.optional(Schema.String),
  descriptionJson: Schema.optional(DescriptionJson),
  guidance: Schema.optional(AudienceGuidance),
  validationJson: Schema.optional(Schema.Unknown),
});
export type WorkflowContextFactMetadata = typeof WorkflowContextFactMetadata.Type;

export const CanonicalWorkflowContextFactCardinality = Schema.Literal("one", "many");
export type CanonicalWorkflowContextFactCardinality =
  typeof CanonicalWorkflowContextFactCardinality.Type;

export const CanonicalWorkflowContextFactValueType = FactType;
export type CanonicalWorkflowContextFactValueType =
  typeof CanonicalWorkflowContextFactValueType.Type;

export const PlainFactDefinition = Schema.Struct({
  kind: Schema.Literal("plain_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  type: PlainFactType,
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type PlainFactDefinition = typeof PlainFactDefinition.Type;

// Deprecated compatibility export while downstream packages are migrated.
export const PlainValueFactDefinition = PlainFactDefinition;
export type PlainValueFactDefinition = typeof PlainValueFactDefinition.Type;

export const LegacyPlainValueFactDefinition = Schema.Struct({
  kind: Schema.Literal("plain_value_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  valueType: PlainFactType,
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type LegacyPlainValueFactDefinition = typeof LegacyPlainValueFactDefinition.Type;

export const BoundFactDefinition = Schema.Struct({
  kind: Schema.Literal("bound_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  factDefinitionId: Schema.NonEmptyString,
  valueType: Schema.optional(CanonicalWorkflowContextFactValueType),
  workUnitDefinitionId: Schema.optional(Schema.NonEmptyString),
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type BoundFactDefinition = typeof BoundFactDefinition.Type;

export const WorkflowRefFactDefinition = Schema.Struct({
  kind: Schema.Literal("workflow_ref_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  allowedWorkflowDefinitionIds: Schema.Array(Schema.NonEmptyString),
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type WorkflowRefFactDefinition = typeof WorkflowRefFactDefinition.Type;

export const ArtifactSlotReferenceFactDefinition = Schema.Struct({
  kind: Schema.Literal("artifact_slot_reference_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  slotDefinitionId: Schema.NonEmptyString,
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type ArtifactSlotReferenceFactDefinition = typeof ArtifactSlotReferenceFactDefinition.Type;

export const WorkUnitReferenceFactDefinition = Schema.Struct({
  kind: Schema.Literal("work_unit_reference_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  linkTypeDefinitionId: Schema.optional(Schema.NonEmptyString),
  targetWorkUnitDefinitionId: Schema.optional(Schema.NonEmptyString),
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type WorkUnitReferenceFactDefinition = typeof WorkUnitReferenceFactDefinition.Type;

export const WorkUnitDraftSpecFactDefinition = Schema.Struct({
  kind: Schema.Literal("work_unit_draft_spec_fact"),
  key: Schema.NonEmptyString,
  cardinality: CanonicalWorkflowContextFactCardinality,
  workUnitDefinitionId: Schema.NonEmptyString,
  selectedWorkUnitFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
  selectedArtifactSlotDefinitionIds: Schema.Array(Schema.NonEmptyString),
}).pipe(Schema.extend(WorkflowContextFactMetadata));
export type WorkUnitDraftSpecFactDefinition = typeof WorkUnitDraftSpecFactDefinition.Type;

export const CanonicalWorkflowContextFactDefinition = Schema.Union(
  PlainFactDefinition,
  LegacyPlainValueFactDefinition,
  BoundFactDefinition,
  WorkflowRefFactDefinition,
  ArtifactSlotReferenceFactDefinition,
  WorkUnitReferenceFactDefinition,
  WorkUnitDraftSpecFactDefinition,
);
export type CanonicalWorkflowContextFactDefinition =
  typeof CanonicalWorkflowContextFactDefinition.Type;

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
          Schema.Struct({
            key: Schema.NonEmptyString,
            type: JsonSubSchemaFieldType,
            cardinality: FactCardinality,
            description: Schema.optional(GuidanceMarkdownContent),
            guidance: Schema.optional(FactGuidance),
            validation: Schema.optional(Schema.Unknown),
          }),
        ),
      }),
    ),
  }),
);
export type FactValidation = typeof FactValidation.Type;

export const FactSchema = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  kind: Schema.optionalWith(Schema.Literal("plain_fact", "work_unit_reference_fact"), {
    default: () => "plain_fact" as const,
  }),
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  type: Schema.optional(PlainFactType),
  factType: FactType,
  linkTypeDefinitionId: Schema.optional(Schema.NonEmptyString),
  targetWorkUnitDefinitionId: Schema.optional(Schema.NonEmptyString),
  cardinality: Schema.optional(FactCardinality),
  defaultValue: Schema.optional(Schema.Unknown),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(FactGuidance),
  validation: Schema.optionalWith(FactValidation, { default: () => ({ kind: "none" as const }) }),
});
export type FactSchema = typeof FactSchema.Type;

export const MethodologyFactDefinitionInput = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  kind: Schema.optionalWith(Schema.Literal("plain_fact", "work_unit_reference_fact"), {
    default: () => "plain_fact" as const,
  }),
  name: Schema.optional(Schema.String),
  key: Schema.NonEmptyString,
  type: Schema.optional(PlainFactType),
  factType: FactType,
  linkTypeDefinitionId: Schema.optional(Schema.NonEmptyString),
  targetWorkUnitDefinitionId: Schema.optional(Schema.NonEmptyString),
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
