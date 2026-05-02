---
title: Taskflow Research
---

This page shows what happens after Taskflow setup creates `research` work.

The runtime goal is to gather evidence that can challenge or confirm the assumptions already surfaced during setup and brainstorming.

## Why Taskflow runs Research here

Taskflow is not just choosing a product direction. It is also entering a competitive space with strong existing tools and non-trivial technical expectations.

That means the runtime path needs evidence about:

- the market and competitive landscape
- the working habits of small software teams
- the technical expectations around collaboration, integrations, and responsiveness

Research is the stage where that evidence becomes durable.

Behind the scenes, this run is using the default seeded methodology, but this page stays focused on the runtime experience. If you want the work-unit contract behind this stage, read the [Research work-unit reference](/methodology/work-units/research).

## Workflow steps shown on this page

This walkthrough follows the seeded `Research` workflow in order:

1. **Research Scope Confirmation**
2. **Propagate Research Scope Inputs**
3. **Branch Research Kind**
4. one path agent:
   - **Market Research Agent**
   - **Domain Research Agent**
   - **Technical Research Agent**
5. one matching path propagation step

The runtime page focuses on the shared path first, then shows how one selected research branch becomes visible in execution.

## Step-by-step runtime walkthrough

### 1. Research Scope Confirmation

`research_scope_confirmation`

This is the opening step for the Research work unit.

#### What to write in this section

Explain that Research starts by confirming what kind of evidence Taskflow actually needs. This keeps the work unit from drifting into broad open-ended research that later planning cannot reuse well.

#### Screenshot placeholder

> **Screenshot placeholder — `01-research-scope-confirmation.png`**
> Capture the `Research` work unit with the `Research` workflow open and **Research Scope Confirmation** active. Best case: show the current research type, topic, and goals.

### 2. Propagate Research Scope Inputs

`propagate_research_scope_inputs`

This action step carries the confirmed scope forward so the branch step and downstream path can use it consistently.

#### What to write in this section

Explain that the workflow first confirms the research framing, then makes that framing available to the rest of the path. This keeps the later branch grounded in an explicit scope decision.

#### Screenshot placeholder

> **Screenshot placeholder — `02-propagate-research-scope-inputs.png`**
> Capture **Propagate Research Scope Inputs** with the action detail visible. The screenshot should make it clear that the chosen scope is being carried forward deliberately.

### 3. Branch Research Kind

`branch_research_kind`

This branch step decides which research path the current work unit should follow.

#### What to write in this section

Explain that the seeded contract keeps one Research work unit but allows it to route into market, domain, or technical evidence gathering depending on what the project actually needs.

#### Screenshot placeholder

> **Screenshot placeholder — `03-branch-research-kind.png`**
> Capture **Branch Research Kind** with the route evaluation visible. The screenshot should make it easy to see which path was chosen and which other paths were available.

### 4. Research path agent

One of the following path agents becomes active next:

- **Market Research Agent** (`market_research_agent`)
- **Domain Research Agent** (`domain_research_agent`)
- **Technical Research Agent** (`technical_research_agent`)

For Taskflow, that can mean one or more of:

- **Market research** for competitors, positioning, and pricing assumptions
- **Domain research** for team habits, collaboration patterns, and workflow needs
- **Technical research** for integrations, real-time concerns, and implementation constraints

This keeps one consistent research work-unit contract while still allowing different evidence paths.

#### What to write in this section

Explain that the screenshot on this page should focus on the path that best tells the Taskflow story. Market research is usually the clearest default because it shows competitors and positioning directly, but the page should note that the same branch structure can route to domain or technical work instead.

#### Screenshot placeholders

> **Screenshot placeholder — `04-market-research-agent.png`**
> Capture **Market Research Agent** if the Taskflow run used the market path. Show the step execution detail and, if possible, the visible synthesis or source inventory being created.

> **Screenshot placeholder — `06-domain-research-agent.png`**
> Optional capture for **Domain Research Agent** if you want the docs to show a second branch example.

> **Screenshot placeholder — `07-technical-research-agent.png`**
> Optional capture for **Technical Research Agent** if you want the docs to show a third branch example.

### 5. Path output propagation

For the selected route, the matching propagation step makes the path outputs durable.

Examples include:

- **Propagate Market Research Outputs** (`propagate_market_research_outputs`)
- **Propagate Domain Research Outputs** (`propagate_domain_research_outputs`)
- **Propagate Technical Research Outputs** (`propagate_technical_research_outputs`)

#### What to write in this section

Explain that the final step on the chosen path turns the research result into durable work-unit outputs and the canonical report artifact. This is what makes the evidence reusable later.

#### Screenshot placeholder

> **Screenshot placeholder — `05-propagate-market-research-outputs.png`**
> Capture the propagation step for the branch you want to feature most clearly. If the page is showing the market path, capture **Propagate Market Research Outputs** with the durable outputs visible.

## What durable outputs matter here

The important outputs are:

- `research_type`
- `research_topic`
- `research_goals`
- `scope_notes`
- a path-specific source inventory
- a path-specific research synthesis
- the canonical `RESEARCH_REPORT` artifact

For Taskflow, those outputs should leave the product with evidence it can point to later rather than vague “we looked into it” claims.

## Research Report artifact

The `RESEARCH_REPORT` artifact is the durable record that carries the current path's evidence forward.

#### Screenshot placeholder

> **Screenshot placeholder — `08-research-report-artifact.png`**
> Capture the `RESEARCH_REPORT` artifact attached to the work unit. Best case: show the artifact name and a readable preview in the same shot.

## How Research helps later work

Research feeds later planning in two ways:

1. it gives the Product Brief a stronger source base
2. it gives the PRD and Implementation stages explicit constraints and validated assumptions

That is why this stage matters even if the product vision already sounds plausible.

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the Research work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. a clearer branch view that shows all research kinds at once
2. stronger labeling of the currently selected path
3. clearer separation between path-specific outputs and shared scope inputs
4. a larger artifact preview area for `RESEARCH_REPORT`

## Continue reading

- Previous stage: [/taskflow/brainstorming](/taskflow/brainstorming)
- Next stage: [/taskflow/product-brief](/taskflow/product-brief)
- Methodology reference: [/methodology/work-units/research](/methodology/work-units/research)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/research/`
