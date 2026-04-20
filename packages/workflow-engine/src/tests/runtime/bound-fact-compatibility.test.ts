import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ArtifactRepository,
  evaluateRoutes,
  ProjectFactRepository,
  RuntimeGateService,
  RuntimeGateServiceLive,
  WorkUnitFactRepository,
} from "../../index";
import {
  normalizeRuntimeBoundFactFieldValue,
  readRuntimeBoundFactEnvelope,
  toCanonicalRuntimeBoundFactEnvelope,
  unwrapRuntimeBoundFactEnvelope,
} from "../../services/runtime-bound-fact-value";
import { toRuntimeConditionTree } from "../../services/transition-gate-conditions";

const makeProjectFactRepoLayer = (valuesByDefinitionId: ReadonlyMap<string, readonly unknown[]>) =>
  Layer.succeed(ProjectFactRepository, {
    createFactInstance: () => Effect.die("not implemented in test"),
    getCurrentValuesByDefinition: ({ factDefinitionId }) =>
      Effect.succeed(
        (valuesByDefinitionId.get(factDefinitionId) ?? []).map((valueJson, index) => ({
          id: `pf-${factDefinitionId}-${index}`,
          projectId: "project-1",
          factDefinitionId,
          valueJson,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
        })),
      ),
    listFactsByProject: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
  });

const makeWorkUnitFactRepoLayer = (valuesByDefinitionId: ReadonlyMap<string, readonly unknown[]>) =>
  Layer.succeed(WorkUnitFactRepository, {
    createFactInstance: () => Effect.die("not implemented in test"),
    getCurrentValuesByDefinition: ({ factDefinitionId }) =>
      Effect.succeed(
        (valuesByDefinitionId.get(factDefinitionId) ?? []).map((valueJson, index) => ({
          id: `wf-${factDefinitionId}-${index}`,
          projectWorkUnitId: "wu-1",
          factDefinitionId,
          valueJson,
          referencedProjectWorkUnitId: null,
          status: "active" as const,
          supersededByFactInstanceId: null,
          producedByTransitionExecutionId: null,
          producedByWorkflowExecutionId: null,
          authoredByUserId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
        })),
      ),
    listFactsByWorkUnit: () => Effect.succeed([]),
    supersedeFactInstance: () => Effect.void,
  });

const makeArtifactRepoLayer = () =>
  Layer.succeed(ArtifactRepository, {
    createSnapshot: () => Effect.die("not implemented in test"),
    addSnapshotFiles: () => Effect.die("not implemented in test"),
    getCurrentSnapshotBySlot: () => Effect.succeed({ exists: false, snapshot: null, members: [] }),
    listLineageHistory: () => Effect.succeed([]),
    checkFreshness: () =>
      Effect.succeed({
        exists: false,
        freshness: "unavailable" as const,
      }),
  });

const makeRuntimeGateLayer = (params?: {
  readonly projectFacts?: ReadonlyMap<string, readonly unknown[]>;
  readonly workUnitFacts?: ReadonlyMap<string, readonly unknown[]>;
}) =>
  RuntimeGateServiceLive.pipe(
    Layer.provideMerge(makeProjectFactRepoLayer(params?.projectFacts ?? new Map())),
    Layer.provideMerge(makeWorkUnitFactRepoLayer(params?.workUnitFacts ?? new Map())),
    Layer.provideMerge(makeArtifactRepoLayer()),
  );

describe("bound fact compatibility", () => {
  it("normalizes legacy envelopes for reference and primitive form/detail consumers", () => {
    const legacy = { factInstanceId: "fact-1", value: "monorepo" };
    const canonical = { instanceId: "fact-2", value: "polyrepo" };

    const referenceField = {
      contextFactKind: "bound_fact" as const,
      widget: { control: "reference" as const },
    };
    const primitiveField = {
      contextFactKind: "bound_fact" as const,
      widget: { control: "text" as const },
    };

    expect(readRuntimeBoundFactEnvelope(legacy)).toEqual({
      instanceId: "fact-1",
      value: "monorepo",
    });
    expect(readRuntimeBoundFactEnvelope(canonical)).toEqual({
      instanceId: "fact-2",
      value: "polyrepo",
    });
    expect(normalizeRuntimeBoundFactFieldValue(referenceField, legacy)).toEqual(
      toCanonicalRuntimeBoundFactEnvelope({ instanceId: "fact-1", value: "monorepo" }),
    );
    expect(normalizeRuntimeBoundFactFieldValue(primitiveField, legacy)).toBe("monorepo");
    expect(unwrapRuntimeBoundFactEnvelope(canonical)).toBe("polyrepo");
  });

  it("keeps branch and gate evaluation compatible with legacy and canonical bound envelopes", async () => {
    const contextFactDefinitions: readonly WorkflowContextFactDto[] = [
      {
        contextFactDefinitionId: "requires-brainstorming-fact-id",
        kind: "bound_fact",
        key: "requires_brainstorming",
        cardinality: "one",
        factDefinitionId: "requires-brainstorming-fact-id",
        valueType: "boolean",
      },
    ];

    const route = {
      routeId: "route-1",
      targetStepId: "step-brainstorm",
      sortOrder: 0,
      conditionMode: "all" as const,
      groups: [
        {
          groupId: "group-1",
          mode: "all" as const,
          conditions: [
            {
              conditionId: "cond-1",
              contextFactDefinitionId: "requires-brainstorming-fact-id",
              subFieldKey: null,
              operator: "equals" as const,
              isNegated: false,
              comparisonJson: { value: true },
            },
          ],
        },
      ],
    };

    const runGate = (valueJson: unknown) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const service = yield* RuntimeGateService;
          return yield* service.evaluateCompletionGateExhaustive({
            projectId: "project-1",
            projectWorkUnitId: "wu-1",
            conditionTree: toRuntimeConditionTree([
              {
                mode: "all",
                groupsJson: [
                  {
                    mode: "all",
                    conditions: [
                      {
                        kind: "work_unit_fact",
                        required: true,
                        config: {
                          factKey: "requires_brainstorming",
                          factDefinitionId: "requires-brainstorming-fact-id",
                          operator: "equals",
                          comparisonJson: { value: true },
                        },
                      },
                    ],
                  },
                ],
              },
            ]),
          });
        }).pipe(
          Effect.provide(
            makeRuntimeGateLayer({
              workUnitFacts: new Map([["requires-brainstorming-fact-id", [valueJson]]]),
            }),
          ),
        ),
      );

    for (const valueJson of [
      { factInstanceId: "wu-fact-1", value: true },
      { instanceId: "wu-fact-1", value: true },
    ]) {
      const branchEvaluations = evaluateRoutes({
        routes: [route],
        contextFacts: [
          {
            id: `ctx-${JSON.stringify(valueJson)}`,
            workflowExecutionId: "workflow-1",
            contextFactDefinitionId: "requires-brainstorming-fact-id",
            instanceOrder: 0,
            valueJson,
            sourceStepExecutionId: null,
            createdAt: new Date("2026-04-17T00:00:00.000Z"),
            updatedAt: new Date("2026-04-17T00:00:00.000Z"),
          },
        ],
        contextFactDefinitions,
      });

      const gateResult = await runGate(valueJson);

      expect(branchEvaluations[0]?.isValid).toBe(true);
      expect(gateResult.result).toBe("available");
      expect(gateResult.evaluationTree.met).toBe(true);
    }
  });

  it("keeps draft spec consumer checks compatible with grouped and minimal invoke payloads", async () => {
    const contextFactDefinitions: readonly WorkflowContextFactDto[] = [
      {
        contextFactDefinitionId: "draft-spec-fact-id",
        kind: "work_unit_draft_spec_fact",
        key: "draft_spec",
        cardinality: "one",
        workUnitDefinitionId: "wu-type-1",
        selectedWorkUnitFactDefinitionIds: ["status-id"],
        selectedArtifactSlotDefinitionIds: ["slot-brief"],
      },
    ];

    const route = {
      routeId: "route-draft-spec",
      targetStepId: "step-next",
      sortOrder: 0,
      conditionMode: "all" as const,
      groups: [
        {
          groupId: "group-draft-spec",
          mode: "all" as const,
          conditions: [
            {
              conditionId: "cond-status",
              contextFactDefinitionId: "draft-spec-fact-id",
              subFieldKey: "fact:status-id",
              operator: "equals" as const,
              isNegated: false,
              comparisonJson: { value: "ready" },
            },
          ],
        },
      ],
    };

    const groupedValue = {
      facts: [{ factDefinitionId: "status-id", value: "ready" }],
      artifacts: [{ artifactSlotDefinitionId: "slot-brief", relativePath: "stories/brief.md" }],
      instance: {},
    };
    const minimalValue = {
      projectWorkUnitId: "project-work-unit-1",
      workUnitFactInstanceIds: ["fact-instance-1-title"],
      artifactSnapshotIds: ["artifact-snapshot-1-brief"],
    };

    const groupedBranch = evaluateRoutes({
      routes: [route],
      contextFacts: [
        {
          id: "ctx-grouped",
          workflowExecutionId: "workflow-1",
          contextFactDefinitionId: "draft-spec-fact-id",
          instanceOrder: 0,
          valueJson: groupedValue,
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
        },
      ],
      contextFactDefinitions,
    });

    const minimalGate = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeGateService;
        return yield* service.evaluateCompletionGateExhaustive({
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          conditionTree: toRuntimeConditionTree([
            {
              mode: "all",
              groupsJson: [
                {
                  mode: "all",
                  conditions: [
                    {
                      kind: "work_unit_fact",
                      required: true,
                      config: {
                        factKey: "draft_spec",
                        factDefinitionId: "draft-spec-fact-id",
                      },
                    },
                  ],
                },
              ],
            },
          ]),
        });
      }).pipe(
        Effect.provide(
          makeRuntimeGateLayer({
            workUnitFacts: new Map([["draft-spec-fact-id", [minimalValue]]]),
          }),
        ),
      ),
    );

    expect(groupedBranch[0]?.isValid).toBe(true);
    expect(minimalGate.result).toBe("available");
  });
});
