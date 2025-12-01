# Documentation TODO Before Epic 2

**Date**: December 1, 2025  
**Context**: Finalize architecture docs before starting Brainstorm Workflow  
**Priority**: CRITICAL - Epic 2 depends on accurate architecture docs

---

## ✅ What's Already Documented

- [x] Dynamic tool options (optionsSource)
- [x] Story 1.6 architecture (Mastra + Ax)
- [x] Database schema
- [x] Agent registration pattern
- [x] Rejection system (in REJECTION-SYSTEM-FINAL.md root file)

---

## 🔴 CRITICAL Updates (Must Do Before Epic 2)

### 1. Fix CANONICAL-WORKFLOW-SCHEMA.md

**File**: `/docs/architecture/CANONICAL-WORKFLOW-SCHEMA.md`

**Changes Needed**:
- [ ] Update execute-action step structure (around line 870)
  - Change from single `action` to `actions[]` array
  - Add `requiresUserConfirmation: boolean`
  - Add `executionMode: "sequential" | "parallel"`
  - Update action structure to `{ type, config }` nesting
- [ ] Add variable resolution note (all fields support `{{var}}` syntax)
- [ ] Update file action operations (mkdir, write are implemented; read/delete/exists are not)
- [ ] Update git action operations (init, commit are implemented; status/branch are not)
- [ ] Mark scan-codebase as "future"

**Why Critical**: Epic 2 will use execute-action for saving artifacts

---

### 2. Create Tool Types Reference

**File**: `/docs/architecture/tool-types-reference.md` (NEW)

**Content**:
```markdown
# Tool Types Reference

## 1. ax-generation
- LLM-powered generation/classification
- Input schema: z.object({}) - NO agent inputs (all from context)
- Uses Ax signatures
- Example: complexity classification, workflow path selection

## 2. update-variable  
- Agent-powered direct updates
- Input schema: z.object({ value, reasoning })
- Agent extracts from conversation and passes value
- Example: project description, project name

## 3. Future Types
- database-query
- custom (deprecated)
```

**Why Critical**: Epic 2 needs to know when to use which tool type

---

### 3. Update dynamic-tool-options.md

**File**: `/docs/architecture/dynamic-tool-options.md`

**Add Sections**:
- [ ] **Section: Token Optimization with `selectFields`**
  - What: Filter JSON data before LLM
  - Why: Reduce tokens 50-80%
  - Example with workflow_paths
  
- [ ] **Section: Field-Level Class Sources with `classesFrom`**
  - What: Configure class source per output field
  - Why: More flexible than tool-level classSource
  - Example with multiple class outputs
  
- [ ] **Section: Derived Variables with `extractFrom`** (THE BIG ONE)
  - What: Extract related fields without LLM
  - Why: Deterministic, no hallucination, human-readable
  - Flow diagram: selection → lookup → extract → store → resolve
  - Storage structure: derived_values vs value
  - Example: workflow path ID → name extraction

**Why Critical**: Epic 2 will use extractFrom for technique metadata

---

## 🟡 SHOULD HAVE (Nice to Have, Not Blocking)

### 4. Create Step Types Reference

**File**: `/docs/architecture/step-types-reference.md` (NEW)

**Content**: Document all 4 step types with examples
- ask-user-chat
- display-input
- execute-action
- display-output

---

### 5. Document Rejection System

**File**: `/docs/architecture/approval-rejection-system.md` (NEW)

**Content**: Move REJECTION-SYSTEM-FINAL.md into docs/architecture and expand
- Timeline pattern
- State management
- Forced regeneration
- UI patterns

---

### 6. Create Variable Resolution Guide

**File**: `/docs/architecture/variable-resolution.md` (NEW)

**Content**:
- Template syntax: `{{variable}}`
- Resolution order: execution vars → approval states → derived values
- Where it's used: file paths, content, git messages, display templates
- Nested resolution: `{{project_path}}/{{project_name}}`

---

## 📋 Update Checklist

**Before starting any Epic 2 work:**

```bash
# 1. Update CANONICAL-WORKFLOW-SCHEMA.md
# Focus on execute-action section (lines 860-940)

# 2. Create tool-types-reference.md
# Copy template from ARCHITECTURE-UPDATES-DEC-2025.md

# 3. Update dynamic-tool-options.md
# Add 3 sections: selectFields, classesFrom, extractFrom

# Optional (can do during Epic 2):
# 4. Create step-types-reference.md
# 5. Create approval-rejection-system.md
# 6. Create variable-resolution.md
```

---

## 🎯 Success Criteria

**We're ready for Epic 2 when:**

- [ ] All execute-action examples in CANONICAL-WORKFLOW-SCHEMA match implementation
- [ ] Team knows which tool type to use when (via tool-types-reference.md)
- [ ] extractFrom pattern is fully documented with examples
- [ ] Epic 2 stories can reference specific architecture doc sections

---

## ⏱️ Time Estimate

- **Critical updates**: ~2 hours
- **Should have docs**: ~3 hours
- **Total**: ~5 hours

**Recommendation**: Do critical updates NOW, defer should-have to during Epic 2 as needed.
