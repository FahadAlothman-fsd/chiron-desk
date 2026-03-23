# Finish L2 Transition Dialog

## TL;DR
> **Summary**: Finish the transition dialog by making groups the only first-level condition authoring unit, enabling editing of existing groups, and adding visible dirty-state feedback plus a discard-changes confirmation when a dirty dialog is closed, without changing backend contracts.
> **Deliverables**:
> - groups-only transition dialog editor state and save path
> - editable existing transition groups with stable group keys
> - dirty-tab indicators and discard-changes confirmation/reset flow for the transition dialog
> - updated route integration coverage proving save payload shape and dialog-state reset behavior
> **Effort**: Medium
> **Parallel**: NO
> **Critical Path**: 1 -> 2 -> 3 -> 4 -> 5

## Context
### Original Request
- User wants one plan at a time, scoped only to the transition dialog.
- Reported issues:
  - first-level transition conditions should always be groups, not bare fact/work-unit conditions that get auto-wrapped one-per-group
  - existing groups cannot currently be edited
  - the transition dialog has no dirty visualization on the relevant tabs

### Interview Summary
- Scope was narrowed from “finish L2” to the transition dialog only.
- Existing architecture remains the baseline; no broad methodology/runtime refactor is included here.
- Recommended defaults were accepted implicitly for planning: normalize any legacy incoming bare conditions into groups on dialog open, keep edit scope to existing groups without adding reorder/delete UX, and mirror existing touched-style dirty-tab semantics already used in fact/workflow dialogs.

### Metis Review (gaps addressed)
- Keep scope to `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`, and `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` unless a failing test proves otherwise.
- Do not touch backend contracts/repositories/services because current persistence already stores condition sets as groups-only.
- Explicitly handle legacy incoming bare conditions by normalizing them to single-condition groups on dialog open so the editor becomes groups-only internally.
- Define dirty semantics up front: match current touched-style tab indicators, not exact diff-based dirty tracking.

## Work Objectives
### Core Objective
- Deliver a decision-complete implementation path for the existing transition dialog so it only authors groups at the first level, supports editing existing groups, and visibly tracks unsaved tab changes with safe close/reset behavior.

### Deliverables
- Transition dialog state model in `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` no longer exposes first-level bare conditions for authoring.
- Existing start/completion groups open in the same group editor used for creation and save back in place.
- Transition dialog tabs show dirty indicators using the same visual pattern as `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` and `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`.
- Route integration tests prove groups-only payloads, stable group-key updates, dirty indicator visibility, and dirty reset after save/cancel reopen.

### Definition of Done (verifiable conditions with commands)
- `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` passes with new transition-dialog coverage.
- `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` asserts saved transition payloads contain only `conditionSets[].groups[]` and never rely on first-level bare conditions.
- `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` proves an existing group can be opened, edited, saved, and updated in place without duplicate groups.
- `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` proves dirty indicators appear on modified transition tabs and clear after save or cancel + reopen.

### Must Have
- Groups-only first-level transition condition authoring.
- Edit support for existing groups in both start and completion phases.
- Per-tab dirty indicators for the transition dialog.
- Discard-changes confirmation/reset flow when closing a dirty transition dialog.
- Frontend-only solution unless a failing test proves otherwise.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No backend contract, router, repository, schema, or methodology-engine redesign.
- No new reorder UX, delete-group UX, nested-group UX, or broader state-machine redesign.
- No broader L2 cleanup outside the transition dialog.
- No true diff-based dirty tracking; mirror existing touched-style semantics instead.
- No conversion of this work into a shared generic condition-tree abstraction.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after on existing route integration surface, with targeted failing assertions added before each implementation slice.
- QA policy: every task includes agent-executed route-test scenarios using the existing methodology shell route integration test file.
- Evidence: `.sisyphus/evidence/task-{N}-transition-dialog.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.
> Extract shared dependencies as Wave-1 tasks for max parallelism.

Wave 1: task 1 characterization and task 2 groups-only model refactor.
Wave 2: task 3 group edit flow and task 4 dirty-state behavior.
Wave 3: task 5 regression hardening and final route verification.

### Dependency Matrix (full, all tasks)
- 1 blocks 2, 3, 4, 5
- 2 blocks 3 and partially blocks 5
- 3 blocks 5
- 4 blocks 5
- 5 blocks final verification wave only

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 2 tasks -> `unspecified-high`, `quick`
- Wave 2 -> 2 tasks -> `unspecified-high`, `quick`
- Wave 3 -> 1 task -> `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Expand transition dialog route-test coverage

  **What to do**: Extend `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` so it seeds transitions with existing start/completion groups, opens the current transition dialog through the existing route harness, and asserts against `saveStateMachineTransitionMock` (or the equivalent existing save mock in that file) using concrete grouped payload expectations. Add helper data only inside the existing route test file unless the test becomes unreadable. Make this task the characterization seam for the remaining work.
  **Must NOT do**: Do not create a new test harness, do not add backend tests, and do not change production code beyond what is required to make the new route assertions executable.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: route integration coverage must be expanded carefully without destabilizing existing methodology shell tests.
  - Skills: `[]` - no extra skill needed beyond the scoped route-test work.
  - Omitted: `test-driven-development` - not loaded here because the plan already encodes the red/green sequence explicitly.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2, 3, 4, 5 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` - existing route integration harness and transition dialog coverage live here.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` - route wiring and save mutations used by the dialog.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - current dialog state model and save path under test.
  - API/Type: `packages/contracts/src/methodology/lifecycle.ts` - canonical groups-only condition-set contract that the UI should match.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The route integration test file contains a scenario that opens a transition with existing groups and asserts the save payload uses `conditionSets[].groups[]` only.
  - [ ] The route integration test file contains a scenario that can distinguish between updating an existing group and appending a second group.
  - [ ] `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` passes after the minimal harness updates for these scenarios.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Grouped transition save payload characterization
    Tool: Bash
    Steps: Run `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"`
    Expected: The file passes and includes assertions proving transition save payloads use grouped condition sets.
    Evidence: .sisyphus/evidence/task-1-transition-dialog.txt

  Scenario: Existing group update characterization
    Tool: Bash
    Steps: Run the same route test file after adding assertions for editing an existing seeded group.
    Expected: The assertions can detect whether a group is updated in place versus duplicated.
    Evidence: .sisyphus/evidence/task-1-transition-dialog-edge.txt
  ```

  **Commit**: YES | Message: `test(web): cover grouped transition dialog flows` | Files: [`apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`]

- [x] 2. Make transition dialog first-level conditions groups-only

  **What to do**: Refactor `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` so the transition editor no longer authors top-level bare conditions. Remove the first-level `conditions` authoring path from the dialog draft model, eliminate the add-bare-condition UI/actions, and make the dialog operate on groups only. Preserve compatibility with any legacy incoming draft data by normalizing bare first-level conditions into single-condition groups when the dialog loads transition data; after load, the editor state must be groups-only. Keep save payload generation aligned with `TransitionConditionSet.groups` rather than inventing a new shape.
  **Must NOT do**: Do not change `packages/contracts`, `packages/api`, `packages/db`, or `packages/methodology-engine`; do not add delete/reorder UX; do not redesign the rest of the state-machine tab.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: the change touches the main transition editor state model and must preserve existing route wiring.
  - Skills: `[]` - the task is local to the current frontend surface.
  - Omitted: `vercel-composition-patterns` - not needed because this is behavior correction, not component API redesign.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 3, 5 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - `GateDraft`, `toGateDraft`, `toConditionSet`, and gate add/update helpers currently allow bare conditions.
  - Pattern: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` - route save callback maps dialog output into mutation input.
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` - route assertions added in task 1 must drive the groups-only behavior.
  - API/Type: `packages/contracts/src/methodology/lifecycle.ts` - condition sets already persist groups-only and should remain untouched.

  **Acceptance Criteria** (agent-executable only):
  - [ ] The transition dialog no longer exposes first-level fact/work-unit condition add actions outside the group editor.
  - [ ] Loading a transition with legacy top-level bare conditions results in editable single-condition groups in the dialog instead of lost data.
  - [ ] Saving the dialog from the route integration test continues to produce `conditionSets[].groups[]` payloads without backend changes.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Groups-only transition authoring
    Tool: Bash
    Steps: Run `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"`
    Expected: Transition dialog tests pass with assertions that only groups are authored and saved.
    Evidence: .sisyphus/evidence/task-2-transition-dialog.txt

  Scenario: Legacy bare-condition normalization
    Tool: Bash
    Steps: Run the same route test file with a fixture that seeds a transition containing a legacy bare first-level condition.
    Expected: The test proves the dialog loads that condition as a single editable group and saves it back as a group.
    Evidence: .sisyphus/evidence/task-2-transition-dialog-edge.txt
  ```

  **Commit**: YES | Message: `fix(web): make transition dialog groups-only` | Files: [`apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`]

- [x] 3. Reuse the group editor for editing existing groups

  **What to do**: Extend the existing group editor flow in `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` so it supports both create and edit modes. Existing start/completion group summary cards must open the editor prefilled with that group’s mode and conditions. Saving an edited group must replace the original group in place, preserve the original group key, and avoid appending duplicates. Apply the same behavior to both start and completion phases.
  **Must NOT do**: Do not add reorder controls, delete-group controls, or nested editing flows; do not change unrelated transition-card layout beyond what is needed to expose an edit affordance.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: once task 2 is done, this is a focused behavior change on the existing group editor path.
  - Skills: `[]` - no extra skill needed.
  - Omitted: `brainstorming` - design decisions are already frozen in this plan.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 1, 2

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - current `groupEditor` state and save path only support creation; existing group cards are read-only summaries.
  - Pattern: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` - use seeded start/completion groups to prove edit behavior and key preservation.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - existing edit dialog pattern for prefilled data/reset behavior.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Clicking an existing start-phase group opens the group editor with that group’s current mode and conditions prefilled.
  - [ ] Clicking an existing completion-phase group behaves the same way.
  - [ ] Saving an edited group preserves the group key and updates that group in place rather than creating a second group.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Edit existing start group in place
    Tool: Bash
    Steps: Run `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"`
    Expected: The route test proves an existing start group opens prefilled, saves in place, and preserves its key.
    Evidence: .sisyphus/evidence/task-3-transition-dialog.txt

  Scenario: Edit existing completion group without duplication
    Tool: Bash
    Steps: Run the same route test file with a seeded completion group edit scenario.
    Expected: The saved payload updates one completion group instead of appending a duplicate.
    Evidence: .sisyphus/evidence/task-3-transition-dialog-edge.txt
  ```

  **Commit**: YES | Message: `fix(web): allow editing transition groups` | Files: [`apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`]

- [x] 4. Add dirty indicators to transition dialog tabs

  **What to do**: Add touched-style dirty tracking to the transition dialog in `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` for the `Contract`, `Start`, `Completion`, and `Bindings` tabs. Use the same visible indicator convention already present in `FactsTab.tsx` and `WorkflowsTab.tsx` so modified tabs show an inline marker while the dialog is open. The dirty flags must be set by tab-specific edits, reset after successful save, and reinitialized when the dialog opens on a different transition.
  **Must NOT do**: Do not switch to diff-based dirty detection, do not add global page-level dirty banners, and do not change the visual language beyond reusing the existing tab-indicator pattern.

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: this is a focused UI-state enhancement following an existing local pattern.
  - Skills: `[]` - no extra skill needed.
  - Omitted: `web-design-guidelines` - this is not a design audit; it is consistency with existing in-repo patterns.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5 | Blocked By: 1

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - transition editor tab buttons and edit handlers live here.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - use its per-tab dirty indicators and reset behavior as the direct UI pattern.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` - additional dirty-flag pattern for multi-tab dialogs.
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` - extend this file to assert dirty markers for concrete transition-tab edits.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Editing contract fields marks only the `Contract` tab dirty.
  - [ ] Editing start/completion group data marks the corresponding `Start` or `Completion` tab dirty.
  - [ ] Editing workflow bindings marks the `Bindings` tab dirty.
  - [ ] Saving clears all transition-dialog dirty indicators.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Dirty indicators appear on modified tabs
    Tool: Bash
    Steps: Run `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"`
    Expected: The route test proves tab markers appear after editing Contract, Start, Completion, and Bindings content.
    Evidence: .sisyphus/evidence/task-4-transition-dialog.txt

  Scenario: Dirty indicators clear after save
    Tool: Bash
    Steps: Run the same route test file with assertions that save resets all transition-dialog dirty flags.
    Expected: Dirty indicators are absent after a successful save in the same dialog session.
    Evidence: .sisyphus/evidence/task-4-transition-dialog-edge.txt
  ```

  **Commit**: YES | Message: `fix(web): add transition dialog dirty indicators` | Files: [`apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`]

- [x] 5. Add dirty close protection and regression hardening

  **What to do**: Finish the transition dialog behavior by adding discard-confirmation/reset handling for dirty transition edits and by hardening the route integration tests around cancel + reopen behavior. Closing a dirty transition dialog must not silently discard changes; canceling and reopening must reset dirty markers and transient editor state so a stale group editor or stale dirty flag does not leak into the next session. Keep this scoped to the transition dialog and its route tests.
  **Must NOT do**: Do not invent broader unsaved-changes handling for the whole work-unit page, and do not add unrelated route-state cleanup.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: this is the final behavioral hardening step and it must verify interaction between dialog state, route wiring, and test harness behavior.
  - Skills: `[]` - no extra skill needed.
  - Omitted: `systematic-debugging` - the plan already constrains the regression surface and test seam.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: none | Blocked By: 1, 2, 3, 4

  **References** (executor has NO interview context - be exhaustive):
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` - transition dialog close/reset behavior and group editor transient state live here.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` - discard-confirmation and close/reset pattern to mirror.
  - Pattern: `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` - touched-style dirty reset after close/save.
  - Test: `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` - final regression file proving cancel/save/reset behavior with concrete transition data.
  - Route: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` - keep save and invalidation wiring stable while closing/reopening the dialog.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Attempting to close the transition dialog after edits triggers a discard-confirmation flow rather than silently losing changes.
  - [ ] Canceling out of the dirty dialog and reopening the same transition shows a clean editor state based on persisted transition data.
  - [ ] Route integration tests prove no stale dirty markers or stale group-editor data leak across dialog sessions.
  - [ ] `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"` passes as the final regression gate for the whole transition-dialog plan.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Dirty close shows discard protection
    Tool: Bash
    Steps: Run `bun test "apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx"`
    Expected: The route test proves closing a dirty transition dialog opens discard protection instead of silently closing.
    Evidence: .sisyphus/evidence/task-5-transition-dialog.txt

  Scenario: Cancel and reopen resets dialog state
    Tool: Bash
    Steps: Run the same route test file with a scenario that edits a transition, cancels, reopens, and inspects tab markers and seeded group values.
    Expected: Dirty markers are cleared and the reopened dialog reflects persisted values rather than abandoned edits.
    Evidence: .sisyphus/evidence/task-5-transition-dialog-edge.txt
  ```

  **Commit**: YES | Message: `test(web): harden transition dialog reset flows` | Files: [`apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`, `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`, `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`]

## Final Verification Wave (MANDATORY - after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit - oracle
- [ ] F2. Code Quality Review - unspecified-high
- [ ] F3. Real Manual QA - unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check - deep

## Commit Strategy
- `test: cover grouped transition dialog editing`
- `fix: make transition dialog first-level conditions groups-only`
- `fix: allow editing existing transition groups`
- `fix: add transition dialog dirty tab indicators`
- `test: harden transition dialog reset flows`

## Success Criteria
- Transition dialog no longer offers first-level fact/work-unit conditions outside groups.
- Existing transition groups are editable in place and preserve their group identity.
- Dirty indicators appear on modified transition tabs and clear after save or after cancel + reopen.
- Attempting to exit a dirty transition dialog shows a discard-changes dialog instead of silently closing.
- Route integration coverage proves the save payload stays groups-only and regressions are caught without backend changes.
