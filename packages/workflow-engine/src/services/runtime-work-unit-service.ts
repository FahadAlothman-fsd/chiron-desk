import type {
  GetWorkUnitOverviewInput,
  GetWorkUnitOverviewOutput,
  GetWorkUnitStateMachineInput,
  GetWorkUnitStateMachineOutput,
  GetWorkUnitsInput,
  GetWorkUnitsOutput,
} from "@chiron/contracts/runtime/work-units";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import { ArtifactRepository } from "../repositories/artifact-repository";

export interface RuntimeStateMachineTransitionCandidate {
  readonly transitionId: string;
  readonly transitionKey: string;
  readonly transitionName: string;
  readonly fromStateId: string;
  readonly fromStateKey: string;
  readonly toStateId: string;
  readonly toStateKey: string;
  readonly toStateLabel: string;
  readonly result: "available" | "blocked";
  readonly firstReason?: string;
  readonly actionMode: "start" | "switch";
}

export interface RuntimeWorkUnitStateMachineOptions {
  readonly possibleTransitions?: readonly RuntimeStateMachineTransitionCandidate[];
}

export class RuntimeWorkUnitService extends Context.Tag("RuntimeWorkUnitService")<
  RuntimeWorkUnitService,
  {
    readonly getWorkUnits: (
      input: GetWorkUnitsInput,
    ) => Effect.Effect<GetWorkUnitsOutput, RepositoryError>;
    readonly getWorkUnitOverview: (
      input: GetWorkUnitOverviewInput,
    ) => Effect.Effect<GetWorkUnitOverviewOutput, RepositoryError>;
    readonly getWorkUnitStateMachine: (
      input: GetWorkUnitStateMachineInput,
      options?: RuntimeWorkUnitStateMachineOptions,
    ) => Effect.Effect<GetWorkUnitStateMachineOutput, RepositoryError>;
  }
>() {}

const isHistoricTransitionStatus = (
  status: "active" | "completed" | "superseded",
): status is "completed" | "superseded" => status === "completed" || status === "superseded";

const toWorkUnitIdentity = (workUnit: {
  readonly id: string;
  readonly workUnitTypeId: string;
  readonly currentStateId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}) => ({
  projectWorkUnitId: workUnit.id,
  workUnitTypeId: workUnit.workUnitTypeId,
  workUnitTypeKey: workUnit.workUnitTypeId,
  workUnitTypeName: workUnit.workUnitTypeId,
  currentStateId: workUnit.currentStateId,
  currentStateKey: workUnit.currentStateId,
  currentStateLabel: workUnit.currentStateId,
  createdAt: workUnit.createdAt.toISOString(),
  updatedAt: workUnit.updatedAt.toISOString(),
});

const toOptionalActiveTransition = (args: {
  readonly transitionExecutionId: string;
  readonly transitionId: string;
  readonly toStateId: string;
  readonly primaryWorkflowExecution?: {
    readonly id: string;
    readonly workflowId: string;
    readonly status: "active" | "completed" | "superseded" | "parent_superseded";
  } | null;
}): GetWorkUnitOverviewOutput["activeTransition"] => {
  const primary = args.primaryWorkflowExecution;

  return {
    transitionExecutionId: args.transitionExecutionId,
    transitionId: args.transitionId,
    transitionKey: args.transitionId,
    transitionName: args.transitionId,
    toStateId: args.toStateId,
    toStateKey: args.toStateId,
    toStateLabel: args.toStateId,
    status: "active",
    ...(primary && (primary.status === "active" || primary.status === "completed")
      ? {
          primaryWorkflow: {
            workflowExecutionId: primary.id,
            workflowId: primary.workflowId,
            workflowKey: primary.workflowId,
            workflowName: primary.workflowId,
            status: primary.status,
          },
        }
      : {}),
    actions: {
      primary: {
        kind: "open_transition",
        transitionExecutionId: args.transitionExecutionId,
      },
      ...(primary
        ? {
            secondaryWorkflow: {
              kind: "open_workflow" as const,
              workflowExecutionId: primary.id,
            },
          }
        : {}),
      openTransitionTarget: {
        page: "transition-execution-detail",
        transitionExecutionId: args.transitionExecutionId,
      },
      ...(primary
        ? {
            openWorkflowTarget: {
              page: "workflow-execution-detail" as const,
              workflowExecutionId: primary.id,
            },
          }
        : {}),
    },
  };
};

export const RuntimeWorkUnitServiceLive = Layer.effect(
  RuntimeWorkUnitService,
  Effect.gen(function* () {
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;
    const executionReadRepository = yield* ExecutionReadRepository;
    const workUnitFactRepository = yield* WorkUnitFactRepository;
    const artifactRepository = yield* ArtifactRepository;

    const getWorkUnits = (
      input: GetWorkUnitsInput,
    ): Effect.Effect<GetWorkUnitsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const projectWorkUnits = yield* projectWorkUnitRepository.listProjectWorkUnitsByProject(
          input.projectId,
        );

        const rows = yield* Effect.forEach(
          projectWorkUnits,
          (workUnit) =>
            Effect.gen(function* () {
              const [workUnitFacts, transitionDetail] = yield* Effect.all([
                workUnitFactRepository.listFactsByWorkUnit({ projectWorkUnitId: workUnit.id }),
                workUnit.activeTransitionExecutionId
                  ? executionReadRepository.getTransitionExecutionDetail(
                      workUnit.activeTransitionExecutionId,
                    )
                  : Effect.succeed(null),
              ]);

              const outboundDependencies = workUnitFacts.filter(
                (fact) => fact.referencedProjectWorkUnitId !== null,
              ).length;

              return {
                projectWorkUnitId: workUnit.id,
                displayIdentity: {
                  primaryLabel: workUnit.workUnitTypeId,
                  secondaryLabel: workUnit.currentStateId,
                  fullInstanceId: workUnit.id,
                },
                workUnitType: {
                  workUnitTypeId: workUnit.workUnitTypeId,
                  workUnitTypeKey: workUnit.workUnitTypeId,
                  workUnitTypeName: workUnit.workUnitTypeId,
                  cardinality: "many_per_project" as const,
                },
                currentState: {
                  stateId: workUnit.currentStateId,
                  stateKey: workUnit.currentStateId,
                  stateLabel: workUnit.currentStateId,
                },
                ...(transitionDetail
                  ? {
                      activeTransition: {
                        transitionExecutionId: transitionDetail.transitionExecution.id,
                        transitionId: transitionDetail.transitionExecution.transitionId,
                        transitionKey: transitionDetail.transitionExecution.transitionId,
                        transitionName: transitionDetail.transitionExecution.transitionId,
                        toStateId: transitionDetail.currentStateId,
                        toStateKey: transitionDetail.currentStateId,
                        toStateLabel: transitionDetail.currentStateId,
                        ...(transitionDetail.primaryWorkflowExecution
                          ? {
                              primaryWorkflow: {
                                workflowExecutionId: transitionDetail.primaryWorkflowExecution.id,
                                workflowId: transitionDetail.primaryWorkflowExecution.workflowId,
                                workflowKey: transitionDetail.primaryWorkflowExecution.workflowId,
                                workflowName: transitionDetail.primaryWorkflowExecution.workflowId,
                                status: transitionDetail.primaryWorkflowExecution.status,
                              },
                            }
                          : {}),
                      },
                    }
                  : {}),
                summaries: {
                  factsDependencies: {
                    factInstancesCurrent: workUnitFacts.length,
                    factDefinitionsTotal: new Set(
                      workUnitFacts.map((fact) => fact.factDefinitionId),
                    ).size,
                    inboundDependencyCount: 0,
                    outboundDependencyCount: outboundDependencies,
                  },
                  artifactSlots: {
                    slotsWithCurrentArtifacts: 0,
                    slotDefinitionsTotal: 0,
                  },
                },
                timestamps: {
                  createdAt: workUnit.createdAt.toISOString(),
                  updatedAt: workUnit.updatedAt.toISOString(),
                },
                target: {
                  page: "work-unit-overview" as const,
                  projectWorkUnitId: workUnit.id,
                },
              };
            }),
          { concurrency: 6 },
        );

        return {
          project: {
            projectId: input.projectId,
            name: `Project ${input.projectId}`,
          },
          filters: {
            ...(input.filters?.cardinalities !== undefined
              ? { cardinalities: input.filters.cardinalities }
              : {}),
            ...(input.filters?.workUnitTypeIds !== undefined
              ? { workUnitTypeIds: input.filters.workUnitTypeIds }
              : {}),
            ...(input.filters?.workUnitTypeKeys !== undefined
              ? { workUnitTypeKeys: input.filters.workUnitTypeKeys }
              : {}),
            ...(input.filters?.hasActiveTransition !== undefined
              ? { hasActiveTransition: input.filters.hasActiveTransition }
              : {}),
          },
          rows,
        };
      });

    const getWorkUnitOverview = (
      input: GetWorkUnitOverviewInput,
    ): Effect.Effect<GetWorkUnitOverviewOutput, RepositoryError> =>
      Effect.gen(function* () {
        const workUnit = yield* projectWorkUnitRepository.getProjectWorkUnitById(
          input.projectWorkUnitId,
        );

        if (!workUnit || workUnit.projectId !== input.projectId) {
          return {
            workUnit: {
              projectWorkUnitId: input.projectWorkUnitId,
              workUnitTypeId: "unknown-work-unit-type",
              workUnitTypeKey: "unknown-work-unit-type",
              workUnitTypeName: "unknown-work-unit-type",
              currentStateId: "unknown-state",
              currentStateKey: "unknown-state",
              currentStateLabel: "unknown-state",
              createdAt: new Date(0).toISOString(),
              updatedAt: new Date(0).toISOString(),
            },
            summaries: {
              factsDependencies: {
                factInstancesCurrent: 0,
                factDefinitionsTotal: 0,
                inboundDependencyCount: 0,
                outboundDependencyCount: 0,
                target: {
                  page: "work-unit-facts",
                  projectWorkUnitId: input.projectWorkUnitId,
                },
              },
              stateMachine: {
                currentStateKey: "unknown-state",
                currentStateLabel: "unknown-state",
                hasActiveTransition: false,
                target: {
                  page: "work-unit-state-machine",
                  projectWorkUnitId: input.projectWorkUnitId,
                },
              },
              artifactSlots: {
                slotsWithCurrentSnapshots: 0,
                slotDefinitionsTotal: 0,
                target: {
                  page: "artifact-slots",
                  projectWorkUnitId: input.projectWorkUnitId,
                },
              },
            },
          };
        }

        const [workUnitFacts, transitionDetail, currentArtifact] = yield* Effect.all([
          workUnitFactRepository.listFactsByWorkUnit({ projectWorkUnitId: workUnit.id }),
          workUnit.activeTransitionExecutionId
            ? executionReadRepository.getTransitionExecutionDetail(
                workUnit.activeTransitionExecutionId,
              )
            : Effect.succeed(null),
          artifactRepository
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
            ),
        ]);

        const outboundDependencies = workUnitFacts.filter(
          (fact) => fact.referencedProjectWorkUnitId !== null,
        ).length;

        const activeTransition = transitionDetail
          ? toOptionalActiveTransition({
              transitionExecutionId: transitionDetail.transitionExecution.id,
              transitionId: transitionDetail.transitionExecution.transitionId,
              toStateId: transitionDetail.currentStateId,
              primaryWorkflowExecution: transitionDetail.primaryWorkflowExecution,
            })
          : undefined;

        return {
          workUnit: toWorkUnitIdentity(workUnit),
          ...(activeTransition ? { activeTransition } : {}),
          summaries: {
            factsDependencies: {
              factInstancesCurrent: workUnitFacts.length,
              factDefinitionsTotal: new Set(workUnitFacts.map((fact) => fact.factDefinitionId))
                .size,
              inboundDependencyCount: 0,
              outboundDependencyCount: outboundDependencies,
              target: {
                page: "work-unit-facts",
                projectWorkUnitId: workUnit.id,
              },
            },
            stateMachine: {
              currentStateKey: workUnit.currentStateId,
              currentStateLabel: workUnit.currentStateId,
              hasActiveTransition: workUnit.activeTransitionExecutionId !== null,
              target: {
                page: "work-unit-state-machine",
                projectWorkUnitId: workUnit.id,
              },
            },
            artifactSlots: {
              slotsWithCurrentSnapshots: currentArtifact.exists ? 1 : 0,
              slotDefinitionsTotal: currentArtifact.exists ? 1 : 0,
              target: {
                page: "artifact-slots",
                projectWorkUnitId: workUnit.id,
              },
            },
          },
        };
      });

    const getWorkUnitStateMachine = (
      input: GetWorkUnitStateMachineInput,
      options?: RuntimeWorkUnitStateMachineOptions,
    ): Effect.Effect<GetWorkUnitStateMachineOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [overview, transitionHistory] = yield* Effect.all([
          getWorkUnitOverview({
            projectId: input.projectId,
            projectWorkUnitId: input.projectWorkUnitId,
          }),
          executionReadRepository.listTransitionExecutionsForWorkUnit(input.projectWorkUnitId),
        ]);

        const history = transitionHistory
          .filter((row) => isHistoricTransitionStatus(row.status))
          .map((row) => {
            const status: "completed" | "superseded" =
              row.status === "superseded" ? "superseded" : "completed";

            return {
              transitionExecutionId: row.id,
              transitionId: row.transitionId,
              transitionKey: row.transitionId,
              transitionName: row.transitionId,
              ...(status === "superseded" ? { fromStateId: overview.workUnit.currentStateId } : {}),
              ...(status === "superseded"
                ? { fromStateKey: overview.workUnit.currentStateKey }
                : {}),
              toStateId: overview.workUnit.currentStateId,
              toStateKey: overview.workUnit.currentStateKey,
              status,
              startedAt: row.startedAt.toISOString(),
              ...(row.completedAt ? { completedAt: row.completedAt.toISOString() } : {}),
              ...(row.supersededAt ? { supersededAt: row.supersededAt.toISOString() } : {}),
              target: {
                page: "transition-execution-detail" as const,
                transitionExecutionId: row.id,
              },
            };
          });

        const possibleTransitions = (options?.possibleTransitions ?? []).map((candidate) => ({
          transitionId: candidate.transitionId,
          transitionKey: candidate.transitionKey,
          transitionName: candidate.transitionName,
          fromStateId: candidate.fromStateId,
          fromStateKey: candidate.fromStateKey,
          toStateId: candidate.toStateId,
          toStateKey: candidate.toStateKey,
          toStateLabel: candidate.toStateLabel,
          result: candidate.result,
          ...(candidate.firstReason !== undefined ? { firstReason: candidate.firstReason } : {}),
          actionMode: candidate.actionMode,
          actions: {
            inspectStartGate: {
              transitionId: candidate.transitionId,
              projectWorkUnitId: input.projectWorkUnitId,
            },
          },
        }));

        return {
          workUnit: {
            projectWorkUnitId: overview.workUnit.projectWorkUnitId,
            workUnitTypeId: overview.workUnit.workUnitTypeId,
            workUnitTypeKey: overview.workUnit.workUnitTypeKey,
            workUnitTypeName: overview.workUnit.workUnitTypeName,
            currentStateId: overview.workUnit.currentStateId,
            currentStateKey: overview.workUnit.currentStateKey,
            currentStateLabel: overview.workUnit.currentStateLabel,
          },
          ...(overview.activeTransition ? { activeTransition: overview.activeTransition } : {}),
          possibleTransitions,
          history,
        };
      });

    return RuntimeWorkUnitService.of({
      getWorkUnits,
      getWorkUnitOverview,
      getWorkUnitStateMachine,
    });
  }),
);
