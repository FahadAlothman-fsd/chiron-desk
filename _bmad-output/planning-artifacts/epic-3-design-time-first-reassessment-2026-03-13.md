# Epic 3 Reassessment - Design-Time First

Date: 2026-03-13
Scope: Re-sequence Epic 3 so design-time implementation is completed before onboarding runtime execution slices.

## Why reassessment now

- Epic 2 and the design deep-dive expanded design-time scope beyond a single story.
- Current Epic 3 has only one design-time-heavy story (`3.1`) and then shifts immediately into runtime.
- We need implementation reality to match the locked design baseline and architecture corrections:
  - Canonical authority only (no `definition_extensions_json` fallback for canonical domains)
  - Schema recovery via typed/versioned contracts (`*.v1`) and deterministic validation
  - CLEAN module boundaries and Effect-first orchestration discipline

## Design-time scope inventory (must be implemented before runtime slices)

From the stable Epic 3 docs routed by `docs/architecture/epic-3-authority.md`, originally derived from the March 11 baseline:

1. Work Unit L2 surfaces:
   - Workflows tab
   - Workflow editor shell
   - Artifact Slots tab
   - Work Unit Facts tab
   - State Machine tab
2. Step-dialog and config surfaces:
   - Form, Branch, Agent, Invoke, Display, Action dialogs
3. Contract and validation scope:
   - Typed step config contracts (`*.v1`) + save/publish deterministic validation
   - Canonical persistence mapping for methodology/workflow/lifecycle/facts/artifact domains
4. Harness and quality scope:
   - Regression checks for canonical authority rules
   - Contract drift checks and schema compatibility checks
   - Deterministic diagnostics payload checks

## Restructuring options considered

### Option A (recommended): Expand Epic 3 with a Design-Time Block first

- Keep Epic numbering stable.
- Introduce 4 design-time-first stories (`3.1`-`3.4`).
- Move runtime onboarding spikes to start at `3.5`.
- Keep gate intent (G3) but split evidence into design-time readiness plus runtime resilience proof.

Trade-offs:
- Pros: minimal planning churn; execution order becomes realistic; preserves overall roadmap.
- Cons: requires remapping references from old `3.2+` story numbers.

### Option B: Create a new Epic 3 (Design-Time Completion), push current runtime Epic 3 to Epic 4+

- Clean conceptual split.
- Full renumber of downstream epics/stories.

Trade-offs:
- Pros: clean narrative.
- Cons: high churn across traceability and gate references.

### Option C: Parallel mini-epic track (3D) while keeping current Epic 3 runtime track

- Separate backlog track with hard runtime-entry gate.

Trade-offs:
- Pros: avoids renumbering.
- Cons: planning complexity and cross-track dependency confusion.

Decision for this reassessment: **Option A**.

## Revised Epic 3 story breakdown (design-time first)

### Story 3.1 - Design-Time IA and Page Shell Completion

As an operator,
I want complete methodology/work-unit design-time page shells and navigation,
So that all authored contracts are reachable, inspectable, and consistently navigable before runtime execution.

Must include:
- L1/L2 page-shell completion for workflow editor, Work Unit Facts, Artifact Slots, and State Machine tabs.
- Deterministic route context, breadcrumbs, empty/error states, and accessibility basics.

Architecture constraints:
- UI composition must remain feature-scoped in `apps/web` and avoid cross-feature coupling.
- No runtime execution unlock in this story.

Effect/CLEAN constraints:
- Backend-facing interactions route through typed API boundaries; no direct persistence leakage into UI.

### Story 3.2 - Step Dialog and Authoring Contract Completion

As an operator,
I want all step-dialog authoring surfaces finalized (Form/Branch/Agent/Invoke/Display/Action),
So that workflow intent and runtime configuration are fully captured with typed contracts.

Must include:
- CRUD and validation UX for all step types.
- Rich selectors and variable-target semantics required by design-time baseline.
- Dialog and deeper-page boundaries exactly as locked in design.

Architecture constraints:
- Contract authority comes from canonical contract modules.
- No extension-blob fallback for canonical step config interpretation.

Effect/CLEAN constraints:
- Service boundaries (`Tag` + `Layer`) for authoring validation services.
- Typed `TaggedError` diagnostics for contract violations.

### Story 3.3 - Canonical Persistence + Schema Recovery Hardening

As a platform engineer,
I want all design-time domains to persist canonically with strict contract validation,
So that authored methodology/work-unit contracts are deterministic and migration-safe.

Must include:
- Canonical table writes/reads for methodology design-time domains.
- Explicit prohibition checks for canonical keys in `definition_extensions_json`.
- Save/publish contract validation for `*.v1` typed configs and transition condition authority.

Architecture constraints:
- Reinforce module boundaries across `methodology-engine`, `project-context`, `workflow-engine`, `db`, and `contracts`.

Effect/CLEAN constraints:
- Effect service orchestration with typed error channels.
- Deterministic diagnostics persistence for validation and policy failures.

### Story 3.4 - Design-Time Verification Harnesses and Readiness Gate

As a team,
I want deterministic harnesses that prove design-time integrity,
So that runtime onboarding slices only start after contract/persistence/diagnostics quality is proven.

Must include:
- Integration and regression harnesses for:
  - canonical authority enforcement,
  - contract drift rejection,
  - deterministic diagnostics payload shape,
  - L2 tab behavior parity checks.
- Readiness report artifact for runtime-entry gate.

Architecture constraints:
- Harnesses verify behavior through module APIs and public contracts.

Effect/CLEAN constraints:
- Layer substitution in tests and deterministic time controls (`TestClock` where applicable).

### Story 3.5+ - Runtime onboarding spikes (existing scope, renumbered)

Runtime onboarding stories remain in-scope, but start only after Story 3.4 completion.

Renumber mapping:
- old `3.2` -> new `3.5`
- old `3.3` -> new `3.6`
- old `3.4` -> new `3.7`
- old `3.5` -> new `3.8`
- old `3.6` -> new `3.9`
- old `3.7` -> new `3.10`
- old `3.8` -> new `3.11`
- old `3.9` -> new `3.12`

## Mandatory AC/DoD addendum for revised Epic 3 stories 3.1-3.4

Each story must include:

1. CLEAN architecture conformance:
   - explicit module boundary ownership,
   - no cross-layer shortcut writes,
   - contract-first interfaces between UI/API/domain/persistence.
2. Effectful design conformance:
   - service boundaries with `Tag` + Live/Test `Layer`,
   - typed `TaggedError` channels,
   - deterministic testability (Layer substitution, `TestClock` when relevant),
   - supervisor/structured concurrency where long-running orchestration exists.
3. Deterministic evidence and diagnostics:
   - persisted evidence refs,
   - machine-readable actionable diagnostics,
   - no partial-invalid mutation on save/publish failure.

## Execution policy after reassessment

- Runtime onboarding execution stories do not start until Story 3.4 readiness gate passes.
- Any reintroduction of extension-authority fallback is treated as a release blocker.
- Story sequencing in sprint planning must follow the revised order in this document.
