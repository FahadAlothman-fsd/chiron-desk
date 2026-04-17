import { and, asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";

import {
  ActionStepRuntimeRepository,
  RepositoryError,
  type ActionStepExecutionActionItemRow,
  type ActionStepExecutionActionRow,
  type ActionStepExecutionRow,
  type CreateActionStepExecutionActionItemParams,
  type CreateActionStepExecutionActionParams,
  type CreateActionStepExecutionParams,
  type FindActionExecutionByDefinitionIdParams,
  type FindActionItemByDefinitionIdParams,
  type UpdateActionStepExecutionActionItemParams,
  type UpdateActionStepExecutionActionParams,
} from "@chiron/workflow-engine";

import {
  actionStepExecutionActionItems,
  actionStepExecutionActions,
  actionStepExecutions,
} from "../schema/runtime";

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

function toActionStepExecutionRow(
  row: typeof actionStepExecutions.$inferSelect,
): ActionStepExecutionRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toActionExecutionRow(
  row: typeof actionStepExecutionActions.$inferSelect,
): ActionStepExecutionActionRow {
  return {
    id: row.id,
    actionStepExecutionId: row.actionStepExecutionId,
    actionDefinitionId: row.actionDefinitionId,
    actionKind: row.actionKind,
    status: row.status,
    resultSummaryJson: row.resultSummaryJson,
    resultJson: row.resultJson,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toActionItemRow(
  row: typeof actionStepExecutionActionItems.$inferSelect,
): ActionStepExecutionActionItemRow {
  return {
    id: row.id,
    actionExecutionId: row.actionExecutionId,
    itemDefinitionId: row.itemDefinitionId,
    status: row.status,
    resultSummaryJson: row.resultSummaryJson,
    resultJson: row.resultJson,
    affectedTargetsJson:
      row.affectedTargetsJson as unknown as ActionStepExecutionActionItemRow["affectedTargetsJson"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getActionStepExecutionByStepExecutionId(db: DB, stepExecutionId: string) {
  const rows = await db
    .select()
    .from(actionStepExecutions)
    .where(eq(actionStepExecutions.stepExecutionId, stepExecutionId))
    .limit(1);

  return rows[0] ?? null;
}

async function ensureActionStepExecution(db: DB, params: CreateActionStepExecutionParams) {
  const existing = await getActionStepExecutionByStepExecutionId(db, params.stepExecutionId);
  if (existing) {
    return existing;
  }

  const inserted = await db
    .insert(actionStepExecutions)
    .values({ stepExecutionId: params.stepExecutionId })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error("Failed to create action step execution");
  }

  return row;
}

async function getActionExecutionByDefinitionId(
  db: DB,
  params: FindActionExecutionByDefinitionIdParams,
) {
  const rows = await db
    .select({ action: actionStepExecutionActions })
    .from(actionStepExecutionActions)
    .innerJoin(
      actionStepExecutions,
      eq(actionStepExecutionActions.actionStepExecutionId, actionStepExecutions.id),
    )
    .where(
      and(
        eq(actionStepExecutions.stepExecutionId, params.stepExecutionId),
        eq(actionStepExecutionActions.actionDefinitionId, params.actionDefinitionId),
      ),
    )
    .limit(1);

  return rows[0]?.action ?? null;
}

async function getActionExecutionItemByDefinitionId(
  db: DB,
  params: FindActionItemByDefinitionIdParams,
) {
  const rows = await db
    .select()
    .from(actionStepExecutionActionItems)
    .where(
      and(
        eq(actionStepExecutionActionItems.actionExecutionId, params.actionExecutionId),
        eq(actionStepExecutionActionItems.itemDefinitionId, params.itemDefinitionId),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

function buildActionUpdateValues(params: UpdateActionStepExecutionActionParams) {
  const values: Partial<typeof actionStepExecutionActions.$inferInsert> = {};
  if (params.status !== undefined) {
    values.status = params.status;
  }
  if (params.resultSummaryJson !== undefined) {
    values.resultSummaryJson = params.resultSummaryJson;
  }
  if (params.resultJson !== undefined) {
    values.resultJson = params.resultJson;
  }
  return values;
}

function buildActionItemUpdateValues(params: UpdateActionStepExecutionActionItemParams) {
  const values: Partial<typeof actionStepExecutionActionItems.$inferInsert> = {};
  if (params.status !== undefined) {
    values.status = params.status;
  }
  if (params.resultSummaryJson !== undefined) {
    values.resultSummaryJson = params.resultSummaryJson;
  }
  if (params.resultJson !== undefined) {
    values.resultJson = params.resultJson;
  }
  if (params.affectedTargetsJson !== undefined) {
    values.affectedTargetsJson = params.affectedTargetsJson;
  }
  return values;
}

export function createActionStepRuntimeRepoLayer(db: DB): Layer.Layer<ActionStepRuntimeRepository> {
  return Layer.succeed(ActionStepRuntimeRepository, {
    createActionStepExecution: (params: CreateActionStepExecutionParams) =>
      dbEffect("action-step-runtime.execution.create", async () => {
        const row = await ensureActionStepExecution(db, params);
        return toActionStepExecutionRow(row);
      }),

    getActionStepExecutionByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("action-step-runtime.execution.get", async () => {
        const row = await getActionStepExecutionByStepExecutionId(db, stepExecutionId);
        return row ? toActionStepExecutionRow(row) : null;
      }),

    createActionExecution: (params: CreateActionStepExecutionActionParams) =>
      dbEffect("action-step-runtime.action.create", async () => {
        const root = await ensureActionStepExecution(db, {
          stepExecutionId: params.stepExecutionId,
        });
        const existing = await getActionExecutionByDefinitionId(db, {
          stepExecutionId: params.stepExecutionId,
          actionDefinitionId: params.actionDefinitionId,
        });
        if (existing) {
          return toActionExecutionRow(existing);
        }

        const inserted = await db
          .insert(actionStepExecutionActions)
          .values({
            actionStepExecutionId: root.id,
            actionDefinitionId: params.actionDefinitionId,
            actionKind: params.actionKind,
            status: params.status ?? "running",
            resultSummaryJson: params.resultSummaryJson ?? null,
            resultJson: params.resultJson ?? null,
          })
          .returning();

        const row = inserted[0];
        if (!row) {
          throw new Error("Failed to create action execution row");
        }

        return toActionExecutionRow(row);
      }),

    getActionExecutionByDefinitionId: (params: FindActionExecutionByDefinitionIdParams) =>
      dbEffect("action-step-runtime.action.getByDefinitionId", async () => {
        const row = await getActionExecutionByDefinitionId(db, params);
        return row ? toActionExecutionRow(row) : null;
      }),

    listActionExecutions: (stepExecutionId: string) =>
      dbEffect("action-step-runtime.action.list", async () => {
        const rows = await db
          .select({ action: actionStepExecutionActions })
          .from(actionStepExecutionActions)
          .innerJoin(
            actionStepExecutions,
            eq(actionStepExecutionActions.actionStepExecutionId, actionStepExecutions.id),
          )
          .where(eq(actionStepExecutions.stepExecutionId, stepExecutionId))
          .orderBy(
            asc(actionStepExecutionActions.createdAt),
            asc(actionStepExecutionActions.actionDefinitionId),
          );

        return rows.map(({ action }) => toActionExecutionRow(action));
      }),

    updateActionExecution: (params: UpdateActionStepExecutionActionParams) =>
      dbEffect("action-step-runtime.action.update", async () => {
        const rows = await db
          .update(actionStepExecutionActions)
          .set(buildActionUpdateValues(params))
          .where(eq(actionStepExecutionActions.id, params.actionExecutionId))
          .returning();

        return rows[0] ? toActionExecutionRow(rows[0]) : null;
      }),

    createActionExecutionItem: (params: CreateActionStepExecutionActionItemParams) =>
      dbEffect("action-step-runtime.item.create", async () => {
        const existing = await getActionExecutionItemByDefinitionId(db, {
          actionExecutionId: params.actionExecutionId,
          itemDefinitionId: params.itemDefinitionId,
        });
        if (existing) {
          return toActionItemRow(existing);
        }

        const inserted = await db
          .insert(actionStepExecutionActionItems)
          .values({
            actionExecutionId: params.actionExecutionId,
            itemDefinitionId: params.itemDefinitionId,
            status: params.status ?? "running",
            resultSummaryJson: params.resultSummaryJson ?? null,
            resultJson: params.resultJson ?? null,
            affectedTargetsJson: params.affectedTargetsJson ?? null,
          })
          .returning();

        const row = inserted[0];
        if (!row) {
          throw new Error("Failed to create action execution item row");
        }

        return toActionItemRow(row);
      }),

    getActionExecutionItemByDefinitionId: (params: FindActionItemByDefinitionIdParams) =>
      dbEffect("action-step-runtime.item.getByDefinitionId", async () => {
        const row = await getActionExecutionItemByDefinitionId(db, params);
        return row ? toActionItemRow(row) : null;
      }),

    listActionExecutionItems: (actionExecutionId: string) =>
      dbEffect("action-step-runtime.item.list", async () => {
        const rows = await db
          .select()
          .from(actionStepExecutionActionItems)
          .where(eq(actionStepExecutionActionItems.actionExecutionId, actionExecutionId))
          .orderBy(
            asc(actionStepExecutionActionItems.createdAt),
            asc(actionStepExecutionActionItems.itemDefinitionId),
          );

        return rows.map(toActionItemRow);
      }),

    updateActionExecutionItem: (params: UpdateActionStepExecutionActionItemParams) =>
      dbEffect("action-step-runtime.item.update", async () => {
        const rows = await db
          .update(actionStepExecutionActionItems)
          .set(buildActionItemUpdateValues(params))
          .where(
            and(
              eq(actionStepExecutionActionItems.actionExecutionId, params.actionExecutionId),
              eq(actionStepExecutionActionItems.itemDefinitionId, params.itemDefinitionId),
            ),
          )
          .returning();

        return rows[0] ? toActionItemRow(rows[0]) : null;
      }),
  });
}
