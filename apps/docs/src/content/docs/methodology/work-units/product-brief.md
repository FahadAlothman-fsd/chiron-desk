---
title: Product Brief Work Unit
---

`product_brief` is the seeded synthesis work unit that turns upstream setup, brainstorming, and research signal into a concise product framing.

## Purpose

Its job is to produce a durable but lightweight product framing before PRD work begins.

## When it starts

`product_brief` runs after enough upstream work exists to provide real signal, typically from:

- `setup`
- one or more `brainstorming` work units
- optional `research` work units

## Durable facts

The current seeded `product_brief` contract includes:

- `setup_work_unit`
- `brainstorming_work_unit`
- `research_work_units`
- `product_intent_summary`
- `source_context_summary`
- `brief_synthesis`
- `review_findings`
- `open_questions`

## Artifact slots

`product_brief` currently owns:

- `PRODUCT_BRIEF`
- `PRODUCT_BRIEF_DISTILLATE`

## Workflow shape

The current seeded `create-product-brief` workflow runs in this order:

1. `brief_input_selection`
2. `product_brief_authoring_agent`
3. `propagate_product_brief_outputs`

## Why it is shaped this way

The seeded method keeps Product Brief intentionally minimal.

It is a synthesis handoff, not a heavyweight requirement phase. That is why the workflow is a simple `form -> agent -> action` sequence.
