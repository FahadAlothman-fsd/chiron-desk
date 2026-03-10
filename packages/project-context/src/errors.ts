import { Data } from "effect";

export type RepositoryErrorCode =
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
