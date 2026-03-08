# Methodology Design-Time Repository Boundaries

**Status:** Proposed
**Last Updated:** 2026-03-07

## Decision

Use multiple repositories inside the methodology design-time module, but group them by subdomain and invariants (not per-table).

- Avoid a single "god" repository surface.
- Avoid per-table repositories that force multi-repo write orchestration.
- Preserve atomic multi-table operations by making each write transaction owned by exactly one repository method.

## Context

The methodology design-time domain persists an interrelated graph of entities:

- Version lifecycle (definitions, versions, events/evidence)
- Work units, lifecycle states, transitions, required links
- Workflows, steps, edges, transition bindings
- Condition sets / gating conditions (where applicable)
- Fact schemas (work-unit scoped) and fact definitions (methodology scoped)
- Agents, artifacts, templates (as the model expands)

In the current codebase, this domain already trends toward subdomain repositories:

- `packages/methodology-engine/src/repository.ts` exposes a broad `MethodologyRepository` interface.
- `packages/methodology-engine/src/lifecycle-repository.ts` defines `LifecycleRepository` focused on lifecycle domains.
- `packages/db/src/methodology-repository.ts` and `packages/db/src/lifecycle-repository.ts` implement these via Drizzle/LibSQL transactions.

The canonical authority rule is table-first: if a dedicated table exists, it is authoritative (see `docs/architecture/methodology-canonical-authority.md`).

## Goals

- Keep write operations atomic where cross-table consistency is required.
- Make ownership and reasoning local (subdomain boundaries).
- Reduce interface size and accidental coupling.
- Keep testability high (subdomain contract tests).
- Avoid introducing new infrastructure or runtime complexity.

## Non-Goals

- Splitting into separate Git repositories or deployable services.
- Replacing the ORM or DB technology.
- Reworking the domain model semantics.

## Options Considered

### A) One Big Repository (single interface)

Pros:
- Simple dependency graph for services.
- Easy to preserve atomicity (one place to start transactions).

Cons:
- Interface grows without bound; unclear ownership.
- Refactors are high-risk because everything is adjacent.

Failure modes:
- "God repo" becomes the only place to add functionality.
- Cross-domain invariants leak (e.g., workflow logic embedded in lifecycle operations).

### B) Many Small Repositories (per table or near-per-table)

Pros:
- Very explicit ownership; small interfaces.
- Fine-grained mocks.

Cons:
- Atomic multi-table updates shift into services.
- Higher coordination overhead and more roundtrips.

Failure modes:
- Partial writes / inconsistent snapshots when a service orchestrates multiple repos and fails mid-flight.
- Circular dependencies or duplicated read-model logic.

### C) Recommended: Few Subdomain Repositories + Shared Transaction Boundary

Pros:
- Boundaries match invariants and write transactions.
- Atomic operations remain encapsulated.
- Interface surfaces stay small enough to understand.

Cons:
- Requires discipline to prevent repo-to-repo calls.

Failure modes:
- Subrepos call each other, recreating coupling.
- A "unit of work" object grows into a second god object if it accumulates domain logic.

## Recommended Target Architecture

Interpretation: "repository" here means in-code data access repositories within the module (not separate Git repos).

### Repository set

Target 4-6 repositories (exact count is less important than stable boundaries):

1) `MethodologyCatalogRepository`
- Owns: methodology identity, version metadata, version events/evidence.
- Tables: `methodology_definitions`, `methodology_versions`, `methodology_version_events`.
- Typical operations: list/create methodologies, find versions, record evidence, publish status transitions.

2) `LifecycleRepository` (already exists)
- Owns: work unit types, states, transitions, required links, work-unit fact schemas, agent types (if lifecycle-scoped).
- Tables: `methodology_work_unit_types`, `methodology_lifecycle_states`, `methodology_lifecycle_transitions`,
  `methodology_transition_required_links`, `methodology_fact_schemas`, `methodology_agent_types`.
- Typical operations: validate-then-save lifecycle definition transactionally.

3) `WorkflowRepository`
- Owns: workflows graph + bindings.
- Tables: `methodology_workflows`, `methodology_workflow_steps`, `methodology_workflow_edges`,
  `methodology_transition_workflow_bindings`.
- Typical operations: replace workflow graph snapshot for a version (delete+insert) transactionally; read back a stable snapshot.

4) `MethodologyDefinitionRepository` (or fold into Catalog)
- Owns: methodology-scoped fact definitions and link type definitions.
- Tables: `methodology_fact_definitions`, `methodology_link_type_definitions`.

5) `ProjectMethodologyPinRepository`
- Owns: project pin pointer + lineage events.
- Tables: `project_methodology_pins`, `project_methodology_pin_events`, plus any execution-history guard reads.

### Transaction rule

- Any operation requiring cross-table consistency is implemented as a single repository method that owns its transaction.
- Services do not orchestrate multi-repo writes. Services may call multiple repos for reads.

### Read models / projections

- Keep one canonical projection pathway per read model (e.g., draft projection composes lifecycle + workflow snapshots).
- Do not duplicate snapshot assembly logic across multiple repos.

### Error and diagnostics contract

- Maintain a consistent error taxonomy across repos (shared `RepositoryError` with stable codes).
- Prefer deterministic validation diagnostics produced before writes; repos only write when validation passes.

## Migration Path (from current code)

1) Introduce new repository interfaces in `packages/methodology-engine/src/` that mirror existing transactional seams.
2) Implement DB layers in `packages/db/src/` by delegating to the current code paths first (thin adapters).
3) Update services (e.g., `packages/methodology-engine/src/version-service.ts`, `packages/methodology-engine/src/lifecycle-service.ts`) to depend on the smaller repos.
4) Shrink `MethodologyRepository` into a facade:
- Keep it temporarily to avoid a flag-day refactor.
- Mark methods as deprecated in code (no behavioral change).
5) Add contract tests:
- Per-repo roundtrip: save -> refetch equals (canonical tables).
- One end-to-end atomicity test for publish and project pin lineage.
6) Remove facade methods once all call sites are migrated.

## Acceptance Criteria

- No service contains multi-repo write orchestration.
- Each repository interface is small and maps cleanly to a subdomain.
- Save/refetch roundtrip returns canonical table values (no hidden authority in extension blobs).
- Publish and pin operations remain atomic (pointer + evidence/lineage committed together).

## Escalation Triggers

Revisit this split if any of the following become true:

- You must support multiple backing stores for design-time (e.g., file-based authoring + DB) with runtime selection.
- The module must be deployed independently with separate release cadence.
- Cross-version migration workflows require long-running sagas (beyond single DB transactions).
