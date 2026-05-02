---
title: Implementation Work Unit
---

`implementation` is the seeded execution work unit.

## Purpose

Its job is to plan, execute, and validate code-oriented delivery from durable upstream requirements.

## Inputs

The current seeded `implementation` contract is designed to consume:

- `prd_work_unit`
- `research_work_units`
- `brainstorming_work_units`

## Durable facts

The current seeded `implementation` contract includes:

- `prd_work_unit`
- `research_work_units`
- `brainstorming_work_units`
- `implementation_mode`
- `implementation_constraints`
- `implementation_scope`
- `implementation_plan`
- `files_to_change`
- `code_change_summary`
- `validation_summary`
- `test_results`
- `review_findings`
- `open_implementation_questions`
- `implementation_status_summary`

## Artifact slots

`implementation` currently owns:

- `IMPLEMENTATION_PLAN`
- `IMPLEMENTED_CODE_CHANGES`
- `IMPLEMENTATION_TEST_REPORT`

## Workflow shape

The current seeded `implementation` workflow runs in this order:

1. `implementation_planning_agent`
2. `implementation_execution_agent`
3. `implementation_validation_agent`
4. `propagate_implementation_outputs`

## Lifecycle behavior

Like the other public seeded work units, `implementation` currently uses the primary `activation_to_done` transition. The reader-level meaning is simple: it should only become done once the execution evidence is durable.

## Why it is shaped this way

The seeded method keeps execution separate from PRD so planning and delivery remain inspectable as different kinds of work.

That separation makes it easier to answer:

- what was planned
- what changed
- how the result was validated
- whether the implementation is complete, blocked, or still open
