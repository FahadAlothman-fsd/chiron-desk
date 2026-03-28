import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ArtifactRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeArtifactService,
  RuntimeArtifactServiceLive,
  RuntimeFactService,
  RuntimeFactServiceLive,
  WorkUnitFactRepository,
} from "../../index";

const projectWorkUnitLayer = Layer.succeed(ProjectWorkUnitRepository, {
  createProjectWorkUnit: () => Effect.die("not implemented in test"),
  listProjectWorkUnitsByProject: () =>
    Effect.succeed([
      {
        id: "wu-1",
        projectId: "project-1",
        workUnitTypeId: "task",
        currentStateId: "todo",
        activeTransitionExecutionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "wu-2",
        projectId: "project-1",
        workUnitTypeId: "task",
        currentStateId: "todo",
        activeTransitionExecutionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  getProjectWorkUnitById: (projectWorkUnitId) =>
    Effect.succeed({
      id: projectWorkUnitId,
      projectId: "project-1",
      workUnitTypeId: "task",
      currentStateId: "todo",
      activeTransitionExecutionId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
});

const projectFactLayer = Layer.succeed(ProjectFactRepository, {
  createFactInstance: () => Effect.die("not implemented in test"),
  getCurrentValuesByDefinition: ({ factDefinitionId }) =>
    Effect.succeed(
      factDefinitionId === "fact-priority"
        ? [
            {
              id: "pf-1",
              projectId: "project-1",
              factDefinitionId,
              valueJson: "P1",
              status: "active" as const,
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
            },
          ]
        : [],
    ),
  listFactsByProject: () =>
    Effect.succeed([
      {
        id: "pf-1",
        projectId: "project-1",
        factDefinitionId: "fact-priority",
        valueJson: "P1",
        status: "active" as const,
        supersededByFactInstanceId: null,
        producedByTransitionExecutionId: null,
        producedByWorkflowExecutionId: null,
        authoredByUserId: null,
        createdAt: new Date("2026-03-28T10:00:00.000Z"),
      },
    ]),
  supersedeFactInstance: () => Effect.void,
});

const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
  createFactInstance: () => Effect.die("not implemented in test"),
  getCurrentValuesByDefinition: ({ factDefinitionId }) =>
    Effect.succeed(
      factDefinitionId === "wu-fact-link"
        ? [
            {
              id: "wuf-1",
              projectWorkUnitId: "wu-1",
              factDefinitionId,
              valueJson: null,
              referencedProjectWorkUnitId: "wu-2",
              status: "active" as const,
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
            },
          ]
        : [],
    ),
  listFactsByWorkUnit: ({ projectWorkUnitId }) =>
    Effect.succeed(
      projectWorkUnitId === "wu-1"
        ? [
            {
              id: "wuf-1",
              projectWorkUnitId,
              factDefinitionId: "wu-fact-link",
              valueJson: null,
              referencedProjectWorkUnitId: "wu-2",
              status: "active" as const,
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
            },
          ]
        : [],
    ),
  supersedeFactInstance: () => Effect.void,
});

const artifactLayer = Layer.succeed(ArtifactRepository, {
  createSnapshot: () => Effect.die("not implemented in test"),
  addSnapshotFiles: () => Effect.die("not implemented in test"),
  getCurrentSnapshotBySlot: ({ slotDefinitionId }) =>
    Effect.succeed({
      exists: slotDefinitionId === "slot-1",
      snapshot:
        slotDefinitionId === "slot-1"
          ? {
              id: "snapshot-1",
              projectWorkUnitId: "wu-1",
              slotDefinitionId,
              recordedByTransitionExecutionId: null,
              recordedByWorkflowExecutionId: null,
              recordedByUserId: "user-1",
              supersededByProjectArtifactSnapshotId: null,
              createdAt: new Date("2026-03-28T10:00:00.000Z"),
            }
          : null,
      members:
        slotDefinitionId === "slot-1"
          ? [
              {
                id: "file-1",
                artifactSnapshotId: "snapshot-1",
                filePath: "docs/spec.md",
                memberStatus: "present" as const,
                gitCommitHash: "abc",
                gitBlobHash: "def",
              },
            ]
          : [],
    }),
  listLineageHistory: ({ slotDefinitionId }) =>
    Effect.succeed(
      slotDefinitionId === "slot-1"
        ? [
            {
              snapshot: {
                id: "snapshot-1",
                projectWorkUnitId: "wu-1",
                slotDefinitionId,
                recordedByTransitionExecutionId: null,
                recordedByWorkflowExecutionId: null,
                recordedByUserId: "user-1",
                supersededByProjectArtifactSnapshotId: null,
                createdAt: new Date("2026-03-28T10:00:00.000Z"),
              },
              deltaMembers: [
                {
                  id: "file-1",
                  artifactSnapshotId: "snapshot-1",
                  filePath: "docs/spec.md",
                  memberStatus: "present" as const,
                  gitCommitHash: "abc",
                  gitBlobHash: "def",
                },
              ],
              effectiveMembers: [
                {
                  id: "file-1",
                  artifactSnapshotId: "snapshot-1",
                  filePath: "docs/spec.md",
                  memberStatus: "present" as const,
                  gitCommitHash: "abc",
                  gitBlobHash: "def",
                },
              ],
            },
          ]
        : [],
    ),
  checkFreshness: ({ slotDefinitionId }) =>
    Effect.succeed(
      slotDefinitionId === "slot-1"
        ? { exists: true, freshness: "stale" as const }
        : { exists: false, freshness: "unavailable" as const },
    ),
});

const factLayer = RuntimeFactServiceLive.pipe(
  Layer.provideMerge(projectFactLayer),
  Layer.provideMerge(projectWorkUnitLayer),
  Layer.provideMerge(workUnitFactLayer),
);

const artifactServiceLayer = RuntimeArtifactServiceLive.pipe(
  Layer.provideMerge(artifactLayer),
  Layer.provideMerge(projectWorkUnitLayer),
);

describe("RuntimeFactService + RuntimeArtifactService", () => {
  it("projects project/work-unit fact surfaces", async () => {
    const program = Effect.gen(function* () {
      const factService = yield* RuntimeFactService;

      const projectFacts = yield* factService.getProjectFacts({ projectId: "project-1" });
      const workUnitFacts = yield* factService.getWorkUnitFacts({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        tab: "work_units",
      });

      return { projectFacts, workUnitFacts };
    }).pipe(Effect.provide(factLayer));

    const result = await Effect.runPromise(program);
    expect(result.projectFacts.cards).toHaveLength(1);
    expect(result.projectFacts.cards[0]?.factDefinitionId).toBe("fact-priority");
    expect(result.workUnitFacts.workUnits?.outgoing[0]?.factDefinitionId).toBe("wu-fact-link");
  });

  it("projects artifact slot detail/snapshot and freshness checks", async () => {
    const program = Effect.gen(function* () {
      const artifactService = yield* RuntimeArtifactService;

      const detail = yield* artifactService.getArtifactSlotDetail({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
      });

      const snapshot = yield* artifactService.getArtifactSnapshotDialog({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
        projectArtifactSnapshotId: "snapshot-1",
      });

      const freshness = yield* artifactService.checkArtifactSlotCurrentState({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
      });

      return { detail, snapshot, freshness };
    }).pipe(Effect.provide(artifactServiceLayer));

    const result = await Effect.runPromise(program);
    expect(result.detail.currentEffectiveSnapshot.exists).toBe(true);
    expect(result.snapshot.snapshot.projectArtifactSnapshotId).toBe("snapshot-1");
    expect(result.freshness.result).toBe("changed");
  });
});
