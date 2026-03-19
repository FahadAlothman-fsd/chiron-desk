# Story 3.1 L1 Completion Design

Date: 2026-03-18  
Status: implemented-for-l1

## Context

The current Story 3.1 mutation surface is mostly in place for L1, but the product is not fully closed at the UI layer yet.

Current shipped state:
- `methodology.catalog.*` exists and is wired for methodology-level edit/archive on the dashboard.
- `methodology.version.fact.*` exists and the Facts page already uses the dedicated create/update/delete mutations.
- `methodology.version.agent.*` exists, but the frontend only exposes list + create.
- `methodology.version.dependencyDefinition.*` exists, but the frontend only exposes list + create.
- shallow `methodology.version.workUnit.*` exists, but the frontend still lacks clear shallow update/delete UX.

The user explicitly narrowed scope:
- finish **everything related to L1 now**
- do **not** include L2 work such as artifact slots, artifact templates, or state-machine internals
- `effect-solutions` repo alignment is not part of this product slice

## Goal

Close Story 3.1 L1 end-to-end so the product has a coherent CRUD surface for:
- methodology catalog
- methodology facts
- agents
- dependency definitions
- shallow work units

## Approved Scope

### In scope

#### 1. Methodology catalog
- dashboard-level `Edit Methodology`
- dashboard-level `Archive Methodology`
- continue using:
  - `methodology.catalog.update`
  - `methodology.catalog.delete`

#### 2. Facts
- keep the newly completed dedicated save/delete flow on:
  - `methodology.version.fact.create`
  - `methodology.version.fact.update`
  - `methodology.version.fact.delete`
- no additional scope unless regressions appear

#### 3. Agents
- complete L1 CRUD UI on the version-scoped Agents page:
  - create
  - update
  - delete
- continue using:
  - `methodology.version.agent.list`
  - `methodology.version.agent.create`
  - `methodology.version.agent.update`
  - `methodology.version.agent.delete`

#### 4. Dependency Definitions
- complete L1 CRUD UI on the version-scoped Dependency Definitions page:
  - create
  - update
  - delete
- continue using:
  - `methodology.version.dependencyDefinition.list`
  - `methodology.version.dependencyDefinition.create`
  - `methodology.version.dependencyDefinition.update`
  - `methodology.version.dependencyDefinition.delete`

#### 5. Work Units (shallow only)
- complete shallow L1 UI for:
  - list
  - create
  - get
  - update meta
  - delete
- use existing shallow API surface:
  - `methodology.version.workUnit.list`
  - `methodology.version.workUnit.create`
  - `methodology.version.workUnit.get`
  - `methodology.version.workUnit.updateMeta`
  - `methodology.version.workUnit.delete`

### Out of scope

- artifact slots
- artifact templates
- state-machine state/transition CRUD
- deeper work-unit internals
- internal `DraftProjection` naming cleanup
- repo-level `effect-solutions` alignment work

## Design Direction

### Approach A - Complete L1 end-to-end (recommended)

Finish the remaining product-level CRUD surfaces in the current Story 3.1 pages:
- add edit/delete dialogs/actions for agents
- add edit/delete dialogs/actions for dependency definitions
- add shallow edit-meta/delete actions for work units

Why this is recommended:
- it matches the user's definition of "finish everything related to L1"
- it closes the product loop instead of stopping at backend completeness
- it avoids mixing L1 completion with unrelated L2 or tooling work

Trade-offs:
- requires several UI mutations in a row
- likely needs new focused route tests where none currently exist

### Approach B - Backend-complete, frontend-create-only

Stop after the existing create flows for agents/dependency definitions and the current shallow work-unit create/list/detail UX.

Why not recommended:
- leaves L1 meaningfully incomplete at the user-facing layer
- still forces the user to rely on future work for common edit/delete operations

### Approach C - Rename/cleanup first

Do naming cleanup (`DraftProjection` -> version-oriented names) and Effect/tooling cleanup before finishing remaining UI.

Why not recommended:
- lower product value than closing the visible CRUD gaps
- violates the user's explicit request to finish L1 now

## UI Contract

### Agents page

Keep the current page structure and tabs. Add:
- per-agent actions:
  - `Edit`
  - `Delete`
- a reusable form dialog for create/edit:
  - Agent Key
  - Display Name
  - Description
  - Persona
- delete confirmation dialog

Behavior rules:
- create uses `version.agent.create`
- edit uses `version.agent.update`
- delete uses `version.agent.delete`
- refresh the `version.agent.list` query after every successful mutation

### Dependency Definitions page

Keep the current page structure and tabs. Add:
- per-link-type actions:
  - `Edit`
  - `Delete`
- a reusable form dialog for create/edit:
  - Link Type Key
  - Description
  - allowed strengths (`Hard`, `Soft`)
- delete confirmation dialog

Behavior rules:
- create uses `version.dependencyDefinition.create`
- edit uses `version.dependencyDefinition.update`
- delete uses `version.dependencyDefinition.delete`
- read should prefer explicit `linkTypeDefinitions` from the projection-backed list surface

### Work Units page

Keep the current L1 Graph/List layout and the existing right rail. Add shallow actions only:
- on selected work unit:
  - `Edit Metadata`
  - `Delete`
- edit dialog limited to shallow metadata fields only:
  - key or display name depending on current backend allowance
  - description if supported by the shallow contract
  - no L2 internals
- delete confirmation dialog

Behavior rules:
- edit uses `version.workUnit.updateMeta`
- delete uses `version.workUnit.delete`
- preserve current selection and refetch list state after mutations

## Testing Strategy

### Focused route tests

Add or extend tests so L1 completion is proven through route-level behavior:
- `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
  - methodology catalog update/delete already covered
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
  - facts save/delete already covered
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
  - extend from create-only to full create/edit/delete coverage for agents and dependency definitions
- either extend the existing Work Units integration file or add a new focused one for shallow update/delete

### Verification bar

Before calling L1 complete, fresh evidence should show:
- focused API router suite passing
- focused web route/integration suites passing
- `bun run check-types`
- `bun run check`

## Acceptance Criteria

1. Facts, agents, dependency definitions, and shallow work units all have a user-visible L1 CRUD path.
2. Methodology dashboard supports edit/archive via `methodology.catalog.update/delete`.
3. No L2 artifact/state-machine work is included.
4. Focused route tests prove the L1 UX is wired to the new mutation surface.
5. Final repo checks pass after the slice is complete.

## Implementation Notes (2026-03-18)

- L1 is now closed for the currently-approved Story 3.1 scope:
  - methodology dashboard edit/archive through `methodology.catalog.update/delete`
  - facts create/update/delete through `methodology.version.fact.*`
  - agents create/update/delete through `methodology.version.agent.*`
  - dependency-definition create/update/delete through `methodology.version.dependencyDefinition.*`
  - shallow work-unit list/create/get/updateMeta/delete remained the accepted Story 3.1 boundary
- Frontend work completed in this slice:
  - methodology dashboard edit/archive dialogs in `apps/web/src/routes/methodologies.$methodologyId.tsx`
  - facts page save/delete migration in `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
  - agent create/edit/delete dialogs in `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.agents.tsx`
  - dependency-definition create/edit/delete dialogs in `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.dependency-definitions.tsx`
- Focused verification for this L1 closure used:
  - `apps/web/src/tests/routes/methodologies.$methodologyId.integration.test.tsx`
  - `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.facts.integration.test.tsx`
  - `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx`
  - `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx`
- Out-of-scope boundary preserved:
  - artifact slots, artifact templates, and state-machine internals remain L2 and were intentionally not implemented in this slice.

## Architectural Divergence Addendum (2026-03-19)

- Story 3.1 remains complete for the approved L1 product scope captured in this document.
- Canonical architecture direction now locks workflow authoring ownership under work units, while methodology version remains the release/publish root.
- The former compatibility seams were removed in the 2026-03-19 refactor implementation (`refactor(methodology): remove lifecycle compatibility seam and finalize version archive flows`).
- Refactor sequencing and boundary hardening follow:
  - `docs/plans/2026-03-19-methodology-design-runtime-boundary-refactor-plan.md`.
