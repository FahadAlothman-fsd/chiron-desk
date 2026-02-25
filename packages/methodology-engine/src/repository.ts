import type {
  CreateDraftVersionInput,
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

export interface WorkflowSnapshot {
  workflows: readonly WorkflowDefinition[];
  transitionWorkflowBindings: MethodologyVersionDefinition["transitionWorkflowBindings"];
  guidance?: LayeredGuidance;
}

export class MethodologyRepository extends Context.Tag("MethodologyRepository")<
  MethodologyRepository,
  {
    readonly findDefinitionByKey: (
      key: string,
    ) => Effect.Effect<MethodologyDefinitionRow | null, RepositoryError>;
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
  }
>() {}
