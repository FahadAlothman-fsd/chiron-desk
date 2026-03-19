import { Context, type Effect } from "effect";
import type { RepositoryError } from "../errors";

export type WorkUnitMetadata = {
  readonly key: string;
  readonly displayName?: string;
  readonly description?: string;
  readonly guidance?: unknown;
  readonly cardinality?: "one_per_project" | "many_per_project";
};

export class WorkUnitRepository extends Context.Tag(
  "@chiron/methodology-engine/ports/WorkUnitRepository",
)<
  WorkUnitRepository,
  {
    readonly createMetadata: (
      versionId: string,
      workUnit: WorkUnitMetadata,
    ) => Effect.Effect<void, RepositoryError>;
    readonly updateMetadata: (
      versionId: string,
      workUnitKey: string,
      workUnit: WorkUnitMetadata,
    ) => Effect.Effect<void, RepositoryError>;
    readonly deleteMetadata: (
      versionId: string,
      workUnitKey: string,
    ) => Effect.Effect<void, RepositoryError>;
  }
>() {}
