import * as Schema from "effect/Schema";

export const CreateAndPinProjectInput = Schema.Struct({
  methodologyId: Schema.NonEmptyString,
  versionId: Schema.NonEmptyString,
  name: Schema.optional(Schema.String),
  projectRootPath: Schema.optional(Schema.String),
});
export type CreateAndPinProjectInput = typeof CreateAndPinProjectInput.Type;
