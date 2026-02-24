import { Schema } from "effect";

export const MethodologyVersionStatus = Schema.Literal("draft", "active", "deprecated", "retired");
export type MethodologyVersionStatus = typeof MethodologyVersionStatus.Type;

export const VersionEventType = Schema.Literal("created", "updated", "validated");
export type VersionEventType = typeof VersionEventType.Type;

export const VariableValueType = Schema.Literal("string", "number", "boolean", "date", "json");
export type VariableValueType = typeof VariableValueType.Type;

export const LinkStrength = Schema.Literal("hard", "soft", "context");
export type LinkStrength = typeof LinkStrength.Type;

/**
 * Structured validation diagnostic. Deterministic for equivalent inputs,
 * with actionable remediation guidance. `required` describes what was expected;
 * `observed` describes what was found.
 */
export const ValidationDiagnostic = Schema.Struct({
  code: Schema.NonEmptyString,
  scope: Schema.String,
  blocking: Schema.Boolean,
  required: Schema.String,
  observed: Schema.String,
  remediation: Schema.String,
  timestamp: Schema.String,
  evidenceRef: Schema.optional(Schema.String),
});
export type ValidationDiagnostic = typeof ValidationDiagnostic.Type;

export const ValidationResult = Schema.Struct({
  valid: Schema.Boolean,
  diagnostics: Schema.Array(ValidationDiagnostic),
});
export type ValidationResult = typeof ValidationResult.Type;

/**
 * Definition JSON blob for a methodology version. Story 1.1 validates
 * the outer structure; inner schemas for workUnitTypes (1.2),
 * transitions (1.2), and allowedWorkflowsByTransition (1.3) are
 * refined in later stories.
 */
export const MethodologyVersionDefinition = Schema.Struct({
  workUnitTypes: Schema.Array(Schema.Unknown),
  transitions: Schema.Array(Schema.Unknown),
  allowedWorkflowsByTransition: Schema.Record({
    key: Schema.String,
    value: Schema.Array(Schema.String),
  }),
});
export type MethodologyVersionDefinition = typeof MethodologyVersionDefinition.Type;

export const MethodologyVariableDefinitionInput = Schema.Struct({
  key: Schema.NonEmptyString,
  valueType: VariableValueType,
  description: Schema.optional(Schema.String),
  required: Schema.Boolean,
  defaultValue: Schema.optional(Schema.Unknown),
  validation: Schema.optional(Schema.Unknown),
});
export type MethodologyVariableDefinitionInput = typeof MethodologyVariableDefinitionInput.Type;

export const MethodologyLinkTypeDefinitionInput = Schema.Struct({
  key: Schema.NonEmptyString,
  description: Schema.optional(Schema.String),
  allowedStrengths: Schema.NonEmptyArray(LinkStrength),
  policyMetadata: Schema.optional(Schema.Unknown),
});
export type MethodologyLinkTypeDefinitionInput = typeof MethodologyLinkTypeDefinitionInput.Type;

/**
 * Input for creating a new methodology draft version.
 * All required fields are mandatory at the create boundary.
 */
export const CreateDraftVersionInput = Schema.Struct({
  methodologyKey: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  definition: MethodologyVersionDefinition,
  variableDefinitions: Schema.optional(Schema.Array(MethodologyVariableDefinitionInput)),
  linkTypeDefinitions: Schema.optional(Schema.Array(MethodologyLinkTypeDefinitionInput)),
});
export type CreateDraftVersionInput = typeof CreateDraftVersionInput.Type;

/**
 * Input for updating an existing draft version.
 * Required fields are mandatory at the update boundary (full replace).
 */
export const UpdateDraftVersionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  displayName: Schema.NonEmptyString,
  version: Schema.NonEmptyString,
  definition: MethodologyVersionDefinition,
  variableDefinitions: Schema.optional(Schema.Array(MethodologyVariableDefinitionInput)),
  linkTypeDefinitions: Schema.optional(Schema.Array(MethodologyLinkTypeDefinitionInput)),
});
export type UpdateDraftVersionInput = typeof UpdateDraftVersionInput.Type;

export const ValidateDraftVersionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
});
export type ValidateDraftVersionInput = typeof ValidateDraftVersionInput.Type;

export const GetDraftLineageInput = Schema.Struct({
  methodologyVersionId: Schema.NonEmptyString,
});
export type GetDraftLineageInput = typeof GetDraftLineageInput.Type;

export const MethodologyDefinition = Schema.Struct({
  id: Schema.String,
  key: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
});
export type MethodologyDefinition = typeof MethodologyDefinition.Type;

export const MethodologyVersion = Schema.Struct({
  id: Schema.String,
  methodologyId: Schema.String,
  version: Schema.String,
  status: MethodologyVersionStatus,
  displayName: Schema.String,
  definitionJson: Schema.Unknown,
  createdAt: Schema.DateFromSelf,
  retiredAt: Schema.NullOr(Schema.DateFromSelf),
});
export type MethodologyVersion = typeof MethodologyVersion.Type;

export const MethodologyVersionEvent = Schema.Struct({
  id: Schema.String,
  methodologyVersionId: Schema.String,
  eventType: VersionEventType,
  actorId: Schema.NullOr(Schema.String),
  changedFieldsJson: Schema.Unknown,
  diagnosticsJson: Schema.NullOr(Schema.Unknown),
  createdAt: Schema.DateFromSelf,
});
export type MethodologyVersionEvent = typeof MethodologyVersionEvent.Type;

export const MethodologyVariableDefinition = Schema.Struct({
  id: Schema.String,
  methodologyVersionId: Schema.String,
  key: Schema.String,
  valueType: VariableValueType,
  descriptionJson: Schema.NullOr(Schema.Unknown),
  required: Schema.Boolean,
  defaultValueJson: Schema.NullOr(Schema.Unknown),
  validationJson: Schema.NullOr(Schema.Unknown),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
});
export type MethodologyVariableDefinition = typeof MethodologyVariableDefinition.Type;

export const MethodologyLinkTypeDefinition = Schema.Struct({
  id: Schema.String,
  methodologyVersionId: Schema.String,
  key: Schema.String,
  descriptionJson: Schema.NullOr(Schema.Unknown),
  allowedStrengthsJson: Schema.Unknown,
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
});
export type MethodologyLinkTypeDefinition = typeof MethodologyLinkTypeDefinition.Type;
