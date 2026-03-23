# Decisions - Finish L2 Transition Dialog

## Architectural Decisions
1. **Groups-only authoring**: First-level conditions must always be groups, never bare conditions
2. **Legacy normalization**: Convert incoming bare conditions to single-condition groups on dialog open
3. **Touched-style dirty tracking**: Use existing pattern from FactsTab/WorkflowsTab, not diff-based
4. **In-place editing**: Edit existing groups without creating duplicates, preserve group keys
5. **Discard confirmation**: Mirror existing pattern when closing dirty dialog

## Scope Boundaries
- Only modify StateMachineTab.tsx and route integration test
- No backend contract changes
- No reorder/delete UX
- No broader L2 cleanup

## Task 1 Test Decisions (2026-03-23)
- Added characterization tests directly in `shell-routes.integration.test.tsx` (no new harness files).
- Seeded existing groups via transition list mock overrides instead of altering global fixture defaults.
- Kept assertions payload-oriented (`conditionSets[].groups[]`) and key-preservation-oriented to detect accidental group duplication on edit saves.

## Task 2 Decisions (2026-03-23)
- Removed `GateDraft.conditions` and all first-level bare-condition mutation/render paths from `StateMachineTab.tsx`.
- Kept `Add Group` and `Start/Completion Groups` as the only condition authoring/visibility surfaces in the transition dialog.
- Updated integration expectations to verify Start/Completion tabs no longer expose `Add Fact Condition` / `Add Work Unit Condition` controls.

## Task 3 Decisions (2026-03-23)
- Extended `groupEditor` with `groupKey` sentinel (`null` for create, string for edit) instead of introducing a separate dialog state machine.
- Used clickable summary cards as edit entrypoints for both phases, with phase-specific ARIA labels (`Edit Start Group N`, `Edit Completion Group N`) to keep UX minimal while improving accessibility/testability.
- Kept a single `saveGroupEditor` function with explicit create-vs-edit branching so edit saves replace by key in place and preserve group identity.

## Task 5 Decisions (2026-03-23)
- Added a dedicated `transitionDiscardOpen` state for transition dialog unsaved-change confirmation, instead of piggybacking on other dialogs.
- Centralized transition teardown in `closeTransitionDialog()` and reused it for both explicit discard and post-save close to guarantee consistent cleanup.
- Wired transition dialog close requests through `requestCloseTransitionDialog()` from both Cancel button and `Dialog.onOpenChange` close path to prevent accidental silent discard.
