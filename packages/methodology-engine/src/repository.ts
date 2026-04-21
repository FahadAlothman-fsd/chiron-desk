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
  ActionStepPayload,
  BranchStepPayload,
  FormStepPayload,
  InvokeStepPayload,
  WorkflowContextFactDto,
  WorkflowEdgeDto,
  WorkflowStepReadModel,
} from "@chiron/contracts/methodology/workflow";
import type { AgentStepDesignTimePayload } from "@chiron/contracts/agent-step/design-time";
import type {
  LifecycleState,
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
  rewriteWorkflowGraph?: boolean;
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
  rewriteWorkflowGraph?: boolean;
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
  transitionWorkflowBindings: Record<
    string,
    MethodologyVersionDefinition["transitionWorkflowBindings"]
  >;
  guidance?: LayeredGuidance;
}

export interface VersionWorkspaceStats {
  workUnitTypes: number;
  states: number;
  transitions: number;
  workflows: number;
  factDefinitions: number;
}

export interface WorkflowFormDefinitionReadModel {
  readonly stepId: string;
  readonly payload: FormStepPayload;
}

export interface WorkflowAgentStepDefinitionReadModel {
  readonly stepId: string;
  readonly payload: AgentStepDesignTimePayload;
}

export interface WorkflowActionStepDefinitionReadModel {
  readonly stepId: string;
  readonly payload: ActionStepPayload;
}

export interface InvokeStepDefinitionReadModel {
  readonly stepId: string;
  readonly payload: InvokeStepPayload;
}

export interface BranchStepDefinitionReadModel {
  readonly stepId: string;
  readonly payload: BranchStepPayload;
}

export type WorkflowEditorEdgeOwner = "normal" | "branch_conditional" | "branch_default";

export interface WorkflowEditorEdgeReadModel {
  readonly edgeId: string;
  readonly fromStepKey: string | null;
  readonly toStepKey: string | null;
  readonly descriptionJson?: unknown;
  readonly edgeOwner: WorkflowEditorEdgeOwner;
  readonly routeId?: string;
  readonly isDefault?: boolean;
}

export interface WorkflowEditorDefinitionReadModel {
  readonly workflow: {
    readonly workflowDefinitionId: string;
    readonly key: string;
    readonly displayName: string | null;
    readonly descriptionJson: unknown;
    readonly metadata?: unknown;
  };
  readonly steps: readonly WorkflowStepReadModel[];
  readonly edges: readonly WorkflowEditorEdgeReadModel[];
  readonly contextFacts: readonly WorkflowContextFactDto[];
  readonly formDefinitions: readonly WorkflowFormDefinitionReadModel[];
}

export interface CreateFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: FormStepPayload;
}

export interface UpdateFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: FormStepPayload;
}

export interface CreateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: ActionStepPayload;
}

export interface UpdateActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: ActionStepPayload;
}

export interface DeleteActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface GetActionStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface DeleteFormStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface CreateAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly afterStepKey: string | null;
  readonly payload: AgentStepDesignTimePayload;
}

export interface UpdateAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: AgentStepDesignTimePayload;
}

export interface DeleteAgentStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface CreateInvokeStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly payload: InvokeStepPayload;
}

export interface UpdateInvokeStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: InvokeStepPayload;
}

export interface DeleteInvokeStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface GetInvokeStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface CreateBranchStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly payload: BranchStepPayload;
}

export interface UpdateBranchStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
  readonly payload: BranchStepPayload;
}

export interface DeleteBranchStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface GetBranchStepDefinitionParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly stepId: string;
}

export interface ListWorkflowEdgesByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
}

export interface CreateWorkflowEdgeByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly fromStepKey: string | null;
  readonly toStepKey: string | null;
  readonly descriptionJson: unknown;
}

export interface UpdateWorkflowEdgeByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly edgeId: string;
  readonly fromStepKey: string | null;
  readonly toStepKey: string | null;
  readonly descriptionJson: unknown;
}

export interface DeleteWorkflowEdgeByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly edgeId: string;
}

export interface CreateWorkflowContextFactByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly fact: WorkflowContextFactDto;
}

export interface UpdateWorkflowContextFactByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly contextFactDefinitionId: string;
  readonly fact: WorkflowContextFactDto;
}

export interface DeleteWorkflowContextFactByDefinitionIdParams {
  readonly versionId: string;
  readonly workflowDefinitionId: string;
  readonly contextFactDefinitionId: string;
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

export interface CreateWorkUnitTypeParams {
  versionId: string;
  workUnitType: {
    key: string;
    displayName?: string;
    description?: unknown;
    guidance?: unknown;
    cardinality?: "one_per_project" | "many_per_project";
  };
}

export interface UpdateWorkUnitTypeParams {
  versionId: string;
  workUnitTypeKey: string;
  workUnitType: {
    key: string;
    displayName?: string;
    description?: unknown;
    guidance?: unknown;
    cardinality?: "one_per_project" | "many_per_project";
  };
}

export interface ReplaceWorkUnitFactsParams {
  versionId: string;
  workUnitTypeKey: string;
  facts: readonly FactSchema[];
}

export interface UpsertWorkUnitLifecycleStateParams {
  versionId: string;
  workUnitTypeKey: string;
  state: LifecycleState;
}

export interface DeleteWorkUnitLifecycleStateParams {
  versionId: string;
  workUnitTypeKey: string;
  stateKey: string;
  strategy: "disconnect" | "cleanup";
}

export interface UpsertWorkUnitLifecycleTransitionParams {
  versionId: string;
  workUnitTypeKey: string;
  transition: {
    transitionKey: string;
    fromState?: string | undefined;
    toState: string;
  };
}

export interface DeleteWorkUnitLifecycleTransitionParams {
  versionId: string;
  workUnitTypeKey: string;
  transitionKey: string;
}

export interface ReplaceWorkUnitTransitionConditionSetsParams {
  versionId: string;
  workUnitTypeKey: string;
  transitionKey: string;
  conditionSets: readonly TransitionConditionSet[];
}

export interface SaveWorkUnitLifecycleTransitionBundleParams {
  versionId: string;
  workUnitTypeKey: string;
  transition: {
    transitionKey: string;
    fromState?: string | undefined;
    toState: string;
  };
  conditionSets: readonly TransitionConditionSet[];
  workflowKeys: readonly string[];
}

export interface PublishFactSchemaRow {
  id: string;
  name: string | null;
  key: string;
  factType: string;
  description: string | null;
  defaultValueJson: unknown;
  guidanceJson: unknown;
  validationJson: unknown;
}

export interface MethodologyFactDefinitionRow {
  id: string;
  name: string | null;
  key: string;
  valueType: string;
  cardinality: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  defaultValueJson: unknown;
  validationJson: unknown;
}

export interface ArtifactSlotTemplateDefinitionRow {
  id: string;
  key: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  content: string | null;
}

export interface ArtifactSlotDefinitionRow {
  id: string;
  key: string;
  workUnitTypeId?: string;
  displayName: string | null;
  descriptionJson: unknown;
  guidanceJson: unknown;
  cardinality: "single" | "fileset";
  rulesJson: unknown;
  templates: readonly ArtifactSlotTemplateDefinitionRow[];
}

export interface InvokeBindingWorkUnitFactDefinitionRow {
  id: string;
  workUnitTypeId: string;
  key: string;
  factType: string;
  cardinality: string;
  validationJson: unknown;
}

export interface InvokeBindingArtifactSlotDefinitionRow {
  id: string;
  workUnitTypeId: string;
  key: string;
  cardinality: "single" | "fileset";
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
    readonly findVersionWorkspaceStats?: (
      versionId: string,
    ) => Effect.Effect<VersionWorkspaceStats, RepositoryError>;
    readonly listWorkflowsByWorkUnitType?: (params: {
      versionId: string;
      workUnitTypeKey: string;
    }) => Effect.Effect<readonly WorkflowDefinition[], RepositoryError>;
    readonly listWorkflowContextFactsByDefinitionId: (params: {
      versionId: string;
      workflowDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowContextFactDto[], RepositoryError>;
    readonly createWorkflowContextFactByDefinitionId: (
      params: CreateWorkflowContextFactByDefinitionIdParams,
    ) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
    readonly updateWorkflowContextFactByDefinitionId: (
      params: UpdateWorkflowContextFactByDefinitionIdParams,
    ) => Effect.Effect<WorkflowContextFactDto, RepositoryError>;
    readonly deleteWorkflowContextFactByDefinitionId: (
      params: DeleteWorkflowContextFactByDefinitionIdParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly createFormStepDefinition: (
      params: CreateFormStepDefinitionParams,
    ) => Effect.Effect<WorkflowFormDefinitionReadModel, RepositoryError>;
    readonly updateFormStepDefinition: (
      params: UpdateFormStepDefinitionParams,
    ) => Effect.Effect<WorkflowFormDefinitionReadModel, RepositoryError>;
    readonly deleteFormStepDefinition: (
      params: DeleteFormStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly createActionStepDefinition: (
      params: CreateActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
    readonly updateActionStepDefinition: (
      params: UpdateActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel, RepositoryError>;
    readonly deleteActionStepDefinition: (
      params: DeleteActionStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly getActionStepDefinition: (
      params: GetActionStepDefinitionParams,
    ) => Effect.Effect<WorkflowActionStepDefinitionReadModel | null, RepositoryError>;
    readonly listAgentStepDefinitions: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
    }) => Effect.Effect<readonly WorkflowAgentStepDefinitionReadModel[], RepositoryError>;
    readonly getAgentStepDefinition?: (params: {
      readonly versionId: string;
      readonly workflowDefinitionId: string;
      readonly stepId: string;
    }) => Effect.Effect<WorkflowAgentStepDefinitionReadModel, RepositoryError>;
    readonly createAgentStepDefinition: (
      params: CreateAgentStepDefinitionParams,
    ) => Effect.Effect<WorkflowAgentStepDefinitionReadModel, RepositoryError>;
    readonly updateAgentStepDefinition: (
      params: UpdateAgentStepDefinitionParams,
    ) => Effect.Effect<WorkflowAgentStepDefinitionReadModel, RepositoryError>;
    readonly deleteAgentStepDefinition: (
      params: DeleteAgentStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly createInvokeStepDefinition: (
      params: CreateInvokeStepDefinitionParams,
    ) => Effect.Effect<InvokeStepDefinitionReadModel, RepositoryError>;
    readonly updateInvokeStepDefinition: (
      params: UpdateInvokeStepDefinitionParams,
    ) => Effect.Effect<InvokeStepDefinitionReadModel, RepositoryError>;
    readonly deleteInvokeStepDefinition: (
      params: DeleteInvokeStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly getInvokeStepDefinition: (
      params: GetInvokeStepDefinitionParams,
    ) => Effect.Effect<InvokeStepDefinitionReadModel | null, RepositoryError>;
    readonly createBranchStepDefinition: (
      params: CreateBranchStepDefinitionParams,
    ) => Effect.Effect<BranchStepDefinitionReadModel, RepositoryError>;
    readonly updateBranchStepDefinition: (
      params: UpdateBranchStepDefinitionParams,
    ) => Effect.Effect<BranchStepDefinitionReadModel, RepositoryError>;
    readonly deleteBranchStepDefinition: (
      params: DeleteBranchStepDefinitionParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly getBranchStepDefinition: (
      params: GetBranchStepDefinitionParams,
    ) => Effect.Effect<BranchStepDefinitionReadModel | null, RepositoryError>;
    readonly listWorkflowEdgesByDefinitionId?: (
      params: ListWorkflowEdgesByDefinitionIdParams,
    ) => Effect.Effect<readonly WorkflowEdgeDto[], RepositoryError>;
    readonly createWorkflowEdgeByDefinitionId?: (
      params: CreateWorkflowEdgeByDefinitionIdParams,
    ) => Effect.Effect<WorkflowEdgeDto, RepositoryError>;
    readonly updateWorkflowEdgeByDefinitionId?: (
      params: UpdateWorkflowEdgeByDefinitionIdParams,
    ) => Effect.Effect<WorkflowEdgeDto, RepositoryError>;
    readonly deleteWorkflowEdgeByDefinitionId?: (
      params: DeleteWorkflowEdgeByDefinitionIdParams,
    ) => Effect.Effect<void, RepositoryError>;
    readonly getWorkflowEditorDefinition: (params: {
      versionId: string;
      workUnitTypeKey: string;
      workflowDefinitionId: string;
    }) => Effect.Effect<WorkflowEditorDefinitionReadModel, RepositoryError>;
    readonly updateWorkflowMetadataByDefinitionId: (input: {
      readonly versionId: string;
      readonly workUnitTypeKey: string;
      readonly workflowDefinitionId: string;
      readonly key: string;
      readonly displayName: string | null;
      readonly descriptionJson: unknown;
      readonly entryStepId: string | null;
    }) => Effect.Effect<
      {
        readonly workflowDefinitionId: string;
        readonly key: string;
        readonly displayName: string | null;
        readonly descriptionJson: unknown;
        readonly metadata?: unknown;
      },
      RepositoryError
    >;
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
    readonly createWorkUnitType?: (
      params: CreateWorkUnitTypeParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly updateWorkUnitType?: (
      params: UpdateWorkUnitTypeParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly replaceWorkUnitFacts?: (
      params: ReplaceWorkUnitFactsParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly upsertWorkUnitLifecycleState?: (
      params: UpsertWorkUnitLifecycleStateParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly deleteWorkUnitLifecycleState?: (
      params: DeleteWorkUnitLifecycleStateParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly upsertWorkUnitLifecycleTransition?: (
      params: UpsertWorkUnitLifecycleTransitionParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly saveWorkUnitLifecycleTransitionBundle?: (
      params: SaveWorkUnitLifecycleTransitionBundleParams,
    ) => Effect.Effect<boolean, RepositoryError>;
    readonly deleteWorkUnitLifecycleTransition?: (
      params: DeleteWorkUnitLifecycleTransitionParams,
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
    readonly findInvokeBindingWorkUnitFactDefinitionsByIds: (params: {
      versionId: string;
      ids: readonly string[];
    }) => Effect.Effect<readonly InvokeBindingWorkUnitFactDefinitionRow[], RepositoryError>;
    readonly findInvokeBindingArtifactSlotDefinitionsByIds: (params: {
      versionId: string;
      ids: readonly string[];
    }) => Effect.Effect<readonly InvokeBindingArtifactSlotDefinitionRow[], RepositoryError>;
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
