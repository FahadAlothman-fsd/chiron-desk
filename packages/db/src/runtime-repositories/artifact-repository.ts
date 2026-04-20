import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { and, eq } from "drizzle-orm";
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
  projectArtifactInstanceFiles,
  projectArtifactInstances,
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

function toSnapshotRow(row: typeof projectArtifactInstances.$inferSelect): ArtifactSnapshotRow {
  return {
    id: row.id,
    projectWorkUnitId: row.projectWorkUnitId,
    slotDefinitionId: row.slotDefinitionId,
    recordedByTransitionExecutionId: row.recordedByTransitionExecutionId,
    recordedByWorkflowExecutionId: row.recordedByWorkflowExecutionId,
    recordedByUserId: row.recordedByUserId,
    createdAt: row.createdAt,
    supersededByProjectArtifactSnapshotId: null,
  };
}

function toFileRow(row: typeof projectArtifactInstanceFiles.$inferSelect): ArtifactSnapshotFileRow {
  return {
    id: row.id,
    artifactSnapshotId: row.artifactInstanceId,
    filePath: row.filePath,
    memberStatus: "present",
    gitCommitHash: row.gitCommitHash,
    gitBlobHash: row.gitBlobHash,
    gitCommitTitle: row.gitCommitTitle,
    gitCommitBody: row.gitCommitBody,
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
  const artifactInstances = await db
    .select()
    .from(projectArtifactInstances)
    .where(
      and(
        eq(projectArtifactInstances.projectWorkUnitId, projectWorkUnitId),
        eq(projectArtifactInstances.slotDefinitionId, slotDefinitionId),
      ),
    )
    .limit(1);

  const currentInstance = artifactInstances[0];
  if (!currentInstance) {
    return {
      currentState: {
        exists: false,
        snapshot: null,
        members: [],
      },
      lineageEntries: [],
    };
  }

  const fileRows = await db
    .select()
    .from(projectArtifactInstanceFiles)
    .where(eq(projectArtifactInstanceFiles.artifactInstanceId, currentInstance.id));

  const currentMembers = fileRows
    .map(toFileRow)
    .sort((a, b) => a.filePath.localeCompare(b.filePath));
  const exists = currentMembers.length > 0;

  const lineageEntries: ArtifactLineageEntry[] = [
    {
      snapshot: toSnapshotRow(currentInstance),
      deltaMembers: currentMembers,
      effectiveMembers: currentMembers,
    },
  ];

  return {
    currentState: {
      exists,
      snapshot: toSnapshotRow(currentInstance),
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
          const existing = await tx
            .select()
            .from(projectArtifactInstances)
            .where(
              and(
                eq(projectArtifactInstances.projectWorkUnitId, params.projectWorkUnitId),
                eq(projectArtifactInstances.slotDefinitionId, params.slotDefinitionId),
              ),
            )
            .limit(1);

          const row = existing[0]
            ? (
                await tx
                  .update(projectArtifactInstances)
                  .set({
                    recordedByTransitionExecutionId: params.recordedByTransitionExecutionId ?? null,
                    recordedByWorkflowExecutionId: params.recordedByWorkflowExecutionId ?? null,
                    recordedByUserId: params.recordedByUserId ?? null,
                    updatedAt: new Date(),
                  })
                  .where(eq(projectArtifactInstances.id, existing[0].id))
                  .returning()
              )[0]
            : (
                await tx
                  .insert(projectArtifactInstances)
                  .values({
                    projectWorkUnitId: params.projectWorkUnitId,
                    slotDefinitionId: params.slotDefinitionId,
                    recordedByTransitionExecutionId: params.recordedByTransitionExecutionId ?? null,
                    recordedByWorkflowExecutionId: params.recordedByWorkflowExecutionId ?? null,
                    recordedByUserId: params.recordedByUserId ?? null,
                  })
                  .returning()
              )[0];

          if (!row) throw new Error("Failed to create artifact instance");
          return toSnapshotRow(row);
        });
      }),

    addSnapshotFiles: ({ artifactSnapshotId, files }) =>
      dbEffect("runtime.artifacts.addSnapshotFiles", async () => {
        if (files.length === 0) {
          return [];
        }

        return db.transaction(async (tx) => {
          for (const file of files) {
            const existing = await tx
              .select()
              .from(projectArtifactInstanceFiles)
              .where(
                and(
                  eq(projectArtifactInstanceFiles.artifactInstanceId, artifactSnapshotId),
                  eq(projectArtifactInstanceFiles.filePath, file.filePath),
                ),
              )
              .limit(1);

            if (file.memberStatus === "removed") {
              if (existing[0]) {
                await tx
                  .delete(projectArtifactInstanceFiles)
                  .where(eq(projectArtifactInstanceFiles.id, existing[0].id));
              }
              continue;
            }

            if (existing[0]) {
              await tx
                .update(projectArtifactInstanceFiles)
                .set({
                  gitCommitHash: file.gitCommitHash ?? null,
                  gitBlobHash: file.gitBlobHash ?? null,
                  gitCommitTitle: file.gitCommitTitle ?? null,
                  gitCommitBody: file.gitCommitBody ?? null,
                  updatedAt: new Date(),
                })
                .where(eq(projectArtifactInstanceFiles.id, existing[0].id));
            } else {
              await tx.insert(projectArtifactInstanceFiles).values({
                artifactInstanceId: artifactSnapshotId,
                filePath: file.filePath,
                gitCommitHash: file.gitCommitHash ?? null,
                gitBlobHash: file.gitBlobHash ?? null,
                gitCommitTitle: file.gitCommitTitle ?? null,
                gitCommitBody: file.gitCommitBody ?? null,
              });
            }
          }

          const rows = await tx
            .select()
            .from(projectArtifactInstanceFiles)
            .where(eq(projectArtifactInstanceFiles.artifactInstanceId, artifactSnapshotId));
          return rows.map(toFileRow);
        });
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
      projectWorkUnitId: projectArtifactInstances.projectWorkUnitId,
      slotDefinitionId: projectArtifactInstances.slotDefinitionId,
    })
    .from(projectArtifactInstances)
    .innerJoin(
      projectWorkUnits,
      eq(projectWorkUnits.id, projectArtifactInstances.projectWorkUnitId),
    )
    .where(eq(projectWorkUnits.projectId, params.projectId));

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
