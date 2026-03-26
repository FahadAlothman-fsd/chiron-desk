# BMAD to Canonical Mapping, Research Slice

## Scope

This mapping is frozen for Slice A.

- Slice-A work-unit set: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- This document owns only `WU.RESEARCH`
- This plan stops at L1 and L2
- Workflow steps and workflow edges are deferred to a later plan and are not part of the locked Slice-A authority here

## Source References

- `docs/architecture/epic-3-authority.md`
- `docs/architecture/methodology-progressive-seeding.md`
- `docs/architecture/methodology-canonical-authority.md`
- `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

## Current Status

This document is active mapping authority for the research portion of the Slice-A methodology seed.

- Documentation target work unit: `WU.RESEARCH`
- Documentation target primary workflows: `market_research`, `domain_research`, `technical_research`
- Legacy broad seed JSON artifacts are lineage only and must not be re-promoted as runtime authority
- Sequencing is refactor first, seed second: correct the L1/L2 metadata ownership model before writing the locked Slice-A canonical rows

## Locked Slice-A Seeding Rule

The seeded methodology ships as one refined methodology definition plus two methodology versions, `draft` and `active`, sharing the same underlying Slice-A canonical data.

Research is one part of that shared Slice-A dataset, not a standalone one-off seed.

## Mapping Rules

1. If a canonical table exists, mapped data must be inserted there.
2. `definitionExtensions` is not canonical authority for research slice data.
3. Refactor first, seed second. Do not seed pre-lock metadata shapes and then retrofit them later.
4. Condition sets and transition bindings own neither `description` nor `guidance`.
5. Keep this mapping at L1 and L2 only. Do not widen this document into workflow steps or workflow edges.
6. Preserve rationale for why BMAD market, domain, and technical research behavior becomes Chiron research facts, states, transitions, workflows, artifact slots, templates, and bindings.

## Research Slice Table Mapping

| Canonical Table | BMAD Source | Mapping Notes |
| --- | --- | --- |
| `methodology_work_unit_types` | research work unit (`WU.RESEARCH`) | one research work-unit type row, owned as part of Slice-A L1 |
| `work_unit_lifecycle_states` | research lifecycle outcome | one `done` state row for research |
| `work_unit_lifecycle_transitions` | research lifecycle transition | one completion transition from `null` to `done` |
| `methodology_fact_schemas` | research facts from locked Slice-A design | includes `research_goals` as plural JSON fact with `cardinality: many` |
| `methodology_workflows` | `market_research`, `domain_research`, `technical_research` | three primary workflow rows owned by `WU.RESEARCH`; detailed step/edge design is deferred |
| `methodology_transition_workflow_bindings` | allowed workflow mapping | bind the research completion transition to the three primary research workflows |
| `methodology_artifact_slot_definitions` | research durable outputs | one shared research report slot definition |
| `methodology_artifact_slot_templates` | research artifact templates | three templates, market, domain, technical, for the shared research report slot |

## Deferred in This Slice

- `methodology_workflow_steps`
- `methodology_workflow_edges`
- Any L3 workflow config/value design
- Detailed source-capture or evidence-model refinements beyond the locked L2 authority

## Progressive Seeding Note

Slice A is now the frozen documentation target for methodology seeding, specifically `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`.

Do not keep the old seed-first assumption. The rule is now refactor the L1/L2 authority model first, then seed the locked Slice-A data into the corrected canonical structures.

## Mapping Rationale Note

The BMAD-to-Chiron mapping here is not arbitrary. Keep an explicit reason for why research behavior is represented as specific Chiron work units, workflows, facts, transitions, artifact slots, templates, and bindings while steps and edges remain intentionally deferred.
