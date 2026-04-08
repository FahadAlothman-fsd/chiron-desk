import type {
  GetWorkUnitOverviewInput,
  GetWorkUnitOverviewOutput,
  GetWorkUnitStateMachineInput,
  GetWorkUnitStateMachineOutput,
  GetWorkUnitsInput,
  GetWorkUnitsOutput,
} from "@chiron/contracts/runtime/work-units";
import { LifecycleRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
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

type LifecycleLookups = {
  readonly workUnitTypesById: ReadonlyMap<
    string,
    {
      key: string;
      displayName: string | null;
      cardinality: "one_per_project" | "many_per_project";
    }
  >;
  readonly statesById: ReadonlyMap<string, { key: string; displayName: string | null }>;
  readonly transitionsById: ReadonlyMap<
    string,
    { transitionKey: string; fromStateId: string | null; toStateId: string | null }
  >;
  readonly workflowKeyByTransitionAndWorkflow: ReadonlyMap<string, string>;
};

type ResolvedStateIdentity = {
  readonly stateId: string;
  readonly stateKey: string;
  readonly stateLabel: string;
};

const resolveStateIdentity = (
  stateId: string | null,
  lookups: LifecycleLookups | null,
): ResolvedStateIdentity => {
  if (!stateId) {
    return {
      stateId: "activation",
      stateKey: "activation",
      stateLabel: "Activation",
    };
  }

  const state = lookups?.statesById.get(stateId);
  if (!state) {
    return {
      stateId,
      stateKey: stateId,
      stateLabel: stateId,
    };
  }

  return {
    stateId,
    stateKey: state.key,
    stateLabel: state.displayName ?? state.key,
  };
};

const resolveWorkUnitTypeIdentity = (
  workUnitTypeId: string,
  lookups: LifecycleLookups | null,
): {
  readonly workUnitTypeId: string;
  readonly workUnitTypeKey: string;
  readonly workUnitTypeName: string;
  readonly cardinality: "one_per_project" | "many_per_project";
} => {
  const workUnitType = lookups?.workUnitTypesById.get(workUnitTypeId);
  if (!workUnitType) {
    return {
      workUnitTypeId,
      workUnitTypeKey: workUnitTypeId,
      workUnitTypeName: workUnitTypeId,
      cardinality: "many_per_project",
    };
  }

  return {
    workUnitTypeId,
    workUnitTypeKey: workUnitType.key,
    workUnitTypeName: workUnitType.displayName ?? workUnitType.key,
    cardinality: workUnitType.cardinality,
  };
};

const resolveTransitionIdentity = (
  transitionId: string,
  workUnitCurrentStateId: string | null,
  lookups: LifecycleLookups | null,
) => {
  const humanizeTransitionKey = (value: string): string =>
    value
      .replaceAll("_", " ")
      .split(" ")
      .filter((part) => part.length > 0)
      .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
      .join(" ");

  const transition = lookups?.transitionsById.get(transitionId);
  const transitionKey = transition?.transitionKey ?? transitionId;
  const transitionName = humanizeTransitionKey(transition?.transitionKey ?? transitionId);
  const fromState = resolveStateIdentity(
    transition?.fromStateId ?? workUnitCurrentStateId,
    lookups ?? null,
  );
  const toState = resolveStateIdentity(
    transition?.toStateId ?? workUnitCurrentStateId,
    lookups ?? null,
  );

  return {
    transitionId,
    transitionKey,
    transitionName,
    fromState,
    toState,
  };
};

const toWorkUnitIdentity = (
  workUnit: {
    readonly id: string;
    readonly workUnitTypeId: string;
    readonly currentStateId: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
  },
  lookups: LifecycleLookups | null,
) => {
  const workUnitType = resolveWorkUnitTypeIdentity(workUnit.workUnitTypeId, lookups);
  const currentState = resolveStateIdentity(workUnit.currentStateId, lookups);

  return {
    projectWorkUnitId: workUnit.id,
    workUnitTypeId: workUnitType.workUnitTypeId,
    workUnitTypeKey: workUnitType.workUnitTypeKey,
    workUnitTypeName: workUnitType.workUnitTypeName,
    cardinality: workUnitType.cardinality,
    currentStateId: currentState.stateId,
    currentStateKey: currentState.stateKey,
    currentStateLabel: currentState.stateLabel,
    createdAt: workUnit.createdAt.toISOString(),
    updatedAt: workUnit.updatedAt.toISOString(),
  };
};

const toOptionalActiveTransition = (args: {
  readonly transitionExecutionId: string;
  readonly transitionId: string;
  readonly workUnitCurrentStateId: string | null;
  readonly lookups: LifecycleLookups | null;
  readonly primaryWorkflowExecution?: {
    readonly id: string;
    readonly workflowId: string;
    readonly status: "active" | "completed" | "superseded" | "parent_superseded";
  } | null;
}): GetWorkUnitOverviewOutput["activeTransition"] => {
  const primary = args.primaryWorkflowExecution;
  const transition = resolveTransitionIdentity(
    args.transitionId,
    args.workUnitCurrentStateId,
    args.lookups,
  );
  const workflowLookupKey = `${args.transitionId}:${primary?.workflowId ?? ""}`;
  const workflowKey =
    primary && args.lookups?.workflowKeyByTransitionAndWorkflow.get(workflowLookupKey)
      ? args.lookups.workflowKeyByTransitionAndWorkflow.get(workflowLookupKey)
      : primary?.workflowId;

  return {
    transitionExecutionId: args.transitionExecutionId,
    transitionId: transition.transitionId,
    transitionKey: transition.transitionKey,
    transitionName: transition.transitionName,
    toStateId: transition.toState.stateId,
    toStateKey: transition.toState.stateKey,
    toStateLabel: transition.toState.stateLabel,
    status: "active",
    ...(primary && (primary.status === "active" || primary.status === "completed")
      ? {
          primaryWorkflow: {
            workflowExecutionId: primary.id,
            workflowId: primary.workflowId,
            workflowKey: workflowKey ?? primary.workflowId,
            workflowName: workflowKey ?? primary.workflowId,
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
    const projectContextRepository = yield* ProjectContextRepository;
    const lifecycleRepository = yield* LifecycleRepository;

    const getLifecycleLookups = (
      projectId: string,
    ): Effect.Effect<LifecycleLookups | null, RepositoryError> =>
      Effect.gen(function* () {
        const pin = yield* projectContextRepository.findProjectPin(projectId);
        if (!pin) {
          return null;
        }

        const [workUnitTypes, states, transitions, workflowBindings] = yield* Effect.all([
          lifecycleRepository.findWorkUnitTypes(pin.methodologyVersionId),
          lifecycleRepository.findLifecycleStates(pin.methodologyVersionId),
          lifecycleRepository.findLifecycleTransitions(pin.methodologyVersionId),
          lifecycleRepository.findTransitionWorkflowBindings(pin.methodologyVersionId),
        ]);

        return {
          workUnitTypesById: new Map(
            workUnitTypes.map(
              (row) =>
                [
                  row.id,
                  {
                    key: row.key,
                    displayName: row.displayName,
                    cardinality:
                      row.cardinality === "one_per_project"
                        ? "one_per_project"
                        : "many_per_project",
                  },
                ] as const,
            ),
          ),
          statesById: new Map(
            states.map((row) => [row.id, { key: row.key, displayName: row.displayName }] as const),
          ),
          transitionsById: new Map(
            transitions.map(
              (row) =>
                [
                  row.id,
                  {
                    transitionKey: row.transitionKey,
                    fromStateId: row.fromStateId,
                    toStateId: row.toStateId,
                  },
                ] as const,
            ),
          ),
          workflowKeyByTransitionAndWorkflow: new Map(
            workflowBindings.map(
              (row) =>
                [
                  `${row.transitionId}:${row.workflowId}`,
                  row.workflowKey ?? row.workflowId,
                ] as const,
            ),
          ),
        };
      });

    const getWorkUnits = (
      input: GetWorkUnitsInput,
    ): Effect.Effect<GetWorkUnitsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const lookups = yield* getLifecycleLookups(input.projectId);
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
              const identity = toWorkUnitIdentity(workUnit, lookups);

              return {
                projectWorkUnitId: workUnit.id,
                displayIdentity: {
                  primaryLabel: identity.workUnitTypeName,
                  secondaryLabel: identity.currentStateLabel,
                  fullInstanceId: workUnit.id,
                },
                workUnitType: {
                  workUnitTypeId: identity.workUnitTypeId,
                  workUnitTypeKey: identity.workUnitTypeKey,
                  workUnitTypeName: identity.workUnitTypeName,
                  cardinality: identity.cardinality,
                },
                currentState: {
                  stateId: identity.currentStateId,
                  stateKey: identity.currentStateKey,
                  stateLabel: identity.currentStateLabel,
                },
                ...(transitionDetail
                  ? {
                      activeTransition: toOptionalActiveTransition({
                        transitionExecutionId: transitionDetail.transitionExecution.id,
                        transitionId: transitionDetail.transitionExecution.transitionId,
                        workUnitCurrentStateId: workUnit.currentStateId,
                        lookups,
                        ...(transitionDetail.primaryWorkflowExecution
                          ? { primaryWorkflowExecution: transitionDetail.primaryWorkflowExecution }
                          : {}),
                      }),
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
        const lookups = yield* getLifecycleLookups(input.projectId);
        const identity = toWorkUnitIdentity(workUnit, lookups);

        const activeTransition = transitionDetail
          ? toOptionalActiveTransition({
              transitionExecutionId: transitionDetail.transitionExecution.id,
              transitionId: transitionDetail.transitionExecution.transitionId,
              workUnitCurrentStateId: workUnit.currentStateId,
              lookups,
              primaryWorkflowExecution: transitionDetail.primaryWorkflowExecution,
            })
          : undefined;

        return {
          workUnit: identity,
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
              currentStateKey: identity.currentStateKey,
              currentStateLabel: identity.currentStateLabel,
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
        const lookups = yield* getLifecycleLookups(input.projectId);

        const history = transitionHistory
          .filter((row) => isHistoricTransitionStatus(row.status))
          .map((row) => {
            const status: "completed" | "superseded" =
              row.status === "superseded" ? "superseded" : "completed";
            const transition = resolveTransitionIdentity(
              row.transitionId,
              overview.workUnit.currentStateId,
              lookups,
            );

            return {
              transitionExecutionId: row.id,
              transitionId: transition.transitionId,
              transitionKey: transition.transitionKey,
              transitionName: transition.transitionName,
              ...(status === "superseded" ? { fromStateId: transition.fromState.stateId } : {}),
              ...(status === "superseded" ? { fromStateKey: transition.fromState.stateKey } : {}),
              toStateId: transition.toState.stateId,
              toStateKey: transition.toState.stateKey,
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
