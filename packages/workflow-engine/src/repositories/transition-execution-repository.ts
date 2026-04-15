import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";
import type { CompleteTransitionExecutionOutput } from "@chiron/contracts/runtime/executions";

export type TransitionExecutionStatus = "active" | "completed" | "superseded";

export interface TransitionExecutionRow {
  id: string;
  projectWorkUnitId: string;
  transitionId: string;
  status: TransitionExecutionStatus;
  primaryWorkflowExecutionId: string | null;
  supersededByTransitionExecutionId: string | null;
  startedAt: Date;
  completedAt: Date | null;
  supersededAt: Date | null;
}

export interface CreateTransitionExecutionParams {
  projectWorkUnitId: string;
  transitionId: string;
  status?: TransitionExecutionStatus;
  primaryWorkflowExecutionId?: string | null;
  supersededByTransitionExecutionId?: string | null;
  completedAt?: Date | null;
  supersededAt?: Date | null;
}

export interface StartTransitionExecutionParams {
  projectWorkUnitId: string;
  transitionId: string;
}

export interface SwitchActiveTransitionExecutionParams {
  projectWorkUnitId: string;
  transitionId: string;
}

export interface SwitchActiveTransitionExecutionResult {
  started: TransitionExecutionRow;
  superseded: TransitionExecutionRow | null;
}

export interface CompleteTransitionExecutionAtomicallyParams {
  transitionExecutionId: string;
  projectWorkUnitId: string;
  newStateId: string;
  newStateKey: string;
  newStateLabel: string;
}

export class TransitionExecutionRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/TransitionExecutionRepository",
)<
  TransitionExecutionRepository,
  {
    readonly createTransitionExecution: (
      params: CreateTransitionExecutionParams,
    ) => Effect.Effect<TransitionExecutionRow, RepositoryError>;
    readonly startTransitionExecution: (
      params: StartTransitionExecutionParams,
    ) => Effect.Effect<TransitionExecutionRow, RepositoryError>;
    readonly switchActiveTransitionExecution: (
      params: SwitchActiveTransitionExecutionParams,
    ) => Effect.Effect<SwitchActiveTransitionExecutionResult, RepositoryError>;
    readonly getActiveTransitionExecutionForWorkUnit: (
      projectWorkUnitId: string,
    ) => Effect.Effect<TransitionExecutionRow | null, RepositoryError>;
    readonly getTransitionExecutionById: (
      transitionExecutionId: string,
    ) => Effect.Effect<TransitionExecutionRow | null, RepositoryError>;
    readonly completeTransitionExecutionAtomically?: (
      params: CompleteTransitionExecutionAtomicallyParams,
    ) => Effect.Effect<CompleteTransitionExecutionOutput, RepositoryError>;
  }
>() {}
