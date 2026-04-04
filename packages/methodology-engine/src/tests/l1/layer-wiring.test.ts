import { describe, expect, it } from "vitest";
import { Context, Effect, Layer } from "effect";

import { MethodologyRepository } from "../../repository";
import { LifecycleRepository } from "../../lifecycle-repository";
import { MethodologyEngineL1Live } from "../../layers/live";
import { WorkflowAuthoringTransactionService } from "../../services/workflow-authoring-transaction-service";
import { WorkflowService } from "../../services/workflow-service";

function makeRepositoryLayers() {
  const methodologyRepoLayer = Layer.succeed(MethodologyRepository, {
    listMethodologies: () => Effect.succeed([]),
  } as unknown as Context.Tag.Service<typeof MethodologyRepository>);

  const lifecycleRepoLayer = Layer.succeed(LifecycleRepository, {
    getLifecycleDefinition: () => Effect.succeed(null),
  } as unknown as Context.Tag.Service<typeof LifecycleRepository>);

  return Layer.mergeAll(methodologyRepoLayer, lifecycleRepoLayer);
}

describe("MethodologyEngineL1Live layer wiring", () => {
  it("provides WorkflowService for WorkflowAuthoringTransactionService", async () => {
    const l1Layer = Layer.provide(MethodologyEngineL1Live, makeRepositoryLayers());

    const program = Effect.gen(function* () {
      const workflows = yield* WorkflowService;
      const tx = yield* WorkflowAuthoringTransactionService;

      expect(workflows.updateWorkflowMetadata).toBeTypeOf("function");
      expect(tx.applyMutation).toBeTypeOf("function");
    }).pipe(Effect.provide(l1Layer));

    await Effect.runPromise(program);
  });
});
