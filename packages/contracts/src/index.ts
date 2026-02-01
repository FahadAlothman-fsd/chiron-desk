export type AgentKind = "chiron" | "opencode";

export type AgentMessageRole = "system" | "user" | "assistant";

export type AgentMessage = {
  role: AgentMessageRole;
  content: string;
};

export type AgentToolDefinition = {
  name: string;
  description: string;
  inputSchema: unknown;
};

export type AgentToolConfig = {
  name: string;
  type: "update-variable" | "ax-generation" | "action" | "custom";
  targetVariable?: string;
};

export type AgentToolContext = {
  executionId: string;
  stepId: string;
  eventBus: {
    publish: (event: unknown) => Promise<void> | void;
    stream?: AsyncIterable<unknown>;
  };
};

export type AgentToolOutcomeStatus = "pending" | "approved" | "executed" | "error";

export type AgentToolOutcome = {
  toolName: string;
  status: AgentToolOutcomeStatus;
  args?: unknown;
  result?: unknown;
  error?: string;
};

export type AgentRunParams = {
  executionId: string;
  stepId: string;
  stepNumber: number;
  agentKind: AgentKind;
  directory?: string;
  opencodeBaseUrl?: string;
  model: string;
  messages: AgentMessage[];
  tools: Record<string, unknown>;
  toolDefinitions?: AgentToolDefinition[];
  toolConfigs?: AgentToolConfig[];
  toolContext?: AgentToolContext;
  allowedToolNames?: string[];
};

export type AgentRunResult = {
  fullText: string;
  toolOutcomes: AgentToolOutcome[];
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type AgentStreamEvent =
  | {
      type: "message.delta";
      executionId: string;
      stepId: string;
      text: string;
    }
  | {
      type: "message.complete";
      executionId: string;
      stepId: string;
      text: string;
    }
  | {
      type: "tool.input.start";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
    }
  | {
      type: "tool.input.delta";
      executionId: string;
      stepId: string;
      toolCallId: string;
      delta: string;
    }
  | {
      type: "tool.call";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      args: unknown;
    }
  | {
      type: "tool.pending";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
    }
  | {
      type: "tool.result";
      executionId: string;
      stepId: string;
      toolCallId: string;
      toolName: string;
      result: unknown;
    }
  | {
      type: "error";
      executionId: string;
      stepId: string;
      error: string;
    };

export type ChironContextInput = {
  sessionId: string;
  messageId: string;
};

export type ChironContextOutput = {
  context: unknown;
};

export type ChironActionsInput = {
  sessionId: string;
  messageId: string;
};

export type ChironActionsOutput = {
  actions: Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }>;
};

export type ChironActionInput = {
  sessionId: string;
  messageId: string;
  action: string;
  args: unknown;
};

export type ChironActionOutput = {
  result: unknown;
};
