# BMAD to Canonical Mapping (Setup Slice)

## Scope

This mapping is intentionally limited to `WU.SETUP` and the `setup-project` workflow.

## Source References

- `_bmad-output/planning-artifacts/chiron-seed-workflow-definitions-v1.json`
- `_bmad-output/planning-artifacts/chiron-seed-transition-allowed-workflows-v1.json`
- `packages/scripts/src/story-seed-fixtures.ts` (setup work-unit fact schema source)

## Mapping Rules

1. If a canonical table exists, mapped data must be inserted there.
2. `definitionExtensions` is not used as canonical authority for setup slice data.
3. Seed payload is validated through Effect Schema before row generation.

## Setup Slice Table Mapping

| Canonical Table | BMAD Source | Mapping Notes |
| --- | --- | --- |
| `methodology_work_unit_types` | workflow owner work unit (`WU.SETUP`) | one row for setup work unit type (`cardinality: one_per_project`) |
| `methodology_lifecycle_states` | setup transition target state | one `done` state row |
| `methodology_lifecycle_transitions` | setup transition (`__absent__ -> done`) | one transition row with `gateClass: start_gate` and `fromStateId: null` |
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
