import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { BranchStepRuntimeRepository } from "../repositories/branch-step-runtime-repository";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import {
  StepExecutionRepository,
  type RuntimeWorkflowStepDefinitionRow,
} from "../repositories/step-execution-repository";
import { evaluateRoutes } from "./branch-route-evaluator";

export type EntryStepResolution =
  | {
      state: "entry_step_ready";
      entryStep: RuntimeWorkflowStepDefinitionRow;
    }
  | {
      state: "invalid_definition";
      reason: "missing_entry_step" | "ambiguous_entry_step";
    };

export type NextStepResolution =
  | {
      state: "next_step_ready";
      nextStep: RuntimeWorkflowStepDefinitionRow;
    }
  | {
      state: "no_next_step";
    }
  | {
      state: "blocked";
      code:
        | "branch_runtime_state_missing"
        | "branch_definition_missing"
        | "missing_persisted_selection"
        | "invalid_persisted_selection"
        | "selected_target_missing_definition";
      reason: string;
    };

const resolveStandardNextStep = (params: {
  steps: readonly RuntimeWorkflowStepDefinitionRow[];
  workflowId: string;
  fromStepDefinitionId: string;
  edges: readonly {
    fromStepId: string | null;
    toStepId: string | null;
  }[];
}): NextStepResolution => {
  const outgoing = params.edges.find((edge) => edge.fromStepId === params.fromStepDefinitionId);
  if (!outgoing?.toStepId) {
    return { state: "no_next_step" };
  }

  const nextStep = params.steps.find((step) => step.id === outgoing.toStepId) ?? null;
  if (!nextStep) {
    return { state: "no_next_step" };
  }

  return {
    state: "next_step_ready",
    nextStep,
  } satisfies NextStepResolution;
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
      workflowExecutionId: string;
      workflowId: string;
      fromStepDefinitionId: string;
      fromStepExecutionId?: string | null;
    }) => Effect.Effect<NextStepResolution, RepositoryError>;
  }
>() {}

export const StepProgressionServiceLive = Layer.effect(
  StepProgressionService,
  Effect.gen(function* () {
    const repo = yield* StepExecutionRepository;
    const branchRuntimeRepo = yield* BranchStepRuntimeRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;

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
      workflowExecutionId,
      workflowId,
      fromStepDefinitionId,
      fromStepExecutionId,
    }: {
      workflowExecutionId: string;
      workflowId: string;
      fromStepDefinitionId: string;
      fromStepExecutionId?: string | null;
    }) =>
      Effect.gen(function* () {
        const [steps, edges] = yield* Effect.all([
          repo.listWorkflowStepDefinitions(workflowId),
          repo.listWorkflowEdges(workflowId),
        ]);

        const currentStep = steps.find((step) => step.id === fromStepDefinitionId) ?? null;
        if (!currentStep || currentStep.type !== "branch") {
          return resolveStandardNextStep({
            steps,
            edges,
            workflowId,
            fromStepDefinitionId,
          });
        }

        if (!fromStepExecutionId) {
          return {
            state: "blocked",
            code: "branch_runtime_state_missing",
            reason: "Branch step execution is missing persisted runtime state.",
          } satisfies NextStepResolution;
        }

        const branchState = yield* branchRuntimeRepo.loadWithRoutes(fromStepExecutionId);
        if (!branchState) {
          return {
            state: "blocked",
            code: "branch_runtime_state_missing",
            reason: "Branch step execution is missing persisted runtime state.",
          } satisfies NextStepResolution;
        }

        const workflowDetail =
          yield* executionReadRepo.getWorkflowExecutionDetail(workflowExecutionId);
        if (!workflowDetail) {
          return {
            state: "blocked",
            code: "branch_definition_missing",
            reason: "Workflow execution detail is unavailable for branch progression.",
          } satisfies NextStepResolution;
        }

        const projectPin = yield* projectContextRepo.findProjectPin(workflowDetail.projectId);
        if (!projectPin) {
          return {
            state: "blocked",
            code: "branch_definition_missing",
            reason: "Project methodology pin is missing for branch progression.",
          } satisfies NextStepResolution;
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (entry) => entry.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return {
            state: "blocked",
            code: "branch_definition_missing",
            reason: "Work-unit type metadata is missing for branch progression.",
          } satisfies NextStepResolution;
        }

        const [branchDefinition, workflowEditor] = yield* Effect.all([
          methodologyRepo.getBranchStepDefinition({
            versionId: projectPin.methodologyVersionId,
            workflowDefinitionId: workflowId,
            stepId: fromStepDefinitionId,
          }),
          methodologyRepo.getWorkflowEditorDefinition({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
            workflowDefinitionId: workflowId,
          }),
        ]);

        if (!branchDefinition) {
          return {
            state: "blocked",
            code: "branch_definition_missing",
            reason: "Branch step definition could not be loaded for progression.",
          } satisfies NextStepResolution;
        }

        const contextFacts = yield* repo.listWorkflowExecutionContextFacts(workflowExecutionId);
        const evaluations = evaluateRoutes({
          routes: branchDefinition.payload.routes.map((route, index) => ({
            ...route,
            sortOrder: index,
          })),
          contextFacts,
          contextFactDefinitions: workflowEditor.contextFacts,
        });

        const validConditionalTargets = evaluations
          .filter((route) => route.isValid)
          .map((route) => route.targetStepId);

        const validTargets = new Set(
          validConditionalTargets.length > 0
            ? validConditionalTargets
            : branchDefinition.payload.defaultTargetStepId
              ? [branchDefinition.payload.defaultTargetStepId]
              : [],
        );

        const selectedTargetStepId = branchState.branch.selectedTargetStepId;
        if (!selectedTargetStepId) {
          return {
            state: "blocked",
            code: "missing_persisted_selection",
            reason:
              "Branch completion is blocked until a valid target selection is explicitly saved.",
          } satisfies NextStepResolution;
        }

        if (!validTargets.has(selectedTargetStepId)) {
          return {
            state: "blocked",
            code: "invalid_persisted_selection",
            reason:
              "Branch completion is blocked because the saved target selection is no longer valid.",
          } satisfies NextStepResolution;
        }

        const nextStep = steps.find((step) => step.id === selectedTargetStepId) ?? null;
        if (!nextStep) {
          return {
            state: "blocked",
            code: "selected_target_missing_definition",
            reason: "Branch completion is blocked because the saved target step no longer exists.",
          } satisfies NextStepResolution;
        }

        return {
          state: "next_step_ready",
          nextStep,
        } satisfies NextStepResolution;
      });

    return StepProgressionService.of({
      resolveEntryStepDefinition,
      getNextStepDefinition,
    });
  }),
);
