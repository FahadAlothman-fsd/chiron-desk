# BMAD Work Unit Seed Spec: Architecture

## Status
- Agreement state: **draft for review**
- Scope: BMAD Method seeded methodology, Architecture work unit only
- Purpose: reference artifact for implementing canonical Architecture seed rows and downstream Backlog / Implementation Readiness bindings

## Ground Rules
- Architecture is a BMAD solutioning work unit that turns PRD, optional UX Design, research, and project context into implementation-consistency decisions.
- Architecture requires a PRD source. If no PRD exists, the Architecture workflow should stop and recommend PRD creation first.
- Architecture is `many_per_project`: projects may need multiple architecture units for major versions, product surfaces, subsystems, or course-correction redesigns.
- The canonical output is an Architecture Decision Document.
- Architecture decisions are durable work-unit facts because downstream Backlog, Stories, and implementation agents must trace technical work back to them.
- BMAD's micro-step Architecture workflow is preserved as embedded agent procedure, but Chiron should model it as a smaller set of agent-heavy steps initially.
- Technology/version facts must be verified by the executing Architecture agent at execution time; do not seed hardcoded versions.
- No time estimates should appear in Architecture outputs.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `architecture` |
| Display name | `Architecture` |
| Cardinality | `many_per_project` |
| Purpose | Create validated architecture decisions, implementation patterns, project structure, and handoff guidance so AI agents implement consistently. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Architecture document and structured decision facts are complete and ready to feed Backlog/Epics, Stories, and Implementation Readiness validation. |

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `create_architecture` |

### Start gate
Architecture can start when:

- A PRD work-unit reference or PRD artifact exists; and
- Optional UX Design, Research, Product Brief, Project Context, and project docs are bound when available.

Architecture must not proceed without a PRD-equivalent requirement source because BMAD treats PRD as required architecture input.

### Completion gate
Architecture can complete only when the workflow has propagated the architecture contract and artifact:

- Architecture work-unit fact `project_context_analysis` exists
- Architecture work-unit fact `architecture_decisions` has at least one item
- Architecture work-unit fact `implementation_patterns` exists
- Architecture work-unit fact `project_structure` exists
- Architecture work-unit fact `requirements_coverage` exists
- Architecture work-unit fact `validation_results` exists
- Architecture work-unit fact `architecture_synthesis` exists
- Architecture artifact slot `ARCHITECTURE_DOCUMENT` has an artifact instance or artifact reference
- Architecture work-unit fact `next_recommended_work_units` has at least one item

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `ARCHITECTURE_DOCUMENT` | Architecture Decision Document | `single` | yes | Canonical architecture document with decisions, implementation patterns, structure, validation, and handoff guidance. |
| `ARCHITECTURE_DECISION_RECORDS` | Architecture Decision Records | `many` | no | Optional individual ADR artifacts for important decisions, especially when a support workflow captures decisions separately. |

### Architecture artifact required section coverage
The `ARCHITECTURE_DOCUMENT` artifact should include:

- Project Context Analysis
- Starter Template Evaluation, if applicable
- Core Architectural Decisions
- Implementation Patterns & Consistency Rules
- Project Structure & Boundaries
- Architecture Validation Results
- Implementation Handoff

## Architecture Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `prd_work_unit` | `work_unit_reference` | `one` | yes | Source PRD reference. |
| `ux_design_work_unit` | `work_unit_reference` | `one` | no | Optional UX Design source reference. |
| `research_work_units` | `work_unit_reference` | `many` | no | Optional technical/domain research references. |
| `project_context_artifact` | `artifact_reference` | `one` | no | Optional project-context artifact used for existing technical preferences/rules. |
| `project_context_analysis` | `json` | `one` | yes | Architectural analysis of requirements, NFRs, UX implications, constraints, scale, and cross-cutting concerns. |
| `starter_template_decision` | `json` | `one` | no | Starter/template/tooling decision and verified initialization command, when applicable. |
| `architecture_decisions` | `json` | `many` | yes | Core architecture decisions with rationale, verified versions when applicable, and impacts. |
| `implementation_patterns` | `json` | `one` | yes | Naming, structure, format, communication, process, and enforcement patterns. |
| `project_structure` | `json` | `one` | yes | Concrete project tree, boundaries, mappings, integration points, and development workflow structure. |
| `technical_requirements` | `json` | `many` | no | Additional technical requirements extracted from architecture decisions for Backlog/Epics. |
| `requirements_coverage` | `json` | `one` | yes | Mapping of PRD/UX requirements to architectural support. |
| `validation_results` | `json` | `one` | yes | Coherence, coverage, implementation-readiness, and gap analysis results. |
| `architecture_synthesis` | `json` | `one` | yes | Machine-readable downstream summary and handoff guidance. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | yes | Next recommended work units, typically Backlog and/or Implementation Readiness. |

### `project_context_analysis` schema

```ts
{
  functionalRequirementSummary: string[];
  nonFunctionalRequirementDrivers: string[];
  uxImplications: string[];
  technicalConstraints: string[];
  dependencies: string[];
  crossCuttingConcerns: string[];
  scaleAssessment: "low" | "medium" | "high" | "enterprise";
  primaryTechnicalDomain: string;
}
```

### `starter_template_decision` schema

```ts
{
  applicable: boolean;
  primaryTechnologyDomain: string;
  selectedStarter?: string;
  initializationCommand?: string;
  verifiedAt?: string;
  optionsConsidered: Array<{
    name: string;
    maintenanceStatus?: string;
    decisionsProvided: string[];
    tradeoffs: string[];
  }>;
  rationale: string[];
  firstImplementationStoryImpact?: string;
}
```

### `architecture_decisions` item schema

```ts
{
  id: string; // ADR-like identifier, e.g. ARCH-DEC-1
  category:
    | "data_architecture"
    | "authentication_security"
    | "api_communication"
    | "frontend_architecture"
    | "infrastructure_deployment"
    | "observability"
    | "other";
  decision: string;
  selectedOption: string;
  alternativesConsidered: string[];
  rationale: string;
  verifiedVersion?: string;
  verifiedAt?: string;
  providedByStarter: boolean;
  affects: string[];
  priority: "critical" | "important" | "deferred";
}
```

### `implementation_patterns` schema

```ts
{
  namingPatterns: string[];
  structurePatterns: string[];
  formatPatterns: string[];
  communicationPatterns: string[];
  processPatterns: string[];
  enforcementGuidelines: string[];
  examples: Array<{
    pattern: string;
    goodExample: string;
    antiPattern: string;
  }>;
}
```

### `project_structure` schema

```ts
{
  projectTree: string;
  architecturalBoundaries: {
    api: string[];
    component: string[];
    service: string[];
    data: string[];
  };
  requirementMappings: Array<{
    sourceRequirementId: string;
    locations: string[];
  }>;
  integrationPoints: string[];
  fileOrganizationPatterns: string[];
  developmentWorkflowIntegration: string[];
}
```

### `technical_requirements` item schema

```ts
{
  id: string; // ARCH-REQ1, ARCH-REQ2, ...
  requirement: string;
  sourceDecisionId?: string;
  affectedAreas: string[];
  priority: "must" | "should" | "could";
}
```

### `requirements_coverage` schema

```ts
{
  functionalRequirementsCovered: string[];
  nonFunctionalRequirementsCovered: string[];
  uxRequirementsCovered: string[];
  uncoveredRequirements: Array<{
    requirementId: string;
    reason: string;
    resolutionNeeded: boolean;
  }>;
}
```

### `validation_results` schema

```ts
{
  coherenceStatus: "pass" | "pass_with_notes" | "fail";
  coverageStatus: "pass" | "pass_with_notes" | "fail";
  implementationReadinessStatus: "ready" | "ready_with_notes" | "not_ready";
  criticalGaps: string[];
  importantGaps: string[];
  minorGaps: string[];
  confidence: "low" | "medium" | "high";
}
```

### `architecture_synthesis` schema

```ts
{
  executiveSummary: string;
  technologyStack: string[];
  criticalDecisions: string[];
  implementationPatternSummary: string[];
  firstImplementationPriority?: string;
  downstreamTraceability: {
    backlogNeeds: string[];
    storyGuardrails: string[];
    readinessRisks: string[];
  };
}
```

## Workflow Context Fact Definitions

### Bound Architecture facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `project_context_analysis_ctx` | `bound_fact` | binds Architecture fact `project_context_analysis` | `one` | Context agent | Requirement/NFR/UX architectural analysis. |
| `starter_template_decision_ctx` | `bound_fact` | binds Architecture fact `starter_template_decision` | `one` | Starter/decisions agent | Starter choice and initialization command. |
| `architecture_decisions_ctx` | `bound_fact` | binds Architecture fact `architecture_decisions` | `many` | Starter/decisions agent | Core decisions. |
| `implementation_patterns_ctx` | `bound_fact` | binds Architecture fact `implementation_patterns` | `one` | Patterns/structure agent | AI-agent consistency patterns. |
| `project_structure_ctx` | `bound_fact` | binds Architecture fact `project_structure` | `one` | Patterns/structure agent | Concrete structure and boundaries. |
| `technical_requirements_ctx` | `bound_fact` | binds Architecture fact `technical_requirements` | `many` | Validation/completion agent | Extracted architecture requirements. |
| `requirements_coverage_ctx` | `bound_fact` | binds Architecture fact `requirements_coverage` | `one` | Validation/completion agent | Requirement coverage mapping. |
| `validation_results_ctx` | `bound_fact` | binds Architecture fact `validation_results` | `one` | Validation/completion agent | Validation status and gaps. |
| `architecture_synthesis_ctx` | `bound_fact` | binds Architecture fact `architecture_synthesis` | `one` | Validation/completion agent | Downstream summary. |
| `next_work_unit_refs` | `bound_fact` | binds Architecture fact `next_recommended_work_units` | `many` | Validation/completion agent | Next recommended units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `prd_work_unit_ref` | `work_unit_reference_fact` | PRD work unit | `one` | Invoke binding | Required PRD source. |
| `ux_design_work_unit_ref` | `work_unit_reference_fact` | UX Design work unit | `one` | Invoke binding | Optional UX source. |
| `research_work_unit_refs` | `work_unit_reference_fact` | Research work units | `many` | Invoke binding | Optional technical/domain research source. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | PRD / UX / Research / Project Context / docs | `many` | Invoke binding / initialization agent | Prior artifacts to load or summarize. |
| `architecture_document_artifact_ctx` | `artifact_slot_reference_fact` | `ARCHITECTURE_DOCUMENT` | `one` | Validation/completion agent | Staged architecture document. |
| `architecture_decision_record_artifact_refs` | `artifact_slot_reference_fact` | `ARCHITECTURE_DECISION_RECORDS` | `many` | Decisions agent / support workflow | Optional individual ADR artifacts. |

## Workflow Definition: `create_architecture`

| Property | Value |
|---|---|
| Workflow key | `create_architecture` |
| Family | `architecture` |
| Intent | `create_architecture_decision_document` |
| Bound transition | `activation_to_done` |
| Entry step | `architecture_input_initialization_agent` |

## Workflow Step Graph

### Step 1: `architecture_input_initialization_agent`
- Type: `agent`
- Purpose: BMAD Step 1: detect continuation, discover inputs, validate PRD requirement, initialize architecture context.
- Reads:
  - `prd_work_unit_ref`
  - `ux_design_work_unit_ref`
  - `research_work_unit_refs`
  - `input_artifact_refs`
- Writes:
  - source context used by later steps
- Objective:
  - Confirm PRD source exists; stop and recommend PRD if missing.
  - Discover UX Design, Research, Project Context, and project docs when available.
  - Prefer bound Chiron references over filesystem scanning when available.

### Step 2: `architecture_context_agent`
- Type: `agent`
- Purpose: BMAD Step 2: project context analysis.
- Reads:
  - source references and input artifacts
- Writes:
  - `project_context_analysis_ctx`
- Objective:
  - Extract FRs, NFRs, UX implications, constraints, dependencies, cross-cutting concerns, and scale indicators.
  - Validate architectural understanding with the user in guided mode.

### Step 3: `architecture_starter_and_decisions_agent`
- Type: `agent`
- Purpose: BMAD Steps 3-4: starter template evaluation and core architectural decisions.
- Reads:
  - `project_context_analysis_ctx`
  - source Project Context / technical preference artifacts
- Writes:
  - `starter_template_decision_ctx`, if applicable
  - `architecture_decisions_ctx`
  - `architecture_decision_record_artifact_refs`, if produced
- Objective:
  - Discover technical preferences and evaluate current maintained starter options when applicable.
  - Verify current technology versions and starter commands at execution time.
  - Facilitate decisions across data architecture, auth/security, API/communication, frontend, infrastructure/deployment, observability, and other necessary categories.
  - Record decisions with rationale, alternatives, impacts, and whether a starter already made the choice.

### Step 4: `architecture_patterns_structure_agent`
- Type: `agent`
- Purpose: BMAD Steps 5-6: implementation patterns and project structure/boundaries.
- Reads:
  - `project_context_analysis_ctx`
  - `starter_template_decision_ctx`
  - `architecture_decisions_ctx`
- Writes:
  - `implementation_patterns_ctx`
  - `project_structure_ctx`
- Objective:
  - Identify where AI agents could make conflicting implementation choices.
  - Define naming, structure, format, communication, and process patterns with examples and anti-patterns.
  - Create a complete project tree, integration boundaries, data/API/component boundaries, and requirement-to-structure mapping.

### Step 5: `architecture_validation_completion_agent`
- Type: `agent`
- Purpose: BMAD Steps 7-8: validate coherence/coverage/readiness, finalize handoff.
- Reads:
  - all prior Architecture context facts
  - source PRD / UX / Research references
- Writes:
  - `requirements_coverage_ctx`
  - `validation_results_ctx`
  - `technical_requirements_ctx`
  - `architecture_synthesis_ctx`
  - `architecture_document_artifact_ctx`
  - `next_work_unit_refs`
- Objective:
  - Validate decision compatibility, requirements coverage, and implementation readiness.
  - Identify and resolve critical gaps before completion.
  - Extract architecture requirements (`ARCH-REQ#`) for Backlog/Epics.
  - Produce final Architecture Decision Document artifact and recommend Backlog and/or Implementation Readiness next.

### Step 6: `propagate_architecture_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable Architecture facts and artifact slots.

#### Propagate to Architecture work-unit facts
- `prd_work_unit_ref` → Architecture fact `prd_work_unit`
- `ux_design_work_unit_ref`, if present → Architecture fact `ux_design_work_unit`
- `research_work_unit_refs`, if present → Architecture fact `research_work_units`
- project context artifact reference, if present → Architecture fact `project_context_artifact`
- `project_context_analysis_ctx` → Architecture fact `project_context_analysis`
- `starter_template_decision_ctx`, if present → Architecture fact `starter_template_decision`
- `architecture_decisions_ctx` → Architecture fact `architecture_decisions`
- `implementation_patterns_ctx` → Architecture fact `implementation_patterns`
- `project_structure_ctx` → Architecture fact `project_structure`
- `technical_requirements_ctx`, if present → Architecture fact `technical_requirements`
- `requirements_coverage_ctx` → Architecture fact `requirements_coverage`
- `validation_results_ctx` → Architecture fact `validation_results`
- `architecture_synthesis_ctx` → Architecture fact `architecture_synthesis`
- `next_work_unit_refs` → Architecture fact `next_recommended_work_units`

#### Propagate to Architecture artifact slots
- `architecture_document_artifact_ctx` → `ARCHITECTURE_DOCUMENT`
- `architecture_decision_record_artifact_refs`, if present → `ARCHITECTURE_DECISION_RECORDS`

## Support Workflow Definition: `record_architecture_decision`

| Property | Value |
|---|---|
| Workflow key | `record_architecture_decision` |
| Family | `architecture` |
| Intent | `capture_individual_architecture_decision_record` |
| Bound transition | none / support workflow |

### Support workflow purpose
This optional support workflow captures or refines an individual Architecture Decision Record when a single decision needs deeper tradeoff documentation outside the primary flow.

### Support workflow shape
- `form` or `agent`: capture decision category, context, options, decision, rationale, consequences.
- `action`: propagate the decision into `architecture_decisions` and optionally attach an `ARCHITECTURE_DECISION_RECORDS` artifact.

## Invoke and Downstream Design Notes

- PRD should invoke Architecture after PRD completion; UX Design should be included when it exists.
- Backlog/Epics must extract Architecture additional requirements and starter-template implications.
- If Architecture specifies a starter/template, Backlog/Epics should make Epic 1 / Story 1 account for project initialization.
- Implementation Readiness validates PRD, UX Design, Architecture, and Backlog alignment after Backlog/Epics exist.
- Course Correction may spawn a new Architecture work unit or support ADR workflow when execution reveals architecture-level change needs.

## Implementation Reference Files

- BMAD Architecture workflow: `_bmad/bmm/3-solutioning/bmad-create-architecture/workflow.md`
- BMAD Architecture template: `_bmad/bmm/3-solutioning/bmad-create-architecture/architecture-decision-template.md`
- BMAD Architecture steps: `_bmad/bmm/3-solutioning/bmad-create-architecture/steps/*.md`
- BMAD Backlog extraction of Architecture requirements: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/steps/step-01-validate-prerequisites.md`
- BMAD Implementation Readiness alignment: `_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/steps/*.md`
- Current seed reference for architecture decision records: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
