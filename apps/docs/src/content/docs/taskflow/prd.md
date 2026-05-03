---
title: Taskflow PRD
---

This page shows how Taskflow turns the Product Brief, Brainstorming outputs, and Research evidence into a durable requirement contract.

## What the PRD is doing here

For Taskflow, the PRD is where product framing becomes explicit planning.

It is responsible for producing durable answers about:

- product vision
- success criteria
- user journeys
- scope
- functional requirements
- non-functional requirements

It also decides whether the runtime path should create `implementation` work next.

Behind the scenes, this run is using the default seeded methodology, but this page stays focused on the runtime experience. If you want the work-unit contract behind this stage, read the [PRD work-unit reference](/methodology/work-units/prd).

## Workflow steps shown on this page

This walkthrough follows the seeded `Create PRD` workflow in order:

1. **PRD Input Selection**
2. **PRD Requirements Authoring Agent**
3. **PRD Finalize Agent**
4. **PRD Implementation Spec Authoring Agent**
5. **Branch Need Implementation**
6. **Invoke Implementation Work**
7. **Propagate PRD Outputs**

Each section below uses the display name that should appear in the UI. Where useful, the internal step key is included secondarily.

## Step-by-step runtime walkthrough

### 1. PRD Input Selection

`prd_input_selection`

This is the opening step for the PRD work unit.

#### What to write in this section

Explain that PRD starts by selecting the upstream work that should anchor the requirement contract. This keeps the PRD grounded in the existing Product Brief, Brainstorming, and Research signal.

#### Screenshot placeholder

> **Screenshot placeholder — `01-prd-input-selection.png`**
> Capture the `PRD` work unit with the `Create PRD` workflow open and **PRD Input Selection** active. Best case: show which upstream work units are selected.

### 2. PRD Requirements Authoring Agent

`prd_requirements_authoring_agent`

This is the main requirement-writing step for the PRD stage.

#### What to write in this section

Explain that this step turns the upstream product framing into durable requirements rather than loose planning notes. It should produce the core requirement contract that later execution can trust.

#### Screenshot placeholder

> **Screenshot placeholder — `02-prd-requirements-authoring-agent.png`**
> Capture **PRD Requirements Authoring Agent** with the step execution detail visible. Best case: show visible requirement outputs such as vision, scope, or functional requirements.

### 3. PRD Finalize Agent

`prd_finalize_agent`

This is the step that converges the authored requirements into the final PRD synthesis and artifact state.

#### What to write in this section

Explain that the PRD stage does not stop at partial notes. This step is where the durable contract becomes coherent enough to be treated as the canonical planning artifact.

#### Screenshot placeholder

> **Screenshot placeholder — `03-prd-finalize-agent.png`**
> Capture **PRD Finalize Agent** with the synthesis or finalization state visible.

### 4. PRD Implementation Spec Authoring Agent

`prd_implementation_spec_authoring_agent`

This step writes the implementation draft signal that can later create execution work.

#### What to write in this section

Explain that the seeded PRD stage is not only about requirements. It also prepares the structured implementation handoff so the next work unit starts with explicit scope, constraints, and mode rather than a blank prompt.

#### Screenshot placeholder

> **Screenshot placeholder — `04-prd-implementation-spec-authoring-agent.png`**
> Capture **PRD Implementation Spec Authoring Agent** with the implementation draft/spec signal visible if possible.

### 5. Branch Need Implementation

`branch_need_implementation`

This branch step decides whether the current PRD run should create downstream Implementation work.

#### What to write in this section

Explain that the PRD stage can make the execution handoff explicit. In the Taskflow story, that answer is yes, because the planning contract is strong enough to launch real downstream work.

#### Screenshot placeholder

> **Screenshot placeholder — `05-branch-need-implementation.png`**
> Capture **Branch Need Implementation** with the route evaluation visible. The screenshot should make it obvious that the workflow resolved toward creating Implementation work.

### 6. Invoke Implementation Work

`invoke_implementation_work`

This invoke step creates the downstream `Implementation` work unit from the draft inputs written earlier in PRD.

#### What to write in this section

Explain that this is where the PRD stage stops being just a planning document and becomes a controlled execution handoff.

#### Screenshot placeholder

> **Screenshot placeholder — `06-invoke-implementation-work.png`**
> Capture **Invoke Implementation Work** with the created downstream `Implementation` work unit visible. Best case: also show the mapped draft/spec inputs used for creation.

### 7. Propagate PRD Outputs

`propagate_prd_outputs`

This action step turns the PRD outputs into durable facts and artifacts.

#### What to write in this section

Explain that this step preserves the requirement contract and the implementation handoff signal in a form the rest of the runtime can inspect directly.

#### Screenshot placeholder

> **Screenshot placeholder — `07-propagate-prd-outputs.png`**
> Capture **Propagate PRD Outputs** with the durable output propagation visible.

## Why this is more than a document step

The PRD stage is not just a document writer. In the seeded methodology, it also authors implementation draft specs that can be passed into downstream execution.

That matters for Taskflow because later work should not have to infer:

- what kind of implementation mode is intended
- which constraints must be respected
- what scope should be tackled first
- which files or surfaces are most likely to change

Those planning signals are made durable here.

## What comes out of the PRD stage

For the public example, the important outputs are:

- `product_vision`
- `success_criteria`
- `user_journeys`
- `scope_plan`
- `functional_requirements`
- `non_functional_requirements`
- `prd_synthesis`
- the canonical `PRD` artifact
- implementation draft specs that can create downstream work

## PRD artifact

The `PRD` artifact is the main durable record that later execution work can reference directly.

#### Screenshot placeholder

> **Screenshot placeholder — `08-prd-artifact.png`**
> Capture the `PRD` artifact attached to the work unit. Best case: show the artifact name and a readable preview in the same shot.

## The Taskflow handoff

Once the PRD stage is done, Taskflow should have enough structure to move from planning into execution. That is why the next meaningful runtime handoff is `implementation`.

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the PRD work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. a clearer upstream-work selection panel
2. a clearer distinction between requirement authoring and implementation handoff authoring
3. stronger branch-route visibility on **Branch Need Implementation**
4. clearer created-work visibility on **Invoke Implementation Work**

## Continue reading

- Previous stage: [/taskflow/product-brief](/taskflow/product-brief)
- Next stage: [/taskflow/implementation](/taskflow/implementation)
- Methodology reference: [/methodology/work-units/prd](/methodology/work-units/prd)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/prd/`
