import { Context, Effect, Layer, Option } from "effect";
import type {
  InvokeStepPayload,
  WorkflowContextFactDto,
} from "@chiron/contracts/methodology/workflow";
import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import {
  InvokeExecutionRepository,
  type InvokeStepExecutionStateRow,
  type InvokeWorkUnitTargetExecutionRow,
  type InvokeWorkflowTargetExecutionRow,
} from "../repositories/invoke-execution-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";

export const NO_INVOKE_TARGETS_RESOLVED_REASON = "No invoke targets resolved";

export interface InvokeResolvedWorkflowTarget {
  workflowDefinitionId: string;
  canonicalKey: string;
}

export interface InvokeResolvedWorkUnitTarget {
  workUnitDefinitionId: string;
  transitionDefinitionId: string;
  canonicalKey: string;
}

export interface InvokeResolvedTargetSet {
  workflowTargets: readonly InvokeResolvedWorkflowTarget[];
  workUnitTargets: readonly InvokeResolvedWorkUnitTarget[];
  blockedReason: string | null;
}

export const getInvokeTargetsBlockedReason = (params: {
  workflowTargets: readonly unknown[];
  workUnitTargets: readonly unknown[];
}): string | null =>
  params.workflowTargets.length === 0 && params.workUnitTargets.length === 0
    ? NO_INVOKE_TARGETS_RESOLVED_REASON
    : null;

export interface MaterializeInvokeTargetsForActivationParams {
  workflowExecutionId: string;
  stepExecutionId: string;
  invokeStepDefinitionId: string;
  invokeStep: InvokeStepPayload;
}

export interface MaterializeInvokeTargetsForActivationResult {
  invokeStepExecutionState: InvokeStepExecutionStateRow;
  workflowTargetExecutions: readonly InvokeWorkflowTargetExecutionRow[];
  workUnitTargetExecutions: readonly InvokeWorkUnitTargetExecutionRow[];
  blockingReason: string | null;
  materializationState: "created" | "already_exists";
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value : null;

const normalizeToItems = (value: unknown): readonly unknown[] => {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
};

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isRecord(value)) {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }

  return JSON.stringify(value) ?? "null";
};

const dedupeByCanonicalKey = <T extends { canonicalKey: string }>(
  targets: readonly T[],
): readonly T[] => {
  const seen = new Set<string>();
  const deduped: T[] = [];

  for (const target of targets) {
    if (seen.has(target.canonicalKey)) {
      continue;
    }

    seen.add(target.canonicalKey);
    deduped.push(target);
  }

  return deduped;
};

const normalizeWorkflowTarget = (value: unknown): InvokeResolvedWorkflowTarget | null => {
  const directId = asNonEmptyString(value);
  if (directId) {
    return {
      workflowDefinitionId: directId,
      canonicalKey: directId,
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const workflowDefinitionId =
    asNonEmptyString(value.workflowDefinitionId) ?? asNonEmptyString(value.id);

  if (!workflowDefinitionId) {
    return null;
  }

  return {
    workflowDefinitionId,
    canonicalKey: asNonEmptyString(value.canonicalKey) ?? workflowDefinitionId,
  };
};

const normalizeWorkUnitBaseTarget = (
  value: unknown,
  defaultWorkUnitDefinitionId?: string,
): { workUnitDefinitionId: string; canonicalKey: string } | null => {
  const directId = asNonEmptyString(value);
  if (directId) {
    if (defaultWorkUnitDefinitionId) {
      return {
        workUnitDefinitionId: defaultWorkUnitDefinitionId,
        canonicalKey: directId,
      };
    }

    return {
      workUnitDefinitionId: directId,
      canonicalKey: directId,
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const workUnitDefinitionId =
    asNonEmptyString(value.workUnitDefinitionId) ?? asNonEmptyString(value.workUnitTypeId);

  if (
    workUnitDefinitionId &&
    defaultWorkUnitDefinitionId &&
    workUnitDefinitionId !== defaultWorkUnitDefinitionId
  ) {
    return null;
  }

  const resolvedWorkUnitDefinitionId = workUnitDefinitionId ?? defaultWorkUnitDefinitionId;

  if (!resolvedWorkUnitDefinitionId) {
    return null;
  }

  return {
    workUnitDefinitionId: resolvedWorkUnitDefinitionId,
    canonicalKey: asNonEmptyString(value.canonicalKey) ?? stableStringify(value),
  };
};

export class InvokeTargetResolutionService extends Context.Tag(
  "@chiron/workflow-engine/services/InvokeTargetResolutionService",
)<
  InvokeTargetResolutionService,
  {
    readonly resolveTargets: (params: {
      workflowExecutionId: string;
      invokeStep: InvokeStepPayload;
    }) => Effect.Effect<InvokeResolvedTargetSet, RepositoryError>;
    readonly materializeTargetsForActivation: (
      params: MaterializeInvokeTargetsForActivationParams,
    ) => Effect.Effect<MaterializeInvokeTargetsForActivationResult, RepositoryError>;
  }
>() {}

export const InvokeTargetResolutionServiceLive = Layer.effect(
  InvokeTargetResolutionService,
  Effect.gen(function* () {
    const stepRepo = yield* StepExecutionRepository;
    const invokeRepo = yield* InvokeExecutionRepository;
    const executionReadRepo = yield* Effect.serviceOption(ExecutionReadRepository);
    const projectContextRepo = yield* Effect.serviceOption(ProjectContextRepository);
    const lifecycleRepo = yield* Effect.serviceOption(LifecycleRepository);
    const methodologyRepo = yield* Effect.serviceOption(MethodologyRepository);

    const inferContextBackedWorkUnitDefinitionId = (params: {
      workflowExecutionId: string;
      contextFactDefinitionId: string;
    }) =>
      Effect.gen(function* () {
        if (
          Option.isNone(executionReadRepo) ||
          Option.isNone(projectContextRepo) ||
          Option.isNone(lifecycleRepo) ||
          Option.isNone(methodologyRepo)
        ) {
          return undefined;
        }

        const workflowDetail = yield* executionReadRepo.value.getWorkflowExecutionDetail(
          params.workflowExecutionId,
        );
        if (!workflowDetail) {
          return undefined;
        }

        const projectPin = yield* projectContextRepo.value.findProjectPin(workflowDetail.projectId);
        if (!projectPin) {
          return undefined;
        }

        const workUnitTypes = yield* lifecycleRepo.value.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const parentWorkUnitType = workUnitTypes.find(
          (workUnitType) => workUnitType.id === workflowDetail.workUnitTypeId,
        );
        if (!parentWorkUnitType) {
          return undefined;
        }

        const workflowEditor = yield* methodologyRepo.value.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: parentWorkUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        const sourceContextFact = workflowEditor.contextFacts.find(
          (
            contextFact,
          ): contextFact is Extract<
            WorkflowContextFactDto,
            { kind: "work_unit_draft_spec_fact" }
          > =>
            contextFact.kind === "work_unit_draft_spec_fact" &&
            contextFact.contextFactDefinitionId === params.contextFactDefinitionId,
        );

        return sourceContextFact?.workUnitDefinitionId;
      }).pipe(Effect.catchAll(() => Effect.succeed(undefined)));

    const resolveTargets = ({
      workflowExecutionId,
      invokeStep,
    }: {
      workflowExecutionId: string;
      invokeStep: InvokeStepPayload;
    }) =>
      Effect.gen(function* () {
        if (invokeStep.targetKind === "workflow" && invokeStep.sourceMode === "fixed_set") {
          const workflowTargets = dedupeByCanonicalKey(
            invokeStep.workflowDefinitionIds.map((workflowDefinitionId) => ({
              workflowDefinitionId,
              canonicalKey: workflowDefinitionId,
            })),
          );

          return {
            workflowTargets,
            workUnitTargets: [],
            blockedReason: getInvokeTargetsBlockedReason({
              workflowTargets,
              workUnitTargets: [],
            }),
          } satisfies InvokeResolvedTargetSet;
        }

        if (invokeStep.targetKind === "work_unit" && invokeStep.sourceMode === "fixed_set") {
          const workUnitTargets = dedupeByCanonicalKey(
            invokeStep.activationTransitions.map((transition) => ({
              workUnitDefinitionId: invokeStep.workUnitDefinitionId,
              transitionDefinitionId: transition.transitionId,
              canonicalKey: `${invokeStep.workUnitDefinitionId}:${transition.transitionId}`,
            })),
          );

          return {
            workflowTargets: [],
            workUnitTargets,
            blockedReason: getInvokeTargetsBlockedReason({
              workflowTargets: [],
              workUnitTargets,
            }),
          } satisfies InvokeResolvedTargetSet;
        }

        const contextFacts = yield* stepRepo.listWorkflowExecutionContextFacts(workflowExecutionId);
        const relevantFacts = contextFacts
          .filter((fact) => fact.contextFactDefinitionId === invokeStep.contextFactDefinitionId)
          .sort((left, right) => left.instanceOrder - right.instanceOrder);

        if (invokeStep.targetKind === "workflow") {
          const workflowTargets = dedupeByCanonicalKey(
            relevantFacts.flatMap((fact) =>
              normalizeToItems(fact.valueJson)
                .map((value) => normalizeWorkflowTarget(value))
                .filter((value): value is InvokeResolvedWorkflowTarget => value !== null),
            ),
          );

          return {
            workflowTargets,
            workUnitTargets: [],
            blockedReason: getInvokeTargetsBlockedReason({
              workflowTargets,
              workUnitTargets: [],
            }),
          } satisfies InvokeResolvedTargetSet;
        }

        const contextBackedWorkUnitDefinitionId =
          invokeStep.targetKind === "work_unit" && invokeStep.sourceMode === "context_fact_backed"
            ? yield* inferContextBackedWorkUnitDefinitionId({
                workflowExecutionId,
                contextFactDefinitionId: invokeStep.contextFactDefinitionId,
              })
            : undefined;

        const workUnitTargets = dedupeByCanonicalKey(
          relevantFacts.flatMap((fact) =>
            normalizeToItems(fact.valueJson)
              .map((value) => normalizeWorkUnitBaseTarget(value, contextBackedWorkUnitDefinitionId))
              .filter(
                (value): value is { workUnitDefinitionId: string; canonicalKey: string } =>
                  value !== null,
              )
              .flatMap((target) =>
                invokeStep.activationTransitions.map((transition) => ({
                  workUnitDefinitionId: target.workUnitDefinitionId,
                  transitionDefinitionId: transition.transitionId,
                  canonicalKey: `${target.canonicalKey}:${transition.transitionId}`,
                })),
              ),
          ),
        );

        return {
          workflowTargets: [],
          workUnitTargets,
          blockedReason: getInvokeTargetsBlockedReason({
            workflowTargets: [],
            workUnitTargets,
          }),
        } satisfies InvokeResolvedTargetSet;
      });

    const materializeTargetsForActivation = ({
      workflowExecutionId,
      stepExecutionId,
      invokeStepDefinitionId,
      invokeStep,
    }: MaterializeInvokeTargetsForActivationParams) =>
      Effect.gen(function* () {
        const existingState =
          yield* invokeRepo.getInvokeStepExecutionStateByStepExecutionId(stepExecutionId);

        if (existingState) {
          const [workflowTargetExecutions, workUnitTargetExecutions] = yield* Effect.all([
            invokeRepo.listInvokeWorkflowTargetExecutions(existingState.id),
            invokeRepo.listInvokeWorkUnitTargetExecutions(existingState.id),
          ]);

          if (
            invokeStep.targetKind === "work_unit" &&
            invokeStep.sourceMode === "context_fact_backed" &&
            workUnitTargetExecutions.length === 0
          ) {
            const resolvedTargets = yield* resolveTargets({
              workflowExecutionId,
              invokeStep,
            });

            const backfilledWorkUnitTargetExecutions = yield* Effect.forEach(
              resolvedTargets.workUnitTargets,
              (target, resolutionOrder) =>
                invokeRepo.createInvokeWorkUnitTargetExecution({
                  invokeStepExecutionStateId: existingState.id,
                  workUnitDefinitionId: target.workUnitDefinitionId,
                  transitionDefinitionId: target.transitionDefinitionId,
                  resolutionOrder,
                }),
            );

            return {
              invokeStepExecutionState: existingState,
              workflowTargetExecutions,
              workUnitTargetExecutions: backfilledWorkUnitTargetExecutions,
              blockingReason: resolvedTargets.blockedReason,
              materializationState: "already_exists",
            } satisfies MaterializeInvokeTargetsForActivationResult;
          }

          return {
            invokeStepExecutionState: existingState,
            workflowTargetExecutions,
            workUnitTargetExecutions,
            blockingReason: getInvokeTargetsBlockedReason({
              workflowTargets: workflowTargetExecutions,
              workUnitTargets: workUnitTargetExecutions,
            }),
            materializationState: "already_exists",
          } satisfies MaterializeInvokeTargetsForActivationResult;
        }

        const resolvedTargets = yield* resolveTargets({
          workflowExecutionId,
          invokeStep,
        });

        const invokeStepExecutionState = yield* invokeRepo.createInvokeStepExecutionState({
          stepExecutionId,
          invokeStepDefinitionId,
        });

        const workflowTargetExecutions = yield* Effect.forEach(
          resolvedTargets.workflowTargets,
          (target, resolutionOrder) =>
            invokeRepo.createInvokeWorkflowTargetExecution({
              invokeStepExecutionStateId: invokeStepExecutionState.id,
              workflowDefinitionId: target.workflowDefinitionId,
              resolutionOrder,
            }),
        );

        const workUnitTargetExecutions = yield* Effect.forEach(
          resolvedTargets.workUnitTargets,
          (target, resolutionOrder) =>
            invokeRepo.createInvokeWorkUnitTargetExecution({
              invokeStepExecutionStateId: invokeStepExecutionState.id,
              workUnitDefinitionId: target.workUnitDefinitionId,
              transitionDefinitionId: target.transitionDefinitionId,
              resolutionOrder,
            }),
        );

        return {
          invokeStepExecutionState,
          workflowTargetExecutions,
          workUnitTargetExecutions,
          blockingReason: resolvedTargets.blockedReason,
          materializationState: "created",
        } satisfies MaterializeInvokeTargetsForActivationResult;
      });

    return InvokeTargetResolutionService.of({
      resolveTargets,
      materializeTargetsForActivation,
    });
  }),
);
