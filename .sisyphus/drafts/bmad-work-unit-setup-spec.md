# BMAD Work Unit Seed Spec: Setup

## Status
- Agreement state: **locked for implementation planning**
- Scope: BMAD Method seeded methodology, Setup work unit only
- Purpose: reference artifact for implementing canonical seed rows and the in-app seed action

## Ground Rules
- Work unit names are BMAD entities; workflow names are operations on those entities.
- Setup is a `one_per_project` work unit.
- Setup is an orchestration work unit: it uses `form`, `branch`, `agent`, `invoke`, and `action` steps.
- `display` must not be used. It should be removed from product/code references in the implementation plan.
- `action` is a generic automation step type; for this seed slice, the only action kind used is `propagation`.
- No fact defaults are seeded for now.
- `communication_language` and `document_output_language` are out of this Setup spec for now.
- Future custom string subtypes such as markdown strings and folder/path strings are out of scope for this seed spec and should be introduced later with a rebuilt default/fact system.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `setup` |
| Display name | `Setup` |
| Cardinality | `one_per_project` |
| Purpose | Initialize a BMAD project in Chiron, choose greenfield/brownfield setup path, optionally invoke early BMAD analysis/grounding units, and persist the durable setup result. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Setup has produced the durable project setup record and the project is ready to continue through the selected BMAD path. |

### Why no `in_progress` state for now
The setup workflow graph already models in-progress behavior through step execution. A separate work-unit lifecycle state is only useful if external systems need to reason about a partially initialized Setup unit outside the workflow. That need is not established for this seed slice.

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `setup_project` |

### Start gate
No external facts are required to start Setup beyond project existence and methodology availability.

### Completion gate
Setup can complete only after the workflow has propagated the durable setup result:

- Setup work-unit fact `initiative_name` exists
- Setup work-unit fact `project_kind` exists
- Setup work-unit fact `setup_path_summary` exists
- Setup work-unit fact `next_recommended_work_unit` exists
- Setup artifact slot `PROJECT_OVERVIEW` has an artifact instance or artifact reference

Optional brownfield/project facts and optional artifact slots do not block Setup completion unless the selected path explicitly required them.

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `PROJECT_OVERVIEW` | Project Overview | `single` | yes | Canonical setup summary and handoff artifact. |
| `BROWNFIELD_DOCS_INDEX` | Brownfield Docs Index | `single` | no | Optional reference/index artifact from brownfield documentation. If document-project creates many files, this slot points to the index, not every file. |
| `PROJECT_CONTEXT` | Project Context | `single` | no | Optional generated project-context artifact for implementation agents. |

### Project Context modeling note

`PROJECT_CONTEXT` is intentionally modeled as a Setup artifact slot, not a durable fact. The generated project-context output is a document-like handoff artifact for implementation agents; Setup should reference it through this slot when the brownfield Generate Project Context path runs or when an existing project-context artifact is discovered and accepted.

## Methodology / Project Fact Definitions Used by Setup

These are methodology-wide fact definitions whose runtime values are project fact instances. They are not Setup work-unit facts.

| Fact key | Fact family | Value type | Cardinality | Default | Source / writer | Purpose |
|---|---|---|---:|---|---|---|
| `project_knowledge_directory` | methodology fact → project fact | `string` | `one` | none | Setup agent/action if known | Directory where project docs/context live. Future folder-string type should refine this. |
| `planning_artifacts_directory` | methodology fact → project fact | `string` | `one` | none | Setup agent/action if known | Directory for BMAD planning artifacts. Future folder-string type should refine this. |
| `implementation_artifacts_directory` | methodology fact → project fact | `string` | `one` | none | Setup agent/action if known | Directory for sprint/story/review implementation artifacts. Future folder-string type should refine this. |
| `repository_type` | methodology fact → project fact | `string` enum | `one` | none | Brownfield setup agent/action if confidently inferred | `monolith`, `monorepo`, or `multi_part`. |
| `project_parts` | methodology fact → project fact | `json` | `many` | none | Brownfield setup agent/action if confidently inferred | Detected apps/packages/services/parts. |
| `technology_stack_by_part` | methodology fact → project fact | `json` | `many` | none | Brownfield setup agent/action if confidently inferred | Technology stack per detected project part. |
| `existing_documentation_inventory` | methodology fact → project fact | `json` | `many` | none | Brownfield setup agent/action if confidently inferred | Existing repo docs discovered during scan. |
| `integration_points` | methodology fact → project fact | `json` | `many` | none | Brownfield setup agent/action if confidently inferred | Relationships between project parts/services. |

### `repository_type` validation

```ts
"monolith" | "monorepo" | "multi_part"
```

### `project_parts` item schema

```ts
{
  partId: string;
  rootPath: string;
  displayName?: string;
  projectType: string;
  confidence: "low" | "medium" | "high";
}
```

### `technology_stack_by_part` item schema

```ts
{
  partId: string;
  language?: string;
  framework?: string;
  runtime?: string;
  database?: string;
  packageManager?: string;
  notableDependencies?: string[];
}
```

### `existing_documentation_inventory` item schema

```ts
{
  path: string;
  docType: string;
  relatedPartId?: string;
  relevance: "low" | "medium" | "high";
  notes?: string;
}
```

### `integration_points` item schema

```ts
{
  fromPartId: string;
  toPartId: string;
  integrationType: string;
  details?: string;
}
```

## Setup Work-Unit Fact Definitions

These are durable facts owned by the Setup work unit.

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `initiative_name` | `string` | `one` | yes | Durable project/initiative label captured at setup intake. |
| `project_kind` | `string` enum | `one` | yes | Durable greenfield/brownfield split. |
| `setup_path_summary` | `json` | `one` | yes | Structured record of what Setup selected, invoked, propagated, deferred, and recommended next. |
| `next_recommended_work_unit` | `work_unit_reference` | `one` | yes | Durable pointer to the next recommended work unit after Setup. |

### `project_kind` validation

```ts
"greenfield" | "brownfield"
```

### `setup_path_summary` schema

```ts
{
  projectKind: "greenfield" | "brownfield";
  selectedPath:
    | "direct_brief"
    | "brainstorm_first"
    | "research_first"
    | "brownfield_grounding"
    | "defer_analysis";
  invokedWorkUnits: Array<{
    workUnitTypeKey: string;
    reason: string;
    status: "invoked" | "deferred" | "skipped";
  }>;
  propagatedProjectFacts: Array<{
    factKey: string;
    source: "agent_inferred" | "user_selected" | "child_work_unit";
  }>;
  deferredItems: Array<{
    kind:
      | "brainstorming"
      | "research"
      | "product_brief"
      | "document_project"
      | "project_context";
    reason: string;
    recommendedTrigger: string;
  }>;
  nextRecommendedWorkUnitTypeKey: string;
  rationale: string;
}
```

## Setup Workflow Context Fact Definitions

Workflow context facts are local to one Setup workflow execution. They are used for forms, agent writes, branch conditions, invoke specs, and action propagation.

### Core intake context facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `initiative_name_ctx` | `bound_fact` | binds Setup fact `initiative_name` | `one` | Step 1 form | Local capture before propagation. |
| `project_kind_ctx` | `bound_fact` | binds Setup fact `project_kind` | `one` | Step 1 form | Local capture for branch routing and final propagation. |

### Brownfield preference context facts

| Fact key | Context fact kind | Value type | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `scan_level_ctx` | `plain_fact` | string enum | `one` | Brownfield preferences form | Scan depth preference. |
| `workflow_mode_ctx` | `plain_fact` | string enum | `one` | Brownfield preferences form | Guided vs autonomous preference. |

#### `scan_level_ctx` validation

```ts
"quick" | "deep" | "exhaustive"
```

#### `workflow_mode_ctx` validation

```ts
"guided" | "autonomous"
```

### Greenfield agent context facts

| Fact key | Context fact kind | Value type | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `greenfield_understanding` | `plain_fact` | `json` | `one` | Greenfield setup agent | Agent's structured understanding of what the user wants to build. |
| `analysis_plan` | `plain_fact` | `json` | `one` | Greenfield setup agent | Agent's selected Brainstorming/Research/Product Brief sequence. |

#### `greenfield_understanding` schema

```ts
{
  productIdea: string;
  targetUsers?: string;
  problemStatement?: string;
  desiredOutcome?: string;
  knownConstraints: string[];
  ideaClarity: "fuzzy" | "emerging" | "clear";
  userClarity: "unknown" | "partial" | "clear";
  solutionClarity: "unknown" | "partial" | "clear";
}
```

#### `analysis_plan` schema

```ts
{
  canonicalOrder: ["brainstorming", "research", "product_brief"];
  decisions: {
    brainstorming: "invoke_now" | "defer" | "skip";
    research: "invoke_now" | "defer" | "skip";
    productBrief: "invoke_now" | "defer" | "skip";
  };
  researchTypes: Array<"market" | "domain" | "technical">;
  rationaleByDecision: {
    brainstorming?: string;
    research?: string;
    productBrief?: string;
  };
}
```

### Brownfield agent context facts

| Fact key | Context fact kind | Value type | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `brownfield_understanding` | `plain_fact` | `json` | `one` | Brownfield setup agent | Structured repo/project scan understanding. |
| `brownfield_grounding_plan` | `plain_fact` | `json` | `one` | Brownfield setup agent | Agent's selected grounding/analysis plan. |

#### `brownfield_understanding` schema

```ts
{
  existingSystemDescription: string;
  detectedProjectTypes: Array<{
    partId: string;
    rootPath: string;
    projectType: string;
    confidence: "low" | "medium" | "high";
  }>;
  existingDocs: Array<{
    path: string;
    docType: string;
    relevance: "low" | "medium" | "high";
  }>;
  projectContextStatus: "exists" | "missing" | "stale" | "unknown";
  techStackSummary: Array<{
    partId: string;
    framework?: string;
    language?: string;
    database?: string;
  }>;
  requestedChangeKnown: boolean;
}
```

#### `brownfield_grounding_plan` schema

```ts
{
  scanLevel: "quick" | "deep" | "exhaustive";
  workflowMode: "guided" | "autonomous";
  decisions: {
    documentProject: "invoke_now" | "defer" | "skip";
    generateProjectContext: "invoke_now" | "defer" | "skip";
    brainstorming: "invoke_now" | "defer" | "skip";
    research: "invoke_now" | "defer" | "skip";
    productBrief: "invoke_now" | "defer" | "skip";
  };
  rationaleByDecision: {
    documentProject?: string;
    generateProjectContext?: string;
    brainstorming?: string;
    research?: string;
    productBrief?: string;
  };
}
```

### Draft spec and reference context facts

| Fact key | Context fact kind | Cardinality | Writer | Purpose |
|---|---|---:|---|---|
| `document_project_draft_spec` | `work_unit_draft_spec_fact` | `one` | Brownfield setup agent | Draft child work unit spec for Document Project. |
| `project_context_draft_spec` | `work_unit_draft_spec_fact` | `one` | Brownfield setup agent | Draft child work unit spec for Generate Project Context. |
| `brainstorming_draft_spec` | `work_unit_draft_spec_fact` | `one` | Setup agent | Draft child work unit spec for Brainstorming. |
| `research_draft_specs` | `work_unit_draft_spec_fact` | `many` | Setup agent | Draft child work unit specs for market/domain/technical research. |
| `product_brief_draft_spec` | `work_unit_draft_spec_fact` | `one` | Setup agent | Draft child work unit spec for Product Brief. |
| `invoked_work_unit_refs` | `work_unit_reference_fact` | `many` | Invoke steps | References to child units Setup created/activated. |
| `project_overview_draft` | `artifact_slot_reference_fact` | `one` | Setup agent | Staged setup overview for final propagation. |
| `next_work_unit_ref` | `work_unit_reference_fact` | `one` | Setup agent or invoke output | Staged next recommended work unit. |

### `research_draft_specs` item schema

```ts
{
  researchType: "market" | "domain" | "technical";
  researchTopic: string;
  researchGoals: Array<{
    title: string;
    question: string;
    successSignal?: string;
    priority: "low" | "medium" | "high";
  }>;
  sourceWorkUnitRefs?: string[];
}
```

## Workflow Definition: `setup_project`

| Property | Value |
|---|---|
| Workflow key | `setup_project` |
| Family | `setup` |
| Intent | `primary_setup_orchestration` |
| Bound transition | `activation_to_done` |
| Entry step | `capture_setup_intake` |

## Workflow Step Graph

### Step 1: `capture_setup_intake`
- Type: `form`
- Writes:
  - `initiative_name_ctx`
  - `project_kind_ctx`
- Fields:

| Field | Type | Required | Help text |
|---|---|---:|---|
| Initiative name | string | yes | Give this project or initiative a short name. This becomes the durable Setup identity for the project. |
| Project kind | enum `greenfield | brownfield` | yes | Choose Greenfield if this is a new product/project. Choose Brownfield if Chiron should inspect an existing repo/project before planning. |

### Step 2: `route_by_project_kind`
- Type: `branch`
- Reads: `project_kind_ctx`
- Routes:
  - `greenfield` → `greenfield_setup_agent`
  - `brownfield` → `brownfield_scan_preferences`

## Greenfield Path

### Step 3G: `greenfield_setup_agent`
- Type: `agent`
- Reads:
  - `initiative_name_ctx`
  - `project_kind_ctx`
- Writes:
  - `greenfield_understanding`
  - `analysis_plan`
  - `brainstorming_draft_spec`
  - `research_draft_specs`
  - `product_brief_draft_spec`
  - `project_overview_draft`
  - `next_work_unit_ref`
- Objective:
  - Understand what the user wants to build.
  - Determine whether the idea is fuzzy, emerging, or clear.
  - Decide whether to invoke Brainstorming, Research, Product Brief, or defer/skip any of them.
  - Produce draft specs for selected child work units.
  - Produce a project overview draft and next recommended work unit.
- Initial prompt intent:
  - Tell the user this step sets up a new BMAD project.
  - Conversationally elicit what they want to build, who it is for, what problem it solves, and how clear the idea is.
  - Ask only for information needed to choose the next BMAD path.

### Step 4G: `should_invoke_brainstorming`
- Type: `branch`
- Reads: `analysis_plan.decisions.brainstorming`
- Routes:
  - `invoke_now` → `invoke_brainstorming`
  - `defer` / `skip` → `should_invoke_research`

### Step 5G: `invoke_brainstorming`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `brainstorming`
- Source: `brainstorming_draft_spec`
- On completion: continue to `should_invoke_research`

### Step 6G: `should_invoke_research`
- Type: `branch`
- Reads: `analysis_plan.decisions.research`
- Routes:
  - `invoke_now` → `invoke_research`
  - `defer` / `skip` → `should_invoke_product_brief`

### Step 7G: `invoke_research`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `research`
- Source: `research_draft_specs`
- Cardinality behavior: may create one or more Research work units depending on number of draft specs.
- On completion: continue to `should_invoke_product_brief`

### Step 8G: `should_invoke_product_brief`
- Type: `branch`
- Reads: `analysis_plan.decisions.productBrief`
- Routes:
  - `invoke_now` → `invoke_product_brief`
  - `defer` / `skip` → `propagate_setup_outputs`

### Step 9G: `invoke_product_brief`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `product_brief`
- Source: `product_brief_draft_spec`
- On completion: continue to `propagate_setup_outputs`

## Brownfield Path

### Step 3B: `brownfield_scan_preferences`
- Type: `form`
- Writes:
  - `scan_level_ctx`
  - `workflow_mode_ctx`
- Fields:

| Field | Type | Required | Help text |
|---|---|---:|---|
| Scan level | enum `quick | deep | exhaustive` | yes | Choose how deeply Chiron should inspect the existing project. Quick checks key manifests and docs. Deep inspects critical directories and architecture surfaces. Exhaustive is slower and intended for unfamiliar or high-risk repos. |
| Workflow mode | enum `guided | autonomous` | yes | Guided mode asks before major follow-up workflows. Autonomous mode uses sensible defaults from the agent's analysis and stops only for blockers or important tradeoffs. |

### Step 4B: `brownfield_setup_agent`
- Type: `agent`
- Reads:
  - `initiative_name_ctx`
  - `project_kind_ctx`
  - `scan_level_ctx`
  - `workflow_mode_ctx`
- Writes:
  - `brownfield_understanding`
  - `brownfield_grounding_plan`
  - `document_project_draft_spec`
  - `project_context_draft_spec`
  - `brainstorming_draft_spec`
  - `research_draft_specs`
  - `product_brief_draft_spec`
  - `project_overview_draft`
  - `next_work_unit_ref`
- Objective:
  - Inspect the existing project/repo.
  - Identify project type(s), docs, project-context status, tech stack, and relevant architecture signals.
  - Decide whether to invoke Document Project, Generate Project Context, Brainstorming, Research, or Product Brief.
  - Write structured setup facts and draft specs for selected child work units.
- Initial prompt intent:
  - Tell the user the agent will inspect the existing project, identify useful docs/context, and keep the user involved only where judgment is needed.

### Step 5B: `should_invoke_document_project`
- Type: `branch`
- Reads: `brownfield_grounding_plan.decisions.documentProject`
- Routes:
  - `invoke_now` → `invoke_document_project`
  - `defer` / `skip` → `should_invoke_generate_project_context`

### Step 6B: `invoke_document_project`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `document_project`
- Source: `document_project_draft_spec`
- On completion: continue to `should_invoke_generate_project_context`

### Step 7B: `should_invoke_generate_project_context`
- Type: `branch`
- Reads: `brownfield_grounding_plan.decisions.generateProjectContext`
- Routes:
  - `invoke_now` → `invoke_generate_project_context`
  - `defer` / `skip` → `should_invoke_brownfield_brainstorming`

### Step 8B: `invoke_generate_project_context`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `project_context`
- Source: `project_context_draft_spec`
- On completion: continue to `should_invoke_brownfield_brainstorming`

### Step 9B: `should_invoke_brownfield_brainstorming`
- Type: `branch`
- Reads: `brownfield_grounding_plan.decisions.brainstorming`
- Routes:
  - `invoke_now` → `invoke_brownfield_brainstorming`
  - `defer` / `skip` → `should_invoke_brownfield_research`

### Step 10B: `invoke_brownfield_brainstorming`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `brainstorming`
- Source: `brainstorming_draft_spec`
- On completion: continue to `should_invoke_brownfield_research`

### Step 11B: `should_invoke_brownfield_research`
- Type: `branch`
- Reads: `brownfield_grounding_plan.decisions.research`
- Routes:
  - `invoke_now` → `invoke_brownfield_research`
  - `defer` / `skip` → `should_invoke_brownfield_product_brief`

### Step 12B: `invoke_brownfield_research`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `research`
- Source: `research_draft_specs`
- Cardinality behavior: may create one or more Research work units depending on number of draft specs.
- On completion: continue to `should_invoke_brownfield_product_brief`

### Step 13B: `should_invoke_brownfield_product_brief`
- Type: `branch`
- Reads: `brownfield_grounding_plan.decisions.productBrief`
- Routes:
  - `invoke_now` → `invoke_brownfield_product_brief`
  - `defer` / `skip` → `propagate_setup_outputs`

### Step 14B: `invoke_brownfield_product_brief`
- Type: `invoke`
- Target kind: `work_unit`
- Target work unit: `product_brief`
- Source: `product_brief_draft_spec`
- On completion: continue to `propagate_setup_outputs`

## Shared Finalization

### Step 15: `propagate_setup_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable project/work-unit facts and artifact slots.

#### Propagate to Setup work-unit facts
- `initiative_name_ctx` → Setup fact `initiative_name`
- `project_kind_ctx` → Setup fact `project_kind`
- synthesized path summary → Setup fact `setup_path_summary`
- `next_work_unit_ref` → Setup fact `next_recommended_work_unit`

#### Propagate to Setup artifact slots
- `project_overview_draft` → `PROJECT_OVERVIEW`
- brownfield docs index reference, if present → `BROWNFIELD_DOCS_INDEX`
- project context reference, if present → `PROJECT_CONTEXT`

#### Propagate to project facts, when established
- `project_knowledge_directory`
- `planning_artifacts_directory`
- `implementation_artifacts_directory`
- `repository_type`
- `project_parts`
- `technology_stack_by_part`
- `existing_documentation_inventory`
- `integration_points`

## Invoke and Gate Design Notes

- Optional invokes are controlled by branch steps because invoke steps do not own conditional logic.
- Child work-unit start gates should be satisfied by invoke bindings wherever possible.
- Action propagation is used for durable Setup/project outputs, not for user-facing summaries.
- If a child work unit requires project-level facts in its transition start gate, the relevant project facts must be propagated before that invoke or passed through invoke bindings if the child gate reads work-unit facts.

## Implementation Reference Files

- Current Setup seed authority: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Runtime fact schema: `packages/db/src/schema/runtime.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Action runtime behavior: `packages/workflow-engine/src/services/action-step-runtime-service.ts`
- Invoke runtime behavior: `packages/workflow-engine/src/services/invoke-work-unit-execution-service.ts`
- Branch runtime behavior: `packages/workflow-engine/src/services/branch-route-evaluator.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
