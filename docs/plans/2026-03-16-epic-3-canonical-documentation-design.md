# Epic 3 Canonical Documentation Design

## Goal

Replace the March 11 design-time plan as the long-term operational source of truth with a stable architecture documentation system that can absorb implementation-driven revisions without creating new drift.

## Problem

`docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md` is still the detailed authority for large parts of Epic 3. Some of its detail has already been promoted into durable architecture docs, but many page-level surfaces, wireframes, behavior locks, and validation rules still live only in that dated plan. As a result:

- stories and planning artifacts keep pointing back to a dated plan for current implementation truth;
- some durable docs are current (`form`, `agent`, `invoke`, `action`), while others are still drifting (`branch`, `display`);
- some surfaces are known but under-specified in durable docs, especially the System Harnesses page;
- AX has current architecture/policy documentation but still needs explicit implementation-readiness caveats because the code is scaffold-only.

The repo needs a durable promotion model, not another temporary summary.

## Recommended Approach

Use a three-layer documentation model:

1. Historical design record
   - Preserve `docs/plans/2026-03-11-methodology-design-time-pages-tentative-design.md`.
   - Treat it as historical rationale, design intent, and promotion source material.
   - Add supersession notes as stable architecture docs absorb its surface areas.

2. Routing authority
   - Keep `docs/architecture/epic-3-authority.md` as the Epic 3 authority index.
   - This doc owns precedence, status, readiness gates, drift notes, and promotion state.
   - It should answer which doc is canonical for every Epic 3 surface.

3. Durable canonical references
   - Move current behavior, wireframes, tab structure, config rules, CRUD semantics, validation, and readiness logic into stable `docs/architecture/...` docs.
   - BMAD stories and future implementation docs should reference these stable paths, not the March 11 plan directly.

## Authority Rules

### Canonical roles

- Historical design record: explains why the design exists and how it was derived.
- Routing authority: defines what is canonical now, what is still being promoted, what is deferred, and what is stale.
- Durable canonical references: hold the current implementation-facing behavior and contract details.

### Precedence

For Epic 3 documentation conflicts, precedence should be:

1. Stable surface-specific docs under `docs/architecture/`
2. `docs/architecture/epic-3-authority.md`
3. Approved cross-cutting architecture docs and approved planning docs that remain explicitly referenced there
4. Historical plans and archived material

### Update discipline

- When implementation changes current behavior, update the durable canonical doc first.
- If that change affects scope/status/precedence, update `docs/architecture/epic-3-authority.md` in the same change.
- Only add or update a dated plan if design rationale or decision history also needs to be preserved.

## Promotion Targets

### Already promoted or mostly durable

- `docs/architecture/methodology-pages/workflow-editor/form-step.md`
- `docs/architecture/methodology-pages/workflow-editor/agent-step.md`
- `docs/architecture/methodology-pages/workflow-editor/invoke-step.md`
- `docs/architecture/methodology-pages/workflow-editor/action-step.md`
- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/modules/ax-engine.md`
- `docs/architecture/modules/provider-registry.md`

### Must be reconciled immediately

- `docs/architecture/methodology-pages/workflow-editor/branch-step.md`
- `docs/architecture/methodology-pages/workflow-editor/display-step.md`

These still lag the approved March 11 baseline and remain active drift sources.

### Missing durable homes that should be added

- `docs/architecture/methodology-pages/work-units/overview.md`
- `docs/architecture/methodology-pages/methodology-facts.md`
- `docs/architecture/methodology-pages/agents.md`
- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/artifact-slots-design-time.md`
- `docs/architecture/methodology-pages/state-machine-tab.md`
- `docs/architecture/methodology-pages/dependency-definitions.md`
- `docs/architecture/methodology-pages/workflow-editor/shell.md`
- `docs/architecture/system-pages/harnesses/index.md`

### Shared references that should be extracted once and reused

- `docs/architecture/methodology-pages/workflow-editor/variable-target-model.md`
- `docs/architecture/methodology-pages/workflow-editor/step-dialog-patterns.md`
- `docs/architecture/ux-patterns/diagnostics-visual-treatment.md`
- `docs/architecture/ux-patterns/rich-selectors.md`

These prevent repeated behavioral rules from being duplicated across many page specs.

## Surface Classification

### Branch and display

- March 11 baseline coverage is strong.
- Durable standalone contracts are stale.
- Promotion outcome: reconcile them into current `branch.v1` and `display.v1` authority docs.

### System Harnesses page

- IA and Epic 3 sequencing define its existence and ownership.
- Agent-step harness selection is documented.
- The dedicated system page is still under-specified.
- Promotion outcome: add a durable system-page spec before agent-step implementation depends on it.

### AX

- Architecture and policy docs are current enough to define intent.
- The codebase is still scaffold-only in the actual AX surfaces.
- External API assumptions need a fresh validation pass before coding.
- Promotion outcome: keep AX architecture docs as canonical, but label implementation readiness conservatively until the runtime, DB schema, and tooling paths exist.

## Glossary + Authority Layer

The repo still benefits from a compact glossary-oriented authority anchor, but it should not be the only durable artifact.

That doc should:

- define core terminology such as methodology, methodology version, work unit, fact, artifact slot, workflow, step, execution, retry, revert, and snapshot;
- point each concept to its canonical source;
- label related docs as canonical, contextual, stale, deferred, or archive-only;
- provide the language needed for a later archive/delete pass.

This glossary layer complements the surface-specific canonicals instead of replacing them.

## BMAD / Story Workflow Impact

Future BMAD stories, create-story outputs, and implementation plans should reference:

- `docs/architecture/epic-3-authority.md` for routing and precedence;
- the specific stable `docs/architecture/...` file for the relevant surface;
- the March 11 plan only when they need historical rationale.

The create-story workflow and future story drafting should stop treating the dated March 11 plan as the normal implementation target once durable replacements exist.

## Cleanup Policy After Promotion

After a surface is promoted into a durable canonical doc:

1. add a supersession note or forward link from the March 11 plan section if appropriate;
2. update `docs/architecture/epic-3-authority.md` to reflect the new canonical path;
3. update any live planning/story docs still pointing at the dated plan;
4. archive or relabel drifting docs that no longer serve as current authority.

Delete only when a doc is redundant, unreferenced, and has no remaining historical value.

## Success Criteria

This design is successful when:

- no Epic 3 implementation surface needs to rely on the March 11 plan as its long-term operational source of truth;
- every major Epic 3 surface has a stable canonical path in `docs/architecture/`;
- `docs/architecture/epic-3-authority.md` can answer which doc wins for every active surface;
- stories and workflows cite stable docs instead of dated plans;
- stale docs are clearly marked and can be archived in a controlled second pass.
