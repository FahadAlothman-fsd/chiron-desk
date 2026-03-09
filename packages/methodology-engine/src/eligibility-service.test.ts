import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";
import {
  EligibilityService,
  EligibilityServiceLive,
  LifecycleRepository,
  MethodologyRepository,
  type MethodologyDefinitionRow,
  type CreateDraftParams,
  type GetVersionEventsParams,
  type MethodologyVersionEventRow,
  type MethodologyVersionRow,
  type UpdateDraftParams,
} from "./index";

const VERSION_ID = "version-1";
const METHODOLOGY_ID = "methodology-1";

function makeMethodologyRepo(definitionExtensions: unknown): MethodologyRepository["Type"] {
  const definition: MethodologyDefinitionRow = {
    id: METHODOLOGY_ID,
    key: "methodology-key",
    name: "Test",
    descriptionJson: {},
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const row: MethodologyVersionRow = {
    id: VERSION_ID,
    methodologyId: METHODOLOGY_ID,
    version: "1.0.0",
    status: "draft",
    displayName: "Test",
    definitionExtensions,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    retiredAt: null,
  };

  return {
    listDefinitions: () => Effect.succeed([definition]),
    createDefinition: () => Effect.succeed(definition),
    findDefinitionByKey: () => Effect.succeed(null),
    listVersionsByMethodologyId: (methodologyId: string) =>
      Effect.succeed(methodologyId === METHODOLOGY_ID ? [row] : []),
    findVersionById: (id: string) => Effect.succeed(id === VERSION_ID ? row : null),
    findVersionByMethodologyAndVersion: () => Effect.succeed(null),
    createDraft: (_params: CreateDraftParams) => Effect.die("not used in test"),
    updateDraft: (_params: UpdateDraftParams) => Effect.die("not used in test"),
    getVersionEvents: (_params: GetVersionEventsParams) => Effect.succeed([]),
    recordEvent: (_event: Omit<MethodologyVersionEventRow, "id" | "createdAt">) =>
      Effect.die("not used in test"),
    findLinkTypeKeys: (_versionId: string) => Effect.succeed([]),
    findWorkflowSnapshot: (_versionId: string) =>
      Effect.succeed({ workflows: [], transitionWorkflowBindings: {}, guidance: undefined }),
    findFactSchemasByVersionId: (_versionId: string) => Effect.succeed([]),
    publishDraftVersion: () => Effect.die("not used in test"),
    hasPersistedExecutions: () => Effect.succeed(false),
    pinProjectMethodologyVersion: () => Effect.die("not used in test"),
    repinProjectMethodologyVersion: () => Effect.die("not used in test"),
    getProjectPinLineage: () => Effect.succeed([]),
    getPublicationEvidence: () => Effect.succeed([]),
  };
}

function makeLifecycleRepo(
  transitionWorkflowBindings: readonly {
    id: string;
    methodologyVersionId: string;
    transitionId: string;
    transitionKey: string;
    workflowId: string;
    workflowKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[],
): LifecycleRepository["Type"] {
  return {
    findWorkUnitTypes: (_versionId: string) =>
      Effect.succeed([
        {
          id: "wu-1",
          methodologyVersionId: VERSION_ID,
          key: "task",
          displayName: null,
          descriptionJson: null,
          cardinality: "many",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    findLifecycleStates: (_versionId: string, _workUnitTypeId?: string) =>
      Effect.succeed([
        {
          id: "state-new",
          methodologyVersionId: VERSION_ID,
          workUnitTypeId: "wu-1",
          key: "new",
          displayName: "New",
          descriptionJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    findLifecycleTransitions: (
      _versionId: string,
      _options?: { workUnitTypeId?: string; fromStateId?: string | null; toStateId?: string },
    ) =>
      Effect.succeed([
        {
          id: "tr-1",
          methodologyVersionId: VERSION_ID,
          workUnitTypeId: "wu-1",
          transitionKey: "start",
          fromStateId: null,
          toStateId: "state-new",
          gateClass: "start_gate",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    findFactSchemas: (_versionId: string, _workUnitTypeId?: string) => Effect.succeed([]),
    findTransitionConditionSets: (_versionId: string, _transitionId?: string) =>
      Effect.succeed([
        {
          id: "cs-1",
          methodologyVersionId: VERSION_ID,
          transitionId: "tr-1",
          key: "gate.activate.task",
          phase: "start",
          mode: "all",
          groupsJson: [
            {
              key: "workflow-binding",
              mode: "all",
              conditions: [
                {
                  kind: "transition.workflowBinding.present",
                  required: true,
                  config: { workUnitTypeKey: "task", transitionKey: "start" },
                },
              ],
            },
          ],
          guidanceJson: "Workflow binding must exist.",
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      ]),
    findAgentTypes: (_versionId: string) => Effect.succeed([]),
    findTransitionWorkflowBindings: (_versionId: string, _transitionId?: string) =>
      Effect.succeed(transitionWorkflowBindings),
    saveLifecycleDefinition: () => Effect.die("not used in test"),
    recordLifecycleEvent: () => Effect.die("not used in test"),
  };
}

function runEligibility(definitionExtensions: unknown) {
  const definition =
    typeof definitionExtensions === "object" && definitionExtensions !== null
      ? (definitionExtensions as Record<string, unknown>)
      : {};
  const workflows = Array.isArray(definition["workflows"])
    ? definition["workflows"]
        .map((workflow) =>
          typeof workflow === "object" && workflow !== null && typeof workflow["key"] === "string"
            ? workflow["key"]
            : null,
        )
        .filter((key): key is string => key !== null)
    : [];
  const workflowKeySet = new Set(workflows);
  const bindingMap =
    typeof definition["transitionWorkflowBindings"] === "object" &&
    definition["transitionWorkflowBindings"] !== null
      ? (definition["transitionWorkflowBindings"] as Record<string, unknown>)
      : {};
  const boundStartWorkflows = Array.isArray(bindingMap["start"])
    ? (bindingMap["start"] as unknown[])
    : [];
  const transitionWorkflowBindings = boundStartWorkflows
    .filter((workflowKey): workflowKey is string => typeof workflowKey === "string")
    .map((workflowKey, index) => ({
      id: `binding-${index + 1}`,
      methodologyVersionId: VERSION_ID,
      transitionId: "tr-1",
      transitionKey: "start",
      workflowId: `wf-id-${index + 1}`,
      workflowKey: workflowKeySet.has(workflowKey) ? workflowKey : null,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    }));

  const layer = Layer.mergeAll(
    Layer.succeed(MethodologyRepository, makeMethodologyRepo(definitionExtensions)),
    Layer.succeed(LifecycleRepository, makeLifecycleRepo(transitionWorkflowBindings)),
  );

  return Effect.runPromise(
    Effect.gen(function* () {
      const svc = yield* EligibilityService;
      return yield* svc.getTransitionEligibility({
        versionId: VERSION_ID,
        workUnitTypeKey: "task",
        currentState: "__absent__",
      });
    }).pipe(
      Effect.provide(
        Layer.provide(Layer.effect(EligibilityService, EligibilityServiceLive), layer),
      ),
    ),
  );
}

describe("EligibilityService workflow projection", () => {
  it("returns explicit selectable workflow options when multiple are bound", async () => {
    const result = await runEligibility({
      workUnitTypes: [{ key: "task" }],
      agentTypes: [],
      transitions: [{ transitionKey: "start" }],
      workflows: [
        { key: "wf-b", steps: [{ key: "s1", type: "form" }], edges: [] },
        { key: "wf-a", steps: [{ key: "s1", type: "form" }], edges: [] },
      ],
      transitionWorkflowBindings: {
        start: ["wf-b", "wf-a"],
      },
    });

    const transition = result.eligibleTransitions[0] as unknown as Record<string, unknown>;
    expect(transition["eligibleWorkflowKeys"]).toEqual(["wf-a", "wf-b"]);
    expect(transition["workflowSelectionRequired"]).toBe(true);
    expect(transition["workflowBlocked"]).toBe(false);
    expect(transition["conditionSets"]).toEqual([
      {
        key: "gate.activate.task",
        phase: "start",
        mode: "all",
        groups: [
          {
            key: "workflow-binding",
            mode: "all",
            conditions: [
              {
                kind: "transition.workflowBinding.present",
                required: true,
                config: { workUnitTypeKey: "task", transitionKey: "start" },
              },
            ],
          },
        ],
        guidance: "Workflow binding must exist.",
      },
    ]);
  });

  it("blocks transitions with deterministic diagnostics when no workflows are bound", async () => {
    const result = await runEligibility({
      workUnitTypes: [{ key: "task" }],
      agentTypes: [],
      transitions: [{ transitionKey: "start" }],
      workflows: [{ key: "wf-a", steps: [{ key: "s1", type: "form" }], edges: [] }],
      transitionWorkflowBindings: {},
    });

    const transition = result.eligibleTransitions[0] as unknown as Record<string, unknown>;
    expect(transition["eligibleWorkflowKeys"]).toEqual([]);
    expect(transition["workflowBlocked"]).toBe(true);

    const diagnostics = transition["workflowDiagnostics"] as Array<{ code: string }>;
    expect(diagnostics[0]?.code).toBe("NO_WORKFLOW_BOUND");
  });
});
