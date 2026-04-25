# BMAD Methodology Seed Implementation

## TL;DR
> **Summary**: Implement the 12-hour MVP BMAD seeded methodology by first adding the product seed entrypoint and required platform condition/read-model enablers, then rolling out BMAD seed sections with TaskFlow verification gates.
> **Deliverables**:
> - Idempotent in-app BMAD methodology seed button/action on the Methodologies list page
> - Project-level work-unit instance condition operators across gates/branches/guidance/UI
> - Narrow referenced-work-unit MCP/read packages for explicitly bound refs
> - Updated existing Setup/Brainstorming/Research seed rows plus new Product Brief, PRD, UX, Architecture, Backlog, Story, Retrospective, Course Correction seed rows
> - Section-based TaskFlow verification path
> **Effort**: XL
> **Parallel**: YES - 5 waves
> **Critical Path**: Enablers → Section A seed → TaskFlow A verification → Section B seed → Story loop verification → Section C seed → Course Correction verification

## Context

### Original Request
Implement the agreed BMAD seeded methodology, including modifying existing seed definitions, adding a seed button, adding work-unit existence operators, and rolling out the seed in reviewable sections using TaskFlow.

### Interview Summary
- Backlog absorbs Epic structured data, Sprint Planning/status, and Implementation Readiness readiness gate for the 12-hour MVP.
- Story work units are created only for selected Backlog working-set story keys via Story activation transition `activation_to_ready_for_dev` / `create_story`.
- `selected_story_draft_specs_ctx` is workflow-local and must be prepared inside `start_selected_stories` immediately before invoke.
- Story artifacts are `STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, `TEST_DOCUMENT`, and optional `DEFERRED_WORK`.
- Retrospective is standalone and selects many done Story refs in its first workflow steps.
- Course Correction is standalone: it writes `SPRINT_CHANGE_PROPOSAL`, applies/commits approved artifact edits, and affected work units detect stale artifact commits with `is_fresh` and run their own refinement transitions.
- Seed rollout is section-based with manual/agent review gates after Section A, B, and C.

### Metis Review (gaps addressed)
- Added durable `working_set_history` requirement for Backlog.
- Added single-writer rule for Backlog `sprint_status` / `SPRINT_STATUS`.
- Required new condition operators to be implemented across contracts, gate execution, branch evaluation, project availability/guidance, UI display, and tests.
- Locked Product Brief/PRD/UX/Architecture/Backlog narrow referenced-work-unit read-package scope.
- Locked Course Correction write authority: Course Correction may edit/commit affected artifacts but does not force affected work-unit state changes.
- Locked seed button semantics: idempotent global seed/update, not reset/reseed.

### Oracle Review (architecture guardrails)
- Do not call `manual-seed.mjs` directly from the app.
- Treat condition operators as a platform enabler with a shared normalized condition pipeline.
- Guidance/start-gate evaluation must not keep divergent parsing semantics.
- `sprint_status` is the single authoritative current status; `working_set_history` is append-only.
- Course Correction should reuse artifact freshness via recorded commit/blob refs.

## Work Objectives

### Core Objective
Make BMAD available as a seeded methodology from the app and verify a TaskFlow path through planning, Backlog/Story execution loops, Retrospective, and Course Correction.

### Deliverables
- Seed button/action on the Methodologies list page and server mutation.
- New condition operators:
  - `work_unit_instance_exists`
  - `work_unit_instance_exists_in_state`
- Narrow referenced-work-unit read packages.
- Updated seed definitions for existing and new BMAD work units/workflows.
- Sectioned verification suite and TaskFlow walkthrough checks.

### Definition of Done
- `bun run check-types` passes.
- Seed button is idempotent: repeated clicks create no duplicate BMAD methodology/version rows and do not reset unrelated project/user data.
- New operators work in transition gates, branch routes, guidance/availability, project-context evaluation, and UI reason rendering.
- Section A TaskFlow path reaches Architecture with expected required artifacts.
- Section B TaskFlow Backlog creates only selected Story work units and loops to second working set correctly.
- Section C Retrospective availability and Course Correction stale-artifact behavior are verified.

### Must Have
- Update existing seed rows where they contradict the agreed model.
- Keep deferred standalone Epic, Sprint Plan, and Implementation Readiness out of the active MVP seed.
- Use activation-only Story invoke.
- Preserve fixed-transition semantics; conditions only control transition availability.

### Must NOT Have
- No app button calling `manual-seed.mjs`.
- No deletion of `.sisyphus/drafts/bmad-work-unit-*.md` spec files; they remain living refinement references during implementation.
- No global graph traversal for referenced work-unit reads.
- No Course Correction forcing affected work-unit state changes.
- No Story `backlog` state in MVP.
- No standalone Sprint Plan/Epic/Implementation Readiness active MVP seed rows.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed, with evidence files captured under `.sisyphus/evidence/`.
- Test decision: tests-after for existing codebase; add/update focused unit/integration/e2e tests with each task.
- QA policy: every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy

### Parallel Execution Waves
Wave 1: Platform enablers and seed button foundations.
Wave 2: Section A seed updates and TaskFlow planning-path verification.
Wave 3: Section B Backlog/Story seed and working-set verification.
Wave 4: Section C Retrospective/Course Correction seed and freshness verification.
Wave 5: final full-path audit, cleanup, and regression.

### Dependency Matrix
- Task 1 blocks all seed-button QA.
- Task 2 blocks Retrospective availability and any seeded branch/gate using work-unit instance checks.
- Task 3 blocks Product Brief/PRD/UX/Architecture/Backlog agents that read referenced work-unit facts/artifacts.
- Task 4 depends on Tasks 1-3 for accurate Section A verification.
- Task 5 depends on Task 4.
- Task 6 depends on Tasks 2-5.
- Task 7 depends on Task 6.
- Task 8 depends on Tasks 2, 6, and 7.
- Task 9 depends on Task 8.
- Task 10 depends on all prior tasks.

### Agent Dispatch Summary
- Wave 1 → 3 tasks → deep / quick / unspecified-high
- Wave 2 → 2 tasks → deep / unspecified-high
- Wave 3 → 2 tasks → deep / unspecified-high
- Wave 4 → 2 tasks → deep / unspecified-high
- Wave 5 → 1 task → deep

## TODOs

- [ ] 1. Add idempotent BMAD seed action on Methodologies list page

  **What to do**: Add a product-visible button/action for seeding/updating the canonical BMAD methodology on the Methodologies list/index page. Locate the route/component for the methodologies list before editing; likely paths are under `apps/web/src/routes/` and/or `apps/web/src/features/methodologies/`. Add a server/API mutation that seeds methodology rows only; do not call `packages/scripts/src/manual-seed.mjs`. Reuse seed authority from `packages/scripts/src/seed/methodology/index.ts` and supporting seed modules. Ensure repeated calls are idempotent and refresh the methodologies list so BMAD appears once.
  **Must NOT do**: Do not reset users/projects/runtime data. Do not shell out to the manual seed script from the app. Do not create duplicate methodology/version rows.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: touches web UI, API/server mutation, seed authority, and idempotency.
  - Skills: [] - No special skill needed.
  - Omitted: [`git-master`] - No git operation requested.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,10 | Blocked By: none

  **References**:
  - Methodologies UI: locate methodologies list route/component under `apps/web/src/routes/` and/or `apps/web/src/features/methodologies/` - primary product surface for seed action.
  - Project creation UI: `apps/web/src/routes/projects.new.tsx` - no longer primary; use only if follow-up project pinning convenience is later requested.
  - Seed registry: `packages/scripts/src/seed/methodology/index.ts` - current seed authority/export surface.
  - Manual seed: `packages/scripts/src/manual-seed.mjs` - reference only; must not be called by app.

  **Acceptance Criteria**:
  - [ ] Clicking the seed button creates/updates exactly one canonical BMAD methodology/version set.
  - [ ] Clicking the seed button twice creates no duplicate methodology/version rows.
  - [ ] Existing user/project/runtime data remains intact after seeding.
  - [ ] `bun run check-types` passes.

  **QA Scenarios**:
  ```
  Scenario: Seed button idempotency
    Tool: Playwright
    Steps: Navigate to the Methodologies list page; click BMAD seed button; wait for success; click it again; query UI/API list for methodology choices.
    Expected: BMAD appears once in the Methodologies list; no duplicate methodology/version rows; page remains usable.
    Evidence: .sisyphus/evidence/task-1-seed-button.md

  Scenario: Manual seed script not invoked
    Tool: Bash
    Steps: Run focused tests or inspect server mutation behavior through unit/integration test that mocks forbidden shell invocation.
    Expected: app mutation uses in-process seed service and never calls manual-seed.mjs.
    Evidence: .sisyphus/evidence/task-1-no-manual-seed.md
  ```

  **Commit**: YES | Message: `feat(seed): add idempotent bmad seed action` | Files: methodologies list route/component, API/server mutation files, seed service files, tests

- [ ] 2. Add project-level work-unit instance condition operators across engines

  **What to do**: Add `work_unit_instance_exists(workUnitTypeKey, minCount?)` and `work_unit_instance_exists_in_state(workUnitTypeKey, stateKeys, minCount?)` from authoring UI through persistence and runtime evaluation. Implement shared contract support, methodology validation/decode, database persistence via existing condition JSON/config columns, branch evaluation, transition gate execution, runtime guidance/start-gate detail, project-context availability evaluation, API project availability paths, and UI rendering/reason text. Reject empty `stateKeys`; default `minCount` to 1. Count only current state, not historical state.
  **Must NOT do**: Do not overload attached `work_unit_reference_fact` existence semantics. Do not implement in only one evaluator.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-cutting contract/runtime/UI condition model.
  - Skills: [] - No special skill needed.
  - Omitted: [`effect-best-practices`] - Use only if implementation discovers Effect services in touched files.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 4,6,8,10 | Blocked By: none

  **References**:
  - Runtime condition contract: `packages/contracts/src/runtime/conditions.ts` - add operator shapes.
  - Methodology workflow contract: `packages/contracts/src/methodology/workflow.ts` - branch/gate condition schema support.
  - DB schemas: `packages/db/src/schema/methodology.ts`, `packages/db/src/schema/runtime.ts` - verify condition JSON persistence needs no schema change or add migration if schema is too narrow.
  - Branch evaluator: `packages/workflow-engine/src/services/branch-route-evaluator.ts` - branch condition support.
  - Transition gates: `packages/workflow-engine/src/services/transition-gate-conditions.ts` and `packages/workflow-engine/src/services/runtime-gate-service.ts` - execution support.
  - Project availability: `packages/project-context/src/transition-condition-evaluator.ts`, `packages/api/src/routers/project.ts` - guidance/availability support.
  - UI: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/components/runtime/runtime-start-gate-dialog.tsx`, `apps/web/src/routes/projects.$projectId.transition-executions.$transitionExecutionId.tsx` - display/reason support.

  **Acceptance Criteria**:
  - [ ] Both operators decode/validate in contracts.
  - [ ] Both operators can be authored/edited in frontend condition UI and saved to the database.
  - [ ] Reloading methodology authoring pages preserves both operators and their config exactly.
  - [ ] Both operators evaluate identically in branch routes and transition gates.
  - [ ] Guidance/project availability uses the same semantics.
  - [ ] UI displays readable reason text for pass/fail.
  - [ ] Unknown `workUnitTypeKey`, empty `stateKeys`, and `minCount <= 0` fail predictably.

  **QA Scenarios**:
  ```
  Scenario: Operator semantics across engines
    Tool: Bash
    Steps: Run focused unit tests for branch evaluator, transition gate evaluator, runtime guidance, and project-context evaluator.
    Expected: work_unit_instance_exists and work_unit_instance_exists_in_state pass/fail consistently; minCount default is 1; empty stateKeys rejected.
    Evidence: .sisyphus/evidence/task-2-operators.md

  Scenario: Operator authoring persistence
    Tool: Playwright
    Steps: Open methodology state machine/branch condition editor; add work_unit_instance_exists and work_unit_instance_exists_in_state conditions; save; reload page; inspect API/db-backed rendered config.
    Expected: operator names, workUnitTypeKey, stateKeys, and minCount persist exactly; invalid empty stateKeys cannot be saved.
    Evidence: .sisyphus/evidence/task-2-operator-authoring.md

  Scenario: Retrospective availability
    Tool: Bash
    Steps: Create runtime fixture with zero done Story work units, then one done Story work unit; evaluate transition/guidance availability.
    Expected: Retrospective unavailable before done Story; available after one done Story.
    Evidence: .sisyphus/evidence/task-2-retro-availability.md
  ```

  **Commit**: YES | Message: `feat(conditions): add work unit instance operators` | Files: condition contracts, evaluators, UI display, tests

- [ ] 3. Add narrow referenced-work-unit read packages for explicit refs

  **What to do**: Expand MCP/read behavior for explicitly bound `work_unit_reference_fact` inputs and bound facts whose underlying value is a work-unit reference. Return a narrow read package with referenced metadata, active fact instances, artifact slot instances, artifact paths, and recorded commit/blob refs where available. Keep default read lightweight unless explicitly requested by the workflow/agent read config.
  **Must NOT do**: Do not implement global graph traversal. Do not expose unrelated project work units.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: agent MCP/read model and runtime data exposure.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,6,8 | Blocked By: none

  **References**:
  - MCP route: `apps/server/src/mcp/route.ts` - output schema/docs for expanded target/read package.
  - Agent MCP service: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts` - `readContextFactInstances` behavior.
  - Existing helper: `buildWorkUnitCandidateSummary(...)` in runtime/MCP service - currently metadata-only.
  - Draft authority: `.sisyphus/drafts/bmad-seed-data-agreement.md` - narrow explicit read-package scope.

  **Acceptance Criteria**:
  - [ ] Product Brief agent can read explicitly referenced Brainstorming/Research facts/artifact paths.
  - [ ] PRD/UX/Architecture/Backlog agents can read only their explicitly bound source refs.
  - [ ] Read package includes artifact path/commit refs when present.
  - [ ] Unbound/unrequested work units are not exposed.

  **QA Scenarios**:
  ```
  Scenario: Explicit reference read package
    Tool: Bash
    Steps: Run MCP/read-model test with Product Brief referencing one Brainstorming and two Research work units.
    Expected: read_context_fact_instances returns referenced metadata, active facts, and artifact slot path/commit refs only for those refs.
    Evidence: .sisyphus/evidence/task-3-read-package.md

  Scenario: No global traversal
    Tool: Bash
    Steps: Add unrelated Research work unit in fixture; read Product Brief context facts.
    Expected: unrelated work unit is absent from read package.
    Evidence: .sisyphus/evidence/task-3-no-global-traversal.md
  ```

  **Commit**: YES | Message: `feat(mcp): expand explicit work unit reference reads` | Files: MCP route/service/tests

- [ ] 4. Revise Section A seed: Setup through Architecture

  **What to do**: Update existing Setup/Brainstorming/Research seed rows and add Product Brief, PRD, UX Design, and Architecture rows per the agreed specs. Keep `display` unused. Preserve `action` as propagation-only. Product Brief binds explicit Brainstorming/Research refs; PRD binds one Product Brief or direct context; UX binds PRD; Architecture binds PRD and optional UX/Research.
  **Must NOT do**: Do not seed standalone Epic/Sprint Plan/Implementation Readiness as active MVP units. Do not leave existing contradictory seed rows in place.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: seed data correctness across work units/facts/artifacts/workflows.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5,6 | Blocked By: 1,2,3

  **References**:
  - Current seed: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`.
  - Registry: `packages/scripts/src/seed/methodology/index.ts`, `packages/scripts/src/seed/methodology/tables/index.ts`.
  - Specs: `.sisyphus/drafts/bmad-work-unit-setup-spec.md`, `bmad-work-unit-brainstorming-spec.md`, `bmad-work-unit-research-spec.md`, `bmad-work-unit-product-brief-spec.md`, `bmad-work-unit-prd-spec.md`, `bmad-work-unit-ux-design-spec.md`, `bmad-work-unit-architecture-spec.md`.

  **Acceptance Criteria**:
  - [ ] Seed includes Setup, Brainstorming, Research, Product Brief, PRD, UX Design, Architecture with required facts/artifacts/workflows.
  - [ ] Existing Setup/Brainstorming/Research rows match agreed specs.
  - [ ] Section A seed does not include active standalone Epic/Sprint Plan/Implementation Readiness.
  - [ ] Seed integrity/integration tests pass after expected updates.

  **QA Scenarios**:
  ```
  Scenario: Section A seed integrity
    Tool: Bash
    Steps: Run packages/scripts seed integrity/integration tests updated for Section A.
    Expected: required rows exist exactly once; deprecated display steps absent; deferred units absent from active MVP seed.
    Evidence: .sisyphus/evidence/task-4-section-a-seed.md

  Scenario: Existing seed correction
    Tool: Bash
    Steps: Inspect seeded Setup/Brainstorming/Research definitions through test fixture.
    Expected: existing definitions reflect latest specs, including Brainstorming technique workflow refs and Research variants.
    Evidence: .sisyphus/evidence/task-4-existing-seed-correction.md
  ```

  **Commit**: YES | Message: `feat(seed): add bmad planning work units` | Files: seed definitions/tests

- [ ] 5. Verify TaskFlow Section A path through Architecture

  **What to do**: Add an agent-executable verification path for TaskFlow through Setup, Brainstorming, Market Research, Technical Research, Product Brief, PRD, UX Design, and Architecture. Verify required artifacts and next guidance recommendations after each stage.
  **Must NOT do**: Do not rely only on manual review notes. Do not verify vague “works” conditions.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: runtime verification across seeded methodology.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 4

  **References**:
  - Walkthrough: `.sisyphus/drafts/taskflow-bmad-user-journey-walkthrough.md` - expected TaskFlow decisions.
  - Full journey: `.sisyphus/drafts/bmad-full-user-journey-mvp.md`.

  **Acceptance Criteria**:
  - [ ] TaskFlow creates expected Section A work units and artifacts.
  - [ ] Product Brief can read selected Brainstorming/Research outputs through explicit refs.
  - [ ] Guidance recommends Backlog after Architecture is complete.

  **QA Scenarios**:
  ```
  Scenario: TaskFlow Section A happy path
    Tool: Playwright
    Steps: Seed BMAD; create TaskFlow project; run/advance Setup through Architecture using deterministic TaskFlow inputs.
    Expected: required artifacts PROJECT_CONTEXT, BRAINSTORMING_OUTPUT, RESEARCH_REPORT, PRODUCT_BRIEF, PRD, UX_DESIGN_SPECIFICATION, ARCHITECTURE_DOCUMENT exist; guidance recommends Backlog.
    Evidence: .sisyphus/evidence/task-5-taskflow-section-a.md

  Scenario: Section A missing optional UX handling
    Tool: Bash
    Steps: Run fixture where Architecture exists but UX is absent for non-UI path.
    Expected: Backlog remains available when UX is optional; UI projects warn if UX implied and missing.
    Evidence: .sisyphus/evidence/task-5-optional-ux.md
  ```

  **Commit**: YES | Message: `test(seed): verify taskflow planning path` | Files: tests/evidence fixtures

- [ ] 6. Seed Section B: Backlog readiness, working-set loop, and Story

  **What to do**: Add Backlog and Story seed definitions. Backlog includes `EPICS_AND_STORIES`, `READINESS_REPORT`, `SPRINT_STATUS`, `active_working_set`, `working_set_history`, `story_work_units`, `sprint_status`, `working_set_completion_status`, readiness facts, and workflows listed in `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`. Story includes lifecycle states `ready_for_dev`, `in_progress`, `review`, `done`; workflows `create_story`, `start_dev_story`, `dev_story`, `code_review`; artifacts `STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, `TEST_DOCUMENT`, optional `DEFERRED_WORK`.
  **Must NOT do**: Do not seed Story `backlog` state. Do not seed active standalone Epic/Sprint Plan/Implementation Readiness. Do not create all Story work units from Backlog draft.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: complex state/workflow/fact/artifact seed.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 7,8 | Blocked By: 2,4,5

  **References**:
  - Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`.
  - Story spec: `.sisyphus/drafts/bmad-work-unit-story-spec.md`.
  - Workflow inventory: `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`.

  **Acceptance Criteria**:
  - [ ] Backlog readiness gate writes Backlog-owned `READINESS_REPORT`.
  - [ ] `plan_active_working_set` persists durable selected-story payload but does not create draft specs.
  - [ ] `start_selected_stories` creates workflow-local Story draft specs and invokes Story `activation_to_ready_for_dev` / `create_story`.
  - [ ] `working_set_history` is append-only; `sprint_status` is single authoritative current status.

  **QA Scenarios**:
  ```
  Scenario: Backlog and Story seed integrity
    Tool: Bash
    Steps: Run seed integrity tests for Backlog/Story rows, transitions, workflows, artifacts, context facts.
    Expected: exact workflows exist; forbidden standalone active units absent; Story has no backlog state.
    Evidence: .sisyphus/evidence/task-6-section-b-seed.md

  Scenario: Invoke constraint validation
    Tool: Bash
    Steps: Run fixture executing Backlog start_selected_stories.
    Expected: Story work units are created only through activation_to_ready_for_dev/create_story; no non-activation Story invoke occurs.
    Evidence: .sisyphus/evidence/task-6-story-invoke.md
  ```

  **Commit**: YES | Message: `feat(seed): add backlog and story workflows` | Files: seed definitions/tests

- [ ] 7. Verify TaskFlow Section B working-set loop

  **What to do**: Verify TaskFlow Backlog creates epics/stories as data, runs readiness, selects first working set, creates only selected Story work units, syncs status, closes working set, and selects second set excluding completed stories.
  **Must NOT do**: Do not mark Backlog done after first working set if remaining stories exist.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: multi-state runtime verification.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 8 | Blocked By: 6

  **References**:
  - TaskFlow walkthrough: `.sisyphus/drafts/taskflow-bmad-user-journey-walkthrough.md`.
  - Backlog/Story specs.

  **Acceptance Criteria**:
  - [ ] Backlog draft creates no Story work units.
  - [ ] First working set creates only `STORY-1.1`, `STORY-1.2`, `STORY-1.3`.
  - [ ] Done first set updates `working_set_completion_status` with `backlogScopeComplete = false`.
  - [ ] Next available transition is `in_progress_to_ready_for_sprint_planning`.
  - [ ] Second working-set selection excludes completed first-set stories.

  **QA Scenarios**:
  ```
  Scenario: TaskFlow first working set
    Tool: Playwright
    Steps: From Architecture-complete TaskFlow, create Backlog, run readiness, select first set, start stories, move selected stories to done through test fixtures or UI-supported transitions.
    Expected: only selected Story work units exist; Backlog remains in_progress until status update; then ready_for_sprint_planning because remaining stories exist.
    Evidence: .sisyphus/evidence/task-7-first-working-set.md

  Scenario: Second set selection
    Tool: Playwright
    Steps: Run plan_active_working_set again after first set closure.
    Expected: completed STORY-1.1/1.2/1.3 are excluded; dependency-safe STORY-2.x candidates are available.
    Evidence: .sisyphus/evidence/task-7-second-working-set.md
  ```

  **Commit**: YES | Message: `test(seed): verify taskflow backlog loop` | Files: tests/evidence fixtures

- [ ] 8. Seed Section C: Retrospective and Course Correction with freshness routes

  **What to do**: Add Retrospective and Course Correction seed definitions. Retrospective availability uses `work_unit_instance_exists_in_state(story, [done], 1)` and first workflow steps select many Story refs. Retrospective artifacts are `RETROSPECTIVE_REPORT`, many-cardinality `RETROSPECTIVE_EVIDENCE_SET`, and optional `ACTION_ITEM_REGISTER`. Course Correction includes affected work-unit refs by type, affected artifacts, `SPRINT_CHANGE_PROPOSAL`, `CHANGE_IMPACT_ANALYSIS`, many-cardinality `ARTIFACT_UPDATE_FILESET`, optional `COURSE_CORRECTION_HANDOFF`, artifact update set, and approved artifact edit/commit behavior. Add stale-artifact refinement transitions/gates on affected PRD/UX/Architecture/Backlog/Story units using `is_fresh`.
  **Must NOT do**: Do not force affected work-unit state changes from Course Correction. Do not make Retrospective require pre-attached Story refs before start.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: cross-work-unit artifact freshness and seed workflows.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 9,10 | Blocked By: 2,6,7

  **References**:
  - Retrospective spec: `.sisyphus/drafts/bmad-work-unit-retrospective-spec.md`.
  - Course Correction spec: `.sisyphus/drafts/bmad-work-unit-course-correction-spec.md`.
  - Workflow inventory: `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`.
  - Full journey: `.sisyphus/drafts/bmad-full-user-journey-mvp.md`.
  - Course Correction BMAD source: `.opencode/skills/bmad-correct-course/**`.
  - Retrospective BMAD source: `.opencode/skills/bmad-retrospective/**`.

  **Acceptance Criteria**:
  - [ ] Retrospective unavailable before any Story is done.
  - [ ] Retrospective available after at least one done Story.
  - [ ] Retrospective selects many Story refs at workflow start.
  - [ ] Retrospective persists `RETROSPECTIVE_REPORT` and at least one `RETROSPECTIVE_EVIDENCE_SET` artifact.
  - [ ] Course Correction records proposal, affected artifacts, artifact update set, and commit refs.
  - [ ] Course Correction persists `SPRINT_CHANGE_PROPOSAL`, `CHANGE_IMPACT_ANALYSIS`, and at least one `ARTIFACT_UPDATE_FILESET` artifact.
  - [ ] Affected work units remain in current states but expose refinement transitions when artifacts are stale.

  **QA Scenarios**:
  ```
  Scenario: Retrospective selection
    Tool: Playwright
    Steps: With one done Story, open guidance/available transitions and start Retrospective; select multiple Story refs.
    Expected: Retrospective starts from project-level existence condition and binds selected source_story_work_units many refs.
    Evidence: .sisyphus/evidence/task-8-retro-selection.md

  Scenario: Course Correction freshness
    Tool: Bash
    Steps: Run fixture where Course Correction edits/commits PRD and Backlog artifacts; evaluate affected unit transition availability.
    Expected: affected work-unit states unchanged; is_fresh fails; local refinement transitions become available.
    Evidence: .sisyphus/evidence/task-8-course-correction-freshness.md
  ```

  **Commit**: YES | Message: `feat(seed): add retrospective and course correction` | Files: seed definitions/condition tests

- [ ] 9. Verify TaskFlow Section C retrospective/correction scenario

  **What to do**: Run a TaskFlow scenario after first working set: Retrospective analyzes `STORY-1.1`–`STORY-1.3`, detects a significant discovery, Course Correction creates proposal and artifact update set, and affected work units expose stale-artifact refinement transitions.
  **Must NOT do**: Do not rely on manual inspection only.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: end-to-end runtime verification.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: 10 | Blocked By: 8

  **References**:
  - TaskFlow walkthrough Step 11/12.
  - Retrospective/Course Correction seed definitions.

  **Acceptance Criteria**:
  - [ ] Retrospective produces `RETROSPECTIVE_REPORT`.
  - [ ] Course Correction produces `SPRINT_CHANGE_PROPOSAL`.
  - [ ] Artifact update commit refs are recorded.
  - [ ] Affected units show stale/refinement availability without forced state changes.

  **QA Scenarios**:
  ```
  Scenario: TaskFlow Course Correction
    Tool: Playwright
    Steps: Complete first working set; run Retrospective; trigger correction for missing org-role assumption; run Course Correction; inspect affected PRD/Architecture/Backlog transitions.
    Expected: proposal and updated artifact refs exist; affected units remain in place; stale-artifact refinement routes appear.
    Evidence: .sisyphus/evidence/task-9-taskflow-correction.md

  Scenario: No significant discovery
    Tool: Bash
    Steps: Run Retrospective fixture with no significant discovery.
    Expected: no Course Correction recommendation; Backlog next working-set path remains recommended.
    Evidence: .sisyphus/evidence/task-9-no-correction.md
  ```

  **Commit**: YES | Message: `test(seed): verify taskflow retrospective correction` | Files: tests/evidence fixtures

- [ ] 10. Full seed regression, cleanup, and documentation of superseded units

  **What to do**: Run full checks, mark any active seed references to standalone Epic/Sprint Plan/Implementation Readiness as excluded from active MVP seed, update seed integrity expectations, and capture final evidence. Ensure `.sisyphus/drafts/*` decisions are represented in implementation and no stale terminology remains in active code/test names except future-only docs.
  **Must NOT do**: Do not delete deferred draft specs or per-work-unit spec files. Do not commit generated evidence unless project convention requires it.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: full regression and cleanup across seed/runtime/UI.
  - Skills: [] - No special skill needed.
  - Omitted: []

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: none | Blocked By: all prior tasks

  **References**:
  - README commands: `README.md` - `bun run check-types`, `bun run test`, `bun run test:e2e`.
  - Seed tests: `packages/scripts/src/tests/seeding/**`.
  - Draft authority: `.sisyphus/drafts/bmad-seed-data-agreement.md`, `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`.

  **Acceptance Criteria**:
  - [ ] `bun run check-types` passes.
  - [ ] Relevant unit/integration/e2e tests pass.
  - [ ] Active seed includes no standalone Epic/Sprint Plan/Implementation Readiness rows for 12-hour MVP.
  - [ ] Section A/B/C TaskFlow evidence is captured.
  - [ ] Seed button idempotency evidence is captured.

  **QA Scenarios**:
  ```
  Scenario: Full regression
    Tool: Bash
    Steps: Run check-types and relevant package tests, including seed integrity/integration and condition evaluator tests.
    Expected: all pass with exit code 0.
    Evidence: .sisyphus/evidence/task-10-full-regression.md

  Scenario: Active seed cleanup
    Tool: Bash
    Steps: Query seeded methodology fixture for active work-unit keys.
    Expected: active MVP keys exclude standalone epic, sprint_plan, and implementation_readiness; deferred docs may remain outside active seed.
    Evidence: .sisyphus/evidence/task-10-active-seed-cleanup.md
  ```

  **Commit**: YES | Message: `chore(seed): finalize bmad methodology rollout` | Files: seed tests/docs/cleanup

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after each task if tests for that task pass.
- Use concise conventional messages listed per task.
- Do not push unless explicitly requested.

## Success Criteria
- BMAD can be seeded idempotently from the app.
- New condition operators work consistently across branch, transition gate, guidance, and UI surfaces.
- TaskFlow verifies Section A through Architecture.
- TaskFlow verifies Backlog/Story first working set and second-set selection.
- Retrospective and Course Correction verify existence/freshness behavior without forced state changes.
- Active MVP seed excludes standalone Epic, Sprint Plan, and Implementation Readiness as work units.
