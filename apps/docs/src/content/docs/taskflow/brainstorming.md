---
title: Taskflow Brainstorming
---

This page shows what happens after Taskflow setup creates a `brainstorming` work unit.

The runtime goal is simple: turn the broad product idea into clearer directions that later planning can actually use.

## Why Taskflow runs Brainstorming here

Setup already established that Taskflow is a greenfield product for small software teams. That is enough to start work, but not enough to confidently lock product direction.

Taskflow still needs help answering questions like:

- which onboarding direction should matter most
- which collaboration features are essential for MVP
- which differentiators are strong enough to keep
- which trade-offs should be made before deeper planning starts

That is why `setup` creates `brainstorming` as a real downstream work unit instead of trying to answer those questions inline.

Behind the scenes, this run is using the default seeded methodology, but this page stays focused on the runtime experience. If you want the work-unit contract behind this stage, read the [Brainstorming work-unit reference](/methodology/work-units/brainstorming).

## Workflow steps shown on this page

This walkthrough follows the seeded `Brainstorming` workflow in order:

1. **Session Setup**
2. **Facilitate Brainstorming Session**
3. **Need Specialist Techniques?**
4. **Propagate Facilitation Outputs**
5. **Invoke Specialist Techniques**
6. **Synthesize Session Outputs**
7. **Propagate Brainstorming Outputs**

Each section below uses the display name that should appear in the UI. Where useful, the internal step key is included secondarily.

## What the runtime work is trying to produce

In the public example, Brainstorming should converge on:

- a clear `brainstorming_focus`
- a concrete `desired_outcome`
- a usable set of `objectives`
- explicit `constraints`
- durable `selected_directions`
- prioritized `priority_directions`

It also leaves behind the canonical brainstorming session artifact so later work can inspect what happened instead of relying on memory.

## Step-by-step runtime walkthrough

### 1. Session Setup

`session_setup`

This is where the Brainstorming work unit confirms the incoming framing from Setup and prepares the session to run coherently.

#### What to write in this section

Explain that Brainstorming starts with structured framing instead of a blank ideation session. Call out that the work unit already knows enough about Taskflow to focus the conversation on the product questions that still need refinement.

#### Screenshot placeholder

> **Screenshot placeholder — `01-session-setup.png`**
> Capture the `Brainstorming` work unit with the `Brainstorming` workflow open and **Session Setup** active. If possible, show the incoming framing values that came from Setup.

### 2. Facilitate Brainstorming Session

`facilitate_brainstorming_session`

This is the main agent step where the broad Taskflow idea is turned into a more concrete directional exploration.

#### What to write in this section

Explain that this step is the core ideation pass. It should frame the problem, surface alternatives, and decide whether the current conversation is enough or whether deeper specialist techniques are needed.

#### Screenshot placeholder

> **Screenshot placeholder — `02-facilitate-brainstorming-session.png`**
> Capture **Facilitate Brainstorming Session** with the step execution detail visible. Best case: show visible written outputs or a clear indication that the session is producing directional signal rather than generic notes.

### 3. Need Specialist Techniques?

`branch_need_specialist_techniques`

This branch step decides whether the current brainstorming run needs deeper structured probing.

#### What to write in this section

Explain that Brainstorming can stay lightweight when the direction is already becoming clear, but it can also route into specialist techniques when the problem still needs deeper interrogation.

#### Screenshot placeholder

> **Screenshot placeholder — `03-need-specialist-techniques.png`**
> Capture **Need Specialist Techniques?** with the route evaluation visible. The screenshot should make it obvious whether the workflow continued directly or routed into deeper technique support.

### 4. Propagate Facilitation Outputs

`propagate_facilitation_outputs`

This action step carries the outputs from the main facilitation phase forward so specialist technique work can use them cleanly.

#### What to write in this section

Explain that this is where the workflow makes the facilitation results available for the optional deeper branch. That keeps the later technique steps grounded in the same session signal instead of restarting from scratch.

#### Screenshot placeholder

> **Screenshot placeholder — `04-propagate-facilitation-outputs.png`**
> Capture **Propagate Facilitation Outputs** with the action detail visible. The screenshot should show that the facilitation results are being carried forward intentionally.

### 5. Invoke Specialist Techniques

`invoke_specialist_techniques`

This invoke step launches any deeper technique workflows selected by the branch and earlier facilitation outputs.

#### What to write in this section

Explain that Brainstorming can create structured deeper work inside the same work-unit family instead of hiding that extra analysis inside one oversized agent turn.

#### Screenshot placeholder

> **Screenshot placeholder — `05-invoke-specialist-techniques.png`**
> Capture **Invoke Specialist Techniques** with the invoked downstream technique workflow visible. Best case: show which technique was selected and that it came from the current brainstorming context.

### 6. Synthesize Session Outputs

`synthesize_session_outputs`

This is the convergence step that turns the session into durable direction.

The important behavior is not “generate lots of ideas.” It is “leave behind a durable directional signal.”

#### What to write in this section

Explain that this is where Brainstorming stops exploring and starts committing to usable outputs. This step should produce the selected directions and priority directions that later work can trust.

#### Screenshot placeholder

> **Screenshot placeholder — `06-synthesize-session-outputs.png`**
> Capture **Synthesize Session Outputs** with the convergence result visible. Best case: show `selected_directions` and `priority_directions` or their UI equivalents.

### 7. Propagate Brainstorming Outputs

`propagate_brainstorming_outputs`

This action step turns the final brainstorming outputs into durable work-unit state and artifact outputs.

#### What to write in this section

Explain that the runtime value of Brainstorming comes from making its conclusions durable. This is the step that makes later Product Brief and PRD work able to inspect the result directly.

#### Screenshot placeholder

> **Screenshot placeholder — `07-propagate-brainstorming-outputs.png`**
> Capture **Propagate Brainstorming Outputs** with the durable output propagation visible.

## What comes out of Brainstorming for Taskflow

By the end of this stage, Taskflow should have a clearer point of view on:

- which product directions are worth carrying forward
- which directions are merely interesting but not primary
- which constraints must shape later requirements

Those outputs feed directly into the Product Brief and PRD later in the runtime path.

## Brainstorming Session artifact

The brainstorming session artifact is the durable record of what happened during the session.

#### Screenshot placeholder

> **Screenshot placeholder — `08-brainstorming-session-artifact.png`**
> Capture the brainstorming session artifact attached to the work unit. Best case: show the artifact name and a readable preview in the same shot.

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the Brainstorming work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. clearer route result visibility on **Need Specialist Techniques?**
2. clearer distinction between facilitation outputs and final durable outputs
3. easier capture of invoked specialist technique details
4. a larger artifact preview area for the brainstorming session record

## Continue reading

- Previous stage: [/taskflow/setup-onboarding](/taskflow/setup-onboarding)
- Next stage: [/taskflow/research](/taskflow/research)
- Methodology reference: [/methodology/work-units/brainstorming](/methodology/work-units/brainstorming)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/brainstorming/`
