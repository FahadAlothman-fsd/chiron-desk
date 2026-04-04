import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyRepository } from "../../repository";
import {
  WorkflowEditorDefinitionService,
  WorkflowEditorDefinitionServiceLive,
} from "../../services/workflow-editor-definition-service";
import { WorkflowService, WorkflowServiceLive } from "../../services/workflow-service";
import {
  WorkflowTopologyMutationService,
  WorkflowTopologyMutationServiceLive,
} from "../../services/workflow-topology-mutation-service";
import {
  FormStepDefinitionService,
  FormStepDefinitionServiceLive,
} from "../../services/form-step-definition-service";
import {
  WorkflowContextFactDefinitionService,
  WorkflowContextFactDefinitionServiceLive,
} from "../../services/workflow-context-fact-definition-service";

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

function makeRepo() {
  const edges = [
    {
      edgeId: "edge-1",
      fromStepKey: "step-a",
      toStepKey: "step-b",
      descriptionJson: { markdown: "a->b" },
      condition: null,
    },
  ] as Array<{
    edgeId: string;
    fromStepKey: string | null;
    toStepKey: string | null;
    descriptionJson?: { markdown: string };
    condition?: unknown;
  }>;

  const formSteps = new Map<string, { stepId: string; payload: any }>();
  formSteps.set("step-a", {
    stepId: "step-a",
    payload: {
      key: "step-a",
      label: "A",
      descriptionJson: { markdown: "A" },
      fields: [],
      contextFacts: [],
    },
  });

  const contextFacts = new Map<string, any>();
  contextFacts.set("plain.fact", { kind: "plain_value", key: "plain.fact", valueType: "string" });

  return {
    findVersionById: () => Effect.succeed(versionRow),
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
    getWorkflowEditorDefinition: () =>
      Effect.succeed({
        workflow: {
          workflowDefinitionId: "wf-1",
          key: "wu.setup",
          displayName: "Setup",
          descriptionJson: { markdown: "Setup workflow" },
        },
        steps: [
          { stepId: "step-a", stepType: "form", payload: formSteps.get("step-a")!.payload },
          {
            stepId: "step-b",
            stepType: "agent",
            mode: "deferred",
            defaultMessage: "Deferred in slice-1",
          },
        ],
        edges,
        contextFacts: [...contextFacts.values()],
        formDefinitions: [...formSteps.values()],
      }),
    updateWorkflowMetadataByDefinitionId: (input: any) =>
      Effect.succeed({
        workflowDefinitionId: input.workflowDefinitionId,
        key: input.key,
        displayName: input.displayName,
        descriptionJson: input.descriptionJson,
      }),
    listWorkflowEdgesByDefinitionId: () => Effect.succeed(edges),
    createWorkflowEdgeByDefinitionId: (input: any) =>
      Effect.sync(() => {
        const edge = {
          edgeId: `edge-${edges.length + 1}`,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson,
          condition: input.condition,
        };
        edges.push(edge);
        return edge;
      }),
    updateWorkflowEdgeByDefinitionId: (input: any) =>
      Effect.sync(() => {
        const index = edges.findIndex((edge) => edge.edgeId === input.edgeId);
        if (index >= 0) {
          edges[index] = {
            edgeId: input.edgeId,
            fromStepKey: input.fromStepKey,
            toStepKey: input.toStepKey,
            descriptionJson: input.descriptionJson,
            condition: input.condition,
          };
        }
        return edges[index]!;
      }),
    deleteWorkflowEdgeByDefinitionId: (input: any) =>
      Effect.sync(() => {
        const index = edges.findIndex((edge) => edge.edgeId === input.edgeId);
        if (index >= 0) {
          edges.splice(index, 1);
        }
      }),
    createWorkflowFormStep: (input: any) =>
      Effect.sync(() => {
        const stepId = `step-${formSteps.size + 1}`;
        const step = { stepId, payload: input.payload };
        formSteps.set(stepId, step);
        return step;
      }),
    updateWorkflowFormStep: (input: any) =>
      Effect.sync(() => {
        const updated = { stepId: input.stepId, payload: input.payload };
        formSteps.set(input.stepId, updated);
        return updated;
      }),
    deleteWorkflowFormStep: (input: any) =>
      Effect.sync(() => {
        formSteps.delete(input.stepId);
      }),
    listWorkflowContextFactsByDefinitionId: () => Effect.succeed([...contextFacts.values()]),
    createWorkflowContextFactByDefinitionId: (input: any) =>
      Effect.sync(() => {
        contextFacts.set(input.fact.key, input.fact);
        return input.fact;
      }),
    updateWorkflowContextFactByDefinitionId: (input: any) =>
      Effect.sync(() => {
        contextFacts.delete(input.factKey);
        contextFacts.set(input.fact.key, input.fact);
        return input.fact;
      }),
    deleteWorkflowContextFactByDefinitionId: (input: any) =>
      Effect.sync(() => {
        contextFacts.delete(input.factKey);
      }),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;
}

function makeLayer() {
  const repoLayer = Layer.succeed(MethodologyRepository, makeRepo());
  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    getLifecycleDefinition: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);
  const dependencies = Layer.mergeAll(repoLayer, lifecycleRepoLayer);

  return Layer.mergeAll(
    Layer.provide(WorkflowEditorDefinitionServiceLive, dependencies),
    Layer.provide(WorkflowServiceLive, dependencies),
    Layer.provide(WorkflowTopologyMutationServiceLive, dependencies),
    Layer.provide(FormStepDefinitionServiceLive, dependencies),
    Layer.provide(WorkflowContextFactDefinitionServiceLive, dependencies),
  );
}

describe("l3 slice-1 workflow editor services", () => {
  it("returns full editor definition", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const svc = yield* WorkflowEditorDefinitionService;
        return yield* svc.getEditorDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
        });
      }).pipe(Effect.provide(makeLayer())),
    );

    expect(result.workflow.workflowDefinitionId).toBe("wf-1");
    expect(result.steps).toHaveLength(2);
    expect(result.edges).toHaveLength(1);
    expect(result.contextFacts).toHaveLength(1);
    expect(result.formDefinitions).toHaveLength(1);

    const formStep = result.steps.find((step) => step.stepType === "form");
    const deferredStep = result.steps.find((step) => step.stepType === "agent");

    expect(formStep).toMatchObject({
      stepId: "step-a",
      stepType: "form",
      payload: { key: "step-a" },
    });
    expect(deferredStep).toMatchObject({
      stepId: "step-b",
      stepType: "agent",
      mode: "deferred",
      defaultMessage: "Deferred in slice-1",
    });
    expect(result.formDefinitions.map((definition) => definition.stepId)).toEqual(["step-a"]);
  });

  it("supports metadata/form/context-fact CRUD", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const workflows = yield* WorkflowService;
        const forms = yield* FormStepDefinitionService;
        const contextFacts = yield* WorkflowContextFactDefinitionService;

        yield* workflows.updateWorkflowMetadata(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            payload: {
              workflowDefinitionId: "wf-1",
              key: "wu.setup.updated",
              displayName: "Updated",
              descriptionJson: { markdown: "updated" },
            },
          },
          "tester",
        );

        const created = yield* forms.createFormStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            afterStepKey: null,
            payload: {
              key: "capture",
              label: "Capture",
              descriptionJson: { markdown: "Capture" },
              fields: [],
              contextFacts: [],
            },
          },
          "tester",
        );

        yield* forms.updateFormStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
            payload: {
              key: "capture.v2",
              label: "Capture v2",
              descriptionJson: { markdown: "Capture v2" },
              fields: [],
              contextFacts: [],
            },
          },
          "tester",
        );

        yield* contextFacts.create(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            fact: { kind: "plain_value", key: "new.fact", valueType: "string" },
          },
          "tester",
        );

        const listed = yield* contextFacts.list({
          versionId: "ver-1",
          workflowDefinitionId: "wf-1",
        });

        yield* contextFacts.delete(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            factKey: "new.fact",
          },
          "tester",
        );

        yield* forms.deleteFormStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            stepId: created.stepId,
          },
          "tester",
        );

        return listed;
      }).pipe(Effect.provide(makeLayer())),
    );

    expect(result.find((fact) => fact.key === "new.fact")).toBeDefined();
  });

  it("enforces one outgoing edge invariant", async () => {
    await expect(
      Effect.runPromise(
        Effect.gen(function* () {
          const svc = yield* WorkflowTopologyMutationService;
          yield* svc.createEdge(
            {
              versionId: "ver-1",
              workUnitTypeKey: "WU.STORY",
              workflowDefinitionId: "wf-1",
              fromStepKey: "step-a",
              toStepKey: "step-z",
              descriptionJson: { markdown: "duplicate" },
            },
            "tester",
          );
        }).pipe(Effect.provide(makeLayer())),
      ),
    ).rejects.toThrow(/one outgoing edge/i);
  });
});
