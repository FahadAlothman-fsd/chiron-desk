import * as Schema from "effect/Schema";

export const DescriptionJson = Schema.Struct({
  markdown: Schema.String,
});
export type DescriptionJson = typeof DescriptionJson.Type;
