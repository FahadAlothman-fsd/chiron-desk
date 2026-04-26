---
title: Project Runtime
---
Project Runtime is where an operator sees Taskflow in motion.

## What you can observe here

When you open a live project in Taskflow, you can:

- check project-wide facts that apply across the run
- open the work units that were created from the pinned methodology
- see which workflow is active inside a transition
- inspect individual step executions, inputs, routing, and outputs
- review runtime evidence before you move work forward

This track explains those operator-facing surfaces first, then shows the runtime object behind each one.

## How to read the runtime track

Project Runtime is easier to follow if you move from the outside in:

1. [Project Overview](/project-runtime/project-overview)
2. [Project Facts](/project-runtime/project-facts)
3. [Work Unit Instances](/project-runtime/work-unit-instances)
4. [Work Unit Instance Detail](/project-runtime/work-unit-instance)
5. [Transition Executions](/project-runtime/transition-executions)
6. [Workflow Executions](/project-runtime/workflow-executions)
7. [Step Executions](/project-runtime/step-executions)
8. [Artifact Slots](/project-runtime/artifact-slots)
9. [Runtime Guidance](/project-runtime/runtime-guidance)

Each page links back to the design-time layer that defines the runtime surface.

## Taskflow running example

The running example stays the same across the public docs.

In the narrowed public Taskflow example, a live project might show:

- project facts like repo path or delivery mode
- work-unit instances like `PRD` and `Architecture`
- the onboarding path that produced enough context for `Architecture` to begin
- the runtime state that makes that handoff visible instead of implicit

## What this track covers

This track stays focused on what an operator can actually inspect or act on in the current product.

- The public docs use this track mainly to make the setup-to-architecture handoff concrete.
- Deeper downstream runtime paths exist, but they are not the main public teaching spine right now.
- Artifact behavior appears here when runtime pages show current snapshots, references, or gating evidence.

If a deeper capability is still partial, the page labels it plainly.

## Back to Design Time

- [Design Time overview](/design-time/)
- [Methodology Layer](/design-time/methodology-layer)
- [Work Unit Layer](/design-time/work-unit-layer/)
- [Workflow Layer](/design-time/workflow-layer/)
- [Step Layer](/design-time/step-layer/)

Design Time defines the method. Project Runtime shows the same method after a project pins to it and starts running.
