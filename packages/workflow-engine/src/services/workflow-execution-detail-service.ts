import type {
  GetWorkflowExecutionDetailInput,
  GetWorkflowExecutionDetailOutput,
  RuntimeWorkflowStepDefinitionSummary,
  RuntimeWorkflowStepExecutionSummary,
  RuntimeWorkflowExecutionSummary,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../repositories/execution-read-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

const toStepExecutionSummary = (stepExecution: {
  id: string;
  stepDefinitionId: string;
  stepType: string;
  status: "active" | "completed";
  activatedAt: Date;
  completedAt: Date | null;
}): RuntimeWorkflowStepExecutionSummary => ({
  stepExecutionId: stepExecution.id,
  stepDefinitionId: stepExecution.stepDefinitionId,
  stepType: stepExecution.stepType as RuntimeWorkflowStepExecutionSummary["stepType"],
  status: stepExecution.status,
  activatedAt: stepExecution.activatedAt.toISOString(),
  completedAt: toIso(stepExecution.completedAt),
  target: {
    page: "step-execution-detail",
    stepExecutionId: stepExecution.id,
  },
});

const toStepDefinitionSummary = (stepDefinition: {
  id: string;
  key: string;
  type: string;
}): RuntimeWorkflowStepDefinitionSummary => ({
  stepDefinitionId: stepDefinition.id,
  stepType: stepDefinition.type as RuntimeWorkflowStepDefinitionSummary["stepType"],
  stepKey: stepDefinition.key,
});

const toWorkflowContextFactGroups = (params: {
  definitions: ReadonlyArray<{
    id: string;
    factKey: string;
    label: string | null;
    descriptionJson: unknown;
  }>;
  instances: ReadonlyArray<{
    id: string;
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
    sourceStepExecutionId: string | null;
    updatedAt: Date;
  }>;
}): GetWorkflowExecutionDetailOutput["workflowContextFacts"]["groups"] => {
  const instancesByDefinitionId = new Map<
    string,
    Array<{
      id: string;
      contextFactDefinitionId: string;
      instanceOrder: number;
      valueJson: unknown;
      sourceStepExecutionId: string | null;
      updatedAt: Date;
    }>
  >();

  for (const instance of params.instances) {
    const entries = instancesByDefinitionId.get(instance.contextFactDefinitionId) ?? [];
    entries.push(instance);
    instancesByDefinitionId.set(instance.contextFactDefinitionId, entries);
  }

  return params.definitions.map((definition) => ({
    contextFactDefinitionId: definition.id,
    definitionKey: definition.factKey,
    definitionLabel: definition.label ?? undefined,
    definitionDescriptionJson: definition.descriptionJson ?? undefined,
    instances: (instancesByDefinitionId.get(definition.id) ?? [])
      .slice()
      .sort((left, right) => left.instanceOrder - right.instanceOrder)
      .map((instance) => ({
        contextFactInstanceId: instance.id,
        instanceOrder: instance.instanceOrder,
        valueJson: instance.valueJson,
        sourceStepExecutionId: instance.sourceStepExecutionId ?? undefined,
        recordedAt: instance.updatedAt.toISOString(),
      })),
  }));
};

const toWorkflowSummary = (workflow: {
  id: string;
  workflowId: string;
  status: RuntimeWorkflowExecutionSummary["status"];
  startedAt: Date;
  completedAt: Date | null;
  supersededAt: Date | null;
  supersededByWorkflowExecutionId: string | null;
}): RuntimeWorkflowExecutionSummary => ({
  workflowExecutionId: workflow.id,
  workflowId: workflow.workflowId,
  workflowKey: workflow.workflowId,
  workflowName: workflow.workflowId,
  status: workflow.status,
  startedAt: workflow.startedAt.toISOString(),
  completedAt: toIso(workflow.completedAt),
  supersededAt: toIso(workflow.supersededAt),
  supersedesWorkflowExecutionId: workflow.supersededByWorkflowExecutionId ?? undefined,
  target: { page: "workflow-execution-detail", workflowExecutionId: workflow.id },
});

const mapPreviousPrimaryAttempts = (
  detail: WorkflowExecutionDetailReadModel,
  workflows: ReadonlyArray<{
    id: string;
    workflowId: string;
    workflowRole: "primary" | "supporting";
    status: RuntimeWorkflowExecutionSummary["status"];
    startedAt: Date;
    completedAt: Date | null;
    supersededAt: Date | null;
    supersededByWorkflowExecutionId: string | null;
  }>,
): RuntimeWorkflowExecutionSummary[] | undefined => {
  if (detail.workflowExecution.workflowRole !== "primary") {
    return undefined;
  }

  return workflows
    .filter(
      (workflow) =>
        workflow.workflowRole === "primary" && workflow.id !== detail.workflowExecution.id,
    )
    .map((workflow) =>
      toWorkflowSummary({
        id: workflow.id,
        workflowId: workflow.workflowId,
        status: workflow.status,
        startedAt: workflow.startedAt,
        completedAt: workflow.completedAt,
        supersededAt: workflow.supersededAt,
        supersededByWorkflowExecutionId: workflow.supersededByWorkflowExecutionId,
      }),
    );
};

export class WorkflowExecutionDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowExecutionDetailService",
)<
  WorkflowExecutionDetailService,
  {
    readonly getWorkflowExecutionDetail: (
      input: GetWorkflowExecutionDetailInput,
    ) => Effect.Effect<GetWorkflowExecutionDetailOutput | null, RepositoryError>;
  }
>() {}

export const WorkflowExecutionDetailServiceLive = Layer.effect(
  WorkflowExecutionDetailService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;

    const getWorkflowExecutionDetail = (input: GetWorkflowExecutionDetailInput) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getWorkflowExecutionDetail(input.workflowExecutionId);
        if (!detail || detail.projectId !== input.projectId) {
          return null;
        }

        const transitionWorkflows = yield* readRepo.listWorkflowExecutionsForTransition(
          detail.workflowExecution.transitionExecutionId,
        );

        const previousPrimaryAttempts = mapPreviousPrimaryAttempts(detail, transitionWorkflows);

        const retryEnabled =
          detail.transitionExecution.status === "active" &&
          (detail.workflowExecution.status === "active" ||
            detail.workflowExecution.status === "completed");

        const [stepExecutions, workflowContextFactDefinitions, workflowContextFactInstances] =
          yield* Effect.all([
            stepRepo.listStepExecutionsForWorkflow(detail.workflowExecution.id),
            stepRepo.listWorkflowContextFactDefinitions(detail.workflowExecution.workflowId),
            stepRepo.listWorkflowExecutionContextFacts(detail.workflowExecution.id),
          ]);
        const [stepDefinitions, workflowEdges] = yield* Effect.all([
          stepRepo.listWorkflowStepDefinitions(detail.workflowExecution.workflowId),
          stepRepo.listWorkflowEdges(detail.workflowExecution.workflowId),
        ]);

        const configuredEntryStepId =
          "getWorkflowEntryStepId" in stepRepo &&
          typeof stepRepo.getWorkflowEntryStepId === "function"
            ? yield* stepRepo.getWorkflowEntryStepId(detail.workflowExecution.workflowId)
            : null;
        const hasConfiguredEntryStep = configuredEntryStepId !== null;

        const entrySteps = hasConfiguredEntryStep
          ? stepDefinitions.filter((step) => step.id === configuredEntryStepId)
          : (() => {
              const inboundCounts = new Map<string, number>();
              for (const edge of workflowEdges) {
                if (!edge.toStepId) {
                  continue;
                }
                inboundCounts.set(edge.toStepId, (inboundCounts.get(edge.toStepId) ?? 0) + 1);
              }
              return stepDefinitions.filter((step) => (inboundCounts.get(step.id) ?? 0) === 0);
            })();
        const currentStepExecution = detail.workflowExecution.currentStepExecutionId
          ? (stepExecutions.find(
              (stepExecution) =>
                stepExecution.id === detail.workflowExecution.currentStepExecutionId,
            ) ?? null)
          : null;
        const completedSteps = stepExecutions
          .filter((stepExecution) => stepExecution.status === "completed")
          .slice()
          .sort((left, right) => {
            const leftTime = left.completedAt?.getTime() ?? left.activatedAt.getTime();
            const rightTime = right.completedAt?.getTime() ?? right.activatedAt.getTime();
            return rightTime - leftTime;
          });
        const latestCompletedStep =
          currentStepExecution?.status === "completed" ? currentStepExecution : completedSteps[0];

        const stepSurface: GetWorkflowExecutionDetailOutput["stepSurface"] =
          currentStepExecution?.status === "active"
            ? {
                state: "active_step",
                activeStep: toStepExecutionSummary(currentStepExecution),
              }
            : entrySteps.length !== 1
              ? {
                  state: "invalid_definition",
                  reason:
                    hasConfiguredEntryStep || entrySteps.length === 0
                      ? "missing_entry_step"
                      : "ambiguous_entry_step",
                }
              : stepExecutions.length === 0
                ? {
                    state: "entry_pending",
                    entryStep: toStepDefinitionSummary(entrySteps[0]!),
                  }
                : latestCompletedStep
                  ? (() => {
                      const nextEdge = workflowEdges.find(
                        (edge) => edge.fromStepId === latestCompletedStep.stepDefinitionId,
                      );
                      if (!nextEdge?.toStepId) {
                        return {
                          state: "terminal_no_next_step",
                          terminalStep: toStepExecutionSummary(latestCompletedStep),
                        } satisfies GetWorkflowExecutionDetailOutput["stepSurface"];
                      }

                      const nextStepDefinition = stepDefinitions.find(
                        (step) => step.id === nextEdge.toStepId,
                      );
                      if (!nextStepDefinition) {
                        return {
                          state: "terminal_no_next_step",
                          terminalStep: toStepExecutionSummary(latestCompletedStep),
                        } satisfies GetWorkflowExecutionDetailOutput["stepSurface"];
                      }

                      return {
                        state: "next_pending",
                        afterStep: toStepExecutionSummary(latestCompletedStep),
                        nextStep: toStepDefinitionSummary(nextStepDefinition),
                      } satisfies GetWorkflowExecutionDetailOutput["stepSurface"];
                    })()
                  : {
                      state: "terminal_no_next_step",
                      terminalStep: undefined,
                    };

        const completeEnabled =
          detail.workflowExecution.status === "active" &&
          stepSurface.state === "terminal_no_next_step" &&
          !!stepSurface.terminalStep &&
          stepSurface.terminalStep.status === "completed";

        return {
          workflowExecution: {
            workflowExecutionId: detail.workflowExecution.id,
            workflowId: detail.workflowExecution.workflowId,
            workflowKey: detail.workflowExecution.workflowId,
            workflowName: detail.workflowExecution.workflowId,
            workflowRole: detail.workflowExecution.workflowRole,
            status: detail.workflowExecution.status,
            startedAt: detail.workflowExecution.startedAt.toISOString(),
            completedAt: toIso(detail.workflowExecution.completedAt),
            supersededAt: toIso(detail.workflowExecution.supersededAt),
            supersedesWorkflowExecutionId:
              detail.workflowExecution.supersededByWorkflowExecutionId ?? undefined,
          },
          workUnit: {
            projectWorkUnitId: detail.projectWorkUnitId,
            workUnitTypeId: detail.workUnitTypeId,
            workUnitTypeKey: detail.workUnitTypeId,
            workUnitTypeName: detail.workUnitTypeId,
            currentStateId: detail.currentStateId ?? "not_started",
            currentStateKey: detail.currentStateId ?? "not_started",
            currentStateLabel: detail.currentStateId ?? "Not started",
            target: {
              page: "work-unit-overview",
              projectWorkUnitId: detail.projectWorkUnitId,
            },
          },
          parentTransition: {
            transitionExecutionId: detail.transitionExecution.id,
            transitionId: detail.transitionExecution.transitionId,
            transitionKey: detail.transitionExecution.transitionId,
            transitionName: detail.transitionExecution.transitionId,
            status: detail.transitionExecution.status,
            target: {
              page: "transition-execution-detail",
              transitionExecutionId: detail.transitionExecution.id,
            },
          },
          lineage: {
            supersedesWorkflowExecutionId:
              detail.workflowExecution.supersededByWorkflowExecutionId ?? undefined,
            supersededByWorkflowExecutionId: undefined,
            previousPrimaryAttempts,
          },
          retryAction: {
            kind: "retry_same_workflow",
            enabled: retryEnabled,
            reasonIfDisabled: retryEnabled
              ? undefined
              : "Retry is allowed only while parent transition execution remains active.",
            parentTransitionExecutionId: detail.transitionExecution.id,
          },
          completeAction: {
            kind: "complete_workflow_execution",
            enabled: completeEnabled,
            reasonIfDisabled: completeEnabled
              ? undefined
              : detail.workflowExecution.status !== "active"
                ? "Workflow execution is already finalized."
                : stepSurface.state === "active_step"
                  ? "Complete the active step before finishing the workflow."
                  : stepSurface.state === "next_pending"
                    ? "Activate and finish the next step before completing the workflow."
                    : stepSurface.state === "entry_pending"
                      ? "Activate the entry step before completing the workflow."
                      : stepSurface.state === "invalid_definition"
                        ? "Workflow definition is invalid."
                        : "Workflow has no completed terminal step to finalize.",
          },
          impactDialog: {
            requiredForRetry: true,
            affectedEntitiesSummary: {
              transitionExecutionId: detail.transitionExecution.id,
              workflowExecutionIds: [detail.workflowExecution.id],
            },
          },
          stepSurface,
          workflowContextFacts: {
            mode: "read_only_by_definition",
            groups: toWorkflowContextFactGroups({
              definitions: workflowContextFactDefinitions,
              instances: workflowContextFactInstances,
            }),
          },
        } satisfies GetWorkflowExecutionDetailOutput;
      });

    return WorkflowExecutionDetailService.of({ getWorkflowExecutionDetail });
  }),
);
