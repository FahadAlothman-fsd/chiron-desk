# Taskflow Setup And Onboarding Screenshots

Place the screenshots for `apps/docs/src/content/docs/taskflow/setup-onboarding.md` in this folder.

Use these exact filenames:

1. `01-greenfield-setup-agent-prompt.png`
2. `02-greenfield-setup-agent-after-run.png`
3. `03-propagate-setup-outputs.png`
4. `04-project-overview-artifact.png`
5. `05-branch-need-brainstorming.png`
6. `06-invoke-brainstorming-work.png`
7. `07-branch-need-research.png`
8. `08-invoke-research-work.png`

These images will eventually be addressable from the docs site at:

- `/screenshots/taskflow/setup-onboarding/01-greenfield-setup-agent-prompt.png`
- `/screenshots/taskflow/setup-onboarding/02-greenfield-setup-agent-after-run.png`
- `/screenshots/taskflow/setup-onboarding/03-propagate-setup-outputs.png`
- `/screenshots/taskflow/setup-onboarding/04-project-overview-artifact.png`
- `/screenshots/taskflow/setup-onboarding/05-branch-need-brainstorming.png`
- `/screenshots/taskflow/setup-onboarding/06-invoke-brainstorming-work.png`
- `/screenshots/taskflow/setup-onboarding/07-branch-need-research.png`
- `/screenshots/taskflow/setup-onboarding/08-invoke-research-work.png`

## What each screenshot should capture

### 01 — Greenfield Setup Agent prompt
- Work unit detail page open for `Setup`
- Active workflow is `Setup Project`
- Active step is **Greenfield Setup Agent**
- The prompt composer or sent user message is visible
- The visible prompt should show:
  - Taskflow as the product name
  - the target users
  - the problem statement
  - that both Brainstorming and Research are wanted after setup

### 02 — Greenfield Setup Agent after run
- Same step detail view after the step has run
- The step output or context panel should show that values were written
- Try to make these visible in one shot if possible:
  - `requires_brainstorming_ctx`
  - `requires_research_ctx`
  - `setup_path_summary_ctx`
  - `project_overview_artifact_ctx`
  - `brainstorming_draft_spec_ctx`
  - `research_draft_spec_ctx`

### 03 — Propagate Setup Outputs
- Active step is **Propagate Setup Outputs**
- The action detail should clearly show that setup outputs are being promoted into durable work-unit outputs
- Ideally show both propagation actions:
  - setup path summary propagation
  - project overview propagation

### 04 — Project Overview artifact
- The `PROJECT_OVERVIEW` artifact visible in the runtime UI
- Best case: artifact slot panel plus rendered content preview
- At minimum, show that the artifact exists, is named correctly, and is attached to the Setup work unit

### 05 — Branch Need Brainstorming
- Active step is **Branch Need Brainstorming**
- Show the evaluated route or condition result
- It should be visually obvious that the branch resolved toward Brainstorming creation

### 06 — Invoke Brainstorming Work
- Active step is **Invoke Brainstorming Work**
- Show that a downstream `Brainstorming` work unit is being created
- Best case: show the draft spec or propagated values used to create it

### 07 — Branch Need Research
- Active step is **Branch Need Research**
- Show the evaluated route or condition result
- It should be visually obvious that the branch resolved toward Research creation

### 08 — Invoke Research Work
- Active step is **Invoke Research Work**
- Show that a downstream `Research` work unit is being created
- Best case: show the draft spec or propagated values used to create it

## UI improvements worth making before capture

If the current UI makes these screenshots confusing, improve the page so each step view exposes these clearly:

1. **Step header clarity**
   - Display name prominent
   - step type badge (`agent`, `action`, `branch`, `invoke`)
   - internal key secondary, not primary

2. **Before/after context visibility**
   - clear written-values panel for agent steps
   - show newly written context facts separately from inherited inputs

3. **Action step readability**
   - show source context fact and durable target side by side
   - show "propagated to durable output" as a visible result state

4. **Branch step readability**
   - show route evaluation result clearly
   - visually distinguish taken route from non-taken route

5. **Invoke step readability**
   - show target work-unit type
   - show created downstream work-unit reference
   - show draft spec snapshot used for creation

6. **Artifact visibility**
   - artifact slot name prominent
   - preview panel easy to capture without opening multiple unrelated panes
