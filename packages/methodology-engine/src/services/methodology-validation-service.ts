import type {
  ValidateDraftVersionInput,
  ValidationResult,
} from "@chiron/contracts/methodology/version";
import { Context, Effect, Layer } from "effect";

import { RepositoryError, VersionNotDraftError, VersionNotFoundError } from "../errors";
import { MethodologyVersionService as LegacyMethodologyVersionService } from "../version-service";

export class MethodologyValidationService extends Context.Tag("MethodologyValidationService")<
  MethodologyValidationService,
  {
    readonly validateDraftVersion: (
      input: ValidateDraftVersionInput,
      actorId: string | null,
    ) => Effect.Effect<
      ValidationResult,
      VersionNotFoundError | VersionNotDraftError | RepositoryError,
      LegacyMethodologyVersionService
    >;
  }
>() {}

export const MethodologyValidationServiceLive = Layer.succeed(MethodologyValidationService, {
  validateDraftVersion: (input, actorId) =>
    Effect.flatMap(LegacyMethodologyVersionService, (service) =>
      service.validateDraftVersion(input, actorId),
    ),
});
