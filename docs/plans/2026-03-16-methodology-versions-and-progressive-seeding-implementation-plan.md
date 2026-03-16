# Methodology Versions And Progressive Seeding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the missing Methodology Versions page, replace the broad legacy seed worldview with a documented `WU.SETUP`-only active seed slice, and finish the wording cleanup that keeps `workflow-engine/` runtime/technical only.

**Architecture:** Treat `Versions` as the umbrella methodology page that routes into version-scoped design-time authoring. Demote the broad legacy seed JSONs to archived lineage, align active seed code/docs to `WU.SETUP`, and document progressive append-only seed growth so future slices are added intentionally after implementation rather than seeded all at once.

**Tech Stack:** Markdown docs in `docs/` and `/_bmad-output/`, TypeScript seed/fixture code in `packages/scripts/src/`, repo verification with `grep`, `read`, and `git diff`.

---

### Task 1: Add the Methodology Versions page

**Files:**
- Create: `docs/architecture/methodology-pages/versions.md`
- Modify: `docs/architecture/epic-3-authority.md`
- Modify: `docs/README.md`
- Reference: `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md`
- Reference: `docs/plans/2026-03-10-methodology-version-scoped-sidebar-implementation-plan.md`

**Step 1: Write the durable Versions page spec**

Create `docs/architecture/methodology-pages/versions.md` covering:
- the versions ledger/list page at `/methodologies/:methodologyId/versions`
- the version row model and lifecycle states
- how selecting a version routes into version-scoped methodology authoring
- how this page relates to Work Units, Facts, Workflow Editor, and other version-owned surfaces

**Step 2: Add Versions to authority routing**

Update `docs/architecture/epic-3-authority.md` so `Versions` is listed as a promoted methodology surface with an explicit canonical path.

**Step 3: Expose Versions in the canonical index**

Update `docs/README.md` so methodology page grouping clearly includes `Versions` as the umbrella methodology surface.

**Step 4: Verify Versions routing**

Run: `rg -n "Versions|methodology-pages/versions.md|version-scoped" docs/architecture/epic-3-authority.md docs/README.md docs/architecture/methodology-pages/versions.md`

Expected:
- `versions.md` exists
- `epic-3-authority.md` routes to it explicitly
- `docs/README.md` reflects it in the active methodology page model

### Task 2: Add the progressive seeding process doc

**Files:**
- Create: `docs/architecture/methodology-progressive-seeding.md`
- Modify: `docs/architecture/methodology-bmad-setup-mapping.md`
- Modify: `docs/architecture/methodology-canonical-authority.md`
- Reference: `docs/architecture/methodology-bmad-setup-mapping.md`
- Reference: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`

**Step 1: Write the process doc**

Create `docs/architecture/methodology-progressive-seeding.md` documenting the rule that active seeds grow slice-by-slice:
- choose one implemented slice
- digest the BMAD workflow(s)
- map into Chiron structures
- append only that slice
- validate it
- add the next slice later

**Step 2: Link setup mapping to the process**

Update `docs/architecture/methodology-bmad-setup-mapping.md` so it no longer treats the legacy JSONs as active source truth and instead points to the progressive seeding process plus the active seed code path.

**Step 3: Extend canonical authority wording**

Update `docs/architecture/methodology-canonical-authority.md` so seed authoring policy explicitly says canonical seeds are progressive, table-first, and slice-scoped.

**Step 4: Verify process alignment**

Run: `rg -n "progressive|slice|WU.SETUP|append|table-first" docs/architecture/methodology-progressive-seeding.md docs/architecture/methodology-bmad-setup-mapping.md docs/architecture/methodology-canonical-authority.md`

Expected:
- the process doc exists
- `WU.SETUP` is named as the current active slice
- the seed policy clearly says growth is progressive, not all-at-once

### Task 3: Archive the broad legacy seed JSONs

**Files:**
- Move: `/_bmad-output/planning-artifacts/chiron-seed-workflow-definitions-v1.json`
- Move: `/_bmad-output/planning-artifacts/chiron-seed-transition-allowed-workflows-v1.json`
- Modify: `docs/architecture/methodology-bmad-setup-mapping.md`
- Modify: `/_bmad-output/planning-artifacts/chiron-active-doc-index-v1-week6.md`
- Modify: `/_bmad-output/planning-artifacts/chiron-foundational-docs-lock-v1-week6.md`

**Step 1: Move the seed JSONs into archive**

Move both JSON files into `/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/`.

**Step 2: Rewrite active references**

Update active docs so they no longer read those JSONs as current source inputs. Keep archive-path references only where lineage is intentionally preserved.

**Step 3: Update active planning indexes**

Fix `chiron-active-doc-index-v1-week6.md` and `chiron-foundational-docs-lock-v1-week6.md` so the JSONs are no longer presented as active root artifacts.

**Step 4: Verify archive cutover**

Run: `rg -n "chiron-seed-workflow-definitions-v1.json|chiron-seed-transition-allowed-workflows-v1.json" docs _bmad-output packages/scripts`

Expected:
- active references point to archive paths or contextual lineage only
- no active doc treats the JSON files as the current working seed source

### Task 4: Replace active seed truth with the narrow WU.SETUP slice

**Files:**
- Modify: `packages/scripts/src/story-seed-fixtures.ts`
- Modify: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Modify: `packages/scripts/src/seed/methodology/index.ts`
- Modify: `packages/scripts/src/tests/seeding/story-seed-fixtures.test.ts`
- Modify: `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
- Reference: `docs/architecture/methodology-bmad-setup-mapping.md`

**Step 1: Rewrite fixture identity to setup truth**

Change `packages/scripts/src/story-seed-fixtures.ts` so the active methodology/seed plan is no longer labeled `project-context-only`. The active fixture should describe the `WU.SETUP` slice truthfully.

**Step 2: Rewrite the setup mapping file to actual setup semantics**

Update `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` so:
- work unit key is `WU.SETUP`
- metadata and seed ids reflect setup
- active workflow scope matches the currently defined setup slice only
- legacy `WU.PROJECT_CONTEXT` language is removed from active truth

**Step 3: Fix the seed slice registry**

Update `packages/scripts/src/seed/methodology/index.ts` so `methodologySeedSlices` and exported metadata reflect the setup slice rather than `project_context`.

**Step 4: Update seed tests**

Adjust the seeding tests so they assert the new active setup slice language/identifiers and continue validating the canonical table seed rows.

**Step 5: Verify active seed truth**

Run: `rg -n "WU\.PROJECT_CONTEXT|project_context_only|mver_bmad_project_context_only_draft|project_context" packages/scripts/src/story-seed-fixtures.ts packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts packages/scripts/src/seed/methodology/index.ts packages/scripts/src/tests/seeding`

Expected:
- no active seed/fixture files still present the setup slice as `WU.PROJECT_CONTEXT`
- historical references remain only where explicitly intended

### Task 5: Finish runtime-only wording cleanup for workflow-engine

**Files:**
- Modify: `docs/README.md`
- Modify: `docs/architecture/module-inventory.md`
- Modify: `/_bmad-output/planning-artifacts/epics.md`
- Candidate historical docs to relabel if needed: `/_bmad-output/planning-artifacts/chiron-active-doc-index-v1-week6.md`, `/_bmad-output/planning-artifacts/chiron-foundational-docs-lock-v1-week6.md`

**Step 1: Tighten active wording**

Update active docs so `docs/architecture/workflow-engine/` is described as runtime/technical only and design-time methodology workflow-editor docs are always routed under `docs/architecture/methodology-pages/workflow-editor/`.

**Step 2: Correct story/planning wording**

Update `/_bmad-output/planning-artifacts/epics.md` if it still describes design-time implementation as `workflow-engine`-scoped rather than methodology/workflow-editor-scoped.

**Step 3: Verify wording drift is gone**

Run: `rg -n "workflow-engine/\*|stable workflow-engine docs|workflow-engine docs routed" docs/README.md docs/architecture/module-inventory.md _bmad-output/planning-artifacts/epics.md _bmad-output/planning-artifacts/chiron-active-doc-index-v1-week6.md _bmad-output/planning-artifacts/chiron-foundational-docs-lock-v1-week6.md`

Expected:
- active docs no longer frame `workflow-engine/` as a design-time page bucket
- methodology design-time docs are routed through `docs/architecture/methodology-pages/workflow-editor/`

### Task 6: Final verification and handoff

**Files:**
- Review: `docs/architecture/methodology-pages/versions.md`
- Review: `docs/architecture/methodology-progressive-seeding.md`
- Review: `docs/architecture/methodology-bmad-setup-mapping.md`
- Review: `docs/architecture/methodology-canonical-authority.md`
- Review: `docs/architecture/epic-3-authority.md`
- Review: `docs/README.md`
- Review: `packages/scripts/src/story-seed-fixtures.ts`
- Review: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Review: `packages/scripts/src/seed/methodology/index.ts`

**Step 1: Run the documentation routing checks**

Run: `rg -n "Versions|WU.SETUP|progressive seeding|runtime/technical only|workflow-editor" docs/architecture docs/README.md`

Expected:
- the versions page and process doc are present
- `WU.SETUP` is named as the active seed slice
- runtime-only wording for `workflow-engine/` is explicit

**Step 2: Run the seed truth checks**

Run: `rg -n "WU\.PROJECT_CONTEXT|project_context_only|chiron-seed-workflow-definitions-v1.json|chiron-seed-transition-allowed-workflows-v1.json" docs _bmad-output packages/scripts/src`

Expected:
- active truth no longer depends on the two broad seed JSONs
- active seed/fixture files no longer present `WU.PROJECT_CONTEXT` as current truth
- any remaining hits are clearly historical, contextual, or archive-path references

**Step 3: Inspect final diff**

Run: `git diff -- docs _bmad-output packages/scripts/src`

Expected:
- diff shows the new Versions page, progressive seeding doc, legacy-seed demotion, setup-slice seed truth, and runtime-only wording cleanup

**Step 4: Stop and hand off**

Do not commit automatically. Summarize what changed, what is now canonical, and anything intentionally left for later progressive slices.
