import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import type { SingletonAutoAttachWarning } from "@chiron/contracts/runtime/executions";
import { Context, Effect, Layer, Option } from "effect";

import { RepositoryError } from "../errors";
import { ArtifactRepository } from "../repositories/artifact-repository";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { ProjectWorkUnitRepository } from "../repositories/project-work-unit-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";
import {
  resolveAutoAttachedProjectWorkUnit,
  runtimeFactValueFromInstance,
  toArtifactSlotReferenceValue,
} from "./runtime-auto-attach";
import { toCanonicalRuntimeBoundFactEnvelope } from "./runtime-bound-fact-value";

const makePrefillError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "workflow-context-external-prefill",
    cause: new Error(cause),
  });

export class WorkflowContextExternalPrefillService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowContextExternalPrefillService",
)<
  WorkflowContextExternalPrefillService,
  {
    readonly prefillFromExternalBindings: (params: {
      projectId: string;
      workflowExecutionId: string;
    }) => Effect.Effect<
      { insertedCount: number; warnings: readonly SingletonAutoAttachWarning[] },
      RepositoryError
    >;
  }
>() {}

export const WorkflowContextExternalPrefillServiceLive = Layer.effect(
  WorkflowContextExternalPrefillService,
  Effect.gen(function* () {
    const readRepo = yield* ExecutionReadRepository;
    const stepRepo = yield* StepExecutionRepository;
    const projectContextRepo = yield* ProjectContextRepository;
    const lifecycleRepo = yield* LifecycleRepository;
    const methodologyRepo = yield* MethodologyRepository;
    const projectFactRepo = yield* ProjectFactRepository;
    const workUnitFactRepo = yield* WorkUnitFactRepository;
    const artifactRepo = yield* Effect.serviceOption(ArtifactRepository);
    const projectWorkUnitRepo = yield* Effect.serviceOption(ProjectWorkUnitRepository);

    const prefillFromExternalBindings = (params: {
      projectId: string;
      workflowExecutionId: string;
    }) =>
      Effect.gen(function* () {
        const baseLogContext = {
          service: "workflow-context-external-prefill",
          projectId: params.projectId,
          workflowExecutionId: params.workflowExecutionId,
        } as const;

        yield* Effect.logInfo("prefill start").pipe(Effect.annotateLogs(baseLogContext));

        const workflowDetail = yield* readRepo.getWorkflowExecutionDetail(
          params.workflowExecutionId,
        );
        if (!workflowDetail || workflowDetail.projectId !== params.projectId) {
          return yield* makePrefillError("workflow execution does not belong to project");
        }

        yield* Effect.logInfo("workflow detail resolved for prefill").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            workUnitTypeId: workflowDetail.workUnitTypeId,
            projectWorkUnitId: workflowDetail.projectWorkUnitId,
            workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
          }),
        );

        const existingContextFacts = yield* stepRepo.listWorkflowExecutionContextFacts(
          params.workflowExecutionId,
        );
        const existingContextFactIds = new Set(
          existingContextFacts.map((row) => row.contextFactDefinitionId),
        );

        yield* Effect.logInfo("loaded existing workflow context fact instances").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            existingCount: existingContextFacts.length,
            existingContextFactDefinitionIds: [...existingContextFactIds].join(","),
          }),
        );

        const projectPin = yield* projectContextRepo.findProjectPin(params.projectId);
        if (!projectPin) {
          return yield* makePrefillError("project methodology pin missing");
        }

        const workUnitTypes = yield* lifecycleRepo.findWorkUnitTypes(
          projectPin.methodologyVersionId,
        );
        const workUnitType = workUnitTypes.find(
          (entry) => entry.id === workflowDetail.workUnitTypeId,
        );
        if (!workUnitType) {
          return yield* makePrefillError("workflow work-unit type missing");
        }

        const workflowEditor = yield* methodologyRepo.getWorkflowEditorDefinition({
          versionId: projectPin.methodologyVersionId,
          workUnitTypeKey: workUnitType.key,
          workflowDefinitionId: workflowDetail.workflowExecution.workflowId,
        });

        yield* Effect.logInfo("loaded workflow editor context facts").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            methodologyVersionId: projectPin.methodologyVersionId,
            workUnitTypeKey: workUnitType.key,
            workflowContextFactDefinitions: workflowEditor.contextFacts.length,
          }),
        );

        const externalContextFacts = workflowEditor.contextFacts.flatMap((fact) => {
          if (
            typeof fact.contextFactDefinitionId !== "string" ||
            fact.cardinality !== "one" ||
            existingContextFactIds.has(fact.contextFactDefinitionId)
          ) {
            return [];
          }

          switch (fact.kind) {
            case "bound_fact":
              return [
                {
                  kind: fact.kind,
                  contextFactDefinitionId: fact.contextFactDefinitionId,
                  externalFactDefinitionId: fact.factDefinitionId,
                  workUnitDefinitionId: fact.workUnitDefinitionId,
                } as const,
              ];
            case "artifact_slot_reference_fact":
              return [
                {
                  kind: fact.kind,
                  contextFactDefinitionId: fact.contextFactDefinitionId,
                  slotDefinitionId: fact.slotDefinitionId,
                } as const,
              ];
            case "work_unit_reference_fact":
              return [
                {
                  kind: fact.kind,
                  contextFactDefinitionId: fact.contextFactDefinitionId,
                  targetWorkUnitDefinitionId: fact.targetWorkUnitDefinitionId,
                } as const,
              ];
            default:
              return [];
          }
        });

        if (externalContextFacts.length === 0) {
          yield* Effect.logWarning("prefill skipped: no eligible external context facts").pipe(
            Effect.annotateLogs({
              ...baseLogContext,
              totalWorkflowContextFacts: workflowEditor.contextFacts.length,
            }),
          );
          return { insertedCount: 0, warnings: [] };
        }

        yield* Effect.logInfo("eligible external context facts resolved").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            eligibleContextFactDefinitions: externalContextFacts
              .map((fact) => fact.contextFactDefinitionId)
              .join(","),
            eligibleCount: externalContextFacts.length,
          }),
        );

        const [
          factSchemas,
          factDefinitions,
          projectFactInstances,
          workUnitFactInstances,
          projectWorkUnits,
        ] = yield* Effect.all([
          lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId),
          methodologyRepo.findFactDefinitionsByVersionId(projectPin.methodologyVersionId),
          projectFactRepo.listFactsByProject({ projectId: params.projectId }),
          workUnitFactRepo.listFactsByWorkUnit({
            projectWorkUnitId: workflowDetail.projectWorkUnitId,
          }),
          Option.isSome(projectWorkUnitRepo)
            ? projectWorkUnitRepo.value.listProjectWorkUnitsByProject(params.projectId)
            : Effect.succeed([]),
        ]);

        yield* Effect.logInfo("loaded external fact sources for prefill").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            factSchemasCount: factSchemas.length,
            projectFactDefinitionsCount: factDefinitions.length,
            projectFactInstancesCount: projectFactInstances.length,
            workUnitFactInstancesCount: workUnitFactInstances.length,
            projectWorkUnitsCount: projectWorkUnits.length,
          }),
        );

        const factSchemasOrdered = [...factSchemas].sort((left, right) => {
          const leftPriority = left.workUnitTypeId === workflowDetail.workUnitTypeId ? 0 : 1;
          const rightPriority = right.workUnitTypeId === workflowDetail.workUnitTypeId ? 0 : 1;
          return (
            leftPriority - rightPriority ||
            left.key.localeCompare(right.key) ||
            left.id.localeCompare(right.id)
          );
        });

        const factSchemasById = new Map<string, (typeof factSchemasOrdered)[number]>();
        const factSchemasByKey = new Map<string, (typeof factSchemasOrdered)[number]>();
        for (const schema of factSchemasOrdered) {
          if (!factSchemasById.has(schema.id)) {
            factSchemasById.set(schema.id, schema);
          }
          if (!factSchemasByKey.has(schema.key)) {
            factSchemasByKey.set(schema.key, schema);
          }
        }

        const factDefinitionsById = new Map<string, (typeof factDefinitions)[number]>();
        const factDefinitionsByKey = new Map<string, (typeof factDefinitions)[number]>();
        for (const definition of factDefinitions) {
          if (!factDefinitionsById.has(definition.id)) {
            factDefinitionsById.set(definition.id, definition);
          }
          if (!factDefinitionsByKey.has(definition.key)) {
            factDefinitionsByKey.set(definition.key, definition);
          }
        }

        const workUnitTypesById = new Map(workUnitTypes.map((entry) => [entry.id, entry] as const));
        const warnings: SingletonAutoAttachWarning[] = [];

        const boundFactTargetProjectWorkUnitIds = new Set(
          externalContextFacts.flatMap((contextFact) => {
            if (contextFact.kind !== "bound_fact" || !contextFact.workUnitDefinitionId) {
              return [];
            }

            if (contextFact.workUnitDefinitionId === workflowDetail.workUnitTypeId) {
              return [workflowDetail.projectWorkUnitId];
            }

            const resolution = resolveAutoAttachedProjectWorkUnit({
              targetWorkUnitDefinitionId: contextFact.workUnitDefinitionId,
              projectWorkUnits,
              workUnitTypes: [...workUnitTypesById.values()],
              excludedProjectWorkUnitIds: [workflowDetail.projectWorkUnitId],
              contextFactDefinitionId: contextFact.contextFactDefinitionId,
            });

            if (resolution.warning) {
              warnings.push(resolution.warning);
            }

            return resolution.projectWorkUnitId ? [resolution.projectWorkUnitId] : [];
          }),
        );

        const additionalWorkUnitFactInstances = new Map<string, typeof workUnitFactInstances>();
        for (const projectWorkUnitId of boundFactTargetProjectWorkUnitIds) {
          if (projectWorkUnitId === workflowDetail.projectWorkUnitId) {
            continue;
          }

          additionalWorkUnitFactInstances.set(
            projectWorkUnitId,
            yield* workUnitFactRepo.listFactsByWorkUnit({ projectWorkUnitId }),
          );
        }

        const currentValues = externalContextFacts.flatMap((contextFact) => {
          if (contextFact.kind === "artifact_slot_reference_fact") {
            return [];
          }

          if (contextFact.kind === "work_unit_reference_fact") {
            const resolution = resolveAutoAttachedProjectWorkUnit({
              targetWorkUnitDefinitionId: contextFact.targetWorkUnitDefinitionId,
              projectWorkUnits,
              workUnitTypes: [...workUnitTypesById.values()],
              excludedProjectWorkUnitIds: [workflowDetail.projectWorkUnitId],
              contextFactDefinitionId: contextFact.contextFactDefinitionId,
            });

            if (resolution.warning) {
              warnings.push(resolution.warning);
            }

            return resolution.projectWorkUnitId
              ? [
                  {
                    contextFactDefinitionId: contextFact.contextFactDefinitionId,
                    instanceOrder: 0,
                    valueJson: { projectWorkUnitId: resolution.projectWorkUnitId },
                  },
                ]
              : [];
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

          if (workUnitFactSchema && workUnitFactSchema.cardinality === "one") {
            const targetResolution = contextFact.workUnitDefinitionId
              ? contextFact.workUnitDefinitionId === workflowDetail.workUnitTypeId
                ? { projectWorkUnitId: workflowDetail.projectWorkUnitId, warning: null }
                : resolveAutoAttachedProjectWorkUnit({
                    targetWorkUnitDefinitionId: contextFact.workUnitDefinitionId,
                    projectWorkUnits,
                    workUnitTypes: [...workUnitTypesById.values()],
                    excludedProjectWorkUnitIds: [workflowDetail.projectWorkUnitId],
                    contextFactDefinitionId: contextFact.contextFactDefinitionId,
                  })
              : { projectWorkUnitId: workflowDetail.projectWorkUnitId, warning: null };

            if (targetResolution.warning) {
              warnings.push(targetResolution.warning);
            }

            const candidateFactInstances =
              targetResolution.projectWorkUnitId === workflowDetail.projectWorkUnitId
                ? workUnitFactInstances
                : targetResolution.projectWorkUnitId
                  ? (additionalWorkUnitFactInstances.get(targetResolution.projectWorkUnitId) ?? [])
                  : [];

            const workUnitInstance = candidateFactInstances.find(
              (instance) => instance.factDefinitionId === workUnitFactSchema.id,
            );
            if (!workUnitInstance) {
              return [];
            }

            return [
              {
                contextFactDefinitionId: contextFact.contextFactDefinitionId,
                instanceOrder: 0,
                valueJson: toCanonicalRuntimeBoundFactEnvelope({
                  instanceId: workUnitInstance.id,
                  value: runtimeFactValueFromInstance({
                    valueJson: workUnitInstance.valueJson,
                    referencedProjectWorkUnitId: workUnitInstance.referencedProjectWorkUnitId,
                  }),
                }),
              },
            ];
          }

          if (!projectFactDefinition || projectFactDefinition.cardinality !== "one") {
            return [];
          }

          const projectFactInstance = projectFactInstances.find(
            (instance) => instance.factDefinitionId === projectFactDefinition.id,
          );
          if (!projectFactInstance) {
            return [];
          }

          return [
            {
              contextFactDefinitionId: contextFact.contextFactDefinitionId,
              instanceOrder: 0,
              valueJson: toCanonicalRuntimeBoundFactEnvelope({
                instanceId: projectFactInstance.id,
                value: projectFactInstance.valueJson,
              }),
            },
          ];
        });

        const artifactValues = yield* Effect.forEach(
          externalContextFacts.filter(
            (
              contextFact,
            ): contextFact is Extract<
              (typeof externalContextFacts)[number],
              { kind: "artifact_slot_reference_fact" }
            > => contextFact.kind === "artifact_slot_reference_fact",
          ),
          (contextFact) =>
            Effect.gen(function* () {
              if (Option.isNone(artifactRepo)) {
                return [] as const;
              }

              const currentArtifactState = yield* artifactRepo.value.getCurrentSnapshotBySlot({
                projectWorkUnitId: workflowDetail.projectWorkUnitId,
                slotDefinitionId: contextFact.slotDefinitionId,
              });

              const valueJson = toArtifactSlotReferenceValue(
                contextFact.slotDefinitionId,
                currentArtifactState,
              );
              if (!valueJson) {
                return [] as const;
              }

              return [
                {
                  contextFactDefinitionId: contextFact.contextFactDefinitionId,
                  instanceOrder: 0,
                  valueJson,
                },
              ] as const;
            }),
        ).pipe(Effect.map((entries) => entries.flat()));

        const resolvedCurrentValues = [...currentValues, ...artifactValues];

        const matchedContextFactIds = new Set(
          resolvedCurrentValues.map((value) => value.contextFactDefinitionId),
        );
        const unmatchedContextFactIds = externalContextFacts
          .map((fact) => fact.contextFactDefinitionId)
          .filter((contextFactDefinitionId) => !matchedContextFactIds.has(contextFactDefinitionId));

        yield* Effect.logInfo("prefill matching completed").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            matchedCount: resolvedCurrentValues.length,
            matchedContextFactDefinitions: [...matchedContextFactIds].join(","),
            unmatchedCount: unmatchedContextFactIds.length,
            unmatchedContextFactDefinitions: unmatchedContextFactIds.join(","),
          }),
        );

        if (resolvedCurrentValues.length === 0) {
          yield* Effect.logWarning(
            "prefill skipped: no resolvable external fact instance values",
          ).pipe(Effect.annotateLogs(baseLogContext));
          return { insertedCount: 0, warnings };
        }

        yield* stepRepo.replaceWorkflowExecutionContextFacts({
          workflowExecutionId: params.workflowExecutionId,
          sourceStepExecutionId: null,
          affectedContextFactDefinitionIds: resolvedCurrentValues.map(
            (entry) => entry.contextFactDefinitionId,
          ),
          currentValues: resolvedCurrentValues,
        });

        yield* Effect.logInfo("prefill inserted workflow context fact instances").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            insertedCount: resolvedCurrentValues.length,
          }),
        );

        return { insertedCount: resolvedCurrentValues.length, warnings };
      });

    return WorkflowContextExternalPrefillService.of({
      prefillFromExternalBindings,
    });
  }),
);
