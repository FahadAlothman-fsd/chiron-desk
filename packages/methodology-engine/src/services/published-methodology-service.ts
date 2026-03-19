import type { MethodologyVersionProjection } from "@chiron/contracts/methodology/projection";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, ValidationDecodeError, VersionNotFoundError } from "../errors";
import {
  MethodologyVersionServiceLive as CoreMethodologyVersionServiceLive,
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
      VersionNotFoundError | ValidationDecodeError | RepositoryError
    >;
    readonly getPublishedContractByVersionAndWorkUnitType: (
      input: GetPublishedContractInput,
    ) => Effect.Effect<PublishedContractQueryResult, VersionNotFoundError | RepositoryError>;
  }
>() {}

export const PublishedMethodologyServiceLive = Layer.effect(
  PublishedMethodologyService,
  Effect.gen(function* () {
    const coreService = yield* CoreMethodologyVersionServiceLive;

    return PublishedMethodologyService.of({
      getDraftProjection: (versionId) => coreService.getDraftProjection(versionId),
      getPublishedContractByVersionAndWorkUnitType: (input) =>
        coreService.getPublishedContractByVersionAndWorkUnitType(input),
    });
  }),
);
