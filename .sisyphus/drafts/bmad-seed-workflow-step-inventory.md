# BMAD Seed Workflow + Step Inventory

## Status
- Agreement state: **consolidation draft before implementation plan**
- Purpose: explicit workflow/step inventory for the 12-hour BMAD seed, especially the Backlog-forward flow.

## Implementation rollout order

### Pre-seed enablers
1. Add product entrypoint/button to seed the BMAD methodology.
   - Primary target is the Methodologies list/index page.
   - Purpose: make the seed runnable and manually testable from the app before adding the full methodology.
2. Add work-unit instance existence condition operators.
   - `work_unit_instance_exists`
   - `work_unit_instance_exists_in_state`
   - Implement in both transition gate condition evaluation and branch condition evaluation.
   - Ensure frontend authoring UI can create/edit them, API/contracts can validate them, DB persistence preserves them, and runtime/guidance evaluators can execute them.

### Existing seed updates
- Treat implementation as an update to existing seed data, not only a new append-only seed.
- Existing Setup / Brainstorming / Research definitions should be reviewed and corrected against the agreed specs.
- Existing step/fact/artifact rows that contradict the agreed model should be migrated or replaced.
- Do not delete per-work-unit draft spec files; keep them as living implementation references.

### Section-based manual review rollout
1. Seed/revise Section A: Setup → Brainstorming → Research → Product Brief → PRD → UX Design → Architecture.
2. Run the TaskFlow example manually through Section A.
3. Review facts, artifacts, guidance recommendations, and transition availability before proceeding.
4. Seed/revise Section B: Backlog readiness + active working-set loop + Story.
5. Run TaskFlow through first working set (`STORY-1.1`–`STORY-1.3`) and second-set selection.
6. Review Story artifacts (`STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, `TEST_DOCUMENT`) and Backlog `SPRINT_STATUS` behavior.
7. Seed/revise Section C: Retrospective + Course Correction + stale-artifact freshness routes.
8. Run a TaskFlow retrospective/course-correction scenario and verify `is_fresh`-driven transition availability.

## New condition operators required

### `work_unit_instance_exists`
- Purpose: project-level condition that checks whether at least N instances of a work-unit type exist, regardless of state.
- Shape:
```ts
{
  operator: "work_unit_instance_exists";
  workUnitTypeKey: string;
  minCount?: number;
}
```

### `work_unit_instance_exists_in_state`
- Purpose: project-level condition that checks whether at least N instances of a work-unit type exist in one of the specified states.
- Shape:
```ts
{
  operator: "work_unit_instance_exists_in_state";
  workUnitTypeKey: string;
  stateKeys: string[];
  minCount?: number;
}
```

### Engine support required
- Both operators must be supported by:
  - transition gate condition engine
  - branch condition engine
- These are distinct from attached-reference checks on `work_unit_reference_fact` context facts.

## Backlog workflows

### `create_epics_and_stories`
- Transition: activation → `draft`
- Steps:
  1. `backlog_requirements_extraction_agent` — extract PRD FR/NFR, UX-DR, ARCH-REQ, input inventory.
  2. `backlog_epic_design_agent` — create user-value epic design and initial coverage map.
  3. `backlog_story_generation_agent` — create story inventory with ACs, traces, dependency notes.
  4. `backlog_final_validation_agent` — validate coverage, story quality, no forward deps, no technical-layer epics.
  5. `backlog_dependency_graph_agent` — create story-key dependency graph without materializing all Stories.
  6. `propagate_backlog_draft_outputs` — persist Backlog facts and `EPICS_AND_STORIES`.

### `check_implementation_readiness`
- Transition: `draft` → `readiness_review`
- Steps:
  1. `readiness_document_discovery_agent` — inventory PRD/UX/Architecture/Backlog sources.
  2. `readiness_prd_analysis_agent` — audit PRD requirements baseline.
  3. `readiness_coverage_and_ux_agent` — validate coverage and UX/architecture alignment.
  4. `readiness_epic_quality_agent` — review epic/story quality.
  5. `readiness_final_assessment_agent` — write `implementation_readiness_result` and `READINESS_REPORT`.
  6. `propagate_readiness_report` — persist Backlog-owned readiness outputs.

### `accept_readiness_result`
- Transition: `readiness_review` → `ready_for_sprint_planning`
- Steps:
  1. `accept_readiness_result_agent` — verify readiness status is `ready`.
  2. `propagate_ready_recommendation` — persist next recommendation.

### `return_to_draft_after_readiness`
- Transition: `readiness_review` → `draft`
- Steps:
  1. `readiness_remediation_router_agent` — convert readiness findings into refinement instructions.
  2. `propagate_readiness_remediation` — persist remediation findings.

### `plan_active_working_set`
- Transition: `ready_for_sprint_planning` → `sprint_planned`
- Steps:
  1. `active_working_set_selection_agent` — select dependency-safe story keys, initialize `SPRINT_STATUS`, persist selected-story payload for later draft-spec creation.
  2. `propagate_active_working_set` — persist `active_working_set`, `sprint_status`, and `SPRINT_STATUS`.

### `start_selected_stories`
- Transition: `sprint_planned` → `in_progress`
- Steps:
  1. `prepare_selected_story_draft_specs_agent` — create workflow-local `selected_story_draft_specs_ctx` from durable `active_working_set`.
  2. `invoke_selected_story_work_units` — invoke Story activation transition `activation_to_ready_for_dev` / `create_story` using selected Story draft specs.
  3. `propagate_selected_story_refs` — persist selected Story refs and updated sprint status.

### `update_sprint_status`
- Transition: `in_progress` → `in_progress`
- Steps:
  1. `sprint_status_update_agent` — inspect selected Story refs and update status.
  2. `propagate_sprint_status` — persist `sprint_status`, `SPRINT_STATUS`, `working_set_completion_status`.

### `close_working_set_and_select_next`
- Transition: `in_progress` → `ready_for_sprint_planning`
- Available when `working_set_completion_status.activeWorkingSetComplete = true` and `backlogScopeComplete = false`.
- Steps:
  1. `working_set_closure_agent` — close current set and recommend next selection.
  2. `propagate_backlog_closure` — persist closed-set status/history.

### `complete_backlog_scope`
- Transition: `in_progress` → `done`
- Available when `working_set_completion_status.backlogScopeComplete = true`.
- Steps:
  1. `backlog_scope_completion_agent` — verify all relevant stories are done/closed.
  2. `propagate_backlog_scope_completion` — persist final Backlog completion status.

## Story workflows

### `create_story`
- Transition: activation → `ready_for_dev`
- Steps:
  1. `create_story_source_analysis_agent` — load Backlog, selected key, epic key, trace sources.
  2. `create_story_research_and_context_agent` — add implementation-relevant technical context.
  3. `create_story_spec_agent` — create `STORY_DOCUMENT`.
  4. `create_story_validation_agent` — validate `ready_for_dev` status.
  5. `propagate_create_story_outputs` — persist Story facts and `STORY_DOCUMENT`.
  6. `sync_story_ready_status` — update Backlog `SPRINT_STATUS`.

### `start_dev_story`
- Transition: `ready_for_dev` → `in_progress`
- Steps:
  1. `start_dev_story_progression` — initialize implementation task status.
  2. `sync_story_in_progress_status` — update Backlog `SPRINT_STATUS`.

### `dev_story`
- Transition: `in_progress` → `review`
- Steps:
  1. `dev_story_implementation_agent` — implement only `STORY_DOCUMENT` tasks/subtasks.
  2. `dev_story_validation_agent` — run tests/build/QA and verify ACs.
  3. `propagate_dev_story_outputs` — persist implementation facts, `STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, `TEST_DOCUMENT`.
  4. `sync_story_review_status` — update Backlog `SPRINT_STATUS`.

### `code_review`
- Transitions: `review` → `done` or `review` → `in_progress`
- Steps:
  1. `code_review_context_agent` — gather story context and diff/fileset evidence.
  2. `code_review_parallel_review_agent` — Blind Hunter, Edge Case Hunter, Acceptance Auditor.
  3. `code_review_triage_agent` — classify findings.
  4. `code_review_finalization_agent` — finalize approval/fix/defer outcome.
  5. `propagate_code_review_outputs` — persist review facts and artifacts.
  6. `sync_story_final_review_status` — update Backlog `SPRINT_STATUS`.

## Retrospective workflows

### `run_retrospective`
- Transition: activation → `done`
- Availability example: `work_unit_instance_exists_in_state(story, [done], 1)`.
- Steps:
  1. `retro_working_set_discovery_agent` — identify candidate Backlog working sets/story slices.
  2. `retro_story_set_selection_agent` — agent/user select many Story refs into `source_story_work_units`.
  3. `retro_story_analysis_agent` — analyze Story docs, filesets, tests, reviews, deferred work.
  4. `retro_previous_action_agent` — check prior actions.
  5. `retro_discussion_agent` — capture wins/issues/learnings.
  6. `retro_significant_discovery_agent` — decide whether Course Correction is needed.
  7. `propagate_retrospective_outputs` — persist `RETROSPECTIVE_REPORT`, lessons, action items, recommendations.

### `update_retrospective_followups`
- Transition: `done` → `done`
- Steps:
  1. `retro_followup_update_agent` — update action-item status and new observations.
  2. `propagate_retrospective_followup_outputs` — persist updated report/facts.

## Course Correction workflows

### `correct_course`
- Transition: activation → `done`
- Steps:
  1. `course_correction_initialize_agent` — confirm trigger and collect source work units/artifacts.
  2. `change_analysis_checklist_agent` — analyze impact across PRD/UX/Architecture/Backlog/Story artifacts.
  3. `specific_change_proposals_agent` — draft explicit old→new artifact changes.
  4. `sprint_change_proposal_agent` — produce `SPRINT_CHANGE_PROPOSAL`.
  5. `artifact_update_commit_agent` — apply/commit approved artifact updates and record `artifact_update_set`.
  6. `route_implementation_agent` — record affected work units/artifacts and expected stale-artifact refinement routes.
  7. `propagate_course_correction_outputs` — persist proposal, affected artifacts, update set, and recommendations.

### `update_course_correction`
- Transition: `done` → `done`
- Steps:
  1. `course_correction_update_agent` — update proposal status / additional artifact impacts.
  2. `propagate_course_correction_update_outputs` — persist updates.

## Remaining pre-implementation checks
- Ensure every referenced workflow exists in the seed map.
- Ensure every artifact slot named here exists on its owning work unit.
- Ensure every context fact used by an invoke/binding exists and has correct cardinality.
- Ensure fixed activation invoke constraints are respected: Backlog only invokes Story `activation_to_ready_for_dev` / `create_story`.
