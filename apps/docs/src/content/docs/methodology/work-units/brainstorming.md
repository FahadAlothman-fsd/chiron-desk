---
title: Brainstorming Work Unit
---

`brainstorming` is the seeded work unit for directional exploration and convergence.

## Purpose

Its job is to move from broad ideas to durable selected directions.

## When it starts

In the public seeded path, `brainstorming` is typically created by `setup` and runs on the same primary `activation_to_done` lifecycle pattern used across the seeded MVP.

## Durable facts

The current seeded `brainstorming` contract includes:

- `setup_work_unit`
- `brainstorming_focus`
- `desired_outcome`
- `objectives`
- `constraints`
- `technique_outputs`
- `selected_directions`
- `priority_directions`

## Workflow shape

The main `brainstorming` workflow currently runs in this order:

1. `session_setup`
2. `facilitate_brainstorming_session`
3. `branch_need_specialist_techniques`
4. `propagate_facilitation_outputs`
5. `invoke_specialist_techniques`
6. `synthesize_session_outputs`
7. `propagate_brainstorming_outputs`

## Specialist technique workflows

The seeded method also includes these specialist workflows under the same work unit:

- `first_principles_analysis`
- `five_whys_deep_dive`
- `socratic_questioning`
- `stakeholder_round_table`
- `critique_and_refine`

## Completion logic

The public contract emphasis is that Brainstorming is only done once its durable session outputs and selected directions exist.

## Why it is shaped this way

This work unit does not jump straight into implementation planning. It exists to create durable directional clarity first, with optional deeper probing only when needed.
