import { LifecycleRepository, MethodologyRepository } from "@chiron/methodology-engine";
import { ProjectContextRepository } from "@chiron/project-context";
import { Context, Effect, Layer } from "effect";

import { RepositoryError } from "../errors";
import { ExecutionReadRepository } from "../repositories/execution-read-repository";
import { ProjectFactRepository } from "../repositories/project-fact-repository";
import { StepExecutionRepository } from "../repositories/step-execution-repository";
import { WorkUnitFactRepository } from "../repositories/work-unit-fact-repository";

const makePrefillError = (cause: string): RepositoryError =>
  new RepositoryError({
    operation: "workflow-context-external-prefill",
    cause: new Error(cause),
  });

const runtimeFactValueFromInstance = (params: {
  valueJson: unknown;
  referencedProjectWorkUnitId?: string | null;
}): unknown => {
  if (typeof params.referencedProjectWorkUnitId === "string") {
    return { projectWorkUnitId: params.referencedProjectWorkUnitId };
  }

  return params.valueJson;
};

export class WorkflowContextExternalPrefillService extends Context.Tag(
  "@chiron/workflow-engine/services/WorkflowContextExternalPrefillService",
)<
  WorkflowContextExternalPrefillService,
  {
    readonly prefillFromExternalBindings: (params: {
      projectId: string;
      workflowExecutionId: string;
    }) => Effect.Effect<{ insertedCount: number }, RepositoryError>;
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
            (fact.kind !== "definition_backed_external_fact" &&
              fact.kind !== "bound_external_fact") ||
            typeof fact.contextFactDefinitionId !== "string" ||
            fact.cardinality !== "one" ||
            existingContextFactIds.has(fact.contextFactDefinitionId)
          ) {
            return [];
          }

          return [
            {
              contextFactDefinitionId: fact.contextFactDefinitionId,
              externalFactDefinitionId: fact.externalFactDefinitionId,
            },
          ];
        });

        if (externalContextFacts.length === 0) {
          yield* Effect.logWarning("prefill skipped: no eligible external context facts").pipe(
            Effect.annotateLogs({
              ...baseLogContext,
              totalWorkflowContextFacts: workflowEditor.contextFacts.length,
            }),
          );
          return { insertedCount: 0 };
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

        const [factSchemas, factDefinitions, projectFactInstances, workUnitFactInstances] =
          yield* Effect.all([
            lifecycleRepo.findFactSchemas(projectPin.methodologyVersionId),
            methodologyRepo.findFactDefinitionsByVersionId(projectPin.methodologyVersionId),
            projectFactRepo.listFactsByProject({ projectId: params.projectId }),
            workUnitFactRepo.listFactsByWorkUnit({
              projectWorkUnitId: workflowDetail.projectWorkUnitId,
            }),
          ]);

        yield* Effect.logInfo("loaded external fact sources for prefill").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            factSchemasCount: factSchemas.length,
            projectFactDefinitionsCount: factDefinitions.length,
            projectFactInstancesCount: projectFactInstances.length,
            workUnitFactInstancesCount: workUnitFactInstances.length,
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

        const currentValues = externalContextFacts.flatMap((contextFact) => {
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
            const workUnitInstance = workUnitFactInstances.find(
              (instance) => instance.factDefinitionId === workUnitFactSchema.id,
            );
            if (!workUnitInstance) {
              return [];
            }

            return [
              {
                contextFactDefinitionId: contextFact.contextFactDefinitionId,
                instanceOrder: 0,
                valueJson: {
                  factInstanceId: workUnitInstance.id,
                  value: runtimeFactValueFromInstance({
                    valueJson: workUnitInstance.valueJson,
                    referencedProjectWorkUnitId: workUnitInstance.referencedProjectWorkUnitId,
                  }),
                },
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
              valueJson: {
                factInstanceId: projectFactInstance.id,
                value: projectFactInstance.valueJson,
              },
            },
          ];
        });

        const matchedContextFactIds = new Set(
          currentValues.map((value) => value.contextFactDefinitionId),
        );
        const unmatchedContextFactIds = externalContextFacts
          .map((fact) => fact.contextFactDefinitionId)
          .filter((contextFactDefinitionId) => !matchedContextFactIds.has(contextFactDefinitionId));

        yield* Effect.logInfo("prefill matching completed").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            matchedCount: currentValues.length,
            matchedContextFactDefinitions: [...matchedContextFactIds].join(","),
            unmatchedCount: unmatchedContextFactIds.length,
            unmatchedContextFactDefinitions: unmatchedContextFactIds.join(","),
          }),
        );

        if (currentValues.length === 0) {
          yield* Effect.logWarning(
            "prefill skipped: no resolvable external fact instance values",
          ).pipe(Effect.annotateLogs(baseLogContext));
          return { insertedCount: 0 };
        }

        yield* stepRepo.replaceWorkflowExecutionContextFacts({
          workflowExecutionId: params.workflowExecutionId,
          sourceStepExecutionId: null,
          affectedContextFactDefinitionIds: currentValues.map(
            (entry) => entry.contextFactDefinitionId,
          ),
          currentValues,
        });

        yield* Effect.logInfo("prefill inserted workflow context fact instances").pipe(
          Effect.annotateLogs({
            ...baseLogContext,
            insertedCount: currentValues.length,
          }),
        );

        return { insertedCount: currentValues.length };
      });

    return WorkflowContextExternalPrefillService.of({
      prefillFromExternalBindings,
    });
  }),
);
