import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ArtifactRepository,
  ExecutionReadRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeGateServiceLive,
  RuntimeGuidanceService,
  RuntimeGuidanceServiceLive,
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
        activeTransitionExecutionId: "te-1",
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
  getProjectWorkUnitById: () => Effect.succeed(null),
  updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
});

const executionReadLayer = Layer.succeed(ExecutionReadRepository, {
  getTransitionExecutionDetail: (transitionExecutionId) =>
    transitionExecutionId === "te-1"
      ? Effect.succeed({
          transitionExecution: {
            id: "te-1",
            projectWorkUnitId: "wu-1",
            transitionId: "tr-1",
            status: "active" as const,
            primaryWorkflowExecutionId: "we-1",
            supersededByTransitionExecutionId: null,
            startedAt: new Date(),
            completedAt: null,
            supersededAt: null,
          },
          projectId: "project-1",
          workUnitTypeId: "task",
          currentStateId: "doing",
          activeTransitionExecutionId: "te-1",
          primaryWorkflowExecution: {
            id: "we-1",
            transitionExecutionId: "te-1",
            workflowId: "wf-1",
            workflowRole: "primary" as const,
            status: "completed" as const,
            supersededByWorkflowExecutionId: null,
            startedAt: new Date(),
            completedAt: new Date(),
            supersededAt: null,
          },
        })
      : Effect.succeed(null),
  listTransitionExecutionsForWorkUnit: () => Effect.succeed([]),
  getWorkflowExecutionDetail: () => Effect.succeed(null),
  listWorkflowExecutionsForTransition: () => Effect.succeed([]),
  listActiveWorkflowExecutionsByProject: () => Effect.succeed([]),
});

const projectFactLayer = Layer.succeed(ProjectFactRepository, {
  createFactInstance: () => Effect.die("not implemented in test"),
  getCurrentValuesByDefinition: ({ factDefinitionId }) =>
    Effect.succeed(
      factDefinitionId === "ready"
        ? [
            {
              id: "pf-ready",
              projectId: "project-1",
              factDefinitionId,
              valueJson: true,
              status: "active" as const,
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date(),
            },
          ]
        : [],
    ),
  listFactsByProject: () => Effect.succeed([]),
  supersedeFactInstance: () => Effect.void,
});

const workUnitFactLayer = Layer.succeed(WorkUnitFactRepository, {
  createFactInstance: () => Effect.die("not implemented in test"),
  getCurrentValuesByDefinition: () => Effect.succeed([]),
  listFactsByWorkUnit: ({ projectWorkUnitId }) =>
    Effect.succeed(
      projectWorkUnitId === "wu-1"
        ? [
            {
              id: "wuf-1",
              projectWorkUnitId,
              factDefinitionId: "wu-fact-a",
              valueJson: "x",
              referencedProjectWorkUnitId: null,
              status: "active" as const,
              supersededByFactInstanceId: null,
              producedByTransitionExecutionId: null,
              producedByWorkflowExecutionId: null,
              authoredByUserId: null,
              createdAt: new Date(),
            },
          ]
        : [],
    ),
  supersedeFactInstance: () => Effect.void,
});

const artifactLayer = Layer.succeed(ArtifactRepository, {
  createSnapshot: () => Effect.die("not implemented in test"),
  addSnapshotFiles: () => Effect.die("not implemented in test"),
  getCurrentSnapshotBySlot: ({ projectWorkUnitId }) =>
    Effect.succeed({
      exists: projectWorkUnitId === "wu-1",
      snapshot: null,
      members: [],
    }),
  listLineageHistory: () => Effect.succeed([]),
  checkFreshness: ({ slotDefinitionId }) =>
    Effect.succeed(
      slotDefinitionId === "slot-1"
        ? { exists: true, freshness: "fresh" as const }
        : { exists: false, freshness: "unavailable" as const },
    ),
});

const guidanceLayer = RuntimeGuidanceServiceLive.pipe(
  Layer.provideMerge(RuntimeGateServiceLive),
  Layer.provideMerge(projectWorkUnitLayer),
  Layer.provideMerge(executionReadLayer),
  Layer.provideMerge(projectFactLayer),
  Layer.provideMerge(workUnitFactLayer),
  Layer.provideMerge(artifactLayer),
);

describe("RuntimeGuidanceService", () => {
  it("returns active cards from persisted runtime truth", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGuidanceService;
      return yield* service.getActive({ projectId: "project-1" });
    }).pipe(Effect.provide(guidanceLayer));

    const result = await Effect.runPromise(program);

    expect(result.activeWorkUnitCards).toHaveLength(1);
    expect(result.activeWorkUnitCards[0]?.projectWorkUnitId).toBe("wu-1");
    expect(result.activeWorkUnitCards[0]?.activeTransition.status).toBe("active");
    expect(result.activeWorkUnitCards[0]?.activePrimaryWorkflow.status).toBe("completed");
  });

  it("streams bootstrap, transitionResult, workUnitDone, and done in stable order", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGuidanceService;
      return yield* service.streamCandidates(
        { projectId: "project-1" },
        {
          maxWorkUnitConcurrency: 2,
          candidateSeeds: [
            {
              candidateCardId: "card-1",
              source: "open",
              workUnitContext: {
                projectWorkUnitId: "wu-1",
                workUnitTypeId: "task",
                workUnitTypeKey: "task",
                workUnitTypeName: "Task",
                currentStateKey: "todo",
                currentStateLabel: "Todo",
              },
              summaries: {
                facts: { currentCount: 1, totalCount: 1 },
                artifactSlots: { currentCount: 0, totalCount: 0 },
              },
              transitions: [
                {
                  candidateId: "candidate-available",
                  transitionId: "tr-available",
                  transitionKey: "tr-available",
                  transitionName: "Available",
                  toStateKey: "doing",
                  toStateLabel: "Doing",
                  source: "open",
                  startGate: {
                    mode: "all",
                    conditions: [{ kind: "fact", factKey: "ready", operator: "exists" }],
                    groups: [],
                  },
                },
                {
                  candidateId: "candidate-blocked",
                  transitionId: "tr-blocked",
                  transitionKey: "tr-blocked",
                  transitionName: "Blocked",
                  toStateKey: "doing",
                  toStateLabel: "Doing",
                  source: "open",
                  startGate: {
                    mode: "all",
                    conditions: [{ kind: "fact", factKey: "missing", operator: "exists" }],
                    groups: [],
                  },
                },
              ],
            },
          ],
        },
      );
    }).pipe(Effect.provide(guidanceLayer));

    const stream = await Effect.runPromise(program);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    for await (const event of stream) {
      events.push(event as { type: string; [key: string]: unknown });
    }

    expect(events.map((event) => event.type)).toEqual([
      "bootstrap",
      "transitionResult",
      "transitionResult",
      "workUnitDone",
      "done",
    ]);
    expect(events[1]?.result).toBe("available");
    expect(events[2]?.result).toBe("blocked");
  });
});
