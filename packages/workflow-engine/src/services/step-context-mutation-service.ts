import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import {
  type ReplaceRuntimeWorkflowExecutionContextFactValue,
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";

export interface StepContextReplaceInput {
  workflowExecutionId: string;
  sourceStepExecutionId: string | null;
  affectedContextFactDefinitionIds: readonly string[];
  currentValues: readonly ReplaceRuntimeWorkflowExecutionContextFactValue[];
}

export class StepContextMutationService extends Context.Tag(
  "@chiron/workflow-engine/services/StepContextMutationService",
)<
  StepContextMutationService,
  {
    readonly replaceContextFacts: (
      input: StepContextReplaceInput,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
  }
>() {}

export const StepContextMutationServiceLive = Layer.effect(
  StepContextMutationService,
  Effect.gen(function* () {
    const repo = yield* StepExecutionRepository;

    const replaceContextFacts = (input: StepContextReplaceInput) =>
      repo.replaceWorkflowExecutionContextFacts({
        workflowExecutionId: input.workflowExecutionId,
        sourceStepExecutionId: input.sourceStepExecutionId,
        affectedContextFactDefinitionIds: input.affectedContextFactDefinitionIds,
        currentValues: input.currentValues,
      });

    return StepContextMutationService.of({
      replaceContextFacts,
    });
  }),
);
