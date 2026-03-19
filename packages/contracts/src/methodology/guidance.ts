import * as Schema from "effect/Schema";

export const GuidanceMarkdownContent = Schema.Struct({ markdown: Schema.String });
export type GuidanceMarkdownContent = typeof GuidanceMarkdownContent.Type;

export const AudienceGuidance = Schema.Struct({
  human: GuidanceMarkdownContent,
  agent: GuidanceMarkdownContent,
});
export type AudienceGuidance = typeof AudienceGuidance.Type;

export const GuidanceOverlayMap = Schema.Record({
  key: Schema.String,
  value: Schema.Unknown,
});
export type GuidanceOverlayMap = typeof GuidanceOverlayMap.Type;

export const LayeredGuidance = Schema.Struct({
  global: Schema.optional(Schema.Unknown),
  byWorkUnitType: Schema.optionalWith(GuidanceOverlayMap, { default: () => ({}) }),
  byAgentType: Schema.optionalWith(GuidanceOverlayMap, { default: () => ({}) }),
  byTransition: Schema.optionalWith(GuidanceOverlayMap, { default: () => ({}) }),
  byWorkflow: Schema.optionalWith(GuidanceOverlayMap, { default: () => ({}) }),
});
export type LayeredGuidance = typeof LayeredGuidance.Type;
