import { and, desc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";
import { RepositoryError } from "@chiron/workflow-engine";
import {
  formStepExecutionState,
  stepExecutions,
  workflowExecutionContextFacts,
} from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;

export interface CreateStepExecutionParams {
  workflowExecutionId: string;
  stepDefinitionId: string;
  stepType: string;
  status: string;
  progressionData: unknown;
}

export interface UpsertFormStepExecutionStateParams {
  stepExecutionId: string;
  draftValuesJson: unknown;
  submittedSnapshotJson: unknown;
  submittedAt: Date | null;
}

export interface WriteWorkflowExecutionContextFactParams {
  workflowExecutionId: string;
  factKey: string;
  factKind: string;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
}

export interface StepExecutionRow {
  id: string;
  workflowExecutionId: string;
  stepDefinitionId: string;
  stepType: string;
  status: string;
  activatedAt: Date;
  completedAt: Date | null;
  progressionData: unknown;
}

export interface FormStepExecutionStateRow {
  id: string;
  stepExecutionId: string;
  draftValuesJson: unknown;
  submittedSnapshotJson: unknown;
  submittedAt: Date | null;
}

export class StepExecutionRepository extends Context.Tag(
  "@chiron/db/repositories/StepExecutionRepository",
)<
  StepExecutionRepository,
  {
    readonly createStepExecution: (
      params: CreateStepExecutionParams,
    ) => Effect.Effect<StepExecutionRow, RepositoryError>;
    readonly upsertFormStepExecutionState: (
      params: UpsertFormStepExecutionStateParams,
    ) => Effect.Effect<FormStepExecutionStateRow, RepositoryError>;
    readonly getFormStepExecutionState: (
      stepExecutionId: string,
    ) => Effect.Effect<FormStepExecutionStateRow | null, RepositoryError>;
    readonly writeWorkflowExecutionContextFact: (
      params: WriteWorkflowExecutionContextFactParams,
    ) => Effect.Effect<string, RepositoryError>;
  }
>() {}

function dbEffect<T>(
  operation: string,
  execute: () => Promise<T>,
): Effect.Effect<T, RepositoryError> {
  return Effect.tryPromise({
    try: execute,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toStepExecutionRow(row: typeof stepExecutions.$inferSelect): StepExecutionRow {
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
): FormStepExecutionStateRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    draftValuesJson: row.draftValuesJson,
    submittedSnapshotJson: row.submittedSnapshotJson,
    submittedAt: row.submittedAt,
  };
}

export function createStepExecutionRepoLayer(db: DB): Layer.Layer<StepExecutionRepository> {
  return Layer.succeed(StepExecutionRepository, {
    createStepExecution: (params) =>
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

    upsertFormStepExecutionState: (params) =>
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

    getFormStepExecutionState: (stepExecutionId) =>
      dbEffect("step-execution.form-state.get", async () => {
        const rows = await db
          .select()
          .from(formStepExecutionState)
          .where(eq(formStepExecutionState.stepExecutionId, stepExecutionId))
          .limit(1);
        return rows[0] ? toFormStateRow(rows[0]) : null;
      }),

    writeWorkflowExecutionContextFact: (params) =>
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
          .returning({ id: workflowExecutionContextFacts.id });

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to write workflow execution context fact");
        }

        return row.id;
      }),
  });
}
