import { call } from "@orpc/server";
import { describe, expect, it } from "vitest";
import { Effect, Layer } from "effect";

import {
  FormStepDefinitionService,
  MethodologyRepository,
  WorkflowContextFactDefinitionService,
  WorkflowEditorDefinitionService,
  WorkflowService,
  WorkflowTopologyMutationService,
} from "@chiron/methodology-engine";
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

const PUBLIC_CTX = { context: { session: null } };

function makeServiceLayer() {
  return Layer.mergeAll(
    Layer.succeed(WorkflowEditorDefinitionService, {
      getEditorDefinition: () =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "wf-1",
            key: "wu.setup",
            displayName: "Setup",
            descriptionJson: { markdown: "Setup" },
          },
          steps: [],
          edges: [],
          contextFacts: [
            {
              contextFactDefinitionId: "ctx-summary",
              kind: "plain_fact",
              key: "summary",
              cardinality: "one",
              guidance: {
                human: { markdown: "Capture the reusable summary." },
                agent: { markdown: "Preserve the authored summary." },
              },
              type: "string",
            },
          ],
          formDefinitions: [
            {
              stepId: "step-1",
              payload: {
                key: "capture",
                label: "Capture",
                descriptionJson: { markdown: "Capture" },
                guidance: {
                  human: { markdown: "Ask for the reusable summary." },
                  agent: { markdown: "Normalize the summary for downstream steps." },
                },
                fields: [
                  {
                    contextFactDefinitionId: "ctx-summary",
                    fieldLabel: "Summary",
                    fieldKey: "summary",
                    helpText: null,
                    required: true,
                  },
                ],
              },
            },
          ],
        }),
    }),
    Layer.succeed(MethodologyRepository, {
      findVersionById: () =>
        Effect.succeed({
          id: "ver-1",
          methodologyId: "meth-1",
          version: "draft",
          status: "draft",
          displayName: "Draft",
          definitionExtensions: null,
          createdAt: new Date(0),
          retiredAt: null,
        }),
      getWorkflowEditorDefinition: () =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "wf-1",
            key: "wu.setup",
            displayName: "Setup",
            descriptionJson: { markdown: "Setup" },
          },
          steps: [
            {
              stepId: "step-a",
              stepType: "form",
              payload: { key: "step-a", fields: [] },
            },
            {
              stepId: "step-b",
              stepType: "form",
              payload: { key: "step-b", fields: [] },
            },
          ],
          edges: [],
          contextFacts: [],
          formDefinitions: [],
        }),
    } as any),
    Layer.succeed(WorkflowService, {
      listWorkUnitWorkflows: () =>
        Effect.succeed([
          {
            workflowDefinitionId: "wf-1",
            key: "wu.setup",
            displayName: "Setup",
            description: { markdown: "Setup" },
            workUnitTypeKey: "WU.STORY",
            steps: [],
            edges: [],
          },
        ]),
      createWorkUnitWorkflow: () =>
        Effect.die(new Error("createWorkUnitWorkflow not expected in this test")),
      updateWorkUnitWorkflow: () =>
        Effect.die(new Error("updateWorkUnitWorkflow not expected in this test")),
      deleteWorkUnitWorkflow: () =>
        Effect.die(new Error("deleteWorkUnitWorkflow not expected in this test")),
      updateWorkflowDefinition: () => Effect.void,
      updateWorkflowMetadata: (_input: unknown) =>
        Effect.succeed({
          workflow: {
            workflowDefinitionId: "wf-1",
            key: "wu.updated",
            displayName: "Updated",
            descriptionJson: { markdown: "Updated" },
          },
        }),
    }),
    Layer.succeed(FormStepDefinitionService, {
      createFormStep: () =>
        Effect.succeed({
          stepId: "step-1",
          payload: {
            key: "capture",
            label: "Capture",
            descriptionJson: { markdown: "Capture" },
            guidance: {
              human: { markdown: "Ask for the reusable summary." },
              agent: { markdown: "Normalize the summary for downstream steps." },
            },
            fields: [
              {
                contextFactDefinitionId: "ctx-summary",
                fieldLabel: "Summary",
                fieldKey: "summary",
                helpText: null,
                required: true,
              },
            ],
          },
        }),
      updateFormStep: () =>
        Effect.succeed({
          stepId: "step-1",
          payload: {
            key: "capture.v2",
            label: "Capture v2",
            descriptionJson: { markdown: "Capture v2" },
            guidance: {
              human: { markdown: "Confirm the reusable workflow set." },
              agent: { markdown: "Preserve workflow ids in order." },
            },
            fields: [
              {
                contextFactDefinitionId: "ctx-supporting-workflows",
                fieldLabel: "Supporting Workflows",
                fieldKey: "supportingWorkflows",
                helpText: null,
                required: false,
                uiMultiplicityMode: "one",
              },
            ],
          },
        }),
      deleteFormStep: () => Effect.void,
    }),
    Layer.succeed(WorkflowTopologyMutationService, {
      createEdge: () =>
        Effect.succeed({
          edgeId: "edge-1",
          fromStepKey: "step-a",
          toStepKey: "step-b",
          descriptionJson: { markdown: "A to B" },
        }),
      updateEdge: () =>
        Effect.succeed({
          edgeId: "edge-1",
          fromStepKey: "step-a",
          toStepKey: "step-c",
          descriptionJson: { markdown: "A to C" },
        }),
      deleteEdge: () => Effect.void,
    }),
    Layer.succeed(WorkflowContextFactDefinitionService, {
      list: () =>
        Effect.succeed([
          {
            contextFactDefinitionId: "ctx-summary",
            kind: "plain_fact",
            key: "summary",
            cardinality: "one",
            guidance: {
              human: { markdown: "Capture the reusable summary." },
              agent: { markdown: "Preserve the authored summary." },
            },
            type: "string",
          },
        ]),
      create: () =>
        Effect.succeed({
          contextFactDefinitionId: "ctx-fact-b",
          kind: "plain_fact",
          key: "fact.b",
          cardinality: "one",
          type: "string",
        }),
      update: () =>
        Effect.succeed({
          contextFactDefinitionId: "ctx-fact-c",
          kind: "workflow_ref_fact",
          key: "fact.c",
          cardinality: "many",
          allowedWorkflowDefinitionIds: ["wf.review"],
        }),
      delete: () => Effect.void,
    }),
  );
}

describe("l3 slice-1 methodology router", () => {
  it("wires workflow authoring procedures under version.workUnit.workflow", () => {
    const router = createMethodologyRouter(makeServiceLayer());
    const workflow = (router.version.workUnit.workflow as Record<string, unknown>) ?? {};
    const contextFact = (workflow.contextFact as Record<string, unknown>) ?? {};

    expect(workflow.getEditorDefinition).toBeDefined();
    expect(workflow.updateWorkflowMetadata).toBeDefined();
    expect(workflow.createFormStep).toBeDefined();
    expect(workflow.updateFormStep).toBeDefined();
    expect(workflow.deleteFormStep).toBeDefined();
    expect(workflow.createEdge).toBeDefined();
    expect(workflow.updateEdge).toBeDefined();
    expect(workflow.deleteEdge).toBeDefined();
    expect(contextFact.list).toBeDefined();
    expect(contextFact.create).toBeDefined();
    expect(contextFact.update).toBeDefined();
    expect(contextFact.delete).toBeDefined();
  });

  it("executes editor + mutation procedures", async () => {
    const router = createMethodologyRouter(makeServiceLayer());

    const editor = await call(
      router.version.workUnit.workflow.getEditorDefinition,
      {
        methodologyId: "meth-1",
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
      },
      PUBLIC_CTX,
    );

    const metadata = await call(
      router.version.workUnit.workflow.updateWorkflowMetadata,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        payload: {
          workflowDefinitionId: "wf-1",
          key: "wu.updated",
          displayName: "Updated",
          descriptionJson: { markdown: "Updated" },
        },
      },
      AUTHENTICATED_CTX,
    );

    const createdStep = await call(
      router.version.workUnit.workflow.createFormStep,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        afterStepKey: null,
        payload: {
          key: "capture",
          label: "Capture",
          descriptionJson: { markdown: "Capture" },
          guidance: {
            human: { markdown: "Ask for the reusable summary." },
            agent: { markdown: "Normalize the summary for downstream steps." },
          },
          fields: [
            {
              contextFactDefinitionId: "ctx-summary",
              fieldLabel: "Summary",
              fieldKey: "summary",
              helpText: null,
              required: true,
            },
          ],
        },
      },
      AUTHENTICATED_CTX,
    );

    const edge = await call(
      router.version.workUnit.workflow.createEdge,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
        workflowDefinitionId: "wf-1",
        fromStepKey: "step-a",
        toStepKey: "step-b",
        descriptionJson: { markdown: "A to B" },
      },
      AUTHENTICATED_CTX,
    );

    const facts = await call(
      router.version.workUnit.workflow.contextFact.list,
      {
        versionId: "ver-1",
        workflowDefinitionId: "wf-1",
      },
      PUBLIC_CTX,
    );

    expect(editor.workflow.workflowDefinitionId).toBe("wf-1");
    expect(editor.contextFacts).toEqual([
      {
        contextFactDefinitionId: "ctx-summary",
        kind: "plain_fact",
        key: "summary",
        cardinality: "one",
        guidance: {
          human: { markdown: "Capture the reusable summary." },
          agent: { markdown: "Preserve the authored summary." },
        },
        type: "string",
      },
    ]);
    expect(editor.formDefinitions).toEqual([
      expect.objectContaining({
        stepId: "step-1",
        payload: expect.objectContaining({
          fields: [
            expect.objectContaining({
              contextFactDefinitionId: "ctx-summary",
              fieldLabel: "Summary",
              fieldKey: "summary",
            }),
          ],
          guidance: {
            human: { markdown: "Ask for the reusable summary." },
            agent: { markdown: "Normalize the summary for downstream steps." },
          },
        }),
      }),
    ]);
    expect(metadata.workflow.key).toBe("wu.updated");
    expect(createdStep.stepId).toBe("step-1");
    expect(createdStep.payload.fields).toEqual([
      expect.objectContaining({
        contextFactDefinitionId: "ctx-summary",
        fieldLabel: "Summary",
        fieldKey: "summary",
      }),
    ]);
    expect(edge.edgeId).toBe("edge-1");
    expect(facts).toEqual([
      {
        contextFactDefinitionId: "ctx-summary",
        kind: "plain_fact",
        key: "summary",
        cardinality: "one",
        guidance: {
          human: { markdown: "Capture the reusable summary." },
          agent: { markdown: "Preserve the authored summary." },
        },
        type: "string",
      },
    ]);
  });

  it("returns canonical workflowDefinitionId from workflow list", async () => {
    const router = createMethodologyRouter(makeServiceLayer());

    const workflows = await call(
      router.version.workUnit.workflow.list,
      {
        versionId: "ver-1",
        workUnitTypeKey: "WU.STORY",
      },
      PUBLIC_CTX,
    );

    expect(workflows).toEqual([
      expect.objectContaining({
        workflowDefinitionId: "wf-1",
        key: "wu.setup",
      }),
    ]);
  });
});
