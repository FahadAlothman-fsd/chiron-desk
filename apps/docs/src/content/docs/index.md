---
title: Chiron Docs
template: splash
hero:
  title: Chiron
  tagline: Turn agentic delivery into a safe, inspectable execution loop.
  actions:
    - text: Taskflow Example
      link: /taskflow/
      icon: right-arrow
      variant: primary
    - text: Mental Model
      link: /mental-model
      variant: secondary
    - text: Getting Started
      link: /getting-started
      variant: secondary
features:
  - title: Small primitives, clear flow
    details: "Chiron gives you a small set of primitives for authoring a delivery method, then runs work through a simple loop: Intent, Scope, Pattern, Build, Verify, Next."
  - title: Two tracks, one system
    details: Design Time explains how a method is authored. Project Runtime shows what that method looks like while real work is moving.
  - title: One running example
    details: Taskflow is the single public example used to explain how runtime work moves from setup through planning and into implementation.
---

## Shared intro

Chiron is a system for **authoring and supervising safe agentic software delivery** in a structured, inspectable way.

Instead of treating delivery as a loose chain of chats, Chiron gives you primitives for:

- methodology versions
- typed work units
- explicit states and transitions
- bound workflows
- durable facts and artifact slots
- human-in-the-loop runtime and review surfaces

Those primitives are meant to support a simple default loop:

1. **Intent** — what kind of work is this?
2. **Scope** — what is in or out for this work unit?
3. **Pattern** — which existing code, docs, or references should guide it?
4. **Build** — ship the smallest useful slice.
5. **Verify** — prove the slice worked.
6. **Next** — stop, continue, or escalate.

That means you can ask simple questions and get durable answers.

- What kind of work is this?
- What state is it in?
- Which workflow is allowed to run here?
- What evidence was produced?
- Where did review happen?

## Two tracks, one system

- **Design Time** explains how a methodology is authored and structured.
- **Project Runtime** explains how that design shows up while real work is moving.

You can think of Design Time as defining the method, and Project Runtime as watching that method run.

The important point is that Chiron is not trying to force a heavyweight methodology before work can start. The public story is intentionally biased toward **verified progress**, with heavier planning branches used only when they actually unblock delivery.

## Taskflow, the running example

These docs use **Taskflow** as one consistent example. Taskflow is the product being initialized and moved through runtime. It is not the methodology itself.

The public Taskflow track follows one concrete path:

1. `setup` creates the first durable baseline.
2. `brainstorming` refines direction.
3. `research` gathers evidence.
4. `product_brief` synthesizes the upstream signal.
5. `prd` turns that signal into a requirement contract and implementation drafts.
6. `implementation` plans, executes, and validates code-oriented delivery.

That gives the site one stable runtime story without forcing every page to explain methodology internals at the same time.

If you want the seeded BMAD-derived method behind that story, use the separate [Methodology](/methodology/) section.

## Read next

- [/taskflow/](/taskflow/) for the Taskflow runtime overview and stage-by-stage walkthrough
- [/methodology/](/methodology/) for the default seeded methodology reference
- [/mental-model](/mental-model) for the layer map and Design Time versus Project Runtime split
- [/reference/glossary](/reference/glossary) for shared vocabulary
- [/reference/legacy-layer-bridge](/reference/legacy-layer-bridge) if you know the older internal layer labels

## Public docs and internal canon

Use these docs when you want the public product story.

Jump into `docs/**` only when you need the deeper internal architecture and planning canon.
