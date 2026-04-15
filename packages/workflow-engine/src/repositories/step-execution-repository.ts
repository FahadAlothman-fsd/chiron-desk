import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export type RuntimeStepExecutionStatus = "active" | "completed";

export interface RuntimeStepExecutionRow {
  id: string;
  workflowExecutionId: string;
  stepDefinitionId: string;
  stepType: string;
  status: RuntimeStepExecutionStatus;
  activatedAt: Date;
  completedAt: Date | null;
  previousStepExecutionId: string | null;
}

export interface RuntimeFormStepExecutionStateRow {
  id: string;
  stepExecutionId: string;
  draftPayloadJson: unknown;
  submittedPayloadJson: unknown;
  lastDraftSavedAt: Date | null;
  submittedAt: Date | null;
}

export interface RuntimeWorkflowExecutionContextFactRow {
  id: string;
  workflowExecutionId: string;
  contextFactDefinitionId: string;
  instanceOrder: number;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RuntimeWorkflowContextFactDefinitionRow {
  id: string;
  workflowId: string;
  factKey: string;
  label: string | null;
  descriptionJson: unknown;
  factKind: string;
  cardinality: string;
  createdAt: Date;
}

export interface RuntimeWorkflowStepDefinitionRow {
  id: string;
  workflowId: string;
  key: string;
  type: string;
  createdAt: Date;
}

export interface RuntimeWorkflowEdgeRow {
  id: string;
  workflowId: string;
  fromStepId: string | null;
  toStepId: string | null;
  createdAt: Date;
}

export interface CreateRuntimeStepExecutionParams {
  workflowExecutionId: string;
  stepDefinitionId: string;
  stepType: string;
  status: RuntimeStepExecutionStatus;
  previousStepExecutionId: string | null;
}

export interface CreateRuntimeFormStepExecutionStateParams {
  stepExecutionId: string;
}

export interface UpsertRuntimeFormStepExecutionStateParams {
  stepExecutionId: string;
  draftPayloadJson: unknown;
  submittedPayloadJson: unknown;
  lastDraftSavedAt: Date | null;
  submittedAt: Date | null;
}

export interface ReplaceRuntimeWorkflowExecutionContextFactValue {
  contextFactDefinitionId: string;
  instanceOrder: number;
  valueJson: unknown;
}

export interface ReplaceRuntimeWorkflowExecutionContextFactsParams {
  workflowExecutionId: string;
  sourceStepExecutionId: string | null;
  affectedContextFactDefinitionIds: readonly string[];
  currentValues: readonly ReplaceRuntimeWorkflowExecutionContextFactValue[];
}

export interface CompleteRuntimeStepExecutionParams {
  stepExecutionId: string;
}

export class StepExecutionRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/StepExecutionRepository",
)<
  StepExecutionRepository,
  {
    readonly createStepExecution: (
      params: CreateRuntimeStepExecutionParams,
    ) => Effect.Effect<RuntimeStepExecutionRow, RepositoryError>;
    readonly getStepExecutionById: (
      stepExecutionId: string,
    ) => Effect.Effect<RuntimeStepExecutionRow | null, RepositoryError>;
    readonly findStepExecutionByWorkflowAndDefinition: (params: {
      workflowExecutionId: string;
      stepDefinitionId: string;
    }) => Effect.Effect<RuntimeStepExecutionRow | null, RepositoryError>;
    readonly listStepExecutionsForWorkflow: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly RuntimeStepExecutionRow[], RepositoryError>;
    readonly completeStepExecution: (
      params: CompleteRuntimeStepExecutionParams,
    ) => Effect.Effect<RuntimeStepExecutionRow | null, RepositoryError>;
    readonly createFormStepExecutionState: (
      params: CreateRuntimeFormStepExecutionStateParams,
    ) => Effect.Effect<RuntimeFormStepExecutionStateRow, RepositoryError>;
    readonly upsertFormStepExecutionState: (
      params: UpsertRuntimeFormStepExecutionStateParams,
    ) => Effect.Effect<RuntimeFormStepExecutionStateRow, RepositoryError>;
    readonly getFormStepExecutionState: (
      stepExecutionId: string,
    ) => Effect.Effect<RuntimeFormStepExecutionStateRow | null, RepositoryError>;
    readonly replaceWorkflowExecutionContextFacts: (
      params: ReplaceRuntimeWorkflowExecutionContextFactsParams,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
    readonly listWorkflowExecutionContextFacts: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
    readonly listWorkflowContextFactDefinitions: (
      workflowId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowContextFactDefinitionRow[], RepositoryError>;
    readonly listWorkflowStepDefinitions: (
      workflowId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowStepDefinitionRow[], RepositoryError>;
    readonly listWorkflowEdges: (
      workflowId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowEdgeRow[], RepositoryError>;
    readonly getWorkflowEntryStepId?: (
      workflowId: string,
    ) => Effect.Effect<string | null, RepositoryError>;
  }
>() {}
