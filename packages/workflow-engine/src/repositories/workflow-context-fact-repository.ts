import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export type WorkflowContextFactRecordVerb = "create" | "update" | "remove" | "delete";

export interface WorkflowContextFactValueRow {
  id: string;
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  instanceId: string;
  instanceOrder: number;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowContextFactRecordRow {
  id: string;
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  instanceId: string | null;
  verb: WorkflowContextFactRecordVerb;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
  createdAt: Date;
}

export interface CreateWorkflowContextFactValueParams {
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  valueJson: unknown;
  sourceStepExecutionId?: string | null;
}

export interface UpdateWorkflowContextFactValueParams {
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  instanceId: string;
  valueJson: unknown;
  sourceStepExecutionId?: string | null;
}

export interface RemoveWorkflowContextFactValueParams {
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  instanceId: string;
  sourceStepExecutionId?: string | null;
}

export interface DeleteWorkflowContextFactValuesParams {
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  sourceStepExecutionId?: string | null;
}

export class WorkflowContextFactRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/WorkflowContextFactRepository",
)<
  WorkflowContextFactRepository,
  {
    readonly createFactValue: (
      params: CreateWorkflowContextFactValueParams,
    ) => Effect.Effect<WorkflowContextFactValueRow, RepositoryError>;
    readonly updateFactValue: (
      params: UpdateWorkflowContextFactValueParams,
    ) => Effect.Effect<WorkflowContextFactValueRow | null, RepositoryError>;
    readonly removeFactValue: (
      params: RemoveWorkflowContextFactValueParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly deleteFactValues: (
      params: DeleteWorkflowContextFactValuesParams,
    ) => Effect.Effect<number, RepositoryError>;
    readonly listCurrentFactValuesByDefinition: (params: {
      workflowExecutionId: string;
      contextFactDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowContextFactValueRow[], RepositoryError>;
    readonly listCurrentFactsByWorkflowExecution: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly WorkflowContextFactValueRow[], RepositoryError>;
    readonly listFactRecordsByDefinition: (params: {
      workflowExecutionId: string;
      contextFactDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowContextFactRecordRow[], RepositoryError>;
  }
>() {}
