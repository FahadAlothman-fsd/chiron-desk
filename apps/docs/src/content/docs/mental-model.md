---
title: Mental Model
---
Chiron teaches a public four-layer model for how agentic delivery is structured.

That model exists to support a smaller operational idea: move work through a safe execution loop without losing context or evidence.

The simplest way to hold the system in your head is this:

- **Design Time** defines the method.
- **Project Runtime** shows that method in motion.
- **Taskflow** is the running example that keeps the explanation grounded.

Before the four layers, keep this loop in view:

1. **Intent**
2. **Scope**
3. **Pattern**
4. **Build**
5. **Verify**
6. **Next**

The layers explain how Chiron makes that loop inspectable. They are not meant to force heavyweight planning before work can start.

## The four public layers

### Methodology Layer

The Methodology Layer defines the reusable operating model.

It owns the methodology-wide vocabulary, the work-unit catalog, shared rules, and the relationships that give the rest of the system shape.

In Taskflow, this is where you decide that work like onboarding, architecture, implementation, and review exist at all.

### Work Unit Layer

The Work Unit Layer defines the durable contract for one kind of work.

This is where facts, artifact slots, workflows, and lifecycle boundaries become explicit for a single work-unit type.

In Taskflow, this is where a setup work unit, a delegated delivery work unit, or a review work unit gets its own contract.

### Workflow Layer

The Workflow Layer defines how a specific piece of work runs.

It is the layer that binds execution paths to transitions and makes the methodology operational instead of descriptive.

In Taskflow, this is where onboarding can collect context, implementation can follow an existing pattern, and review can route work toward approval or rework.

### Step Layer

The Step Layer defines the explicit nodes inside a workflow.

Chiron’s step taxonomy is:

- `form`
- `agent`
- `action`
- `invoke`
- `branch`

This layer is real in the product story, but parts of its deeper authoring and runtime depth are still not fully implemented.

## Design Time and Project Runtime

### Design Time

Design Time is where you author the method.

That includes:

- shaping the Methodology Layer
- defining work-unit contracts
- attaching workflows to transitions
- deciding what artifacts and facts matter

### Project Runtime

Project Runtime is where you watch that method drive real work, evidence, transitions, and review loops inside an actual project.

That includes:

- seeing active work-unit instances
- checking readiness and state
- tracing workflow execution
- reviewing outputs and deciding on next moves

## Taskflow as the running example

Taskflow is the single public example used throughout the docs. It anchors one runtime slice that stays concrete all the way through implementation:

- `setup`
- `brainstorming`
- `research`
- `product_brief`
- `prd`
- `implementation`

That slice lets the docs teach one consistent story from first runtime setup to validated delivery outputs.

### How the public slice connects

1. **Setup and onboarding** creates the first durable baseline.
2. **Brainstorming** and **Research** refine direction and gather evidence.
3. **Product Brief** and **PRD** turn that signal into durable planning contracts.
4. **Implementation** uses those contracts to plan, execute, and validate delivery.

## Why the split matters

Without this split, everything collapses into one vague automation surface.

Chiron keeps these concerns separate on purpose:

- Methodology Layer
- Work Unit Layer
- Workflow Layer
- Step Layer

That helps you keep scope, durable contracts, execution flow, branching, and review readable.

It also makes optional branches easier to reason about. Research, brainstorming, or heavier planning can still exist, but they should appear when they unblock delivery, not as mandatory front-loaded ceremony.

## Terminology note

Public docs use the clear layer names above.

If you are coming from older internal material, use the [glossary](/reference/glossary) and the [legacy layer bridge](/reference/legacy-layer-bridge).
