import { Schema } from "effect";

export const DependencyStrength = Schema.Literal("hard", "soft", "context");
export type DependencyStrength = typeof DependencyStrength.Type;

export const DependencyRequirement = Schema.Struct({
  linkTypeKey: Schema.NonEmptyString,
  strength: DependencyStrength,
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});
export type DependencyRequirement = typeof DependencyRequirement.Type;
