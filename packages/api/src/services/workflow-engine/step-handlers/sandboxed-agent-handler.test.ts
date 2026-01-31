import { describe, expect, it } from "bun:test";
import { Chunk, Effect, Layer } from "effect";
import { ConfigServiceLive, DatabaseServiceLive, ExecutionContextLive } from "../effect";
import { AIProviderService, type StreamResult } from "../effect/ai-provider-service";
import { WorkflowEventBus } from "../effect/event-bus";
import type { StepHandlerInput } from "../effect/step-registry";
import { VariableService } from "../effect/variable-service";
import {
  type ConversationState,
  type SandboxedAgentConfig,
  SandboxedAgentHandler,
  SandboxedAgentHandlerLive,
} from "./sandboxed-agent-handler";

// ===== TEST MOCKS =====

const createMockAIProvider = (textResponse: string): Layer.Layer<AIProviderService> => {
  return Layer.succeed(AIProviderService, {
    loadModel: () => Effect.succeed({ provider: "test", modelId: "test" }),
    streamText: () =>
      Effect.succeed({
        textStream: Effect.succeed(textResponse),
        fullStream: Effect.succeed(
          Chunk.of({ type: "text-delta" as const, textDelta: textResponse }),
        ),
        finishReason: "stop" as const,
        usage: { promptTokens: 10, completionTokens: 20 },
      } as StreamResult),
    generateText: () =>
      Effect.succeed({
        text: textResponse,
        usage: { promptTokens: 10, completionTokens: 20 },
      }),
  });
};

const createMockEventBus = (): Layer.Layer<WorkflowEventBus> => {
  return Layer.succeed(WorkflowEventBus, {
    publish: () => Effect.succeed(true),
  });
};

const createMockVariableService = (): Layer.Layer<VariableService> => {
  return Layer.succeed(VariableService, {
    set: () => Effect.succeed(undefined),
    get: () => Effect.succeed(undefined),
    getAll: () => Effect.succeed({}),
    merge: () => Effect.succeed({}),
    delete: () => Effect.succeed(true),
    getHistory: () => Effect.succeed([]),
    resolveTemplate: () => Effect.succeed(""),
    resolveObject: () => Effect.succeed({}),
    propagateToParent: () => Effect.succeed(true),
  });
};

// ===== HELPERS =====

function createInput(
  config: SandboxedAgentConfig,
  variables: Record<string, unknown> = {},
  executionId = "test-execution-id",
): StepHandlerInput {
  return {
    stepConfig: config as unknown as Record<string, unknown>,
    variables,
    executionId,
  };
}

function runHandler(input: StepHandlerInput, userInput?: unknown) {
  const program = Effect.gen(function* () {
    const handler = yield* SandboxedAgentHandler;
    return yield* handler.execute(input, userInput);
  });

  const contextLayer = Layer.mergeAll(
    DatabaseServiceLive,
    ExecutionContextLive({
      executionId: input.executionId,
      workflowId: "test-workflow",
      projectId: undefined,
      parentExecutionId: null,
      userId: "test-user",
      variables: input.variables,
      currentStepNumber: 1,
    }),
  );

  const configLayer = ConfigServiceLive.pipe(Layer.provide(contextLayer));

  const baseLayer = Layer.mergeAll(
    contextLayer,
    configLayer,
    createMockAIProvider("Hello, I'm your AI assistant"),
    createMockEventBus(),
    createMockVariableService(),
  );

  const handlerLayer = SandboxedAgentHandlerLive.pipe(Layer.provide(baseLayer));

  const layer = Layer.mergeAll(baseLayer, handlerLayer);

  return Effect.runPromise(program.pipe(Effect.provide(layer)));
}

// ===== TESTS =====

describe("SandboxedAgentHandler", () => {
  describe("initialization", () => {
    it("requires user input on first call when no conversation state", async () => {
      const input = createInput(
        {
          systemPrompt: "You are a helpful assistant",
          userPrompt: "Help me with {{task}}",
          tools: [],
          completionCondition: { type: "max-turns", maxTurns: 3 },
        },
        { task: "testing" },
      );

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(true);
      expect(result.conversationState?.messages.length).toBeGreaterThan(0);
    });

    it("resolves variables in prompts using Handlebars syntax", async () => {
      const input = createInput(
        {
          systemPrompt: "Help with {{project}}",
          userPrompt: "Task: {{task}}",
          tools: [],
          completionCondition: { type: "max-turns", maxTurns: 1 },
        },
        { project: "Chiron", task: "testing" },
      );

      const result = await runHandler(input);

      const systemMsg = result.conversationState?.messages[0];
      expect(systemMsg?.content).toBe("Help with Chiron");
    });

    it("generates initial message when configured", async () => {
      const input = createInput(
        {
          systemPrompt: "You are a creative writer",
          userPrompt: "Write a story about {{topic}}",
          tools: [],
          completionCondition: { type: "max-turns", maxTurns: 1 },
          generateInitialMessage: true,
        },
        { topic: "adventure" },
      );

      const result = await runHandler(input);

      expect(result.conversationState?.messages.length).toBeGreaterThanOrEqual(2);
      expect(result.conversationState?.messages[1]?.role).toBe("assistant");
    });
  });

  describe("conversation state", () => {
    it("preserves conversation state across calls", async () => {
      const existingState: ConversationState = {
        messages: [
          { role: "system", content: "Assistant" },
          { role: "user", content: "Start" },
          { role: "assistant", content: "How can I help?" },
        ],
        turnCount: 1,
        approvedTools: [],
        pendingApprovals: [],
        completedToolCalls: [],
      };

      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Continue",
        tools: [],
        completionCondition: { type: "max-turns", maxTurns: 5 },
        _conversationState: existingState,
      });

      const result = await runHandler(input, "Continue please");

      expect(result.conversationState?.messages.length).toBe(4);
      expect(result.conversationState?.messages[3].content).toBe("Continue please");
    });

    it("handles string user messages", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [],
        completionCondition: { type: "max-turns", maxTurns: 5 },
        _conversationState: {
          messages: [
            { role: "system", content: "Assistant" },
            { role: "user", content: "Start" },
          ],
          turnCount: 1,
          approvedTools: [],
          pendingApprovals: [],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input, "Hello, I need help");

      expect(result.conversationState?.messages.length).toBe(3);
      expect(result.conversationState?.messages[2].content).toBe("Hello, I need help");
    });
  });

  describe("approval flow", () => {
    it("processes tool configs but awaits AI-initiated tool calls", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [
          {
            name: "update_config",
            type: "update-variable",
            description: "Update configuration",
            inputSchema: {
              type: "object",
              properties: {
                variableName: { type: "string" },
                value: { type: "string" },
              },
              required: ["variableName", "value"],
            },
            approval: {
              required: true,
              riskLevel: "moderate",
              mode: "confirm",
            },
          },
        ],
        completionCondition: { type: "all-tools-approved" },
        _conversationState: {
          messages: [
            { role: "system", content: "Assistant" },
            { role: "user", content: "Start" },
          ],
          turnCount: 1,
          approvedTools: [],
          pendingApprovals: [],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(true);
      expect(result.pendingApproval).toBeUndefined();
    });

    it("approves tool and continues conversation", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [
          {
            name: "update_variable",
            type: "update-variable",
            description: "Update a variable",
            inputSchema: {
              type: "object",
              properties: {
                variableName: { type: "string" },
                value: { type: "string" },
              },
              required: ["variableName", "value"],
            },
            approval: {
              required: true,
              riskLevel: "moderate",
              mode: "confirm",
            },
          },
        ],
        completionCondition: { type: "all-tools-approved" },
        _conversationState: {
          messages: [
            { role: "system", content: "Assistant" },
            { role: "user", content: "Start" },
          ],
          turnCount: 1,
          approvedTools: [],
          pendingApprovals: [
            {
              toolCallId: "call-update_variable",
              toolName: "update_variable",
              toolArgs: { variableName: "count", value: "10" },
              riskLevel: "moderate",
              approvalConfig: { mode: "confirm", riskLevel: "moderate" },
            },
          ],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input, {
        type: "approval",
        toolCallId: "call-update_variable",
        toolName: "update_variable",
        approved: true,
      });

      expect(result.conversationState?.approvedTools).toContain("update_variable");
      expect(result.conversationState?.pendingApprovals.length).toBe(0);
    });

    it("rejects tool when user denies approval", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [
          {
            name: "delete_file",
            type: "custom",
            description: "Delete a file",
            inputSchema: {
              type: "object",
              properties: { path: { type: "string" } },
            },
            approval: {
              required: true,
              riskLevel: "dangerous",
              mode: "confirm",
              confirmMessage: "This will permanently delete the file. Continue?",
            },
          },
        ],
        completionCondition: { type: "max-turns", maxTurns: 5 },
        _conversationState: {
          messages: [
            { role: "system", content: "Assistant" },
            { role: "user", content: "Start" },
          ],
          turnCount: 1,
          approvedTools: [],
          pendingApprovals: [
            {
              toolCallId: "call-delete_file",
              toolName: "delete_file",
              toolArgs: { path: "/tmp/test.txt" },
              riskLevel: "dangerous",
              approvalConfig: { mode: "confirm", riskLevel: "dangerous" },
            },
          ],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input, {
        type: "approval",
        toolCallId: "call-delete_file",
        toolName: "delete_file",
        approved: false,
      });

      expect(result.conversationState?.approvedTools).not.toContain("delete_file");
      expect(result.conversationState?.pendingApprovals.length).toBe(0);
    });
  });

  describe("completion conditions", () => {
    it("completes when max turns reached", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [],
        completionCondition: { type: "max-turns", maxTurns: 2 },
        _conversationState: {
          messages: [
            { role: "system", content: "Assistant" },
            { role: "user", content: "Start" },
          ],
          turnCount: 2,
          approvedTools: [],
          pendingApprovals: [],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(false);
      expect(result.result.completed).toBe(true);
      expect(result.streamComplete).toBe(true);
    });

    it("completes when all tools approved", async () => {
      const input = createInput({
        systemPrompt: "Assistant",
        userPrompt: "Start",
        tools: [
          {
            name: "tool1",
            type: "update-variable",
            description: "T1",
            inputSchema: {},
            approval: { required: true, riskLevel: "safe" },
          },
          {
            name: "tool2",
            type: "update-variable",
            description: "T2",
            inputSchema: {},
            approval: { required: true, riskLevel: "safe" },
          },
        ],
        completionCondition: { type: "all-tools-approved" },
        _conversationState: {
          messages: [],
          turnCount: 0,
          approvedTools: ["tool1", "tool2"],
          pendingApprovals: [],
          completedToolCalls: [],
        },
      });

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(false);
      expect(result.result.completed).toBe(true);
    });

    it("completes when all required variables set", async () => {
      const input = createInput(
        {
          systemPrompt: "Assistant",
          userPrompt: "Start",
          tools: [],
          completionCondition: {
            type: "all-variables-set",
            requiredVariables: ["name", "email"],
          },
        },
        { name: "John", email: "john@example.com" },
      );

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(false);
      expect(result.result.completed).toBe(true);
    });

    it("continues when required variables missing", async () => {
      const input = createInput(
        {
          systemPrompt: "Assistant",
          userPrompt: "Start",
          tools: [],
          completionCondition: {
            type: "all-variables-set",
            requiredVariables: ["name", "email"],
          },
        },
        { name: "John" },
      );

      const result = await runHandler(input);

      expect(result.requiresUserInput).toBe(true);
      expect(result.result.completed).toBe(false);
    });
  });

  describe("error handling", () => {
    it("handles missing variables gracefully", async () => {
      const input = createInput({
        systemPrompt: "Help with {{missingVar}}",
        userPrompt: "Task",
        tools: [],
        completionCondition: { type: "max-turns", maxTurns: 5 },
      });

      const result = await runHandler(input);

      // Handler processes template with missing var, awaits user input
      expect(result.requiresUserInput).toBe(true);
    });
  });
});
