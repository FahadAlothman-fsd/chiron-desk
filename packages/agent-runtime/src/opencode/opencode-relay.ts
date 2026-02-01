import { Data, Effect } from "effect";
import type { AiStreamEvent } from "../ai-sdk/events";

export type WorkflowEventBus = {
  publish: (event: unknown) => Effect.Effect<void, unknown>;
};

export class OpenCodeRelayError extends Data.TaggedError("OpenCodeRelayError")<{
  readonly cause: unknown;
}> {}

export const relayAiStreamEvents = (
  stream: AsyncIterable<AiStreamEvent>,
  eventBus: WorkflowEventBus,
): Effect.Effect<void, OpenCodeRelayError> =>
  Effect.tryPromise({
    try: async () => {
      for await (const event of stream) {
        switch (event.type) {
          case "message.delta":
            await Effect.runPromise(
              eventBus.publish({
                _tag: "TextChunk",
                executionId: event.executionId,
                stepId: event.stepId,
                content: event.content,
              }),
            );
            break;
          case "tool.call":
            await Effect.runPromise(
              eventBus.publish({
                _tag: "ToolCallStarted",
                executionId: event.executionId,
                stepId: event.stepId,
                toolName: event.toolName,
                toolType: event.toolType,
                toolCallId: event.toolCallId,
                args: event.args,
              }),
            );
            break;
          case "tool.result":
            await Effect.runPromise(
              eventBus.publish({
                _tag: "ToolCallCompleted",
                executionId: event.executionId,
                stepId: event.stepId,
                toolName: event.toolName,
                toolType: event.toolType,
                toolCallId: event.toolCallId,
                result: event.result,
              }),
            );
            break;
          case "tool.pending":
            await Effect.runPromise(
              eventBus.publish({
                _tag: "ApprovalRequested",
                executionId: event.executionId,
                stepId: event.stepId,
                toolName: event.toolName,
                toolType: event.toolType,
                toolCallId: event.toolCallId,
                args: event.args,
                riskLevel: event.riskLevel,
              }),
            );
            break;
          case "tool.approval":
            await Effect.runPromise(
              eventBus.publish({
                _tag: "ApprovalResolved",
                executionId: event.executionId,
                stepId: event.stepId,
                toolName: event.toolName,
                toolType: event.toolType,
                toolCallId: event.toolCallId,
                action: event.action,
                editedArgs: event.editedArgs,
                feedback: event.feedback,
              }),
            );
            break;
          case "message.complete":
          case "error":
            break;
          default:
            break;
        }
      }
    },
    catch: (cause) => new OpenCodeRelayError({ cause }),
  });
