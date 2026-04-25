import type {
  GetRuntimeGuidanceActiveInput,
  GetRuntimeGuidanceActiveOutput,
  RuntimeGuidanceCandidateCard,
  RuntimeGuidanceStreamEnvelope,
  StreamRuntimeGuidanceCandidatesInput,
} from "@chiron/contracts/runtime/guidance";
import type {
  GetTransitionStartGateDetailsInput,
  GetTransitionStartGateDetailsOutput,
} from "@chiron/contracts/runtime/work-units";
import type { RuntimeCondition, RuntimeConditionTree } from "@chiron/contracts/runtime/conditions";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import { RuntimeGateService, type RuntimeGateEvaluationResult } from "./runtime-gate-service";

export interface RuntimeGuidanceTransitionSeed {
  readonly candidateId: string;
  readonly transitionId: string;
  readonly transitionKey: string;
  readonly transitionName: string;
  readonly toStateKey: string;
  readonly toStateLabel: string;
  readonly source: "open" | "future";
  readonly startGate: RuntimeConditionTree;
}

export interface RuntimeGuidanceCandidateCardSeed {
  readonly candidateCardId: string;
  readonly source: "open" | "future";
  readonly workUnitContext: RuntimeGuidanceCandidateCard["workUnitContext"];
  readonly summaries: RuntimeGuidanceCandidateCard["summaries"];
  readonly transitions: readonly RuntimeGuidanceTransitionSeed[];
}

export interface StreamRuntimeGuidanceCandidatesOptions {
  readonly maxWorkUnitConcurrency?: number;
  readonly candidateSeeds?: readonly RuntimeGuidanceCandidateCardSeed[];
}

export class RuntimeGuidanceService extends Context.Tag("RuntimeGuidanceService")<
  RuntimeGuidanceService,
  {
    readonly getActive: (
      input: GetRuntimeGuidanceActiveInput,
    ) => Effect.Effect<GetRuntimeGuidanceActiveOutput, RepositoryError>;
    readonly streamCandidates: (
      input: StreamRuntimeGuidanceCandidatesInput,
      options?: StreamRuntimeGuidanceCandidatesOptions,
    ) => Effect.Effect<AsyncIterable<RuntimeGuidanceStreamEnvelope>, never>;
    readonly getRuntimeStartGateDetail: (
      input: GetTransitionStartGateDetailsInput,
    ) => Effect.Effect<GetTransitionStartGateDetailsOutput, RepositoryError>;
  }
>() {}

const toAsyncIterable = <A>(values: readonly A[]): AsyncIterable<A> =>
  (async function* () {
    for (const value of values) {
      yield value;
    }
  })();

const countDistinctFactDefinitions = (
  rows: readonly { readonly factDefinitionId: string }[],
): { readonly currentCount: number; readonly totalCount: number } => {
  const total = new Set(rows.map((row) => row.factDefinitionId)).size;
  return {
    currentCount: total,
    totalCount: total,
  };
};

const emptyGate: RuntimeConditionTree = {
  mode: "all",
  conditions: [],
  groups: [],
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const extractHumanGuidanceMarkdown = (value: unknown): string | undefined => {
  const record = asRecord(value);
  const human = record?.human;
  if (
    human &&
    typeof human === "object" &&
    "markdown" in human &&
    typeof (human as { markdown?: unknown }).markdown === "string"
  ) {
    return (human as { markdown: string }).markdown;
  }

  return undefined;
};

const toRuntimeCondition = (value: unknown): RuntimeCondition | null => {
  const condition = asRecord(value);
  if (!condition) {
    return null;
  }

  if (condition.required === false) {
    return null;
  }

  const kind = typeof condition.kind === "string" ? condition.kind : null;
  const config = asRecord(condition.config) ?? {};

  if (kind === "fact") {
    const factKey = typeof config.factKey === "string" ? config.factKey : null;
    if (!factKey) {
      return null;
    }
    const factDefinitionId =
      typeof config.factDefinitionId === "string" ? config.factDefinitionId : undefined;
    const operator = config.operator === "exists" ? "exists" : "exists";

    return {
      kind: "fact",
      factKey,
      operator,
      ...(factDefinitionId ? { factDefinitionId } : {}),
    };
  }

  if (kind === "work_unit_fact") {
    const factKey = typeof config.factKey === "string" ? config.factKey : null;
    if (!factKey) {
      return null;
    }
    const factDefinitionId =
      typeof config.factDefinitionId === "string" ? config.factDefinitionId : undefined;

    return {
      kind: "work_unit_fact",
      factKey,
      operator: "exists",
      ...(factDefinitionId ? { factDefinitionId } : {}),
    };
  }

  if (kind === "artifact") {
    const slotKey = typeof config.slotKey === "string" ? config.slotKey : null;
    if (!slotKey) {
      return null;
    }
    const slotDefinitionId =
      typeof config.slotDefinitionId === "string" ? config.slotDefinitionId : undefined;
    const operator =
      config.operator === "fresh" || config.operator === "stale" ? config.operator : "exists";

    return {
      kind: "artifact",
      slotKey,
      operator,
      ...(slotDefinitionId ? { slotDefinitionId } : {}),
    };
  }

  if (kind === "work_unit") {
    const workUnitTypeKey =
      typeof config.workUnitTypeKey === "string" ? config.workUnitTypeKey.trim() : "";
    const operator =
      config.operator === "work_unit_instance_exists_in_state"
        ? "work_unit_instance_exists_in_state"
        : config.operator === "work_unit_instance_exists"
          ? "work_unit_instance_exists"
          : null;
    const minCount =
      typeof config.minCount === "number" &&
      Number.isInteger(config.minCount) &&
      config.minCount > 0
        ? config.minCount
        : undefined;
    const stateKeys = Array.isArray(config.stateKeys)
      ? config.stateKeys.filter(
          (value): value is string => typeof value === "string" && value.trim().length > 0,
        )
      : [];
    const isNegated = config.isNegated === true ? true : undefined;

    if (!workUnitTypeKey || !operator) {
      return null;
    }

    if (operator === "work_unit_instance_exists_in_state" && stateKeys.length === 0) {
      return null;
    }

    return {
      kind: "work_unit",
      workUnitTypeKey,
      operator,
      ...(operator === "work_unit_instance_exists_in_state" ? { stateKeys } : {}),
      ...(typeof minCount === "number" ? { minCount } : {}),
      ...(isNegated ? { isNegated } : {}),
    } satisfies RuntimeCondition;
  }

  return null;
};

const toStartGate = (
  conditionSets: readonly { readonly mode: string; readonly groupsJson: unknown }[],
) => {
  if (conditionSets.length === 0) {
    return emptyGate;
  }

  const groups = conditionSets
    .map((conditionSet) => {
      const groupsJson = Array.isArray(conditionSet.groupsJson) ? conditionSet.groupsJson : [];
      const conditions = groupsJson.flatMap((group) => {
        const groupRecord = asRecord(group);
        const groupConditions = Array.isArray(groupRecord?.conditions)
          ? groupRecord.conditions
          : [];

        return groupConditions
          .map((condition) => toRuntimeCondition(condition))
          .filter((condition): condition is RuntimeCondition => condition !== null);
      });

      return {
        mode: conditionSet.mode === "any" ? "any" : "all",
        conditions,
        groups: [],
      } satisfies RuntimeConditionTree;
    })
    .filter((group) => group.conditions.length > 0 || group.groups.length > 0);

  if (groups.length === 0) {
    return emptyGate;
  }

  return {
    mode: "all",
    conditions: [],
    groups,
  } satisfies RuntimeConditionTree;
};

const toAvailableWorkflows = (
  bindingRows: readonly {
    readonly workflowId: string;
    readonly workflowKey: string | null;
    readonly workflowName: string | null;
    readonly workflowDescription: string | null;
    readonly workflowHumanGuidance: string | null;
  }[],
): Array<{
  workflowId: string;
  workflowKey: string;
  workflowName: string;
  workflowDescription?: string;
  workflowHumanGuidance?: string;
}> =>
  bindingRows
    .filter(
      (row): row is { readonly workflowId: string; readonly workflowKey: string } =>
        row.workflowKey !== null,
    )
    .map((row) => ({
      workflowId: row.workflowId,
      workflowKey: row.workflowKey,
      workflowName: row.workflowName ?? row.workflowKey,
      ...(row.workflowDescription ? { workflowDescription: row.workflowDescription } : {}),
      ...(row.workflowHumanGuidance ? { workflowHumanGuidance: row.workflowHumanGuidance } : {}),
    }));

const isSingleCardinality = (cardinality: string): boolean =>
  cardinality === "one" || cardinality === "one_per_project" || cardinality === "single";

const makeRuntimeGuidanceError = (operation: string, cause: string): RepositoryError =>
  new RepositoryError({ operation, cause: new Error(cause) });

export const RuntimeGuidanceServiceLive = Layer.effect(
  RuntimeGuidanceService,
  Effect.gen(function* () {
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;
    const executionReadRepository = yield* ExecutionReadRepository;
    const workUnitFactRepository = yield* WorkUnitFactRepository;
    const artifactRepository = yield* ArtifactRepository;
    const runtimeGateService = yield* RuntimeGateService;
    const projectContextRepository = yield* ProjectContextRepository;
    const lifecycleRepository = yield* LifecycleRepository;

    const getActive = (
      input: GetRuntimeGuidanceActiveInput,
    ): Effect.Effect<GetRuntimeGuidanceActiveOutput, RepositoryError> =>
      Effect.gen(function* () {
        const projectWorkUnits = yield* projectWorkUnitRepository.listProjectWorkUnitsByProject(
          input.projectId,
        );
        const projectPin = yield* projectContextRepository.findProjectPin(input.projectId);
        const [workUnitTypes, lifecycleStates] = projectPin
          ? yield* Effect.all([
              lifecycleRepository.findWorkUnitTypes(projectPin.methodologyVersionId),
              lifecycleRepository.findLifecycleStates(projectPin.methodologyVersionId),
            ])
          : ([[], []] as const);
        const workUnitTypeById = new Map(workUnitTypes.map((row) => [row.id, row] as const));
        const stateById = new Map(lifecycleStates.map((row) => [row.id, row] as const));

        const activeCards = yield* Effect.forEach(
          projectWorkUnits,
          (workUnit) =>
            Effect.gen(function* () {
              if (!workUnit.activeTransitionExecutionId) {
                return null;
              }

              const transitionDetail = yield* executionReadRepository.getTransitionExecutionDetail(
                workUnit.activeTransitionExecutionId,
              );
              if (!transitionDetail) {
                return null;
              }

              const workUnitFacts = yield* workUnitFactRepository.listFactsByWorkUnit({
                projectWorkUnitId: workUnit.id,
              });

              const completionGate = yield* runtimeGateService
                .evaluateCompletionGate({
                  projectId: input.projectId,
                  projectWorkUnitId: workUnit.id,
                  conditionTree: {
                    mode: "all",
                    conditions: [],
                    groups: [],
                  },
                })
                .pipe(
                  Effect.catchTag("UnsupportedConditionKindError", () =>
                    Effect.succeed({
                      result: "blocked" as const,
                      evaluatedAt: new Date().toISOString(),
                    }),
                  ),
                );

              const currentArtifact = yield* artifactRepository
                .getCurrentSnapshotBySlot({
                  projectWorkUnitId: workUnit.id,
                  slotDefinitionId: "default-slot",
                })
                .pipe(
                  Effect.catchAll(() =>
                    Effect.succeed({
                      exists: false,
                      snapshot: null,
                      members: [],
                    }),
                  ),
                );

              const primaryWorkflow = transitionDetail.primaryWorkflowExecution;
              const primaryWorkflowExecutionId =
                primaryWorkflow?.id ?? transitionDetail.transitionExecution.id;
              const primaryWorkflowId =
                primaryWorkflow?.workflowId ?? transitionDetail.transitionExecution.transitionId;
              const primaryWorkflowStatus: "active" | "completed" | "superseded" =
                primaryWorkflow?.status === "completed" || primaryWorkflow?.status === "superseded"
                  ? primaryWorkflow.status
                  : "active";

              const factCounts = countDistinctFactDefinitions(workUnitFacts);
              const workUnitType = workUnitTypeById.get(workUnit.workUnitTypeId);
              const currentState = workUnit.currentStateId
                ? (stateById.get(workUnit.currentStateId) ?? null)
                : null;
              return {
                projectWorkUnitId: workUnit.id,
                workUnitTypeId: workUnit.workUnitTypeId,
                workUnitTypeKey: workUnitType?.key ?? workUnit.workUnitTypeId,
                workUnitTypeName:
                  workUnitType?.displayName ?? workUnitType?.key ?? workUnit.workUnitTypeId,
                ...(extractHumanGuidanceMarkdown(workUnitType?.guidanceJson)
                  ? {
                      workUnitHumanGuidance: extractHumanGuidanceMarkdown(
                        workUnitType?.guidanceJson,
                      ),
                    }
                  : {}),
                currentStateKey: workUnit.currentStateId ?? "unknown-state",
                currentStateLabel:
                  currentState?.displayName ??
                  currentState?.key ??
                  workUnit.currentStateId ??
                  "unknown-state",
                factSummary: {
                  currentCount: factCounts.currentCount,
                  totalCount: factCounts.totalCount,
                },
                artifactSummary: {
                  currentCount: currentArtifact.exists ? 1 : 0,
                  totalCount: currentArtifact.exists ? 1 : 0,
                },
                activeTransition: {
                  transitionExecutionId: transitionDetail.transitionExecution.id,
                  transitionId: transitionDetail.transitionExecution.transitionId,
                  transitionKey: transitionDetail.transitionExecution.transitionId,
                  transitionName: transitionDetail.transitionExecution.transitionId,
                  toStateKey: transitionDetail.currentStateId ?? "unknown-state",
                  toStateLabel: transitionDetail.currentStateId ?? "unknown-state",
                  status: "active" as const,
                  readyForCompletion: completionGate.result === "available",
                },
                activePrimaryWorkflow: {
                  workflowExecutionId: primaryWorkflowExecutionId,
                  workflowId: primaryWorkflowId,
                  workflowKey: primaryWorkflowId,
                  workflowName: primaryWorkflowId,
                  status: primaryWorkflowStatus,
                },
                actions: {
                  primary: {
                    kind: "open_transition" as const,
                    transitionExecutionId: transitionDetail.transitionExecution.id,
                  },
                  openTransitionTarget: {
                    transitionExecutionId: transitionDetail.transitionExecution.id,
                  },
                  openWorkflowTarget: {
                    workflowExecutionId: primaryWorkflowExecutionId,
                  },
                },
              } satisfies GetRuntimeGuidanceActiveOutput["activeWorkUnitCards"][number];
            }),
          { concurrency: 4 },
        );

        return {
          activeWorkUnitCards: activeCards.filter((card) => card !== null),
        };
      });

    const streamCandidates = (
      input: StreamRuntimeGuidanceCandidatesInput,
      options?: StreamRuntimeGuidanceCandidatesOptions,
    ): Effect.Effect<AsyncIterable<RuntimeGuidanceStreamEnvelope>, never> =>
      Effect.gen(function* () {
        const projectWorkUnits = yield* projectWorkUnitRepository.listProjectWorkUnitsByProject(
          input.projectId,
        );
        const projectPin = yield* projectContextRepository.findProjectPin(input.projectId);

        const openCards =
          options?.candidateSeeds ??
          (yield* Effect.gen(function* () {
            if (!projectPin) {
              return [] as const;
            }

            const [workUnitTypes, lifecycleStates, lifecycleTransitions, transitionConditionSets] =
              yield* Effect.all([
                lifecycleRepository.findWorkUnitTypes(projectPin.methodologyVersionId),
                lifecycleRepository.findLifecycleStates(projectPin.methodologyVersionId),
                lifecycleRepository.findLifecycleTransitions(projectPin.methodologyVersionId),
                lifecycleRepository.findTransitionConditionSets(projectPin.methodologyVersionId),
              ]);

            const workUnitTypeById = new Map(workUnitTypes.map((row) => [row.id, row] as const));
            const stateById = new Map(lifecycleStates.map((state) => [state.id, state] as const));
            const conditionSetsByTransitionId = new Map<
              string,
              Array<(typeof transitionConditionSets)[number]>
            >();
            for (const row of transitionConditionSets) {
              const current = conditionSetsByTransitionId.get(row.transitionId) ?? [];
              current.push(row);
              conditionSetsByTransitionId.set(row.transitionId, current);
            }

            return projectWorkUnits
              .filter((workUnit) => workUnit.activeTransitionExecutionId === null)
              .flatMap((workUnit) => {
                const workUnitType = workUnitTypeById.get(workUnit.workUnitTypeId);
                const currentState = workUnit.currentStateId
                  ? (stateById.get(workUnit.currentStateId) ?? null)
                  : null;
                const transitions = lifecycleTransitions
                  .filter(
                    (transition) =>
                      transition.workUnitTypeId === workUnit.workUnitTypeId &&
                      transition.fromStateId === workUnit.currentStateId,
                  )
                  .flatMap((transition) => {
                    const toState = transition.toStateId
                      ? (stateById.get(transition.toStateId) ?? null)
                      : null;
                    if (!toState) {
                      return [];
                    }

                    const startSets = (conditionSetsByTransitionId.get(transition.id) ?? [])
                      .filter((conditionSet) => conditionSet.phase !== "completion")
                      .sort((a, b) => a.key.localeCompare(b.key));

                    return [
                      {
                        candidateId: `candidate:open:${workUnit.id}:${transition.id}`,
                        transitionId: transition.id,
                        transitionKey: transition.transitionKey,
                        transitionName: transition.transitionKey,
                        toStateKey: toState.key,
                        toStateLabel: toState.displayName ?? toState.key,
                        source: "open" as const,
                        startGate: toStartGate(startSets),
                      },
                    ];
                  });

                if (transitions.length === 0) {
                  return [];
                }

                return [
                  {
                    candidateCardId: `open:${workUnit.id}`,
                    source: "open" as const,
                    workUnitContext: {
                      projectWorkUnitId: workUnit.id,
                      workUnitTypeId: workUnit.workUnitTypeId,
                      workUnitTypeKey: workUnitType?.key ?? workUnit.workUnitTypeId,
                      workUnitTypeName:
                        workUnitType?.displayName ?? workUnitType?.key ?? workUnit.workUnitTypeId,
                      ...(extractHumanGuidanceMarkdown(workUnitType?.guidanceJson)
                        ? {
                            workUnitHumanGuidance: extractHumanGuidanceMarkdown(
                              workUnitType?.guidanceJson,
                            ),
                          }
                        : {}),
                      currentStateKey:
                        currentState?.key ?? workUnit.currentStateId ?? "unknown-state",
                      currentStateLabel:
                        currentState?.displayName ??
                        currentState?.key ??
                        workUnit.currentStateId ??
                        "unknown-state",
                    },
                    summaries: {
                      facts: { currentCount: 0, totalCount: 0 },
                      artifactSlots: { currentCount: 0, totalCount: 0 },
                    },
                    transitions,
                  },
                ];
              });
          }));

        const futureCards = options?.candidateSeeds
          ? []
          : yield* Effect.gen(function* () {
              if (!projectPin) {
                return [] as const;
              }

              const [
                workUnitTypes,
                lifecycleStates,
                lifecycleTransitions,
                transitionConditionSets,
              ] = yield* Effect.all([
                lifecycleRepository.findWorkUnitTypes(projectPin.methodologyVersionId),
                lifecycleRepository.findLifecycleStates(projectPin.methodologyVersionId),
                lifecycleRepository.findLifecycleTransitions(projectPin.methodologyVersionId),
                lifecycleRepository.findTransitionConditionSets(projectPin.methodologyVersionId),
              ]);

              const existingCountsByTypeId = new Map<string, number>();
              for (const workUnit of projectWorkUnits) {
                existingCountsByTypeId.set(
                  workUnit.workUnitTypeId,
                  (existingCountsByTypeId.get(workUnit.workUnitTypeId) ?? 0) + 1,
                );
              }

              const stateById = new Map(lifecycleStates.map((state) => [state.id, state] as const));
              const conditionSetsByTransitionId = new Map<
                string,
                Array<(typeof transitionConditionSets)[number]>
              >();
              for (const row of transitionConditionSets) {
                const current = conditionSetsByTransitionId.get(row.transitionId) ?? [];
                current.push(row);
                conditionSetsByTransitionId.set(row.transitionId, current);
              }

              return workUnitTypes.flatMap((workUnitType) => {
                const existingCount = existingCountsByTypeId.get(workUnitType.id) ?? 0;
                const creatable =
                  !isSingleCardinality(workUnitType.cardinality) || existingCount === 0;
                if (!creatable) {
                  return [];
                }

                const transitions = lifecycleTransitions
                  .filter(
                    (transition) =>
                      transition.workUnitTypeId === workUnitType.id &&
                      transition.fromStateId === null,
                  )
                  .flatMap((transition) => {
                    const toState = transition.toStateId
                      ? (stateById.get(transition.toStateId) ?? null)
                      : null;
                    if (!toState) {
                      return [];
                    }

                    const startSets = (conditionSetsByTransitionId.get(transition.id) ?? [])
                      .filter((conditionSet) => conditionSet.phase !== "completion")
                      .sort((a, b) => a.key.localeCompare(b.key));

                    return [
                      {
                        candidateId: `candidate:future:${workUnitType.id}:${transition.id}`,
                        transitionId: transition.id,
                        transitionKey: transition.transitionKey,
                        transitionName: transition.transitionKey,
                        toStateKey: toState.key,
                        toStateLabel: toState.displayName ?? toState.key,
                        source: "future" as const,
                        startGate: toStartGate(startSets),
                      },
                    ];
                  });

                return [
                  {
                    candidateCardId: `future:${workUnitType.id}`,
                    source: "future" as const,
                    workUnitContext: {
                      workUnitTypeId: workUnitType.id,
                      workUnitTypeKey: workUnitType.key,
                      workUnitTypeName: workUnitType.displayName ?? workUnitType.key,
                      ...(extractHumanGuidanceMarkdown(workUnitType.guidanceJson)
                        ? {
                            workUnitHumanGuidance: extractHumanGuidanceMarkdown(
                              workUnitType.guidanceJson,
                            ),
                          }
                        : {}),
                      currentStateLabel: "Not started",
                    },
                    summaries: {
                      facts: { currentCount: 0, totalCount: 0 },
                      artifactSlots: { currentCount: 0, totalCount: 0 },
                    },
                    transitions,
                  },
                ];
              });
            });

        const cards = [...openCards, ...futureCards];
        const bootstrapCards: RuntimeGuidanceCandidateCard[] = cards.map((card) => ({
          candidateCardId: card.candidateCardId,
          source: card.source,
          workUnitContext: card.workUnitContext,
          summaries: card.summaries,
          transitions: card.transitions.map((transition) => ({
            candidateId: transition.candidateId,
            transitionId: transition.transitionId,
            transitionKey: transition.transitionKey,
            transitionName: transition.transitionName,
            toStateKey: transition.toStateKey,
            toStateLabel: transition.toStateLabel,
            source: transition.source,
          })),
        }));

        const baseEvents: RuntimeGuidanceStreamEnvelope[] = [
          {
            version: "1",
            type: "bootstrap",
            cards: bootstrapCards,
          },
        ];

        const perCardEvents = yield* Effect.forEach(
          cards,
          (card) =>
            Effect.gen(function* () {
              const events: RuntimeGuidanceStreamEnvelope[] = [];
              const projectWorkUnitId =
                "projectWorkUnitId" in card.workUnitContext
                  ? card.workUnitContext.projectWorkUnitId
                  : undefined;

              for (const transition of card.transitions) {
                const gateResult: RuntimeGateEvaluationResult = yield* (
                  projectWorkUnitId
                    ? runtimeGateService.evaluateStartGate({
                        projectId: input.projectId,
                        projectWorkUnitId,
                        conditionTree: transition.startGate,
                      })
                    : runtimeGateService.evaluateStartGate({
                        projectId: input.projectId,
                        conditionTree: transition.startGate,
                      })
                ).pipe(
                  Effect.catchAll((error) =>
                    Effect.succeed({
                      result: "blocked" as const,
                      firstReason: String(error),
                      evaluatedAt: new Date().toISOString(),
                    }),
                  ),
                );

                events.push({
                  version: "1",
                  type: "transitionResult",
                  candidateId: transition.candidateId,
                  result: gateResult.result,
                  ...(gateResult.firstReason !== undefined
                    ? { firstReason: gateResult.firstReason }
                    : {}),
                });
              }

              events.push({
                version: "1",
                type: "workUnitDone",
                candidateCardId: card.candidateCardId,
              });

              return events;
            }),
          {
            concurrency: options?.maxWorkUnitConcurrency ?? 4,
          },
        );

        const flattened = perCardEvents.flat();
        const doneEvent: RuntimeGuidanceStreamEnvelope = {
          version: "1",
          type: "done",
        };

        return toAsyncIterable([...baseEvents, ...flattened, doneEvent]);
      }).pipe(
        Effect.catchAllCause((cause) =>
          Effect.succeed(
            toAsyncIterable<RuntimeGuidanceStreamEnvelope>([
              {
                version: "1",
                type: "error",
                message: String(cause),
              },
            ]),
          ),
        ),
      );

    const getRuntimeStartGateDetail = (
      input: GetTransitionStartGateDetailsInput,
    ): Effect.Effect<GetTransitionStartGateDetailsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const projectPin = yield* projectContextRepository.findProjectPin(input.projectId);
        if (!projectPin) {
          return yield* makeRuntimeGuidanceError(
            "runtime-guidance.getRuntimeStartGateDetail",
            `Project pin not found for project '${input.projectId}'`,
          );
        }

        if (input.futureCandidate) {
          const [workUnitTypes, lifecycleStates, lifecycleTransitions, transitionConditionSets] =
            yield* Effect.all([
              lifecycleRepository.findWorkUnitTypes(projectPin.methodologyVersionId),
              lifecycleRepository.findLifecycleStates(projectPin.methodologyVersionId),
              lifecycleRepository.findLifecycleTransitions(projectPin.methodologyVersionId, {
                workUnitTypeId: input.futureCandidate.workUnitTypeId,
              }),
              lifecycleRepository.findTransitionConditionSets(
                projectPin.methodologyVersionId,
                input.transitionId,
              ),
            ]);

          const workUnitType = workUnitTypes.find(
            (row) => row.id === input.futureCandidate?.workUnitTypeId,
          );
          if (!workUnitType) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Work unit type not found: ${input.futureCandidate.workUnitTypeId}`,
            );
          }

          const transition = lifecycleTransitions.find(
            (row) => row.id === input.transitionId && row.workUnitTypeId === workUnitType.id,
          );
          if (!transition) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Transition not found for future candidate: ${input.transitionId}`,
            );
          }

          const bindingRows = yield* lifecycleRepository.findTransitionWorkflowBindings(
            projectPin.methodologyVersionId,
            transition.id,
          );
          const availableWorkflows = toAvailableWorkflows(bindingRows);

          const stateById = new Map(lifecycleStates.map((state) => [state.id, state] as const));
          const toState = transition.toStateId
            ? (stateById.get(transition.toStateId) ?? null)
            : null;
          if (!toState) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Transition '${transition.id}' has no resolved to-state`,
            );
          }

          const fromState = transition.fromStateId
            ? (stateById.get(transition.fromStateId) ?? null)
            : null;
          const startSets = transitionConditionSets
            .filter((conditionSet) => conditionSet.phase !== "completion")
            .sort((a, b) => a.key.localeCompare(b.key));
          const conditionTree = toStartGate(startSets);
          const gateSummary = yield* runtimeGateService
            .evaluateStartGateExhaustive({
              projectId: input.projectId,
              conditionTree,
            })
            .pipe(
              Effect.catchAll(() =>
                Effect.succeed({
                  result: "blocked" as const,
                  evaluatedAt: new Date().toISOString(),
                  evaluationTree: {
                    mode: conditionTree.mode,
                    met: false,
                    conditions: [],
                    groups: [],
                  },
                }),
              ),
            );

          return {
            transition: {
              transitionId: transition.id,
              transitionKey: transition.transitionKey,
              transitionName: transition.transitionKey,
              ...(transition.fromStateId ? { fromStateId: transition.fromStateId } : {}),
              ...(fromState ? { fromStateKey: fromState.key } : {}),
              ...(transition.toStateId ? { toStateId: transition.toStateId } : {}),
              toStateKey: toState.key,
            },
            workUnitContext: {
              workUnitTypeId: workUnitType.id,
              workUnitTypeKey:
                input.futureCandidate.workUnitTypeKey ?? workUnitType.key ?? workUnitType.id,
              workUnitTypeName: workUnitType.displayName ?? workUnitType.key,
              ...(extractHumanGuidanceMarkdown(workUnitType.guidanceJson)
                ? { workUnitHumanGuidance: extractHumanGuidanceMarkdown(workUnitType.guidanceJson) }
                : {}),
              currentStateLabel: "Not started",
              source: "future",
            },
            gateSummary: {
              result: gateSummary.result,
            },
            conditionTree,
            evaluationTree: gateSummary.evaluationTree,
            launchability: {
              canLaunch: gateSummary.result === "available",
              availableWorkflows,
            },
          } satisfies GetTransitionStartGateDetailsOutput;
        }

        if (input.projectWorkUnitId) {
          const projectWorkUnit = yield* projectWorkUnitRepository.getProjectWorkUnitById(
            input.projectWorkUnitId,
          );
          if (!projectWorkUnit) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Project work unit not found: ${input.projectWorkUnitId}`,
            );
          }

          if (projectWorkUnit.projectId !== input.projectId) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Project work unit '${input.projectWorkUnitId}' does not belong to project '${input.projectId}'`,
            );
          }

          const [workUnitTypes, lifecycleStates, lifecycleTransitions, transitionConditionSets] =
            yield* Effect.all([
              lifecycleRepository.findWorkUnitTypes(projectPin.methodologyVersionId),
              lifecycleRepository.findLifecycleStates(
                projectPin.methodologyVersionId,
                projectWorkUnit.workUnitTypeId,
              ),
              lifecycleRepository.findLifecycleTransitions(projectPin.methodologyVersionId, {
                workUnitTypeId: projectWorkUnit.workUnitTypeId,
              }),
              lifecycleRepository.findTransitionConditionSets(
                projectPin.methodologyVersionId,
                input.transitionId,
              ),
            ]);

          const workUnitType = workUnitTypes.find(
            (row) => row.id === projectWorkUnit.workUnitTypeId,
          );
          if (!workUnitType) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Work unit type not found: ${projectWorkUnit.workUnitTypeId}`,
            );
          }

          const transition = lifecycleTransitions.find(
            (row) =>
              row.id === input.transitionId &&
              row.workUnitTypeId === projectWorkUnit.workUnitTypeId,
          );
          if (!transition) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Transition not found for work unit '${projectWorkUnit.id}': ${input.transitionId}`,
            );
          }

          const bindingRows = yield* lifecycleRepository.findTransitionWorkflowBindings(
            projectPin.methodologyVersionId,
            transition.id,
          );
          const availableWorkflows = toAvailableWorkflows(bindingRows);

          const stateById = new Map(lifecycleStates.map((state) => [state.id, state] as const));
          const currentStateId = projectWorkUnit.currentStateId ?? undefined;
          const currentState = currentStateId ? (stateById.get(currentStateId) ?? null) : null;
          const fromState = transition.fromStateId
            ? (stateById.get(transition.fromStateId) ?? null)
            : null;
          const toState = transition.toStateId
            ? (stateById.get(transition.toStateId) ?? null)
            : null;
          if (!toState) {
            return yield* makeRuntimeGuidanceError(
              "runtime-guidance.getRuntimeStartGateDetail",
              `Transition '${transition.id}' has no resolved to-state`,
            );
          }

          const startSets = transitionConditionSets
            .filter((conditionSet) => conditionSet.phase !== "completion")
            .sort((a, b) => a.key.localeCompare(b.key));
          const conditionTree = toStartGate(startSets);

          const gateSummary = yield* runtimeGateService
            .evaluateStartGateExhaustive({
              projectId: input.projectId,
              projectWorkUnitId: projectWorkUnit.id,
              conditionTree,
            })
            .pipe(
              Effect.catchAll(() =>
                Effect.succeed({
                  result: "blocked" as const,
                  evaluatedAt: new Date().toISOString(),
                  evaluationTree: {
                    mode: conditionTree.mode,
                    met: false,
                    conditions: [],
                    groups: [],
                  },
                }),
              ),
            );

          return {
            transition: {
              transitionId: transition.id,
              transitionKey: transition.transitionKey,
              transitionName: transition.transitionKey,
              ...(transition.fromStateId ? { fromStateId: transition.fromStateId } : {}),
              ...(fromState ? { fromStateKey: fromState.key } : {}),
              ...(transition.toStateId ? { toStateId: transition.toStateId } : {}),
              toStateKey: toState.key,
            },
            workUnitContext: {
              projectWorkUnitId: projectWorkUnit.id,
              workUnitTypeId: workUnitType.id,
              workUnitTypeKey: workUnitType.key ?? workUnitType.id,
              workUnitTypeName: workUnitType.displayName ?? workUnitType.key ?? workUnitType.id,
              ...(extractHumanGuidanceMarkdown(workUnitType.guidanceJson)
                ? { workUnitHumanGuidance: extractHumanGuidanceMarkdown(workUnitType.guidanceJson) }
                : {}),
              currentStateLabel:
                currentState?.displayName ??
                currentState?.key ??
                projectWorkUnit.currentStateId ??
                "unknown-state",
              source: "open",
            },
            gateSummary: {
              result: gateSummary.result,
            },
            conditionTree,
            evaluationTree: gateSummary.evaluationTree,
            launchability: {
              canLaunch: gateSummary.result === "available",
              availableWorkflows,
            },
          } satisfies GetTransitionStartGateDetailsOutput;
        }

        return yield* makeRuntimeGuidanceError(
          "runtime-guidance.getRuntimeStartGateDetail",
          "Either futureCandidate or projectWorkUnitId is required",
        );
      });

    return RuntimeGuidanceService.of({
      getActive,
      streamCandidates,
      getRuntimeStartGateDetail,
    });
  }),
);
