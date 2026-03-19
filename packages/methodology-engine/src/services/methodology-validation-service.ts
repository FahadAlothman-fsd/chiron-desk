import type {
  ValidateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, VersionNotDraftError, VersionNotFoundError } from "../errors";
import { MethodologyVersionServiceLive as CoreMethodologyVersionServiceLive } from "../version-service";

export class MethodologyValidationService extends Context.Tag("MethodologyValidationService")<
  MethodologyValidationService,
  {
    readonly validateDraftVersion: (
      input: ValidateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      ValidationResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError
    >;
  }
>() {}

export const MethodologyValidationServiceLive = Layer.effect(
  MethodologyValidationService,
  Effect.gen(function* () {
    const coreService = yield* CoreMethodologyVersionServiceLive;

    return MethodologyValidationService.of({
      validateDraftVersion: (input, actorId) => coreService.validateDraftVersion(input, actorId),
    });
  }),
);
