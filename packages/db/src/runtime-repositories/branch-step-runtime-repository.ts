import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";

import {
  BranchStepRuntimeRepository,
  RepositoryError,
  type BranchStepExecutionRouteRow,
  type BranchStepExecutionRow,
  type BranchStepExecutionWithRoutes,
  type CreateBranchStepExecutionOnActivationParams,
  type SaveBranchStepSelectionParams,
} from "@chiron/workflow-engine";

import { branchStepExecutionRoutes, branchStepExecutions } from "../schema/runtime";

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

function toBranchStepExecutionRow(
  row: typeof branchStepExecutions.$inferSelect,
): BranchStepExecutionRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    selectedTargetStepId: row.selectedTargetStepId,
    savedAt: row.savedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toBranchStepExecutionRouteRow(
  row: typeof branchStepExecutionRoutes.$inferSelect,
): BranchStepExecutionRouteRow {
  return {
    id: row.id,
    branchStepExecutionId: row.branchStepExecutionId,
    routeId: row.routeId,
    targetStepId: row.targetStepId,
    sortOrder: row.sortOrder,
    conditionMode: row.conditionMode,
    isValid: row.isValid,
    evaluationTreeJson: row.evaluationTreeJson as BranchStepExecutionRouteRow["evaluationTreeJson"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function getBranchStepExecutionByStepExecutionId(db: DB, stepExecutionId: string) {
  const rows = await db
    .select()
    .from(branchStepExecutions)
    .where(eq(branchStepExecutions.stepExecutionId, stepExecutionId))
    .limit(1);

  return rows[0] ?? null;
}

async function listBranchStepExecutionRoutes(db: DB, branchStepExecutionId: string) {
  return db
    .select()
    .from(branchStepExecutionRoutes)
    .where(eq(branchStepExecutionRoutes.branchStepExecutionId, branchStepExecutionId))
    .orderBy(asc(branchStepExecutionRoutes.sortOrder), asc(branchStepExecutionRoutes.id));
}

async function loadBranchStateWithRoutes(
  db: DB,
  stepExecutionId: string,
): Promise<BranchStepExecutionWithRoutes | null> {
  const branchRow = await getBranchStepExecutionByStepExecutionId(db, stepExecutionId);
  if (!branchRow) {
    return null;
  }

  const routeRows = await listBranchStepExecutionRoutes(db, branchRow.id);

  return {
    branch: toBranchStepExecutionRow(branchRow),
    routes: routeRows.map(toBranchStepExecutionRouteRow),
  };
}

async function ensureBranchStepExecution(
  db: DB,
  params: CreateBranchStepExecutionOnActivationParams,
): Promise<BranchStepExecutionWithRoutes> {
  const existing = await loadBranchStateWithRoutes(db, params.stepExecutionId);
  if (existing) {
    return existing;
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(branchStepExecutions)
      .values({
        stepExecutionId: params.stepExecutionId,
        selectedTargetStepId: null,
        savedAt: null,
      })
      .returning();

    const branchRow = inserted[0];
    if (!branchRow) {
      throw new Error("Failed to create branch step execution state");
    }

    if (params.routes && params.routes.length > 0) {
      await tx.insert(branchStepExecutionRoutes).values(
        params.routes.map((route) => ({
          branchStepExecutionId: branchRow.id,
          routeId: route.routeId,
          targetStepId: route.targetStepId,
          sortOrder: route.sortOrder,
          conditionMode: route.conditionMode,
          isValid: route.isValid,
          evaluationTreeJson: route.evaluationTreeJson ?? null,
        })),
      );
    }

    const routeRows = await tx
      .select()
      .from(branchStepExecutionRoutes)
      .where(eq(branchStepExecutionRoutes.branchStepExecutionId, branchRow.id))
      .orderBy(asc(branchStepExecutionRoutes.sortOrder), asc(branchStepExecutionRoutes.id));

    return {
      branch: toBranchStepExecutionRow(branchRow),
      routes: routeRows.map(toBranchStepExecutionRouteRow),
    };
  });
}

export function createBranchStepRuntimeRepoLayer(db: DB): Layer.Layer<BranchStepRuntimeRepository> {
  return Layer.succeed(BranchStepRuntimeRepository, {
    createOnActivation: (params: CreateBranchStepExecutionOnActivationParams) =>
      dbEffect("branch-step-runtime.createOnActivation", async () =>
        ensureBranchStepExecution(db, params),
      ),

    saveSelection: (params: SaveBranchStepSelectionParams) =>
      dbEffect("branch-step-runtime.saveSelection", async () => {
        const rows = await db
          .update(branchStepExecutions)
          .set({
            selectedTargetStepId: params.selectedTargetStepId,
            savedAt: new Date(),
          })
          .where(eq(branchStepExecutions.stepExecutionId, params.stepExecutionId))
          .returning();

        return rows[0] ? toBranchStepExecutionRow(rows[0]) : null;
      }),

    loadWithRoutes: (stepExecutionId: string) =>
      dbEffect("branch-step-runtime.loadWithRoutes", async () =>
        loadBranchStateWithRoutes(db, stepExecutionId),
      ),
  });
}
