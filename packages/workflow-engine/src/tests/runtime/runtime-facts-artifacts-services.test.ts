import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { MethodologyVersionBoundaryService } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

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

const projectContextLayer = Layer.succeed(ProjectContextRepository, {
  findProjectPin: () =>
    Effect.succeed({
      projectId: "project-1",
      methodologyVersionId: "version-1",
      methodologyId: "meth-1",
      methodologyKey: "test-method",
      publishedVersion: "v1",
      actorId: null,
      createdAt: new Date("2026-03-28T09:00:00.000Z"),
      updatedAt: new Date("2026-03-28T09:00:00.000Z"),
    }),
  hasExecutionHistoryForRepin: () => Effect.succeed(false),
  pinProjectMethodologyVersion: () => Effect.die("unused"),
  repinProjectMethodologyVersion: () => Effect.die("unused"),
  getProjectPinLineage: () => Effect.succeed([]),
  createProject: () => Effect.die("unused"),
  listProjects: () => Effect.succeed([]),
  getProjectById: () => Effect.succeed(null),
});

const methodologyVersionLayer = Layer.succeed(MethodologyVersionBoundaryService, {
  getVersionWorkspaceSnapshot: () =>
    Effect.succeed({
      id: "version-1",
      methodologyId: "meth-1",
      version: "v1",
      status: "active",
      displayName: "Test",
      workflows: [],
      transitionWorkflowBindings: {},
      guidance: undefined,
      linkTypeDefinitions: [],
      factDefinitions: [
        {
          id: "fact-priority",
          key: "priority",
          name: "Priority",
          factType: "string",
          type: "string",
          cardinality: "one",
        },
        {
          id: "fact-status",
          key: "status",
          name: "Status",
          factType: "string",
          type: "string",
          cardinality: "one",
        },
      ],
      workUnitTypes: [
        {
          id: "task",
          key: "TASK",
          displayName: "Task",
          cardinality: "many_per_project",
          lifecycleStates: [],
          lifecycleTransitions: [],
          factSchemas: [
            {
              id: "wu-fact-title",
              key: "title",
              name: "Title",
              kind: "plain_fact",
              factType: "string",
              type: "string",
              cardinality: "one",
            },
            {
              id: "wu-fact-link",
              key: "depends_on",
              name: "Depends On",
              kind: "work_unit_reference_fact",
              factType: "work_unit",
              cardinality: "many",
            },
          ],
        },
      ],
      agentTypes: [],
      transitions: [],
    }),
  getVersionWorkspaceStats: () => Effect.die("unused"),
  getAuthoringSnapshot: () => Effect.die("unused"),
  createMethodology: () => Effect.die("unused"),
  updateMethodology: () => Effect.die("unused"),
  archiveMethodology: () => Effect.die("unused"),
  listMethodologies: () => Effect.die("unused"),
  getMethodologyDetails: () => Effect.die("unused"),
  createDraftVersion: () => Effect.die("unused"),
  updateDraftVersion: () => Effect.die("unused"),
  validateDraftVersion: () => Effect.die("unused"),
  replaceDraftWorkflowSnapshot: () => Effect.die("unused"),
  getDraftLineage: () => Effect.die("unused"),
  publishDraftVersion: () => Effect.die("unused"),
  getPublicationEvidence: () => Effect.die("unused"),
  getPublishedContractByVersionAndWorkUnitType: () => Effect.die("unused"),
  createFact: () => Effect.die("unused"),
  updateFact: () => Effect.die("unused"),
  deleteFact: () => Effect.die("unused"),
  createDependencyDefinition: () => Effect.die("unused"),
  updateDependencyDefinition: () => Effect.die("unused"),
  deleteDependencyDefinition: () => Effect.die("unused"),
  listWorkUnitWorkflows: () => Effect.die("unused"),
  createWorkUnitWorkflow: () => Effect.die("unused"),
  updateWorkUnitWorkflow: () => Effect.die("unused"),
  deleteWorkUnitWorkflow: () => Effect.die("unused"),
  replaceTransitionBindings: () => Effect.die("unused"),
  deleteWorkUnit: () => Effect.die("unused"),
  replaceWorkUnitFacts: () => Effect.die("unused"),
  upsertWorkUnitLifecycleState: () => Effect.die("unused"),
  deleteWorkUnitLifecycleState: () => Effect.die("unused"),
  upsertWorkUnitLifecycleTransition: () => Effect.die("unused"),
  saveWorkUnitLifecycleTransitionDialog: () => Effect.die("unused"),
  deleteWorkUnitLifecycleTransition: () => Effect.die("unused"),
  replaceWorkUnitTransitionConditionSets: () => Effect.die("unused"),
  updateVersionMetadata: () => Effect.die("unused"),
  createAgent: () => Effect.die("unused"),
  updateAgent: () => Effect.die("unused"),
  deleteAgent: () => Effect.die("unused"),
  createWorkUnitMetadata: () => Effect.die("unused"),
  updateWorkUnitMetadata: () => Effect.die("unused"),
  updateDraftLifecycle: () => Effect.die("unused"),
  getWorkUnitArtifactSlots: () => Effect.die("unused"),
  createWorkUnitArtifactSlot: () => Effect.die("unused"),
  updateWorkUnitArtifactSlot: () => Effect.die("unused"),
  deleteWorkUnitArtifactSlot: () => Effect.die("unused"),
  replaceWorkUnitArtifactSlots: () => Effect.die("unused"),
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
                gitCommitTitle: null,
                gitCommitBody: null,
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
                  gitCommitTitle: null,
                  gitCommitBody: null,
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
                  gitCommitTitle: null,
                  gitCommitBody: null,
                },
              ],
            },
            {
              snapshot: {
                id: "snapshot-0",
                projectWorkUnitId: "wu-1",
                slotDefinitionId,
                recordedByTransitionExecutionId: null,
                recordedByWorkflowExecutionId: null,
                recordedByUserId: "user-1",
                supersededByProjectArtifactSnapshotId: "snapshot-1",
                createdAt: new Date("2026-03-28T09:00:00.000Z"),
              },
              deltaMembers: [
                {
                  id: "file-0",
                  artifactSnapshotId: "snapshot-0",
                  filePath: "docs/old.md",
                  memberStatus: "present" as const,
                  gitCommitHash: "old",
                  gitBlobHash: "old",
                  gitCommitTitle: null,
                  gitCommitBody: null,
                },
              ],
              effectiveMembers: [
                {
                  id: "file-0",
                  artifactSnapshotId: "snapshot-0",
                  filePath: "docs/old.md",
                  memberStatus: "present" as const,
                  gitCommitHash: "old",
                  gitBlobHash: "old",
                  gitCommitTitle: null,
                  gitCommitBody: null,
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
  Layer.provideMerge(projectContextLayer),
  Layer.provideMerge(methodologyVersionLayer),
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
      const projectFactDetail = yield* factService.getProjectFactDetail({
        projectId: "project-1",
        factDefinitionId: "fact-status",
      });
      const workUnitPrimitiveFacts = yield* factService.getWorkUnitFacts({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        tab: "primitive",
      });
      const workUnitFacts = yield* factService.getWorkUnitFacts({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        tab: "work_units",
      });

      return { projectFacts, projectFactDetail, workUnitPrimitiveFacts, workUnitFacts };
    }).pipe(Effect.provide(factLayer));

    const result = await Effect.runPromise(program);
    expect(result.projectFacts.cards).toHaveLength(2);
    expect(result.projectFacts.cards[0]?.factDefinitionId).toBe("fact-priority");
    expect(result.projectFacts.cards[1]).toMatchObject({
      factDefinitionId: "fact-status",
      exists: false,
    });
    expect(result.projectFactDetail.factDefinition).toMatchObject({
      factDefinitionId: "fact-status",
      factKey: "status",
      factName: "Status",
      factType: "string",
    });
    expect(result.workUnitPrimitiveFacts.workUnit.workUnitTypeKey).toBe("TASK");
    expect(result.workUnitPrimitiveFacts.primitive?.cards[0]).toMatchObject({
      factDefinitionId: "wu-fact-title",
      exists: false,
    });
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

      const snapshot = yield* artifactService.getArtifactInstanceDialog({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
        artifactInstanceId: "snapshot-1",
      });

      const freshness = yield* artifactService.checkArtifactSlotCurrentState({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        slotDefinitionId: "slot-1",
      });

      return { detail, snapshot, freshness };
    }).pipe(Effect.provide(artifactServiceLayer));

    const result = await Effect.runPromise(program);
    expect(result.detail.currentArtifactInstance.exists).toBe(true);
    expect(result.detail.currentArtifactInstance.artifactInstanceId).toBe("snapshot-1");
    expect(result.snapshot.artifactInstance.artifactInstanceId).toBe("snapshot-1");
    expect(result.freshness.result).toBe("changed");
    expect(result.freshness.artifactInstanceId).toBe("snapshot-1");
  });
});
