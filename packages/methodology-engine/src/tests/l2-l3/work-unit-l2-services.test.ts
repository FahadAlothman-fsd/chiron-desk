import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyRepository } from "../../repository";
import { MethodologyVersionService } from "../../services/methodology-version-service";
import { MethodologyVersionServiceLive } from "../../services/methodology-version-service";
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
    let capturedReplaceFactsPayload: unknown = null;

    const layer = Layer.provide(
      WorkUnitFactServiceLive,
      Layer.succeed(MethodologyVersionService, {
        getAuthoringSnapshot: () => Effect.succeed(makeAuthoringSnapshot()),
        replaceWorkUnitFacts: (input: unknown) => {
          capturedReplaceFactsPayload = input;
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

    expect(capturedReplaceFactsPayload).toEqual({
      versionId: "ver-1",
      workUnitTypeKey: "project_context",
      facts: [{ key: "repo_path", factType: "string", validation: { kind: "none" } }],
    });
  });
});

describe("WorkUnitStateMachineService", () => {
  it("updates transition bindings through repository capabilities without boundary delegation", async () => {
    let capturedBindingPayload: unknown = null;

    const repoLayer = Layer.succeed(MethodologyRepository, {
      findVersionById: () => Effect.succeed(versionRow),
      replaceTransitionWorkflowBindings: (params: unknown) => {
        capturedBindingPayload = params;
        return Effect.succeed(undefined);
      },
      recordEvent: () =>
        Effect.succeed({
          id: "evt-1",
          methodologyVersionId: "ver-1",
          eventType: "workflow_bindings_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () => Effect.succeed([]),
      findLifecycleStates: () => Effect.succeed([]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findFactSchemas: () => Effect.succeed([]),
      findTransitionConditionSets: () => Effect.succeed([]),
      findAgentTypes: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
      saveLifecycleDefinition: () =>
        Effect.succeed({
          version: versionRow,
          events: [],
        }),
      recordLifecycleEvent: () =>
        Effect.succeed({
          id: "evt-lifecycle-1",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const layer = Layer.provide(
      WorkUnitStateMachineServiceLive,
      Layer.mergeAll(repoLayer, lifecycleLayer),
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

    expect(capturedBindingPayload).toEqual({
      versionId: "ver-1",
      workUnitTypeKey: "project_context",
      transitionKey: "to-ready",
      workflowKeys: ["wf-b", "wf-c"],
    });
  });

  it("disconnect strategy removes toState references and clears fromState", async () => {
    let capturedDeletePayload: unknown = null;

    const repoLayer = Layer.succeed(MethodologyRepository, {
      findVersionById: () => Effect.succeed(versionRow),
      deleteWorkUnitLifecycleState: (params: unknown) => {
        capturedDeletePayload = params;
        return Effect.succeed(true);
      },
      recordEvent: () =>
        Effect.succeed({
          id: "evt-state-1",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wut-1",
            methodologyVersionId: "ver-1",
            key: "project_context",
            displayName: "Project Context",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "many_per_project",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      findLifecycleStates: () =>
        Effect.succeed([
          {
            id: "state-1",
            methodologyVersionId: "ver-1",
            workUnitTypeId: "wut-1",
            key: "draft",
            displayName: "Draft",
            descriptionJson: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
          {
            id: "state-2",
            methodologyVersionId: "ver-1",
            workUnitTypeId: "wut-1",
            key: "ready",
            displayName: "Ready",
            descriptionJson: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      findLifecycleTransitions: () =>
        Effect.succeed([
          {
            id: "transition-1",
            methodologyVersionId: "ver-1",
            workUnitTypeId: "wut-1",
            fromStateId: "state-1",
            toStateId: "state-2",
            transitionKey: "to-ready",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      findTransitionConditionSets: () => Effect.succeed([]),
      findFactSchemas: () => Effect.succeed([]),
      findAgentTypes: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
      saveLifecycleDefinition: () =>
        Effect.succeed({
          version: versionRow,
          events: [],
        }),
      recordLifecycleEvent: () =>
        Effect.succeed({
          id: "evt-lifecycle-state-1",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const layer = Layer.provide(
      WorkUnitStateMachineServiceLive,
      Layer.mergeAll(repoLayer, lifecycleLayer),
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

    expect(capturedDeletePayload).toEqual({
      versionId: "ver-1",
      workUnitTypeKey: "project_context",
      stateKey: "draft",
      strategy: "disconnect",
    });
  });

  it("replaces transition workflow bindings via direct binding path", async () => {
    let capturedPayload: unknown = null;

    const layer = Layer.provide(
      WorkUnitStateMachineServiceLive,
      Layer.mergeAll(
        Layer.succeed(MethodologyRepository, {
          findVersionById: () => Effect.succeed(versionRow),
          replaceTransitionWorkflowBindings: (input: unknown) => {
            capturedPayload = input;
            return Effect.succeed(undefined);
          },
          recordEvent: () =>
            Effect.succeed({
              id: "evt-binding-1",
              methodologyVersionId: "ver-1",
              eventType: "lifecycle_updated",
              actorId: "tester",
              changedFieldsJson: {},
              diagnosticsJson: null,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            }),
        } as unknown as Context.Tag.Service<typeof MethodologyRepository>),
        Layer.succeed(LifecycleRepository, {
          findWorkUnitTypes: () => Effect.succeed([]),
          findLifecycleStates: () => Effect.succeed([]),
          findLifecycleTransitions: () => Effect.succeed([]),
          findFactSchemas: () => Effect.succeed([]),
          findTransitionConditionSets: () => Effect.succeed([]),
          findAgentTypes: () => Effect.succeed([]),
          findTransitionWorkflowBindings: () => Effect.succeed([]),
          saveLifecycleDefinition: () => Effect.succeed({ version: versionRow, events: [] }),
          recordLifecycleEvent: () =>
            Effect.succeed({
              id: "evt-lifecycle-binding-1",
              methodologyVersionId: "ver-1",
              eventType: "lifecycle_updated",
              actorId: "tester",
              changedFieldsJson: {},
              diagnosticsJson: null,
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
            }),
        } as unknown as Context.Tag.Service<typeof LifecycleRepository>),
      ),
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

describe("WorkUnit metadata mutations", () => {
  it("create/update metadata avoid lifecycle full-rewrite save path", async () => {
    let capturedCreatePayload: unknown = null;
    let capturedUpdatePayload: unknown = null;
    let saveLifecycleDefinitionCalls = 0;

    const repoLayer = Layer.succeed(MethodologyRepository, {
      findVersionById: () => Effect.succeed(versionRow),
      createWorkUnitType: (params: unknown) => {
        capturedCreatePayload = params;
        return Effect.succeed(true);
      },
      updateWorkUnitType: (params: unknown) => {
        capturedUpdatePayload = params;
        return Effect.succeed(true);
      },
      findWorkflowSnapshot: () =>
        Effect.succeed({
          workflows: [],
          transitionWorkflowBindings: {},
          guidance: undefined,
        }),
      findLinkTypeKeys: () => Effect.succeed([]),
      recordEvent: () =>
        Effect.succeed({
          id: "evt-work-unit-1",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
      findFactDefinitionsByVersionId: () => Effect.succeed([]),
      findLinkTypeDefinitionsByVersionId: () => Effect.succeed([]),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () => Effect.succeed([]),
      findLifecycleStates: () => Effect.succeed([]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findFactSchemas: () => Effect.succeed([]),
      findTransitionConditionSets: () => Effect.succeed([]),
      findAgentTypes: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
      saveLifecycleDefinition: () => {
        saveLifecycleDefinitionCalls += 1;
        return Effect.succeed({
          version: versionRow,
          events: [],
        });
      },
      recordLifecycleEvent: () =>
        Effect.succeed({
          id: "evt-lifecycle-work-unit-1",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const layer = Layer.provide(
      MethodologyVersionServiceLive,
      Layer.mergeAll(repoLayer, lifecycleLayer),
    );

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MethodologyVersionService;

        yield* service.createWorkUnitMetadata(
          {
            versionId: "ver-1",
            workUnitType: {
              key: "story",
              displayName: "Story",
              cardinality: "many_per_project",
            },
          },
          "tester",
        );

        yield* service.updateWorkUnitMetadata(
          {
            versionId: "ver-1",
            workUnitKey: "story",
            workUnitType: {
              key: "story_v2",
              displayName: "Story V2",
              cardinality: "one_per_project",
            },
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(capturedCreatePayload).toEqual({
      versionId: "ver-1",
      workUnitType: {
        key: "story",
        displayName: "Story",
        description: undefined,
        guidance: undefined,
        cardinality: "many_per_project",
      },
    });

    expect(capturedUpdatePayload).toEqual({
      versionId: "ver-1",
      workUnitTypeKey: "story",
      workUnitType: {
        key: "story_v2",
        displayName: "Story V2",
        description: undefined,
        guidance: undefined,
        cardinality: "one_per_project",
      },
    });

    expect(saveLifecycleDefinitionCalls).toBe(0);
  });

  it("does not persist create when lifecycle validation fails", async () => {
    let createCalls = 0;

    const repoLayer = Layer.succeed(MethodologyRepository, {
      findVersionById: () => Effect.succeed(versionRow),
      createWorkUnitType: () => {
        createCalls += 1;
        return Effect.succeed(true);
      },
      findLinkTypeKeys: () => Effect.succeed([]),
      recordEvent: () =>
        Effect.succeed({
          id: "evt-work-unit-2",
          methodologyVersionId: "ver-1",
          eventType: "lifecycle_updated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

    const lifecycleLayer = Layer.succeed(LifecycleRepository, {
      findWorkUnitTypes: () =>
        Effect.succeed([
          {
            id: "wut-1",
            methodologyVersionId: "ver-1",
            key: "story",
            displayName: "Story",
            descriptionJson: null,
            guidanceJson: null,
            cardinality: "many_per_project",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      findLifecycleStates: () =>
        Effect.succeed([
          {
            id: "state-1",
            methodologyVersionId: "ver-1",
            workUnitTypeId: "wut-1",
            key: "draft",
            displayName: "Draft",
            descriptionJson: null,
            guidanceJson: null,
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            updatedAt: new Date("2026-01-01T00:00:00.000Z"),
          },
        ]),
      findLifecycleTransitions: () => Effect.succeed([]),
      findFactSchemas: () => Effect.succeed([]),
      findTransitionConditionSets: () => Effect.succeed([]),
      findAgentTypes: () => Effect.succeed([]),
      findTransitionWorkflowBindings: () => Effect.succeed([]),
      saveLifecycleDefinition: () =>
        Effect.succeed({
          version: versionRow,
          events: [],
        }),
      recordLifecycleEvent: () =>
        Effect.succeed({
          id: "evt-lifecycle-work-unit-2",
          methodologyVersionId: "ver-1",
          eventType: "validated",
          actorId: "tester",
          changedFieldsJson: {},
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        }),
    } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

    const layer = Layer.provide(
      MethodologyVersionServiceLive,
      Layer.mergeAll(repoLayer, lifecycleLayer),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* MethodologyVersionService;
        return yield* service.createWorkUnitMetadata(
          {
            versionId: "ver-1",
            workUnitType: {
              key: "story",
              displayName: "Story Duplicate",
              cardinality: "many_per_project",
            },
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(result.validation.valid).toBe(false);
    expect(createCalls).toBe(0);
  });
});
