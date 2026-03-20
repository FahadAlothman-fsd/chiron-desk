import { Context, Effect, Layer } from "effect";

import { RepositoryError, VersionNotFoundError } from "../errors";
import {
  MethodologyVersionServiceLive as CoreMethodologyVersionServiceLive,
  type GetPublishedContractInput,
  type PublishedContractQueryResult,
} from "../version-service";

export class PublishedMethodologyService extends Context.Tag("PublishedMethodologyService")<
  PublishedMethodologyService,
  {
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
      getPublishedContractByVersionAndWorkUnitType: (input) =>
        coreService.getPublishedContractByVersionAndWorkUnitType(input),
    });
  }),
);
