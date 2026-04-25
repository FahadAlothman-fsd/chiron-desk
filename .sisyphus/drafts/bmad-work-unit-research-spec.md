# BMAD Work Unit Seed Spec: Research

## Status
- Agreement state: **draft for review**
- Scope: BMAD Method seeded methodology, Research work unit only
- Purpose: reference artifact for implementing canonical Research seed rows and invoke bindings from Setup / Brainstorming / later planning work

## Ground Rules
- Research is a BMAD analysis work unit, not a single generic background helper.
- Research is `many_per_project`: a project may have market, domain, and technical research units, and may create additional research units later during course correction.
- Market Research, Domain Research, and Technical Research are first-class workflows on the Research work unit.
- `research_primary` should not be the canonical workflow. If retained, it is only a router/launcher convenience, not the main seeded BMAD path.
- BMAD's six-phase research structures are embedded inside the agent step prompt/configuration instead of modeled as six separate Chiron steps.
- Research completion requires both a structured synthesis fact and a human-readable report artifact.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `research` |
| Display name | `Research` |
| Cardinality | `many_per_project` |
| Purpose | Produce sourced BMAD analysis for market, domain, or technical questions and preserve the findings as both structured downstream facts and a canonical report artifact. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Research has completed source analysis, produced a structured synthesis, and attached the canonical report artifact. |

### Why no separate `in_progress` state for now
Research execution progress is represented by workflow step execution and agent evidence. A lifecycle `in_progress` state would duplicate runtime workflow status without adding a distinct BMAD decision point.

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflows | `market_research`, `domain_research`, or `technical_research` |

### Start gate
Research can start when all required identity/scope facts exist:

- Research work-unit fact `research_type` exists
- Research work-unit fact `research_topic` exists
- At least one source context exists:
  - `setup_work_unit`, or
  - `brainstorming_work_unit`, or
  - manually supplied research goals/scope in `research_goals`

### Completion gate
Research can complete only when the workflow has propagated both machine-readable and human-readable outputs:

- Research work-unit fact `research_type` exists
- Research work-unit fact `research_topic` exists
- Research work-unit fact `research_goals` has at least one item
- Research work-unit fact `research_synthesis` exists
- Research artifact slot `RESEARCH_REPORT` has an artifact instance or artifact reference

`source_inventory` is strongly recommended but not completion-blocking because some early/internal research may have limited explicit external sources.

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `RESEARCH_REPORT` | Research Report | `single` | yes | Canonical human-readable research report. Template/content variant depends on `research_type`: market, domain, or technical. |

### Research report template variants

| `research_type` | Report variant | Must cover |
|---|---|---|
| `market` | Market Research Report | Customer behavior, pain points, decision journey, competitive analysis, implications. |
| `domain` | Domain Research Report | Domain/industry structure, competitive landscape, regulatory/compliance considerations, technical trends, implications. |
| `technical` | Technical Research Report | Technical feasibility, stack/options, integration patterns, architectural patterns, implementation approaches, implications. |

## Research Work-Unit Fact Definitions

These are durable facts owned by each Research work unit instance.

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `setup_work_unit` | `work_unit_reference` | `one` | no | Optional reference to the Setup unit that spawned/contextualized this research. |
| `brainstorming_work_unit` | `work_unit_reference` | `one` | no | Optional reference to the Brainstorming unit that produced the research topic/questions. |
| `research_type` | string enum | `one` | yes | Selects the BMAD research variant: market, domain, or technical. |
| `research_topic` | `string` | `one` | yes | The concrete topic/question area being researched. |
| `research_goals` | `json` | `many` | yes | Specific research questions/goals to answer. |
| `scope_notes` | `string` | `one` | no | Explicit boundaries: what to include/exclude or assumptions to preserve. |
| `research_synthesis` | `json` | `one` | yes | Structured downstream-consumable summary of findings, recommendations, risks, and implications. |
| `source_inventory` | `json` | `many` | no | Source list with credibility/relevance metadata. |

### `research_type` validation

```ts
"market" | "domain" | "technical"
```

### `research_goals` item schema

```ts
{
  title: string;
  question: string;
  successSignal?: string;
  priority: "low" | "medium" | "high";
  notes?: string;
}
```

### `research_synthesis` schema

```ts
{
  executiveSummary: string;
  keyFindings: Array<{
    title: string;
    summary: string;
    confidence: "low" | "medium" | "high";
    sources?: string[];
  }>;
  primaryRecommendation: string;
  risks: string[];
  downstreamImplications: Array<{
    targetWorkUnitType:
      | "product_brief"
      | "prd"
      | "ux_design"
      | "architecture"
      | "backlog"
      | "story"
      | "course_correction";
    implication: string;
  }>;
  sourceVerificationSummary: string;
}
```

### `source_inventory` item schema

```ts
{
  title?: string;
  url?: string;
  sourceType: "web" | "repo" | "document" | "interview" | "other";
  relevance: "low" | "medium" | "high";
  credibility: "low" | "medium" | "high";
  notes?: string;
}
```

## Workflow Context Fact Definitions

These context facts are shared by the concrete Research workflows unless noted otherwise.

### Bound research facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `research_type_ctx` | `bound_fact` | binds Research fact `research_type` | `one` | Invoke binding or scope form | Local selected research type. |
| `research_topic_ctx` | `bound_fact` | binds Research fact `research_topic` | `one` | Invoke binding or scope form | Local research topic. |
| `research_goals_ctx` | `bound_fact` | binds Research fact `research_goals` | `many` | Invoke binding or scope form | Research goals/questions. |
| `scope_notes_ctx` | `bound_fact` | binds Research fact `scope_notes` | `one` | Invoke binding or scope form | Scope boundaries and exclusions. |
| `research_synthesis_ctx` | `bound_fact` | binds Research fact `research_synthesis` | `one` | Research agent | Structured synthesis to propagate. |
| `source_inventory_ctx` | `bound_fact` | binds Research fact `source_inventory` | `many` | Research agent | Sources used or inspected. |

### Reference context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `setup_work_unit_ref` | `work_unit_reference_fact` | Setup work unit | `one` | Invoke binding | Parent Setup reference when spawned during Setup. |
| `brainstorming_work_unit_ref` | `work_unit_reference_fact` | Brainstorming work unit | `one` | Invoke binding | Parent Brainstorming reference when spawned from ideation outputs. |
| `research_report_artifact_ctx` | `artifact_slot_reference_fact` | `RESEARCH_REPORT` | `one` | Research agent | Staged canonical report artifact before propagation. |

## Workflow Definition: `market_research`

| Property | Value |
|---|---|
| Workflow key | `market_research` |
| Family | `research` |
| Intent | `market_analysis` |
| Bound transition | `activation_to_done` |
| Entry step | `research_scope_confirmation` |

### Embedded BMAD phases
The `research_execution_agent` step must follow the BMAD market research shape internally:

1. Initialize / confirm scope
2. Analyze customer behavior
3. Analyze customer pain points
4. Analyze customer decision journey
5. Analyze competitive landscape
6. Synthesize findings and downstream implications

## Workflow Definition: `domain_research`

| Property | Value |
|---|---|
| Workflow key | `domain_research` |
| Family | `research` |
| Intent | `domain_analysis` |
| Bound transition | `activation_to_done` |
| Entry step | `research_scope_confirmation` |

### Embedded BMAD phases
The `research_execution_agent` step must follow the BMAD domain research shape internally:

1. Initialize / confirm scope
2. Analyze domain or industry structure
3. Analyze competitive landscape
4. Analyze regulatory/compliance considerations
5. Analyze technical trends
6. Synthesize findings and downstream implications

## Workflow Definition: `technical_research`

| Property | Value |
|---|---|
| Workflow key | `technical_research` |
| Family | `research` |
| Intent | `technical_analysis` |
| Bound transition | `activation_to_done` |
| Entry step | `research_scope_confirmation` |

### Embedded BMAD phases
The `research_execution_agent` step must follow the BMAD technical research shape internally:

1. Initialize / confirm scope
2. Analyze technical overview and feasibility
3. Analyze integration patterns
4. Analyze architectural patterns
5. Analyze implementation approaches
6. Synthesize findings and downstream implications

## Shared Workflow Step Graph

All concrete Research workflows use the same Chiron step graph; the selected workflow changes the agent prompt/configuration and report template variant.

### Step 1: `research_scope_confirmation`
- Type: `form`
- Purpose: confirm or fill research scope before source analysis begins.
- Reads:
  - `research_type_ctx`
  - `research_topic_ctx`
  - `research_goals_ctx`
  - `scope_notes_ctx`
- Writes:
  - `research_type_ctx`
  - `research_topic_ctx`
  - `research_goals_ctx`
  - `scope_notes_ctx`
- Fields:

| Field | Type | Required | Help text |
|---|---|---:|---|
| Research type | enum `market | domain | technical` | yes | Choose the BMAD research lens. Market focuses customers/competitors, domain focuses industry/regulatory/trends, technical focuses feasibility/architecture/integration. |
| Research topic | string | yes | State the concrete topic or decision area this research should address. |
| Research goals | repeatable structured JSON | yes | Add one or more questions/goals the research must answer. |
| Scope notes | string | no | Add boundaries, exclusions, assumptions, or source constraints. |

### Step 2: `research_execution_agent`
- Type: `agent`
- Reads:
  - `research_type_ctx`
  - `research_topic_ctx`
  - `research_goals_ctx`
  - `scope_notes_ctx`
  - `setup_work_unit_ref`
  - `brainstorming_work_unit_ref`
- Writes:
  - `research_synthesis_ctx`
  - `source_inventory_ctx`
  - `research_report_artifact_ctx`
- Objective:
  - Execute the selected BMAD research variant.
  - Use available source-research tools/documentation/repo inspection appropriate to the question.
  - Distinguish sourced findings from assumptions.
  - Produce both structured synthesis and canonical report artifact.
  - Include downstream implications for Product Brief, PRD, UX Design, Architecture, Backlog, Story, or Course Correction when relevant.
- Prompt guardrails:
  - Do not produce generic advice detached from the research goals.
  - Do not hide uncertainty; every key finding must carry confidence.
  - Do not invent sources. If sources are unavailable, mark findings as low confidence and explain verification gaps.
  - The report must match the selected `research_type` variant.

### Step 3: `propagate_research_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable Research facts and artifact slots.

#### Propagate to Research work-unit facts
- `research_type_ctx` → Research fact `research_type`
- `research_topic_ctx` → Research fact `research_topic`
- `research_goals_ctx` → Research fact `research_goals`
- `scope_notes_ctx`, if present → Research fact `scope_notes`
- `research_synthesis_ctx` → Research fact `research_synthesis`
- `source_inventory_ctx`, if present → Research fact `source_inventory`
- `setup_work_unit_ref`, if present → Research fact `setup_work_unit`
- `brainstorming_work_unit_ref`, if present → Research fact `brainstorming_work_unit`

#### Propagate to Research artifact slots
- `research_report_artifact_ctx` → `RESEARCH_REPORT`

## Invoke and Downstream Design Notes

- Setup may create one or more Research units from `research_draft_specs`; each draft item chooses one concrete workflow through `researchType`.
- Brainstorming may create Research units from high-value open questions or areas needing validation.
- Product Brief and PRD should read Research through artifact references and `research_synthesis`, not by parsing all raw source inventory.
- Architecture should prefer Technical Research outputs for stack/integration/architecture decisions, while still preserving Market/Domain implications where they constrain product requirements.
- Course Correction may spawn additional Research when sprint execution reveals unknown market/domain/technical risks.

## Implementation Reference Files

- Current Setup/Brainstorming/Research seed authority: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Runtime fact schema: `packages/db/src/schema/runtime.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Action runtime behavior: `packages/workflow-engine/src/services/action-step-runtime-service.ts`
- Invoke runtime behavior: `packages/workflow-engine/src/services/invoke-work-unit-execution-service.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
- BMAD local workflow catalog: `_bmad/_config/bmad-help.csv`
- BMAD upstream authority: `https://github.com/bmad-code-org/BMAD-METHOD`
- BMAD workflow map: `https://docs.bmad-method.org/reference/workflow-map/`
