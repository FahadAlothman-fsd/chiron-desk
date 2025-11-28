# chiron - Epic Breakdown (Master Index)

**Author:** fahad  
**Date:** 2025-11-01  
**Project Level:** 3  
**Target Scale:** Complex system with subsystems, integrations, and architectural decisions

---

## Overview

This document provides the high-level epic roadmap for Chiron. Each epic has its own detailed document in `/docs/epics/`.

**For detailed story breakdowns, see individual epic documents below.**

---

## Epic Sequencing Principles (Phase-by-Phase BMAD Approach)

- **Epic 1:** Foundation - Core infrastructure (workflow engine, database, project setup)
- **Epic 2:** Phase 1 Complete - All Analysis workflows (product-brief, brainstorm, research) with UI patterns
- **Epic 3:** Phase 2 Complete - All Planning workflows (PRD, epics) with pattern refinements
- **Epic 4:** Git Worktree & Multi-Agent Foundation - Parallel execution infrastructure
- **Epic 5:** Phase 3 Complete - All Solutioning workflows (architecture, tech-spec)
- **Epic 6:** Phase 4 Complete - All Implementation workflows (sprint, stories, Kanban) with full orchestration
- **Epic 7:** Polish & Extensibility - Admin interface, performance, refinements

**Key Strategy:**
- Each phase epic delivers complete end-to-end user value (working workflows + UI)
- Patterns emerge organically based on real workflow needs (not speculation)
- Thesis validated early (Artifact Workbench + Chat Patterns in Epic 2, Week 5-6)
- Infrastructure built just-in-time (multi-agent deferred until needed in Epic 6)

---

## Epics Roadmap

| Epic | Title | Duration | Status | Document |
|------|-------|----------|--------|----------|
| **1** | **Foundation + Workflow-Init Engine** | 4.2 weeks | 🟢 **In Progress** | **[epic-1-foundation.md](./epics/epic-1-foundation.md)** |
| 2 | Artifact Workbench (Brainstorming) | 2 weeks | 🟢 In Progress | [epic-2-artifact-workbench.md](./epics/epic-2-artifact-workbench.md) |
| 3 | Artifact Workbench Part 2 (Research/Brief) | 2 weeks | ⏸️ Planned | [epic-3-artifact-workbench-part-2.md](./epics/epic-3-artifact-workbench-part-2.md) |
| 4 | Phase 1 - Planning Workflows | 3-3.5 weeks | ⏸️ Planned | [epic-4-phase-1-planning.md](./epics/epic-4-phase-1-planning.md) |
| 5 | Git Worktree & Multi-Agent | 2-2.5 weeks | ⏸️ Planned | [epic-5-git-worktree.md](./epics/epic-5-git-worktree.md) |
| 6 | Phase 3 - Solutioning | 2.5-3 weeks | ⏸️ Planned | [epic-6-phase-3-solutioning.md](./epics/epic-6-phase-3-solutioning.md) |
| 7 | Phase 4 - Implementation | 3.5-4 weeks | ⏸️ Planned | [epic-7-phase-4-implementation.md](./epics/epic-7-phase-4-implementation.md) |
| 8 | Polish & Extensibility | 2-2.5 weeks | ⏸️ Planned | [epic-8-polish.md](./epics/epic-8-polish.md) |
| | **Total** | **18.5-21 weeks** | | **8 epics** |

---

## Epic 1: Foundation + Workflow-Init Engine (Current)

**Goal:** Build database foundation, web UI shell, generic workflow execution engine, and complete workflow-init-new implementation

**Status:** 🟢 In Progress  
**Document:** **[epic-1-foundation.md](./epics/epic-1-foundation.md)**

**Key Deliverables:**
- Complete database foundation (16 tables, no migrations - Docker reset approach)
- Web application with authentication (better-auth)
- Generic workflow execution engine (reusable for all future workflows)
- LLM integration (OpenRouter + Anthropic) with models selection page
- Anthropic API key configuration in Settings UI
- 5 step type handlers (ask-user, execute-action, llm-generate, ask-user-chat, display-output)
- Mastra + Ax integration with ACE optimizer and approval gates
- Complete workflow-init-new (10 steps, end-to-end)
- Users can create projects through conversational workflow

**Stories:**
- Story 1.1: Database Schema Refactoring (2 days) ✅
- Story 1.2: Core Data Seeding (1 day) ✅
- Story 1.3: Web UI Foundation + LLM Models Page (3 days) ✅
- Story 1.4: Workflow Execution Engine Core (3 days) ✅
- Story 1.5: Workflow-Init Steps 1-3 (Foundation) (3 days) ✅
- **Story 1.6: Workflow-Init Steps 4-6 (Analysis) + Mastra/Ax Integration + Anthropic Config (4 days)** ← 🎯 **Next**
- Story 1.7: Workflow-Init Steps 7-8 (Naming) (2 days)
- Story 1.8: Workflow-Init Steps 9-10 (Creation & Confirmation) (3 days)

---

## Epic 2: Artifact Workbench (Brainstorming Focus)

**Goal:** Implement Artifact Workbench with Phase 0 workflows to validate thesis: visual UX + artifact-driven workflows > CLI approach.

**Status:** 🟢 In Progress
**Document:** [epic-2-artifact-workbench.md](./epics/epic-2-artifact-workbench.md)

**Key Deliverables:**
- Artifact Workbench UI (Split Pane)
- Brainstorming Workflow (End-to-End)
- Multi-agent Chat Pattern
- Live Artifact Rendering

**Stories:**
- Story 2.1: Project Dashboard (The Entry Point) (2 days)
- Story 2.2: Workbench Shell & Setup (Step 1) (3 days)
- Story 2.3: Execution Loop & Child Workflows (Step 2) (3 days)
- Story 2.4: Convergence & Kanban (Step 3) (3 days)
- Story 2.5: Planning & Forms (Step 5) (3 days)
- Story 2.6: Artifact Rendering & Persistence (Output) (2 days)

---

## Epic 3-8: Future Epics

**Status:** ⏸️ Planned  
**Details:** See individual epic documents for high-level summaries. Detailed story breakdowns will be created just-in-time.

---

## Summary: Resequenced Epic Roadmap

**Key Strategy Changes from Original:**
- ✅ Thesis validated in Week 5-6 (Epic 2) instead of Week 11-13
- ✅ Patterns emerge organically from real workflow needs (not speculative)
- ✅ Each phase delivers complete end-to-end value (working workflows + UI)
- ✅ Infrastructure built just-in-time (multi-agent deferred until needed in Epic 6)
- ✅ User can use Chiron for real work starting Epic 2 (Analysis workflows functional)

**Parallelization Opportunities:**
- Epic 4 (Git Worktree) can start after Epic 1, run parallel with Epic 2-3
- This could reduce total timeline to ~16-18 weeks with careful scheduling

---

## Additional Documentation

- **[PRD](./PRD.md)** - Product Requirements Document
- **[Architecture Docs](./architecture/)** - Database schema, workflow engine, architecture decisions
- **[Epics Directory README](./epics/README.md)** - Navigation guide for all epics
- **[Epic 1 Database Implementation](./epics/epic-1-database-implementation.md)** - Detailed schema and seed data specs
- **[Epic 1 Tech Spec](./epics/tech-spec-epic-1.md)** - Technical specification

---

**Next Steps:**
1. ✅ Complete Epic 1 foundation (Stories 1.1-1.8)
2. Begin Epic 2 (Artifact Workbench + Analysis workflows)
3. Validate thesis in Epic 2, Week 5-6
4. Create detailed story breakdowns for Epics 3-7 just-in-time
