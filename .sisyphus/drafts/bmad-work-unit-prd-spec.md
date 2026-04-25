# BMAD Work Unit Seed Spec: PRD

## Status
- Agreement state: **draft for review**
- Scope: BMAD Method seeded methodology, PRD work unit only
- Purpose: reference artifact for implementing canonical PRD seed rows and downstream UX / Architecture / Backlog bindings

## Ground Rules
- PRD is a BMAD planning work unit that converts Product Brief / Research / Brainstorming / Project Context into the product capability contract.
- PRD is `many_per_project`: a project may have multiple product briefs, major versions, or significant product directions; each PRD must bind to one chosen source Product Brief or direct source context.
- The canonical output is one `PRD` artifact.
- The PRD is the capability contract: downstream UX, Architecture, Backlog/Epics, Readiness, and Stories must trace back to PRD requirements.
- BMAD's detailed step-file workflow is preserved as embedded agent procedure, but Chiron should not model every BMAD micro-step as a separate workflow step unless product UX later needs that granularity.
- Optional PRD sections such as domain requirements and innovation analysis are included only when applicable.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `prd` |
| Display name | `PRD` |
| Cardinality | `many_per_project` |
| Purpose | Create a polished Product Requirements Document that defines vision, scope, journeys, FRs, NFRs, and downstream traceability anchors. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | The PRD artifact is complete, polished, and ready to feed UX, Architecture, Backlog/Epics, and readiness validation. |

### Why no separate `draft` / `review` lifecycle states for now
BMAD PRD drafting and review are iterative workflow behaviors. Durable lifecycle states should represent whether the PRD work unit is ready for downstream work, not every partial section state.

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `create_prd` |

### Start gate
PRD can start when at least one meaningful source context exists:

- Product Brief work unit reference, preferred; or
- Product Brief artifact / distillate reference; or
- Direct user-provided product intent sufficient for PRD discovery; plus
- Optional Research, Brainstorming, Project Context, and project documentation references when available.

### Completion gate
PRD can complete only when the workflow has propagated the core contract and artifact:

- PRD work-unit fact `project_name` exists
- PRD work-unit fact `project_classification` exists
- PRD work-unit fact `product_vision` exists
- PRD work-unit fact `success_criteria` exists
- PRD work-unit fact `user_journeys` has at least one item
- PRD work-unit fact `scope_plan` exists
- PRD work-unit fact `functional_requirements` has at least one item
- PRD work-unit fact `non_functional_requirements` exists, even if it records that no special NFR categories apply
- PRD work-unit fact `prd_synthesis` exists
- PRD artifact slot `PRD` has an artifact instance or artifact reference
- PRD work-unit fact `next_recommended_work_units` has at least one item

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `PRD` | Product Requirements Document | `single` | yes | Canonical polished PRD artifact, with frontmatter/provenance and all required requirement sections. |

### PRD artifact required section coverage
The `PRD` artifact should include, when applicable:

- Executive Summary
- Project Classification
- Success Criteria
- Product Scope
- User Journeys
- Domain-Specific Requirements, optional
- Innovation & Novel Patterns, optional
- Project-Type Specific Requirements
- Project Scoping & Phased Development
- Functional Requirements
- Non-Functional Requirements

## PRD Work-Unit Fact Definitions

These are durable facts owned by each PRD work unit instance.

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `setup_work_unit` | `work_unit_reference` | `one` | no | Optional Setup source reference. |
| `product_brief_work_unit` | `work_unit_reference` | `one` | no | Preferred source Product Brief reference. |
| `research_work_units` | `work_unit_reference` | `many` | no | Research inputs used by the PRD. |
| `brainstorming_work_unit` | `work_unit_reference` | `one` | no | Brainstorming input used by the PRD. |
| `project_name` | `string` | `one` | yes | Project/product name used in the PRD. |
| `input_context_inventory` | `json` | `many` | no | Input artifacts/work units/docs discovered or supplied. |
| `project_classification` | `json` | `one` | yes | Product type, domain, complexity, and greenfield/brownfield context. |
| `product_vision` | `json` | `one` | yes | Vision, differentiator, core insight, and target user framing. |
| `success_criteria` | `json` | `one` | yes | User/business/technical success criteria and measurable outcomes. |
| `user_journeys` | `json` | `many` | yes | Narrative journeys and capability implications. |
| `domain_requirements` | `json` | `one` | no | Domain/compliance/integration/risk constraints when applicable. |
| `innovation_analysis` | `json` | `one` | no | Novelty, validation, market context, and fallback thinking when applicable. |
| `project_type_requirements` | `json` | `one` | no | Project-type-specific requirements and technical considerations. |
| `scope_plan` | `json` | `one` | yes | MVP strategy, phases, must-haves, post-MVP features, and risk mitigations. |
| `functional_requirements` | `json` | `many` | yes | Numbered implementation-agnostic capability requirements. |
| `non_functional_requirements` | `json` | `many` | yes | Specific, relevant quality-attribute requirements or explicit no-special-NFR record. |
| `prd_synthesis` | `json` | `one` | yes | Machine-readable downstream summary and traceability metadata. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | yes | Next recommended work units, typically UX Design, Architecture, Backlog, and/or Implementation Readiness. |

### `input_context_inventory` item schema

```ts
{
  kind: "artifact" | "work_unit" | "document" | "project_context" | "direct_user_input" | "other";
  label: string;
  reference?: string;
  loaded: boolean;
  relevance: "low" | "medium" | "high";
}
```

### `project_classification` schema

```ts
{
  projectType: string;
  domain: string;
  complexity: "low" | "medium" | "high";
  projectContext: "greenfield" | "brownfield";
  detectionSignals: string[];
  confidence: "low" | "medium" | "high";
}
```

### `product_vision` schema

```ts
{
  vision: string;
  differentiator: string;
  coreInsight: string;
  targetUsers: string[];
  whyNow?: string;
}
```

### `success_criteria` schema

```ts
{
  userSuccess: string[];
  businessSuccess: string[];
  technicalSuccess: string[];
  measurableOutcomes: string[];
}
```

### `user_journeys` item schema

```ts
{
  journeyId: string;
  userType: string;
  narrative: string;
  happyPath: boolean;
  edgeOrFailurePath: boolean;
  capabilityImplications: string[];
}
```

### `domain_requirements` schema

```ts
{
  included: boolean;
  reason: string;
  complianceAndRegulatory: string[];
  technicalConstraints: string[];
  integrationRequirements: string[];
  riskMitigations: string[];
}
```

### `innovation_analysis` schema

```ts
{
  included: boolean;
  detectedInnovationAreas: string[];
  marketContext: string[];
  validationApproach: string[];
  riskMitigation: string[];
}
```

### `project_type_requirements` schema

```ts
{
  projectType: string;
  overview: string;
  technicalArchitectureConsiderations: string[];
  dynamicSections: Array<{
    sectionKey: string;
    content: string[];
  }>;
  implementationConsiderations: string[];
}
```

### `scope_plan` schema

```ts
{
  mvpApproach: string;
  resourceRequirements?: string[];
  phase1Mvp: {
    supportedJourneys: string[];
    mustHaveCapabilities: string[];
  };
  phase2PostMvp: string[];
  phase3Vision: string[];
  riskMitigation: {
    technical: string[];
    market: string[];
    resource: string[];
  };
}
```

### `functional_requirements` item schema

```ts
{
  id: string; // FR1, FR2, ...
  capabilityArea: string;
  actor: string;
  capability: string;
  statement: string;
  sourceJourneyIds?: string[];
  mvpPhase: "mvp" | "post_mvp" | "vision";
}
```

### `non_functional_requirements` item schema

```ts
{
  id: string; // NFR1, NFR2, ...
  category: "performance" | "security" | "scalability" | "accessibility" | "integration" | "reliability" | "other" | "none_special";
  statement: string;
  measurableCriterion?: string;
  rationale: string;
}
```

### `prd_synthesis` schema

```ts
{
  executiveSummary: string;
  capabilityAreas: string[];
  frCount: number;
  nfrCount: number;
  optionalSectionsIncluded: Array<"domain_requirements" | "innovation_analysis" | "project_type_requirements">;
  downstreamTraceability: {
    uxNeeds: string[];
    architectureNeeds: string[];
    backlogNeeds: string[];
    readinessRisks: string[];
  };
  openQuestions: string[];
}
```

## Workflow Context Fact Definitions

### Bound PRD facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `project_name_ctx` | `bound_fact` | binds PRD fact `project_name` | `one` | Initialization agent | Local project name. |
| `input_context_inventory_ctx` | `bound_fact` | binds PRD fact `input_context_inventory` | `many` | Initialization agent | Loaded/discovered inputs. |
| `project_classification_ctx` | `bound_fact` | binds PRD fact `project_classification` | `one` | Discovery agent | Project/domain classification. |
| `product_vision_ctx` | `bound_fact` | binds PRD fact `product_vision` | `one` | Discovery agent | Vision/differentiator. |
| `success_criteria_ctx` | `bound_fact` | binds PRD fact `success_criteria` | `one` | Success/journeys agent | Success criteria. |
| `user_journeys_ctx` | `bound_fact` | binds PRD fact `user_journeys` | `many` | Success/journeys agent | User journeys. |
| `domain_requirements_ctx` | `bound_fact` | binds PRD fact `domain_requirements` | `one` | Context requirements agent | Optional domain constraints. |
| `innovation_analysis_ctx` | `bound_fact` | binds PRD fact `innovation_analysis` | `one` | Context requirements agent | Optional innovation section. |
| `project_type_requirements_ctx` | `bound_fact` | binds PRD fact `project_type_requirements` | `one` | Context requirements agent | Project-type requirements. |
| `scope_plan_ctx` | `bound_fact` | binds PRD fact `scope_plan` | `one` | Context requirements agent | MVP/phasing/risk scope plan. |
| `functional_requirements_ctx` | `bound_fact` | binds PRD fact `functional_requirements` | `many` | Capability contract agent | FR list. |
| `non_functional_requirements_ctx` | `bound_fact` | binds PRD fact `non_functional_requirements` | `many` | Capability contract agent | NFR list. |
| `prd_synthesis_ctx` | `bound_fact` | binds PRD fact `prd_synthesis` | `one` | Polish/completion agent | Downstream summary. |
| `next_work_unit_refs` | `bound_fact` | binds PRD fact `next_recommended_work_units` | `many` | Polish/completion agent | Next recommended units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `setup_work_unit_ref` | `work_unit_reference_fact` | Setup work unit | `one` | Invoke binding | Setup source context. |
| `product_brief_work_unit_ref` | `work_unit_reference_fact` | Product Brief work unit | `one` | Invoke binding | Preferred Product Brief source. |
| `research_work_unit_refs` | `work_unit_reference_fact` | Research work units | `many` | Invoke binding | Research source context. |
| `brainstorming_work_unit_ref` | `work_unit_reference_fact` | Brainstorming work unit | `one` | Invoke binding | Brainstorming source context. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | Product Brief / Research / Project Context / docs | `many` | Invoke binding / initialization agent | Prior artifacts to load or summarize. |
| `prd_artifact_ctx` | `artifact_slot_reference_fact` | `PRD` | `one` | Polish/completion agent | Staged PRD artifact before propagation. |

## Workflow Definition: `create_prd`

| Property | Value |
|---|---|
| Workflow key | `create_prd` |
| Family | `prd` |
| Intent | `create_product_requirements_document` |
| Bound transition | `activation_to_done` |
| Entry step | `prd_input_initialization_agent` |

## Workflow Step Graph

### Step 1: `prd_input_initialization_agent`
- Type: `agent`
- Purpose: BMAD Step 1: discover inputs, handle continuation, initialize PRD artifact context.
- Reads:
  - `setup_work_unit_ref`
  - `product_brief_work_unit_ref`
  - `research_work_unit_refs`
  - `brainstorming_work_unit_ref`
  - `input_artifact_refs`
- Writes:
  - `project_name_ctx`
  - `input_context_inventory_ctx`
- Objective:
  - Discover Product Brief, Research, Brainstorming, Project Context, and project docs.
  - Prefer bound Chiron work-unit/artifact references over filesystem scanning when available.
  - Confirm the input set with the user in guided mode before using it.
  - Track source provenance for PRD frontmatter and downstream traceability.

### Step 2: `prd_discovery_and_vision_agent`
- Type: `agent`
- Purpose: BMAD Steps 2, 2b, and 2c: classify project, discover vision/differentiator, generate executive summary.
- Reads:
  - `project_name_ctx`
  - `input_context_inventory_ctx`
- Writes:
  - `project_classification_ctx`
  - `product_vision_ctx`
- Objective:
  - Classify project type, domain, complexity, and greenfield/brownfield context.
  - Discover product vision, differentiator, core insight, target users, and why-now if relevant.
  - Prepare executive-summary content for the PRD artifact.

### Step 3: `prd_success_and_journeys_agent`
- Type: `agent`
- Purpose: BMAD Steps 3 and 4: define success criteria and map user journeys.
- Reads:
  - `project_classification_ctx`
  - `product_vision_ctx`
  - `input_context_inventory_ctx`
- Writes:
  - `success_criteria_ctx`
  - `user_journeys_ctx`
- Objective:
  - Define user, business, and technical success with measurable outcomes.
  - Map primary, edge-case, secondary/admin/support, and API/integration journeys when applicable.
  - Connect journeys explicitly to capability implications.

### Step 4: `prd_context_requirements_agent`
- Type: `agent`
- Purpose: BMAD Steps 5, 6, 7, and 8: optional domain/innovation analysis, project-type requirements, MVP scope.
- Reads:
  - `project_classification_ctx`
  - `product_vision_ctx`
  - `success_criteria_ctx`
  - `user_journeys_ctx`
  - `input_context_inventory_ctx`
- Writes:
  - `domain_requirements_ctx`, if applicable
  - `innovation_analysis_ctx`, if applicable
  - `project_type_requirements_ctx`
  - `scope_plan_ctx`
- Objective:
  - Include domain-specific requirements only for medium/high complexity or user-requested domains.
  - Include innovation analysis only when genuine innovation signals exist or user explicitly explores them.
  - Use project-type guidance to elicit relevant technical/product constraints without prescribing implementation.
  - Define MVP, post-MVP, vision phases, and risk mitigations.

### Step 5: `prd_capability_contract_agent`
- Type: `agent`
- Purpose: BMAD Steps 9 and 10: synthesize FRs and NFRs.
- Reads:
  - `project_classification_ctx`
  - `product_vision_ctx`
  - `success_criteria_ctx`
  - `user_journeys_ctx`
  - `domain_requirements_ctx`
  - `innovation_analysis_ctx`
  - `project_type_requirements_ctx`
  - `scope_plan_ctx`
- Writes:
  - `functional_requirements_ctx`
  - `non_functional_requirements_ctx`
- Objective:
  - Extract every capability implied by the prior PRD sections.
  - Group FRs by capability area, not implementation layer.
  - Ensure each FR says WHAT capability exists, not HOW it is implemented.
  - Define only relevant NFR categories, making each specific and measurable.
  - Treat the FR list as binding downstream scope.

### Step 6: `prd_polish_and_completion_agent`
- Type: `agent`
- Purpose: BMAD Steps 11 and 12: polish complete PRD, reconcile brainstorming, finalize next steps.
- Reads:
  - all prior PRD context facts
  - `brainstorming_work_unit_ref`
  - `input_artifact_refs`
- Writes:
  - `prd_synthesis_ctx`
  - `prd_artifact_ctx`
  - `next_work_unit_refs`
- Objective:
  - Produce the final polished PRD artifact.
  - Reduce duplication while preserving all essential requirements and user intent.
  - Reconcile brainstorming inputs so qualitative/soft ideas are not silently dropped.
  - Verify Level 2 section structure for future sharding/extraction.
  - Recommend next BMAD work units: UX Design when UI/user interaction is material, Architecture for technical design, Backlog/Epics for story decomposition, and Implementation Readiness when validation is needed.

### Step 7: `propagate_prd_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable PRD facts and artifact slots.

#### Propagate to PRD work-unit facts
- `setup_work_unit_ref`, if present → PRD fact `setup_work_unit`
- `product_brief_work_unit_ref`, if present → PRD fact `product_brief_work_unit`
- `research_work_unit_refs`, if present → PRD fact `research_work_units`
- `brainstorming_work_unit_ref`, if present → PRD fact `brainstorming_work_unit`
- `project_name_ctx` → PRD fact `project_name`
- `input_context_inventory_ctx`, if present → PRD fact `input_context_inventory`
- `project_classification_ctx` → PRD fact `project_classification`
- `product_vision_ctx` → PRD fact `product_vision`
- `success_criteria_ctx` → PRD fact `success_criteria`
- `user_journeys_ctx` → PRD fact `user_journeys`
- `domain_requirements_ctx`, if present → PRD fact `domain_requirements`
- `innovation_analysis_ctx`, if present → PRD fact `innovation_analysis`
- `project_type_requirements_ctx`, if present → PRD fact `project_type_requirements`
- `scope_plan_ctx` → PRD fact `scope_plan`
- `functional_requirements_ctx` → PRD fact `functional_requirements`
- `non_functional_requirements_ctx` → PRD fact `non_functional_requirements`
- `prd_synthesis_ctx` → PRD fact `prd_synthesis`
- `next_work_unit_refs` → PRD fact `next_recommended_work_units`

#### Propagate to PRD artifact slots
- `prd_artifact_ctx` → `PRD`

## Invoke and Downstream Design Notes

- Product Brief should invoke PRD with `product_brief_work_unit_ref`, `input_artifact_refs`, and optional Research/Brainstorming references.
- PRD is the preferred source for UX Design, Architecture, Backlog, and Implementation Readiness.
- UX Design should read PRD journeys, success criteria, FRs, NFRs, and scope boundaries.
- Architecture should read PRD FRs/NFRs, project-type requirements, domain requirements, and scope plan.
- Backlog/Epics must derive stories from PRD FRs, plus UX/Architecture constraints when available.
- Implementation Readiness validates PRD alignment with UX, Architecture, and Backlog/Epics rather than replacing PRD review.

## Implementation Reference Files

- BMAD PRD workflow: `_bmad/bmm/2-plan-workflows/bmad-create-prd/workflow.md`
- BMAD PRD template: `_bmad/bmm/2-plan-workflows/bmad-create-prd/templates/prd-template.md`
- BMAD PRD init/discovery steps: `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-01-init.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-02-discovery.md`
- BMAD PRD vision/executive summary steps: `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-02b-vision.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-02c-executive-summary.md`
- BMAD PRD requirements steps: `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-03-success.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-04-journeys.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-09-functional.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-10-nonfunctional.md`
- BMAD PRD context/scoping steps: `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-05-domain.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-06-innovation.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-07-project-type.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-08-scoping.md`
- BMAD PRD polish/complete steps: `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-11-polish.md`, `_bmad/bmm/2-plan-workflows/bmad-create-prd/steps-c/step-12-complete.md`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
