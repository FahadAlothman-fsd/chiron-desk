# Mastra Deep Dive: Agent Orchestration for Chiron

**Date:** 2025-11-10  
**Research Team:** Winston (Architect) + Mary (Analyst)  
**Status:** Research Complete  
**Sources:** Official docs, GitHub, web search

---

## Executive Summary

**Mastra is an all-in-one TypeScript framework for building AI-powered applications and agents**, created by former Gatsby team members. It provides:

- **Agent framework** with tool calling and memory
- **Workflow engine** with suspend/resume (human-in-the-loop)
- **Multi-modal support** (text, images, audio)
- **40+ LLM providers** including OpenRouter
- **Built-in observability** (OpenTelemetry tracing)
- **Production-ready** (used by SoftBank, Plaid, Elastic, Docker)

**Critical Finding for Chiron:** Mastra's **suspend/resume pattern** is EXACTLY what Fahad needs for approval-gate chat workflows!

---

## Core Capabilities

### 1. Agent Framework

**Source:** [https://mastra.ai/docs/agents/overview](https://mastra.ai/docs/agents/overview)

```typescript
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";

export const pmAgent = new Agent({
  name: "pm",
  instructions: "You are a PM helping users describe their project.",
  model: anthropic("claude-3-5-sonnet-20241022"),
  tools: { updateSummary, updateComplexity },
});

// Generate responses
const response = await pmAgent.generate("Help me plan my project");

// Stream responses
const stream = await pmAgent.stream("Help me plan my project", {
  onFinish: ({ steps, text, finishReason, usage }) => {
    console.log({ steps, text, finishReason, usage });
  },
});
```

**Key Features:**
- ✅ Supports both Mastra's model router AND Vercel AI SDK models
- ✅ Structured output with Zod schemas
- ✅ Tool calling with automatic LLM decision-making
- ✅ Memory management across conversations
- ✅ Streaming with `onStepFinish` callbacks

---

### 2. Human-in-the-Loop Workflows (CRITICAL FOR CHIRON!)

**Source:** [https://mastra.ai/docs/workflows/human-in-the-loop](https://mastra.ai/docs/workflows/human-in-the-loop)

Mastra workflows can **suspend execution** and wait for human input using `suspend()` and `resume()`:

```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows";

const gameStep = createStep({
  id: "game-step",
  description: "Handles the question-answer-continue loop",
  resumeSchema: z.object({
    userMessage: z.string(),
  }),
  suspendSchema: z.object({
    suspendResponse: z.string(),
  }),
  execute: async ({ inputData, mastra, resumeData, suspend }) => {
    const { userMessage } = resumeData ?? {};
    
    if (!userMessage) {
      // PAUSE EXECUTION → Return to frontend
      return await suspend({
        suspendResponse: "I'm thinking of a famous person. Ask me yes/no questions!",
      });
    }
    
    // User input received → Continue execution
    const agent = mastra.getAgent("gameAgent");
    const response = await agent.generate(userMessage);
    
    return { agentResponse: response.text, gameWon: false };
  },
});

const workflow = createWorkflow({
  id: "heads-up-workflow",
  inputSchema: z.object({ start: z.boolean() }),
  outputSchema: z.object({ gameWon: z.boolean() }),
})
  .then(startStep)
  .dountil(gameStep, async ({ inputData: { gameWon } }) => gameWon) // Repeat until condition
  .commit();
```

**How It Works:**
1. **First call:** Workflow executes, hits `suspend()`, returns to frontend
2. **Frontend:** Shows UI to user, collects input
3. **Second call:** Frontend calls workflow with `resumeData: { userMessage }`, execution continues
4. **Loop:** Repeats until condition met (`gameWon === true`)

**Chiron Approval-Gate Pattern:**

```typescript
const complexityStep = createStep({
  id: "complexity-analysis-step",
  resumeSchema: z.object({
    userMessage?: z.string(),
    approval?: z.object({ approved: z.boolean(), field: z.string() }),
  }),
  suspendSchema: z.object({
    type: z.enum(["chat", "approval_request"]),
    message?: z.string(),
    approvalRequest?: z.object({ field: z.string(), value: z.any() }),
  }),
  execute: async ({ inputData, mastra, resumeData, suspend }) => {
    // Handle approval response
    if (resumeData?.approval) {
      if (resumeData.approval.approved) {
        // Save approved value, continue
        inputData.approvedSummary = resumeData.approval.value;
      } else {
        // User rejected, ask agent to revise
        const agent = mastra.getAgent("pmAgent");
        const response = await agent.generate("User rejected summary, please revise");
        return await suspend({ type: "chat", message: response.text });
      }
    }
    
    // Normal chat message
    if (resumeData?.userMessage) {
      const agent = mastra.getAgent("pmAgent");
      const response = await agent.generate(resumeData.userMessage, {
        tools: { updateSummary, updateComplexity },
      });
      
      // Check if agent triggered approval tool
      const approvalTool = response.toolCalls?.find(t => t.tool === "updateSummary");
      if (approvalTool) {
        // PAUSE → Show approval modal
        return await suspend({
          type: "approval_request",
          approvalRequest: { field: "summary", value: approvalTool.result },
        });
      }
      
      // No approval needed, continue chat
      return await suspend({ type: "chat", message: response.text });
    }
    
    // Initial message
    return await suspend({ type: "chat", message: "Tell me about your project!" });
  },
});
```

---

### 3. Tool Calling with Approval Gates

**Source:** [https://mastra.ai/docs/agents/using-tools](https://mastra.ai/docs/agents/using-tools)

Tools in Mastra can return **custom objects** that trigger frontend actions:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const updateSummaryTool = createTool({
  id: "update-summary",
  description: "Propose project summary for user approval",
  inputSchema: z.object({
    summary: z.string().describe("Concise 1-2 sentence project summary"),
  }),
  outputSchema: z.object({
    type: z.literal("approval_required"),
    field: z.literal("summary"),
    value: z.string(),
  }),
  execute: async ({ summary }, { abortSignal }) => {
    // Tool returns approval request instead of direct value
    return {
      type: "approval_required",
      field: "summary",
      value: summary,
    };
  },
});

export const pmAgent = new Agent({
  name: "pm",
  instructions: "Call update-summary when you understand the project",
  model: anthropic("claude-3-5-sonnet-20241022"),
  tools: { updateSummary: updateSummaryTool },
});
```

**Frontend Handling:**

```typescript
const result = await agent.generate(userMessage);

// Check if any tool returned approval_required
const approvalRequest = result.toolResults?.find(
  (t) => t.result?.type === "approval_required"
);

if (approvalRequest) {
  // PAUSE → Show approval modal
  setShowApprovalModal({
    field: approvalRequest.result.field,
    value: approvalRequest.result.value,
  });
} else {
  // Continue chat
  addMessage({ role: "assistant", content: result.text });
}
```

---

### 4. Structured Output with Tool Calling

**Source:** [https://mastra.ai/docs/agents/overview#structured-output](https://mastra.ai/docs/agents/overview#structured-output)

Mastra supports **structured output WITH tool calling** (ai-sdk limitation: no tool calling with `generateObject`):

```typescript
const response = await agent.generate("Analyze this project", {
  structuredOutput: {
    schema: z.object({
      summary: z.string(),
      complexity: z.enum(["quick-flow", "method", "enterprise"]),
      reasoning: z.string(),
    }),
    model: "openai/gpt-4o", // Required for tool calling + structured output
  },
});

console.log(response.object); // { summary, complexity, reasoning }
console.log(response.toolResults); // Tool calls still executed!
```

**Chiron Use Case:** Generate complexity classification + call approval tools in same LLM call!

---

### 5. LLM Provider Support

**Source:** [https://mastra.ai/models](https://mastra.ai/models)

Mastra supports **600+ models** via two approaches:

**Option 1: Mastra's Model Router (easiest)**
```typescript
import { ai } from "@mastra/core";

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY });
const agent = new Agent({ model: "openai/gpt-4o-mini" });
```

**Option 2: Vercel AI SDK (full control)**
```typescript
import { anthropic } from "@ai-sdk/anthropic";

const agent = new Agent({ model: anthropic("claude-3-5-sonnet-20241022") });
```

**OpenRouter Support:**
```typescript
const llm = ai({
  name: "openrouter",
  apiKey: process.env.OPENROUTER_APIKEY,
  baseURL: "https://openrouter.ai/api/v1",
});
```

---

### 6. Memory Management

**Source:** [https://mastra.ai/docs/agents/agent-memory](https://mastra.ai/docs/agents/agent-memory)

Agents can remember conversation history across multiple calls:

```typescript
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";

export const pmAgent = new Agent({
  name: "pm",
  model: anthropic("claude-3-5-sonnet-20241022"),
  memory: new Memory({
    vector: new LibSQLVector({ connectionUrl: "file:./mastra.db" }),
    embedder: openai.embedding("text-embedding-3-small"),
    options: {
      lastMessages: 5, // Include last 5 messages
      semanticRecall: { topK: 10, messageRange: 1 }, // Retrieve similar past conversations
    },
  }),
});

// Use memory
const response = await pmAgent.generate("Continue our discussion", {
  memory: {
    resource: "workflow-init",
    thread: "user-123-project-setup",
  },
});
```

---

## Integration with Chiron's Stack

### ✅ Compatible with Existing Infrastructure

| Chiron Component | Mastra Integration | Notes |
|------------------|-------------------|-------|
| **tRPC API** | ✅ Works seamlessly | Mastra agents callable from tRPC procedures |
| **Drizzle ORM** | ✅ Compatible | Store conversation state in `workflow_executions.variables` |
| **React + TanStack Query** | ✅ Perfect fit | Frontend subscribes to workflow events via tRPC |
| **OpenRouter** | ✅ Supported | Use ai-sdk with custom baseURL |
| **Better-auth** | ✅ Compatible | Pass `userId` to agent memory for multi-user isolation |
| **PostgreSQL** | ✅ Needs LibSQL adapter | Mastra memory uses LibSQL by default, need PostgreSQL adapter |

---

### 🔧 Integration Pattern for Story 1.6

**Backend: Ask-User-Chat Handler with Mastra**

```typescript
// packages/api/src/services/workflow-engine/step-handlers/ask-user-chat-handler.ts
import { Agent } from "@mastra/core/agent";
import { anthropic } from "@ai-sdk/anthropic";
import { db } from "@chiron/db";

export class AskUserChatStepHandler implements StepHandler {
  async executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    userInput?: { message?: string; approval?: ApprovalResponse }
  ): Promise<StepResult> {
    const config = step.config as AskUserChatStepConfig;
    
    // Initialize Mastra agent
    const agent = new Agent({
      name: "pm",
      instructions: config.systemPrompt,
      model: anthropic("claude-3-5-sonnet-20241022"),
      tools: this.createApprovalTools(context),
    });
    
    // Handle approval response
    if (userInput?.approval) {
      if (userInput.approval.approved) {
        // Save to execution variables
        await db.update(workflowExecutions)
          .set({
            variables: { ...context.variables, [userInput.approval.field]: userInput.approval.value },
          })
          .where(eq(workflowExecutions.id, context.executionId));
        
        // Check if all approvals received
        const isComplete = this.checkCompletionCondition(context.variables, config);
        return {
          output: { approved: userInput.approval.field },
          nextStepNumber: isComplete ? step.nextStepNumber : step.stepNumber,
          requiresUserInput: !isComplete,
        };
      } else {
        // User rejected, continue chat
        const response = await agent.generate("User rejected. Please revise based on feedback.");
        return {
          output: { message: response.text },
          nextStepNumber: step.stepNumber,
          requiresUserInput: true,
        };
      }
    }
    
    // Normal chat message
    const response = await agent.generate(userInput?.message || config.initialMessage);
    
    // Check if any tool triggered approval
    const approvalRequest = response.toolResults?.find(t => t.result?.type === "approval_required");
    if (approvalRequest) {
      return {
        output: {
          type: "approval_request",
          message: response.text,
          approvalRequest: approvalRequest.result,
        },
        nextStepNumber: step.stepNumber, // Stay on same step
        requiresUserInput: true,
      };
    }
    
    // No approval, continue chat
    return {
      output: { message: response.text, conversationId: response.conversationId },
      nextStepNumber: step.stepNumber,
      requiresUserInput: true,
    };
  }
  
  private createApprovalTools(context: ExecutionContext) {
    return {
      updateSummary: createTool({
        id: "update-summary",
        description: "Propose project summary for approval",
        inputSchema: z.object({ summary: z.string() }),
        outputSchema: z.object({
          type: z.literal("approval_required"),
          field: z.literal("summary"),
          value: z.string(),
        }),
        execute: async ({ summary }) => ({
          type: "approval_required",
          field: "summary",
          value: summary,
        }),
      }),
      updateComplexity: createTool({
        id: "update-complexity",
        description: "Propose complexity classification for approval",
        inputSchema: z.object({
          classification: z.enum(["quick-flow", "method", "enterprise"]),
          reasoning: z.string(),
        }),
        outputSchema: z.object({
          type: z.literal("approval_required"),
          field: z.literal("complexity"),
          value: z.object({
            classification: z.string(),
            reasoning: z.string(),
          }),
        }),
        execute: async ({ classification, reasoning }) => ({
          type: "approval_required",
          field: "complexity",
          value: { classification, reasoning },
        }),
      }),
    };
  }
}
```

**Frontend: Approval Modal UI**

```typescript
// apps/web/src/components/workflows/steps/ask-user-chat-step.tsx
export function AskUserChatStep({ step, onSubmit }: AskUserChatStepProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  
  const handleSendMessage = async (message: string) => {
    const result = await trpc.workflows.submitStep.mutate({
      executionId,
      stepNumber: step.stepNumber,
      userInput: { message },
    });
    
    if (result.output.type === "approval_request") {
      // PAUSE CHAT → Show approval modal
      setApprovalRequest(result.output.approvalRequest);
    } else {
      // Continue chat
      setMessages([...messages, { role: "assistant", content: result.output.message }]);
    }
  };
  
  const handleApproval = async (approved: boolean) => {
    const result = await trpc.workflows.submitStep.mutate({
      executionId,
      stepNumber: step.stepNumber,
      userInput: {
        approval: {
          approved,
          field: approvalRequest.field,
          value: approvalRequest.value,
        },
      },
    });
    
    setApprovalRequest(null); // Close modal
    
    if (result.nextStepNumber !== step.stepNumber) {
      // All approvals done, advance to next step
      onSubmit(result);
    } else {
      // Continue chat
      setMessages([...messages, { role: "assistant", content: result.output.message }]);
    }
  };
  
  return (
    <>
      <ChatInterface messages={messages} onSend={handleSendMessage} disabled={!!approvalRequest} />
      
      {approvalRequest && (
        <ApprovalModal
          field={approvalRequest.field}
          value={approvalRequest.value}
          onApprove={() => handleApproval(true)}
          onReject={() => handleApproval(false)}
        />
      )}
    </>
  );
}
```

---

## Pros and Cons for Chiron

### ✅ Pros

1. **Perfect Fit for Approval Gates:** Suspend/resume pattern is EXACTLY what Fahad described
2. **Production-Ready:** Used by major companies (SoftBank, Plaid, Elastic, Docker)
3. **TypeScript-First:** Excellent DX with full type safety
4. **OpenRouter Support:** Works with existing API key setup
5. **Built-in Observability:** OpenTelemetry tracing for debugging
6. **Tool Calling + Structured Output:** ai-sdk limitation solved
7. **Multi-Agent Networks:** Future-proof for Epic 4 (agent collaboration)
8. **Active Development:** Frequent releases (18.1k GitHub stars)

### ⚠️ Cons

1. **Framework Lock-in:** Chiron becomes Mastra-dependent (medium risk)
2. **Memory Adapter Needed:** Default uses LibSQL, need PostgreSQL adapter for Drizzle integration
3. **Learning Curve:** Team needs to learn Mastra patterns (moderate)
4. **Experimental Features:** Agent Networks marked as "Alpha" (use with caution)
5. **Bundle Size:** Unknown (need to measure, likely larger than pure ai-sdk)

---

## Recommendation

**Use Mastra for ask-user-chat step handler in Story 1.6.**

**Rationale:**
- Suspend/resume pattern is battle-tested (used in production)
- Tool-calling with approval gates is cleaner than custom logic
- Structured output + tools solves ai-sdk limitation
- Framework lock-in risk is **acceptable** because:
  - Mastra built on ai-sdk (can migrate later if needed)
  - Open-source (Apache 2.0) with active community
  - Abstractions align with Chiron's needs (agents, workflows, tools)

**Next Steps:**
1. Prototype approval-gate chat with Mastra (1-2 days)
2. Validate integration with tRPC + Drizzle
3. Measure bundle size impact
4. Document decision in ADR

---

## Additional Resources

- **Official Docs:** https://mastra.ai/docs
- **GitHub:** https://github.com/mastra-ai/mastra (18.1k stars)
- **Examples:** https://mastra.ai/templates
- **Discord:** https://discord.gg/BTYqqHKUrf
- **YouTube:** https://www.youtube.com/@mastra-ai (Workshops, tutorials)

---

**Research Completed By:** Winston (Architect) + Mary (Analyst)  
**Date:** 2025-11-10  
**Status:** ✅ COMPLETE - Ready for decision
