# Chiron Orchestration Architecture v2

> Research document summarizing architectural decisions for multi-agent orchestration, memory sharing, and prompt optimization.
> 
> Date: December 23, 2025

---

## Table of Contents

1. [What Chiron Is](#1-what-chiron-is)
2. [Two-Agent Architecture](#2-two-agent-architecture)
3. [Step Type: opencode-session](#3-step-type-opencode-session)
4. [MCP Integration Pattern](#4-mcp-integration-pattern)
5. [Memory Sharing (Mastra → OpenCode)](#5-memory-sharing-mastra--opencode)
6. [Ax Optimization Strategy](#6-ax-optimization-strategy)
7. [Data Collection and Optimization Flow](#7-data-collection-and-optimization-flow)
8. [Full Architecture Diagram](#8-full-architecture-diagram)
9. [Key Decisions](#9-key-decisions)
10. [Open Questions](#10-open-questions)

---

## 1. What Chiron Is

### Refined Definition

| Aspect | Definition |
|--------|------------|
| **Core Identity** | A **guided software development methodology platform** |
| **Purpose** | Walk users through structured methodology (BMAD-based), using AI agents as workers |
| **Philosophy** | "Guided not automated" — humans make strategic decisions, agents execute |
| **Thesis Goal** | Validate 2x productivity via parallel multi-agent orchestration with isolated contexts |

### Key Distinction

Chiron **guides** (mentors, structures decisions, ensures quality), not just **orchestrates** (coordinate agents).

- **Guidance** = Walk the user through structured methodology
- **Orchestration** = Manage agent execution (a subset of guidance)

### Core Capabilities

1. **Guides users through structured methodology** — BMAD-based by default, fully configurable
2. **Uses AI agents as workers** — Multiple agents can work in parallel with git worktree isolation
3. **Delegates "computer use" to OpenCode** — File operations, code generation, bash commands
4. **Provides rigid step primitives with flexible configuration** — Step types are fixed building blocks; agents, workflows, step params are user-configurable
5. **Ensures quality through structure** — Chat patterns, approval gates, validations, phase tracking

---

## 2. Two-Agent Architecture

### The Split

| Agent | Phase | Capabilities | Produces |
|-------|-------|--------------|----------|
| **Mastra** | Planning (0-2) | Memory, semantic recall, working memory, agent networks, reasoning | PRD, epics, stories, specs, decisions |
| **OpenCode** | Implementation (3) + Diagnostics | File system, bash, git, LSP, MCP ecosystem | Working code, project analysis |

### Why This Split?

- **Planning = thinking, reasoning, memory** → Mastra's strength
- **Implementation = doing, files, code** → OpenCode's strength
- **Implementation is a byproduct of correct planning**

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CHIRON                              │
│  Orchestrator · State Manager · MCP Server · Workflow Engine│
│                                                             │
│  - Guides users through BMAD phases                         │
│  - Manages workflow state in PostgreSQL                     │
│  - Provides MCP tools to agents                             │
│  - Handles ax optimization                                  │
│  - Unified ai-sdk model/auth config                         │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
         Planning (0-2)            Implementation (3)
           + Some                    + Diagnostics
         Diagnostics                      
                │                         │
                ▼                         ▼
┌───────────────────────────┐ ┌───────────────────────────────┐
│         MASTRA            │ │          OPENCODE             │
│                           │ │                               │
│  ✓ Memory (semantic)      │ │  ✓ File system                │
│  ✓ Working memory         │ │  ✓ Bash/terminal              │
│  ✓ Agent networks         │ │  ✓ Git operations             │
│  ✓ Reasoning/artifacts    │ │  ✓ LSP tools                  │
│  ✗ NO file access         │ │  ✓ MCP ecosystem              │
│                           │ │                               │
└───────────────────────────┘ └───────────────────────────────┘
```

### Unified ai-sdk Layer

Both Mastra and OpenCode use Vercel AI SDK:
- Unified model provider configuration (Anthropic, OpenAI, etc.)
- Same auth/API key patterns
- Can share model instances
- Consistent streaming patterns

---

## 3. Step Type: opencode-session

OpenCode is exposed to workflows via a step type, not as a separate system.

### Usage Scenarios

| Scenario | Phase | What OpenCode Does |
|----------|-------|-------------------|
| **Project Diagnostics** | Phase 0 (Init) | Explore existing codebase, analyze structure, generate diagnostic report |
| **Story Implementation** | Phase 3 | Write code, run tests, fix issues, complete stories |
| **Code Review** | Phase 3 | Analyze changes, suggest improvements |
| **Refactoring** | Phase 3 | Execute refactoring tasks across codebase |

### Example: Project Initialization Diagnostic

```yaml
step:
  id: analyze-existing-project
  type: opencode-session
  config:
    task: |
      Analyze this existing project and provide a diagnostic:
      - Tech stack detection
      - Project structure analysis
      - Dependency audit
      - Code quality assessment
      - Test coverage estimation
    tools:
      - recall_context
      - save_diagnostic
      - set_variable
```

### Example: Story Implementation

```yaml
step:
  id: implement-story
  type: opencode-session
  config:
    task: "Implement story {{story.id}}: {{story.title}}"
    context:
      - story_spec
      - acceptance_criteria
      - relevant_architecture
    tools:
      - complete_story
      - unblock_story
      - request_review
      - learn_pattern
```

---

## 4. MCP Integration Pattern

### Chiron as MCP Server

Chiron provides contextual tools to agents via MCP protocol:

```
Chiron spawns workflow execution
    │
    ├── Creates MCP endpoint: /mcp/execution/:id
    ├── Tools scoped to current step type
    ├── Connects agent (Mastra or OpenCode) to MCP
    │
    └── Agent calls tools → Chiron updates state
```

### Dynamic Tool Injection/Disposal

Tools are:
- **Added** when relevant (e.g., `unblock_story` when dependencies exist)
- **Removed** after success (e.g., `complete_story` disposed after use)
- **Scoped** to step type

### Step Type → Tool Mapping

| Step Type | MCP Tools Available |
|-----------|---------------------|
| `ask-user-chat` | `set_variable`, `complete_step` |
| `generate-artifact` | `save_artifact`, `revise_artifact`, `complete_step` |
| `opencode-session` | `complete_story`, `unblock_story`, `request_review`, `recall_context`, `learn_pattern`, `set_variable` |
| `approval-gate` | `approve`, `reject`, `request_changes` |

### Tool Lifecycle Example

```typescript
// Chiron's MCP server for story implementation
const storyMCP = {
  tools: {
    complete_story: {
      description: 'Mark the current story as complete',
      execute: async () => {
        await completeStory(storyId);
        // DISPOSE: Remove this tool after success
        this.tools.delete('complete_story');
        await this.notifyToolsChanged();
        return { success: true };
      }
    },
    
    unblock_story: {
      description: 'Unblock a dependent story',
      parameters: { storyId: z.string() },
      execute: async ({ storyId }) => {
        await unblockStory(storyId);
        const remaining = await getRemainingBlockedStories();
        if (remaining.length === 0) {
          // DISPOSE: No more stories to unblock
          this.tools.delete('unblock_story');
          await this.notifyToolsChanged();
        }
        return { success: true };
      }
    },
  }
};
```

---

## 5. Memory Sharing (Mastra → OpenCode)

### Hybrid Approach (Recommended)

1. **On session start**: Inject playbook + relevant context in system prompt (static snapshot)
2. **During session**: MCP tools for read/write (dynamic)

### Implementation

```typescript
// When Chiron starts an opencode-session step
const workingMemory = await mastraMemory.getWorkingMemory({
  threadId: agentId,
  resourceId: projectId,
});

const relevantContext = await mastraMemory.recall({
  threadId: agentId,
  resourceId: projectId,
  vectorSearchString: story.description,
});

// Inject into OpenCode session system prompt
const systemPrompt = `
  ## Agent Playbook (Learned Patterns)
  ${workingMemory}
  
  ## Relevant Past Context
  ${JSON.stringify(relevantContext.messages)}
  
  ## Current Task
  Implement story: ${story.title}
`;

// Create session with injected context
await opencode.session.create({ systemPrompt });

// Attach MCP tools for dynamic memory access
await opencode.session.addMCP('chiron-memory', memoryMCPEndpoint);
```

### Memory MCP Tools

```typescript
const memoryMCP = {
  tools: {
    // Read from memory
    recall_context: {
      description: 'Search memory for relevant past patterns or decisions',
      parameters: { query: z.string() },
      execute: async ({ query }) => {
        const { messages } = await mastraMemory.recall({
          threadId: agentId,
          vectorSearchString: query,
        });
        return JSON.stringify(messages);
      }
    },
    
    get_playbook: {
      description: 'Get the current agent playbook (learned patterns)',
      execute: async () => {
        return await mastraMemory.getWorkingMemory({
          threadId: agentId,
          resourceId: projectId,
        });
      }
    },
    
    // Write to memory
    learn_pattern: {
      description: 'Record a pattern for future reference',
      parameters: { 
        pattern: z.string(),
        category: z.enum(['success', 'failure', 'preference'])
      },
      execute: async ({ pattern, category }) => {
        await mastraMemory.updateWorkingMemory({
          threadId: agentId,
          update: { [category]: pattern }
        });
        return { success: true };
      }
    },
    
    remember_decision: {
      description: 'Save an important decision for future context',
      parameters: { decision: z.string(), reasoning: z.string() },
      execute: async ({ decision, reasoning }) => {
        await mastraMemory.saveMessages({
          messages: [{
            threadId: agentId,
            role: 'assistant',
            content: `Decision: ${decision}\nReasoning: ${reasoning}`,
          }]
        });
        return { success: true };
      }
    },
  }
};
```

### ACE-like Behavior via Memory

This pattern gives ACE-like behavior (evolving agent) without integrating ACE framework directly:

```
Session 1: Implement Story A
├── Playbook: (empty)
├── Agent struggles with auth pattern
├── Agent calls: learn_pattern("Use middleware for auth, not inline")
└── Playbook updated

Session 2: Implement Story B
├── Playbook: "Use middleware for auth, not inline"
├── Agent sees playbook, applies pattern correctly
├── Tests pass
└── Continues learning...
```

---

## 6. Ax Optimization Strategy

### Optimizer-to-Domain Mapping

| Optimizer | Domain | Why It Fits |
|-----------|--------|-------------|
| **ACE** | Agent level | Agent playbook evolves over time (implemented via Mastra working memory) |
| **GEPA** | Artifact generation | Multi-objective: completeness vs conciseness vs clarity (Pareto frontier) |
| **MiPRO** | Classification/selection | Single metric: accuracy (complexity, workflow path, project type) |

### Reality Check

| Optimizer | What It Actually Does | In ax-llm? |
|-----------|----------------------|------------|
| **MiPRO** | Single-objective prompt optimization. Finds best instruction + few-shot examples for ONE metric. | ✅ Yes (`AxMiPRO`) |
| **GEPA** | Multi-objective prompt optimization. Finds Pareto frontier of trade-offs between 2+ metrics. | ✅ Yes (`AxGEPA`) |
| **ACE** | Self-improving agent with evolving playbook. Three-agent architecture. | ❌ No — Separate framework, implemented via Mastra memory |

### The Actual Distinction

| Question | Optimizer |
|----------|-----------|
| Do I have **one metric** to maximize? | **MiPRO** |
| Do I have **2+ competing metrics** to balance? | **GEPA** |
| Do I need **evolving agent knowledge**? | **ACE** (via Mastra memory) |

### Concrete Examples

**MiPRO (Classification in workflow-init):**

```typescript
// Select complexity level
const selectComplexity = axSignature({
  optimizer: 'mipro',
  metric: (pred, example) => pred.complexity === example.complexity ? 1 : 0,
});

// Select workflow path
const selectWorkflowPath = axSignature({
  optimizer: 'mipro',
  metric: (pred, example) => pred.workflowPath === example.workflowPath ? 1 : 0,
});
```

**GEPA (Artifact generation):**

```typescript
// Generate PRD
const generatePRD = axSignature({
  optimizer: 'gepa',
  metrics: {
    completeness: (pred) => coverageScore(pred.prd, requiredSections),
    clarity: (pred) => readabilityScore(pred.prd),
    conciseness: (pred) => pred.prd.length < 5000 ? 1 : 5000 / pred.prd.length,
  },
});

// Generate Epic
const generateEpic = axSignature({
  optimizer: 'gepa',
  metrics: {
    storyDecomposition: (pred) => storiesAreSized(pred.stories) ? 1 : 0,
    acceptance: (pred) => hasAcceptanceCriteria(pred) ? 1 : 0,
    estimability: (pred) => hasEstimates(pred) ? 1 : 0,
  },
});
```

**ACE (Agent-level via Mastra memory):**

```typescript
// Planning Agent with evolving playbook
const planningAgent = new Agent({
  memory: new Memory({
    storage: new PostgresStore({ connectionString }),
    options: {
      workingMemory: {
        enabled: true,
        template: `
          ## Learned Patterns
          {{patterns}}
          
          ## Common Mistakes to Avoid  
          {{mistakes}}
          
          ## User Preferences
          {{preferences}}
        `
      }
    }
  })
});
```

---

## 7. Data Collection and Optimization Flow

### Runtime (Passive Collection)

Every ax-enabled step execution captures data:

```
Step executes
    │
    ├── Input captured (user message, context)
    ├── Output captured (extracted variables, generated artifact)
    ├── User signal: approved / rejected / edited
    │
    └── Saved to ax_examples table
        {
          signature_id,
          workflow_execution_id,
          input,
          output,
          label: 'approved' | 'rejected' | 'edited',
          edited_output,  // If user made corrections
          created_at
        }
```

### Workflow Builder (Active Optimization)

```
User opens Workflow Builder
    │
    ├── Sees: "Step X has 47/50 examples"
    ├── Sees: Current accuracy metrics
    │
    ├── Manual trigger: Click "Optimize Now"
    └── Auto trigger: Threshold hit (50 examples)
            │
            ├── Run MiPRO or GEPA based on signature config
            ├── Compare: old prompt vs optimized prompt
            ├── Show metrics improvement
            ├── User confirms
            └── Save optimized prompt (versioned, rollback possible)
```

### Optimization Settings (Per Workflow)

```yaml
optimization:
  auto_optimize_enabled: true
  min_examples_threshold: 50
  min_accuracy_delta: 0.05  # 5% improvement required
  default_optimizer: mipro
  notify_on_optimization: true
  require_approval: true
```

### Implicit Labeling

No explicit labeling required — signals come from user actions:

| User Action | Label | Meaning |
|-------------|-------|---------|
| User approves | `approved` | Output was correct |
| User rejects | `rejected` | Output was wrong |
| User edits | `edited` | Output was close but needed adjustment |
| System auto-proceeds | `auto` | No validation (less reliable signal) |

For `edited` cases, both original output and user's correction are stored — valuable training data.

---

## 8. Full Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CHIRON                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Workflow   │  │     MCP      │  │      Ax      │      │
│  │    Engine    │  │    Server    │  │  Optimizer   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                 │                 │               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │    Mastra    │  │   ai-sdk     │      │
│  │    State     │  │    Memory    │  │   Models     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
         Planning                  Implementation
         + Diagnostics              + Diagnostics
                │                         │
                ▼                         ▼
┌───────────────────────────┐ ┌───────────────────────────────┐
│         MASTRA            │ │          OPENCODE             │
│                           │ │  (via opencode-session step)  │
│  + Memory (playbook)      │ │                               │
│  + GEPA artifacts         │ │  + MCP tools from Chiron      │
│  + MiPRO classification   │ │  + Memory via MCP             │
│  + Agent networks         │ │  + Git worktree isolation     │
│                           │ │  + File/bash/git access       │
└───────────────────────────┘ └───────────────────────────────┘
```

---

## 9. Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Planning agent | Mastra | Memory, semantic recall, working memory, reasoning |
| Implementation agent | OpenCode | File ops, bash, git, LSP, full computer use |
| OpenCode integration | Step type (`opencode-session`) | Consistent with workflow engine, not separate system |
| Agent-Chiron communication | MCP protocol | Standard, dynamic tool injection, OpenCode-native |
| Memory sharing | System prompt + MCP tools (hybrid) | Static snapshot + dynamic access |
| ACE implementation | Mastra working memory | No need for separate ACE framework |
| GEPA usage | Artifact generation | Multi-objective (quality, completeness, conciseness) |
| MiPRO usage | Classification tasks | Single-objective (accuracy) |
| Optimization trigger | Threshold-based + manual | 50 examples default, user can override |
| Tool lifecycle | Dynamic injection/disposal | Tools scoped to step, removed after use |

---

## 10. Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| Exact MCP tool schemas | To be designed | Need Zod schemas for all step type tools |
| How Chiron UI renders OpenCode conversation | To be decided | Proxy? Embed? Separate view? |
| OpenCode session lifecycle management | To be designed | How to start/stop/resume sessions |
| Git worktree management for parallel agents | To be designed | Epic 4 scope |
| Workflow builder UI for optimization | Epic 7 | Show examples, trigger optimization, compare results |
| Effect integration | Deferred | Consider for error handling, retries, resilience |

---

## References

- [OpenCode Codebase](../external/opencode/) — Agent implementation reference
- [Mastra Documentation](https://mastra.ai/docs) — Memory, agents, workflows
- [ax-llm Documentation](https://axllm.dev) — MiPRO, GEPA optimizers
- [spike-ax-mastra-approval-gates.md](./spike-ax-mastra-approval-gates.md) — Previous research (partially superseded)
- [opencode-chiron-integration.md](./opencode-chiron-integration.md) — Previous integration research
- [ax-optimizers-comparison-mipro-gepa-ace.md](./ax-optimizers-comparison-mipro-gepa-ace.md) — Optimizer comparison

---

## Changelog

- **2025-12-23**: Initial document created from research discussion
