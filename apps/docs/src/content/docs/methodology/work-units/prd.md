---
title: PRD Work Unit
---

`prd` is the seeded requirement-contract and decomposition work unit.

## Purpose

Its job is to turn upstream framing into durable requirements and downstream implementation draft specs.

## Inputs

The current seeded PRD contract is designed to consume:

- `product_brief_work_unit`
- `research_work_units`
- `brainstorming_work_unit`

## Durable facts

The current seeded `prd` contract includes:

- `product_brief_work_unit`
- `research_work_units`
- `brainstorming_work_unit`
- `product_vision`
- `success_criteria`
- `user_journeys`
- `scope_plan`
- `functional_requirements`
- `non_functional_requirements`
- `prd_synthesis`

## Artifact slots

`prd` currently owns:

- `PRD`

## Workflow shape

The current seeded `create-prd` workflow runs in this order:

1. `prd_input_selection`
2. `prd_requirements_authoring_agent`
3. `prd_finalize_agent`
4. `prd_implementation_spec_authoring_agent`
5. `branch_need_implementation`
6. `invoke_implementation_work`
7. `propagate_prd_outputs`

## Why it is shaped this way

This work unit does two distinct jobs:

1. it authors the durable requirement contract
2. it prepares the implementation handoff

That is why the PRD stage stays separate from Implementation rather than collapsing everything into one execution workflow.
