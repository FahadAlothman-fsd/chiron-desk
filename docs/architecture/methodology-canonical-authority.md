# Methodology Canonical Authority

**Status:** Active (enforced by implementation)
**Last Updated:** 2026-03-06

This document defines canonical storage ownership for methodology design-time configuration.

## Canonical Rule

If a domain has a dedicated table, that table is authoritative.

`methodology_versions.definition_extensions_json` is non-canonical and reserved for extension-only fields that do not yet have canonical tables.

## Canonical Table Ownership

- Work unit types: `methodology_work_unit_types`
- Agent types: `methodology_agent_types`
- Lifecycle states: `methodology_lifecycle_states`
- Lifecycle transitions: `methodology_lifecycle_transitions`
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

## Validation Expectations

- Save and refetch roundtrip must return canonical table values.
- Invalid gate classes are rejected at input boundaries.
- Projection reads canonical tables for table-backed domains.
