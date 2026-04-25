# BMAD Work Unit Seed Spec: Sprint Plan

## Status
- Agreement state: **superseded by Backlog workflows for 12-hour MVP**
- Scope: BMAD Method seeded methodology, Sprint Plan work unit only
- Purpose: reference artifact for implementing canonical sprint-planning seed rows and status-tracking bindings

## MVP Supersession Note
- This standalone Sprint Plan work-unit spec is superseded for the immediate seed proof.
- Sprint planning/status behavior moves into the Backlog work unit as Backlog workflows.
- Backlog now owns story inventory, sprint-status tracking, active working-set selection, and selected Story invocation.
- This standalone Sprint Plan work unit can be reconsidered later if the product needs independent sprint objects.

## Ground Rules
- Future-only note: everything below this line describes the deferred standalone Sprint Plan model and is not part of the 12-hour MVP seed.
- Sprint Plan is the Chiron work unit that represents BMAD's **Sprint Planning** output: a sprint-status tracking structure derived from the validated Backlog.
- The BMAD workflow name is `sprint_planning`; the durable work-unit entity is `Sprint Plan`.
- Sprint Plan is not Backlog: Backlog contains the complete epic/story inventory; Sprint Plan creates the implementation tracking view and current execution queue.
- Sprint Plan is not Story: Story work units create implementation-ready story files from selected story keys after sprint tracking exists.
- Sprint Plan is a living working-set launcher/tracker, not merely a one-time status-file generator.
- The user may select one or many existing Story work-unit instances to run in the Sprint Plan working set; Chiron can invoke many Story transitions/workflows through many-cardinality work-unit references.
- BMAD's sequential story loop remains the conservative initial ordering model, but Chiron must explicitly represent story dependencies and parallel eligibility instead of assuming only strict sequence.
- Sprint Plan remains active until every Story in its selected working set reaches a terminal outcome.
- Future-only standalone Sprint Plan would normally start only after a readiness gate returns `overallStatus = ready`; in the 12-hour MVP, Backlog owns this readiness gate.
- The canonical output is the sprint status artifact equivalent to `{implementation_artifacts}/sprint-status.yaml`.
- Preserve BMAD semantics first: parse epics/stories, create ordered status entries, detect existing story files, preserve advanced statuses, validate coverage.
- Model BMAD status values as structured facts in Chiron, while still producing the canonical YAML-like artifact for BMAD compatibility and downstream agent workflows.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `sprint_plan` |
| Display name | `Sprint Plan` |
| Cardinality | `many_per_project` |
| Purpose | Generate and validate implementation tracking from a validated Backlog, select a current working set from living Story instances, launch selected Story workflows, and remain active until that working set completes. |

### Cardinality rationale
- A project may create multiple Sprint Plans over time as implementation waves progress.
- A revised Backlog after Course Correction may require a regenerated Sprint Plan.
- A Sprint Plan is pinned to one validated Backlog and one passing Implementation Readiness result.
- Story work units consume Sprint Plan entries, so Sprint Plan must remain traceable and versioned rather than being only transient UI state.
- Each Sprint Plan represents one active implementation working set, not necessarily the entire Backlog.

## Lifecycle States

### State: `active`

| Property | Value |
|---|---|
| Key | `active` |
| Display name | `Active` |
| Meaning | Sprint status tracking and the selected working set exist; one or more Story work units are ready, in progress, in review, or awaiting start. |

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | All stories in the selected working set have reached terminal status and the Sprint Plan summary has been finalized. |

## Lifecycle Transitions

### Transition: `activation_to_active`

| Property | Value |
|---|---|
| Key | `activation_to_active` |
| From state | `null` / activation |
| To state | `active` |
| Bound primary workflow | `sprint_planning` |

### Transition: `active_to_done`

| Property | Value |
|---|---|
| Key | `active_to_done` |
| From state | `active` |
| To state | `done` |
| Bound primary workflow | `complete_sprint_plan` |

### Start gate
Sprint Plan can start when these source inputs exist:

- Backlog work-unit reference exists
- Backlog artifact `EPICS_AND_STORIES` exists
- Implementation Readiness work-unit reference exists
- Implementation Readiness fact `readiness_assessment.overallStatus = "ready"`

Optional but consumed when available:

- Existing Sprint Plan / sprint-status artifact for status preservation
- Existing Story work-unit references or story files
- Project Context artifact from Setup

### Activation completion gate
Sprint Plan can enter `active` only when the `sprint_planning` workflow has propagated:

- Sprint Plan work-unit fact `backlog_work_unit`
- Sprint Plan work-unit fact `implementation_readiness_work_unit`
- Sprint Plan work-unit fact `tracking_metadata`
- Sprint Plan work-unit fact `parsed_backlog_structure`
- Sprint Plan work-unit fact `sprint_status_entries`
- Sprint Plan work-unit fact `status_detection_results`
- Sprint Plan work-unit fact `sprint_plan_validation`
- Sprint Plan work-unit fact `story_dependency_graph`
- Sprint Plan work-unit fact `selected_story_working_set`
- Sprint Plan artifact slot `SPRINT_STATUS` has an artifact instance or artifact reference

### Final completion gate
Sprint Plan can enter `done` only when the `complete_sprint_plan` workflow has propagated:

- Sprint Plan work-unit fact `working_set_completion_summary`
- every selected Story work-unit reference in `selected_story_working_set` has terminal status `done`, `cancelled`, or explicitly `deferred`
- Sprint Plan artifact slot `SPRINT_STATUS` has been updated with final statuses

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `SPRINT_STATUS` | Sprint Status Tracking | `single` | yes | Canonical BMAD-compatible sprint status artifact equivalent to `{implementation_artifacts}/sprint-status.yaml`, used by Sprint Status, Create Story, Dev Story, Code Review, Retrospective, and Course Correction workflows. |

## Sprint Plan Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `backlog_work_unit` | `work_unit_reference` | `one` | yes | Source Backlog containing epics and stories. |
| `implementation_readiness_work_unit` | `work_unit_reference` | `one` | yes | Passing readiness gate that authorizes Sprint Plan creation. |
| `project_context_artifact` | `artifact_reference` | `one` | no | Optional Setup-generated project context consumed for implementation artifact locations and project conventions. |
| `existing_sprint_plan_work_unit` | `work_unit_reference` | `one` | no | Prior Sprint Plan used for status preservation during regeneration. |
| `tracking_metadata` | `json` | `one` | yes | BMAD status file metadata and Chiron source bindings. |
| `parsed_backlog_structure` | `json` | `one` | yes | Parsed epics, stories, story keys, and retrospective placeholders from Backlog. |
| `sprint_status_entries` | `json` | `one` | yes | Ordered epic/story/retrospective status map. |
| `status_detection_results` | `json` | `one` | yes | Existing file/work-unit detection results and status preservation decisions. |
| `story_dependency_graph` | `json` | `one` | yes | Dependency and parallel-eligibility graph for candidate stories. |
| `selected_story_working_set` | `json` | `one` | yes | User-selected Story work-unit references and story keys for the current Sprint Plan. |
| `sprint_plan_validation` | `json` | `one` | yes | Coverage, status legality, ordering, and artifact-validity checks. |
| `sprint_plan_findings` | `json` | `many` | no | Warnings or issues discovered while generating sprint status. |
| `next_recommended_story_keys` | `json` | `one` | yes | Next story keys recommended for Story work-unit creation. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | no | Downstream recommended Story work units after they are created or selected. |
| `working_set_completion_summary` | `json` | `one` | no | Final summary for the completed Sprint Plan working set. Required for `active_to_done`. |

### `tracking_metadata` schema

```ts
{
  generatedAt: string;
  lastUpdatedAt: string;
  projectName: string;
  projectKey: string; // BMAD-compatible value may be "NOKEY" unless project tracking integration exists
  trackingSystem: "file-system" | "external";
  storyLocation: string;
  epicsLocation: string;
  epicsPattern: string;
  statusArtifactReference?: string;
  sourceBacklogWorkUnit: string;
  sourceImplementationReadinessWorkUnit: string;
}
```

### `parsed_backlog_structure` schema

```ts
{
  epics: Array<{
    key: string; // epic-1
    number: number;
    title: string;
    sourceBacklogEpicId: string;
    storyKeys: string[];
    retrospectiveKey: string; // epic-1-retrospective
  }>;
  stories: Array<{
    key: string; // 1-1-user-authentication
    sourceStoryId: string; // STORY-1.1 or equivalent
    number: string; // 1.1
    title: string;
    epicKey: string;
    slug: string;
    requirementsImplemented: string[];
  }>;
  retrospectiveEntries: Array<{
    key: string;
    epicKey: string;
    status: "optional" | "done";
  }>;
  parseWarnings: string[];
}
```

### `sprint_status_entries` schema

```ts
{
  orderedEntries: Array<{
    key: string;
    entryType: "epic" | "story" | "retrospective";
    status: "backlog" | "ready-for-dev" | "in-progress" | "review" | "done" | "optional";
    title?: string;
    epicKey?: string;
    sourceBacklogId?: string;
    order: number;
  }>;
  statusCounts: {
    backlog: number;
    readyForDev: number;
    inProgress: number;
    review: number;
    done: number;
    optional: number;
  };
}
```

### `status_detection_results` schema

```ts
{
  existingStatusArtifactFound: boolean;
  preservedStatuses: Array<{
    key: string;
    previousStatus: string;
    preservedStatus: string;
    reason: string;
  }>;
  upgradedStatuses: Array<{
    key: string;
    fromStatus: string;
    toStatus: string;
    evidence: string;
  }>;
  legacyStatusMappings: Array<{
    key: string;
    legacyStatus: "drafted" | "contexted" | string;
    mappedStatus: "ready-for-dev" | "in-progress" | string;
  }>;
  detectedStoryArtifacts: Array<{
    storyKey: string;
    storyWorkUnitRef: string;
    reference: string;
    statusImpact: "none" | "upgrade_to_ready_for_dev" | "preserve_advanced_status";
  }>;
  warnings: string[];
}
```

### `sprint_plan_validation` schema

```ts
{
  coverageValidation: {
    allBacklogEpicsRepresented: boolean;
    allBacklogStoriesRepresented: boolean;
    missingEpicKeys: string[];
    missingStoryKeys: string[];
    orphanedStoryKeys: string[];
  };
  statusValidation: {
    allStatusesLegal: boolean;
    illegalEntries: Array<{ key: string; status: string; reason: string }>;
    noStatusDowngrades: boolean;
    downgradeViolations: Array<{ key: string; previousStatus: string; generatedStatus: string }>;
  };
  orderingValidation: {
    entriesOrderedByEpicThenStoryThenRetrospective: boolean;
    violations: string[];
  };
  artifactValidation: {
    sprintStatusArtifactCreated: boolean;
    machineParseable: boolean;
    humanReadableMetadataPresent: boolean;
    errors: string[];
  };
  finalStatus: "ready_for_story_creation" | "needs_revision" | "blocked";
}
```

### `story_dependency_graph` schema

```ts
{
  stories: Array<{
    storyKey: string;
    epicKey: string;
    dependsOnStoryKeys: string[];
    blocksStoryKeys: string[];
    dependsOnEpicKeys: string[];
    parallelEligibleWithStoryKeys: string[];
    parallelBlockedBy: Array<{
      storyKey: string;
      reason: string;
    }>;
    recommendedWave: number;
  }>;
  epics: Array<{
    epicKey: string;
    dependsOnEpicKeys: string[];
    blocksEpicKeys: string[];
  }>;
  conservativeSequentialOrder: string[];
  parallelWaves: Array<{
    wave: number;
    storyKeys: string[];
    reason: string;
  }>;
}
```

### `selected_story_working_set` schema

```ts
{
  selectionMode: "single_story" | "parallel_wave" | "custom_selection";
  selectedStoryKeys: string[];
  userSelectionRationale: string;
  dependencyValidation: {
    selectionIsDependencySafe: boolean;
    missingPrerequisiteStoryKeys: string[];
    unsafeParallelPairs: Array<{
      storyKeyA: string;
      storyKeyB: string;
      reason: string;
    }>;
  };
  selectedStoryWorkUnits: Array<{
    storyKey: string;
    workUnitReference: string;
    initialState: "backlog" | "ready_for_dev" | "in_progress" | "review";
  }>;
}
```

### `working_set_completion_summary` schema

```ts
{
  completedStoryKeys: string[];
  cancelledStoryKeys: string[];
  deferredStoryKeys: string[];
  reviewStoryKeys: string[];
  unresolvedStoryKeys: string[];
  allSelectedStoriesTerminal: boolean;
  followUpRecommendations: Array<{
    targetWorkUnit: "sprint_plan" | "course_correction" | "retrospective" | "backlog" | "story";
    reason: string;
  }>;
}
```

### `sprint_plan_findings` item schema

```ts
{
  id: string;
  category: "source_backlog" | "readiness_gate" | "status_detection" | "coverage" | "ordering" | "artifact" | "downstream_story_creation";
  severity: "critical" | "major" | "minor" | "info";
  finding: string;
  evidence: string;
  recommendation: string;
  blocksSprintPlanCompletion: boolean;
}
```

### `next_recommended_story_keys` schema

```ts
{
  primaryNextStoryKey: string | null;
  parallelCandidateStoryKeys: string[];
  blockedStoryKeys: Array<{
    storyKey: string;
    reason: string;
  }>;
  recommendationReason: string;
}
```

## Status State Machine

### Epic statuses
- `backlog` → `in-progress` → `done`

### Story statuses
- `backlog` → `ready-for-dev` → `in-progress` → `review` → `done`

### Retrospective statuses
- `optional` ↔ `done`

### Status preservation rules
- Regenerating Sprint Plan must never downgrade advanced statuses.
- Existing `ready-for-dev`, `in-progress`, `review`, and `done` story statuses must be preserved unless Course Correction explicitly invalidates them.
- Legacy BMAD-compatible mappings:
  - `drafted` → `ready-for-dev`
  - `contexted` → `in-progress`
- Story artifact detected for a `backlog` story may upgrade that story to `ready-for-dev`.
- Epic status may become `in-progress` once its first story is created or advanced beyond `backlog`.

## Workflow Context Fact Definitions

### Bound Sprint Plan facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `tracking_metadata_ctx` | `bound_fact` | binds Sprint Plan fact `tracking_metadata` | `one` | Tracking structure agent | Metadata for status artifact and source bindings. |
| `parsed_backlog_structure_ctx` | `bound_fact` | binds Sprint Plan fact `parsed_backlog_structure` | `one` | Backlog parsing agent | Parsed epic/story/retrospective structure. |
| `sprint_status_entries_ctx` | `bound_fact` | binds Sprint Plan fact `sprint_status_entries` | `one` | Status generation agent | Ordered status map. |
| `status_detection_results_ctx` | `bound_fact` | binds Sprint Plan fact `status_detection_results` | `one` | Status detection agent | Existing status/story artifact detection. |
| `sprint_plan_validation_ctx` | `bound_fact` | binds Sprint Plan fact `sprint_plan_validation` | `one` | Validation agent | Final validation outcome. |
| `sprint_plan_findings_ctx` | `bound_fact` | binds Sprint Plan fact `sprint_plan_findings` | `many` | All agents | Individual findings. |
| `story_dependency_graph_ctx` | `bound_fact` | binds Sprint Plan fact `story_dependency_graph` | `one` | Dependency planning agent | Story/epic dependency and parallel wave graph. |
| `selected_story_working_set_ctx` | `bound_fact` | binds Sprint Plan fact `selected_story_working_set` | `one` | Working-set selection step | User-selected stories and launched Story refs. |
| `next_story_keys_ctx` | `bound_fact` | binds Sprint Plan fact `next_recommended_story_keys` | `one` | Validation/status agent | Next story recommendations. |
| `next_work_unit_refs` | `bound_fact` | binds Sprint Plan fact `next_recommended_work_units` | `many` | Story invoke step | Downstream Story work-unit refs. |
| `working_set_completion_summary_ctx` | `bound_fact` | binds Sprint Plan fact `working_set_completion_summary` | `one` | Completion workflow | Final working-set completion summary. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `backlog_work_unit_ref` | `work_unit_reference_fact` | Backlog work unit | `one` | Invoke binding / user selection | Required source Backlog. |
| `implementation_readiness_work_unit_ref` | `work_unit_reference_fact` | Implementation Readiness work unit | `one` | Invoke binding / user selection | Required passing readiness gate. |
| `existing_sprint_plan_work_unit_ref` | `work_unit_reference_fact` | Sprint Plan work unit | `one` | Regeneration selection | Optional prior status source for preservation. |
| `backlog_artifact_ref` | `artifact_slot_reference_fact` | `EPICS_AND_STORIES` | `one` | Invoke binding / discovery | Canonical source backlog artifact. |
| `readiness_report_artifact_ref` | `artifact_slot_reference_fact` | `READINESS_REPORT` | `one` | Invoke binding / discovery | Readiness evidence. |
| `project_context_artifact_ref` | `artifact_slot_reference_fact` | `PROJECT_CONTEXT` | `one` | Discovery | Optional project context. |
| `existing_sprint_status_artifact_ref` | `artifact_slot_reference_fact` | prior `SPRINT_STATUS` | `one` | Discovery | Optional prior status artifact. |
| `sprint_status_artifact_ctx` | `artifact_slot_reference_fact` | `SPRINT_STATUS` | `one` | Status generation / validation agent | Staged canonical sprint status artifact. |
| `story_work_unit_refs` | `work_unit_reference_fact` | Story work units | `many` | Backlog binding / working-set selection | Existing Story units selected for this Sprint Plan. |

### Workflow-local control facts

These are context-only facts, not durable Sprint Plan facts.

| Fact key | Context fact kind | Value type | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `story_selection_mode_ctx` | `plain_value_fact` | `string` enum: `single_story` \| `parallel_wave` \| `custom_selection` | `one` | optional form / agent | Controls whether the user selects one story, a dependency-safe parallel wave, or a custom dependency-validated set. |
| `parallel_capacity_ctx` | `plain_value_fact` | `number` | `one` | optional form / agent | Optional team/agent capacity for parallel story recommendations. |
| `selected_story_keys_ctx` | `plain_value_fact` | `string[]` | `many` | working-set selection form / agent | User-selected story keys to launch in this Sprint Plan. |

## Workflow Definition: `sprint_planning`

| Property | Value |
|---|---|
| Workflow key | `sprint_planning` |
| Family | `sprint_plan` |
| Intent | `generate_implementation_status_tracking_from_validated_backlog` |
| Bound transition | `activation_to_active` |
| Entry step | `sprint_readiness_gate_agent` |

## Workflow Step Graph

### Step 1: `sprint_readiness_gate_agent`
- Type: `agent`
- Purpose: Confirm the Implementation Readiness gate is passed and select the source Backlog.
- Reads:
  - `backlog_work_unit_ref`
  - `implementation_readiness_work_unit_ref`
  - `backlog_artifact_ref`
  - `readiness_report_artifact_ref`
- Writes:
  - initial `tracking_metadata_ctx`
  - initial `sprint_plan_findings_ctx`
- Objective:
  - Verify readiness `overallStatus = ready` before proceeding.
  - Confirm Backlog and `EPICS_AND_STORIES` are the exact sources validated by Implementation Readiness.
  - Block Sprint Plan if readiness recommends remediation instead of implementation.

### Step 2: `sprint_backlog_parsing_agent`
- Type: `agent`
- Purpose: BMAD Step 1: parse epic files / Backlog artifact into implementation tracking keys.
- Reads:
  - `backlog_artifact_ref`
  - Backlog facts `epic_design`, `story_inventory`, and `requirements_coverage_map`
- Writes:
  - `parsed_backlog_structure_ctx`
  - updated `tracking_metadata_ctx`
  - `sprint_plan_findings_ctx`
- Objective:
  - Extract epic numbers and story titles from Backlog.
  - Generate BMAD-compatible story keys such as `1-1-user-authentication`.
  - Add retrospective placeholders such as `epic-1-retrospective`.
  - Preserve the Backlog ordering: epic → stories → retrospective.

### Step 3: `sprint_status_generation_agent`
- Type: `agent`
- Purpose: BMAD Step 2: build initial sprint status structure.
- Reads:
  - `tracking_metadata_ctx`
  - `parsed_backlog_structure_ctx`
  - `story_selection_mode_ctx`, if present
  - `parallel_capacity_ctx`, if present
- Writes:
  - initial `sprint_status_entries_ctx`
  - initial `next_story_keys_ctx`
- Objective:
  - Create ordered status entries for each epic, story, and retrospective.
  - Initialize epics and stories as `backlog`, retrospectives as `optional`.
  - Recommend the first backlog story as `primaryNextStoryKey` unless status preservation later changes the recommendation.
  - If `parallel_wave` mode is active, identify candidate story keys that can be created in parallel without violating story order or dependencies.

### Step 4: `sprint_status_detection_agent`
- Type: `agent`
- Purpose: BMAD Step 3: detect existing story files/work units and preserve advanced statuses.
- Reads:
  - `sprint_status_entries_ctx`
  - `existing_sprint_plan_work_unit_ref`, if present
  - `existing_sprint_status_artifact_ref`, if present
  - existing Story work-unit references/files, if present
- Writes:
  - `status_detection_results_ctx`
  - updated `sprint_status_entries_ctx`
  - updated `next_story_keys_ctx`
  - `sprint_plan_findings_ctx`
- Objective:
  - Preserve existing advanced statuses and never downgrade.
  - Map legacy statuses (`drafted`, `contexted`) to current BMAD statuses.
  - Upgrade stories with existing story artifacts to `ready-for-dev` when appropriate.
  - Mark epics `in-progress` when at least one child story has advanced beyond `backlog`.

### Step 5: `sprint_dependency_planning_agent`
- Type: `agent`
- Purpose: Build the story/epic dependency graph and dependency-safe parallel recommendations.
- Reads:
  - `parsed_backlog_structure_ctx`
  - Backlog `story_inventory`
  - Backlog `epic_design`
  - `sprint_status_entries_ctx`
  - `parallel_capacity_ctx`, if present
- Writes:
  - `story_dependency_graph_ctx`
  - updated `next_story_keys_ctx`
  - `sprint_plan_findings_ctx`
- Objective:
  - Extract explicit story dependencies from Backlog.
  - Preserve BMAD's conservative sequential order as `conservativeSequentialOrder`.
  - Identify dependency-safe parallel waves where stories do not depend on one another or on incomplete prerequisites.
  - Support epic dependencies if they are represented in Backlog or Architecture-derived constraints.

### Step 6: `sprint_working_set_selection_agent_or_form`
- Type: `agent` or `form`
- Purpose: Let the user select the current Sprint Plan working set from dependency-safe candidates.
- Reads:
  - `story_dependency_graph_ctx`
  - `next_story_keys_ctx`
  - `sprint_status_entries_ctx`
- Writes:
  - `story_selection_mode_ctx`
  - `parallel_capacity_ctx`, if user specifies it
  - `selected_story_keys_ctx`
  - initial `selected_story_working_set_ctx`
- Objective:
  - Present a conservative single-story recommendation, dependency-safe parallel wave recommendations, and custom-selection option.
  - Validate the selected story keys against dependencies before invoke.
  - Block unsafe selections unless the user explicitly changes prerequisites or narrows selection.

### Step 7: `sprint_status_artifact_agent`
- Type: `agent`
- Purpose: BMAD Step 4: generate the canonical sprint status artifact.
- Reads:
  - `tracking_metadata_ctx`
  - `parsed_backlog_structure_ctx`
  - `sprint_status_entries_ctx`
  - `status_detection_results_ctx`
  - `story_dependency_graph_ctx`
  - `selected_story_working_set_ctx`
- Writes:
  - `sprint_status_artifact_ctx`
  - `sprint_plan_findings_ctx`
- Objective:
  - Produce the BMAD-compatible status artifact with machine-readable metadata and ordered development status entries.
  - Include status-state-machine documentation in the artifact body or metadata comments where supported.
  - Preserve human readability for BMAD-style workflows while preserving structured Chiron facts separately.

### Step 8: `sprint_plan_validation_agent`
- Type: `agent`
- Purpose: BMAD Step 5: validate and report.
- Reads:
  - all prior sprint-planning context facts
  - `sprint_status_artifact_ctx`
- Writes:
  - `sprint_plan_validation_ctx`
  - final `next_story_keys_ctx`
  - `sprint_plan_findings_ctx`
- Objective:
  - Verify every Backlog epic and story is represented.
  - Verify no orphaned story keys exist.
  - Verify all statuses are legal and no downgrades occurred.
  - Verify ordering is epic → stories → retrospective.
  - Verify selected working set is dependency-safe.
  - Verify the generated artifact is machine-parseable and human-readable.
  - Set final status to `ready_for_story_creation`, `needs_revision`, or `blocked`.

### Step 9: `propagate_sprint_plan_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist finalized workflow-context values into durable Sprint Plan facts and artifact slots.

#### Propagate to Sprint Plan work-unit facts
- `backlog_work_unit_ref` → Sprint Plan fact `backlog_work_unit`
- `implementation_readiness_work_unit_ref` → Sprint Plan fact `implementation_readiness_work_unit`
- `project_context_artifact_ref`, if present → Sprint Plan fact `project_context_artifact`
- `existing_sprint_plan_work_unit_ref`, if present → Sprint Plan fact `existing_sprint_plan_work_unit`
- `tracking_metadata_ctx` → Sprint Plan fact `tracking_metadata`
- `parsed_backlog_structure_ctx` → Sprint Plan fact `parsed_backlog_structure`
- `sprint_status_entries_ctx` → Sprint Plan fact `sprint_status_entries`
- `status_detection_results_ctx` → Sprint Plan fact `status_detection_results`
- `story_dependency_graph_ctx` → Sprint Plan fact `story_dependency_graph`
- `selected_story_working_set_ctx` → Sprint Plan fact `selected_story_working_set`
- `sprint_plan_validation_ctx` → Sprint Plan fact `sprint_plan_validation`
- `sprint_plan_findings_ctx`, if present → Sprint Plan fact `sprint_plan_findings`
- `next_story_keys_ctx` → Sprint Plan fact `next_recommended_story_keys`

#### Propagate to Sprint Plan artifact slots
- `sprint_status_artifact_ctx` → `SPRINT_STATUS`

### Step 10: `invoke_selected_story_workflows`
- Type: `invoke`
- Purpose: invoke `create_story` on one or many selected existing Story work units from the dependency-safe working set after Sprint Plan is ready.
- Invocation target:
  - Existing work unit(s): selected `story` references
  - Future-only transition/workflow: `backlog_to_ready_for_dev` / `create_story` (superseded in MVP by Story `activation_to_ready_for_dev` / `create_story` invoked from Backlog)
- Reads:
  - durable Sprint Plan work-unit facts and `SPRINT_STATUS` artifact after propagation
  - `selected_story_working_set_ctx`
  - `backlog_work_unit_ref`
- Writes:
  - `story_work_unit_refs`
  - `next_work_unit_refs`
- Binding behavior:
  - Bind current Sprint Plan → Story `sprint_plan_work_unit_ref`
  - Bind `SPRINT_STATUS` → Story `sprint_status_artifact_ref`
- Guardrail:
  - Invoke only selected existing Story work units, not all Backlog stories.
  - Custom selection must pass dependency validation before invoke.
  - Do not invoke Dev Story / implementation directly from Sprint Plan.

### Step 11: `propagate_sprint_downstream_recommendation`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist downstream Story work-unit references if optional Story invocation is enabled.

#### Propagate to Sprint Plan work-unit facts
- `next_work_unit_refs` → Sprint Plan fact `next_recommended_work_units`

## Workflow Definition: `complete_sprint_plan`

| Property | Value |
|---|---|
| Workflow key | `complete_sprint_plan` |
| Family | `sprint_plan` |
| Intent | `close_sprint_working_set_after_selected_stories_terminal` |
| Bound transition | `active_to_done` |

### Completion workflow behavior
- Reads selected Story work-unit references from `selected_story_working_set` / `next_recommended_work_units`.
- Reads current `SPRINT_STATUS` and `sprint_status_entries`.
- Verifies all selected Story work units are terminal: `done`, `cancelled`, or explicitly `deferred`.
- Updates final sprint status entries and artifact.
- Writes `working_set_completion_summary_ctx`.
- Propagates `working_set_completion_summary_ctx` → Sprint Plan fact `working_set_completion_summary`.
- Recommends the next work unit:
  - another Sprint Plan for the next working set,
  - Retrospective if an epic is complete,
  - Course Correction if selected stories exposed plan invalidation,
  - Backlog revision if story dependencies or requirements are structurally wrong.

## Sprint Status Companion Workflow: `check_sprint_status`

The BMAD `bmad-sprint-status` skill is best modeled as either:

1. a secondary workflow on `Sprint Plan`, or
2. a lightweight read/status workflow on the same work unit after implementation starts.

### Recommended seed decision
Define `check_sprint_status` as a secondary Sprint Plan workflow, not a separate work unit.

| Property | Value |
|---|---|
| Workflow key | `check_sprint_status` |
| Family | `sprint_plan` |
| Intent | `summarize_status_and_recommend_next_action` |
| Bound transition | none / status workflow |

### `check_sprint_status` behavior
- Reads durable `sprint_status_entries`, `status_detection_results`, `SPRINT_STATUS`, and optional Story work-unit statuses.
- Classifies epics, stories, retrospectives, counts statuses, and detects risks.
- Recommends the next workflow in this priority order:
  1. `dev_story` for `in-progress` story continuation
  2. `code_review` for `review` stories
  3. `dev_story` for `ready-for-dev` stories
  4. `create_story` for `backlog` stories
  5. `retrospective` for complete epics with pending retrospective
  6. `course_correction` when orphaned/stale/inconsistent statuses indicate invalid planning state

## Invoke and Downstream Design Notes
- Backlog does not invoke Sprint Plan directly; Implementation Readiness is the gate.
- Sprint Plan invokes `create_story` on the user-selected living Story work units and then remains active until they are terminal.
- Sprint Plan reads Story dependency facts and Epic relationship facts through referenced Story/Epic work units; this requires platform support for dereferencing work-unit-reference facts into selected fact/artifact instances.
- Sprint Plan must not jump to implementation.
- Story work units own story-file creation and status movement from `backlog` to `ready-for-dev`.
- Dev Story owns implementation and status movement from `ready-for-dev` → `in-progress` → `review`.
- Code Review owns review findings and status movement from `review` → `done` only after fixes pass.
- Retrospective becomes relevant after all stories for an epic are `done`.
- Course Correction may invalidate statuses, regenerate Backlog, rerun Implementation Readiness, then regenerate Sprint Plan with explicit preservation/invalidation decisions.

## Implementation Reference Files
- BMAD Sprint Planning workflow: `.opencode/skills/bmad-sprint-planning/workflow.md`
- BMAD Sprint Planning checklist: `.opencode/skills/bmad-sprint-planning/checklist.md`
- BMAD Sprint Status template: `.opencode/skills/bmad-sprint-planning/sprint-status-template.yaml`
- BMAD Sprint Status workflow: `.opencode/skills/bmad-sprint-status/workflow.md`
- BMAD Create Story workflow: `.opencode/skills/bmad-create-story/workflow.md`
- BMAD Dev Story workflow: `.opencode/skills/bmad-dev-story/workflow.md`
- BMAD Code Review skill: `.opencode/skills/bmad-code-review/SKILL.md`
- BMAD Course Correction skill: `.opencode/skills/bmad-correct-course/SKILL.md`
- BMAD Retrospective skill: `.opencode/skills/bmad-retrospective/SKILL.md`
- Master seeded track plan: `.sisyphus/plans/chiron-bmad-seeded-track-master.md`
- Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`
- Implementation Readiness spec: `.sisyphus/drafts/bmad-work-unit-implementation-readiness-spec.md`
