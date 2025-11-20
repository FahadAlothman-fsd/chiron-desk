# Chiron Epics Directory

This directory contains detailed epic breakdowns for the Chiron project.

---

## Epic Documents

| Epic | Document | Status | Duration |
|------|----------|--------|----------|
| Epic 1 | [epic-1-foundation.md](./epic-1-foundation.md) | 🟢 In Progress | 4.2 weeks |
| Epic 2 | [epic-2-phase-1-analysis.md](./epic-2-phase-1-analysis.md) | ⏸️ Planned | 3.5-4 weeks |
| Epic 3 | [epic-3-phase-2-planning.md](./epic-3-phase-2-planning.md) | ⏸️ Planned | 3-3.5 weeks |
| Epic 4 | [epic-4-git-worktree.md](./epic-4-git-worktree.md) | ⏸️ Planned | 2-2.5 weeks |
| Epic 5 | [epic-5-phase-3-solutioning.md](./epic-5-phase-3-solutioning.md) | ⏸️ Planned | 2.5-3 weeks |
| Epic 6 | [epic-6-phase-4-implementation.md](./epic-6-phase-4-implementation.md) | ⏸️ Planned | 3-3.5 weeks |
| Epic 7 | [epic-7-polish.md](./epic-7-polish.md) | ⏸️ Planned | 2-2.5 weeks |

---

## Technical Specification Documents

- **[epic-1-database-implementation.md](./epic-1-database-implementation.md)** - Complete database schema specification with seed data structure
- **[tech-spec-epic-1.md](./tech-spec-epic-1.md)** - Technical specification for Epic 1

---

## Story Format

Each epic contains detailed story breakdowns following this format:

```
**Story [EPIC.N]: [Story Title]**
**Priority:** P0 (Critical) | P1 (Important) | P2 (Nice to have)
**Estimate:** X days
**Dependencies:** Story X.Y

**Description:**
[What needs to be built]

**Acceptance Criteria:**
- [ ] Criterion 1
- [ ] Criterion 2

**Technical Notes:**
[Implementation details, references, patterns]
```

---

## Epic Sequencing Strategy

**Phase-by-Phase BMAD Approach:**

1. **Epic 1:** Foundation - Core infrastructure (workflow engine, database, project setup)
2. **Epic 2:** Phase 1 Complete - All Analysis workflows with UI patterns ✅ **Thesis Validation**
3. **Epic 3:** Phase 2 Complete - All Planning workflows with pattern refinements
4. **Epic 4:** Git Worktree & Multi-Agent Foundation - Parallel execution infrastructure
5. **Epic 5:** Phase 3 Complete - All Solutioning workflows
6. **Epic 6:** Phase 4 Complete - All Implementation workflows with full orchestration
7. **Epic 7:** Polish & Extensibility - Admin interface, performance, refinements

**Key Strategy:**
- Each phase epic delivers complete end-to-end user value (working workflows + UI)
- Patterns emerge organically based on real workflow needs (not speculation)
- Thesis validated early (Artifact Workbench + Chat Patterns in Epic 2, Week 5-6)
- Infrastructure built just-in-time (multi-agent deferred until needed in Epic 6)

---

## Navigation

- **[← Back to Main Epics Overview](../epics.md)**
- **[← Back to PRD](../PRD.md)**
- **[View Architecture Docs](../architecture/)**
