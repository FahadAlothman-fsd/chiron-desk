# Story CCF.6: Re-Baseline Canonical Planning Artifacts After Electron Cutover

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a planning owner,
I want the canonical BMAD planning artifacts re-baselined after Electron cutover is proven,
so that Epic 3 and later work build on the real post-cutover architecture instead of temporary correction notes.

## Story Metadata

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `planning-rebaseline-log`, `prd-rebaseline-log`, `architecture-rebaseline-log`, `command-surface-rebaseline-log`
- `diagnosticRefs`: `planning-drift-diagnostics`, `canonical-doc-alignment-diagnostics`

## Acceptance Criteria

1. `/_bmad-output/planning-artifacts/prd.md` reflects Electron as the approved desktop host and no longer frames host posture as a temporary Tauri-to-Electron migration state.
2. `/_bmad-output/planning-artifacts/architecture.md` reflects the real post-cutover runtime structure and no longer carries temporary pre-cutover host/runtime pending notes.
3. Temporary pending course-correction notes introduced during migration are removed or replaced with final canonical wording in the planning artifacts updated by this story.
4. Active run/dev/build command references in canonical planning artifacts match real supported repository flows.
5. Canonical boundaries are explicitly captured for `apps/web`, `apps/desktop`, `apps/server`, thin `core` (via `packages/core` / `@chiron/core`), and `packages/contracts`, so downstream epics do not rely on temporary correction context.

## Tasks / Subtasks

- [x] Re-baseline PRD desktop-host language to canonical Electron posture (AC: 1, 3)
  - [x] Replace temporary migration/pending-note wording in `_bmad-output/planning-artifacts/prd.md` with final canonical Electron-host wording.
  - [x] Keep product scope unchanged while updating only host/runtime posture language.
  - [x] Confirm `Executive Summary` aligns with current validated post-cutover reality.
- [x] Re-baseline architecture desktop-host/runtime wording while preserving locked boundaries (AC: 2, 3, 5)
  - [x] Replace/remove temporary pending course-correction note in `_bmad-output/planning-artifacts/architecture.md`.
  - [x] Preserve canonical module boundaries and thin-core constraints from CCF.5.
  - [x] Explicitly retain and/or strengthen boundary statements for `apps/web`, `apps/desktop`, `apps/server`, `packages/core`, `packages/contracts`.
- [x] Align canonical command surface references with repo-supported flows (AC: 4)
  - [x] Ensure planning artifact command references align with root/app scripts in `package.json`, `apps/desktop/package.json`, `apps/web/package.json`, `apps/server/package.json`.
  - [x] Remove stale command examples that imply deprecated host/runtime paths.
- [x] Preserve sequencing and gate semantics for CC-Foundation -> Epic 3 promotion (AC: 5)
  - [x] Confirm CCF.6 remains ordered after CCF.5 and before `cc-foundation-retrospective` / Epic 3 work.
  - [x] Keep explicit prerequisite lock language so Epic 3 cannot start without CCF.5 boundary lock + CCF.6 canonical re-baseline.
- [x] Validate documentation consistency and capture evidence mapping (AC: 1-5)
  - [x] Verify updated PRD + architecture wording is internally consistent and references real runtime boundaries/flows.
  - [x] Record concise completion notes with touched files and proof points for review.

## Dev Notes

### Developer Context Section

- This is a **planning-artifact re-baseline story**. It updates canonical documentation after runtime cutover validation; it does not introduce new runtime functionality.
- Primary target is to remove temporary migration posture language and make canonical planning docs reflect current Electron reality.
- Preserve and carry forward CCF.5 thin-core lock semantics as non-negotiable guardrails for Epic 3 readiness.

### Technical Requirements

- Update only canonical planning artifacts required by ACs, with focus on:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
- Ensure wording clearly states Electron as approved desktop host and current runtime structure.
- Do not re-open architecture scope or alter foundational FR/NFR/ADR mappings.
- Keep CC-Foundation and Epic 3 gating language explicit and traceable.

### Architecture Compliance

- Maintain module responsibility boundaries already locked in architecture + CCF.5:
  - `core` remains thin orchestration/policy/ports only.
  - `core` does not own DB/filesystem/process adapters, Electron host implementation, Hono transport handlers, or React/TanStack UI concerns.
- Ensure documentation phrasing does not regress into ambiguous ownership language.

### Library / Framework Requirements

- Canonical host: Electron (`apps/desktop` currently uses `electron` + `electron-builder`; retain security-focused posture around context isolation/sandboxing and narrow preload/IPC boundaries).
- Canonical API transport: Hono/oRPC in `apps/server`.
- No library migration is in scope; this story re-baselines planning text to match already adopted stack.

### File Structure Requirements

- Preserve and explicitly reference the post-cutover boundaries:
  - `apps/web` (React/TanStack UI shell)
  - `apps/desktop` (Electron desktop host shell)
  - `apps/server` (Hono/oRPC server runtime)
  - `packages/core` (`@chiron/core`, thin orchestration seam)
  - `packages/contracts` (shared contract seam)
- Keep documentation updates within canonical planning artifacts; avoid creating ad hoc parallel planning docs.

### Testing Requirements

- Story validation is documentation consistency + traceability checks:
  - AC-by-AC verification that PRD + architecture no longer contain temporary pending cutover language.
  - Command references in canonical artifacts map to real package scripts.
  - Boundary statements remain explicit and aligned with CCF.5 lock.
- Optional guard checks for reviewers:
  - Search planning artifacts for stale `Tauri` host posture language that implies active runtime ownership.
  - Reconfirm CCF.5 -> CCF.6 -> retrospective/Epic 3 sequencing in epics + sprint status artifacts.

### Previous Story Intelligence (CCF.5)

- CCF.5 is complete and locked thin-core governance before Epic 3.
- CCF.6 must preserve CCF.5 lock semantics and should not weaken ownership/gate wording during re-baseline.
- `packages/core` seam now exists and should be reflected consistently when describing final boundaries.

### Git Intelligence Summary

- Recent commits were documentation-first and boundary-focused (`docs(story): mark CCF-5 as done after review`, `feat(core): establish concrete thin-core seam for Epic 3 gating`).
- Planning artifacts (`epics.md`, `prd.md`, `architecture.md`) were recently edited; keep updates minimal, targeted, and coherent with latest baseline.

### Latest Technical Information

- Electron official security guidance continues to emphasize sandboxing, context isolation, and strict preload/IPC boundaries; planning wording should reflect secure Electron host posture.
- Hono best-practice guidance favors route-local/factory handler patterns and modular composition (`app.route()`), supporting explicit separation of transport layer responsibilities from core orchestration.
- Current repo scripts confirm active command surface for root + app-specific dev/build flows; canonical docs must align with these commands.

### Project Context Reference

- `_bmad-output/project-context.md` still lists `Tauri v2` in stack summary; treat this as drift signal and ensure canonical PRD/architecture wording is now authoritative for post-cutover host/runtime posture.

### Project Structure Notes

- Alignment target: canonical planning artifacts should mirror real repository structure and post-cutover runtime ownership with no temporary correction caveats.
- Any remaining wording that implies an unfinished host migration is a blocker for Epic 3 planning confidence.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story CCF.6: Re-Baseline Canonical Planning Artifacts After Electron Cutover (lines 299-330)]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3 gate lock (CCF.5 prerequisite evidence) (lines 293-297)]
- [Source: _bmad-output/planning-artifacts/prd.md (pending course-correction note + Executive Summary, lines 40-49)]
- [Source: _bmad-output/planning-artifacts/architecture.md (pending course-correction note, line 6; module boundaries and progression guidance)]
- [Source: _bmad-output/project-context.md#Technology Stack & Versions (line 29)]
- [Source: _bmad-output/implementation-artifacts/ccf-5-lock-thin-core-boundaries-before-epic-3.md (status, lock semantics, allowed/forbidden ownership)]
- [Source: package.json#scripts (root command surface)]
- [Source: apps/desktop/package.json#scripts (Electron host command surface)]
- [Source: apps/web/package.json#scripts (web command surface)]
- [Source: apps/server/package.json#scripts (server command surface)]
- [Source: https://www.electronjs.org/docs/latest/tutorial/security]
- [Source: https://www.electronjs.org/docs/latest/tutorial/sandbox]
- [Source: https://hono.dev/docs/guides/best-practices]

## Story Completion Status

- Story completed with canonical planning artifacts re-baselined to the post-Electron runtime structure and with the Epic 3 documentation cleanup folded into the final canonical planning/view model.
- Completion note: **Canonical planning artifacts, methodology page hierarchy, workflow-editor docs, and seed-direction documentation are now aligned well enough for the current documentation scope. Runtime seed/code cutover remains intentionally deferred to Epic 3 execution stories.**

## Dev Agent Record

### Agent Model Used

opencode/gpt-5.3-codex

### Debug Log References

- Workflow engine: `_bmad/core/tasks/workflow.xml`
- Workflow definition: `_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml`
- Instructions: `_bmad/bmm/workflows/4-implementation/create-story/instructions.xml`
- Validation checklist: `_bmad/bmm/workflows/4-implementation/create-story/checklist.md`

### Completion Notes List

- Generated comprehensive CCF.6 story context from epics/PRD/architecture/UX/project-context plus previous story and git intelligence.
- Embedded concrete repository command-surface references for canonical docs alignment.
- Added explicit guardrails to prevent regression to temporary migration framing.
- Completed the documentation-side follow-through: re-homed methodology design-time workflow docs, promoted locked wireframes, added Methodology Versions and progressive seeding guidance, and documented the intentional docs-vs-runtime seed discrepancy for later Epic 3 execution work.

### File List

- `_bmad-output/implementation-artifacts/ccf-6-re-baseline-canonical-planning-artifacts-after-electron-cutover.md`
