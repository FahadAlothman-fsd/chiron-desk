---
title: Taskflow Setup And Onboarding
---
This scenario slice shows how Taskflow starts.

It begins at Design Time, where you define the method, then moves into Project Runtime, where a real project starts using that method and reaches the `Architecture` work unit.

## At Design Time

You first shape Taskflow as a reusable method.

### Methodology Layer

At the Methodology Layer, you decide which kinds of work Taskflow needs.

For example, they may define work such as:

- setup
- PRD
- Architecture

This is the catalog that the rest of the system will build from.

### Work Unit Layer

Once those work types exist, each one gets a durable contract.

For a setup or onboarding work unit, that contract may define:

- required facts, such as project goals or project constraints
- artifact slots, such as an onboarding brief or kickoff checklist
- lifecycle states, such as draft, ready, and active
- workflows that can move the work forward

### Workflow Layer

The onboarding workflow then explains how setup should run.

It might collect project context, ask for missing inputs, produce an onboarding artifact, and only allow completion when the required starting information is present so the `Architecture` work unit can begin with real context.

### Step Layer

Inside that workflow, you can think in step types such as form, agent, display, action, and branch.

Public docs use the Step Layer as part of the mental model. Some of the deeper authoring and runtime depth for this layer is still not fully implemented.

> **Screenshot placeholder**
> Taskflow onboarding workflow, showing setup inputs, the path to readiness, and the first onboarding artifacts that feed the Architecture work unit.

## At Project Runtime

Now a real project adopts the Taskflow method.

The project can see which onboarding work-unit instances exist, which facts are still missing, which artifacts already exist, and which transitions are ready to run.

That is the key shift from loose setup documents to inspectable work.

## Where the public example stops

This public example stops when onboarding has produced enough structure and context for the `Architecture` work unit to exist as real project work.

At that point the docs have already shown the key handoff:

- Design Time defined the work-unit catalog and workflow contract
- Project Runtime picked up that method as visible work
- onboarding artifacts now feed a named downstream work unit instead of disappearing into setup notes

## Which artifacts matter here

Taskflow uses setup and onboarding to show that artifacts are first-class outputs, not accidental side effects.

Typical early artifacts might include:

- an onboarding brief
- a project context summary
- a checklist that shows what is ready and what is blocked

Those outputs then become visible to the `Architecture` work unit instead of disappearing into setup-only notes.

## Why this slice matters

Setup and onboarding show the Design Time to Project Runtime handoff in the smallest possible story.

If this part is clear, the layer model is easier to follow without committing the public docs to the full downstream delivery lifecycle.

## Continue reading

- Back to overview: [/taskflow/](/taskflow/)
- Runtime work-unit list: [/project-runtime/work-unit-instances](/project-runtime/work-unit-instances)
