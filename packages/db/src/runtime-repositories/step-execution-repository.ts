import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  StepExecutionRepository,
  type CreateRuntimeStepExecutionParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowContextFactDefinitionRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type ReplaceRuntimeWorkflowExecutionContextFactsParams,
  type UpsertRuntimeFormStepExecutionStateParams,
} from "@chiron/workflow-engine";
import {
  formStepExecutionState,
  stepExecutions,
  workflowExecutionContextFacts,
} from "../schema/runtime";
import {
  methodologyWorkflows,
  methodologyWorkflowContextFactDefinitions,
  methodologyWorkflowEdges,
  methodologyWorkflowSteps,
} from "../schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

function dbEffect<T>(
  operation: string,
  execute: () => Promise<T>,
): Effect.Effect<T, RepositoryError> {
  return Effect.tryPromise({
    try: execute,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toStepExecutionRow(row: typeof stepExecutions.$inferSelect): RuntimeStepExecutionRow {
  return {
    id: row.id,
    workflowExecutionId: row.workflowExecutionId,
    stepDefinitionId: row.stepDefinitionId,
    stepType: row.stepType,
    status: row.status as RuntimeStepExecutionRow["status"],
    activatedAt: row.activatedAt,
    completedAt: row.completedAt,
    previousStepExecutionId: row.previousStepExecutionId,
  };
}

function toFormStateRow(
  row: typeof formStepExecutionState.$inferSelect,
): RuntimeFormStepExecutionStateRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    draftPayloadJson: row.draftPayloadJson,
    submittedPayloadJson: row.submittedPayloadJson,
    lastDraftSavedAt: row.lastDraftSavedAt,
    submittedAt: row.submittedAt,
  };
}

function toContextFactRow(
  row: typeof workflowExecutionContextFacts.$inferSelect,
): RuntimeWorkflowExecutionContextFactRow {
  return {
    id: row.id,
    workflowExecutionId: row.workflowExecutionId,
    contextFactDefinitionId: row.contextFactDefinitionId,
    instanceId: row.instanceId,
    instanceOrder: row.instanceOrder,
    valueJson: row.valueJson,
    sourceStepExecutionId: row.sourceStepExecutionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toContextFactDefinitionRow(
  row: typeof methodologyWorkflowContextFactDefinitions.$inferSelect,
): RuntimeWorkflowContextFactDefinitionRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    factKey: row.factKey,
    label: row.label,
    descriptionJson: row.descriptionJson,
    factKind: row.factKind,
    cardinality: row.cardinality,
    createdAt: row.createdAt,
  };
}

function toWorkflowStepDefinitionRow(
  row: typeof methodologyWorkflowSteps.$inferSelect,
): RuntimeWorkflowStepDefinitionRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    key: row.key,
    type: row.type,
    createdAt: row.createdAt,
  };
}

function toWorkflowEdgeRow(
  row: typeof methodologyWorkflowEdges.$inferSelect,
): RuntimeWorkflowEdgeRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    fromStepId: row.fromStepId,
    toStepId: row.toStepId,
    createdAt: row.createdAt,
  };
}

export function createStepExecutionRepoLayer(db: DB): Layer.Layer<StepExecutionRepository> {
  return Layer.succeed(StepExecutionRepository, {
    createStepExecution: (params: CreateRuntimeStepExecutionParams) =>
      dbEffect("step-execution.create", async () => {
        const rows = await db
          .insert(stepExecutions)
          .values({
            workflowExecutionId: params.workflowExecutionId,
            stepDefinitionId: params.stepDefinitionId,
            stepType: params.stepType,
            status: params.status,
            previousStepExecutionId: params.previousStepExecutionId,
          })
          .returning();
        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create step execution");
        }
        return toStepExecutionRow(row);
      }),

    getStepExecutionById: (stepExecutionId: string) =>
      dbEffect("step-execution.get", async () => {
        const rows = await db
          .select()
          .from(stepExecutions)
          .where(eq(stepExecutions.id, stepExecutionId))
          .limit(1);
        return rows[0] ? toStepExecutionRow(rows[0]) : null;
      }),

    findStepExecutionByWorkflowAndDefinition: ({ workflowExecutionId, stepDefinitionId }) =>
      dbEffect("step-execution.findByWorkflowAndDefinition", async () => {
        const rows = await db
          .select()
          .from(stepExecutions)
          .where(
            and(
              eq(stepExecutions.workflowExecutionId, workflowExecutionId),
              eq(stepExecutions.stepDefinitionId, stepDefinitionId),
            ),
          )
          .orderBy(desc(stepExecutions.activatedAt), desc(stepExecutions.id))
          .limit(1);
        return rows[0] ? toStepExecutionRow(rows[0]) : null;
      }),

    listStepExecutionsForWorkflow: (workflowExecutionId: string) =>
      dbEffect("step-execution.listByWorkflow", async () => {
        const rows = await db
          .select()
          .from(stepExecutions)
          .where(eq(stepExecutions.workflowExecutionId, workflowExecutionId))
          .orderBy(asc(stepExecutions.activatedAt), asc(stepExecutions.id));
        return rows.map(toStepExecutionRow);
      }),

    completeStepExecution: ({ stepExecutionId }) =>
      dbEffect("step-execution.complete", async () => {
        const rows = await db
          .update(stepExecutions)
          .set({ status: "completed", completedAt: new Date() })
          .where(eq(stepExecutions.id, stepExecutionId))
          .returning();
        return rows[0] ? toStepExecutionRow(rows[0]) : null;
      }),

    createFormStepExecutionState: ({ stepExecutionId }) =>
      dbEffect("step-execution.form-state.create", async () => {
        const existing = await db
          .select()
          .from(formStepExecutionState)
          .where(eq(formStepExecutionState.stepExecutionId, stepExecutionId))
          .limit(1);

        if (existing[0]) {
          return toFormStateRow(existing[0]);
        }

        const inserted = await db
          .insert(formStepExecutionState)
          .values({
            stepExecutionId,
            draftPayloadJson: null,
            submittedPayloadJson: null,
            lastDraftSavedAt: null,
            submittedAt: null,
          })
          .returning();

        return toFormStateRow(inserted[0]!);
      }),

    upsertFormStepExecutionState: (params: UpsertRuntimeFormStepExecutionStateParams) =>
      dbEffect("step-execution.form-state.upsert", async () => {
        return db.transaction(async (tx) => {
          const existing = await tx
            .select()
            .from(formStepExecutionState)
            .where(eq(formStepExecutionState.stepExecutionId, params.stepExecutionId))
            .orderBy(desc(formStepExecutionState.id))
            .limit(1);

          if (existing[0]) {
            const updated = await tx
              .update(formStepExecutionState)
              .set({
                draftPayloadJson: params.draftPayloadJson,
                submittedPayloadJson: params.submittedPayloadJson,
                lastDraftSavedAt: params.lastDraftSavedAt,
                submittedAt: params.submittedAt,
              })
              .where(eq(formStepExecutionState.id, existing[0].id))
              .returning();
            return toFormStateRow(updated[0]!);
          }

          const inserted = await tx
            .insert(formStepExecutionState)
            .values({
              stepExecutionId: params.stepExecutionId,
              draftPayloadJson: params.draftPayloadJson,
              submittedPayloadJson: params.submittedPayloadJson,
              lastDraftSavedAt: params.lastDraftSavedAt,
              submittedAt: params.submittedAt,
            })
            .returning();
          return toFormStateRow(inserted[0]!);
        });
      }),

    getFormStepExecutionState: (stepExecutionId: string) =>
      dbEffect("step-execution.form-state.get", async () => {
        const rows = await db
          .select()
          .from(formStepExecutionState)
          .where(eq(formStepExecutionState.stepExecutionId, stepExecutionId))
          .limit(1);
        return rows[0] ? toFormStateRow(rows[0]) : null;
      }),

    replaceWorkflowExecutionContextFacts: (
      params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) =>
      dbEffect("step-execution.context-fact.replace", async () => {
        return db.transaction(async (tx) => {
          const affectedDefinitionIds = [...new Set(params.affectedContextFactDefinitionIds)];

          if (affectedDefinitionIds.length > 0) {
            await tx
              .delete(workflowExecutionContextFacts)
              .where(
                and(
                  eq(workflowExecutionContextFacts.workflowExecutionId, params.workflowExecutionId),
                  inArray(
                    workflowExecutionContextFacts.contextFactDefinitionId,
                    affectedDefinitionIds,
                  ),
                ),
              );
          }

          if (params.currentValues.length === 0) {
            return [];
          }

          const inserted = await tx
            .insert(workflowExecutionContextFacts)
            .values(
              params.currentValues.map((value) => ({
                workflowExecutionId: params.workflowExecutionId,
                contextFactDefinitionId: value.contextFactDefinitionId,
                instanceId: crypto.randomUUID(),
                instanceOrder: value.instanceOrder,
                valueJson: value.valueJson,
                sourceStepExecutionId: params.sourceStepExecutionId,
              })),
            )
            .returning();

          return inserted
            .sort(
              (left, right) =>
                left.contextFactDefinitionId.localeCompare(right.contextFactDefinitionId) ||
                left.instanceOrder - right.instanceOrder ||
                left.id.localeCompare(right.id),
            )
            .map(toContextFactRow);
        });
      }),

    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      dbEffect("step-execution.context-fact.list", async () => {
        const rows = await db
          .select()
          .from(workflowExecutionContextFacts)
          .where(eq(workflowExecutionContextFacts.workflowExecutionId, workflowExecutionId))
          .orderBy(
            asc(workflowExecutionContextFacts.contextFactDefinitionId),
            asc(workflowExecutionContextFacts.instanceOrder),
            asc(workflowExecutionContextFacts.createdAt),
            asc(workflowExecutionContextFacts.id),
          );
        return rows.map(toContextFactRow);
      }),

    listWorkflowContextFactDefinitions: (workflowId: string) =>
      dbEffect("step-execution.context-fact-definition.list", async () => {
        const rows = await db
          .select()
          .from(methodologyWorkflowContextFactDefinitions)
          .where(eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowId))
          .orderBy(
            asc(methodologyWorkflowContextFactDefinitions.createdAt),
            asc(methodologyWorkflowContextFactDefinitions.id),
          );
        return rows.map(toContextFactDefinitionRow);
      }),

    listWorkflowStepDefinitions: (workflowId: string) =>
      dbEffect("step-execution.workflow-step.list", async () => {
        const rows = await db
          .select()
          .from(methodologyWorkflowSteps)
          .where(eq(methodologyWorkflowSteps.workflowId, workflowId))
          .orderBy(asc(methodologyWorkflowSteps.createdAt), asc(methodologyWorkflowSteps.id));
        return rows.map(toWorkflowStepDefinitionRow);
      }),

    listWorkflowEdges: (workflowId: string) =>
      dbEffect("step-execution.workflow-edge.list", async () => {
        const rows = await db
          .select()
          .from(methodologyWorkflowEdges)
          .where(eq(methodologyWorkflowEdges.workflowId, workflowId))
          .orderBy(asc(methodologyWorkflowEdges.createdAt), asc(methodologyWorkflowEdges.id));
        return rows.map(toWorkflowEdgeRow);
      }),

    getWorkflowEntryStepId: (workflowId: string) =>
      dbEffect("step-execution.workflow.entry-step-id", async () => {
        const rows = await db
          .select({ metadataJson: methodologyWorkflows.metadataJson })
          .from(methodologyWorkflows)
          .where(eq(methodologyWorkflows.id, workflowId))
          .limit(1);

        const metadata = rows[0]?.metadataJson;
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
          return null;
        }

        const entryStepId = (metadata as Record<string, unknown>).entryStepId;
        return typeof entryStepId === "string" && entryStepId.length > 0 ? entryStepId : null;
      }),
  });
}
