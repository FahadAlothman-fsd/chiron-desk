import { Context, type Effect } from "effect";

import type { WorkflowContextFactKind } from "@chiron/contracts/methodology/workflow";

import type { RepositoryError } from "../errors";

export interface AgentStepExecutionAppliedWriteRow {
  id: string;
  stepExecutionId: string;
  writeItemId: string;
  contextFactDefinitionId: string;
  contextFactKind: WorkflowContextFactKind;
  instanceOrder: number;
  appliedValueJson: unknown;
  createdAt: Date;
}

export interface CreateAgentStepExecutionAppliedWriteParams {
  stepExecutionId: string;
  writeItemId: string;
  contextFactDefinitionId: string;
  contextFactKind: WorkflowContextFactKind;
  instanceOrder: number;
  appliedValueJson: unknown;
}

export class AgentStepExecutionAppliedWriteRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/AgentStepExecutionAppliedWriteRepository",
)<
  AgentStepExecutionAppliedWriteRepository,
  {
    readonly createAppliedWrite: (
      params: CreateAgentStepExecutionAppliedWriteParams,
    ) => Effect.Effect<AgentStepExecutionAppliedWriteRow, RepositoryError>;
    readonly listAppliedWritesByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<readonly AgentStepExecutionAppliedWriteRow[], RepositoryError>;
  }
>() {}
