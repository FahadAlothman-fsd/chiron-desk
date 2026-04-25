# BMAD Work Unit Seed Spec: Retrospective

## Status
- Agreement state: **draft for 12-hour MVP implementation**
- Scope: BMAD Method seeded methodology, Retrospective work unit only
- Purpose: reference artifact for implementing retrospective seed rows, selection facts, report artifact, and downstream Course Correction recommendations

## Ground Rules
- Retrospective is a standalone `many_per_project` work unit.
- Retrospective analyzes completed Backlog working sets, epic slices, or manually selected Story sets.
- Retrospective does not mutate PRD, UX Design, Architecture, Backlog, Story, or Course Correction artifacts directly.
- Retrospective may recommend Course Correction when significant discoveries affect scope, requirements, architecture, UX, backlog, or story implementation.
- Retrospective availability must not require pre-attached Story refs.
- Retrospective availability uses project-level work-unit instance condition operators:
  - `work_unit_instance_exists_in_state(workUnitTypeKey = "story", stateKeys = ["done"], minCount = 1)`
- The actual Story set is selected during the workflow into a many-cardinality `work_unit_reference_fact`.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `retrospective` |
| Display name | `Retrospective` |
| Cardinality | `many_per_project` |
| Purpose | Analyze completed implementation work, capture lessons/action items, and detect significant discoveries that should trigger Course Correction. |

### Cardinality rationale
- A project can run retrospectives after each Backlog working set, after an epic slice, after a release, or after a major incident.
- Retrospectives remain separately inspectable for lessons, action follow-through, and correction triggers.

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Retrospective report, lessons, action items, significant discoveries, and next recommendations have been persisted. |

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `run_retrospective` |

#### Start gate
- Project has at least one done Story:
  - `work_unit_instance_exists_in_state(workUnitTypeKey = "story", stateKeys = ["done"], minCount = 1)`

### Transition: `done_to_done_followup_retrospective`

| Property | Value |
|---|---|
| Key | `done_to_done_followup_retrospective` |
| From state | `done` |
| To state | `done` |
| Bound primary workflow | `update_retrospective_followups` |

## Completion Gate
Retrospective can enter `done` only when these are persisted:
- Retrospective fact `source_story_work_units`
- Retrospective fact `retrospective_scope`
- Retrospective fact `story_analysis`
- Retrospective fact `lessons_learned`
- Retrospective fact `action_items`
- Retrospective fact `significant_discoveries`
- Retrospective fact `retrospective_summary`
- Artifact slot `RETROSPECTIVE_REPORT`
- Artifact slot `RETROSPECTIVE_EVIDENCE_SET`

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `RETROSPECTIVE_REPORT` | Retrospective Report | `single` | yes | Canonical retrospective report with scope, analyzed stories, wins, issues, lessons, action items, significant discoveries, and next recommendations. |
| `RETROSPECTIVE_EVIDENCE_SET` | Retrospective Evidence Set | `many` | yes | Durable evidence artifacts used by the retrospective, typically one per analyzed Story or working-set slice, referencing Story documents, code filesets, test documents, review findings, and deferred work. |
| `ACTION_ITEM_REGISTER` | Action Item Register | `single` | no | Optional durable action-item tracking artifact derived from retrospective action items, useful when follow-up tracking is larger than the report body. |

### Artifact modeling note
- Retrospective artifacts are not limited to a single report.
- `RETROSPECTIVE_REPORT` is the canonical narrative/synthesis artifact.
- `RETROSPECTIVE_EVIDENCE_SET` is a many-cardinality evidence bundle, so a retrospective can retain one or more durable references to analyzed Story/working-set evidence.
- `ACTION_ITEM_REGISTER` is optional because small retrospectives can keep action items inside `RETROSPECTIVE_REPORT` and structured facts.

## Retrospective Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required | Purpose |
|---|---|---:|---:|---|
| `source_backlog_work_unit` | `work_unit_reference` | `one` | no | Backlog context for the analyzed working set or story slice. |
| `source_story_work_units` | `work_unit_reference` | `many` | yes | Completed Story work units selected for retrospective analysis. |
| `source_working_set_id` | `string` | `one` | no | Backlog working-set id being analyzed when applicable. |
| `retrospective_scope` | `json` | `one` | yes | Selected scope, selection rationale, included/excluded stories, and source artifacts. |
| `story_analysis` | `json` | `one` | yes | Analysis of selected Story documents, code filesets, test documents, reviews, and deferred work. |
| `previous_action_review` | `json` | `one` | no | Follow-through status for prior retrospective action items. |
| `lessons_learned` | `json` | `many` | yes | Durable lessons from the analyzed story set. |
| `action_items` | `json` | `many` | yes | Concrete follow-up actions with owner/status fields where available. |
| `significant_discoveries` | `json` | `many` | no | Discoveries that may require Course Correction. |
| `retrospective_summary` | `json` | `one` | yes | Final status and recommendation summary. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | no | Course Correction if needed; otherwise Backlog next working-set continuation or no recommendation. |

### `retrospective_scope` schema

```ts
{
  scopeKind: "working_set" | "epic_slice" | "manual_story_set" | "release" | "incident";
  sourceBacklogRef?: string;
  sourceWorkingSetId?: string;
  selectedStoryRefs: string[];
  selectedStoryKeys: string[];
  excludedCandidateStories: Array<{ storyRef: string; storyKey: string; reason: string }>;
  selectionRationale: string;
}
```

### `story_analysis` schema

```ts
{
  analyzedStories: Array<{
    storyRef: string;
    storyKey: string;
    status: "done" | "deferred" | "cancelled" | "other";
    storyDocumentRef?: string;
    codeChangeFilesetRef?: string;
    testDocumentRef?: string;
    deferredWorkRef?: string;
    wins: string[];
    issues: string[];
    technicalDebt: string[];
    reviewFindingsSummary: string[];
  }>;
  crossStoryPatterns: string[];
  unresolvedRisks: string[];
}
```

### `lessons_learned` item schema

```ts
{
  id: string;
  category: "product" | "ux" | "architecture" | "backlog" | "implementation" | "testing" | "process" | "other";
  lesson: string;
  evidence: string;
  appliesToFutureWork: boolean;
}
```

### `action_items` item schema

```ts
{
  id: string;
  action: string;
  targetWorkUnitType?: "backlog" | "story" | "prd" | "ux_design" | "architecture" | "course_correction" | "other";
  priority: "high" | "medium" | "low";
  status: "open" | "in_progress" | "done" | "deferred";
  rationale: string;
}
```

### `significant_discoveries` item schema

```ts
{
  id: string;
  discovery: string;
  evidence: string;
  impactedAreas: Array<"prd" | "ux_design" | "architecture" | "backlog" | "story" | "test" | "delivery" | "other">;
  recommendsCourseCorrection: boolean;
  correctionRationale?: string;
}
```

## Workflow Context Fact Definitions

### Bound Retrospective facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `source_backlog_work_unit_ref` | `work_unit_reference_fact` | Backlog work unit | `one` | selection agent | Optional Backlog context. |
| `source_story_work_unit_refs` | `work_unit_reference_fact` | Story work units | `many` | story-set selection agent | Selected Story refs for analysis. |
| `source_working_set_id_ctx` | `plain_value_fact` | `string` | `one` | discovery/selection agent | Optional working set id. |
| `retrospective_scope_ctx` | `bound_fact` | binds Retrospective fact `retrospective_scope` | `one` | selection agent | Selected retrospective scope. |
| `story_analysis_ctx` | `bound_fact` | binds Retrospective fact `story_analysis` | `one` | story analysis agent | Analysis results. |
| `previous_action_review_ctx` | `bound_fact` | binds Retrospective fact `previous_action_review` | `one` | previous action agent | Prior action review. |
| `lessons_learned_ctx` | `bound_fact` | binds Retrospective fact `lessons_learned` | `many` | discussion/significant discovery agents | Lessons. |
| `action_items_ctx` | `bound_fact` | binds Retrospective fact `action_items` | `many` | discussion agent | Action items. |
| `significant_discoveries_ctx` | `bound_fact` | binds Retrospective fact `significant_discoveries` | `many` | significant discovery agent | Possible correction triggers. |
| `retrospective_summary_ctx` | `bound_fact` | binds Retrospective fact `retrospective_summary` | `one` | significant discovery agent | Final summary. |
| `retrospective_report_artifact_ctx` | `artifact_slot_reference_fact` | `RETROSPECTIVE_REPORT` | `one` | final propagation | Staged report artifact. |
| `retrospective_evidence_set_artifact_refs` | `artifact_slot_reference_fact` | `RETROSPECTIVE_EVIDENCE_SET` | `many` | story analysis agent | Evidence artifacts for selected stories / working-set slices. |
| `action_item_register_artifact_ctx` | `artifact_slot_reference_fact` | `ACTION_ITEM_REGISTER` | `one` | discussion/followup agents | Optional action-item tracking artifact. |
| `next_work_unit_refs` | `bound_fact` | binds Retrospective fact `next_recommended_work_units` | `many` | significant discovery agent | Downstream recommendations. |

## Workflow Definition: `run_retrospective`

| Property | Value |
|---|---|
| Workflow key | `run_retrospective` |
| Family | `retrospective` |
| Intent | `analyze_completed_story_set_and_capture_lessons` |
| Bound transition | `activation_to_done` |
| Entry step | `retro_working_set_discovery_agent` |

### Step 1: `retro_working_set_discovery_agent`
- Type: `agent`
- Purpose: discover candidate completed Backlog working sets, epic slices, and done Story work units.
- Reads:
  - project Story work-unit instances in `done`
  - Backlog work units and `working_set_history`, if present
- Writes:
  - candidate scope notes into `retrospective_scope_ctx`

### Step 2: `retro_story_set_selection_agent`
- Type: `agent`
- Purpose: agent/user selects the actual Story set to analyze.
- Reads:
  - done Story candidates
  - Backlog working-set history, if present
- Writes:
  - `source_story_work_unit_refs`
  - `source_backlog_work_unit_ref`, if selected
  - `source_working_set_id_ctx`, if selected
  - finalized `retrospective_scope_ctx`

### Step 3: `retro_story_analysis_agent`
- Type: `agent`
- Purpose: analyze selected Story artifacts and implementation evidence.
- Reads:
  - `source_story_work_unit_refs`
  - Story artifacts: `STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, `TEST_DOCUMENT`, optional `DEFERRED_WORK`
  - Backlog `SPRINT_STATUS`, if available
- Writes:
  - `story_analysis_ctx`
  - initial `lessons_learned_ctx`
  - `retrospective_evidence_set_artifact_refs`

### Step 4: `retro_previous_action_agent`
- Type: `agent`
- Purpose: check previous retrospective action items when relevant.
- Reads:
  - prior Retrospective work units, if discoverable/selected
- Writes:
  - `previous_action_review_ctx`

### Step 5: `retro_discussion_agent`
- Type: `agent`
- Purpose: synthesize wins, misses, friction, and action items.
- Reads:
  - `story_analysis_ctx`
  - `previous_action_review_ctx`, if present
- Writes:
  - `lessons_learned_ctx`
  - `action_items_ctx`
  - `action_item_register_artifact_ctx`, if action tracking warrants a separate artifact

### Step 6: `retro_significant_discovery_agent`
- Type: `agent`
- Purpose: decide whether discoveries require Course Correction.
- Reads:
  - `story_analysis_ctx`
  - `lessons_learned_ctx`
  - `action_items_ctx`
- Writes:
  - `significant_discoveries_ctx`
  - `retrospective_summary_ctx`
  - `next_work_unit_refs`, if Course Correction is recommended

### Step 7: `propagate_retrospective_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist retrospective facts and artifact.

#### Propagate to Retrospective facts
- `source_backlog_work_unit_ref`, if present → Retrospective fact `source_backlog_work_unit`
- `source_story_work_unit_refs` → Retrospective fact `source_story_work_units`
- `source_working_set_id_ctx`, if present → Retrospective fact `source_working_set_id`
- `retrospective_scope_ctx` → Retrospective fact `retrospective_scope`
- `story_analysis_ctx` → Retrospective fact `story_analysis`
- `previous_action_review_ctx`, if present → Retrospective fact `previous_action_review`
- `lessons_learned_ctx` → Retrospective fact `lessons_learned`
- `action_items_ctx` → Retrospective fact `action_items`
- `significant_discoveries_ctx`, if present → Retrospective fact `significant_discoveries`
- `retrospective_summary_ctx` → Retrospective fact `retrospective_summary`
- `next_work_unit_refs`, if present → Retrospective fact `next_recommended_work_units`

#### Propagate to Retrospective artifact slots
- `retrospective_report_artifact_ctx` → `RETROSPECTIVE_REPORT`
- `retrospective_evidence_set_artifact_refs` → `RETROSPECTIVE_EVIDENCE_SET`
- `action_item_register_artifact_ctx`, if present → `ACTION_ITEM_REGISTER`

## Workflow Definition: `update_retrospective_followups`

| Property | Value |
|---|---|
| Workflow key | `update_retrospective_followups` |
| Family | `retrospective` |
| Intent | `update_retrospective_action_item_followthrough` |
| Bound transition | `done_to_done_followup_retrospective` |
| Entry step | `retro_followup_update_agent` |

### Step 1: `retro_followup_update_agent`
- Type: `agent`
- Purpose: update action-item status and new follow-up observations.
- Reads:
  - current Retrospective facts/artifact
  - related work-unit refs, if available
- Writes:
  - updated `action_items_ctx`
  - updated `retrospective_summary_ctx`
  - updated `retrospective_report_artifact_ctx`
  - updated `action_item_register_artifact_ctx`, if present

### Step 2: `propagate_retrospective_followup_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist updated action items/report.

## Implementation Reference Files
- BMAD Retrospective source: `.opencode/skills/bmad-retrospective/**`
- Story spec: `.sisyphus/drafts/bmad-work-unit-story-spec.md`
- Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`
- Workflow/step inventory: `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`
