import type {
  StartInvokeWorkUnitTargetOutput,
  StartInvokeWorkflowTargetOutput,
} from "@chiron/contracts/runtime/executions";
import { Context, type Effect } from "effect";

import type { RepositoryError } from "../errors";

export interface InvokeStepExecutionStateRow {
  id: string;
  stepExecutionId: string;
  invokeStepDefinitionId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvokeWorkflowTargetExecutionRow {
  id: string;
  invokeStepExecutionStateId: string;
  workflowDefinitionId: string;
  workflowExecutionId: string | null;
  resolutionOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvokeWorkUnitTargetExecutionRow {
  id: string;
  invokeStepExecutionStateId: string;
  projectWorkUnitId: string | null;
  workUnitDefinitionId: string;
  transitionDefinitionId: string;
  transitionExecutionId: string | null;
  workflowDefinitionId: string | null;
  workflowExecutionId: string | null;
  resolutionOrder: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvokeWorkUnitCreatedFactInstanceRow {
  id: string;
  invokeWorkUnitTargetExecutionId: string;
  factDefinitionId: string;
  workUnitFactInstanceId: string;
  createdAt: Date;
}

export interface InvokeWorkUnitCreatedArtifactSnapshotRow {
  id: string;
  invokeWorkUnitTargetExecutionId: string;
  artifactSlotDefinitionId: string;
  artifactSnapshotId: string;
  createdAt: Date;
}

export interface CreateInvokeStepExecutionStateParams {
  stepExecutionId: string;
  invokeStepDefinitionId: string;
}

export interface CreateInvokeWorkflowTargetExecutionParams {
  invokeStepExecutionStateId: string;
  workflowDefinitionId: string;
  workflowExecutionId?: string | null;
  resolutionOrder?: number | null;
}

export interface UpdateInvokeWorkflowTargetExecutionStartParams {
  invokeWorkflowTargetExecutionId: string;
  workflowExecutionId: string;
}

export interface StartInvokeWorkflowTargetAtomicallyParams {
  invokeWorkflowTargetExecutionId: string;
  transitionExecutionId: string;
  workflowDefinitionId: string;
}

export interface CreateInvokeWorkUnitTargetExecutionParams {
  invokeStepExecutionStateId: string;
  projectWorkUnitId?: string | null;
  workUnitDefinitionId: string;
  transitionDefinitionId: string;
  transitionExecutionId?: string | null;
  workflowDefinitionId?: string | null;
  workflowExecutionId?: string | null;
  resolutionOrder?: number | null;
}

export interface UpdateInvokeWorkUnitTargetExecutionStartParams {
  invokeWorkUnitTargetExecutionId: string;
  projectWorkUnitId: string;
  transitionExecutionId: string;
  workflowDefinitionId: string;
  workflowExecutionId: string;
}

export interface StartInvokeWorkUnitTargetAtomicallyParams {
  projectId: string;
  invokeWorkUnitTargetExecutionId: string;
  workUnitDefinitionId: string;
  transitionDefinitionId: string;
  workflowDefinitionId: string;
  initialFactDefinitions: ReadonlyArray<{
    factDefinitionId: string;
    defaultValueJson: unknown;
  }>;
  initialArtifactSlotDefinitions: ReadonlyArray<{
    artifactSlotDefinitionId: string;
  }>;
}

export interface CreateInvokeWorkUnitCreatedFactInstanceParams {
  invokeWorkUnitTargetExecutionId: string;
  factDefinitionId: string;
  workUnitFactInstanceId: string;
}

export interface CreateInvokeWorkUnitCreatedArtifactSnapshotParams {
  invokeWorkUnitTargetExecutionId: string;
  artifactSlotDefinitionId: string;
  artifactSnapshotId: string;
}

export class InvokeExecutionRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/InvokeExecutionRepository",
)<
  InvokeExecutionRepository,
  {
    readonly createInvokeStepExecutionState: (
      params: CreateInvokeStepExecutionStateParams,
    ) => Effect.Effect<InvokeStepExecutionStateRow, RepositoryError>;
    readonly getInvokeStepExecutionStateByStepExecutionId: (
      stepExecutionId: string,
    ) => Effect.Effect<InvokeStepExecutionStateRow | null, RepositoryError>;
    readonly listInvokeWorkflowTargetExecutions: (
      invokeStepExecutionStateId: string,
    ) => Effect.Effect<readonly InvokeWorkflowTargetExecutionRow[], RepositoryError>;
    readonly getInvokeWorkflowTargetExecutionById: (
      invokeWorkflowTargetExecutionId: string,
    ) => Effect.Effect<InvokeWorkflowTargetExecutionRow | null, RepositoryError>;
    readonly createInvokeWorkflowTargetExecution: (
      params: CreateInvokeWorkflowTargetExecutionParams,
    ) => Effect.Effect<InvokeWorkflowTargetExecutionRow, RepositoryError>;
    readonly markInvokeWorkflowTargetExecutionStarted: (
      params: UpdateInvokeWorkflowTargetExecutionStartParams,
    ) => Effect.Effect<InvokeWorkflowTargetExecutionRow | null, RepositoryError>;
    readonly startInvokeWorkflowTargetAtomically: (
      params: StartInvokeWorkflowTargetAtomicallyParams,
    ) => Effect.Effect<StartInvokeWorkflowTargetOutput, RepositoryError>;
    readonly listInvokeWorkUnitTargetExecutions: (
      invokeStepExecutionStateId: string,
    ) => Effect.Effect<readonly InvokeWorkUnitTargetExecutionRow[], RepositoryError>;
    readonly getInvokeWorkUnitTargetExecutionById: (
      invokeWorkUnitTargetExecutionId: string,
    ) => Effect.Effect<InvokeWorkUnitTargetExecutionRow | null, RepositoryError>;
    readonly createInvokeWorkUnitTargetExecution: (
      params: CreateInvokeWorkUnitTargetExecutionParams,
    ) => Effect.Effect<InvokeWorkUnitTargetExecutionRow, RepositoryError>;
    readonly markInvokeWorkUnitTargetExecutionStarted: (
      params: UpdateInvokeWorkUnitTargetExecutionStartParams,
    ) => Effect.Effect<InvokeWorkUnitTargetExecutionRow | null, RepositoryError>;
    readonly startInvokeWorkUnitTargetAtomically: (
      params: StartInvokeWorkUnitTargetAtomicallyParams,
    ) => Effect.Effect<StartInvokeWorkUnitTargetOutput, RepositoryError>;
    readonly listInvokeWorkUnitCreatedFactInstances: (
      invokeWorkUnitTargetExecutionId: string,
    ) => Effect.Effect<readonly InvokeWorkUnitCreatedFactInstanceRow[], RepositoryError>;
    readonly createInvokeWorkUnitCreatedFactInstance: (
      params: CreateInvokeWorkUnitCreatedFactInstanceParams,
    ) => Effect.Effect<InvokeWorkUnitCreatedFactInstanceRow, RepositoryError>;
    readonly listInvokeWorkUnitCreatedArtifactSnapshots: (
      invokeWorkUnitTargetExecutionId: string,
    ) => Effect.Effect<readonly InvokeWorkUnitCreatedArtifactSnapshotRow[], RepositoryError>;
    readonly createInvokeWorkUnitCreatedArtifactSnapshot: (
      params: CreateInvokeWorkUnitCreatedArtifactSnapshotParams,
    ) => Effect.Effect<InvokeWorkUnitCreatedArtifactSnapshotRow, RepositoryError>;
  }
>() {}
