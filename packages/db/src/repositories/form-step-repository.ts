import { and, asc, count, eq } from "drizzle-orm";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { Context, Effect, Layer } from "effect";
import { RepositoryError } from "@chiron/workflow-engine";
import {
  methodologyWorkflowEdges,
  methodologyWorkflowFormFields,
  methodologyWorkflowFormSteps,
  methodologyWorkflowSteps,
  methodologyWorkflows,
} from "../schema/methodology";

type DB = LibSQLDatabase<Record<string, unknown>>;
type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export interface FormStepFieldInput {
  key: string;
  label: string | null;
  valueType: string;
  required: boolean;
  inputJson: unknown;
  descriptionJson: unknown;
  sortOrder: number;
}

export interface FormStepDefinitionInput {
  key: string;
  label: string | null;
  descriptionJson: unknown;
  fields: readonly FormStepFieldInput[];
}

export interface CreateFormStepParams {
  workflowId: string;
  stepDefinition: FormStepDefinitionInput;
}

export interface UpdateFormStepParams {
  formStepId: string;
  stepDefinition: FormStepDefinitionInput;
}

export interface CreateEdgeParams {
  workflowId: string;
  fromStepId: string | null;
  toStepId: string | null;
  edgeKey: string | null;
}

export interface FormStepRow {
  id: string;
  workflowId: string;
  key: string;
  label: string | null;
  descriptionJson: unknown;
}

export interface FormFieldRow {
  id: string;
  formStepId: string;
  key: string;
  label: string | null;
  valueType: string;
  required: boolean;
  inputJson: unknown;
  descriptionJson: unknown;
  sortOrder: number;
}

export interface FormStepWithFields {
  formStep: FormStepRow;
  fields: readonly FormFieldRow[];
}

export class FormStepRepository extends Context.Tag("@chiron/db/repositories/FormStepRepository")<
  FormStepRepository,
  {
    readonly createFormStep: (
      params: CreateFormStepParams,
    ) => Effect.Effect<FormStepWithFields, RepositoryError>;
    readonly updateFormStep: (
      params: UpdateFormStepParams,
    ) => Effect.Effect<FormStepWithFields | null, RepositoryError>;
    readonly getFormStep: (
      formStepId: string,
    ) => Effect.Effect<FormStepWithFields | null, RepositoryError>;
    readonly listFormSteps: (
      workflowId: string,
    ) => Effect.Effect<readonly FormStepWithFields[], RepositoryError>;
    readonly deleteFormStep: (formStepId: string) => Effect.Effect<void, RepositoryError>;
    readonly createEdge: (params: CreateEdgeParams) => Effect.Effect<string, RepositoryError>;
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

function toFormStepRow(row: typeof methodologyWorkflowFormSteps.$inferSelect): FormStepRow {
  return {
    id: row.id,
    workflowId: row.workflowId,
    key: row.key,
    label: row.label,
    descriptionJson: row.descriptionJson,
  };
}

function toFormFieldRow(row: typeof methodologyWorkflowFormFields.$inferSelect): FormFieldRow {
  return {
    id: row.id,
    formStepId: row.formStepId,
    key: row.key,
    label: row.label,
    valueType: row.valueType,
    required: row.required,
    inputJson: row.inputJson,
    descriptionJson: row.descriptionJson,
    sortOrder: row.sortOrder,
  };
}

async function readFormStep(db: DB | Tx, formStepId: string): Promise<FormStepWithFields | null> {
  const steps = await db
    .select()
    .from(methodologyWorkflowFormSteps)
    .where(eq(methodologyWorkflowFormSteps.id, formStepId))
    .limit(1);
  const step = steps[0];
  if (!step) {
    return null;
  }

  const fields = await db
    .select()
    .from(methodologyWorkflowFormFields)
    .where(eq(methodologyWorkflowFormFields.formStepId, formStepId))
    .orderBy(asc(methodologyWorkflowFormFields.sortOrder), asc(methodologyWorkflowFormFields.id));

  return {
    formStep: toFormStepRow(step),
    fields: fields.map(toFormFieldRow),
  };
}

export function createFormStepRepoLayer(db: DB): Layer.Layer<FormStepRepository> {
  return Layer.succeed(FormStepRepository, {
    createFormStep: (params) =>
      dbEffect("form-step.create", async () => {
        return db.transaction(async (tx) => {
          const workflowRows = await tx
            .select({ methodologyVersionId: methodologyWorkflows.methodologyVersionId })
            .from(methodologyWorkflows)
            .where(eq(methodologyWorkflows.id, params.workflowId))
            .limit(1);
          const workflow = workflowRows[0];
          if (!workflow) {
            throw new Error(`Unknown workflow '${params.workflowId}'`);
          }

          const sharedStepId = crypto.randomUUID();
          await tx.insert(methodologyWorkflowSteps).values({
            id: sharedStepId,
            methodologyVersionId: workflow.methodologyVersionId,
            workflowId: params.workflowId,
            key: params.stepDefinition.key,
            type: "form",
            displayName: params.stepDefinition.label,
            configJson: null,
            guidanceJson: null,
          });

          await tx.insert(methodologyWorkflowFormSteps).values({
            id: sharedStepId,
            workflowId: params.workflowId,
            key: params.stepDefinition.key,
            label: params.stepDefinition.label,
            descriptionJson: params.stepDefinition.descriptionJson,
          });

          for (const field of params.stepDefinition.fields) {
            await tx.insert(methodologyWorkflowFormFields).values({
              formStepId: sharedStepId,
              key: field.key,
              label: field.label,
              valueType: field.valueType,
              required: field.required,
              inputJson: field.inputJson,
              descriptionJson: field.descriptionJson,
              sortOrder: field.sortOrder,
            });
          }

          const created = await readFormStep(tx, sharedStepId);
          if (!created) {
            throw new Error("Failed to create form step");
          }

          return created;
        });
      }),

    updateFormStep: (params) =>
      dbEffect("form-step.update", async () => {
        return db.transaction(async (tx) => {
          const rows = await tx
            .update(methodologyWorkflowFormSteps)
            .set({
              key: params.stepDefinition.key,
              label: params.stepDefinition.label,
              descriptionJson: params.stepDefinition.descriptionJson,
            })
            .where(eq(methodologyWorkflowFormSteps.id, params.formStepId))
            .returning();

          const updated = rows[0];
          if (!updated) {
            return null;
          }

          await tx
            .update(methodologyWorkflowSteps)
            .set({
              key: params.stepDefinition.key,
              type: "form",
              displayName: params.stepDefinition.label,
            })
            .where(eq(methodologyWorkflowSteps.id, params.formStepId));

          await tx
            .delete(methodologyWorkflowFormFields)
            .where(eq(methodologyWorkflowFormFields.formStepId, params.formStepId));

          for (const field of params.stepDefinition.fields) {
            await tx.insert(methodologyWorkflowFormFields).values({
              formStepId: params.formStepId,
              key: field.key,
              label: field.label,
              valueType: field.valueType,
              required: field.required,
              inputJson: field.inputJson,
              descriptionJson: field.descriptionJson,
              sortOrder: field.sortOrder,
            });
          }

          return readFormStep(tx, updated.id);
        });
      }),

    getFormStep: (formStepId) => dbEffect("form-step.get", () => readFormStep(db, formStepId)),

    listFormSteps: (workflowId) =>
      dbEffect("form-step.list", async () => {
        const steps = await db
          .select()
          .from(methodologyWorkflowFormSteps)
          .where(eq(methodologyWorkflowFormSteps.workflowId, workflowId))
          .orderBy(
            asc(methodologyWorkflowFormSteps.createdAt),
            asc(methodologyWorkflowFormSteps.id),
          );

        const results: FormStepWithFields[] = [];
        for (const step of steps) {
          const hydrated = await readFormStep(db, step.id);
          if (hydrated) {
            results.push(hydrated);
          }
        }
        return results;
      }),

    deleteFormStep: (formStepId) =>
      dbEffect("form-step.delete", async () => {
        await db
          .delete(methodologyWorkflowFormSteps)
          .where(eq(methodologyWorkflowFormSteps.id, formStepId));
        await db
          .delete(methodologyWorkflowSteps)
          .where(eq(methodologyWorkflowSteps.id, formStepId));
      }),

    createEdge: (params) =>
      dbEffect("form-step.create-edge", async () => {
        if (params.fromStepId !== null) {
          const rows = await db
            .select({ count: count() })
            .from(methodologyWorkflowEdges)
            .where(
              and(
                eq(methodologyWorkflowEdges.workflowId, params.workflowId),
                eq(methodologyWorkflowEdges.fromStepId, params.fromStepId),
              ),
            );
          if ((rows[0]?.count ?? 0) > 0) {
            throw new Error("Slice-1 allows exactly one outgoing edge per step");
          }
        }

        const workflowRows = await db
          .select({ methodologyVersionId: methodologyWorkflows.methodologyVersionId })
          .from(methodologyWorkflows)
          .where(eq(methodologyWorkflows.id, params.workflowId))
          .limit(1);
        const workflow = workflowRows[0];
        if (!workflow) {
          throw new Error(`Unknown workflow '${params.workflowId}'`);
        }

        const inserted = await db
          .insert(methodologyWorkflowEdges)
          .values({
            workflowId: params.workflowId,
            methodologyVersionId: workflow.methodologyVersionId,
            fromStepId: params.fromStepId,
            toStepId: params.toStepId,
            edgeKey: params.edgeKey,
            conditionJson: null,
            guidanceJson: null,
          })
          .returning({ id: methodologyWorkflowEdges.id });

        const edge = inserted[0];
        if (!edge) {
          throw new Error("Failed to create workflow edge");
        }

        return edge.id;
      }),
  });
}
