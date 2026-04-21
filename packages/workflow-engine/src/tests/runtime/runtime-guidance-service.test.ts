import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

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
  getProjectWorkUnitById: (projectWorkUnitId) =>
    Effect.succeed(
      projectWorkUnitId === "wu-1" || projectWorkUnitId === "wu-2"
        ? {
            id: projectWorkUnitId,
            projectId: "project-1",
            workUnitTypeId: "wut-setup",
            currentStateId: "todo",
            activeTransitionExecutionId: projectWorkUnitId === "wu-1" ? "te-1" : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    ),
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

const projectContextLayer = Layer.succeed(ProjectContextRepository, {
  findProjectPin: (projectId) =>
    Effect.succeed(
      projectId === "project-empty" || projectId === "project-1"
        ? {
            projectId,
            methodologyVersionId: "version-1",
            methodologyId: "methodology-1",
            methodologyKey: "bmad",
            publishedVersion: "1.0.0",
            actorId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : null,
    ),
  hasExecutionHistoryForRepin: () => Effect.succeed(false),
  pinProjectMethodologyVersion: () => Effect.die("not implemented in test"),
  repinProjectMethodologyVersion: () => Effect.die("not implemented in test"),
  getProjectPinLineage: () => Effect.succeed([]),
  createProject: () => Effect.die("not implemented in test"),
  listProjects: () => Effect.succeed([]),
  getProjectById: () => Effect.succeed(null),
});

const lifecycleLayer = Layer.succeed(LifecycleRepository, {
  findWorkUnitTypes: () =>
    Effect.succeed([
      {
        id: "wut-setup",
        methodologyVersionId: "version-1",
        key: "setup",
        displayName: "Setup",
        descriptionJson: null,
        guidanceJson: null,
        cardinality: "one",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  findLifecycleStates: () =>
    Effect.succeed([
      {
        id: "state-ready",
        methodologyVersionId: "version-1",
        workUnitTypeId: "wut-setup",
        key: "ready",
        displayName: "Ready",
        descriptionJson: null,
        guidanceJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  findLifecycleTransitions: () =>
    Effect.succeed([
      {
        id: "tr-setup-start",
        methodologyVersionId: "version-1",
        workUnitTypeId: "wut-setup",
        fromStateId: null,
        toStateId: "state-ready",
        transitionKey: "start_setup",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  findFactSchemas: () => Effect.succeed([]),
  findTransitionConditionSets: () =>
    Effect.succeed([
      {
        id: "cs-setup-start",
        methodologyVersionId: "version-1",
        transitionId: "tr-setup-start",
        key: "start",
        phase: "start",
        mode: "all",
        groupsJson: [],
        guidanceJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  findAgentTypes: () => Effect.succeed([]),
  findTransitionWorkflowBindings: () =>
    Effect.succeed([
      {
        id: "twb-setup-project",
        methodologyVersionId: "version-1",
        transitionId: "tr-setup-start",
        transitionKey: "start_setup",
        workflowId: "wf-setup-project",
        workflowKey: "setup_project",
        workflowName: "Setup Project",
        workflowDescription: "Set up the project workspace and baseline runtime context.",
        workflowHumanGuidance: "Review the setup checklist before launching.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "twb-unresolved",
        methodologyVersionId: "version-1",
        transitionId: "tr-setup-start",
        transitionKey: "start_setup",
        workflowId: "wf-unresolved",
        workflowKey: null,
        workflowName: null,
        workflowDescription: null,
        workflowHumanGuidance: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]),
  saveLifecycleDefinition: () => Effect.die("not implemented in test"),
  recordLifecycleEvent: () => Effect.die("not implemented in test"),
});

const guidanceLayer = RuntimeGuidanceServiceLive.pipe(
  Layer.provideMerge(RuntimeGateServiceLive),
  Layer.provideMerge(projectWorkUnitLayer),
  Layer.provideMerge(executionReadLayer),
  Layer.provideMerge(projectFactLayer),
  Layer.provideMerge(workUnitFactLayer),
  Layer.provideMerge(artifactLayer),
  Layer.provideMerge(projectContextLayer),
  Layer.provideMerge(lifecycleLayer),
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

  it("includes future setup candidate from methodology when project has no work units", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGuidanceService;
      return yield* service.streamCandidates({ projectId: "project-empty" });
    }).pipe(Effect.provide(guidanceLayer));

    const stream = await Effect.runPromise(program);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    for await (const event of stream) {
      events.push(event as { type: string; [key: string]: unknown });
    }

    const bootstrap = events.find((event) => event.type === "bootstrap") as
      | { cards?: Array<{ source?: string; workUnitContext?: { workUnitTypeKey?: string } }> }
      | undefined;

    expect(bootstrap?.cards?.some((card) => card.source === "future")).toBe(true);
    expect(
      bootstrap?.cards?.some((card) => card.workUnitContext?.workUnitTypeKey === "setup"),
    ).toBe(true);
  });

  it("returns start gate detail for future transition candidates", async () => {
    const program = Effect.gen(function* () {
      const service = (yield* RuntimeGuidanceService) as RuntimeGuidanceService["Type"] & {
        readonly getRuntimeStartGateDetail: (input: {
          readonly projectId: string;
          readonly transitionId: string;
          readonly transitionKey?: string;
          readonly futureCandidate?: {
            readonly workUnitTypeId: string;
            readonly workUnitTypeKey?: string;
            readonly source: "future";
          };
        }) => Effect.Effect<unknown>;
      };

      return yield* service.getRuntimeStartGateDetail({
        projectId: "project-empty",
        transitionId: "tr-setup-start",
        transitionKey: "start_setup",
        futureCandidate: {
          workUnitTypeId: "wut-setup",
          workUnitTypeKey: "setup",
          source: "future",
        },
      });
    }).pipe(Effect.provide(guidanceLayer));

    const result = (await Effect.runPromise(program)) as {
      transition: { transitionId: string; toStateKey: string };
      workUnitContext: { source: string; workUnitTypeKey: string; currentStateLabel: string };
      gateSummary: { result: string };
      launchability: {
        canLaunch: boolean;
        availableWorkflows: Array<{
          workflowId: string;
          workflowKey: string;
          workflowName: string;
          workflowDescription?: string;
          workflowHumanGuidance?: string;
        }>;
      };
    };

    expect(result.transition.transitionId).toBe("tr-setup-start");
    expect(result.transition.toStateKey).toBe("ready");
    expect(result.workUnitContext.source).toBe("future");
    expect(result.workUnitContext.workUnitTypeKey).toBe("setup");
    expect(result.workUnitContext.currentStateLabel).toBe("Not started");
    expect(result.gateSummary.result).toBe("available");
    expect(result.launchability.canLaunch).toBe(true);
    expect(result.launchability.availableWorkflows).toEqual([
      {
        workflowId: "wf-setup-project",
        workflowKey: "setup_project",
        workflowName: "Setup Project",
        workflowDescription: "Set up the project workspace and baseline runtime context.",
        workflowHumanGuidance: "Review the setup checklist before launching.",
      },
    ]);
  });

  it("returns start gate detail for existing project work units", async () => {
    const program = Effect.gen(function* () {
      const service = (yield* RuntimeGuidanceService) as RuntimeGuidanceService["Type"] & {
        readonly getRuntimeStartGateDetail: (input: {
          readonly projectId: string;
          readonly transitionId: string;
          readonly projectWorkUnitId?: string;
        }) => Effect.Effect<unknown>;
      };

      return yield* service.getRuntimeStartGateDetail({
        projectId: "project-1",
        transitionId: "tr-setup-start",
        projectWorkUnitId: "wu-2",
      });
    }).pipe(Effect.provide(guidanceLayer));

    const result = (await Effect.runPromise(program)) as {
      transition: { transitionId: string; fromStateId?: string; fromStateKey?: string };
      workUnitContext: { source: string; projectWorkUnitId?: string };
      gateSummary: { result: string };
      launchability: {
        canLaunch: boolean;
        availableWorkflows: Array<{
          workflowId: string;
          workflowKey: string;
          workflowName: string;
          workflowDescription?: string;
          workflowHumanGuidance?: string;
        }>;
      };
    };

    expect(result.transition.transitionId).toBe("tr-setup-start");
    expect(result.transition.fromStateId).toBeUndefined();
    expect(result.transition.fromStateKey).toBeUndefined();
    expect(result.workUnitContext.source).toBe("open");
    expect(result.workUnitContext.projectWorkUnitId).toBe("wu-2");
    expect(result.gateSummary.result).toBe("available");
    expect(result.launchability.canLaunch).toBe(true);
    expect(result.launchability.availableWorkflows).toEqual([
      {
        workflowId: "wf-setup-project",
        workflowKey: "setup_project",
        workflowName: "Setup Project",
        workflowDescription: "Set up the project workspace and baseline runtime context.",
        workflowHumanGuidance: "Review the setup checklist before launching.",
      },
    ]);
  });
});
