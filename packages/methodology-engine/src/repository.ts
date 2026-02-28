import type {
  CreateDraftVersionInput,
  PublicationEvidence,
  LayeredGuidance,
  MethodologyVersionDefinition,
  UpdateDraftVersionInput,
  ValidationResult,
  WorkflowDefinition,
} from "@chiron/contracts/methodology/version";
import { Context, Effect } from "effect";
import type { RepositoryError } from "./errors";

export interface MethodologyDefinitionRow {
  id: string;
  key: string;
  name: string;
  descriptionJson: unknown;
  createdAt: Date;
  updatedAt: Date;
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

export interface PinProjectMethodologyVersionParams {
  projectId: string;
  methodologyVersionId: string;
  actorId: string | null;
  previousVersion: string | null;
  newVersion: string;
}

export interface GetProjectPinLineageParams {
  projectId: string;
}

export interface GetPublicationEvidenceParams {
  methodologyVersionId: string;
}

export interface WorkflowSnapshot {
  workflows: readonly WorkflowDefinition[];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
  guidance?: LayeredGuidance;
}

export interface PublishFactSchemaRow {
  key: string;
  factType: string;
  required: boolean;
  defaultValueJson: unknown;
  guidanceJson: unknown;
}

export interface ProjectMethodologyPinRow {
  projectId: string;
  methodologyVersionId: string;
  methodologyId: string;
  methodologyKey: string;
  publishedVersion: string;
  actorId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectMethodologyPinEventRow {
  id: string;
  projectId: string;
  eventType: "pinned" | "repinned";
  actorId: string | null;
  previousVersion: string | null;
  newVersion: string;
  evidenceRef: string;
  createdAt: Date;
}

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
    readonly findDefinitionByKey: (
      key: string,
    ) => Effect.Effect<MethodologyDefinitionRow | null, RepositoryError>;
    readonly listVersionsByMethodologyId: (
      methodologyId: string,
    ) => Effect.Effect<readonly MethodologyVersionRow[], RepositoryError>;
    readonly findVersionById: (
      id: string,
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
    readonly findWorkflowSnapshot: (
      versionId: string,
    ) => Effect.Effect<WorkflowSnapshot, RepositoryError>;
    readonly findFactSchemasByVersionId: (
      versionId: string,
    ) => Effect.Effect<readonly PublishFactSchemaRow[], RepositoryError>;
    readonly publishDraftVersion: (params: PublishDraftVersionParams) => Effect.Effect<
      {
        version: MethodologyVersionRow;
        event: MethodologyVersionEventRow;
      },
      RepositoryError
    >;
    readonly findProjectPin: (
      projectId: string,
    ) => Effect.Effect<ProjectMethodologyPinRow | null, RepositoryError>;
    readonly hasPersistedExecutions: (projectId: string) => Effect.Effect<boolean, RepositoryError>;
    readonly pinProjectMethodologyVersion: (
      params: PinProjectMethodologyVersionParams,
    ) => Effect.Effect<
      {
        pin: ProjectMethodologyPinRow;
        event: ProjectMethodologyPinEventRow;
      },
      RepositoryError
    >;
    readonly repinProjectMethodologyVersion: (
      params: PinProjectMethodologyVersionParams,
    ) => Effect.Effect<
      {
        pin: ProjectMethodologyPinRow;
        event: ProjectMethodologyPinEventRow;
      },
      RepositoryError
    >;
    readonly getProjectPinLineage: (
      params: GetProjectPinLineageParams,
    ) => Effect.Effect<readonly ProjectMethodologyPinEventRow[], RepositoryError>;
    readonly getPublicationEvidence: (
      params: GetPublicationEvidenceParams,
    ) => Effect.Effect<readonly PublicationEvidence[], RepositoryError>;
  }
>() {}
