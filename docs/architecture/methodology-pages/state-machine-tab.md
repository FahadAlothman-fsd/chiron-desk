# State Machine tab

This document defines the stable implementation-facing spec for the State Machine tab.

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the State Machine tab.

## Scope

- This is the stable design-time spec for the State Machine tab under Work Unit Graph Detail (L2).
- It defines lifecycle-state and transition authoring, gate-policy ownership, workflow-binding visibility, and readiness semantics.
- It does not redefine branch-step or workflow-editor contracts used inside bound workflows.

## Purpose

- Define methodology lifecycle states and transitions for the selected work unit.
- Make gate policy, dependency requirements, and workflow binding readiness visible in one deterministic surface.
- Keep lifecycle authority separate from runtime status projection.

## Locked tab shape

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ STATE MACHINE (TRANSITIONS)                                                   [+ Add State] │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Summary: [States: 5] [Transitions: 7] [Bound Workflows: 6] [⛔1 ⚠2 ℹ1]                    │
│ [ Search transitions... ] [Filter: from-state] [Filter: to-state] [Filter: bound/unbound] │
│                                                                                            │
│ Transition                 Gate Mode   Workflow Binding          Findings   Actions         │
│ draft -> ready             all         setup-intake              ✓          [Edit]          │
│ ready -> context-ready     all         generate-context          ⚠1         [Edit]          │
│ context-ready -> done      any         publish-context           ⛔1         [Edit]          │
│                                                                                            │
│ Row expand:                                                                                │
│ - gate condition set preview (all/any + nested groups)                                    │
│ - dependency/link requirements used by the gate                                            │
│ - bound workflow references and readiness notes                                            │
│ - diagnostics with direct fix links                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

- page title uses `STATE MACHINE (TRANSITIONS)`
- page-level actions: `+ Add State` and `+ Add Transition`
- summary strip for states, transitions, bound workflows, and findings
- searchable and filterable transitions list
- transition rows with gate mode, workflow binding, findings, and edit action
- row expansion for gate preview, dependency requirements, workflow readiness notes, and diagnostics

## Transition authoring model

Each transition row represents canonical lifecycle policy, not an execution log.

The State Machine tab must surface:

- `from_state` and `to_state`
- root gate mode such as `all` or `any`
- bound workflow references
- readiness findings for unbound or invalid transition config

Gate-expression previews may show nested groups, but persisted structure must stay deterministic and versioned.

## Transition-creation entry point

- `+ Add Transition` is the explicit transition-creation entry point for this surface.
- It is page-level so operators can author a transition directly without first editing an existing row.
- The create flow opens the same stacked transition editor used for transition edits, starting at `Level 1 - Basics` with `from_state` and `to_state` required.
- `+ Add State` remains the state-creation entry point and does not imply automatic transition creation.

## Gate-policy rules

- Transition gate policy authority lives in canonical transition condition sets.
- Required links, dependency conditions, and blocking semantics are authored here through transition policy, not through dependency-definition strength taxonomies.
- Nested condition groups are supported, with bounded UI depth for authoring.
- Editing gate policy must revalidate dependent workflow bindings and dependency references immediately.

## Workflow-binding rules

- Workflow bindings are explicit per transition.
- Unbound transitions surface readiness findings.
- The binding surface shows current workflow references plus readiness notes, not a hidden implicit binding state.
- Bound workflows remain owned by the Workflows tab and Workflow Editor shell for definition-level editing.

## Stacked editor model

The State Machine tab uses stacked transition editing:

- `Level 1 - Basics`: `from_state`, `to_state`, label, description
- `Level 2 - Gate policy`: root mode, condition groups, required links, blocking semantics
- `Level 3 - Workflow binding`: bind and unbind workflow refs, readiness metadata

## Validation and schema recovery

- State and transition configs remain typed and versioned.
- Save and publish validation reject incomplete or drifting gate schemas.
- No fallback to extension blobs is allowed for transition, gate, or binding authority.
- Severity treatment follows `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.

## Component responsibilities

### Summary strip

- Show lifecycle readiness at a glance.

### Transition rows and expansion

- Provide scan-friendly transition data and a concise gate preview.
- Surface impacted dependency and workflow issues before deep editing.

### Transition editor

- Own gate-policy editing, binding editing, and impact validation.

## Cross-references

- Use `docs/architecture/methodology-pages/work-units/detail-tabs.md` for the parent L2 tab model.
- Use `docs/architecture/methodology-pages/dependency-definitions.md` for methodology-level dependency semantics.
- Use `docs/architecture/ux-patterns/rich-selectors.md` for work-unit and link-type selector behavior.
- Use `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` for findings treatment.
