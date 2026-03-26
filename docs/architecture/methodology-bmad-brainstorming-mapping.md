# BMAD to Canonical Mapping, Brainstorming Slice

## Scope

This mapping is frozen for Slice A.

- Slice-A work-unit set: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- This document owns only `WU.BRAINSTORMING`
- This plan stops at L1 and L2
- Workflow steps and workflow edges are deferred to a later plan and are not part of the locked Slice-A authority here

## Source References

- `docs/architecture/epic-3-authority.md`
- `docs/architecture/methodology-progressive-seeding.md`
- `docs/architecture/methodology-canonical-authority.md`
- `.sisyphus/drafts/bmad-to-chiron-seeding-translation.md`

## Current Status

This document is active mapping authority for the brainstorming portion of the Slice-A methodology seed.

- Documentation target work unit: `WU.BRAINSTORMING`
- Documentation target primary workflow: `brainstorming`
- Documentation target support workflow family: `five_whys_deep_dive`, `architecture_decision_records`, `self_consistency_validation`, `first_principles_analysis`, `socratic_questioning`, `critique_and_refine`, `tree_of_thoughts`, `graph_of_thoughts`, `meta_prompting_analysis`, and `stakeholder_round_table`
- Legacy broad seed JSON artifacts are lineage only and must not be re-promoted as runtime authority
- Sequencing is refactor first, seed second: correct the L1/L2 metadata ownership model before writing the locked Slice-A canonical rows

## Locked Slice-A Seeding Rule

The seeded methodology ships as one refined methodology definition plus two methodology versions, `draft` and `active`, sharing the same underlying Slice-A canonical data.

Brainstorming is one part of that shared Slice-A dataset, not a standalone one-off seed.

## Mapping Rules

1. If a canonical table exists, mapped data must be inserted there.
2. `definitionExtensions` is not canonical authority for brainstorming slice data.
3. Refactor first, seed second. Do not seed pre-lock metadata shapes and then retrofit them later.
4. Condition sets and transition bindings own neither `description` nor `guidance`.
5. Keep this mapping at L1 and L2 only. Do not widen this document into workflow steps or workflow edges.
6. Preserve rationale for why BMAD brainstorming behavior becomes Chiron brainstorming facts, states, transitions, workflows, artifact slots, templates, and bindings.

## Brainstorming Slice Table Mapping

| Canonical Table | BMAD Source | Mapping Notes |
| --- | --- | --- |
| `methodology_work_unit_types` | brainstorming work unit (`WU.BRAINSTORMING`) | one brainstorming work-unit type row, owned as part of Slice-A L1 |
| `work_unit_lifecycle_states` | brainstorming lifecycle outcome | one `done` state row for brainstorming |
| `work_unit_lifecycle_transitions` | brainstorming lifecycle transition | one completion transition from `null` to `done` |
| `methodology_fact_schemas` | brainstorming facts from locked Slice-A design | includes `objectives` as plural JSON fact with `cardinality: many` |
| `methodology_workflows` | `brainstorming` plus support workflows | one primary workflow row and ten support workflow rows owned by `WU.BRAINSTORMING`; support workflows remain unbound unless a later plan promotes them |
| `methodology_transition_workflow_bindings` | allowed primary workflow mapping | bind only the primary brainstorming transition workflow; support workflows own neither transition authority nor binding metadata |
| `methodology_artifact_slot_definitions` | brainstorming durable outputs | brainstorming artifact slot rows for saved ideation output |
| `methodology_artifact_slot_templates` | brainstorming artifact templates | template rows that render fact-backed brainstorming summaries |

## Deferred in This Slice

- `methodology_workflow_steps`
- `methodology_workflow_edges`
- Any L3 workflow config/value design
- Detailed advanced-elicitation execution contracts

## Progressive Seeding Note

Slice A is now the frozen documentation target for methodology seeding, specifically `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`.

Do not keep the old seed-first assumption. The rule is now refactor the L1/L2 authority model first, then seed the locked Slice-A data into the corrected canonical structures.

## Mapping Rationale Note

The BMAD-to-Chiron mapping here is not arbitrary. Keep an explicit reason for why brainstorming behavior is represented as specific Chiron work units, workflows, facts, transitions, artifact slots, templates, and bindings while steps and edges remain intentionally deferred.
