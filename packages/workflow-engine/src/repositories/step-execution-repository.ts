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
  progressionData: unknown;
}

export interface RuntimeFormStepExecutionStateRow {
  id: string;
  stepExecutionId: string;
  draftValuesJson: unknown;
  submittedSnapshotJson: unknown;
  submittedAt: Date | null;
}

export interface RuntimeWorkflowExecutionContextFactRow {
  id: string;
  workflowExecutionId: string;
  factKey: string;
  factKind: string;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
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
  progressionData: unknown;
}

export interface UpsertRuntimeFormStepExecutionStateParams {
  stepExecutionId: string;
  draftValuesJson: unknown;
  submittedSnapshotJson: unknown;
  submittedAt: Date | null;
}

export interface WriteRuntimeWorkflowExecutionContextFactParams {
  workflowExecutionId: string;
  factKey: string;
  factKind: string;
  valueJson: unknown;
  sourceStepExecutionId: string | null;
}

export interface CompleteRuntimeStepExecutionParams {
  stepExecutionId: string;
  progressionData: unknown;
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
    readonly upsertFormStepExecutionState: (
      params: UpsertRuntimeFormStepExecutionStateParams,
    ) => Effect.Effect<RuntimeFormStepExecutionStateRow, RepositoryError>;
    readonly getFormStepExecutionState: (
      stepExecutionId: string,
    ) => Effect.Effect<RuntimeFormStepExecutionStateRow | null, RepositoryError>;
    readonly writeWorkflowExecutionContextFact: (
      params: WriteRuntimeWorkflowExecutionContextFactParams,
    ) => Effect.Effect<RuntimeWorkflowExecutionContextFactRow, RepositoryError>;
    readonly listWorkflowExecutionContextFacts: (
      workflowExecutionId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowExecutionContextFactRow[], RepositoryError>;
    readonly listWorkflowStepDefinitions: (
      workflowId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowStepDefinitionRow[], RepositoryError>;
    readonly listWorkflowEdges: (
      workflowId: string,
    ) => Effect.Effect<readonly RuntimeWorkflowEdgeRow[], RepositoryError>;
  }
>() {}
