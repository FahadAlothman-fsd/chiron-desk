import { Context, type Effect } from "effect";
import type { MethodologyVersionRow, UpdateDraftParams, WorkflowSnapshot } from "../repository";
import type { RepositoryError } from "../errors";

export class VersionRepository extends Context.Tag(
  "@chiron/methodology-engine/ports/VersionRepository",
)<
  VersionRepository,
  {
    readonly findVersionById: (
      versionId: string,
    ) => Effect.Effect<MethodologyVersionRow | null, RepositoryError>;
    readonly findWorkflowSnapshot: (
      versionId: string,
    ) => Effect.Effect<WorkflowSnapshot, RepositoryError>;
    readonly updateDraftVersionMetadata: (
      params: UpdateDraftParams,
    ) => Effect.Effect<MethodologyVersionRow, RepositoryError>;
  }
>() {}
