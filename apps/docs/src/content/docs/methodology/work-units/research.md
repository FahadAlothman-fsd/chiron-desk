---
title: Research Work Unit
---

`research` is the seeded work unit for evidence gathering.

## Purpose

Its job is to make evidence durable so later planning and execution can point to it explicitly.

## When it starts

In the public seeded path, `research` is typically created by `setup` and runs through the primary `activation_to_done` transition.

## Durable facts

The current seeded `research` contract includes:

- `setup_work_unit`
- `brainstorming_work_unit`
- `research_type`
- `research_topic`
- `research_goals`
- `scope_notes`
- `market_source_inventory`
- `market_research_synthesis`
- `domain_source_inventory`
- `domain_research_synthesis`
- `technical_source_inventory`
- `technical_research_synthesis`

## Artifact slots

`research` currently owns:

- `RESEARCH_REPORT`

## Workflow shape

The main `research` workflow currently runs in this order:

1. `research_scope_confirmation`
2. `propagate_research_scope_inputs`
3. `branch_research_kind`
4. one path agent
5. one path propagation action

## Research branches

The branch can route into:

- market research
- domain research
- technical research

This keeps one shared contract for scope and lifecycle while still allowing different evidence paths.

## Why it is shaped this way

The seeded method uses one branched `research` work unit instead of three separate top-level work units. That keeps the public model smaller while still preserving path-specific outputs.
