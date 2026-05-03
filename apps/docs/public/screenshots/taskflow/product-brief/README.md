# Taskflow Product Brief Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/product-brief.md` in this folder.

Use these exact filenames:

1. `01-brief-input-selection.png`
2. `02-product-brief-authoring-agent.png`
3. `03-propagate-product-brief-outputs.png`
4. `04-product-brief-artifact.png`
5. `05-product-brief-distillate-artifact.png`

## What each screenshot should capture

### 01 — Brief Input Selection
- `Product Brief` work unit detail page open
- active workflow is `Create Product Brief`
- active step is **Brief Input Selection**
- show selected upstream work if possible

### 02 — Product Brief Authoring Agent
- active step is **Product Brief Authoring Agent**
- show the step execution detail and visible authored outputs if possible

### 03 — Propagate Product Brief Outputs
- active step is **Propagate Product Brief Outputs**
- show the brief outputs becoming durable

### 04 — Product Brief artifact
- show the `PRODUCT_BRIEF` artifact visible in the runtime UI
- best case: artifact name plus preview

### 05 — Product Brief Distillate artifact
- show the `PRODUCT_BRIEF_DISTILLATE` artifact if the UI exposes it clearly

## UI improvements worth making before capture

- The upstream work selection view should clearly show which Setup, Brainstorming, and Research inputs were chosen.
- The artifact list should distinguish the canonical brief from the detail/distillate pack.
