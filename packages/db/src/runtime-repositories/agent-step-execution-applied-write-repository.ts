import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";

import {
  AgentStepExecutionAppliedWriteRepository,
  RepositoryError,
  type AgentStepExecutionAppliedWriteRow,
  type CreateAgentStepExecutionAppliedWriteParams,
} from "@chiron/workflow-engine";

import { agentStepExecutionAppliedWrites } from "../schema/runtime";

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

function toRow(
  row: typeof agentStepExecutionAppliedWrites.$inferSelect,
): AgentStepExecutionAppliedWriteRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    writeItemId: row.writeItemId,
    contextFactDefinitionId: row.contextFactDefinitionId,
    contextFactKind: row.contextFactKind,
    instanceOrder: row.instanceOrder,
    appliedValueJson: row.appliedValueJson,
    createdAt: row.createdAt,
  };
}

export function createAgentStepExecutionAppliedWriteRepoLayer(
  db: DB,
): Layer.Layer<AgentStepExecutionAppliedWriteRepository> {
  return Layer.succeed(AgentStepExecutionAppliedWriteRepository, {
    createAppliedWrite: (params: CreateAgentStepExecutionAppliedWriteParams) =>
      dbEffect("agent-step-execution-applied-write.create", async () => {
        const rows = await db
          .insert(agentStepExecutionAppliedWrites)
          .values({
            stepExecutionId: params.stepExecutionId,
            writeItemId: params.writeItemId,
            contextFactDefinitionId: params.contextFactDefinitionId,
            contextFactKind: params.contextFactKind,
            instanceOrder: params.instanceOrder,
            appliedValueJson: params.appliedValueJson,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create agent step execution applied write");
        }

        return toRow(row);
      }),

    listAppliedWritesByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("agent-step-execution-applied-write.listByStepExecution", async () => {
        const rows = await db
          .select()
          .from(agentStepExecutionAppliedWrites)
          .where(eq(agentStepExecutionAppliedWrites.stepExecutionId, stepExecutionId))
          .orderBy(
            asc(agentStepExecutionAppliedWrites.createdAt),
            asc(agentStepExecutionAppliedWrites.instanceOrder),
            asc(agentStepExecutionAppliedWrites.id),
          );

        return rows.map(toRow);
      }),
  });
}
