# Methodology Catalog and Version Entity Mutations Design

Date: 2026-03-17  
Status: implemented-for-story-3-1

## Context

The Story 3.1 namespace migration established the read/publish surface around:
- `methodology.catalog.*` for methodology aggregate discovery
- `methodology.version.*` for version lifecycle and shallow Story 3.1 entity reads

That work intentionally left two gaps:
1. methodology-level aggregate update/delete still do not exist
2. `fact`, `agent`, and `dependencyDefinition` only expose `list`, because the backend still relies on broader compatibility seams rather than dedicated entity mutations

Local codebase evidence shows:
- methodology aggregate create/list/details already exist live as top-level procedures (`createMethodology`, `listMethodologies`, `getMethodologyDetails`)
- `workUnit` already has shallow mutations because it can ride the existing lifecycle seam
- `fact`, `agent`, and `dependencyDefinition` do not yet have dedicated repository/service mutation seams
- frontend Story 3.1 reads are already connected to `methodology.version.*`, but some edit/save paths still use compatibility mutations

## Goal

Define the next mutation slice so the API becomes consistent around:
- `methodology.catalog.*` for methodology aggregate CRUD
- `methodology.version.*` for version lifecycle
- `methodology.version.<entity>.*` for nested Story 3.1 authoring CRUD

## Approved Decisions

### 1) Methodology aggregate CRUD lives under `methodology.catalog.*`

The methodology itself is the aggregate root above versions. Its CRUD should not live under `methodology.version.*`.

Required surface:
- `methodology.catalog.list`
- `methodology.catalog.create`
- `methodology.catalog.get`
- `methodology.catalog.update`
- `methodology.catalog.delete`

Notes:
- `methodology.catalog.get` replaces the awkward `getMethodologyDetails` naming as the long-term stable surface
- existing top-level methodology create/list/details procedures can remain temporarily as compatibility aliases during the migration

### 2) Methodology delete is soft delete / archive

Approved rule:
- `methodology.catalog.delete` performs a soft delete/archive, not a hard delete

Reasoning:
- methodologies own versions and history
- methodologies may be pinned by projects
- archive is safer and reversible
- hard delete can be introduced later as a separate admin-only purge if truly needed

Expected behavior:
- archived methodologies are hidden from default catalog lists
- archived methodologies remain queryable for lineage/admin/recovery use cases
- archived methodologies should reject new draft creation until restored or explicitly allowed by a future rule

### 3) Version lifecycle remains under `methodology.version.*`

Keep the already-approved lifecycle surface:
- `methodology.version.list`
- `methodology.version.create`
- `methodology.version.get`
- `methodology.version.update`
- `methodology.version.validate`
- `methodology.version.publish`
- `methodology.version.getLineage`
- `methodology.version.getPublicationEvidence`
- `methodology.version.workspace.get`

The single-draft rule remains in force:
- one draft per methodology
- `methodology.version.create` fails if a draft already exists

### 4) Nested Story 3.1 entity CRUD belongs under `methodology.version.<entity>.*`

Add the missing mutation surface for the shallow Story 3.1 entities:

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

#### Work Units (still shallow in Story 3.1)
- `methodology.version.workUnit.list`
- `methodology.version.workUnit.create`
- `methodology.version.workUnit.get`
- `methodology.version.workUnit.updateMeta`
- `methodology.version.workUnit.delete`

### 5) Work Unit deeper internals stay Story 3.2

Do not expand this mutation slice into deeper work-unit internals yet.

Still deferred:
- `methodology.version.workUnit.fact.*`
- `methodology.version.workUnit.stateMachine.*`
- `methodology.version.workUnit.workflow.*`
- `methodology.version.workUnit.workflowStep.*`
- `methodology.version.workUnit.artifactSlot.*`
- `methodology.version.workUnit.artifactTemplate.*`

## Backend Design Rules

### 1) Add dedicated entity mutation seams

The missing CRUD surface should not continue to depend on broad aggregate persistence helpers as the primary interface.

Required additions:
- contract inputs/outputs for create/update/delete of fact, agent, and dependency definition
- version-service methods that operate on version-owned entities directly
- repository methods and DB implementations that can persist those entity changes deterministically

### 2) Compatibility seams may remain temporarily, but not as the target model

Existing seams:
- `updateDraftLifecycle`
- `updateDraftWorkflows`

These may still be used internally or temporarily by some routes during the migration, but the long-term public surface should become:
- `methodology.catalog.*`
- `methodology.version.<entity>.*`

### 3) Nested entities must stay strongly version-owned

`fact`, `agent`, and `dependencyDefinition` should not become top-level routers or peer aggregate roots.

They are nested because:
- their lifecycle depends on a specific methodology version
- they should be created/edited/deleted in the context of that version
- publishing the version governs their release state

## Frontend / UX Consequences

### Methodology catalog screens
- methodology index uses `methodology.catalog.list` and `methodology.catalog.create`
- methodology dashboard uses `methodology.catalog.get` plus `methodology.version.list/create`
- methodology archive/delete action uses `methodology.catalog.delete`

### Version-scoped Story 3.1 screens
- facts page uses `methodology.version.fact.*`
- agents page uses `methodology.version.agent.*`
- dependency definitions page uses `methodology.version.dependencyDefinition.*`
- work units page uses `methodology.version.workUnit.*`

The UI should stop depending on compatibility mutation names once equivalent nested mutations exist.

## Non-goals

- No hard-delete purge workflow in this slice
- No redesign of project/runtime top-level routers in this doc
- No Story 3.2 deep work-unit mutation tree in this slice
- No attempt to remove all compatibility aliases in one risky pass if that would destabilize Story 3.1 routes

## Acceptance Criteria

1. Methodology aggregate CRUD is clearly separated from version CRUD under `methodology.catalog.*`.
2. `methodology.catalog.delete` means soft delete/archive.
3. Facts, agents, and dependency definitions gain dedicated nested create/update/delete surfaces under `methodology.version.<entity>.*`.
4. Work Units remain shallow for Story 3.1 and do not expose deeper Story 3.2 internals.
5. Frontend Story 3.1 edit paths can migrate away from compatibility mutation seams onto the new nested entity mutations.

## Implementation Notes (2026-03-17)

This mutation slice is now implemented for Story 3.1.

### Shipped API surface

- `methodology.catalog.list`
- `methodology.catalog.create`
- `methodology.catalog.get`
- `methodology.catalog.update`
- `methodology.catalog.delete`
- `methodology.version.fact.create/update/delete`
- `methodology.version.agent.create/update/delete`
- `methodology.version.dependencyDefinition.create/update/delete`

The existing shallow Story 3.1 work-unit surface remains in place:

- `methodology.version.workUnit.list`
- `methodology.version.workUnit.create`
- `methodology.version.workUnit.get`
- `methodology.version.workUnit.updateMeta`
- `methodology.version.workUnit.delete`

### Archive semantics

- `methodology.catalog.delete` is implemented as soft delete / archive.
- archived methodologies are hidden from default catalog lists.
- archived methodologies remain recoverable through `methodology.catalog.get`.

### Frontend alignment completed in Story 3.1

- facts save/delete flows now use `methodology.version.fact.create/update/delete`
- methodology dashboard edit/archive actions now use `methodology.catalog.update/delete`
- agents create flow now uses `methodology.version.agent.create`
- dependency-definition create flow now uses `methodology.version.dependencyDefinition.create`

### Remaining boundary notes

- Work Units remain shallow in Story 3.1.
- deeper nested work-unit internals remain deferred to Story 3.2.
- the version workspace route and facts route still retain narrow compatibility mutation seams where broader lifecycle/workflow persistence is still required:
  - `orpc.methodology.updateDraftLifecycle`
  - `orpc.methodology.updateDraftWorkflows`
