import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";

import {
  AgentStepExecutionStateRepository,
  RepositoryError,
  type AgentStepExecutionStateRow,
  type CreateAgentStepExecutionStateParams,
  type UpdateAgentStepExecutionStateParams,
} from "@chiron/workflow-engine";

import { agentStepExecutionState } from "../schema/runtime";

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

function toRow(row: typeof agentStepExecutionState.$inferSelect): AgentStepExecutionStateRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    state: row.state,
    bootstrapAppliedAt: row.bootstrapAppliedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAgentStepExecutionStateRepoLayer(
  db: DB,
): Layer.Layer<AgentStepExecutionStateRepository> {
  return Layer.succeed(AgentStepExecutionStateRepository, {
    createState: (params: CreateAgentStepExecutionStateParams) =>
      dbEffect("agent-step-execution-state.create", async () => {
        const rows = await db
          .insert(agentStepExecutionState)
          .values({
            stepExecutionId: params.stepExecutionId,
            state: params.state ?? "not_started",
            bootstrapAppliedAt: params.bootstrapAppliedAt ?? null,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create agent step execution state");
        }

        return toRow(row);
      }),

    getStateByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("agent-step-execution-state.get", async () => {
        const rows = await db
          .select()
          .from(agentStepExecutionState)
          .where(eq(agentStepExecutionState.stepExecutionId, stepExecutionId))
          .limit(1);

        return rows[0] ? toRow(rows[0]) : null;
      }),

    updateState: (params: UpdateAgentStepExecutionStateParams) =>
      dbEffect("agent-step-execution-state.update", async () => {
        const values: Partial<typeof agentStepExecutionState.$inferInsert> = {};

        if (params.state !== undefined) {
          values.state = params.state;
        }

        if (params.bootstrapAppliedAt !== undefined) {
          values.bootstrapAppliedAt = params.bootstrapAppliedAt;
        }

        const rows = await db
          .update(agentStepExecutionState)
          .set(values)
          .where(eq(agentStepExecutionState.stepExecutionId, params.stepExecutionId))
          .returning();

        return rows[0] ? toRow(rows[0]) : null;
      }),

    deleteStateByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("agent-step-execution-state.delete", async () => {
        await db
          .delete(agentStepExecutionState)
          .where(eq(agentStepExecutionState.stepExecutionId, stepExecutionId));
      }),
  });
}
