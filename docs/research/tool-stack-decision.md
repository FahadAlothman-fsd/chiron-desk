# Tool Stack Decision for Chiron Workflow Engine

**Date:** 2025-11-04
**Phase:** 3-Solutioning (Tool Research Complete)
**Status:** DECISION MADE - Ready for Epic 1 Implementation

---

## Executive Summary

**Recommended Stack:**
- **Primary:** AI SDK (Vercel) for multi-provider LLM + streaming + structured outputs
- **Secondary:** Mastra for workflow orchestration + agent management + state persistence
- **Optimization:** ax for prompt optimization with GEPA multi-objective optimizer
- **Deferred:** Effect (overkill for MVP, revisit in Epic 7 if needed)

**Rationale:** AI SDK + Mastra provide the core execution foundation, while ax adds intelligent optimization capabilities from Day 1. All three tools have extensive Context7 documentation (60k+ combined snippets) and ax integrates seamlessly with AI SDK via `@ax-llm/ax-ai-sdk-provider`.

---

## Research Summary

### Tool Evaluation Matrix

| Requirement | AI SDK | ax | Mastra | Effect |
|-------------|---------|-----|---------|---------|
| **R1: Multi-Provider LLM** | ✅ OpenRouter + Anthropic out-of-box | ⚠️ Manual provider setup | ✅ Via AI SDK integration | N/A |
| **R2: Structured I/O** | ✅ Zod schemas + `generateObject` | ✅ DSPy signatures | ✅ Zod schemas | N/A |
| **R3: Streaming** | ✅ `streamText` + `streamObject` | ❓ Unclear from docs | ✅ Built-in streaming | ✅ Stream primitives |
| **R4: Multi-Agent Orchestration** | ❌ Not agent-focused | ❌ Prompt-focused, not multi-agent | ✅ AgentNetwork + workflows | ✅ Fiber concurrency |
| **R5: Workflow State** | ❌ Stateless | ❌ Stateless | ✅ PostgreSQL + snapshots | ✅ Scope system |
| **R6: Resource Management** | ❌ Manual | ❌ Manual | ⚠️ Via workflows | ✅ `acquireRelease` |
| **R7: Error Handling** | ✅ Try/catch + streaming errors | ❓ Unclear | ✅ Workflow error recovery | ✅ Typed errors |
| **R8: Tool Composition** | ✅ Excellent with Mastra | ❓ Unclear | ✅ Excellent with AI SDK | ✅ Composable Effects |
| **R9: Custom Tools** | ✅ Tool calling API | ❌ Limited | ✅ `createTool` with Zod | N/A |
| **R10: Chat Patterns** | ⚠️ Basic streaming | ❌ No patterns | ✅ Workflow graphs | N/A |
| **Context7 Docs** | ✅ 2,377 snippets | ✅ 1,824 snippets | ✅ 54,603 snippets | ✅ Multiple sources |

**Legend:**
- ✅ Full support
- ⚠️ Partial support
- ❌ No support / Not applicable
- ❓ Unclear from research

---

## Tool-by-Tool Analysis

### 1. AI SDK (Vercel) - **APPROVED**

**Strengths:**
- **Multi-Provider Excellence:** Native support for OpenRouter + Anthropic + 15+ providers
- **Streaming First:** `streamText` and `streamObject` with real-time updates
- **Structured Outputs:** Zod schema validation built-in (`generateObject`, tool calling)
- **Tool Calling:** Excellent tool definition + execution API
- **Production Ready:** Used by thousands of apps, actively maintained
- **Context7 Coverage:** 2,377 code snippets for easy reference during implementation

**Weaknesses:**
- **No State Management:** Stateless - requires external persistence (Mastra provides this)
- **No Workflow Engine:** Just LLM interface, not orchestration (Mastra provides this)
- **No Multi-Agent:** Single agent focus (Mastra provides this)

**Use Cases in Chiron:**
- All `LLMGenerateStep` executions (StructuredGenerationTask, ClassificationTask, etc.)
- Streaming artifact generation (product-brief, PRD, architecture docs)
- Tool calling for agent decisions

**Integration Example:**
```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

// LLMGenerateStep execution
const result = streamText({
  model: anthropic('claude-sonnet-4-20250514'),
  prompt: context.prompt,
  tools: context.tools, // Custom Chiron tools (simple-git, Drizzle)
});

for await (const chunk of result.textStream) {
  // Stream to UI via SSE
}
```

---

### 2. Mastra - **APPROVED**

**Strengths:**
- **Workflow Graphs:** `.then()`, `.branch()`, `.parallel()` - maps to Chiron's chat patterns
- **Agent Orchestration:** Multi-agent support with `AgentNetwork`
- **State Persistence:** PostgreSQL integration with snapshots for suspend/resume
- **Custom Tools:** `createTool` with Zod schemas (perfect for simple-git, Drizzle)
- **Workflow State Machine:** Built-in support for workflow execution tracking
- **Context7 Coverage:** 54,603 code snippets (most comprehensive)
- **AI SDK Compatible:** Uses AI SDK internally for LLM calls

**Weaknesses:**
- **Learning Curve:** Graph-based workflow syntax requires familiarity
- **Abstraction Overhead:** Might be overkill for simple linear workflows

**Use Cases in Chiron:**
- Workflow execution engine (Sequential Dependencies, Parallel Independence, Structured Exploration)
- Multi-agent coordination (Epic 4+)
- Workflow state persistence (PostgreSQL)
- Suspend/resume for long-running workflows
- Custom tool definitions (git, database, file operations)

**Integration Example:**
```typescript
import { createWorkflow, createStep } from "@mastra/core/workflows/vNext";
import { z } from "zod";

// Map Chiron's AskUserStep to Mastra step
const askProjectName = createStep({
  id: "ask-project-name",
  inputSchema: z.object({}),
  outputSchema: z.object({ projectName: z.string() }),
  execute: async ({ mastra }) => {
    // Suspend workflow, wait for user input via UI
    return { projectName: "chiron" };
  },
});

// Map Chiron's LLMGenerateStep to Mastra step with AI SDK
const classifyLevel = createStep({
  id: "classify-level",
  inputSchema: z.object({ projectName: z.string(), description: z.string() }),
  outputSchema: z.object({ level: z.number() }),
  execute: async ({ inputData }) => {
    const result = await generateObject({
      model: anthropic('claude-sonnet-4-20250514'),
      schema: z.object({ level: z.number() }),
      prompt: `Classify project complexity for: ${inputData.description}`,
    });
    return { level: result.object.level };
  },
});

// Chiron's Sequential Dependencies pattern
const workflowInit = createWorkflow({
  id: "workflow-init",
  inputSchema: z.object({}),
  outputSchema: z.object({ projectId: z.string() }),
  steps: [askProjectName, classifyLevel],
})
  .then(askProjectName)
  .then(classifyLevel)
  .commit();
```

---

### 3. ax - **APPROVED (for Optimization)**

**Strengths:**
- **GEPA Multi-Objective Optimizer:** Pareto frontier optimization (accuracy vs. brevity, quality vs. speed)
- **AI SDK Integration:** Native `@ax-llm/ax-ai-sdk-provider` package - works seamlessly with AI SDK
- **Context7 Documentation:** 1,824 code snippets available
- **DSPy Signatures:** Clean syntax for typed prompts
- **Prompt Optimization:** Bootstrap few-shot, MiPRO, ACE, GEPA-Flow for pipelines
- **Save/Load Optimizations:** JSON serialization for persistence
- **Unified Optimization Interface:** `applyOptimization()` pattern works consistently

**Use Cases in Chiron:**
- **workflow-init Level Classification:** User rejects LLM's level → save as training example → GEPA optimizes
- **Quality vs. Speed Trade-offs:** Balance comprehensive PRDs vs. fast generation
- **Accuracy vs. Brevity:** Epic summaries that are both accurate and concise
- **Multi-Objective Workflows:** Any workflow with competing goals

**Why Approved (Revised Decision):**
1. **Context7 Available:** 1,824 snippets confirms implementation feasibility
2. **AI SDK Compatible:** Works as a layer on top of AI SDK, not a replacement
3. **Day 1 Value:** Optimization improves from session 1 (user corrections → training data)
4. **Low Risk:** Optional enhancement - core workflows work without it
5. **User Feedback Loop:** Perfect for Chiron's thesis (visual UX enables better training data)

**Integration Example:**
```typescript
import { ai } from "@ax-llm/ax";
import { AxAIProvider } from "@ax-llm/ax-ai-sdk-provider";
import { streamUI } from "ai/rsc";

// Create Ax AI instance (wraps AI SDK)
const axAI = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!
});

// Use with AI SDK v5
const model = new AxAIProvider(axAI);

const result = await streamUI({
  model,
  messages: [{ role: "user", content: "Classify project level" }],
  text: ({ content }) => content,
});
```

---

### 4. Effect - **REJECTED (for MVP)**

**Strengths:**
- **Resource Management:** `acquireRelease` for safe git worktree + DB connection handling
- **Error Handling:** Typed errors with full error paths
- **Concurrency:** Fiber-based structured concurrency
- **Stream Processing:** Integration with Effect's Scope system

**Weaknesses:**
- **Learning Curve:** Effect's mental model is paradigm shift (Effect<R, E, A>)
- **Overkill for MVP:** Chiron's MVP doesn't need Effect's full power
- **Mastra Overlap:** Mastra already provides workflow state + error recovery
- **Implementation Complexity:** Effect requires deep understanding for correct usage

**Why Rejected:**
1. **BMAD Principle:** Start simple, optimize later
2. **Mastra Sufficiency:** Mastra workflows + AI SDK cover 90% of needs
3. **Resource Management:** Can handle git worktrees + DB with simpler patterns initially
4. **Future Option:** Revisit in Epic 7 if we encounter concurrency/resource issues

**Alternative Approach:**
- Use Mastra's workflow state machine for error recovery
- Use simple try/catch + cleanup patterns for git worktree lifecycle
- Defer to Effect only if we encounter complexity we can't handle

---

## Final Architecture: AI SDK + Mastra + ax

### How They Work Together

**AI SDK Responsibilities:**
- LLM provider abstraction (OpenRouter, Anthropic)
- Streaming text/object generation
- Structured outputs with Zod schemas
- Tool calling for agent decisions

**Mastra Responsibilities:**
- Workflow execution engine
- Multi-agent orchestration
- State persistence (PostgreSQL)
- Suspend/resume for user interactions
- Custom tool definitions (git, database, file ops)

**ax Responsibilities:**
- Prompt optimization (GEPA, MiPRO, Bootstrap Few-Shot)
- Multi-objective optimization (accuracy vs. speed, quality vs. brevity)
- Training example management
- Optimization persistence (save/load JSON)
- Continuous improvement from user feedback

**Data Flow:**
```
User Input (UI)
  ↓
Mastra Workflow Step (createStep)
  ↓
ax AI Instance (wraps AI SDK) → AI SDK (streamText/generateObject) → LLM API
  ↓
Stream Response → UI (SSE)
  ↓
User Feedback (correction/rejection) → ax Training Example
  ↓
Mastra State Update (PostgreSQL) + ax Optimization Data
  ↓
Background: GEPA Optimizer runs on training examples
  ↓
Next Workflow Step (uses optimized prompts)
```

**Optimization Loop:**
```
1. User rejects LLM output (e.g., "No, this should be Level 3, not Level 2")
2. Save as training example: { projectDesc: "...", level: 3 }
3. GEPA optimizer runs when threshold reached (e.g., 5+ examples)
4. Optimized prompt applied to workflow
5. Future classifications improve automatically
```

---

## ax Optimization Strategy: Learning from User Feedback

### The Problem ax Solves

**Current State (Most LLM Apps):**
- User: "This should be Level 3, not Level 2"
- App: Changes it manually
- **Future classifications:** Same mistakes repeat

**With ax Optimization:**
- User: "This should be Level 3, not Level 2"
- App: Changes it manually + saves as training example
- **Future classifications:** GEPA optimizer learns from correction
- **Result:** Accuracy improves over time

### GEPA Multi-Objective Optimization

**Perfect for Chiron's Use Cases:**

1. **Project Level Classification (workflow-init)**
   - **Objective 1:** Accuracy (correct level: 0-4)
   - **Objective 2:** Confidence (certainty in classification)
   - **Trade-off:** Sometimes speed vs. accuracy

2. **PRD Generation**
   - **Objective 1:** Completeness (all required sections)
   - **Objective 2:** Brevity (concise, actionable)
   - **Trade-off:** Comprehensive vs. overwhelming

3. **Epic Story Breakdown**
   - **Objective 1:** Detailed acceptance criteria
   - **Objective 2:** Fast generation (< 30 seconds)
   - **Trade-off:** Quality vs. speed

### Optimization Workflow

```typescript
// 1. User provides correction in UI
const userCorrection = {
  input: { projectDescription: "...", type: "software" },
  output: { level: 3 }, // User's correction
  originalPrediction: { level: 2 }, // LLM's wrong guess
};

// 2. Save as training example
await db.insert(trainingExamples).values({
  workflowId: "workflow-init",
  stepId: "classify-level",
  input: userCorrection.input,
  output: userCorrection.output,
  timestamp: new Date(),
});

// 3. When threshold reached (5+ examples), run GEPA
const examples = await db.select().from(trainingExamples).where(...);

if (examples.length >= 5) {
  const optimizer = new AxGEPA({
    studentAI: axAI,
    numTrials: 16,
    minibatch: true,
  });

  const result = await optimizer.compile(
    levelClassifier, // ax program
    examples,
    multiObjectiveMetric, // accuracy + confidence
    { validationExamples: valExamples, maxMetricCalls: 200 }
  );

  // 4. Apply optimization
  if (result.optimizedProgram) {
    levelClassifier.applyOptimization(result.optimizedProgram);

    // 5. Persist optimization
    await fs.writeFile(
      `optimizations/workflow-init-level-${Date.now()}.json`,
      JSON.stringify(result.optimizedProgram)
    );
  }
}

// 6. Future classifications use optimized prompts automatically
```

### Database Schema for Optimization

```sql
-- Training examples from user corrections
CREATE TABLE training_examples (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  workflow_id TEXT NOT NULL, -- "workflow-init"
  step_id TEXT NOT NULL, -- "classify-level"
  input JSONB NOT NULL, -- LLM inputs
  output JSONB NOT NULL, -- Correct output (from user)
  original_prediction JSONB, -- Wrong LLM prediction
  created_at TIMESTAMP DEFAULT NOW(),
  used_in_optimization_at TIMESTAMP -- When included in GEPA run
);

-- Optimization runs and results
CREATE TABLE optimization_runs (
  id UUID PRIMARY KEY,
  workflow_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  optimizer_type TEXT NOT NULL, -- "GEPA", "MiPRO", etc.
  num_examples INT NOT NULL, -- How many training examples used
  best_score FLOAT NOT NULL,
  pareto_front_size INT, -- For GEPA multi-objective
  hypervolume FLOAT, -- For GEPA multi-objective
  optimization_file_path TEXT NOT NULL, -- Path to JSON file
  applied_at TIMESTAMP, -- When applied to production
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Key Benefits for Chiron

1. **Thesis Alignment:**
   - Visual UX makes user corrections easier (inline editing, rejection buttons)
   - More corrections = better training data
   - Validates "UX improves AI agent quality" hypothesis

2. **Continuous Improvement:**
   - Each user session improves future sessions
   - No manual prompt engineering needed
   - Data-driven optimization (not guesswork)

3. **Multi-Objective Trade-offs:**
   - BMAD workflows often have competing goals
   - GEPA finds Pareto frontier (best trade-offs)
   - User can choose preferred point on frontier

4. **Production Ready:**
   - Save/load optimizations to JSON
   - Version control for prompt optimizations
   - Rollback if optimization degrades quality

### When Optimization Runs

**Strategy: Background optimization (non-blocking)**

- **Threshold-based:** Run GEPA after N training examples (e.g., 5, 10, 25)
- **Time-based:** Run nightly for workflows with enough examples
- **Manual:** Admin UI to trigger optimization on-demand
- **A/B Testing:** Test optimized vs. baseline prompts on validation set

**Example Timeline:**
- **Week 1:** User creates 5 projects, LLM misclassifies 2 levels → 2 training examples
- **Week 2:** 3 more projects, 1 more correction → 3 training examples (total: 5)
- **Week 2:** GEPA runs overnight → optimized prompt applied
- **Week 3:** LLM classification accuracy improves from 60% → 85%
- **Week 4:** 2 more corrections → 7 training examples total
- **Week 5:** GEPA runs again → 85% → 92% accuracy

---

## Mapping Chiron's Workflow Engine to Tools

### Step Types → Implementation

| Chiron Step Type | Implementation |
|------------------|----------------|
| `AskUserStep` | Mastra `createStep` + workflow suspend → UI → resume |
| `LLMGenerateStep` | AI SDK `streamText`/`generateObject` wrapped in Mastra step |
| `CheckConditionStep` (Concrete) | Mastra step with inline JS evaluation |
| `CheckConditionStep` (Abstract) | AI SDK `generateObject` for LLM-based condition |
| `ApprovalCheckpointStep` | Mastra workflow suspend + UI approval → resume |
| `ExecuteActionStep` | Mastra `createTool` for database/git/file operations |
| `InvokeWorkflowStep` | Mastra workflow composition (`.then(otherWorkflow)`) |
| `DisplayOutputStep` | Mastra step that emits data to UI via SSE |

### Chat Patterns → Mastra Workflows

| Chiron Pattern | Mastra Implementation |
|----------------|----------------------|
| Sequential Dependencies | `.then(step1).then(step2).then(step3)` |
| Parallel Independence | `.parallel([agent1, agent2])` |
| Structured Exploration | `.branch({ condition, ifTrue, ifFalse })` |
| Focused Dialogs | Suspend/resume loop with agent generate |

---

## Implementation Plan

### Phase 1: Foundation (Epic 1 - Story 1.1)
**Goal:** Database schema + basic workflow execution

**Tasks:**
1. Install dependencies: `@ai-sdk/anthropic`, `@ai-sdk/openrouter`, `ai`, `@mastra/core`
2. Create database schemas (11 tables) with Drizzle ORM
3. Implement basic Mastra workflow executor service
4. Test: Create simple workflow (2 steps) that runs end-to-end

**Success Criteria:**
- ✅ Workflow state persisted to PostgreSQL
- ✅ Can suspend/resume workflow execution
- ✅ AI SDK streaming works with UI (SSE)

---

### Phase 2: Prototype workflow-init (Epic 2 - Story 2.2)
**Goal:** Prove end-to-end workflow execution with optimization

**Tasks:**
1. Build workflow-init with 3 steps (Ask name, Classify level, Create project)
2. Integrate ax + AI SDK for level classification
3. Implement UI suspend/resume for user inputs
4. Add user correction handling (level override → training example)
5. Persist workflow state + project + training examples to database

**Success Criteria:**
- ✅ User can complete workflow-init from UI
- ✅ LLM classification returns typed result
- ✅ User can override classification (manual correction)
- ✅ Correction saved as ax training example
- ✅ Project created in database
- ✅ Workflow state tracked correctly

**Optimization Success Criteria (Phase 2.5):**
- ✅ After 5+ corrections, GEPA optimizer runs
- ✅ Optimized prompt improves classification accuracy
- ✅ Optimization persisted to `optimizations/workflow-init-level.json`
- ✅ Future workflow-init uses optimized prompt

---

### Phase 3: Tool Integration (Epic 1 - Story 1.3)
**Goal:** Custom tools for git, database, file operations

**Tasks:**
1. Create Mastra tools for simple-git operations
2. Create Mastra tools for Drizzle queries
3. Create Mastra tools for file system operations
4. Test tools in workflow steps

**Success Criteria:**
- ✅ Git worktree creation via tool
- ✅ Database queries via tool
- ✅ File operations via tool

---

### Phase 4: Multi-Agent (Epic 4)
**Goal:** Parallel agent execution

**Tasks:**
1. Implement Mastra AgentNetwork
2. Create 2+ agents (Analyst, PM)
3. Test parallel execution with isolated contexts
4. Implement agent-to-agent communication (if needed)

**Success Criteria:**
- ✅ 2+ agents run concurrently
- ✅ No state conflicts between agents
- ✅ Workflow orchestrates multi-agent tasks

---

## Trade-offs and Limitations

### Mastra Limitations
1. **Graph Syntax:** Learning curve for `.then()`, `.branch()`, `.parallel()`
   - **Mitigation:** Start with simple linear workflows, gradually add complexity
2. **Abstraction Overhead:** Extra layer between code and execution
   - **Mitigation:** Accept for sake of state persistence + multi-agent support

### AI SDK Limitations
1. **No State:** Requires external persistence
   - **Mitigation:** Mastra provides this
2. **No Workflow Engine:** Just LLM interface
   - **Mitigation:** Mastra provides this

### Missing: Effect
1. **Resource Safety:** No structured concurrency for git worktrees
   - **Mitigation:** Use try/catch + cleanup patterns initially, revisit if issues arise
2. **Error Handling:** Not as robust as Effect's typed errors
   - **Mitigation:** Mastra workflow error recovery + AI SDK error handling sufficient for MVP

---

## Migration Paths (If We Need to Swap Later)

### If Mastra Proves Insufficient
**Likely Issues:**
- Performance bottlenecks with complex workflows
- State management limitations
- Multi-agent coordination edge cases

**Migration Option:**
- **Replace with:** Custom workflow engine using Effect + AI SDK
- **Effort:** High (2-3 weeks)
- **When:** Post-MVP if we hit concrete limitations

### If ax Optimization Proves Insufficient
**Likely Issues:**
- Need for more advanced optimization algorithms
- GEPA doesn't handle specific edge cases
- Performance bottlenecks with large training sets

**Migration Options:**
- **Add:** Custom optimization strategies on top of ax
- **Replace:** Dedicated prompt engineering team (post-MVP)
- **Effort:** Medium (1 week)
- **When:** Epic 7 (Polish & Extensibility) if optimization quality plateaus

### If Effect Becomes Necessary
**Likely Issues:**
- Git worktree resource leaks
- Complex concurrency bugs
- Database connection exhaustion

**Migration Option:**
- **Add:** Effect for resource management (keep Mastra + AI SDK)
- **Effort:** Medium (1-2 weeks)
- **When:** Epic 6 (Multi-agent at scale) if resource issues surface

---

## Next Steps

1. ✅ **Tool research complete** (this document)
2. ⏭️ **Update workflow status:** Mark architecture workflow complete
3. ⏭️ **Begin Epic 1 - Story 1.1:** Database schema design with Drizzle
4. ⏭️ **Install dependencies:**
   ```bash
   bun add @ai-sdk/anthropic @ai-sdk/openrouter ai @mastra/core @ax-llm/ax @ax-llm/ax-ai-sdk-provider zod
   ```
5. ⏭️ **Create database schemas:** 11 tables (projects, workflows, agents, etc.)
6. ⏭️ **Build prototype:** Simple 2-step workflow to validate stack

---

## Confidence Level: **9/10**

**Why High Confidence:**
- AI SDK: Production-proven, excellent Context7 docs (2,377 snippets)
- Mastra: Purpose-built for agents + workflows, extensive docs (54,603 snippets)
- Complementary strengths: AI SDK handles LLM, Mastra handles orchestration
- Low risk: Both tools can be swapped if needed (modular architecture)

**Remaining Uncertainty (1 point):**
- Mastra's performance at scale (Epic 6 multi-agent)
- Effect might be needed for resource safety (can add later)

---

## Approval Checkpoints

**Before Epic 1 Implementation:**
- [ ] Review this decision document
- [ ] Confirm stack: AI SDK + Mastra
- [ ] Install dependencies
- [ ] Verify Context7 docs accessible during implementation

**After Story 1.1 (Database Schema):**
- [ ] Database schemas match workflow engine structure
- [ ] Mastra state persistence tested

**After Story 2.2 (workflow-init Prototype):**
- [ ] End-to-end workflow execution works
- [ ] AI SDK streaming functional
- [ ] Suspend/resume validated

---

_Document Created: 2025-11-04_
_Research Duration: 1 session (4 hours)_
_Status: APPROVED - Proceed to Epic 1_
