# Epic 3 Canonical Documentation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Promote the March 11 Epic 3 design-time baseline into stable architecture docs, turn the dated plan into historical rationale, and create a controlled cleanup path for stale documentation.

**Architecture:** Keep `docs/architecture/epic-3-authority.md` as the routing index, then move current page/step behavior into stable surface-specific docs under `docs/architecture/`. Reconcile drifting workflow-engine contracts, add missing methodology/system page specs, then update live references so stories and cleanup flows stop relying on the March 11 plan as the normal implementation target.

**Tech Stack:** Markdown docs in `docs/` and `_bmad-output/`, repo search/verification with `grep`/`glob`/`read`, git diff review.

---

### Task 1: Lock the authority index and canonical map

**Files:**
- Modify: `docs/architecture/epic-3-authority.md`
- Modify: `docs/README.md`
- Modify: `docs/architecture/module-inventory.md`
- Reference: `docs/plans/2026-03-16-epic-3-canonical-documentation-design.md`

**Step 1: Update the authority index**

Add or revise sections in `docs/architecture/epic-3-authority.md` so it explicitly lists:
- current canonical docs,
- still-missing durable docs,
- stale docs,
- promotion status for each Epic 3 surface,
- the rule that the March 11 plan is historical rationale once a stable replacement exists.

**Step 2: Fix the canonical index entry points**

Update `docs/README.md` so it points to the current Epic 3 authority docs and no longer implies stale sources like `epics/README.md` or a missing repo-root `AGENTS.md` are current authority.

**Step 3: Correct misleading readiness claims**

Edit `docs/architecture/module-inventory.md` so scaffold-only packages are not described as implemented. Preserve useful inventory structure, but make readiness labels match current repo reality.

**Step 4: Verify authority routing**

Run: `rg -n "epics/README.md|AGENTS.md|Implemented \(core\)" docs/README.md docs/architecture/module-inventory.md docs/architecture/epic-3-authority.md`

Expected:
- no stale `epics/README.md` reference in `docs/README.md`
- no misleading missing-root `AGENTS.md` claim unless intentionally qualified
- no inaccurate `Implemented (core)` claim for scaffold-only Epic 3 packages

### Task 2: Reconcile the remaining drifting step contracts

**Files:**
- Modify: `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- Modify: `docs/architecture/methodology-pages/workflow-editor/display-step.md`
- Reference: `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`

**Step 1: Rewrite `branch-step-contract.md` to `branch.v1` authority**

Promote the March 11 branch baseline into the durable contract doc, including:
- root mode `ALL | ANY`,
- nested condition-builder semantics,
- target namespace model,
- type-aware operator matrix,
- default-route behavior,
- explicit deprecated legacy shape notes.

**Step 2: Rewrite `display-step-contract.md` to `display.v1` authority**

Promote the March 11 display baseline into the durable contract doc, including:
- `presentationMode`,
- `contentSchemaVersion`,
- structured navigation,
- variable interpolation/read-only rules,
- explicit deprecated legacy shape notes.

**Step 3: Verify drift closure**

Run: `rg -n "branch.v1|ALL \| ANY|presentationMode|contentSchemaVersion|Deprecated legacy" docs/architecture/methodology-pages/workflow-editor/branch-step.md docs/architecture/methodology-pages/workflow-editor/display-step.md`

Expected:
- both docs expose the modern versioned contracts
- legacy shapes only remain inside explicit deprecated sections

### Task 3: Extract shared cross-cutting authoring patterns

**Files:**
- Create: `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- Create: `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md`
- Create: `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`
- Create: `docs/architecture/ux-patterns/rich-selectors.md`
- Reference: `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`

**Step 1: Extract the shared variable target model**

Create `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` covering `sourcePath`, `fieldKey`, `cardinality`, supported namespaces, and persistence semantics reused across form/branch/agent/action flows.

**Step 2: Extract reusable step dialog rules**

Create `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` documenting tab conventions, validation timing, progressive unlock, diagnostics behavior, and save/cancel expectations.

**Step 3: Extract repeated UX patterns once**

Create durable docs for diagnostics treatment and selector behavior so methodology-page specs can reference them instead of copying March 11 prose over and over.

**Step 4: Verify cross-link targets exist**

Run: `ls docs/architecture/workflow-engine docs/architecture/ux-patterns`

Expected: all four new files exist in stable homes.

### Task 4: Promote methodology page canonicals

**Files:**
- Create: `docs/architecture/methodology-pages/work-units/overview.md`
- Create: `docs/architecture/methodology-pages/methodology-facts.md`
- Create: `docs/architecture/methodology-pages/agents.md`
- Create: `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- Create: `docs/architecture/methodology-pages/artifact-slots-design-time.md`
- Create: `docs/architecture/methodology-pages/state-machine-tab.md`
- Create: `docs/architecture/methodology-pages/dependency-definitions.md`
- Create: `docs/architecture/methodology-pages/workflow-editor/shell.md`
- Reference: `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
- Reference: `_bmad-output/planning-artifacts/epics.md`

**Step 1: Promote shell and page-level canonicals**

Create stable docs for the Workflow Editor shell, Work Units L1, Methodology Facts, and Agents page using the March 11 wireframes, behaviors, and config details as source material.

**Step 2: Promote the L2 tab surfaces**

Create stable docs for Artifact Slots, State Machine, and related work-unit tab behavior, preserving validation and readiness semantics.

**Step 3: Promote dependency-definition authority**

Create a dedicated durable spec for dependency type definitions so that page does not remain trapped inside the March 11 plan.

**Step 4: Verify coverage against the baseline**

Run: `rg -n "Work Units Page|Methodology Facts|Artifact Slots tab|State Machine tab|Dependency Type Definitions|Workflow Editor" docs/architecture/methodology-pages docs/architecture/methodology-pages/workflow-editor/shell.md`

Expected: every major March 11 page surface has a stable doc home.

### Task 5: Add the missing System Harnesses page spec

**Files:**
- Create: `docs/architecture/system-pages/harnesses/index.md`
- Reference: `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md`
- Reference: `_bmad-output/planning-artifacts/epics.md`
- Reference: `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- Reference: `docs/architecture/modules/provider-registry.md`

**Step 1: Write the system-page spec**

Document the Harnesses page as a system-owned surface, including page purpose, information architecture, harness visibility/configuration rules, policy/error states, and how agent-step harness selection resolves through system-governed configuration.

**Step 2: Cross-link it into authority routing**

Update `docs/architecture/epic-3-authority.md` to make this the canonical home for Story 3.6 page behavior.

**Step 3: Verify ownership clarity**

Run: `rg -n "Harnesses|system-owned|opencode|provider-registry" docs/architecture/system-pages/harnesses/index.md docs/architecture/epic-3-authority.md`

Expected: the new spec clearly states that Harnesses is a system page and agent-step harness resolution depends on it.

### Task 6: Stabilize AX authority without overstating implementation readiness

**Files:**
- Modify: `docs/architecture/modules/ax-engine.md`
- Modify: `docs/architecture/epic-3-authority.md`
- Reference: `docs/plans/2026-03-08-ax-integration-design.md`
- Reference: `docs/plans/2026-03-08-ax-signature-registry-implementation-plan.md`

**Step 1: Tighten AX readiness language**

Clarify in `docs/architecture/modules/ax-engine.md` what is canonical policy vs what is still scaffold-only implementation work. Preserve the approved manual-first, staged-promotion model.

**Step 2: Add explicit external-drift caution**

Note that live `@ax-llm/ax` API assumptions should be refreshed before coding so implementation does not depend on stale library examples.

**Step 3: Verify no false implementation claims remain**

Run: `rg -n "scaffold|planned|manual-first|mipro|gepa|ace|implemented" docs/architecture/modules/ax-engine.md docs/architecture/epic-3-authority.md`

Expected: AX docs clearly separate current architecture authority from not-yet-built runtime code.

### Task 7: Update live references and demote the March 11 plan correctly

**Files:**
- Modify: `_bmad-output/planning-artifacts/epics.md`
- Modify: `_bmad-output/planning-artifacts/epic-3-design-time-first-reassessment-2026-03-13.md`
- Modify: `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`
- Reference: `docs/architecture/epic-3-authority.md`
- Reference: all newly created stable docs from Tasks 3-5

**Step 1: Update live planning references**

Change story/planning references so they point to the stable architecture docs and the authority index rather than using the March 11 plan as the normal implementation destination.

**Step 2: Add supersession language to the March 11 plan**

Preserve the plan, but add a concise note that it is historical design rationale and that active implementation should follow the stable architecture docs listed in `docs/architecture/epic-3-authority.md`.

**Step 3: Verify the March 11 plan is no longer the operational default**

Run: `rg -n "2026-03-11-methodology-design-time-pages-tentative-design.md" docs _bmad-output`

Expected:
- remaining references are either authority-index citations, historical rationale, or intentional supersession notes
- live implementation references prefer the stable docs

### Task 8: Controlled stale-doc cleanup pass

**Files:**
- Modify: `docs/architecture/epic-3-authority.md`
- Modify: `docs/README.md`
- Candidate references: `docs/architecture/project-context-only-bmad-mapping-draft.md`, `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md`, `docs/architecture/workflow-engine/agent-continuation-contract.md`, relevant `_bmad-output/` docs still pointing at superseded concepts

**Step 1: Classify each remaining drift source**

For each known stale doc, mark it as one of:
- supersede in place,
- archive with forward link,
- retain as historical context,
- or keep as contextual but non-canonical.

**Step 2: Remove or relabel the worst remaining conflicts**

Prioritize docs still exposing pre-lock invoke IO mapping or other behavior that directly conflicts with the new canonicals.

**Step 3: Final verification sweep**

Run: `git diff -- docs _bmad-output && rg -n "inputMapping|output\.mode|output\.target|draft-for-review|Status: Proposed" docs/architecture docs/plans _bmad-output`

Expected:
- diff shows the new canonical structure and targeted cleanup
- direct conflicts are either removed, archived, or explicitly labeled as non-canonical
- proposed/draft docs are no longer mistaken for active Epic 3 authority

### Task 9: Final review and handoff

**Files:**
- Review: `docs/architecture/epic-3-authority.md`
- Review: `docs/README.md`
- Review: all new `docs/architecture/methodology-pages/*.md`
- Review: `docs/architecture/system-pages/harnesses/index.md`
- Review: updated workflow-engine contract docs

**Step 1: Read the finished authority set end-to-end**

Verify that a new engineer can answer the following without opening the March 11 plan first:
- which doc is canonical for each Epic 3 surface,
- what each page/step/system surface does,
- where implementation should read current behavior,
- which docs are historical only.

**Step 2: Run the final routing checks**

Run: `rg -n "Canonical|Historical|Deferred|Stale|Superseded by" docs/architecture docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`

Expected: authority status is explicit and easy to follow.

**Step 3: Do not commit automatically**

Stop after verification and present the resulting doc topology plus any remaining cleanup candidates to the user. Commit only if explicitly requested.
