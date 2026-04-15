import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import {
  StepExecutionRepository,
  type RuntimeWorkflowStepDefinitionRow,
} from "../repositories/step-execution-repository";

export type EntryStepResolution =
  | {
      state: "entry_step_ready";
      entryStep: RuntimeWorkflowStepDefinitionRow;
    }
  | {
      state: "invalid_definition";
      reason: "missing_entry_step" | "ambiguous_entry_step";
    };

export class StepProgressionService extends Context.Tag(
  "@chiron/workflow-engine/services/StepProgressionService",
)<
  StepProgressionService,
  {
    readonly resolveEntryStepDefinition: (
      workflowId: string,
    ) => Effect.Effect<EntryStepResolution, RepositoryError>;
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

    const resolveEntryStepDefinition = (workflowId: string) =>
      Effect.gen(function* () {
        const [steps, edges] = yield* Effect.all([
          repo.listWorkflowStepDefinitions(workflowId),
          repo.listWorkflowEdges(workflowId),
        ]);

        const configuredEntryStepId =
          "getWorkflowEntryStepId" in repo && typeof repo.getWorkflowEntryStepId === "function"
            ? yield* repo.getWorkflowEntryStepId(workflowId)
            : null;
        const hasConfiguredEntryStep = configuredEntryStepId !== null;

        if (steps.length === 0) {
          return {
            state: "invalid_definition",
            reason: "missing_entry_step",
          } satisfies EntryStepResolution;
        }

        const entrySteps = hasConfiguredEntryStep
          ? steps.filter((step) => step.id === configuredEntryStepId)
          : (() => {
              const incoming = new Set(
                edges.map((edge) => edge.toStepId).filter((id): id is string => !!id),
              );
              return steps.filter((step) => !incoming.has(step.id));
            })();

        if (entrySteps.length !== 1) {
          return {
            state: "invalid_definition",
            reason:
              hasConfiguredEntryStep || entrySteps.length === 0
                ? "missing_entry_step"
                : "ambiguous_entry_step",
          } satisfies EntryStepResolution;
        }

        return {
          state: "entry_step_ready",
          entryStep: entrySteps[0]!,
        } satisfies EntryStepResolution;
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
      resolveEntryStepDefinition,
      getNextStepDefinition,
    });
  }),
);
