# Architecture Decision #7: Agent Orchestration & LLM Integration Framework

**Status:** PENDING RESEARCH  
**Timeline:** After Epic 1 Complete, Before Epic 2 Planning  
**Estimated Duration:** 2-3 days  
**Critical Path:** YES - Blocks Epic 2 implementation

---

## Overview

This is a **critical architectural decision** that will shape how Chiron implements:
- **Artifact Workbench** (Epic 2) - Real-time collaborative editing with AI agent
- **Multi-Agent Orchestration** (Epic 3-4) - Multiple AI agents working in parallel
- **LLM Integration Patterns** (All Epics) - How we call Claude/GPT-4 and manage context

**Decision Scope:**
- Do we adopt an orchestration framework (Mastra, Effect, LangGraph)?
- Or build custom with libraries (ai-sdk, simple LLM clients)?
- Or hybrid approach (framework for some, custom for others)?

---

## Step-by-Step Research Process

### **Phase 1: Preparation** (30 minutes)

#### 1. Review Existing Research
Read these files in order:
- [ ] `docs/research/framework-evaluation-effect-vs-mastra.md` (existing analysis)
- [ ] `docs/architecture/architecture-decisions.md` (decisions 1-6)
- [ ] `docs/PRD.md` (FR014-FR023, FR027-FR030, FR034, FR040, FR045)
- [ ] `docs/epics.md` (Epic 2-4 requirements)

#### 2. Identify Key Requirements
Extract from PRD:
- [ ] Real-time artifact editing requirements (FR018)
- [ ] Multi-agent coordination requirements (FR027-FR030)
- [ ] Memory/context requirements (FR022)
- [ ] Performance requirements (NFR001-NFR004)

#### 3. Define Success Criteria
What MUST the chosen solution support?
- [ ] Integration with our Story 1.4 workflow engine
- [ ] Database-driven state (write to our PostgreSQL)
- [ ] Multiple LLM providers (Claude, GPT-4, local models)
- [ ] Streaming responses (for UI reactivity)
- [ ] Memory across sessions (artifact editing continuity)
- [ ] Tool calling (git operations, file operations, DB queries)

---

### **Phase 2: Run Architecture Workflow** (2-3 hours)

This is the **main research activity**.

#### Step 1: Activate Architect Agent

**In your terminal:**
```bash
# Switch to Architect agent
@architect
```

The agent will greet you and show menu. Select:
```
*create-architecture
```

**OR invoke directly:**
```bash
@architect *create-architecture
```

#### Step 2: Architecture Workflow Execution

The workflow will guide you through **8 steps**. Here's what to prepare for each:

---

### **Step 1: Introduction & Input Validation**

**Workflow asks:** Do you have PRD and Epics?

**Your response:**
```
Yes, we have:
- PRD: docs/PRD.md
- Epics: docs/epics.md
- UX Spec: docs/design/ux-design-specification.md

I want to make an architecture decision about Agent Orchestration Framework.
This is for Epic 2+ implementation (Artifact Workbench + Multi-Agent).
```

**Workflow will:** Confirm it found the files, summarize them

---

### **Step 2: Architecture Scope Definition**

**Workflow asks:** What's the architecture scope?

**Your response:**
```
Decision #7: Agent Orchestration & LLM Integration Framework

SCOPE:
- Epic 2: Artifact Workbench (real-time collaborative editing with AI)
- Epic 3-4: Multi-Agent Orchestration (parallel agents, git worktrees)
- All Epics: LLM Integration patterns

SPECIFIC QUESTIONS:
1. Should we use Mastra for agent orchestration?
2. Should we use Effect for concurrency/error handling?
3. Should we use ai-sdk (Vercel AI SDK) for LLM calls?
4. Or build custom with simple libraries?
5. How does chosen framework integrate with our Story 1.4 workflow engine?

CONSTRAINTS:
- Must work with our database-driven workflow engine (Story 1.4)
- Must support multiple LLM providers (Claude, GPT-4, local)
- Must enable streaming responses for UI reactivity
- Must support agent memory across sessions
- Must integrate with our PostgreSQL state management
```

---

### **Step 3: Identify Critical Decisions**

**Workflow will:** Load decision-catalog.yaml and ask which decisions apply

**You should mention:**
```
Key decisions from the catalog:
1. Orchestration Framework Selection (Mastra vs Effect vs Custom)
2. LLM Integration Pattern (ai-sdk vs direct API vs framework-provided)
3. Agent Memory Strategy (where to store context across sessions)
4. Error Handling & Retry Logic (Effect's strength vs custom)
5. Streaming vs Batch Processing (artifact workbench needs streaming)
6. Tool Calling Architecture (how agents invoke git, file ops, DB)

PLUS new decisions not in catalog:
- Integration pattern with existing workflow engine
- Framework adoption: full vs partial vs none
```

---

### **Step 4: Technology Selection & Patterns**

**Workflow will:** Ask about tech stack and patterns

**Your response:**
```
EXISTING STACK (from Story 1.4):
- Database: PostgreSQL + Drizzle ORM
- Backend: Hono + tRPC
- Real-time: Server-Sent Events (SSE)
- Frontend: React + TanStack Router + shadcn/ui
- Workflow Engine: Custom (Story 1.4) - database-driven, step-by-step

FRAMEWORKS TO EVALUATE:
1. Mastra
   - Full agent orchestration framework
   - Built-in AgentNetwork, workflows, memory
   - 40+ LLM providers
   
2. Effect
   - Functional effects for concurrency/errors
   - Structured concurrency, resource management
   - No AI-specific features
   
3. Vercel AI SDK (ai-sdk)
   - Lightweight LLM integration library
   - Streaming, tool calling, multi-provider
   - Not a full framework
   
4. LangGraph
   - State machine workflows for agents
   - Part of LangChain ecosystem
   
5. Genkit
   - Google's agent framework
   - Firebase integration
   
6. Custom
   - Direct OpenRouter/Anthropic API calls
   - Build orchestration ourselves

PATTERNS NEEDED:
- Real-time collaborative editing (artifact workbench)
- Multi-agent coordination with git worktree isolation
- Event-driven agent triggers (user edits → agent responds)
- Memory persistence across sessions
- Tool calling (git, file ops, DB queries)
```

---

### **Step 5: Novel Pattern Design**

**Workflow asks:** Any unique concepts needing custom patterns?

**Your response:**
```
YES - We have novel patterns:

1. DUAL WORKFLOW ENGINES
   - BMAD Workflow Engine (Story 1.4) = User-driven, step-by-step methodology
   - Agent Orchestration (Epic 2+) = AI-driven, event-driven, collaborative
   - QUESTION: How do these two layers integrate?

2. ARTIFACT WORKBENCH PATTERN
   - User edits artifact in left pane
   - Agent watches for changes via git hash diff
   - Agent asks "Why did you change X?" in chat
   - Agent suggests improvements
   - User accepts/rejects suggestions
   - Continuous conversation loop with memory
   - QUESTION: Which framework best supports this?

3. GIT WORKTREE + AGENT ISOLATION
   - Each agent gets isolated git worktree
   - Agents work in parallel on different artifacts
   - Merge back to main when complete
   - QUESTION: Can framework manage this or custom layer needed?

4. DATABASE-FIRST STATE MANAGEMENT
   - All state in PostgreSQL (not framework memory)
   - workflow_executions, project_artifacts, git_worktrees tables
   - Framework must READ/WRITE our DB schema
   - QUESTION: Does framework allow external state storage?
```

---

### **Step 6: Implementation Patterns**

**Workflow asks:** Define patterns to prevent agent conflicts

**Your response:**
```
AGENT CONFLICT PREVENTION:

1. LAYER SEPARATION
   - Layer 1: BMAD Workflow Engine (our custom - Story 1.4)
   - Layer 2: Agent Orchestration (framework or custom)
   - Layer 3: LLM Integration (ai-sdk or framework-provided)
   - Clear boundaries between layers

2. STATE OWNERSHIP
   - PostgreSQL = source of truth (always)
   - Framework memory = cache only (can be rebuilt)
   - Git worktree registry = conflict prevention

3. INTEGRATION POINTS
   - execute-action step type can invoke framework workflows
   - Framework agents can write to our DB via shared utilities
   - Events flow both directions (our SSE + framework events)

4. DECISION CRITERIA FOR FRAMEWORK CHOICE:
   - Can it integrate with external DB state? (YES/NO)
   - Can it run INSIDE our workflow steps? (YES/NO)
   - Can we use parts without full adoption? (YES/NO)
   - Does it conflict with our architecture? (YES/NO)
```

---

### **Step 7: Architecture Review & Refinement**

**Workflow will:** Present draft architecture document

**You should:** Review and refine based on findings

**Key sections to verify:**
- Technology stack clearly lists chosen framework (or none)
- Integration pattern with Story 1.4 workflow engine documented
- Decision rationale explains WHY chosen over alternatives
- Migration path from current state to future state
- Risk mitigation for framework lock-in (if applicable)

---

### **Step 8: Output Generation**

**Workflow will:** Save architecture document to `docs/architecture/decision-7-agent-orchestration.md`

**Verify output includes:**
- [ ] Framework recommendation (Mastra/Effect/ai-sdk/Custom/Hybrid)
- [ ] Integration architecture diagram
- [ ] Decision rationale with trade-offs
- [ ] Proof-of-concept code examples
- [ ] Migration strategy
- [ ] Epic 2 implementation impact
- [ ] Risk assessment

---

## Phase 3: Proof-of-Concept Testing (4-8 hours)

After architecture workflow completes, **build small POCs** to validate decision.

### POC 1: Artifact Workbench Simulation (2-3 hours)

**Goal:** Test if chosen framework can handle real-time collaborative editing

**Test Scenario:**
```typescript
// Simulate artifact workbench flow
1. Load PRD from database (project_artifacts table)
2. Agent watches for file changes (git hash diff)
3. User edits PRD → git hash changes
4. Agent detects change, generates diff
5. Agent asks: "I see you changed the acceptance criteria for FR014. Why?"
6. User responds in chat
7. Agent suggests improvement
8. User accepts → new version saved to DB
9. VERIFY: Agent remembers conversation context
10. User edits again → agent recalls previous discussion
```

**Frameworks to test:**
- [ ] Mastra: Create agent with memory, test conversation continuity
- [ ] ai-sdk: Test streaming + tool calling for diff detection
- [ ] Custom: Test OpenRouter API with manual memory storage

**Success Criteria:**
- Agent remembers conversation context across edits
- Streaming responses work smoothly
- Integration with PostgreSQL state works
- Tool calling (git diff) works reliably

---

### POC 2: Multi-Agent Coordination (2-3 hours)

**Goal:** Test if framework can coordinate multiple agents in parallel

**Test Scenario:**
```typescript
// Simulate Epic 3 multi-agent workflow
1. Start 3 agents in parallel:
   - PM Agent: Generating PRD
   - Architect Agent: Analyzing requirements
   - UX Designer: Sketching wireframes
2. Each agent gets isolated git worktree
3. Agents work independently
4. PM finishes → artifact saved
5. Architect detects PRD change → reacts
6. All agents complete → merge worktrees
```

**Frameworks to test:**
- [ ] Mastra: Test AgentNetwork with 3 agents
- [ ] Effect: Test Effect.all with 3 concurrent tasks
- [ ] Custom: Test Bun.spawn() with manual coordination

**Success Criteria:**
- Agents run in parallel without blocking
- State isolation works (separate worktrees)
- Agent-to-agent communication possible
- Error in one agent doesn't crash others

---

### POC 3: Integration with Story 1.4 Workflow Engine (1-2 hours)

**Goal:** Test if framework can be invoked from our workflow engine

**Test Scenario:**
```typescript
// Test execute-action step invoking framework
{
  stepNumber: 5,
  stepType: "execute-action",
  config: {
    actions: [{
      type: "invoke-agent-workflow",
      framework: "mastra", // or "effect" or "custom"
      workflow: "artifact-refinement",
      input: { artifactId: "uuid-here" }
    }]
  }
}
```

**Success Criteria:**
- Framework workflow can be triggered from our workflow step
- Result is captured and stored in workflow_executions.executedSteps
- Framework respects our workflow pause/resume mechanism
- No conflicts with our database transactions

---

## Phase 4: Document Decision (1 hour)

### Update Architecture Decisions Document

<function_calls>
<invoke name="bash">
<parameter name="command">cat > /tmp/decision-template.md << 'EOF'
### Decision #7: Agent Orchestration & LLM Integration Framework ✅ DECIDED

**Choice:** [Mastra / Effect / ai-sdk / Custom / Hybrid]
**Date Decided:** 2025-11-XX

**Rationale:**
- [Why this choice over alternatives]
- [How it integrates with Story 1.4 workflow engine]
- [Key benefits for Epic 2+ implementation]

**Implementation:**
- [How to use framework in codebase]
- [Integration points with existing architecture]
- [Migration path from current state]

**Applies to:**
- Epic 2: Artifact Workbench
- Epic 3-4: Multi-Agent Orchestration
- All Epics: LLM Integration

**Alternatives Considered:**
- [Framework A]: [Pros and cons]
- [Framework B]: [Pros and cons]
- Custom solution: [Pros and cons]

**Risk Mitigation:**
- [How to avoid framework lock-in]
- [Fallback plan if framework doesn't work out]
- [Testing strategy to validate choice]
EOF
cat /tmp/decision-template.md