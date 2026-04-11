import { call } from "@orpc/server";
import { Context, Effect, Layer } from "effect";
import { describe, expect, it } from "vitest";

import type { BranchStepPayload, InvokeStepPayload } from "@chiron/contracts/methodology/workflow";
import { MethodologyRepository } from "@chiron/methodology-engine";

import { createMethodologyRouter } from "../../routers/methodology";

const AUTHENTICATED_CTX = {
  context: {
    session: {
      session: {
        id: "session-1",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        userId: "user-1",
        expiresAt: new Date("2099-01-01T00:00:00.000Z"),
        token: "token",
        ipAddress: null,
        userAgent: null,
      },
      user: {
        id: "user-1",
        email: "tester@example.com",
        emailVerified: true,
        name: "Tester",
        createdAt: new Date(0),
        updatedAt: new Date(0),
        image: null,
      },
    },
  },
};

const invokePayload: InvokeStepPayload = {
  key: "invoke-story-work",
  label: "Invoke story work",
  targetKind: "work_unit",
  sourceMode: "fixed_set",
  workUnitDefinitionId: "wut-story",
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
      workflowDefinitionIds: ["wf-story", "wf-review"],
    },
  ],
};

const branchPayload: BranchStepPayload = {
  key: "branch-on-status",
  label: "Branch on status",
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
              contextFactKind: "plain_value_fact",
              operator: "isNotEmpty",
              isNegated: false,
              comparisonJson: null,
            },
          ],
        },
      ],
    },
  ],
};

function makeServiceLayer() {
  const createdPayloads: Array<InvokeStepPayload> = [];
  const updatedPayloads: Array<InvokeStepPayload> = [];
  const deletedStepIds: Array<string> = [];
  const createdBranchPayloads: Array<BranchStepPayload> = [];
  const updatedBranchPayloads: Array<BranchStepPayload> = [];
  const deletedBranchStepIds: Array<string> = [];
  const currentEdges: Array<{
    edgeId: string;
    fromStepKey: string | null;
    toStepKey: string | null;
    descriptionJson?: unknown;
  }> = [
    {
      edgeId: "edge-branch-projected",
      fromStepKey: "branch-on-status",
      toStepKey: "route-a-step",
      descriptionJson: {
        markdown: "",
        edgeOwner: "branch_conditional",
        branchStepId: "step-branch-1",
        routeId: "route-ready",
      },
    },
  ];
  let edgeCounter = 1;

  const repo = {
    findVersionById: () =>
      Effect.succeed({
        id: "ver-1",
        methodologyId: "meth-1",
        version: "v1",
        status: "draft",
        displayName: "Draft",
        definitionExtensions: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        retiredAt: null,
      }),
    listWorkflowContextFactsByDefinitionId: () =>
      Effect.succeed([
        {
          contextFactDefinitionId: "ctx-summary",
          kind: "plain_value_fact",
          key: "summary",
          label: "Summary",
          cardinality: "one",
          valueType: "string",
        },
        {
          contextFactDefinitionId: "ctx-story-draft",
          kind: "work_unit_draft_spec_fact",
          key: "storyDraft",
          label: "Story Draft",
          cardinality: "one",
          workUnitDefinitionId: "wut-story",
          selectedWorkUnitFactDefinitionIds: ["fact-title"],
          selectedArtifactSlotDefinitionIds: [],
        },
      ]),
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
      ]),
    findInvokeBindingArtifactSlotDefinitionsByIds: () => Effect.succeed([]),
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
        steps: [
          {
            stepId: "step-default",
            stepType: "form",
            payload: { key: "default-step", fields: [] },
          },
          {
            stepId: "step-route-a",
            stepType: "invoke",
            payload: {
              key: "route-a-step",
              targetKind: "workflow",
              sourceMode: "fixed_set",
              workflowDefinitionIds: ["wf-story"],
            },
          },
          {
            stepId: "step-branch-1",
            stepType: "branch",
            payload: { key: "branch-on-status", defaultTargetStepId: "step-default", routes: [] },
          },
        ],
        edges: currentEdges,
        contextFacts: [
          {
            contextFactDefinitionId: "ctx-summary",
            kind: "plain_value_fact",
            key: "summary",
            label: "Summary",
            cardinality: "one",
            valueType: "string",
          },
        ],
        formDefinitions: [],
      }),
    listWorkflowEdgesByDefinitionId: () =>
      Effect.sync(() => currentEdges.map((edge) => ({ ...edge }))),
    createWorkflowEdgeByDefinitionId: (input: {
      fromStepKey: string | null;
      toStepKey: string | null;
      descriptionJson: unknown;
    }) =>
      Effect.sync(() => {
        const edgeId = `edge-${++edgeCounter}`;
        currentEdges.push({ ...input, edgeId });
        return { edgeId, ...input };
      }),
    deleteWorkflowEdgeByDefinitionId: (input: { edgeId: string }) =>
      Effect.sync(() => {
        const index = currentEdges.findIndex((edge) => edge.edgeId === input.edgeId);
        if (index >= 0) {
          currentEdges.splice(index, 1);
        }
      }),
    recordEvent: () =>
      Effect.succeed({
        id: crypto.randomUUID(),
        methodologyVersionId: "ver-1",
        eventType: "workflows_updated",
        actorId: "tester",
        changedFieldsJson: {},
        diagnosticsJson: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
  } as Context.Tag.Service<typeof MethodologyRepository>;

  return {
    createdPayloads,
    updatedPayloads,
    deletedStepIds,
    createdBranchPayloads,
    updatedBranchPayloads,
    deletedBranchStepIds,
    layer: Layer.succeed(MethodologyRepository, repo),
  };
}

describe("l3 design-time invoke branch router invoke procedures", () => {
  it("invoke wires thin create/update/delete procedures", async () => {
    const { layer, createdPayloads, updatedPayloads, deletedStepIds } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    expect(router.version.workUnit.workflow.createInvokeStep).toBeDefined();
    expect(router.version.workUnit.workflow.updateInvokeStep).toBeDefined();
    expect(router.version.workUnit.workflow.deleteInvokeStep).toBeDefined();

    const created = await call(
      router.version.workUnit.workflow.createInvokeStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        payload: invokePayload,
      },
      AUTHENTICATED_CTX,
    );

    const updated = await call(
      router.version.workUnit.workflow.updateInvokeStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-invoke-1",
        payload: {
          ...invokePayload,
          label: "Invoke story work v2",
          activationTransitions: [],
        },
      },
      AUTHENTICATED_CTX,
    );

    await call(
      router.version.workUnit.workflow.deleteInvokeStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-invoke-1",
      },
      AUTHENTICATED_CTX,
    );

    expect(created.stepId).toBe("step-invoke-1");
    expect(created.payload).toEqual(invokePayload);
    expect(updated.payload.label).toBe("Invoke story work v2");
    expect(createdPayloads).toEqual([invokePayload]);
    expect(updatedPayloads).toEqual([
      expect.objectContaining({ label: "Invoke story work v2", activationTransitions: [] }),
    ]);
    expect(deletedStepIds).toEqual(["step-invoke-1"]);
  });

  it("invoke rejects invalid workflow-target combinations", async () => {
    const { layer } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    await expect(
      call(
        router.version.workUnit.workflow.createInvokeStep,
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          payload: {
            key: "invoke-workflows",
            targetKind: "workflow",
            sourceMode: "fixed_set",
            workflowDefinitionIds: ["wf-story"],
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
          },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Input validation failed",
    });
  });

  it("branch wires thin create/update/delete procedures", async () => {
    const { layer, createdBranchPayloads, updatedBranchPayloads, deletedBranchStepIds } =
      makeServiceLayer();
    const router = createMethodologyRouter(layer);

    expect(router.version.workUnit.workflow.createBranchStep).toBeDefined();
    expect(router.version.workUnit.workflow.updateBranchStep).toBeDefined();
    expect(router.version.workUnit.workflow.deleteBranchStep).toBeDefined();

    const created = await call(
      router.version.workUnit.workflow.createBranchStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        payload: branchPayload,
      },
      AUTHENTICATED_CTX,
    );

    const updated = await call(
      router.version.workUnit.workflow.updateBranchStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-branch-1",
        payload: {
          ...branchPayload,
          label: "Branch on status v2",
          defaultTargetStepId: null,
        },
      },
      AUTHENTICATED_CTX,
    );

    await call(
      router.version.workUnit.workflow.deleteBranchStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        stepId: "step-branch-1",
      },
      AUTHENTICATED_CTX,
    );

    expect(created.stepId).toBe("step-branch-1");
    expect(created.payload).toEqual(branchPayload);
    expect(updated.payload.label).toBe("Branch on status v2");
    expect(createdBranchPayloads).toEqual([branchPayload]);
    expect(updatedBranchPayloads).toEqual([
      expect.objectContaining({ label: "Branch on status v2", defaultTargetStepId: null }),
    ]);
    expect(deletedBranchStepIds).toEqual(["step-branch-1"]);
  });

  it("branch rejects invalid structures and generic edits of branch-owned edges", async () => {
    const { layer } = makeServiceLayer();
    const router = createMethodologyRouter(layer);

    await expect(
      call(
        router.version.workUnit.workflow.createBranchStep,
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          payload: {
            ...branchPayload,
            routes: [
              branchPayload.routes[0]!,
              { ...branchPayload.routes[0]!, routeId: "route-dup", targetStepId: "step-route-a" },
            ],
          },
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow(/unique targetStepId values/);

    await expect(
      call(
        router.version.workUnit.workflow.createEdge,
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          fromStepKey: "branch-on-status",
          toStepKey: "route-a-step",
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow(/cannot author outgoing topology for branch steps/);

    await expect(
      call(
        router.version.workUnit.workflow.deleteEdge,
        {
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
          edgeId: "edge-branch-projected",
        },
        AUTHENTICATED_CTX,
      ),
    ).rejects.toThrow(/cannot modify projected branch-owned edges/);
  });
});
