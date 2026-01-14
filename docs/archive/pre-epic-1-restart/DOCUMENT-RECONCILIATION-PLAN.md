# Document Reconciliation Plan - Epic 1 Pre-Work

**Date:** 2025-11-06  
**Status:** READY TO EXECUTE (UPDATED)  
**Context:** Complete document audit identified 9 contradictions blocking Epic 1 restart  
**Session Reference:** SESSION-SUMMARY-2025-11-06.md  
**Last Updated:** 2025-11-06 (Added story archival + tracking reset)

---

## 🎯 OBJECTIVE

Clean up contradictory documentation AND reset contaminated tracking state to establish a single source of truth for Epic 1 schema implementation. This plan addresses all 9 contradictions identified in the audit, plus archives outdated stories and resets workflow/sprint tracking.

---

## 🚨 CRITICAL FINDINGS (Must Fix Before Epic 1)

### Problem Summary

We have **TWO conflicting schema documents** with major differences:

1. **`docs/architecture/database-schema-final.md`** (Nov 5, 2025) - OLD DESIGN ❌
   - ❌ Uses hardcoded PostgreSQL enums (`projectLevelEnum`, `projectTypeEnum`, `fieldTypeEnum`)
   - ❌ Missing `executedVsPath` JSONB field in `projects` table
   - ❌ Missing `executedSteps` JSONB field in `workflow_executions` table
   - ❌ Missing `workflow_templates` table
   - ❌ Missing `dialog_sessions` table
   - ❌ Wrong step types (has `load-context`, missing `branch`)

2. **`docs/architecture/workflow-schema-snapshot.md`** (Nov 6, 2025) - CURRENT DESIGN ✅
   - ✅ NO enums - uses JSONB `tags` for dynamic filtering
   - ✅ HAS `executedVsPath` for project-level progress tracking
   - ✅ HAS `executedSteps` for execution-level progress tracking
   - ✅ HAS `workflow_templates` table
   - ✅ HAS `dialog_sessions` table
   - ✅ Correct step types

**Current File Locations:**

```
docs/architecture/
├── database-schema-final.md ❌ (EXISTS - outdated)
├── workflow-schema-snapshot.md ✅ (EXISTS - current)
├── seed-data-examples.md ❌ (EXISTS - outdated)
└── workflow-init-complete-example.md ✅ (EXISTS - keep)
```

**Result:** Story 1.1 (Database Schema Design) is BLOCKED until we resolve this.

---

## 📋 EXECUTION PLAN (7 Phases)

### **PHASE 1: Archive Outdated Documents + Stories** ⏰ (7 minutes)

**Goal:** Move all outdated/conflicting docs AND contaminated stories to archive

**Actions:**

1. **Create archive directory:**

   ```bash
   mkdir -p docs/archive/pre-epic-1-restart
   ```

2. **Archive outdated schema doc:**

   ```bash
   git mv docs/architecture/database-schema-final.md docs/archive/pre-epic-1-restart/database-schema-final-OLD-2025-11-05.md
   ```

3. **Archive redundant architecture docs:**

   ```bash
   git mv docs/architecture-foundations.md docs/archive/pre-epic-1-restart/
   git mv docs/architecture-summary.md docs/archive/pre-epic-1-restart/
   ```

   - **Keep:** `docs/architecture-decisions.md` (canonical ADR log)

4. **Archive outdated session guides:**

   ```bash
   git mv docs/NEXT-SESSION-2025-11-06.md docs/archive/pre-epic-1-restart/
   git mv docs/next-session-guide.md docs/archive/pre-epic-1-restart/
   ```

   - **Keep:** `docs/SESSION-SUMMARY-2025-11-06.md` (latest context)

5. **Archive old seed examples:**

   ```bash
   git mv docs/architecture/seed-data-examples.md docs/archive/pre-epic-1-restart/
   ```

   - **Reason:** Will be replaced by seed data in CANONICAL-WORKFLOW-SCHEMA.md

6. **Archive ALL Epic 1 stories (written against old schema):**
   ```bash
   git mv docs/sprint-artifacts/1-1-database-schema-design-and-migration-system.md docs/archive/pre-epic-1-restart/
   git mv docs/sprint-artifacts/1-2-bmad-workflow-seeding-system.md docs/archive/pre-epic-1-restart/
   git mv docs/sprint-artifacts/1-2-bmad-workflow-seeding-system.context.xml docs/archive/pre-epic-1-restart/
   git mv docs/sprint-artifacts/1-3-project-crud-operations.md docs/archive/pre-epic-1-restart/
   git mv docs/sprint-artifacts/1-3-project-crud-operations.context.xml docs/archive/pre-epic-1-restart/
   ```

   - **Reason:** Stories reference old schema with enums, missing tables, wrong assumptions

**Files Archived (11 total):**

- database-schema-final-OLD-2025-11-05.md
- architecture-foundations.md
- architecture-summary.md
- NEXT-SESSION-2025-11-06.md
- next-session-guide.md
- seed-data-examples.md
- 1-1-database-schema-design-and-migration-system.md
- 1-2-bmad-workflow-seeding-system.md
- 1-2-bmad-workflow-seeding-system.context.xml
- 1-3-project-crud-operations.md
- 1-3-project-crud-operations.context.xml

---

### **PHASE 2: Promote Canonical Schema Document** ⏰ (3 minutes)

**Goal:** Establish single source of truth for schema

**IMPORTANT:** Currently `workflow-schema-snapshot.md` EXISTS, we are RENAMING it to make it canonical.

**Actions:**

1. **Rename workflow-schema-snapshot.md to CANONICAL-WORKFLOW-SCHEMA.md:**

   ```bash
   # Current file: docs/architecture/workflow-schema-snapshot.md
   # Target file: docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md
   git mv docs/architecture/workflow-schema-snapshot.md docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md
   ```

2. **Update header in CANONICAL-WORKFLOW-SCHEMA.md:**

   Add this at the top (after line 7):

   ```markdown
   ---
   
   ## ⚠️ CANONICAL SOURCE OF TRUTH
   
   **This document is the SINGLE SOURCE OF TRUTH for Chiron's workflow engine schema.**
   
   - All schema implementation (Story 1.1) MUST match this document exactly
   - All seed scripts (Story 1.2) MUST use structures defined here
   - All API implementations (Story 1.3+) MUST reference this schema
   - Any schema changes MUST update this document FIRST, then code
   
   **Last Verified:** 2025-11-06  
   **Session:** Document Reconciliation (pre-Epic 1 restart)
   
   ---
   ```

3. **Update document references in CANONICAL-WORKFLOW-SCHEMA.md:**

   Find and replace at the bottom (Lines 1658-1663):

   **OLD:**

   ```markdown
   ## References

   - **Workflow Engine Design Brief:** `/docs/workflow-engine-design-brief.md`
   - **Workflow Engine Structure:** `/docs/workflow-engine-structure.md`
   - **PRD:** `/docs/PRD.md` (FR001-FR045)
   - **Architecture Foundations:** `/docs/architecture-foundations.md`
   ```

   **NEW:**

   ```markdown
   ## References

   - **Workflow Engine Design Brief:** `docs/workflow-engine-design-brief.md`
   - **Workflow Engine Structure:** `docs/workflow-engine-structure.md`
   - **PRD:** `docs/PRD.md` (FR001-FR045)
   - **Architecture Decisions:** `docs/architecture-decisions.md` (ADR log)
   - **Archived:** `docs/archive/pre-epic-1-restart/` (old schema and architecture docs)
   ```

---

### **PHASE 3: ~~Update Story Context Files~~**

**SKIPPED** - All stories archived in Phase 1, will be rewritten fresh after canonical schema verified

---

### **PHASE 4: Create Canonical Artifact List** ⏰ (5 minutes)

**Goal:** Document which files agents should reference going forward

**File:** `docs/README.md` (create if doesn't exist)

**Content:**

```markdown
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
stories/_.md (implementation)
↓
stories/_.context.xml (agent context)
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
```

---

## **PHASE 5: Reset Workflow Status** ⏰ (3 minutes)

**Goal:** Reset workflow tracking to reflect clean restart at implementation phase

**File:** `docs/workflow-status.yaml`

**Changes:**

```yaml
# Current State (UPDATE these lines)
status: epic-1-ready # CHANGED from "story-1-3-in-progress"

# Implementation Tracking (UPDATE these lines)
epic_status:
  epic-1: not-started # CHANGED from "in-progress"

story_status:
  1-1-database-schema-design-and-migration-system: not-started # CHANGED from "done"
  1-2-bmad-workflow-seeding-system: not-started # CHANGED from "done"
  1-3-project-crud-operations: not-started # CHANGED from "in-progress"
  # Stories 1-4 through 1-6 remain "backlog"

# Key Artifacts (UPDATE this section)
artifacts:
  product_brief: docs/product-brief-chiron-2025-10-26.md
  prd: docs/PRD.md
  epics: docs/epics.md
  architecture_decisions: docs/architecture-decisions.md
  canonical_schema: docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md # ADDED
  # REMOVED: architecture_summary (archived)
  sprint_status: docs/sprint-status.yaml

# Next Actions (UPDATE these lines)
next_action: "Document reconciliation complete. Restart Epic 1 - Begin with Architect review of CANONICAL-WORKFLOW-SCHEMA.md, then rewrite Stories 1.1-1.3"
next_agent: architect
next_workflow: architect-review

# Notes (ADD to existing notes)
notes: |
  - Document reconciliation completed on 2025-11-06
  - Archived 11 files (6 docs, 5 stories) based on old schema with enums
  - Promoted workflow-schema-snapshot.md to CANONICAL-WORKFLOW-SCHEMA.md
  - Reset Epic 1 status to not-started for clean restart
  - Stories 1.1-1.3 will be rewritten based on canonical schema
  - Schema uses JSONB tags (no enums), has executedVsPath, executedSteps
  - Using method-greenfield workflow path
```

---

## **PHASE 6: Reset Sprint Status** ⏰ (2 minutes)

**Goal:** Reset sprint tracking to match clean restart state

**File:** `docs/sprint-status.yaml`

**Changes:**

```yaml
development_status:
  # Epic 1: Core Infrastructure & Database Foundation
  epic-1: backlog # UNCHANGED - correct state
  1-1-database-schema-design-and-migration-system: backlog # CHANGED from "done"
  1-2-bmad-workflow-seeding-system: backlog # CHANGED from "done"
  1-3-project-crud-operations: backlog # CHANGED from "in-progress"
  1-4-workflow-init-conversational-setup: backlog # UNCHANGED
  1-5-workflow-execution-engine-simplified: backlog # UNCHANGED
  1-6-git-repository-validation: backlog # UNCHANGED
  epic-1-retrospective: optional # UNCHANGED


  # All other epics remain unchanged
```

**Rationale:**

- "backlog" means "story only exists in epic file" per sprint-status.yaml definitions
- After archiving story files, stories only exist in epics.md
- This is the correct state for a fresh start

---

## **PHASE 7: Git Commit Strategy** ⏰ (2 minutes)

**After completing Phases 1-6, commit changes:**

```bash
# Stage all changes
git add docs/

# Commit with detailed message
git commit -m "docs: complete reconciliation - archive, reset, establish canonical schema

CRITICAL: Clean slate for Epic 1 restart

Archived (11 files):
- 6 outdated documentation files (old schema, redundant architecture docs)
- 5 story files (Stories 1.1-1.3 written against old schema with enums)

Promoted:
- workflow-schema-snapshot.md → CANONICAL-WORKFLOW-SCHEMA.md (source of truth)

Created:
- docs/README.md (canonical document reference guide)

Reset Tracking:
- workflow-status.yaml: Epic 1 and Stories 1.1-1.3 reset to not-started
- sprint-status.yaml: Stories 1.1-1.3 reset to backlog

Schema Changes (now in CANONICAL-WORKFLOW-SCHEMA.md):
✅ NO PostgreSQL enums (uses JSONB tags)
✅ executedVsPath in projects table
✅ executedSteps in workflow_executions table
✅ workflow_templates and dialog_sessions tables included
✅ 16 tables total

Next: Architect review of canonical schema, then rewrite Stories 1.1-1.3

Refs: SESSION-SUMMARY-2025-11-06.md, DOCUMENT-RECONCILIATION-PLAN.md"
```

---

## 📊 BEFORE/AFTER COMPARISON

### BEFORE (Contaminated State)

```
docs/
├── architecture/
│   ├── database-schema-final.md ❌ (enums, missing tables)
│   ├── workflow-schema-snapshot.md ✅ (correct, but not canonical)
│   └── seed-data-examples.md ❌ (outdated)
├── architecture-foundations.md ❌ (redundant)
├── architecture-summary.md ❌ (redundant)
├── architecture-decisions.md ✅ (keep)
├── NEXT-SESSION-2025-11-06.md ❌ (stale)
├── next-session-guide.md ❌ (stale)
├── SESSION-SUMMARY-2025-11-06.md ✅ (current)
├── stories/
│   ├── 1-1-database-schema-design-and-migration-system.md ❌ (old schema)
│   ├── 1-2-bmad-workflow-seeding-system.md ❌ (old schema)
│   ├── 1-2-bmad-workflow-seeding-system.context.xml ❌ (old schema)
│   ├── 1-3-project-crud-operations.md ❌ (old schema)
│   └── 1-3-project-crud-operations.context.xml ❌ (old schema)
├── workflow-status.yaml ❌ (stories marked done/in-progress incorrectly)
└── sprint-status.yaml ❌ (stories marked done/in-progress incorrectly)
```

### AFTER (Clean State)

```
docs/
├── README.md ✅ (NEW - canonical document list)
├── architecture/
│   └── CANONICAL-WORKFLOW-SCHEMA.md ✅ (RENAMED - source of truth)
├── architecture-decisions.md ✅ (ADR log)
├── SESSION-SUMMARY-2025-11-06.md ✅ (latest context)
├── stories/
│   └── (empty - ready for fresh stories) ✅
├── workflow-status.yaml ✅ (Epic 1 + Stories 1.1-1.3 reset to not-started)
├── sprint-status.yaml ✅ (Stories 1.1-1.3 reset to backlog)
└── archive/
    └── pre-epic-1-restart/
        ├── database-schema-final-OLD-2025-11-05.md
        ├── architecture-foundations.md
        ├── architecture-summary.md
        ├── NEXT-SESSION-2025-11-06.md
        ├── next-session-guide.md
        ├── seed-data-examples.md
        ├── 1-1-database-schema-design-and-migration-system.md
        ├── 1-2-bmad-workflow-seeding-system.md
        ├── 1-2-bmad-workflow-seeding-system.context.xml
        ├── 1-3-project-crud-operations.md
        └── 1-3-project-crud-operations.context.xml
```

---

## 🎯 SUCCESS CRITERIA

**After completing this plan:**

- [ ] ✅ Only ONE schema document exists: `CANONICAL-WORKFLOW-SCHEMA.md`
- [ ] ✅ 11 files archived to `archive/pre-epic-1-restart/` (6 docs + 5 stories)
- [ ] ✅ `docs/README.md` created with canonical document list
- [ ] ✅ `workflow-status.yaml` reset - Epic 1 and Stories 1.1-1.3 to not-started
- [ ] ✅ `sprint-status.yaml` reset - Stories 1.1-1.3 to backlog
- [ ] ✅ `docs/sprint-artifacts/` directory empty (ready for fresh stories)
- [ ] ✅ Git commit with detailed change log
- [ ] ✅ No contradictory schema information in active docs
- [ ] ✅ No contaminated tracking state
- [ ] ✅ Clean slate for Epic 1 restart

---

## 🚀 NEXT STEPS (After Reconciliation)

### **Immediate:**

1. ✅ Complete this reconciliation plan (all 7 phases)
2. ✅ Git commit changes
3. ✅ Verify clean state (no stories in docs/sprint-artifacts/, tracking reset)

### **Next Session with Architect:**

1. Load `docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md`
2. Discuss remaining questions:
   - Resolve `load-context` vs `branch` step type naming
   - Confirm `workflow_templates` and `dialog_sessions` detailed structure
   - Finalize seed data structure for workflow-init
3. Get Architect's approval on schema before Story 1.1 implementation

### **Then: Rewrite Stories (with PM/Analyst):**

1. **Story 1.1:** Rewrite based on CANONICAL-WORKFLOW-SCHEMA.md (16 tables, no enums, JSONB tags)
2. **Story 1.2:** Rewrite for workflow seeding (correct path names: `method-greenfield`)
3. **Story 1.3:** Rewrite for Projects API (includes executedVsPath, tags, no enums)

### **Then: Epic 1 Implementation (Fresh Start)**

1. **Story 1.1:** Implement schema from canonical document
2. **Story 1.2:** Seed workflows using verified schema
3. **Story 1.3:** Build Projects API with correct schema

---

## 📝 NOTES FOR NEXT SESSION

**When you open a new chat, tell the agent:**

> "Please read `docs/DOCUMENT-RECONCILIATION-PLAN.md`. Execute all 7 phases to complete reconciliation. This will archive 11 files, establish CANONICAL-WORKFLOW-SCHEMA.md as source of truth, reset tracking state, and prepare for Epic 1 restart."

**OR if you want to verify first:**

> "Please read `docs/DOCUMENT-RECONCILIATION-PLAN.md` and summarize what will be done in each phase. Do NOT execute yet, I want to review first."

**Key Points for Agent:**

- Archive 11 files (6 docs + 5 stories)
- Rename workflow-schema-snapshot.md → CANONICAL-WORKFLOW-SCHEMA.md
- Reset workflow-status.yaml (Epic 1 to not-started)
- Reset sprint-status.yaml (Stories 1.1-1.3 to backlog)
- Create docs/README.md with canonical document list
- Schema: NO enums, JSONB tags, executedVsPath, executedSteps, 16 tables
- Workflow paths use `method-greenfield` naming

---

## 🔗 REFERENCES

**This Session:**

- Full audit report in chat history
- 9 contradictions identified and resolved
- 4 critical, 2 moderate, 3 minor

**Files BEFORE Reconciliation:**

- `docs/architecture/workflow-schema-snapshot.md` - CURRENT schema (will be renamed)
- `docs/architecture/database-schema-final.md` - OLD schema (will be archived)

**Canonical Documents (AFTER Reconciliation):**

- `docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md` - Schema source of truth (RENAMED from workflow-schema-snapshot.md)
- `docs/PRD.md` - Requirements
- `docs/epics.md` - Story breakdown
- `docs/architecture-decisions.md` - ADR log
- `docs/SESSION-SUMMARY-2025-11-06.md` - Latest context

**Archived (Historical Context Only):**

- `docs/archive/pre-epic-1-restart/` - Old documents (DO NOT USE for implementation)

---

**END OF PLAN**

**Status:** READY TO EXECUTE (UPDATED - includes story archival + tracking reset)  
**Estimated Time:** 22 minutes (7 phases)  
**Next:** Execute phases 1-7, commit, verify clean state, then Architect review

---

## 📋 PHASE SUMMARY

1. **Phase 1:** Archive 11 files (6 docs + 5 stories) - 7 min
2. **Phase 2:** Rename to CANONICAL-WORKFLOW-SCHEMA.md - 3 min
3. **Phase 3:** SKIPPED (stories archived)
4. **Phase 4:** Create docs/README.md - 5 min
5. **Phase 5:** Reset workflow-status.yaml - 3 min
6. **Phase 6:** Reset sprint-status.yaml - 2 min
7. **Phase 7:** Git commit with detailed message - 2 min

**TOTAL: ~22 minutes**
