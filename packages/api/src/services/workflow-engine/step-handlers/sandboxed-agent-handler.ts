import type { ModelMessage, Tool } from "ai";
import { agents } from "@chiron/db";
import { eq } from "drizzle-orm";
import { Context, Data, Effect, Layer } from "effect";
import Handlebars from "handlebars";
import type { AIProvider } from "../effect/ai-provider-service";
import { AiRuntimeService, type ModelConfig } from "../effect/ai-runtime/ai-runtime-service";
import { runAiRuntime } from "../effect/ai-runtime/ai-runtime-runner";
import { DatabaseService } from "../effect/database-service";
import { ChatService } from "../effect/chat-service";
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
import { resolveToolApproval } from "../effect/tooling-engine";
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
  readonly type?: "update-variable" | "ax-generation" | "snapshot-artifact" | "custom";
  readonly toolType?: "update-variable" | "ax-generation" | "snapshot-artifact" | "custom";
  readonly description?: string;
  readonly usageGuidance?: string;
  readonly requiredVariables?: readonly string[];
  readonly targetVariable?: string;
  readonly inputSchema?: Record<string, unknown>;
  readonly valueSchema?: Record<string, unknown>;
  readonly approval?: {
    readonly required: boolean;
    readonly riskLevel: RiskLevel;
    readonly mode?: "none" | "text" | "selector" | "confirm";
    readonly selectorOptions?: readonly string[];
    readonly textPlaceholder?: string;
    readonly confirmMessage?: string;
    readonly defaultValue?: string;
  };
  readonly requiresApproval?: boolean;
  readonly optionsSource?:
    | string
    | {
        outputVariable?: string;
      };
}

export interface SandboxedAgentConfig {
  readonly id?: string;
  readonly agentId: string;
  readonly systemPrompt?: string;
  readonly userPrompt?: string;
  readonly initialMessage?: string;
  readonly generateInitialMessage?: boolean;
  readonly initialPrompt?: string;
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
    AiRuntimeService | WorkflowEventBus | VariableService | DatabaseService | ChatService
  >;
}

export const SandboxedAgentHandler =
  Context.GenericTag<SandboxedAgentHandler>("SandboxedAgentHandler");

// ===== HELPERS =====

function resolvePromptVariables(
  template: string | undefined,
  context: Record<string, unknown>,
): string {
  if (!template || typeof template !== "string") {
    return "";
  }
  const compiled = Handlebars.compile(template, { noEscape: true });
  return compiled(context);
}

interface ToolStatus {
  readonly name: string;
  readonly description: string;
  readonly status: "approved" | "pending" | "blocked" | "available";
  readonly requiresApproval: boolean;
  readonly requiredVariables: readonly string[];
  readonly usageGuidance?: string;
}

function buildToolStatuses(
  tools: readonly AgentToolConfig[],
  variables: Record<string, unknown>,
  approvedTools: Set<string>,
  pendingApprovals: readonly PendingApproval[],
): ToolStatus[] {
  return tools.map((tool) => {
    const requiredVariables = tool.requiredVariables ?? [];
    const isBlocked = requiredVariables.some(
      (variable) => variables[variable] === undefined || variables[variable] === null,
    );
    const isPending = pendingApprovals.some((pending) => pending.toolName === tool.name);
    const isApproved = approvedTools.has(tool.name);
    const status = isApproved
      ? "approved"
      : isPending
        ? "pending"
        : isBlocked
          ? "blocked"
          : "available";

    return {
      name: tool.name,
      description: tool.description ?? tool.usageGuidance ?? "",
      status,
      requiresApproval: tool.approval?.required ?? tool.requiresApproval ?? false,
      requiredVariables,
      usageGuidance: tool.usageGuidance,
    };
  });
}

function buildToolsList(tools: readonly ToolStatus[]): string {
  if (tools.length === 0) return "";
  return tools
    .map((tool) => {
      const required = tool.requiredVariables.length
        ? ` required_variables="${tool.requiredVariables.join(", ")}"`
        : "";
      const approval = tool.requiresApproval ? ' requires_approval="true"' : "";
      const guidance = tool.usageGuidance ? `\n  <usage>${tool.usageGuidance}</usage>` : "";
      const description = tool.description
        ? `\n  <description>${tool.description}</description>`
        : "";
      return `  <tool name="${tool.name}" status="${tool.status}"${approval}${required}>${description}${guidance}\n  </tool>`;
    })
    .join("\n");
}

function buildPromptContext(
  input: StepHandlerInput,
  config: SandboxedAgentConfig,
  toolStatuses: readonly ToolStatus[],
  approvedTools: Set<string>,
  pendingApprovals: readonly PendingApproval[],
): Record<string, unknown> {
  const pendingToolNames = pendingApprovals.map((approval) => approval.toolName);
  return {
    workflow_id: input.workflowId ?? "",
    step_id: input.stepId ?? config.id ?? "",
    step_number: input.stepNumber ?? 0,
    step_objective: input.stepGoal ?? "",
    step_goal: input.stepGoal ?? "",
    step_type: input.stepType ?? "agent",
    workflow_specific_instructions: config.systemPrompt ?? config.userPrompt ?? "",
    tools_list: buildToolsList(toolStatuses),
    tool_states: toolStatuses,
    approved_tools: [...approvedTools],
    pending_tools: pendingToolNames,
    execution_variables: input.variables,
    variables: input.variables,
  };
}

function getLatestRejectionFeedback(
  approvalStates: unknown,
): { toolName: string; feedback: string; rejectedAt?: string } | null {
  if (!approvalStates || typeof approvalStates !== "object") return null;

  let latest: { toolName: string; feedback: string; rejectedAt?: string } | null = null;

  for (const [toolName, state] of Object.entries(approvalStates)) {
    if (!state || typeof state !== "object") continue;
    const rejectionHistory = (state as { rejection_history?: unknown }).rejection_history;
    if (!Array.isArray(rejectionHistory) || rejectionHistory.length === 0) continue;
    const last = rejectionHistory[rejectionHistory.length - 1] as {
      feedback?: unknown;
      rejectedAt?: unknown;
    };
    const feedback = typeof last?.feedback === "string" ? last.feedback : "";
    if (!feedback) continue;
    const rejectedAt = typeof last?.rejectedAt === "string" ? last.rejectedAt : undefined;

    if (!latest) {
      latest = { toolName, feedback, rejectedAt };
      continue;
    }

    if (rejectedAt && (!latest.rejectedAt || rejectedAt > latest.rejectedAt)) {
      latest = { toolName, feedback, rejectedAt };
    }
  }

  return latest;
}

function resolveModelConfig(
  config: SandboxedAgentConfig,
  variables: Record<string, unknown>,
): ModelConfig {
  const selected = variables?.selected_model;
  if (typeof selected === "string" && selected.length > 0) {
    if (selected.includes(":")) {
      const [provider, ...rest] = selected.split(":");
      const modelId = rest.join(":");
      if (modelId.length > 0) {
        return {
          provider: provider as AIProvider,
          modelId,
        };
      }
    }

    return {
      provider: config.model?.provider ?? "openrouter",
      modelId: selected,
    };
  }

  return {
    provider: config.model?.provider ?? "openrouter",
    modelId: config.model?.modelId ?? "anthropic/claude-3.5-sonnet",
  };
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

  const buildZodSchema = (schema: Record<string, unknown> | undefined): unknown => {
    if (!schema || typeof schema !== "object") {
      return z.unknown();
    }

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

  const toolType = agentTool.type ?? agentTool.toolType;

  const inputSchema = (() => {
    if (toolType === "update-variable") {
      return z.object({
        value: z.unknown(),
        reason: z.string().optional(),
      });
    }

    if (toolType === "ax-generation") {
      return z.object({
        prompt: z.string(),
        templateId: z.string().optional(),
        variables: z.record(z.string(), z.unknown()).optional(),
      });
    }

    return buildZodSchema(
      agentTool.valueSchema ?? agentTool.inputSchema,
    ) as import("zod").ZodSchema;
  })();

  const approvalRequired = agentTool.approval?.required ?? agentTool.requiresApproval ?? false;

  return {
    name: agentTool.name,
    type: toolType,
    description: agentTool.description ?? agentTool.usageGuidance,
    inputSchema,
    targetVariable: agentTool.targetVariable,
    approval: {
      mode: agentTool.approval?.mode ?? (approvalRequired ? "confirm" : "none"),
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
    const aiRuntime = yield* AiRuntimeService;
    const eventBus = yield* WorkflowEventBus;
    const variableService = yield* VariableService;
    const chatService = yield* ChatService;
    const { db } = yield* DatabaseService;

    return {
      _tag: "SandboxedAgentHandler" as const,

      execute: (input: StepHandlerInput, userInput?: unknown) =>
        Effect.gen(function* () {
          const config = input.stepConfig as unknown as SandboxedAgentConfig;
          const existingState = config._conversationState;
          const stepId = input.stepId ?? config.id ?? "agent";
          const stepExecutionId = input.stepExecutionId;
          if (!stepExecutionId) {
            throw new SandboxedAgentError({
              cause: "Missing step execution id",
              operation: "chatSession",
              message: "Step execution id is required for chat sessions",
            });
          }
          const resolvedUserInput = userInput ?? input.userInput;
          const executionVariables = input.variables ?? {};

          const messages: ModelMessage[] = existingState?.messages
            ? [...existingState.messages]
            : [];
          let turnCount = existingState?.turnCount ?? 0;
          const approvedTools = new Set<string>(existingState?.approvedTools ?? []);
          const pendingApprovals = [...(existingState?.pendingApprovals ?? [])];
          const completedToolCalls = new Set<string>(existingState?.completedToolCalls ?? []);

          const hasSystemMessage = messages.some((message) => message.role === "system");

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

          const toolStatuses = buildToolStatuses(
            config.tools,
            executionVariables,
            approvedTools,
            pendingApprovals,
          );

          const promptContext = buildPromptContext(
            { ...input, variables: executionVariables },
            config,
            toolStatuses,
            approvedTools,
            pendingApprovals,
          );

          const latestRejection = getLatestRejectionFeedback(
            (executionVariables as { approval_states?: unknown })?.approval_states,
          );
          if (latestRejection) {
            promptContext.tool_rejection_feedback = latestRejection;
          }

          const agentRecord = yield* Effect.tryPromise({
            try: async () => {
              const [agent] = await db
                .select({ instructions: agents.instructions })
                .from(agents)
                .where(eq(agents.id, config.agentId))
                .limit(1);
              return agent ?? null;
            },
            catch: () => null,
          });

          const systemPromptBase = resolvePromptVariables(
            agentRecord?.instructions ?? config.systemPrompt,
            promptContext,
          );
          const runtimeInstructionParts = [
            "If you call a tool, first send a brief natural-language message to the user.",
          ];
          if (latestRejection) {
            runtimeInstructionParts.push(
              `Recent tool rejection feedback (tool: ${latestRejection.toolName}): ${latestRejection.feedback}`,
            );
          }
          const runtimeInstruction = runtimeInstructionParts.join("\n");
          const systemPrompt = systemPromptBase
            ? `${systemPromptBase}\n\n<runtime_instruction>\n${runtimeInstruction}\n</runtime_instruction>`
            : `<runtime_instruction>\n${runtimeInstruction}\n</runtime_instruction>`;

          const initialPrompt = resolvePromptVariables(
            config.initialPrompt ?? config.userPrompt,
            promptContext,
          );

          const sessionTitle = `Step ${input.stepNumber ?? "?"} · ${
            input.stepType ?? "agent"
          } · Exec ${input.executionId.slice(0, 8)}`;

          const session = yield* chatService.getOrCreateSession(
            input.executionId,
            stepExecutionId,
            {
              model: config.model?.modelId,
              systemPrompt,
              tools: config.tools.map((tool) => tool.name),
            },
            sessionTitle,
          );

          if (!session.title) {
            yield* chatService.updateSession(session.id, { title: sessionTitle });
          }

          if (systemPrompt && session.messageCount === 0) {
            yield* chatService.addMessage(session.id, {
              role: "system",
              content: systemPrompt,
            });
          }

          if (systemPrompt && !hasSystemMessage) {
            messages.unshift({ role: "system", content: systemPrompt });
          }

          // Process user input if provided
          if (resolvedUserInput !== undefined && resolvedUserInput !== null) {
            const userMessage = resolvedUserInput as UserInputMessage;

            if (typeof userMessage === "string") {
              messages.push({ role: "user", content: userMessage });
              yield* chatService.addMessage(session.id, {
                role: "user",
                content: userMessage,
              });
            } else if (
              typeof userMessage === "object" &&
              userMessage !== null &&
              "text" in userMessage &&
              typeof (userMessage as { text?: unknown }).text === "string"
            ) {
              const text = (userMessage as { text: string }).text;
              messages.push({ role: "user", content: text });
              yield* chatService.addMessage(session.id, {
                role: "user",
                content: text,
              });
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

                    const approvalAction = userMessage.userValue !== undefined ? "edit" : "approve";

                    yield* resolveToolApproval(eventBus, {
                      executionId: input.executionId,
                      stepId,
                      toolName: userMessage.toolName,
                      toolType: toolConfig.type,
                      toolCallId: userMessage.toolCallId,
                      action: approvalAction,
                      editedArgs: approvalAction === "edit" ? argsWithUserValue : undefined,
                    });

                    const toolResult = yield* executeTool(
                      userMessage.toolName,
                      toolConfig.type,
                      argsWithUserValue,
                      toolContext,
                      { toolCallId: userMessage.toolCallId },
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
                  yield* resolveToolApproval(eventBus, {
                    executionId: input.executionId,
                    stepId,
                    toolName: userMessage.toolName,
                    toolType:
                      toolConfigs.find((t) => t.name === userMessage.toolName)?.type ?? "custom",
                    toolCallId: userMessage.toolCallId,
                    action: "reject",
                    feedback: "Tool call rejected by user",
                  });
                  messages.push({
                    role: "user",
                    content: `Tool call rejected by user: ${userMessage.toolName}`,
                  });
                }
              }
            } else if (userMessage.type === "message") {
              messages.push({ role: "user", content: userMessage.content });
              yield* chatService.addMessage(session.id, {
                role: "user",
                content: userMessage.content,
              });
            }
          }

          const hasNonSystemMessage = messages.some((message) => message.role !== "system");

          if (
            !hasNonSystemMessage &&
            (resolvedUserInput === undefined || resolvedUserInput === null)
          ) {
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
            executionVariables,
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
          if (!hasNonSystemMessage) {
            if (systemPrompt && !messages.some((message) => message.role === "system")) {
              messages.push({ role: "system", content: systemPrompt });
            }

            // Generate initial message if configured
            if (config.generateInitialMessage && initialPrompt) {
              const initialSystemMessages: ModelMessage[] = [];
              if (systemPrompt) {
                initialSystemMessages.push({ role: "system", content: systemPrompt });
              }
              if (config.initialMessage) {
                initialSystemMessages.push({ role: "system", content: config.initialMessage });
              }
              const modelConfig = resolveModelConfig(config, executionVariables);

              const initialModel = yield* aiRuntime.loadModel(modelConfig).pipe(
                Effect.mapError(
                  (e) =>
                    new SandboxedAgentError({
                      cause: e,
                      operation: "loadModel",
                      message: "Failed to load model for initial message",
                    }),
                ),
              );

              const initialResult = yield* aiRuntime
                .generateText({
                  model: initialModel,
                  messages: [
                    ...initialSystemMessages,
                    {
                      role: "user",
                      content: `${initialPrompt}\n\nGenerate a helpful initial message to start the conversation.`,
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
            }
          }

          if (
            messages.length === 0 &&
            (resolvedUserInput === undefined || resolvedUserInput === null)
          ) {
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

          const modelConfig = resolveModelConfig(config, executionVariables);
          const allowedToolNames = toolStatuses
            .filter((tool) => tool.status === "available")
            .map((tool) => tool.name);

          yield* eventBus.publish({
            _tag: "StepStarted",
            executionId: input.executionId,
            stepId,
            stepType: "agent",
          });

          const runtimeResult = yield* runAiRuntime({
            executionId: input.executionId,
            stepId,
            modelConfig,
            messages,
            tools: tools as Record<string, Tool>,
            toolConfigs,
            toolContext,
            userId: input.userId,
            maxTokens: 4096,
            allowedToolNames,
            forceToolChoice: false,
          }).pipe(
            Effect.mapError(
              (e) =>
                new SandboxedAgentError({
                  cause: e,
                  operation: "runtime",
                  message: "AI runtime execution failed",
                }),
            ),
          );

          console.log("[SandboxedAgent] runtime summary", {
            executionId: input.executionId,
            stepId,
            modelProvider: modelConfig.provider,
            modelId: modelConfig.modelId,
            fullTextLength: runtimeResult.fullText.length,
            toolOutcomeCount: runtimeResult.toolOutcomes.length,
            finishReason: runtimeResult.finishReason,
            usage: runtimeResult.usage,
          });

          if (runtimeResult.fullText) {
            messages.push({ role: "assistant", content: runtimeResult.fullText });
            yield* chatService.addMessage(session.id, {
              role: "assistant",
              content: runtimeResult.fullText,
            });
          }

          const newPendingApprovals: PendingApproval[] = [];

          for (const outcome of runtimeResult.toolOutcomes) {
            const rawToolConfig = config.tools.find((t) => t.name === outcome.toolName);
            const resolvedToolConfig = toolConfigs.find((t) => t.name === outcome.toolName);
            if (!rawToolConfig || !resolvedToolConfig) continue;

            const toolType = outcome.toolType ?? resolvedToolConfig.type;
            const resolvedArgs = outcome.args;

            if (outcome.status === "pending") {
              let resolvedOptions: readonly string[] | undefined;
              if (rawToolConfig.optionsSource) {
                const optionsValue = yield* variableService
                  .get(input.executionId, rawToolConfig.optionsSource)
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
                toolCallId: outcome.toolCallId,
                toolName: outcome.toolName,
                toolArgs: resolvedArgs as Record<string, unknown>,
                riskLevel: resolvedToolConfig.approval.riskLevel,

                approvalConfig: {
                  mode: resolvedToolConfig.approval.mode,
                  riskLevel: resolvedToolConfig.approval.riskLevel,
                  selectorOptions: resolvedOptions
                    ? [...resolvedOptions]
                    : resolvedToolConfig.approval.selectorOptions
                      ? [...resolvedToolConfig.approval.selectorOptions]
                      : undefined,
                  textPlaceholder: resolvedToolConfig.approval.textPlaceholder,
                  confirmMessage: resolvedToolConfig.approval.confirmMessage,
                  defaultValue: resolvedToolConfig.approval.defaultValue,
                },
                resolvedOptions,
              };

              newPendingApprovals.push(pendingApproval);
            } else {
              if (resolvedToolConfig.approval.mode !== "none") {
                approvedTools.add(outcome.toolName);
              }

              completedToolCalls.add(outcome.toolCallId);

              messages.push({
                role: "assistant",
                content: [
                  {
                    type: "tool-call",
                    toolCallId: outcome.toolCallId,
                    toolName: outcome.toolName,
                    input: resolvedArgs,
                  },
                ],
              } as ModelMessage);
              messages.push({
                role: "tool",
                content: [
                  {
                    type: "tool-result",
                    toolCallId: outcome.toolCallId,
                    toolName: outcome.toolName,
                    output: outcome.result?.output ?? null,
                  },
                ],
              } as ModelMessage);
            }
          }

          turnCount++;

          // Combine all pending approvals
          const allPendingApprovals = [...pendingApprovals, ...newPendingApprovals];

          if (allPendingApprovals.length > 0) {
            const existingApprovalStates =
              (input.variables.approval_states as Record<string, unknown>) ?? {};
            const approvalStates: Record<string, unknown> = { ...existingApprovalStates };

            for (const approval of allPendingApprovals) {
              if (approvalStates[approval.toolName]) continue;
              const approvalToolConfig = config.tools.find(
                (tool) => tool.name === approval.toolName,
              );
              const approvalToolType = approvalToolConfig?.type ?? approvalToolConfig?.toolType;
              const approvalValue =
                approvalToolType === "update-variable" && approval.toolArgs
                  ? (approval.toolArgs as { value?: unknown }).value
                  : approval.toolArgs;

              approvalStates[approval.toolName] = {
                status: "pending",
                value: approvalValue,
                riskLevel: approval.riskLevel,
                toolCallId: approval.toolCallId,
                stepId,
                createdAt: new Date().toISOString(),
                rejection_count: 0,
                rejection_history: [],
              };
            }

            return {
              result: {
                completed: false,
                turnCount,
                pendingApprovals: allPendingApprovals.length,
              },
              variableUpdates: {
                approval_states: approvalStates,
              },
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
            executionVariables,
            approvedTools,
            turnCount,
          );

          return {
            result: {
              completed: isNowComplete,
              turnCount,
              textLength: runtimeResult.fullText.length,
              toolCallsProcessed: runtimeResult.toolOutcomes.length,
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
        }).pipe(
          Effect.tapError((error) =>
            Effect.sync(() => {
              const tagged =
                error && typeof error === "object" && "_tag" in error
                  ? (error as Record<string, unknown>)
                  : null;
              const message =
                error instanceof Error
                  ? error.message
                  : typeof tagged?.message === "string" && tagged.message.length > 0
                    ? tagged.message
                    : typeof error === "string"
                      ? error
                      : (() => {
                          try {
                            return JSON.stringify(error);
                          } catch {
                            return String(error);
                          }
                        })();
              const stack =
                error instanceof Error
                  ? error.stack
                  : typeof tagged?.stack === "string"
                    ? tagged.stack
                    : undefined;
              console.error("[SandboxedAgent] execute failed", {
                executionId: input.executionId,
                stepId: input.stepId ?? "agent",
                stepNumber: input.stepNumber,
                stepType: input.stepType ?? "agent",
                message,
                stack,
                error,
              });

              if (tagged?._tag === "SandboxedAgentError") {
                console.error("[SandboxedAgent] error details", {
                  operation: tagged.operation,
                  message: tagged.message,
                  cause: tagged.cause,
                });
              }
            }),
          ),
          Effect.mapError((error) =>
            error instanceof SandboxedAgentError
              ? error
              : new SandboxedAgentError({
                  cause: error,
                  operation: "execute",
                  message: "Sandboxed agent execution failed",
                }),
          ),
        ),
    };
  }),
);
