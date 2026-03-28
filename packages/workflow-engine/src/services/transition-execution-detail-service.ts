import type {
  GetTransitionExecutionDetailInput,
  GetTransitionExecutionDetailOutput,
  RuntimeWorkflowExecutionSummary,
} from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  ExecutionReadRepository,
  type TransitionExecutionDetailReadModel,
} from "../repositories/execution-read-repository";
import { RuntimeGateService } from "./runtime-gate-service";

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

const toWorkflowSummary = (
  workflow: NonNullable<TransitionExecutionDetailReadModel["primaryWorkflowExecution"]>,
): RuntimeWorkflowExecutionSummary => ({
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

const makeCompletionPanel = (params: {
  transitionExecutionId: string;
  transitionStatus: TransitionExecutionDetailReadModel["transitionExecution"]["status"];
  transitionCompletedAt: Date | null;
  transitionSupersededAt: Date | null;
  primaryWorkflowStatus: TransitionExecutionDetailReadModel["primaryWorkflowExecution"] extends null
    ? never
    : NonNullable<TransitionExecutionDetailReadModel["primaryWorkflowExecution"]>["status"];
  completion: {
    passed: boolean;
    evaluatedAt: string;
    firstBlockingReason?: string;
    conditionTree?: unknown;
  };
}): GetTransitionExecutionDetailOutput["completionGate"] => {
  if (params.transitionStatus === "completed") {
    return {
      panelState: "completed_read_only",
      completedAt: toIso(params.transitionCompletedAt),
    };
  }

  if (params.transitionStatus === "superseded") {
    return {
      panelState: "superseded_read_only",
    };
  }

  if (params.primaryWorkflowStatus === "active") {
    return {
      panelState: "workflow_running",
    };
  }

  if (params.completion.passed) {
    return {
      panelState: "passing",
      lastEvaluatedAt: params.completion.evaluatedAt,
      conditionTree: params.completion.conditionTree,
      actions: {
        completeTransition: {
          kind: "complete_transition_execution",
          transitionExecutionId: params.transitionExecutionId,
        },
      },
    };
  }

  return {
    panelState: "failing",
    lastEvaluatedAt: params.completion.evaluatedAt,
    firstBlockingReason: params.completion.firstBlockingReason,
    conditionTree: params.completion.conditionTree,
    actions: {
      chooseAnotherPrimaryWorkflow: {
        kind: "choose_primary_workflow_for_transition_execution",
        transitionExecutionId: params.transitionExecutionId,
      },
    },
  };
};

export class TransitionExecutionDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/TransitionExecutionDetailService",
)<
  TransitionExecutionDetailService,
  {
    readonly getTransitionExecutionDetail: (
      input: GetTransitionExecutionDetailInput,
    ) => Effect.Effect<GetTransitionExecutionDetailOutput | null, RepositoryError>;
  }
>() {}

export const TransitionExecutionDetailServiceLive = Layer.effect(
  TransitionExecutionDetailService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const runtimeGate = (yield* RuntimeGateService) as unknown as {
      readonly evaluateCompletionGate: (input: {
        projectId: string;
        projectWorkUnitId: string;
        transitionExecutionId: string;
      }) => Effect.Effect<
        {
          passed: boolean;
          evaluatedAt: string;
          firstBlockingReason?: string;
          conditionTree?: unknown;
          targetState?: {
            stateId: string;
            stateKey: string;
            stateLabel: string;
          };
        },
        RepositoryError
      >;
    };

    const getTransitionExecutionDetail = (input: GetTransitionExecutionDetailInput) =>
      Effect.gen(function* () {
        const detail = yield* readRepo.getTransitionExecutionDetail(input.transitionExecutionId);
        if (!detail) {
          return null;
        }
        if (
          detail.projectId !== input.projectId ||
          detail.transitionExecution.projectWorkUnitId !== input.projectWorkUnitId
        ) {
          return null;
        }

        const workflows = yield* readRepo.listWorkflowExecutionsForTransition(
          input.transitionExecutionId,
        );
        const primaryWorkflows = workflows.filter((row) => row.workflowRole === "primary");
        const supportingWorkflows = workflows.filter((row) => row.workflowRole === "supporting");

        const currentPrimary = detail.primaryWorkflowExecution
          ? toWorkflowSummary(detail.primaryWorkflowExecution)
          : undefined;

        const completion = yield* runtimeGate.evaluateCompletionGate({
          projectId: input.projectId,
          projectWorkUnitId: input.projectWorkUnitId,
          transitionExecutionId: input.transitionExecutionId,
        });

        return {
          workUnit: {
            projectWorkUnitId: detail.transitionExecution.projectWorkUnitId,
            workUnitTypeId: detail.workUnitTypeId,
            workUnitTypeKey: detail.workUnitTypeId,
            workUnitTypeName: detail.workUnitTypeId,
            currentStateId: detail.currentStateId,
            currentStateKey: detail.currentStateId,
            currentStateLabel: detail.currentStateId,
          },
          transitionExecution: {
            transitionExecutionId: detail.transitionExecution.id,
            status: detail.transitionExecution.status,
            startedAt: detail.transitionExecution.startedAt.toISOString(),
            completedAt: toIso(detail.transitionExecution.completedAt),
            supersededAt: toIso(detail.transitionExecution.supersededAt),
            supersedesTransitionExecutionId:
              detail.transitionExecution.supersededByTransitionExecutionId ?? undefined,
          },
          transitionDefinition: {
            transitionId: detail.transitionExecution.transitionId,
            transitionKey: detail.transitionExecution.transitionId,
            transitionName: detail.transitionExecution.transitionId,
            toStateId: completion.targetState?.stateId ?? detail.currentStateId,
            toStateKey: completion.targetState?.stateKey ?? detail.currentStateId,
            toStateLabel: completion.targetState?.stateLabel ?? detail.currentStateId,
            boundWorkflows: [],
            startConditionSets: [],
            completionConditionSets: [],
          },
          startGate: {
            mode: "informational",
            startedAt: detail.transitionExecution.startedAt.toISOString(),
            note: "Start gate is evaluated by runtime commands before transition writes.",
          },
          currentPrimaryWorkflow: currentPrimary,
          primaryAttemptHistory: primaryWorkflows
            .filter((row) => row.id !== detail.transitionExecution.primaryWorkflowExecutionId)
            .map((workflow) =>
              toWorkflowSummary({
                id: workflow.id,
                transitionExecutionId: workflow.transitionExecutionId,
                workflowId: workflow.workflowId,
                workflowRole: workflow.workflowRole,
                status: workflow.status,
                supersededByWorkflowExecutionId: workflow.supersededByWorkflowExecutionId,
                startedAt: workflow.startedAt,
                completedAt: workflow.completedAt,
                supersededAt: workflow.supersededAt,
              }),
            ),
          supportingWorkflows: supportingWorkflows.map((workflow) =>
            toWorkflowSummary({
              id: workflow.id,
              transitionExecutionId: workflow.transitionExecutionId,
              workflowId: workflow.workflowId,
              workflowRole: workflow.workflowRole,
              status: workflow.status,
              supersededByWorkflowExecutionId: workflow.supersededByWorkflowExecutionId,
              startedAt: workflow.startedAt,
              completedAt: workflow.completedAt,
              supersededAt: workflow.supersededAt,
            }),
          ),
          completionGate: makeCompletionPanel({
            transitionExecutionId: detail.transitionExecution.id,
            transitionStatus: detail.transitionExecution.status,
            transitionCompletedAt: detail.transitionExecution.completedAt,
            transitionSupersededAt: detail.transitionExecution.supersededAt,
            primaryWorkflowStatus: detail.primaryWorkflowExecution?.status ?? "active",
            completion,
          }),
        } satisfies GetTransitionExecutionDetailOutput;
      });

    return TransitionExecutionDetailService.of({ getTransitionExecutionDetail });
  }),
);
