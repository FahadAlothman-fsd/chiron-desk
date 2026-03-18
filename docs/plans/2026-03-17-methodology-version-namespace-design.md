# Methodology Version Namespace Design

Date: 2026-03-17  
Status: implemented-for-story-3-1

## Context

The API boundary discussion converged on four tentative top-level routers:
- `system`
- `methodology`
- `project`
- `runtime`

The remaining open question was how version-owned methodology authoring should be named. The earlier `designTime` namespace was useful as a concept, but it is not the right API ownership boundary. Local Chiron evidence and external precedents both point to the same conclusion: authoring entities are owned by a methodology version, while `draft` is only a status of that version.

## Goal

Define the `methodology` router for Story 3.1 using a version-owned namespace that:
- treats `version` as the aggregate root
- treats `draft` as a status, not a router noun
- keeps Story 3.1 limited to baseline design-time authoring surfaces
- reserves deeper Work Unit internals for Story 3.2

## Final Design Decision (approved)

### 1) Top-level router context

Tentative top-level routers remain:
- `system`
- `methodology`
- `project`
- `runtime`

This document only freezes the `methodology` router.

### 2) Namespace rule

Use:
- `methodology.catalog.*`
- `methodology.version.*`

Do **not** use:
- `methodology.designTime.*`
- `createDraft*`, `updateDraft*`, `publishDraft*` as the primary naming model

`version` is the real aggregate root. `draft` is a lifecycle status of a version.

### 3) Progressive versioning rule

For now, a methodology may have only **one draft version at a time**.

Implications:
- `methodology.version.create` creates a new version in `draft` status
- `methodology.version.create` must fail if a draft already exists
- UX should offer `Open Draft` / `Continue Draft` when a draft already exists
- publishing the draft frees the methodology to create the next draft version

### 4) Story 3.1 methodology router surface

#### `methodology.catalog.*`

Purpose: methodology-level identity and catalog pages.

Procedures:
- `methodology.catalog.list`
- `methodology.catalog.create`
- `methodology.catalog.getDetails`

Used by:
- methodology index page
- methodology dashboard/details shell

#### `methodology.version.*`

Purpose: version registry, version metadata, lifecycle transitions, and version-scoped workspace bootstrap.

Procedures:
- `methodology.version.list`
- `methodology.version.create`
- `methodology.version.get`
- `methodology.version.update`
- `methodology.version.validate`
- `methodology.version.publish`
- `methodology.version.getLineage`
- `methodology.version.getPublicationEvidence`
- `methodology.version.workspace.get`

Used by:
- methodology version ledger/dashboard
- create/open draft flow
- version workspace shell header
- review/publish surface
- shared version-scoped authoring read model bootstrap

### 5) Story 3.1 version-owned entity surfaces

These are all version-scoped and live directly under `methodology.version`.

#### Facts
- `methodology.version.fact.list`
- `methodology.version.fact.create`
- `methodology.version.fact.update`
- `methodology.version.fact.delete`

#### Agents
- `methodology.version.agent.list`
- `methodology.version.agent.create`
- `methodology.version.agent.update`
- `methodology.version.agent.delete`

#### Dependency Definitions
- `methodology.version.dependencyDefinition.list`
- `methodology.version.dependencyDefinition.create`
- `methodology.version.dependencyDefinition.update`
- `methodology.version.dependencyDefinition.delete`

#### Work Units (baseline only in Story 3.1)
- `methodology.version.workUnit.list`
- `methodology.version.workUnit.create`
- `methodology.version.workUnit.get`
- `methodology.version.workUnit.updateMeta`
- `methodology.version.workUnit.delete`

Story 3.1 intent for Work Units is baseline creation/list/selection only, not full internal modeling.

## Story 3.2 expansion

Story 3.2 expands the Work Unit aggregate more deeply but still keeps it version-owned and nested under `workUnit`.

### Work Unit nested surfaces
- `methodology.version.workUnit.fact.*`
- `methodology.version.workUnit.stateMachine.state.*`
- `methodology.version.workUnit.stateMachine.transition.*`
- `methodology.version.workUnit.workflow.*`
- `methodology.version.workUnit.workflowStep.*`
- `methodology.version.workUnit.artifactSlot.*`
- `methodology.version.workUnit.artifactTemplate.*`

### Grouping rule

- `workUnit` is the aggregate root
- `stateMachine` groups states and transitions
- `workflow` and `workflowStep` stay under the work unit
- artifact slots/templates also stay under the work unit because they are part of Work Unit design-time modeling

## Route and page usage for Story 3.1

### Methodology index
Uses:
- `methodology.catalog.list`
- `methodology.catalog.create`

### Methodology dashboard `/methodologies/:methodologyId`
Uses:
- `methodology.catalog.getDetails`
- `methodology.version.list`
- `methodology.version.create`

### Version workspace `/methodologies/:methodologyId/versions/:versionId`
Uses:
- `methodology.version.get`
- `methodology.version.workspace.get`
- `methodology.version.validate`
- `methodology.version.publish`
- `methodology.version.getPublicationEvidence`

### Facts page
Uses:
- `methodology.version.fact.*`

### Agents page
Uses:
- `methodology.version.agent.*`

### Dependency Definitions page
Uses:
- `methodology.version.dependencyDefinition.*`

### Work Units page
Uses:
- `methodology.version.workUnit.*`

## Design rules to preserve

1. `draft` is a status, never the aggregate noun.
2. Version-owned authoring surfaces should read as `methodology.version.<entity>`.
3. `workspace.get` is acceptable as a convenience editor/bootstrap read because it is still version-owned.
4. Story 3.1 should not prematurely expose deep Work Unit internals.
5. Story 3.2 should deepen the Work Unit aggregate rather than creating many unrelated sibling namespaces.

## Non-goals

- No finalization of `project` or `runtime` router internals in this document.
- No implementation of Story 3.2 nested Work Unit surfaces yet.
- No final transport/schema naming migration plan in this document.

## Acceptance criteria

1. The `methodology` router is version-centric, not draft-centric.
2. The API namespace no longer needs `designTime` as an ownership boundary.
3. Story 3.1 scope is limited to catalog, version lifecycle/workspace, facts, agents, dependency definitions, and baseline Work Unit CRUD.
4. Story 3.2 expansion is clearly nested under `methodology.version.workUnit.*`.
5. The single-draft invariant is explicit and treated as a product rule, not a UI convention.

## Implementation notes (2026-03-17)

- The implemented Story 3.1 slice now ships the version-owned lifecycle surface under `methodology.version.*`.
- The single-draft rule is enforced in the service layer via `DraftVersionAlreadyExistsError` and surfaced through the API as a conflict, rather than existing only as UI behavior.
- The shipped Story 3.1 shallow entity surface currently includes:
  - `methodology.version.fact.list`
  - `methodology.version.agent.list`
  - `methodology.version.dependencyDefinition.list`
  - `methodology.version.workUnit.list`
  - `methodology.version.workUnit.create`
  - `methodology.version.workUnit.get`
  - `methodology.version.workUnit.updateMeta`
  - `methodology.version.workUnit.delete`
- Story 3.1 web consumers were aligned to the new version-owned create/bootstrap/read/publish paths.
- A narrow compatibility bridge intentionally remains for these persistence seams until deeper entity-specific mutations are introduced:
  - `orpc.methodology.updateDraftLifecycle`
  - `orpc.methodology.updateDraftWorkflows`
- This means the namespace decision is implemented for the Story 3.1 boundary, while the full mutation-level migration is still a future refinement rather than part of this slice.
