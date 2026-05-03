---
title: Taskflow Product Brief
---

This page shows how Taskflow turns upstream setup, brainstorming, and research outputs into a concise product framing.

The Product Brief is intentionally lightweight. Its job is not to replace the PRD. Its job is to make the current product intent durable enough for the PRD stage to work from.

## When this stage starts

In the Taskflow runtime path, Product Brief begins once there is enough upstream signal to synthesize:

- the setup baseline
- the selected brainstorming directions
- the most relevant research outputs

That gives the brief a real source base instead of forcing it to invent product framing in isolation.

Behind the scenes, this run is using the default seeded methodology, but this page stays focused on the runtime experience. If you want the work-unit contract behind this stage, read the [Product Brief work-unit reference](/methodology/work-units/product-brief).

## Workflow steps shown on this page

This walkthrough follows the seeded `Create Product Brief` workflow in order:

1. **Brief Input Selection**
2. **Product Brief Authoring Agent**
3. **Propagate Product Brief Outputs**

Each section below uses the display name that should appear in the UI. Where useful, the internal step key is included secondarily.

## Step-by-step runtime walkthrough

### 1. Brief Input Selection

`brief_input_selection`

This is the opening step for the Product Brief work unit.

#### What to write in this section

Explain that Product Brief starts by choosing which upstream work should feed the synthesis. The important point is that the brief is grounded in selected Setup, Brainstorming, and Research work rather than written in a vacuum.

#### Screenshot placeholder

> **Screenshot placeholder — `01-brief-input-selection.png`**
> Capture the `Product Brief` work unit with the `Create Product Brief` workflow open and **Brief Input Selection** active. Best case: show which upstream work units are selected.

### 2. Product Brief Authoring Agent

`product_brief_authoring_agent`

This is the main synthesis step for the Product Brief stage.

#### What to write in this section

Explain that the Product Brief agent turns distributed upstream signal into a compact but durable product framing. It should make the current product intent clearer without trying to replace the PRD.

#### Screenshot placeholder

> **Screenshot placeholder — `02-product-brief-authoring-agent.png`**
> Capture **Product Brief Authoring Agent** with the step execution detail visible. Best case: show visible authored outputs such as product intent or source context summary.

### 3. Propagate Product Brief Outputs

`propagate_product_brief_outputs`

This action step turns the authored brief outputs into durable work-unit facts and artifacts.

#### What to write in this section

Explain that the value of this stage is not just the agent conversation. It is the durable brief output that later PRD work can inspect directly.

#### Screenshot placeholder

> **Screenshot placeholder — `03-propagate-product-brief-outputs.png`**
> Capture **Propagate Product Brief Outputs** with the durable output propagation visible.

## What the Product Brief is trying to produce

For Taskflow, this stage should leave behind:

- a `product_intent_summary`
- a `source_context_summary`
- a `brief_synthesis`
- any `review_findings`
- any `open_questions`
- the canonical `PRODUCT_BRIEF` artifact

The result should be compact but strong enough to guide downstream requirement writing.

## Product Brief artifacts

The two most important runtime artifacts here are the canonical brief and its distillate/detail pack.

#### Screenshot placeholders

> **Screenshot placeholder — `04-product-brief-artifact.png`**
> Capture the `PRODUCT_BRIEF` artifact attached to the work unit. Best case: show the artifact name and a readable preview in the same shot.

> **Screenshot placeholder — `05-product-brief-distillate-artifact.png`**
> Capture the `PRODUCT_BRIEF_DISTILLATE` artifact if the UI exposes it clearly enough to tell it apart from the main brief.

## Why this stage is separate

Taskflow benefits from a separate Product Brief because it creates a cleaner handoff.

Without it, PRD writing would need to reconstruct product intent from raw setup notes, brainstorming outputs, and research evidence every time. The Product Brief reduces that friction by turning scattered upstream signal into one durable framing document.

## What it means for Taskflow

By the end of this stage, Taskflow should have a stable statement of:

- what product it is trying to become
- which user and workflow problems matter most
- which evidence and directional choices should influence requirements next

## Recommended UI improvements before final capture

If the current UI still makes these states difficult to capture clearly, improve the Product Brief work-unit detail surface before taking final screenshots.

The most valuable UI changes would be:

1. a clearer upstream-work selection panel
2. stronger distinction between the authored brief facts and the final artifacts
3. clearer visual separation between the main brief and the distillate pack

## Continue reading

- Previous stage: [/taskflow/research](/taskflow/research)
- Next stage: [/taskflow/prd](/taskflow/prd)
- Methodology reference: [/methodology/work-units/product-brief](/methodology/work-units/product-brief)
- Screenshot drop folder: `apps/docs/public/screenshots/taskflow/product-brief/`
