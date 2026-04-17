import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  ArtifactRepository,
  RepositoryError,
  type ArtifactCurrentState,
  type ArtifactFreshnessResult,
  type ArtifactLineageEntry,
  type ArtifactSnapshotFileRow,
  type ArtifactSnapshotRow,
} from "@chiron/workflow-engine";
import { projects } from "../schema/project";
import {
  artifactSnapshotFiles,
  projectArtifactSnapshots,
  projectWorkUnits,
} from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;

const execFileAsync = promisify(execFile);

function dbEffect<A>(operation: string, fn: () => Promise<A>): Effect.Effect<A, RepositoryError> {
  return Effect.tryPromise({
    try: fn,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toSnapshotRow(row: typeof projectArtifactSnapshots.$inferSelect): ArtifactSnapshotRow {
  return {
    id: row.id,
    projectWorkUnitId: row.projectWorkUnitId,
    slotDefinitionId: row.slotDefinitionId,
    recordedByTransitionExecutionId: row.recordedByTransitionExecutionId,
    recordedByWorkflowExecutionId: row.recordedByWorkflowExecutionId,
    recordedByUserId: row.recordedByUserId,
    supersededByProjectArtifactSnapshotId: row.supersededByProjectArtifactSnapshotId,
    createdAt: row.createdAt,
  };
}

function toFileRow(row: typeof artifactSnapshotFiles.$inferSelect): ArtifactSnapshotFileRow {
  return {
    id: row.id,
    artifactSnapshotId: row.artifactSnapshotId,
    filePath: row.filePath,
    memberStatus: row.memberStatus,
    gitCommitHash: row.gitCommitHash,
    gitBlobHash: row.gitBlobHash,
    gitCommitTitle: row.gitCommitTitle,
    gitCommitBody: row.gitCommitBody,
  };
}

function selectHeadSnapshot(
  snapshots: readonly (typeof projectArtifactSnapshots.$inferSelect)[],
): typeof projectArtifactSnapshots.$inferSelect | null {
  const heads = snapshots.filter(
    (snapshot) => snapshot.supersededByProjectArtifactSnapshotId === null,
  );
  if (heads.length === 0) {
    return null;
  }

  heads.sort((a, b) => {
    const byTimestamp = b.createdAt.getTime() - a.createdAt.getTime();
    return byTimestamp !== 0 ? byTimestamp : b.id.localeCompare(a.id);
  });

  return heads[0] ?? null;
}

function buildLineageFromHead(
  head: typeof projectArtifactSnapshots.$inferSelect,
  snapshots: readonly (typeof projectArtifactSnapshots.$inferSelect)[],
): readonly (typeof projectArtifactSnapshots.$inferSelect)[] {
  const parentByChildId = new Map<string, typeof projectArtifactSnapshots.$inferSelect>();
  for (const row of snapshots) {
    if (row.supersededByProjectArtifactSnapshotId) {
      parentByChildId.set(row.supersededByProjectArtifactSnapshotId, row);
    }
  }

  const lineage: (typeof projectArtifactSnapshots.$inferSelect)[] = [head];
  let cursor = head;

  while (true) {
    const parent = parentByChildId.get(cursor.id);
    if (!parent) {
      break;
    }

    lineage.push(parent);
    cursor = parent;
  }

  return lineage;
}

function resolveEffectiveMembers(
  lineage: readonly (typeof projectArtifactSnapshots.$inferSelect)[],
  filesBySnapshotId: ReadonlyMap<string, readonly (typeof artifactSnapshotFiles.$inferSelect)[]>,
): {
  currentMembers: readonly ArtifactSnapshotFileRow[];
  effectiveMembersBySnapshotId: ReadonlyMap<string, readonly ArtifactSnapshotFileRow[]>;
} {
  const effectiveMembersBySnapshotId = new Map<string, readonly ArtifactSnapshotFileRow[]>();
  const currentMembersByPath = new Map<string, ArtifactSnapshotFileRow>();
  const oldestToNewest = [...lineage].reverse();

  for (const snapshot of oldestToNewest) {
    const deltaRows = filesBySnapshotId.get(snapshot.id) ?? [];
    for (const deltaRow of deltaRows) {
      if (deltaRow.memberStatus === "removed") {
        currentMembersByPath.delete(deltaRow.filePath);
      } else {
        currentMembersByPath.set(deltaRow.filePath, toFileRow(deltaRow));
      }
    }

    const effectiveMembers = [...currentMembersByPath.values()].sort((a, b) =>
      a.filePath.localeCompare(b.filePath),
    );
    effectiveMembersBySnapshotId.set(snapshot.id, effectiveMembers);
  }

  const currentMembers = [...currentMembersByPath.values()].sort((a, b) =>
    a.filePath.localeCompare(b.filePath),
  );

  return {
    currentMembers,
    effectiveMembersBySnapshotId,
  };
}

async function resolveSlotState(
  db: DB,
  projectWorkUnitId: string,
  slotDefinitionId: string,
): Promise<{
  currentState: ArtifactCurrentState;
  lineageEntries: readonly ArtifactLineageEntry[];
}> {
  const snapshots = await db
    .select()
    .from(projectArtifactSnapshots)
    .where(
      and(
        eq(projectArtifactSnapshots.projectWorkUnitId, projectWorkUnitId),
        eq(projectArtifactSnapshots.slotDefinitionId, slotDefinitionId),
      ),
    )
    .orderBy(desc(projectArtifactSnapshots.createdAt), desc(projectArtifactSnapshots.id));

  const head = selectHeadSnapshot(snapshots);
  if (!head) {
    return {
      currentState: {
        exists: false,
        snapshot: null,
        members: [],
      },
      lineageEntries: [],
    };
  }

  const lineage = buildLineageFromHead(head, snapshots);
  const lineageIds = lineage.map((snapshot) => snapshot.id);

  const deltaRows = await db
    .select()
    .from(artifactSnapshotFiles)
    .where(inArray(artifactSnapshotFiles.artifactSnapshotId, lineageIds));
  const filesBySnapshotId = new Map<string, (typeof artifactSnapshotFiles.$inferSelect)[]>();
  for (const row of deltaRows) {
    const existing = filesBySnapshotId.get(row.artifactSnapshotId) ?? [];
    existing.push(row);
    filesBySnapshotId.set(row.artifactSnapshotId, existing);
  }

  const { currentMembers, effectiveMembersBySnapshotId } = resolveEffectiveMembers(
    lineage,
    filesBySnapshotId,
  );
  const exists = currentMembers.length > 0;

  const lineageEntries: ArtifactLineageEntry[] = lineage.map((snapshotRow) => ({
    snapshot: toSnapshotRow(snapshotRow),
    deltaMembers: (filesBySnapshotId.get(snapshotRow.id) ?? []).map(toFileRow),
    effectiveMembers: effectiveMembersBySnapshotId.get(snapshotRow.id) ?? [],
  }));

  return {
    currentState: {
      exists,
      snapshot: toSnapshotRow(head),
      members: exists ? currentMembers : [],
    },
    lineageEntries,
  };
}

async function resolveHeadBlobHash(
  projectRootPath: string,
  filePath: string,
): Promise<string | null> {
  const { stdout } = await execFileAsync("git", [
    "-C",
    projectRootPath,
    "ls-tree",
    "HEAD",
    "--",
    filePath,
  ]);
  const line = stdout.trim();
  if (!line) {
    return null;
  }

  const parts = line.split(/\s+/);
  return parts.length >= 3 ? (parts[2] ?? null) : null;
}

async function resolveHeadTouchCommit(
  projectRootPath: string,
  filePath: string,
): Promise<string | null> {
  const { stdout } = await execFileAsync("git", [
    "-C",
    projectRootPath,
    "log",
    "-1",
    "--format=%H",
    "--",
    filePath,
  ]);
  const value = stdout.trim();
  return value.length > 0 ? value : null;
}

export function createArtifactRepoLayer(db: DB): Layer.Layer<ArtifactRepository> {
  return Layer.succeed(ArtifactRepository, {
    createSnapshot: (params) =>
      dbEffect("runtime.artifacts.createSnapshot", async () => {
        return db.transaction(async (tx) => {
          const inserted = await tx
            .insert(projectArtifactSnapshots)
            .values({
              projectWorkUnitId: params.projectWorkUnitId,
              slotDefinitionId: params.slotDefinitionId,
              recordedByTransitionExecutionId: params.recordedByTransitionExecutionId ?? null,
              recordedByWorkflowExecutionId: params.recordedByWorkflowExecutionId ?? null,
              recordedByUserId: params.recordedByUserId ?? null,
              supersededByProjectArtifactSnapshotId: null,
            })
            .returning();

          const row = inserted[0];
          if (!row) {
            throw new Error("Failed to create artifact snapshot");
          }

          if (params.supersededByProjectArtifactSnapshotId) {
            await tx
              .update(projectArtifactSnapshots)
              .set({ supersededByProjectArtifactSnapshotId: row.id })
              .where(eq(projectArtifactSnapshots.id, params.supersededByProjectArtifactSnapshotId));
          }

          return toSnapshotRow(row);
        });
      }),

    addSnapshotFiles: ({ artifactSnapshotId, files }) =>
      dbEffect("runtime.artifacts.addSnapshotFiles", async () => {
        if (files.length === 0) {
          return [];
        }

        const inserted = await db
          .insert(artifactSnapshotFiles)
          .values(
            files.map((file) => ({
              artifactSnapshotId,
              filePath: file.filePath,
              memberStatus: file.memberStatus,
              gitCommitHash: file.gitCommitHash ?? null,
              gitBlobHash: file.gitBlobHash ?? null,
              gitCommitTitle: file.gitCommitTitle ?? null,
              gitCommitBody: file.gitCommitBody ?? null,
            })),
          )
          .returning();

        return inserted.map(toFileRow);
      }),

    getCurrentSnapshotBySlot: ({ projectWorkUnitId, slotDefinitionId }) =>
      dbEffect("runtime.artifacts.getCurrentSnapshotBySlot", async () => {
        const { currentState } = await resolveSlotState(db, projectWorkUnitId, slotDefinitionId);
        return currentState;
      }),

    listLineageHistory: ({ projectWorkUnitId, slotDefinitionId }) =>
      dbEffect("runtime.artifacts.listLineageHistory", async () => {
        const { lineageEntries } = await resolveSlotState(db, projectWorkUnitId, slotDefinitionId);
        return lineageEntries;
      }),

    checkFreshness: ({ projectId, projectWorkUnitId, slotDefinitionId }) =>
      dbEffect("runtime.artifacts.checkFreshness", async () => {
        const state = await resolveSlotState(db, projectWorkUnitId, slotDefinitionId);
        const currentState = state.currentState;
        if (!currentState.exists) {
          return {
            exists: false,
            freshness: "unavailable",
          } satisfies ArtifactFreshnessResult;
        }

        const rootRows = await db
          .select({ projectRootPath: projects.projectRootPath })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1);
        const projectRootPath = rootRows[0]?.projectRootPath;
        if (!projectRootPath) {
          return {
            exists: true,
            freshness: "unavailable",
          } satisfies ArtifactFreshnessResult;
        }

        for (const member of currentState.members) {
          try {
            const expectedBlob = member.gitBlobHash
              ? await resolveHeadBlobHash(projectRootPath, member.filePath)
              : null;
            if (member.gitBlobHash && expectedBlob !== member.gitBlobHash) {
              return {
                exists: true,
                freshness: "stale",
              } satisfies ArtifactFreshnessResult;
            }

            const expectedCommit = member.gitCommitHash
              ? await resolveHeadTouchCommit(projectRootPath, member.filePath)
              : null;
            if (member.gitCommitHash && expectedCommit !== member.gitCommitHash) {
              return {
                exists: true,
                freshness: "stale",
              } satisfies ArtifactFreshnessResult;
            }
          } catch {
            return {
              exists: true,
              freshness: "unavailable",
            } satisfies ArtifactFreshnessResult;
          }
        }

        return {
          exists: true,
          freshness: "fresh",
        } satisfies ArtifactFreshnessResult;
      }),
  });
}

export async function findActiveArtifactConditionPrerequisites(
  db: DB,
  params: {
    projectId: string;
  },
): Promise<
  ReadonlyArray<{
    projectWorkUnitId: string;
    slotDefinitionId: string;
    exists: boolean;
  }>
> {
  const snapshotRows = await db
    .select({
      projectWorkUnitId: projectArtifactSnapshots.projectWorkUnitId,
      slotDefinitionId: projectArtifactSnapshots.slotDefinitionId,
    })
    .from(projectArtifactSnapshots)
    .innerJoin(
      projectWorkUnits,
      eq(projectWorkUnits.id, projectArtifactSnapshots.projectWorkUnitId),
    )
    .where(
      and(
        eq(projectWorkUnits.projectId, params.projectId),
        isNull(projectArtifactSnapshots.supersededByProjectArtifactSnapshotId),
      ),
    );

  const uniquePairs = new Map<string, { projectWorkUnitId: string; slotDefinitionId: string }>();
  for (const row of snapshotRows) {
    const key = `${row.projectWorkUnitId}:${row.slotDefinitionId}`;
    uniquePairs.set(key, row);
  }

  const results: Array<{ projectWorkUnitId: string; slotDefinitionId: string; exists: boolean }> =
    [];
  for (const pair of uniquePairs.values()) {
    const state = await resolveSlotState(db, pair.projectWorkUnitId, pair.slotDefinitionId);
    results.push({
      projectWorkUnitId: pair.projectWorkUnitId,
      slotDefinitionId: pair.slotDefinitionId,
      exists: state.currentState.exists,
    });
  }

  return results;
}
