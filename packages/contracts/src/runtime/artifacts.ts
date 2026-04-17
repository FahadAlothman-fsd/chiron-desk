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
  artifactSnapshotFileId: Schema.String,
  filePath: Schema.String,
  gitBlobHash: Schema.optional(Schema.String),
  gitCommitHash: Schema.optional(Schema.String),
  gitCommitTitle: Schema.optional(Schema.String),
  gitCommitBody: Schema.optional(Schema.String),
});
export type ArtifactMember = typeof ArtifactMember.Type;

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
      currentEffectiveSnapshot: Schema.Struct({
        exists: Schema.Boolean,
        projectArtifactSnapshotId: Schema.optional(Schema.String),
        createdAt: Schema.optional(Schema.String),
        memberCounts: Schema.Struct({ currentCount: Schema.Number }),
        previewMembers: Schema.Array(ArtifactMember),
      }),
      latestLineageHead: Schema.optional(
        Schema.Struct({ projectArtifactSnapshotId: Schema.String, createdAt: Schema.String }),
      ),
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
  currentEffectiveSnapshot: Schema.Struct({
    exists: Schema.Boolean,
    projectArtifactSnapshotId: Schema.optional(Schema.String),
    createdAt: Schema.optional(Schema.String),
    recordedBy: Schema.optional(ArtifactRecordedBy),
    memberCounts: Schema.Struct({ currentCount: Schema.Number }),
    members: Schema.Array(ArtifactMember),
  }),
  lineage: Schema.Array(
    Schema.Struct({
      projectArtifactSnapshotId: Schema.String,
      supersedesProjectArtifactSnapshotId: Schema.optional(Schema.String),
      createdAt: Schema.String,
      recordedBy: Schema.optional(ArtifactRecordedBy),
      memberCounts: Schema.Struct({ deltaRowCount: Schema.Number, effectiveCount: Schema.Number }),
      actions: Schema.optional(
        Schema.Struct({
          inspectSnapshot: Schema.optional(
            Schema.Struct({
              kind: Schema.Literal("open_artifact_snapshot_dialog"),
              projectArtifactSnapshotId: Schema.String,
            }),
          ),
        }),
      ),
    }),
  ),
});
export type GetArtifactSlotDetailOutput = typeof GetArtifactSlotDetailOutput.Type;

export const GetArtifactSnapshotDialogInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  slotDefinitionId: Schema.String,
  projectArtifactSnapshotId: Schema.String,
});
export type GetArtifactSnapshotDialogInput = typeof GetArtifactSnapshotDialogInput.Type;

export const GetArtifactSnapshotDialogOutput = Schema.Struct({
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
  snapshot: Schema.Struct({
    projectArtifactSnapshotId: Schema.String,
    supersedesProjectArtifactSnapshotId: Schema.optional(Schema.String),
    createdAt: Schema.String,
    recordedBy: Schema.optional(ArtifactRecordedBy),
    deltaMembers: Schema.Array(
      ArtifactMember.pipe(
        Schema.extend(
          Schema.Struct({
            memberStatus: ArtifactSnapshotMemberStatus,
          }),
        ),
      ),
    ),
    effectiveMemberCounts: Schema.Struct({ currentCount: Schema.Number }),
  }),
});
export type GetArtifactSnapshotDialogOutput = typeof GetArtifactSnapshotDialogOutput.Type;

export const CheckArtifactSlotCurrentStateInput = Schema.Struct({
  projectId: Schema.String,
  projectWorkUnitId: Schema.String,
  slotDefinitionId: Schema.String,
});
export type CheckArtifactSlotCurrentStateInput = typeof CheckArtifactSlotCurrentStateInput.Type;

export const CheckArtifactSlotCurrentStateOutput = Schema.Struct({
  result: Schema.Literal("changed", "unchanged", "unavailable"),
  projectArtifactSnapshotId: Schema.optional(Schema.String),
  currentEffectiveSnapshotExists: Schema.Boolean,
});
export type CheckArtifactSlotCurrentStateOutput = typeof CheckArtifactSlotCurrentStateOutput.Type;
