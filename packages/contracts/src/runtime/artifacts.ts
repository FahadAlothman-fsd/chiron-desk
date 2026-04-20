import * as Schema from "effect/Schema";

import { RuntimeWorkUnitIdentity } from "./work-units.js";

export const ArtifactKind = Schema.Literal("single_file", "file_set");
export type ArtifactKind = typeof ArtifactKind.Type;

export const ArtifactSnapshotMemberStatus = Schema.Literal("present", "removed");
export type ArtifactSnapshotMemberStatus = typeof ArtifactSnapshotMemberStatus.Type;

export const ArtifactSlotDefinition = Schema.Struct({
  slotDefinitionId: Schema.String,
  slotKey: Schema.String,
  slotName: Schema.optional(Schema.String),
  artifactKind: ArtifactKind,
  description: Schema.optional(Schema.Unknown),
  guidance: Schema.optional(Schema.Unknown),
  rules: Schema.optional(Schema.Unknown),
});
export type ArtifactSlotDefinition = typeof ArtifactSlotDefinition.Type;

export const ArtifactRecordedBy = Schema.Struct({
  transitionExecutionId: Schema.optional(Schema.String),
  transitionId: Schema.optional(Schema.String),
  transitionKey: Schema.optional(Schema.String),
  transitionName: Schema.optional(Schema.String),
  workflowExecutionId: Schema.optional(Schema.String),
  workflowId: Schema.optional(Schema.String),
  workflowKey: Schema.optional(Schema.String),
  workflowName: Schema.optional(Schema.String),
  userId: Schema.optional(Schema.String),
});
export type ArtifactRecordedBy = typeof ArtifactRecordedBy.Type;

export const ArtifactMember = Schema.Struct({
  artifactInstanceFileId: Schema.String,
  filePath: Schema.String,
  gitBlobHash: Schema.optional(Schema.String),
  gitCommitHash: Schema.optional(Schema.String),
  gitCommitTitle: Schema.optional(Schema.String),
  gitCommitBody: Schema.optional(Schema.String),
});
export type ArtifactMember = typeof ArtifactMember.Type;

export const ArtifactInstanceFile = Schema.Struct({
  filePath: Schema.String,
  gitCommitHash: Schema.NullOr(Schema.String),
  gitCommitTitle: Schema.NullOr(Schema.String),
});
export type ArtifactInstanceFile = typeof ArtifactInstanceFile.Type;

export const ArtifactInstanceSummary = Schema.Struct({
  exists: Schema.Boolean,
  artifactInstanceId: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
  recordedBy: Schema.optional(ArtifactRecordedBy),
  fileCount: Schema.Number,
  previewFiles: Schema.Array(ArtifactInstanceFile),
});
export type ArtifactInstanceSummary = typeof ArtifactInstanceSummary.Type;

export const ArtifactInstanceDetail = Schema.Struct({
  exists: Schema.Boolean,
  artifactInstanceId: Schema.optional(Schema.String),
  updatedAt: Schema.optional(Schema.String),
  recordedBy: Schema.optional(ArtifactRecordedBy),
  fileCount: Schema.Number,
  files: Schema.Array(ArtifactInstanceFile),
});
export type ArtifactInstanceDetail = typeof ArtifactInstanceDetail.Type;

export const CheckArtifactSlotCurrentInstanceOutput = Schema.Struct({
  result: Schema.Literal("changed", "unchanged", "unavailable"),
  artifactInstanceId: Schema.optional(Schema.String),
  currentArtifactInstanceExists: Schema.Boolean,
});
export type CheckArtifactSlotCurrentInstanceOutput =
  typeof CheckArtifactSlotCurrentInstanceOutput.Type;

export const GetArtifactSlotsInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
});
export type GetArtifactSlotsInput = typeof GetArtifactSlotsInput.Type;

export const GetArtifactSlotsOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity,
  slots: Schema.Array(
    Schema.Struct({
      slotDefinition: ArtifactSlotDefinition,
      currentArtifactInstance: ArtifactInstanceSummary,
      target: Schema.Struct({
        page: Schema.Literal("artifact-slot-detail"),
        slotDefinitionId: Schema.String,
      }),
    }),
  ),
});
export type GetArtifactSlotsOutput = typeof GetArtifactSlotsOutput.Type;

export const GetArtifactSlotDetailInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  slotDefinitionId: Schema.String,
});
export type GetArtifactSlotDetailInput = typeof GetArtifactSlotDetailInput.Type;

export const GetArtifactSlotDetailOutput = Schema.Struct({
  workUnit: RuntimeWorkUnitIdentity,
  slotDefinition: ArtifactSlotDefinition,
  currentArtifactInstance: ArtifactInstanceDetail,
});
export type GetArtifactSlotDetailOutput = typeof GetArtifactSlotDetailOutput.Type;

export const GetArtifactInstanceDialogInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  slotDefinitionId: Schema.String,
  artifactInstanceId: Schema.String,
});
export type GetArtifactInstanceDialogInput = typeof GetArtifactInstanceDialogInput.Type;

export const GetArtifactInstanceDialogOutput = Schema.Struct({
  workUnit: Schema.Struct({
    projectWorkUnitId: Schema.String,
    workUnitTypeId: Schema.String,
    workUnitTypeKey: Schema.String,
    workUnitTypeName: Schema.String,
  }),
  slotDefinition: Schema.Struct({
    slotDefinitionId: Schema.String,
    slotKey: Schema.String,
    slotName: Schema.optional(Schema.String),
    artifactKind: ArtifactKind,
  }),
  artifactInstance: ArtifactInstanceDetail,
});
export type GetArtifactInstanceDialogOutput = typeof GetArtifactInstanceDialogOutput.Type;

export const CheckArtifactSlotCurrentStateInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  slotDefinitionId: Schema.String,
});
export type CheckArtifactSlotCurrentStateInput = typeof CheckArtifactSlotCurrentStateInput.Type;

export const CheckArtifactSlotCurrentStateOutput = Schema.Struct({
  result: Schema.Literal("changed", "unchanged", "unavailable"),
  artifactInstanceId: Schema.optional(Schema.String),
  currentArtifactInstanceExists: Schema.Boolean,
});
export type CheckArtifactSlotCurrentStateOutput = typeof CheckArtifactSlotCurrentStateOutput.Type;
