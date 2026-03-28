import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ArtifactRepository,
  ProjectFactRepository,
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

const makeRuntimeGateLayer = (params: {
  readonly existingProjectFactDefinitionIds: readonly string[];
  readonly existingWorkUnitFactDefinitionIds: readonly string[];
  readonly artifactFreshnessBySlot?: ReadonlyMap<string, ArtifactFreshnessResult>;
  readonly onProjectFactRead?: (factDefinitionId: string) => void;
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
});
