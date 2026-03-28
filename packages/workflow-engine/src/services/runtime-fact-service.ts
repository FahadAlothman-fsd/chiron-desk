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
import { Context, Effect, Layer } from "effect";

import type { RepositoryError } from "../errors";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

type RuntimeFactType = "string" | "number" | "boolean" | "json";
type RuntimeFactCardinality = "one" | "many";

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

    const getProjectFacts = (
      input: GetProjectFactsInput,
    ): Effect.Effect<GetProjectFactsOutput, RepositoryError> =>
      Effect.gen(function* () {
        const factRows = yield* projectFactRepository.listFactsByProject({
          projectId: input.projectId,
        });
        const grouped = new Map<string, typeof factRows>();
        for (const row of factRows) {
          const current = grouped.get(row.factDefinitionId) ?? [];
          grouped.set(row.factDefinitionId, [...current, row]);
        }

        const cards = [...grouped.entries()].map(([factDefinitionId, rows]) => {
          const values = rows.map((row) => row.valueJson);
          const factType = inferFactType(values[0]);
          const currentCount = rows.length;

          return {
            factDefinitionId,
            factKey: factDefinitionId,
            factName: factDefinitionId,
            factType,
            cardinality: inferCardinality(currentCount),
            exists: currentCount > 0,
            currentCount,
            currentValues: values,
            target: {
              page: "project-fact-detail" as const,
              factDefinitionId,
            },
            actions: {
              addInstance: {
                kind: "add_project_fact_instance" as const,
                factDefinitionId,
              },
            },
          };
        });

        return {
          project: {
            projectId: input.projectId,
            name: `Project ${input.projectId}`,
          },
          filters: normalizeProjectFilters(input.filters),
          cards,
        };
      });

    const getProjectFactDetail = (
      input: GetProjectFactDetailInput,
    ): Effect.Effect<GetProjectFactDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const values = yield* projectFactRepository.getCurrentValuesByDefinition({
          projectId: input.projectId,
          factDefinitionId: input.factDefinitionId,
        });

        const firstValue = values[0]?.valueJson;
        const factType = inferFactType(firstValue);

        return {
          project: {
            projectId: input.projectId,
            name: `Project ${input.projectId}`,
          },
          factDefinition: {
            factDefinitionId: input.factDefinitionId,
            factKey: input.factDefinitionId,
            factName: input.factDefinitionId,
            factType,
            cardinality: inferCardinality(values.length),
          },
          currentState: {
            exists: values.length > 0,
            currentCount: values.length,
            values: values.map((value) => ({
              projectFactInstanceId: value.id,
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
        const [workUnit, workUnitFacts, allProjectWorkUnits] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          workUnitFactRepository.listFactsByWorkUnit({
            projectWorkUnitId: input.projectWorkUnitId,
          }),
          projectWorkUnitRepository.listProjectWorkUnitsByProject(input.projectId),
        ]);

        const workUnitIdentity = {
          projectWorkUnitId: input.projectWorkUnitId,
          workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeKey: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeName: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          currentStateId: workUnit?.currentStateId ?? "unknown-state",
          currentStateKey: workUnit?.currentStateId ?? "unknown-state",
          currentStateLabel: workUnit?.currentStateId ?? "unknown-state",
        };

        const allFactsByDefinition = new Map<string, typeof workUnitFacts>();
        for (const fact of workUnitFacts) {
          const current = allFactsByDefinition.get(fact.factDefinitionId) ?? [];
          allFactsByDefinition.set(fact.factDefinitionId, [...current, fact]);
        }

        const workUnitById = new Map(allProjectWorkUnits.map((item) => [item.id, item] as const));
        const primitiveCards = [...allFactsByDefinition.entries()]
          .filter(([, values]) =>
            values.every((value) => value.referencedProjectWorkUnitId === null),
          )
          .map(([factDefinitionId, values]) => ({
            factDefinitionId,
            factKey: factDefinitionId,
            factName: factDefinitionId,
            factType: inferFactType(values[0]?.valueJson),
            cardinality: inferCardinality(values.length),
            exists: values.length > 0,
            currentCount: values.length,
            currentValues: values.map((value) => value.valueJson),
            target: {
              page: "work-unit-fact-detail" as const,
              factDefinitionId,
            },
          }));

        const outgoing = [...allFactsByDefinition.entries()]
          .filter(([, values]) =>
            values.some((value) => value.referencedProjectWorkUnitId !== null),
          )
          .map(([factDefinitionId, values]) => {
            const currentMembers = values
              .filter((value) => value.referencedProjectWorkUnitId !== null)
              .map((value) => {
                const counterpartId = value.referencedProjectWorkUnitId ?? "unknown-counterpart";
                const counterpart = workUnitById.get(counterpartId);
                const workUnitTypeId = counterpart?.workUnitTypeId ?? "unknown-work-unit-type";
                return {
                  workUnitFactInstanceId: value.id,
                  counterpartProjectWorkUnitId: counterpartId,
                  counterpartWorkUnitTypeId: workUnitTypeId,
                  counterpartWorkUnitTypeKey: workUnitTypeId,
                  counterpartWorkUnitTypeName: workUnitTypeId,
                  counterpartLabel: `${workUnitTypeId}:${counterpartId.slice(0, 8)}`,
                };
              });

            return {
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
            const sourceTypeId = candidate.candidateWorkUnit.workUnitTypeId;
            const bucket = incomingByDefinition.get(fact.factDefinitionId) ?? [];
            bucket.push({
              workUnitFactInstanceId: fact.id,
              counterpartProjectWorkUnitId: candidate.candidateWorkUnit.id,
              counterpartWorkUnitTypeId: sourceTypeId,
              counterpartWorkUnitTypeKey: sourceTypeId,
              counterpartWorkUnitTypeName: sourceTypeId,
              counterpartLabel: `${sourceTypeId}:${candidate.candidateWorkUnit.id.slice(0, 8)}`,
            });
            incomingByDefinition.set(fact.factDefinitionId, bucket);
          }
        }

        const incoming = [...incomingByDefinition.entries()].map(([factDefinitionId, members]) => ({
          factDefinitionId,
          factKey: factDefinitionId,
          factName: factDefinitionId,
          cardinality: inferCardinality(members.length),
          count: members.length,
          currentMembers: members,
          target: {
            page: "work-unit-fact-detail" as const,
            factDefinitionId,
          },
        }));

        return {
          workUnit: workUnitIdentity,
          activeTab: input.tab,
          filters: normalizeWorkUnitFilters(input.filters),
          ...(input.tab === "primitive"
            ? {
                primitive: {
                  cards: primitiveCards,
                },
              }
            : {
                workUnits: {
                  outgoing,
                  incoming,
                },
              }),
        };
      });

    const getWorkUnitFactDetail = (
      input: GetWorkUnitFactDetailInput,
    ): Effect.Effect<GetWorkUnitFactDetailOutput, RepositoryError> =>
      Effect.gen(function* () {
        const [workUnit, workUnitFacts] = yield* Effect.all([
          projectWorkUnitRepository.getProjectWorkUnitById(input.projectWorkUnitId),
          workUnitFactRepository.getCurrentValuesByDefinition({
            projectWorkUnitId: input.projectWorkUnitId,
            factDefinitionId: input.factDefinitionId,
          }),
        ]);

        const workUnitHeader = {
          projectWorkUnitId: input.projectWorkUnitId,
          workUnitTypeId: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeKey: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
          workUnitTypeName: workUnit?.workUnitTypeId ?? "unknown-work-unit-type",
        };

        const dependencyMembers = workUnitFacts.filter(
          (fact) => fact.referencedProjectWorkUnitId !== null,
        );

        return {
          workUnit: workUnitHeader,
          factDefinition: {
            factDefinitionId: input.factDefinitionId,
            factKey: input.factDefinitionId,
            factName: input.factDefinitionId,
            factType:
              dependencyMembers.length > 0
                ? "work_unit"
                : inferFactType(workUnitFacts[0]?.valueJson),
            cardinality: inferCardinality(workUnitFacts.length),
          },
          ...(dependencyMembers.length > 0
            ? {
                dependencyState: {
                  outgoing: dependencyMembers.map((fact) => ({
                    workUnitFactInstanceId: fact.id,
                    counterpartProjectWorkUnitId:
                      fact.referencedProjectWorkUnitId ?? "unknown-counterpart",
                    counterpartWorkUnitTypeId: "unknown-work-unit-type",
                    counterpartWorkUnitTypeKey: "unknown-work-unit-type",
                    counterpartWorkUnitTypeName: "unknown-work-unit-type",
                    counterpartLabel: fact.referencedProjectWorkUnitId ?? "unknown-counterpart",
                    createdAt: fact.createdAt.toISOString(),
                  })),
                  incoming: [],
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
