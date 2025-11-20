# Spike: Ax + Mastra Approval Gates for Chiron

**Date:** 2025-11-10  
**Status:** 🔴 BLOCKING Story 1.6  
**Owner:** Fahad  
**Research Team:** Architect (Winston) + Analyst (Mary)

---

## Overview

Before implementing Story 1.6 (workflow-init steps 4-6 with LLM-driven complexity analysis), we need to deeply understand and evaluate four key technologies for Chiron's agentic workflow patterns:

1. **Mastra** - AI agent orchestration framework
2. **Ax** - Declarative LLM prompting (TypeScript DSPy port) with GEPA/ACT optimizers
3. **Effect** - Functional effect system for concurrency/error handling
4. **ai-sdk** - Vercel AI SDK for LLM interactions

---

## Problem Statement

Chiron requires several sophisticated agentic patterns that go beyond simple LLM calls:

### **Pattern 1: Approval-Gate Chat (Workflow-Init Step 2-4)**
- User describes project in conversational chat interface
- LLM triggers side-effect tools during conversation:
  - `updateSummary` → Pauses chat → Shows UI modal → User approves/rejects
  - `updateComplexity` → Pauses chat → Shows classification → User approves/rejects
  - `updateConfidence` → Updates confidence score (background, no approval)
- Chat continues UNTIL all required approvals received
- User can refine description → side effects auto-update

**Key Requirements:**
- Tool calling with human-in-the-loop approval gates
- Conversation state management across multiple turns
- Side effects trigger UI changes (modals, approval flows)
- Optimized LLM prompts for high-quality classifications (GEPA/ACT)

### **Pattern 2: Artifact Workbench (Epic 2)**
- Multi-agent collaboration on document artifacts (PRD, Architecture, Stories)
- Agents propose edits → User reviews in diff view → Approves/rejects
- Real-time agent coordination with git worktree isolation
- Tangential workflows (user asks agent to explore alternative approach)

**Key Requirements:**
- Multi-agent orchestration with structured workflows
- Human-in-the-loop approval at every agent contribution
- Structured output generation (PRD sections, architecture diagrams)
- Agent memory and context management

### **Pattern 3: LLM-Generated Variables with Optimization**
- Generate project name suggestions (Step 7)
- Classify project complexity (Step 4)
- Extract structured data from conversation (summaries, tags)

**Key Requirements:**
- Structured output with Zod schemas
- Prompt optimization for consistent, high-quality results
- GEPA (Generalized Proposal-Acceptance) for few-shot learning
- ACT (Adaptive Cognitive Tuning) for context-aware classification

---

## Research Objectives

### **Phase 1: Technology Understanding**

**For Each Technology (Mastra, Ax, Effect, ai-sdk):**

1. **Core Capabilities:**
   - What problems does it solve?
   - What are the key features and APIs?
   - What's the learning curve and DX?

2. **Chiron Pattern Fit:**
   - Can it handle approval-gate chat with tool pausing?
   - Does it support multi-agent orchestration?
   - Can it integrate with structured output (Zod schemas)?
   - How does it handle conversation state management?

3. **Integration Complexity:**
   - Does it work with our stack (tRPC, Drizzle, React, TanStack Query)?
   - Can we use OpenRouter as LLM provider?
   - What's the bundle size / performance impact?
   - Is it production-ready or experimental?

4. **Trade-offs:**
   - Framework lock-in vs flexibility?
   - Abstraction cost vs developer velocity?
   - Community support and documentation quality?

---

### **Phase 2: Architecture Decision**

**Decision Matrix:**

Create a comparison table scoring each technology on:
- **Approval-Gate Chat Support** (0-10)
- **Multi-Agent Orchestration** (0-10)
- **Prompt Optimization (GEPA/ACT)** (0-10)
- **Integration Complexity** (0-10, higher = easier)
- **Production Readiness** (0-10)
- **Framework Lock-in Risk** (-10 to 0, 0 = no lock-in)

**Recommended Combinations:**

Evaluate these architectural approaches:
1. **Mastra Only** - Use Mastra for everything (agents, tools, workflows)
2. **Ax + ai-sdk** - Use Ax for prompt optimization, ai-sdk for LLM calls, no framework
3. **Mastra + Ax** - Mastra for orchestration, Ax for optimized signatures in tools
4. **Effect + ai-sdk + Ax** - Effect for concurrency/errors, ai-sdk for LLMs, Ax for prompts
5. **Pure ai-sdk** - Minimal framework, build orchestration ourselves

---

### **Phase 3: Proof-of-Concept Design**

**Deliverable:** Detailed POC plan for approval-gate chat pattern

**POC Scope:**
- Single conversation with user describing project
- LLM calls `updateSummary` tool → Frontend shows approval modal
- User approves → LLM continues → Calls `updateComplexity` tool → Another approval
- Both approved → Chat completes, side effects saved to workflow execution

**Implementation Questions:**
1. How do we pause Mastra agent execution waiting for approval?
2. How do we pass approval results back to agent to continue conversation?
3. How do we integrate Ax signatures into Mastra tools?
4. What's the frontend React component structure for approval gates?
5. How do we manage conversation state in `workflow_executions.variables`?

---

## Research Methodology

**Tools to Use:**
- ✅ **webfetch** - Fetch official documentation from Mastra, Ax, Effect, ai-sdk websites
- ✅ **web-search-prime** - Search for real-world examples, tutorials, integration guides
- ✅ **context7** - Get library-specific documentation and API references

**Research Process:**

1. **Architect (Winston):**
   - Deep dive into technical architecture of each framework
   - Evaluate integration complexity with our stack
   - Assess production readiness and performance characteristics
   - Create architectural diagrams for each approach

2. **Analyst (Mary):**
   - Market research on framework adoption and community support
   - Competitive analysis of alternatives (LangChain, LlamaIndex, etc.)
   - Requirements elicitation (validate our patterns are industry-standard)
   - Risk assessment for each technology choice

3. **Collaborative Synthesis:**
   - Both agents discuss findings together
   - Create decision matrix with scoring
   - Recommend preferred approach with rationale
   - Document trade-offs and risks

---

## Success Criteria

**This spike is complete when:**

- ✅ Comprehensive understanding of all 4 technologies documented
- ✅ Decision matrix created with objective scoring
- ✅ Recommended architecture approach selected with clear rationale
- ✅ POC implementation plan ready to execute
- ✅ Ax tutorials and GEPA/ACT examples documented
- ✅ All research sources cited (webfetch, web-search-prime, context7)

---

## Blocking Impact

**Story 1.6 Blocked Until:**
- We know which framework(s) to use for ask-user-chat handler
- We understand how to integrate Ax optimizers for LLM variables
- We have POC plan for approval-gate chat pattern

**Epic 2 Impacted:**
- Artifact workbench architecture depends on this decision
- Multi-agent orchestration patterns need framework selection

---

## Research Output Location

All research findings will be documented in:
- `/docs/research/mastra-deep-dive.md`
- `/docs/research/ax-deep-dive.md`
- `/docs/research/effect-deep-dive.md`
- `/docs/research/ai-sdk-deep-dive.md`
- `/docs/research/framework-decision-matrix.md`
- `/docs/research/ax-tutorials-gepa-act.md`

---

## API Configuration

**OpenRouter API:**
- API key stored in `app_config.openrouterApiKey` for user: `test@chiron.local`
- Seed user credentials:
  - Email: `test@chiron.local`
  - Password: `test123456`
  - Name: `Test User`
- Source: `/packages/scripts/src/seeds/users.ts`

---

## Next Steps

1. **Launch research party mode** with Architect + Analyst
2. **Execute deep research** using webfetch, web-search-prime, context7
3. **Synthesize findings** into decision matrix
4. **Create POC plan** for approval-gate chat pattern
5. **Update Story 1.6** with selected architecture

---

**Status:** 🚀 READY TO START  
**Estimated Duration:** 2-3 days  
**Dependencies:** None  
**Blockers:** None
