# Methodology Canonical Authority

**Status:** Active (enforced by implementation)
**Last Updated:** 2026-03-26

This document defines canonical storage ownership for methodology design-time configuration.

## Canonical Rule

If a domain has a dedicated table, that table is authoritative.

`methodology_versions.definition_extensions_json` is non-canonical and reserved for extension-only fields that do not yet have canonical tables.

## Canonical Table Ownership

- Work unit types: `methodology_work_unit_types`
- Agent types: `methodology_agent_types`
- Lifecycle states: `work_unit_lifecycle_states`
- Lifecycle transitions: `work_unit_lifecycle_transitions`
- Transition required links: `methodology_transition_required_links`
- Work-unit fact schemas: `methodology_fact_schemas`
- Workflows: `methodology_workflows`
- Workflow steps: `methodology_workflow_steps`
- Workflow edges: `methodology_workflow_edges`
- Transition-workflow bindings: `methodology_transition_workflow_bindings`
- Methodology-level fact definitions: `methodology_fact_definitions`
- Link type definitions: `methodology_link_type_definitions`

Metadata/audit tables (not canonical methodology definition payload):

- Methodology identity: `methodology_definitions`
- Version metadata: `methodology_versions`
- Version events/evidence: `methodology_version_events`

## Forbidden Keys in definitionExtensions

The following keys must not be used as authority in `definition_extensions_json`:

- `workUnitTypes`
- `agentTypes`
- `transitions`
- `workflows`
- `transitionWorkflowBindings`
- `factDefinitions`
- `linkTypeDefinitions`

## Seed Authoring Policy

Seeds for methodology configuration must be table-first.

- One source file per canonical table under `packages/scripts/src/seed/methodology/tables/`
- Ordered index at `packages/scripts/src/seed/methodology/index.ts`
- Story progression updates table files and index entries only
- No canonical payload blobs in `definitionExtensions`

## Progressive Slice Policy

Methodology seed truth grows progressively, not all at once.

- The final active seed should include only slices that have been explicitly mapped, documented, and validated.
- For the current documentation pass, Slice A is the documentation target slice we are converging toward: `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`.
- The current runtime seed is allowed to remain transitional if it is sufficient for ongoing development/testing, but that runtime state must not be mistaken for the final locked seed truth.
- Earlier broad JSON seed artifacts are historical lineage only, not current canonical seed authority.
- Future slices should be appended only after the corresponding BMAD workflow(s) are digested and mapped into canonical Chiron structures.
- Refactor first, seed second. Correct the L1/L2 ownership model before writing the locked Slice-A canonical rows.
- This plan stops at L1/L2. Workflow steps and workflow edges are deferred to a later plan.
- As execution stories refine the seed, documentation and runtime seed truth should be updated together.
- The seeded methodology ships as one refined methodology definition plus two methodology versions, `draft` and `active`, sharing the same underlying Slice-A canonical data.

See `docs/architecture/methodology-progressive-seeding.md` for the operational process.

## Descriptive Metadata Ownership Rule

The locked Slice-A descriptive metadata model is:

- `description`: `{ markdown: string }`
- `guidance`: `{ human: { markdown: string }, agent: { markdown: string } }`

Entities that own both `description` and `guidance`:

- methodology facts
- dependency definitions
- agents
- work-unit types
- work-unit facts
- work-unit states
- work-unit workflows
- work-unit artifact slots
- artifact slot templates
- transitions

Entities that own neither `description` nor `guidance`:

- condition sets
- transition bindings

Do not imply or implement `description` or `guidance` on condition sets or transition bindings.

## Validation Expectations

- Save and refetch roundtrip must return canonical table values.
- Invalid gate classes are rejected at input boundaries.
- Projection reads canonical tables for table-backed domains.
