# Chiron Documentation

**Last Updated:** 2025-11-06  
**Status:** Post-Reconciliation - Ready for Epic 1 Restart

---

## 📚 Document Structure

This directory contains all project documentation organized by purpose.

---

## ✅ CANONICAL DOCUMENTS (Source of Truth)

**All agents and developers MUST reference these documents:**

### Product Definition
- **`PRD.md`** - Product Requirements Document (FR001-FR045)
- **`epics.md`** - Epic breakdown with story details

### Architecture
- **`architecture/CANONICAL-WORKFLOW-SCHEMA.md`** - Database schema (SINGLE SOURCE OF TRUTH)
- **`architecture-decisions.md`** - Architectural Decision Records (ADR log)
- **`workflow-engine-design-brief.md`** - Workflow engine design
- **`workflow-engine-structure.md`** - Workflow step types and patterns

### Implementation Status
- **`workflow-status.yaml`** - Current workflow state (v6-main format)
- **`sprint-status.yaml`** - Sprint tracking with story states
- **`stories/*.md`** - Individual story definitions
- **`stories/*.context.xml`** - Story context for agents

### Design
- **`ux-design-specification.md`** - UX design patterns
- **`chiron-ui-wireframes-v1.md`** - UI wireframes
- **`design/ux-design-directions.html`** - Interactive design directions

### Session Context
- **`SESSION-SUMMARY-2025-11-06.md`** - Latest session summary (updated each session)

---

## 📦 Archived Documents

**Historical context only - DO NOT reference for implementation:**

- **`archive/pre-epic-1-restart/`** - Documents before schema reconciliation (Nov 6, 2025)
  - Contains: outdated schema, architecture summaries, old session guides
  - **DO NOT USE** for Story 1.1+ implementation

- **`archive/phase-3-solutioning/`** - Historical implementation reports
- **`archive/bmm-workflow-status-v6-alpha.md`** - Old workflow status format

---

## 🚨 Critical Rules

### For Schema Implementation (Story 1.1)

**ONLY use:** `architecture/CANONICAL-WORKFLOW-SCHEMA.md`

**Key Schema Features:**
- ✅ NO PostgreSQL enums for project level/type/field
- ✅ JSONB `tags` in `workflow_paths` for dynamic filtering
- ✅ `executedVsPath` in `projects` table (project-level progress)
- ✅ `executedSteps` in `workflow_executions` table (execution-level progress)
- ✅ 16 tables total (including `workflow_templates`, `dialog_sessions`)

**Contradictions Resolved:**
- `database-schema-final.md` archived (outdated, had enums)
- `architecture-foundations.md` archived (redundant)
- `architecture-summary.md` archived (redundant)

### For Story Context

**Story context files (`.context.xml`) reference:**
- `CANONICAL-WORKFLOW-SCHEMA.md` for schema
- `PRD.md` for requirements
- `architecture-decisions.md` for ADRs

---

## 📖 Document Relationships

```
PRD.md (requirements)
  ↓
epics.md (story breakdown)
  ↓
stories/*.md (implementation)
  ↓
stories/*.context.xml (agent context)
  ↑
CANONICAL-WORKFLOW-SCHEMA.md (schema reference)
```

---

## 🔄 Update Protocol

**When updating any canonical document:**

1. Update the document
2. Update `Last Updated` date in header
3. If schema changes: Update `CANONICAL-WORKFLOW-SCHEMA.md` FIRST, then code
4. If requirements change: Update `PRD.md` and relevant story files
5. Git commit with clear message referencing what changed

---

## 🆘 Getting Help

**If you see contradictory information:**
1. Check if you're reading an archived document
2. Always prefer canonical documents (listed above)
3. If canonical docs conflict, flag to Fahad immediately

**If a document is missing:**
1. Check `archive/` folders
2. Check git history: `git log --all --full-history -- path/to/file`
3. Ask Fahad if document should be restored or recreated

---

_Document structure established: 2025-11-06_  
_Next: Epic 1 restart with clean canonical references_
