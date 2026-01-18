import type { ModelMessage, Tool } from "ai";
import { Context, Data, Effect, Layer, Ref, Stream } from "effect";
import {
  type AIProvider,
  AIProviderService,
  type ModelConfig,
  type TextStreamPart,
} from "../effect/ai-provider-service";
import { WorkflowEventBus } from "../effect/event-bus";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";
import {
  buildToolsFromConfig,
  executeTool,
  type RiskLevel,
  type ToolApprovalConfig,
  type ToolConfig,
  type ToolExecutionContext,
} from "../effect/tool-builder";
import { VariableService } from "../effect/variable-service";

// ===== ERRORS =====

export class SandboxedAgentError extends Data.TaggedError("SandboxedAgentError")<{
  readonly cause: unknown;
  readonly operation: string;
  readonly message: string;
}> {}

// ===== CONFIG TYPES =====

export interface AgentToolConfig {
  readonly name: string;
  readonly type: "update-variable" | "ax-generation" | "snapshot-artifact" | "custom";
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
  readonly approval?: {
    readonly required: boolean;
    readonly riskLevel: RiskLevel;
    readonly mode?: "none" | "text" | "selector" | "confirm";
    readonly selectorOptions?: readonly string[];
    readonly textPlaceholder?: string;
    readonly confirmMessage?: string;
    readonly defaultValue?: string;
  };
  readonly optionsSource?: string;
}

export interface SandboxedAgentConfig {
  readonly id?: string;
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly generateInitialMessage?: boolean;
  readonly tools: readonly AgentToolConfig[];
  readonly completionCondition: {
    readonly type: "all-tools-approved" | "all-variables-set" | "max-turns";
    readonly requiredVariables?: readonly string[];
    readonly maxTurns?: number;
  };
  readonly model?: {
    readonly provider: AIProvider;
    readonly modelId: string;
  };
  readonly _conversationState?: ConversationState;
}

// ===== STATE TYPES =====

export interface PendingApproval {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly toolArgs: Record<string, unknown>;
  readonly riskLevel: RiskLevel;
  readonly approvalConfig: ToolApprovalConfig;
  readonly resolvedOptions?: readonly string[];
}

export interface ConversationState {
  readonly messages: readonly ModelMessage[];
  readonly turnCount: number;
  readonly approvedTools: readonly string[];
  readonly pendingApprovals: readonly PendingApproval[];
  readonly completedToolCalls: readonly string[];
}

export interface SandboxedAgentHandlerOutput extends StepHandlerOutput {
  readonly requiresUserInput: boolean;
  readonly pendingApproval?: PendingApproval;
  readonly conversationState?: ConversationState;
  readonly streamComplete?: boolean;
}

// ===== SERVICE INTERFACE =====

export interface SandboxedAgentHandler {
  readonly _tag: "SandboxedAgentHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<
    SandboxedAgentHandlerOutput,
    SandboxedAgentError,
    AIProviderService | WorkflowEventBus | VariableService
  >;
}

export const SandboxedAgentHandler =
  Context.GenericTag<SandboxedAgentHandler>("SandboxedAgentHandler");

// ===== HELPERS =====

function resolvePromptVariables(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = variables[varName];
    if (value === undefined) return `{{${varName}}}`;
    return String(value);
  });
}

function checkCompletionCondition(
  config: SandboxedAgentConfig,
  variables: Record<string, unknown>,
  approvedTools: Set<string>,
  turnCount: number,
): boolean {
  switch (config.completionCondition.type) {
    case "all-tools-approved": {
      const toolsRequiringApproval = config.tools.filter((t) => t.approval?.required);
      if (toolsRequiringApproval.length === 0) return false;
      return toolsRequiringApproval.every((t) => approvedTools.has(t.name));
    }
    case "all-variables-set": {
      const required = config.completionCondition.requiredVariables ?? [];
      return required.every(
        (varName) => variables[varName] !== undefined && variables[varName] !== null,
      );
    }
    case "max-turns": {
      const maxTurns = config.completionCondition.maxTurns ?? 10;
      return turnCount >= maxTurns;
    }
    default:
      return false;
  }
}

function convertToToolConfig(agentTool: AgentToolConfig): ToolConfig {
  const { z } = require("zod");

  const buildZodSchema = (schema: Record<string, unknown>): unknown => {
    if (schema.type === "object" && schema.properties) {
      const props = schema.properties as Record<string, Record<string, unknown>>;
      const shape: Record<string, unknown> = {};
      for (const [key, propSchema] of Object.entries(props)) {
        if (propSchema.type === "string") {
          let zodType = z.string();
          if (propSchema.description) {
            zodType = zodType.describe(propSchema.description as string);
          }
          shape[key] = zodType;
        } else if (propSchema.type === "number") {
          let zodType = z.number();
          if (propSchema.description) {
            zodType = zodType.describe(propSchema.description as string);
          }
          shape[key] = zodType;
        } else if (propSchema.type === "boolean") {
          let zodType = z.boolean();
          if (propSchema.description) {
            zodType = zodType.describe(propSchema.description as string);
          }
          shape[key] = zodType;
        } else {
          shape[key] = z.unknown();
        }
      }
      return z.object(shape);
    }
    return z.unknown();
  };

  return {
    name: agentTool.name,
    type: agentTool.type,
    description: agentTool.description,
    inputSchema: buildZodSchema(agentTool.inputSchema) as import("zod").ZodSchema,
    approval: {
      mode: agentTool.approval?.mode ?? (agentTool.approval?.required ? "confirm" : "none"),
      riskLevel: agentTool.approval?.riskLevel ?? "safe",
      selectorOptions: agentTool.approval?.selectorOptions
        ? [...agentTool.approval.selectorOptions]
        : undefined,
      textPlaceholder: agentTool.approval?.textPlaceholder,
      confirmMessage: agentTool.approval?.confirmMessage,
      defaultValue: agentTool.approval?.defaultValue,
    },
  };
}

// ===== USER INPUT TYPES =====

type UserInputMessage =
  | string
  | {
      type: "approval";
      toolCallId: string;
      toolName: string;
      approved: boolean;
      userValue?: unknown;
    }
  | { type: "message"; content: string };

interface CollectedToolCall {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

// ===== LIVE IMPLEMENTATION =====

export const SandboxedAgentHandlerLive = Layer.effect(
  SandboxedAgentHandler,
  Effect.gen(function* () {
    const aiProvider = yield* AIProviderService;
    const eventBus = yield* WorkflowEventBus;
    const variableService = yield* VariableService;

    return {
      _tag: "SandboxedAgentHandler" as const,

      execute: (input: StepHandlerInput, userInput?: unknown) =>
        Effect.gen(function* () {
          const config = input.stepConfig as unknown as SandboxedAgentConfig;
          const existingState = config._conversationState;
          const stepId = config.id ?? "sandboxed-agent";

          const messages: ModelMessage[] = existingState?.messages
            ? [...existingState.messages]
            : [];
          let turnCount = existingState?.turnCount ?? 0;
          const approvedTools = new Set<string>(existingState?.approvedTools ?? []);
          const pendingApprovals = [...(existingState?.pendingApprovals ?? [])];
          const completedToolCalls = new Set<string>(existingState?.completedToolCalls ?? []);

          const toolContext: ToolExecutionContext = {
            executionId: input.executionId,
            stepId,
            variableService: {
              set: (execId, name, value, _source, stepNumber) =>
                variableService.set(execId, name, value, "step", stepNumber),
              get: (execId, name) => variableService.get(execId, name),
            },
            eventBus: {
              publish: (event) => eventBus.publish(event),
            },
          };

          // Build tools from config
          const toolConfigs = config.tools.map(convertToToolConfig);
          const tools = yield* buildToolsFromConfig(toolConfigs, toolContext).pipe(
            Effect.mapError(
              (e) =>
                new SandboxedAgentError({
                  cause: e,
                  operation: "buildTools",
                  message: `Failed to build tools: ${e.cause}`,
                }),
            ),
          );

          // Process user input if provided
          if (userInput !== undefined && userInput !== null) {
            const userMessage = userInput as UserInputMessage;

            if (typeof userMessage === "string") {
              messages.push({ role: "user", content: userMessage });
            } else if (userMessage.type === "approval") {
              const approvalIdx = pendingApprovals.findIndex(
                (p) => p.toolCallId === userMessage.toolCallId,
              );

              if (approvalIdx !== -1) {
                const pendingApproval = pendingApprovals[approvalIdx];
                pendingApprovals.splice(approvalIdx, 1);

                if (userMessage.approved && pendingApproval) {
                  approvedTools.add(userMessage.toolName);

                  const toolConfig = toolConfigs.find((t) => t.name === userMessage.toolName);
                  if (toolConfig) {
                    const argsWithUserValue =
                      userMessage.userValue !== undefined
                        ? {
                            ...pendingApproval.toolArgs,
                            userValue: userMessage.userValue,
                          }
                        : pendingApproval.toolArgs;

                    const toolResult = yield* executeTool(
                      userMessage.toolName,
                      toolConfig.type,
                      argsWithUserValue,
                      toolContext,
                    ).pipe(
                      Effect.mapError(
                        (e) =>
                          new SandboxedAgentError({
                            cause: e,
                            operation: "executeTool",
                            message: `Tool execution failed: ${e.cause}`,
                          }),
                      ),
                    );

                    completedToolCalls.add(userMessage.toolCallId);

                    messages.push({
                      role: "assistant",
                      content: [
                        {
                          type: "tool-call",
                          toolCallId: userMessage.toolCallId,
                          toolName: userMessage.toolName,
                          input: argsWithUserValue,
                        },
                      ],
                    } as ModelMessage);
                    messages.push({
                      role: "tool",
                      content: [
                        {
                          type: "tool-result",
                          toolCallId: userMessage.toolCallId,
                          toolName: userMessage.toolName,
                          output: toolResult.output,
                        },
                      ],
                    } as ModelMessage);
                  }
                } else {
                  messages.push({
                    role: "user",
                    content: `Tool call rejected by user: ${userMessage.toolName}`,
                  });
                }
              }
            } else if (userMessage.type === "message") {
              messages.push({ role: "user", content: userMessage.content });
            }
          }

          // If there are still pending approvals, wait for them
          if (pendingApprovals.length > 0) {
            return {
              result: {
                completed: false,
                turnCount,
                pendingApprovals: pendingApprovals.length,
              },
              variableUpdates: {},
              requiresUserInput: true,
              pendingApproval: pendingApprovals[0],
              conversationState: {
                messages,
                turnCount,
                approvedTools: [...approvedTools],
                pendingApprovals,
                completedToolCalls: [...completedToolCalls],
              },
            };
          }

          // Check if we've reached completion
          const isComplete = checkCompletionCondition(
            config,
            input.variables,
            approvedTools,
            turnCount,
          );

          if (isComplete) {
            yield* eventBus.publish({
              _tag: "StepCompleted",
              executionId: input.executionId,
              stepId,
              result: { completed: true, turnCount },
            });

            return {
              result: {
                completed: true,
                turnCount,
                finalMessages: messages.length,
              },
              variableUpdates: {},
              requiresUserInput: false,
              streamComplete: true,
              conversationState: {
                messages,
                turnCount,
                approvedTools: [...approvedTools],
                pendingApprovals: [],
                completedToolCalls: [...completedToolCalls],
              },
            };
          }

          // Initialize messages if this is a fresh start
          if (messages.length === 0) {
            const systemPrompt = resolvePromptVariables(config.systemPrompt, input.variables);
            const userPrompt = resolvePromptVariables(config.userPrompt, input.variables);

            messages.push({ role: "system", content: systemPrompt });

            // Generate initial message if configured
            if (config.generateInitialMessage) {
              const modelConfig: ModelConfig = {
                provider: config.model?.provider ?? "openrouter",
                modelId: config.model?.modelId ?? "anthropic/claude-3.5-sonnet",
              };

              const initialModel = yield* aiProvider.loadModel(modelConfig).pipe(
                Effect.mapError(
                  (e) =>
                    new SandboxedAgentError({
                      cause: e,
                      operation: "loadModel",
                      message: "Failed to load model for initial message",
                    }),
                ),
              );

              const initialResult = yield* aiProvider
                .generateText({
                  model: initialModel,
                  messages: [
                    { role: "system", content: systemPrompt },
                    {
                      role: "user",
                      content: `${userPrompt}\n\nGenerate a helpful initial message to start the conversation.`,
                    },
                  ],
                  maxTokens: 500,
                })
                .pipe(
                  Effect.mapError(
                    (e) =>
                      new SandboxedAgentError({
                        cause: e,
                        operation: "generateInitialMessage",
                        message: "Failed to generate initial message",
                      }),
                  ),
                );

              messages.push({ role: "assistant", content: initialResult.text });
              messages.push({ role: "user", content: userPrompt });
            } else {
              messages.push({ role: "user", content: userPrompt });
            }
          }

          // Load model for main conversation
          const modelConfig: ModelConfig = {
            provider: config.model?.provider ?? "openrouter",
            modelId: config.model?.modelId ?? "anthropic/claude-3.5-sonnet",
          };

          const model = yield* aiProvider.loadModel(modelConfig).pipe(
            Effect.mapError(
              (e) =>
                new SandboxedAgentError({
                  cause: e,
                  operation: "loadModel",
                  message: "Failed to load AI model",
                }),
            ),
          );

          // Emit step started
          yield* eventBus.publish({
            _tag: "StepStarted",
            executionId: input.executionId,
            stepId,
            stepType: "sandboxed-agent",
          });

          // Stream text generation
          const streamResult = yield* aiProvider
            .streamText({
              model,
              messages,
              tools: tools as Record<string, Tool>,
              maxTokens: 4096,
            })
            .pipe(
              Effect.mapError(
                (e) =>
                  new SandboxedAgentError({
                    cause: e,
                    operation: "streamText",
                    message: "Failed to stream AI response",
                  }),
              ),
            );

          // Collect stream output using Effect patterns
          const fullTextRef = yield* Ref.make("");
          const collectedToolCallsRef = yield* Ref.make<CollectedToolCall[]>([]);

          // Process the Effect Stream using Stream.runForEach
          yield* Stream.runForEach(streamResult.fullStream, (chunk: TextStreamPart) =>
            Effect.gen(function* () {
              if (chunk.type === "text-delta") {
                yield* Ref.update(fullTextRef, (text) => text + chunk.textDelta);
                yield* eventBus.publish({
                  _tag: "TextChunk",
                  executionId: input.executionId,
                  stepId,
                  content: chunk.textDelta,
                });
              } else if (chunk.type === "tool-call") {
                yield* Ref.update(collectedToolCallsRef, (calls) => [
                  ...calls,
                  {
                    type: "tool-call" as const,
                    toolCallId: chunk.toolCallId,
                    toolName: chunk.toolName,
                    args: chunk.args,
                  },
                ]);
              }
            }),
          ).pipe(
            Effect.catchAll((e) =>
              Effect.fail(
                new SandboxedAgentError({
                  cause: e,
                  operation: "processStream",
                  message: "Error processing stream",
                }),
              ),
            ),
          );

          const fullText = yield* Ref.get(fullTextRef);
          const collectedToolCalls = yield* Ref.get(collectedToolCallsRef);

          // Add assistant message if we got text
          if (fullText) {
            messages.push({ role: "assistant", content: fullText });
          }

          // Process tool calls
          const newPendingApprovals: PendingApproval[] = [];

          for (const toolCall of collectedToolCalls) {
            const toolConfig = config.tools.find((t) => t.name === toolCall.toolName);
            if (!toolConfig) continue;

            const needsApproval = toolConfig.approval?.required ?? false;

            if (needsApproval) {
              let resolvedOptions: readonly string[] | undefined;
              if (toolConfig.optionsSource) {
                const optionsValue = yield* variableService
                  .get(input.executionId, toolConfig.optionsSource)
                  .pipe(Effect.catchAll(() => Effect.succeed(undefined)));

                if (Array.isArray(optionsValue)) {
                  resolvedOptions = optionsValue.map(String);
                } else if (typeof optionsValue === "string") {
                  resolvedOptions = (optionsValue as string)
                    .split(",")
                    .map((s: string) => s.trim());
                }
              }

              const pendingApproval: PendingApproval = {
                toolCallId: toolCall.toolCallId,
                toolName: toolCall.toolName,
                toolArgs: toolCall.args as Record<string, unknown>,
                riskLevel: toolConfig.approval?.riskLevel ?? "safe",
                approvalConfig: {
                  mode: toolConfig.approval?.mode ?? "confirm",
                  riskLevel: toolConfig.approval?.riskLevel ?? "safe",
                  selectorOptions: resolvedOptions
                    ? [...resolvedOptions]
                    : toolConfig.approval?.selectorOptions
                      ? [...toolConfig.approval.selectorOptions]
                      : undefined,
                  textPlaceholder: toolConfig.approval?.textPlaceholder,
                  confirmMessage: toolConfig.approval?.confirmMessage,
                  defaultValue: toolConfig.approval?.defaultValue,
                },
                resolvedOptions,
              };

              newPendingApprovals.push(pendingApproval);

              yield* eventBus.publish({
                _tag: "ApprovalRequested",
                executionId: input.executionId,
                stepId,
                toolName: toolCall.toolName,
                args: toolCall.args as Record<string, unknown>,
                riskLevel: toolConfig.approval?.riskLevel ?? "safe",
              });
            } else {
              // Execute tool immediately (no approval needed)
              yield* eventBus.publish({
                _tag: "ToolCallStarted",
                executionId: input.executionId,
                stepId,
                toolName: toolCall.toolName,
                args: toolCall.args,
              });

              const toolResult = yield* executeTool(
                toolCall.toolName,
                toolConfig.type,
                toolCall.args,
                toolContext,
              ).pipe(
                Effect.mapError(
                  (e) =>
                    new SandboxedAgentError({
                      cause: e,
                      operation: "executeTool",
                      message: `Tool execution failed: ${e.cause}`,
                    }),
                ),
              );

              completedToolCalls.add(toolCall.toolCallId);

              messages.push({
                role: "assistant",
                content: [
                  {
                    type: "tool-call",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    input: toolCall.args,
                  },
                ],
              } as ModelMessage);
              messages.push({
                role: "tool",
                content: [
                  {
                    type: "tool-result",
                    toolCallId: toolCall.toolCallId,
                    toolName: toolCall.toolName,
                    output: toolResult.output,
                  },
                ],
              } as ModelMessage);

              yield* eventBus.publish({
                _tag: "ToolCallCompleted",
                executionId: input.executionId,
                stepId,
                toolName: toolCall.toolName,
                result: toolResult,
              });
            }
          }

          turnCount++;

          // Combine all pending approvals
          const allPendingApprovals = [...pendingApprovals, ...newPendingApprovals];

          if (allPendingApprovals.length > 0) {
            return {
              result: {
                completed: false,
                turnCount,
                pendingApprovals: allPendingApprovals.length,
              },
              variableUpdates: {},
              requiresUserInput: true,
              pendingApproval: allPendingApprovals[0],
              conversationState: {
                messages,
                turnCount,
                approvedTools: [...approvedTools],
                pendingApprovals: allPendingApprovals,
                completedToolCalls: [...completedToolCalls],
              },
            };
          }

          // Check completion again after processing
          const isNowComplete = checkCompletionCondition(
            config,
            input.variables,
            approvedTools,
            turnCount,
          );

          return {
            result: {
              completed: isNowComplete,
              turnCount,
              textLength: fullText.length,
              toolCallsProcessed: collectedToolCalls.length,
            },
            variableUpdates: {},
            requiresUserInput: !isNowComplete,
            streamComplete: true,
            conversationState: {
              messages,
              turnCount,
              approvedTools: [...approvedTools],
              pendingApprovals: [],
              completedToolCalls: [...completedToolCalls],
            },
          };
        }),
    };
  }),
);
