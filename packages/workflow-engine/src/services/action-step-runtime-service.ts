import type {
  SkipActionStepActionItemsOutput,
  SkipActionStepActionsOutput,
  RetryActionStepActionsOutput,
  RunActionStepActionsOutput,
  RuntimeActionAffectedTarget,
  RuntimeActionCompletionSummary,
  RuntimeActionPropagationMapping,
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
import { ArtifactRepository } from "../repositories/artifact-repository";
import {
  getRuntimeBoundFactInstanceId,
  readRuntimeBoundFactEnvelope,
  toCanonicalRuntimeBoundFactEnvelope,
} from "./runtime-bound-fact-value";
import { parseArtifactSlotReferenceFactValue } from "./runtime/artifact-slot-reference-service";

const makeActionRuntimeError = (operation: string, cause: string): RepositoryError =>
  new RepositoryError({
    operation,
    cause: new Error(cause),
  });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readArtifactReferenceFiles = (
  value: unknown,
  fallbackSlotDefinitionId?: string,
): ReadonlyArray<{
  readonly filePath: string;
  readonly status: "present" | "deleted";
  readonly gitCommitHash?: string | null;
  readonly gitBlobHash?: string | null;
  readonly gitCommitSubject?: string | null;
  readonly gitCommitBody?: string | null;
}> => {
  const files =
    parseArtifactSlotReferenceFactValue(value, {
      ...(fallbackSlotDefinitionId ? { fallbackSlotDefinitionId } : {}),
    })?.files ?? [];

  if (!isRecord(value) || typeof value.gitCommitTitle !== "string") {
    return files;
  }

  return files.map((file) =>
    file.gitCommitSubject === undefined || file.gitCommitSubject === null
      ? { ...file, gitCommitSubject: value.gitCommitTitle }
      : file,
  );
};

const isExplicitBoundDeleteValue = (value: unknown): boolean =>
  isRecord(value) && value.deleted === true;

const sameUnknown = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

const toBoundDisplayValue = (
  value: unknown,
  options: { readonly includeBinding?: boolean } = {},
): unknown => {
  const envelope = readRuntimeBoundFactEnvelope(value);
  if (envelope) {
    return {
      ...(options.includeBinding ? { factInstanceId: envelope.factInstanceId } : {}),
      value: envelope.value,
      ...(isExplicitBoundDeleteValue(value) ? { deleted: true } : {}),
    };
  }

  return isRecord(value)
    ? {
        ...("value" in value ? { value: value.value } : { value }),
        ...(value.deleted === true ? { deleted: true } : {}),
      }
    : { value };
};

const toArtifactDisplayValue = (params: {
  readonly slotDefinitionId: string;
  readonly files: ReadonlyArray<{
    readonly filePath: string;
    readonly status: "present" | "deleted";
    readonly gitCommitHash?: string | null;
    readonly gitBlobHash?: string | null;
    readonly gitCommitSubject?: string | null;
    readonly gitCommitBody?: string | null;
  }>;
}): unknown => ({
  slotDefinitionId: params.slotDefinitionId,
  files: params.files.map((file) => ({
    filePath: file.filePath,
    status: file.status,
    ...(file.gitCommitHash !== undefined ? { gitCommitHash: file.gitCommitHash } : {}),
    ...(file.gitBlobHash !== undefined ? { gitBlobHash: file.gitBlobHash } : {}),
    ...(file.gitCommitSubject !== undefined ? { gitCommitSubject: file.gitCommitSubject } : {}),
    ...(file.gitCommitBody !== undefined ? { gitCommitBody: file.gitCommitBody } : {}),
  })),
});

const dedupeArtifactFiles = (
  files: ReadonlyArray<{
    readonly filePath: string;
    readonly status: "present" | "deleted";
    readonly gitCommitHash?: string | null;
    readonly gitBlobHash?: string | null;
    readonly gitCommitSubject?: string | null;
    readonly gitCommitBody?: string | null;
  }>,
) => {
  const filesByKey = new Map<string, (typeof files)[number]>();
  for (const file of files) {
    filesByKey.set(`${file.status}:${file.filePath}`, file);
  }
  return [...filesByKey.values()].sort((left, right) =>
    left.filePath.localeCompare(right.filePath),
  );
};

const buildBoundFactPropagationMappings = (params: {
  readonly rows: readonly { valueJson: unknown }[];
  readonly currentValues: readonly { id: string; valueJson: unknown }[];
  readonly label: string;
}): readonly RuntimeActionPropagationMapping[] => {
  const currentById = new Map(params.currentValues.map((row) => [row.id, row] as const));

  return params.rows.map((row) => {
    const envelope = readRuntimeBoundFactEnvelope(row.valueJson);
    const targetId = envelope?.factInstanceId;
    const current = targetId ? currentById.get(targetId) : undefined;
    const nextComparableValue =
      envelope?.value ??
      (isRecord(row.valueJson) && "value" in row.valueJson ? row.valueJson.value : row.valueJson);
    const deleteRequested = isExplicitBoundDeleteValue(row.valueJson);

    const operationKind: RuntimeActionPropagationMapping["operationKind"] = deleteRequested
      ? current
        ? "delete"
        : "no_op"
      : !current
        ? "create"
        : sameUnknown(current.valueJson, nextComparableValue)
          ? "no_op"
          : "update";

    return {
      targetKind: "external_fact",
      operationKind,
      ...(targetId ? { targetId } : {}),
      label: params.label,
      ...(current
        ? {
            previousValueJson: toBoundDisplayValue(
              {
                factInstanceId: current.id,
                value: current.valueJson,
              },
              { includeBinding: true },
            ),
          }
        : {}),
      nextValueJson: toBoundDisplayValue(row.valueJson),
    } satisfies RuntimeActionPropagationMapping;
  });
};

const buildArtifactPropagationMappings = (params: {
  readonly slotDefinitionId: string;
  readonly rows: readonly { valueJson: unknown }[];
  readonly currentState: ArtifactCurrentState;
  readonly label: string;
}): readonly RuntimeActionPropagationMapping[] => {
  const nextFiles = dedupeArtifactFiles(
    params.rows.flatMap((row) =>
      readArtifactReferenceFiles(row.valueJson, params.slotDefinitionId),
    ),
  );
  const previousFiles = params.currentState.members.map((member) => ({
    filePath: member.filePath,
    status: "present" as const,
    gitCommitHash: member.gitCommitHash,
    gitBlobHash: member.gitBlobHash,
    gitCommitSubject: member.gitCommitTitle,
    gitCommitBody: member.gitCommitBody,
  }));

  const hasPresentFiles = nextFiles.some((file) => file.status === "present");
  const hasDeletedFiles = nextFiles.some((file) => file.status === "deleted");
  const previousDisplay = params.currentState.exists
    ? toArtifactDisplayValue({ slotDefinitionId: params.slotDefinitionId, files: previousFiles })
    : undefined;
  const nextDisplay = toArtifactDisplayValue({
    slotDefinitionId: params.slotDefinitionId,
    files: nextFiles,
  });

  const operationKind: RuntimeActionPropagationMapping["operationKind"] =
    hasDeletedFiles && !hasPresentFiles
      ? params.currentState.exists
        ? "delete"
        : "no_op"
      : !params.currentState.exists && hasPresentFiles
        ? "create"
        : previousDisplay && sameUnknown(previousDisplay, nextDisplay)
          ? "no_op"
          : "update";

  return [
    {
      targetKind: "artifact",
      operationKind,
      ...(params.currentState.snapshot ? { targetId: params.currentState.snapshot.id } : {}),
      label: params.label,
      ...(previousDisplay ? { previousValueJson: previousDisplay } : {}),
      nextValueJson: nextDisplay,
    } satisfies RuntimeActionPropagationMapping,
  ];
};

type LoadedActionRuntimeContext = {
  readonly projectId: string;
  readonly methodologyVersionId: string;
  readonly workUnitTypeKey: string;
  readonly stepExecution: RuntimeStepExecutionRow;
  readonly workflowDetail: WorkflowExecutionDetailReadModel;
  readonly actionStep: WorkflowActionStepDefinitionReadModel;
  readonly artifactSlotDefinitions: readonly {
    id: string;
    key: string;
  }[];
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
  readonly contextFactKind: ActionDefinition["contextFactKind"];
  readonly artifactSlotDefinitionId?: string;
  readonly status: ActionItemRow["status"];
  readonly resultSummaryJson: unknown;
  readonly resultJson: unknown;
  readonly affectedTargets: readonly RuntimeActionAffectedTarget[];
  readonly propagationMappings: readonly RuntimeActionPropagationMapping[];
};

type EffectiveTargetContext = {
  readonly contextFactDefinitionId: string;
  readonly contextFactKind: ActionDefinition["contextFactKind"];
  readonly contextFactKey: string;
  readonly contextFactLabel?: string;
  readonly artifactSlotDefinitionId?: string;
};

type ExecuteActionAttemptResult = {
  readonly action: ActionDefinition;
  readonly actionRow: ActionRow;
  readonly itemOutcomes: readonly ExecutedItemOutcome[];
};

export type ActionItemPreviewState = {
  readonly targetContextFactDefinitionId: string;
  readonly targetContextFactKey?: string;
  readonly targetContextFactKind: "bound_fact" | "artifact_slot_reference_fact";
  readonly affectedTargets: readonly RuntimeActionAffectedTarget[];
  readonly propagationMappings: readonly RuntimeActionPropagationMapping[];
};

const SKIPPED_ACTION_CODE = "propagation_action_skipped";
const SKIPPED_ITEM_CODE = "propagation_item_skipped";

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
    readonly skipActions: (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) => Effect.Effect<SkipActionStepActionsOutput, RepositoryError>;
    readonly skipActionItems: (input: {
      projectId: string;
      stepExecutionId: string;
      actionId: string;
      itemIds: readonly string[];
    }) => Effect.Effect<SkipActionStepActionItemsOutput, RepositoryError>;
    readonly completeStep: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Effect.Effect<{ stepExecutionId: string; status: "completed" }, RepositoryError>;
    readonly listActionItemPreviewState: (input: {
      projectId: string;
      stepExecutionId: string;
    }) => Effect.Effect<ReadonlyMap<string, ActionItemPreviewState>, RepositoryError>;
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
    const artifactRepo = yield* ArtifactRepository;

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

        const [actionStep, workflowEditor, artifactSlotDefinitions] = yield* Effect.all([
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
          methodologyRepo.findArtifactSlotsByWorkUnitType({
            versionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
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
          workUnitTypeKey: workUnitType.key,
          stepExecution,
          workflowDetail,
          actionStep,
          artifactSlotDefinitions: artifactSlotDefinitions.map((slot) => ({
            id: slot.id,
            key: slot.key,
          })),
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

    const assertKnownSelectedItems = (params: {
      readonly selectedItemIds: readonly string[];
      readonly itemDefinitions: readonly ActionItemDefinition[];
    }): Effect.Effect<readonly ActionItemDefinition[], RepositoryError> =>
      Effect.gen(function* () {
        const selectedSet = new Set(params.selectedItemIds);
        const known = params.itemDefinitions.filter((item) => selectedSet.has(item.itemId));

        if (known.length !== selectedSet.size) {
          const knownIds = new Set(known.map((item) => item.itemId));
          const unknown = [...selectedSet].filter((itemId) => !knownIds.has(itemId));
          return yield* makeActionRuntimeError(
            "action-step-runtime.selection",
            `unknown action item ids: ${unknown.join(", ")}`,
          );
        }

        return [...known].sort((left, right) => left.sortOrder - right.sortOrder);
      });

    const buildSkippedItemResultSummary = () => ({
      status: "skipped",
      reason: "Skipped at runtime by operator request.",
    });

    const buildSkippedItemResult = (params: {
      readonly contextFactDefinitionId: string;
      readonly contextFactKind: ActionDefinition["contextFactKind"];
      readonly affectedTargets: readonly RuntimeActionAffectedTarget[];
      readonly propagationMappings: readonly RuntimeActionPropagationMapping[];
    }) => ({
      code: SKIPPED_ITEM_CODE,
      contextFactDefinitionId: params.contextFactDefinitionId,
      contextFactKind: params.contextFactKind,
      reason: "Skipped at runtime by operator request.",
      affectedTargets: params.affectedTargets,
      propagationMappings: params.propagationMappings,
    });

    const isSkippedResult = (value: unknown, expectedCode: string): boolean =>
      isRecord(value) && value.code === expectedCode;

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

        if (
          contextFact.kind !== "bound_fact" &&
          contextFact.kind !== "artifact_slot_reference_fact"
        ) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.target-context",
            `workflow context fact '${contextFactDefinitionId}' has unsupported kind '${contextFact.kind}'`,
          );
        }

        const artifactSlotDefinitionId =
          contextFact.kind === "artifact_slot_reference_fact"
            ? (() => {
                const slotRef = contextFact.slotDefinitionId;
                const matchedSlot = params.context.artifactSlotDefinitions.find(
                  (slot) => slot.id === slotRef || slot.key === slotRef,
                );

                return matchedSlot ? matchedSlot.id : undefined;
              })()
            : undefined;

        if (contextFact.kind === "artifact_slot_reference_fact" && !artifactSlotDefinitionId) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.target-context",
            `artifact slot '${contextFact.slotDefinitionId}' could not be resolved on work-unit type '${params.context.workUnitTypeKey}'`,
          );
        }

        return {
          ...(artifactSlotDefinitionId ? { artifactSlotDefinitionId } : {}),
          contextFactDefinitionId,
          contextFactKind: contextFact.kind,
          contextFactKey: contextFact.key,
          ...(contextFact.label ? { contextFactLabel: contextFact.label } : {}),
        } satisfies EffectiveTargetContext;
      });

    const normalizeArtifactPaths = (params: {
      readonly rows: readonly { valueJson: unknown }[];
      readonly slotDefinitionId: string;
    }): readonly string[] => {
      const uniquePaths = new Set<string>();
      for (const row of params.rows) {
        for (const file of readArtifactReferenceFiles(row.valueJson, params.slotDefinitionId)) {
          if (file.status !== "present") {
            continue;
          }

          const path = file.filePath.trim();
          if (path.length > 0) {
            uniquePaths.add(path);
          }
        }
      }
      return [...uniquePaths].sort((left, right) => left.localeCompare(right));
    };

    const resolveBoundCurrentValues = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly target: EffectiveTargetContext & { readonly contextFactKind: "bound_fact" };
    }): Effect.Effect<readonly { id: string; valueJson: unknown }[], RepositoryError> =>
      Effect.gen(function* () {
        const contextFact = params.context.workflowContextFacts.find(
          (fact) => fact.contextFactDefinitionId === params.target.contextFactDefinitionId,
        );
        if (!contextFact || contextFact.kind !== "bound_fact") {
          return [];
        }

        const [factSchemas, factDefinitions] = yield* Effect.all([
          lifecycleRepo.findFactSchemas(params.context.methodologyVersionId),
          methodologyRepo.findFactDefinitionsByVersionId(params.context.methodologyVersionId),
        ]);

        const bindingId = contextFact.factDefinitionId;
        const workUnitSchema = factSchemas.find(
          (schema) => schema.id === bindingId || schema.key === bindingId,
        );
        const projectDefinition = factDefinitions.find(
          (definition) => definition.id === bindingId || definition.key === bindingId,
        );

        if (workUnitSchema && !projectDefinition) {
          const rows = yield* workUnitFactRepo.getCurrentValuesByDefinition({
            projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
            factDefinitionId: workUnitSchema.id,
          });

          return rows.map((row) => ({ id: row.id, valueJson: row.valueJson }));
        }

        if (projectDefinition && !workUnitSchema) {
          const rows = yield* projectFactRepo.getCurrentValuesByDefinition({
            projectId: params.context.projectId,
            factDefinitionId: projectDefinition.id,
          });

          return rows.map((row) => ({ id: row.id, valueJson: row.valueJson }));
        }

        return [];
      });

    const describePropagationItemState = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly action: ActionDefinition;
      readonly item: ActionItemDefinition;
      readonly rows: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
    }): Effect.Effect<ActionItemPreviewState, RepositoryError> =>
      Effect.gen(function* () {
        const target = yield* resolveEffectiveTargetContext({
          context: params.context,
          action: params.action,
          item: params.item,
        });
        const label = target.contextFactLabel ?? target.contextFactKey;
        const affectedTargets = resolveAffectedTargets({ target, rows: params.rows });

        const propagationMappings =
          target.contextFactKind === "bound_fact"
            ? buildBoundFactPropagationMappings({
                rows: params.rows,
                currentValues: yield* resolveBoundCurrentValues({
                  context: params.context,
                  target,
                }),
                label,
              })
            : buildArtifactPropagationMappings({
                slotDefinitionId: target.artifactSlotDefinitionId,
                rows: params.rows,
                currentState: yield* artifactRepo.getCurrentSnapshotBySlot({
                  projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
                  slotDefinitionId: target.artifactSlotDefinitionId,
                }),
                label,
              });

        return {
          targetContextFactDefinitionId: target.contextFactDefinitionId,
          targetContextFactKey: target.contextFactKey,
          targetContextFactKind: target.contextFactKind,
          affectedTargets,
          propagationMappings,
        } satisfies ActionItemPreviewState;
      });

    const resolveArtifactPresentFiles = (params: {
      readonly rows: readonly { valueJson: unknown }[];
      readonly slotDefinitionId: string;
    }): ReadonlyMap<
      string,
      {
        readonly filePath: string;
        readonly memberStatus: "present";
        readonly gitCommitHash: string | null;
        readonly gitBlobHash: string | null;
        readonly gitCommitTitle: string | null;
        readonly gitCommitBody: string | null;
      }
    > => {
      const filesByPath = new Map<
        string,
        {
          readonly filePath: string;
          readonly memberStatus: "present";
          readonly gitCommitHash: string | null;
          readonly gitBlobHash: string | null;
          readonly gitCommitTitle: string | null;
          readonly gitCommitBody: string | null;
        }
      >();

      for (const row of params.rows) {
        for (const file of readArtifactReferenceFiles(row.valueJson, params.slotDefinitionId)) {
          if (file.status !== "present") {
            continue;
          }

          const filePath = file.filePath.trim();
          if (filePath.length < 1 || filesByPath.has(filePath)) {
            continue;
          }

          filesByPath.set(filePath, {
            filePath,
            memberStatus: "present",
            gitCommitHash: file.gitCommitHash ?? null,
            gitBlobHash: file.gitBlobHash ?? null,
            gitCommitTitle: file.gitCommitSubject ?? null,
            gitCommitBody: file.gitCommitBody ?? null,
          });
        }
      }

      return filesByPath;
    };

    const persistArtifactSnapshotFromRows = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly contextFactDefinitionId: string;
      readonly slotDefinitionId: string;
      readonly rows: readonly {
        contextFactDefinitionId: string;
        instanceOrder: number;
        valueJson: unknown;
      }[];
    }): Effect.Effect<void, RepositoryError> =>
      Effect.gen(function* () {
        const targetPaths = normalizeArtifactPaths({
          rows: params.rows,
          slotDefinitionId: params.slotDefinitionId,
        });
        const presentFilesByPath = resolveArtifactPresentFiles({
          rows: params.rows,
          slotDefinitionId: params.slotDefinitionId,
        });
        const current = yield* artifactRepo.getCurrentSnapshotBySlot({
          projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
          slotDefinitionId: params.slotDefinitionId,
        });

        const currentMembersByPath = new Map(
          current.members.map((member) => [member.filePath, member]),
        );
        const currentPaths = new Set(current.members.map((member) => member.filePath));
        const targetPathSet = new Set(targetPaths);

        const addedPaths = targetPaths.filter((path) => !currentPaths.has(path));
        const removedPaths = current.members
          .map((member) => member.filePath)
          .filter((path) => !targetPathSet.has(path))
          .sort((left, right) => left.localeCompare(right));

        const deltaFiles = [
          ...addedPaths.map(
            (filePath) =>
              presentFilesByPath.get(filePath) ?? {
                filePath,
                memberStatus: "present" as const,
                gitCommitHash: null,
                gitBlobHash: null,
                gitCommitTitle: null,
                gitCommitBody: null,
              },
          ),
          ...removedPaths.map((filePath) => ({
            filePath,
            memberStatus: "removed" as const,
          })),
          ...targetPaths
            .filter((path) => currentPaths.has(path))
            .filter((path) => {
              const nextMember = presentFilesByPath.get(path);
              const currentMember = currentMembersByPath.get(path);
              if (!nextMember || !currentMember) {
                return false;
              }

              return (
                (nextMember.gitCommitHash ?? null) !== (currentMember.gitCommitHash ?? null) ||
                (nextMember.gitBlobHash ?? null) !== (currentMember.gitBlobHash ?? null) ||
                (nextMember.gitCommitTitle ?? null) !== (currentMember.gitCommitTitle ?? null) ||
                (nextMember.gitCommitBody ?? null) !== (currentMember.gitCommitBody ?? null)
              );
            })
            .map(
              (filePath) =>
                presentFilesByPath.get(filePath) ?? {
                  filePath,
                  memberStatus: "present" as const,
                  gitCommitHash: null,
                  gitBlobHash: null,
                  gitCommitTitle: null,
                  gitCommitBody: null,
                },
            ),
        ];

        if (current.snapshot && deltaFiles.length === 0) {
          return;
        }

        const snapshot = yield* artifactRepo.createSnapshot({
          projectWorkUnitId: params.context.workflowDetail.projectWorkUnitId,
          slotDefinitionId: params.slotDefinitionId,
          recordedByTransitionExecutionId: params.context.workflowDetail.transitionExecution.id,
          recordedByWorkflowExecutionId: params.context.stepExecution.workflowExecutionId,
          supersededByProjectArtifactSnapshotId: current.snapshot?.id ?? null,
        });

        const filesForSnapshot =
          current.snapshot === null
            ? targetPaths.map(
                (filePath) =>
                  presentFilesByPath.get(filePath) ?? {
                    filePath,
                    memberStatus: "present" as const,
                    gitCommitHash: null,
                    gitBlobHash: null,
                    gitCommitTitle: null,
                    gitCommitBody: null,
                  },
              )
            : deltaFiles;

        if (filesForSnapshot.length > 0) {
          yield* artifactRepo.addSnapshotFiles({
            artifactSnapshotId: snapshot.id,
            files: filesForSnapshot,
          });
        }
      });

    const persistArtifactSnapshotsForOutcomes = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly itemOutcomes: readonly ExecutedItemOutcome[];
      readonly allContextRows: readonly RuntimeWorkflowExecutionContextFactRow[];
    }): Effect.Effect<void, RepositoryError> =>
      Effect.gen(function* () {
        const artifactSucceeded = params.itemOutcomes.filter(
          (item) =>
            item.status === "succeeded" && item.contextFactKind === "artifact_slot_reference_fact",
        );

        if (artifactSucceeded.length === 0) {
          return;
        }

        const rowsBySlotDefinitionId = new Map<
          string,
          {
            contextFactDefinitionId: string;
            rows: Array<{
              contextFactDefinitionId: string;
              instanceOrder: number;
              valueJson: unknown;
            }>;
          }
        >();

        for (const succeededItem of artifactSucceeded) {
          const slotDefinitionId = succeededItem.artifactSlotDefinitionId;
          if (!slotDefinitionId) {
            return yield* makeActionRuntimeError(
              "action-step-runtime.artifact-slot",
              `artifact context fact '${succeededItem.targetContextFactDefinitionId}' is missing an artifact slot definition id`,
            );
          }

          const slotRows = rowsBySlotDefinitionId.get(slotDefinitionId) ?? {
            contextFactDefinitionId: succeededItem.targetContextFactDefinitionId,
            rows: [],
          };

          const contextRows = params.allContextRows
            .filter(
              (row) => row.contextFactDefinitionId === succeededItem.targetContextFactDefinitionId,
            )
            .sort((left, right) => left.instanceOrder - right.instanceOrder)
            .map((row) => ({
              contextFactDefinitionId: row.contextFactDefinitionId,
              instanceOrder: row.instanceOrder,
              valueJson: row.valueJson,
            }));

          slotRows.rows.push(...contextRows);
          rowsBySlotDefinitionId.set(slotDefinitionId, slotRows);
        }

        for (const [slotDefinitionId, payload] of rowsBySlotDefinitionId.entries()) {
          yield* persistArtifactSnapshotFromRows({
            context: params.context,
            contextFactDefinitionId: payload.contextFactDefinitionId,
            slotDefinitionId,
            rows: payload.rows,
          });
        }
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
        const envelope = readRuntimeBoundFactEnvelope(row.valueJson);
        if (envelope) {
          return {
            contextFactDefinitionId: row.contextFactDefinitionId,
            instanceOrder: row.instanceOrder,
            valueJson: toCanonicalRuntimeBoundFactEnvelope({
              instanceId: envelope.factInstanceId,
              value: envelope.value,
            }),
            changed: false,
          };
        }

        const currentValue = row.valueJson;
        const persistedInstanceId = params.persistedRowsByOrder.get(row.instanceOrder);

        return {
          contextFactDefinitionId: row.contextFactDefinitionId,
          instanceOrder: row.instanceOrder,
          valueJson:
            typeof persistedInstanceId === "string"
              ? toCanonicalRuntimeBoundFactEnvelope({
                  instanceId: persistedInstanceId,
                  value: currentValue,
                })
              : currentValue,
          changed: typeof persistedInstanceId === "string",
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
        if (!contextFact || contextFact.kind !== "bound_fact") {
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

        const externalBindingId = contextFact.factDefinitionId;
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
            if (typeof getRuntimeBoundFactInstanceId(row.valueJson) === "string") {
              return [row.instanceOrder, getRuntimeBoundFactInstanceId(row.valueJson)!] as const;
            }

            const currentValue =
              readRuntimeBoundFactEnvelope(row.valueJson)?.value ?? row.valueJson;

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
                effectiveTarget.contextFactKind === "artifact_slot_reference_fact"
                  ? new Map<number, string>()
                  : yield* persistMissingExternalFactInstances({
                      context: params.context,
                      target: effectiveTarget,
                      relevantRows,
                    });

              const maybePersistedRows =
                effectiveTarget.contextFactKind === "bound_fact"
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

              const previewState = yield* describePropagationItemState({
                context: params.context,
                action: params.action,
                item,
                rows: usableRows,
              });
              const affectedTargetsForItem = previewState.affectedTargets;
              const outcomeStatus = resolveItemExecutionStatus({
                contextFactKind: effectiveTarget.contextFactKind,
                artifactSlotDefinitionId: effectiveTarget.artifactSlotDefinitionId,
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
                      propagationMappings: previewState.propagationMappings,
                    }
                  : {
                      code: outcomeStatus.code,
                      contextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
                      contextFactKind: effectiveTarget.contextFactKind,
                      reason: outcomeStatus.reason,
                      propagationMappings: previewState.propagationMappings,
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
                contextFactKind: effectiveTarget.contextFactKind,
                ...(effectiveTarget.contextFactKind === "artifact_slot_reference_fact"
                  ? { artifactSlotDefinitionId: effectiveTarget.artifactSlotDefinitionId }
                  : {}),
                status: outcomeStatus.status,
                resultSummaryJson,
                resultJson,
                affectedTargets: affectedTargetsForItem,
                propagationMappings: previewState.propagationMappings,
              } satisfies ExecutedItemOutcome;
            }),
        );

        yield* persistArtifactSnapshotsForOutcomes({
          context: params.context,
          itemOutcomes,
          allContextRows,
        });

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

    const buildActionStatusFromPersistedItems = (params: {
      readonly action: ActionDefinition;
      readonly persistedItems: readonly ActionItemRow[];
    }): ActionRow["status"] => {
      const itemsById = new Map(params.persistedItems.map((item) => [item.itemDefinitionId, item]));
      const statuses = params.action.items.map(
        (item) => itemsById.get(item.itemId)?.status ?? "failed",
      );
      return deriveActionStatus(statuses);
    };

    const applySkippedItems = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly action: ActionDefinition;
      readonly actionRow: ActionRow;
      readonly selectedItems: readonly ActionItemDefinition[];
    }) =>
      Effect.gen(function* () {
        const allContextRows = yield* stepRepo.listWorkflowExecutionContextFacts(
          params.context.stepExecution.workflowExecutionId,
        );

        const itemResults = yield* Effect.forEach(params.selectedItems, (item) =>
          Effect.gen(function* () {
            const existingItem = yield* runtimeRepo.getActionExecutionItemByDefinitionId({
              actionExecutionId: params.actionRow.id,
              itemDefinitionId: item.itemId,
            });

            if (existingItem?.status === "running") {
              return {
                itemId: item.itemId,
                result: "already_running" as const,
              };
            }

            if (
              existingItem?.status === "succeeded" &&
              !isSkippedResult(existingItem.resultJson, SKIPPED_ITEM_CODE)
            ) {
              return {
                itemId: item.itemId,
                result: "already_succeeded" as const,
              };
            }

            const effectiveTarget = yield* resolveEffectiveTargetContext({
              context: params.context,
              action: params.action,
              item,
            });
            const usableRows = allContextRows
              .filter(
                (row) => row.contextFactDefinitionId === effectiveTarget.contextFactDefinitionId,
              )
              .sort((left, right) => left.instanceOrder - right.instanceOrder)
              .map((row) => ({
                contextFactDefinitionId: row.contextFactDefinitionId,
                instanceOrder: row.instanceOrder,
                valueJson: row.valueJson,
              }));
            const previewState = yield* describePropagationItemState({
              context: params.context,
              action: params.action,
              item,
              rows: usableRows,
            });
            const affectedTargets = previewState.affectedTargets;
            const resultSummaryJson = buildSkippedItemResultSummary();
            const resultJson = buildSkippedItemResult({
              contextFactDefinitionId: effectiveTarget.contextFactDefinitionId,
              contextFactKind: effectiveTarget.contextFactKind,
              affectedTargets,
              propagationMappings: previewState.propagationMappings,
            });

            if (existingItem) {
              yield* runtimeRepo.updateActionExecutionItem({
                actionExecutionId: params.actionRow.id,
                itemDefinitionId: item.itemId,
                status: "succeeded",
                resultSummaryJson,
                resultJson,
                affectedTargetsJson: affectedTargets,
              });
            } else {
              yield* runtimeRepo.createActionExecutionItem({
                actionExecutionId: params.actionRow.id,
                itemDefinitionId: item.itemId,
                status: "succeeded",
                resultSummaryJson,
                resultJson,
                affectedTargetsJson: affectedTargets,
              });
            }

            return {
              itemId: item.itemId,
              result: "skipped" as const,
            };
          }),
        );

        const persistedItems = yield* runtimeRepo.listActionExecutionItems(params.actionRow.id);
        const nextActionStatus = buildActionStatusFromPersistedItems({
          action: params.action,
          persistedItems,
        });
        const skippedItemCount = persistedItems.filter((item) =>
          isSkippedResult(item.resultJson, SKIPPED_ITEM_CODE),
        ).length;
        const allItemsSkipped =
          persistedItems.length === params.action.items.length &&
          persistedItems.every((item) => isSkippedResult(item.resultJson, SKIPPED_ITEM_CODE));
        const succeededItemCount = persistedItems.filter(
          (item) => item.status === "succeeded",
        ).length;
        const attentionItemCount = persistedItems.filter(
          (item) => item.status === "failed" || item.status === "needs_attention",
        ).length;

        yield* runtimeRepo.updateActionExecution({
          actionExecutionId: params.actionRow.id,
          status: nextActionStatus,
          resultSummaryJson: {
            status: nextActionStatus,
            itemCount: params.action.items.length,
            succeededItemCount,
            skippedItemCount,
            attentionItemCount,
          },
          resultJson: {
            code: allItemsSkipped ? SKIPPED_ACTION_CODE : "propagation_action_applied_with_skips",
            reason: allItemsSkipped
              ? "Action was skipped at runtime by operator request."
              : "One or more propagation items were skipped by operator request.",
            itemResults: persistedItems.map((item) => ({
              itemDefinitionId: item.itemDefinitionId,
              status: item.status,
              skipped: isSkippedResult(item.resultJson, SKIPPED_ITEM_CODE),
            })),
          },
        });

        return itemResults;
      });

    const skipWholeAction = (params: {
      readonly context: LoadedActionRuntimeContext;
      readonly action: ActionDefinition;
      readonly existingActionRow: ActionRow | null;
    }) =>
      Effect.gen(function* () {
        if (params.existingActionRow?.status === "running") {
          return {
            actionId: params.action.actionId,
            result: "already_running" as const,
          };
        }

        if (
          params.existingActionRow?.status === "succeeded" &&
          !isSkippedResult(params.existingActionRow.resultJson, SKIPPED_ACTION_CODE)
        ) {
          return {
            actionId: params.action.actionId,
            result: "already_succeeded" as const,
          };
        }

        const actionRow = params.existingActionRow
          ? params.existingActionRow
          : yield* runtimeRepo.createActionExecution({
              stepExecutionId: params.context.stepExecution.id,
              actionDefinitionId: params.action.actionId,
              actionKind: params.action.actionKind,
              status: "succeeded",
            });

        yield* applySkippedItems({
          context: params.context,
          action: params.action,
          actionRow,
          selectedItems: [...params.action.items].sort(
            (left, right) => left.sortOrder - right.sortOrder,
          ),
        });

        return {
          actionId: params.action.actionId,
          result: "skipped" as const,
        };
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

    const listActionItemPreviewState = (input: { projectId: string; stepExecutionId: string }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        const contextRows = yield* stepRepo.listWorkflowExecutionContextFacts(
          context.stepExecution.workflowExecutionId,
        );

        const entries = yield* Effect.forEach(context.actionStep.payload.actions, (action) =>
          Effect.forEach(action.items, (item) =>
            Effect.gen(function* () {
              const rows = contextRows
                .filter(
                  (row) =>
                    row.contextFactDefinitionId ===
                    (item.targetContextFactDefinitionId ?? action.contextFactDefinitionId),
                )
                .sort((left, right) => left.instanceOrder - right.instanceOrder)
                .map((row) => ({
                  contextFactDefinitionId: row.contextFactDefinitionId,
                  instanceOrder: row.instanceOrder,
                  valueJson: row.valueJson,
                }));

              return [
                item.itemId,
                yield* describePropagationItemState({
                  context,
                  action,
                  item,
                  rows,
                }),
              ] as const;
            }),
          ),
        ).pipe(Effect.map((groups) => groups.flat()));

        return new Map(entries);
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

    const skipActions = (input: {
      projectId: string;
      stepExecutionId: string;
      actionIds: readonly string[];
    }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        if (context.stepExecution.status !== "active") {
          return yield* makeActionRuntimeError(
            "action-step-runtime.skip",
            "Only active Action steps can skip actions.",
          );
        }
        const selectedActions = yield* assertKnownSelectedActions({
          selectedActionIds: input.actionIds,
          actionDefinitions: context.actionStep.payload.actions,
        });

        yield* runtimeRepo.createActionStepExecution({
          stepExecutionId: context.stepExecution.id,
        });

        const startingRowsById = yield* listRuntimeRowsByActionId(context.stepExecution.id);
        const results = yield* Effect.forEach(selectedActions, (action) =>
          skipWholeAction({
            context,
            action,
            existingActionRow: startingRowsById.get(action.actionId) ?? null,
          }),
        );

        return {
          stepExecutionId: context.stepExecution.id,
          actionResults: results,
        } satisfies SkipActionStepActionsOutput;
      });

    const skipActionItems = (input: {
      projectId: string;
      stepExecutionId: string;
      actionId: string;
      itemIds: readonly string[];
    }) =>
      Effect.gen(function* () {
        const context = yield* loadContext(input);
        if (context.stepExecution.status !== "active") {
          return yield* makeActionRuntimeError(
            "action-step-runtime.skip-item",
            "Only active Action steps can skip items.",
          );
        }
        const action = context.actionStep.payload.actions.find(
          (candidate) => candidate.actionId === input.actionId,
        );
        if (!action) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.selection",
            `unknown action id: ${input.actionId}`,
          );
        }
        if (!action.enabled) {
          return yield* makeActionRuntimeError(
            "action-step-runtime.selection",
            `disabled action cannot be skipped: ${input.actionId}`,
          );
        }

        const selectedItems = yield* assertKnownSelectedItems({
          selectedItemIds: input.itemIds,
          itemDefinitions: action.items,
        });

        yield* runtimeRepo.createActionStepExecution({
          stepExecutionId: context.stepExecution.id,
        });
        const existingActionRow = yield* runtimeRepo.getActionExecutionByDefinitionId({
          stepExecutionId: context.stepExecution.id,
          actionDefinitionId: action.actionId,
        });

        if (!existingActionRow) {
          if (selectedItems.length === action.items.length) {
            const actionResult = yield* skipWholeAction({
              context,
              action,
              existingActionRow: null,
            });

            return {
              stepExecutionId: context.stepExecution.id,
              actionId: action.actionId,
              itemResults: selectedItems.map((item) => ({
                itemId: item.itemId,
                result: actionResult.result === "already_running" ? "already_running" : "skipped",
              })),
            } satisfies SkipActionStepActionItemsOutput;
          }

          const actionRow = yield* runtimeRepo.createActionExecution({
            stepExecutionId: context.stepExecution.id,
            actionDefinitionId: action.actionId,
            actionKind: action.actionKind,
            status: "needs_attention",
          });

          const itemResults = yield* applySkippedItems({
            context,
            action,
            actionRow,
            selectedItems,
          });

          return {
            stepExecutionId: context.stepExecution.id,
            actionId: action.actionId,
            itemResults,
          } satisfies SkipActionStepActionItemsOutput;
        }

        if (existingActionRow.status === "running") {
          return {
            stepExecutionId: context.stepExecution.id,
            actionId: action.actionId,
            itemResults: selectedItems.map((item) => ({
              itemId: item.itemId,
              result: "already_running" as const,
            })),
          } satisfies SkipActionStepActionItemsOutput;
        }

        const itemResults = yield* applySkippedItems({
          context,
          action,
          actionRow: existingActionRow,
          selectedItems,
        });

        return {
          stepExecutionId: context.stepExecution.id,
          actionId: action.actionId,
          itemResults,
        } satisfies SkipActionStepActionItemsOutput;
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
      skipActions,
      skipActionItems,
      completeStep,
      listActionItemPreviewState,
      getCompletionEligibility,
    });
  }),
);

function resolveItemExecutionStatus(params: {
  readonly contextFactKind: ActionDefinition["contextFactKind"];
  readonly artifactSlotDefinitionId?: string;
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
    case "bound_fact": {
      const hasBinding = params.rows.every(
        (row) => typeof getRuntimeBoundFactInstanceId(row.valueJson) === "string",
      );

      return hasBinding
        ? {
            status: "succeeded" as const,
            code: "bound_fact_updated",
            reason: undefined,
          }
        : {
            status: "needs_attention" as const,
            code: "missing_bound_target",
            reason:
              "The bound external target is missing and must be recreated from the current context value.",
          };
    }
    case "artifact_slot_reference_fact": {
      const valid = params.rows.every(
        (row) =>
          readArtifactReferenceFiles(row.valueJson, params.artifactSlotDefinitionId).length > 0,
      );
      return valid
        ? {
            status: "succeeded" as const,
            code: "artifact_snapshot_synced",
            reason: undefined,
          }
        : {
            status: "failed" as const,
            code: "invalid_artifact_snapshot",
            reason: "Artifact propagation requires a valid artifact slot reference payload.",
          };
    }
    default:
      return {
        status: "failed" as const,
        code: "unsupported_context_fact_kind",
        reason: `Unsupported propagation fact kind '${params.contextFactKind}'.`,
      };
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
    case "artifact_slot_reference_fact":
      if (params.rows.length < 1) {
        return [
          {
            targetKind: "artifact" as const,
            targetState: "missing" as const,
            label: params.target.contextFactLabel ?? params.target.contextFactKey,
          },
        ];
      }

      const uniqueArtifactPaths = new Set<string>();
      const artifactTargets: RuntimeActionAffectedTarget[] = [];
      for (const row of params.rows) {
        const files = readArtifactReferenceFiles(
          row.valueJson,
          params.target.artifactSlotDefinitionId,
        );
        if (files.length < 1) {
          artifactTargets.push({
            targetKind: "artifact" as const,
            targetState: "missing" as const,
            label: params.target.contextFactLabel ?? params.target.contextFactKey,
          });
          continue;
        }

        for (const file of files) {
          const path = file.filePath.trim();
          const dedupeKey = `${file.status}:${path}`;
          if (path.length < 1 || uniqueArtifactPaths.has(dedupeKey)) {
            continue;
          }

          uniqueArtifactPaths.add(dedupeKey);
          artifactTargets.push({
            targetKind: "artifact" as const,
            targetState: file.status === "present" ? ("exists" as const) : ("missing" as const),
            targetId: path,
            label: path,
          });
        }
      }

      return artifactTargets.length > 0
        ? artifactTargets
        : [
            {
              targetKind: "artifact" as const,
              targetState: "missing" as const,
              label: params.target.contextFactLabel ?? params.target.contextFactKey,
            },
          ];
    case "bound_fact":
      return params.rows.length > 0
        ? params.rows.map((row) => {
            const targetId = getRuntimeBoundFactInstanceId(row.valueJson);

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
    default:
      return [];
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
