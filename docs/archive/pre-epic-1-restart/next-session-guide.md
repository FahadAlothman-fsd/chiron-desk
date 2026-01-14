# Next Session Guide - Start Here

**Date:** 2025-11-06
**Status:** Database Schema Designed → Ready for Implementation
**Last Session:** Schema finalized through workflow mapping (brainstorm-project, research)

---

## Quick Start

**What to do:** Implement Chiron database schema and seed Phase 1 workflows

**Which agent:** DEV

**Command:** "Implement the Chiron database schema from docs/architecture/database-schema-final.md"

**CRITICAL REFERENCE:** `docs/NEXT-SESSION-2025-11-06.md` ← Complete implementation guide

---

## Context Summary

### What's Done ✅

1. **Phase 1 (Analysis):** Product Brief complete
2. **Phase 2 (Planning):** PRD complete (45 FRs, 8 epics, 3 user journeys)
3. **Phase 3 (Solutioning):**
   - Architecture complete (workflow engine structure defined)
   - Tool stack decided: **AI SDK + Mastra + ax**
   - **Database schema finalized** (15 tables, complete mappings)
   - **Phase 1 workflows mapped** (brainstorm-project, research)

### Tool Stack (FINAL)

- **AI SDK:** Multi-provider LLM (OpenRouter, Anthropic) + streaming + structured outputs
- **Mastra:** Workflow orchestration + multi-agent + state persistence
- **ax:** Prompt optimization (GEPA multi-objective optimizer)
- **Effect:** Deferred to Epic 7

**Context7 Coverage:** 58,804 code snippets combined

---

## Story 1.1: Database Schema Implementation

**Goal:** Implement Chiron database schema (15 tables) + Seed Phase 1 workflows

**Duration:** 1 day (schema already designed!)

**Status:** Design complete, ready for implementation

### Complete Table List (15 Tables)

**Core Tables:**

1. `projects` - Project metadata
2. `project_state` - Current workflow position tracking (NO FILES!)
3. `workflow_paths` - Workflow sequences for project types
4. `workflow_path_workflows` - Junction table (NEW!)

**Workflow Definition Tables:** 5. `agents` - AI agents 6. `workflows` - Workflow definitions 7. `workflow_steps` - Individual steps 8. `workflow_step_branches` - N-way conditional routing (NEW!) 9. `workflow_step_actions` - Actions within steps (NEW!)

**Execution Tables:** 10. `workflow_executions` - Runtime state (variables JSONB) 11. `project_artifacts` - Generated files tracking

**Optimization Tables:** 12. `training_examples` - User corrections for ax 13. `optimization_runs` - GEPA optimizer results

**Future Tables:** 14. `epic_state` - Epic tracking (Epic 2+) 15. `story_state` - Story tracking (Epic 2+)

**Reference Document:** `docs/architecture/database-schema-final.md` ← THE COMPLETE SCHEMA

**Implementation Guide:** `docs/NEXT-SESSION-2025-11-06.md` ← Step-by-step instructions

---

## Why No Story File?

**BMAD Principle:** Stories created just-in-time when needed

**When to create story files:**

- Unclear requirements → need refinement
- Multiple people → need coordination
- Complex acceptance criteria → need detailed breakdown

**Story 1.1 Exception:**

- Clear technical requirements (database schemas)
- Solo developer (you)
- Acceptance criteria already well-defined in epics.md
- **Action:** Go straight to implementation

---

## Commands to Run

**Install dependencies:**

```bash
cd /home/gondilf/Desktop/projects/masters/chiron
bun add @ai-sdk/anthropic @ai-sdk/openrouter ai @mastra/core @ax-llm/ax @ax-llm/ax-ai-sdk-provider zod drizzle-orm drizzle-kit postgres
```

**Start Story 1.1:**

1. Switch to DEV agent
2. Say: "Start Story 1.1 - Database Schema Design"
3. DEV will create schemas in `packages/db/src/schema/` (leveraging existing better-t3-stack structure)

---

## Key Files to Reference

**CRITICAL:**

- **`docs/NEXT-SESSION-2025-11-06.md`** ← Complete implementation guide
- **`docs/architecture/database-schema-final.md`** ← THE COMPLETE SCHEMA

**Supporting:**

- **Epic breakdown:** `docs/epics.md` (Epic 1, Stories 1.1-1.6)
- **Tool decision:** `docs/tool-stack-decision.md`
- **Architecture:** `docs/workflow-engine-structure.md`
- **BMad paths:** `bmad/bmm/workflows/workflow-status/paths/greenfield-level-3.yaml`
- **Existing DB setup:** `packages/db/` (from better-t3-stack)

---

## Epic 1 Timeline (2 weeks)

**Week 1:**

- Story 1.1: Database Schema Implementation (1 day) ← **START HERE** (design complete!)
- Story 1.2: BMAD Workflow Seeding (COMBINED WITH 1.1 - seed Phase 1 workflows)

**Week 2:**

- Story 1.3: Project CRUD Operations (2 days)
- Story 1.4: Workflow-Init Conversational Setup (4 days)
- Story 1.5: Workflow Execution Engine (4 days, parallel with 1.4)
- Story 1.6: Status Tracking (1 day)

---

## Questions?

**If unclear about Story 1.1:**

- Read `docs/epics.md` lines 49-80 for full acceptance criteria
- Check `docs/tool-stack-decision.md` for database schema examples (lines 371-399)

**If need more planning:**

- Run `/bmad:bmm:workflows:create-story` with SM agent
- But this is likely unnecessary for Story 1.1

**If ready:**

- Go to DEV agent
- Start coding!

---

_Last Updated: 2025-11-04 (Ready for Epic 1 Implementation)_
