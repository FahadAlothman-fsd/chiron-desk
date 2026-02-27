import { Data } from "effect";

export class MethodologyNotFoundError extends Data.TaggedError("MethodologyNotFoundError")<{
  readonly key: string;
}> {}

export class VersionNotFoundError extends Data.TaggedError("VersionNotFoundError")<{
  readonly versionId: string;
}> {}

export class VersionNotDraftError extends Data.TaggedError("VersionNotDraftError")<{
  readonly versionId: string;
  readonly currentStatus: string;
}> {}

export class DuplicateVersionError extends Data.TaggedError("DuplicateVersionError")<{
  readonly methodologyId: string;
  readonly version: string;
}> {}

export class ValidationDecodeError extends Data.TaggedError("ValidationDecodeError")<{
  readonly message: string;
}> {}

export type RepositoryErrorCode =
  | "VERSION_NOT_FOUND"
  | "PUBLISHED_CONTRACT_IMMUTABLE"
  | "PUBLISH_VERSION_ALREADY_EXISTS"
  | "PUBLISH_CONCURRENT_WRITE_CONFLICT"
  | "PUBLISH_ATOMICITY_GUARD_ABORTED"
  | "PROJECT_PIN_TARGET_VERSION_NOT_FOUND"
  | "PROJECT_PIN_TARGET_VERSION_INCOMPATIBLE"
  | "PROJECT_REPIN_BLOCKED_EXECUTION_HISTORY"
  | "PROJECT_REPIN_REQUIRES_EXISTING_PIN"
  | "PROJECT_PIN_ATOMICITY_GUARD_ABORTED";

export class RepositoryError extends Data.TaggedError("RepositoryError")<{
  readonly operation: string;
  readonly cause: unknown;
  readonly code?: RepositoryErrorCode;
}> {}

export type MethodologyError =
  | MethodologyNotFoundError
  | VersionNotFoundError
  | VersionNotDraftError
  | DuplicateVersionError
  | ValidationDecodeError
  | RepositoryError;

export class LifecycleValidationError extends Data.TaggedError("LifecycleValidationError")<{
  readonly versionId: string;
  readonly message: string;
}> {}

export type LifecycleError = LifecycleValidationError | RepositoryError;
