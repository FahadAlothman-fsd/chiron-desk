---
title: Taskflow Implementation
---

This page shows how Taskflow moves from durable requirements into code-oriented execution.

## What starts here

Implementation begins only after the PRD stage has produced enough planning signal to create real downstream execution work.

That means Taskflow implementation starts with explicit upstream context, not a blank prompt.

Behind the scenes, this run is using the default seeded methodology, but this page stays focused on the runtime experience. If you want the work-unit contract behind this stage, read the [Implementation work-unit reference](/methodology/work-units/implementation).

## Workflow steps shown on this page

This walkthrough follows the seeded `Implementation` workflow in order:

1. **Implementation Planning Agent**
2. **Implementation Execution Agent**
3. **Implementation Validation Agent**
4. **Propagate Implementation Outputs**

Each section below uses the display name that should appear in the UI. Where useful, the internal step key is included secondarily.

## Step-by-step runtime walkthrough

### 1. Implementation Planning Agent

`implementation_planning_agent`

This is the first active execution step in the Implementation work unit.

#### What to write in this section

Explain that Implementation starts by deciding how the current Taskflow delivery slice should be executed. This step should turn the PRD handoff into a usable execution plan with likely files and constraints.

#### Screenshot placeholder

> **Screenshot placeholder — `01-implementation-planning-agent.png`**
> Capture the `Implementation` work unit with the `Implementation` workflow open and **Implementation Planning Agent** active. Best case: show planning outputs such as likely file changes or implementation scope.

### 2. Implementation Execution Agent

`implementation_execution_agent`

This is the main code-oriented execution step.

#### What to write in this section

Explain that this is where the delivery work itself happens. The important thing to highlight is that execution is still happening inside a named step with inspectable outputs rather than disappearing into a generic chat.

#### Screenshot placeholder

> **Screenshot placeholder — `02-implementation-execution-agent.png`**
> Capture **Implementation Execution Agent** with the step execution detail visible. Best case: show the code-change summary or other visible execution outputs.

### 3. Implementation Validation Agent

`implementation_validation_agent`

This step checks whether the delivered result actually passed the expected validation gates.

#### What to write in this section

Explain that the runtime loop does not treat coding as enough on its own. It also makes validation evidence visible before the work can be treated as done.

#### Screenshot placeholder

> **Screenshot placeholder — `03-implementation-validation-agent.png`**
> Capture **Implementation Validation Agent** with the validation result visible. Best case: show test-related output, validation summary, or other completion evidence.

### 4. Propagate Implementation Outputs

`propagate_implementation_outputs`

This action step turns the execution and validation results into durable implementation facts and artifacts.

#### What to write in this section

Explain that this is the point where execution evidence becomes long-lived runtime state. It is what makes the result inspectable later instead of leaving it trapped in one step execution.

#### Screenshot placeholder

> **Screenshot placeholder — `04-propagate-implementation-outputs.png`**
> Capture **Propagate Implementation Outputs** with the durable output propagation visible.

## The runtime flow

The seeded implementation path is deliberately simple:

1. **Planning** decides the execution approach and likely file changes.
2. **Execution** performs the code-oriented delivery work.
3. **Validation** checks whether the result actually passed the intended gates.
4. **Propagation** makes the final outputs durable.

This is where the runtime example stops being purely planning-oriented and becomes a delivery loop with evidence.

## What durable outputs matter here

The important outputs are:

- `implementation_plan`
- `files_to_change`
- `code_change_summary`
- `validation_summary`
- `test_results`
- `review_findings`
- `implementation_status_summary`

Alongside the main artifacts:

- `IMPLEMENTATION_PLAN`
- `IMPLEMENTED_CODE_CHANGES`
- `IMPLEMENTATION_TEST_REPORT`

## Implementation artifacts

These three artifacts are the clearest durable evidence that the work moved from planning into inspected execution.

#### Screenshot placeholders

> **Screenshot placeholder — `05-implementation-plan-artifact.png`**
> Capture the `IMPLEMENTATION_PLAN` artifact attached to the work unit.

> **Screenshot placeholder — `06-implemented-code-changes-artifact.png`**
> Capture the `IMPLEMENTED_CODE_CHANGES` artifact attached to the work unit.

> **Screenshot placeholder — `07-implementation-test-report-artifact.png`**
> Capture the `IMPLEMENTATION_TEST_REPORT` artifact attached to the work unit.

## What “done” means in the example

For Taskflow, this stage should finish with inspectable execution evidence, not just a claim that work happened.

That means the runtime result should show:

- what was planned
- what changed
- how it was validated
- what follow-ups or open questions remain

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the Implementation work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. clearer separation between planning, execution, and validation outputs
2. better visual grouping for the three final artifacts
3. clearer indication of which outputs are newly written in each agent step
4. easier comparison between validation evidence and the final durable status

## Continue reading

- Previous stage: [/taskflow/prd](/taskflow/prd)
- Runtime surfaces: [/project-runtime/](/project-runtime/)
- Methodology reference: [/methodology/work-units/implementation](/methodology/work-units/implementation)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/implementation/`
