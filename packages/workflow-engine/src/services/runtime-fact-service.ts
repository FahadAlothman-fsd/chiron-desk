import type { MethodologyFactDefinitionInput } from "@chiron/contracts/methodology/fact";
import type { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";
import type {
  GetProjectFactDetailInput,
  GetProjectFactDetailOutput,
  GetProjectFactsInput,
  GetProjectFactsOutput,
} from "@chiron/contracts/runtime/facts";
import type {
  GetWorkUnitFactDetailInput,
  GetWorkUnitFactDetailOutput,
  GetWorkUnitFactsInput,
  GetWorkUnitFactsOutput,
} from "@chiron/contracts/runtime/work-units";
import { MethodologyVersionBoundaryService } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

type RuntimeFactType = "string" | "number" | "boolean" | "json";
type RuntimeFactCardinality = "one" | "many";

type WorkspaceSnapshot = {
  readonly factDefinitions: readonly MethodologyFactDefinitionInput[];
  readonly workUnitTypes: readonly WorkUnitTypeDefinition[];
} | null;

type RuntimeProjectFactDefinition = {
  readonly factDefinitionId: string;
  readonly factKey: string;
  readonly factName?: string;
  readonly factType: RuntimeFactType;
  readonly cardinality: RuntimeFactCardinality;
  readonly description?: unknown;
  readonly guidance?: unknown;
  readonly validation?: unknown;
};

type RuntimeWorkUnitFactDefinition = {
  readonly kind: "plain_fact" | "work_unit_reference_fact";
  readonly factDefinitionId: string;
  readonly factKey: string;
  readonly factName?: string;
  readonly factType: RuntimeFactType | "work_unit";
  readonly cardinality: RuntimeFactCardinality;
  readonly description?: unknown;
  readonly guidance?: unknown;
  readonly validation?: unknown;
};

const inferFactType = (value: unknown): RuntimeFactType => {
  if (typeof value === "string") {
    return "string";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  return "json";
};

const inferCardinality = (count: number): RuntimeFactCardinality => (count > 1 ? "many" : "one");

const normalizeProjectFilters = (
  filters: GetProjectFactsInput["filters"],
): GetProjectFactsOutput["filters"] => ({
  ...(filters?.existence !== undefined ? { existence: filters.existence } : {}),
  ...(filters?.factTypes !== undefined ? { factTypes: filters.factTypes } : {}),
});

const normalizeWorkUnitFilters = (
  filters: GetWorkUnitFactsInput["filters"],
): GetWorkUnitFactsOutput["filters"] => ({
  ...(filters?.existence !== undefined ? { existence: filters.existence } : {}),
  ...(filters?.primitiveFactTypes !== undefined
    ? { primitiveFactTypes: filters.primitiveFactTypes }
    : {}),
});

const toPrimitiveFactType = (value: unknown): RuntimeFactType | null => {
  if (value === "string" || value === "number" || value === "boolean" || value === "json") {
    return value;
  }

  return null;
};

const toCardinality = (value: unknown): RuntimeFactCardinality =>
  value === "many" ? "many" : "one";

const toProjectFactDefinitions = (
  workspaceSnapshot: WorkspaceSnapshot,
): readonly RuntimeProjectFactDefinition[] => {
  if (!workspaceSnapshot) {
    return [];
  }

  return workspaceSnapshot.factDefinitions.flatMap((definition) => {
    const factType = toPrimitiveFactType(definition.type ?? definition.factType);
    const factDefinitionId = definition.id ?? definition.key;
    if (!factType || definition.kind === "work_unit_reference_fact") {
      return [];
    }

    return [
      {
        factDefinitionId,
        factKey: definition.key,
        ...(definition.name ? { factName: definition.name } : {}),
        factType,
        cardinality: toCardinality(definition.cardinality),
        ...(definition.description !== undefined ? { description: definition.description } : {}),
        ...(definition.guidance !== undefined ? { guidance: definition.guidance } : {}),
        ...(definition.validation !== undefined ? { validation: definition.validation } : {}),
      },
    ];
  });
};

const findWorkUnitTypeDefinition = (
  workspaceSnapshot: WorkspaceSnapshot,
  workUnitTypeId: string | undefined,
): WorkUnitTypeDefinition | null => {
  if (!workspaceSnapshot || !workUnitTypeId) {
    return null;
  }

  return (
    workspaceSnapshot.workUnitTypes.find(
      (workUnitType) => workUnitType.id === workUnitTypeId || workUnitType.key === workUnitTypeId,
    ) ?? null
  );
};

const toWorkUnitFactDefinitions = (
  workUnitTypeDefinition: WorkUnitTypeDefinition | null,
): {
  readonly primitive: readonly RuntimeWorkUnitFactDefinition[];
  readonly dependencies: readonly RuntimeWorkUnitFactDefinition[];
} => {
  if (!workUnitTypeDefinition) {
    return { primitive: [], dependencies: [] };
  }

  const primitive: RuntimeWorkUnitFactDefinition[] = [];
  const dependencies: RuntimeWorkUnitFactDefinition[] = [];

  for (const factSchema of workUnitTypeDefinition.factSchemas) {
    const factDefinitionId = factSchema.id ?? factSchema.key;
    const base = {
      factDefinitionId,
      factKey: factSchema.key,
      ...(factSchema.name ? { factName: factSchema.name } : {}),
      cardinality: toCardinality(factSchema.cardinality),
      ...(factSchema.description !== undefined ? { description: factSchema.description } : {}),
      ...(factSchema.guidance !== undefined ? { guidance: factSchema.guidance } : {}),
      ...(factSchema.validation !== undefined ? { validation: factSchema.validation } : {}),
    } as const;

    if (factSchema.kind === "work_unit_reference_fact" || factSchema.factType === "work_unit") {
      dependencies.push({
        kind: "work_unit_reference_fact",
        ...base,
        factType: "work_unit",
      });
      continue;
    }

    const factType = toPrimitiveFactType(factSchema.type ?? factSchema.factType);
    if (!factType) {
      continue;
    }

    primitive.push({
      kind: "plain_fact",
      ...base,
      factType,
    });
  }

  return { primitive, dependencies };
};

const describeWorkUnit = (workUnit: {
  readonly id: string;
  readonly workUnitKey?: string;
  readonly displayName?: string | null;
}) => workUnit.displayName ?? workUnit.workUnitKey ?? workUnit.id;

export class RuntimeFactService extends Context.Tag("RuntimeFactService")<
  RuntimeFactService,
  {
    readonly getProjectFacts: (
      input: GetProjectFactsInput,
    ) => Effect.Effect<GetProjectFactsOutput, RepositoryError>;
    readonly getProjectFactDetail: (
      input: GetProjectFactDetailInput,
    ) => Effect.Effect<GetProjectFactDetailOutput, RepositoryError>;
    readonly getWorkUnitFacts: (
      input: GetWorkUnitFactsInput,
    ) => Effect.Effect<GetWorkUnitFactsOutput, RepositoryError>;
    readonly getWorkUnitFactDetail: (
      input: GetWorkUnitFactDetailInput,
    ) => Effect.Effect<GetWorkUnitFactDetailOutput, RepositoryError>;
  }
>() {}

export const RuntimeFactServiceLive = Layer.effect(
  RuntimeFactService,
  Effect.gen(function* () {
    const projectFactRepository = yield* ProjectFactRepository;
    const projectWorkUnitRepository = yield* ProjectWorkUnitRepository;
    const workUnitFactRepository = yield* WorkUnitFactRepository;
    const projectContextRepository = yield* ProjectContextRepository;
    const methodologyVersionService = yield* MethodologyVersionBoundaryService;

    const getPinnedWorkspaceSnapshot = (
      projectId: string,
    ): Effect.Effect<WorkspaceSnapshot, RepositoryError> =>
      Effect.gen(function* () {
        const pin = yield* projectContextRepository.findProjectPin(projectId);
        if (!pin) {
          return null;
        }

        return yield* methodologyVersionService
          .getVersionWorkspaceSnapshot(pin.methodologyVersionId)
          .pipe(Effect.catchAll(() => Effect.succeed(null)));
      });

    const getProjectFacts = (
      input: GetProjectFactsInput,
    ): Effect.Effect<GetProjectFactsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workspaceSnapshot, factRows] = yield* Effect.all([
          getPinnedWorkspaceSnapshot(input.projectId),
          projectFactRepository.listFactsByProject({ projectId: input.projectId }),
        ]);

        const grouped = new Map<string, typeof factRows>();
        for (const row of factRows) {
          const current = grouped.get(row.factDefinitionId) ?? [];
          grouped.set(row.factDefinitionId, [...current, row]);
        }

        const definitions = toProjectFactDefinitions(workspaceSnapshot);
        const cards: GetProjectFactsOutput["cards"] = definitions.map((definition) => {
          const rows = grouped.get(definition.factDefinitionId) ?? [];
          const currentValues = rows.map((row) => ({ instanceId: row.id, value: row.valueJson }));

          return {
            factDefinitionId: definition.factDefinitionId,
            factKey: definition.factKey,
            ...(definition.factName ? { factName: definition.factName } : {}),
            factType: definition.factType,
            cardinality: definition.cardinality,
            ...(definition.validation !== undefined ? { validation: definition.validation } : {}),
            exists: currentValues.length > 0,
            currentCount: currentValues.length,
            currentValues,
            target: {
              page: "project-fact-detail",
              factDefinitionId: definition.factDefinitionId,
            },
            actions: {
              addInstance: {
                kind: "add_project_fact_instance",
                factDefinitionId: definition.factDefinitionId,
              },
            },
          };
        });

        const knownDefinitionIds = new Set(
          definitions.map((definition) => definition.factDefinitionId),
        );
        const orphanCards: GetProjectFactsOutput["cards"] = [...grouped.entries()]
          .filter(([factDefinitionId]) => !knownDefinitionIds.has(factDefinitionId))
          .map(([factDefinitionId, rows]) => {
            const currentValues = rows.map((row) => ({ instanceId: row.id, value: row.valueJson }));
            const factType = inferFactType(currentValues[0]?.value);

            return {
              factDefinitionId,
              factKey: factDefinitionId,
              factName: factDefinitionId,
              factType,
              cardinality: inferCardinality(currentValues.length),
              exists: currentValues.length > 0,
              currentCount: currentValues.length,
              currentValues,
              target: {
                page: "project-fact-detail",
                factDefinitionId,
              },
              actions: {
                addInstance: {
                  kind: "add_project_fact_instance",
                  factDefinitionId,
                },
              },
            };
          });

        const filteredCards = [...cards, ...orphanCards].filter((card) => {
          if (input.filters?.existence === "exists" && !card.exists) {
            return false;
          }
          if (input.filters?.existence === "not_exists" && card.exists) {
            return false;
          }
          if (input.filters?.factTypes && !input.filters.factTypes.includes(card.factType)) {
            return false;
          }

          return true;
        });

        return {
          project: {
            projectId: input.projectId,
            name: `Project ${input.projectId}`,
          },
          filters: normalizeProjectFilters(input.filters),
          cards: filteredCards,
        };
      });

    const getProjectFactDetail = (
      input: GetProjectFactDetailInput,
    ): Effect.Effect<GetProjectFactDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workspaceSnapshot, values] = yield* Effect.all([
          getPinnedWorkspaceSnapshot(input.projectId),
          projectFactRepository.getCurrentValuesByDefinition({
            projectId: input.projectId,
            factDefinitionId: input.factDefinitionId,
          }),
        ]);

        const definition = toProjectFactDefinitions(workspaceSnapshot).find(
          (entry) => entry.factDefinitionId === input.factDefinitionId,
        );
        const firstValue = values[0]?.valueJson;

        return {
          project: {
            projectId: input.projectId,
            name: `Project ${input.projectId}`,
          },
          factDefinition: {
            factDefinitionId: input.factDefinitionId,
            factKey: definition?.factKey ?? input.factDefinitionId,
            ...(definition?.factName ? { factName: definition.factName } : {}),
            factType: definition?.factType ?? inferFactType(firstValue),
            cardinality: definition?.cardinality ?? inferCardinality(values.length),
            ...(definition?.description !== undefined
              ? { description: definition.description }
              : {}),
            ...(definition?.guidance !== undefined ? { guidance: definition.guidance } : {}),
            ...(definition?.validation !== undefined ? { validation: definition.validation } : {}),
          },
          currentState: {
            exists: values.length > 0,
            currentCount: values.length,
            values: values.map((value) => ({
              instanceId: value.id,
              value: value.valueJson,
              createdAt: value.createdAt.toISOString(),
            })),
          },
          actions: {
            canAddInstance: true,
            canUpdateExisting: true,
            canRemoveExisting: false as const,
          },
        };
      });

    const getWorkUnitFacts = (
      input: GetWorkUnitFactsInput,
    ): Effect.Effect<GetWorkUnitFactsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workspaceSnapshot, workUnit, workUnitFacts, allProjectWorkUnits] = yield* Effect.all(
          [
            getPinnedWorkspaceSnapshot(input.projectId),
            projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
            workUnitFactRepository.listFactsByWorkUnit({
              projectWorkUnitId: input.projectWorkUnitId,
            }),
            projectWorkUnitRepository.listProjectWorkUnitsByProject(input.projectId),
          ],
        );

        const workUnitTypeDefinition = findWorkUnitTypeDefinition(
          workspaceSnapshot,
          workUnit?.workUnitTypeId,
        );
        const currentStateDefinition = workUnitTypeDefinition?.lifecycleStates.find(
          (state) => state.key === workUnit?.currentStateId,
        );
        const workUnitIdentity = {
          projectWorkUnitId: input.projectWorkUnitId,
          workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeKey:
            workUnitTypeDefinition?.key ?? workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeName:
            workUnitTypeDefinition?.displayName ??
            workUnitTypeDefinition?.key ??
            workUnit?.workUnitTypeId ??
            "unknown-work-unit-type",
          currentStateId: workUnit?.currentStateId ?? "unknown-state",
          currentStateKey:
            currentStateDefinition?.key ?? workUnit?.currentStateId ?? "unknown-state",
          currentStateLabel:
            currentStateDefinition?.displayName ?? workUnit?.currentStateId ?? "unknown-state",
        };

        const { primitive: primitiveDefinitions, dependencies: dependencyDefinitions } =
          toWorkUnitFactDefinitions(workUnitTypeDefinition);

        const allFactsByDefinition = new Map<string, typeof workUnitFacts>();
        for (const fact of workUnitFacts) {
          const current = allFactsByDefinition.get(fact.factDefinitionId) ?? [];
          allFactsByDefinition.set(fact.factDefinitionId, [...current, fact]);
        }

        const workUnitById = new Map(allProjectWorkUnits.map((item) => [item.id, item] as const));

        const primitiveCards: NonNullable<GetWorkUnitFactsOutput["primitive"]>["cards"] =
          primitiveDefinitions.map((definition) => {
            const values = (allFactsByDefinition.get(definition.factDefinitionId) ?? []).filter(
              (value) => value.referencedProjectWorkUnitId === null,
            );

            return {
              kind: "plain_fact" as const,
              factDefinitionId: definition.factDefinitionId,
              factKey: definition.factKey,
              ...(definition.factName ? { factName: definition.factName } : {}),
              type: definition.factType as RuntimeFactType,
              factType: definition.factType as RuntimeFactType,
              cardinality: definition.cardinality,
              ...(definition.validation !== undefined ? { validation: definition.validation } : {}),
              exists: values.length > 0,
              currentCount: values.length,
              currentValues: values.map((value) => ({
                instanceId: value.id,
                value: value.valueJson,
              })),
              target: {
                page: "work-unit-fact-detail" as const,
                factDefinitionId: definition.factDefinitionId,
              },
            };
          });

        const knownPrimitiveDefinitionIds = new Set(
          primitiveDefinitions.map((definition) => definition.factDefinitionId),
        );
        const orphanPrimitiveCards = [...allFactsByDefinition.entries()]
          .filter(
            ([factDefinitionId, values]) =>
              !knownPrimitiveDefinitionIds.has(factDefinitionId) &&
              values.every((value) => value.referencedProjectWorkUnitId === null),
          )
          .map(([factDefinitionId, values]) => ({
            kind: "plain_fact" as const,
            factDefinitionId,
            factKey: factDefinitionId,
            factName: factDefinitionId,
            type: inferFactType(values[0]?.valueJson),
            factType: inferFactType(values[0]?.valueJson),
            cardinality: inferCardinality(values.length),
            exists: values.length > 0,
            currentCount: values.length,
            currentValues: values.map((value) => ({
              instanceId: value.id,
              value: value.valueJson,
            })),
            target: {
              page: "work-unit-fact-detail" as const,
              factDefinitionId,
            },
          }));

        const filteredPrimitiveCards = [...primitiveCards, ...orphanPrimitiveCards].filter(
          (card) => {
            if (input.filters?.existence === "exists" && !card.exists) {
              return false;
            }
            if (input.filters?.existence === "not_exists" && card.exists) {
              return false;
            }
            if (
              input.filters?.primitiveFactTypes &&
              !input.filters.primitiveFactTypes.includes(card.factType)
            ) {
              return false;
            }

            return true;
          },
        );

        const outgoing = dependencyDefinitions.map((definition) => {
          const currentMembers = (allFactsByDefinition.get(definition.factDefinitionId) ?? [])
            .filter((value) => value.referencedProjectWorkUnitId !== null)
            .map((value) => {
              const counterpartId = value.referencedProjectWorkUnitId ?? "unknown-counterpart";
              const counterpart = workUnitById.get(counterpartId);
              return {
                workUnitFactInstanceId: value.id,
                counterpartProjectWorkUnitId: counterpartId,
                counterpartWorkUnitTypeId: counterpart?.workUnitTypeId ?? "unknown-work-unit-type",
                counterpartWorkUnitTypeKey: counterpart?.workUnitKey ?? "unknown-work-unit-type",
                counterpartWorkUnitTypeName:
                  counterpart?.displayName ?? counterpart?.workUnitKey ?? counterpartId,
                counterpartLabel: counterpart ? describeWorkUnit(counterpart) : counterpartId,
              };
            });

          return {
            kind: "work_unit_reference_fact" as const,
            factDefinitionId: definition.factDefinitionId,
            factKey: definition.factKey,
            ...(definition.factName ? { factName: definition.factName } : {}),
            cardinality: definition.cardinality,
            count: currentMembers.length,
            currentMembers,
            target: {
              page: "work-unit-fact-detail" as const,
              factDefinitionId: definition.factDefinitionId,
            },
          };
        });

        const knownDependencyDefinitionIds = new Set(
          dependencyDefinitions.map((definition) => definition.factDefinitionId),
        );
        const orphanOutgoing = [...allFactsByDefinition.entries()]
          .filter(
            ([factDefinitionId, values]) =>
              !knownDependencyDefinitionIds.has(factDefinitionId) &&
              values.some((value) => value.referencedProjectWorkUnitId !== null),
          )
          .map(([factDefinitionId, values]) => {
            const currentMembers = values
              .filter((value) => value.referencedProjectWorkUnitId !== null)
              .map((value) => {
                const counterpartId = value.referencedProjectWorkUnitId ?? "unknown-counterpart";
                const counterpart = workUnitById.get(counterpartId);
                return {
                  workUnitFactInstanceId: value.id,
                  counterpartProjectWorkUnitId: counterpartId,
                  counterpartWorkUnitTypeId:
                    counterpart?.workUnitTypeId ?? "unknown-work-unit-type",
                  counterpartWorkUnitTypeKey: counterpart?.workUnitKey ?? "unknown-work-unit-type",
                  counterpartWorkUnitTypeName:
                    counterpart?.displayName ?? counterpart?.workUnitKey ?? counterpartId,
                  counterpartLabel: counterpart ? describeWorkUnit(counterpart) : counterpartId,
                };
              });

            return {
              kind: "work_unit_reference_fact" as const,
              factDefinitionId,
              factKey: factDefinitionId,
              factName: factDefinitionId,
              cardinality: inferCardinality(currentMembers.length),
              count: currentMembers.length,
              currentMembers,
              target: {
                page: "work-unit-fact-detail" as const,
                factDefinitionId,
              },
            };
          });

        const incomingCandidates = yield* Effect.forEach(
          allProjectWorkUnits,
          (candidateWorkUnit) =>
            workUnitFactRepository
              .listFactsByWorkUnit({ projectWorkUnitId: candidateWorkUnit.id })
              .pipe(Effect.map((facts) => ({ candidateWorkUnit, facts }))),
          { concurrency: 6 },
        );

        const incomingByDefinition = new Map<
          string,
          Array<{
            workUnitFactInstanceId: string;
            counterpartProjectWorkUnitId: string;
            counterpartWorkUnitTypeId: string;
            counterpartWorkUnitTypeKey: string;
            counterpartWorkUnitTypeName: string;
            counterpartLabel: string;
          }>
        >();

        for (const candidate of incomingCandidates) {
          for (const fact of candidate.facts) {
            if (fact.referencedProjectWorkUnitId !== input.projectWorkUnitId) {
              continue;
            }

            const bucket = incomingByDefinition.get(fact.factDefinitionId) ?? [];
            bucket.push({
              workUnitFactInstanceId: fact.id,
              counterpartProjectWorkUnitId: candidate.candidateWorkUnit.id,
              counterpartWorkUnitTypeId: candidate.candidateWorkUnit.workUnitTypeId,
              counterpartWorkUnitTypeKey:
                candidate.candidateWorkUnit.workUnitKey ??
                candidate.candidateWorkUnit.workUnitTypeId,
              counterpartWorkUnitTypeName: describeWorkUnit(candidate.candidateWorkUnit),
              counterpartLabel: describeWorkUnit(candidate.candidateWorkUnit),
            });
            incomingByDefinition.set(fact.factDefinitionId, bucket);
          }
        }

        const incoming = [...incomingByDefinition.entries()].map(([factDefinitionId, members]) => {
          const definition = dependencyDefinitions.find(
            (entry) => entry.factDefinitionId === factDefinitionId,
          );

          return {
            kind: "work_unit_reference_fact" as const,
            factDefinitionId,
            factKey: definition?.factKey ?? factDefinitionId,
            ...(definition?.factName
              ? { factName: definition.factName }
              : { factName: factDefinitionId }),
            cardinality: definition?.cardinality ?? inferCardinality(members.length),
            count: members.length,
            currentMembers: members,
            target: {
              page: "work-unit-fact-detail" as const,
              factDefinitionId,
            },
          };
        });

        return {
          workUnit: workUnitIdentity,
          activeTab: input.tab,
          filters: normalizeWorkUnitFilters(input.filters),
          ...(input.tab === "primitive"
            ? {
                primitive: {
                  cards: filteredPrimitiveCards,
                },
              }
            : {
                workUnits: {
                  outgoing: [...outgoing, ...orphanOutgoing],
                  incoming,
                },
              }),
        };
      });

    const getWorkUnitFactDetail = (
      input: GetWorkUnitFactDetailInput,
    ): Effect.Effect<GetWorkUnitFactDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workspaceSnapshot, workUnit, workUnitFacts, allProjectWorkUnits] = yield* Effect.all(
          [
            getPinnedWorkspaceSnapshot(input.projectId),
            projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
            workUnitFactRepository.getCurrentValuesByDefinition({
              projectWorkUnitId: input.projectWorkUnitId,
              factDefinitionId: input.factDefinitionId,
            }),
            projectWorkUnitRepository.listProjectWorkUnitsByProject(input.projectId),
          ],
        );

        const workUnitTypeDefinition = findWorkUnitTypeDefinition(
          workspaceSnapshot,
          workUnit?.workUnitTypeId,
        );
        const { primitive: primitiveDefinitions, dependencies: dependencyDefinitions } =
          toWorkUnitFactDefinitions(workUnitTypeDefinition);
        const primitiveDefinition = primitiveDefinitions.find(
          (definition) => definition.factDefinitionId === input.factDefinitionId,
        );
        const dependencyDefinition = dependencyDefinitions.find(
          (definition) => definition.factDefinitionId === input.factDefinitionId,
        );
        const resolvedDefinition = primitiveDefinition ?? dependencyDefinition ?? null;
        const dependencyMembers = workUnitFacts.filter(
          (fact) => fact.referencedProjectWorkUnitId !== null,
        );
        const isDependency =
          (resolvedDefinition?.kind ?? null) === "work_unit_reference_fact" ||
          dependencyMembers.length > 0;
        const workUnitById = new Map(allProjectWorkUnits.map((item) => [item.id, item] as const));

        const incomingCandidates = isDependency
          ? yield* Effect.forEach(
              allProjectWorkUnits,
              (candidateWorkUnit) =>
                workUnitFactRepository
                  .listFactsByWorkUnit({ projectWorkUnitId: candidateWorkUnit.id })
                  .pipe(Effect.map((facts) => ({ candidateWorkUnit, facts }))),
              { concurrency: 6 },
            )
          : [];

        const incoming = incomingCandidates.flatMap((candidate) =>
          candidate.facts
            .filter(
              (fact) =>
                fact.factDefinitionId === input.factDefinitionId &&
                fact.referencedProjectWorkUnitId === input.projectWorkUnitId,
            )
            .map((fact) => ({
              workUnitFactInstanceId: fact.id,
              counterpartProjectWorkUnitId: candidate.candidateWorkUnit.id,
              counterpartWorkUnitTypeId: candidate.candidateWorkUnit.workUnitTypeId,
              counterpartWorkUnitTypeKey:
                candidate.candidateWorkUnit.workUnitKey ??
                candidate.candidateWorkUnit.workUnitTypeId,
              counterpartWorkUnitTypeName: describeWorkUnit(candidate.candidateWorkUnit),
              counterpartLabel: describeWorkUnit(candidate.candidateWorkUnit),
              createdAt: fact.createdAt.toISOString(),
            })),
        );

        return {
          workUnit: {
            projectWorkUnitId: input.projectWorkUnitId,
            workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
            workUnitTypeKey:
              workUnitTypeDefinition?.key ?? workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
            workUnitTypeName:
              workUnitTypeDefinition?.displayName ??
              workUnitTypeDefinition?.key ??
              workUnit?.workUnitTypeId ??
              "unknown-work-unit-type",
          },
          factDefinition: {
            kind: isDependency ? ("work_unit_reference_fact" as const) : ("plain_fact" as const),
            factDefinitionId: input.factDefinitionId,
            factKey: resolvedDefinition?.factKey ?? input.factDefinitionId,
            ...(resolvedDefinition?.factName
              ? { factName: resolvedDefinition.factName }
              : { factName: input.factDefinitionId }),
            ...(!isDependency
              ? {
                  type:
                    (resolvedDefinition?.factType as RuntimeFactType | undefined) ??
                    inferFactType(workUnitFacts[0]?.valueJson),
                }
              : {}),
            factType: isDependency
              ? "work_unit"
              : ((resolvedDefinition?.factType as RuntimeFactType | undefined) ??
                inferFactType(workUnitFacts[0]?.valueJson)),
            cardinality: resolvedDefinition?.cardinality ?? inferCardinality(workUnitFacts.length),
            ...(resolvedDefinition?.description !== undefined
              ? { description: resolvedDefinition.description }
              : {}),
            ...(resolvedDefinition?.guidance !== undefined
              ? { guidance: resolvedDefinition.guidance }
              : {}),
            ...(resolvedDefinition?.validation !== undefined
              ? { validation: resolvedDefinition.validation }
              : {}),
          },
          ...(isDependency
            ? {
                dependencyState: {
                  outgoing: dependencyMembers.map((fact) => {
                    const counterpartId = fact.referencedProjectWorkUnitId ?? "unknown-counterpart";
                    const counterpart = workUnitById.get(counterpartId);

                    return {
                      workUnitFactInstanceId: fact.id,
                      counterpartProjectWorkUnitId: counterpartId,
                      counterpartWorkUnitTypeId:
                        counterpart?.workUnitTypeId ?? "unknown-work-unit-type",
                      counterpartWorkUnitTypeKey:
                        counterpart?.workUnitKey ??
                        counterpart?.workUnitTypeId ??
                        "unknown-work-unit-type",
                      counterpartWorkUnitTypeName: counterpart
                        ? describeWorkUnit(counterpart)
                        : counterpartId,
                      counterpartLabel: counterpart ? describeWorkUnit(counterpart) : counterpartId,
                      createdAt: fact.createdAt.toISOString(),
                    };
                  }),
                  incoming,
                },
              }
            : {
                primitiveState: {
                  exists: workUnitFacts.length > 0,
                  currentCount: workUnitFacts.length,
                  values: workUnitFacts.map((fact) => ({
                    workUnitFactInstanceId: fact.id,
                    value: fact.valueJson,
                    createdAt: fact.createdAt.toISOString(),
                  })),
                },
              }),
          actions: {
            canAddInstance: true,
            canUpdateExisting: true,
            canRemoveExisting: false as const,
          },
        };
      });

    return RuntimeFactService.of({
      getProjectFacts,
      getProjectFactDetail,
      getWorkUnitFacts,
      getWorkUnitFactDetail,
    });
  }),
);
