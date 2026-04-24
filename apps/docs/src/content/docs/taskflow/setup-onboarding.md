---
title: Taskflow Setup And Onboarding
---
This scenario slice shows how Taskflow starts.

It begins at Design Time, where you define the method, then moves into Project Runtime, where a real project starts using that method.

## At Design Time

You first shape Taskflow as a reusable method.

### Methodology Layer

At the Methodology Layer, you decide which kinds of work Taskflow needs.

For example, they may define work such as:

- setup
- planning
- delivery
- review

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

It might collect project context, ask for missing inputs, produce an onboarding artifact, and only allow completion when the required starting information is present.

### Step Layer

Inside that workflow, you can think in step types such as form, agent, display, action, and branch.

Public docs use the Step Layer as part of the mental model. Some of the deeper authoring and runtime depth for this layer is still not fully implemented.

> **Screenshot placeholder**
> Taskflow onboarding workflow, showing setup inputs, the branch between greenfield and existing-project onboarding, and the first onboarding artifacts.

## At Project Runtime

Now a real project adopts the Taskflow method.

The project can see which onboarding work-unit instances exist, which facts are still missing, which artifacts already exist, and which transitions are ready to run.

That is the key shift from loose setup documents to inspectable work.

## Where branching appears

Even this early slice can branch.

For example, onboarding might follow one path for a brand new project and another for a project that already has an established repository and delivery conventions.

The branching logic stays attached to the workflow instead of living in tribal knowledge.

## Which artifacts matter here

Taskflow uses setup and onboarding to show that artifacts are first-class outputs, not accidental side effects.

Typical early artifacts might include:

- an onboarding brief
- a project context summary
- a checklist that shows what is ready and what is blocked

Those outputs then become visible to later work. The fan-out slice reuses them as inputs, and the review slice treats them as durable evidence instead of setup-only notes.

## Why this slice matters

Setup and onboarding show the full Design Time to Project Runtime handoff in the smallest possible story.

If this part is clear, the rest of Taskflow is easier to follow.

## Continue the example

- Next: [/taskflow/fan-out-delegation](/taskflow/fan-out-delegation)
- Back to overview: [/taskflow/](/taskflow/)
