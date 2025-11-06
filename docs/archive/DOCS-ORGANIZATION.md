# Documentation Organization Guide

**Purpose:** Keep docs/ clean and organized as project grows

---

## Current Documentation (21 files: 19 markdown + 2 HTML)

### ✅ **Living Documents** (Active - Keep in Root)
These are continuously updated and referenced during development:

1. **bmm-workflow-status.md** - Master status file (updated every session)
2. **PRD.md** - Product Requirements Document (reference)
3. **epics.md** - Epic breakdown (reference + updated as epics complete)
4. **next-session-guide.md** - Quick start guide (updated when phase changes)

**Action:** Keep these in `docs/`

---

### 📚 **Core Reference Docs** (Keep in Root - Stable)
Foundation documents that guide implementation but rarely change:

5. **architecture-decisions.md** - Key architectural choices
6. **architecture-summary.md** - High-level architecture overview
7. **tool-stack-decision.md** - AI SDK + Mastra + ax decision
8. **workflow-engine-structure.md** - Workflow engine design
9. **ux-design-specification.md** - UX/UI patterns and principles

**Action:** Keep these in `docs/`

---

### 🎨 **Design Mockups (HTML)** - Keep Active, Archive When Superseded
Interactive HTML visualizations for UX ideation and layout exploration:

20. **ux-color-themes.html** - Color system visualizer (CARBON, CAMO palettes + agent colors)
21. **ux-design-directions.html** - Layout exploration mockup

**Purpose:**
- Quick visual feedback during design ideation
- Show stakeholders/thesis committee actual UX direction
- Test color palettes, spacing, typography in browser
- Prototype interaction patterns before implementation

**Action:** Keep in `docs/design/mockups/` - These are valuable for ongoing UX work!

**When to Archive:**
- When feature is implemented in actual app → move to `docs/archive/design/mockups/`
- When design direction changes → keep new version, archive old

---

### 🗃️ **Checkpoint/Session Docs** (Archive)
One-time snapshots created during specific phases:

10. **brainstorming-session-results-2025-01-24.md** - Brainstorming output
11. **implementation-readiness-report-2025-11-03.md** - Solutioning gate check
12. **next-session-context.md** - OLD session handoff (superseded by next-session-guide.md)
13. **product-brief-chiron-2025-10-26.md** - Phase 1 product brief (referenced in PRD)

**Action:** Move to `docs/archive/phase-X/`

---

### 🔬 **Research & Exploration** (Archive)
Documents created during research/exploration that fed into final decisions:

14. **framework-evaluation-effect-vs-mastra.md** - Tool research
15. **tool-research-requirements.md** - Tool research requirements
16. **workflow-engine-design-brief.md** - Early workflow engine exploration
17. **architecture-foundations.md** - Phase 1 architecture discovery

**Action:** Move to `docs/archive/research/`

---

### 🎨 **Design Exploration Docs** (Keep or Archive Based on Value)
UI/UX exploration documents:

18. **chiron-ui-wireframes-v1.md** - Early wireframes
19. **ux-pattern-structured-exploration-lists.md** - Pattern exploration

**Action:**
- If still referenced → Keep in `docs/design/`
- If superseded by ux-design-specification.md → Move to `docs/archive/design/`

---

## Recommended Structure

```
docs/
├── bmm-workflow-status.md        ← Master status (always here)
├── next-session-guide.md         ← Quick start (always here)
├── PRD.md                         ← Product requirements
├── epics.md                       ← Epic breakdown
│
├── architecture/                  ← Architecture docs
│   ├── architecture-decisions.md
│   ├── architecture-summary.md
│   ├── tool-stack-decision.md
│   └── workflow-engine-structure.md
│
├── design/                        ← UX/UI docs
│   ├── ux-design-specification.md
│   ├── chiron-ui-wireframes-v1.md (if active)
│   ├── ux-pattern-*.md (if active)
│   └── mockups/                   ← HTML mockups (NEW!)
│       ├── ux-color-themes.html
│       ├── ux-design-directions.html
│       └── [future mockups...]
│
├── stories/                       ← Story files (created JIT)
│   ├── story-1.1-database-schema.md
│   └── ...
│
└── archive/                       ← Historical/checkpoint docs
    ├── phase-1-analysis/
    │   └── product-brief-chiron-2025-10-26.md
    ├── phase-2-planning/
    │   └── brainstorming-session-results-2025-01-24.md
    ├── phase-3-solutioning/
    │   ├── implementation-readiness-report-2025-11-03.md
    │   └── next-session-context.md (OLD, superseded)
    ├── research/
    │   ├── framework-evaluation-effect-vs-mastra.md
    │   ├── tool-research-requirements.md
    │   ├── workflow-engine-design-brief.md
    │   └── architecture-foundations.md
    └── design/
        └── mockups/               ← Archived HTML mockups
            └── [superseded versions...]
```

---

## HTML Mockup Workflow

### When to Create HTML Mockups

**Good Use Cases:**
- ✅ Color palette exploration (like ux-color-themes.html)
- ✅ Layout direction testing (like ux-design-directions.html)
- ✅ Component spacing/sizing visualization
- ✅ Typography hierarchy testing
- ✅ Interaction pattern prototyping
- ✅ Dashboard layout variations
- ✅ Chat interface patterns

**Example Scenarios:**
```
Ideation Session → Create HTML mockup → Review in browser →
Document decision in .md → Keep HTML in mockups/ →
Implement in React → Archive HTML when feature is live
```

### Naming Convention

```
ux-[feature]-[variation].html

Examples:
- ux-color-themes.html (current)
- ux-design-directions.html (current)
- ux-dashboard-layout-v1.html (future)
- ux-chat-patterns-sequential.html (future)
- ux-artifact-workbench-split.html (future)
- ux-agent-radar-visualization.html (future)
```

### HTML Mockup Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chiron UX - [Feature Name]</title>
    <style>
        /* Inline styles for portability */
        /* Use CARBON/CAMO colors from ux-design-specification.md */
    </style>
</head>
<body>
    <!--
    Purpose: [What this mockup explores]
    Created: [Date]
    Status: [Active | Implemented | Archived]
    Related: [Link to design spec or story]
    -->

    <!-- Mockup content here -->
</body>
</html>
```

---

## Migration Commands

```bash
cd /home/gondilf/Desktop/projects/masters/chiron/docs

# Create directories
mkdir -p architecture design/mockups stories archive/{phase-1-analysis,phase-2-planning,phase-3-solutioning,research,design/mockups}

# Move architecture docs
mv architecture-decisions.md architecture-summary.md tool-stack-decision.md workflow-engine-structure.md architecture/

# Move design docs
mv ux-design-specification.md design/
mv ux-color-themes.html ux-design-directions.html design/mockups/

# Optional: Move other design docs
# mv chiron-ui-wireframes-v1.md ux-pattern-*.md design/

# Archive Phase 1
mv product-brief-chiron-2025-10-26.md archive/phase-1-analysis/

# Archive Phase 2
mv brainstorming-session-results-2025-01-24.md archive/phase-2-planning/

# Archive Phase 3
mv implementation-readiness-report-2025-11-03.md next-session-context.md archive/phase-3-solutioning/

# Archive research
mv framework-evaluation-effect-vs-mastra.md tool-research-requirements.md workflow-engine-design-brief.md architecture-foundations.md archive/research/
```

---

## Rules Going Forward

### **Keep in Root:**
- bmm-workflow-status.md (master status)
- next-session-guide.md (quick start)
- PRD.md (requirements reference)
- epics.md (epic tracking)

### **Create in Subdirs:**
- `architecture/` - Architecture decisions
- `design/` - UX/UI specs and patterns
- `design/mockups/` - HTML visualizations (keep active, archive when superseded)
- `stories/` - Story files (JIT creation)

### **HTML Mockups:**
- Create for ideation/exploration (color, layout, interaction)
- Keep in `design/mockups/` while active
- Add HTML comment with purpose, date, status
- Archive to `archive/design/mockups/` when feature is implemented
- Version if exploring multiple directions (v1, v2, etc.)

### **Archive When:**
- Document is a one-time checkpoint (gate checks, session handoffs)
- Document is superseded by newer version
- Document is exploratory research that fed into final decision
- HTML mockup is implemented in actual app

### **When in Doubt:**
- If actively referenced during dev → keep in organized subdir
- If historical reference only → archive with phase label
- If research/exploration → archive in research/
- If HTML mockup → design/mockups/ (archive when implemented)

---

## Benefits

1. **Root stays clean** - Only 4 essential files
2. **Easy navigation** - Architecture, design, stories, mockups grouped
3. **Historical context preserved** - Archive keeps phase progression
4. **JIT story creation** - stories/ folder grows as needed
5. **Clear naming** - Phase labels make archives searchable
6. **Visual ideation encouraged** - Mockups folder makes HTML exploration easy
7. **Thesis documentation** - HTML mockups show UX evolution for committee

---

## HTML Mockup Benefits for Thesis

**Why HTML mockups are valuable:**
- Show visual evolution of UX design (not just wireframes)
- Demonstrate iterative design process
- Interactive examples for thesis presentation/defense
- Before/after comparison when feature is implemented
- Proof of "design-by-building" approach
- Can embed in thesis appendix or host on portfolio site

**Thesis Chapter Ideas:**
- "Appendix A: UX Mockup Gallery" (archived HTML files)
- "Chapter 4: Visual Design Process" (reference mockups/)
- "Figure 4.2: Color System Evolution" (ux-color-themes.html screenshot)

---

## Next Steps

**Option A: Full Migration Now (Recommended)**
```bash
# Run migration commands above
# Takes 2 minutes, organized immediately
```

**Option B: Minimal Cleanup (Quick)**
```bash
# Just create mockups folder and archive obvious checkpoints
mkdir -p docs/design/mockups docs/archive/phase-3-solutioning
mv docs/ux-*.html docs/design/mockups/
mv docs/next-session-context.md docs/implementation-readiness-report-2025-11-03.md docs/archive/phase-3-solutioning/
```

**Option C: Defer to Story 1.6**
```bash
# Epic 1 Story 1.6 is "Status Tracking"
# Could expand to include documentation cleanup
# Continue with Story 1.1 now, organize later
```

---

_Created: 2025-11-05_
_Status: Recommendation - Awaiting Decision_
