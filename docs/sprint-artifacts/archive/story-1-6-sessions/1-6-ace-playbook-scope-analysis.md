# ACE Playbook Scope Analysis - Agent-Level vs Cross-Agent

**Date:** 2025-11-13  
**Question:** Should ACE playbooks be attached to specific agents, or should they be cross-agent/global?  
**Status:** Research & Recommendation

---

## 🔍 Current Implementation

### Database Schema (as built):
```sql
CREATE TABLE ace_playbooks (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id),  -- ⚠️ Currently REQUIRED
  scope TEXT DEFAULT 'global',           -- "global", "user", "project"
  user_id TEXT REFERENCES user(id),
  project_id UUID REFERENCES projects(id),
  playbook JSONB NOT NULL,
  version INTEGER,
  total_updates INTEGER
);
```

**Current Design:** Playbooks are **AGENT-SCOPED** with optional **user/project refinement**.

---

## 📚 Research: What Does Ax Documentation Say?

### From `docs/research/ax-deep-dive-ace-gepa.md`:

**ACE Playbook Structure (Line 236-259):**
```json
{
  "sections": [
    {
      "title": "Summary Generation Guidelines",
      "bullets": [
        "For beginner users: Use simple, jargon-free language",
        "For expert users: Include technical terminology",
        "Keep summaries between 10-20 words for conciseness"
      ]
    },
    {
      "title": "Conversation Analysis Patterns",
      "bullets": [
        "If user mentions 'distributed' → likely expert-level project",
        "If user says 'simple' or 'basic' → quick-flow complexity"
      ]
    }
  ]
}
```

**Key Observations:**
1. **Task-specific patterns:** "Summary Generation Guidelines", "Conversation Analysis Patterns"
2. **No cross-agent patterns:** Nothing about "Architecture Documentation" or "Code Review"
3. **Context is task-focused:** Patterns apply to WHAT the agent is doing, not WHO is doing it

---

## 🎯 Architectural Analysis

### Option 1: Agent-Scoped Playbooks (CURRENT IMPLEMENTATION)

**Schema:**
```sql
agent_id UUID REFERENCES agents(id) NOT NULL
```

**Example Data:**
| agent_id | scope | playbook_section | example_bullet |
|----------|-------|------------------|----------------|
| pm-agent-uuid | global | "Summary Generation" | "• Healthcare projects: mention compliance" |
| pm-agent-uuid | user-123 | "Summary Generation" | "• User prefers bullet-point summaries" |
| architect-uuid | global | "Tech Spec Writing" | "• Always include scalability section" |
| dev-agent-uuid | global | "Code Review" | "• Check for SQL injection vulnerabilities" |

**Pros:**
- ✅ **Isolation:** PM Agent learns PM patterns, Dev Agent learns Dev patterns
- ✅ **Clarity:** Each agent has its own knowledge base
- ✅ **Agent reusability:** Same agent can run multiple workflows with shared learnings
- ✅ **Query performance:** `WHERE agent_id = ? AND scope = ?` is fast
- ✅ **Matches Ax design:** ACE is designed for specific tasks/programs

**Cons:**
- ❌ **No cross-pollination:** Dev Agent can't learn from PM Agent's user preferences
- ❌ **Duplication:** "User prefers concise outputs" might need to be learned by each agent

---

### Option 2: Cross-Agent Global Playbooks

**Schema:**
```sql
agent_id UUID REFERENCES agents(id) NULL  -- NULLABLE!
scope TEXT DEFAULT 'global'
```

**Example Data:**
| agent_id | scope | playbook_section | example_bullet |
|----------|-------|------------------|----------------|
| NULL | global | "User Communication" | "• Always use professional tone" |
| NULL | global | "Healthcare Domain" | "• Mention HIPAA when relevant" |
| NULL | user-123 | "User Preferences" | "• This user prefers bullet points" |
| pm-agent-uuid | global | "Summary Generation" | "• Keep summaries under 20 words" |

**Pros:**
- ✅ **Cross-agent learning:** All agents benefit from domain/user patterns
- ✅ **Less duplication:** "User prefers bullet points" learned once
- ✅ **Flexible:** Can have both global AND agent-specific playbooks

**Cons:**
- ❌ **Complexity:** Need to merge global + agent-specific playbooks at runtime
- ❌ **Ambiguity:** Which patterns apply to which agents?
- ❌ **Query complexity:** `WHERE (agent_id IS NULL OR agent_id = ?) AND scope = ?`
- ❌ **Conflicts:** What if global says "use JSON" but agent says "use markdown"?

---

## 🧠 What Does the Ax Framework Actually Do?

From the research document (lines 172-221):

```typescript
// Create online optimizer with loaded playbook
const onlineOptimizer = new AxACE(
  { studentAI: student, teacherAI: teacher },
  { initialPlaybook: savedPlaybook }  // ← ONE PLAYBOOK PER PROGRAM
);

// Apply saved playbook to generator
summarizer.setPlaybook(savedPlaybook);  // ← PROGRAM-LEVEL, NOT GLOBAL
```

**Key Finding:** 
- ACE operates at the **PROGRAM level** (= one specific task)
- Each Ax program (e.g., `summarizer`, `classifier`) has **its own playbook**
- The framework does NOT support "global playbooks across multiple programs"

---

## 🏗️ Chiron's Architecture

### What is an "Agent" in Chiron?

```typescript
// From packages/db/src/schema/agents.ts
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,         -- "pm", "architect", "dev"
  display_name TEXT,          -- "Athena (PM)", "Daedalus (Architect)"
  role TEXT NOT NULL,         -- "pm", "architect", "dev"
  instructions TEXT,          -- Base system prompt
  llm_model TEXT NOT NULL
);
```

**An agent is:**
- A **persona** (Athena the PM, Osiris the Dev)
- A **role** (PM, Architect, Developer)
- A **set of workflows** (PM runs prd, sprint-planning, workflow-init)

**Agents are NOT programs!** They're higher-level entities that:
- Execute multiple workflows
- Use multiple tools
- Perform different tasks

---

## 🎯 The Real Question

**What should ACE playbooks learn?**

### Scenario 1: PM Agent learns user prefers "concise summaries"

**Where should this be stored?**

**Option A (Agent-scoped):**
```json
{
  "agent_id": "pm-agent-uuid",
  "scope": "user",
  "user_id": "user-123",
  "playbook": {
    "sections": {
      "Summary Generation": {
        "bullets": ["• User prefers summaries under 15 words"]
      }
    }
  }
}
```

**Option B (Cross-agent global):**
```json
{
  "agent_id": null,
  "scope": "user",
  "user_id": "user-123",
  "playbook": {
    "sections": {
      "User Communication Preferences": {
        "bullets": ["• This user prefers concise outputs (under 15 words)"]
      }
    }
  }
}
```

**The question:**
- Should **Dev Agent** also use "concise outputs" when writing commit messages?
- Should **Architect Agent** also use "concise outputs" when writing tech specs?

---

## 💡 Recommendation: AGENT-SCOPED (Keep Current Implementation)

### Why Agent-Scoped is Better

**1. Matches Ax Framework Design**
- ACE is designed for **specific programs** (summarizer, classifier)
- Each Chiron agent runs **specific types of tasks**
- PM Agent's summary generation ≠ Architect Agent's tech spec generation

**2. Clear Boundaries**
- PM Agent learns PM-specific patterns
- Dev Agent learns Dev-specific patterns
- No confusion about which patterns apply where

**3. User Preferences Can Still Be Agent-Specific**
```json
// PM Agent learns: User wants concise SUMMARIES
{
  "agent_id": "pm-agent-uuid",
  "scope": "user",
  "user_id": "user-123",
  "playbook": {
    "sections": {
      "Summary Generation": {
        "bullets": ["• Keep summaries under 15 words for this user"]
      }
    }
  }
}

// Dev Agent learns: User wants verbose CODE REVIEWS
{
  "agent_id": "dev-agent-uuid",
  "scope": "user",
  "user_id": "user-123",
  "playbook": {
    "sections": {
      "Code Review Feedback": {
        "bullets": ["• This user prefers detailed explanations with examples"]
      }
    }
  }
}
```

**This is CORRECT!** Different tasks have different user preferences.

**4. Simpler Query Logic**
```typescript
// Simple: Load playbook for this agent + scope
const playbook = await db
  .select()
  .from(acePlaybooks)
  .where(
    and(
      eq(acePlaybooks.agentId, agentId),
      eq(acePlaybooks.scope, scope),
      eq(acePlaybooks.userId, userId)
    )
  );
```

**5. Natural Evolution Path**
- Start with agent-scoped playbooks (Story 1.6)
- If we LATER discover cross-agent patterns are needed (e.g., "Always use ISO dates")
  - Add a separate `global_patterns` table
  - Inject both agent playbook + global patterns at runtime
  - Keep clean separation

---

## ⚠️ When Would Cross-Agent Playbooks Make Sense?

**Possible future scenarios:**

### 1. Domain Knowledge (Maybe)
```json
// All agents should know healthcare compliance rules
{
  "agent_id": null,
  "scope": "global",
  "playbook": {
    "sections": {
      "Healthcare Domain": {
        "bullets": [
          "• HIPAA compliance requires encryption at rest and in transit",
          "• PHI (Protected Health Information) must have audit logging"
        ]
      }
    }
  }
}
```

**Counter-argument:** This is better stored as **project context**, not agent playbooks!

### 2. User Communication Style (Maybe)
```json
// This user always wants professional, formal tone
{
  "agent_id": null,
  "scope": "user",
  "user_id": "user-123",
  "playbook": {
    "sections": {
      "Communication Style": {
        "bullets": ["• Use formal, professional language (no emojis, no casual tone)"]
      }
    }
  }
}
```

**Counter-argument:** This can be in agent.instructions base prompt, or in user preferences table!

### 3. Company Standards (Maybe)
```json
// All agents should follow company coding standards
{
  "agent_id": null,
  "scope": "global",
  "playbook": {
    "sections": {
      "Coding Standards": {
        "bullets": [
          "• Always use TypeScript strict mode",
          "• Prefer functional programming patterns"
        ]
      }
    }
  }
}
```

**Counter-argument:** This belongs in project configuration or team settings, not ACE playbooks!

---

## 🎯 Final Recommendation

### ✅ KEEP CURRENT IMPLEMENTATION (Agent-Scoped)

**Reasons:**
1. **Matches Ax design:** ACE is program-level, not global
2. **Clear ownership:** Each agent owns its learning
3. **Task-specific patterns:** PM summaries ≠ Dev code reviews
4. **Simpler queries:** No NULL agent_id checks
5. **Natural separation:** User preferences can differ by task type

**Schema Decision:**
```sql
agent_id UUID REFERENCES agents(id) NOT NULL  -- ✅ REQUIRED
scope TEXT DEFAULT 'global'                    -- ✅ global | user | project
user_id TEXT REFERENCES user(id)               -- ✅ For user-scoped
project_id UUID REFERENCES projects(id)        -- ✅ For project-scoped
```

---

## 🔄 Future Flexibility

**If we LATER need cross-agent patterns:**

### Option 1: Global Patterns Table (Separate)
```sql
CREATE TABLE global_patterns (
  id UUID PRIMARY KEY,
  category TEXT NOT NULL,      -- "domain", "communication", "standards"
  scope TEXT DEFAULT 'global',
  user_id TEXT,
  project_id UUID,
  patterns JSONB NOT NULL,
  created_at TIMESTAMP
);
```

At runtime:
```typescript
const agentPlaybook = await loadAcePlaybook(agentId, scope, userId);
const globalPatterns = await loadGlobalPatterns(scope, userId);

const combinedContext = `
${agent.instructions}

${formatAcePlaybook(agentPlaybook)}

${formatGlobalPatterns(globalPatterns)}
`;
```

### Option 2: Keep Agent-Scoped, Duplicate if Needed
- If "Use ISO dates" is learned by PM Agent
- And it applies to ALL agents
- Manually create playbook entries for each agent (or script it)
- Trade-off: Some duplication for simpler architecture

---

## 📊 Comparison Table

| Aspect | Agent-Scoped (Current) | Cross-Agent (Alternative) |
|--------|------------------------|---------------------------|
| **Matches Ax design** | ✅ Yes (program-level) | ❌ No (global playbooks not in Ax) |
| **Query simplicity** | ✅ Simple WHERE clause | ❌ Complex NULL checks |
| **Clear ownership** | ✅ Each agent owns learning | ⚠️ Unclear which patterns apply where |
| **User preferences** | ✅ Task-specific (correct!) | ⚠️ One-size-fits-all (wrong!) |
| **Future flexibility** | ✅ Can add global_patterns table | ⚠️ Already mixed concerns |
| **Implementation effort** | ✅ Already built! | ❌ Requires schema change |

---

## ✅ Conclusion

**KEEP CURRENT IMPLEMENTATION: `agent_id` REQUIRED**

The current schema is architecturally sound:
- Aligns with Ax framework design (program-level playbooks)
- Separates agent concerns cleanly
- Allows task-specific user preferences (PM summaries ≠ Dev code reviews)
- Simpler queries and clearer ownership
- Leaves door open for future global patterns if truly needed

**No schema changes needed!** ✨

---

**Research Completed By:** Amelia (Dev Agent)  
**Date:** 2025-11-13  
**Status:** ✅ RECOMMENDATION - Keep agent-scoped playbooks  
**Confidence:** HIGH (based on Ax documentation + architectural principles)
