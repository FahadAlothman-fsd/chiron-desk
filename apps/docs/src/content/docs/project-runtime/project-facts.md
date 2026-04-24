---
title: Project Facts
---
Project facts are the first runtime surface an operator checks when they need shared project context.

## What the operator can do

In Taskflow, an operator can open the project facts page and:

- see which project-wide facts currently exist
- filter for missing facts versus present facts
- inspect current values and validation hints
- add or update values that the runtime allows people to edit
- open a fact detail page when a blocker needs closer review

This is the place to answer questions like, "Does this project already know its repo path, target platform, or delivery mode?"

## What runtime object sits behind the page

At runtime, project facts are fact definitions plus their current instances for one project.

The contract exposes cards with:

- the fact definition identity, key, type, and cardinality
- whether any instance exists right now
- how many values are present
- current values
- the operator action to add a new instance when allowed

The detail view goes one level lower. It shows the current values with creation timestamps and whether the runtime allows more edits.

That matters because project facts are runtime state shared across the whole project, not data owned by one work unit instance or one workflow run.

## How Taskflow uses project facts

In Taskflow, project facts can hold shared context such as:

- the repository root path
- a delivery mode like greenfield or brownfield
- project-wide constraints a later workflow needs to read

An operator sees those values once, then watches later workflows and steps read them as needed.

## What this page does not mean

Project facts are not workflow-local scratch space.

If a value belongs only to one workflow execution, it belongs in workflow context facts instead. Operators see that narrower scope on workflow execution pages.

## Back to Design Time

Project facts come from the design-time methodology layer.

- [Methodology Layer](/design-time/methodology-layer)
- Runtime contract authority: `packages/contracts/src/runtime/facts.ts`
- Runtime overview authority: `packages/contracts/src/runtime/overview.ts`

Use the Methodology Layer when you want to understand why a project-wide fact exists at all. Use Project Runtime when you want to see whether this project has actually recorded a value yet.
