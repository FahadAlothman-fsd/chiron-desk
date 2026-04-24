---
title: Mental Model
---
Chiron teaches a public four-layer model for how agentic delivery is structured.

The simplest way to hold the system in your head is this:

- **Design Time** defines the method.
- **Project Runtime** shows that method in motion.
- **Taskflow** is the running example that keeps the explanation grounded.

## The four public layers

### Methodology Layer

The Methodology Layer defines the reusable operating model.

It owns the methodology-wide vocabulary, the work-unit catalog, shared rules, and the relationships that give the rest of the system shape.

In Taskflow, this is where you decide that work like onboarding, planning, implementation, and review exist at all.

### Work Unit Layer

The Work Unit Layer defines the durable contract for one kind of work.

This is where facts, artifact slots, workflows, and lifecycle boundaries become explicit for a single work-unit type.

In Taskflow, this is where a setup work unit, a delegated delivery work unit, or a review work unit gets its own contract.

### Workflow Layer

The Workflow Layer defines how a specific piece of work runs.

It is the layer that binds execution paths to transitions and makes the methodology operational instead of descriptive.

In Taskflow, this is where onboarding can collect context, delegation can fan out, and review can route work toward approval or rework.

### Step Layer

The Step Layer defines the explicit nodes inside a workflow.

Chiron’s step taxonomy is:

- `form`
- `agent`
- `action`
- `invoke`
- `display`
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

Taskflow is the single public example used throughout the docs. It anchors three scenario slices:

- setup and onboarding
- fan-out and delegation
- review and rework

Those slices let the docs teach one consistent story from method setup to delegation to review.

### How the slices connect

1. **Setup and onboarding** shows the method being defined, then picked up by a real project.
2. **Fan-out and delegation** shows one work unit creating or activating more focused work.
3. **Review and rework** shows how evidence, approval, and correction stay inside the same system.

## Why the split matters

Without this split, everything collapses into one vague automation surface.

Chiron keeps these concerns separate on purpose:

- Methodology Layer
- Work Unit Layer
- Workflow Layer
- Step Layer

That helps you keep planning structure, durable contracts, execution flow, branching, and review readable.

## Terminology note

Public docs use the clear layer names above.

If you are coming from older internal material, use the [glossary](/reference/glossary) and the [legacy layer bridge](/reference/legacy-layer-bridge).
