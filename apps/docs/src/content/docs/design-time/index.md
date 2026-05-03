---
title: Design Time
---
Design Time is the public entry point for methodology authoring in Chiron.

It should be read as a way to author a safe delivery method, not as a requirement to front-load every project with heavyweight planning.

## What Design Time owns

Design Time explains how a reusable method is shaped before a project starts running it.

That includes:

- methodology-wide structure
- work-unit contract boundaries
- workflow ownership inside a work unit
- the public framing for the Step Layer

The default goal is simple: give work a clear path from intent to verification. More elaborate branches only make sense when they help a project move.

## Read this track when you are

- designing or refining a methodology
- deciding which work-unit types exist
- defining facts, artifact slots, and transitions
- explaining how workflows should be attached to work

## Public teaching rule

Public Design Time docs explain the product model with clear layer names. They do not mirror the full internal architecture tree.

When deeper implementation detail matters, the public site links outward to internal canonical docs instead of copying them.

## Taskflow across Design Time

Taskflow keeps the Design Time story concrete.

- the seeded method is authored here
- the Taskflow runtime pages later show that method in motion from setup through implementation

That split is deliberate. Design Time explains how the contract is authored. Taskflow Runtime explains what the resulting work looks like when a project actually runs it.

> **Screenshot placeholder**
> Design Time landing view, showing the four public layers and how the default seeded method shapes the Taskflow runtime journey.

## Next move

Before you dive into detailed pages, make sure the [mental model](/mental-model) is clear. The Methodology Layer, Work Unit Layer, Workflow Layer, and Step Layer are meant to build on one another.
