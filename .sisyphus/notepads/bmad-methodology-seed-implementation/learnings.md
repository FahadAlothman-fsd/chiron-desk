# BMAD Methodology Seed Implementation - Learnings

## Conventions
- Seed authority is in `packages/scripts/src/seed/methodology/index.ts`
- Manual seed script at `packages/scripts/src/manual-seed.mjs` must NOT be called from app
- Condition operators need shared normalized pipeline across contracts, evaluators, and UI
- Story work units are created ONLY via activation transition `activation_to_ready_for_dev` / `create_story`
- `sprint_status` is single authoritative current status; `working_set_history` is append-only
- Course Correction may edit/commit artifacts but does NOT force affected work-unit state changes

## Patterns
- Idempotency: seed button must create/update exactly one canonical BMAD methodology/version set
- Section-based rollout: A (Setup→Architecture), B (Backlog→Story), C (Retrospective→Course Correction)
- Deferred units: Epic, Sprint Plan, Implementation Readiness are NOT in active MVP seed

## Gotchas
- Empty `stateKeys` must be rejected for `work_unit_instance_exists_in_state`
- Default `minCount` is 1
- Count only current state, not historical state
- No global graph traversal for referenced work-unit reads
- Project-level work-unit instance conditions need parallel support in runtime contracts, transition gate JSON decoding, branch evaluation, project-context availability, and UI text renderers to stay semantically aligned

## 2026-04-25
- The Methodologies list route lives at `apps/web/src/routes/methodologies.tsx`; a visible catalog action can invalidate `orpc.methodology.listMethodologies.queryOptions()` to refresh the feed after seeding.
- The safest in-app BMAD seed path is to reuse `BASELINE_MANUAL_SEED_PLAN` plus `methodologyCanonicalTableSeedRows` in-process, not `manual-seed.mjs`; deleting/reinserting only canonical methodology-version rows keeps project/runtime data intact.
- Canonical BMAD seeding should preserve an existing methodology definition id and any existing draft/active version ids for the canonical version tags, then remap only `methodologyVersionId` fields in seed rows before reseeding.
- Explicit `read_context_fact_instances` dereference should stay narrow: resolve only the referenced work unit, its active fact rows, and its current artifact slot snapshots/files.
- Bound facts with `valueType: work_unit` can reuse the same narrow referenced package by reading `value.projectWorkUnitId` from the stored bound envelope instead of traversing broader project state.
- Root cause: `project_context_artifact` in Architecture seed rows used unsupported `factType: "artifact_reference"`, which violated `work_unit_fact_defs_fact_type_check` during insert.
- Fix: model the source as `factType: "work_unit_reference"` pointing at the setup work unit, since the project-context artifact is owned there and this stays within the current schema.
- Section A editor seeding cannot stop at `methodology_workflows`; the editor needs concrete `methodology_workflow_steps`, `methodology_workflow_edges`, `entryStepId`, and local context-fact definitions or the canonical workflows render as effectively blank.
- Keeping `setup-bmad-mapping.ts` as the single authority works best when the authored step graph is declared directly in the Section A spec block and then expanded across both canonical versions, rather than patching per-workflow rows later.
