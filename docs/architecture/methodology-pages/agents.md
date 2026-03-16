# Agents Page

This document defines the stable implementation-facing spec for the Agents Page.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the methodology Agents page.

## Scope

- This is the stable design-time page spec for the Agents page.
- It defines the card-first catalog, dialog CRUD, prompt-field scope, system-owned provider and MCP authority, and variable insertion expectations.
- It does not define runtime execution UX or provider-registry implementation details.

## Page purpose

- Give methodology authors one catalog surface for defining reusable agents before runtime unlock.
- Keep agent discovery scan-friendly through cards, while pushing deep edits into dialogs.
- Preserve clear boundaries between methodology-owned agent intent and system-owned runtime provider catalogs.

## Locked page shape

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AGENTS                                                                       [+ Add Agent] │
│ Tabs: [Catalog] [Contracts] [Diagnostics]                                                  │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search agents... ] [Filter: role] [Sort: updated]                                        │
│                                                                                            │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐             │
│ │ Avatar               │  │ Avatar               │  │ Avatar               │             │
│ │ Context Builder      │  │ Story Drafter        │  │ Reviewer             │             │
│ │ role: researcher     │  │ role: writer         │  │ role: critic         │             │
│ │ ✓                    │  │ ⚠1                   │  │ ⛔1                   │             │
│ │ [Open details][Edit] │  │ [Open details][Edit] │  │ [Open details][Edit] │             │
│ └──────────────────────┘  └──────────────────────┘  └──────────────────────┘             │
│                                                                                            │
│ Create/Edit Agent Dialog                                                                  │
│ [Metadata] [Prompts] [Diagnostics]                                          [Cancel][Save]│
│ Name: ____________   Key: ____________   Role: ____________                                │
│ System Prompt: ...                                                                         │
│ Instructions: ...                                                                          │
│ Findings: ...                                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- card-first catalog grid, not a plain table
- page-level `+ Add Agent` action outside the grid
- catalog utilities for search, filter, and sort
- tabs for `Catalog`, `Contracts`, and `Diagnostics`

Each card shows:

- avatar
- display name and key
- role
- findings summary
- primary actions: `Open details` and `Edit`

## Dialog-first CRUD

Create, edit, and delete remain dialog-driven in this phase.

The dialog owns:

- metadata: name, key, role, avatar
- dual description or guidance fields for `Human` and `Agent`
- prompt fields: `system prompt` and `instructions`
- findings area and save blocking

There is no full dedicated Agent Details page in this lock.

## Prompt authoring rules

- Prompt authoring fields are explicit and durable: `system prompt` and `instructions`.
- Required metadata and prompt essentials are validated before save.
- Prompt editing stays design-time focused. It does not expose runtime chat controls or execution transcripts.

## System-level authority

- Providers, models, and MCP server catalogs are system-level authority.
- Methodology agents select from system-provided options. They do not define provider catalogs or MCP catalogs ad hoc.
- Any future registry or runtime resolution work must preserve this ownership split.

## Variable insertion UX

- Prompt fields support structured variable insertion rather than free-form unresolved placeholders.
- Variable insertion should use the shared canonical path model in `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`.
- Selector and picker behavior should use `docs/architecture/ux-patterns/rich-selectors.md` when hierarchy or metadata browsing is needed.
- Unknown or incompatible variables surface immediate findings and field-level errors.

Common categories exposed to authors are:

- `project.*`
- `self.*`
- `context.*`
- `step_objectives`

## Diagnostics and readiness

- Cards show compact per-agent findings summaries.
- The dialog shows full actionable findings for the current agent.
- Field-level validation and findings summaries must stay synchronized.
- Severity treatment follows `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.
- Errors block save when required contract validity is missing.

## Component responsibilities

### Agent card grid

- Support fast identity and role scanning.
- Keep `Open details` and `Edit` distinct.

### Dialog editor

- Own agent metadata, prompt fields, variable insertion, and readiness validation.
- Keep deep authoring in the dialog instead of expanding cards into full editors.

### Diagnostics surfaces

- Show summary state in the grid.
- Show actionable details in the dialog.

## Out of scope

- dedicated agent runtime page
- live execution configuration UX
- advanced prompt-composition tooling beyond the locked core fields

## Cross-references

- Use `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` for canonical variable-path semantics.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for structured picker behavior.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for findings treatment.
- Use `docs/architecture/methodology-pages/workflow-editor/agent-step.md` for workflow-step agent configuration, which is separate from this page.
