# BMAD Work Unit Seed Spec: Course Correction

## Status
- Agreement state: **draft for 12-hour MVP implementation**
- Scope: BMAD Method seeded methodology, Course Correction work unit only
- Purpose: reference artifact for implementing course-correction seed rows, cross-artifact impact facts, proposal artifact, and stale-artifact refinement routing

## Ground Rules
- Course Correction is a standalone `many_per_project` work unit.
- Course Correction handles significant discoveries or change requests during implementation or retrospective review.
- Course Correction may apply/commit approved edits to affected work-unit artifacts.
- Course Correction must not force affected work-unit state changes.
- Affected work units detect stale artifact commit/blob references through `is_fresh` artifact guards and expose their own fixed refinement/revalidation transitions.
- Course Correction records affected work units by type where useful: PRD, UX Design, Architecture, Backlog, Story.
- Course Correction records affected artifacts and artifact update commit/blob references.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `course_correction` |
| Display name | `Course Correction` |
| Cardinality | `many_per_project` |
| Purpose | Analyze significant change impact, produce a Sprint Change Proposal, apply approved artifact edits, and route affected work units to their own stale-artifact refinement transitions. |

### Cardinality rationale
- A project may need multiple course corrections across implementation waves.
- Each correction must remain independently auditable with trigger, impact, artifact edits, and downstream routing evidence.

## Lifecycle States

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | Sprint Change Proposal, impact analysis, affected artifacts, artifact update set, and routing recommendations have been persisted. |

## Lifecycle Transitions

### Transition: `activation_to_done`

| Property | Value |
|---|---|
| Key | `activation_to_done` |
| From state | `null` / activation |
| To state | `done` |
| Bound primary workflow | `correct_course` |

### Transition: `done_to_done_update_course_correction`

| Property | Value |
|---|---|
| Key | `done_to_done_update_course_correction` |
| From state | `done` |
| To state | `done` |
| Bound primary workflow | `update_course_correction` |

## Completion Gate
Course Correction can enter `done` only when these are persisted:
- Course Correction fact `trigger_summary`
- Course Correction fact `impact_analysis`
- Course Correction fact `affected_artifacts`
- Course Correction fact `artifact_update_set`
- Course Correction fact `recommended_path`
- Course Correction fact `handoff_plan`
- Artifact slot `SPRINT_CHANGE_PROPOSAL`
- Artifact slot `CHANGE_IMPACT_ANALYSIS`
- Artifact slot `ARTIFACT_UPDATE_FILESET`

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `SPRINT_CHANGE_PROPOSAL` | Sprint Change Proposal | `single` | yes | Canonical Course Correction proposal with trigger, impact, explicit artifact changes, approved update set, and routing instructions. |
| `CHANGE_IMPACT_ANALYSIS` | Change Impact Analysis | `single` | yes | Durable blast-radius analysis artifact covering affected work units, affected artifacts, risks, severity, and recommended path. |
| `ARTIFACT_UPDATE_FILESET` | Artifact Update Fileset | `many` | yes | Durable fileset artifacts representing approved edits applied to affected work-unit artifacts, including paths, before/after refs, commit/blob refs, and affected artifact slots. |
| `COURSE_CORRECTION_HANDOFF` | Course Correction Handoff | `single` | no | Optional durable handoff artifact listing stale-artifact refinement routes for affected work units. |

### Artifact modeling note
- Course Correction artifacts are broader than a proposal document.
- `SPRINT_CHANGE_PROPOSAL` is the canonical decision/proposal artifact.
- `CHANGE_IMPACT_ANALYSIS` is the analysis artifact that explains the blast radius.
- `ARTIFACT_UPDATE_FILESET` is many-cardinality because one correction may apply approved edits to multiple affected work-unit artifacts.
- `COURSE_CORRECTION_HANDOFF` is optional because routing can be represented in facts for smaller corrections.

## Course Correction Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required | Purpose |
|---|---|---:|---:|---|
| `trigger_summary` | `string` | `one` | yes | What changed and why Course Correction was initiated. |
| `trigger_source_work_unit` | `work_unit_reference` | `one` | no | Story, Retrospective, Backlog, or other source that surfaced the correction. |
| `affected_prd_work_units` | `work_unit_reference` | `many` | no | PRD work units affected by the correction. |
| `affected_ux_design_work_units` | `work_unit_reference` | `many` | no | UX Design work units affected by the correction. |
| `affected_architecture_work_units` | `work_unit_reference` | `many` | no | Architecture work units affected by the correction. |
| `affected_backlog_work_units` | `work_unit_reference` | `many` | no | Backlog work units affected by the correction. |
| `affected_story_work_units` | `work_unit_reference` | `many` | no | Story work units affected by the correction. |
| `affected_artifacts` | `json` | `many` | yes | Artifact slots/instances expected to change or become stale. |
| `impact_analysis` | `json` | `one` | yes | Cross-artifact/work-unit blast-radius analysis. |
| `change_proposals` | `json` | `many` | yes | Proposed old→new changes before approval/application. |
| `artifact_update_set` | `json` | `one` | yes | Approved edits and resulting artifact commit/blob refs. |
| `recommended_path` | `string` | `one` | yes | `direct_adjustment`, `rollback`, `mvp_review`, `replan`, or `no_change`. |
| `handoff_plan` | `json` | `one` | yes | Which work units should refine/revalidate and why. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | no | Affected work units expected to expose stale-artifact refinement transitions. |

### `affected_artifacts` item schema

```ts
{
  id: string;
  workUnitRef?: string;
  workUnitTypeKey: "prd" | "ux_design" | "architecture" | "backlog" | "story" | "retrospective" | "other";
  artifactSlotKey: string;
  previousArtifactRef?: string;
  previousCommitRef?: string;
  expectedChange: string;
  freshnessGuardImpacted: boolean;
}
```

### `impact_analysis` schema

```ts
{
  trigger: string;
  severity: "minor" | "moderate" | "major" | "critical";
  impactedWorkUnitTypes: Array<"prd" | "ux_design" | "architecture" | "backlog" | "story" | "retrospective" | "other">;
  impactedRequirements: string[];
  impactedStories: string[];
  impactedArtifacts: string[];
  risks: Array<{ risk: string; severity: "low" | "medium" | "high"; mitigation: string }>;
  recommendedPath: "direct_adjustment" | "rollback" | "mvp_review" | "replan" | "no_change";
}
```

### `change_proposals` item schema

```ts
{
  id: string;
  artifactSlotKey: string;
  workUnitRef?: string;
  beforeSummary: string;
  afterSummary: string;
  changeRationale: string;
  approvalStatus: "proposed" | "approved" | "rejected" | "applied";
}
```

### `artifact_update_set` schema

```ts
{
  updates: Array<{
    proposalId: string;
    artifactSlotKey: string;
    workUnitRef?: string;
    previousArtifactRef?: string;
    newArtifactRef?: string;
    previousCommitRef?: string;
    newCommitRef?: string;
    applied: boolean;
    notes: string;
  }>;
  commitBatchRef?: string;
  appliedAt?: string;
}
```

### `handoff_plan` schema

```ts
{
  affectedRoutes: Array<{
    workUnitRef: string;
    workUnitTypeKey: string;
    expectedTransitionKey: string;
    reason: string;
    staleArtifactRefs: string[];
  }>;
  requiresImmediateAttention: boolean;
  notes: string;
}
```

## Workflow Context Fact Definitions

### Bound Course Correction facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `trigger_summary_ctx` | `bound_fact` | binds Course Correction fact `trigger_summary` | `one` | initialize agent | Trigger summary. |
| `trigger_source_work_unit_ref` | `work_unit_reference_fact` | source work unit | `one` | initialize agent/user selection | Optional source of correction. |
| `affected_prd_work_unit_refs` | `work_unit_reference_fact` | PRD work units | `many` | impact/routing agents | Affected PRDs. |
| `affected_ux_design_work_unit_refs` | `work_unit_reference_fact` | UX Design work units | `many` | impact/routing agents | Affected UX specs. |
| `affected_architecture_work_unit_refs` | `work_unit_reference_fact` | Architecture work units | `many` | impact/routing agents | Affected architectures. |
| `affected_backlog_work_unit_refs` | `work_unit_reference_fact` | Backlog work units | `many` | impact/routing agents | Affected Backlogs. |
| `affected_story_work_unit_refs` | `work_unit_reference_fact` | Story work units | `many` | impact/routing agents | Affected Stories. |
| `affected_artifacts_ctx` | `bound_fact` | binds Course Correction fact `affected_artifacts` | `many` | impact/routing agents | Affected artifact metadata. |
| `impact_analysis_ctx` | `bound_fact` | binds Course Correction fact `impact_analysis` | `one` | checklist agent | Impact analysis. |
| `change_proposals_ctx` | `bound_fact` | binds Course Correction fact `change_proposals` | `many` | proposal agents | Proposed/approved changes. |
| `artifact_update_set_ctx` | `bound_fact` | binds Course Correction fact `artifact_update_set` | `one` | artifact update agent | Applied artifact updates and commit refs. |
| `recommended_path_ctx` | `bound_fact` | binds Course Correction fact `recommended_path` | `one` | routing agent | Correction path. |
| `handoff_plan_ctx` | `bound_fact` | binds Course Correction fact `handoff_plan` | `one` | routing agent | Stale-artifact refinement routing. |
| `sprint_change_proposal_artifact_ctx` | `artifact_slot_reference_fact` | `SPRINT_CHANGE_PROPOSAL` | `one` | proposal agent | Staged proposal artifact. |
| `change_impact_analysis_artifact_ctx` | `artifact_slot_reference_fact` | `CHANGE_IMPACT_ANALYSIS` | `one` | checklist agent | Staged impact analysis artifact. |
| `artifact_update_fileset_refs` | `artifact_slot_reference_fact` | `ARTIFACT_UPDATE_FILESET` | `many` | artifact update agent | Applied artifact-edit filesets. |
| `course_correction_handoff_artifact_ctx` | `artifact_slot_reference_fact` | `COURSE_CORRECTION_HANDOFF` | `one` | routing agent | Optional handoff artifact. |
| `next_work_unit_refs` | `bound_fact` | binds Course Correction fact `next_recommended_work_units` | `many` | routing agent | Affected work-unit refs. |

## Workflow Definition: `correct_course`

| Property | Value |
|---|---|
| Workflow key | `correct_course` |
| Family | `course_correction` |
| Intent | `analyze_change_and_route_stale_artifact_refinements` |
| Bound transition | `activation_to_done` |
| Entry step | `course_correction_initialize_agent` |

### Step 1: `course_correction_initialize_agent`
- Type: `agent`
- Purpose: confirm trigger, source, and initial correction scope.
- Reads:
  - `trigger_source_work_unit_ref`, if provided
  - Retrospective/Story/Backlog context if available
- Writes:
  - `trigger_summary_ctx`

### Step 2: `change_analysis_checklist_agent`
- Type: `agent`
- Purpose: run BMAD-style change impact checklist and determine blast radius.
- Reads:
  - trigger summary/source
  - PRD/UX/Architecture/Backlog/Story artifacts as selected/discovered
- Writes:
  - `impact_analysis_ctx`
  - `affected_artifacts_ctx`
  - affected work-unit refs by type
  - `change_impact_analysis_artifact_ctx`

### Step 3: `specific_change_proposals_agent`
- Type: `agent`
- Purpose: draft explicit old→new changes per affected artifact.
- Reads:
  - `impact_analysis_ctx`
  - `affected_artifacts_ctx`
- Writes:
  - `change_proposals_ctx`

### Step 4: `sprint_change_proposal_agent`
- Type: `agent`
- Purpose: produce the canonical `SPRINT_CHANGE_PROPOSAL` artifact.
- Reads:
  - `impact_analysis_ctx`
  - `change_proposals_ctx`
- Writes:
  - `sprint_change_proposal_artifact_ctx`

### Step 5: `artifact_update_commit_agent`
- Type: `agent`
- Purpose: apply/commit approved artifact edits and record new artifact commit/blob refs.
- Reads:
  - approved `change_proposals_ctx`
  - affected artifact refs
- Writes:
  - `artifact_update_set_ctx`
  - updated `affected_artifacts_ctx`
  - `artifact_update_fileset_refs`
- Guardrail:
  - This step may update affected artifact files/instances, but must not change affected work-unit states.

### Step 6: `route_implementation_agent`
- Type: `agent`
- Purpose: identify stale-artifact refinement routes on affected work units.
- Reads:
  - `artifact_update_set_ctx`
  - affected work-unit refs/artifacts
- Writes:
  - `recommended_path_ctx`
  - `handoff_plan_ctx`
  - `next_work_unit_refs`
  - `course_correction_handoff_artifact_ctx`, if useful for handoff clarity

### Step 7: `propagate_course_correction_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist Course Correction facts and proposal artifact.

#### Propagate to Course Correction facts
- `trigger_summary_ctx` → Course Correction fact `trigger_summary`
- `trigger_source_work_unit_ref`, if present → Course Correction fact `trigger_source_work_unit`
- affected refs by type → matching affected work-unit facts
- `affected_artifacts_ctx` → Course Correction fact `affected_artifacts`
- `impact_analysis_ctx` → Course Correction fact `impact_analysis`
- `change_proposals_ctx` → Course Correction fact `change_proposals`
- `artifact_update_set_ctx` → Course Correction fact `artifact_update_set`
- `recommended_path_ctx` → Course Correction fact `recommended_path`
- `handoff_plan_ctx` → Course Correction fact `handoff_plan`
- `next_work_unit_refs`, if present → Course Correction fact `next_recommended_work_units`

#### Propagate to Course Correction artifact slots
- `sprint_change_proposal_artifact_ctx` → `SPRINT_CHANGE_PROPOSAL`
- `change_impact_analysis_artifact_ctx` → `CHANGE_IMPACT_ANALYSIS`
- `artifact_update_fileset_refs` → `ARTIFACT_UPDATE_FILESET`
- `course_correction_handoff_artifact_ctx`, if present → `COURSE_CORRECTION_HANDOFF`

## Workflow Definition: `update_course_correction`

| Property | Value |
|---|---|
| Workflow key | `update_course_correction` |
| Family | `course_correction` |
| Intent | `update_existing_course_correction_artifact_impacts` |
| Bound transition | `done_to_done_update_course_correction` |
| Entry step | `course_correction_update_agent` |

### Step 1: `course_correction_update_agent`
- Type: `agent`
- Purpose: update proposal status, artifact update set, or newly discovered impacts.
- Reads:
  - current Course Correction facts/artifact
  - affected work-unit/artifact refs
- Writes:
  - updated `impact_analysis_ctx`
  - updated `affected_artifacts_ctx`
  - updated `artifact_update_set_ctx`
  - updated `handoff_plan_ctx`
  - updated `change_impact_analysis_artifact_ctx`
  - updated `artifact_update_fileset_refs`
  - updated `course_correction_handoff_artifact_ctx`, if present

### Step 2: `propagate_course_correction_update_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist updated correction facts/artifact.

## Downstream Freshness Rule
- Affected PRD/UX/Architecture/Backlog/Story work units declare artifact freshness guards using `is_fresh`.
- After Course Correction applies/commits approved artifact edits, affected work units are not moved automatically.
- On normal transition/guidance evaluation, stale recorded artifact commit/blob refs expose local refinement/revalidation transitions.
- Each affected work unit owns its own refinement workflow and artifact/fact refresh.

## Implementation Reference Files
- BMAD Course Correction source: `.opencode/skills/bmad-correct-course/**`
- Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`
- Story spec: `.sisyphus/drafts/bmad-work-unit-story-spec.md`
- PRD/UX/Architecture specs: `.sisyphus/drafts/bmad-work-unit-prd-spec.md`, `.sisyphus/drafts/bmad-work-unit-ux-design-spec.md`, `.sisyphus/drafts/bmad-work-unit-architecture-spec.md`
- Workflow/step inventory: `.sisyphus/drafts/bmad-seed-workflow-step-inventory.md`
