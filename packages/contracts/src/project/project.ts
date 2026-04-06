import * as Schema from "effect/Schema";

export const CreateAndPinProjectInput = Schema.Struct({
  methodologyId: Schema.NonEmptyString,
  versionId: Schema.NonEmptyString,
  name: Schema.optional(Schema.String),
  projectRootPath: Schema.NonEmptyString,
});
export type CreateAndPinProjectInput = typeof CreateAndPinProjectInput.Type;
