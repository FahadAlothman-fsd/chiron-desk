import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import {
  StepExecutionRepository,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";

export class StepContextQueryService extends Context.Tag(
  "@chiron/workflow-engine/services/StepContextQueryService",
)<
  StepContextQueryService,
  {
    readonly listContextFacts: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
    readonly getLatestContextFact: (params: {
      workflowExecutionId: string;
      factKey: string;
    }) => Effect.Effect<RuntimeWorkflowExecutionContextFactRow | null, RepositoryError>;
  }
>() {}

export const StepContextQueryServiceLive = Layer.effect(
  StepContextQueryService,
  Effect.gen(function* () {
    const repo = yield* StepExecutionRepository;

    const listContextFacts = (workflowExecutionId: string) =>
      repo.listWorkflowExecutionContextFacts(workflowExecutionId);

    const getLatestContextFact = ({
      workflowExecutionId,
      factKey,
    }: {
      workflowExecutionId: string;
      factKey: string;
    }) =>
      Effect.gen(function* () {
        const facts = yield* repo.listWorkflowExecutionContextFacts(workflowExecutionId);
        const matches = facts.filter((fact) => fact.contextFactDefinitionId === factKey);
        return matches.at(-1) ?? null;
      });

    return StepContextQueryService.of({
      listContextFacts,
      getLatestContextFact,
    });
  }),
);
