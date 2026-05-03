---
title: Augmented BMAD Overview
---

The default seeded methodology is derived from BMAD, but it is not a verbatim transplant.

It is intentionally simplified and expressed through Chiron's runtime and design-time primitives.

## What “augmented BMAD” means here

In this repo, BMAD is used as a structured planning and execution shape, not as a heavy ceremony requirement.

The seeded method augments that shape by making the important pieces durable and inspectable:

- facts are typed instead of informal notes
- workflows are explicit instead of implied
- steps are modeled instead of hidden in prompt prose
- states and transitions are explicit lifecycle policy
- artifacts are first-class outputs

## Why this is simpler than loose agent orchestration

Without these contracts, a methodology can devolve into a chain of chats where no one can easily answer:

- what work exists
- what inputs were actually used
- what the current state is
- what evidence was produced
- why downstream work was created

The seeded method avoids that by making the method inspectable.

## The current work-unit spine

The Section A seeded catalog currently includes:

- `setup`
- `brainstorming`
- `research`
- `product_brief`
- `prd`
- `implementation`
- `ux_design`
- `architecture`

The public methodology reference in this section focuses on the first six because they form the default runtime story currently surfaced in Taskflow.

## The default lifecycle pattern

All of the seeded work units currently use the same primary transition key: `activation_to_done`.

That keeps the public seeded MVP simple:

- activation starts the work
- the bound workflow runs
- completion conditions decide whether the work can become `done`

## Where to go next

- [/methodology/structure](/methodology/structure)
- [/methodology/work-units/](/methodology/work-units/)
