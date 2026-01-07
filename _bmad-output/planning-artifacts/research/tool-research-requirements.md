# Tool Research Requirements for Chiron Workflow Engine

**Date:** 2025-11-04
**Purpose:** Define concrete requirements for researching Effect, AI SDK, Mastra, and ax
**Context:** Workflow engine structure is defined, now need to validate tool compatibility

---

## Research Goals

1. **Validate compatibility** with Chiron's workflow structure
2. **Identify best tool combination** (may use multiple tools together)
3. **Prototype workflow-init** to prove end-to-end execution
4. **Make informed architectural decision** before Epic 1 implementation

---

## Tools Under Evaluation

### 1. Effect (Structured Concurrency & Resource Management)
### 2. AI SDK / Vercel AI (Multi-Provider LLM Interface)
### 3. Mastra (Agent Orchestration Framework)
### 4. ax (TypeScript DSPy Port - Structured LLM I/O)

---

## Concrete Requirements

### R1: Multi-Provider LLM Support
**Required:** Support for OpenRouter + Anthropic (Claude)
**Future:** Extensible to OpenAI, Gemini, others

**Questions:**
- Does AI SDK support both out-of-box?
- Does ax support both providers?
- Can Mastra use custom providers?

---

### R2: Structured LLM I/O
**Required:** Type-safe input/output for LLM tasks

**Chiron's LLM Task Types:**
```typescript
type LLMTask =
  | StructuredGenerationTask  // Signature-based (ax/DSPy style)
  | FreeformGenerationTask    // Simple prompts
  | ClassificationTask         // Multi-class decisions
  | ExtractionTask            // Schema-based extraction
```

**Questions:**
- Can ax handle all 4 types?
- Does AI SDK support structured outputs (Zod schemas)?
- Can Mastra agents use typed outputs?

---

### R3: Streaming Support
**Required:** Real-time streaming for UI updates

**Use Cases:**
- LLMGenerateStep with `streaming: true`
- Live artifact generation (product-brief, PRD)
- Progress updates during multi-step workflows

**Questions:**
- Does AI SDK support streaming?
- Does ax support streaming?
- Can Effect handle streaming async operations?

---

### R4: Multi-Agent Orchestration
**Required:** Multiple agents executing workflows concurrently

**Use Cases:**
- 2+ DEV agents on different stories (Epic 6)
- Analyst + PM running in parallel

**Questions:**
- Can Effect manage N concurrent agents with isolated contexts?
- Does Mastra's AgentNetwork support this?
- How do we handle agent-to-agent communication?

---

### R5: Workflow State Management
**Required:** Persistent workflow state across sessions

**Chiron's State:**
```typescript
type WorkflowExecution = {
  id: string
  projectId: string
  workflowId: string
  status: "running" | "paused" | "completed" | "failed"
  currentStep: string
  context: Record<string, any>
}
```

**Questions:**
- Can Effect manage persistent state (PostgreSQL)?
- Does Mastra handle workflow state?
- How do we resume workflows after interruption?

---

### R6: Resource Management
**Required:** Safe acquisition/release of resources

**Resources:**
- Git worktrees (one per agent)
- Database connections
- File handles
- LLM API connections

**Questions:**
- Does Effect provide resource-safe primitives?
- Can Effect handle git worktree lifecycle?
- Automatic cleanup on failure?

---

### R7: Error Handling & Retry
**Required:** Robust error handling with typed errors

**Error Scenarios:**
- LLM API timeout
- Database connection failure
- Git worktree conflict
- Workflow step failure

**Questions:**
- Does Effect provide typed error handling?
- Does AI SDK have retry logic?
- Can we configure retry strategies (exponential backoff)?

---

### R8: Tool Composition
**Required:** Tools must work together

**Potential Combinations:**
- Effect + AI SDK
- Effect + ax + AI SDK
- Effect + Mastra
- Mastra + ax

**Questions:**
- Can Effect wrap AI SDK promises?
- Can Effect wrap Mastra workflows?
- Can ax use AI SDK as backend?
- Does Mastra use AI SDK internally?

---

### R9: Custom Tool Integration
**Required:** Agents must use custom tools (simple-git, Drizzle)

**Chiron's Custom Tools:**
- simple-git (git operations)
- Drizzle ORM (database queries)
- File system operations

**Questions:**
- Does Mastra support custom tool definitions?
- Can ax signatures call custom tools?
- How do we pass tools to agents?

---

### R10: Workflow Pattern Support
**Required:** Support Chiron's 4 chat patterns

**Patterns:**
1. Sequential Dependencies (linear steps)
2. Parallel Independence (concurrent tasks)
3. Structured Exploration (branching)
4. Focused Dialogs (back-and-forth)

**Questions:**
- Can Mastra's workflow graphs express these?
- Does Effect support parallel execution (Pattern 2)?
- How do we model conditional branches (Pattern 3)?

---

## Research Methodology

### Phase 1: Individual Tool Evaluation (1-2 days)

**For each tool:**
1. Install and basic setup
2. Test multi-provider support (R1)
3. Test structured I/O (R2)
4. Test streaming (R3)
5. Document findings

**Deliverable:** Individual tool evaluation reports

---

### Phase 2: Integration Testing (1 day)

**Test combinations:**
1. Effect + AI SDK
2. Effect + ax + AI SDK
3. Effect + Mastra
4. Mastra + ax (if possible)

**Deliverable:** Integration compatibility matrix

---

### Phase 3: Prototype workflow-init (1 day)

**Build minimal workflow-init using best combination:**
- Step 1: Ask project name (AskUserStep)
- Step 5: LLM classifies level (LLMGenerateStep - Classification)
- Step 9: Create project (ExecuteActionStep - Database)

**Success Criteria:**
- ✅ Multi-provider works (OpenRouter or Anthropic)
- ✅ Structured output (level classification returns typed result)
- ✅ Database operation succeeds
- ✅ Workflow completes end-to-end

**Deliverable:** Working prototype + findings document

---

### Phase 4: Decision & Documentation (0.5 days)

**Final deliverable:** `docs/tool-stack-decision.md`

**Contents:**
1. Chosen tool combination with rationale
2. Trade-offs and limitations
3. Migration path if we need to swap later
4. Next steps for Epic 1 implementation

---

## Success Metrics

**Research is successful if:**
1. ✅ We can execute workflow-init end-to-end
2. ✅ Multi-provider LLM support confirmed
3. ✅ Structured I/O works for classifications
4. ✅ Clear path to multi-agent orchestration
5. ✅ Confident in chosen tool stack

**Timeline:** 3-5 days maximum

---

## Quick Reference: Tool Evaluation Checklist

```
Tool: _______________________

[ ] R1: Multi-provider LLM (OpenRouter + Anthropic)
[ ] R2: Structured I/O (typed inputs/outputs)
[ ] R3: Streaming support
[ ] R4: Multi-agent orchestration
[ ] R5: Workflow state management
[ ] R6: Resource management (git worktrees, DB)
[ ] R7: Error handling & retry
[ ] R8: Composition with other tools
[ ] R9: Custom tool integration
[ ] R10: Chat pattern support

Notes:
_________________________________________
_________________________________________
_________________________________________
```

---

_Document Created: 2025-11-04_
_Status: Ready for Tool Research Phase_
