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

export type MethodologyError =
  | MethodologyNotFoundError
  | VersionNotFoundError
  | VersionNotDraftError
  | DuplicateVersionError
  | ValidationDecodeError;
