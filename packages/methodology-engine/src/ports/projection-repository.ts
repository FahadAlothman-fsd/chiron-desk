import { Context, type Effect } from "effect";
import type { MethodologyVersionProjection } from "@chiron/contracts/methodology/projection";
import type { RepositoryError } from "../errors";

export class ProjectionRepository extends Context.Tag(
  "@chiron/methodology-engine/ports/ProjectionRepository",
)<
  ProjectionRepository,
  {
    readonly getDraftProjection: (
      versionId: string,
    ) => Effect.Effect<MethodologyVersionProjection, RepositoryError>;
    readonly getPublishedProjection: (
      methodologyKey: string,
      publishedVersion: string,
    ) => Effect.Effect<MethodologyVersionProjection | null, RepositoryError>;
  }
>() {}
