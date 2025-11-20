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
| 2 | Phase 1 - Analysis Complete | 3.5-4 weeks | ⏸️ Planned | [epic-2-phase-1-analysis.md](./epics/epic-2-phase-1-analysis.md) |
| 3 | Phase 2 - Planning Complete | 3-3.5 weeks | ⏸️ Planned | [epic-3-phase-2-planning.md](./epics/epic-3-phase-2-planning.md) |
| 4 | Git Worktree & Multi-Agent | 2-2.5 weeks | ⏸️ Planned | [epic-4-git-worktree.md](./epics/epic-4-git-worktree.md) |
| 5 | Phase 3 - Solutioning Complete | 2.5-3 weeks | ⏸️ Planned | [epic-5-phase-3-solutioning.md](./epics/epic-5-phase-3-solutioning.md) |
| 6 | Phase 4 - Implementation Complete | 3-3.5 weeks | ⏸️ Planned | [epic-6-phase-4-implementation.md](./epics/epic-6-phase-4-implementation.md) |
| 7 | Polish & Extensibility | 2-2.5 weeks | ⏸️ Planned | [epic-7-polish.md](./epics/epic-7-polish.md) |
| | **Total** | **18.5-21 weeks** | | **7 epics** |

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

## Epic 2: Phase 1 - Analysis Complete

**Goal:** Implement all Phase 1 (Analysis) workflows with Artifact Workbench UI, chat patterns, and tangential workflow support. Validate thesis: visual UX > CLI.

**Status:** ⏸️ Planned  
**Document:** [epic-2-phase-1-analysis.md](./epics/epic-2-phase-1-analysis.md)

**Key Deliverables:**
- Artifact Workbench UI
- Product-brief, brainstorm, research workflows
- Chat patterns A & C
- Tangent workflow system

**Stories:** 8 stories (details in epic document)

---

## Epic 3-7: Future Epics

**Status:** ⏸️ Planned  
**Details:** See individual epic documents for high-level summaries. Detailed story breakdowns will be created just-in-time.

---

## Summary: Resequenced Epic Roadmap

**Key Strategy Changes from Original:**
- ✅ Thesis validated in Week 5-6 (Epic 2) instead of Week 11-13
- ✅ Patterns emerge organically from real workflow needs (not speculative)
- ✅ Each phase delivers complete end-to-end value (working workflows + UI)
- ✅ Infrastructure built just-in-time (multi-agent deferred until Epic 6 when needed)
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
