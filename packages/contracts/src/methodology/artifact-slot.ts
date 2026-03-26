import * as Schema from "effect/Schema";
import { AudienceGuidance, GuidanceMarkdownContent } from "./guidance.js";

export const ArtifactSlotCardinality = Schema.Literal("single", "fileset");
export type ArtifactSlotCardinality = typeof ArtifactSlotCardinality.Type;

/**
 * Artifact slot template with id-first identity.
 *
 * ID conventions:
 * - `draft:{uuid}` - Temporary client-side id for new unsaved templates
 * - Persisted UUIDs - Real database ids returned from server
 *
 * The `key` field is editable secondary metadata, NOT the entity identity.
 */
export const ArtifactSlotTemplateInput = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, AudienceGuidance)),
  guidance: Schema.optional(AudienceGuidance),
  content: Schema.optional(Schema.String),
});
export type ArtifactSlotTemplateInput = typeof ArtifactSlotTemplateInput.Type;

/**
 * Artifact slot definition with id-first identity.
 *
 * ID conventions:
 * - `draft:{uuid}` - Temporary client-side id for new unsaved slots
 * - Persisted UUIDs - Real database ids returned from server
 *
 * The `key` field is editable secondary metadata, NOT the entity identity.
 * Slots contain nested templates which also use id-first identity.
 */
export const ArtifactSlotInput = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, AudienceGuidance)),
  guidance: Schema.optional(AudienceGuidance),
  cardinality: ArtifactSlotCardinality,
  rules: Schema.optional(Schema.Unknown),
  templates: Schema.optionalWith(Schema.Array(ArtifactSlotTemplateInput), { default: () => [] }),
});
export type ArtifactSlotInput = typeof ArtifactSlotInput.Type;

export const CreateWorkUnitArtifactSlotInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  slot: ArtifactSlotInput,
});
export type CreateWorkUnitArtifactSlotInput = typeof CreateWorkUnitArtifactSlotInput.Type;

export const UpdateArtifactSlotTemplateInput = Schema.Struct({
  templateId: Schema.NonEmptyString,
  template: Schema.Struct({
    key: Schema.NonEmptyString,
    displayName: Schema.optional(Schema.String),
    description: Schema.optional(Schema.Union(GuidanceMarkdownContent, AudienceGuidance)),
    guidance: Schema.optional(AudienceGuidance),
    content: Schema.optional(Schema.String),
  }),
});
export type UpdateArtifactSlotTemplateInput = typeof UpdateArtifactSlotTemplateInput.Type;

export const UpdateWorkUnitArtifactSlotInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  slotId: Schema.NonEmptyString,
  slot: Schema.Struct({
    key: Schema.NonEmptyString,
    displayName: Schema.optional(Schema.String),
    description: Schema.optional(Schema.Union(GuidanceMarkdownContent, AudienceGuidance)),
    guidance: Schema.optional(AudienceGuidance),
    cardinality: ArtifactSlotCardinality,
    rules: Schema.optional(Schema.Unknown),
  }),
  templateOps: Schema.optionalWith(
    Schema.Struct({
      add: Schema.optionalWith(Schema.Array(ArtifactSlotTemplateInput), { default: () => [] }),
      remove: Schema.optionalWith(Schema.Array(Schema.NonEmptyString), { default: () => [] }),
      update: Schema.optionalWith(Schema.Array(UpdateArtifactSlotTemplateInput), {
        default: () => [],
      }),
    }),
    { default: () => ({ add: [], remove: [], update: [] }) },
  ),
});
export type UpdateWorkUnitArtifactSlotInput = typeof UpdateWorkUnitArtifactSlotInput.Type;

export const DeleteWorkUnitArtifactSlotInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  slotId: Schema.NonEmptyString,
});
export type DeleteWorkUnitArtifactSlotInput = typeof DeleteWorkUnitArtifactSlotInput.Type;

export const ReplaceWorkUnitArtifactSlotsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  slots: Schema.Array(ArtifactSlotInput),
});
export type ReplaceWorkUnitArtifactSlotsInput = typeof ReplaceWorkUnitArtifactSlotsInput.Type;

export const GetWorkUnitArtifactSlotsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
});
export type GetWorkUnitArtifactSlotsInput = typeof GetWorkUnitArtifactSlotsInput.Type;

export const ArtifactSlotTemplate = ArtifactSlotTemplateInput;
export type ArtifactSlotTemplate = typeof ArtifactSlotTemplate.Type;

export const ArtifactSlot = ArtifactSlotInput;
export type ArtifactSlot = typeof ArtifactSlot.Type;
