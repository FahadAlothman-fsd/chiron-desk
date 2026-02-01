import { Effect, Layer, Stream } from "effect";
import type { CoreTool } from "ai";
import type { AgentRunParams, AgentRunResult, AgentStreamEvent } from "@chiron/contracts";
import { AgentRuntimeError } from "../errors";
import { ChironAgentAdapter } from "../adapters";
import { AIProviderService } from "../ai-sdk/ai-provider-service";
import { runAiRuntime } from "../ai-sdk/ai-runtime-runner";
import { eventBusToAsyncGenerator } from "../ai-sdk/streaming-adapter";

const resolveToolContext = (params: AgentRunParams) => {
  if (!params.toolContext || !params.toolConfigs) {
    return Effect.fail(
      new AgentRuntimeError({
        cause: "Missing toolContext/toolConfigs for Chiron adapter",
        operation: "adapter",
      }),
    );
  }
  return Effect.succeed({ toolContext: params.toolContext, toolConfigs: params.toolConfigs });
};

export const ChironAgentAdapterLive = Layer.effect(
  ChironAgentAdapter,
  Effect.gen(function* () {
    const providerService = yield* AIProviderService;

    return {
      kind: "chiron" as const,
      run: (params: AgentRunParams) =>
        Effect.gen(function* () {
          const { toolContext, toolConfigs } = yield* resolveToolContext(params);
          const modelConfig = yield* providerService.parseModelString(params.model);

          const result = yield* runAiRuntime({
            executionId: params.executionId,
            stepId: params.stepId,
            modelConfig,
            messages: params.messages,
            tools: params.tools as Record<string, CoreTool>,
            toolConfigs,
            toolContext: {
              executionId: toolContext.executionId,
              stepId: toolContext.stepId,
              eventBus: {
                publish: (event) =>
                  Effect.tryPromise({
                    try: () => Promise.resolve(toolContext.eventBus.publish(event)),
                    catch: (cause) => new AgentRuntimeError({ cause, operation: "adapter" }),
                  }),
              },
            },
            allowedToolNames: params.allowedToolNames,
          }).pipe(
            Effect.mapError((cause) =>
              cause instanceof AgentRuntimeError
                ? cause
                : new AgentRuntimeError({ cause, operation: "run" }),
            ),
          );

          const runResult: AgentRunResult = {
            fullText: result.fullText,
            toolOutcomes: result.toolOutcomes.map((outcome) => ({
              toolName: outcome.toolName,
              status: outcome.status === "approved" ? "executed" : "pending",
              args: outcome.args,
              result: outcome.result,
            })),
            finishReason: result.finishReason,
            usage: result.usage as AgentRunResult["usage"],
          };

          return runResult;
        }).pipe(
          Effect.mapError((cause) =>
            cause instanceof AgentRuntimeError
              ? cause
              : new AgentRuntimeError({ cause, operation: "run" }),
          ),
        ),

      stream: (params: AgentRunParams) => {
        if (!params.toolContext?.eventBus.stream) {
          return Stream.fail(
            new AgentRuntimeError({
              cause: "Missing eventBus.stream for Chiron adapter streaming",
              operation: "stream",
            }),
          );
        }

        const workflowEventBus = {
          publish: (_event: unknown) => Effect.succeed(undefined),
          stream: Stream.fromAsyncIterable(
            params.toolContext.eventBus.stream,
            (cause) => new AgentRuntimeError({ cause, operation: "stream" }),
          ),
        };

        const generator = eventBusToAsyncGenerator(workflowEventBus, params.executionId);
        return Stream.fromAsyncIterable(
          generator,
          (cause) => new AgentRuntimeError({ cause, operation: "stream" }),
        ) as Stream.Stream<AgentStreamEvent, AgentRuntimeError>;
      },
    };
  }),
);
