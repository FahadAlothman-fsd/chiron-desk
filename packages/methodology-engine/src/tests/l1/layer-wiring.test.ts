import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { MethodologyRepository } from "../../repository";
import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyWorkflowAuthoringServicesLive } from "../../layers/live";
import { AgentStepDefinitionService } from "../../services/agent-step-definition-service";
import { WorkflowAuthoringTransactionService } from "../../services/workflow-authoring-transaction-service";
import { WorkflowService } from "../../services/workflow-service";

function makeRepositoryLayers() {
  const methodologyRepoLayer = Layer.succeed(MethodologyRepository, {
    listMethodologies: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    getLifecycleDefinition: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  const agentStepLayer = Layer.succeed(AgentStepDefinitionService, {
    createAgentStep: () => Effect.die("not implemented"),
    updateAgentStep: () => Effect.die("not implemented"),
    deleteAgentStep: () => Effect.die("not implemented"),
  } as unknown as Context.Tag.Service<typeof AgentStepDefinitionService>);

  return Layer.mergeAll(methodologyRepoLayer, lifecycleRepoLayer, agentStepLayer);
}

describe("MethodologyEngineL1Live layer wiring", () => {
  it("provides WorkflowService for WorkflowAuthoringTransactionService", async () => {
    const l1Layer = Layer.provide(MethodologyWorkflowAuthoringServicesLive, makeRepositoryLayers());

    const program = Effect.gen(function* () {
      const workflows = yield* WorkflowService;
      const tx = yield* WorkflowAuthoringTransactionService;

      expect(workflows.updateWorkflowMetadata).toBeTypeOf("function");
      expect(tx.applyMutation).toBeTypeOf("function");
    }).pipe(Effect.provide(l1Layer));

    await Effect.runPromise(program);
  });
});
