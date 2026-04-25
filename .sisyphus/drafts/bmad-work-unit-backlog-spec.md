# BMAD Work Unit Seed Spec: Backlog

## Status
- Agreement state: **draft with 12-hour MVP override**
- Scope: BMAD Method seeded methodology, Backlog work unit only
- Purpose: reference artifact for implementing canonical Backlog / Epics / Stories seed rows and downstream readiness bindings

## 12-Hour MVP Override
- This section supersedes graph-native Epic/Story materialization notes in this draft.
- Backlog is the combined immediate MVP work unit for both BMAD Create Epics and Stories and BMAD Sprint Planning.
- Epic remains structured Backlog data (`epic_design`, `requirements_coverage_map`, `story_inventory`), not a separate work unit.
- Sprint Plan is not a separate work unit in the MVP; sprint-planning and sprint-status behavior are workflows on Backlog.
- Story work units are created only when selected from Backlog's active working set.
- Backlog is expected to have the most transitions/states in the seeded MVP methodology because it owns:
  - backlog inventory drafting
  - readiness gating
  - sprint / active working-set selection
  - selected Story work-unit creation
  - sprint status tracking
  - refinement after readiness or implementation feedback
- Backlog owns:
  - `EPICS_AND_STORIES`
  - `READINESS_REPORT`
  - `SPRINT_STATUS`
  - requirements inventory
  - epic design
  - story inventory
  - story dependency graph as JSON
  - active working-set selection
  - selected Story work-unit references
- Deferred future enhancement: materialize Epic and all Story instances as work-unit graph nodes after platform support exists for living-instance draft specs, state-aware transition selection, and dereferenced work-unit-reference fact reads.

## Ground Rules
- Backlog is the Chiron work unit that represents BMAD's **Create Epics and Stories** output.
- The BMAD workflow name is `create_epics_and_stories`; the durable work-unit entity is `Backlog`.
- Preserve BMAD semantics first: transform PRD requirements and Architecture decisions into user-value epics and actionable stories with complete acceptance criteria.
- Backlog defines the complete implementation story inventory and, in the 12-hour MVP, also selects/sequences the next implementable active working set.
- Backlog runs after PRD and Architecture exist. UX Design is optional, but when present its UX Design Requirements are first-class inputs.
- BMAD's four source step files should be preserved as four Chiron agent-heavy steps, not exploded into every micro-instruction/menu.
- BMAD's interactive confirmation points are modeled as agent collaboration/checkpoints inside the relevant agent steps, not as `display` steps.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `backlog` |
| Display name | `Backlog` |
| Cardinality | `many_per_project` |
| Purpose | Create the complete BMAD epic and story breakdown for a selected PRD + Architecture baseline, including requirement inventory, FR coverage map, user-value epics, sequential stories, and final validation. |

### Cardinality rationale
- One project may have multiple PRDs, corrected planning baselines, or major roadmap slices.
- Each Backlog instance binds to one source PRD and one source Architecture baseline.
- Course Correction may create a revised Backlog instead of mutating the original without trace.
- Normal sprint/working-set iteration does **not** create a new Backlog; the same Backlog repeatedly selects dependency-safe active working sets until the scope is complete.

## Lifecycle States

### State: `draft`

| Property | Value |
|---|---|
| Key | `draft` |
| Display name | `Draft` |
| Meaning | Requirements inventory, epic design, story inventory, and backlog validation have been created, but Implementation Readiness has not passed yet. |

### State: `readiness_review`

| Property | Value |
|---|---|
| Key | `readiness_review` |
| Display name | `Readiness Review` |
| Meaning | Backlog has invoked or linked Implementation Readiness and is awaiting readiness result / remediation routing. |

### State: `ready_for_sprint_planning`

| Property | Value |
|---|---|
| Key | `ready_for_sprint_planning` |
| Display name | `Ready for Sprint Planning` |
| Meaning | Implementation Readiness passed and Backlog may select an active working set. |

### State: `sprint_planned`

| Property | Value |
|---|---|
| Key | `sprint_planned` |
| Display name | `Sprint Planned` |
| Meaning | Active working set has been selected and `SPRINT_STATUS` has been initialized. |

### State: `in_progress`

| Property | Value |
|---|---|
| Key | `in_progress` |
| Display name | `In Progress` |
| Meaning | At least one selected Story work unit has been invoked and implementation work is underway. |

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Entire selected Backlog scope is complete or intentionally closed; no more active working sets remain for this planning baseline. |

## Lifecycle Transitions

### Transition: `activation_to_draft`

| Property | Value |
|---|---|
| Key | `activation_to_draft` |
| From state | `null` / activation |
| To state | `draft` |
| Bound primary workflow | `create_epics_and_stories` |

### Transition: `draft_to_readiness_review`

| Property | Value |
|---|---|
| Key | `draft_to_readiness_review` |
| From state | `draft` |
| To state | `readiness_review` |
| Bound primary workflow | `check_implementation_readiness` |

### Transition: `readiness_review_to_ready_for_sprint_planning`

| Property | Value |
|---|---|
| Key | `readiness_review_to_ready_for_sprint_planning` |
| From state | `readiness_review` |
| To state | `ready_for_sprint_planning` |
| Bound primary workflow | `accept_readiness_result` |

### Transition: `draft_to_draft`

| Property | Value |
|---|---|
| Key | `draft_to_draft` |
| From state | `draft` |
| To state | `draft` |
| Bound primary workflow | `refine_backlog` |

### Transition: `readiness_review_to_draft`

| Property | Value |
|---|---|
| Key | `readiness_review_to_draft` |
| From state | `readiness_review` |
| To state | `draft` |
| Bound primary workflow | `return_to_draft_after_readiness` |

### Transition: `ready_for_sprint_planning_to_sprint_planned`

| Property | Value |
|---|---|
| Key | `ready_for_sprint_planning_to_sprint_planned` |
| From state | `ready_for_sprint_planning` |
| To state | `sprint_planned` |
| Bound primary workflow | `plan_active_working_set` |

### Transition: `sprint_planned_to_in_progress`

| Property | Value |
|---|---|
| Key | `sprint_planned_to_in_progress` |
| From state | `sprint_planned` |
| To state | `in_progress` |
| Bound primary workflow | `start_selected_stories` |

### Transition: `in_progress_to_in_progress`

| Property | Value |
|---|---|
| Key | `in_progress_to_in_progress` |
| From state | `in_progress` |
| To state | `in_progress` |
| Bound primary workflow | `update_sprint_status` |

### Transition: `in_progress_to_done`

| Property | Value |
|---|---|
| Key | `in_progress_to_done` |
| From state | `in_progress` |
| To state | `done` |
| Bound primary workflow | `complete_backlog_scope` |

### Transition: `in_progress_to_ready_for_sprint_planning`

| Property | Value |
|---|---|
| Key | `in_progress_to_ready_for_sprint_planning` |
| From state | `in_progress` |
| To state | `ready_for_sprint_planning` |
| Bound primary workflow | `close_working_set_and_select_next` |

### Transition: `done_to_done`

| Property | Value |
|---|---|
| Key | `done_to_done` |
| From state | `done` |
| To state | `done` |
| Bound primary workflow | `record_retrospective_or_course_correction` |

### Start gate
Backlog can start when these source inputs exist:

- PRD work-unit reference or PRD artifact exists
- Architecture work-unit reference or Architecture artifact exists

Optional but consumed when available:

- UX Design work-unit reference or UX Design artifact
- Research work-unit reference / research report
- Product Brief work-unit reference / product brief
- Project Context artifact from Setup

### Draft completion gate
Backlog can enter `draft` only when `create_epics_and_stories` has propagated:

- Backlog work-unit fact `prd_work_unit`
- Backlog work-unit fact `architecture_work_unit`
- Backlog work-unit fact `input_documents`
- Backlog work-unit fact `requirements_inventory`
- Backlog work-unit fact `requirements_coverage_map`
- Backlog work-unit fact `epic_design`
- Backlog work-unit fact `story_inventory`
- Backlog work-unit fact `story_dependency_graph`
- Backlog work-unit fact `backlog_validation`
- Backlog artifact slot `EPICS_AND_STORIES` has an artifact instance or artifact reference
- Backlog work-unit fact `next_recommended_work_units` includes an Implementation Readiness recommendation

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `EPICS_AND_STORIES` | Epics and Stories Breakdown | `single` | yes | Canonical BMAD epic breakdown artifact equivalent to `{planning_artifacts}/epics.md`, including requirements inventory, coverage map, epic list, stories, acceptance criteria, and validation status. |
| `READINESS_REPORT` | Implementation Readiness Report | `single` | no | Backlog-owned MVP readiness assessment report generated by `check_implementation_readiness`; required before moving from `readiness_review` to `ready_for_sprint_planning`. |
| `SPRINT_STATUS` | Sprint Status | `single` | no | Backlog-owned active working-set status artifact initialized by `plan_active_working_set`. |

## Backlog Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `prd_work_unit` | `work_unit_reference` | `one` | yes | Source PRD baseline for requirement extraction. |
| `architecture_work_unit` | `work_unit_reference` | `one` | yes | Source Architecture baseline for technical decisions, starter-template requirements, data/API constraints, and implementation requirements. |
| `ux_design_work_unit` | `work_unit_reference` | `one` | no | Optional UX Design source. Required only when the project includes UI/interaction design and UX Design exists. |
| `research_work_units` | `work_unit_reference` | `many` | no | Optional supporting Research sources used for product/domain/technical context. |
| `product_brief_work_unit` | `work_unit_reference` | `one` | no | Optional Product Brief source for product vision context. |
| `input_documents` | `json` | `one` | yes | Selected document/artifact inventory, exclusions, and whole-vs-sharded resolution. |
| `requirements_inventory` | `json` | `one` | yes | Extracted FRs, NFRs, Architecture-derived requirements, UX-DRs, and supporting context requirements. |
| `requirements_coverage_map` | `json` | `one` | yes | Requirement-to-epic/story coverage matrix. |
| `epic_design` | `json` | `one` | yes | Approved user-value epic list, goals, covered requirements, dependency notes, and implementation considerations. |
| `epic_work_units` | `work_unit_reference` | `many` | no | Deferred future graph-native Epic work-unit instances. Not required in 12-hour MVP. |
| `story_inventory` | `json` | `one` | yes | Complete story inventory grouped by epic, including user story text, acceptance criteria, requirement references, sequencing, and dependency constraints. |
| `story_work_units` | `work_unit_reference` | `many` | no | Selected Story work-unit instances only; not the complete story inventory. |
| `story_dependency_graph` | `json` | `one` | yes | Work-unit-reference-backed dependency graph among materialized Story instances and Epic grouping. |
| `backlog_validation` | `json` | `one` | yes | Final validation results for coverage, architecture compliance, story quality, epic structure, and dependencies. |
| `backlog_findings` | `json` | `many` | no | Individual issues discovered while creating or validating epics/stories. |
| `implementation_readiness_result` | `json` | `one` | no | Backlog-owned readiness gate status used to unlock or block active working-set planning. |
| `active_working_set` | `json` | `one` | no | Selected stories for the immediate sprint/implementation slice, with rationale and dependency checks. Required for `sprint_planned`. |
| `sprint_status` | `json` | `one` | no | MVP sprint/status tracking object for selected stories and current progress. Required for `sprint_planned`, `in_progress`, and `done`. |
| `working_set_completion_status` | `json` | `one` | no | Guard/status fact written by `update_sprint_status`; determines whether `close_working_set_and_select_next` or `complete_backlog_scope` is available. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | yes | Downstream recommendations, normally Backlog readiness/active-working-set continuation, Story refs, Retrospective, or Course Correction. |

### `working_set_completion_status` schema

```ts
{
  activeWorkingSetComplete: boolean;
  activeWorkingSetStoryKeys: string[];
  completedActiveStoryKeys: string[];
  incompleteActiveStoryKeys: string[];
  remainingUnselectedStoryKeys: string[];
  intentionallyClosedStoryKeys: string[];
  backlogScopeComplete: boolean;
  allowedNextTransition:
    | "in_progress_to_in_progress"
    | "in_progress_to_ready_for_sprint_planning"
    | "in_progress_to_done";
  reason: string;
}
```

### Working-set transition guard rules
- `update_sprint_status` is the only workflow that computes `working_set_completion_status`.
- `close_working_set_and_select_next` is available only when:
  - `activeWorkingSetComplete = true`
  - `backlogScopeComplete = false`
  - `remainingUnselectedStoryKeys.length > 0`
- `complete_backlog_scope` is available only when:
  - `activeWorkingSetComplete = true`
  - `backlogScopeComplete = true`
  - `remainingUnselectedStoryKeys.length = 0`
- If `activeWorkingSetComplete = false`, only `update_sprint_status` remains available from `in_progress`.
- No workflow may dynamically choose a different target state mid-transition; guards only control which fixed transitions the user/guidance can run next.

### `input_documents` schema

```ts
{
  documents: Array<{
    kind: "prd" | "architecture" | "ux_design" | "research" | "product_brief" | "project_context" | "other";
    reference: string;
    sourceWorkUnitKey?: string;
    artifactSlotKey?: string;
    format: "artifact" | "work_unit" | "whole_document" | "sharded_document" | "external_reference";
    selectedForExtraction: boolean;
    exclusionReason?: string;
  }>;
  requiredDocumentsFound: {
    prd: boolean;
    architecture: boolean;
  };
  optionalDocumentsFound: {
    uxDesign: boolean;
    research: boolean;
    productBrief: boolean;
    projectContext: boolean;
  };
  warnings: string[];
}
```

### `requirements_inventory` schema

```ts
{
  functionalRequirements: Array<{
    id: string; // FR1, FR2, ...
    text: string;
    sourceReference: string;
  }>;
  nonFunctionalRequirements: Array<{
    id: string; // NFR1, NFR2, ...
    text: string;
    category: "performance" | "security" | "usability" | "reliability" | "compliance" | "operability" | "other";
    sourceReference: string;
  }>;
  architectureRequirements: Array<{
    id: string; // ARCH-REQ1, ARCH-REQ2, ...
    text: string;
    category: "starter_template" | "infrastructure" | "integration" | "data" | "api" | "security" | "monitoring" | "deployment" | "other";
    sourceReference: string;
    impactsEpicOneStoryOne: boolean;
  }>;
  uxDesignRequirements: Array<{
    id: string; // UX-DR1, UX-DR2, ...
    text: string;
    category: "design_tokens" | "component" | "visual_standardization" | "accessibility" | "responsive" | "interaction" | "compatibility" | "other";
    sourceReference: string;
  }>;
  additionalContextRequirements: Array<{
    id: string;
    text: string;
    sourceKind: "research" | "product_brief" | "project_context" | "other";
    sourceReference: string;
  }>;
}
```

### `requirements_coverage_map` schema

```ts
{
  requirementCoverage: Array<{
    requirementId: string;
    requirementKind: "fr" | "nfr" | "architecture" | "ux_design" | "additional_context";
    epicIds: string[];
    storyIds: string[];
    status: "covered" | "partially_covered" | "uncovered" | "deferred_with_reason";
    notes: string;
  }>;
  coverageSummary: {
    totalRequirements: number;
    coveredRequirements: number;
    partiallyCoveredRequirements: number;
    uncoveredRequirements: number;
    deferredRequirements: number;
  };
}
```

### `epic_design` schema

```ts
{
  epics: Array<{
    id: string; // EPIC-1, EPIC-2, ...
    number: number;
    title: string;
    goal: string;
    userOutcome: string;
    requirementsCovered: string[];
    implementationNotes: string[];
    dependencyNotes: string[];
    standaloneValueStatement: string;
    isUserValueEpic: boolean;
  }>;
  rejectedTechnicalLayerEpics: Array<{
    proposedTitle: string;
    rejectionReason: string;
    remappedIntoEpicIds: string[];
  }>;
  userApproval: {
    approved: boolean;
    approvalSummary: string;
  };
}
```

### `story_inventory` schema

```ts
{
  stories: Array<{
    id: string; // STORY-1.1, STORY-1.2, ...
    epicId: string;
    number: string; // "1.1"
    title: string;
    asA: string;
    iWant: string;
    soThat: string;
    acceptanceCriteria: Array<{
      id: string;
      given: string;
      when: string;
      then: string;
      and?: string[];
    }>;
    requirementsImplemented: string[];
    technicalNotes: string[];
    uxNotes: string[];
    dependsOnStoryIds: string[];
    blocksStoryIds: string[];
    singleAgentCompletable: boolean;
    forwardDependencyFree: boolean;
  }>;
  epicStoryCounts: Array<{
    epicId: string;
    storyCount: number;
  }>;
}
```

### `story_dependency_graph` schema

```ts
{
  storyNodes: Array<{
    storyKey: string;
    storyWorkUnitRef: string;
    epicKey: string;
    epicWorkUnitRef?: string;
    dependsOnStoryRefs: string[];
    blocksStoryRefs: string[];
  }>;
  epicNodes: Array<{
    epicKey: string;
    epicWorkUnitRef?: string;
    dependsOnEpicRefs: string[];
    blocksEpicRefs: string[];
  }>;
}
```

### `backlog_validation` schema

```ts
{
  frCoverageValidation: {
    allFrsCovered: boolean;
    uncoveredFrIds: string[];
    partialFrIds: string[];
  };
  architectureImplementationValidation: {
    starterTemplateSpecified: boolean;
    epicOneStoryOneHandlesStarterTemplate: boolean | null;
    databaseEntityCreationIsJustInTime: boolean;
    violations: string[];
  };
  uxDesignValidation: {
    uxDesignPresent: boolean;
    allUxDrsCovered: boolean | null;
    uncoveredUxDrIds: string[];
  };
  storyQualityValidation: {
    allStoriesSingleAgentCompletable: boolean;
    allStoriesHaveAcceptanceCriteria: boolean;
    allStoriesReferenceRequirements: boolean;
    storiesWithIssues: Array<{ storyId: string; issues: string[] }>;
  };
  epicStructureValidation: {
    allEpicsUserValueFocused: boolean;
    noTechnicalLayerEpics: boolean;
    dependenciesFlowNaturally: boolean;
    violations: string[];
  };
  dependencyValidation: {
    noForwardStoryDependencies: boolean;
    noForwardEpicDependencies: boolean;
    violations: string[];
  };
  finalStatus: "ready_for_implementation_readiness" | "needs_revision" | "blocked";
}
```

### `backlog_findings` item schema

```ts
{
  id: string;
  category: "document_inventory" | "requirement_extraction" | "epic_design" | "story_generation" | "coverage" | "architecture_alignment" | "ux_alignment" | "dependency" | "quality";
  severity: "critical" | "major" | "minor" | "info";
  finding: string;
  evidence: string;
  recommendation: string;
  blocksBacklogCompletion: boolean;
}
```

## Workflow Context Fact Definitions

### Bound Backlog facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `input_documents_ctx` | `bound_fact` | binds Backlog fact `input_documents` | `one` | Requirements extraction agent | Selected source inventory and exclusions. |
| `requirements_inventory_ctx` | `bound_fact` | binds Backlog fact `requirements_inventory` | `one` | Requirements extraction agent | Extracted FR/NFR/Architecture/UX/additional requirements. |
| `requirements_coverage_map_ctx` | `bound_fact` | binds Backlog fact `requirements_coverage_map` | `one` | Epic design + story generation + validation agents | Requirement coverage mapping. |
| `epic_design_ctx` | `bound_fact` | binds Backlog fact `epic_design` | `one` | Epic design agent | Approved epic list. |
| `story_inventory_ctx` | `bound_fact` | binds Backlog fact `story_inventory` | `one` | Story generation agent | Complete story inventory. |
| `epic_work_unit_refs` | `bound_fact` | binds Backlog fact `epic_work_units` | `many` | Deferred graph-native Epic materialization | Deferred future Epic work-unit refs; not written in MVP. |
| `story_work_unit_refs` | `bound_fact` | binds Backlog fact `story_work_units` | `many` | Selected Story invoke | Selected Story work-unit refs only; not complete inventory. |
| `story_dependency_graph_ctx` | `bound_fact` | binds Backlog fact `story_dependency_graph` | `one` | Story generation / sprint planning agents | Story dependency graph by story key, with selected Story refs added when available. |
| `backlog_validation_ctx` | `bound_fact` | binds Backlog fact `backlog_validation` | `one` | Final validation agent | Final validation status. |
| `backlog_findings_ctx` | `bound_fact` | binds Backlog fact `backlog_findings` | `many` | All agents | Individual findings. |
| `implementation_readiness_result_ctx` | `bound_fact` | binds Backlog fact `implementation_readiness_result` | `one` | Readiness result workflow | Readiness status and remediation notes. |
| `active_working_set_ctx` | `bound_fact` | binds Backlog fact `active_working_set` | `one` | Sprint planning workflow | Selected implementation working set. |
| `sprint_status_ctx` | `bound_fact` | binds Backlog fact `sprint_status` | `one` | Sprint planning/status workflows | Current sprint/status tracking data. |
| `working_set_completion_status_ctx` | `bound_fact` | binds Backlog fact `working_set_completion_status` | `one` | Sprint status workflow | Guard/status data controlling next available Backlog transition. |
| `next_work_unit_refs` | `bound_fact` | binds Backlog fact `next_recommended_work_units` | `many` | Downstream invoke / finalization | Recommended downstream work units. |

### Workflow-local selected Story draft specs

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `selected_story_draft_specs_ctx` | `work_unit_draft_spec_fact` | Story work unit draft specs | `many` | `start_selected_stories` draft-spec preparation step | One draft spec per selected active-working-set story key, created inside the same workflow that invokes Story activation transition `activation_to_ready_for_dev` / `create_story`. |

### Invoke constraint note
- Backlog must not invoke arbitrary non-activation Story transitions.
- Story work units are created only through activation:
  - Story transition: `activation_to_ready_for_dev`
  - Story workflow: `create_story`
- `plan_active_working_set` persists durable `active_working_set` and `sprint_status` only.
- `start_selected_stories` first prepares workflow-local selected Story draft specs from durable `active_working_set`, then invokes those draft specs in the same workflow.
- Subsequent Story transitions (`ready_for_dev_to_in_progress`, `in_progress_to_review`, review transitions) are run on the Story work units themselves, not invoked by Backlog.

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `prd_work_unit_ref` | `work_unit_reference_fact` | PRD work unit | `one` | Invoke binding / user selection | Required PRD source. |
| `architecture_work_unit_ref` | `work_unit_reference_fact` | Architecture work unit | `one` | Invoke binding / user selection | Required Architecture source. |
| `ux_design_work_unit_ref` | `work_unit_reference_fact` | UX Design work unit | `one` | Invoke binding / user selection | Optional UX Design source. |
| `research_work_unit_refs` | `work_unit_reference_fact` | Research work units | `many` | Invoke binding / discovery | Optional Research sources. |
| `product_brief_work_unit_ref` | `work_unit_reference_fact` | Product Brief work unit | `one` | Invoke binding / discovery | Optional Product Brief source. |
| `input_artifact_refs` | `artifact_slot_reference_fact` | PRD / Architecture / UX / Research / Product Brief / Project Context artifacts | `many` | Invoke binding / discovery agent | Source artifacts to inspect. |
| `epics_and_stories_artifact_ctx` | `artifact_slot_reference_fact` | `EPICS_AND_STORIES` | `one` | Story generation / final validation agent | Staged canonical backlog artifact. |
| `readiness_report_artifact_ctx` | `artifact_slot_reference_fact` | `READINESS_REPORT` | `one` | Readiness workflow | Backlog-owned readiness report artifact. |

### Workflow-local collaboration facts

These are context-only facts, not durable Backlog facts.

| Fact key | Context fact kind | Value type | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `document_exclusion_notes_ctx` | `plain_value_fact` | `string` | `many` | Requirements extraction agent | User-requested document exclusions or caveats during source confirmation. |
| `epic_review_notes_ctx` | `plain_value_fact` | `string` | `many` | Epic design agent | User review feedback while refining epic grouping. |
| `story_review_notes_ctx` | `plain_value_fact` | `string` | `many` | Story generation agent | User review feedback while refining stories and acceptance criteria. |

## Workflow Definition: `create_epics_and_stories`

| Property | Value |
|---|---|
| Workflow key | `create_epics_and_stories` |
| Family | `backlog` |
| Intent | `turn_planning_baseline_into_validated_epics_and_stories` |
| Bound transition | `activation_to_done` |
| Entry step | `backlog_requirements_extraction_agent` |

## Workflow Step Graph

### Step 1: `backlog_requirements_extraction_agent`
- Type: `agent`
- Purpose: BMAD Step 1: validate prerequisites and extract requirements.
- Reads:
  - `prd_work_unit_ref`
  - `architecture_work_unit_ref`
  - `ux_design_work_unit_ref`, if present
  - `research_work_unit_refs`, if present
  - `product_brief_work_unit_ref`, if present
  - `input_artifact_refs`
- Writes:
  - `input_documents_ctx`
  - `requirements_inventory_ctx`
  - initial `backlog_findings_ctx`
  - `document_exclusion_notes_ctx`, if the user excludes or adds sources during collaboration
- Objective:
  - Confirm PRD and Architecture sources exist and are complete enough for backlog creation.
  - Resolve whole-vs-sharded or artifact-vs-work-unit sources without adding language/default facts.
  - Ask the user only for source inclusion/exclusion decisions that cannot be inferred from existing source bindings.
  - Extract all PRD FRs and NFRs.
  - Extract Architecture requirements that affect implementation, especially starter-template, infrastructure, integration, data, monitoring, API, security, and deployment requirements.
  - Extract UX Design Requirements (`UX-DR#`) with the same rigor as FRs when UX Design exists.
  - Initialize the conceptual contents of `EPICS_AND_STORIES` with the requirements inventory but do not design epics or stories yet.

### Step 2: `backlog_epic_design_agent`
- Type: `agent`
- Purpose: BMAD Step 2: design and get approval for a user-value epic list.
- Reads:
  - `requirements_inventory_ctx`
  - `input_documents_ctx`
- Writes:
  - `epic_design_ctx`
  - initial / updated `requirements_coverage_map_ctx`
  - `epic_review_notes_ctx`
  - `backlog_findings_ctx`
- Objective:
  - Group requirements into epics organized by user value, not technical layers.
  - Reject or remap proposed technical-layer epics such as "database setup", "API development", or "frontend components" unless they are embedded inside user-value delivery.
  - Ensure each epic delivers standalone value and enables later epics without requiring later epics to function.
  - Map every FR to an epic.
  - Capture explicit user approval of the epic list inside `epic_design_ctx.userApproval` before story generation proceeds.
  - Advanced elicitation / party-mode BMAD options are not separate Chiron step types initially; the agent may perform deeper elicitation inside the same agent step if user asks.

### Step 3: `backlog_story_generation_agent`
- Type: `agent`
- Purpose: BMAD Step 3: generate epics and stories from the approved epic list.
- Reads:
  - `requirements_inventory_ctx`
  - `epic_design_ctx`
  - `requirements_coverage_map_ctx`
  - source PRD / Architecture / UX / Research / Product Brief artifacts as needed
- Writes:
  - `story_inventory_ctx`
  - updated `requirements_coverage_map_ctx`
  - draft `epics_and_stories_artifact_ctx`
  - `story_review_notes_ctx`
  - `backlog_findings_ctx`
- Objective:
  - Process epics in order.
  - Create stories sized for a single dev agent.
  - Use the BMAD story shape: `As a`, `I want`, `So that`, plus Given/When/Then acceptance criteria.
  - Ensure each story references the requirements it implements.
  - Ensure stories do not depend on future stories in the same epic.
  - Create database/entities only when needed by the story; avoid up-front all-schema work.
  - Cover UX-DRs either in relevant feature stories or a user-value design-system / UX-polish epic when needed.
  - Stage the canonical `EPICS_AND_STORIES` artifact content.

### Step 4: `backlog_final_validation_agent`
- Type: `agent`
- Purpose: BMAD Step 4: final validation before implementation readiness.
- Reads:
  - `input_documents_ctx`
  - `requirements_inventory_ctx`
  - `requirements_coverage_map_ctx`
  - `epic_design_ctx`
  - `story_inventory_ctx`
  - `epics_and_stories_artifact_ctx`
- Writes:
  - `backlog_validation_ctx`
  - final `requirements_coverage_map_ctx`
  - final `epics_and_stories_artifact_ctx`
  - `backlog_findings_ctx`
- Objective:
  - Verify every FR is covered by at least one story and that acceptance criteria address the FR.
  - If Architecture specifies a starter template, verify Epic 1 Story 1 handles initial project setup from that starter template.
  - Verify database/entity creation is just-in-time, not a large up-front technical milestone.
  - Verify all stories are single-agent completable, have acceptance criteria, reference specific requirements, and have no forward dependencies.
  - Verify epics are user-value focused and not technical layers.
  - Verify UX-DR coverage when UX Design exists.
  - Set final status to `ready_for_implementation_readiness`, `needs_revision`, or `blocked`.

### Step 5: `backlog_dependency_graph_agent`
- Type: `agent`
- Purpose: derive the story dependency graph by story key without materializing all Story work units.
- Reads:
  - `story_inventory_ctx`
  - `epic_design_ctx`
  - `requirements_coverage_map_ctx`
- Writes:
  - `story_dependency_graph_ctx`
  - `backlog_findings_ctx`, if dependency issues are found
- Objective:
  - Represent story ordering and dependency constraints using story keys (`STORY-1.1`, etc.).
  - Keep Epic as structured Backlog data, not a work unit.
  - Keep Story work-unit creation deferred until active working-set selection.
  - Verify no selected or future story requires a forward dependency.

### Step 6: `propagate_backlog_draft_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized draft backlog outputs into durable Backlog facts and artifact slots.

#### Propagate to Backlog work-unit facts
- `prd_work_unit_ref` → Backlog fact `prd_work_unit`
- `architecture_work_unit_ref` → Backlog fact `architecture_work_unit`
- `ux_design_work_unit_ref`, if present → Backlog fact `ux_design_work_unit`
- `research_work_unit_refs`, if present → Backlog fact `research_work_units`
- `product_brief_work_unit_ref`, if present → Backlog fact `product_brief_work_unit`
- `input_documents_ctx` → Backlog fact `input_documents`
- `requirements_inventory_ctx` → Backlog fact `requirements_inventory`
- `requirements_coverage_map_ctx` → Backlog fact `requirements_coverage_map`
- `epic_design_ctx` → Backlog fact `epic_design`
- `story_inventory_ctx` → Backlog fact `story_inventory`
- `story_dependency_graph_ctx` → Backlog fact `story_dependency_graph`
- `backlog_validation_ctx` → Backlog fact `backlog_validation`
- `backlog_findings_ctx`, if present → Backlog fact `backlog_findings`

#### Propagate to Backlog artifact slots
- `epics_and_stories_artifact_ctx` → `EPICS_AND_STORIES`

## Workflow Definition: `check_implementation_readiness`

| Property | Value |
|---|---|
| Workflow key | `check_implementation_readiness` |
| Family | `backlog` |
| Intent | `validate_backlog_before_active_working_set_planning` |
| Bound transition | `draft_to_readiness_review` |
| Entry step | `readiness_document_discovery_agent` |

### Step 1: `readiness_document_discovery_agent`
- Type: `agent`
- Purpose: discover and validate PRD, UX, Architecture, and Backlog sources before readiness assessment.
- Reads:
  - `prd_work_unit_ref`
  - `architecture_work_unit_ref`
  - `ux_design_work_unit_ref`, if present
  - current Backlog facts and `EPICS_AND_STORIES`
- Writes:
  - `document_inventory_ctx`
  - `backlog_findings_ctx`, if missing/duplicate source issues are found

### Step 2: `readiness_prd_analysis_agent`
- Type: `agent`
- Purpose: analyze PRD completeness and extract requirement baseline for readiness validation.
- Reads:
  - `document_inventory_ctx`
  - PRD source facts/artifact
- Writes:
  - `prd_analysis_ctx`
  - `backlog_findings_ctx`

### Step 3: `readiness_coverage_and_ux_agent`
- Type: `agent`
- Purpose: validate PRD/UX/Architecture coverage against Backlog epics and stories.
- Reads:
  - `prd_analysis_ctx`
  - `requirements_coverage_map_ctx`
  - `story_inventory_ctx`
  - `epic_design_ctx`
  - UX and Architecture source facts/artifacts
- Writes:
  - `epic_coverage_validation_ctx`
  - `ux_alignment_assessment_ctx`
  - `backlog_findings_ctx`

### Step 4: `readiness_epic_quality_agent`
- Type: `agent`
- Purpose: review epic/story quality against BMAD standards.
- Reads:
  - `epic_design_ctx`
  - `story_inventory_ctx`
  - `story_dependency_graph_ctx`
  - `requirements_coverage_map_ctx`
- Writes:
  - `epic_quality_review_ctx`
  - `backlog_findings_ctx`

### Step 5: `readiness_final_assessment_agent`
- Type: `agent`
- Purpose: produce final readiness result and Backlog-owned readiness report.
- Reads:
  - all readiness context facts
  - all Backlog draft outputs
- Writes:
  - `implementation_readiness_result_ctx`
  - final `backlog_findings_ctx`
  - `readiness_report_artifact_ctx`
  - `next_work_unit_refs`
- Status rule:
  - `ready` enables the later Backlog transition `readiness_review_to_ready_for_sprint_planning`.
  - `needs_work` or `not_ready` requires the later Backlog transition `readiness_review_to_draft`.

### Step 6: `propagate_readiness_report`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist Backlog-owned readiness result and `READINESS_REPORT` while ending the fixed transition at `readiness_review`.

#### Propagate to Backlog work-unit facts
- `implementation_readiness_result_ctx` → Backlog fact `implementation_readiness_result`
- `backlog_findings_ctx`, if present → Backlog fact `backlog_findings`
- `next_work_unit_refs` → Backlog fact `next_recommended_work_units`

#### Propagate to Backlog artifact slots
- `readiness_report_artifact_ctx` → `READINESS_REPORT`

## Workflow Definition: `accept_readiness_result`

| Property | Value |
|---|---|
| Workflow key | `accept_readiness_result` |
| Family | `backlog` |
| Intent | `verify_ready_status_and_unlock_active_working_set_planning` |
| Bound transition | `readiness_review_to_ready_for_sprint_planning` |
| Entry step | `accept_readiness_result_agent` |

### Step 1: `accept_readiness_result_agent`
- Type: `agent`
- Purpose: confirm Backlog-owned readiness result is `ready` before moving to active working-set planning.
- Reads:
  - `implementation_readiness_result_ctx`
  - Backlog `READINESS_REPORT` artifact
  - `backlog_validation_ctx`
  - `story_inventory_ctx`
- Writes:
  - `next_work_unit_refs`
- Decision rule:
  - This workflow may run only when readiness status is `ready`.
  - If readiness status is not `ready`, this transition is invalid; use `return_to_draft_after_readiness` instead.

### Step 2: `propagate_ready_recommendation`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist next-work recommendation for `plan_active_working_set`.

## Workflow Definition: `return_to_draft_after_readiness`

| Property | Value |
|---|---|
| Workflow key | `return_to_draft_after_readiness` |
| Family | `backlog` |
| Intent | `route_failed_readiness_back_to_backlog_refinement` |
| Bound transition | `readiness_review_to_draft` |
| Entry step | `readiness_remediation_router_agent` |

### Step 1: `readiness_remediation_router_agent`
- Type: `agent`
- Purpose: convert readiness findings into concrete Backlog refinement instructions.
- Reads:
  - `implementation_readiness_result_ctx`
  - Backlog `READINESS_REPORT` artifact
  - `backlog_findings_ctx`
  - `story_inventory_ctx`
  - `requirements_coverage_map_ctx`
- Writes:
  - `backlog_findings_ctx`
  - `next_work_unit_refs`
- Decision rule:
  - This workflow may run only when readiness status is `needs_work` or `not_ready`.
  - It returns Backlog to `draft` so `refine_backlog` / `activation_to_draft`-style editing can repair inventory, coverage, or story quality.

### Step 2: `propagate_readiness_remediation`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist remediation findings and recommendations before returning to `draft`.

## Workflow Definition: `plan_active_working_set`

| Property | Value |
|---|---|
| Workflow key | `plan_active_working_set` |
| Family | `backlog` |
| Intent | `select_next_implementable_story_set_and_initialize_sprint_status` |
| Bound transition | `ready_for_sprint_planning_to_sprint_planned` |
| Entry step | `active_working_set_selection_agent` |

### Step 1: `active_working_set_selection_agent`
- Type: `agent`
- Purpose: combine BMAD sprint planning and sprint status setup into Backlog for MVP.
- Reads:
  - `story_inventory_ctx`
  - `story_dependency_graph_ctx`
  - `requirements_coverage_map_ctx`
  - `implementation_readiness_result_ctx`
- Writes:
  - `active_working_set_ctx`
  - `sprint_status_ctx`
  - `backlog_findings_ctx`, if selection risks are found
- Selection rules:
  - Prefer the smallest story set that delivers visible user value.
  - Include only dependency-clear stories.
  - Preserve story order inside each epic.
  - Do not select stories that rely on deferred full offline sync or bidirectional GitHub sync.
  - Initialize `SPRINT_STATUS` from selected story keys; do not create all Story work units.
  - Persist enough selected-story payload in `active_working_set_ctx` for `start_selected_stories` to prepare Story draft specs later in its own workflow.

### Step 2: `propagate_active_working_set`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist `active_working_set`, `sprint_status`, and `SPRINT_STATUS` artifact/reference.

## Workflow Definition: `start_selected_stories`

| Property | Value |
|---|---|
| Workflow key | `start_selected_stories` |
| Family | `backlog` |
| Intent | `create_story_work_units_for_active_working_set_only` |
| Bound transition | `sprint_planned_to_in_progress` |
| Entry step | `prepare_selected_story_draft_specs_agent` |

### Step 1: `prepare_selected_story_draft_specs_agent`
- Type: `agent`
- Purpose: create workflow-local Story draft specs from durable Backlog active working set.
- Reads:
  - `active_working_set_ctx`
  - `story_inventory_ctx`
  - `story_dependency_graph_ctx`
  - `requirements_coverage_map_ctx`
- Writes:
  - `selected_story_draft_specs_ctx`
- Runtime constraint:
  - Draft specs must be created in this workflow because `selected_story_draft_specs_ctx` is a workflow-local `work_unit_draft_spec_fact` consumed by the following invoke step.

### Step 2: `invoke_selected_story_work_units`
- Type: `invoke`
- Purpose: create Story work-unit instances only for stories selected in `active_working_set_ctx`, using selected Story draft specs.
- Invocation target:
  - Work unit: `story`
  - Transition/workflow: `activation_to_ready_for_dev` / `create_story`
- Reads:
  - `active_working_set_ctx`
  - `selected_story_draft_specs_ctx`
  - `story_inventory_ctx`
  - `story_dependency_graph_ctx`
  - `requirements_coverage_map_ctx`
- Writes:
  - `story_work_unit_refs`
  - updated `story_dependency_graph_ctx`
  - updated `sprint_status_ctx`
- Binding behavior:
  - Bind current Backlog → Story `backlog_work_unit_ref`.
  - Bind selected story key → Story workflow context `target_story_key_ctx`.
  - Bind selected epic key → Story workflow context `epic_key_ctx`.
  - Bind source story payload, requirements, acceptance criteria, technical notes, and dependency keys.
- Runtime constraint:
  - This invoke uses Story activation only. It does not invoke Story `start_dev_story`, `dev_story`, or `code_review`.
  - If the invoke engine needs fact-backed work-unit creation, `selected_story_draft_specs_ctx` supplies the supported `work_unit_draft_spec_fact` inputs.

### Step 3: `propagate_selected_story_refs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist selected Story refs, updated dependency graph, and sprint status.

## Workflow Definition: `update_sprint_status`

| Property | Value |
|---|---|
| Workflow key | `update_sprint_status` |
| Family | `backlog` |
| Intent | `refresh_sprint_status_from_selected_story_states` |
| Bound transition | `in_progress_to_in_progress` |
| Entry step | `sprint_status_update_agent` |

### Step 1: `sprint_status_update_agent`
- Type: `agent`
- Purpose: inspect selected Story refs and update Backlog-level sprint status.
- Reads:
  - `story_work_unit_refs`
  - selected Story states/facts/artifacts through MCP read package
  - `sprint_status_ctx`
- Writes:
  - updated `sprint_status_ctx`
  - `working_set_completion_status_ctx`
  - `backlog_findings_ctx`, if blockers or drift are found

### Step 2: `propagate_sprint_status`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist updated `sprint_status` / `SPRINT_STATUS` and `working_set_completion_status` guard data.

## Workflow Definition: `close_working_set_and_select_next`

| Property | Value |
|---|---|
| Workflow key | `close_working_set_and_select_next` |
| Family | `backlog` |
| Intent | `close_completed_working_set_and_return_for_next_selection` |
| Bound transition | `in_progress_to_ready_for_sprint_planning` |
| Entry step | `working_set_closure_agent` |

### Step 1: `working_set_closure_agent`
- Type: `agent`
- Purpose: verify selected Story work units are done and prepare next-slice recommendation when Backlog scope remains.
- Reads:
  - `story_work_unit_refs`
  - `sprint_status_ctx`
  - Story final states and review outputs
- Writes:
  - final `sprint_status_ctx`
  - `next_work_unit_refs`
  - `backlog_findings_ctx`, if residual work remains
- Guardrail:
  - Use this workflow when at least one uncompleted story remains in `story_inventory_ctx`.
  - The target is `ready_for_sprint_planning`, allowing the same Backlog to select the next dependency-safe working set.

### Step 2: `propagate_backlog_closure`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist final sprint status and next recommendations.

## Workflow Definition: `complete_backlog_scope`

| Property | Value |
|---|---|
| Workflow key | `complete_backlog_scope` |
| Family | `backlog` |
| Intent | `complete_entire_backlog_scope_after_all_relevant_stories_are_done_or_closed` |
| Bound transition | `in_progress_to_done` |
| Entry step | `backlog_scope_completion_agent` |

### Step 1: `backlog_scope_completion_agent`
- Type: `agent`
- Purpose: verify the Backlog's selected scope is fully complete or intentionally closed.
- Reads:
  - `story_inventory_ctx`
  - `story_work_unit_refs`
  - `sprint_status_ctx`
  - Story final states and review outputs
- Writes:
  - final `sprint_status_ctx`
  - `next_work_unit_refs`
  - `backlog_findings_ctx`, if any deferred/closed items remain
- Guardrail:
  - Use this workflow only when no remaining story should be selected for this planning baseline.
  - If more stories remain, use `close_working_set_and_select_next` instead.

### Step 2: `propagate_backlog_scope_completion`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist final Backlog completion status and recommendations.

## Invoke and Downstream Design Notes
- Backlog normally runs its readiness gate after it reaches `draft`.
- Backlog's readiness result decides whether it can advance to `ready_for_sprint_planning` or must return to `draft` refinement.
- Sprint Plan is not a separate MVP work unit; active working-set selection and sprint status live on Backlog.
- Story work units are created from Backlog active-working-set selections, not directly from the entire Backlog.
- Repeated story sets use the same Backlog loop: `ready_for_sprint_planning` → `sprint_planned` → `in_progress` → `ready_for_sprint_planning` until complete.
- Course Correction may create a revised Backlog when PRD/Architecture/UX changes invalidate the story inventory.

## Implementation Reference Files
- BMAD Create Epics and Stories workflow: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/workflow.md`
- BMAD Epics template: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/templates/epics-template.md`
- BMAD Create Epics and Stories steps: `_bmad/bmm/3-solutioning/bmad-create-epics-and-stories/steps/*.md`
- BMAD Implementation Readiness workflow: `_bmad/bmm/3-solutioning/bmad-check-implementation-readiness/workflow.md`
- Methodology fact schema: `packages/db/src/schema/methodology.ts`
- Runtime schema: `packages/db/src/schema/runtime.ts`
- Fact contracts: `packages/contracts/src/methodology/fact.ts`
- Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
- Action propagation runtime: `packages/workflow-engine/src/services/action-step-runtime-service.ts`
- Invoke runtime behavior: `packages/workflow-engine/src/services/invoke-work-unit-execution-service.ts`
