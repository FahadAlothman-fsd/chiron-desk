import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyRepository } from "../../repository";
import {
  WorkflowEditorDefinitionService,
  WorkflowEditorDefinitionServiceLive,
} from "../../services/workflow-editor-definition-service";
import { WorkflowServiceLive } from "../../services/workflow-service";
import { WorkflowTopologyMutationServiceLive } from "../../services/workflow-topology-mutation-service";
import {
  FormStepDefinitionService,
  FormStepDefinitionServiceLive,
} from "../../services/form-step-definition-service";
import {
  WorkflowContextFactDefinitionService,
  WorkflowContextFactDefinitionServiceLive,
} from "../../services/workflow-context-fact-definition-service";
import {
  WorkflowAuthoringTransactionService,
  WorkflowAuthoringTransactionServiceLive,
} from "../../services/workflow-authoring-transaction-service";
import { AgentStepDefinitionService } from "../../services/agent-step-definition-service";
import { RepositoryError } from "../../errors";

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
    },
  ];

  const formSteps = new Map<string, { stepId: string; payload: any }>();
  formSteps.set("step-a", {
    stepId: "step-a",
    payload: {
      key: "step-a",
      label: "Capture",
      descriptionJson: { markdown: "Capture reusable context" },
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
  });

  const contextFacts = new Map<string, any>();
  contextFacts.set("ctx-summary", {
    contextFactDefinitionId: "ctx-summary",
    kind: "plain_value_fact",
    key: "summary",
    cardinality: "one",
    valueType: "string",
  });

  const repo = {
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
        };
        edges.push(edge);
        return edge;
      }),
    updateWorkflowEdgeByDefinitionId: (input: any) =>
      Effect.sync(() => {
        const index = edges.findIndex((edge) => edge.edgeId === input.edgeId);
        edges[index] = {
          edgeId: input.edgeId,
          fromStepKey: input.fromStepKey,
          toStepKey: input.toStepKey,
          descriptionJson: input.descriptionJson,
        };
        return edges[index]!;
      }),
    deleteWorkflowEdgeByDefinitionId: (input: any) =>
      Effect.sync(() => {
        const index = edges.findIndex((edge) => edge.edgeId === input.edgeId);
        if (index >= 0) {
          edges.splice(index, 1);
        }
      }),
    createFormStepDefinition: (input: any) =>
      Effect.sync(() => {
        const stepId = `step-${formSteps.size + 1}`;
        const step = { stepId, payload: input.payload };
        formSteps.set(stepId, step);
        return step;
      }),
    updateFormStepDefinition: (input: any) =>
      Effect.sync(() => {
        const updated = { stepId: input.stepId, payload: input.payload };
        formSteps.set(input.stepId, updated);
        return updated;
      }),
    deleteFormStepDefinition: (input: any) =>
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
        const current = contextFacts.get(input.contextFactDefinitionId);
        const updated = { ...input.fact, contextFactDefinitionId: input.contextFactDefinitionId };
        if (current) {
          contextFacts.set(input.contextFactDefinitionId, updated);
        }
        return updated;
      }),
    deleteWorkflowContextFactByDefinitionId: (input: any) =>
      Effect.suspend(() => {
        const inUse = [...formSteps.values()].some((step) =>
          step.payload.fields.some(
            (field: any) => field.contextFactDefinitionId === input.contextFactDefinitionId,
          ),
        );
        if (inUse) {
          return Effect.fail(
            new RepositoryError({
              operation: "workflowContextFact.delete",
              cause: new Error(
                `Workflow context fact '${input.contextFactDefinitionId}' is still bound`,
              ),
            }),
          );
        }

        contextFacts.delete(input.contextFactDefinitionId);
        return Effect.void;
      }),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>;

  return repo;
}

function makeLayer() {
  const repoLayer = Layer.succeed(MethodologyRepository, makeRepo());
  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    getLifecycleDefinition: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);
  const dependencies = Layer.mergeAll(repoLayer, lifecycleRepoLayer);
  const workflowServiceLayer = Layer.provide(WorkflowServiceLive, dependencies);
  const workflowTopologyLayer = Layer.provide(WorkflowTopologyMutationServiceLive, dependencies);
  const formStepLayer = Layer.provide(FormStepDefinitionServiceLive, dependencies);
  const contextFactLayer = Layer.provide(WorkflowContextFactDefinitionServiceLive, dependencies);
  const agentStepLayer = Layer.succeed(AgentStepDefinitionService, {
    createAgentStep: () => Effect.die("unused"),
    updateAgentStep: () => Effect.die("unused"),
    deleteAgentStep: () => Effect.die("unused"),
  } as unknown as Context.Tag.Service<typeof AgentStepDefinitionService>);

  return Layer.mergeAll(
    Layer.provide(WorkflowEditorDefinitionServiceLive, dependencies),
    workflowServiceLayer,
    workflowTopologyLayer,
    formStepLayer,
    agentStepLayer,
    contextFactLayer,
    Layer.provide(
      WorkflowAuthoringTransactionServiceLive,
      Layer.mergeAll(
        workflowServiceLayer,
        workflowTopologyLayer,
        formStepLayer,
        agentStepLayer,
        contextFactLayer,
      ),
    ),
  );
}

function runWithLayer<A>(effect: unknown): Promise<A> {
  return Effect.runPromise((effect as any).pipe(Effect.provide(makeLayer() as any))) as Promise<A>;
}

describe("l3 slice-1 workflow editor services", () => {
  it("returns workflow-level context facts separately from form definitions", async () => {
    const result = await runWithLayer<any>(
      Effect.gen(function* () {
        const svc = yield* WorkflowEditorDefinitionService;
        return yield* svc.getEditorDefinition({
          methodologyId: "meth-1",
          versionId: "ver-1",
          workUnitTypeKey: "WU.STORY",
          workflowDefinitionId: "wf-1",
        });
      }),
    );

    expect(result.workflow.workflowDefinitionId).toBe("wf-1");
    expect(result.contextFacts).toEqual([
      {
        contextFactDefinitionId: "ctx-summary",
        kind: "plain_value_fact",
        key: "summary",
        cardinality: "one",
        valueType: "string",
      },
    ]);
    expect(result.formDefinitions).toEqual([
      {
        stepId: "step-a",
        payload: {
          key: "step-a",
          label: "Capture",
          descriptionJson: { markdown: "Capture reusable context" },
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
    ]);
  });

  it("enforces kind locks, dependency-aware deletes, and context-fact-backed form bindings", async () => {
    const program = Effect.gen(function* () {
      const forms = yield* FormStepDefinitionService;
      const contextFactService = yield* WorkflowContextFactDefinitionService;

      const invalidCreate = yield* Effect.either(
        forms.createFormStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            afterStepKey: null,
            payload: {
              key: "invalid",
              fields: [
                {
                  contextFactDefinitionId: "missing",
                  fieldLabel: "Missing",
                  fieldKey: "missing",
                  helpText: null,
                  required: false,
                },
              ],
            },
          },
          "tester",
        ),
      );

      const invalidMultiplicity = yield* Effect.either(
        forms.createFormStep(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            afterStepKey: null,
            payload: {
              key: "invalid-multiplicity",
              fields: [
                {
                  contextFactDefinitionId: "summary",
                  fieldLabel: "Summary",
                  fieldKey: "summary",
                  helpText: null,
                  required: false,
                  uiMultiplicityMode: "many",
                },
              ],
            },
          },
          "tester",
        ),
      );

      const invalidKindUpdate = yield* Effect.either(
        contextFactService.update(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            contextFactDefinitionId: "ctx-summary",
            fact: {
              kind: "artifact_reference_fact",
              key: "summary",
              cardinality: "one",
              artifactSlotDefinitionId: "ART.PRD",
            },
          },
          "tester",
        ),
      );

      const blockedDelete = yield* Effect.either(
        contextFactService.delete(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            contextFactDefinitionId: "ctx-summary",
          },
          "tester",
        ),
      );

      return { invalidCreate, invalidMultiplicity, invalidKindUpdate, blockedDelete };
    }).pipe(Effect.provide(makeLayer()));

    const result = await runWithLayer<any>(program);

    expect(result.invalidCreate._tag).toBe("Left");
    expect(result.invalidMultiplicity._tag).toBe("Left");
    expect(result.invalidKindUpdate._tag).toBe("Left");
    expect(result.blockedDelete._tag).toBe("Left");
  });

  it("orders authoring mutations so new context facts can be bound in the same call", async () => {
    const result = await runWithLayer<any>(
      Effect.gen(function* () {
        const tx = yield* WorkflowAuthoringTransactionService;

        return yield* tx.applyMutation(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            createContextFact: {
              kind: "plain_value_fact",
              key: "objective",
              cardinality: "one",
              valueType: "string",
            },
            createFormStep: {
              afterStepKey: null,
              payload: {
                key: "capture-objective",
                fields: [
                  {
                    contextFactDefinitionId: "objective",
                    fieldLabel: "Objective",
                    fieldKey: "objective",
                    helpText: null,
                    required: true,
                  },
                ],
              },
            },
          },
          "tester",
        );
      }),
    );

    expect(result).toEqual({ ok: true });
  });
});
