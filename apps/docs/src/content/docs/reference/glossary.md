---
title: Glossary
---
This glossary defines the public vocabulary used across the docs site.

Public pages use clear layer names. Older internal shorthand appears only in the legacy bridge.

## Core terms

### Methodology

A reusable operating model for how delivery works.

In Chiron, a methodology defines the work types, rules, and execution structure a project can use.

### Methodology Layer

The public name for the layer that defines the reusable method.

It covers methodology-wide structure, shared rules, and the catalog of work-unit types.

### Work unit

A methodology-defined unit of work.

Examples can include planning, delivery, review, or other structured work you want to supervise.

### Work Unit Layer

The public name for the layer that defines the durable contract for one kind of work.

This is where facts, artifact slots, lifecycle rules, and workflows become explicit for a specific work-unit type.

### Workflow

A structured execution path attached to methodology behavior.

A workflow turns a defined method into something that can actually run.

### Workflow Layer

The public name for the layer that defines how a specific path of work runs.

This is where execution paths connect to transitions and runtime behavior.

### Step

A node inside a workflow.

Step types include `form`, `agent`, `action`, `invoke`, `display`, and `branch`.

### Step Layer

The public name for the layer that explains the explicit nodes inside a workflow.

Some of the deeper authoring and runtime depth for this layer is still not fully implemented.

### Fact

Structured data that the method or a work unit treats as durable state.

Facts can exist at more than one scope, such as methodology-wide facts or work-unit facts.

### Artifact slot

A durable place where a workflow or work unit stores an expected output.

This keeps outputs inspectable instead of treating every file or note as an untyped side effect.

### State

A named lifecycle point for a work unit.

States help you understand where work currently stands.

### Transition

A valid move from one state to another.

Transitions are where policy becomes operational and where workflows can be bound.

### Workflow binding

The connection between a workflow and a transition.

This is how a method says which workflow can run during which change in state.

### Branching

An explicit choice inside a workflow that routes work down one path or another.

In the public docs, Taskflow uses branching in setup, delegation, and review scenarios.

### Review

The human or structured checkpoint where outputs, evidence, or decisions are inspected before work advances.

### Rework

The path where work returns for changes after review.

Rework is part of the method, not an informal side loop.

## Where to go next

- [/mental-model](/mental-model)
- [/taskflow/](/taskflow/)
- [/reference/legacy-layer-bridge](/reference/legacy-layer-bridge)
