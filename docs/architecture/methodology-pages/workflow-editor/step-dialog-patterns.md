# Step Dialog Patterns

This document extracts the shared step-dialog rules reused across Epic 3 methodology Workflow Editor authoring, grounded in `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` sections 6.4 through 6.10 and the reconciled step docs under `docs/architecture/methodology-pages/workflow-editor/`.

## Scope

- This is the shared interaction contract for step-edit dialogs such as form, branch, agent, invoke, display, and action.
- It defines tab conventions, validation timing, progressive unlock behavior, diagnostics presentation, and save or cancel expectations.
- It does not replace step-specific tab content or stored config schemas.

## Pattern goals

- Keep step authoring predictable across step families.
- Preserve focus in the base dialog while allowing advanced editing flows.
- Make readiness, validation, and unlock state visible before save.
- Keep save and discard behavior deterministic.

## Dialog shell conventions

- Every step editor uses one primary modal or panel shell with a stable tab row.
- Core overview metadata belongs in an `Overview` tab when the step has multi-tab editing.
- Step-specific tabs follow the contract for that step and should be named for the authored surface, not for implementation internals.
- The shell keeps `Cancel` and `Save` actions persistent and keeps unsaved-state visibility in the header or equivalent fixed chrome.

## Tab conventions

- Tabs group related concerns into durable authoring areas such as `Overview`, `Fields`, `Conditions`, `Instructions`, `Actions`, `Execution`, `Content`, `Guidance`, or `Navigation & Guidance`.
- Cross-cutting guidance content belongs in the final tab or final combined tab for that step family.
- Switching tabs must not discard in-progress edits.
- Summary chips or compact previews may appear in `Overview` to expose authored state without duplicating full editing controls.

## Stacked dialog pattern

- Advanced builders and pickers open in stacked dialogs so the base step dialog stays focused.
- Use stacked dialogs for rich selector flows, nested condition editing, tab-content editing, action editing, and similar multi-level authoring tasks.
- Create and edit should reuse the same child dialog shell with empty vs prefilled state.
- Destructive row-level actions such as delete use explicit confirmation, not implicit close behavior.

## Validation timing

- Validation runs during authoring, not only on final save.
- Findings and inline issues update as dependent fields change, especially after type, path, cardinality, operator, or dependency edits.
- Progressive incompatibilities should surface immediately when a change invalidates related configuration.
- Save remains available only when the current contract reaches a valid state, or the dialog must clearly explain why save is blocked.

## Progressive unlock behavior

- Progressive unlock is deterministic and must be visible anywhere prerequisites gate later actions or affordances.
- Agent and action surfaces expose unlock state from declared dependencies such as `requiredVariables`, `requires`, or equivalent contract fields.
- Locked rows remain visible with reason text or equivalent diagnostics, rather than disappearing without explanation.
- Unlock state is a contract effect, not a hidden implementation detail.

## Diagnostics behavior

- Step dialogs show both aggregate findings and inline issues for the currently edited surface.
- Findings summarize blocking errors, warnings, and notable readiness issues across the step.
- Inline issues anchor validation feedback near the affected field, row, or builder node.
- Diagnostics stay synchronized across tabs and stacked dialogs so a fix in one place updates the shared readiness state.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for visual treatment and severity conventions.

## Save and cancel expectations

- Unsaved edits persist across tab switches until save or explicit discard.
- Dirty-state indication remains visible while there are unsaved edits.
- Dirty state clears only on successful save or explicit discard.
- `Cancel` closes without applying changes that have not been saved.
- `Save` commits the current valid draft and closes or returns to the parent shell according to the local flow.

## Cross-references

- Use `docs/architecture/methodology-pages/workflow-editor/form-step.md`, `docs/architecture/methodology-pages/workflow-editor/agent-step.md`, `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`, `docs/architecture/methodology-pages/workflow-editor/action-step.md`, `docs/architecture/methodology-pages/workflow-editor/branch-step.md`, and `docs/architecture/methodology-pages/workflow-editor/display-step.md` for promoted step-specific tab inventories and schema details.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for hierarchical picker behavior.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for findings, inline issue, warning, error, and dirty-state treatment.
