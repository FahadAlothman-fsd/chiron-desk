import * as Schema from "effect/Schema";
import { AudienceGuidance } from "./guidance.js";

export const ArtifactSlotCardinality = Schema.Literal("single", "fileset");
export type ArtifactSlotCardinality = typeof ArtifactSlotCardinality.Type;

export const ArtifactSlotTemplateInput = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(AudienceGuidance),
  guidance: Schema.optional(AudienceGuidance),
  content: Schema.optional(Schema.String),
});
export type ArtifactSlotTemplateInput = typeof ArtifactSlotTemplateInput.Type;

export const ArtifactSlotInput = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(AudienceGuidance),
  guidance: Schema.optional(AudienceGuidance),
  cardinality: ArtifactSlotCardinality,
  rules: Schema.optional(Schema.Unknown),
  templates: Schema.optionalWith(Schema.Array(ArtifactSlotTemplateInput), { default: () => [] }),
});
export type ArtifactSlotInput = typeof ArtifactSlotInput.Type;

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
