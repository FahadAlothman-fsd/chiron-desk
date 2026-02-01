import { Data } from "effect";

export class AgentRuntimeError extends Data.TaggedError("AgentRuntimeError")<{
  readonly cause: unknown;
  readonly operation: "run" | "stream" | "adapter";
}> {}
