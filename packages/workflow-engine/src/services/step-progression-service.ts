import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import {
  StepExecutionRepository,
  type RuntimeWorkflowStepDefinitionRow,
} from "../repositories/step-execution-repository";

export class StepProgressionService extends Context.Tag(
  "@chiron/workflow-engine/services/StepProgressionService",
)<
  StepProgressionService,
  {
    readonly getFirstStepDefinition: (
      workflowId: string,
    ) => Effect.Effect<RuntimeWorkflowStepDefinitionRow | null, RepositoryError>;
    readonly getNextStepDefinition: (params: {
      workflowId: string;
      fromStepDefinitionId: string;
    }) => Effect.Effect<RuntimeWorkflowStepDefinitionRow | null, RepositoryError>;
  }
>() {}

export const StepProgressionServiceLive = Layer.effect(
  StepProgressionService,
  Effect.gen(function* () {
    const repo = yield* StepExecutionRepository;

    const getFirstStepDefinition = (workflowId: string) =>
      Effect.gen(function* () {
        const [steps, edges] = yield* Effect.all([
          repo.listWorkflowStepDefinitions(workflowId),
          repo.listWorkflowEdges(workflowId),
        ]);

        if (steps.length === 0) {
          return null;
        }

        const incoming = new Set(
          edges.map((edge) => edge.toStepId).filter((id): id is string => !!id),
        );

        return steps.find((step) => !incoming.has(step.id)) ?? steps[0] ?? null;
      });

    const getNextStepDefinition = ({
      workflowId,
      fromStepDefinitionId,
    }: {
      workflowId: string;
      fromStepDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        const [steps, edges] = yield* Effect.all([
          repo.listWorkflowStepDefinitions(workflowId),
          repo.listWorkflowEdges(workflowId),
        ]);

        const outgoing = edges.find((edge) => edge.fromStepId === fromStepDefinitionId);
        if (!outgoing?.toStepId) {
          return null;
        }

        return steps.find((step) => step.id === outgoing.toStepId) ?? null;
      });

    return StepProgressionService.of({
      getFirstStepDefinition,
      getNextStepDefinition,
    });
  }),
);
