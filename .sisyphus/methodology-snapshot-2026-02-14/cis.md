# CIS (Creative Intelligence System) — Methodology Snapshot

Snapshot date: 2026-02-14  
Source-of-truth for this snapshot: `_bmad/cis/` and `_bmad/core/workflows/brainstorming/`.

This is a temporary working document describing how CIS behaves *as a methodology module* and how it could map into Chiron’s methodology/work-item/state-machine layer.

## What CIS is

CIS is an **anytime** methodology module under BMAD that provides interactive facilitation workflows. It is intentionally cross-phase: you can run CIS before, during, or after BMM phases.

From repo: `_bmad/cis/module-help.csv` defines five workflows:

- Innovation Strategy (`bmad-cis-innovation-strategy`)
- Problem Solving (`bmad-cis-problem-solving`)
- Design Thinking (`bmad-cis-design-thinking`)
- Brainstorming (`bmad-cis-brainstorming`) (implemented via `_bmad/core/workflows/brainstorming/workflow.md`)
- Storytelling (`bmad-cis-storytelling`)

## Shared execution conventions (from repo)

All CIS workflows (Innovation/Problem/Design/Storytelling) are configured the same way:

- Workflow config file: `_bmad/cis/workflows/<name>/workflow.yaml`
- Instructions file: `_bmad/cis/workflows/<name>/instructions.md`
- Output template: `_bmad/cis/workflows/<name>/template.md`
- Output file pattern (default): `{output_folder}/<name>-{{date}}.md` (storytelling uses `{output_folder}/story-{{date}}.md`)
- Critical rules (in instructions):
  - No time estimates
  - Checkpoint protocol after EVERY `<template-output>` tag: save -> show separator -> display -> options -> wait

In workflow.yaml files, `output_folder` and `communication_language` are loaded via `config_source: {project-root}/_bmad/cis/config.yaml`.

## User journey: when CIS is used

- Early exploration: run Design Thinking or Brainstorming to generate options before committing to BMM PRD.
- Mid-flight stuckness: run Problem Solving for debugging a process/technical block; run Innovation Strategy to revisit product-market direction.
- Communication and alignment: run Storytelling to produce narratives for stakeholders, PRD intros, pitches.

## Workflow reference (granular)

This section lists what each workflow produces in a machine-meaningful way: the template variables emitted by `<template-output>` tags (these are effectively step outputs).

### 1) Innovation Strategy

- Command: `bmad-cis-innovation-strategy`
- Files:
  - `_bmad/cis/workflows/innovation-strategy/workflow.yaml`
  - `_bmad/cis/workflows/innovation-strategy/instructions.md`
  - `_bmad/cis/workflows/innovation-strategy/template.md`
  - data library: `_bmad/cis/workflows/innovation-strategy/innovation-frameworks.csv`
- Output (from repo): `{output_folder}/innovation-strategy-{{date}}.md`

Step outputs (from `_bmad/cis/workflows/innovation-strategy/instructions.md`):

1. Establish context:
  - `company_name`, `strategic_focus`, `current_situation`, `strategic_challenge`
2. Market landscape:
  - `market_landscape`, `competitive_dynamics`, `market_opportunities`, `market_insights`
3. Current business model:
  - `current_business_model`, `value_proposition`, `revenue_cost_structure`, `model_weaknesses`
4. Disruption opportunities:
  - `disruption_vectors`, `unmet_jobs`, `technology_enablers`, `strategic_whitespace`
5. Innovation opportunities:
  - `innovation_initiatives`, `business_model_innovation`, `value_chain_opportunities`, `partnership_opportunities`
6. Strategic options:
  - `option_a_name`, `option_a_description`, `option_a_pros`, `option_a_cons`
  - `option_b_name`, `option_b_description`, `option_b_pros`, `option_b_cons`
  - `option_c_name`, `option_c_description`, `option_c_pros`, `option_c_cons`
7. Recommendation:
  - `recommended_strategy`, `key_hypotheses`, `success_factors`
8. Roadmap:
  - `phase_1`, `phase_2`, `phase_3`
9. Metrics and risk:
  - `leading_indicators`, `lagging_indicators`, `decision_gates`, `key_risks`, `risk_mitigation`

Proposed mapping (not in repo):

- Work item type: `cis.innovation_strategy`
- Statuses: `draft -> in_facilitation -> published`
- Transition gate example: `in_facilitation -> published` requires output type `artifact_ref` (the saved markdown artifact)

### 2) Problem Solving

- Command: `bmad-cis-problem-solving`
- Files:
  - `_bmad/cis/workflows/problem-solving/workflow.yaml`
  - `_bmad/cis/workflows/problem-solving/instructions.md`
  - `_bmad/cis/workflows/problem-solving/template.md`
  - data library: `_bmad/cis/workflows/problem-solving/solving-methods.csv`
- Output (from repo): `{output_folder}/problem-solution-{{date}}.md`

Step outputs (from `_bmad/cis/workflows/problem-solving/instructions.md`):

1. Define problem:
  - `problem_title`, `problem_category`, `initial_problem`, `refined_problem_statement`, `problem_context`, `success_criteria`
2. Boundaries:
  - `problem_boundaries`
3. Root cause:
  - `root_cause_analysis`, `contributing_factors`, `system_dynamics`
4. Forces/constraints:
  - `driving_forces`, `restraining_forces`, `constraints`, `key_insights`
5. Solutions:
  - `solution_methods`, `generated_solutions`, `creative_alternatives`
6. Evaluate:
  - `evaluation_criteria`, `solution_analysis`, `recommended_solution`, `solution_rationale`
7. Plan:
  - `implementation_approach`, `action_steps`, `timeline`, `resources_needed`, `responsible_parties`
8. Validate plan:
  - `success_metrics`, `validation_plan`, `risk_mitigation`, `adjustment_triggers`
9. Lessons (optional):
  - `key_learnings`, `what_worked`, `what_to_avoid`

Proposed mapping:

- Work item type: `cis.problem_solving`
- Typical link patterns:
  - `informed_by(soft)` links into a BMM story/architecture work item when used to unblock implementation

### 3) Design Thinking

- Command: `bmad-cis-design-thinking`
- Files:
  - `_bmad/cis/workflows/design-thinking/workflow.yaml`
  - `_bmad/cis/workflows/design-thinking/instructions.md`
  - `_bmad/cis/workflows/design-thinking/template.md`
  - data library: `_bmad/cis/workflows/design-thinking/design-methods.csv`
- Output (from repo): `{output_folder}/design-thinking-{{date}}.md`

Step outputs (from `_bmad/cis/workflows/design-thinking/instructions.md`):

1. Challenge:
  - `design_challenge`, `challenge_statement`
2. Empathize:
  - `user_insights`, `key_observations`, `empathy_map`
3. Define:
  - `pov_statement`, `hmw_questions`, `problem_insights`
4. Ideate:
  - `ideation_methods`, `generated_ideas`, `top_concepts`
5. Prototype:
  - `prototype_approach`, `prototype_description`, `features_to_test`
6. Test:
  - `testing_plan`, `user_feedback`, `key_learnings`
7. Next iteration:
  - `refinements`, `action_items`, `success_metrics`

Proposed mapping:

- Work item type: `cis.design_thinking`
- Useful in BMM as:
  - upstream of PRD (soft input)
  - or as a parallel “UX discovery” work item

### 4) Storytelling

- Command: `bmad-cis-storytelling`
- Files:
  - `_bmad/cis/workflows/storytelling/workflow.yaml`
  - `_bmad/cis/workflows/storytelling/instructions.md`
  - `_bmad/cis/workflows/storytelling/template.md`
  - data library: `_bmad/cis/workflows/storytelling/story-types.csv`
- Output (from repo): `{output_folder}/story-{{date}}.md`

Step outputs (from `_bmad/cis/workflows/storytelling/instructions.md`):

1. Context:
  - `story_purpose`, `target_audience`, `key_messages`
2. Framework selection:
  - `story_type`, `framework_name`
3. Elements:
  - `story_beats`, `character_voice`, `conflict_tension`, `transformation`
4. Emotional arc:
  - `emotional_arc`, `emotional_touchpoints`
5. Hook:
  - `opening_hook`
6. Core narrative:
  - `complete_story`, `core_narrative`
7. Variations:
  - `short_version`, `medium_version`, `extended_version`
8. Usage:
  - `best_channels`, `audience_considerations`, `tone_notes`, `adaptation_suggestions`
9. Refinement:
  - `resolution`, `refinement_opportunities`, `additional_versions`, `feedback_plan`
10. Final output:
  - `agent_role`, `agent_name`, `user_name`, `date`

Proposed mapping:

- Work item type: `cis.storytelling`
- Often linked as `informed_by(soft)` to PRD/brief artifacts

### 5) Brainstorming

- Command: `bmad-cis-brainstorming`
- Implementation: `_bmad/core/workflows/brainstorming/workflow.md`
- Output (from core): `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`

Proposed mapping:

- Work item type: `cis.brainstorming`
- Transition gate: published session requires an `artifact_ref` output

## Locked modules: CIS-specific expectations (high level)

- agent-runtime: runs facilitation steps and streams; provides ctx tools for retrieving method + project context.
- template-engine: renders CIS templates and produces prompt receipts; CIS outputs are markdown artifacts.
- variable-service: stores template variables (the `<template-output>` keys) and final output refs.
- provider-registry: resolves provider/model; no silent fallback.
- event-bus: ephemeral transport of workflow lifecycle and streaming chunks.
- observability: DB-first ledger of execution + template receipts; consent-gated export.
