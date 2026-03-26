# Epic 3 Authority

**Status:** Active routing authority
**Last Updated:** 2026-03-26

This document defines which Epic 3 docs are canonical now, which active-path docs are stale, and how historical design material should be treated after promotion.

## Purpose

Use this file to answer three questions fast:

- which document is canonical for a given Epic 3 surface
- which surfaces still depend on historical rationale or contextual-only material
- which docs are stale, contextual only, or historical only

## Precedence Rules

When Epic 3 documents disagree, use this order:

1. Stable surface-specific docs under `docs/architecture/`.
2. `docs/architecture/epic-3-authority.md` for routing, status, and precedence.
3. Explicitly referenced cross-cutting docs and approved planning artifacts that this file still lists as active support.
4. Historical plans and archive material.

If a lower-priority document conflicts with a higher-priority document, the higher-priority document wins and the lower-priority document must be updated, relabeled, or treated as stale.

## March 11 Plan Rule

`docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` is the preserved historical baseline and design rationale source for Epic 3.

Use it to understand why the surfaces were locked the way they were, or to recover detail that has not yet been promoted into stable docs. Do not use it as the normal implementation target when a stable `docs/architecture/...` replacement exists.

## Current Canonical Docs

- `docs/architecture/epic-3-authority.md` - routing authority, precedence, promotion state, stale-doc handling
- `docs/architecture/chiron-module-structure.md` - canonical module boundaries, step taxonomy, execution model
- `docs/architecture/methodology-pages/workflow-editor/form-step.md` - current `form.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md` - current `agent.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md` - current `invoke.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/action-step.md` - current `action.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/branch-step.md` - current `branch.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/display-step.md` - current `display.v1` authority
- `docs/architecture/methodology-pages/workflow-editor/shell.md` - canonical Workflow Editor page behavior inside the methodology view
- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md` - shared variable-path and target semantics
- `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md` - shared step-dialog interaction rules
- `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` - shared diagnostics severity and dirty-state treatment
- `docs/architecture/ux-patterns/rich-selectors.md` - shared selector interaction patterns
- `docs/architecture/methodology-pages/work-units/overview.md` - canonical Work Units (L1) page behavior
- `docs/architecture/methodology-pages/versions.md` - canonical methodology Versions ledger and version-entry behavior
- `docs/architecture/methodology-pages/methodology-facts.md` - canonical Methodology Facts page behavior
- `docs/architecture/methodology-pages/agents.md` - canonical methodology Agents page behavior
- `docs/architecture/methodology-pages/work-units/detail-tabs.md` - canonical Work Unit Graph Detail (L2) tab framework and Facts-tab routing context
- `docs/architecture/methodology-pages/artifact-slots-design-time.md` - canonical Artifact Slots tab behavior
- `docs/architecture/methodology-pages/state-machine-tab.md` - canonical State Machine tab behavior
- `docs/architecture/methodology-pages/dependency-definitions.md` - canonical Dependency Type Definitions page behavior
- `docs/architecture/methodology-bmad-setup-mapping.md` - frozen Slice-A setup mapping authority for L1/L2 seeding
- `docs/architecture/methodology-bmad-brainstorming-mapping.md` - frozen Slice-A brainstorming mapping authority for L1/L2 seeding
- `docs/architecture/methodology-bmad-research-mapping.md` - frozen Slice-A research mapping authority for L1/L2 seeding
- `docs/architecture/system-pages/harnesses/index.md` - canonical system-owned Harnesses page behavior and Story 3.6 page authority
- `docs/architecture/modules/ax-engine.md` - AX policy and phase-1 architecture authority, with repo reality still scaffold-only and docs ahead of code
- `docs/architecture/modules/provider-registry.md` - provider/model/harness-family authority
- `docs/plans/2026-03-09-methodology-shell-information-architecture-design.md` - active supporting authority for shell IA ownership and remaining system-page gaps
- `_bmad-output/planning-artifacts/epic-3-design-time-first-reassessment-2026-03-13.md` - sequencing and readiness ordering
- `_bmad-output/planning-artifacts/epics.md` - active planning and sequencing input, including story-level acceptance criteria, but not surface-contract authority

## Missing Durable Docs

No missing durable docs remain for the promoted Epic 3 surface set completed through Tasks 1-7.

Slice-A methodology seeding authority now includes durable mapping coverage for `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH` at L1/L2. Workflow steps and workflow edges remain deferred and are not part of this documentation lock.

Future refinements may still split narrower references out of the current canonicals, but current implementation should route through the stable `docs/architecture/...` docs listed above rather than falling back to the March 11 plan.

## Stale Or Non-Canonical Docs

- `docs/architecture/module-inventory.md` - current for package reality and inventory, but not canonical for implementation-readiness decisions
- `docs/architecture/project-context-only-bmad-mapping-draft.md` - contextual BMAD-source-only draft with outdated step shapes; not current Epic 3 authority
- `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md` - superseded historical invoke pattern; do not use as current implementation authority
- `docs/architecture/workflow-engine/agent-continuation-contract.md` - contextual continuation draft; not canonical until reconciled with promoted `agent.v1` and `invoke.v1`
- `docs/architecture/bmad-e2e-rigorous-example.md` - historical walkthrough with pre-lock invoke examples; useful for lineage only
- `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-resolved-v1-week6.md` - historical context only
- `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-stubs-v1-week6.md` - historical context only

## Promotion Status By Surface

| Surface | Promotion status | Canonical now | Notes |
| --- | --- | --- | --- |
| Form | Promoted | `docs/architecture/methodology-pages/workflow-editor/form-step.md` | March 11 plan is historical rationale for this surface. |
| Agent | Promoted with downstream dependency caution | `docs/architecture/methodology-pages/workflow-editor/agent-step.md` | Harness selection now routes through the system Harnesses page and provider-registry policy. AX implementation is still scaffold-only. |
| Invoke | Promoted | `docs/architecture/methodology-pages/workflow-editor/invoke-step.md` | March 11 plan is historical rationale for this surface. |
| Action | Promoted with implementation caveat | `docs/architecture/methodology-pages/workflow-editor/action-step.md` | Contract is current, AX runtime implementation is not. |
| Branch | Promoted | `docs/architecture/methodology-pages/workflow-editor/branch-step.md` | March 11 plan is historical rationale for this surface. |
| Display | Promoted | `docs/architecture/methodology-pages/workflow-editor/display-step.md` | March 11 plan is historical rationale for this surface. |
| Workflow Editor | Promoted | `docs/architecture/methodology-pages/workflow-editor/shell.md` | Stable workflow-editor page behavior now lives with the methodology design-time surfaces. |
| Versions | Promoted | `docs/architecture/methodology-pages/versions.md` | Methodology-owned umbrella page that routes into version-scoped authoring surfaces. |
| Work Units Overview (formerly L1) | Promoted | `docs/architecture/methodology-pages/work-units/overview.md` | March 11 plan is historical rationale for this surface. |
| Methodology Facts | Promoted | `docs/architecture/methodology-pages/methodology-facts.md` | March 11 plan is historical rationale for this surface. |
| Agents page | Promoted | `docs/architecture/methodology-pages/agents.md` | Agent step contract remains the step-level schema authority; this page owns methodology-level authoring behavior. |
| Work Unit Detail Tabs (formerly L2) | Promoted | `docs/architecture/methodology-pages/work-units/detail-tabs.md` | This doc owns the selected-work-unit tab framework and Facts-tab routing context; specialized tabs have their own canonical docs where applicable. |
| Artifact Slots | Promoted | `docs/architecture/methodology-pages/artifact-slots-design-time.md` | March 11 plan is historical rationale for this surface. |
| State Machine | Promoted | `docs/architecture/methodology-pages/state-machine-tab.md` | March 11 plan is historical rationale for this surface. |
| Dependency Type Definitions | Promoted | `docs/architecture/methodology-pages/dependency-definitions.md` | First-class methodology page, not an L2 tab. |
| System Harnesses page | Promoted | `docs/architecture/system-pages/harnesses/index.md` | System-owned page behavior now lives in a durable spec. Use `docs/architecture/modules/provider-registry.md` for provider-registry policy authority. |
| AX | Architecture promoted, implementation not ready | `docs/architecture/modules/ax-engine.md` | Canonical AX policy is approved, including manual-first staged promotion with `mipro` and `gepa` in phase 1 and `ace` deferred, but repo reality is still scaffold-only. Refresh live `@ax-llm/ax` API assumptions before implementation. |

## Readiness Gates

Epic 3 implementation must follow these gates:

1. Use the promoted methodology Workflow Editor step docs under `docs/architecture/methodology-pages/workflow-editor/` for form, branch, agent, invoke, display, and action implementation. Do not fall back to the March 11 plan as the normal working reference for those surfaces.
2. For page-level methodology surfaces, use the promoted `docs/architecture/methodology-pages/...` docs, starting with `docs/architecture/methodology-pages/versions.md` for version-entry semantics, and the shared pattern docs before consulting the March 11 plan.
3. Treat Harnesses page behavior as specified by `docs/architecture/system-pages/harnesses/index.md`, and treat provider or model policy outcomes as specified by `docs/architecture/modules/provider-registry.md`.
4. Do not treat AX architecture docs as proof of runtime readiness. The current AX package and related runtime/schema wiring remain scaffold-only or planned.
5. Refresh live `@ax-llm/ax` APIs and examples before implementation so engineers do not code against stale library assumptions.
6. Do not use `docs/architecture/module-inventory.md` as the final authority for implementation readiness.

## Revision Protocol

When a promoted surface changes:

1. Update the stable surface-specific doc first.
2. Update this file if routing, status, or precedence changes.
3. Update planning artifacts only if sequencing or acceptance criteria changed.

When a deeper refinement or newly split surface is extracted:

1. Use the March 11 plan or March 9 shell IA doc as source material only.
2. Add the stable replacement under `docs/architecture/`.
3. Update this file so the dated plan remains historical rationale only for that surface.

## Implementation-Time Rules

- Do not cite the March 11 plan as normal implementation authority once a stable replacement exists.
- Do not let Harnesses behavior emerge only from agent-step implementation.
- Do not describe scaffold-only packages as implemented.
