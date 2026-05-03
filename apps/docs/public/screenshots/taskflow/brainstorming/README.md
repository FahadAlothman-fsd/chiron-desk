# Taskflow Brainstorming Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/brainstorming.md` in this folder.

Use these exact filenames:

1. `01-session-setup.png`
2. `02-facilitate-brainstorming-session.png`
3. `03-need-specialist-techniques.png`
4. `04-propagate-facilitation-outputs.png`
5. `05-invoke-specialist-techniques.png`
6. `06-synthesize-session-outputs.png`
7. `07-propagate-brainstorming-outputs.png`
8. `08-brainstorming-session-artifact.png`

## What each screenshot should capture

### 01 — Session Setup
- `Brainstorming` work unit detail page open
- active workflow is `Brainstorming`
- active step is **Session Setup**
- any framing values already present from Setup should be visible if possible

### 02 — Facilitate Brainstorming Session
- active step is **Facilitate Brainstorming Session**
- show the main conversation area or step execution panel
- best case: visible writes include directional framing or selected technique signal

### 03 — Need Specialist Techniques?
- active step is **Need Specialist Techniques?**
- show the route evaluation clearly
- ideally the taken route is visually distinct from the skipped route

### 04 — Propagate Facilitation Outputs
- active step is **Propagate Facilitation Outputs**
- show outputs from facilitation being prepared for downstream technique invocation

### 05 — Invoke Specialist Techniques
- active step is **Invoke Specialist Techniques**
- show the downstream technique workflow invocation or created workflow execution

### 06 — Synthesize Session Outputs
- active step is **Synthesize Session Outputs**
- show the final convergence/synthesis result area
- best case: visible writes include `selected_directions` and `priority_directions`

### 07 — Propagate Brainstorming Outputs
- active step is **Propagate Brainstorming Outputs**
- show durable output propagation from workflow context into work-unit outputs

### 08 — Brainstorming Session artifact
- show the `BRAINSTORMING_SESSION` / brainstorming session artifact view if available
- if the slot name differs in UI, show the canonical brainstorming session artifact preview and attachment to the work unit

## UI improvements worth making before capture

- Make the branch route result easy to see on **Need Specialist Techniques?**.
- Make the difference between facilitation outputs and final durable outputs obvious.
- Give the artifact preview enough room to capture without opening multiple panels.
