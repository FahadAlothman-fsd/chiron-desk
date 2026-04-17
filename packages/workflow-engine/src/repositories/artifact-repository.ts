import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export type ArtifactMemberStatus = "present" | "removed";

export interface ArtifactSnapshotRow {
  id: string;
  projectWorkUnitId: string;
  slotDefinitionId: string;
  recordedByTransitionExecutionId: string | null;
  recordedByWorkflowExecutionId: string | null;
  recordedByUserId: string | null;
  supersededByProjectArtifactSnapshotId: string | null;
  createdAt: Date;
}

export interface ArtifactSnapshotFileRow {
  id: string;
  artifactSnapshotId: string;
  filePath: string;
  memberStatus: ArtifactMemberStatus;
  gitCommitHash: string | null;
  gitBlobHash: string | null;
  gitCommitTitle: string | null;
  gitCommitBody: string | null;
}

export interface ArtifactCurrentState {
  exists: boolean;
  snapshot: ArtifactSnapshotRow | null;
  members: readonly ArtifactSnapshotFileRow[];
}

export interface ArtifactLineageEntry {
  snapshot: ArtifactSnapshotRow;
  deltaMembers: readonly ArtifactSnapshotFileRow[];
  effectiveMembers: readonly ArtifactSnapshotFileRow[];
}

export type ArtifactFreshness = "fresh" | "stale" | "unavailable";

export interface ArtifactFreshnessResult {
  exists: boolean;
  freshness: ArtifactFreshness;
}

export class ArtifactRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/ArtifactRepository",
)<
  ArtifactRepository,
  {
    readonly createSnapshot: (params: {
      projectWorkUnitId: string;
      slotDefinitionId: string;
      recordedByTransitionExecutionId?: string | null;
      recordedByWorkflowExecutionId?: string | null;
      recordedByUserId?: string | null;
      supersededByProjectArtifactSnapshotId?: string | null;
    }) => Effect.Effect<ArtifactSnapshotRow, RepositoryError>;
    readonly addSnapshotFiles: (params: {
      artifactSnapshotId: string;
      files: ReadonlyArray<{
        filePath: string;
        memberStatus: ArtifactMemberStatus;
        gitCommitHash?: string | null;
        gitBlobHash?: string | null;
        gitCommitTitle?: string | null;
        gitCommitBody?: string | null;
      }>;
    }) => Effect.Effect<readonly ArtifactSnapshotFileRow[], RepositoryError>;
    readonly getCurrentSnapshotBySlot: (params: {
      projectWorkUnitId: string;
      slotDefinitionId: string;
    }) => Effect.Effect<ArtifactCurrentState, RepositoryError>;
    readonly listLineageHistory: (params: {
      projectWorkUnitId: string;
      slotDefinitionId: string;
    }) => Effect.Effect<readonly ArtifactLineageEntry[], RepositoryError>;
    readonly checkFreshness: (params: {
      projectId: string;
      projectWorkUnitId: string;
      slotDefinitionId: string;
    }) => Effect.Effect<ArtifactFreshnessResult, RepositoryError>;
  }
>() {}
