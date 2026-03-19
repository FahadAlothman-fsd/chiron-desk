# BMAD to Canonical Mapping (Setup Slice)

## Scope

This mapping is intentionally limited to `WU.SETUP` and the `setup-project` workflow.

## Source References

- `docs/architecture/methodology-progressive-seeding.md`
- `docs/architecture/methodology-canonical-authority.md`
- `packages/scripts/src/story-seed-fixtures.ts` (current runtime fixture source, still awaiting `WU.SETUP` code cutover)

## Current status

This document is the active mapping authority for the setup slice the documentation is converging toward.

- Documentation target slice: `WU.SETUP`
- Documentation target workflow scope: `setup-project`
- Current runtime TypeScript seed is sufficient for ongoing development and testing, but it remains transitional rather than the final locked seed truth
- Runtime seed/code alignment is deferred to the Epic 3 execution stories, where the seeded shape will be refined and locked progressively
- `WU.PROJECT_CONTEXT` is historical transition context for the current runtime seed, not the slice we should keep extending in documentation
- The broad legacy seed JSON artifacts are lineage/context only and should not be treated as active seed authority

## Mapping Rules

1. If a canonical table exists, mapped data must be inserted there.
2. `definitionExtensions` is not used as canonical authority for setup slice data.
3. Seed payload is validated through Effect Schema before row generation.
4. Grow the active documentation target progressively; do not widen scope beyond `WU.SETUP` until a later slice is explicitly mapped and approved.

## Setup Slice Table Mapping

| Canonical Table | BMAD Source | Mapping Notes |
| --- | --- | --- |
| `methodology_work_unit_types` | workflow owner work unit (`WU.SETUP`) | one row for setup work unit type (`cardinality: one_per_project`) |
| `work_unit_lifecycle_states` | setup transition target state | one `done` state row |
| `work_unit_lifecycle_transitions` | setup transition (`__absent__ -> done`) | one transition row with `fromStateId: null` and condition-set-driven gate semantics |
| `methodology_fact_schemas` | setup facts from seed fixture | `projectType`, `deliveryMode` as work-unit fact schemas |
| `methodology_workflows` | `setup-project` workflow | one workflow row linked to setup work unit |
| `methodology_workflow_steps` | `setup-project.definitionJson.steps` | `setup.init`, `setup.discover`, `setup.confirm` with `configJson.templateRef` |
| `methodology_workflow_edges` | ordered workflow steps | linear edges between adjacent steps |
| `methodology_transition_workflow_bindings` | allowed-workflows mapping | bind setup transition to `setup-project` |

## Deferred in This Slice

- `methodology_agent_types` (no agent steps in `setup-project`)
- `methodology_transition_required_links`
- `methodology_fact_definitions` (methodology-level facts)
- `methodology_link_type_definitions`

## Implementation Location

- Mapping + decode + row builders:
  - `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Canonical table seed slices:
  - `packages/scripts/src/seed/methodology/tables/*.seed.ts`
- Seed index and apply order:
  - `packages/scripts/src/seed/methodology/index.ts`

## Progressive seeding note

For this pass, `WU.SETUP` is the only slice we are intentionally documenting forward. Future slices should be appended only after the corresponding BMAD workflow(s) are digested, mapped into Chiron structures, and documented alongside the evolving runtime seed.

## Mapping rationale note

The BMAD-to-Chiron mapping here is not arbitrary. As this slice evolves, keep a descriptive reason for why each BMAD behavior is represented as a particular Chiron work unit, workflow, step, fact, transition, artifact slot, or artifact.
