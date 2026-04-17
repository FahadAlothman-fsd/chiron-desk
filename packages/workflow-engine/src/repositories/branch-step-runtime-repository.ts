import type { RuntimeConditionEvaluationTree } from "@chiron/contracts/runtime/conditions";
import type { BranchConditionMode } from "@chiron/contracts/methodology/workflow";
import { Context, type Effect } from "effect";

import type { RepositoryError } from "../errors";

export interface BranchStepExecutionRow {
  id: string;
  stepExecutionId: string;
  selectedTargetStepId: string | null;
  savedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BranchStepExecutionRouteRow {
  id: string;
  branchStepExecutionId: string;
  routeId: string;
  targetStepId: string;
  sortOrder: number;
  conditionMode: BranchConditionMode;
  isValid: boolean;
  evaluationTreeJson: RuntimeConditionEvaluationTree | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersistBranchStepExecutionRouteParams {
  routeId: string;
  targetStepId: string;
  sortOrder: number;
  conditionMode: BranchConditionMode;
  isValid: boolean;
  evaluationTreeJson?: RuntimeConditionEvaluationTree | null;
}

export interface CreateBranchStepExecutionOnActivationParams {
  stepExecutionId: string;
  routes?: readonly PersistBranchStepExecutionRouteParams[];
}

export interface SaveBranchStepSelectionParams {
  stepExecutionId: string;
  selectedTargetStepId: string | null;
}

export interface BranchStepExecutionWithRoutes {
  branch: BranchStepExecutionRow;
  routes: readonly BranchStepExecutionRouteRow[];
}

export class BranchStepRuntimeRepository extends Context.Tag(
  "@chiron/workflow-engine/repositories/BranchStepRuntimeRepository",
)<
  BranchStepRuntimeRepository,
  {
    readonly createOnActivation: (
      params: CreateBranchStepExecutionOnActivationParams,
    ) => Effect.Effect<BranchStepExecutionWithRoutes, RepositoryError>;
    readonly saveSelection: (
      params: SaveBranchStepSelectionParams,
    ) => Effect.Effect<BranchStepExecutionRow | null, RepositoryError>;
    readonly loadWithRoutes: (
      stepExecutionId: string,
    ) => Effect.Effect<BranchStepExecutionWithRoutes | null, RepositoryError>;
  }
>() {}
