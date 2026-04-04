import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";

export interface StepContextWriteInput {
  workflowExecutionId: string;
  sourceStepExecutionId: string | null;
  factKey: string;
  factKind: string;
  valueJson: unknown;
}

export class StepContextMutationService extends Context.Tag(
  "@chiron/workflow-engine/services/StepContextMutationService",
)<
  StepContextMutationService,
  {
    readonly writeContextFact: (
      input: StepContextWriteInput,
    ) => Effect.Effect<RuntimeWorkflowExecutionContextFactRow, RepositoryError>;
    readonly writeContextFacts: (
      inputs: readonly StepContextWriteInput[],
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
  }
>() {}

export const StepContextMutationServiceLive = Layer.effect(
  StepContextMutationService,
  Effect.gen(function* () {
    const repo = yield* StepExecutionRepository;

    const writeContextFact = (input: StepContextWriteInput) =>
      repo.writeWorkflowExecutionContextFact({
        workflowExecutionId: input.workflowExecutionId,
        sourceStepExecutionId: input.sourceStepExecutionId,
        factKey: input.factKey,
        factKind: input.factKind,
        valueJson: input.valueJson,
      });

    const writeContextFacts = (inputs: readonly StepContextWriteInput[]) =>
      Effect.forEach(inputs, writeContextFact, { concurrency: 1 });

    return StepContextMutationService.of({
      writeContextFact,
      writeContextFacts,
    });
  }),
);
