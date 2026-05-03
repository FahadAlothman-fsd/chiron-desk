---
title: Taskflow Overview
---
Taskflow is the public runtime example used across the docs.

It is the product being initialized, refined, planned, and implemented while Chiron runs the method underneath it.

## What Taskflow is

Taskflow is a lightweight task-management product for small software teams.

In the public example, it sits between overly heavy planning tools and overly simple shared checklists. The product needs enough structure for sprint planning, collaboration, and developer workflows, but it also needs to stay approachable for a small team.

That makes it a good example for Chiron because the work naturally moves through setup, discovery, planning, and implementation.

## The Taskflow runtime journey

The public Taskflow section follows one concrete path.

The first responsibility of the overview is simple: get the project to the point where the `Setup` transition can begin cleanly.

That means the early part of the story is about:

- creating the operator account
- seeding the default methodology
- creating the Taskflow project
- pinning it to the methodology version
- opening runtime guidance
- launching the first `Setup` transition

Only after that does the first real runtime step begin.

From there, the runtime story continues like this:

1. **Setup and Onboarding** creates the initial durable baseline.
2. **Brainstorming** refines possible directions.
3. **Research** gathers evidence about the market, domain, and technical constraints.
4. **Product Brief** turns those upstream signals into a concise product framing.
5. **PRD** produces the requirement contract and implementation draft specs.
6. **Implementation** plans, executes, and validates code-oriented delivery.

Each page in this section shows what is happening in the example at runtime, what work exists, what outputs become durable, and what gets created next.

So the boundary is:

- **Taskflow Overview** gets the project ready to start the `Setup` transition
- **Taskflow Setup And Onboarding** shows the first real runtime step once that transition is launched

![Taskflow project overview before setup starts](/screenshots/taskflow/setup-onboarding/taskflow-project-overview-start.png)

This is the moment where the example stops being abstract. The project exists, the methodology is pinned, and the runtime is ready to start the first `Setup` transition.

## Read the runtime walkthrough

- [/taskflow/setup-onboarding](/taskflow/setup-onboarding)
- [/taskflow/brainstorming](/taskflow/brainstorming)
- [/taskflow/research](/taskflow/research)
- [/taskflow/product-brief](/taskflow/product-brief)
- [/taskflow/prd](/taskflow/prd)
- [/taskflow/implementation](/taskflow/implementation)

## Taskflow versus Methodology

Taskflow pages stay concrete. They explain what happens while this example project moves through runtime.

The separate [Methodology](/methodology/) section explains the default seeded method behind that runtime path: the simplified augmented BMAD structure, its work units, its durable facts, and its workflow contracts.

## Related pages

- [/mental-model](/mental-model)
- [/project-runtime/](/project-runtime/)
- [/methodology/](/methodology/)
- [/reference/taskflow-consistency-check](/reference/taskflow-consistency-check)
