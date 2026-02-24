import type {
  FactSchema,
  LifecycleState,
  LifecycleTransition,
  TransitionRequiredLink,
  ValidationResult,
  WorkUnitTypeDefinition,
} from "@chiron/contracts/methodology/lifecycle";
import type { MethodologyVersionEventRow, MethodologyVersionRow } from "./repository.js";
import { Context, Effect } from "effect";

// Row types for lifecycle entities
export interface WorkUnitTypeRow {
  id: string;
  methodologyVersionId: string;
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface LifecycleTransitionRow {
  id: string;
  methodologyVersionId: string;
  workUnitTypeId: string;
  fromStateId: string | null; // NULL = __absent__
  toStateId: string;
  transitionKey: string;
  gateClass: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FactSchemaRow {
  id: string;
  methodologyVersionId: string;
  workUnitTypeId: string;
  key: string;
  factType: string;
  required: boolean;
  defaultValueJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface TransitionRequiredLinkRow {
  id: string;
  methodologyVersionId: string;
  transitionId: string;
  linkTypeKey: string;
  strength: string;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Parameters for save operations
export interface SaveLifecycleDefinitionParams {
  versionId: string;
  workUnitTypes: WorkUnitTypeDefinition[];
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
    readonly findWorkUnitTypes: (versionId: string) => Effect.Effect<readonly WorkUnitTypeRow[]>;
    readonly findLifecycleStates: (
      versionId: string,
      workUnitTypeId?: string,
    ) => Effect.Effect<readonly LifecycleStateRow[]>;
    readonly findLifecycleTransitions: (
      versionId: string,
      options?: {
        workUnitTypeId?: string;
        fromStateId?: string | null;
        toStateId?: string;
      },
    ) => Effect.Effect<readonly LifecycleTransitionRow[]>;
    readonly findFactSchemas: (
      versionId: string,
      workUnitTypeId?: string,
    ) => Effect.Effect<readonly FactSchemaRow[]>;
    readonly findTransitionRequiredLinks: (
      versionId: string,
      transitionId?: string,
    ) => Effect.Effect<readonly TransitionRequiredLinkRow[]>;

    // Transactional save - only writes if validation passed
    readonly saveLifecycleDefinition: (
      params: SaveLifecycleDefinitionParams,
    ) => Effect.Effect<SaveLifecycleResult>;

    // Event recording for evidence lineage
    readonly recordLifecycleEvent: (
      event: Omit<MethodologyVersionEventRow, "id" | "createdAt">,
    ) => Effect.Effect<MethodologyVersionEventRow>;
  }
>() {}
