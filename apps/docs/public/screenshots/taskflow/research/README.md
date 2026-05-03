# Taskflow Research Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/research.md` in this folder.

Use these exact filenames:

1. `01-research-scope-confirmation.png`
2. `02-propagate-research-scope-inputs.png`
3. `03-branch-research-kind.png`
4. `04-market-research-agent.png`
5. `05-propagate-market-research-outputs.png`
6. `06-domain-research-agent.png`
7. `07-technical-research-agent.png`
8. `08-research-report-artifact.png`

## What each screenshot should capture

### 01 — Research Scope Confirmation
- `Research` work unit detail page open
- active workflow is `Research`
- active step is **Research Scope Confirmation**
- show the selected research framing if possible

### 02 — Propagate Research Scope Inputs
- active step is **Propagate Research Scope Inputs**
- show the scope-related values being made available for the branch/path logic

### 03 — Branch Research Kind
- active step is **Branch Research Kind**
- show all visible route options if possible
- the chosen route should be visually obvious

### 04 — Market Research Agent
- active step is **Market Research Agent**
- show the market-specific path in execution

### 05 — Propagate Market Research Outputs
- active step is **Propagate Market Research Outputs**
- show path outputs becoming durable

### 06 — Domain Research Agent
- capture this only if you want a second branch example visible in docs
- show the domain-specific path in execution

### 07 — Technical Research Agent
- capture this only if you want a third branch example visible in docs
- show the technical-specific path in execution

### 08 — Research Report artifact
- show the `RESEARCH_REPORT` artifact attached to the work unit
- best case: include a readable preview of the report content

## UI improvements worth making before capture

- The branch UI should make it easy to understand that one workflow contract can route into different research paths.
- The path-specific output panel should clearly label whether the current execution is market, domain, or technical.
