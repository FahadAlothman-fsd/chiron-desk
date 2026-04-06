import type {
  GetTransitionExecutionDetailInput,
  GetTransitionExecutionDetailOutput,
  RuntimeWorkflowExecutionSummary,
} from "@chiron/contracts/runtime/executions";
import type { RuntimeConditionEvaluationTree } from "@chiron/contracts/runtime/conditions";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  ExecutionReadRepository,
  type TransitionExecutionDetailReadModel,
} from "../repositories/execution-read-repository";
import { ProjectContextRepository } from "@chiron/project-context";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { RuntimeGateService } from "./runtime-gate-service";
import { toRuntimeConditionTree } from "./transition-gate-conditions";

const toIso = (value: Date | null): string | undefined => (value ? value.toISOString() : undefined);

const mapGateError =
  (operation: string) =>
  (error: unknown): RepositoryError =>
    error instanceof RepositoryError
      ? error
      : new RepositoryError({
          operation,
          cause: error instanceof Error ? error : new Error(String(error)),
        });

const toGateSummarySet = (conditionSet: {
  id: string;
  key: string;
  phase: string;
  mode: string;
  groupsJson: unknown;
  guidanceJson: unknown;
}) => ({
  id: conditionSet.id,
  key: conditionSet.key,
  phase: conditionSet.phase,
  mode: conditionSet.mode,
  groupsJson: conditionSet.groupsJson,
  guidanceJson: conditionSet.guidanceJson,
});

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
  primaryWorkflowStatus: TransitionExecutionDetailReadModel["primaryWorkflowExecution"] extends null
    ? never
    : NonNullable<TransitionExecutionDetailReadModel["primaryWorkflowExecution"]>["status"];
  completion: {
    passed: boolean;
    evaluatedAt: string;
    firstBlockingReason?: string;
    conditionTree?: unknown;
    evaluationTree?: RuntimeConditionEvaluationTree;
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
      evaluationTree: params.completion.evaluationTree,
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
    evaluationTree: params.completion.evaluationTree,
    actions: {
      chooseAnotherPrimaryWorkflow: {
        kind: "choose_primary_workflow_for_transition_execution",
        transitionExecutionId: params.transitionExecutionId,
      },
    },
  };
};

const toResolvedTransitionDefinition = (params: {
  detail: TransitionExecutionDetailReadModel;
  targetState?: {
    stateId: string;
    stateKey: string;
    stateLabel: string;
  };
  lifecycleTransition?: {
    id: string;
    transitionKey: string;
    fromStateId: string | null;
    toStateId: string | null;
  };
  startConditionSets: readonly {
    id: string;
    key: string;
    phase: string;
    mode: string;
    groupsJson: unknown;
    guidanceJson: unknown;
  }[];
  completionConditionSets: readonly {
    id: string;
    key: string;
    phase: string;
    mode: string;
    groupsJson: unknown;
    guidanceJson: unknown;
  }[];
  statesById: ReadonlyMap<string, { key: string; displayName: string | null }>;
  boundWorkflows?: readonly {
    workflowId: string;
    workflowKey: string | null;
  }[];
}): GetTransitionExecutionDetailOutput["transitionDefinition"] => {
  const transition = params.lifecycleTransition;
  const toState = transition?.toStateId ? params.statesById.get(transition.toStateId) : undefined;
  const fromState = transition?.fromStateId
    ? params.statesById.get(transition.fromStateId)
    : undefined;

  return {
    transitionId: params.detail.transitionExecution.transitionId,
    transitionKey: transition?.transitionKey ?? params.detail.transitionExecution.transitionId,
    transitionName: transition?.transitionKey ?? params.detail.transitionExecution.transitionId,
    ...(transition?.fromStateId ? { fromStateId: transition.fromStateId } : {}),
    ...(fromState ? { fromStateKey: fromState.key } : {}),
    ...(fromState?.displayName ? { fromStateLabel: fromState.displayName } : {}),
    toStateId: params.targetState?.stateId ?? transition?.toStateId ?? "unresolved-target-state",
    toStateKey: params.targetState?.stateKey ?? toState?.key ?? "unresolved-target-state",
    toStateLabel:
      params.targetState?.stateLabel ??
      toState?.displayName ??
      toState?.key ??
      "Pending activation target",
    boundWorkflows: (params.boundWorkflows ?? []).map((workflow) => ({
      workflowId: workflow.workflowId,
      workflowKey: workflow.workflowKey ?? workflow.workflowId,
      workflowName: workflow.workflowKey ?? workflow.workflowId,
    })),
    startConditionSets: params.startConditionSets.map(toGateSummarySet),
    completionConditionSets: params.completionConditionSets.map(toGateSummarySet),
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
    const lifecycleRepository = yield* LifecycleRepository;
    const projectContextRepository = yield* ProjectContextRepository;
    const runtimeGate = yield* RuntimeGateService;

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

        const projectPin = yield* projectContextRepository.findProjectPin(input.projectId);
        const lifecycleContext = projectPin
          ? yield* Effect.all({
              states: lifecycleRepository.findLifecycleStates(
                projectPin.methodologyVersionId,
                detail.workUnitTypeId,
              ),
              transitions: lifecycleRepository.findLifecycleTransitions(
                projectPin.methodologyVersionId,
                { workUnitTypeId: detail.workUnitTypeId },
              ),
              bindings: lifecycleRepository.findTransitionWorkflowBindings(
                projectPin.methodologyVersionId,
                detail.transitionExecution.transitionId,
              ),
              conditionSets: lifecycleRepository.findTransitionConditionSets(
                projectPin.methodologyVersionId,
                detail.transitionExecution.transitionId,
              ),
            })
          : null;

        const statesById = new Map(
          (lifecycleContext?.states ?? []).map(
            (state) => [state.id, { key: state.key, displayName: state.displayName }] as const,
          ),
        );
        const lifecycleTransition = lifecycleContext?.transitions.find(
          (transition) => transition.id === detail.transitionExecution.transitionId,
        );
        const startConditionSets = (lifecycleContext?.conditionSets ?? [])
          .filter((conditionSet) => conditionSet.phase !== "completion")
          .sort((a, b) => a.key.localeCompare(b.key));
        const completionConditionSets = (lifecycleContext?.conditionSets ?? [])
          .filter((conditionSet) => conditionSet.phase === "completion")
          .sort((a, b) => a.key.localeCompare(b.key));
        const completionConditionTree = toRuntimeConditionTree(completionConditionSets);
        const targetState = lifecycleTransition?.toStateId
          ? statesById.get(lifecycleTransition.toStateId)
          : undefined;
        const completionEvaluation = yield* runtimeGate
          .evaluateCompletionGateExhaustive({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
            conditionTree: completionConditionTree,
          })
          .pipe(
            Effect.mapError(
              mapGateError("transition-execution-detail.getTransitionExecutionDetail"),
            ),
          );
        const resolvedTargetState = lifecycleTransition?.toStateId
          ? {
              stateId: lifecycleTransition.toStateId,
              stateKey: targetState?.key ?? "unresolved-target-state",
              stateLabel:
                targetState?.displayName ?? targetState?.key ?? "Pending activation target",
            }
          : undefined;
        const completionGateState = {
          passed: completionEvaluation.result === "available",
          evaluatedAt: completionEvaluation.evaluatedAt,
          conditionTree: completionConditionTree,
          evaluationTree: completionEvaluation.evaluationTree,
          ...(completionEvaluation.firstReason
            ? { firstBlockingReason: completionEvaluation.firstReason }
            : {}),
        };
        const currentStateIdentity = detail.currentStateId
          ? {
              stateId: detail.currentStateId,
              stateKey: statesById.get(detail.currentStateId)?.key ?? detail.currentStateId,
              stateLabel:
                statesById.get(detail.currentStateId)?.displayName ?? detail.currentStateId,
            }
          : {
              stateId: "activation",
              stateKey: "activation",
              stateLabel: "Activation",
            };

        return {
          workUnit: {
            projectWorkUnitId: detail.transitionExecution.projectWorkUnitId,
            workUnitTypeId: detail.workUnitTypeId,
            workUnitTypeKey: detail.workUnitTypeId,
            workUnitTypeName: detail.workUnitTypeId,
            currentStateId: currentStateIdentity.stateId,
            currentStateKey: currentStateIdentity.stateKey,
            currentStateLabel: currentStateIdentity.stateLabel,
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
            ...toResolvedTransitionDefinition({
              detail,
              ...(resolvedTargetState ? { targetState: resolvedTargetState } : {}),
              ...(lifecycleTransition ? { lifecycleTransition } : {}),
              startConditionSets,
              completionConditionSets,
              statesById,
              ...(lifecycleContext?.bindings ? { boundWorkflows: lifecycleContext.bindings } : {}),
            }),
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
            primaryWorkflowStatus: detail.primaryWorkflowExecution?.status ?? "active",
            completion: completionGateState,
          }),
        } satisfies GetTransitionExecutionDetailOutput;
      });

    return TransitionExecutionDetailService.of({ getTransitionExecutionDetail });
  }),
);
