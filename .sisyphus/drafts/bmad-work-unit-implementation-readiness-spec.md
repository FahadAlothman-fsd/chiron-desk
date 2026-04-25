# BMAD Work Unit Seed Spec: Implementation Readiness

## Status
- Agreement state: **superseded for 12-hour MVP**
- Scope: historical draft for a standalone Implementation Readiness work unit
- Purpose: retained as source material only; MVP collapses Implementation Readiness into Backlog readiness workflows

## 12-Hour MVP Decision
- Implementation Readiness is **not** a standalone Chiron work unit in the MVP seed.
- Implementation Readiness is modeled as Backlog validation behavior:
  - Backlog transition: `draft_to_readiness_review`
  - Backlog workflow: `check_implementation_readiness`
  - Backlog transition on pass: `readiness_review_to_ready_for_sprint_planning`
  - Backlog transition on fail: `readiness_review_to_draft`
- Readiness outputs are durable Backlog facts/artifacts, not a separate Implementation Readiness work-unit instance.
- Backlog owns the readiness report artifact slot for MVP: `READINESS_REPORT`.
- This keeps Backlog as the most stateful seeded work unit and avoids unnecessary work-unit graph complexity.

## Supersession Note
- The standalone work-unit model below is deferred/future-only.
- Do not seed `implementation_readiness` as a work unit in the 12-hour MVP.
- Reuse the analysis dimensions, schemas, and agent steps below inside Backlog's `check_implementation_readiness` workflow.

## Ground Rules
- Implementation Readiness is a BMAD validation work unit, not a planning/authoring work unit.
- Implementation Readiness validates PRD, Architecture, Backlog/Epics/Stories, and optional UX Design alignment before implementation starts.
- It should be defined now, but in actual execution order it runs after Backlog/Epics exist.
- It is not itself a Backlog lifecycle state.
- Backlog invokes or links it through a normal Backlog transition (`draft_to_readiness_review`) that ends at `readiness_review`; Backlog later consumes the result through a separate Backlog transition.
- Future-only standalone model: if restored later, Implementation Readiness would be `many_per_project` and could run before initial implementation, after major course corrections, or before later implementation waves.
- The canonical output is an Implementation Readiness Assessment Report.
- The workflow is evidence-oriented and adversarial: it should find gaps, not rubber-stamp plans.
- UX Design is optional input, but if UI is implied and no UX Design exists, readiness must report a warning.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- 12-hour MVP routing: when readiness passes, the next implementation-planning behavior is Backlog's `accept_readiness_result` followed by `plan_active_working_set`; standalone Sprint Plan is superseded for MVP.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `implementation_readiness` |
| Display name | `Implementation Readiness` |
| Cardinality | `many_per_project` |
| Purpose | Validate that PRD, Architecture, Backlog/Epics/Stories, and optional UX Design are complete, aligned, and ready for implementation. |

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Readiness assessment is complete and has produced a clear readiness status, findings, and recommended remediation steps. |

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `check_implementation_readiness` |

### Start gate
Implementation Readiness can start when all required planning inputs exist:

- PRD work-unit reference or PRD artifact exists
- Architecture work-unit reference or Architecture artifact exists
- Backlog work-unit reference or Epics/Stories artifact exists

Optional but preferred:

- UX Design work-unit reference or UX Design artifact exists when UI/user interaction is implied

### Placement note
Although this spec is defined before the Backlog spec in this drafting sequence, execution should normally be:

`PRD + UX Design? + Architecture + Backlog/Epics → Implementation Readiness → Backlog active working-set planning → Story implementation`

## Completion gate
Implementation Readiness can complete only when the workflow has propagated the assessment facts and report:

- Implementation Readiness work-unit fact `document_inventory` exists
- Implementation Readiness work-unit fact `prd_analysis` exists
- Implementation Readiness work-unit fact `epic_coverage_validation` exists
- Implementation Readiness work-unit fact `ux_alignment_assessment` exists
- Implementation Readiness work-unit fact `epic_quality_review` exists
- Implementation Readiness work-unit fact `readiness_assessment` exists
- Implementation Readiness artifact slot `READINESS_REPORT` has an artifact instance or artifact reference
- Implementation Readiness work-unit fact `next_recommended_work_units` exists

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `READINESS_REPORT` | Implementation Readiness Report | `single` | yes | Canonical assessment report with document inventory, traceability checks, UX alignment, epic quality findings, readiness status, and recommendations. |

## Implementation Readiness Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `prd_work_unit` | `work_unit_reference` | `one` | yes | Source PRD reference. |
| `architecture_work_unit` | `work_unit_reference` | `one` | yes | Source Architecture reference. |
| `backlog_work_unit` | `work_unit_reference` | `one` | yes | Source Backlog/Epics/Stories reference. |
| `ux_design_work_unit` | `work_unit_reference` | `one` | no | Optional UX Design reference. |
| `document_inventory` | `json` | `one` | yes | Inventory of documents/artifacts used and duplicate/missing document findings. |
| `prd_analysis` | `json` | `one` | yes | Extracted PRD FRs/NFRs/additional requirements and completeness assessment. |
| `epic_coverage_validation` | `json` | `one` | yes | FR coverage matrix and missing requirement analysis against epics/stories. |
| `ux_alignment_assessment` | `json` | `one` | yes | UX document status plus UX ↔ PRD ↔ Architecture alignment findings. |
| `epic_quality_review` | `json` | `one` | yes | Epic/story quality findings against BMAD best practices. |
| `readiness_assessment` | `json` | `one` | yes | Overall readiness status, critical issues, recommendations, and final assessment. |
| `readiness_findings` | `json` | `many` | no | Individual findings by severity/category for downstream remediation. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | yes | Future-only standalone model: next recommended units. In the 12-hour MVP, Backlog owns readiness routing and active-working-set planning. |

### `document_inventory` schema

```ts
{
  documents: Array<{
    kind: "prd" | "architecture" | "backlog" | "ux_design" | "other";
    reference: string;
    format: "whole" | "sharded" | "artifact" | "work_unit";
    selectedForAssessment: boolean;
  }>;
  duplicates: Array<{
    kind: string;
    references: string[];
    resolution: string;
  }>;
  missingRequired: string[];
  warnings: string[];
}
```

### `prd_analysis` schema

```ts
{
  functionalRequirements: Array<{ id: string; text: string }>;
  nonFunctionalRequirements: Array<{ id: string; text: string }>;
  additionalRequirements: string[];
  completenessAssessment: string;
}
```

### `epic_coverage_validation` schema

```ts
{
  coverageMatrix: Array<{
    frId: string;
    prdRequirement: string;
    epicCoverage: string[];
    status: "covered" | "missing" | "partial" | "extra_in_epics";
  }>;
  totalFrs: number;
  coveredFrs: number;
  coveragePercentage: number;
  missingRequirements: Array<{
    frId: string;
    text: string;
    impact: string;
    recommendation: string;
  }>;
}
```

### `ux_alignment_assessment` schema

```ts
{
  uxDocumentStatus: "found" | "not_found" | "not_needed" | "missing_but_implied";
  uxPrdIssues: string[];
  uxArchitectureIssues: string[];
  warnings: string[];
}
```

### `epic_quality_review` schema

```ts
{
  epicFindings: Array<{
    epicId: string;
    userValueStatus: "pass" | "warn" | "fail";
    independenceStatus: "pass" | "warn" | "fail";
    notes: string[];
  }>;
  storyFindings: Array<{
    storyId: string;
    sizingStatus: "pass" | "warn" | "fail";
    dependencyStatus: "pass" | "warn" | "fail";
    acceptanceCriteriaStatus: "pass" | "warn" | "fail";
    notes: string[];
  }>;
  criticalViolations: string[];
  majorIssues: string[];
  minorConcerns: string[];
}
```

### `readiness_assessment` schema

```ts
{
  overallStatus: "ready" | "needs_work" | "not_ready";
  issueCounts: {
    critical: number;
    major: number;
    minor: number;
  };
  criticalIssues: string[];
  recommendedNextSteps: string[];
  finalNote: string;
}
```

### `readiness_findings` item schema

```ts
{
  id: string;
  category: "document_inventory" | "prd_analysis" | "coverage" | "ux_alignment" | "epic_quality" | "final_assessment";
  severity: "critical" | "major" | "minor" | "info";
  finding: string;
  evidence: string;
  recommendation: string;
  blocksImplementation: boolean;
}
```

## Workflow Context Fact Definitions

### Bound Implementation Readiness facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `document_inventory_ctx` | `bound_fact` | binds Readiness fact `document_inventory` | `one` | Document discovery agent | Selected source inventory and warnings. |
| `prd_analysis_ctx` | `bound_fact` | binds Readiness fact `prd_analysis` | `one` | PRD analysis agent | Extracted requirements. |
| `epic_coverage_validation_ctx` | `bound_fact` | binds Readiness fact `epic_coverage_validation` | `one` | Coverage/UX agent | Coverage matrix. |
| `ux_alignment_assessment_ctx` | `bound_fact` | binds Readiness fact `ux_alignment_assessment` | `one` | Coverage/UX agent | UX alignment assessment. |
| `epic_quality_review_ctx` | `bound_fact` | binds Readiness fact `epic_quality_review` | `one` | Epic quality agent | Epic/story quality review. |
| `readiness_assessment_ctx` | `bound_fact` | binds Readiness fact `readiness_assessment` | `one` | Final assessment agent | Overall status and recommendations. |
| `readiness_findings_ctx` | `bound_fact` | binds Readiness fact `readiness_findings` | `many` | All agents | Individual findings. |
| `next_work_unit_refs` | `bound_fact` | binds Readiness fact `next_recommended_work_units` | `many` | Final assessment agent | Next recommended units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `prd_work_unit_ref` | `work_unit_reference_fact` | PRD work unit | `one` | Invoke binding | Required PRD source. |
| `architecture_work_unit_ref` | `work_unit_reference_fact` | Architecture work unit | `one` | Invoke binding | Required Architecture source. |
| `backlog_work_unit_ref` | `work_unit_reference_fact` | Backlog work unit | `one` | Invoke binding | Required Backlog/Epics source. |
| `ux_design_work_unit_ref` | `work_unit_reference_fact` | UX Design work unit | `one` | Invoke binding | Optional UX Design source. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | PRD / Architecture / Backlog / UX artifacts | `many` | Invoke binding / discovery agent | Prior artifacts to inspect. |
| `readiness_report_artifact_ctx` | `artifact_slot_reference_fact` | `READINESS_REPORT` | `one` | Final assessment agent | Staged readiness report artifact. |

## Workflow Definition: `check_implementation_readiness`

| Property | Value |
|---|---|
| Workflow key | `check_implementation_readiness` |
| Family | `implementation_readiness` |
| Intent | `validate_planning_artifacts_before_implementation` |
| Bound transition | `activation_to_done` |
| Entry step | `readiness_document_discovery_agent` |

## Workflow Step Graph

### Step 1: `readiness_document_discovery_agent`
- Type: `agent`
- Purpose: BMAD Step 1: document discovery, duplicate detection, required source validation.
- Reads:
  - `prd_work_unit_ref`
  - `architecture_work_unit_ref`
  - `backlog_work_unit_ref`
  - `ux_design_work_unit_ref`
  - `input_artifact_refs`
- Writes:
  - `document_inventory_ctx`
  - initial `readiness_findings_ctx`
- Objective:
  - Confirm PRD, Architecture, and Backlog/Epics sources exist.
  - Detect duplicate whole/sharded artifacts when file-based artifacts exist.
  - Warn about missing optional UX Design when UI is implied.

### Step 2: `readiness_prd_analysis_agent`
- Type: `agent`
- Purpose: BMAD Step 2: PRD analysis.
- Reads:
  - `document_inventory_ctx`
  - PRD source reference/artifact
- Writes:
  - `prd_analysis_ctx`
  - `readiness_findings_ctx`
- Objective:
  - Extract all FRs, NFRs, additional requirements, assumptions, and constraints from PRD.
  - Preserve full requirement text for traceability checks.

### Step 3: `readiness_coverage_and_ux_agent`
- Type: `agent`
- Purpose: BMAD Steps 3-4: epic coverage validation and UX alignment.
- Reads:
  - `document_inventory_ctx`
  - `prd_analysis_ctx`
  - Backlog/Epics source reference/artifact
  - Architecture source reference/artifact
  - UX source reference/artifact, if present
- Writes:
  - `epic_coverage_validation_ctx`
  - `ux_alignment_assessment_ctx`
  - `readiness_findings_ctx`
- Objective:
  - Compare every PRD FR against Backlog/Epics coverage.
  - Identify FRs missing from epics and epics containing requirements not found in PRD.
  - Validate UX ↔ PRD and UX ↔ Architecture alignment when UX exists.
  - Warn if UX/UI is implied but UX Design is missing.

### Step 4: `readiness_epic_quality_agent`
- Type: `agent`
- Purpose: BMAD Step 5: epic and story quality review.
- Reads:
  - `document_inventory_ctx`
  - `epic_coverage_validation_ctx`
  - Backlog/Epics source reference/artifact
  - Architecture source reference/artifact
- Writes:
  - `epic_quality_review_ctx`
  - `readiness_findings_ctx`
- Objective:
  - Enforce BMAD epic/story standards rigorously.
  - Flag technical epics, non-user-value epics, forward dependencies, story sizing issues, weak acceptance criteria, and starter-template omissions.

### Step 5: `readiness_final_assessment_agent`
- Type: `agent`
- Purpose: BMAD Step 6: final readiness status and recommendations.
- Reads:
  - all prior readiness context facts
- Writes:
  - `readiness_assessment_ctx`
  - final `readiness_findings_ctx`
  - `readiness_report_artifact_ctx`
  - `next_work_unit_refs`
- Objective:
  - Determine overall status: ready, needs work, or not ready.
  - Produce actionable recommendations.
  - Recommend Backlog active working-set planning if ready; recommend Backlog/PRD/Architecture/UX/Course Correction remediation if not ready.
  - Produce final report artifact.

### Step 6: `propagate_readiness_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable Implementation Readiness facts and artifact slots.

#### Propagate to Implementation Readiness work-unit facts
- `prd_work_unit_ref` → Readiness fact `prd_work_unit`
- `architecture_work_unit_ref` → Readiness fact `architecture_work_unit`
- `backlog_work_unit_ref` → Readiness fact `backlog_work_unit`
- `ux_design_work_unit_ref`, if present → Readiness fact `ux_design_work_unit`
- `document_inventory_ctx` → Readiness fact `document_inventory`
- `prd_analysis_ctx` → Readiness fact `prd_analysis`
- `epic_coverage_validation_ctx` → Readiness fact `epic_coverage_validation`
- `ux_alignment_assessment_ctx` → Readiness fact `ux_alignment_assessment`
- `epic_quality_review_ctx` → Readiness fact `epic_quality_review`
- `readiness_assessment_ctx` → Readiness fact `readiness_assessment`
- `readiness_findings_ctx`, if present → Readiness fact `readiness_findings`
- `next_work_unit_refs` → Readiness fact `next_recommended_work_units`

#### Propagate to Implementation Readiness artifact slots
- `readiness_report_artifact_ctx` → `READINESS_REPORT`

## Invoke and Downstream Design Notes

- Backlog should invoke or recommend Implementation Readiness after Epics/Stories are complete.
- A single Backlog transition must not both invoke readiness and move to a readiness-dependent target. Transition target is fixed.
- Correct routing is two-step:
  1. Backlog `draft_to_readiness_review` invokes/links Implementation Readiness and lands in `readiness_review`.
  2. In the 12-hour MVP there is no standalone Implementation Readiness work-unit run; Backlog runs `check_implementation_readiness`, then `readiness_review_to_ready_for_sprint_planning` or `readiness_review_to_draft` depending on the recorded Backlog-owned readiness result.
- Implementation Readiness should not be invoked before Backlog/Epics exist except as a deliberate preflight that is expected to fail with missing Backlog.
- If `overallStatus = ready`, next recommendation is normally the source Backlog work unit's `accept_readiness_result` / `plan_active_working_set` path.
- If `overallStatus = needs_work` or `not_ready`, next recommended units should point to the specific artifact owner: PRD, UX Design, Architecture, Backlog, or Course Correction.
- Course Correction may invoke Implementation Readiness again after remediation.

## Implementation Reference Files

- BMAD Implementation Readiness workflow: `_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/workflow.md`
- BMAD Implementation Readiness template: `_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/templates/readiness-report-template.md`
- BMAD Implementation Readiness steps: `_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/steps/*.md`
- BMAD Backlog/Epics workflow source: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/**`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Agent runtime/MCP behavior: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`
