---
title: Taskflow Setup And Onboarding
---

This page shows the first real runtime move in the Taskflow example.

The overview work is already done. The project exists, the default methodology is seeded, Taskflow is pinned to it, and Chiron is ready to launch the first transition on the `Setup` work unit.

That is the point where the example stops being generic onboarding and starts becoming real runtime execution.

## What this page covers

This walkthrough follows one clean path:

1. create the operator account
2. seed the default methodology
3. create the Taskflow project
4. open runtime guidance
5. launch the `Setup Project` workflow
6. open the first step
7. start the agent session
8. show what the step actually wrote

The important boundary is simple:

- the [Taskflow Overview](/taskflow/) gets the project ready to start the `Setup` transition
- this page shows what happens once that transition is actually launched

## Before the first step runs

Before the first agent message is sent, the runtime story should already be easy to follow.

The user signs in, seeds the default methodology, creates the Taskflow project, and then uses runtime guidance to launch the `Setup` transition.

### 1. Create the operator account

The runtime story starts with a normal account-creation step.

![Sign up screen](/screenshots/taskflow/setup-onboarding/sign-up.png)

The important thing this screen proves is not the styling. It proves that the user is entering Chiron as an operator who will seed a method, create a project, and run real work through it.

### 2. Seed the default methodology

Once inside Chiron, the first setup action is to seed the default methodology.

![Seed default methodology](/screenshots/taskflow/setup-onboarding/seed-bmad-methodology.png)

This is the moment where the repo stops being an empty shell and gets a real runnable method. In the public example, that method is the default seeded BMAD-derived structure discussed in the separate Methodology section.

### 3. Create the Taskflow project

Next, the user creates Taskflow and pins it to the seeded methodology version.

![Create Taskflow project](/screenshots/taskflow/setup-onboarding/create-taskflow-project.png)

This is where the runtime story becomes project-specific. The user is no longer just browsing methodology definitions. They are creating the actual project instance that will move through runtime.

### 4. Open the project overview

With the project created, the overview page shows what is ready to happen next.

![Taskflow project overview before setup starts](/screenshots/taskflow/setup-onboarding/taskflow-project-overview-start.png)

The most important point on this screen is that Taskflow is now ready to move into the `Setup` work. The overview is not the runtime work itself. It is the surface that makes the next action visible.

### 5. Launch Setup from runtime guidance

The guidance modal is where the first transition becomes explicit.

![Launch Setup workflow](/screenshots/taskflow/setup-onboarding/guidance-page-start-setup.png)

This is the handoff from “the project exists” to “the first runtime workflow is being launched.”

### 6. See Setup as the active work

Once launched, Setup appears as the active work unit and `Setup Project` becomes the current workflow.

![Setup active in runtime guidance](/screenshots/taskflow/setup-onboarding/active-transition-setup.png)

This screen matters because it makes runtime state visible. The project is no longer waiting for a user to decide what to do in a loose chat. Chiron is now tracking active work explicitly.

### 7. Open the workflow execution

The workflow execution page shows the structure of the runtime path before the first step is activated.

![Setup workflow execution page](/screenshots/taskflow/setup-onboarding/workflow-exectuion-page.png)

This is still pre-step runtime. It shows that `Setup Project` is real workflow state with an entry step, not just a conceptual diagram in the docs.

### 8. Open the first step before the session starts

The first step page is where the user sees the actual agent step surface before sending the first message.

![First setup agent step before session start](/screenshots/taskflow/setup-onboarding/agent-step-setup-workflow.png)

This screenshot is important because it marks the beginning of the first real runtime step: **Greenfield Setup Agent**. Up to this point, the overview has been setting everything up to start the Setup transition. Here, the step itself is finally ready to run.

## The first real runtime step: Greenfield Setup Agent

The seeded `Setup Project` workflow starts with:

1. **Greenfield Setup Agent**
2. **Propagate Setup Outputs**
3. **Branch Need Brainstorming**
4. **Invoke Brainstorming Work**
5. **Branch Need Research**
6. **Invoke Research Work**

The first real runtime step is **Greenfield Setup Agent**.

Its job is to understand what Taskflow is, ask for enough framing to proceed safely, and write the first setup-owned outputs that later steps can use.

## The full setup prompt

For the public walkthrough, the clearest version is the full Taskflow framing prompt.

![Full Taskflow setup prompt](/screenshots/taskflow/setup-onboarding/agent-full-prompt.png)

This prompt gives the step enough context to do four things well:

- understand the product and the target users
- understand the product constraints and technical direction
- decide that Brainstorming is needed
- decide that Research is needed

That is why this is the right place to start the runtime story. The point of the first step is not to produce generic notes. It is to create durable runtime outputs that justify the next work.

## What the first step writes

By the end of the first agent step, Setup should have enough information to begin shaping the rest of the path.

The most important outputs are:

- `requires_brainstorming_ctx`
- `requires_research_ctx`
- `setup_path_summary_ctx`
- `project_overview_artifact_ctx`
- `brainstorming_draft_spec_ctx`
- `research_draft_spec_ctx`

The screenshots below focus on the outputs that matter most for the public story.

### Brainstorming is required

![Greenfield Setup Agent writes requires_brainstorming_ctx](/screenshots/taskflow/setup-onboarding/agent-writes-requires-brainstorming.png)

This is the first major routing decision written by the agent step. Taskflow is not treated as a trivial project that can jump straight into implementation planning. The step decides that the product still needs directional refinement, so Brainstorming must be created.

### The project overview artifact is created

![Greenfield Setup Agent writes project overview artifact reference](/screenshots/taskflow/setup-onboarding/agent-writes-artifact.png)

This is where setup proves it is creating durable runtime structure rather than disposable conversation. The project overview becomes a named artifact that later work can inspect directly.

### The research draft is prepared

![Greenfield Setup Agent writes research draft spec](/screenshots/taskflow/setup-onboarding/agent-writes-research-draft.png)

This is the second major routing decision made visible as runtime data. The setup step is not just saying that research sounds useful. It is preparing the downstream draft input that later steps can use to create the `Research` work unit cleanly.

## What this first step actually accomplishes

By the end of **Greenfield Setup Agent**, the Taskflow run has established the baseline required for the rest of the workflow:

- the project is clearly framed as a greenfield product
- the initial setup summary exists
- the canonical project overview artifact exists
- Brainstorming is marked as required
- Research is marked as required
- downstream draft inputs are prepared

That is enough for the rest of the `Setup Project` workflow to continue into propagation, branching, and work-unit creation.

## What the remaining Setup workflow steps do

The rest of Setup is deterministic runtime work built on top of what the first agent step already wrote.

### Propagate Setup Outputs

This action step takes the values written by **Greenfield Setup Agent** and turns them into durable Setup outputs.

In the Taskflow run, that means:

- propagating the setup path summary into durable Setup state
- propagating the project overview into the canonical Setup artifact slot

This is the moment where the agent&apos;s output stops being temporary workflow context and becomes durable runtime state.

### Branch Need Brainstorming

This branch step checks whether the Setup run decided that Taskflow still needs ideation and directional refinement.

In the public example, the answer is yes. Taskflow is a coherent greenfield product idea, but it still needs deeper direction on onboarding, workflow shape, and differentiation before later planning hardens.

### Invoke Brainstorming Work

Once the branch resolves, the invoke step creates the downstream `Brainstorming` work unit from the draft input authored earlier in Setup.

That matters because Setup is not just suggesting the next move. It is creating the next structured work unit with a prepared starting contract.

### Branch Need Research

This branch step checks whether the Setup run also determined that the product still has unanswered questions that need evidence.

In the public example, the answer is also yes. Taskflow still needs explicit validation around market assumptions, competitive positioning, and product direction.

### Invoke Research Work

The final invoke step creates the downstream `Research` work unit from the research draft written during Setup.

At that point, Setup has done its job:

- the baseline is durable
- the overview artifact exists
- Brainstorming has a structured entry point
- Research has a structured entry point

That is the handoff from setup work into the first two supporting branches of the Taskflow runtime path.

## Why this matters

This is the first moment where the public Taskflow example proves the main claim of the product.

The user does not just talk to an agent and lose the result. The result becomes:

- durable runtime facts
- a durable setup artifact
- explicit downstream branching decisions
- structured draft inputs for the next work units

That is the handoff from vague project setup into structured execution.

## Continue reading

- Back to overview: [/taskflow/](/taskflow/)
- Next runtime stage: [/taskflow/brainstorming](/taskflow/brainstorming)
- Runtime work-unit list: [/project-runtime/work-unit-instances](/project-runtime/work-unit-instances)
