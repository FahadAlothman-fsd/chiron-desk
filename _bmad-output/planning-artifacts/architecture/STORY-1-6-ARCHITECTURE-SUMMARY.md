# Story 1.6 Architecture Summary

**Date:** 2025-11-12  
**Story:** Workflow Init Steps 3-4 (Description + Complexity Analysis)  
**Status:** Architecture Approved, Ready for Implementation

---

## 🎯 Core Architecture Decision

**Stack:** Mastra + Ax (ACE playbooks)

### What We're Building

An **approval-gate chat workflow** where:
1. PM Agent chats with user about their project
2. Agent triggers side effects (generate summary, classify complexity)
3. User reviews and approves/rejects generated outputs
4. System learns from feedback using ACE playbooks
5. System collects approved examples for future MiPRO optimization

---

## 📊 Complete Data Flow

```
User Message
    ↓
PM Agent (Mastra)
    ├─> Instructions: DB + ACE playbook
    ├─> Memory: Mastra storage (PostgreSQL)
    ├─> Scorers: Answer relevancy, completeness
    └─> Tools: update_summary, update_complexity
    ↓
Agent Decides to Generate Summary
    ↓
Tool Triggered: update_summary
    ↓
Ax Generator
    ├─> Build signature from workflow config
    ├─> Load ACE playbook for context
    ├─> Generate summary
    └─> Return for approval
    ↓
Frontend: Show Approval Modal
    ↓
┌─────────────────┬──────────────────────────────────┐
│ User APPROVES   │ User REJECTS                      │
├─────────────────┼──────────────────────────────────┤
│ • Save to       │ • Collect feedback               │
│   workflow      │ • Update ACE playbook            │
│   variables     │   (online learning!)             │
│ • Save example  │ • Regenerate with improved       │
│   for future    │   agent knowledge                │
│   MiPRO         │                                  │
│   training      │                                  │
└─────────────────┴──────────────────────────────────┘
```

---

## 🗄️ Database Architecture

### Chiron Schema (public)

```sql
-- Agent definitions
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  instructions TEXT NOT NULL, -- ⭐ NEW: Base system prompt
  llm_model TEXT NOT NULL
);

-- ACE playbooks (agent-level knowledge)
CREATE TABLE ace_playbooks (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),
  scope TEXT DEFAULT 'global', -- "global", "user", "project"
  user_id UUID REFERENCES users(id),
  project_id UUID REFERENCES projects(id),
  playbook JSONB NOT NULL, -- Structured bullets
  version INTEGER DEFAULT 1,
  total_updates INTEGER DEFAULT 0,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- MiPRO training examples (for Phase 2)
CREATE TABLE mipro_training_examples (
  id UUID PRIMARY KEY,
  side_effect_type TEXT NOT NULL, -- "summary", "complexity"
  input JSONB NOT NULL, -- { conversation, expertise, ... }
  expected_output JSONB NOT NULL, -- Approved output
  scorer_results JSONB, -- Quality metrics from Mastra scorers
  created_at TIMESTAMP
);

-- MiPRO optimizations (Phase 2)
CREATE TABLE mipro_optimizations (
  id UUID PRIMARY KEY,
  side_effect_type TEXT NOT NULL UNIQUE,
  instruction TEXT NOT NULL, -- Optimized prompt
  demos JSONB NOT NULL, -- Best few-shot examples
  model_config JSONB, -- Temperature, etc.
  best_score FLOAT,
  training_examples_count INTEGER,
  optimized_at TIMESTAMP
);

-- Workflow orchestration (existing)
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  agent_id UUID REFERENCES agents(id),
  status TEXT NOT NULL,
  current_step_id UUID,
  variables JSONB DEFAULT '{}', -- Approval state, workflow-specific data
  -- NOTE: Conversation history in mastra.mastra_messages
);
```

### Mastra Schema (mastra.*)

```sql
-- Created automatically by Mastra on first run

-- Conversation threads
CREATE TABLE mastra.mastra_threads (
  id UUID PRIMARY KEY,
  resource_id TEXT NOT NULL, -- "user-{userId}"
  title TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Chat messages
CREATE TABLE mastra.mastra_messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES mastra.mastra_threads(id),
  resource_id UUID,
  content TEXT NOT NULL, -- JSON message content
  role TEXT NOT NULL, -- "user" | "assistant"
  created_at TIMESTAMP
);

-- User working memory (persists across ALL conversations)
CREATE TABLE mastra.mastra_resources (
  id TEXT PRIMARY KEY, -- "user-{userId}"
  working_memory TEXT, -- Markdown-formatted persistent context
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Quality scores (from Mastra scorers)
CREATE TABLE mastra.mastra_scorers (
  id UUID PRIMARY KEY,
  input TEXT,
  output TEXT,
  result JSONB, -- { score, details }
  agent_name TEXT,
  metric_name TEXT,
  created_at TIMESTAMP
);
```

---

## 🔧 Optimizer Strategy

### ACE (Agent-Level Knowledge) - Phase 1 ✅

**Purpose:** General patterns that help ALL tasks

**When:** Always! Start with Story 1.6

**Example Playbook:**
```json
{
  "sections": [
    {
      "title": "Communication Patterns",
      "bullets": [
        "When user mentions healthcare: ask about compliance (HIPAA, GDPR)",
        "If user says 'multiple locations': ask about data synchronization",
        "For beginner users: explain technical terms simply"
      ]
    },
    {
      "title": "Summary Generation Patterns",
      "bullets": [
        "Healthcare projects: always mention compliance requirements",
        "Multi-tenant systems: include tenancy architecture in summary"
      ]
    }
  ]
}
```

**Updates:**
- On user rejection with feedback
- Online learning (no training data needed)
- Saves to `ace_playbooks` table

---

### MiPRO (Task-Specific Optimization) - Phase 2 ⏭️

**Purpose:** Optimize specific prompts + few-shot examples

**When:** After 50+ approved examples per side effect type

**Phase 1 (Story 1.6):** Just collect approved examples
**Phase 2 (Story 1.7+):** Run MiPRO optimization

**Example:**
```typescript
// After collecting 50+ approved summaries
const examples = await db.query.miproTrainingExamples.findMany({
  where: eq(miproTrainingExamples.sideEffectType, "summary"),
  limit: 100
});

// Run MiPRO
const optimizer = new AxMiPRO({
  studentAI: llm,
  examples,
  numTrials: 20
});

const result = await optimizer.compile(summaryGenerator, examples, metric);

// Save optimization
await db.insert(miproOptimizations).values({
  sideEffectType: "summary",
  instruction: result.optimizedProgram.instruction,
  demos: result.optimizedProgram.demos,
  modelConfig: result.optimizedProgram.modelConfig,
  bestScore: result.optimizedProgram.bestScore
});
```

---

### GEPA (Multi-Objective) - Phase 3+ ❌

**Purpose:** Optimize for accuracy + speed + cost simultaneously

**When:** High-volume scenarios, party mode, different user tiers

**Story 1.6:** Not needed (tasks too simple)

---

## 🎯 What Gets Saved When

### User APPROVES:
```typescript
// 1. Save to workflow variables (for this execution)
await db.update(workflowExecutions)
  .set({
    variables: { ...existing, summary: approvedValue }
  });

// 2. Save as MiPRO training example (for future optimization)
await db.insert(miproTrainingExamples).values({
  sideEffectType: "summary",
  input: { conversation, expertise },
  expectedOutput: approvedValue,
  scorerResults: { relevancy: 0.89, completeness: 0.92 }
});

// 3. Conversation already saved by Mastra (automatic)
```

### User REJECTS:
```typescript
// 1. Update ACE playbook (online learning)
const aceOptimizer = await loadAceOptimizer("summary");

await aceOptimizer.applyOnlineUpdate({
  example: { conversation, expertise },
  prediction: { summary: rejectedValue },
  feedback: "Should mention scheduling functionality"
});

// 2. Save updated playbook
const updatedPlaybook = aceOptimizer.getPlaybook();
await db.update(acePlaybooks)
  .set({
    playbook: updatedPlaybook,
    version: version + 1,
    totalUpdates: totalUpdates + 1
  });

// 3. Regenerate with improved knowledge
const newSummary = await generateWithAx(config, variables, workflow);
// Agent now has new playbook bullet:
// "When healthcare project: ask about scheduling/operational needs"
```

---

## 📦 Implementation Checklist

### Schema Changes
- [x] Add `agents.instructions` field (text)
- [ ] Create `ace_playbooks` table
- [ ] Create `mipro_training_examples` table
- [ ] Create `mipro_optimizations` table (Phase 2)

### Dependencies
- [ ] Install `@mastra/core`, `@mastra/pg`, `@mastra/memory`, `@mastra/evals`
- [ ] Install `@ax-llm/ax`
- [ ] Install `@ai-sdk/anthropic`, `@ai-sdk/openai`

### Mastra Configuration
- [ ] Configure PostgreSQL storage with `mastra` schema
- [ ] Create Mastra instance with storage
- [ ] Verify Mastra tables created automatically

### Agent Setup
- [ ] Add instructions to PM Agent seed data
- [ ] Create initial ACE playbook (5-10 examples)
- [ ] Create agent loader with ACE injection
- [ ] Add Mastra memory configuration
- [ ] Add Mastra scorers (relevancy, completeness)

### Side Effect Tools
- [ ] Create `update_summary` tool (triggers Ax generation)
- [ ] Create `update_complexity` tool (triggers Ax classification)
- [ ] Implement Ax generator with runtime signatures
- [ ] Load ACE playbook in generator

### Approval Flow
- [ ] Handle approval: save to variables + MiPRO examples
- [ ] Handle rejection: update ACE + regenerate
- [ ] Handle edit: save edited value + optional ACE update

### Frontend
- [ ] Approval modal UI component
- [ ] Feedback collection form (rejection reasons)
- [ ] Display scorer metrics (optional, for debugging)

---

## 🔍 Key Architectural Insights

### Why This Approach?

1. **ACE First (Phase 1):**
   - Works with minimal data (5-10 examples)
   - Online learning = improves in production
   - No need to wait for training data

2. **Collect Examples (Phase 1):**
   - Every approved output = future MiPRO training data
   - Scorer metrics = filter high-quality examples
   - No cost until Phase 2 (just storage)

3. **MiPRO Later (Phase 2):**
   - Requires 50+ examples per task
   - Significant accuracy improvement (10-30%)
   - Worth the optimization time once we have data

4. **GEPA Maybe Never:**
   - Our tasks are simple (summary, classification)
   - No real quality/speed/cost trade-offs
   - Only consider if high-volume usage (thousands/day)

### Separation of Concerns

| Concern | Storage | Purpose |
|---------|---------|---------|
| **Conversations** | `mastra.mastra_messages` | Chat history, semantic recall |
| **User Memory** | `mastra.mastra_resources` | Persistent user context across workflows |
| **Workflow State** | `public.workflow_executions` | Step number, status, approvals |
| **Agent Knowledge** | `public.ace_playbooks` | General patterns (ACE) |
| **Task Optimization** | `public.mipro_*` | Task-specific optimization (MiPRO) |
| **Quality Metrics** | `mastra.mastra_scorers` | Automated quality scoring |

---

## 📚 Reference Documents

- **ADR #7:** `/docs/architecture/architecture-decisions.md`
- **Optimizer Comparison:** `/docs/research/ax-optimizers-comparison-mipro-gepa-ace.md`
- **Framework Decision:** `/docs/research/framework-decision-matrix.md`
- **Mastra Deep Dive:** `/docs/research/mastra-deep-dive.md`
- **Ax Deep Dive:** `/docs/research/ax-deep-dive-ace-gepa.md`

---

**Status:** ✅ Architecture Approved  
**Next Step:** Story 1.6 Drafting  
**Implementation Phase:** Phase 1 (ACE + Example Collection)
