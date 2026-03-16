# Work Unit Detail Tabs

This document defines the stable implementation-facing spec for the Work Unit Detail Tabs page, formerly referred to as Work Unit Graph Detail (L2).

Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict. This file is the canonical surface spec for the Work Unit Detail Tabs page.

## Scope

- This is the stable page-level spec for the Work Unit Detail Tabs page.
- It defines the stable tab set, selected-work-unit context, Overview tab shape, Workflows tab shape, and the bounds between tab surfaces.
- Detailed Artifact Slots and State Machine behavior is owned by their dedicated stable docs.

## Page purpose

- Give the selected work unit one coherent L2 surface for topology, durable contracts, workflows, lifecycle, and artifact design-time configuration.
- Keep one shared selected-work-unit context while letting each tab own a narrower editing concern.
- Satisfy Story 3.2 expectations that tab switching remains deterministic and findings treatment stays consistent across rows, inspectors, and dialogs.

## Locked tab set

The Work Unit Graph Detail (L2) tab set is:

- `Overview`
- `Facts`
- `Workflows`
- `State Machine`
- `Artifact Slots`

Tab order is stable. Switching tabs must preserve the selected work-unit context.

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOWS                                                                      [+ Add Workflow] │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Summary: [Total: 6] [Bound: 4] [Unbound: 2] [⚠1]                                          │
│ [ Search workflows... ] [Filter: bound] [Filter: findings]                                │
│                                                                                            │
│ Workflow                 Binding Summary                  Findings       Actions            │
│ generate-context         ready -> context-ready           ✓              [Open Workflow Editor] │
│ draft-story              context-ready -> drafted         ⚠1             [Open Workflow Editor] │
│ review-story             drafted -> approved              ✓              [Open Workflow Editor] │
│                                                                                            │
│ Row expand:                                                                                │
│ - description                                                                              │
│ - bound transitions                                                                        │
│ - data channels summary                                                                    │
│ - findings                                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Route and context model

- L2 is entered from Work Units (L1) through a selected work-unit context.
- The selected work unit is the persistent anchor for all L2 tabs.
- Tab switches do not change the selected work unit.
- Empty, loading, and error states must preserve work-unit identity context whenever practical.

## Overview tab

The Overview tab exists to summarize the selected work unit and route the user into deeper editing areas.

Locked Overview sections:

- focused mini-graph with direct inbound and outbound dependencies
- dependency summary counts plus link-type badges
- artifact slots summary with `Manage artifact slots`
- core summary chips for facts, workflows, states, transitions, and findings
- quick actions: `Open details`, `Open Relationship View`, `Add fact`, `Add workflow`

The Overview tab is design-time only. Runtime execution wording does not belong here.

## Workflows tab

The Workflows tab is a list-first overview for workflows under the selected work unit.

Locked Workflows tab shape:

- page-level `+ Add Workflow`
- summary strip for total, bound, unbound, and findings counts
- searchable and filterable workflow rows
- accordion-style row expansion for concise context
- primary deep-edit path: `Open Workflow Editor`

`Bound` means a workflow is linked to one or more lifecycle transitions.

`Unbound` means the workflow exists in the work-unit catalog but has no transition binding yet.

Expanded row content should include:

- description
- bound transitions
- data-channel summary
- findings
- actions to open deep editing or diagnostics

## Facts tab context

- The Facts tab owns work-unit-scope fact contracts for `self.facts.*`.
- It must stay aligned with Methodology Facts semantics for type, validation, and cardinality.
- Temporary workflow-local values remain `context.*` and are not promoted here by default.
- Selector, findings, and save behavior should follow the shared docs already extracted in Task 3.

## Boundaries between tabs

- `Overview` summarizes and routes. It does not become a full editor for other tabs.
- `Workflows` owns workflow catalog context and routing into the Workflow Editor shell.
- `Facts` owns durable work-unit fact contracts.
- `State Machine` owns lifecycle states, transitions, gate policy, and workflow bindings.
- `Artifact Slots` owns design-time artifact-slot contracts and slot-owned templates.

## Diagnostics and readiness

- Findings treatment is shared across tabs and must follow `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`.
- Blocking vs non-blocking semantics must remain consistent when a row, tab, or dialog surfaces the same issue.
- Tab badges, summary strips, and row counts may expose readiness state, but they do not replace the main findings surfaces.

## Cross-references

- Use `docs/architecture/methodology-pages/work-units/overview.md` for L1 topology and selection entry behavior.
- Use `docs/architecture/methodology-pages/workflow-editor/shell.md` for deep workflow graph editing.
- Use `docs/architecture/methodology-pages/artifact-slots-design-time.md` for Artifact Slots tab authority.
- Use `docs/architecture/methodology-pages/state-machine-tab.md` for State Machine tab authority.
- Use `docs/architecture/methodology-pages/methodology-facts.md` for the methodology-level fact authoring model that the L2 Facts tab should stay aligned with.
