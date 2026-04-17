import { Context, type Effect } from "effect";

import type {
  ActionStepRuntimeItemStatus,
  ActionStepRuntimeRowStatus,
  RuntimeActionAffectedTarget,
} from "@chiron/contracts/runtime/executions";

import type { RepositoryError } from "../errors";

export interface ActionStepExecutionRow {
  id: string;
  stepExecutionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionStepExecutionActionRow {
  id: string;
  actionStepExecutionId: string;
  actionDefinitionId: string;
  actionKind: "propagation";
  status: ActionStepRuntimeRowStatus;
  resultSummaryJson: unknown;
  resultJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionStepExecutionActionItemRow {
  id: string;
  actionExecutionId: string;
  itemDefinitionId: string;
  status: ActionStepRuntimeItemStatus;
  resultSummaryJson: unknown;
  resultJson: unknown;
  affectedTargetsJson: readonly RuntimeActionAffectedTarget[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActionStepExecutionParams {
  stepExecutionId: string;
}

export interface CreateActionStepExecutionActionParams {
  stepExecutionId: string;
  actionDefinitionId: string;
  actionKind: "propagation";
  status?: ActionStepRuntimeRowStatus;
  resultSummaryJson?: unknown;
  resultJson?: unknown;
}

export interface UpdateActionStepExecutionActionParams {
  actionExecutionId: string;
  status?: ActionStepRuntimeRowStatus;
  resultSummaryJson?: unknown;
  resultJson?: unknown;
}

export interface FindActionExecutionByDefinitionIdParams {
  stepExecutionId: string;
  actionDefinitionId: string;
}

export interface CreateActionStepExecutionActionItemParams {
  actionExecutionId: string;
  itemDefinitionId: string;
  status?: ActionStepRuntimeItemStatus;
  resultSummaryJson?: unknown;
  resultJson?: unknown;
  affectedTargetsJson?: readonly RuntimeActionAffectedTarget[] | null;
}

export interface UpdateActionStepExecutionActionItemParams {
  actionExecutionId: string;
  itemDefinitionId: string;
  status?: ActionStepRuntimeItemStatus;
  resultSummaryJson?: unknown;
  resultJson?: unknown;
  affectedTargetsJson?: readonly RuntimeActionAffectedTarget[] | null;
}

export interface FindActionItemByDefinitionIdParams {
  actionExecutionId: string;
  itemDefinitionId: string;
}

export class ActionStepRuntimeRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/ActionStepRuntimeRepository",
)<
  ActionStepRuntimeRepository,
  {
    readonly createActionStepExecution: (
      params: CreateActionStepExecutionParams,
    ) => Effect.Effect<ActionStepExecutionRow, RepositoryError>;
    readonly getActionStepExecutionByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<ActionStepExecutionRow | null, RepositoryError>;
    readonly createActionExecution: (
      params: CreateActionStepExecutionActionParams,
    ) => Effect.Effect<ActionStepExecutionActionRow, RepositoryError>;
    readonly getActionExecutionByDefinitionId: (
      params: FindActionExecutionByDefinitionIdParams,
    ) => Effect.Effect<ActionStepExecutionActionRow | null, RepositoryError>;
    readonly listActionExecutions: (
      stepExecutionId: string,
    ) => Effect.Effect<readonly ActionStepExecutionActionRow[], RepositoryError>;
    readonly updateActionExecution: (
      params: UpdateActionStepExecutionActionParams,
    ) => Effect.Effect<ActionStepExecutionActionRow | null, RepositoryError>;
    readonly createActionExecutionItem: (
      params: CreateActionStepExecutionActionItemParams,
    ) => Effect.Effect<ActionStepExecutionActionItemRow, RepositoryError>;
    readonly getActionExecutionItemByDefinitionId: (
      params: FindActionItemByDefinitionIdParams,
    ) => Effect.Effect<ActionStepExecutionActionItemRow | null, RepositoryError>;
    readonly listActionExecutionItems: (
      actionExecutionId: string,
    ) => Effect.Effect<readonly ActionStepExecutionActionItemRow[], RepositoryError>;
    readonly updateActionExecutionItem: (
      params: UpdateActionStepExecutionActionItemParams,
    ) => Effect.Effect<ActionStepExecutionActionItemRow | null, RepositoryError>;
  }
>() {}
