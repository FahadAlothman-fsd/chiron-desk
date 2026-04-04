import * as Schema from "effect/Schema";

export const DescriptionJson = Schema.Struct({
  markdown: Schema.String,
});
export type DescriptionJson = typeof DescriptionJson.Type;

export const SetupTags = Schema.Record({
  key: Schema.String,
  value: Schema.String,
});
export type SetupTags = typeof SetupTags.Type;
