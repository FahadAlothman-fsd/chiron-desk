import type {
  RetryActionStepActionsOutput,
  RunActionStepActionsOutput,
  RuntimeActionAffectedTarget,
  RuntimeActionCompletionSummary,
  StartActionStepExecutionOutput,
} from "@chiron/contracts/runtime/executions";
import type { WorkflowContextFactDto } from "@chiron/contracts/methodology/workflow";
import {
  LifecycleRepository,
  MethodologyRepository,
  type WorkflowActionStepDefinitionReadModel,
} from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import {
  ActionStepRuntimeRepository,
  type ActionStepExecutionActionItemRow,
  type ActionStepExecutionActionRow,
} from "../repositories/action-step-runtime-repository";
import {
  ExecutionReadRepository,
  type WorkflowExecutionDetailReadModel,
} from "../repositories/execution-read-repository";
import {
  StepExecutionRepository,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowExecutionContextFactRow,
} from "../repositories/step-execution-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

const makeActionRuntimeError = (operation: string, cause: string): RepositoryError =>
  new RepositoryError({
    operation,
    cause: new Error(cause),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isExternalEnvelope = (
  value: unknown,
): value is { factInstanceId?: unknown; value?: unknown } => isRecord(value);

const isArtifactReferenceValue = (value: unknown): value is { relativePath: string } =>
  isRecord(value) && typeof value.relativePath === "string" && value.relativePath.trim().length > 0;

type LoadedActionRuntimeContext = {
  readonly projectId: string;
  readonly methodologyVersionId: string;
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly workflowDetail: WorkflowExecutionDetailReadModel;
  readonly actionStep: WorkflowActionStepDefinitionReadModel;
  readonly workflowContextFacts: readonly (WorkflowContextFactDto & {
    readonly contextFactDefinitionId: string;
  })[];
};

type ActionDefinition = LoadedActionRuntimeContext["actionStep"]["payload"]["actions"][number];
type ActionItemDefinition = ActionDefinition["items"][number];
type ActionRow = ActionStepExecutionActionRow;
type ActionItemRow = ActionStepExecutionActionItemRow;

type ExecutedItemOutcome = {
  readonly itemDefinitionId: string;
  readonly targetContextFactDefinitionId: string;
  readonly status: ActionItemRow["status"];
  readonly resultSummaryJson: unknown;
  readonly resultJson: unknown;
  readonly affectedTargets: readonly RuntimeActionAffectedTarget[];
};

type EffectiveTargetContext = {
  readonly contextFactDefinitionId: string;
  readonly contextFactKind: ActionDefinition["contextFactKind"];
  readonly contextFactKey: string;
  readonly contextFactLabel?: string;
};

type ExecuteActionAttemptResult = {
  readonly action: ActionDefinition;
  readonly actionRow: ActionRow;
  readonly itemOutcomes: readonly ExecutedItemOutcome[];
};

const buildCompletionSummary = (params: {
  readonly actionDefinitions: readonly ActionDefinition[];
  readonly actionRows: readonly ActionRow[];
}): RuntimeActionCompletionSummary => {
  const enabledActionIds = new Set(
    params.actionDefinitions.filter((action) => action.enabled).map((action) => action.actionId),
  );

  const relevantRows = params.actionRows.filter((row) =>
    enabledActionIds.has(row.actionDefinitionId),
  );
  const hasSucceeded = relevantRows.some((row) => row.status === "succeeded");
  const hasRunning = relevantRows.some((row) => row.status === "running");

  return {
    mode: "manual",
    eligible: hasSucceeded && !hasRunning,
    requiresAtLeastOneSucceededAction: true,
    blockedByRunningActions: true,
    reasonIfIneligible: hasRunning
      ? "Action step cannot complete while actions are still running."
      : !hasSucceeded
        ? "Action step requires at least one succeeded action before completion."
        : undefined,
  };
};

export class ActionStepRuntimeService extends Context.Tag(
  "@chiron/workflow-engine/services/ActionStepRuntimeService",
)<
  ActionStepRuntimeService,
  {
    readonly startExecution: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Effect.Effect<StartActionStepExecutionOutput, RepositoryError>;
    readonly runActions: (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) => Effect.Effect<RunActionStepActionsOutput, RepositoryError>;
    readonly retryActions: (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) => Effect.Effect<RetryActionStepActionsOutput, RepositoryError>;
    readonly completeStep: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Effect.Effect<{ stepExecutionId: string; status: "completed" }, RepositoryError>;
    readonly getCompletionEligibility: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Effect.Effect<RuntimeActionCompletionSummary, RepositoryError>;
  }
>() {}

export const ActionStepRuntimeServiceLive = Layer.effect(
  ActionStepRuntimeService,
  Effect.gen(function* () {
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const executionReadRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const runtimeRepo = yield* ActionStepRuntimeRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;

    const loadContext = (input: {
      projectId: string;
      stepExecutionId: string;
    }): Effect.Effect<LoadedActionRuntimeContext, RepositoryError> =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepo.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "project methodology pin missing",
          );
        }

        const stepExecution = yield* stepRepo.getStepExecutionById(input.stepExecutionId);
        if (!stepExecution) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "step execution not found",
          );
        }
        if (stepExecution.stepType !== "action") {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "step execution is not an Action step",
          );
        }

        const workflowDetail = yield* executionReadRepo.getWorkflowExecutionDetail(
          stepExecution.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== input.projectId) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "workflow execution does not belong to project",
          );
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (entry) => entry.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "workflow work-unit type not found",
          );
        }

        const [actionStep, workflowEditor] = yield* Effect.all([
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
        ]);
        if (!actionStep) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.context",
            "action step definition not found",
          );
        }

        return {
          projectId: input.projectId,
          methodologyVersionId: projectPin.methodologyVersionId,
          stepExecution,
          workflowDetail,
          actionStep,
          workflowContextFacts: workflowEditor.contextFacts.filter(
            (
              fact,
            ): fact is (typeof workflowEditor.contextFacts)[number] & {
              contextFactDefinitionId: string;
            } => typeof fact.contextFactDefinitionId === "string",
          ),
        } satisfies LoadedActionRuntimeContext;
      });

    const listRuntimeRowsByActionId = (
      stepExecutionId: string,
    ): Effect.Effect<Map<string, ActionRow>, RepositoryError> =>
      runtimeRepo
        .listActionExecutions(stepExecutionId)
        .pipe(
          Effect.map((rows) => new Map(rows.map((row) => [row.actionDefinitionId, row] as const))),
        );

    const assertKnownSelectedActions = (params: {
      readonly selectedActionIds: readonly string[];
      readonly actionDefinitions: readonly ActionDefinition[];
    }): Effect.Effect<readonly ActionDefinition[], RepositoryError> =>
      Effect.gen(function* () {
        const selectedSet = new Set(params.selectedActionIds);
        const known = params.actionDefinitions.filter((action) => selectedSet.has(action.actionId));

        if (known.length !== selectedSet.size) {
          const knownIds = new Set(known.map((action) => action.actionId));
          const unknown = [...selectedSet].filter((actionId) => !knownIds.has(actionId));
          return yield* makeActionRuntimeError(
            "action-step-runtime.selection",
            `unknown action ids: ${unknown.join(", ")}`,
          );
        }

        const disabled = known.filter((action) => !action.enabled);
        if (disabled.length > 0) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.selection",
            `disabled actions cannot run: ${disabled.map((action) => action.actionId).join(", ")}`,
          );
        }

        return [...known].sort((left, right) => left.sortOrder - right.sortOrder);
      });

    const assertSequentialSelection = (params: {
      readonly selectedActions: readonly ActionDefinition[];
      readonly allActions: readonly ActionDefinition[];
      readonly actionRowsById: ReadonlyMap<string, ActionRow>;
    }): Effect.Effect<void, RepositoryError> =>
      Effect.gen(function* () {
        const enabledActions = params.allActions
          .filter((action) => action.enabled)
          .sort((left, right) => left.sortOrder - right.sortOrder);
        const selectedIds = new Set(params.selectedActions.map((action) => action.actionId));
        const alreadyCovered = new Set<string>();

        for (const action of params.selectedActions) {
          const priorBlocking = enabledActions.find(
            (candidate) =>
              candidate.sortOrder < action.sortOrder &&
              !alreadyCovered.has(candidate.actionId) &&
              !(params.actionRowsById.get(candidate.actionId)?.status === "succeeded"),
          );

          if (priorBlocking && !selectedIds.has(priorBlocking.actionId)) {
            return yield* makeActionRuntimeError(
              "action-step-runtime.sequential",
              `sequential execution cannot skip '${priorBlocking.actionId}' before '${action.actionId}'`,
            );
          }

          alreadyCovered.add(action.actionId);
        }
      });

    const resolveEffectiveTargetContext = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly action: ActionDefinition;
      readonly item: ActionItemDefinition;
    }): Effect.Effect<EffectiveTargetContext, RepositoryError> =>
      Effect.gen(function* () {
        const contextFactDefinitionId =
          params.item.targetContextFactDefinitionId ?? params.action.contextFactDefinitionId;
        const contextFact = params.context.workflowContextFacts.find(
          (fact) => fact.contextFactDefinitionId === contextFactDefinitionId,
        );

        if (!contextFact) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.target-context",
            `workflow context fact '${contextFactDefinitionId}' could not be resolved`,
          );
        }

        return {
          contextFactDefinitionId,
          contextFactKind: contextFact.kind,
          contextFactKey: contextFact.key,
          ...(contextFact.label ? { contextFactLabel: contextFact.label } : {}),
        } satisfies EffectiveTargetContext;
      });

    const normalizeExternalContextRows = (params: {
      readonly targetContextFactDefinitionId: string;
      readonly contextRows: readonly RuntimeWorkflowExecutionContextFactRow[];
      readonly persistedRowsByOrder: ReadonlyMap<number, string>;
    }) => {
      const relevantRows = params.contextRows
        .filter((row) => row.contextFactDefinitionId === params.targetContextFactDefinitionId)
        .sort((left, right) => left.instanceOrder - right.instanceOrder);

      const normalized = relevantRows.map((row) => {
        if (isExternalEnvelope(row.valueJson) && typeof row.valueJson.factInstanceId === "string") {
          return {
            contextFactDefinitionId: row.contextFactDefinitionId,
            instanceOrder: row.instanceOrder,
            valueJson: row.valueJson,
            changed: false,
          };
        }

        const currentValue =
          isExternalEnvelope(row.valueJson) && "value" in row.valueJson
            ? row.valueJson.value
            : row.valueJson;

        return {
          contextFactDefinitionId: row.contextFactDefinitionId,
          instanceOrder: row.instanceOrder,
          valueJson: {
            factInstanceId: params.persistedRowsByOrder.get(row.instanceOrder),
            value: currentValue,
          },
          changed:
            typeof params.persistedRowsByOrder.get(row.instanceOrder) === "string" ||
            !isExternalEnvelope(row.valueJson) ||
            row.valueJson.factInstanceId !== params.persistedRowsByOrder.get(row.instanceOrder),
        };
      });

      return {
        relevantRows,
        normalized,
      };
    };

    const persistMissingExternalFactInstances = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly target: EffectiveTargetContext;
      readonly relevantRows: readonly RuntimeWorkflowExecutionContextFactRow[];
    }): Effect.Effect<ReadonlyMap<number, string>, RepositoryError> =>
      Effect.gen(function* () {
        const contextFact = params.context.workflowContextFacts.find(
          (fact) => fact.contextFactDefinitionId === params.target.contextFactDefinitionId,
        );
        if (
          !contextFact ||
          (contextFact.kind !== "definition_backed_external_fact" &&
            contextFact.kind !== "bound_external_fact")
        ) {
          return new Map<number, string>();
        }

        const [factSchemas, factDefinitions] = yield* Effect.all([
          lifecycleRepo.findFactSchemas(params.context.methodologyVersionId),
          methodologyRepo.findFactDefinitionsByVersionId(params.context.methodologyVersionId),
        ]);

        const factSchemasOrdered = [...factSchemas].sort((left, right) => {
          const leftPriority =
            left.workUnitTypeId === params.context.workflowDetail.workUnitTypeId ? 0 : 1;
          const rightPriority =
            right.workUnitTypeId === params.context.workflowDetail.workUnitTypeId ? 0 : 1;
          return (
            leftPriority - rightPriority ||
            left.key.localeCompare(right.key) ||
            left.id.localeCompare(right.id)
          );
        });

        const factSchemasById = new Map(
          factSchemasOrdered.map((schema) => [schema.id, schema] as const),
        );
        const factSchemasByKey = new Map<string, (typeof factSchemasOrdered)[number]>();
        for (const schema of factSchemasOrdered) {
          if (!factSchemasByKey.has(schema.key)) {
            factSchemasByKey.set(schema.key, schema);
          }
        }

        const factDefinitionsById = new Map(
          factDefinitions.map((definition) => [definition.id, definition] as const),
        );
        const factDefinitionsByKey = new Map<string, (typeof factDefinitions)[number]>();
        for (const definition of factDefinitions) {
          if (!factDefinitionsByKey.has(definition.key)) {
            factDefinitionsByKey.set(definition.key, definition);
          }
        }

        const externalBindingId = contextFact.externalFactDefinitionId;
        const workUnitFactSchemaById = factSchemasById.get(externalBindingId);
        const projectFactDefinitionById = factDefinitionsById.get(externalBindingId);
        const workUnitFactSchemaByKey = factSchemasByKey.get(externalBindingId);
        const projectFactDefinitionByKey = factDefinitionsByKey.get(externalBindingId);

        const workUnitFactSchema = workUnitFactSchemaById
          ? workUnitFactSchemaById
          : !projectFactDefinitionByKey
            ? workUnitFactSchemaByKey
            : undefined;
        const projectFactDefinition = projectFactDefinitionById
          ? projectFactDefinitionById
          : !workUnitFactSchemaByKey
            ? projectFactDefinitionByKey
            : undefined;

        const persistedEntries = yield* Effect.forEach(params.relevantRows, (row) =>
          Effect.gen(function* () {
            if (
              isExternalEnvelope(row.valueJson) &&
              typeof row.valueJson.factInstanceId === "string"
            ) {
              return [row.instanceOrder, row.valueJson.factInstanceId] as const;
            }

            const currentValue =
              isExternalEnvelope(row.valueJson) && "value" in row.valueJson
                ? row.valueJson.value
                : row.valueJson;

            if (workUnitFactSchema) {
              const instance = yield* workUnitFactRepo.createFactInstance({
                projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
                factDefinitionId: workUnitFactSchema.id,
                valueJson: currentValue,
                producedByTransitionExecutionId:
                  params.context.workflowDetail.transitionExecution.id,
                producedByWorkflowExecutionId: params.context.stepExecution.workflowExecutionId,
              });
              return [row.instanceOrder, instance.id] as const;
            }

            if (projectFactDefinition) {
              const instance = yield* projectFactRepo.createFactInstance({
                projectId: params.context.projectId,
                factDefinitionId: projectFactDefinition.id,
                valueJson: currentValue,
                producedByTransitionExecutionId:
                  params.context.workflowDetail.transitionExecution.id,
                producedByWorkflowExecutionId: params.context.stepExecution.workflowExecutionId,
              });
              return [row.instanceOrder, instance.id] as const;
            }

            return yield* makeActionRuntimeError(
              "action-step-runtime.persist",
              `external fact definition '${externalBindingId}' could not be resolved`,
            );
          }),
        );

        return new Map(persistedEntries);
      });

    const executeActionAttempt = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly action: ActionDefinition;
      readonly existingActionRow: ActionRow | null;
    }): Effect.Effect<ExecuteActionAttemptResult, RepositoryError> =>
      Effect.gen(function* () {
        const actionRow = params.existingActionRow
          ? ((yield* runtimeRepo.updateActionExecution({
              actionExecutionId: params.existingActionRow.id,
              status: "running",
              resultSummaryJson: null,
              resultJson: null,
            })) ?? params.existingActionRow)
          : yield* runtimeRepo.createActionExecution({
              stepExecutionId: params.context.stepExecution.id,
              actionDefinitionId: params.action.actionId,
              actionKind: params.action.actionKind,
              status: "running",
            });

        let allContextRows = yield* stepRepo.listWorkflowExecutionContextFacts(
          params.context.stepExecution.workflowExecutionId,
        );

        const itemOutcomes = yield* Effect.forEach(
          [...params.action.items].sort((left, right) => left.sortOrder - right.sortOrder),
          (item) =>
            Effect.gen(function* () {
              const effectiveTarget = yield* resolveEffectiveTargetContext({
                context: params.context,
                action: params.action,
                item,
              });
              const relevantRows = allContextRows
                .filter(
                  (row) => row.contextFactDefinitionId === effectiveTarget.contextFactDefinitionId,
                )
                .sort((left, right) => left.instanceOrder - right.instanceOrder);

              const persistedRowsByOrder =
                effectiveTarget.contextFactKind === "artifact_reference_fact"
                  ? new Map<number, string>()
                  : yield* persistMissingExternalFactInstances({
                      context: params.context,
                      target: effectiveTarget,
                      relevantRows,
                    });

              const maybePersistedRows =
                effectiveTarget.contextFactKind === "definition_backed_external_fact" ||
                effectiveTarget.contextFactKind === "bound_external_fact"
                  ? normalizeExternalContextRows({
                      targetContextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
                      contextRows: allContextRows,
                      persistedRowsByOrder,
                    })
                  : null;

              if (maybePersistedRows && maybePersistedRows.normalized.some((row) => row.changed)) {
                yield* stepRepo.replaceWorkflowExecutionContextFacts({
                  workflowExecutionId: params.context.stepExecution.workflowExecutionId,
                  sourceStepExecutionId: params.context.stepExecution.id,
                  affectedContextFactDefinitionIds: [effectiveTarget.contextFactDefinitionId],
                  currentValues: maybePersistedRows.normalized.map((row) => ({
                    contextFactDefinitionId: row.contextFactDefinitionId,
                    instanceOrder: row.instanceOrder,
                    valueJson: row.valueJson,
                  })),
                });

                allContextRows = allContextRows
                  .filter(
                    (row) =>
                      row.contextFactDefinitionId !== effectiveTarget.contextFactDefinitionId,
                  )
                  .concat(
                    maybePersistedRows.normalized.map((row) => ({
                      id: `${params.context.stepExecution.id}:${effectiveTarget.contextFactDefinitionId}:${row.instanceOrder}`,
                      workflowExecutionId: params.context.stepExecution.workflowExecutionId,
                      contextFactDefinitionId: row.contextFactDefinitionId,
                      instanceOrder: row.instanceOrder,
                      valueJson: row.valueJson,
                      sourceStepExecutionId: params.context.stepExecution.id,
                      createdAt: new Date(0),
                      updatedAt: new Date(0),
                    })),
                  );
              }

              const usableRows = maybePersistedRows
                ? maybePersistedRows.normalized.map((row) => ({
                    contextFactDefinitionId: row.contextFactDefinitionId,
                    instanceOrder: row.instanceOrder,
                    valueJson: row.valueJson,
                  }))
                : relevantRows.map((row) => ({
                    contextFactDefinitionId: row.contextFactDefinitionId,
                    instanceOrder: row.instanceOrder,
                    valueJson: row.valueJson,
                  }));

              const affectedTargetsForItem = resolveAffectedTargets({
                target: effectiveTarget,
                rows: usableRows,
              });
              const outcomeStatus = resolveItemExecutionStatus({
                contextFactKind: effectiveTarget.contextFactKind,
                rows: usableRows,
              });

              const resultSummaryJson =
                outcomeStatus.status === "succeeded"
                  ? {
                      status: "succeeded",
                      affectedTargetCount: affectedTargetsForItem.length,
                    }
                  : {
                      status: outcomeStatus.status,
                      reason: outcomeStatus.reason,
                    };

              const resultJson =
                outcomeStatus.status === "succeeded"
                  ? {
                      code: "propagation_applied",
                      contextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
                      contextFactKind: effectiveTarget.contextFactKind,
                      affectedTargets: affectedTargetsForItem,
                    }
                  : {
                      code: outcomeStatus.code,
                      contextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
                      contextFactKind: effectiveTarget.contextFactKind,
                      reason: outcomeStatus.reason,
                    };

              const existingItem = yield* runtimeRepo.getActionExecutionItemByDefinitionId({
                actionExecutionId: actionRow.id,
                itemDefinitionId: item.itemId,
              });

              if (existingItem) {
                yield* runtimeRepo.updateActionExecutionItem({
                  actionExecutionId: actionRow.id,
                  itemDefinitionId: item.itemId,
                  status: outcomeStatus.status,
                  resultSummaryJson,
                  resultJson,
                  affectedTargetsJson: affectedTargetsForItem,
                });
              } else {
                yield* runtimeRepo.createActionExecutionItem({
                  actionExecutionId: actionRow.id,
                  itemDefinitionId: item.itemId,
                  status: outcomeStatus.status,
                  resultSummaryJson,
                  resultJson,
                  affectedTargetsJson: affectedTargetsForItem,
                });
              }

              return {
                itemDefinitionId: item.itemId,
                targetContextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
                status: outcomeStatus.status,
                resultSummaryJson,
                resultJson,
                affectedTargets: affectedTargetsForItem,
              } satisfies ExecutedItemOutcome;
            }),
        );

        const actionStatus = deriveActionStatus(itemOutcomes.map((item) => item.status));
        const updatedAction = yield* runtimeRepo.updateActionExecution({
          actionExecutionId: actionRow.id,
          status: actionStatus,
          resultSummaryJson: {
            status: actionStatus,
            itemCount: itemOutcomes.length,
            succeededItemCount: itemOutcomes.filter((item) => item.status === "succeeded").length,
            attentionItemCount: itemOutcomes.filter((item) => item.status !== "succeeded").length,
          },
          resultJson: {
            itemResults: itemOutcomes.map((item) => ({
              itemDefinitionId: item.itemDefinitionId,
              status: item.status,
            })),
          },
        });

        return {
          action: params.action,
          actionRow: updatedAction ?? actionRow,
          itemOutcomes,
        } satisfies ExecuteActionAttemptResult;
      });

    const runSelectedActionsInternal = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly selectedActions: readonly ActionDefinition[];
      readonly retry: boolean;
      readonly stopAfterFirstFailure: boolean;
    }) =>
      Effect.gen(function* () {
        yield* runtimeRepo.createActionStepExecution({
          stepExecutionId: params.context.stepExecution.id,
        });

        const startingRowsById = yield* listRuntimeRowsByActionId(params.context.stepExecution.id);

        if (
          !params.retry &&
          params.context.actionStep.payload.executionMode === "sequential" &&
          params.selectedActions.length > 0
        ) {
          yield* assertSequentialSelection({
            selectedActions: params.selectedActions,
            allActions: params.context.actionStep.payload.actions,
            actionRowsById: startingRowsById,
          });
        }

        const runOne = (action: ActionDefinition) =>
          Effect.gen(function* () {
            const existing = startingRowsById.get(action.actionId) ?? null;

            if (params.retry) {
              if (existing?.status === "running") {
                return {
                  actionId: action.actionId,
                  result: "already_running" as const,
                  status: "running",
                };
              }
              if (existing?.status !== "needs_attention") {
                return {
                  actionId: action.actionId,
                  result: "not_retryable" as const,
                  status: existing?.status ?? "not_started",
                };
              }

              const executed = yield* executeActionAttempt({
                context: params.context,
                action,
                existingActionRow: existing,
              });
              return {
                actionId: action.actionId,
                result: "started" as const,
                status: executed.actionRow.status,
              };
            }

            if (existing?.status === "running") {
              return {
                actionId: action.actionId,
                result: "already_running" as const,
                status: "running",
              };
            }
            if (existing?.status === "succeeded") {
              return {
                actionId: action.actionId,
                result: "already_succeeded" as const,
                status: "succeeded" as const,
              };
            }

            const executed = yield* executeActionAttempt({
              context: params.context,
              action,
              existingActionRow: existing,
            });

            return {
              actionId: action.actionId,
              result: "started" as const,
              status: executed.actionRow.status,
            };
          });

        if (params.context.actionStep.payload.executionMode === "parallel" || params.retry) {
          return yield* Effect.forEach(params.selectedActions, runOne, {
            concurrency: "unbounded",
          });
        }

        const results: Array<{
          actionId: string;
          result: "started" | "already_running" | "already_succeeded" | "not_retryable";
          status: string;
        }> = [];

        for (const action of params.selectedActions) {
          const result = yield* runOne(action);
          results.push(result);

          if (
            params.stopAfterFirstFailure &&
            result.result === "started" &&
            result.status !== "succeeded"
          ) {
            break;
          }
        }

        return results;
      });

    const getCompletionEligibility = (input: { projectId: string; stepExecutionId: string }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const actionRows = yield* runtimeRepo.listActionExecutions(context.stepExecution.id);
        return buildCompletionSummary({
          actionDefinitions: context.actionStep.payload.actions,
          actionRows,
        });
      });

    const startExecution = (input: { projectId: string; stepExecutionId: string }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const existingRows = yield* runtimeRepo.listActionExecutions(context.stepExecution.id);

        if (existingRows.some((row) => row.status === "running")) {
          return {
            stepExecutionId: context.stepExecution.id,
            result: "already_running",
          } satisfies StartActionStepExecutionOutput;
        }

        if (existingRows.length > 0) {
          return {
            stepExecutionId: context.stepExecution.id,
            result: "already_started",
          } satisfies StartActionStepExecutionOutput;
        }

        const enabledActions = context.actionStep.payload.actions
          .filter((action) => action.enabled)
          .sort((left, right) => left.sortOrder - right.sortOrder);

        yield* runSelectedActionsInternal({
          context,
          selectedActions: enabledActions,
          retry: false,
          stopAfterFirstFailure: true,
        });

        return {
          stepExecutionId: context.stepExecution.id,
          result: "started",
        } satisfies StartActionStepExecutionOutput;
      });

    const runActions = (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const selectedActions = yield* assertKnownSelectedActions({
          selectedActionIds: input.actionIds,
          actionDefinitions: context.actionStep.payload.actions,
        });

        const results = yield* runSelectedActionsInternal({
          context,
          selectedActions,
          retry: false,
          stopAfterFirstFailure: context.actionStep.payload.executionMode === "sequential",
        });

        return {
          stepExecutionId: context.stepExecution.id,
          actionResults: results.map((result) => ({
            actionId: result.actionId,
            result: result.result as "started" | "already_running" | "already_succeeded",
          })),
        } satisfies RunActionStepActionsOutput;
      });

    const retryActions = (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const selectedActions = yield* assertKnownSelectedActions({
          selectedActionIds: input.actionIds,
          actionDefinitions: context.actionStep.payload.actions,
        });

        const results = yield* runSelectedActionsInternal({
          context,
          selectedActions,
          retry: true,
          stopAfterFirstFailure: false,
        });

        return {
          stepExecutionId: context.stepExecution.id,
          actionResults: results.map((result) => ({
            actionId: result.actionId,
            result: result.result as "started" | "already_running" | "not_retryable",
          })),
        } satisfies RetryActionStepActionsOutput;
      });

    const completeStep = (input: { projectId: string; stepExecutionId: string }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const eligibility = yield* getCompletionEligibility(input);
        if (!eligibility.eligible) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.complete",
            eligibility.reasonIfIneligible ?? "action step is not eligible for completion",
          );
        }

        const completed = yield* stepRepo.completeStepExecution({
          stepExecutionId: context.stepExecution.id,
        });
        if (!completed) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.complete",
            "step execution not found",
          );
        }

        return {
          stepExecutionId: completed.id,
          status: "completed",
        } as const;
      });

    return ActionStepRuntimeService.of({
      startExecution,
      runActions,
      retryActions,
      completeStep,
      getCompletionEligibility,
    });
  }),
);

function resolveItemExecutionStatus(params: {
  readonly contextFactKind: ActionDefinition["contextFactKind"];
  readonly rows: readonly {
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
  }[];
}) {
  if (params.rows.length < 1) {
    return {
      status: "needs_attention" as const,
      code: "missing_context_value",
      reason: "No context values are available to propagate.",
    };
  }

  switch (params.contextFactKind) {
    case "bound_external_fact": {
      const hasBinding = params.rows.every(
        (row) =>
          isExternalEnvelope(row.valueJson) && typeof row.valueJson.factInstanceId === "string",
      );

      return hasBinding
        ? {
            status: "succeeded" as const,
            code: "bound_external_updated",
            reason: undefined,
          }
        : {
            status: "needs_attention" as const,
            code: "missing_bound_target",
            reason:
              "The bound external target is missing and must be recreated from the current context value.",
          };
    }
    case "definition_backed_external_fact":
      return {
        status: "succeeded" as const,
        code: "definition_backed_synced",
        reason: undefined,
      };
    case "artifact_reference_fact": {
      const valid = params.rows.every((row) => isArtifactReferenceValue(row.valueJson));
      return valid
        ? {
            status: "succeeded" as const,
            code: "artifact_reference_synced",
            reason: undefined,
          }
        : {
            status: "failed" as const,
            code: "invalid_artifact_reference",
            reason: "Artifact propagation requires a committed relativePath reference.",
          };
    }
  }
}

function resolveAffectedTargets(params: {
  readonly target: EffectiveTargetContext;
  readonly rows: readonly {
    contextFactDefinitionId: string;
    instanceOrder: number;
    valueJson: unknown;
  }[];
}): readonly RuntimeActionAffectedTarget[] {
  switch (params.target.contextFactKind) {
    case "artifact_reference_fact":
      return params.rows.length > 0
        ? params.rows.map((row) =>
            isArtifactReferenceValue(row.valueJson)
              ? {
                  targetKind: "artifact" as const,
                  targetState: "exists" as const,
                  targetId: row.valueJson.relativePath,
                  label: row.valueJson.relativePath,
                }
              : {
                  targetKind: "artifact" as const,
                  targetState: "missing" as const,
                  label: params.target.contextFactLabel ?? params.target.contextFactKey,
                },
          )
        : [
            {
              targetKind: "artifact" as const,
              targetState: "missing" as const,
              label: params.target.contextFactLabel ?? params.target.contextFactKey,
            },
          ];
    case "bound_external_fact":
    case "definition_backed_external_fact":
      return params.rows.length > 0
        ? params.rows.map((row) => {
            const targetId =
              isExternalEnvelope(row.valueJson) && typeof row.valueJson.factInstanceId === "string"
                ? row.valueJson.factInstanceId
                : undefined;

            return targetId
              ? {
                  targetKind: "external_fact" as const,
                  targetState: "exists" as const,
                  targetId,
                  label: params.target.contextFactLabel ?? params.target.contextFactKey,
                }
              : {
                  targetKind: "external_fact" as const,
                  targetState: "missing" as const,
                  label: params.target.contextFactLabel ?? params.target.contextFactKey,
                };
          })
        : [
            {
              targetKind: "external_fact" as const,
              targetState: "missing" as const,
              label: params.target.contextFactLabel ?? params.target.contextFactKey,
            },
          ];
  }
}

function deriveActionStatus(statuses: readonly ActionItemRow["status"][]): ActionRow["status"] {
  if (statuses.some((status) => status === "running")) {
    return "running";
  }
  if (statuses.some((status) => status === "failed" || status === "needs_attention")) {
    return "needs_attention";
  }
  return "succeeded";
}
