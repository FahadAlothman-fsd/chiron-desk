# BMAD Work Unit Seed Spec: Brainstorming

## Status
- Agreement state: **draft for user review**
- Scope: BMAD Method seeded methodology, Brainstorming work unit only
- Purpose: reference artifact for implementing canonical seed rows and the in-app BMAD methodology seed action

## Ground Rules
- `Brainstorming` is a work unit. `brainstorming`, `first_principles_analysis`, etc. are workflows on that work unit.
- Brainstorming is optional in BMAD, but first-class in the seeded methodology.
- Brainstorming should remain agent-centric; it should not be decomposed into many tiny user forms.
- Technique support workflows exist as separate workflows in the same Brainstorming work unit.
- The primary workflow selects technique workflows through a `workflow_ref_fact`, then invokes the selected workflow refs in one fact-backed workflow invoke step.
- Brainstorming is independently runnable and does not require Setup.
- If Brainstorming is invoked from Setup, Setup may pass plain prefilled topic/goals/objectives only; Setup must not bind Setup artifacts or select Brainstorming's technique workflow refs.
- Brainstorming owns its supporting workflow catalog, so the primary Brainstorming workflow starts with an agent that determines/refines topic, desired outcome, objectives, constraints, and selected technique workflow refs.
- Workflows inside the same work unit communicate through Brainstorming work-unit facts, not by sharing workflow-local context directly.
- `display` must not be used.
- `action` is generic automation; in this seed pass, only action kind `propagation` is used.
- No fact defaults are seeded for now.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `brainstorming` |
| Display name | `Brainstorming` |
| Cardinality | `many_per_project` |
| Purpose | Facilitate structured ideation for fuzzy or exploratory product/project direction, then converge on selected directions and follow-up analysis recommendations. |

## Cardinality Rationale
`many_per_project` is important because a project may need multiple separate brainstorming sessions over time:
- initial product ideation
- feature ideation
- course-correction ideation
- architecture/problem-space ideation

Each session should be its own Brainstorming work unit instance with its own artifact and selected directions.

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Brainstorming has produced a session artifact and selected directions or explicit follow-up recommendations. |

### Why no `in_progress` state for now
As with Setup, step execution already models in-progress behavior. A separate lifecycle state is not needed unless other work units need to depend on partially completed brainstorming, which they should not.

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `brainstorming` |

### Start gate
Brainstorming can start when it has enough context to conduct a session:

- `setup_work_unit` exists OR an equivalent source context is bound through invoke
- `brainstorming_focus` exists OR the primary workflow intake agent can elicit it immediately

For Setup-invoked Brainstorming, the invoke binding should provide the source Setup reference and any known product/change context.

### Completion gate
Brainstorming can complete only after:

- Artifact slot `brainstorming_session` has an artifact instance or artifact reference
- Work-unit fact `selected_directions` exists
- Work-unit fact `desired_outcome` exists

Optional follow-up research recommendations do not block completion.

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `brainstorming_session` | Brainstorming Session | `single` | yes | Canonical brainstorming report/session artifact containing session framing, techniques used, ideas, clusters, selected directions, and follow-up recommendations. |

## Brainstorming Work-Unit Fact Definitions

These are durable facts owned by each Brainstorming work unit instance.

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `setup_work_unit` | `work_unit_reference` | `one` | start gate if Setup launched this session | Link back to the Setup work unit that requested brainstorming. |
| `brainstorming_focus` | `string` | `one` | yes | The topic/problem/opportunity this session is exploring. |
| `desired_outcome` | `string` | `one` | yes | What the user wants out of the session. |
| `objectives` | `json` | `many` | no | Specific session objectives or questions. |
| `constraints` | `json` | `one` | no | Constraints, must-haves, must-avoid items, and timebox notes. |
| `technique_plan` | `json` | `one` | no | Techniques selected/used and why. |
| `selected_technique_workflows` | `json` or workflow reference set | `many` | no | Selected support workflows for this session. Implement as workflow reference context during execution; persist summary here if needed. |
| `technique_outputs` | `json` | `many` | no | Outputs produced by invoked technique workflows. |
| `selected_directions` | `json` | `one` | yes | Converged directions after idea generation and organization. |
| `follow_up_research_topics` | `json` | `many` | no | Research topics recommended by the session. |
| `research_work_units` | `work_unit_reference` | `many` | no | Research work units later invoked from or linked to this brainstorming session. |

### `objectives` item schema

```ts
{
  title: string;
  motivation?: string;
  successSignal?: string;
  priority: "low" | "medium" | "high";
  notes?: string;
}
```

### `constraints` schema

```ts
{
  mustHave: string[];
  mustAvoid: string[];
  timeboxNotes?: string[];
  knownConstraints?: string[];
}
```

### `technique_plan` schema

```ts
{
  selectedTechniques: Array<{
    workflowKey:
      | "first_principles_analysis"
      | "five_whys_deep_dive"
      | "socratic_questioning"
      | "stakeholder_round_table"
      | "critique_and_refine";
    reason: string;
    status: "used" | "skipped" | "deferred";
  }>;
  selectionRationale: string;
}
```

### `technique_outputs` item schema

```ts
{
  techniqueWorkflowKey: string;
  summary: string;
  ideas: Array<{
    title: string;
    description: string;
    category?: string;
  }>;
  insights: string[];
  recommendedNextUse?: string;
}
```

### `selected_directions` schema

```ts
{
  primaryDirections: Array<{
    title: string;
    summary: string;
    whyPromising: string;
    risks?: string[];
    nextStepRecommendation:
      | "research"
      | "product_brief"
      | "prd"
      | "defer";
  }>;
  quickWins: Array<{
    title: string;
    summary: string;
  }>;
  breakthroughConcepts: Array<{
    title: string;
    summary: string;
    uncertainty: "low" | "medium" | "high";
  }>;
  rejectedOrDeferredDirections: Array<{
    title: string;
    reason: string;
  }>;
}
```

### `follow_up_research_topics` item schema

```ts
{
  researchType: "market" | "domain" | "technical";
  topic: string;
  question: string;
  priority: "low" | "medium" | "high";
  rationale: string;
}
```

## Brainstorming Workflow Context Fact Definitions

Workflow context facts are local to one Brainstorming workflow execution.

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `setup_work_unit_ctx` | `bound_fact` | binds Brainstorming fact `setup_work_unit` | `one` | invoke binding / form / agent | Local source Setup reference. |
| `brainstorming_focus_ctx` | `bound_fact` | binds Brainstorming fact `brainstorming_focus` | `one` | framing agent | Local session topic. |
| `desired_outcome_ctx` | `bound_fact` | binds Brainstorming fact `desired_outcome` | `one` | framing agent | Local desired outcome. |
| `objectives_ctx` | `bound_fact` | binds Brainstorming fact `objectives` | `many` | agent | Local objective list. |
| `constraints_ctx` | `bound_fact` | binds Brainstorming fact `constraints` | `one` | agent | Local constraints. |
| `technique_plan_ctx` | `bound_fact` | binds Brainstorming fact `technique_plan` | `one` | agent | Technique choices and rationale. |
| `selected_technique_workflow_refs_ctx` | `workflow_ref_fact` | allowed workflows: selected supported technique workflows | `many` | agent | Fact-backed workflow invoke source; selects which technique workflows to run. |
| `technique_outputs_ctx` | `bound_fact` | binds Brainstorming fact `technique_outputs` | `many` | technique workflows / convergence agent | Captures technique outputs through the durable Brainstorming work-unit fact. |
| `selected_directions_ctx` | `bound_fact` | binds Brainstorming fact `selected_directions` | `one` | convergence agent | Local selected directions. |
| `follow_up_research_topics_ctx` | `bound_fact` | binds Brainstorming fact `follow_up_research_topics` | `many` | convergence agent | Local research recommendations. |
| `brainstorming_session_artifact_ctx` | `artifact_slot_reference_fact` | slot `brainstorming_session` | `one` | convergence agent | Staged session artifact for propagation. |

### `technique_outputs_ctx` item schema

```ts
{
  techniqueWorkflowKey: string;
  summary: string;
  ideas: Array<{
    title: string;
    description: string;
    category?: string;
  }>;
  insights: string[];
  recommendedNextUse?: string;
}
```

## Workflow Definition: `brainstorming`

| Property | Value |
|---|---|
| Workflow key | `brainstorming` |
| Family | `brainstorming` |
| Intent | `primary_brainstorming_session` |
| Bound transition | `activation_to_done` |
| Entry step | `brainstorming_goal_and_technique_agent` |

## Primary Workflow Step Graph

### Step 1: `brainstorming_goal_and_technique_agent`
- Type: `agent`
- Reads:
  - `setup_work_unit_ctx`, if invoked from Setup
  - any prefilled or direct `brainstorming_focus_ctx`, if present
  - any prefilled or direct `desired_outcome_ctx`, if present
  - any prefilled or direct `objectives_ctx`, if present
- Writes:
  - `brainstorming_focus_ctx`
  - `desired_outcome_ctx`
  - `objectives_ctx`
  - `constraints_ctx`
  - `technique_plan_ctx`
  - `selected_technique_workflow_refs_ctx`
- Objective:
  - Understand or infer the brainstorming goal from source context.
  - Refine the session focus and desired outcome.
  - Select up to five supported techniques.
  - Explain the selected technique plan to the user.
  - Capture session objectives and constraints.

### Step 2: `brainstorming_technique_confirmation_form`
- Type: `form`
- Purpose: Let the user confirm or adjust the Brainstorming-owned topic, desired outcome, objectives, and selected technique workflow refs.
- Writes:
  - confirmed `brainstorming_focus_ctx`
  - confirmed `desired_outcome_ctx`
  - confirmed `objectives_ctx`
  - confirmed `selected_technique_workflow_refs_ctx`
- Note: this form operates inside Brainstorming, not Setup.

### Step 3: `has_selected_techniques`
- Type: `branch`
- Reads: `selected_technique_workflow_refs_ctx`
- Routes:
  - exists / non-empty → `invoke_selected_techniques`
  - missing / empty → `brainstorming_convergence_agent`

### Step 4: `invoke_selected_techniques`
- Type: `invoke`
- Target kind: `workflow`
- Source mode: `fact_backed`
- Source fact: `selected_technique_workflow_refs_ctx`
- Allowed target workflows:
  - `first_principles_analysis`
  - `five_whys_deep_dive`
  - `socratic_questioning`
  - `stakeholder_round_table`
  - `critique_and_refine`
- On completion: continue to `brainstorming_convergence_agent`
- Communication contract:
  - Technique workflows write outputs to Brainstorming work-unit fact `technique_outputs` through their own bound context facts and propagation action.
  - The primary workflow then reads `technique_outputs_ctx` as the shared durable work-unit communication surface.

### Step 5: `brainstorming_convergence_agent`
- Type: `agent`
- Reads:
  - `brainstorming_focus_ctx`
  - `desired_outcome_ctx`
  - `objectives_ctx`
  - `constraints_ctx`
  - `technique_plan_ctx`
  - `technique_outputs_ctx` if support workflow outputs are available
- Writes:
  - `selected_directions_ctx`
  - `follow_up_research_topics_ctx`
  - `brainstorming_session_artifact_ctx`
- Objective:
  - Organize generated ideas.
  - Identify themes and selected directions.
  - Recommend follow-up research/product-brief path.
  - Produce the brainstorming session artifact.

### Step 6: `propagate_brainstorming_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist final workflow context outputs into Brainstorming work-unit facts and artifact slot.
- Propagates:
  - `setup_work_unit_ctx` → `setup_work_unit`
  - `brainstorming_focus_ctx` → `brainstorming_focus`
  - `desired_outcome_ctx` → `desired_outcome`
  - `objectives_ctx` → `objectives`
  - `constraints_ctx` → `constraints`
  - `technique_plan_ctx` → `technique_plan`
  - `technique_outputs_ctx` → `technique_outputs`
  - `selected_directions_ctx` → `selected_directions`
  - `follow_up_research_topics_ctx` → `follow_up_research_topics`
  - `brainstorming_session_artifact_ctx` → artifact slot `brainstorming_session`

## Supported Technique Workflows — First Seed Pass

Max five technique workflows in this slice.

### 1. `first_principles_analysis`
- Display name: `First Principles Analysis`
- Purpose: Break assumptions down to fundamentals and rebuild possible directions from first principles.
- Recommended for: unclear product assumptions, overloaded solution ideas, inherited constraints.
- Suggested implementation shape: one `agent` step that writes local technique result context, followed by one `action` propagation step to append a `technique_outputs` work-unit fact item.

### 2. `five_whys_deep_dive`
- Display name: `5 Whys Deep Dive`
- Purpose: Repeatedly ask why to uncover root problems or motivations.
- Recommended for: fuzzy problem statements, unclear user pain, shallow solution framing.
- Suggested implementation shape: one `agent` step that writes local technique result context, followed by one `action` propagation step to append a `technique_outputs` work-unit fact item.

### 3. `socratic_questioning`
- Display name: `Socratic Questioning`
- Purpose: Challenge assumptions through structured questioning.
- Recommended for: product direction validation, hidden assumptions, unclear tradeoffs.
- Suggested implementation shape: one `agent` step that writes local technique result context, followed by one `action` propagation step to append a `technique_outputs` work-unit fact item.

### 4. `stakeholder_round_table`
- Display name: `Stakeholder Round Table`
- Purpose: Simulate multiple stakeholder perspectives to reveal tensions and opportunities.
- Recommended for: products with competing user/business/technical concerns.
- Suggested implementation shape: one `agent` step that writes local technique result context, followed by one `action` propagation step to append a `technique_outputs` work-unit fact item.

### 5. `critique_and_refine`
- Display name: `Critique and Refine`
- Purpose: Converge and improve ideas by critiquing weak spots and refining promising directions.
- Recommended for: late-session convergence after divergent techniques.
- Suggested implementation shape: one `agent` step that writes local technique result context, followed by one `action` propagation step to append a `technique_outputs` work-unit fact item.

## Supporting Technique Workflow Context Facts

Each supported technique workflow should use the same small internal pattern so outputs are consistent.

### Shared support-workflow context facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `technique_focus_ctx` | `bound_fact` | binds Brainstorming fact `brainstorming_focus` | `one` | invoke binding / agent | Session focus available to technique workflow. |
| `technique_objectives_ctx` | `bound_fact` | binds Brainstorming fact `objectives` | `many` | invoke binding / agent | Objectives available to technique workflow. |
| `technique_constraints_ctx` | `bound_fact` | binds Brainstorming fact `constraints` | `one` | invoke binding / agent | Constraints available to technique workflow. |
| `technique_plan_ctx` | `bound_fact` | binds Brainstorming fact `technique_plan` | `one` | invoke binding / agent | Overall technique plan for context. |
| `technique_result_ctx` | `bound_fact` | binds Brainstorming fact `technique_outputs` | `many` | technique agent | Output item(s) produced by this technique. |

### Shared support-workflow step graph

1. `agent`: run the specific technique and write `technique_result_ctx`
2. `action`: propagate `technique_result_ctx` to Brainstorming work-unit fact `technique_outputs`

This makes the support workflow isolated in execution context while still communicating through the shared Brainstorming work-unit facts.

## Technique Workflow Output Contract

Each technique workflow should produce one or more `technique_outputs_ctx` items.

```ts
{
  techniqueWorkflowKey: string;
  summary: string;
  ideas: Array<{
    title: string;
    description: string;
    category?: string;
  }>;
  insights: string[];
  recommendedNextUse?: string;
}
```

## Implementation Note: Workflow Communication Boundary

The primary Brainstorming workflow and support technique workflows do not share workflow-local context. They communicate through Brainstorming work-unit facts. The selected technique workflow refs are local to the primary workflow, but technique outputs are persisted to the durable Brainstorming fact `technique_outputs`, then read by the convergence agent.

## Implementation Reference Files

- Current Brainstorming seed authority: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- BMAD brainstorming workflow: `_bmad/core/workflows/brainstorming/workflow.md`
- BMAD brainstorming step files: `_bmad/core/workflows/brainstorming/steps/*`
- BMAD brainstorming methods: `_bmad/core/workflows/brainstorming/brain-methods.csv`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
- Invoke runtime behavior: `packages/workflow-engine/src/services/invoke-work-unit-execution-service.ts`
- Branch runtime behavior: `packages/workflow-engine/src/services/branch-route-evaluator.ts`
- Action runtime behavior: `packages/workflow-engine/src/services/action-step-runtime-service.ts`
