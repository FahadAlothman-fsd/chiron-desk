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
