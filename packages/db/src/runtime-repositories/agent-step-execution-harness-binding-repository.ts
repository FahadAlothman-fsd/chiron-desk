import { eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";

import {
  AgentStepExecutionHarnessBindingRepository,
  RepositoryError,
  type AgentStepExecutionHarnessBindingRow,
  type CreateAgentStepExecutionHarnessBindingParams,
  type UpdateAgentStepExecutionHarnessBindingParams,
} from "@chiron/workflow-engine";

import { agentStepExecutionHarnessBinding } from "../schema/runtime";

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
  row: typeof agentStepExecutionHarnessBinding.$inferSelect,
): AgentStepExecutionHarnessBindingRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    harnessId: row.harnessId,
    bindingState: row.bindingState,
    sessionId: row.sessionId,
    serverInstanceId: row.serverInstanceId,
    serverBaseUrl: row.serverBaseUrl,
    selectedAgentKey: row.selectedAgentKey,
    selectedModelJson:
      row.selectedModelJson && typeof row.selectedModelJson === "object"
        ? (row.selectedModelJson as AgentStepExecutionHarnessBindingRow["selectedModelJson"])
        : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createAgentStepExecutionHarnessBindingRepoLayer(
  db: DB,
): Layer.Layer<AgentStepExecutionHarnessBindingRepository> {
  return Layer.succeed(AgentStepExecutionHarnessBindingRepository, {
    createBinding: (params: CreateAgentStepExecutionHarnessBindingParams) =>
      dbEffect("agent-step-execution-harness-binding.create", async () => {
        const rows = await db
          .insert(agentStepExecutionHarnessBinding)
          .values({
            stepExecutionId: params.stepExecutionId,
            harnessId: params.harnessId ?? "opencode",
            bindingState: params.bindingState ?? "unbound",
            sessionId: params.sessionId ?? null,
            serverInstanceId: params.serverInstanceId ?? null,
            serverBaseUrl: params.serverBaseUrl ?? null,
            selectedAgentKey: params.selectedAgentKey ?? null,
            selectedModelJson: params.selectedModelJson ?? null,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create agent step execution harness binding");
        }

        return toRow(row);
      }),

    getBindingByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("agent-step-execution-harness-binding.get", async () => {
        const rows = await db
          .select()
          .from(agentStepExecutionHarnessBinding)
          .where(eq(agentStepExecutionHarnessBinding.stepExecutionId, stepExecutionId))
          .limit(1);

        return rows[0] ? toRow(rows[0]) : null;
      }),

    updateBinding: (params: UpdateAgentStepExecutionHarnessBindingParams) =>
      dbEffect("agent-step-execution-harness-binding.update", async () => {
        const values: Partial<typeof agentStepExecutionHarnessBinding.$inferInsert> = {};

        if (params.harnessId !== undefined) {
          values.harnessId = params.harnessId;
        }

        if (params.bindingState !== undefined) {
          values.bindingState = params.bindingState;
        }

        if (params.sessionId !== undefined) {
          values.sessionId = params.sessionId;
        }

        if (params.serverInstanceId !== undefined) {
          values.serverInstanceId = params.serverInstanceId;
        }

        if (params.serverBaseUrl !== undefined) {
          values.serverBaseUrl = params.serverBaseUrl;
        }

        if (params.selectedAgentKey !== undefined) {
          values.selectedAgentKey = params.selectedAgentKey;
        }

        if (params.selectedModelJson !== undefined) {
          values.selectedModelJson = params.selectedModelJson;
        }

        const rows = await db
          .update(agentStepExecutionHarnessBinding)
          .set(values)
          .where(eq(agentStepExecutionHarnessBinding.stepExecutionId, params.stepExecutionId))
          .returning();

        return rows[0] ? toRow(rows[0]) : null;
      }),

    deleteBindingByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("agent-step-execution-harness-binding.delete", async () => {
        await db
          .delete(agentStepExecutionHarnessBinding)
          .where(eq(agentStepExecutionHarnessBinding.stepExecutionId, stepExecutionId));
      }),
  });
}
