import { Context, Data, Effect, Layer } from "effect";
import type { CoreMessage, CoreTool, LanguageModel } from "ai";
import {
  AIProviderService,
  type AIProviderError,
  type GenerateTextParams,
  type GenerateTextResult,
  type ModelConfig,
  type StreamResult,
  type StreamTextParams,
} from "../ai-provider-service";

export class AiRuntimeError extends Data.TaggedError("AiRuntimeError")<{
  readonly cause: unknown;
  readonly operation: "load" | "stream" | "generate";
}> {}

export interface AiRuntimeService {
  readonly _tag: "AiRuntimeService";
  loadModel: (config: ModelConfig) => Effect.Effect<LanguageModel, AiRuntimeError>;
  streamText: (params: StreamTextParams) => Effect.Effect<StreamResult, AiRuntimeError>;
  generateText: (params: GenerateTextParams) => Effect.Effect<GenerateTextResult, AiRuntimeError>;
}

export const AiRuntimeService = Context.GenericTag<AiRuntimeService>("AiRuntimeService");

export const AiRuntimeServiceLive = Layer.effect(
  AiRuntimeService,
  Effect.gen(function* () {
    const aiProvider = yield* AIProviderService;

    return {
      _tag: "AiRuntimeService" as const,
      loadModel: (config: ModelConfig) =>
        aiProvider
          .loadModel(config)
          .pipe(
            Effect.mapError(
              (cause: AIProviderError) => new AiRuntimeError({ cause, operation: "load" }),
            ),
          ),
      streamText: (params: StreamTextParams) =>
        aiProvider
          .streamText(params)
          .pipe(
            Effect.mapError(
              (cause: AIProviderError) => new AiRuntimeError({ cause, operation: "stream" }),
            ),
          ),
      generateText: (params: GenerateTextParams) =>
        aiProvider
          .generateText(params)
          .pipe(
            Effect.mapError(
              (cause: AIProviderError) => new AiRuntimeError({ cause, operation: "generate" }),
            ),
          ),
    };
  }),
);

export type { ModelConfig, StreamResult, GenerateTextResult };
export type { CoreMessage, CoreTool };
