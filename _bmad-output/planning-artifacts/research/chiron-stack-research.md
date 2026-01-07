# Chiron Stack Research Document

**Date**: 2025-12-31
**Purpose**: Deep research guide for Chiron's technology stack and architecture
**Status**: Living document - to be expanded across multiple sessions

---

## Executive Summary

### What is Chiron?

**Chiron is a workflow engine that serves as a harness for software engineers** to work on their projects more effectively. It provides:

1. **Artifact Generation** - Structured elicitation using BMAD-inspired techniques to produce high-quality requirements (PRD, epics, stories)
2. **Implementation Support** - Orchestrating agents (including OpenCode) to implement code based on those artifacts
3. **Tracking** - PM-grade dashboards for progress, issues, what's next
4. **Prototyping** - Isolated environments for safe experimentation

### Core Insight

> LLM output quality is a **byproduct** of artifact quality. Better PRD + Epics + Stories = Better code from OpenCode.

### Relationship with BMAD

| Concept | Role |
|---------|------|
| **BMAD** | Reference methodology - provides workflow templates, techniques, elicitation patterns |
| **Chiron** | Workflow engine - executes workflows, provides UI/UX, tracks progress |
| **BMAD Workflows** | One TYPE of workflow that runs within Chiron |

Chiron is NOT a BMAD executor. BMAD workflows are seeded as example/reference workflows, but Chiron can run any workflow that uses its primitives.

---

## Technology Stack Overview

| Technology | Role in Chiron | Research Status |
|------------|----------------|-----------------|
| **Effect** | Core shell - orchestration, error handling, streaming, concurrency | [ ] To research |
| **AI-SDK** | LLM primitives - sandboxed-agent, tool calling, approval gates | [ ] To research |
| **AX** | Optimization - ACE playbooks, classification, RAG | [ ] To research |
| **OpenCode** | System-agent - full computer access for implementation | [ ] To research |
| **Tauri** | Desktop application shell | [ ] To research |
| **Server/Client** | Architecture pattern (like OpenCode) | [ ] To research |
| **Git (simple-git)** | Version control, worktrees, artifact versioning | [ ] To research |
| **TDD/Gherkin** | Test-driven development, Gherkin in stories, AX optimization for tests | [ ] To research |
| **Current Implementation** | Audit existing Chiron code - what works, what to keep, what to discard | [ ] To research |

---

## Chiron Primitive Categories

### Level 1: Layout Types (UI Rendering)

How a workflow is displayed to the user.

| Type | Description | Use Case |
|------|-------------|----------|
| `wizard` | Linear step-by-step with stepper navigation | Project initialization, sequential flows |
| `artifact-workbench` | Split-pane: Timeline/Chat + Artifact preview | PRD creation, story writing, brainstorming |
| `dialog` | Modal overlay for child workflows | Technique selection, focused decisions |
| `kanban` (future) | Board view with drag-drop | Sprint planning, story tracking |
| `dashboard` (future) | Metrics and status overview | PM tracking view |

### Level 2: Step Types (Workflow Building Blocks)

What happens at each step of a workflow.

| Type | Description | Agent Type | Tools |
|------|-------------|------------|-------|
| `sandboxed-agent` | AI conversation with defined tools, no computer access | AI-SDK | Configurable per step |
| `system-agent` | Full computer access via OpenCode | OpenCode | Full system |
| `approval-checkpoint` | Human approval with artifact preview | None | Validation rules |
| `branch` | Conditional routing based on variables | None | Condition evaluation |
| `invoke-workflow` | Call child workflow | None | Workflow reference |
| `display-output` | Show markdown/content to user | None | Template rendering |
| `form` | Structured user input (replaces ask-user) | None | Form schema |

### Level 3: Tool Types (Agent Capabilities)

What tools are available to agents within steps.

| Type | Description | Used By |
|------|-------------|---------|
| `ax-generation` | AI content generation via AX signatures | sandboxed-agent |
| `update-variable` | Extract and store value | sandboxed-agent |
| `read-artifact` | Read versioned artifact content | sandboxed-agent |
| `write-artifact` | Write to artifact (scoped) | sandboxed-agent |
| `database-query` | Query Chiron database | sandboxed-agent |
| `web-search` | Search external resources | sandboxed-agent |
| `api-call` | Call external APIs | sandboxed-agent |
| `custom` | User-defined tool | sandboxed-agent |

### Level 4: Artifact Types (Output Structures)

What documents/outputs workflows produce.

| Type | Schema | Produced By |
|------|--------|-------------|
| `prd` | Product requirements | create-prd workflow |
| `architecture` | System architecture decisions | create-architecture workflow |
| `epic` | Epic definition with stories | create-epics workflow |
| `story` | User story with tasks | create-story workflow |
| `tech-spec` | Technical specification | create-tech-spec workflow |
| `brainstorm` | Brainstorming session output | brainstorming workflow |

---

## Deep Dive: Effect

### What is Effect?

Effect is a TypeScript library for building robust, type-safe applications. It provides:

- **Typed Errors**: Errors tracked in the type signature `Effect<Success, Error, Requirements>`
- **Structured Concurrency**: Fiber-based lightweight threads with supervision
- **Composable Primitives**: Retry, timeout, race, parallel execution
- **Streaming**: `Stream<A, E, R>` with backpressure and error handling
- **Dependency Injection**: Service-based architecture via `Context`

### How Chiron Uses Effect

| Chiron Concern | Effect Primitive |
|----------------|------------------|
| Error handling | `Effect.catchTag`, typed error channels |
| Retry/recovery | `Schedule`, `Effect.retry` |
| Streaming (LLM, OpenCode) | `Stream`, `PubSub` |
| Concurrency | Fibers, `Effect.race`, `Effect.all` |
| Living documents | `SubscriptionRef`, `PubSub` |
| Service architecture | `Layer`, `Context` |
| Workflow durability | `@effect/workflow` |

### Research Questions for Effect Session

1. How does `@effect/workflow` compare to our current workflow engine?
2. Can Effect Streams unify AI-SDK streaming and OpenCode streaming?
3. How to model workflow steps as Effect services?
4. What's the learning curve for the team?
5. How does Effect integrate with tRPC/Hono?

### Key Code Patterns to Explore

```typescript
// Typed workflow step errors
class StepTimeoutError extends Data.TaggedError("StepTimeout")<{ stepId: string }> {}
class ApprovalRejectedError extends Data.TaggedError("ApprovalRejected")<{ reason: string }> {}
class AgentFailedError extends Data.TaggedError("AgentFailed")<{ agentId: string; cause: unknown }> {}

// Workflow step as Effect
const executeStep = (step: WorkflowStep) => Effect.gen(function* () {
  // ...
}).pipe(
  Effect.retry(Schedule.exponential("1 second").pipe(Schedule.jittered)),
  Effect.timeout("5 minutes"),
  Effect.catchTag("StepTimeout", (e) => /* recovery */)
);

// Living document subscription
const documentWatcher = Effect.gen(function* () {
  const pubsub = yield* PubSub.unbounded<DocumentChanged>();
  // Watch for file changes, publish to pubsub
  return pubsub;
});
```

---

## Deep Dive: AI-SDK

### What is AI-SDK?

Vercel's AI SDK provides primitives for building AI applications:

- **Text Generation**: `generateText`, `streamText`
- **Structured Output**: `generateObject` with Zod schemas
- **Tool Calling**: Native tool support with approval gates
- **Streaming**: Real-time response streaming
- **Multi-provider**: OpenAI, Anthropic, Google, OpenRouter

### How Chiron Uses AI-SDK

| Chiron Concern | AI-SDK Feature |
|----------------|----------------|
| sandboxed-agent | `generateText` + `tool()` |
| Approval gates | `needsApproval: true` on tools |
| Streaming chat | `streamText`, `createUIMessageStream` |
| Structured extraction | `generateObject` with Zod |
| Message history | `response.messages`, manual storage |
| Dynamic tools | Tool array per step config |

### Research Questions for AI-SDK Session

1. How to implement dynamic tool loading per workflow step?
2. Best pattern for message persistence (our own schema)?
3. How to integrate with Effect for error handling?
4. How does `needsApproval` work with multi-step agents?
5. Context window management with `prepareStep`?

### Key Code Patterns to Explore

```typescript
// Sandboxed agent with dynamic tools
const runSandboxedAgent = async (step: StepConfig, context: ExecutionContext) => {
  const tools = await loadToolsForStep(step.toolIds);
  
  const result = await generateText({
    model: openai("gpt-4o"),
    messages: context.messages,
    tools: Object.fromEntries(tools.map(t => [t.name, tool({
      description: t.description,
      parameters: t.schema,
      needsApproval: t.requiresApproval,
      execute: async (params) => t.execute(params, context),
    })])),
  });
  
  return result;
};

// Approval flow
for (const part of result.content) {
  if (part.type === 'tool-approval-request') {
    // Show approval UI to user
    const approved = await showApprovalDialog(part);
    messages.push({
      role: 'user',
      content: [{ type: 'tool-approval-response', approvalId: part.approvalId, approved }]
    });
  }
}
```

---

## Deep Dive: AX (@ax-llm/ax)

### What is AX?

AX is the "DSPy for TypeScript" - a framework for LLM optimization:

- **ACE Optimizer**: Generator → Reflector → Curator loop for online learning
- **MiPRO**: Teacher-student optimization (GPT-4 teaches GPT-4-mini)
- **GEPA**: Multi-objective Pareto optimization
- **Playbooks**: Structured learning that survives updates
- **Signatures**: Declarative input/output schemas for AI tasks

### How Chiron Uses AX

| Chiron Concern | AX Feature |
|----------------|------------|
| Learning from rejections | ACE `applyOnlineUpdate` |
| ax-generation tool | AX Signatures |
| Classification (story type, etc) | AX classifiers |
| RAG | AX RAG module |
| Prompt optimization | Playbook serialization |

### Research Questions for AX Session

1. How to integrate AX with AI-SDK (AxAIProvider)?
2. How to structure playbooks per workflow type?
3. RAG with pgvector vs AX RAG?
4. How to persist and load playbooks?
5. Feedback loop: user rejection → ACE update → better output?

### Key Code Patterns to Explore

```typescript
// ACE for story generation
const storyGenerator = new AxACE({
  studentAI: openai("gpt-4o-mini"),
  teacherAI: openai("gpt-4o"),
});

// Offline training
const optimized = await storyGenerator.compile(
  storyGenerationProgram,
  trainingExamples,
  evaluationMetric
);

// Online learning from rejection
await storyGenerator.applyOnlineUpdate({
  example: { epic, requirements },
  prediction: generatedStory,
  feedback: "Missing acceptance criteria for edge cases, too vague on error handling"
});

// Save playbook
await fs.writeFile("playbooks/story-gen.json", JSON.stringify(storyGenerator.artifact.playbook));
```

---

## Deep Dive: OpenCode Integration

### What is OpenCode?

OpenCode is a CLI/server for AI coding agents with full computer access:

- **Full System Access**: File I/O, bash, git, LSP
- **Tool Patterns**: Well-defined tool schemas
- **Streaming**: Real-time output
- **MCP Support**: Model Context Protocol integration

### How Chiron Uses OpenCode

| Chiron Concern | OpenCode Role |
|----------------|---------------|
| system-agent step | OpenCode executes implementation |
| TDD workflow | OpenCode writes tests, implements, runs |
| Code review | OpenCode analyzes, suggests fixes |
| Git operations | OpenCode commits, branches, merges |

### Two-Way Communication via Plugins

**Key Insight**: Use OpenCode's plugin/MCP system for bidirectional communication.

```
┌─────────────────────────────────────────────────────────────────┐
│                      TWO-WAY COMMUNICATION                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CHIRON ◄─────────────────────────────────────► OPENCODE        │
│                                                                  │
│  Chiron → OpenCode:                OpenCode → Chiron:           │
│  • Task context                    • Progress updates           │
│  • Artifact content                • Tool call results          │
│  • Workflow state                  • File changes               │
│  • Approval decisions              • Test results               │
│  • Living doc updates              • Completion status          │
│                                    • Error reports              │
│                                                                  │
│  Via: OpenCode Plugin (MCP Server)                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Plugin Capabilities**:
- `chiron://artifacts` - Read/subscribe to artifact updates
- `chiron://workflow` - Get current workflow state, report progress
- `chiron://approval` - Request user approval mid-task
- `chiron://sprint` - Read sprint status, update task completion

### Research Questions for OpenCode Session

1. How to invoke OpenCode programmatically (server API)?
2. How to stream OpenCode output to Chiron UI?
3. How to scope OpenCode to specific worktree?
4. How to pass artifact context to OpenCode?
5. Integration with Effect for error handling?
6. **How to build Chiron MCP server for OpenCode plugins?**
7. **What events should Chiron expose to OpenCode?**
8. **How to handle living document updates mid-execution?**

### Key Code Patterns to Explore

```typescript
// Invoke OpenCode for task implementation
const runSystemAgent = async (task: Task, worktree: string) => {
  const opencode = new OpenCodeClient({
    workdir: worktree,
    model: "claude-sonnet-4-20250514",
  });
  
  const stream = await opencode.run({
    prompt: `Implement this task following TDD:\n\n${task.description}\n\nAcceptance Criteria:\n${task.acceptanceCriteria}`,
    context: [
      { type: "file", path: "docs/architecture.md" },
      { type: "file", path: `stories/${task.storyId}.md` },
    ],
  });
  
  // Stream output to UI
  for await (const chunk of stream) {
    yield chunk;
  }
};
```

---

## Deep Dive: Tauri

### What is Tauri?

Tauri is a framework for building desktop applications with web technologies:

- **Rust Backend**: System-level capabilities, security
- **Web Frontend**: React, Vue, etc.
- **Small Binary**: Much smaller than Electron
- **Native APIs**: File system, notifications, etc.

### How Chiron Uses Tauri

| Chiron Concern | Tauri Feature |
|----------------|---------------|
| Desktop app | Tauri shell |
| File access | Tauri FS API |
| Git operations | Tauri command invocation |
| Notifications | Tauri notification API |
| Window management | Tauri window API |

### Research Questions for Tauri Session

1. Tauri v2 features relevant to Chiron?
2. Best pattern for Tauri + tRPC/Hono?
3. How to handle long-running processes (OpenCode)?
4. IPC patterns for streaming?
5. Security considerations for file access?

---

## Deep Dive: Server/Client Architecture

### OpenCode's Pattern

OpenCode uses a server/client architecture:
- **Server**: Handles LLM calls, tool execution, state
- **Client**: UI, user input, streaming display

### How Chiron Uses This Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ TAURI SHELL                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────┐     ┌─────────────────────────┐   │
│  │ FRONTEND (React)    │     │ BACKEND (Hono/tRPC)     │   │
│  │                     │     │                         │   │
│  │ • Workflow UI       │◄───►│ • Workflow engine       │   │
│  │ • Artifact preview  │ SSE │ • Agent orchestration   │   │
│  │ • Dashboard         │     │ • Database (Drizzle)    │   │
│  │ • Chat interface    │     │ • Git operations        │   │
│  └─────────────────────┘     └─────────────────────────┘   │
│                                       │                      │
│                                       ▼                      │
│                              ┌─────────────────────────┐    │
│                              │ EXTERNAL                │    │
│                              │ • OpenCode (system)     │    │
│                              │ • LLM APIs (AI-SDK)     │    │
│                              │ • PostgreSQL            │    │
│                              └─────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Research Questions for Architecture Session

1. tRPC subscriptions vs SSE for streaming?
2. How does OpenCode handle its server/client split?
3. Effect services in the backend?
4. State management (Zustand) patterns?
5. Offline-first considerations?

---

## Deep Dive: Git (simple-git)

### Current Approach

Using simple-git for:
- Worktree management (isolated environments)
- Commit tracking (artifact versioning)
- Branch operations

### Research Questions for Git Session

1. Alternatives to simple-git (isomorphic-git, dugite)?
2. Worktree performance at scale?
3. How to track artifact versions (commit hash pinning)?
4. Merge conflict handling patterns?
5. Integration with Effect for error handling?

### Key Code Patterns to Explore

```typescript
// Artifact version pinning
const pinArtifactVersion = async (artifactPath: string) => {
  const git = simpleGit();
  const log = await git.log({ file: artifactPath, n: 1 });
  return log.latest?.hash;
};

// Execution context with pinned inputs
interface ExecutionContext {
  executionId: string;
  inputs: {
    [artifactPath: string]: {
      commitHash: string;
      content: string;
    };
  };
  startedAt: Date;
}
```

---

## Deep Dive: TDD & Gherkin

### Why TDD in Chiron?

LLM-generated code is more reliable when:
1. **Tests are written first** - Clear acceptance criteria
2. **Gherkin specs** - Human-readable, machine-parseable
3. **AX optimization** - Learn to generate better tests from feedback

### How Chiron Uses TDD

```
┌─────────────────────────────────────────────────────────────────┐
│ STORY GENERATION (create-story workflow)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Story               Gherkin Specs            Test Stubs    │
│  ┌──────────────┐        ┌──────────────┐        ┌────────────┐ │
│  │ As a user    │   →    │ Feature: ... │   →    │ describe() │ │
│  │ I want to    │  AX    │ Scenario:    │  AX    │ it()       │ │
│  │ So that      │ optim  │ Given/When/  │ optim  │ expect()   │ │
│  └──────────────┘        │ Then         │        └────────────┘ │
│                          └──────────────┘                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ IMPLEMENTATION (dev-story workflow via OpenCode)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. RED:   Run tests → All fail (expected)                      │
│  2. GREEN: Implement code → Tests pass                          │
│  3. REFACTOR: Clean up → Tests still pass                       │
│                                                                  │
│  OpenCode receives:                                              │
│  • Story with acceptance criteria                                │
│  • Gherkin specs (human-readable requirements)                   │
│  • Test stubs (concrete expectations)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Gherkin in Story Template

```gherkin
# Generated during create-story, optimized by AX

Feature: User Authentication
  As a registered user
  I want to log in with my credentials
  So that I can access my dashboard

  Scenario: Successful login
    Given I am on the login page
    And I have a valid account with email "user@example.com"
    When I enter my email "user@example.com"
    And I enter my password "correctpassword"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  Scenario: Failed login with wrong password
    Given I am on the login page
    When I enter my email "user@example.com"
    And I enter my password "wrongpassword"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
```

### AX Optimization for TDD

| What | How AX Helps |
|------|--------------|
| **Gherkin generation** | ACE learns to generate better scenarios from feedback |
| **Test stub generation** | Learn patterns that lead to passing implementations |
| **Acceptance criteria** | Optimize clarity for LLM consumption |
| **Edge case discovery** | Learn to identify edge cases from past rejections |

### Research Questions for TDD Session

1. Gherkin parsing libraries for TypeScript?
2. How to integrate Gherkin → test framework (Vitest, Playwright)?
3. AX signatures for Gherkin generation?
4. How OpenCode uses Gherkin specs as context?
5. Feedback loop: test failure → AX learning?
6. Story template structure for TDD artifacts?

### Key Integration Points

```typescript
// Story artifact structure with TDD elements
interface StoryArtifact {
  metadata: {
    id: string;
    status: StoryStatus;
  };
  userStory: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria: string[];
  gherkin: {
    feature: string;
    scenarios: GherkinScenario[];
  };
  testStubs: {
    unit: string[];      // Generated test file paths
    integration: string[];
    e2e: string[];
  };
  tasks: Task[];
}

// AX signature for Gherkin generation
const gherkinSignature = new AxSignature({
  input: { userStory: string, acceptanceCriteria: string[] },
  output: { gherkinFeature: string },
  description: "Generate Gherkin feature file from user story"
});
```

---

## Deep Dive: Current Implementation Audit

### Purpose

Before rebuilding, understand what exists in the current Chiron codebase:
- What works well (keep)
- What's over-engineered (simplify)
- What's broken (fix or discard)
- What patterns to preserve

### Current Codebase Structure

```
packages/
├── api/                    # Backend services
│   └── src/
│       ├── routers/        # tRPC routers
│       └── services/
│           ├── mastra/     # ← TO BE REPLACED
│           └── workflow-engine/
├── db/                     # Drizzle schema + migrations
│   └── src/
│       ├── schema/
│       └── seeds/
├── scripts/                # Seed scripts
└── auth/                   # Auth (Better Auth)

apps/
├── web/                    # React frontend (Tauri)
│   └── src/
│       ├── components/
│       ├── features/
│       └── routes/
└── server/                 # Hono server
```

### Areas to Audit

| Area | Questions |
|------|-----------|
| **Mastra integration** | What does it do? What can we keep? What must go? |
| **Workflow engine** | Variable resolution, step handlers, execution state |
| **Database schema** | What tables are ours vs Mastra's? |
| **Seed data** | Workflow definitions, techniques, agents |
| **UI components** | Chat, artifact workbench, approval gates |
| **tRPC routers** | API structure, subscriptions |

### Mastra Dependencies (To Replace)

| Current | Replacement |
|---------|-------------|
| `getMastraInstance()` | Effect services |
| `mastra.getAgent()` | AI-SDK + our agent registry |
| `PostgresStore` (mastra.*) | Our own schema |
| `createTool` | AI-SDK `tool()` |
| Thread/message storage | Our own tables |

### What to Keep

| Component | Why Keep |
|-----------|----------|
| Drizzle schema (non-mastra tables) | Our workflow/artifact tables work |
| tRPC router structure | Clean API design |
| UI component patterns | shadcn/ui integration |
| Seed data structure | Workflow definitions (translate to new primitives) |

### What to Simplify

| Current | Problem | Solution |
|---------|---------|----------|
| 4-level variable precedence | Over-engineered | Flat context, last write wins |
| Path-based output extraction | Fragile | Direct output declaration |
| Step handler abstraction | Too many layers | Direct Effect services |

### Research Questions for Audit Session

1. How much Mastra code can be deleted cleanly?
2. What UI components are reusable as-is?
3. What seed data structures can be translated?
4. What tests exist and what do they cover?
5. What's the current state of workflow execution?
6. Any patterns worth preserving from current implementation?

### Files to Review

```
packages/api/src/services/mastra/
├── mastra-service.ts       # Singleton - REPLACE
├── agent-loader.ts         # Dynamic loading - ADAPT
├── ace-optimizer.ts        # AX integration - KEEP/ADAPT
├── model-loader.ts         # Provider loading - KEEP

packages/api/src/services/workflow-engine/
├── variable-resolver.ts    # SIMPLIFY
├── step-handlers/          # ADAPT to Effect
└── execution-manager.ts    # REWRITE with Effect

packages/db/src/schema/
├── workflow.ts             # KEEP
├── artifacts.ts            # KEEP
└── (mastra tables)         # DELETE

packages/scripts/src/seeds/
├── brainstorming.ts        # TRANSLATE to new primitives
├── techniques/             # TRANSLATE
└── agents.ts               # ADAPT
```

---

## Variable Resolution (To Be Refined)

### Current Problem

The 4-level variable precedence is over-engineered:
1. System variables
2. Execution variables
3. Step outputs
4. Defaults

### Proposed Simplification

```typescript
// Single flat context, last write wins
interface ExecutionContext {
  variables: Record<string, unknown>;
}

// Step outputs merge in
context.variables = { ...context.variables, ...stepOutput };
```

### Research Questions

1. How does Effect handle context/dependencies?
2. Should variables be typed (Zod schemas)?
3. How to handle artifact references vs values?
4. Template rendering approach (Handlebars? Custom?)?

---

## Artifact Versioning (To Be Defined)

### Core Concept

When an artifact is used as INPUT to a workflow execution, we pin its git version:

```typescript
interface ArtifactReference {
  path: string;          // "docs/PRD.md"
  commitHash: string;    // "abc123"
  accessedAt: Date;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  inputs: ArtifactReference[];  // Pinned at execution start
  outputs: ArtifactReference[]; // Created during execution
  status: "running" | "completed" | "failed";
}
```

### Living Documents vs Historical References

| Mode | When | Behavior |
|------|------|----------|
| **Living** | During active work | Real-time sync via Effect PubSub |
| **Pinned** | Execution record | Historical reference (git hash) |

---

## Next Steps: Research Sessions

| Session | Focus | Priority |
|---------|-------|----------|
| 1 | **Effect** | Foundation - shell around everything |
| 2 | **AI-SDK** | sandboxed-agent primitives |
| 3 | **OpenCode** | system-agent + two-way plugin communication |
| 4 | **AX** | Optimization, classification, RAG |
| 5 | **TDD/Gherkin** | Test-driven development, Gherkin specs, AX optimization |
| 6 | **Server/Client Architecture** | How it all fits together |
| 7 | **Tauri** | Desktop application |
| 8 | **Git** | Versioning & worktrees |

### Session 1: Effect Deep Dive
- [ ] Read Effect documentation thoroughly
- [ ] Understand `@effect/workflow` for durable workflows
- [ ] Prototype: Workflow step as Effect service
- [ ] Prototype: Streaming unification (AI-SDK + OpenCode)
- [ ] Understand: How Effect wraps everything

### Session 2: AI-SDK Deep Dive
- [ ] Review AI-SDK v6 features
- [ ] Prototype: Dynamic tool loading
- [ ] Prototype: Approval flow (`needsApproval`)
- [ ] Design: Message persistence schema (our own)
- [ ] Understand: How it integrates with Effect

### Session 3: OpenCode Deep Dive
- [ ] Understand OpenCode server architecture
- [ ] How to invoke OpenCode programmatically
- [ ] How to stream OpenCode output to Chiron UI
- [ ] How to scope OpenCode to specific worktree
- [ ] How to pass artifact context (story, architecture)
- [ ] Integration with Effect for error handling
- [ ] Prototype: system-agent step calling OpenCode

### Session 4: AX Deep Dive
- [ ] Understand ACE optimizer internals
- [ ] Prototype: Playbook persistence
- [ ] Design: Feedback loop architecture
- [ ] Evaluate: AX RAG vs pgvector
- [ ] Integration with AI-SDK (AxAIProvider)

### Session 5: Server/Client Architecture
- [ ] Study OpenCode's architecture as reference
- [ ] Design: Effect + AI-SDK + OpenCode integration
- [ ] Design: Tauri + backend communication
- [ ] tRPC subscriptions vs SSE for streaming
- [ ] Prototype: End-to-end workflow execution

### Session 6: Tauri Deep Dive
- [ ] Tauri v2 features relevant to Chiron
- [ ] IPC patterns for streaming
- [ ] Long-running processes (OpenCode)
- [ ] Security considerations

### Session 7: Git & Primitives Finalization
- [ ] Git library evaluation (simple-git vs alternatives)
- [ ] Worktree management patterns
- [ ] Artifact versioning (commit hash pinning)
- [ ] Finalize step type definitions
- [ ] Finalize tool type definitions
- [ ] Variable resolution (simplified)

---

## Document History

| Date | Change |
|------|--------|
| 2025-12-31 | Initial creation from correct-course workflow discussion |

---

## References

- [Effect Documentation](https://effect.website)
- [AI SDK Documentation](https://sdk.vercel.ai)
- [AX GitHub](https://github.com/ax-llm/ax)
- [OpenCode GitHub](https://github.com/opencode-ai/opencode)
- [Tauri Documentation](https://tauri.app)
- [simple-git](https://github.com/steveukx/git-js)
