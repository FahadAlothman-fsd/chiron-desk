# Slice-A Seeding Learnings

## Conventions
- Record patterns and decisions here for subagent reference

## Metadata Ownership Rules (Locked)
- Entities WITH description + guidance: methodology facts, dependency definitions, agents, work-unit types, work-unit facts, work-unit states, work-unit workflows, work-unit artifact slots, work-unit artifact slot templates, transitions
- Entities WITHOUT description + guidance: condition sets, transition bindings
- Description shape: `{ markdown: string }`
- Guidance shape: `{ human: { markdown: string }, agent: { markdown: string } }`

## Fact Cardinality (Locked)
- methodology facts and work-unit facts have first-class `cardinality` field with values `one | many`
- JSON fact sub-schema fields also support `type` + `cardinality`
- List-valued subfields do NOT carry scalar defaults

## Versioning (Locked)
- One refined methodology definition
- Two methodology versions: `draft` and `active`
- Both versions share the same underlying Slice-A canonical data

## Scope Boundaries (Locked)
- This plan ends at L1/L2
- Workflow steps/edges are DEFERRED to later plan
- No canonical payload in `definition_extensions_json`

## Slice-A Taxonomy (Locked)
- Work Unit Types: `WU.SETUP`, `WU.BRAINSTORMING`, `WU.RESEARCH`
- Primary Workflows: `setup_project`, `brainstorming`, `market_research`, `domain_research`, `technical_research`
- Brainstorming Support Workflows: 10 unbound `advanced_elicitation` workflows

## Brainstorming Fact Redesign (Locked)
- Replace singular `objective` with plural `objectives`
- `objectives` is a goal-oriented JSON fact with `cardinality: many`
- `selected_directions` has nested list-valued subfields (string + many)
- `constraints` has list-valued string subfields: `must_have`, `must_avoid`, `timebox_notes`

## Research Fact Design (Locked)
- `research_goals` is a goal-oriented JSON fact with `cardinality: many`
- One shared `research_report` slot with three templates: `market`, `domain`, `technical`

## 2026-03-26 Authority Doc Freeze
- `docs/architecture/methodology-bmad-setup-mapping.md` now states frozen Slice-A authority, refactor-first sequencing, and L1/L2-only scope
- Created `docs/architecture/methodology-bmad-brainstorming-mapping.md` and `docs/architecture/methodology-bmad-research-mapping.md` using the setup mapping pattern
- `docs/architecture/methodology-progressive-seeding.md` now treats Slice A as `WU.SETUP`, `WU.BRAINSTORMING`, and `WU.RESEARCH`, with one refined methodology definition plus `draft` and `active` versions sharing the same canonical data
- `docs/architecture/methodology-canonical-authority.md` is the lock point for metadata ownership, including explicit exclusion of `description` and `guidance` from condition sets and transition bindings
