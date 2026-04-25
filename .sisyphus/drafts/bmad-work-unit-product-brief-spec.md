# BMAD Work Unit Seed Spec: Product Brief

## Status
- Agreement state: **draft for review**
- Scope: BMAD Method seeded methodology, Product Brief work unit only
- Purpose: reference artifact for implementing canonical Product Brief seed rows and downstream PRD bindings

## Ground Rules
- Product Brief is a BMAD analysis/planning bridge work unit: it turns fuzzy/raw inputs, brainstorming, research, and project context into a concise executive brief.
- Product Brief is `many_per_project` because BMAD explicitly supports separate briefs for separate ideas/directions; the seeded path should still mark one Product Brief as the active input to PRD.
- The canonical output is a 1-2 page executive Product Brief artifact.
- The optional Detail Pack / LLM distillate is a second artifact slot, not a required fact.
- Product Brief can run in guided, yolo, or autonomous mode. Mode is workflow context, not a durable core work-unit fact unless the final summary records it.
- BMAD's five stages are embedded in one agent-driven authoring workflow rather than decomposed into many rigid forms.
- Product Brief is the first MVP workflow that needs read access to referenced work-unit outputs, not just opaque reference IDs.
- When `brainstorming_work_unit_ref` or `research_work_unit_refs` are present, the agent MCP/read model should expose referenced work-unit metadata, current state, active fact instances, and artifact slot instances as file paths.
- This is a narrow MVP read-model enhancement for explicitly bound `work_unit_reference_fact` inputs, not a global arbitrary work-unit graph traversal.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `product_brief` |
| Display name | `Product Brief` |
| Cardinality | `many_per_project` |
| Purpose | Create or update a concise executive product brief and optional detail pack that can feed PRD creation. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | The product brief artifact is complete and downstream PRD creation has enough context to proceed. |

### Why no separate `draft` / `review` lifecycle states for now
BMAD draft/review behavior occurs inside the Product Brief workflow and agent conversation. Durable lifecycle states should represent external work-unit readiness, not every internal document iteration.

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `create_product_brief` |

### Start gate
Product Brief can start when at least one meaningful source context exists:

- A Setup reference or draft spec provides product intent, or
- A Brainstorming reference provides idea outputs, or
- One or more Research references provide findings, or
- The user provides product intent directly during the workflow.

### Completion gate
Product Brief can complete only when the workflow has propagated the core artifact and summary:

- Product Brief work-unit fact `product_name` exists
- Product Brief work-unit fact `product_intent_summary` exists
- Product Brief work-unit fact `brief_synthesis` exists
- Product Brief artifact slot `PRODUCT_BRIEF` has an artifact instance or artifact reference
- Product Brief work-unit fact `next_recommended_work_unit` exists, normally pointing to PRD

The `PRODUCT_BRIEF_DISTILLATE` artifact is optional. In autonomous/headless mode it should be created automatically when there is meaningful overflow context; in guided/yolo mode it may be offered and created if accepted.

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `PRODUCT_BRIEF` | Product Brief | `single` | yes | Canonical 1-2 page executive brief. |
| `PRODUCT_BRIEF_DISTILLATE` | Product Brief Detail Pack | `single` | no | Optional token-efficient overflow context for PRD creation: requirements hints, rejected ideas, technical constraints, detailed user scenarios, competitive intelligence, open questions, and scope signals. |

### Product Brief artifact structure
The `PRODUCT_BRIEF` artifact should follow BMAD's flexible executive-brief template:

- Executive Summary
- The Problem
- The Solution
- What Makes This Different
- Who This Serves
- Success Criteria
- Scope
- Vision

Sections may be merged, renamed, reordered, or adapted to fit the product story, but the artifact must remain concise enough to serve as a 1-2 page executive summary.

## Product Brief Work-Unit Fact Definitions

These are durable facts owned by each Product Brief work unit instance.

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `setup_work_unit` | `work_unit_reference` | `one` | no | Optional reference to the Setup unit that spawned/contextualized this brief. |
| `brainstorming_work_unit` | `work_unit_reference` | `one` | no | Optional reference to the Brainstorming unit whose outputs fed the brief. |
| `research_work_units` | `work_unit_reference` | `many` | no | Optional references to Research units used as input. |
| `product_name` | `string` | `one` | yes | Product/initiative name used in the brief artifact. |
| `product_intent_summary` | `json` | `one` | yes | Structured summary of what is being briefed and why. |
| `source_context_summary` | `json` | `one` | no | Structured synthesis of docs, research, brainstorming, and other inputs considered. |
| `brief_synthesis` | `json` | `one` | yes | Machine-readable summary of the final Product Brief for PRD and downstream workflows. |
| `review_findings` | `json` | `many` | no | Findings from skeptic/opportunity/contextual review passes. |
| `open_questions` | `json` | `many` | no | Unresolved questions surfaced during brief creation. |
| `next_recommended_work_unit` | `work_unit_reference` | `one` | yes | Durable pointer to the next recommended work unit, normally PRD. |

### `product_intent_summary` schema

```ts
{
  productName: string;
  briefType: "product" | "internal_tool" | "research_project" | "platform" | "other";
  coreIdea: string;
  targetUsers?: string;
  problemStatement?: string;
  desiredOutcome?: string;
  knownConstraints: string[];
  sourceMode: "setup" | "brainstorming" | "research" | "direct_user_input" | "mixed";
}
```

### `source_context_summary` schema

```ts
{
  inputsConsidered: Array<{
    kind: "artifact" | "work_unit" | "research" | "brainstorming" | "web" | "user_input" | "other";
    label: string;
    reference?: string;
    relevance: "low" | "medium" | "high";
  }>;
  keyContext: string[];
  contradictionsOrSurprises: string[];
  gapsBeforeElicitation: string[];
}
```

### `brief_synthesis` schema

```ts
{
  executiveSummary: string;
  problem: string;
  solution: string;
  differentiators: string[];
  primaryUsers: string[];
  successCriteria: string[];
  scopeIn: string[];
  scopeOut: string[];
  vision: string;
  prdReadiness: "ready" | "ready_with_open_questions" | "not_ready";
  prdInputNotes: string[];
}
```

### `review_findings` item schema

```ts
{
  reviewerLens: "skeptic" | "opportunity" | "contextual" | "other";
  finding: string;
  severity: "low" | "medium" | "high";
  appliedToBrief: boolean;
  needsUserDecision: boolean;
}
```

### `open_questions` item schema

```ts
{
  question: string;
  reason: string;
  blocksPrd: boolean;
  suggestedOwner?: string;
}
```

## Workflow Context Fact Definitions

These context facts are local to one Product Brief workflow execution.

### Bound Product Brief facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `product_name_ctx` | `bound_fact` | binds Product Brief fact `product_name` | `one` | Intent agent | Local product name. |
| `product_intent_summary_ctx` | `bound_fact` | binds Product Brief fact `product_intent_summary` | `one` | Intent agent | Structured product intent. |
| `source_context_summary_ctx` | `bound_fact` | binds Product Brief fact `source_context_summary` | `one` | Brief authoring agent | Context discovery synthesis. |
| `brief_synthesis_ctx` | `bound_fact` | binds Product Brief fact `brief_synthesis` | `one` | Brief authoring agent | Structured final brief summary. |
| `review_findings_ctx` | `bound_fact` | binds Product Brief fact `review_findings` | `many` | Review subagents / authoring agent | Review findings. |
| `open_questions_ctx` | `bound_fact` | binds Product Brief fact `open_questions` | `many` | Brief authoring agent | Open questions. |
| `next_work_unit_ref` | `bound_fact` | binds Product Brief fact `next_recommended_work_unit` | `one` | Brief authoring agent | Next recommended work unit, normally PRD. |

### Mode and source context facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `brief_mode_ctx` | `plain_fact` | enum `guided | yolo | autonomous` | `one` | Invoke binding or intent agent | Controls interaction level. |
| `setup_work_unit_ref` | `work_unit_reference_fact` | Setup work unit | `one` | Invoke binding | Setup source context. |
| `brainstorming_work_unit_ref` | `work_unit_reference_fact` | Brainstorming work unit | `one` | Invoke binding | Brainstorming source context. |
| `research_work_unit_refs` | `work_unit_reference_fact` | Research work units | `many` | Invoke binding | Research source context. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | Any relevant prior artifacts | `many` | Invoke binding / intent agent | Documents to consider after intent is understood. |
| `product_brief_artifact_ctx` | `artifact_slot_reference_fact` | `PRODUCT_BRIEF` | `one` | Brief authoring agent | Staged Product Brief artifact before propagation. |
| `product_brief_distillate_artifact_ctx` | `artifact_slot_reference_fact` | `PRODUCT_BRIEF_DISTILLATE` | `one` | Brief authoring agent | Optional staged Detail Pack artifact before propagation. |

### `brief_mode_ctx` validation

```ts
"guided" | "yolo" | "autonomous"
```

## Referenced Work-Unit MCP Read Package

When the Product Brief workflow receives `brainstorming_work_unit_ref` or `research_work_unit_refs`, Product Brief agents should see a safe read package for each referenced work unit.

### Exposed metadata
- work-unit id/key/display name
- work-unit type key
- current lifecycle state
- produced/updated timestamps where available

### Exposed fact instances
- active fact instances for the referenced work unit
- fact key, value JSON, status, and provenance metadata where available
- no mutation capability from this read package

### Exposed artifact slot instances
- artifact slot key and display name
- artifact instance id
- file path or readable locator for the artifact content
- status/provenance metadata where available

### Product Brief-specific expected sources
- Brainstorming references expose:
  - `brainstorming_focus`
  - `desired_outcome`
  - `technique_plan`
  - `technique_outputs`
  - `selected_directions`
  - `follow_up_research_topics`
  - `BRAINSTORMING_OUTPUT` artifact file path
- Research references expose:
  - `research_variant`
  - `research_questions`
  - `research_findings`
  - `research_synthesis`
  - `RESEARCH_REPORT` artifact file path

## Workflow Definition: `create_product_brief`

| Property | Value |
|---|---|
| Workflow key | `create_product_brief` |
| Family | `product_brief` |
| Intent | `create_or_update_executive_product_brief` |
| Bound transition | `activation_to_done` |
| Entry step | `brief_intent_agent` |

## Workflow Step Graph

### Step 1: `brief_intent_agent`
- Type: `agent`
- Purpose: BMAD Stage 1, understand intent before scanning artifacts.
- Reads:
  - `brief_mode_ctx`
  - `setup_work_unit_ref`
  - `brainstorming_work_unit_ref`
  - `research_work_unit_refs`
  - `input_artifact_refs`
  - MCP read packages for referenced Brainstorming/Research work units, if refs exist
- Writes:
  - `product_name_ctx`
  - `product_intent_summary_ctx`
  - `brief_mode_ctx`, if not already set
- Objective:
  - Determine what kind of thing is being briefed.
  - Disambiguate if multiple ideas are present and select one focus for this Product Brief.
  - Capture extra details without interrupting: requirements hints, platform preferences, technical constraints, rejected ideas, timeline, scope signals.
  - Do not scan documents deeply before product intent is understood.
- Mode behavior:
  - Guided: conversational discovery with soft gates.
  - Yolo: draft upfront after absorbing provided input, then allow refinement.
  - Autonomous: produce complete output without interaction when enough structured context exists.

### Step 2: `product_brief_authoring_agent`
- Type: `agent`
- Purpose: BMAD Stages 2-5: contextual discovery, guided elicitation when needed, draft/review, finalize.
- Reads:
  - `brief_mode_ctx`
  - `product_name_ctx`
  - `product_intent_summary_ctx`
  - `setup_work_unit_ref`
  - `brainstorming_work_unit_ref`
  - `research_work_unit_refs`
  - `input_artifact_refs`
  - MCP read packages for referenced Brainstorming/Research work units, especially artifact file paths for `BRAINSTORMING_OUTPUT` and `RESEARCH_REPORT`
- Writes:
  - `source_context_summary_ctx`
  - `brief_synthesis_ctx`
  - `review_findings_ctx`
  - `open_questions_ctx`
  - `product_brief_artifact_ctx`
  - `product_brief_distillate_artifact_ctx`, if created
  - `next_work_unit_ref`
- Embedded BMAD stages:
  1. Contextual discovery: analyze relevant artifacts/project knowledge and source research only after intent is known.
  2. Guided elicitation: ask targeted questions only for meaningful gaps in guided mode.
  3. Draft executive brief: use BMAD brief template flexibly and keep output to 1-2 pages.
  4. Review: run skeptic, opportunity, and contextual risk lenses before finalizing.
  5. Finalize: produce the Product Brief artifact; offer or create Detail Pack depending on mode.
- Review lenses:
  - Skeptic reviewer: missing assumptions, vague claims, risks, hand-wavy areas.
  - Opportunity reviewer: missed value propositions, market angles, partnerships, underemphasized strengths.
  - Contextual reviewer: chosen by the authoring agent for the product's biggest uncovered risk; default to go-to-market and launch risk when unclear.
- Prompt guardrails:
  - The brief must stand alone for an executive reader.
  - Do not bloat the Product Brief with detailed requirements; put overflow into the optional Detail Pack.
  - Do not fabricate market/competitive claims. Mark unverified assumptions in `open_questions_ctx` or review findings.
  - Do not force commercial framing for non-commercial/internal tools; adapt to stakeholder value and adoption path.

### Step 3: `propagate_product_brief_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable Product Brief facts and artifact slots.

#### Propagate to Product Brief work-unit facts
- `setup_work_unit_ref`, if present → Product Brief fact `setup_work_unit`
- `brainstorming_work_unit_ref`, if present → Product Brief fact `brainstorming_work_unit`
- `research_work_unit_refs`, if present → Product Brief fact `research_work_units`
- `product_name_ctx` → Product Brief fact `product_name`
- `product_intent_summary_ctx` → Product Brief fact `product_intent_summary`
- `source_context_summary_ctx`, if present → Product Brief fact `source_context_summary`
- `brief_synthesis_ctx` → Product Brief fact `brief_synthesis`
- `review_findings_ctx`, if present → Product Brief fact `review_findings`
- `open_questions_ctx`, if present → Product Brief fact `open_questions`
- `next_work_unit_ref` → Product Brief fact `next_recommended_work_unit`

#### Propagate to Product Brief artifact slots
- `product_brief_artifact_ctx` → `PRODUCT_BRIEF`
- `product_brief_distillate_artifact_ctx`, if present → `PRODUCT_BRIEF_DISTILLATE`

## Invoke and Downstream Design Notes

- Setup may invoke Product Brief directly when the idea is clear enough to brief, or after Brainstorming/Research completes.
- Research units should be passed through `research_work_unit_refs`; Product Brief should summarize their implications, not duplicate full research reports.
- PRD start gates should accept Product Brief by reference, preferring `PRODUCT_BRIEF_DISTILLATE` when present and falling back to `brief_synthesis` + `PRODUCT_BRIEF` when absent.
- Multiple Product Brief units may exist in one project; PRD must bind to the chosen source Product Brief to avoid ambiguity.

## Implementation Reference Files

- BMAD Product Brief skill: `_bmad/bmm/1-analysis/bmad-product-brief/SKILL.md`
- BMAD Product Brief template: `_bmad/bmm/1-analysis/bmad-product-brief/resources/brief-template.md`
- BMAD contextual discovery prompt: `_bmad/bmm/1-analysis/bmad-product-brief/prompts/contextual-discovery.md`
- BMAD guided elicitation prompt: `_bmad/bmm/1-analysis/bmad-product-brief/prompts/guided-elicitation.md`
- BMAD draft/review prompt: `_bmad/bmm/1-analysis/bmad-product-brief/prompts/draft-and-review.md`
- BMAD finalize prompt: `_bmad/bmm/1-analysis/bmad-product-brief/prompts/finalize.md`
- Current seed references: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Demo fixture references: `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
