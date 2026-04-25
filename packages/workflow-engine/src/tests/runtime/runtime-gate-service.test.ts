import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import {
  ArtifactRepository,
  ProjectFactRepository,
  ProjectWorkUnitRepository,
  RuntimeGateService,
  RuntimeGateServiceLive,
  WorkUnitFactRepository,
  type ArtifactFreshnessResult,
} from "../../index";

const makeProjectFactRepoLayer = (params: {
  readonly existingFactDefinitionIds: readonly string[];
  readonly onRead?: (factDefinitionId: string) => void;
}) =>
  Layer.succeed(ProjectFactRepository, {
    createFactInstance: () => Effect.die("not implemented in test"),
    getCurrentValuesByDefinition: ({ factDefinitionId }) =>
      Effect.sync(() => {
        params.onRead?.(factDefinitionId);
        return params.existingFactDefinitionIds.includes(factDefinitionId)
          ? [
              {
                id: `pf-${factDefinitionId}`,
                projectId: "project-1",
                factDefinitionId,
                valueJson: "value",
                status: "active" as const,
                supersededByFactInstanceId: null,
                producedByTransitionExecutionId: null,
                producedByWorkflowExecutionId: null,
                authoredByUserId: null,
                createdAt: new Date(),
              },
            ]
          : [];
      }),
    listFactsByProject: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
  });

const makeWorkUnitFactRepoLayer = (existingFactDefinitionIds: readonly string[]) =>
  Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("not implemented in test"),
    getCurrentValuesByDefinition: ({ factDefinitionId }) =>
      Effect.succeed(
        existingFactDefinitionIds.includes(factDefinitionId)
          ? [
              {
                id: `wf-${factDefinitionId}`,
                projectWorkUnitId: "wu-1",
                factDefinitionId,
                valueJson: "value",
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
    listFactsByWorkUnit: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
  });

const makeArtifactRepoLayer = (freshnessBySlot: ReadonlyMap<string, ArtifactFreshnessResult>) =>
  Layer.succeed(ArtifactRepository, {
    createSnapshot: () => Effect.die("not implemented in test"),
    addSnapshotFiles: () => Effect.die("not implemented in test"),
    getCurrentSnapshotBySlot: () =>
      Effect.succeed({
        exists: false,
        snapshot: null,
        members: [],
      }),
    listLineageHistory: () => Effect.succeed([]),
    checkFreshness: ({ slotDefinitionId }) =>
      Effect.succeed(
        freshnessBySlot.get(slotDefinitionId) ?? {
          exists: false,
          freshness: "unavailable",
        },
      ),
  });

const makeProjectContextLayer = () =>
  Layer.succeed(ProjectContextRepository, {
    findProjectPin: () =>
      Effect.succeed({
        projectId: "project-1",
        methodologyVersionId: "version-1",
        methodologyId: "methodology-1",
        methodologyKey: "core",
        publishedVersion: "1.0.0",
        actorId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
  } as unknown as ProjectContextRepository["Type"]);

const makeLifecycleLayer = () =>
  Layer.succeed(LifecycleRepository, {
    findWorkUnitTypes: () =>
      Effect.succeed([
        {
          id: "wut-story",
          methodologyVersionId: "version-1",
          key: "WU.STORY",
          displayName: "Story",
          descriptionJson: null,
          guidanceJson: null,
          cardinality: "many" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
    findLifecycleStates: () =>
      Effect.succeed([
        {
          id: "state-ready",
          methodologyVersionId: "version-1",
          workUnitTypeId: "wut-story",
          key: "ready",
          displayName: "Ready",
          descriptionJson: null,
          guidanceJson: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
  } as unknown as LifecycleRepository["Type"]);

const makeProjectWorkUnitLayer = (
  workUnits?:
    | readonly {
        id: string;
        workUnitTypeId: string;
        currentStateId: string | null;
      }[]
    | undefined,
) =>
  Layer.succeed(ProjectWorkUnitRepository, {
    createProjectWorkUnit: () => Effect.die("not implemented in test"),
    listProjectWorkUnitsByProject: () =>
      Effect.succeed(
        (workUnits ?? []).map((workUnit) => ({
          ...workUnit,
          projectId: "project-1",
          activeTransitionExecutionId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      ),
    getProjectWorkUnitById: () => Effect.succeed(null),
    updateActiveTransitionExecutionPointer: () => Effect.succeed(null),
  });

const makeRuntimeGateLayer = (params: {
  readonly existingProjectFactDefinitionIds: readonly string[];
  readonly existingWorkUnitFactDefinitionIds: readonly string[];
  readonly artifactFreshnessBySlot?: ReadonlyMap<string, ArtifactFreshnessResult>;
  readonly onProjectFactRead?: (factDefinitionId: string) => void;
  readonly projectWorkUnits?: readonly {
    id: string;
    workUnitTypeId: string;
    currentStateId: string | null;
  }[];
}) =>
  RuntimeGateServiceLive.pipe(
    Layer.provideMerge(
      makeProjectFactRepoLayer({
        existingFactDefinitionIds: params.existingProjectFactDefinitionIds,
        ...(params.onProjectFactRead ? { onRead: params.onProjectFactRead } : {}),
      }),
    ),
    Layer.provideMerge(makeWorkUnitFactRepoLayer(params.existingWorkUnitFactDefinitionIds)),
    Layer.provideMerge(makeArtifactRepoLayer(params.artifactFreshnessBySlot ?? new Map())),
    Layer.provideMerge(makeProjectContextLayer()),
    Layer.provideMerge(makeLifecycleLayer()),
    Layer.provideMerge(makeProjectWorkUnitLayer(params.projectWorkUnits)),
  );

describe("RuntimeGateService", () => {
  it("short-circuits ALL on first unmet condition", async () => {
    const reads: string[] = [];

    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateStartGate({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "all",
          conditions: [
            { kind: "fact", factKey: "missing", operator: "exists" },
            { kind: "fact", factKey: "present", operator: "exists" },
          ],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: ["present"],
          existingWorkUnitFactDefinitionIds: [],
          onProjectFactRead: (factDefinitionId) => reads.push(factDefinitionId),
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("blocked");
    expect(result.firstReason).toContain("missing");
    expect(reads).toEqual(["missing"]);
  });

  it("short-circuits ANY on first met condition", async () => {
    const reads: string[] = [];

    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateCompletionGate({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "any",
          conditions: [
            { kind: "fact", factKey: "present", operator: "exists" },
            { kind: "fact", factKey: "missing", operator: "exists" },
          ],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: ["present"],
          existingWorkUnitFactDefinitionIds: [],
          onProjectFactRead: (factDefinitionId) => reads.push(factDefinitionId),
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("available");
    expect(reads).toEqual(["present"]);
  });

  it("evaluates every ALL completion condition exhaustively", async () => {
    const reads: string[] = [];

    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateCompletionGateExhaustive({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "all",
          conditions: [
            { kind: "fact", factKey: "missing", operator: "exists" },
            { kind: "fact", factKey: "present", operator: "exists" },
          ],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: ["present"],
          existingWorkUnitFactDefinitionIds: [],
          onProjectFactRead: (factDefinitionId) => reads.push(factDefinitionId),
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("blocked");
    expect(result.firstReason).toContain("missing");
    expect(reads).toEqual(["missing", "present"]);
    expect(result.evaluationTree.conditions).toEqual([
      {
        condition: { kind: "fact", factKey: "missing", operator: "exists" },
        met: false,
        reason: "Project fact 'missing' is missing",
      },
      {
        condition: { kind: "fact", factKey: "present", operator: "exists" },
        met: true,
      },
    ]);
  });

  it("evaluates every ANY completion branch exhaustively", async () => {
    const reads: string[] = [];

    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateCompletionGateExhaustive({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "any",
          conditions: [
            { kind: "fact", factKey: "present", operator: "exists" },
            { kind: "fact", factKey: "missing", operator: "exists" },
          ],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: ["present"],
          existingWorkUnitFactDefinitionIds: [],
          onProjectFactRead: (factDefinitionId) => reads.push(factDefinitionId),
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("available");
    expect(reads).toEqual(["present", "missing"]);
    expect(result.evaluationTree.met).toBe(true);
    expect(result.evaluationTree.conditions).toEqual([
      {
        condition: { kind: "fact", factKey: "present", operator: "exists" },
        met: true,
      },
      {
        condition: { kind: "fact", factKey: "missing", operator: "exists" },
        met: false,
        reason: "Project fact 'missing' is missing",
      },
    ]);
  });

  it("rejects unsupported condition kinds", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateStartGate({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "all",
          conditions: [{ kind: "step", stepKey: "l3" } as never],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: [],
          existingWorkUnitFactDefinitionIds: [],
        }),
      ),
    );

    const exit = await Effect.runPromiseExit(program);
    expect(exit._tag).toBe("Failure");
    if (exit._tag === "Failure") {
      expect(String(exit.cause)).toContain("UnsupportedConditionKindError");
    }
  });

  it("evaluates projected work-unit facts before a target work unit exists", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateStartGate({
        projectId: "project-1",
        conditionTree: {
          mode: "all",
          conditions: [
            {
              kind: "work_unit_fact",
              factKey: "title",
              factDefinitionId: "fact-title",
              operator: "equals",
              comparisonJson: { value: "Gate ready" },
            },
          ],
          groups: [],
        },
        projectedWorkUnitFactsByDefinitionId: new Map([
          [
            "fact-title",
            [
              {
                valueJson: "Gate ready",
              },
            ],
          ],
        ]),
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: [],
          existingWorkUnitFactDefinitionIds: [],
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("available");
  });

  it("evaluates projected artifact slots before a target work unit exists", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateStartGate({
        projectId: "project-1",
        conditionTree: {
          mode: "all",
          conditions: [
            {
              kind: "artifact",
              slotKey: "brief",
              slotDefinitionId: "slot-brief",
              operator: "exists",
            },
          ],
          groups: [],
        },
        projectedArtifactSlotsByDefinitionId: new Map([
          [
            "slot-brief",
            {
              exists: true,
              freshness: "fresh",
            },
          ],
        ]),
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: [],
          existingWorkUnitFactDefinitionIds: [],
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("available");
  });

  it("evaluates project work-unit instance conditions using current state only", async () => {
    const program = Effect.gen(function* () {
      const service = yield* RuntimeGateService;
      return yield* service.evaluateCompletionGateExhaustive({
        projectId: "project-1",
        projectWorkUnitId: "wu-1",
        conditionTree: {
          mode: "all",
          conditions: [
            {
              kind: "work_unit",
              workUnitTypeKey: "WU.STORY",
              operator: "work_unit_instance_exists_in_state",
              stateKeys: ["ready"],
              minCount: 2,
            },
          ],
          groups: [],
        },
      });
    }).pipe(
      Effect.provide(
        makeRuntimeGateLayer({
          existingProjectFactDefinitionIds: [],
          existingWorkUnitFactDefinitionIds: [],
          projectWorkUnits: [
            { id: "wu-story-1", workUnitTypeId: "wut-story", currentStateId: "state-ready" },
            { id: "wu-story-2", workUnitTypeId: "wut-story", currentStateId: "state-ready" },
            { id: "wu-story-3", workUnitTypeId: "wut-story", currentStateId: null },
          ],
        }),
      ),
    );

    const result = await Effect.runPromise(program);
    expect(result.result).toBe("available");
    expect(result.evaluationTree.conditions[0]).toEqual({
      condition: {
        kind: "work_unit",
        workUnitTypeKey: "WU.STORY",
        operator: "work_unit_instance_exists_in_state",
        stateKeys: ["ready"],
        minCount: 2,
      },
      met: true,
    });
  });
});
