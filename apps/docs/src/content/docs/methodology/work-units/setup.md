---
title: Setup Work Unit
---

`setup` is the runtime entry point for the seeded methodology.

Its job is not to finish planning. Its job is to create the first durable baseline and launch the right downstream work.

## Purpose

`setup` captures enough grounded project context to let the rest of the method start safely.

## When it starts

In the current seeded MVP, `setup` is the entry work unit and runs on the primary `activation_to_done` lifecycle path.

## Durable facts

`setup` owns one durable work-unit fact:

- `setup_path_summary`

## Artifact slots

`setup` owns one primary artifact slot:

- `PROJECT_OVERVIEW`

## Workflow shape

The current seeded `setup-project` workflow runs in this order:

1. `greenfield_setup_agent`
2. `propagate_setup_outputs`
3. `branch_need_brainstorming`
4. `invoke_brainstorming_work`
5. `branch_need_research`
6. `invoke_research_work`

## What it creates downstream

The current contract intentionally creates draft specs for:

- `brainstorming`
- `research`

It does **not** invoke `product_brief` directly.

## Completion logic

The current completion gate for `setup` requires:

- durable `setup_path_summary`
- durable `PROJECT_OVERVIEW`

## Why it is shaped this way

The seeded MVP keeps `setup` greenfield-first and intentionally small.

That avoids turning onboarding into a heavyweight planning ritual while still leaving behind enough durable structure for downstream discovery and planning work.
