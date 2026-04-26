---
title: Chiron Docs
template: splash
hero:
  title: Chiron
  tagline: Turn agentic delivery into something you can inspect.
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
  - title: Two tracks, one system
    details: Design Time explains how a method is authored. Project Runtime shows what that method looks like while real work is moving.
  - title: One running example
    details: Taskflow is the single public example used to explain how setup and onboarding lead into the first durable runtime work, ending at the Architecture work unit.
  - title: Clear public language
    details: Public docs use Methodology Layer, Work Unit Layer, Workflow Layer, and Step Layer. Legacy layer labels are kept in bridge pages only.
---

## Shared intro

Chiron is a methodology-first system for **modeling and supervising agentic software delivery** in a structured, inspectable way.

Instead of treating delivery as a loose chain of chats, Chiron gives you durable objects for:

- methodology versions
- typed work units
- explicit states and transitions
- bound workflows
- durable facts and artifact slots
- human-in-the-loop runtime and review surfaces

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

## Taskflow, the running example

These docs use **Taskflow** as one consistent example. Taskflow is not a hardcoded product requirement. It is a representative delivery method that makes the mental model easier to see.

Taskflow appears in one intentionally limited public slice:

### Setup and onboarding into Architecture

You start by shaping the method at Design Time. You define the work-unit catalog, the facts each kind of work owns, the artifact slots that should hold durable outputs, and the workflows that can move work forward.

Then a real project picks up that method at Project Runtime. You can see what work exists, what still needs input, and which onboarding artifacts are already present.

The public example stops once setup produces or activates the `Architecture` work unit for the project. That gives the docs one concrete handoff without pretending the public site needs to teach the whole downstream execution story.

Later delivery, delegation, and review paths exist in the repo and internal docs, but they are not the main public teaching spine right now.

## Read next

- [/taskflow/](/taskflow/) for the narrowed Taskflow overview and setup-to-architecture handoff
- [/mental-model](/mental-model) for the layer map and Design Time versus Project Runtime split
- [/reference/glossary](/reference/glossary) for shared vocabulary
- [/reference/legacy-layer-bridge](/reference/legacy-layer-bridge) if you know the older internal layer labels

## Public docs and internal canon

Use these docs when you want the public product story.

Jump into `docs/**` only when you need the deeper internal architecture and planning canon.
