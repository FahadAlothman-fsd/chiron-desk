import { and, asc, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  RepositoryError,
  StepExecutionRepository,
  type CreateRuntimeStepExecutionParams,
  type RuntimeFormStepExecutionStateRow,
  type RuntimeStepExecutionRow,
  type RuntimeWorkflowEdgeRow,
  type RuntimeWorkflowExecutionContextFactRow,
  type RuntimeWorkflowStepDefinitionRow,
  type UpsertRuntimeFormStepExecutionStateParams,
  type WriteRuntimeWorkflowExecutionContextFactParams,
} from "@chiron/workflow-engine";
import {
  formStepExecutionState,
  stepExecutions,
  workflowExecutionContextFacts,
} from "../schema/runtime";
import { methodologyWorkflowEdges, methodologyWorkflowSteps } from "../schema/methodology";

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
    status: row.status,
    activatedAt: row.activatedAt,
    completedAt: row.completedAt,
    progressionData: row.progressionData,
  };
}

function toFormStateRow(
  row: typeof formStepExecutionState.$inferSelect,
): RuntimeFormStepExecutionStateRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    draftValuesJson: row.draftValuesJson,
    submittedSnapshotJson: row.submittedSnapshotJson,
    submittedAt: row.submittedAt,
  };
}

function toContextFactRow(
  row: typeof workflowExecutionContextFacts.$inferSelect,
): RuntimeWorkflowExecutionContextFactRow {
  return {
    id: row.id,
    workflowExecutionId: row.workflowExecutionId,
    factKey: row.factKey,
    factKind: row.factKind,
    valueJson: row.valueJson,
    sourceStepExecutionId: row.sourceStepExecutionId,
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
            progressionData: params.progressionData,
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

    completeStepExecution: ({ stepExecutionId, progressionData }) =>
      dbEffect("step-execution.complete", async () => {
        const rows = await db
          .update(stepExecutions)
          .set({ status: "completed", completedAt: new Date(), progressionData })
          .where(eq(stepExecutions.id, stepExecutionId))
          .returning();
        return rows[0] ? toStepExecutionRow(rows[0]) : null;
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
                draftValuesJson: params.draftValuesJson,
                submittedSnapshotJson: params.submittedSnapshotJson,
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
              draftValuesJson: params.draftValuesJson,
              submittedSnapshotJson: params.submittedSnapshotJson,
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

    writeWorkflowExecutionContextFact: (params: WriteRuntimeWorkflowExecutionContextFactParams) =>
      dbEffect("step-execution.context-fact.write", async () => {
        const rows = await db
          .insert(workflowExecutionContextFacts)
          .values({
            workflowExecutionId: params.workflowExecutionId,
            factKey: params.factKey,
            factKind: params.factKind,
            valueJson: params.valueJson,
            sourceStepExecutionId: params.sourceStepExecutionId,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to write workflow execution context fact");
        }

        return toContextFactRow(row);
      }),

    listWorkflowExecutionContextFacts: (workflowExecutionId: string) =>
      dbEffect("step-execution.context-fact.list", async () => {
        const rows = await db
          .select()
          .from(workflowExecutionContextFacts)
          .where(eq(workflowExecutionContextFacts.workflowExecutionId, workflowExecutionId))
          .orderBy(asc(workflowExecutionContextFacts.id));
        return rows.map(toContextFactRow);
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
  });
}
