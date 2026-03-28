import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export type WorkflowExecutionRole = "primary" | "supporting";
export type WorkflowExecutionStatus = "active" | "completed" | "superseded" | "parent_superseded";

export interface WorkflowExecutionRow {
  id: string;
  transitionExecutionId: string;
  workflowId: string;
  workflowRole: WorkflowExecutionRole;
  status: WorkflowExecutionStatus;
  supersededByWorkflowExecutionId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  supersededAt: Date | null;
}

export interface CreateWorkflowExecutionParams {
  transitionExecutionId: string;
  workflowId: string;
  workflowRole: WorkflowExecutionRole;
  status?: WorkflowExecutionStatus;
  supersededByWorkflowExecutionId?: string | null;
  completedAt?: Date | null;
  supersededAt?: Date | null;
}

export interface RetryWorkflowExecutionResult {
  retried: WorkflowExecutionRow;
  superseded: WorkflowExecutionRow;
}

export class WorkflowExecutionRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/WorkflowExecutionRepository",
)<
  WorkflowExecutionRepository,
  {
    readonly createWorkflowExecution: (
      params: CreateWorkflowExecutionParams,
    ) => Effect.Effect<WorkflowExecutionRow, RepositoryError>;
    readonly getWorkflowExecutionById: (
      workflowExecutionId: string,
    ) => Effect.Effect<WorkflowExecutionRow | null, RepositoryError>;
    readonly markWorkflowExecutionCompleted: (
      workflowExecutionId: string,
    ) => Effect.Effect<WorkflowExecutionRow | null, RepositoryError>;
    readonly markWorkflowExecutionSuperseded: (params: {
      workflowExecutionId: string;
      supersededByWorkflowExecutionId: string;
    }) => Effect.Effect<WorkflowExecutionRow | null, RepositoryError>;
    readonly updateTransitionPrimaryWorkflowExecutionPointer: (params: {
      transitionExecutionId: string;
      primaryWorkflowExecutionId: string | null;
    }) => Effect.Effect<void, RepositoryError>;
    readonly retryWorkflowExecution: (
      workflowExecutionId: string,
    ) => Effect.Effect<RetryWorkflowExecutionResult | null, RepositoryError>;
  }
>() {}
