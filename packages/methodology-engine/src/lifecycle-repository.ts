import type { AgentTypeDefinition } from "@chiron/contracts/methodology/agent";
import type { WorkUnitTypeDefinition } from "@chiron/contracts/methodology/lifecycle";
import type { ValidationResult } from "@chiron/contracts/methodology/version";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "./repository.js";
import { Context, Effect } from "effect";
import type { RepositoryError } from "./errors";

// Row types for lifecycle entities
export interface WorkUnitTypeRow {
  id: string;
  methodologyVersionId: string;
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  cardinality: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleStateRow {
  id: string;
  methodologyVersionId: string;
  workUnitTypeId: string;
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleTransitionRow {
  id: string;
  methodologyVersionId: string;
  workUnitTypeId: string;
  fromStateId: string | null; // NULL = __absent__
  toStateId: string | null;
  transitionKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FactSchemaRow {
  id: string;
  methodologyVersionId: string;
  workUnitTypeId: string;
  name: string | null;
  key: string;
  factType: string;
  description: string | null;
  defaultValueJson: unknown;
  guidanceJson: unknown;
  validationJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransitionConditionSetRow {
  id: string;
  methodologyVersionId: string;
  transitionId: string;
  key: string;
  phase: string;
  mode: string;
  groupsJson: unknown;
  guidanceJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentTypeRow {
  id: string;
  methodologyVersionId: string;
  key: string;
  displayName: string | null;
  description: string | null;
  persona: string;
  promptTemplateJson: unknown;
  promptTemplateVersion: number;
  defaultModelJson: unknown;
  mcpServersJson: unknown;
  capabilitiesJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransitionWorkflowBindingRow {
  id: string;
  methodologyVersionId: string;
  transitionId: string;
  transitionKey: string;
  workflowId: string;
  workflowKey: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Parameters for save operations
export interface SaveLifecycleDefinitionParams {
  versionId: string;
  workUnitTypes: readonly WorkUnitTypeDefinition[];
  agentTypes: readonly AgentTypeDefinition[];
  actorId: string | null;
  validationResult: ValidationResult;
  changedFieldsJson: unknown;
}

export interface SaveLifecycleResult {
  version: MethodologyVersionRow;
  events: MethodologyVersionEventRow[];
}

/**
 * Repository for lifecycle-related data access.
 * Follows transactional patterns: validation must pass before any writes.
 */
export class LifecycleRepository extends Context.Tag("LifecycleRepository")<
  LifecycleRepository,
  {
    // Query methods
    readonly findWorkUnitTypes: (
      versionId: string,
    ) => Effect.Effect<readonly WorkUnitTypeRow[], RepositoryError>;
    readonly findLifecycleStates: (
      versionId: string,
      workUnitTypeId?: string,
    ) => Effect.Effect<readonly LifecycleStateRow[], RepositoryError>;
    readonly findLifecycleTransitions: (
      versionId: string,
      options?: {
        workUnitTypeId?: string;
        fromStateId?: string | null;
        toStateId?: string;
      },
    ) => Effect.Effect<readonly LifecycleTransitionRow[], RepositoryError>;
    readonly findFactSchemas: (
      versionId: string,
      workUnitTypeId?: string,
    ) => Effect.Effect<readonly FactSchemaRow[], RepositoryError>;
    readonly findTransitionConditionSets: (
      versionId: string,
      transitionId?: string,
    ) => Effect.Effect<readonly TransitionConditionSetRow[], RepositoryError>;
    readonly findAgentTypes: (
      versionId: string,
    ) => Effect.Effect<readonly AgentTypeRow[], RepositoryError>;
    readonly findTransitionWorkflowBindings: (
      versionId: string,
      transitionId?: string,
    ) => Effect.Effect<readonly TransitionWorkflowBindingRow[], RepositoryError>;

    // Transactional save - only writes if validation passed
    readonly saveLifecycleDefinition: (
      params: SaveLifecycleDefinitionParams,
    ) => Effect.Effect<SaveLifecycleResult, RepositoryError>;

    // Event recording for evidence lineage
    readonly recordLifecycleEvent: (
      event: Omit<MethodologyVersionEventRow, "id" | "createdAt">,
    ) => Effect.Effect<MethodologyVersionEventRow, RepositoryError>;
  }
>() {}
