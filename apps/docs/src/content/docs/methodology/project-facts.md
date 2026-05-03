---
title: Project Facts And Durable Context
---

The default seeded methodology uses durable context on purpose. It does not treat important project framing as disposable chat history.

## Methodology-level project facts

The seeded method currently defines reusable project-facing facts such as:

- `project_knowledge_directory`
- `planning_artifacts_directory`
- `implementation_artifacts_directory`
- `repository_type`
- `project_parts`
- `technology_stack_by_part`
- `existing_documentation_inventory`
- `integration_points`

These facts help the method stay grounded across multiple work units.

## Work-unit facts

Each work unit also owns its own durable facts.

Those facts are the durable outputs that later work can rely on without re-reading every conversation or artifact from scratch.

## Context facts versus durable facts

The seeded workflows distinguish between:

- **context facts** for in-flight workflow execution
- **durable facts** for propagated, long-lived outputs

That separation lets the workflow experiment, refine, and validate before it writes the final durable result.

## Why structured JSON matters

Where the methodology stores JSON facts, it uses explicit shapes and sub-schemas instead of amorphous blobs.

That improves:

- inspectability
- validation
- downstream reuse
- predictable agent behavior

## Facts versus artifacts

Facts and artifacts are related, but they are not the same thing.

- facts store durable structured state
- artifacts store durable named outputs such as briefs, PRDs, reports, or implementation evidence

Good methodology design uses both. Facts keep the contract inspectable. Artifacts preserve the richer output.
