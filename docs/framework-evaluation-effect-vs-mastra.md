# Framework Evaluation: Effect vs Mastra for Chiron

**Date:** 2025-11-03
**Status:** Under Evaluation
**Decision Impact:** CRITICAL - Could fundamentally change architecture

---

## Overview

Two frameworks have emerged as potential game-changers for Chiron's architecture:

1. **Effect** - Functional effect system for TypeScript (error handling, concurrency, resource management)
2. **Mastra** - AI agent orchestration framework (multi-agent workflows, LLM integration)

Both address core challenges in Chiron but in fundamentally different ways.

---

## Effect Analysis

### What Effect Provides

**Core Capabilities:**
- **Structured Concurrency:** Lightweight fibers for concurrent execution
- **Robust Error Handling:** Typed errors with parallel error collection
- **Resource Management:** Safe acquisition/release with automatic cleanup
- **Async Cancellation:** Abort long-running operations safely
- **Functional Composition:** Type-safe effect composition

**Key Features for Chiron:**
1. **Concurrent Agent Execution:** Effect.all with unbounded concurrency
2. **Error Aggregation:** Collect errors from multiple parallel agents
3. **Resource Safety:** Manage git worktrees, database connections, file handles
4. **Cancellation:** Stop agent workflows mid-execution
5. **Retry Logic:** Built-in retry strategies for workflow steps

### How Effect Would Fit Chiron

**Potential Applications:**

```typescript
// Example: Running multiple agents concurrently with Effect
const orchestrateAgents = Effect.all([
  runAgent("pm", workflowId),
  runAgent("architect", workflowId),
  runAgent("dev", workflowId)
], { concurrency: "unbounded" })
  .pipe(
    Effect.catchAll(handleAgentErrors),
    Effect.retry(Schedule.exponential("1 second"))
  )
```

**Benefits:**
- ✅ Type-safe error handling for agent failures
- ✅ Parallel agent execution with structured concurrency
- ✅ Safe resource management (git worktrees, DB connections)
- ✅ Cancellable workflows (user can stop agents mid-execution)
- ✅ Retry logic for transient failures

**Concerns:**
- ❌ Steep learning curve (functional programming paradigm shift)
- ❌ Effect doesn't know about AI agents, LLMs, or workflows
- ❌ You'd build all agent orchestration logic from scratch
- ❌ No built-in LLM integration or agent primitives
- ❌ More of a "plumbing" library than agent framework

**Verdict:** Effect solves **concurrency and error handling** brilliantly, but Chiron still needs to build agent orchestration, workflow engines, and LLM integration manually.

---

## Mastra Analysis

### What Mastra Provides

**Core Capabilities:**
- **Agent Framework:** Built-in agent primitives with LLM integration
- **Workflow Engine:** Graph-based workflows (.then(), .branch(), .parallel())
- **Multi-Agent Orchestration:** AgentNetwork for collaborative agents
- **Memory Management:** Agent memory across conversations
- **Human-in-the-Loop:** Suspend/resume workflows for approval
- **Observability:** OpenTelemetry tracing built-in
- **RAG Support:** Document chunking, embeddings, vector DB integration

**Key Features for Chiron:**
1. **AgentNetwork:** Multi-agent collaboration (EXACTLY what Chiron needs)
2. **Workflow Suspend/Resume:** Human approval flows (FR045 conflict resolution)
3. **Graph-based Workflows:** Matches BMAD's workflow structure
4. **LLM Integration:** 40+ providers (Claude, GPT-4, Gemini)
5. **Memory Persistence:** Agent state across executions

### How Mastra Would Fit Chiron

**Potential Architecture:**

```typescript
// Example: Chiron with Mastra
const pmAgent = mastra.agent({
  name: "pm",
  instructions: "Generate PRD from product brief",
  model: "claude-3-5-sonnet",
  tools: [readBMAD, generatePRD]
})

const architectAgent = mastra.agent({
  name: "architect",
  instructions: "Create architecture from PRD",
  model: "claude-3-5-sonnet",
  tools: [analyzePRD, createArchitecture]
})

const network = mastra.agentNetwork({
  agents: [pmAgent, architectAgent],
  workflows: [prdWorkflow, architectureWorkflow]
})

// Mastra routes intelligently based on context
await network.generate({
  input: "Create architecture for chiron project"
})
```

**Benefits:**
- ✅ **Perfect alignment:** Built for multi-agent orchestration
- ✅ **Workflow engine:** Graph-based workflows match BMAD structure
- ✅ **Human-in-the-loop:** Suspend/resume for approval flows
- ✅ **LLM integration:** Claude/GPT-4 support out-of-box
- ✅ **Memory management:** Agents remember conversation context
- ✅ **Observability:** OpenTelemetry tracing (FR031 real-time updates)
- ✅ **Mature framework:** Built by Gatsby team, production-ready

**Concerns:**
- ⚠️ **Experimental AgentNetwork:** Alpha/vNext feature, may change
- ⚠️ **Framework lock-in:** Chiron becomes Mastra-dependent
- ⚠️ **BMAD integration:** Need to map BMAD workflows to Mastra workflows
- ⚠️ **Untested:** You haven't tested Mastra with your use case yet
- ⚠️ **Abstraction cost:** Mastra's opinions might conflict with Chiron's needs

**Verdict:** Mastra is **purpose-built for Chiron's use case** (multi-agent orchestration with LLMs), but introduces framework dependency and learning curve.

---

## Effect vs Mastra Comparison

| Aspect | Effect | Mastra |
|--------|--------|--------|
| **Core Focus** | Functional effects, concurrency, error handling | AI agent orchestration, workflows, LLM integration |
| **Learning Curve** | Steep (functional programming) | Moderate (AI-first abstractions) |
| **Multi-Agent Support** | Build yourself with Effect.all | Built-in AgentNetwork |
| **Workflow Engine** | Build yourself | Graph-based workflows included |
| **LLM Integration** | None (bring your own) | 40+ providers built-in |
| **Human-in-the-Loop** | Build yourself | Suspend/resume workflows |
| **Observability** | Build yourself | OpenTelemetry tracing |
| **Error Handling** | World-class (typed errors, parallel collection) | Standard (async/await + try/catch) |
| **Resource Safety** | World-class (structured concurrency) | Standard (manual cleanup) |
| **Production Readiness** | Mature, stable | Maturing (AgentNetwork experimental) |
| **Framework Lock-in** | Low (composable primitives) | High (opinionated framework) |
| **BMAD Integration** | Manual (full control) | Requires mapping (less control) |

---

## Recommendation: Hybrid Approach?

### Option A: Mastra Only
**Use Mastra as the foundation** for agent orchestration, workflows, and LLM integration.

**Pros:**
- Fastest path to MVP (most features built-in)
- Purpose-built for multi-agent orchestration
- Proven with similar use cases

**Cons:**
- Framework lock-in (Chiron becomes "Mastra-based")
- AgentNetwork is experimental
- Less control over low-level orchestration

**Best for:** Rapid prototyping, if Mastra's abstractions align perfectly

---

### Option B: Effect Only
**Use Effect for concurrency, error handling, and resource management.** Build agent orchestration on top.

**Pros:**
- Maximum control over orchestration logic
- World-class error handling and concurrency
- No framework lock-in

**Cons:**
- Steepest learning curve
- Build everything from scratch (workflows, LLM integration, agents)
- Slower to MVP

**Best for:** Long-term maintainability, if you want full control

---

### Option C: Hybrid (Effect + Selective Mastra)
**Use Effect for plumbing (concurrency, errors, resources).** Use Mastra's **workflow engine** and **LLM integration** as libraries, NOT full framework.

**Pros:**
- Best of both worlds (Effect's safety + Mastra's agent primitives)
- Effect wraps Mastra workflows for better error handling
- Less lock-in than Mastra-only

**Cons:**
- Most complex architecture
- Mastra might not be designed for piecemeal usage
- Debugging across two paradigms

**Best for:** Production-grade system with strict error handling needs

---

### Option D: Neither (Current Stack)
**Stick with current decisions** (Hono + tRPC + Zustand + simple-git). Build agent orchestration yourself.

**Pros:**
- Full control, no framework dependencies
- Simplest mental model (standard async/await)
- Proven stack (no unknowns)

**Cons:**
- Build everything from scratch
- No built-in agent primitives
- Longer development time

**Best for:** Solo dev MVP where time-to-market isn't critical

---

## Critical Questions to Answer

**Before deciding, you need to test:**

1. **Can Mastra's workflow engine execute BMAD workflows?**
   - BMAD uses workflow.xml with steps, conditions, templates
   - Mastra uses graph-based .then()/.branch()/.parallel()
   - Are they compatible? Need to prototype.

2. **Does Mastra's AgentNetwork support git worktree isolation?**
   - Chiron needs per-agent git workspaces
   - Mastra manages agent execution - does it allow custom workspace logic?

3. **Can Mastra agents use custom tools (simple-git, Drizzle, tRPC)?**
   - Mastra has tool system - is it flexible enough?
   - Or does Mastra force its own abstractions?

4. **How does Mastra handle agent failures?**
   - FR042: 99%+ reliability requirement
   - Can Mastra recover from agent crashes, rollback changes?

5. **Is Effect compatible with Mastra?**
   - Can you wrap Mastra workflows in Effect.tryPromise()?
   - Or does Mastra's async model conflict with Effect?

---

## Recommended Path Forward

### Phase 1: Rapid Prototyping (1-2 days)
**Test Mastra** with a simple multi-agent scenario:
- Create 2 agents (PM + Architect)
- Have PM generate a simple PRD → pass to Architect
- Test suspend/resume for human approval
- Try integrating simple-git as a tool

**Goal:** Validate Mastra fits Chiron's orchestration needs.

### Phase 2: BMAD Mapping (2-3 days)
**Map one BMAD workflow** (e.g., product-brief) to Mastra:
- Parse workflow.yaml → Mastra workflow graph
- Execute steps with Mastra agents
- Compare output to BMAD CLI execution

**Goal:** Prove Mastra can execute BMAD workflows faithfully.

### Phase 3: Decision Point
Based on prototyping results:

**If Mastra works well:**
- ✅ Adopt Mastra as agent orchestration framework
- ✅ Document BMAD → Mastra mapping patterns
- ✅ Build git worktree isolation on top of Mastra agents

**If Mastra has limitations:**
- ⚠️ Evaluate Effect as alternative (if concurrency/error handling critical)
- ⚠️ Or stick with current stack (Option D)

**If Mastra needs augmentation:**
- ⚠️ Consider hybrid approach (Effect wraps Mastra workflows)

---

## Effect Deferred Decision

**Defer Effect decision** until after Mastra prototyping.

**When to reconsider Effect:**
- If Mastra's error handling proves insufficient
- If agent orchestration needs structured concurrency
- If resource management (worktrees, DB) becomes complex
- If cancellation/retry logic is brittle

Effect can be added **later** as a refinement layer without disrupting architecture.

---

## Next Steps

**IMMEDIATE ACTION:**
1. **User decision:** Prototype Mastra? (1-2 day investment)
2. If yes → Pause architecture workflow, prototype Mastra
3. If no → Continue with current stack (Option D), document decision

**After prototyping:**
- Update this document with findings
- Make final framework decision
- Resume architecture workflow

---

_Last Updated: 2025-11-03_
_Status: DEFERRED to Epic 3 (Multi-Agent Orchestration Core)_

---

## DECISION: Defer to Implementation Phase

**Date:** 2025-11-03
**Rationale:** Both Effect and Mastra provide value for **orchestration layer** (Epic 3+), but are premature optimization for Phases 1-2 (Foundation + Core UI).

**Strategy:**
1. **Epic 1-2:** Build foundation with current stack (Hono, tRPC, Drizzle, simple-git)
2. **Epic 3:** Evaluate Mastra during multi-agent orchestration implementation
3. **Epic 5+:** Consider Effect if error handling/concurrency becomes complex

**Key Insight:** Test Chiron's patterns (git-worktree isolation, dual-tracking, chat primitives) FIRST before committing to orchestration framework. Validate core concepts work better than CLI.

**Revisit During:**
- Epic 3 implementation (multi-agent orchestration)
- If agent coordination complexity exceeds expectations
- If structured concurrency/error handling becomes critical

_Deferred, not dismissed._
