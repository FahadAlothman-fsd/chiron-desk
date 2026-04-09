import { Context, type Effect } from "effect";

import type { AgentStepRuntimeState } from "@chiron/contracts";

import type { RepositoryError } from "../errors";

export interface AgentStepExecutionStateRow {
  id: string;
  stepExecutionId: string;
  state: AgentStepRuntimeState;
  bootstrapAppliedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentStepExecutionStateParams {
  stepExecutionId: string;
  state?: AgentStepRuntimeState;
  bootstrapAppliedAt?: Date | null;
}

export interface UpdateAgentStepExecutionStateParams {
  stepExecutionId: string;
  state?: AgentStepRuntimeState;
  bootstrapAppliedAt?: Date | null;
}

export class AgentStepExecutionStateRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/AgentStepExecutionStateRepository",
)<
  AgentStepExecutionStateRepository,
  {
    readonly createState: (
      params: CreateAgentStepExecutionStateParams,
    ) => Effect.Effect<AgentStepExecutionStateRow, RepositoryError>;
    readonly getStateByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<AgentStepExecutionStateRow | null, RepositoryError>;
    readonly updateState: (
      params: UpdateAgentStepExecutionStateParams,
    ) => Effect.Effect<AgentStepExecutionStateRow | null, RepositoryError>;
    readonly deleteStateByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}
