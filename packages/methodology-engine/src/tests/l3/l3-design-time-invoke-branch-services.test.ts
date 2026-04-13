import type { BranchStepPayload, InvokeStepPayload } from "@chiron/contracts/methodology/workflow";
import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { ValidationDecodeError, VersionNotDraftError } from "../../errors";
import { MethodologyRepository } from "../../repository";
import {
  BranchStepDefinitionService,
  BranchStepDefinitionServiceLive,
} from "../../services/branch-step-definition-service";
import {
  InvokeStepDefinitionService,
  InvokeStepDefinitionServiceLive,
} from "../../services/invoke-step-definition-service";
import {
  WorkflowEditorDefinitionService,
  WorkflowEditorDefinitionServiceLive,
} from "../../services/workflow-editor-definition-service";

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

const contextFacts = [
  {
    contextFactDefinitionId: "ctx-summary",
    kind: "plain_value_fact",
    key: "summary",
    label: "Summary",
    cardinality: "one",
    valueType: "string",
  },
  {
    contextFactDefinitionId: "ctx-workflow-set",
    kind: "workflow_reference_fact",
    key: "workflowSet",
    label: "Workflow Set",
    cardinality: "many",
    allowedWorkflowDefinitionIds: ["wf-1", "wf-aux"],
  },
  {
    contextFactDefinitionId: "ctx-json-metadata",
    kind: "plain_value_fact",
    key: "jsonMetadata",
    label: "JSON Metadata",
    cardinality: "one",
    valueType: "json",
    validationJson: {
      kind: "json-schema",
      schemaDialect: "draft-2020-12",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          path: { type: "string" },
          estimatedHours: { type: "number" },
          isCritical: { type: "boolean" },
        },
      },
      subSchema: {
        type: "object",
        fields: [
          { key: "path", type: "string", cardinality: "one" },
          { key: "estimatedHours", type: "number", cardinality: "one" },
          { key: "isCritical", type: "boolean", cardinality: "one" },
        ],
      },
    },
  },
  {
    contextFactDefinitionId: "ctx-artifact",
    kind: "artifact_reference_fact",
    key: "artifact",
    label: "Artifact",
    cardinality: "one",
    artifactSlotDefinitionId: "artifact-prd",
  },
  {
    contextFactDefinitionId: "ctx-story-draft",
    kind: "work_unit_draft_spec_fact",
    key: "storyDraft",
    label: "Story Draft",
    cardinality: "one",
    workUnitDefinitionId: "wut-story",
    selectedWorkUnitFactDefinitionIds: ["fact-title", "fact-description"],
    selectedArtifactSlotDefinitionIds: ["artifact-prd"],
  },
] as const;

const workUnitPayload: InvokeStepPayload = {
  key: "invoke-story-work",
  label: "Invoke story work",
  descriptionJson: { markdown: "Invoke story workflows" },
  guidance: {
    human: { markdown: "Review before fan-out." },
    agent: { markdown: "Preserve authored bindings." },
  },
  targetKind: "work_unit",
  sourceMode: "context_fact_backed",
  contextFactDefinitionId: "ctx-story-draft",
  bindings: [
    {
      destination: {
        kind: "work_unit_fact",
        workUnitFactDefinitionId: "fact-title",
      },
      source: {
        kind: "context_fact",
        contextFactDefinitionId: "ctx-summary",
      },
    },
  ],
  activationTransitions: [
    {
      transitionId: "transition-ready",
      workflowDefinitionIds: ["wf-1", "wf-aux"],
    },
  ],
};

const branchPayload: BranchStepPayload = {
  key: "branch-on-status",
  label: "Branch on status",
  descriptionJson: { markdown: "Route by workflow state" },
  guidance: {
    human: { markdown: "Review default route." },
    agent: { markdown: "Keep conditional routes unique." },
  },
  defaultTargetStepId: "step-default",
  routes: [
    {
      routeId: "route-ready",
      targetStepId: "step-route-a",
      conditionMode: "all",
      groups: [
        {
          groupId: "group-ready",
          mode: "all",
          conditions: [
            {
              conditionId: "cond-ready",
              contextFactDefinitionId: "ctx-summary",
              subFieldKey: null,
              operator: "exists",
              isNegated: false,
              comparisonJson: null,
            },
          ],
        },
      ],
    },
    {
      routeId: "route-artifact",
      targetStepId: "step-route-b",
      conditionMode: "any",
      groups: [
        {
          groupId: "group-artifact",
          mode: "any",
          conditions: [
            {
              conditionId: "cond-artifact",
              contextFactDefinitionId: "ctx-artifact",
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
};

function makeLayer(options?: {
  readonly versionStatus?: string;
  readonly includeMalformedStepWithoutKey?: boolean;
  readonly includeMalformedInvokeStepWithoutKey?: boolean;
  readonly includeDeferredInvokeTargetShell?: boolean;
}) {
  const createdPayloads: Array<InvokeStepPayload> = [];
  const updatedPayloads: Array<InvokeStepPayload> = [];
  const deletedStepIds: Array<string> = [];
  const recordedOperations: Array<string> = [];
  const createdBranchPayloads: Array<BranchStepPayload> = [];
  const updatedBranchPayloads: Array<BranchStepPayload> = [];
  const deletedBranchStepIds: Array<string> = [];
  const createdProjectedEdges: Array<{
    fromStepKey: string | null;
    toStepKey: string | null;
    descriptionJson: unknown;
  }> = [];
  const deletedProjectedEdgeIds: Array<string> = [];
  const currentEdges: Array<{
    edgeId: string;
    fromStepKey: string | null;
    toStepKey: string | null;
    descriptionJson?: unknown;
  }> = [];
  let edgeCounter = 0;

  const routeAInvokeStep = options?.includeDeferredInvokeTargetShell
    ? ({
        stepId: "step-route-a",
        stepType: "invoke",
        mode: "deferred",
        defaultMessage: "Deferred in slice-1",
      } as const)
    : ({
        stepId: "step-route-a",
        stepType: "invoke",
        payload: {
          key: "route-a-step",
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowDefinitionIds: ["wf-1"],
        },
      } as const);

  const editorSteps = [
    {
      stepId: "step-default",
      stepType: "form",
      payload: { key: "default-step", fields: [] },
    },
    routeAInvokeStep,
    {
      stepId: "step-route-b",
      stepType: "form",
      payload: { key: "route-b-step", fields: [] },
    },
    {
      stepId: "step-branch-1",
      stepType: "branch",
      payload: {
        key: "branch-existing",
        defaultTargetStepId: "step-default",
        routes: [],
      },
    },
  ];

  if (options?.includeMalformedStepWithoutKey) {
    editorSteps.push({
      stepId: "step-malformed",
      stepType: "agent",
      payload: {},
    } as unknown as (typeof editorSteps)[number]);
  }

  if (options?.includeMalformedInvokeStepWithoutKey) {
    editorSteps.push({
      stepId: "step-malformed-invoke",
      stepType: "invoke",
      payload: {},
    } as unknown as (typeof editorSteps)[number]);
  }

  const repo = {
    findVersionById: () =>
      Effect.succeed({
        ...versionRow,
        status: options?.versionStatus ?? versionRow.status,
      }),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([...contextFacts]),
    findInvokeBindingWorkUnitFactDefinitionsByIds: () =>
      Effect.succeed([
        {
          id: "fact-title",
          workUnitTypeId: "wut-story",
          key: "title",
          factType: "string",
          cardinality: "one",
          validationJson: { kind: "none" },
        },
        {
          id: "fact-description",
          workUnitTypeId: "wut-story",
          key: "description",
          factType: "string",
          cardinality: "one",
          validationJson: { kind: "none" },
        },
      ]),
    findInvokeBindingArtifactSlotDefinitionsByIds: () =>
      Effect.succeed([
        {
          id: "artifact-prd",
          workUnitTypeId: "wut-story",
          key: "prd",
          cardinality: "single",
        },
      ]),
    createInvokeStepDefinition: (input: { payload: InvokeStepPayload }) =>
      Effect.sync(() => {
        createdPayloads.push(input.payload);
        return { stepId: "step-invoke-1", payload: input.payload };
      }),
    updateInvokeStepDefinition: (input: { stepId: string; payload: InvokeStepPayload }) =>
      Effect.sync(() => {
        updatedPayloads.push(input.payload);
        return { stepId: input.stepId, payload: input.payload };
      }),
    deleteInvokeStepDefinition: (input: { stepId: string }) =>
      Effect.sync(() => {
        deletedStepIds.push(input.stepId);
      }),
    createBranchStepDefinition: (input: { payload: BranchStepPayload }) =>
      Effect.sync(() => {
        createdBranchPayloads.push(input.payload);
        return { stepId: "step-branch-1", payload: input.payload };
      }),
    updateBranchStepDefinition: (input: { stepId: string; payload: BranchStepPayload }) =>
      Effect.sync(() => {
        updatedBranchPayloads.push(input.payload);
        return { stepId: input.stepId, payload: input.payload };
      }),
    deleteBranchStepDefinition: (input: { stepId: string }) =>
      Effect.sync(() => {
        deletedBranchStepIds.push(input.stepId);
      }),
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "workflow-1",
          displayName: "Workflow",
          descriptionJson: null,
        },
        steps: editorSteps,
        edges: [],
        contextFacts: [
          ...contextFacts,
          {
            contextFactDefinitionId: "ctx-artifact",
            kind: "artifact_reference_fact",
            key: "artifact",
            label: "Artifact",
            cardinality: "one",
            artifactSlotDefinitionId: "artifact-prd",
          },
        ],
        formDefinitions: [],
      }),
    getInvokeStepDefinition: (input: { stepId: string }) =>
      Effect.succeed(
        input.stepId === "step-route-a"
          ? {
              stepId: "step-route-a",
              payload: {
                key: "route-a-step",
                targetKind: "workflow",
                sourceMode: "fixed_set",
                workflowDefinitionIds: ["wf-1"],
              },
            }
          : null,
      ),
    getBranchStepDefinition: () => Effect.succeed(null),
    listWorkflowEdgesByDefinitionId: () =>
      Effect.sync(() => currentEdges.map((edge) => ({ ...edge }))),
    createWorkflowEdgeByDefinitionId: (input: {
      fromStepKey: string | null;
      toStepKey: string | null;
      descriptionJson: unknown;
    }) =>
      Effect.sync(() => {
        const edgeId = `edge-projected-${++edgeCounter}`;
        createdProjectedEdges.push({
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson,
        });
        currentEdges.push({
          edgeId,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson,
        });
        return {
          edgeId,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson as never,
        };
      }),
    deleteWorkflowEdgeByDefinitionId: (input: { edgeId: string }) =>
      Effect.sync(() => {
        deletedProjectedEdgeIds.push(input.edgeId);
        const index = currentEdges.findIndex((edge) => edge.edgeId === input.edgeId);
        if (index >= 0) {
          currentEdges.splice(index, 1);
        }
      }),
    recordEvent: (event: { changedFieldsJson: { operation: string } }) =>
      Effect.sync(() => {
        recordedOperations.push(event.changedFieldsJson.operation);
        return {
          id: crypto.randomUUID(),
          methodologyVersionId: "ver-1",
          eventType: "workflows_updated",
          actorId: "tester",
          changedFieldsJson: event.changedFieldsJson,
          diagnosticsJson: null,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
      }),
  } as Context.Tag.Service<typeof MethodologyRepository>;

  return {
    createdPayloads,
    updatedPayloads,
    deletedStepIds,
    createdBranchPayloads,
    updatedBranchPayloads,
    deletedBranchStepIds,
    createdProjectedEdges,
    deletedProjectedEdgeIds,
    recordedOperations,
    layer: Layer.provide(
      Layer.mergeAll(InvokeStepDefinitionServiceLive, BranchStepDefinitionServiceLive),
      Layer.succeed(MethodologyRepository, repo),
    ),
  };
}

function makeEditorDefinitionLayer(options?: {
  readonly includeBranchMetadataInDescriptions?: boolean;
  readonly includeBranchStep?: boolean;
}) {
  const includeBranchStep = options?.includeBranchStep ?? true;

  const repo = {
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "workflow-1",
          displayName: "Workflow",
          descriptionJson: null,
        },
        steps: [
          {
            stepId: "step-form-1",
            stepType: "form",
            payload: {
              key: "capture-context",
              fields: [],
            },
          },
          {
            stepId: "step-invoke-1",
            stepType: "invoke",
            mode: "deferred",
            defaultMessage: "Deferred in slice-1",
          },
          ...(includeBranchStep
            ? [
                {
                  stepId: "step-branch-1",
                  stepType: "branch",
                  mode: "deferred",
                  defaultMessage: "Deferred in slice-1",
                } as const,
              ]
            : []),
        ],
        edges: [
          {
            edgeId: "edge-normal-1",
            fromStepKey: "capture-context",
            toStepKey: "branch-on-summary",
            descriptionJson: { markdown: "normal edge" },
          },
          {
            edgeId: "edge-persisted-branch-default",
            fromStepKey: "branch-on-summary",
            toStepKey: "invoke-story-work",
            descriptionJson:
              options?.includeBranchMetadataInDescriptions === false
                ? { markdown: "legacy projected edge" }
                : {
                    markdown: "",
                    edgeOwner: "branch_default",
                    branchStepId: "step-branch-1",
                  },
          },
          {
            edgeId: "edge-persisted-branch-route",
            fromStepKey: "branch-on-summary",
            toStepKey: "capture-context",
            descriptionJson:
              options?.includeBranchMetadataInDescriptions === false
                ? { markdown: "legacy projected edge" }
                : {
                    markdown: "",
                    edgeOwner: "branch_conditional",
                    branchStepId: "step-branch-1",
                    routeId: "route-summary-match",
                  },
          },
        ],
        contextFacts: [...contextFacts],
        formDefinitions: [],
      }),
    getInvokeStepDefinition: () =>
      Effect.succeed({
        stepId: "step-invoke-1",
        payload: {
          key: "invoke-story-work",
          targetKind: "workflow",
          sourceMode: "fixed_set",
          workflowDefinitionIds: ["wf-review"],
        },
      }),
    getBranchStepDefinition: () =>
      Effect.succeed({
        stepId: "step-branch-1",
        payload: {
          key: "branch-on-summary",
          defaultTargetStepId: "step-invoke-1",
          routes: [
            {
              routeId: "route-summary-match",
              targetStepId: "step-form-1",
              conditionMode: "all",
              groups: [
                {
                  groupId: "group-summary-match",
                  mode: "all",
                  conditions: [
                    {
                      conditionId: "condition-summary-match",
                      contextFactDefinitionId: "ctx-summary",
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
        },
      }),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;

  return Layer.provide(
    WorkflowEditorDefinitionServiceLive,
    Layer.succeed(MethodologyRepository, repo),
  );
}

describe("l3 invoke step definition service", () => {
  it("editor definition returns typed invoke and branch steps with unified edge ownership metadata", async () => {
    const layer = makeEditorDefinitionLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowEditorDefinitionService;

        return yield* service.getEditorDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepId: "step-invoke-1",
          stepType: "invoke",
          payload: expect.objectContaining({ key: "invoke-story-work" }),
        }),
        expect.objectContaining({
          stepId: "step-branch-1",
          stepType: "branch",
          payload: expect.objectContaining({ key: "branch-on-summary" }),
        }),
      ]),
    );

    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          edgeId: "edge-normal-1",
          fromStepKey: "capture-context",
          toStepKey: "branch-on-summary",
          edgeOwner: "normal",
        }),
        expect.objectContaining({
          edgeId: "branch-step-branch-1-default",
          fromStepKey: "branch-on-summary",
          toStepKey: "invoke-story-work",
          edgeOwner: "branch_default",
          isDefault: true,
          descriptionJson: expect.objectContaining({
            edgeOwner: "branch_default",
            branchStepId: "step-branch-1",
          }),
        }),
        expect.objectContaining({
          edgeId: "branch-step-branch-1-route-route-summary-match",
          fromStepKey: "branch-on-summary",
          toStepKey: "capture-context",
          edgeOwner: "branch_conditional",
          routeId: "route-summary-match",
          descriptionJson: expect.objectContaining({
            edgeOwner: "branch_conditional",
            branchStepId: "step-branch-1",
            routeId: "route-summary-match",
          }),
        }),
      ]),
    );
    expect(result.edges.map((edge) => edge.edgeId)).not.toContain("edge-persisted-branch-default");
    expect(result.edges.map((edge) => edge.edgeId)).not.toContain("edge-persisted-branch-route");
  });

  it("editor definition preserves non-branch compat workflows with normal edges only", async () => {
    const layer = makeEditorDefinitionLayer({
      includeBranchMetadataInDescriptions: false,
      includeBranchStep: false,
    });

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* WorkflowEditorDefinitionService;

        return yield* service.getEditorDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
        });
      }).pipe(Effect.provide(layer)),
    );

    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ edgeId: "edge-normal-1", edgeOwner: "normal" }),
        expect.objectContaining({ edgeId: "edge-persisted-branch-default", edgeOwner: "normal" }),
        expect.objectContaining({ edgeId: "edge-persisted-branch-route", edgeOwner: "normal" }),
      ]),
    );
    expect(result.edges.every((edge) => edge.edgeOwner === "normal")).toBe(true);
  });

  it("invoke CRUD round-trips work-unit bindings and transition workflows", async () => {
    const { layer, createdPayloads, updatedPayloads, deletedStepIds, recordedOperations } =
      makeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeStepDefinitionService;

        const created = yield* service.createInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: workUnitPayload,
          },
          "user-1",
        );

        const updated = yield* service.updateInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
            payload: {
              ...workUnitPayload,
              label: "Invoke story work v2",
              bindings: [
                {
                  destination: {
                    kind: "work_unit_fact",
                    workUnitFactDefinitionId: "fact-title",
                  },
                  source: {
                    kind: "context_fact",
                    contextFactDefinitionId: "ctx-summary",
                  },
                },
                {
                  destination: {
                    kind: "work_unit_fact",
                    workUnitFactDefinitionId: "fact-description",
                  },
                  source: {
                    kind: "context_fact",
                    contextFactDefinitionId: "ctx-summary",
                  },
                },
              ],
              activationTransitions: [],
            },
          },
          "user-1",
        );

        yield* service.deleteInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
          },
          "user-1",
        );

        return { created, updated };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.created.stepId).toBe("step-invoke-1");
    expect(result.created.payload).toEqual(workUnitPayload);
    expect(result.updated.payload.label).toBe("Invoke story work v2");
    expect(result.updated.payload.targetKind).toBe("work_unit");
    expect(createdPayloads).toEqual([workUnitPayload]);
    expect(updatedPayloads[0]).toMatchObject({
      bindings: [
        expect.objectContaining({
          destination: expect.objectContaining({ workUnitFactDefinitionId: "fact-title" }),
        }),
        expect.objectContaining({
          destination: expect.objectContaining({ workUnitFactDefinitionId: "fact-description" }),
        }),
      ],
      activationTransitions: [],
    });
    expect(deletedStepIds).toEqual(["step-invoke-1"]);
    expect(recordedOperations).toEqual([
      "create_invoke_step",
      "update_invoke_step",
      "delete_invoke_step",
    ]);
  });

  it("invoke create tolerates editor steps without payload.key", async () => {
    const { layer } = makeLayer({ includeMalformedStepWithoutKey: true });

    const created = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* InvokeStepDefinitionService;

        return yield* service.createInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: workUnitPayload,
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(created.stepId).toBe("step-invoke-1");
  });

  it("invoke rejects workflow-target authored bindings and activation transitions", async () => {
    const { layer, createdPayloads } = makeLayer();

    const error = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeStepDefinitionService;
        return yield* service.createInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              key: "invoke-workflows",
              targetKind: "workflow",
              sourceMode: "fixed_set",
              workflowDefinitionIds: ["wf-1"],
              bindings: [
                {
                  destination: {
                    kind: "work_unit_fact",
                    workUnitFactDefinitionId: "fact-title",
                  },
                  source: {
                    kind: "context_fact",
                    contextFactDefinitionId: "ctx-summary",
                  },
                },
              ],
              activationTransitions: [
                {
                  transitionId: "transition-ready",
                  workflowDefinitionIds: ["wf-1"],
                },
              ],
            } as InvokeStepPayload,
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(error._tag).toBe("Failure");
    if (error._tag === "Failure") {
      expect(error.cause.error).toBeInstanceOf(ValidationDecodeError);
      expect(error.cause.error.message).toContain(
        "Workflow-target invoke cannot have authored bindings",
      );
    }
    expect(createdPayloads).toEqual([]);
  });

  it("invoke rejects unknown context facts and non-draft versions", async () => {
    const validLayer = makeLayer();
    const missingFactError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeStepDefinitionService;
        return yield* service.createInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...workUnitPayload,
              contextFactDefinitionId: "ctx-missing",
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(validLayer.layer)),
    );

    expect(missingFactError._tag).toBe("Failure");
    if (missingFactError._tag === "Failure") {
      expect(missingFactError.cause.error).toBeInstanceOf(ValidationDecodeError);
    }

    const publishedLayer = makeLayer({ versionStatus: "published" });
    const draftError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* InvokeStepDefinitionService;
        return yield* service.deleteInvokeStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: "step-invoke-1",
          },
          "user-1",
        );
      }).pipe(Effect.provide(publishedLayer.layer)),
    );

    expect(draftError._tag).toBe("Failure");
    if (draftError._tag === "Failure") {
      expect(draftError.cause.error).toBeInstanceOf(VersionNotDraftError);
    }
  });

  it("branch CRUD round-trips routes and syncs projected edges", async () => {
    const {
      layer,
      createdBranchPayloads,
      updatedBranchPayloads,
      deletedBranchStepIds,
      createdProjectedEdges,
      deletedProjectedEdgeIds,
      recordedOperations,
    } = makeLayer();

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;

        const created = yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: branchPayload,
          },
          "user-1",
        );

        const updated = yield* service.updateBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
            payload: {
              ...branchPayload,
              key: "branch-on-status-v2",
              routes: [branchPayload.routes[0]!],
            },
          },
          "user-1",
        );

        yield* service.deleteBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
          },
          "user-1",
        );

        return { created, updated };
      }).pipe(Effect.provide(layer)),
    );

    expect(result.created.stepId).toBe("step-branch-1");
    expect(result.created.payload).toEqual(branchPayload);
    expect(result.updated.payload.key).toBe("branch-on-status-v2");
    expect(createdBranchPayloads).toEqual([branchPayload]);
    expect(updatedBranchPayloads).toEqual([
      expect.objectContaining({ key: "branch-on-status-v2", routes: [branchPayload.routes[0]] }),
    ]);
    expect(deletedBranchStepIds).toEqual(["step-branch-1"]);
    expect(createdProjectedEdges).toHaveLength(5);
    expect(createdProjectedEdges.slice(0, 3)).toEqual([
      expect.objectContaining({ fromStepKey: "branch-on-status", toStepKey: "default-step" }),
      expect.objectContaining({ fromStepKey: "branch-on-status", toStepKey: "route-a-step" }),
      expect.objectContaining({ fromStepKey: "branch-on-status", toStepKey: "route-b-step" }),
    ]);
    expect(createdProjectedEdges[0]?.descriptionJson).toMatchObject({
      edgeOwner: "branch_default",
      branchStepId: "step-branch-1",
    });
    expect(createdProjectedEdges[1]?.descriptionJson).toMatchObject({
      edgeOwner: "branch_conditional",
      branchStepId: "step-branch-1",
      routeId: "route-ready",
    });
    expect(deletedProjectedEdgeIds).toHaveLength(5);
    expect(recordedOperations).toEqual([
      "create_branch_step",
      "update_branch_step",
      "delete_branch_step",
    ]);
  });

  it("branch rejects invalid targets, empty groups, invalid operators, and non-draft versions", async () => {
    const { layer } = makeLayer();

    const duplicateTargetError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: branchPayload.routes.map((route) => ({
                ...route,
                targetStepId: "step-route-a",
              })),
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(duplicateTargetError._tag).toBe("Failure");

    const selfReferenceError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.updateBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: "step-branch-1",
            payload: {
              ...branchPayload,
              defaultTargetStepId: "step-branch-1",
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(selfReferenceError._tag).toBe("Failure");

    const emptyGroupError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [{ ...branchPayload.routes[0]!.groups[0]!, conditions: [] }],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(emptyGroupError._tag).toBe("Failure");

    const invalidOperatorError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [
                    {
                      ...branchPayload.routes[0]!.groups[0]!,
                      conditions: [
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          operator: "regex",
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(invalidOperatorError._tag).toBe("Failure");
    if (invalidOperatorError._tag === "Failure") {
      expect(invalidOperatorError.cause.error).toBeInstanceOf(ValidationDecodeError);
    }

    const invalidPlainJsonRootEqualsError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [
                    {
                      ...branchPayload.routes[0]!.groups[0]!,
                      conditions: [
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          contextFactDefinitionId: "ctx-json-metadata",
                          subFieldKey: null,
                          operator: "equals",
                          comparisonJson: { value: { path: "src/index.ts" } },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(invalidPlainJsonRootEqualsError._tag).toBe("Failure");
    if (invalidPlainJsonRootEqualsError._tag === "Failure") {
      expect(invalidPlainJsonRootEqualsError.cause.error).toBeInstanceOf(ValidationDecodeError);
    }

    const invalidPlainJsonUnknownSubFieldError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [
                    {
                      ...branchPayload.routes[0]!.groups[0]!,
                      conditions: [
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          contextFactDefinitionId: "ctx-json-metadata",
                          subFieldKey: "missing",
                          operator: "equals",
                          comparisonJson: { value: "src/index.ts" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(invalidPlainJsonUnknownSubFieldError._tag).toBe("Failure");
    if (invalidPlainJsonUnknownSubFieldError._tag === "Failure") {
      expect(invalidPlainJsonUnknownSubFieldError.cause.error).toBeInstanceOf(
        ValidationDecodeError,
      );
    }

    const invalidPlainJsonSubFieldOperatorError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [
                    {
                      ...branchPayload.routes[0]!.groups[0]!,
                      conditions: [
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          contextFactDefinitionId: "ctx-json-metadata",
                          subFieldKey: "estimatedHours",
                          operator: "contains",
                          comparisonJson: { value: "5" },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );
    expect(invalidPlainJsonSubFieldOperatorError._tag).toBe("Failure");
    if (invalidPlainJsonSubFieldOperatorError._tag === "Failure") {
      expect(invalidPlainJsonSubFieldOperatorError.cause.error).toBeInstanceOf(
        ValidationDecodeError,
      );
    }

    const publishedLayer = makeLayer({ versionStatus: "published" });
    const draftError = await Effect.runPromiseExit(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.deleteBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: "step-branch-1",
          },
          "user-1",
        );
      }).pipe(Effect.provide(publishedLayer.layer)),
    );

    expect(draftError._tag).toBe("Failure");
    if (draftError._tag === "Failure") {
      expect(draftError.cause.error).toBeInstanceOf(VersionNotDraftError);
    }
  });

  it("branch accepts plain-json typed subfield operators", async () => {
    const { layer } = makeLayer();

    const created = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;
        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              ...branchPayload,
              routes: [
                {
                  ...branchPayload.routes[0]!,
                  groups: [
                    {
                      ...branchPayload.routes[0]!.groups[0]!,
                      conditions: [
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          contextFactDefinitionId: "ctx-json-metadata",
                          subFieldKey: "path",
                          operator: "starts_with",
                          comparisonJson: { value: "src/" },
                        },
                        {
                          ...branchPayload.routes[0]!.groups[0]!.conditions[0]!,
                          conditionId: "cond-hours-range",
                          contextFactDefinitionId: "ctx-json-metadata",
                          subFieldKey: "estimatedHours",
                          operator: "between",
                          comparisonJson: { min: 1, max: 8 },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(created.stepId).toBe("step-branch-1");
  });

  it("branch create tolerates unrelated malformed keyed steps without payload.key", async () => {
    const { layer } = makeLayer({ includeMalformedInvokeStepWithoutKey: true });

    const created = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;

        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: branchPayload,
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(created.stepId).toBe("step-branch-1");
  });

  it("branch create resolves deferred invoke targets by step definition id", async () => {
    const { layer, createdProjectedEdges } = makeLayer({ includeDeferredInvokeTargetShell: true });

    const created = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* BranchStepDefinitionService;

        return yield* service.createBranchStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: branchPayload,
          },
          "user-1",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(created.stepId).toBe("step-branch-1");
    expect(createdProjectedEdges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ fromStepKey: "branch-on-status", toStepKey: "route-a-step" }),
      ]),
    );
  });
});
