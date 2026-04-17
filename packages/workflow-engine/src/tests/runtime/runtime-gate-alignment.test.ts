import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  ArtifactRepository,
  type ArtifactFreshnessResult,
  evaluateRoutes,
  ProjectFactRepository,
  RuntimeGateService,
  RuntimeGateServiceLive,
  WorkUnitFactRepository,
} from "../../index";
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

const makeArtifactRepoLayer = (
  freshnessBySlot: ReadonlyMap<string, ArtifactFreshnessResult> = new Map(),
) =>
  Layer.succeed(ArtifactRepository, {
    createSnapshot: () => Effect.die("not implemented in test"),
    addSnapshotFiles: () => Effect.die("not implemented in test"),
    getCurrentSnapshotBySlot: () => Effect.succeed({ exists: false, snapshot: null, members: [] }),
    listLineageHistory: () => Effect.succeed([]),
    checkFreshness: ({ slotDefinitionId }) =>
      Effect.succeed(
        freshnessBySlot.get(slotDefinitionId) ?? {
          exists: false,
          freshness: "unavailable",
        },
      ),
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

describe("runtime gate / branch overlap alignment", () => {
  it("maps transition condition trees with equals metadata and set/group modes intact", () => {
    const tree = toRuntimeConditionTree([
      {
        mode: "any",
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
                  subFieldKey: "fact:status-id",
                  operator: "equals",
                  isNegated: true,
                  comparisonJson: { value: "ready" },
                },
              },
            ],
          },
          {
            mode: "any",
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
    ]);

    expect(tree).toEqual({
      mode: "all",
      conditions: [],
      groups: [
        {
          mode: "any",
          conditions: [],
          groups: [
            {
              mode: "all",
              conditions: [
                {
                  kind: "work_unit_fact",
                  factKey: "draft_spec",
                  factDefinitionId: "draft-spec-fact-id",
                  subFieldKey: "fact:status-id",
                  operator: "equals",
                  isNegated: true,
                  comparisonJson: { value: "ready" },
                },
              ],
              groups: [],
            },
            {
              mode: "any",
              conditions: [
                {
                  kind: "work_unit_fact",
                  factKey: "draft_spec",
                  factDefinitionId: "draft-spec-fact-id",
                  operator: "exists",
                },
              ],
              groups: [],
            },
          ],
        },
      ],
    });
  });

  it("evaluates draft-spec equals with the same ANY semantics as branch routing", async () => {
    const draftSpecValue = {
      facts: [{ factDefinitionId: "status-id", value: "ready" }],
      artifacts: [],
      instance: {},
    };

    const contextFactDefinitions: readonly WorkflowContextFactDto[] = [
      {
        contextFactDefinitionId: "draft-spec-fact-id",
        kind: "work_unit_draft_spec_fact",
        key: "draft_spec",
        cardinality: "one",
        workUnitDefinitionId: "wu-type-1",
        selectedWorkUnitFactDefinitionIds: ["status-id"],
        selectedArtifactSlotDefinitionIds: [],
      },
    ];

    const branchEvaluations = evaluateRoutes({
      routes: [
        {
          routeId: "route-1",
          targetStepId: "step-ready",
          sortOrder: 0,
          conditionMode: "any",
          groups: [
            {
              groupId: "group-ready",
              mode: "all",
              conditions: [
                {
                  conditionId: "cond-ready",
                  contextFactDefinitionId: "draft-spec-fact-id",
                  subFieldKey: "fact:status-id",
                  operator: "equals",
                  isNegated: false,
                  comparisonJson: { value: "ready" },
                },
              ],
            },
            {
              groupId: "group-artifact",
              mode: "all",
              conditions: [
                {
                  conditionId: "cond-artifact",
                  contextFactDefinitionId: "draft-spec-fact-id",
                  subFieldKey: "artifact:slot-1",
                  operator: "exists",
                  isNegated: false,
                  comparisonJson: null,
                },
              ],
            },
          ],
        },
      ],
      contextFacts: [
        {
          id: "ctx-1",
          workflowExecutionId: "workflow-1",
          contextFactDefinitionId: "draft-spec-fact-id",
          instanceOrder: 0,
          valueJson: draftSpecValue,
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
        },
      ],
      contextFactDefinitions,
    });

    const conditionTree = toRuntimeConditionTree([
      {
        mode: "any",
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
                  subFieldKey: "fact:status-id",
                  operator: "equals",
                  comparisonJson: { value: "ready" },
                },
              },
            ],
          },
          {
            mode: "all",
            conditions: [
              {
                kind: "work_unit_fact",
                required: true,
                config: {
                  factKey: "draft_spec",
                  factDefinitionId: "draft-spec-fact-id",
                  subFieldKey: "artifact:slot-1",
                  operator: "exists",
                },
              },
            ],
          },
        ],
      },
    ]);

    const gateResult = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* RuntimeGateService;
        return yield* service.evaluateCompletionGateExhaustive({
          projectId: "project-1",
          projectWorkUnitId: "wu-1",
          conditionTree,
        });
      }).pipe(
        Effect.provide(
          makeRuntimeGateLayer({
            workUnitFacts: new Map([["draft-spec-fact-id", [draftSpecValue]]]),
          }),
        ),
      ),
    );

    expect(branchEvaluations[0]?.isValid).toBe(true);
    expect(branchEvaluations[0]?.evaluationTree.met).toBe(true);
    expect(
      branchEvaluations[0]?.evaluationTree.groups.map(
        (group: { readonly met: boolean }) => group.met,
      ),
    ).toEqual([true, false]);
    expect(gateResult.result).toBe("available");
    expect(gateResult.evaluationTree.met).toBe(branchEvaluations[0]?.evaluationTree.met);
    expect(
      gateResult.evaluationTree.groups[0]?.groups.map(
        (group: { readonly met: boolean }) => group.met,
      ),
    ).toEqual([true, false]);
  });

  it("treats minimal invoke draft-spec reference payloads as existing without richer nested payload assumptions", async () => {
    const draftSpecReferenceValue = {
      projectWorkUnitId: "project-work-unit-1",
      workUnitFactInstanceIds: ["fact-instance-1-title"],
      artifactSnapshotIds: ["artifact-snapshot-1-brief"],
    };

    const contextFactDefinitions: readonly WorkflowContextFactDto[] = [
      {
        contextFactDefinitionId: "draft-spec-fact-id",
        kind: "work_unit_draft_spec_fact",
        key: "draft_spec",
        cardinality: "many",
        workUnitDefinitionId: "wu-type-1",
        selectedWorkUnitFactDefinitionIds: ["status-id"],
        selectedArtifactSlotDefinitionIds: ["slot-1"],
      },
    ];

    const branchEvaluations = evaluateRoutes({
      routes: [
        {
          routeId: "route-1",
          targetStepId: "step-next",
          sortOrder: 0,
          conditionMode: "all",
          groups: [
            {
              groupId: "group-reference-exists",
              mode: "all",
              conditions: [
                {
                  conditionId: "cond-reference-exists",
                  contextFactDefinitionId: "draft-spec-fact-id",
                  subFieldKey: null,
                  operator: "exists",
                  isNegated: false,
                  comparisonJson: null,
                },
              ],
            },
          ],
        },
      ],
      contextFacts: [
        {
          id: "ctx-1",
          workflowExecutionId: "workflow-1",
          contextFactDefinitionId: "draft-spec-fact-id",
          instanceOrder: 0,
          valueJson: draftSpecReferenceValue,
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
        },
      ],
      contextFactDefinitions,
    });

    const gateResult = await Effect.runPromise(
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
                        operator: "exists",
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
            workUnitFacts: new Map([["draft-spec-fact-id", [draftSpecReferenceValue]]]),
          }),
        ),
      ),
    );

    expect(branchEvaluations[0]?.isValid).toBe(true);
    expect(branchEvaluations[0]?.evaluationTree.met).toBe(true);
    expect(gateResult.result).toBe("available");
    expect(gateResult.evaluationTree.met).toBe(true);
  });

  it("coerces unsupported transition-gate operators back to the narrow exists/equals Plan A set", () => {
    const tree = toRuntimeConditionTree([
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
                  operator: "contains",
                  comparisonJson: { value: "ready" },
                },
              },
            ],
          },
        ],
      },
    ]);

    expect(tree).toEqual({
      mode: "all",
      conditions: [],
      groups: [
        {
          mode: "all",
          conditions: [],
          groups: [
            {
              mode: "all",
              conditions: [
                {
                  kind: "work_unit_fact",
                  factKey: "draft_spec",
                  factDefinitionId: "draft-spec-fact-id",
                  operator: "exists",
                  comparisonJson: { value: "ready" },
                },
              ],
              groups: [],
            },
          ],
        },
      ],
    });
  });

  it("treats empty-array exists checks as blocked like branch evaluation", async () => {
    const factValue = { selectedRouteIds: [] };

    const branchEvaluations = evaluateRoutes({
      routes: [
        {
          routeId: "route-1",
          targetStepId: "step-next",
          sortOrder: 0,
          conditionMode: "all",
          groups: [
            {
              groupId: "group-1",
              mode: "all",
              conditions: [
                {
                  conditionId: "cond-1",
                  contextFactDefinitionId: "status-fact-id",
                  subFieldKey: "selectedRouteIds",
                  operator: "exists",
                  isNegated: false,
                  comparisonJson: null,
                },
              ],
            },
          ],
        },
      ],
      contextFacts: [
        {
          id: "ctx-1",
          workflowExecutionId: "workflow-1",
          contextFactDefinitionId: "status-fact-id",
          instanceOrder: 0,
          valueJson: factValue,
          sourceStepExecutionId: null,
          createdAt: new Date("2026-04-17T00:00:00.000Z"),
          updatedAt: new Date("2026-04-17T00:00:00.000Z"),
        },
      ],
      contextFactDefinitions: [
        {
          contextFactDefinitionId: "status-fact-id",
          kind: "plain_value_fact",
          key: "status",
          cardinality: "one",
          valueType: "json",
        },
      ],
    });

    const gateResult = await Effect.runPromise(
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
                        factKey: "status",
                        factDefinitionId: "status-fact-id",
                        subFieldKey: "selectedRouteIds",
                        operator: "exists",
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
            workUnitFacts: new Map([["status-fact-id", [factValue]]]),
          }),
        ),
      ),
    );

    expect(branchEvaluations[0]?.isValid).toBe(false);
    expect(gateResult.result).toBe("blocked");
    expect(gateResult.firstReason).toBe("Work-unit fact 'status' did not satisfy exists");
  });
});
