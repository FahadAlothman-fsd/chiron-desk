import { Schema } from "effect";
import {
  AudienceMarkdownJson,
  FactType,
  MethodologyFactDefinitionInput as MethodologyFactDefinitionInputSchema,
  type FactType as FactTypeType,
} from "./fact.js";

export { MethodologyFactDefinitionInput } from "./fact.js";

export const MethodologyVersionStatus = Schema.Literal("draft", "active", "deprecated", "retired");
export type MethodologyVersionStatus = typeof MethodologyVersionStatus.Type;

export const VersionEventType = Schema.Literal(
  "created",
  "updated",
  "validated",
  "workflows_updated",
  "transition_bindings_updated",
  "guidance_updated",
  "published",
);
export type VersionEventType = typeof VersionEventType.Type;

export const VariableValueType = FactType;
export type VariableValueType = FactTypeType;

export const LinkStrength = Schema.Literal("hard", "soft", "context");
export type LinkStrength = typeof LinkStrength.Type;

export const WorkflowStepType = Schema.Literal(
  "form",
  "agent",
  "action",
  "invoke",
  "branch",
  "display",
);
export type WorkflowStepType = typeof WorkflowStepType.Type;

export const GuidanceJson = AudienceMarkdownJson;
export type GuidanceJson = typeof GuidanceJson.Type;

export const WorkflowMetadataValue = Schema.Union(
  Schema.String,
  Schema.Number,
  Schema.Boolean,
  Schema.Array(Schema.String),
);
export type WorkflowMetadataValue = typeof WorkflowMetadataValue.Type;

export const WorkflowMetadata = Schema.Record({ key: Schema.String, value: WorkflowMetadataValue });
export type WorkflowMetadata = typeof WorkflowMetadata.Type;

export const WorkflowFactReference = Schema.Struct({
  factKey: Schema.NonEmptyString,
  displayName: Schema.String,
  required: Schema.optionalWith(Schema.Boolean, { default: () => false }),
  validation: Schema.optional(Schema.Unknown),
});
export type WorkflowFactReference = typeof WorkflowFactReference.Type;

export const WorkflowInputContract = Schema.Struct({
  kind: Schema.Literal("workflow-io.v1"),
  inputs: Schema.Array(WorkflowFactReference),
});
export type WorkflowInputContract = typeof WorkflowInputContract.Type;

export const WorkflowOutputContract = Schema.Struct({
  kind: Schema.Literal("workflow-io.v1"),
  outputs: Schema.Array(
    Schema.Struct({
      factKey: Schema.NonEmptyString,
      displayName: Schema.String,
      validation: Schema.optional(Schema.Unknown),
    }),
  ),
});
export type WorkflowOutputContract = typeof WorkflowOutputContract.Type;

export const WorkflowStep = Schema.Struct({
  key: Schema.NonEmptyString,
  type: WorkflowStepType,
  displayName: Schema.optional(Schema.String),
  config: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(GuidanceJson),
});
export type WorkflowStep = typeof WorkflowStep.Type;

export const WorkflowEdge = Schema.Struct({
  fromStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  toStepKey: Schema.optionalWith(Schema.NullOr(Schema.NonEmptyString), { default: () => null }),
  edgeKey: Schema.optional(Schema.NonEmptyString),
  condition: Schema.optional(Schema.Unknown),
});
export type WorkflowEdge = typeof WorkflowEdge.Type;

export const WorkflowDefinition = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  workUnitTypeKey: Schema.optional(Schema.NonEmptyString),
  metadata: Schema.optional(WorkflowMetadata),
  guidance: Schema.optional(GuidanceJson),
  inputContract: Schema.optional(WorkflowInputContract),
  outputContract: Schema.optional(WorkflowOutputContract),
  steps: Schema.Array(WorkflowStep),
  edges: Schema.Array(WorkflowEdge),
});
export type WorkflowDefinition = typeof WorkflowDefinition.Type;

export const LayeredGuidance = Schema.Struct({
  global: Schema.optional(Schema.Unknown),
  byWorkUnitType: Schema.optionalWith(
    Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    { default: () => ({}) },
  ),
  byAgentType: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
  byTransition: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
  byWorkflow: Schema.optionalWith(Schema.Record({ key: Schema.String, value: Schema.Unknown }), {
    default: () => ({}),
  }),
});
export type LayeredGuidance = typeof LayeredGuidance.Type;

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
  evidenceRef: Schema.NullOr(Schema.String),
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
 * transitions (1.2), and transitionWorkflowBindings (1.3) are
 * refined in later stories.
 */
export const MethodologyVersionDefinition = Schema.Struct({
  workUnitTypes: Schema.Array(Schema.Unknown),
  agentTypes: Schema.optionalWith(Schema.Array(Schema.Unknown), { default: () => [] }),
  transitions: Schema.Array(Schema.Unknown),
  workflows: Schema.optionalWith(Schema.Array(WorkflowDefinition), { default: () => [] }),
  transitionWorkflowBindings: Schema.optionalWith(
    Schema.Record({
      key: Schema.String,
      value: Schema.Array(Schema.String),
    }),
    { default: () => ({}) },
  ),
  guidance: Schema.optional(LayeredGuidance),
});
export type MethodologyVersionDefinition = typeof MethodologyVersionDefinition.Type;

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
  factDefinitions: Schema.optional(Schema.Array(MethodologyFactDefinitionInputSchema)),
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
  factDefinitions: Schema.optional(Schema.Array(MethodologyFactDefinitionInputSchema)),
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

export const PublishDraftVersionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  publishedVersion: Schema.NonEmptyString,
});
export type PublishDraftVersionInput = typeof PublishDraftVersionInput.Type;

export const GetPublicationEvidenceInput = Schema.Struct({
  methodologyVersionId: Schema.NonEmptyString,
});
export type GetPublicationEvidenceInput = typeof GetPublicationEvidenceInput.Type;

export const PinProjectMethodologyVersionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  methodologyKey: Schema.NonEmptyString,
  publishedVersion: Schema.NonEmptyString,
});
export type PinProjectMethodologyVersionInput = typeof PinProjectMethodologyVersionInput.Type;

export const RepinProjectMethodologyVersionInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
  methodologyKey: Schema.NonEmptyString,
  publishedVersion: Schema.NonEmptyString,
});
export type RepinProjectMethodologyVersionInput = typeof RepinProjectMethodologyVersionInput.Type;

export const GetProjectPinLineageInput = Schema.Struct({
  projectId: Schema.NonEmptyString,
});
export type GetProjectPinLineageInput = typeof GetProjectPinLineageInput.Type;

export const PublicationEvidence = Schema.Struct({
  actorId: Schema.NullOr(Schema.String),
  timestamp: Schema.String,
  sourceDraftRef: Schema.NonEmptyString,
  publishedVersion: Schema.NonEmptyString,
  validationSummary: ValidationResult,
  evidenceRef: Schema.NonEmptyString,
});
export type PublicationEvidence = typeof PublicationEvidence.Type;

export const ProjectMethodologyPinEventType = Schema.Literal("pinned", "repinned");
export type ProjectMethodologyPinEventType = typeof ProjectMethodologyPinEventType.Type;

export const ProjectMethodologyPinEvent = Schema.Struct({
  id: Schema.NonEmptyString,
  projectId: Schema.NonEmptyString,
  eventType: ProjectMethodologyPinEventType,
  actorId: Schema.NullOr(Schema.String),
  previousVersion: Schema.NullOr(Schema.String),
  newVersion: Schema.NonEmptyString,
  timestamp: Schema.String,
  evidenceRef: Schema.NonEmptyString,
});
export type ProjectMethodologyPinEvent = typeof ProjectMethodologyPinEvent.Type;

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

export const MethodologyFactDefinition = Schema.Struct({
  id: Schema.String,
  methodologyVersionId: Schema.String,
  name: Schema.NullOr(Schema.String),
  key: Schema.String,
  factType: FactType,
  description: Schema.NullOr(Schema.String),
  guidanceJson: Schema.NullOr(Schema.Unknown),
  defaultValueJson: Schema.NullOr(Schema.Unknown),
  validationJson: Schema.NullOr(Schema.Unknown),
  createdAt: Schema.DateFromSelf,
  updatedAt: Schema.DateFromSelf,
});
export type MethodologyFactDefinition = typeof MethodologyFactDefinition.Type;

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
