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
    details: Taskflow is the single public example used to explain setup, delegation, review, rework, branching, and artifact production.
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

Taskflow appears in three scenario slices:

### 1. Setup and onboarding

You start by shaping the method at Design Time. You define the work-unit catalog, the facts each kind of work owns, the artifact slots that should hold durable outputs, and the workflows that can move work forward.

Then a real project picks up that method at Project Runtime. You can see what work exists, what still needs input, and which onboarding artifacts are already present.

### 2. Fan-out and delegation

Once the project is in motion, a parent work unit can branch into child work. Taskflow uses that slice to show how one piece of work can fan out into several delegated paths without losing structure.

That is where workflows, branching, and artifact production become concrete. Delegation is not just “go do more work.” It stays tied to a work unit, a workflow, and expected outputs.

### 3. Review and rework

Work does not end when an agent produces a draft. Taskflow also shows how review, evidence, approval, rejection, and rework loops fit into the same model.

The result is a system where artifacts, transitions, and review decisions stay visible instead of disappearing into chat history.

## Read next

- [/taskflow/](/taskflow/) for the full Taskflow overview and scenario spine
- [/mental-model](/mental-model) for the layer map and Design Time versus Project Runtime split
- [/reference/glossary](/reference/glossary) for shared vocabulary
- [/reference/legacy-layer-bridge](/reference/legacy-layer-bridge) if you know the older internal layer labels

## Public docs and internal canon

Use these docs when you want the public product story.

Jump into `docs/**` only when you need the deeper internal architecture and planning canon.
