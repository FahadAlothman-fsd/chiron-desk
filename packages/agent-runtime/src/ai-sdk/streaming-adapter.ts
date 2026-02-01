import { Data, Effect, Stream } from "effect";
import type { TextStreamPart } from "./ai-provider-service";
import type { AiStreamEvent } from "./events";

export class StreamingError extends Data.TaggedError("StreamingError")<{
  readonly cause: unknown;
  readonly phase: "read" | "emit" | "complete";
  readonly partialText?: string;
}> {}

export type StreamEvent = AiStreamEvent;

export type WorkflowEventBus = {
  publish: (event: unknown) => Effect.Effect<void, unknown>;
  stream: Stream.Stream<unknown, unknown>;
};

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

      if ((value as { _tag?: string })._tag === "TextChunk") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          content: string;
        };
        if (payload.executionId !== executionId) continue;
        fullText += payload.content;
        tokenIndex += 1;
        const event: AiStreamEvent = {
          type: "message.delta",
          executionId,
          stepId: payload.stepId,
          content: payload.content,
          tokenIndex,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ToolCallStarted") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolName: string;
          toolType?: string;
          toolCallId: string;
          args: unknown;
        };
        if (payload.executionId !== executionId) continue;
        lastToolCallName = payload.toolName;
        const event: AiStreamEvent = {
          type: "tool.call",
          executionId,
          stepId: payload.stepId,
          toolName: payload.toolName,
          toolType: payload.toolType,
          toolCallId: payload.toolCallId,
          args: payload.args,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ToolInputStarted") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolCallId: string;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "tool.input.start",
          executionId,
          stepId: payload.stepId,
          toolCallId: payload.toolCallId,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ToolInputDelta") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolCallId: string;
          delta: string;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "tool.input.delta",
          executionId,
          stepId: payload.stepId,
          toolCallId: payload.toolCallId,
          delta: payload.delta,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ToolCallCompleted") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolName: string;
          toolType?: string;
          toolCallId: string;
          result: unknown;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "tool.result",
          executionId,
          stepId: payload.stepId,
          toolName: payload.toolName,
          toolType: payload.toolType,
          toolCallId: payload.toolCallId,
          result: payload.result,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ApprovalRequested") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolName: string;
          toolType?: string;
          toolCallId: string;
          args?: unknown;
          riskLevel?: string;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "tool.pending",
          executionId,
          stepId: payload.stepId,
          toolName: payload.toolName,
          toolType: payload.toolType,
          toolCallId: payload.toolCallId,
          args: payload.args ?? null,
          riskLevel: payload.riskLevel,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "ApprovalResolved") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId: string;
          toolName: string;
          toolType?: string;
          toolCallId: string;
          action: "approve" | "reject" | "edit";
          editedArgs?: unknown;
          feedback?: string;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "tool.approval",
          executionId,
          stepId: payload.stepId,
          toolName: payload.toolName,
          toolType: payload.toolType,
          toolCallId: payload.toolCallId,
          action: payload.action,
          editedArgs: payload.editedArgs,
          feedback: payload.feedback,
        };

        if (!filter || filter(event)) {
          yield event;
        }
      }

      if ((value as { _tag?: string })._tag === "WorkflowError") {
        const payload = value as {
          _tag: string;
          executionId: string;
          stepId?: string;
          error: string;
        };
        if (payload.executionId !== executionId) continue;
        const event: AiStreamEvent = {
          type: "error",
          executionId,
          stepId: payload.stepId ?? executionId,
          message: payload.error,
        };
        if (!filter || filter(event)) {
          yield event;
        }
        didComplete = true;
        return;
      }

      if ((value as { _tag?: string })._tag === "StepCompleted") {
        const payload = value as { _tag: string; executionId: string; stepId: string };
        if (payload.executionId !== executionId) continue;
        const synthetic = await emitSyntheticDelta();
        if (synthetic && (!filter || filter(synthetic))) {
          yield synthetic;
        }
        const event: AiStreamEvent = {
          type: "message.complete",
          executionId,
          stepId: payload.stepId,
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

      if ((value as { _tag?: string })._tag === "WorkflowCompleted") {
        const payload = value as { _tag: string; executionId: string };
        if (payload.executionId !== executionId) continue;
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
