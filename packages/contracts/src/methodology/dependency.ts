import { Schema } from "effect";

import { LinkStrength, MethodologyLinkTypeDefinitionInput } from "./version.js";

export const DependencyStrength = Schema.Literal("hard", "soft", "context");
export type DependencyStrength = typeof DependencyStrength.Type;

export const DependencyRequirement = Schema.Struct({
  linkTypeKey: Schema.NonEmptyString,
  strength: DependencyStrength,
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});
export type DependencyRequirement = typeof DependencyRequirement.Type;

export const CreateMethodologyDependencyDefinitionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  dependencyDefinition: MethodologyLinkTypeDefinitionInput,
});
export type CreateMethodologyDependencyDefinitionInput =
  typeof CreateMethodologyDependencyDefinitionInput.Type;

export const UpdateMethodologyDependencyDefinitionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  dependencyKey: Schema.NonEmptyString,
  dependencyDefinition: MethodologyLinkTypeDefinitionInput,
});
export type UpdateMethodologyDependencyDefinitionInput =
  typeof UpdateMethodologyDependencyDefinitionInput.Type;

export const DeleteMethodologyDependencyDefinitionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  dependencyKey: Schema.NonEmptyString,
});
export type DeleteMethodologyDependencyDefinitionInput =
  typeof DeleteMethodologyDependencyDefinitionInput.Type;

export const DependencyStrengthList = Schema.NonEmptyArray(LinkStrength);
export type DependencyStrengthList = typeof DependencyStrengthList.Type;
