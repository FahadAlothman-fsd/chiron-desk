# BMAD Work Unit Seed Spec: Story

## Status
- Agreement state: **draft with 12-hour MVP override**
- Scope: BMAD Method seeded methodology, Story work unit only
- Purpose: reference artifact for implementing canonical story authoring, development, and review seed rows

## 12-Hour MVP Override
- This section supersedes earlier graph-native Story materialization notes in this draft.
- For the immediate seed proof, Story work units are created only when the combined Backlog work unit selects story keys into its active working set.
- Story does **not** have a materialized `backlog` state in the MVP.
- Epic is structured data inside Backlog, not a materialized Epic work unit.
- Story references Backlog plus `epic_key`; it does not require `epic_work_unit`.
- Backlog owns `SPRINT_STATUS` and active working-set selection; Story updates Backlog status at lifecycle boundaries.
- MVP Story lifecycle is: activation → `ready_for_dev` → `in_progress` → `review` → `done`.
- Future graph-native enhancement may restore Backlog materialization of all Story instances in `backlog` state.

## Ground Rules
- Story is the Chiron work unit for one selected BMAD backlog story key.
- Story is created by Backlog's `start_selected_stories` workflow only after the story key is selected into the active working set.
- Story does not belong to a materialized Epic work unit in the MVP; it stores `epic_key` from Backlog structured data.
- Backlog orchestrates and tracks selected Story instances; Story owns authoring, implementation, and review lifecycle progression.
- The same Story work unit has multiple workflows: `create_story`, `start_dev_story`, `dev_story`, and `code_review`.
- `create_story` authors the implementation-ready story artifact and moves the Story from activation directly to `ready_for_dev`.
- `dev_story` implements the story and moves it through `in_progress` to `review`.
- `code_review` verifies the implementation and moves it to `done` or back to `in_progress` with findings.
- Story must never implement work that is not traceable to the story's tasks/subtasks and acceptance criteria.
- Story must update Backlog / `SPRINT_STATUS` status tracking at lifecycle boundaries.
- Retrospective is not part of Story; Retrospective runs after all relevant epic stories are terminal.
- Course Correction may interrupt or invalidate Story lifecycle and may return affected Story units to deferred/cancelled/replanned states in a later spec.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `story` |
| Display name | `Story` |
| Cardinality | `many_per_project` |
| Purpose | Convert one selected Backlog story into an implementation-ready story spec, execute it with tests and traceable code changes, and verify it through code review. |

### Cardinality rationale
- A project has many Story work units, one per selected backlog story key.
- Backlog may invoke one or many Story work units in an active working set.
- Story work units remain individually inspectable for implementation evidence, review findings, file lists, and retrospective learning.

## Lifecycle States

### State: `ready_for_dev`

| Property | Value |
|---|---|
| Key | `ready_for_dev` |
| Display name | `Ready for Dev` |
| Meaning | Story spec exists, is validated, and contains enough context for implementation. |

### State: `in_progress`

| Property | Value |
|---|---|
| Key | `in_progress` |
| Display name | `In Progress` |
| Meaning | Dev Story workflow is actively implementing or addressing review follow-ups. |

### State: `review`

| Property | Value |
|---|---|
| Key | `review` |
| Display name | `Review` |
| Meaning | Implementation is complete from the dev agent's perspective and is waiting for adversarial code review. |

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Code review is complete, required findings are resolved or formally deferred, Backlog `SPRINT_STATUS` is synced, and the Story is eligible for retrospective learning. |

## Lifecycle Transitions

### Transition: `activation_to_ready_for_dev`

| Property | Value |
|---|---|
| Key | `activation_to_ready_for_dev` |
| From state | `null` / activation |
| To state | `ready_for_dev` |
| Bound primary workflow | `create_story` |

### Transition: `ready_for_dev_to_in_progress`

| Property | Value |
|---|---|
| Key | `ready_for_dev_to_in_progress` |
| From state | `ready_for_dev` |
| To state | `in_progress` |
| Bound primary workflow | `start_dev_story` |

### Transition: `in_progress_to_review`

| Property | Value |
|---|---|
| Key | `in_progress_to_review` |
| From state | `in_progress` |
| To state | `review` |
| Bound primary workflow | `dev_story` |

### Transition: `review_to_done`

| Property | Value |
|---|---|
| Key | `review_to_done` |
| From state | `review` |
| To state | `done` |
| Bound primary workflow | `code_review` |

### Transition: `review_to_in_progress`

| Property | Value |
|---|---|
| Key | `review_to_in_progress` |
| From state | `review` |
| To state | `in_progress` |
| Bound primary workflow | `code_review` |

## Start Gates

### `create_story` start gate
Story creation can start when:

- Story is being created from Backlog's selected active working set
- Backlog work-unit reference exists
- Backlog `active_working_set` includes this `target_story_key`
- Backlog artifact `SPRINT_STATUS` exists
- Backlog artifact `EPICS_AND_STORIES` exists

### `dev_story` start gate
Development can start when:

- Story state is `ready_for_dev` or `in_progress`
- Story artifact `STORY_DOCUMENT` exists
- Story fact `story_spec_validation.finalStatus = "ready_for_dev"`
- Backlog `SPRINT_STATUS` for this story key is `ready-for-dev` or `in-progress`

### `code_review` start gate
Code Review can start when:

- Story state is `review`
- Story fact `implementation_summary` exists
- Story fact `validation_results` exists
- Story artifact `STORY_DOCUMENT` exists
- relevant code diff can be constructed from story change evidence

## Completion Gates

### `ready_for_dev` gate
Story can enter `ready_for_dev` only when:

- Story work-unit fact `target_story_key` exists
- Story work-unit fact `story_source_trace` exists
- Story work-unit fact `story_requirements` exists
- Story work-unit fact `story_authoring_context` exists
- Story work-unit fact `story_spec_validation` exists with `finalStatus = "ready_for_dev"`
- Story artifact slot `STORY_DOCUMENT` has an artifact instance or reference
- Backlog / `SPRINT_STATUS` is updated to `ready-for-dev` for this story key

### `review` gate
Story can enter `review` only when:

- Story fact `implementation_summary` exists
- Story fact `validation_results` exists with required validations passing or justified non-applicability
- Story fact `dev_agent_record` exists
- Story fact `file_list` exists
- Story fact `change_log` exists
- all story tasks/subtasks represented in `implementation_task_status` are complete
- Backlog / `SPRINT_STATUS` is updated to `review`

### `done` gate
Story can enter `done` only when:

- Story fact `review_summary` exists
- all required review findings are resolved, dismissed with rationale, or deferred to `deferred_work_items`
- Story artifact `STORY_DOCUMENT` includes review findings and final status
- Story artifact slot `CODE_CHANGE_FILESET` has an artifact instance or reference
- Story artifact slot `TEST_DOCUMENT` has an artifact instance or reference
- Backlog / `SPRINT_STATUS` is updated to `done`

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `STORY_DOCUMENT` | Story Document | `single` | yes | Canonical BMAD story document equivalent to `{implementation_artifacts}/{story_key}.md`, containing story text, acceptance criteria, tasks/subtasks, dev notes, references, dev agent record, change log, and review findings. |
| `CODE_CHANGE_FILESET` | Code Change Fileset | `single` | yes for `review`/`done` | Durable fileset artifact representing the code changes for this Story: changed file paths, diff/patch reference, created/modified/deleted classification, and commit/branch metadata when available. |
| `TEST_DOCUMENT` | Test Document | `single` | yes for `review`/`done` | Durable test evidence artifact for this Story: test plan, test cases, commands run, outputs, QA notes, screenshots/log references where applicable, and acceptance-criteria verification status. |
| `DEFERRED_WORK` | Deferred Work Items | `single` | no | Optional artifact for review findings or follow-up work intentionally deferred outside this Story. |

### Artifact modeling note
- Story artifacts are not limited to markdown files.
- `STORY_DOCUMENT` is the authored narrative/spec artifact.
- `CODE_CHANGE_FILESET` is a durable representation of implementation changes and may point to a diff, patch, branch, commit, or structured file list.
- `TEST_DOCUMENT` is a durable representation of verification evidence and may include command outputs, screenshots, logs, and acceptance-criteria mapping.
- Structured facts remain useful for querying, but these artifacts are the durable evidence bundle for the Story lifecycle.

## Story Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required | Purpose |
|---|---|---:|---:|---|
| `backlog_work_unit` | `work_unit_reference` | `one` | yes | Source Backlog containing the original epic/story breakdown. |
| `depends_on_stories` | `work_unit_reference` | `many` | no | Story instances that must complete before this Story can safely run. |
| `blocks_stories` | `work_unit_reference` | `many` | no | Story instances that are blocked by this Story. |
| `target_story_key` | `string` | `one` | yes | BMAD-compatible story key, e.g. `1-1-user-authentication`. |
| `epic_key` | `string` | `one` | yes | Backlog structured epic key containing this story, e.g. `EPIC-1`. |
| `sprint_status_artifact` | `artifact_reference` | `one` | no | Backlog-owned source/update target for BMAD-compatible status tracking. Required once selected by Backlog active working set. |
| `story_source_trace` | `json` | `one` | yes | Trace from story key to Backlog epic/story, PRD requirements, Architecture decisions, UX requirements, and previous story context. |
| `story_requirements` | `json` | `one` | yes | Story title, user story, acceptance criteria, tasks/subtasks, requirement references. |
| `story_authoring_context` | `json` | `one` | yes | Dev Notes context: architecture, file paths, testing standards, library/framework notes, project structure notes, references. |
| `story_spec_validation` | `json` | `one` | yes | Checklist validation for story readiness. |
| `implementation_task_status` | `json` | `one` | no | Dev workflow task/subtask completion state. Required for `review`. |
| `implementation_summary` | `json` | `one` | no | Summary of implementation work completed by Dev Story. Required for `review`. |
| `validation_results` | `json` | `one` | no | Test/lint/build/QA results. Required for `review`. |
| `dev_agent_record` | `json` | `one` | no | Agent model, debug log references, completion notes. Required for `review`. |
| `file_list` | `json` | `one` | no | Files created/modified/deleted during implementation. Required for `review`. |
| `change_log` | `json` | `many` | no | Chronological implementation changes. Required for `review`. |
| `review_summary` | `json` | `one` | no | Code review verdict, findings, triage, and final status. Required for `done`. |
| `review_findings` | `json` | `many` | no | Individual review findings. |
| `deferred_work_items` | `json` | `many` | no | Findings intentionally deferred with rationale and target follow-up. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | no | Follow-up recommendations such as Backlog status update, Retrospective, or Course Correction. |

### `story_source_trace` schema

```ts
{
  backlogWorkUnitRef: string;
  sprintStatusArtifactRef: string;
  targetStoryKey: string;
  epicKey: string;
  storyNumber: string;
  sourceBacklogStoryId: string;
  sourceBacklogEpicId: string;
  prdRequirementIds: string[];
  architectureRequirementIds: string[];
  uxDesignRequirementIds: string[];
  previousStoryRefs: Array<{
    storyKey: string;
    artifactRef?: string;
    relevantLearnings: string[];
  }>;
}
```

### `story_requirements` schema

```ts
{
  title: string;
  userStory: {
    asA: string;
    iWant: string;
    soThat: string;
  };
  acceptanceCriteria: Array<{
    id: string;
    text: string;
    given?: string;
    when?: string;
    then?: string;
    and?: string[];
    requirementRefs: string[];
  }>;
  tasks: Array<{
    id: string;
    text: string;
    acceptanceCriteriaRefs: string[];
    subtasks: Array<{
      id: string;
      text: string;
      acceptanceCriteriaRefs: string[];
    }>;
  }>;
}
```

### `story_authoring_context` schema

```ts
{
  architectureConstraints: string[];
  sourceTreeNotes: string[];
  technicalRequirements: string[];
  libraryFrameworkRequirements: Array<{
    name: string;
    versionOrConstraint?: string;
    note: string;
    source: string;
  }>;
  fileStructureRequirements: string[];
  testingRequirements: string[];
  projectStructureNotes: string[];
  gitIntelligence: string[];
  latestTechNotes: string[];
  references: Array<{
    source: string;
    sectionOrLines?: string;
    note: string;
  }>;
}
```

### `story_spec_validation` schema

```ts
{
  hasStoryText: boolean;
  hasAcceptanceCriteria: boolean;
  hasTasksAndSubtasks: boolean;
  allTasksTraceToAcceptanceCriteria: boolean;
  hasArchitectureContext: boolean;
  hasTestingGuidance: boolean;
  hasReferences: boolean;
  noUnresolvedQuestionsForDevAgent: boolean;
  finalStatus: "ready_for_dev" | "needs_revision" | "blocked";
  issues: string[];
}
```

### `implementation_task_status` schema

```ts
{
  tasks: Array<{
    id: string;
    status: "pending" | "in_progress" | "done" | "blocked";
    subtasks: Array<{
      id: string;
      status: "pending" | "in_progress" | "done" | "blocked";
    }>;
  }>;
  allTasksComplete: boolean;
  blockedReasons: string[];
}
```

### `validation_results` schema

```ts
{
  testResults: Array<{
    command: string;
    status: "pass" | "fail" | "not_applicable";
    evidence: string;
  }>;
  lintResults: Array<{
    command: string;
    status: "pass" | "fail" | "not_applicable";
    evidence: string;
  }>;
  buildResults: Array<{
    command: string;
    status: "pass" | "fail" | "not_applicable";
    evidence: string;
  }>;
  acceptanceCriteriaVerification: Array<{
    acceptanceCriteriaId: string;
    status: "pass" | "fail";
    evidence: string;
  }>;
  finalStatus: "ready_for_review" | "needs_work" | "blocked";
}
```

### `review_summary` schema

```ts
{
  reviewMode: "full" | "no_spec";
  verdict: "approved" | "needs_work" | "deferred_with_rationale";
  blindHunterFindingsCount: number;
  edgeCaseFindingsCount: number;
  acceptanceAuditFindingsCount: number;
  requiredFixesResolved: boolean;
  deferredFindingsCount: number;
  finalStatus: "done" | "return_to_in_progress";
}
```

### `review_findings` item schema

```ts
{
  id: string;
  source: "blind_hunter" | "edge_case_hunter" | "acceptance_auditor";
  category: "decision_needed" | "patch" | "defer" | "dismiss";
  severity: "critical" | "major" | "minor" | "info";
  finding: string;
  evidence: string;
  recommendation: string;
  resolutionStatus: "open" | "resolved" | "dismissed" | "deferred";
  resolutionRationale?: string;
}
```

## Workflow Context Fact Definitions

### Bound Story facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `story_source_trace_ctx` | `bound_fact` | binds Story fact `story_source_trace` | `one` | Create Story agent | Source trace. |
| `story_requirements_ctx` | `bound_fact` | binds Story fact `story_requirements` | `one` | Create Story agent | Story requirements and tasks. |
| `story_authoring_context_ctx` | `bound_fact` | binds Story fact `story_authoring_context` | `one` | Create Story agent | Developer context. |
| `story_spec_validation_ctx` | `bound_fact` | binds Story fact `story_spec_validation` | `one` | Create Story validation | Readiness checklist. |
| `implementation_task_status_ctx` | `bound_fact` | binds Story fact `implementation_task_status` | `one` | Dev Story agent | Task/subtask status. |
| `implementation_summary_ctx` | `bound_fact` | binds Story fact `implementation_summary` | `one` | Dev Story agent | Implementation summary. |
| `validation_results_ctx` | `bound_fact` | binds Story fact `validation_results` | `one` | Dev Story agent | Validation evidence. |
| `dev_agent_record_ctx` | `bound_fact` | binds Story fact `dev_agent_record` | `one` | Dev Story agent | Dev agent record. |
| `file_list_ctx` | `bound_fact` | binds Story fact `file_list` | `one` | Dev Story agent | File list. |
| `change_log_ctx` | `bound_fact` | binds Story fact `change_log` | `many` | Dev Story agent | Change log entries. |
| `review_summary_ctx` | `bound_fact` | binds Story fact `review_summary` | `one` | Code Review workflow | Review verdict. |
| `review_findings_ctx` | `bound_fact` | binds Story fact `review_findings` | `many` | Code Review workflow | Review findings. |
| `deferred_work_items_ctx` | `bound_fact` | binds Story fact `deferred_work_items` | `many` | Code Review workflow | Deferred work. |
| `next_work_unit_refs` | `bound_fact` | binds Story fact `next_recommended_work_units` | `many` | Review / completion workflows | Follow-up units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `backlog_work_unit_ref` | `work_unit_reference_fact` | Backlog work unit | `one` | Backlog selected-story invoke | Source Backlog. |
| `target_story_key_ctx` | `plain_value_fact` | `string` | `one` | Backlog selected-story invoke | Selected story key. |
| `epic_key_ctx` | `plain_value_fact` | `string` | `one` | Backlog selected-story invoke | Structured Backlog epic key. |
| `sprint_status_artifact_ref` | `artifact_slot_reference_fact` | `SPRINT_STATUS` | `one` | Backlog selected-story invoke | Sprint tracking artifact. |
| `backlog_artifact_ref` | `artifact_slot_reference_fact` | `EPICS_AND_STORIES` | `one` | Backlog selected-story invoke | Source backlog artifact. |
| `project_context_artifact_ref` | `artifact_slot_reference_fact` | `PROJECT_CONTEXT` | `one` | discovery | Optional project context. |
| `story_document_artifact_ctx` | `artifact_slot_reference_fact` | `STORY_DOCUMENT` | `one` | Create Story / Dev Story / Review | Staged story document artifact. |
| `code_change_fileset_artifact_ctx` | `artifact_slot_reference_fact` | `CODE_CHANGE_FILESET` | `one` | Dev Story / Review | Staged code change fileset artifact. |
| `test_document_artifact_ctx` | `artifact_slot_reference_fact` | `TEST_DOCUMENT` | `one` | Dev Story / Review | Staged test evidence artifact. |
| `deferred_work_artifact_ctx` | `artifact_slot_reference_fact` | `DEFERRED_WORK` | `one` | Code Review | Optional deferred work artifact. |

## Workflow Definition: `create_story`

| Property | Value |
|---|---|
| Workflow key | `create_story` |
| Family | `story` |
| Intent | `author_implementation_ready_story_spec` |
| Bound transition | `activation_to_ready_for_dev` |
| Entry step | `create_story_source_analysis_agent` |

### Step 1: `create_story_source_analysis_agent`
- Type: `agent`
- Purpose: BMAD Create Story steps 1-3: determine target story, load artifacts, analyze architecture/context.
- Reads:
  - `backlog_work_unit_ref`
  - `target_story_key_ctx`
  - `epic_key_ctx`
  - `sprint_status_artifact_ref`
  - `backlog_artifact_ref`
  - `project_context_artifact_ref`, if present
- Writes:
  - `story_source_trace_ctx`
  - initial `story_authoring_context_ctx`
- Objective:
  - Confirm this Story instance is part of the Backlog active working set.
  - Confirm prerequisite `depends_on_stories` are terminal or explicitly waived by Course Correction / user decision.
  - Load Backlog, PRD/Architecture/UX references through Backlog traceability.
  - Pull previous story learnings if previous stories exist.
  - Extract architecture, file structure, testing, and project context constraints.

### Step 2: `create_story_research_and_context_agent`
- Type: `agent`
- Purpose: BMAD Create Story step 4: latest technical and contextual research.
- Reads:
  - `story_source_trace_ctx`
  - `story_authoring_context_ctx`
- Writes:
  - updated `story_authoring_context_ctx`
- Objective:
  - Add only implementation-relevant library/framework/version/security notes.
  - Do not expand scope beyond the selected story.

### Step 3: `create_story_spec_agent`
- Type: `agent`
- Purpose: BMAD Create Story step 5: create the story file from the story template.
- Reads:
  - `story_source_trace_ctx`
  - `story_authoring_context_ctx`
  - Backlog story inventory for target story
- Writes:
  - `story_requirements_ctx`
  - `story_document_artifact_ctx`
- Objective:
  - Produce `STORY_DOCUMENT` with story text, acceptance criteria, tasks/subtasks, dev notes, project structure notes, references, and empty Dev Agent Record sections.
  - Ensure every task/subtask maps to acceptance criteria.
  - Save questions for the end; do not block authoring unless source data is insufficient.

### Step 4: `create_story_validation_agent`
- Type: `agent`
- Purpose: BMAD Create Story checklist validation.
- Reads:
  - `story_requirements_ctx`
  - `story_authoring_context_ctx`
  - `story_document_artifact_ctx`
- Writes:
  - `story_spec_validation_ctx`
- Objective:
  - Verify story is implementation-ready and has no unresolved questions for the dev agent.
  - Set `finalStatus = ready_for_dev`, `needs_revision`, or `blocked`.

### Step 5: `propagate_create_story_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist authored story context and artifact.
- Propagates:
  - `sprint_status_artifact_ref` → Story fact `sprint_status_artifact`
  - `backlog_work_unit_ref` → Story fact `backlog_work_unit`
  - `target_story_key_ctx` → Story fact `target_story_key`
  - `epic_key_ctx` → Story fact `epic_key`
  - `story_source_trace_ctx` → Story fact `story_source_trace`
  - `story_requirements_ctx` → Story fact `story_requirements`
  - `story_authoring_context_ctx` → Story fact `story_authoring_context`
  - `story_spec_validation_ctx` → Story fact `story_spec_validation`
  - `story_document_artifact_ctx` → `STORY_DOCUMENT`

### Step 6: `sync_story_ready_status`
- Type: `action`
- Action kind: `propagation`
- Purpose: update Backlog / `SPRINT_STATUS` story status to `ready-for-dev`.

## Workflow Definition: `start_dev_story`

| Property | Value |
|---|---|
| Workflow key | `start_dev_story` |
| Family | `story` |
| Intent | `mark_story_in_progress_before_implementation` |
| Bound transition | `ready_for_dev_to_in_progress` |

### Behavior
- Reads `STORY_DOCUMENT`, Backlog, and `SPRINT_STATUS`.
- Writes initial `implementation_task_status_ctx` and updates Backlog / `SPRINT_STATUS` to `in-progress`.
- Propagates `implementation_task_status_ctx` → Story fact `implementation_task_status`.

## Workflow Definition: `dev_story`

| Property | Value |
|---|---|
| Workflow key | `dev_story` |
| Family | `story` |
| Intent | `implement_story_and_prepare_for_review` |
| Bound transition | `in_progress_to_review` |
| Entry step | `dev_story_implementation_agent` |

### Step 1: `dev_story_implementation_agent`
- Type: `agent`
- Purpose: BMAD Dev Story steps 2-6: load context, detect review continuation, implement tasks, author tests.
- Reads:
  - `story_document_artifact_ctx` / `STORY_DOCUMENT`
  - all durable Story facts from Create Story
  - `project_context_artifact_ref`, if present
- Writes:
  - updated `implementation_task_status_ctx`
  - `implementation_summary_ctx`
  - `dev_agent_record_ctx`
  - `file_list_ctx`
  - `change_log_ctx`
- Guardrails:
  - Only implement tasks/subtasks traceable to the Story spec.
  - Follow red-green-refactor where tests are applicable.
  - Halt after three consecutive implementation failures.
  - Halt for approval if new dependencies beyond story spec are required.

### Step 2: `dev_story_validation_agent`
- Type: `agent`
- Purpose: BMAD Dev Story steps 7-8: run validations and mark tasks complete only when true.
- Reads:
  - implementation outputs
  - `STORY_DOCUMENT`
- Writes:
  - `validation_results_ctx`
  - final `implementation_task_status_ctx`
- Objective:
  - Run required tests/lint/build/QA checks.
  - Verify acceptance criteria.
  - Block transition to review if validations fail.

### Step 3: `propagate_dev_story_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist implementation evidence and update story document, code fileset, and test document artifacts.
- Propagates:
  - `implementation_task_status_ctx` → Story fact `implementation_task_status`
  - `implementation_summary_ctx` → Story fact `implementation_summary`
  - `validation_results_ctx` → Story fact `validation_results`
  - `dev_agent_record_ctx` → Story fact `dev_agent_record`
  - `file_list_ctx` → Story fact `file_list`
  - `change_log_ctx` → Story fact `change_log`
  - updated `story_document_artifact_ctx` → `STORY_DOCUMENT`
  - `code_change_fileset_artifact_ctx` → `CODE_CHANGE_FILESET`
  - `test_document_artifact_ctx` → `TEST_DOCUMENT`

### Step 4: `sync_story_review_status`
- Type: `action`
- Action kind: `propagation`
- Purpose: update Backlog / `SPRINT_STATUS` story status to `review`.

## Workflow Definition: `code_review`

| Property | Value |
|---|---|
| Workflow key | `code_review` |
| Family | `story` |
| Intent | `adversarially_review_story_implementation` |
| Bound transitions | `review_to_done`, `review_to_in_progress` |
| Entry step | `code_review_context_agent` |

### Step 1: `code_review_context_agent`
- Type: `agent`
- Purpose: BMAD Code Review step 1: gather context and construct diff.
- Reads:
  - `STORY_DOCUMENT`
  - `implementation_summary`
  - `file_list`
  - repository diff evidence
- Writes:
  - initial `review_findings_ctx`, if context issues exist

### Step 2: `code_review_parallel_review_agent`
- Type: `agent`
- Purpose: BMAD Code Review step 2: run Blind Hunter, Edge Case Hunter, and Acceptance Auditor review layers.
- Reads:
  - code diff
  - `STORY_DOCUMENT` and `TEST_DOCUMENT` for acceptance audit
  - project context for edge-case audit
- Writes:
  - `review_findings_ctx`
- Objective:
  - Blind Hunter reviews diff only.
  - Edge Case Hunter reviews diff plus project read context.
  - Acceptance Auditor reviews diff plus story/spec context.

### Step 3: `code_review_triage_agent`
- Type: `agent`
- Purpose: BMAD Code Review step 3: normalize, deduplicate, and classify findings.
- Reads:
  - `review_findings_ctx`
- Writes:
  - updated `review_findings_ctx`
  - `deferred_work_items_ctx`, if applicable
- Objective:
  - Classify as `decision_needed`, `patch`, `defer`, or `dismiss`.
  - Resolve decision-needed findings before patch/defer outcomes.

### Step 4: `code_review_finalization_agent`
- Type: `agent`
- Purpose: BMAD Code Review step 4: present, act, and finalize status.
- Reads:
  - triaged findings
  - `STORY_DOCUMENT`
  - implementation evidence
- Writes:
  - `review_summary_ctx`
  - final `review_findings_ctx`
  - updated `story_document_artifact_ctx`
  - `deferred_work_artifact_ctx`, if applicable
  - `next_work_unit_refs`, if follow-up needed
- Objective:
  - Append review findings to Story spec.
  - Return to `in_progress` if required fixes remain.
  - Move to `done` only when approved or deferred with explicit rationale.

### Step 5: `propagate_code_review_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist review evidence and final story document / fileset / test evidence artifacts.
- Propagates:
  - `review_summary_ctx` → Story fact `review_summary`
  - `review_findings_ctx` → Story fact `review_findings`
  - `deferred_work_items_ctx`, if present → Story fact `deferred_work_items`
  - `next_work_unit_refs`, if present → Story fact `next_recommended_work_units`
  - updated `story_document_artifact_ctx` → `STORY_DOCUMENT`
  - `code_change_fileset_artifact_ctx` → `CODE_CHANGE_FILESET`
  - `test_document_artifact_ctx` → `TEST_DOCUMENT`
  - `deferred_work_artifact_ctx`, if present → `DEFERRED_WORK`

### Step 6: `sync_story_final_review_status`
- Type: `action`
- Action kind: `propagation`
- Purpose: update Backlog / `SPRINT_STATUS` to `done` or back to `in-progress` based on `review_summary.finalStatus`.

## Permitted Story Artifact Modifications by Workflow

### `create_story`
- May create and populate the full `STORY_DOCUMENT` artifact.

### `dev_story`
- May update only these `STORY_DOCUMENT` sections:
  - Tasks/Subtasks checkboxes
  - Dev Agent Record
  - Debug Log References
  - Completion Notes List
  - File List
  - Change Log
  - Status

### `code_review`
- May update only these `STORY_DOCUMENT` sections:
  - Review Findings
  - Review Follow-ups, if returning to `in_progress`
  - Status
  - Deferred Work reference, if applicable

## Invoke and Downstream Design Notes
- Backlog creates Story work-unit instances only for selected active-working-set story keys and invokes their `create_story` transition/workflow.
- Story does not invoke Dev Story as a separate work unit; `dev_story` is a workflow on the same Story work unit.
- Story does not invoke implementation before `STORY_DOCUMENT` is complete and validated.
- Story does not invoke Retrospective. Backlog / Sprint Status should recommend Retrospective after relevant selected stories or epic slices are `done`.
- Story may recommend Course Correction when implementation or review reveals the source Backlog/Architecture/PRD is invalid.
- Story completion should update Backlog so Backlog can decide whether its selected working set is complete.

## Implementation Reference Files
- BMAD Create Story skill: `.opencode/skills/bmad-create-story/SKILL.md`
- BMAD Create Story workflow: `.opencode/skills/bmad-create-story/workflow.md`
- BMAD Story template: `.opencode/skills/bmad-create-story/template.md`
- BMAD Create Story checklist: `.opencode/skills/bmad-create-story/checklist.md`
- BMAD input discovery protocol: `.opencode/skills/bmad-create-story/discover-inputs.md`
- BMAD Dev Story skill: `.opencode/skills/bmad-dev-story/SKILL.md`
- BMAD Dev Story workflow: `.opencode/skills/bmad-dev-story/workflow.md`
- BMAD Dev Story checklist: `.opencode/skills/bmad-dev-story/checklist.md`
- BMAD Code Review skill: `.opencode/skills/bmad-code-review/SKILL.md`
- BMAD Code Review workflow: `.opencode/skills/bmad-code-review/workflow.md`
- BMAD Code Review steps: `.opencode/skills/bmad-code-review/steps/*.md`
- BMAD Sprint Status workflow: `.opencode/skills/bmad-sprint-status/workflow.md`
- BMAD Sprint Planning template: `.opencode/skills/bmad-sprint-planning/sprint-status-template.yaml`
- Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`
