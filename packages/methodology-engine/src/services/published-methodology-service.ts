import type { MethodologyVersionProjection } from "@chiron/contracts/methodology/projection";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError, VersionNotFoundError } from "../errors";
import {
  MethodologyVersionService as LegacyMethodologyVersionService,
  type GetPublishedContractInput,
  type PublishedContractQueryResult,
} from "../version-service";

export class PublishedMethodologyService extends Context.Tag("PublishedMethodologyService")<
  PublishedMethodologyService,
  {
    readonly getDraftProjection: (
      versionId: string,
    ) => Effect.Effect<
      MethodologyVersionProjection,
      VersionNotFoundError | ValidationDecodeError | RepositoryError,
      LegacyMethodologyVersionService
    >;
    readonly getPublishedContractByVersionAndWorkUnitType: (
      input: GetPublishedContractInput,
    ) => Effect.Effect<
      PublishedContractQueryResult,
      VersionNotFoundError | RepositoryError,
      LegacyMethodologyVersionService
    >;
  }
>() {}

export const PublishedMethodologyServiceLive = Layer.succeed(PublishedMethodologyService, {
  getDraftProjection: (versionId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.getDraftProjection(versionId),
    ),
  getPublishedContractByVersionAndWorkUnitType: (input) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.getPublishedContractByVersionAndWorkUnitType(input),
    ),
});
