import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { MethodologyVersionService } from "../../services/methodology-version-service";
import {
  WorkUnitFactService,
  WorkUnitFactServiceLive,
} from "../../services/work-unit-fact-service";
import {
  WorkUnitStateMachineService,
  WorkUnitStateMachineServiceLive,
} from "../../services/work-unit-state-machine-service";

const versionRow = {
  id: "ver-1",
  methodologyId: "meth-1",
  version: "v1",
  status: "draft",
  displayName: "Draft",
  definitionExtensions: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  retiredAt: null,
};

function makeAuthoringSnapshot() {
  return {
    workUnitTypes: [
      {
        key: "project_context",
        displayName: "Project Context",
        description: "Project context",
        cardinality: "many_per_project",
        lifecycleStates: [{ key: "draft" }, { key: "ready" }],
        lifecycleTransitions: [
          {
            transitionKey: "to-ready",
            fromState: "draft",
            toState: "ready",
            conditionSets: [],
          },
        ],
        factSchemas: [
          {
            key: "project_name",
            factType: "string",
            validation: { kind: "none" },
          },
        ],
      },
    ],
    agentTypes: [],
    transitions: [],
    workflows: [],
    transitionWorkflowBindings: {
      "to-ready": ["wf-a"],
    },
    factDefinitions: [],
    linkTypeDefinitions: [],
  };
}

describe("WorkUnitFactService", () => {
  it("replaces fact schemas for one work-unit type", async () => {
    let capturedWorkUnitTypes: unknown = null;

    const layer = Layer.provide(
      WorkUnitFactServiceLive,
      Layer.succeed(MethodologyVersionService, {
        getAuthoringSnapshot: () => Effect.succeed(makeAuthoringSnapshot()),
        updateDraftLifecycle: (input: { workUnitTypes: unknown }) => {
          capturedWorkUnitTypes = input.workUnitTypes;
          return Effect.succeed({
            version: versionRow,
            validation: { valid: true, diagnostics: [] },
          });
        },
      } as unknown as Context.Tag.Service<typeof MethodologyVersionService>),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkUnitFactService;
        yield* service.replaceForWorkUnitType(
          {
            versionId: "ver-1",
            workUnitTypeKey: "project_context",
            facts: [{ key: "repo_path", factType: "string", validation: { kind: "none" } }],
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(capturedWorkUnitTypes).toEqual([
      expect.objectContaining({
        key: "project_context",
        factSchemas: [{ key: "repo_path", factType: "string", validation: { kind: "none" } }],
      }),
    ]);
  });
});

describe("WorkUnitStateMachineService", () => {
  it("disconnect strategy removes toState references and clears fromState", async () => {
    let capturedWorkUnitTypes: unknown = null;

    const layer = Layer.provide(
      WorkUnitStateMachineServiceLive,
      Layer.succeed(MethodologyVersionService, {
        getAuthoringSnapshot: () => Effect.succeed(makeAuthoringSnapshot()),
        updateDraftLifecycle: (input: { workUnitTypes: unknown }) => {
          capturedWorkUnitTypes = input.workUnitTypes;
          return Effect.succeed({
            version: versionRow,
            validation: { valid: true, diagnostics: [] },
          });
        },
      } as unknown as Context.Tag.Service<typeof MethodologyVersionService>),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkUnitStateMachineService;
        yield* service.deleteState(
          {
            versionId: "ver-1",
            workUnitTypeKey: "project_context",
            stateKey: "draft",
            strategy: "disconnect",
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(capturedWorkUnitTypes).toEqual([
      expect.objectContaining({
        key: "project_context",
        lifecycleStates: [{ key: "ready" }],
        lifecycleTransitions: [
          {
            transitionKey: "to-ready",
            fromState: undefined,
            toState: "ready",
            conditionSets: [],
          },
        ],
      }),
    ]);
  });

  it("replaces transition workflow bindings via direct binding path", async () => {
    let capturedPayload: unknown = null;

    const layer = Layer.provide(
      WorkUnitStateMachineServiceLive,
      Layer.succeed(MethodologyVersionService, {
        replaceTransitionBindings: (input: unknown) => {
          capturedPayload = input;
          return Effect.succeed({
            version: versionRow,
            diagnostics: { valid: true, diagnostics: [] },
          });
        },
      } as unknown as Context.Tag.Service<typeof MethodologyVersionService>),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkUnitStateMachineService;
        yield* service.replaceBindings(
          {
            versionId: "ver-1",
            workUnitTypeKey: "project_context",
            transitionKey: "to-ready",
            workflowKeys: ["wf-b", "wf-c"],
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(capturedPayload).toEqual({
      versionId: "ver-1",
      workUnitTypeKey: "project_context",
      transitionKey: "to-ready",
      workflowKeys: ["wf-b", "wf-c"],
    });
  });
});
