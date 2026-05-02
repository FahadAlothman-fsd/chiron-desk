---
title: Taskflow Setup And Onboarding
---

This page shows the first Taskflow runtime move: a user starts `setup`, the setup agent asks what they are building, and the conversation produces the durable baseline that branches into both `Brainstorming` and `Research`.

Taskflow is the example project being initialized.

Chiron is the system that runs the method.

## What this page is showing

The goal here is to show the smallest honest runtime path from:

- a vague idea for **Taskflow**
- through the first `setup` agent step
- into durable setup outputs
- and then into the first two supporting branches: `Brainstorming` and `Research`

This is the point where the example stops being abstract. The setup agent is not supposed to generate generic project notes. It is supposed to leave behind durable structure that the rest of the Taskflow path can actually use.

Behind the scenes, this run is using Chiron's default seeded methodology, but this page stays focused on the runtime experience. If you want the contract behind `setup`, read the [Setup work-unit reference](/methodology/work-units/setup).

## Workflow steps shown on this page

This walkthrough follows the actual seeded `Setup Project` workflow in order:

1. **Greenfield Setup Agent**
2. **Propagate Setup Outputs**
3. **Branch Need Brainstorming**
4. **Invoke Brainstorming Work**
5. **Branch Need Research**
6. **Invoke Research Work**

Each section below uses the display name that should appear in the UI. Where useful, the internal step key is included secondarily.

## At Project Runtime

Now a real Taskflow project starts the `setup` work unit.

The first runtime step is the setup agent step.

Its job is to learn enough about Taskflow to write:

- a durable `setup_path_summary`
- the `PROJECT_OVERVIEW` artifact
- a `Brainstorming` draft
- a `Research` draft

It should not try to finish every planning activity itself. Its purpose is to define the baseline and launch the next right work.

## The first setup agent step

The setup agent should start with a direct question such as:

> "Tell me about what you're building and what problem you're solving."

For Taskflow, the best walkthrough version is not a generic project summary. It is a Taskflow-specific initialization prompt that gives the setup agent enough context to confidently branch into both Brainstorming and Research.

### Option A — Full prompt

Use this when you want the setup agent to have nearly everything it needs in one pass.

```text
I’m building a task management application called TaskFlow for small software development teams (2-5 people).

Problem:
Existing task management tools are either too complex and heavy for small teams (like Jira or Linear) or too simple for real collaborative delivery. TaskFlow should sit in the middle: simple enough to adopt immediately, but structured enough for sprint planning, team collaboration, and developer workflows.

Target users:
- Small software development teams (2-5 developers)
- Indie hackers and solo founders managing contractors
- Early-stage startups
- Remote-first teams that need async collaboration

Key features:
- Task creation, assignment, due dates, and priorities
- Task dependencies, subtasks, and checklists
- Comments, @mentions, attachments, and activity feed
- Kanban boards and list views
- Sprint and milestone planning
- Simple progress reporting and team visibility
- GitHub integration for linking issues and PRs to tasks
- Real-time updates

Technical direction:
- Greenfield project, starting from scratch
- React + TypeScript web app
- PostgreSQL database
- Real-time collaboration support
- API/integration support
- Mobile-responsive experience first

Team and timeline:
- Solo full-stack developer initially, with part-time design help
- 3-4 months to MVP

Business context:
- Freemium model
- Competing with Asana, ClickUp, Jira, and Linear
- Main differentiation is simpler UX plus developer-friendly workflow support

Constraints:
- Keep the product simple and fast to adopt
- Must support collaborative team workflows without enterprise-heavy complexity
- Should remain performant with active projects and many tasks
- Should be accessible and credible as a real startup product

Workflow guidance:
- Brainstorming is needed because I want help refining the best onboarding, workflow, and differentiation directions for TaskFlow before locking downstream planning.
- Research is also needed because I want explicit evidence about the market, competitive positioning, and product assumptions before finalizing the planning path.
- For this run, I want the workflow to continue cleanly from setup into both Brainstorming and Research so we can test and document the full Taskflow path end to end.
```

### Option B — Multi-turn conversational path

Use this when you want the walkthrough to feel more like a real conversation with the setup agent.

#### User message 1

```text
I’m building TaskFlow, a task management app for small dev teams.

The problem is that existing tools are either too complicated for small teams or too simple for real collaborative delivery.
```

#### If the agent asks for more detail

Add:

```text
The target users are small software teams, indie hackers, and early-stage startups.

The main features I care about are task assignment, dependencies, comments, Kanban boards, sprint planning, GitHub integration, and real-time updates.
```

#### If the agent asks about stack or project shape

Add:

```text
This is a greenfield project.

The technical direction is React, TypeScript, PostgreSQL, and real-time collaboration support. It is a web-first, mobile-responsive product.

The current team is one full-stack developer with part-time design help, aiming for an MVP in 3-4 months.
```

#### If the agent asks what should happen after setup

Add:

```text
After setup I want to run both Brainstorming and Research.

Brainstorming is needed to refine onboarding, workflow shape, and differentiation.
Research is needed to validate market assumptions, competitors, and product direction before later planning.
```

This path is slower than the full prompt, but it is often better for screenshots because it makes the branching logic visible in the conversation.

## Step-by-step runtime walkthrough

### 1. Greenfield Setup Agent

`greenfield_setup_agent`

This is the first active runtime step.

Its job is to read the user's Taskflow framing, ask follow-up questions when needed, and write the first setup-owned workflow outputs. In the public example, this is where the run decides that both Brainstorming and Research should be created later.

#### What to write in this section

Explain that this step is where setup stops being a generic onboarding chat and starts becoming structured runtime work. Call out that the agent is responsible for writing the setup summary, the project overview artifact reference, and the two downstream draft specs.

#### Screenshot placeholder — prompt being sent

> **Screenshot placeholder — `01-greenfield-setup-agent-prompt.png`**
> Capture the `Setup` work unit with the `Setup Project` workflow open and **Greenfield Setup Agent** active. The visible prompt should show the Taskflow product framing plus the instruction that both Brainstorming and Research are wanted after setup.

#### Screenshot placeholder — after the agent step runs

> **Screenshot placeholder — `02-greenfield-setup-agent-after-run.png`**
> Capture the same step after execution. Show the step output or context panel with the newly written values, especially `requires_brainstorming_ctx`, `requires_research_ctx`, `setup_path_summary_ctx`, `project_overview_artifact_ctx`, `brainstorming_draft_spec_ctx`, and `research_draft_spec_ctx`.

### 2. Propagate Setup Outputs

`propagate_setup_outputs`

This is the deterministic action step that promotes the setup summary and project overview into durable setup outputs.

#### What to write in this section

Explain that the agent step writes workflow context first, then this action step turns the approved values into durable work-unit outputs. That distinction is important because it shows the difference between in-flight step state and durable methodology state.

#### Screenshot placeholder

> **Screenshot placeholder — `03-propagate-setup-outputs.png`**
> Capture **Propagate Setup Outputs** with the action detail visible. The screenshot should make it clear that the setup summary and project overview are being promoted into durable outputs rather than remaining temporary context.

### 3. Project Overview artifact

The `PROJECT_OVERVIEW` artifact is one of the two main durable outputs that prove setup completed with usable structure.

#### What to write in this section

Explain that setup does not end with raw notes. It creates a canonical overview artifact that later work can inspect directly.

#### Screenshot placeholder

> **Screenshot placeholder — `04-project-overview-artifact.png`**
> Capture the `PROJECT_OVERVIEW` artifact in the runtime UI. Best case: show the artifact slot name and a readable preview of the artifact content in the same shot.

### 4. Branch Need Brainstorming

`branch_need_brainstorming`

This branch step checks whether setup decided the project still needs ideation and directional refinement.

#### What to write in this section

Explain that Taskflow intentionally routes to Brainstorming because the product still needs clearer direction on onboarding, collaboration shape, and differentiation before later planning hardens.

#### Screenshot placeholder

> **Screenshot placeholder — `05-branch-need-brainstorming.png`**
> Capture **Branch Need Brainstorming** with the evaluated route visible. The screenshot should make it obvious that the branch resolved toward creating Brainstorming work.

### 5. Invoke Brainstorming Work

`invoke_brainstorming_work`

This invoke step creates the downstream `Brainstorming` work unit from the draft spec authored earlier in setup.

#### What to write in this section

Explain that setup is not just recommending next work. It is actually creating the next work unit from structured draft input.

#### Screenshot placeholder

> **Screenshot placeholder — `06-invoke-brainstorming-work.png`**
> Capture **Invoke Brainstorming Work** with the created downstream `Brainstorming` work unit visible. Best case: also show the draft spec or mapped values used for creation.

### 6. Branch Need Research

`branch_need_research`

This branch step checks whether setup decided the project still has open questions that need evidence.

#### What to write in this section

Explain that Taskflow intentionally routes to Research because market assumptions, competitive positioning, and technical unknowns still need durable evidence before later planning should be trusted.

#### Screenshot placeholder

> **Screenshot placeholder — `07-branch-need-research.png`**
> Capture **Branch Need Research** with the evaluated route visible. The screenshot should make it obvious that the branch resolved toward creating Research work.

### 7. Invoke Research Work

`invoke_research_work`

This invoke step creates the downstream `Research` work unit from the research draft spec written during setup.

#### What to write in this section

Explain that the same runtime pattern used for Brainstorming repeats here: a branch decides the route, then an invoke step creates real downstream work with a structured starting contract.

#### Screenshot placeholder

> **Screenshot placeholder — `08-invoke-research-work.png`**
> Capture **Invoke Research Work** with the created downstream `Research` work unit visible. Best case: also show the draft spec or mapped values used for creation.

## What the setup work unit should decide

For the Taskflow walkthrough, the setup agent should leave the first step with these conclusions:

- the project is **greenfield**
- the product is **Taskflow**, a lightweight but collaborative task-management app for small dev teams
- the work is substantial enough to require follow-up planning support
- `Brainstorming` should be created
- `Research` should be created

In other words, setup should not stop at a generic overview. It should create the durable baseline and the two downstream drafts that let the Taskflow path continue.

## What durable outputs matter here

At this point the important setup outputs are:

- a durable setup path summary
- a durable project overview artifact
- a Brainstorming draft that captures the ideation focus
- a Research draft that captures the evidence-gathering focus

Those outputs are what turn the example from a setup chat into inspectable work.

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the setup work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. a stronger step header that emphasizes the display name over the internal key
2. a written-values panel that separates newly written context from inherited context
3. a clearer action-step result view that shows propagation into durable outputs
4. explicit route evaluation on branch steps
5. a created-work preview or reference card on invoke steps
6. an easier-to-capture artifact preview panel for `PROJECT_OVERVIEW`

## Why this slice matters

This is the first moment where the Taskflow example proves the main claim of the product.

The user does not just chat with an agent and lose the result. The result becomes:

- durable facts
- a durable setup artifact
- explicit downstream work creation

That is the handoff from fuzzy initialization to structured execution.

## Continue reading

- Back to overview: [/taskflow/](/taskflow/)
- Next runtime stage: [/taskflow/brainstorming](/taskflow/brainstorming)
- Runtime work-unit list: [/project-runtime/work-unit-instances](/project-runtime/work-unit-instances)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/setup-onboarding/`
