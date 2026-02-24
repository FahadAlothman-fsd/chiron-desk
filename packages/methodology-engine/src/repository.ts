import type {
  CreateDraftVersionInput,
  UpdateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Context, Effect } from "effect";

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
  definitionJson: unknown;
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
  definitionJson: unknown;
  factDefinitions?: CreateDraftVersionInput["factDefinitions"];
  linkTypeDefinitions?: CreateDraftVersionInput["linkTypeDefinitions"];
  actorId: string | null;
  validationDiagnostics: ValidationResult;
}

export interface UpdateDraftParams {
  versionId: string;
  displayName: string;
  version: string;
  definitionJson: unknown;
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

export class MethodologyRepository extends Context.Tag("MethodologyRepository")<
  MethodologyRepository,
  {
    readonly findDefinitionByKey: (key: string) => Effect.Effect<MethodologyDefinitionRow | null>;
    readonly findVersionById: (id: string) => Effect.Effect<MethodologyVersionRow | null>;
    readonly findVersionByMethodologyAndVersion: (
      methodologyId: string,
      version: string,
    ) => Effect.Effect<MethodologyVersionRow | null>;
    readonly createDraft: (params: CreateDraftParams) => Effect.Effect<{
      version: MethodologyVersionRow;
      events: readonly MethodologyVersionEventRow[];
    }>;
    readonly updateDraft: (params: UpdateDraftParams) => Effect.Effect<{
      version: MethodologyVersionRow;
      events: readonly MethodologyVersionEventRow[];
    }>;
    readonly getVersionEvents: (
      params: GetVersionEventsParams,
    ) => Effect.Effect<readonly MethodologyVersionEventRow[]>;
    readonly recordEvent: (
      event: Omit<MethodologyVersionEventRow, "id" | "createdAt">,
    ) => Effect.Effect<MethodologyVersionEventRow>;
    readonly findLinkTypeKeys: (versionId: string) => Effect.Effect<readonly string[]>;
  }
>() {}
