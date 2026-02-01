import { Data, Effect } from "effect";

export type ToolType = "update-variable" | "ax-generation" | "action" | "custom";

export type ToolExecutionResult = unknown;

export type ToolExecutionContext = {
  executionId: string;
  stepId: string;
  eventBus: {
    publish: (event: unknown) => Effect.Effect<void, unknown>;
  };
};

export type ToolConfig = {
  name: string;
  type: ToolType;
  targetVariable?: string;
};

export class ToolingEngineError extends Data.TaggedError("ToolingEngineError")<{
  readonly cause: unknown;
}> {}

export const validateToolArgs = (
  _toolConfig: ToolConfig,
  _args: Record<string, unknown>,
): Effect.Effect<void, ToolingEngineError> =>
  Effect.fail(new ToolingEngineError({ cause: "ToolingEngine not wired" }));

export const evaluateToolApproval = (_params: {
  toolConfig: ToolConfig;
  args: Record<string, unknown>;
  context: ToolExecutionContext;
  toolCallId?: string;
  userId?: string;
}): Effect.Effect<{ status: "pending" | "approved"; toolCallId: string }, ToolingEngineError> =>
  Effect.fail(new ToolingEngineError({ cause: "ToolingEngine not wired" }));

export const executeTool = (
  _toolName: string,
  _toolType: ToolType,
  _args: Record<string, unknown>,
  _context: ToolExecutionContext,
  _options?: { targetVariable?: string; toolCallId?: string },
): Effect.Effect<ToolExecutionResult, ToolingEngineError> =>
  Effect.fail(new ToolingEngineError({ cause: "ToolingEngine not wired" }));
