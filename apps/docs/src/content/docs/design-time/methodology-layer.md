---
title: Methodology Layer
---
The Methodology Layer is the global design-time surface for a methodology version.

Its job is to define reusable structure, not to force every possible work type into the default path.

It answers questions like:

- Which work-unit types exist?
- Which methodology-wide facts exist?
- Which dependency definitions can other surfaces reuse?
- Which work units belong in the catalog?

This layer stays global. It does not own the full contract of any single work unit.

## What the Methodology Layer owns

The Methodology Layer owns methodology-wide structure that many work units can share.

### Methodology-wide facts

Methodology-wide facts define reusable inputs or defaults for the whole method.

Examples in a Taskflow-style methodology might include:

- `project_context`
- `story_intent`
- `output_language`

These facts are different from work-unit facts. A methodology-wide fact is reusable across the method. A work-unit fact belongs to one work-unit type.

## Dependency definitions

Dependency definitions are first-class design-time objects in the Methodology Layer.

They define reusable dependency semantics once, then other surfaces reference them.

Examples:

- `depends_on`
- `informs`
- `blocks`
- `references`

Their job is semantic, not enforcement.

That means the Methodology Layer defines what a dependency means. It does not decide whether a transition is blocked. Gate policy and transition requirements stay in the Work Unit Layer, inside a work unit's state machine.

### Why dependency definitions live here

Keeping dependency definitions global gives the methodology one shared vocabulary.

Without that layer, each work unit could invent its own meaning for upstream relationships. That would make topology harder to scan and transition policy harder to reason about.

## Work-unit catalog

The Methodology Layer also owns the work-unit catalog.

The catalog tells you which work-unit types exist in the method and how they relate at a high level.

Typical catalog entries in Taskflow might include:

- Setup
- PRD
- Architecture
- Epic
- Story
- Review

Additional work such as brainstorming or research can still exist here, but they are best treated as optional support branches unless the methodology truly depends on them.

At this layer, you are still looking at the method as a whole. You can see the catalog and the broad topology, but you have not stepped into the contract of one selected work unit yet.

> **Screenshot placeholder**
> Methodology Layer overview showing methodology-wide facts, dependency definitions, and the Taskflow work-unit catalog.

## Taskflow example

In Taskflow, the Methodology Layer might define:

- a methodology-wide fact like `project_context`
- a dependency definition like `depends_on`
- a catalog that includes `Research`, `PRD`, `Architecture`, and `Story`

That global setup lets the rest of the method stay consistent.

For example, both `PRD` and `Story` can reference the same dependency definition, while the exact blocking rule still lives later in each work unit's transition policy.

The important design choice is proportionality. A good methodology catalog makes the common path obvious and keeps heavier planning or discovery work available without making it mandatory.

## What this layer does not own

The Methodology Layer does not own the full contract of a selected work unit.

It does not define:

- work-unit facts for one work-unit type
- artifact slots for one work-unit type
- lifecycle states and transitions for one work-unit type
- workflow bindings for one work-unit type

Those belong in the [Work Unit Layer](/design-time/work-unit-layer/).

## Versioning and publishing

Methodologies are versioned and published, but that is not the main teaching goal of this page.

The important point is simple: you pin projects to stable methodology versions, and design-time authoring happens inside that version scope.

## Internal architecture references

For contributors working inside the repo, use these local internal references:

- `docs/architecture/methodology-pages/methodology-facts.md`
- `docs/architecture/methodology-pages/dependency-definitions.md`
- `docs/architecture/methodology-pages/versions.md`
- `docs/architecture/chiron-module-structure.md`
