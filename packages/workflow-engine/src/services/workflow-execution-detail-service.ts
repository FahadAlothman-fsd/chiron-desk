import type {
  GetWorkflowExecutionDetailInput,
  GetWorkflowExecutionDetailOutput,
  RuntimeWorkflowExecutionSummary,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../repositories/execution-read-repository";

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

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
            currentStateId: detail.currentStateId,
            currentStateKey: detail.currentStateId,
            currentStateLabel: detail.currentStateId,
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
          impactDialog: {
            requiredForRetry: true,
            affectedEntitiesSummary: {
              transitionExecutionId: detail.transitionExecution.id,
              workflowExecutionIds: [detail.workflowExecution.id],
            },
          },
          stepsSurface: {
            mode: "deferred",
            message: "Workflow step runtime details are coming later in the L3 slice.",
          },
        } satisfies GetWorkflowExecutionDetailOutput;
      });

    return WorkflowExecutionDetailService.of({ getWorkflowExecutionDetail });
  }),
);
