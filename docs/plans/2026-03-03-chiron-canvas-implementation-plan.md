# Chiron Collaboration Canvas Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable Excalidraw-first collaboration canvas (portable to FigJam/Figma) that communicates Chiron's gist, feature model, and key journeys to UX collaborators.

**Architecture:** Use a narrative-first board structure with fixed frames (A-H), a locked terminology/state legend, and editable journey/open-question zones. Start in Excalidraw for concept velocity, then mirror stable sections to FigJam/Figma if broader stakeholder collaboration is needed.

**Tech Stack:** Excalidraw (or FigJam/Figma), Chiron planning artifacts, terminology glossary, UX design specification.

---

### Task 1: Create the Base Canvas Skeleton

**Files:**
- Create: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`
- Modify: `docs/plans/2026-03-03-chiron-canvas-design.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Define checklist assertions in `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`:

```md
- [ ] Frame A-H created in order
- [ ] Read-me sticky exists
- [ ] Legend frame exists and is locked
```

**Step 2: Run test to verify it fails**

Run: open checklist and verify all boxes are unchecked.
Expected: FAIL because no canvas skeleton is confirmed yet.

**Step 3: Write minimal implementation**

Create the canvas with these frame titles:
- A Product Gist
- B Two Contexts
- C Entity Map
- D State + Diagnostics Legend
- E Journey: Publish Methodology
- F Journey: Transition Control
- G Journey: Step Execution + Recovery
- H Feature Maturity + Open Questions + Decisions

**Step 4: Run test to verify it passes**

Run: review checklist and mark first three checks complete only after frames/read-me/legend are present.
Expected: PASS for skeleton checks.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-design.md docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: add chiron collaboration canvas session checklist"
```

### Task 2: Populate Core Narrative and Context Frames

**Files:**
- Modify: `docs/plans/2026-03-03-chiron-canvas-design.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Add checklist assertions:

```md
- [ ] Product one-liner card added
- [ ] Value proposition cards (3) added
- [ ] Two-context cards + connector note added
```

**Step 2: Run test to verify it fails**

Run: inspect canvas and confirm these cards are missing.
Expected: FAIL.

**Step 3: Write minimal implementation**

Add card content from the design doc "Starter Card Copy" section.

**Step 4: Run test to verify it passes**

Run: verify each checklist assertion maps to a visible card.
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-design.md docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: populate chiron canvas product narrative and context"
```

### Task 3: Build Entity and Legend Precision Layer

**Files:**
- Modify: `docs/plans/2026-03-03-chiron-canvas-design.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Add checklist assertions:

```md
- [ ] Entity chain card set added
- [ ] Terminology collision callouts added
- [ ] State and diagnostics legend added with exact fields
```

**Step 2: Run test to verify it fails**

Run: inspect canvas.
Expected: FAIL if any callout/field is missing.

**Step 3: Write minimal implementation**

Add callouts for:
- Workflow Definition vs Workflow Execution
- Fact Definition vs Fact Value
- Transition Attempt vs Step Attempt
- Branch Resolution vs Lifecycle Transition Resolution
- `blocked` vs `failed`

Add diagnostics legend fields:
`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, evidence refs.

**Step 4: Run test to verify it passes**

Run: cross-check against glossary/spec source terms.
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-design.md docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: add chiron canvas glossary and diagnostics precision layer"
```

### Task 4: Add the Three Journey Lanes

**Files:**
- Modify: `docs/plans/2026-03-03-chiron-canvas-design.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Add checklist assertions:

```md
- [ ] Journey 1 publish lane added with block/remediate path
- [ ] Journey 2 transition control lane added with gate checks
- [ ] Journey 3 step execution/recovery lane added with retry/resume behavior
```

**Step 2: Run test to verify it fails**

Run: inspect canvas lanes.
Expected: FAIL for missing lane details.

**Step 3: Write minimal implementation**

Add each journey as left-to-right lane:
- Trigger
- Validation/gate
- Decision branch
- Outcome + next action chips
- Evidence marker

**Step 4: Run test to verify it passes**

Run: ensure each lane contains at least one blocked/failure branch and one success continuation.
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-design.md docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: add chiron canvas journey lanes for publish transition and recovery"
```

### Task 5: Add Collaboration Governance Blocks

**Files:**
- Modify: `docs/plans/2026-03-03-chiron-canvas-design.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Add checklist assertions:

```md
- [ ] Open questions section includes owner and due date fields
- [ ] Decision log includes date, decision, alternatives, rationale
- [ ] Contribution tags legend added (`idea`, `question`, `risk`, `approved`)
```

**Step 2: Run test to verify it fails**

Run: inspect collaboration sections.
Expected: FAIL until governance blocks are visible.

**Step 3: Write minimal implementation**

Add the three governance blocks and keep them in a dedicated right-hand frame.

**Step 4: Run test to verify it passes**

Run: confirm all governance fields are present.
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-design.md docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: add chiron canvas collaboration governance blocks"
```

### Task 6: Run a Dry Review and Portability Check

**Files:**
- Modify: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`
- Test: `docs/plans/2026-03-03-chiron-canvas-session-checklist.md`

**Step 1: Write the failing test**

Add checklist assertions:

```md
- [ ] 2-minute explainability test passed
- [ ] Terminology ambiguity count is zero in review notes
- [ ] Excalidraw-to-FigJam portability notes captured
```

**Step 2: Run test to verify it fails**

Run: perform a quick verbal walkthrough and capture misses.
Expected: FAIL on first pass.

**Step 3: Write minimal implementation**

Tighten copy and labels where confusion appears. Add portability notes for frame structure and legend migration.

**Step 4: Run test to verify it passes**

Run: repeat walkthrough using only the canvas.
Expected: PASS when collaborator can explain gist, contexts, and journeys without extra narration.

**Step 5: Commit**

```bash
git add docs/plans/2026-03-03-chiron-canvas-session-checklist.md
git commit -m "docs: validate chiron canvas explainability and portability"
```
