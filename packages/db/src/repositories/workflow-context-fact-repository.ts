import { asc, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";
import { RepositoryError } from "@chiron/workflow-engine";
import {
  methodologyWorkflowContextFactArtifactReferences,
  methodologyWorkflowContextFactDefinitions,
  methodologyWorkflowContextFactDraftSpecFields,
  methodologyWorkflowContextFactDraftSpecs,
  methodologyWorkflowContextFactExternalBindings,
  methodologyWorkflowContextFactPlainValues,
  methodologyWorkflowContextFactWorkUnitReferences,
  methodologyWorkflowContextFactWorkflowReferences,
} from "../schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;

type ContextFactKind =
  | "plain_value"
  | "external_binding"
  | "workflow_reference"
  | "work_unit_reference"
  | "artifact_reference"
  | "draft_spec"
  | "draft_spec_field";

type ContextFactPayload =
  | { valueType: string }
  | { provider: string; bindingKey: string }
  | { workflowDefinitionId: string }
  | { workUnitTypeKey: string }
  | { artifactSlotKey: string }
  | Record<string, never>
  | {
      draftSpecId: string;
      fieldKey: string;
      valueType: string;
      required: boolean;
      descriptionJson: unknown;
    };

export interface CreateContextFactDefinitionParams {
  workflowId: string;
  factKey: string;
  factKind: ContextFactKind;
  payload: ContextFactPayload;
}

export interface ContextFactDefinitionRow {
  id: string;
  workflowId: string;
  factKey: string;
  factKind: ContextFactKind;
}

export class WorkflowContextFactRepository extends Context.Tag(
  "@chiron/db/repositories/WorkflowContextFactRepository",
)<
  WorkflowContextFactRepository,
  {
    readonly createContextFactDefinition: (
      params: CreateContextFactDefinitionParams,
    ) => Effect.Effect<ContextFactDefinitionRow, RepositoryError>;
    readonly listContextFactDefinitions: (
      workflowId: string,
    ) => Effect.Effect<readonly ContextFactDefinitionRow[], RepositoryError>;
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

function toRow(
  row: typeof methodologyWorkflowContextFactDefinitions.$inferSelect,
): ContextFactDefinitionRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    factKey: row.factKey,
    factKind: row.factKind as ContextFactKind,
  };
}

export function createWorkflowContextFactRepoLayer(
  db: DB,
): Layer.Layer<WorkflowContextFactRepository> {
  return Layer.succeed(WorkflowContextFactRepository, {
    createContextFactDefinition: (params) =>
      dbEffect("workflow-context-fact.create", async () => {
        return db.transaction(async (tx) => {
          const inserted = await tx
            .insert(methodologyWorkflowContextFactDefinitions)
            .values({
              workflowId: params.workflowId,
              factKey: params.factKey,
              factKind: params.factKind,
            })
            .returning();
          const definition = inserted[0];
          if (!definition) {
            throw new Error("Failed to create workflow context fact definition");
          }

          switch (params.factKind) {
            case "plain_value":
              await tx.insert(methodologyWorkflowContextFactPlainValues).values({
                contextFactDefinitionId: definition.id,
                valueType: (params.payload as { valueType: string }).valueType,
              });
              break;
            case "external_binding":
              await tx.insert(methodologyWorkflowContextFactExternalBindings).values({
                contextFactDefinitionId: definition.id,
                provider: (params.payload as { provider: string }).provider,
                bindingKey: (params.payload as { bindingKey: string }).bindingKey,
              });
              break;
            case "workflow_reference":
              await tx.insert(methodologyWorkflowContextFactWorkflowReferences).values({
                contextFactDefinitionId: definition.id,
                workflowDefinitionId: (params.payload as { workflowDefinitionId: string })
                  .workflowDefinitionId,
              });
              break;
            case "work_unit_reference":
              await tx.insert(methodologyWorkflowContextFactWorkUnitReferences).values({
                contextFactDefinitionId: definition.id,
                workUnitTypeKey: (params.payload as { workUnitTypeKey: string }).workUnitTypeKey,
              });
              break;
            case "artifact_reference":
              await tx.insert(methodologyWorkflowContextFactArtifactReferences).values({
                contextFactDefinitionId: definition.id,
                artifactSlotKey: (params.payload as { artifactSlotKey: string }).artifactSlotKey,
              });
              break;
            case "draft_spec":
              await tx.insert(methodologyWorkflowContextFactDraftSpecs).values({
                contextFactDefinitionId: definition.id,
              });
              break;
            case "draft_spec_field":
              await tx.insert(methodologyWorkflowContextFactDraftSpecFields).values({
                draftSpecId: (params.payload as { draftSpecId: string }).draftSpecId,
                fieldKey: (params.payload as { fieldKey: string }).fieldKey,
                valueType: (params.payload as { valueType: string }).valueType,
                required: (params.payload as { required: boolean }).required,
                descriptionJson: (params.payload as { descriptionJson: unknown }).descriptionJson,
              });
              break;
          }

          return toRow(definition);
        });
      }),

    listContextFactDefinitions: (workflowId) =>
      dbEffect("workflow-context-fact.list", async () => {
        const rows = await db
          .select()
          .from(methodologyWorkflowContextFactDefinitions)
          .where(eq(methodologyWorkflowContextFactDefinitions.workflowId, workflowId))
          .orderBy(
            asc(methodologyWorkflowContextFactDefinitions.createdAt),
            asc(methodologyWorkflowContextFactDefinitions.id),
          );
        return rows.map(toRow);
      }),
  });
}
