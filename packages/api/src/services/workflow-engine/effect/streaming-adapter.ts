import { Data, Effect, Stream } from "effect";
import type { TextStreamPart } from "./ai-provider-service";
import type { WorkflowEventBus } from "./event-bus";
import type { AiStreamEvent } from "./ai-runtime/events";

export class StreamingError extends Data.TaggedError("StreamingError")<{
  readonly cause: unknown;
  readonly phase: "read" | "emit" | "complete";
  readonly partialText?: string;
}> {}

export type StreamEvent = AiStreamEvent;

export function aiStreamToEffectStream<A>(
  asyncIterable: AsyncIterable<A>,
): Stream.Stream<A, StreamingError> {
  return Stream.fromAsyncIterable(
    asyncIterable,
    (error) => new StreamingError({ cause: error, phase: "read" }),
  );
}

export function streamToEventBus(
  stream: AsyncIterable<TextStreamPart>,
  eventBus: WorkflowEventBus,
  executionId: string,
  sessionId: string,
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    let fullText = "";
    let tokenIndex = 0;
    const startTime = Date.now();

    const effectStream = aiStreamToEffectStream(stream);

    yield* Stream.runForEach(effectStream, (part) =>
      Effect.gen(function* () {
        switch (part.type) {
          case "text-delta":
            fullText += part.textDelta;
            tokenIndex++;
            yield* eventBus.publish({
              _tag: "TextChunk",
              executionId,
              stepId: sessionId,
              content: part.textDelta,
            });
            break;

          case "tool-call":
            yield* eventBus.publish({
              _tag: "ToolCallStarted",
              executionId,
              stepId: sessionId,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              args: part.args,
            });
            break;

          case "tool-input-start":
            if (part.toolCallId ?? part.id) {
              yield* eventBus.publish({
                _tag: "ToolInputStarted",
                executionId,
                stepId: sessionId,
                toolCallId: part.toolCallId ?? part.id ?? "",
              });
            }
            break;

          case "tool-input-delta":
            if (part.toolCallId ?? part.id) {
              yield* eventBus.publish({
                _tag: "ToolInputDelta",
                executionId,
                stepId: sessionId,
                toolCallId: part.toolCallId ?? part.id ?? "",
                delta: part.argsTextDelta ?? part.inputTextDelta ?? "",
              });
            }
            break;

          case "tool-result":
            yield* eventBus.publish({
              _tag: "ToolCallCompleted",
              executionId,
              stepId: sessionId,
              toolName: part.toolName,
              toolCallId: part.toolCallId,
              result: part.result,
            });
            break;

          case "finish":
            break;

          case "error":
            yield* Effect.fail(
              new StreamingError({
                cause: part.error,
                phase: "read",
                partialText: fullText,
              }),
            );
            break;
        }
      }),
    );

    return fullText;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.fail(
        error instanceof StreamingError
          ? error
          : new StreamingError({ cause: error, phase: "complete" }),
      ),
    ),
  );
}

export async function* eventBusToAsyncGenerator(
  eventBus: WorkflowEventBus,
  executionId: string,
  filter?: (event: StreamEvent) => boolean,
): AsyncGenerator<StreamEvent, void, unknown> {
  const stream = eventBus.stream;

  const asyncIterable = Stream.toAsyncIterable(stream);
  const iterator = asyncIterable[Symbol.asyncIterator]();
  let fullText = "";
  let tokenIndex = 0;
  const startTime = Date.now();
  let didComplete = false;
  let lastToolCallName: string | null = null;

  const emitSyntheticDelta = async () => {
    if (tokenIndex > 0 || fullText) return;
    if (!lastToolCallName) return;
    const content = `Calling tool ${lastToolCallName}...\n`;
    fullText += content;
    tokenIndex += 1;
    const event: AiStreamEvent = {
      type: "message.delta",
      executionId,
      stepId: executionId,
      content,
      tokenIndex,
    };
    if (!filter || filter(event)) {
      await Promise.resolve(event);
      return event;
    }
    return event;
  };

  try {
    while (true) {
      const { value, done } = await iterator.next();
      if (done) break;

      console.log("[AgentStream]", value._tag, value.executionId, value.stepId ?? null);

      if (value._tag === "TextChunk" && value.executionId === executionId) {
        fullText += value.content;
        tokenIndex += 1;
        const event: AiStreamEvent = {
          type: "message.delta",
          executionId,
          stepId: value.stepId,
          content: value.content,
          tokenIndex,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ToolCallStarted" && value.executionId === executionId) {
        lastToolCallName = value.toolName;
        const event: AiStreamEvent = {
          type: "tool.call",
          executionId,
          stepId: value.stepId,
          toolName: value.toolName,
          toolType: value.toolType,
          toolCallId: value.toolCallId,
          args: value.args,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ToolInputStarted" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "tool.input.start",
          executionId,
          stepId: value.stepId,
          toolCallId: value.toolCallId,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ToolInputDelta" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "tool.input.delta",
          executionId,
          stepId: value.stepId,
          toolCallId: value.toolCallId,
          delta: value.delta,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ToolCallCompleted" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "tool.result",
          executionId,
          stepId: value.stepId,
          toolName: value.toolName,
          toolType: value.toolType,
          toolCallId: value.toolCallId,
          result: value.result,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ApprovalRequested" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "tool.pending",
          executionId,
          stepId: value.stepId,
          toolName: value.toolName,
          toolType: value.toolType,
          toolCallId: value.toolCallId,
          args: value.args ?? null,
          riskLevel: value.riskLevel,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "ApprovalResolved" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "tool.approval",
          executionId,
          stepId: value.stepId,
          toolName: value.toolName,
          toolType: value.toolType,
          toolCallId: value.toolCallId,
          action: value.action,
          editedArgs: value.editedArgs,
          feedback: value.feedback,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if (value._tag === "WorkflowError" && value.executionId === executionId) {
        const event: AiStreamEvent = {
          type: "error",
          executionId,
          stepId: value.stepId ?? executionId,
          message: value.error,
        };
        if (!filter || filter(event)) {
          yield event;
        }
        didComplete = true;
        return;
      }

      if (value._tag === "StepCompleted" && value.executionId === executionId) {
        const synthetic = await emitSyntheticDelta();
        if (synthetic && (!filter || filter(synthetic))) {
          yield synthetic;
        }
        const event: AiStreamEvent = {
          type: "message.complete",
          executionId,
          stepId: value.stepId,
          fullText,
          tokenCount: tokenIndex,
          durationMs: Date.now() - startTime,
        };
        if (!filter || filter(event)) {
          yield event;
        }
        didComplete = true;
        return;
      }

      if (value._tag === "WorkflowCompleted" && value.executionId === executionId) {
        const synthetic = await emitSyntheticDelta();
        if (synthetic && (!filter || filter(synthetic))) {
          yield synthetic;
        }
        const event: AiStreamEvent = {
          type: "message.complete",
          executionId,
          stepId: executionId,
          fullText,
          tokenCount: tokenIndex,
          durationMs: Date.now() - startTime,
        };
        if (!filter || filter(event)) {
          yield event;
        }
        didComplete = true;
        return;
      }
    }
  } finally {
    if (!didComplete) {
      const synthetic = await emitSyntheticDelta();
      if (synthetic && (!filter || filter(synthetic))) {
        yield synthetic;
      }
      const completeEvent: AiStreamEvent = {
        type: "message.complete",
        executionId,
        stepId: executionId,
        fullText,
        tokenCount: tokenIndex,
        durationMs: Date.now() - startTime,
      };
      if (!filter || filter(completeEvent)) {
        yield completeEvent;
      }
    }
    if (iterator.return) {
      await iterator.return(undefined);
    }
  }
}

export function processStreamWithCallback(
  stream: AsyncIterable<TextStreamPart>,
  onChunk: (chunk: string) => void,
  onToolCall?: (toolName: string, args: unknown) => void,
  onComplete?: (fullText: string, tokenCount: number) => void,
  onError?: (error: unknown) => void,
): Effect.Effect<string, StreamingError> {
  return Effect.gen(function* () {
    let fullText = "";
    let tokenCount = 0;

    const effectStream = aiStreamToEffectStream(stream);

    yield* Stream.runForEach(effectStream, (part) =>
      Effect.sync(() => {
        switch (part.type) {
          case "text-delta":
            fullText += part.textDelta;
            tokenCount++;
            onChunk(part.textDelta);
            break;

          case "tool-call":
            onToolCall?.(part.toolName, part.args);
            break;

          case "error":
            onError?.(part.error);
            break;

          case "finish":
            break;
        }
      }),
    );

    onComplete?.(fullText, tokenCount);
    return fullText;
  }).pipe(
    Effect.catchAll((error) => {
      onError?.(error);
      return Effect.fail(
        error instanceof StreamingError
          ? error
          : new StreamingError({ cause: error, phase: "complete" }),
      );
    }),
  );
}

export function collectStreamText(
  stream: AsyncIterable<TextStreamPart>,
): Effect.Effect<{ text: string; tokenCount: number }, StreamingError> {
  return Effect.gen(function* () {
    let text = "";
    let tokenCount = 0;

    const effectStream = aiStreamToEffectStream(stream);

    yield* Stream.runForEach(effectStream, (part) =>
      Effect.sync(() => {
        if (part.type === "text-delta") {
          text += part.textDelta;
          tokenCount++;
        }
      }),
    );

    return { text, tokenCount };
  });
}
