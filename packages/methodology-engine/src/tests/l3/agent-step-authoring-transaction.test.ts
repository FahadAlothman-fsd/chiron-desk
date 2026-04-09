import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step";
import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { AgentStepDefinitionService } from "../../services/agent-step-definition-service";
import { FormStepDefinitionService } from "../../services/form-step-definition-service";
import { WorkflowContextFactDefinitionService } from "../../services/workflow-context-fact-definition-service";
import {
  WorkflowAuthoringTransactionService,
  WorkflowAuthoringTransactionServiceLive,
} from "../../services/workflow-authoring-transaction-service";
import { WorkflowService } from "../../services/workflow-service";
import { WorkflowTopologyMutationService } from "../../services/workflow-topology-mutation-service";

const payload: AgentStepDesignTimePayload = {
  key: "draft-prd",
  objective: "Draft the PRD.",
  instructionsMarkdown: "Use the current workflow context only.",
  harnessSelection: { harness: "opencode" },
  explicitReadGrants: [],
  writeItems: [],
  completionRequirements: [],
  runtimePolicy: {
    sessionStart: "explicit",
    continuationMode: "bootstrap_only",
    liveStreamCount: 1,
    nativeMessageLog: false,
    persistedWritePolicy: "applied_only",
  },
};

describe("agent-step workflow authoring transaction", () => {
  it("routes create, update, and delete agent-step mutations through the transaction seam", async () => {
    const calls: Array<string> = [];

    const workflowServiceLayer = Layer.succeed(WorkflowService, {
      updateWorkflowMetadata: () => Effect.void,
    } as unknown as Context.Tag.Service<typeof WorkflowService>);

    const formStepLayer = Layer.succeed(FormStepDefinitionService, {
      createFormStep: () => Effect.void,
      updateFormStep: () => Effect.void,
      deleteFormStep: () => Effect.void,
    } as unknown as Context.Tag.Service<typeof FormStepDefinitionService>);

    const topologyLayer = Layer.succeed(WorkflowTopologyMutationService, {
      createEdge: () => Effect.void,
      updateEdge: () => Effect.void,
      deleteEdge: () => Effect.void,
    } as unknown as Context.Tag.Service<typeof WorkflowTopologyMutationService>);

    const contextFactLayer = Layer.succeed(WorkflowContextFactDefinitionService, {
      create: () => Effect.sync(() => void calls.push("createContextFact")),
      update: () => Effect.sync(() => void calls.push("updateContextFact")),
      delete: () => Effect.sync(() => void calls.push("deleteContextFact")),
    } as unknown as Context.Tag.Service<typeof WorkflowContextFactDefinitionService>);

    const agentStepLayer = Layer.succeed(AgentStepDefinitionService, {
      createAgentStep: () =>
        Effect.sync(() => {
          calls.push("createAgentStep");
          return { stepId: "step-agent-1", payload };
        }),
      updateAgentStep: () =>
        Effect.sync(() => {
          calls.push("updateAgentStep");
          return { stepId: "step-agent-1", payload };
        }),
      deleteAgentStep: () => Effect.sync(() => void calls.push("deleteAgentStep")),
    } as unknown as Context.Tag.Service<typeof AgentStepDefinitionService>);

    const layer = Layer.provide(
      WorkflowAuthoringTransactionServiceLive,
      Layer.mergeAll(
        workflowServiceLayer,
        formStepLayer,
        topologyLayer,
        contextFactLayer,
        agentStepLayer,
      ),
    );

    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const tx = yield* WorkflowAuthoringTransactionService;

        yield* tx.applyMutation(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            createContextFact: {
              kind: "plain_value_fact",
              key: "summary",
              cardinality: "one",
              valueType: "string",
            },
            createAgentStep: {
              afterStepKey: null,
              payload,
            },
          },
          "tester",
        );

        yield* tx.applyMutation(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            updateAgentStep: {
              stepId: "step-agent-1",
              payload: { ...payload, label: "Updated" },
            },
            updateContextFact: {
              contextFactDefinitionId: "summary",
              fact: {
                kind: "plain_value_fact",
                key: "summary",
                cardinality: "one",
                valueType: "string",
              },
            },
          },
          "tester",
        );

        return yield* tx.applyMutation(
          {
            versionId: "ver-1",
            workUnitTypeKey: "WU.STORY",
            workflowDefinitionId: "wf-1",
            deleteAgentStepId: "step-agent-1",
            deleteContextFactDefinitionId: "summary",
          },
          "tester",
        );
      }).pipe(Effect.provide(layer)),
    );

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual([
      "createContextFact",
      "createAgentStep",
      "updateContextFact",
      "updateAgentStep",
      "deleteAgentStep",
      "deleteContextFact",
    ]);
  });
});
