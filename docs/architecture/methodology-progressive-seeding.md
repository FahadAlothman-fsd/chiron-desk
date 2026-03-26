# Methodology Progressive Seeding

This document defines the stable documentation-facing rule for how Chiron methodology seeds grow over time. Use `docs/architecture/epic-3-authority.md` for precedence when Epic 3 docs conflict.

## Scope

- Stable process for methodology seed growth during Epic 3 and adjacent implementation work.
- Defines the current documentation direction for the active slice and how it relates to the transitional runtime seed.
- Defines how legacy broad seed artifacts should be treated.
- Freezes Slice A at L1 and L2 only. Workflow steps and workflow edges are deferred to a later plan.
- Does not define runtime seed loader implementation details.

## Purpose

Methodology seeds are not authored as a one-shot full-platform dump. The long-term active seed should represent only the slices we have actually mapped, validated, and decided to carry forward as current truth. Additional slices are appended deliberately after they are understood and tested.

## Current documentation direction and runtime state

For this documentation pass, Slice A is the frozen seed target we are converging toward and documenting as the intended next seed shape.

- Work unit scope: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- Primary workflow scope: `setup_project`, `brainstorming`, `market_research`, `domain_research`, `technical_research`
- Mapping authority: `docs/architecture/methodology-bmad-setup-mapping.md`
- Mapping authority: `docs/architecture/methodology-bmad-brainstorming-mapping.md`
- Mapping authority: `docs/architecture/methodology-bmad-research-mapping.md`
- Canonical seed-authoring policy: `docs/architecture/methodology-canonical-authority.md`

The seeded methodology ships as one refined methodology definition plus two methodology versions, `draft` and `active`, sharing the same underlying Slice-A canonical data.

The current runtime seed is sufficient for ongoing development and testing, but it remains transitional rather than the final locked seed truth.

- Runtime seed/code still lags behind this documentation direction.
- `WU.PROJECT_CONTEXT` remains historical transition context for that transitional runtime state.
- The final seeded shape should be locked only when Epic 3 execution stories define it fully.
- As execution work progresses, the runtime seed and the documentation should be updated together so they converge instead of drifting further apart.
- Do not re-promote lineage drafts or broad legacy seed artifacts as runtime truth.

## Progressive seeding rule

Grow methodology seed truth slice by slice.

1. Choose one implemented or implementation-ready slice.
2. Read and digest the BMAD workflow(s) that define that slice.
3. Refactor the L1/L2 authority model first when ownership or shape corrections are required.
4. Map the slice into Chiron structures:
   - work units
   - transitions
   - artifacts and slots
   - workflows
   - agents
5. Add only that mapped slice to the active seed.
6. Validate the slice against canonical tables and current architecture docs.
7. Append the next slice later.

For Slice A, stop after L1/L2 entities are locked. Do not treat workflow steps or workflow edges as in scope for this plan.

Do not seed the whole methodology up front just because older artifacts contain broader legacy definitions.
Do not keep the old seed-first assumption. The rule is refactor first, seed second.

## Table-first rule

Progressive seeding still follows the table-first canonical policy.

- Canonical methodology definition data belongs in the dedicated canonical tables.
- Seed slices should be authored as table-first inputs, not as broad definition blobs.
- Story progression should extend the active slice set deliberately rather than revive legacy all-at-once payloads.
- The methodology definition and the `draft` and `active` versions should point at the same underlying Slice-A canonical table data rather than duplicating alternate payload blobs.

## Legacy seed artifacts

The following files are legacy lineage artifacts, not the active seed model:

- `/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-workflow-definitions-v1.json`
- `/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-transition-allowed-workflows-v1.json`

They may remain useful as historical reference while archived, but they should not describe the active methodology seed truth going forward.

## How to extend the seed later

When a future Epic 3 slice is implemented and understood well enough to seed:

1. add or update the stable architecture docs for that slice first,
2. extend the mapping doc or create a new slice-specific mapping doc,
3. append the new slice to the active seed truth,
4. keep prior slices intact unless there is an explicit migration decision,
5. document the new slice as active in the routing/authority layer.

## What this process is trying to prevent

- giant methodology-wide seeds that claim more coverage than we actually implemented
- old schema assumptions leaking forward into new seed truth
- broad JSON seed blobs becoming accidental authority
- mixing historical lineage artifacts with active runtime/documentation truth

## Mapping rationale rule

BMAD-to-Chiron mapping decisions must stay explainable as the seed evolves.

- Preserve a descriptive reason for why a BMAD workflow becomes a given Chiron work unit, workflow, step, fact, transition, artifact slot, or artifact.
- Do not let the seeded structure become an ad hoc copy of implementation convenience.
- When execution stories refine the seed, update the docs alongside the seed so the rationale remains readable.

## Cross-references

- `docs/architecture/methodology-canonical-authority.md`
- `docs/architecture/methodology-bmad-setup-mapping.md`
- `docs/architecture/methodology-bmad-brainstorming-mapping.md`
- `docs/architecture/methodology-bmad-research-mapping.md`
- `docs/architecture/epic-3-authority.md`
- `docs/architecture/methodology-pages/versions.md`
