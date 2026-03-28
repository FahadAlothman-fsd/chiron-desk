import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";
import type { TransitionExecutionRow } from "./transition-execution-repository";
import type { WorkflowExecutionRow } from "./workflow-execution-repository";

export interface TransitionExecutionDetailReadModel {
  transitionExecution: TransitionExecutionRow;
  projectId: string;
  workUnitTypeId: string;
  currentStateId: string;
  activeTransitionExecutionId: string | null;
  primaryWorkflowExecution: WorkflowExecutionRow | null;
}

export interface WorkflowExecutionDetailReadModel {
  workflowExecution: WorkflowExecutionRow;
  transitionExecution: TransitionExecutionRow;
  projectId: string;
  projectWorkUnitId: string;
  workUnitTypeId: string;
  currentStateId: string;
}

export interface ActiveWorkflowExecutionReadModel {
  workflowExecution: WorkflowExecutionRow;
  transitionExecution: TransitionExecutionRow;
  projectWorkUnitId: string;
  projectId: string;
}

export class ExecutionReadRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/ExecutionReadRepository",
)<
  ExecutionReadRepository,
  {
    readonly getTransitionExecutionDetail: (
      transitionExecutionId: string,
    ) => Effect.Effect<TransitionExecutionDetailReadModel | null, RepositoryError>;
    readonly listTransitionExecutionsForWorkUnit: (
      projectWorkUnitId: string,
    ) => Effect.Effect<readonly TransitionExecutionRow[], RepositoryError>;
    readonly getWorkflowExecutionDetail: (
      workflowExecutionId: string,
    ) => Effect.Effect<WorkflowExecutionDetailReadModel | null, RepositoryError>;
    readonly listWorkflowExecutionsForTransition: (
      transitionExecutionId: string,
    ) => Effect.Effect<readonly WorkflowExecutionRow[], RepositoryError>;
    readonly listActiveWorkflowExecutionsByProject: (
      projectId: string,
    ) => Effect.Effect<readonly ActiveWorkflowExecutionReadModel[], RepositoryError>;
  }
>() {}
