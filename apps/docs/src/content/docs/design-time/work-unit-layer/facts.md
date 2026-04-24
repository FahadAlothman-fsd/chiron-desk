---
title: Work Unit Layer, Facts
---
Work-unit facts are durable fact contracts owned by one work-unit type.

They define what structured data belongs to that work unit's definition and runtime instances.

## Facts at this layer

At the Work Unit Layer, facts belong to the selected work unit.

Examples:

- a `Story` work unit can own `acceptance_criteria`
- a `Research` work unit can own `research_goals`
- a `PRD` work unit can own `target_outcomes`

These are not methodology-wide facts. They do not apply everywhere by default.

## What a fact contract includes

Current contract shapes include fields such as:

- key
- type
- fact type
- cardinality
- optional default value
- validation rules
- description and guidance

Current fact typing supports plain values like `string`, `number`, `boolean`, and `json`, plus work-unit reference facts.

## Why facts are first-class

Facts are not loose notes.

They give workflows, transitions, and runtime surfaces a stable contract for what data can exist on this work unit.

That matters for:

- readiness checks
- structured authoring
- workflow context mapping
- review and audit surfaces later at runtime

## Taskflow example

For a Taskflow `Story` work unit, useful facts might include:

- `acceptance_criteria`
- `implementation_notes`
- `parent_epic`

Those facts stay attached to the `Story` contract. They are different from a methodology-wide fact like `project_context`, which belongs in the Methodology Layer.

> **Screenshot placeholder**
> Facts tab for the Taskflow Story work unit, showing fact key, type, cardinality, validation, and findings.

## Facts versus workflow context facts

Work-unit facts are durable work-unit contract data.

Workflow context facts are workflow-scoped execution context.

The two are related, but they are not the same thing. A workflow can read from or bind to work-unit facts without turning every temporary value into a work-unit fact.

## Boundary rule

Use the Work Unit Layer for durable `self.facts.*` style contract data.

Use the Workflow Layer for execution-scoped context.

That boundary keeps the work-unit contract stable and stops temporary workflow values from leaking into methodology structure.

## Internal architecture references

- `docs/architecture/methodology-pages/work-units/detail-tabs.md`
- `docs/architecture/methodology-pages/methodology-facts.md`
- `packages/contracts/src/methodology/fact.ts`
