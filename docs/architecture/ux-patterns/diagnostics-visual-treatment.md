# Diagnostics Visual Treatment

This document defines the shared diagnostics UX treatment reused by Epic 3 design-time surfaces, grounded in recurring findings, error, warning, inline issue, and dirty-state patterns from the March 11 baseline and reconciled workflow-engine contracts.

## Scope

- This is the shared visual and interaction treatment for diagnostics shown in step dialogs and related design-time editors.
- It covers aggregate findings, warnings, blocking errors, inline issues, and dirty-state signaling.
- It does not replace step-specific validation rules or business logic.

## Treatment goals

- Keep diagnostics visible without overwhelming the authoring surface.
- Distinguish blocking errors from warnings and informational readiness cues.
- Keep aggregate findings and inline issues synchronized.
- Preserve confidence about whether the current draft is dirty, valid, and saveable.

## Severity model

- `error` marks a blocking issue that prevents valid save or deterministic execution.
- `warning` marks a non-blocking issue, risky configuration, or incomplete but still storable draft when that state is allowed.
- `info` marks helpful context, preview state, or non-problem readiness guidance.
- `dirty` is not a validation severity. It is the state that the current draft differs from the last saved version.

## Findings summary pattern

- Each editor surface with multi-field validation should expose a findings area or equivalent summary region.
- Findings summarize the current set of blocking errors, warnings, and notable readiness issues.
- Summary entries should point back to the affected field, row, tab, or nested editor whenever possible.
- Findings stay visible across tab switches so authors do not lose global context.

## Inline issue pattern

- Inline issues appear adjacent to the affected control, row, or builder node.
- Inline issues use the same severity semantics as the findings summary.
- When a single problem appears in both places, the wording should stay consistent enough that the relationship is obvious.
- Fixing the underlying field clears both the inline issue and the corresponding summary item in the same validation pass.

## Dirty-state pattern

- Dirty-state indication remains visible while there are unsaved edits.
- Dirty state is shown in persistent shell chrome such as a dialog header, fixed action area, or equivalent always-visible location.
- Dirty state survives tab switches and stacked dialog navigation.
- Dirty state clears only on successful save or explicit discard.
- Dirty state alone does not imply an error. A draft can be dirty and valid, or dirty and invalid.

## Readiness and save behavior

- Blocking errors keep the step in an invalid state and must be reflected in both summary and inline treatment.
- Warnings may keep save enabled when the step contract allows a non-blocking draft.
- If save is blocked, the reason must be visible through the current diagnostics treatment rather than hidden behind disabled controls with no explanation.
- Diagnostics should update immediately after edits that affect type, cardinality, path selection, dependency graphs, or required fields.

## Interaction expectations

- Diagnostics remain synchronized across parent dialogs and stacked child dialogs.
- Severity treatment should remain stable across form, branch, agent, invoke, action, display, and methodology design-time editors.
- Row expanders, summary chips, or tab badges may reflect diagnostic counts, but they do not replace the main findings and inline issue treatment.

## Cross-references

- Use `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` for save or cancel expectations and cross-dialog validation timing.
- Use `docs/architecture/methodology-pages/workflow-editor/form-step.md`, `docs/architecture/methodology-pages/workflow-editor/action-step.md`, `docs/architecture/methodology-pages/workflow-editor/branch-step.md`, and `docs/architecture/methodology-pages/workflow-editor/display-step.md` for promoted examples of findings plus inline issues on structured editors.
