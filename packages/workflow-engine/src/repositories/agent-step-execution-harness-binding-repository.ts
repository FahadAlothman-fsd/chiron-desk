import { Context, type Effect } from "effect";

import type { AgentStepHarnessBindingState } from "@chiron/contracts/agent-step/runtime";
import type { ModelReference } from "@chiron/contracts/methodology/agent";

import type { RepositoryError } from "../errors";

export interface AgentStepExecutionHarnessBindingRow {
  id: string;
  stepExecutionId: string;
  harnessId: string;
  bindingState: AgentStepHarnessBindingState;
  sessionId: string | null;
  serverInstanceId: string | null;
  serverBaseUrl: string | null;
  selectedAgentKey: string | null;
  selectedModelJson: ModelReference | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentStepExecutionHarnessBindingParams {
  stepExecutionId: string;
  harnessId?: string;
  bindingState?: AgentStepHarnessBindingState;
  sessionId?: string | null;
  serverInstanceId?: string | null;
  serverBaseUrl?: string | null;
  selectedAgentKey?: string | null;
  selectedModelJson?: ModelReference | null;
}

export interface UpdateAgentStepExecutionHarnessBindingParams {
  stepExecutionId: string;
  harnessId?: string;
  bindingState?: AgentStepHarnessBindingState;
  sessionId?: string | null;
  serverInstanceId?: string | null;
  serverBaseUrl?: string | null;
  selectedAgentKey?: string | null;
  selectedModelJson?: ModelReference | null;
}

export class AgentStepExecutionHarnessBindingRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/AgentStepExecutionHarnessBindingRepository",
)<
  AgentStepExecutionHarnessBindingRepository,
  {
    readonly createBinding: (
      params: CreateAgentStepExecutionHarnessBindingParams,
    ) => Effect.Effect<AgentStepExecutionHarnessBindingRow, RepositoryError>;
    readonly getBindingByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<AgentStepExecutionHarnessBindingRow | null, RepositoryError>;
    readonly updateBinding: (
      params: UpdateAgentStepExecutionHarnessBindingParams,
    ) => Effect.Effect<AgentStepExecutionHarnessBindingRow | null, RepositoryError>;
    readonly deleteBindingByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}
