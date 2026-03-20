import type {
  CreateDraftVersionInput,
  PublicationEvidence,
  LayeredGuidance,
  MethodologyLinkTypeDefinition,
  MethodologyVersionDefinition,
  UpdateDraftVersionInput,
  ValidationResult,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import type {
  LifecycleState,
  LifecycleTransition,
  TransitionConditionSet,
} from "@chiron/contracts/methodology/lifecycle";
import type { FactSchema } from "@chiron/contracts/methodology/fact";
import { Context, Effect } from "effect";
import type { RepositoryError } from "./errors";

export interface MethodologyDefinitionRow {
  id: string;
  key: string;
  name: string;
  descriptionJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface MethodologyVersionRow {
  id: string;
  methodologyId: string;
  version: string;
  status: string;
  displayName: string;
  definitionExtensions: unknown;
  createdAt: Date;
  retiredAt: Date | null;
}

export interface MethodologyVersionEventRow {
  id: string;
  methodologyVersionId: string;
  eventType: string;
  actorId: string | null;
  changedFieldsJson: unknown;
  diagnosticsJson: unknown;
  createdAt: Date;
}

export interface CreateDraftParams {
  methodologyKey: string;
  displayName: string;
  version: string;
  definitionExtensions: unknown;
  workflows: readonly WorkflowDefinition[];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
  guidance?: LayeredGuidance;
  factDefinitions?: CreateDraftVersionInput["factDefinitions"];
  linkTypeDefinitions?: CreateDraftVersionInput["linkTypeDefinitions"];
  actorId: string | null;
  validationDiagnostics: ValidationResult;
}

export interface UpdateDraftParams {
  versionId: string;
  displayName: string;
  version: string;
  definitionExtensions: unknown;
  workflows: readonly WorkflowDefinition[];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
  guidance?: LayeredGuidance;
  factDefinitions?: UpdateDraftVersionInput["factDefinitions"];
  linkTypeDefinitions?: UpdateDraftVersionInput["linkTypeDefinitions"];
  actorId: string | null;
  changedFieldsJson: unknown;
  validationDiagnostics: ValidationResult;
}

export interface GetVersionEventsParams {
  versionId: string;
  limit?: number;
  offset?: number;
}

export interface PublishDraftVersionParams {
  versionId: string;
  publishedVersion: string;
  actorId: string | null;
  validationSummary: ValidationResult;
}

export interface GetPublicationEvidenceParams {
  methodologyVersionId: string;
}

export interface WorkflowSnapshot {
  workflows: readonly WorkflowDefinition[];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
  guidance?: LayeredGuidance;
}

export interface CreateWorkflowParams {
  versionId: string;
  workUnitTypeKey: string;
  workflow: WorkflowDefinition;
}

export interface UpdateWorkflowParams {
  versionId: string;
  workUnitTypeKey: string;
  workflowKey: string;
  workflow: WorkflowDefinition;
}

export interface DeleteWorkflowParams {
  versionId: string;
  workUnitTypeKey: string;
  workflowKey: string;
}

export interface ReplaceTransitionWorkflowBindingsParams {
  versionId: string;
  workUnitTypeKey: string;
  transitionKey: string;
  workflowKeys: readonly string[];
}

export interface DeleteWorkUnitTypeParams {
  versionId: string;
  workUnitTypeKey: string;
}

export interface ReplaceWorkUnitFactsParams {
  versionId: string;
  workUnitTypeKey: string;
  facts: readonly FactSchema[];
}

export interface ReplaceWorkUnitLifecycleStatesParams {
  versionId: string;
  workUnitTypeKey: string;
  states: readonly LifecycleState[];
}

export interface ReplaceWorkUnitLifecycleTransitionsParams {
  versionId: string;
  workUnitTypeKey: string;
  transitions: readonly LifecycleTransition[];
}

export interface ReplaceWorkUnitTransitionConditionSetsParams {
  versionId: string;
  workUnitTypeKey: string;
  transitionKey: string;
  conditionSets: readonly TransitionConditionSet[];
}

export interface PublishFactSchemaRow {
  name: string | null;
  key: string;
  factType: string;
  description: string | null;
  defaultValueJson: unknown;
  guidanceJson: unknown;
  validationJson: unknown;
}

export interface MethodologyFactDefinitionRow {
  name: string | null;
  key: string;
  valueType: string;
  descriptionJson: unknown;
  guidanceJson: unknown;
  defaultValueJson: unknown;
  validationJson: unknown;
}

export interface ArtifactSlotTemplateDefinitionRow {
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  content: string | null;
}

export interface ArtifactSlotDefinitionRow {
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  cardinality: "single" | "fileset";
  rulesJson: unknown;
  templates: readonly ArtifactSlotTemplateDefinitionRow[];
}

export interface ReplaceArtifactSlotsForWorkUnitTypeParams {
  versionId: string;
  workUnitTypeKey: string;
  slots: readonly ArtifactSlotDefinitionRow[];
}

export interface FindArtifactSlotsByWorkUnitTypeParams {
  versionId: string;
  workUnitTypeKey: string;
}

export type MethodologyLinkTypeDefinitionRow = MethodologyLinkTypeDefinition;

export class MethodologyRepository extends Context.Tag("MethodologyRepository")<
  MethodologyRepository,
  {
    readonly listDefinitions: () => Effect.Effect<
      readonly MethodologyDefinitionRow[],
      RepositoryError
    >;
    readonly createDefinition: (
      key: string,
      displayName: string,
    ) => Effect.Effect<MethodologyDefinitionRow, RepositoryError>;
    readonly updateDefinition: (
      key: string,
      displayName: string,
    ) => Effect.Effect<MethodologyDefinitionRow | null, RepositoryError>;
    readonly archiveDefinition: (
      key: string,
    ) => Effect.Effect<MethodologyDefinitionRow | null, RepositoryError>;
    readonly findDefinitionByKey: (
      key: string,
    ) => Effect.Effect<MethodologyDefinitionRow | null, RepositoryError>;
    readonly listVersionsByMethodologyId: (
      methodologyId: string,
    ) => Effect.Effect<readonly MethodologyVersionRow[], RepositoryError>;
    readonly findVersionById: (
      id: string,
    ) => Effect.Effect<MethodologyVersionRow | null, RepositoryError>;
    readonly archiveVersion: (
      versionId: string,
    ) => Effect.Effect<MethodologyVersionRow | null, RepositoryError>;
    readonly findVersionByMethodologyAndVersion: (
      methodologyId: string,
      version: string,
    ) => Effect.Effect<MethodologyVersionRow | null, RepositoryError>;
    readonly createDraft: (params: CreateDraftParams) => Effect.Effect<
      {
        version: MethodologyVersionRow;
        events: readonly MethodologyVersionEventRow[];
      },
      RepositoryError
    >;
    readonly updateDraft: (params: UpdateDraftParams) => Effect.Effect<
      {
        version: MethodologyVersionRow;
        events: readonly MethodologyVersionEventRow[];
      },
      RepositoryError
    >;
    readonly getVersionEvents: (
      params: GetVersionEventsParams,
    ) => Effect.Effect<readonly MethodologyVersionEventRow[], RepositoryError>;
    readonly recordEvent: (
      event: Omit<MethodologyVersionEventRow, "id" | "createdAt">,
    ) => Effect.Effect<MethodologyVersionEventRow, RepositoryError>;
    readonly findLinkTypeKeys: (
      versionId: string,
    ) => Effect.Effect<readonly string[], RepositoryError>;
    readonly findLinkTypeDefinitionsByVersionId: (
      versionId: string,
    ) => Effect.Effect<readonly MethodologyLinkTypeDefinitionRow[], RepositoryError>;
    readonly findWorkflowSnapshot: (
      versionId: string,
    ) => Effect.Effect<WorkflowSnapshot, RepositoryError>;
    readonly listWorkflowsByWorkUnitType?: (params: {
      versionId: string;
      workUnitTypeKey: string;
    }) => Effect.Effect<readonly WorkflowDefinition[], RepositoryError>;
    readonly createWorkflow?: (
      params: CreateWorkflowParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly updateWorkflow?: (
      params: UpdateWorkflowParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly deleteWorkflow?: (
      params: DeleteWorkflowParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceTransitionWorkflowBindings?: (
      params: ReplaceTransitionWorkflowBindingsParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly deleteWorkUnitType?: (
      params: DeleteWorkUnitTypeParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceWorkUnitFacts?: (
      params: ReplaceWorkUnitFactsParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceWorkUnitLifecycleStates?: (
      params: ReplaceWorkUnitLifecycleStatesParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceWorkUnitLifecycleTransitions?: (
      params: ReplaceWorkUnitLifecycleTransitionsParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceWorkUnitTransitionConditionSets?: (
      params: ReplaceWorkUnitTransitionConditionSetsParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly findFactSchemasByVersionId: (
      versionId: string,
    ) => Effect.Effect<readonly PublishFactSchemaRow[], RepositoryError>;
    readonly findFactDefinitionsByVersionId: (
      versionId: string,
    ) => Effect.Effect<readonly MethodologyFactDefinitionRow[], RepositoryError>;
    readonly replaceArtifactSlotsForWorkUnitType: (
      params: ReplaceArtifactSlotsForWorkUnitTypeParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly findArtifactSlotsByWorkUnitType: (
      params: FindArtifactSlotsByWorkUnitTypeParams,
    ) => Effect.Effect<readonly ArtifactSlotDefinitionRow[], RepositoryError>;
    readonly publishDraftVersion: (params: PublishDraftVersionParams) => Effect.Effect<
      {
        version: MethodologyVersionRow;
        event: MethodologyVersionEventRow;
      },
      RepositoryError
    >;
    readonly getPublicationEvidence: (
      params: GetPublicationEvidenceParams,
    ) => Effect.Effect<readonly PublicationEvidence[], RepositoryError>;
  }
>() {}
