---
title: Methodology Structure
---

This page explains the building blocks used by the default seeded methodology.

## Work units

Work units are the primary contract boundaries.

Each work unit defines a named kind of work such as `setup`, `research`, `prd`, or `implementation`.

## Methodology and project facts

The seeded method also defines reusable methodology-level facts that shape projects more broadly.

Current seeded examples include:

- `project_knowledge_directory`
- `planning_artifacts_directory`
- `implementation_artifacts_directory`
- `repository_type`
- `project_parts`
- `technology_stack_by_part`
- `existing_documentation_inventory`
- `integration_points`

These are different from work-unit facts. They describe durable project context that more than one work unit may care about.

## Work-unit facts

Work-unit facts belong to a single work-unit contract.

Examples:

- `setup_path_summary` belongs to `setup`
- `brainstorming_focus` belongs to `brainstorming`
- `market_research_synthesis` belongs to `research`
- `prd_synthesis` belongs to `prd`
- `implementation_plan` belongs to `implementation`

## Workflows and steps

Each work unit can expose one or more workflows.

Those workflows are made of typed steps such as:

- forms
- agents
- actions
- branches
- invokes

This keeps the runtime path explicit instead of burying behavior in one monolithic prompt.

## Context facts and propagation

Workflows use context facts to hold in-flight values while steps are executing.

Action steps then propagate the approved outputs into durable work-unit facts or artifact slots.

This distinction matters:

- context facts support workflow execution
- durable facts become long-lived work-unit state

## States and transitions

Lifecycle policy is modeled explicitly.

In the current seeded MVP, the public emphasis is simple: each primary workflow is bound to `activation_to_done`, and completion depends on the work-unit's required facts and artifacts being present.

## Artifacts

Artifact slots are durable output contracts.

They let the methodology say not just “some document exists,” but “this named output belongs here and can be checked later.”

## Draft specs and invoke steps

The seeded methodology also uses draft-spec context to create downstream work in a controlled way.

Examples:

- `setup` creates draft specs for `brainstorming` and `research`
- `prd` creates draft specs for `implementation`

That is how the method turns one work unit's conclusions into the next work unit's starting contract.
