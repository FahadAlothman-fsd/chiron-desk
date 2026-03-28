import type {
  GetRuntimeGuidanceActiveInput,
  GetRuntimeGuidanceActiveOutput,
  RuntimeGuidanceCandidateCard,
  RuntimeGuidanceStreamEnvelope,
  StreamRuntimeGuidanceCandidatesInput,
} from "@chiron/contracts/runtime/guidance";
import type { RuntimeConditionTree } from "@chiron/contracts/runtime/conditions";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
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

const createFallbackSeeds = (
  projectWorkUnits: readonly {
    readonly id: string;
    readonly workUnitTypeId: string;
    readonly currentStateId: string;
    readonly activeTransitionExecutionId: string | null;
  }[],
): readonly RuntimeGuidanceCandidateCardSeed[] =>
  projectWorkUnits
    .filter((workUnit) => workUnit.activeTransitionExecutionId === null)
    .map((workUnit) => ({
      candidateCardId: `open:${workUnit.id}`,
      source: "open",
      workUnitContext: {
        projectWorkUnitId: workUnit.id,
        workUnitTypeId: workUnit.workUnitTypeId,
        workUnitTypeKey: workUnit.workUnitTypeId,
        workUnitTypeName: workUnit.workUnitTypeId,
        currentStateKey: workUnit.currentStateId,
        currentStateLabel: workUnit.currentStateId,
      },
      summaries: {
        facts: { currentCount: 0, totalCount: 0 },
        artifactSlots: { currentCount: 0, totalCount: 0 },
      },
      transitions: [
        {
          candidateId: `candidate:${workUnit.id}:default`,
          transitionId: `transition:${workUnit.id}:default`,
          transitionKey: `transition:${workUnit.id}:default`,
          transitionName: "Default transition",
          toStateKey: workUnit.currentStateId,
          toStateLabel: workUnit.currentStateId,
          source: "open",
          startGate: {
            mode: "all",
            conditions: [],
            groups: [],
          },
        },
      ],
    }));

export const RuntimeGuidanceServiceLive = Layer.effect(
  RuntimeGuidanceService,
  Effect.gen(function* () {
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;
    const executionReadRepository = yield* ExecutionReadRepository;
    const workUnitFactRepository = yield* WorkUnitFactRepository;
    const artifactRepository = yield* ArtifactRepository;
    const runtimeGateService = yield* RuntimeGateService;

    const getActive = (
      input: GetRuntimeGuidanceActiveInput,
    ): Effect.Effect<GetRuntimeGuidanceActiveOutput, RepositoryError> =>
      Effect.gen(function* () {
        const projectWorkUnits = yield* projectWorkUnitRepository.listProjectWorkUnitsByProject(
          input.projectId,
        );

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

              return {
                projectWorkUnitId: workUnit.id,
                workUnitTypeId: workUnit.workUnitTypeId,
                workUnitTypeKey: workUnit.workUnitTypeId,
                workUnitTypeName: workUnit.workUnitTypeId,
                currentStateKey: workUnit.currentStateId,
                currentStateLabel: workUnit.currentStateId,
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
                  toStateKey: transitionDetail.currentStateId,
                  toStateLabel: transitionDetail.currentStateId,
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
              };
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

        const cards = options?.candidateSeeds ?? createFallbackSeeds(projectWorkUnits);
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

              for (const transition of card.transitions) {
                const gateResult: RuntimeGateEvaluationResult = yield* (
                  card.workUnitContext.projectWorkUnitId
                    ? runtimeGateService.evaluateStartGate({
                        projectId: input.projectId,
                        projectWorkUnitId: card.workUnitContext.projectWorkUnitId,
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

    return RuntimeGuidanceService.of({
      getActive,
      streamCandidates,
    });
  }),
);
