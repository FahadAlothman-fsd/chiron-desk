---
title: Design Time
---
Design Time is the public entry point for methodology authoring in Chiron.

## What Design Time owns

Design Time explains how a reusable method is shaped before a project starts running it.

That includes:

- methodology-wide structure
- work-unit contract boundaries
- workflow ownership inside a work unit
- the public framing for the Step Layer

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

- setup and onboarding starts here, where the method, work-unit contracts, workflows, branches, and first artifact slots are defined
- fan-out and delegation is prepared here, where parent-child work-unit relationships, invoke paths, and returned artifact expectations are authored
- review and rework is prepared here, where approval routes, review evidence, and rework branches become part of the method instead of an improvised side loop

> **Screenshot placeholder**
> Design Time landing view, showing the four public layers and how the three Taskflow slices map onto them.

## Next move

Before you dive into detailed pages, make sure the [mental model](/mental-model) is clear. The Methodology Layer, Work Unit Layer, Workflow Layer, and Step Layer are meant to build on one another.
