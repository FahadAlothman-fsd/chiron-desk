# Taskflow PRD Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/prd.md` in this folder.

Use these exact filenames:

1. `01-prd-input-selection.png`
2. `02-prd-requirements-authoring-agent.png`
3. `03-prd-finalize-agent.png`
4. `04-prd-implementation-spec-authoring-agent.png`
5. `05-branch-need-implementation.png`
6. `06-invoke-implementation-work.png`
7. `07-propagate-prd-outputs.png`
8. `08-prd-artifact.png`

## What each screenshot should capture

### 01 — PRD Input Selection
- `PRD` work unit detail page open
- active workflow is `Create PRD`
- active step is **PRD Input Selection**
- show selected upstream work if possible

### 02 — PRD Requirements Authoring Agent
- active step is **PRD Requirements Authoring Agent**
- show visible requirement-authoring state

### 03 — PRD Finalize Agent
- active step is **PRD Finalize Agent**
- show the final synthesis or artifact-finalization state

### 04 — PRD Implementation Spec Authoring Agent
- active step is **PRD Implementation Spec Authoring Agent**
- show authored implementation draft/spec signal if possible

### 05 — Branch Need Implementation
- active step is **Branch Need Implementation**
- show the evaluated route toward implementation creation

### 06 — Invoke Implementation Work
- active step is **Invoke Implementation Work**
- show that a downstream `Implementation` work unit is being created

### 07 — Propagate PRD Outputs
- active step is **Propagate PRD Outputs**
- show requirement outputs becoming durable

### 08 — PRD artifact
- show the `PRD` artifact in the runtime UI
- best case: artifact name plus preview

## UI improvements worth making before capture

- The PRD page should make the distinction between requirement authoring and implementation handoff obvious.
- The invoke step should show the created downstream `Implementation` work unit reference clearly.
