import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Effect, Layer } from "effect";
import {
  InvokeExecutionRepository,
  RepositoryError,
  type CreateInvokeStepExecutionStateParams,
  type CreateInvokeWorkUnitCreatedArtifactSnapshotParams,
  type CreateInvokeWorkUnitCreatedFactInstanceParams,
  type CreateInvokeWorkUnitTargetExecutionParams,
  type CreateInvokeWorkflowTargetExecutionParams,
  type InvokeStepExecutionStateRow,
  type InvokeWorkUnitCreatedArtifactSnapshotRow,
  type InvokeWorkUnitCreatedFactInstanceRow,
  type InvokeWorkUnitTargetExecutionRow,
  type InvokeWorkflowTargetExecutionRow,
  type StartInvokeWorkUnitTargetAtomicallyParams,
  type StartInvokeWorkflowTargetAtomicallyParams,
  type UpdateInvokeWorkUnitTargetExecutionStartParams,
  type UpdateInvokeWorkflowTargetExecutionStartParams,
} from "@chiron/workflow-engine";

import {
  invokeStepExecutionState,
  invokeWorkUnitCreatedArtifactSnapshot,
  invokeWorkUnitCreatedFactInstance,
  invokeWorkUnitTargetExecution,
  invokeWorkflowTargetExecution,
  projectArtifactSnapshots,
  projectWorkUnits,
  transitionExecutions,
  workflowExecutions,
  workUnitFactInstances,
} from "../schema/runtime";

type DB = LibSQLDatabase<Record<string, unknown>>;
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

function dbEffect<T>(
  operation: string,
  execute: () => Promise<T>,
): Effect.Effect<T, RepositoryError> {
  return Effect.tryPromise({
    try: execute,
    catch: (cause) => new RepositoryError({ operation, cause }),
  });
}

function toInvokeStepExecutionStateRow(
  row: typeof invokeStepExecutionState.$inferSelect,
): InvokeStepExecutionStateRow {
  return {
    id: row.id,
    stepExecutionId: row.stepExecutionId,
    invokeStepDefinitionId: row.invokeStepDefinitionId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInvokeWorkflowTargetExecutionRow(
  row: typeof invokeWorkflowTargetExecution.$inferSelect,
): InvokeWorkflowTargetExecutionRow {
  return {
    id: row.id,
    invokeStepExecutionStateId: row.invokeStepExecutionStateId,
    workflowDefinitionId: row.workflowDefinitionId,
    workflowExecutionId: row.workflowExecutionId,
    resolutionOrder: row.resolutionOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInvokeWorkUnitTargetExecutionRow(
  row: typeof invokeWorkUnitTargetExecution.$inferSelect,
): InvokeWorkUnitTargetExecutionRow {
  return {
    id: row.id,
    invokeStepExecutionStateId: row.invokeStepExecutionStateId,
    projectWorkUnitId: row.projectWorkUnitId,
    workUnitDefinitionId: row.workUnitDefinitionId,
    transitionDefinitionId: row.transitionDefinitionId,
    transitionExecutionId: row.transitionExecutionId,
    workflowDefinitionId: row.workflowDefinitionId,
    workflowExecutionId: row.workflowExecutionId,
    resolutionOrder: row.resolutionOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toInvokeWorkUnitCreatedFactInstanceRow(
  row: typeof invokeWorkUnitCreatedFactInstance.$inferSelect,
): InvokeWorkUnitCreatedFactInstanceRow {
  return {
    id: row.id,
    invokeWorkUnitTargetExecutionId: row.invokeWorkUnitTargetExecutionId,
    factDefinitionId: row.factDefinitionId,
    workUnitFactInstanceId: row.workUnitFactInstanceId,
    createdAt: row.createdAt,
  };
}

function toInvokeWorkUnitCreatedArtifactSnapshotRow(
  row: typeof invokeWorkUnitCreatedArtifactSnapshot.$inferSelect,
): InvokeWorkUnitCreatedArtifactSnapshotRow {
  return {
    id: row.id,
    invokeWorkUnitTargetExecutionId: row.invokeWorkUnitTargetExecutionId,
    artifactSlotDefinitionId: row.artifactSlotDefinitionId,
    artifactSnapshotId: row.artifactSnapshotId,
    createdAt: row.createdAt,
  };
}

async function getInvokeWorkflowTargetExecutionRowById(
  db: DB | Tx,
  invokeWorkflowTargetExecutionId: string,
) {
  const rows = await db
    .select()
    .from(invokeWorkflowTargetExecution)
    .where(eq(invokeWorkflowTargetExecution.id, invokeWorkflowTargetExecutionId))
    .limit(1);

  return rows[0] ?? null;
}

async function getInvokeWorkUnitTargetExecutionRowById(
  db: DB | Tx,
  invokeWorkUnitTargetExecutionId: string,
) {
  const rows = await db
    .select()
    .from(invokeWorkUnitTargetExecution)
    .where(eq(invokeWorkUnitTargetExecution.id, invokeWorkUnitTargetExecutionId))
    .limit(1);

  return rows[0] ?? null;
}

export function createInvokeExecutionRepoLayer(db: DB): Layer.Layer<InvokeExecutionRepository> {
  return Layer.succeed(InvokeExecutionRepository, {
    createInvokeStepExecutionState: (params: CreateInvokeStepExecutionStateParams) =>
      dbEffect("invoke-execution.step-state.create", async () => {
        const rows = await db
          .insert(invokeStepExecutionState)
          .values({
            stepExecutionId: params.stepExecutionId,
            invokeStepDefinitionId: params.invokeStepDefinitionId,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create invoke step execution state");
        }

        return toInvokeStepExecutionStateRow(row);
      }),

    getInvokeStepExecutionStateByStepExecutionId: (stepExecutionId: string) =>
      dbEffect("invoke-execution.step-state.getByStepExecutionId", async () => {
        const rows = await db
          .select()
          .from(invokeStepExecutionState)
          .where(eq(invokeStepExecutionState.stepExecutionId, stepExecutionId))
          .limit(1);

        return rows[0] ? toInvokeStepExecutionStateRow(rows[0]) : null;
      }),

    listInvokeWorkflowTargetExecutions: (invokeStepExecutionStateId: string) =>
      dbEffect("invoke-execution.workflow-target.list", async () => {
        const rows = await db
          .select()
          .from(invokeWorkflowTargetExecution)
          .where(
            eq(
              invokeWorkflowTargetExecution.invokeStepExecutionStateId,
              invokeStepExecutionStateId,
            ),
          )
          .orderBy(
            asc(invokeWorkflowTargetExecution.createdAt),
            asc(invokeWorkflowTargetExecution.id),
          );

        return rows.map(toInvokeWorkflowTargetExecutionRow);
      }),

    getInvokeWorkflowTargetExecutionById: (invokeWorkflowTargetExecutionId: string) =>
      dbEffect("invoke-execution.workflow-target.getById", async () => {
        const row = await getInvokeWorkflowTargetExecutionRowById(
          db,
          invokeWorkflowTargetExecutionId,
        );
        return row ? toInvokeWorkflowTargetExecutionRow(row) : null;
      }),

    createInvokeWorkflowTargetExecution: (params: CreateInvokeWorkflowTargetExecutionParams) =>
      dbEffect("invoke-execution.workflow-target.create", async () => {
        const rows = await db
          .insert(invokeWorkflowTargetExecution)
          .values({
            invokeStepExecutionStateId: params.invokeStepExecutionStateId,
            workflowDefinitionId: params.workflowDefinitionId,
            workflowExecutionId: params.workflowExecutionId ?? null,
            resolutionOrder: params.resolutionOrder ?? null,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create invoke workflow target execution");
        }

        return toInvokeWorkflowTargetExecutionRow(row);
      }),

    markInvokeWorkflowTargetExecutionStarted: (
      params: UpdateInvokeWorkflowTargetExecutionStartParams,
    ) =>
      dbEffect("invoke-execution.workflow-target.markStarted", async () => {
        const rows = await db
          .update(invokeWorkflowTargetExecution)
          .set({ workflowExecutionId: params.workflowExecutionId })
          .where(eq(invokeWorkflowTargetExecution.id, params.invokeWorkflowTargetExecutionId))
          .returning();

        return rows[0] ? toInvokeWorkflowTargetExecutionRow(rows[0]) : null;
      }),

    startInvokeWorkflowTargetAtomically: (params: StartInvokeWorkflowTargetAtomicallyParams) =>
      dbEffect("invoke-execution.workflow-target.startAtomic", async () => {
        return db.transaction(async (tx) => {
          const target = await getInvokeWorkflowTargetExecutionRowById(
            tx,
            params.invokeWorkflowTargetExecutionId,
          );

          if (!target) {
            throw new Error("Invoke workflow target execution not found");
          }

          if (target.workflowExecutionId) {
            return {
              invokeWorkflowTargetExecutionId: target.id,
              workflowExecutionId: target.workflowExecutionId,
              result: "already_started" as const,
            };
          }

          const workflowRows = await tx
            .insert(workflowExecutions)
            .values({
              transitionExecutionId: params.transitionExecutionId,
              workflowId: params.workflowDefinitionId,
              workflowRole: "supporting",
              status: "active",
              currentStepExecutionId: null,
            })
            .returning();

          const workflowExecution = workflowRows[0];
          if (!workflowExecution) {
            throw new Error("Failed to create invoke workflow execution");
          }

          await tx
            .update(invokeWorkflowTargetExecution)
            .set({ workflowExecutionId: workflowExecution.id })
            .where(eq(invokeWorkflowTargetExecution.id, target.id));

          return {
            invokeWorkflowTargetExecutionId: target.id,
            workflowExecutionId: workflowExecution.id,
            result: "started" as const,
          };
        });
      }),

    listInvokeWorkUnitTargetExecutions: (invokeStepExecutionStateId: string) =>
      dbEffect("invoke-execution.work-unit-target.list", async () => {
        const rows = await db
          .select()
          .from(invokeWorkUnitTargetExecution)
          .where(
            eq(
              invokeWorkUnitTargetExecution.invokeStepExecutionStateId,
              invokeStepExecutionStateId,
            ),
          )
          .orderBy(
            asc(invokeWorkUnitTargetExecution.createdAt),
            asc(invokeWorkUnitTargetExecution.id),
          );

        return rows.map(toInvokeWorkUnitTargetExecutionRow);
      }),

    getInvokeWorkUnitTargetExecutionById: (invokeWorkUnitTargetExecutionId: string) =>
      dbEffect("invoke-execution.work-unit-target.getById", async () => {
        const row = await getInvokeWorkUnitTargetExecutionRowById(
          db,
          invokeWorkUnitTargetExecutionId,
        );
        return row ? toInvokeWorkUnitTargetExecutionRow(row) : null;
      }),

    createInvokeWorkUnitTargetExecution: (params: CreateInvokeWorkUnitTargetExecutionParams) =>
      dbEffect("invoke-execution.work-unit-target.create", async () => {
        const rows = await db
          .insert(invokeWorkUnitTargetExecution)
          .values({
            invokeStepExecutionStateId: params.invokeStepExecutionStateId,
            projectWorkUnitId: params.projectWorkUnitId ?? null,
            workUnitDefinitionId: params.workUnitDefinitionId,
            transitionDefinitionId: params.transitionDefinitionId,
            transitionExecutionId: params.transitionExecutionId ?? null,
            workflowDefinitionId: params.workflowDefinitionId ?? null,
            workflowExecutionId: params.workflowExecutionId ?? null,
            resolutionOrder: params.resolutionOrder ?? null,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create invoke work-unit target execution");
        }

        return toInvokeWorkUnitTargetExecutionRow(row);
      }),

    markInvokeWorkUnitTargetExecutionStarted: (
      params: UpdateInvokeWorkUnitTargetExecutionStartParams,
    ) =>
      dbEffect("invoke-execution.work-unit-target.markStarted", async () => {
        const rows = await db
          .update(invokeWorkUnitTargetExecution)
          .set({
            projectWorkUnitId: params.projectWorkUnitId,
            transitionExecutionId: params.transitionExecutionId,
            workflowDefinitionId: params.workflowDefinitionId,
            workflowExecutionId: params.workflowExecutionId,
          })
          .where(eq(invokeWorkUnitTargetExecution.id, params.invokeWorkUnitTargetExecutionId))
          .returning();

        return rows[0] ? toInvokeWorkUnitTargetExecutionRow(rows[0]) : null;
      }),

    startInvokeWorkUnitTargetAtomically: (params: StartInvokeWorkUnitTargetAtomicallyParams) =>
      dbEffect("invoke-execution.work-unit-target.startAtomic", async () => {
        return db.transaction(async (tx) => {
          const target = await getInvokeWorkUnitTargetExecutionRowById(
            tx,
            params.invokeWorkUnitTargetExecutionId,
          );

          if (!target) {
            throw new Error("Invoke work-unit target execution not found");
          }

          if (
            target.projectWorkUnitId &&
            target.transitionExecutionId &&
            target.workflowDefinitionId &&
            target.workflowExecutionId
          ) {
            return {
              invokeWorkUnitTargetExecutionId: target.id,
              projectWorkUnitId: target.projectWorkUnitId,
              transitionExecutionId: target.transitionExecutionId,
              workflowExecutionId: target.workflowExecutionId,
              result: "already_started" as const,
            };
          }

          if (
            target.projectWorkUnitId ||
            target.transitionExecutionId ||
            target.workflowDefinitionId ||
            target.workflowExecutionId
          ) {
            throw new Error("Invoke work-unit target execution is partially started");
          }

          const workUnitRows = await tx
            .insert(projectWorkUnits)
            .values({
              projectId: params.projectId,
              workUnitTypeId: params.workUnitDefinitionId,
              currentStateId: null,
              activeTransitionExecutionId: null,
            })
            .returning();

          const projectWorkUnit = workUnitRows[0];
          if (!projectWorkUnit) {
            throw new Error("Failed to create invoked project work unit");
          }

          const transitionRows = await tx
            .insert(transitionExecutions)
            .values({
              projectWorkUnitId: projectWorkUnit.id,
              transitionId: params.transitionDefinitionId,
              status: "active",
              primaryWorkflowExecutionId: null,
            })
            .returning();

          const transitionExecution = transitionRows[0];
          if (!transitionExecution) {
            throw new Error("Failed to create invoked transition execution");
          }

          const workflowRows = await tx
            .insert(workflowExecutions)
            .values({
              transitionExecutionId: transitionExecution.id,
              workflowId: params.workflowDefinitionId,
              workflowRole: "primary",
              status: "active",
              currentStepExecutionId: null,
            })
            .returning();

          const workflowExecution = workflowRows[0];
          if (!workflowExecution) {
            throw new Error("Failed to create invoked workflow execution");
          }

          await tx
            .update(transitionExecutions)
            .set({ primaryWorkflowExecutionId: workflowExecution.id })
            .where(eq(transitionExecutions.id, transitionExecution.id));

          await tx
            .update(projectWorkUnits)
            .set({ activeTransitionExecutionId: transitionExecution.id })
            .where(eq(projectWorkUnits.id, projectWorkUnit.id));

          const factRows =
            params.initialFactDefinitions.length > 0
              ? await tx
                  .insert(workUnitFactInstances)
                  .values(
                    params.initialFactDefinitions.map((definition) => ({
                      projectWorkUnitId: projectWorkUnit.id,
                      factDefinitionId: definition.factDefinitionId,
                      valueJson: definition.initialValueJson,
                      referencedProjectWorkUnitId: null,
                      status: "active" as const,
                      supersededByFactInstanceId: null,
                      producedByTransitionExecutionId: transitionExecution.id,
                      producedByWorkflowExecutionId: workflowExecution.id,
                      authoredByUserId: null,
                    })),
                  )
                  .returning()
              : [];

          if (factRows.length !== params.initialFactDefinitions.length) {
            throw new Error("Failed to create invoked work-unit fact instances");
          }

          if (factRows.length > 0) {
            await tx.insert(invokeWorkUnitCreatedFactInstance).values(
              factRows.map((row, index) => ({
                invokeWorkUnitTargetExecutionId: target.id,
                factDefinitionId: params.initialFactDefinitions[index]!.factDefinitionId,
                workUnitFactInstanceId: row.id,
              })),
            );
          }

          const artifactRows =
            params.initialArtifactSlotDefinitions.length > 0
              ? await tx
                  .insert(projectArtifactSnapshots)
                  .values(
                    params.initialArtifactSlotDefinitions.map((definition) => ({
                      projectWorkUnitId: projectWorkUnit.id,
                      slotDefinitionId: definition.artifactSlotDefinitionId,
                      recordedByTransitionExecutionId: transitionExecution.id,
                      recordedByWorkflowExecutionId: workflowExecution.id,
                      recordedByUserId: null,
                      supersededByProjectArtifactSnapshotId: null,
                    })),
                  )
                  .returning()
              : [];

          if (artifactRows.length !== params.initialArtifactSlotDefinitions.length) {
            throw new Error("Failed to create invoked artifact snapshots");
          }

          if (artifactRows.length > 0) {
            await tx.insert(invokeWorkUnitCreatedArtifactSnapshot).values(
              artifactRows.map((row, index) => ({
                invokeWorkUnitTargetExecutionId: target.id,
                artifactSlotDefinitionId:
                  params.initialArtifactSlotDefinitions[index]!.artifactSlotDefinitionId,
                artifactSnapshotId: row.id,
              })),
            );
          }

          await tx
            .update(invokeWorkUnitTargetExecution)
            .set({
              projectWorkUnitId: projectWorkUnit.id,
              transitionExecutionId: transitionExecution.id,
              workflowDefinitionId: params.workflowDefinitionId,
              workflowExecutionId: workflowExecution.id,
            })
            .where(eq(invokeWorkUnitTargetExecution.id, target.id));

          return {
            invokeWorkUnitTargetExecutionId: target.id,
            projectWorkUnitId: projectWorkUnit.id,
            transitionExecutionId: transitionExecution.id,
            workflowExecutionId: workflowExecution.id,
            result: "started" as const,
          };
        });
      }),

    listInvokeWorkUnitCreatedFactInstances: (invokeWorkUnitTargetExecutionId: string) =>
      dbEffect("invoke-execution.work-unit-fact-mapping.list", async () => {
        const rows = await db
          .select()
          .from(invokeWorkUnitCreatedFactInstance)
          .where(
            eq(
              invokeWorkUnitCreatedFactInstance.invokeWorkUnitTargetExecutionId,
              invokeWorkUnitTargetExecutionId,
            ),
          )
          .orderBy(
            asc(invokeWorkUnitCreatedFactInstance.createdAt),
            asc(invokeWorkUnitCreatedFactInstance.id),
          );

        return rows.map(toInvokeWorkUnitCreatedFactInstanceRow);
      }),

    createInvokeWorkUnitCreatedFactInstance: (
      params: CreateInvokeWorkUnitCreatedFactInstanceParams,
    ) =>
      dbEffect("invoke-execution.work-unit-fact-mapping.create", async () => {
        const rows = await db
          .insert(invokeWorkUnitCreatedFactInstance)
          .values({
            invokeWorkUnitTargetExecutionId: params.invokeWorkUnitTargetExecutionId,
            factDefinitionId: params.factDefinitionId,
            workUnitFactInstanceId: params.workUnitFactInstanceId,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create invoke work-unit fact mapping");
        }

        return toInvokeWorkUnitCreatedFactInstanceRow(row);
      }),

    listInvokeWorkUnitCreatedArtifactSnapshots: (invokeWorkUnitTargetExecutionId: string) =>
      dbEffect("invoke-execution.work-unit-artifact-mapping.list", async () => {
        const rows = await db
          .select()
          .from(invokeWorkUnitCreatedArtifactSnapshot)
          .where(
            eq(
              invokeWorkUnitCreatedArtifactSnapshot.invokeWorkUnitTargetExecutionId,
              invokeWorkUnitTargetExecutionId,
            ),
          )
          .orderBy(
            asc(invokeWorkUnitCreatedArtifactSnapshot.createdAt),
            asc(invokeWorkUnitCreatedArtifactSnapshot.id),
          );

        return rows.map(toInvokeWorkUnitCreatedArtifactSnapshotRow);
      }),

    createInvokeWorkUnitCreatedArtifactSnapshot: (
      params: CreateInvokeWorkUnitCreatedArtifactSnapshotParams,
    ) =>
      dbEffect("invoke-execution.work-unit-artifact-mapping.create", async () => {
        const rows = await db
          .insert(invokeWorkUnitCreatedArtifactSnapshot)
          .values({
            invokeWorkUnitTargetExecutionId: params.invokeWorkUnitTargetExecutionId,
            artifactSlotDefinitionId: params.artifactSlotDefinitionId,
            artifactSnapshotId: params.artifactSnapshotId,
          })
          .returning();

        const row = rows[0];
        if (!row) {
          throw new Error("Failed to create invoke work-unit artifact mapping");
        }

        return toInvokeWorkUnitCreatedArtifactSnapshotRow(row);
      }),
  });
}
