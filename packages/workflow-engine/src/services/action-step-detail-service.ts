import type {
  RuntimeActionPropagationMapping,
  RuntimeActionStepExecutionDetailBody,
} from "@chiron/contracts/runtime/executions";
import { MethodologyRepository, LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ActionStepRuntimeRepository } from "../repositories/action-step-runtime-repository";
import type { WorkflowExecutionDetailReadModel } from "../repositories/execution-read-repository";
import { type RuntimeStepExecutionRow } from "../repositories/step-execution-repository";
import { ActionStepRuntimeService } from "./action-step-runtime-service";

const makeActionDetailError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "action-step-detail",
    cause: new Error(cause),
  });

export interface BuildActionStepExecutionDetailBodyParams {
  readonly projectId: string;
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly workflowDetail: WorkflowExecutionDetailReadModel;
}

type ActionBody = RuntimeActionStepExecutionDetailBody["actions"][number];
type ItemBody = ActionBody["items"][number];

export class ActionStepDetailService extends Context.Tag(
  "@chiron/workflow-engine/services/ActionStepDetailService",
)<
  ActionStepDetailService,
  {
    readonly buildActionStepExecutionDetailBody: (
      params: BuildActionStepExecutionDetailBodyParams,
    ) => Effect.Effect<RuntimeActionStepExecutionDetailBody, RepositoryError>;
  }
>() {}

export const ActionStepDetailServiceLive = Layer.effect(
  ActionStepDetailService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const runtimeRepo = yield* ActionStepRuntimeRepository;
    const actionRuntime = yield* ActionStepRuntimeService;

    const buildActionStepExecutionDetailBody = ({
      projectId,
      stepExecution,
      workflowDetail,
    }: BuildActionStepExecutionDetailBodyParams) =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(projectId);
        if (!projectPin) {
          return yield* makeActionDetailError("project methodology pin missing");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (candidate) => candidate.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makeActionDetailError("work-unit type missing for action detail");
        }

        const [actionStep, workflowEditor, actionRows, completionSummary, previewItemsById] =
          yield* Effect.all([
            methodologyRepo.getActionStepDefinition({
              versionId: projectPin.methodologyVersionId,
              workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
              stepId: stepExecution.stepDefinitionId,
            }),
            methodologyRepo.getWorkflowEditorDefinition({
              versionId: projectPin.methodologyVersionId,
              workUnitTypeKey: workUnitType.key,
              workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
            }),
            runtimeRepo.listActionExecutions(stepExecution.id),
            actionRuntime.getCompletionEligibility({
              projectId,
              stepExecutionId: stepExecution.id,
            }),
            actionRuntime.listActionItemPreviewState({
              projectId,
              stepExecutionId: stepExecution.id,
            }),
          ]);

        if (!actionStep) {
          return yield* makeActionDetailError("action step definition missing for runtime detail");
        }

        const actionRowsById = new Map(
          actionRows.map((row) => [row.actionDefinitionId, row] as const),
        );
        const contextFactsById = new Map(
          workflowEditor.contextFacts.flatMap((fact) =>
            typeof fact.contextFactDefinitionId === "string"
              ? [[fact.contextFactDefinitionId, fact] as const]
              : [],
          ),
        );

        const actions = yield* Effect.forEach(
          [...actionStep.payload.actions].sort((left, right) => left.sortOrder - right.sortOrder),
          (action) =>
            Effect.gen(function* () {
              const actionRow = actionRowsById.get(action.actionId);
              const itemRows = actionRow
                ? yield* runtimeRepo.listActionExecutionItems(actionRow.id)
                : [];
              const itemRowsById = new Map(
                itemRows.map((row) => [row.itemDefinitionId, row] as const),
              );
              const contextFact = contextFactsById.get(action.contextFactDefinitionId);
              const runBlockedReason = getRunBlockedReason({
                stepExecution,
                action,
                executionMode: actionStep.payload.executionMode,
                actionRowsById,
                allActions: actionStep.payload.actions,
              });

              const items = [...action.items]
                .sort((left, right) => left.sortOrder - right.sortOrder)
                .map((item) => {
                  const itemRow = itemRowsById.get(item.itemId);
                  const previewTarget = previewItemsById.get(item.itemId) ?? {
                    targetContextFactDefinitionId: item.targetContextFactDefinitionId,
                    targetContextFactKey: undefined,
                    targetContextFactKind: "bound_fact" as const,
                    affectedTargets: [],
                    propagationMappings: [],
                  };
                  const itemSkipBlockedReason = getItemSkipBlockedReason({
                    stepExecution,
                    action,
                    ...(actionRow ? { actionRow } : {}),
                    ...(itemRow ? { itemRow } : {}),
                  });
                  const recoveryRequired =
                    itemRow &&
                    isRecord(itemRow.resultJson) &&
                    itemRow.resultJson.code === "missing_bound_target";

                  return {
                    itemId: item.itemId,
                    itemKey: item.itemKey,
                    ...(item.label ? { label: item.label } : {}),
                    sortOrder: item.sortOrder,
                    targetContextFactDefinitionId: previewTarget.targetContextFactDefinitionId,
                    ...(previewTarget.targetContextFactKey
                      ? { targetContextFactKey: previewTarget.targetContextFactKey }
                      : {}),
                    targetContextFactKind: previewTarget.targetContextFactKind,
                    status: mapItemStatus(itemRow),
                    ...(itemRow?.resultSummaryJson
                      ? { resultSummaryJson: itemRow.resultSummaryJson }
                      : {}),
                    ...(itemRow?.resultJson ? { resultJson: itemRow.resultJson } : {}),
                    affectedTargets:
                      itemRow?.status === "succeeded" &&
                      hasResultCode(itemRow.resultJson, "propagation_applied")
                        ? previewTarget.affectedTargets
                        : (itemRow?.affectedTargetsJson ?? previewTarget.affectedTargets),
                    propagationMappings:
                      itemRow?.status === "succeeded" &&
                      hasResultCode(itemRow.resultJson, "propagation_applied")
                        ? previewTarget.propagationMappings
                        : (readPropagationMappings(itemRow?.resultJson) ??
                          previewTarget.propagationMappings),
                    ...(recoveryRequired
                      ? {
                          recoveryAction: {
                            kind: "recreate_bound_target_from_context_value" as const,
                            enabled: true,
                          },
                        }
                      : {}),
                    skipAction: {
                      kind: "skip_action_step_action_items" as const,
                      enabled: !itemSkipBlockedReason,
                      ...(itemSkipBlockedReason ? { reasonIfDisabled: itemSkipBlockedReason } : {}),
                      actionId: action.actionId,
                      itemId: item.itemId,
                    },
                  } satisfies ItemBody;
                });

              const actionSkipBlockedReason = getSkipBlockedReason({
                stepExecution,
                action,
                ...(actionRow ? { actionRow } : {}),
              });

              return {
                actionId: action.actionId,
                actionKey: action.actionKey,
                ...(action.label ? { label: action.label } : {}),
                enabled: action.enabled,
                sortOrder: action.sortOrder,
                actionKind: action.actionKind,
                contextFactDefinitionId: action.contextFactDefinitionId,
                ...(contextFact ? { contextFactKey: contextFact.key } : {}),
                contextFactKind: action.contextFactKind,
                status: mapActionStatus(actionRow),
                ...(actionRow?.resultSummaryJson
                  ? { resultSummaryJson: actionRow.resultSummaryJson }
                  : {}),
                ...(actionRow?.resultJson ? { resultJson: actionRow.resultJson } : {}),
                items,
                runAction: {
                  kind: "run_action_step_actions" as const,
                  enabled: !runBlockedReason,
                  ...(runBlockedReason ? { reasonIfDisabled: runBlockedReason } : {}),
                  actionId: action.actionId,
                },
                retryAction: {
                  kind: "retry_action_step_actions" as const,
                  enabled:
                    stepExecution.status === "active" &&
                    action.enabled &&
                    actionRow?.status === "needs_attention",
                  ...((stepExecution.status !== "active"
                    ? { reasonIfDisabled: "Only active Action steps can retry actions." }
                    : !action.enabled
                      ? { reasonIfDisabled: "Disabled actions cannot be retried." }
                      : actionRow?.status !== "needs_attention"
                        ? { reasonIfDisabled: "Only needs-attention actions are retryable." }
                        : {}) as {}),
                  actionId: action.actionId,
                },
                skipAction: {
                  kind: "skip_action_step_actions" as const,
                  enabled: !actionSkipBlockedReason,
                  ...(actionSkipBlockedReason
                    ? {
                        reasonIfDisabled: actionSkipBlockedReason,
                      }
                    : {}),
                  actionId: action.actionId,
                },
              } satisfies ActionBody;
            }),
        );

        return {
          stepType: "action",
          executionMode: actionStep.payload.executionMode,
          runtimeRowPolicy: "lazy_on_first_execution",
          duplicateRunPolicy: "idempotent_noop",
          duplicateRetryPolicy: "idempotent_noop",
          completionSummary,
          actions,
        } satisfies RuntimeActionStepExecutionDetailBody;
      });

    return ActionStepDetailService.of({ buildActionStepExecutionDetailBody });
  }),
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPropagationMappings(
  value: unknown,
): readonly RuntimeActionPropagationMapping[] | undefined {
  if (!isRecord(value) || !Array.isArray(value.propagationMappings)) {
    return undefined;
  }

  return value.propagationMappings as readonly RuntimeActionPropagationMapping[];
}

function hasResultCode(value: unknown, expectedCode: string): boolean {
  return isRecord(value) && value.code === expectedCode;
}

function getRunBlockedReason(params: {
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly action: {
    actionId: string;
    enabled: boolean;
    sortOrder: number;
  };
  readonly executionMode: RuntimeActionStepExecutionDetailBody["executionMode"];
  readonly actionRowsById: ReadonlyMap<string, { status: string }>;
  readonly allActions: ReadonlyArray<{
    actionId: string;
    enabled: boolean;
    sortOrder: number;
  }>;
}) {
  if (params.stepExecution.status !== "active") {
    return "Only active Action steps can run actions.";
  }
  if (!params.action.enabled) {
    return "Disabled actions cannot be run.";
  }

  const currentStatus = params.actionRowsById.get(params.action.actionId)?.status;
  if (currentStatus === "running") {
    return "Action is already running.";
  }
  if (currentStatus === "succeeded") {
    return "Action has already succeeded.";
  }

  if (params.executionMode !== "sequential") {
    return undefined;
  }

  const priorBlocking = [...params.allActions]
    .filter((candidate) => candidate.enabled && candidate.sortOrder < params.action.sortOrder)
    .find((candidate) => params.actionRowsById.get(candidate.actionId)?.status !== "succeeded");

  return priorBlocking
    ? "Sequential mode requires all earlier enabled actions to succeed first."
    : undefined;
}

function mapActionStatus(
  actionRow?: { status: "running" | "succeeded" | "needs_attention"; resultJson: unknown } | null,
): "not_started" | "running" | "succeeded" | "needs_attention" | "skipped" {
  if (!actionRow) {
    return "not_started";
  }

  if (
    actionRow.status === "succeeded" &&
    hasResultCode(actionRow.resultJson, "propagation_action_skipped")
  ) {
    return "skipped";
  }

  return actionRow.status;
}

function mapItemStatus(
  itemRow?: {
    status: "running" | "succeeded" | "failed" | "needs_attention";
    resultJson: unknown;
  } | null,
): "not_started" | "running" | "succeeded" | "failed" | "needs_attention" | "skipped" {
  if (!itemRow) {
    return "not_started";
  }

  if (
    itemRow.status === "succeeded" &&
    hasResultCode(itemRow.resultJson, "propagation_item_skipped")
  ) {
    return "skipped";
  }

  return itemRow.status;
}

function getSkipBlockedReason(params: {
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly action: { enabled: boolean };
  readonly actionRow?: { status: string; resultJson: unknown } | undefined;
}): string | undefined {
  if (params.stepExecution.status !== "active") {
    return "Only active Action steps can skip actions.";
  }
  if (!params.action.enabled) {
    return "Disabled actions cannot be skipped.";
  }

  if (params.actionRow?.status === "running") {
    return "Action is already running.";
  }

  if (params.actionRow?.status === "succeeded") {
    return hasResultCode(params.actionRow.resultJson, "propagation_action_skipped")
      ? "Action was already skipped."
      : "Action has already succeeded.";
  }

  return undefined;
}

function getItemSkipBlockedReason(params: {
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly action: { enabled: boolean; items: readonly { itemId: string }[] };
  readonly actionRow?: { status: string } | undefined;
  readonly itemRow?: { status: string; resultJson: unknown } | undefined;
}): string | undefined {
  if (params.stepExecution.status !== "active") {
    return "Only active Action steps can skip items.";
  }
  if (!params.action.enabled) {
    return "Disabled actions cannot skip items.";
  }
  if (params.actionRow?.status === "running") {
    return "Action is already running.";
  }
  if (params.itemRow?.status === "running") {
    return "Item is already running.";
  }
  if (params.itemRow?.status === "succeeded") {
    return hasResultCode(params.itemRow.resultJson, "propagation_item_skipped")
      ? "Item was already skipped."
      : "Item has already succeeded.";
  }

  return undefined;
}
