import * as Schema from "effect/Schema";

import { MethodologyLinkTypeDefinitionInput } from "./version.js";

export const DependencyRequirement = Schema.Struct({
  linkTypeKey: Schema.NonEmptyString,
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
