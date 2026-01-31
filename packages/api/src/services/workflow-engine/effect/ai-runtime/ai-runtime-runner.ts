import { randomUUID } from "node:crypto";
import { Data, Effect, Ref, Stream } from "effect";
import type { CoreTool } from "ai";
import type { TextStreamPart, ToolCall } from "../ai-provider-service";
import { getProviderAdapter } from "./provider-adapters";
import {
  type ToolConfig,
  type ToolExecutionContext,
  type ToolExecutionResult,
  type ToolType,
  executeTool,
  validateToolArgs,
} from "../tool-builder";
import { ToolingEngineError, evaluateToolApproval } from "../tooling-engine";
import { AiRuntimeService, type ModelConfig } from "./ai-runtime-service";

export class AiRuntimeRunnerError extends Data.TaggedError("AiRuntimeRunnerError")<{
  readonly cause: unknown;
  readonly operation: "stream" | "process" | "tool" | "model";
}> {}

export interface AiRuntimeToolOutcome {
  toolCallId: string;
  toolName: string;
  toolType: ToolType;
  args: Record<string, unknown>;
  status: "pending" | "approved";
  result?: ToolExecutionResult;
}

export interface AiRuntimeRunParams {
  executionId: string;
  stepId: string;
  modelConfig: ModelConfig;
  messages: Array<{ role: string; content: unknown }>;
  tools: Record<string, CoreTool>;
  toolConfigs: ToolConfig[];
  toolContext: ToolExecutionContext;
  userId?: string;
  maxTokens?: number;
  temperature?: number;
  allowedToolNames?: string[];
  forceToolChoice?: boolean;
}

export interface AiRuntimeRunResult {
  fullText: string;
  toolOutcomes: AiRuntimeToolOutcome[];
  finishReason?: string;
  usage?: unknown;
}

const normalizeToolArgs = (args: unknown): Record<string, unknown> => {
  if (!args || typeof args !== "object") {
    return {};
  }
  return args as Record<string, unknown>;
};

const getRequiredFields = (toolConfig: ToolConfig): string[] | undefined => {
  if (toolConfig.type === "update-variable") {
    return ["value"];
  }
  if (toolConfig.type === "ax-generation") {
    return ["signature"];
  }
  return undefined;
};

export const runAiRuntime = (
  params: AiRuntimeRunParams,
): Effect.Effect<AiRuntimeRunResult, AiRuntimeRunnerError | ToolingEngineError> =>
  Effect.gen(function* () {
    const aiRuntime = yield* AiRuntimeService;
    const logToolStream = process.env.AI_RUNTIME_DEBUG_TOOL_STREAM === "1";

    const model = yield* aiRuntime
      .loadModel(params.modelConfig)
      .pipe(Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "model" })));

    const adapter = getProviderAdapter(params.modelConfig.provider);
    const prepared = adapter.prepareRequest({
      messages: params.messages as any,
      tools: params.tools,
      allowedToolNames: params.allowedToolNames,
      forceToolChoice: params.forceToolChoice,
    });

    if (logToolStream) {
      console.log("[AiRuntime] prepared request", {
        provider: params.modelConfig.provider,
        modelId: params.modelConfig.modelId,
        toolNames: prepared.tools ? Object.keys(prepared.tools) : [],
        toolChoice: prepared.toolChoice,
      });
    }

    const streamResult = yield* aiRuntime
      .streamText({
        model,
        messages: prepared.messages,
        tools: prepared.tools,
        toolChoice: prepared.toolChoice,
        maxTokens: params.maxTokens ?? 4096,
        temperature: params.temperature,
      })
      .pipe(Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "stream" })));

    const fullTextRef = yield* Ref.make("");
    const toolCallsRef = yield* Ref.make<ToolCall[]>([]);
    const toolInputBuffersRef = yield* Ref.make(new Map<string, string>());

    yield* Stream.runForEach(streamResult.fullStream, (chunk: TextStreamPart) =>
      Effect.gen(function* () {
        const part = chunk as TextStreamPart;

        if (part.type === "tool-input-start") {
          const id = part.toolCallId ?? part.id ?? randomUUID();
          if (logToolStream) {
            console.log("[AiRuntime] tool-input-start", { toolCallId: id });
          }
          yield* params.toolContext.eventBus.publish({
            _tag: "ToolInputStarted",
            executionId: params.executionId,
            stepId: params.stepId,
            toolCallId: id,
          });
          yield* Ref.update(toolInputBuffersRef, (map) => {
            const next = new Map(map);
            next.set(id, "");
            return next;
          });
          return;
        }

        if (part.type === "tool-input-delta") {
          const id = part.toolCallId ?? part.id;
          if (!id) return;
          const delta = part.argsTextDelta ?? part.inputTextDelta ?? "";
          if (!delta) return;
          if (logToolStream) {
            console.log("[AiRuntime] tool-input-delta", {
              toolCallId: id,
              deltaLength: delta.length,
              deltaPreview: delta.slice(0, 200),
            });
          }
          yield* params.toolContext.eventBus.publish({
            _tag: "ToolInputDelta",
            executionId: params.executionId,
            stepId: params.stepId,
            toolCallId: id,
            delta,
          });
          yield* Ref.update(toolInputBuffersRef, (map) => {
            const next = new Map(map);
            const current = next.get(id) ?? "";
            next.set(id, current + delta);
            return next;
          });
          return;
        }

        if (part.type === "text-delta") {
          const delta = chunk.textDelta;
          if (typeof delta === "string" && delta.length > 0) {
            yield* Ref.update(fullTextRef, (text) => text + delta);
            yield* params.toolContext.eventBus.publish({
              _tag: "TextChunk",
              executionId: params.executionId,
              stepId: params.stepId,
              content: delta,
            });
          }
        } else if (part.type === "tool-call") {
          const callId = part.toolCallId || randomUUID();
          const buffers = yield* Ref.get(toolInputBuffersRef);
          const rawArgs = buffers.get(callId) ?? "";
          let parsedArgs = part.args ?? part.input;
          if (rawArgs) {
            try {
              parsedArgs = JSON.parse(rawArgs);
            } catch {
              parsedArgs = part.args ?? part.input;
            }
          }
          if (logToolStream) {
            console.log("[AiRuntime] tool-call", {
              toolCallId: callId,
              toolName: part.toolName,
              rawArgs: rawArgs.slice(0, 500),
              parsedArgs,
            });
            console.log("[AiRuntime] tool-call raw", part);
          }
          yield* Ref.update(toolCallsRef, (calls) => [
            ...calls,
            {
              toolCallId: callId,
              toolName: part.toolName,
              args: parsedArgs,
            },
          ]);
        } else if (part.type === "error") {
          return yield* Effect.fail(part.error);
        }
      }),
    ).pipe(Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "process" })));

    let fullText = yield* Ref.get(fullTextRef);
    let toolCalls = yield* Ref.get(toolCallsRef);

    if (!fullText) {
      const fallbackText = yield* streamResult.text.pipe(Effect.catchAll(() => Effect.succeed("")));
      if (fallbackText) {
        fullText = fallbackText;
        yield* params.toolContext.eventBus.publish({
          _tag: "TextChunk",
          executionId: params.executionId,
          stepId: params.stepId,
          content: fallbackText,
        });
      }
    }

    const toolConfigByName = new Map(params.toolConfigs.map((tool) => [tool.name, tool]));
    const allowedToolNames = params.allowedToolNames;
    const preparedTools = prepared.tools ?? params.tools;
    const toolInputBuffers = yield* Ref.get(toolInputBuffersRef);

    if (toolCalls.length === 0) {
      const fallbackToolCalls = yield* streamResult.toolCalls.pipe(
        Effect.catchAll(() => Effect.succeed([] as ToolCall[])),
      );
      if (logToolStream) {
        console.log("[AiRuntime] fallback tool calls", {
          toolCallCount: fallbackToolCalls.length,
          toolNames: fallbackToolCalls.map((call) => call.toolName),
        });
      }
      toolCalls = fallbackToolCalls ?? toolCalls;
    }

    if (
      toolCalls.length === 0 &&
      adapter.buildRepairPrompt &&
      params.allowedToolNames &&
      params.allowedToolNames.length === 1
    ) {
      const forcedToolName = params.allowedToolNames[0];
      const forcedToolDef = preparedTools[forcedToolName];
      const repairPrompt = adapter.buildRepairPrompt(
        forcedToolName,
        getRequiredFields(toolConfigByName.get(forcedToolName) ?? params.toolConfigs[0]!),
      );
      const repairMessages = [...prepared.messages, { role: "user", content: repairPrompt }];
      const repairToolChoice = adapter.getToolChoice
        ? adapter.getToolChoice(forcedToolName)
        : { type: "tool", toolName: forcedToolName };

      const repairResult = yield* aiRuntime
        .generateText({
          model,
          messages: repairMessages,
          tools: forcedToolDef ? { [forcedToolName]: forcedToolDef } : {},
          toolChoice: repairToolChoice,
          maxTokens: 256,
        })
        .pipe(Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "stream" })));

      toolCalls = repairResult.toolCalls;

      if (logToolStream) {
        console.log("[AiRuntime] repair fallback tool calls", {
          toolCallCount: toolCalls.length,
          toolNames: toolCalls.map((call) => call.toolName),
        });
      }
    }
    const toolOutcomes: AiRuntimeToolOutcome[] = [];

    for (const toolCall of toolCalls) {
      if (
        allowedToolNames &&
        allowedToolNames.length > 0 &&
        !allowedToolNames.includes(toolCall.toolName)
      ) {
        continue;
      }

      const toolConfig = toolConfigByName.get(toolCall.toolName);
      if (!toolConfig) {
        continue;
      }

      const toolType = toolConfig.type;
      const baseArgs = normalizeToolArgs(toolCall.args);
      let resolvedArgs =
        toolType === "update-variable" && toolConfig.targetVariable
          ? {
              variableName: toolConfig.targetVariable,
              value:
                baseArgs.value ??
                (baseArgs as Record<string, unknown>)[toolConfig.targetVariable] ??
                undefined,
              reason: (baseArgs as Record<string, unknown>).reason,
            }
          : baseArgs;

      if (
        toolCall.toolCallId &&
        (resolvedArgs == null ||
          (typeof resolvedArgs === "object" &&
            "value" in resolvedArgs &&
            (resolvedArgs as Record<string, unknown>).value === undefined))
      ) {
        const rawToolInput = toolInputBuffers.get(toolCall.toolCallId);
        if (rawToolInput) {
          try {
            const parsedToolInput = JSON.parse(rawToolInput);
            const recoveredArgs = normalizeToolArgs(parsedToolInput);
            resolvedArgs =
              toolType === "update-variable" && toolConfig.targetVariable
                ? {
                    variableName: toolConfig.targetVariable,
                    value:
                      recoveredArgs.value ??
                      (recoveredArgs as Record<string, unknown>)[toolConfig.targetVariable] ??
                      rawToolInput,
                    reason: (recoveredArgs as Record<string, unknown>).reason,
                  }
                : recoveredArgs;
          } catch {
            if (toolType === "update-variable" && toolConfig.targetVariable) {
              resolvedArgs = {
                variableName: toolConfig.targetVariable,
                value: rawToolInput,
                reason: (resolvedArgs as Record<string, unknown>)?.reason,
              };
            }
          }
        }
      }

      if (
        toolType === "update-variable" &&
        toolConfig.targetVariable &&
        (resolvedArgs as Record<string, unknown>)?.value === undefined &&
        fullText.trim()
      ) {
        resolvedArgs = {
          variableName: toolConfig.targetVariable,
          value: fullText.trim(),
          reason: (resolvedArgs as Record<string, unknown>)?.reason,
        };
      }

      if (
        toolType === "update-variable" &&
        resolvedArgs &&
        typeof resolvedArgs === "object" &&
        "value" in resolvedArgs
      ) {
        const value = (resolvedArgs as Record<string, unknown>).value;
        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          const description =
            typeof record.description === "string"
              ? record.description
              : typeof record.project_description === "string"
                ? record.project_description
                : undefined;
          if (description) {
            (resolvedArgs as Record<string, unknown>).value = description;
          }
        }
      }

      const initialValidationError = yield* validateToolArgs(toolConfig, resolvedArgs).pipe(
        Effect.map(() => null as unknown),
        Effect.catchAll((error) => Effect.succeed(error)),
      );

      if (initialValidationError && adapter.buildRepairPrompt) {
        const repairPrompt = adapter.buildRepairPrompt(
          toolConfig.name,
          getRequiredFields(toolConfig),
        );
        const repairMessages = [...prepared.messages, { role: "user", content: repairPrompt }];
        const repairToolDef = preparedTools[toolConfig.name];
        const repairToolChoice = adapter.getToolChoice
          ? adapter.getToolChoice(toolConfig.name)
          : { type: "tool", toolName: toolConfig.name };

        const repairResult = yield* aiRuntime
          .generateText({
            model,
            messages: repairMessages,
            tools: repairToolDef ? { [toolConfig.name]: repairToolDef } : {},
            toolChoice: repairToolChoice,
            maxTokens: 256,
          })
          .pipe(
            Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "stream" })),
          );

        const repairedCall = repairResult.toolCalls[0];
        if (repairedCall?.args) {
          resolvedArgs = normalizeToolArgs(repairedCall.args);
        }
      }

      const finalValidationError = yield* validateToolArgs(toolConfig, resolvedArgs).pipe(
        Effect.map(() => null as unknown),
        Effect.catchAll((error) => Effect.succeed(error)),
      );

      if (finalValidationError) {
        yield* Effect.fail(
          new AiRuntimeRunnerError({
            cause: finalValidationError,
            operation: "tool",
          }),
        );
      }

      const approvalDecision = yield* evaluateToolApproval({
        toolConfig,
        args: resolvedArgs,
        context: params.toolContext,
        toolCallId: toolCall.toolCallId,
        userId: params.userId,
      });

      if (approvalDecision.status === "pending") {
        toolOutcomes.push({
          toolCallId: approvalDecision.toolCallId,
          toolName: toolCall.toolName,
          toolType,
          args: resolvedArgs,
          status: "pending",
        });
        continue;
      }

      const toolResult = yield* executeTool(
        toolCall.toolName,
        toolType,
        resolvedArgs,
        params.toolContext,
        {
          targetVariable: toolConfig.targetVariable,
          toolCallId: approvalDecision.toolCallId,
        },
      ).pipe(Effect.mapError((cause) => new AiRuntimeRunnerError({ cause, operation: "tool" })));

      toolOutcomes.push({
        toolCallId: approvalDecision.toolCallId,
        toolName: toolCall.toolName,
        toolType,
        args: resolvedArgs,
        status: "approved",
        result: toolResult,
      });
    }

    const finishReason = yield* streamResult.finishReason.pipe(
      Effect.catchAll(() => Effect.succeed(undefined)),
    );
    const usage = yield* streamResult.usage.pipe(Effect.catchAll(() => Effect.succeed(undefined)));

    return {
      fullText,
      toolOutcomes,
      finishReason: finishReason as string | undefined,
      usage,
    };
  });
