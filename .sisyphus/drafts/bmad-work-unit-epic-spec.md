# BMAD Work Unit Seed Spec: Epic

## Status
- Agreement state: **deferred / not in 12-hour MVP**
- Scope: BMAD Method seeded methodology, Epic work unit only
- Purpose: reference artifact for implementing graph-native Epic seed rows materialized by Backlog

## MVP Deferral Note
- This spec is intentionally deferred from the immediate BMAD seed proof.
- For the 12-hour implementation target, Epic remains structured data inside the Backlog work unit.
- Backlog owns `epic_design`, `story_inventory`, coverage maps, and sprint/status workflows.
- A future graph-native version may restore this spec after Chiron supports living work-unit instance draft specs, state-aware transition selection, and dereferenced `work_unit_reference_fact` reads.

## Ground Rules
- Epic is the Chiron work unit for one BMAD user-value epic from `create_epics_and_stories`.
- Epic is materialized by Backlog after the epic list is approved.
- Epic is not the Backlog and does not own the full `EPICS_AND_STORIES` artifact.
- Epic owns a scoped `EPIC_DESIGN_SLICE` and references its child Story work units.
- Epic exists so Chiron can model the Backlog → Epic → Story graph with real work-unit-reference facts instead of JSON-only indirection.
- Epic must remain user-value focused, not a technical-layer bucket.
- Epic may depend on previous Epic work units, but must not depend on future Epic work units.
- Epic reaches `done` only when all child Story work units are terminal.
- Retrospective is downstream of Epic completion, not part of Epic itself.
- `display` must not be used.
- `action` is used only for propagation in this seed slice.
- No fact defaults are defined in this spec.
- No `communication_language` or `document_output_language` facts are defined in this spec.
- JSON facts are allowed only with explicit subschemas.

## Work Unit Definition

| Property | Value |
|---|---|
| Work unit key | `epic` |
| Display name | `Epic` |
| Cardinality | `many_per_project` |
| Purpose | Represent one approved user-value epic as a durable graph node with requirement coverage, standalone-value semantics, child Story references, dependency facts, and completion status. |

### Cardinality rationale
- A Backlog normally materializes many Epic work units.
- Each Epic groups one coherent user-value delivery theme.
- Future graph-native Sprint Plan/Retrospective flows may need Epic-level grouping without parsing Backlog JSON every time. In the 12-hour MVP, this remains Backlog structured data.

## Lifecycle States

### State: `defined`

| Property | Value |
|---|---|
| Key | `defined` |
| Display name | `Defined` |
| Meaning | Epic work-unit instance has been materialized from Backlog, its design slice exists, and child Story instances may exist but none have advanced beyond `backlog`. |

### State: `in_progress`

| Property | Value |
|---|---|
| Key | `in_progress` |
| Display name | `In Progress` |
| Meaning | At least one child Story has advanced beyond `backlog`, but not all child Stories are terminal. |

### State: `done`

| Property | Value |
|---|---|
| Key | `done` |
| Display name | `Done` |
| Meaning | All child Stories are terminal and this Epic is eligible for Retrospective. |

## Lifecycle Transitions

### Transition: `activation_to_defined`

| Property | Value |
|---|---|
| Key | `activation_to_defined` |
| From state | `null` / activation |
| To state | `defined` |
| Bound primary workflow | `materialize_epic_from_backlog` |

### Transition: `defined_to_in_progress`

| Property | Value |
|---|---|
| Key | `defined_to_in_progress` |
| From state | `defined` |
| To state | `in_progress` |
| Bound primary workflow | `start_epic_implementation` |

### Transition: `in_progress_to_done`

| Property | Value |
|---|---|
| Key | `in_progress_to_done` |
| From state | `in_progress` |
| To state | `done` |
| Bound primary workflow | `complete_epic` |

## Start Gates

### `materialize_epic_from_backlog` start gate
Epic materialization can start when:

- Backlog work-unit reference exists
- Backlog fact `epic_design` exists
- Backlog fact `requirements_coverage_map` exists
- selected epic entry has an epic key, title, goal, covered requirements, and standalone value statement

### `start_epic_implementation` start gate
Epic implementation can start when:

- Epic state is `defined`
- at least one child Story in `story_work_units` is selected by an active Sprint Plan or has advanced beyond `backlog`

### `complete_epic` start gate
Epic completion can start when:

- Epic state is `in_progress`
- every child Story in `story_work_units` is terminal: `done`, `cancelled`, or explicitly `deferred`

## Completion Gates

### `defined` gate
Epic can enter `defined` only when:

- Epic fact `backlog_work_unit` exists
- Epic fact `epic_key` exists
- Epic fact `epic_title` exists
- Epic fact `epic_goal` exists
- Epic fact `requirements_covered` exists
- Epic fact `standalone_value_statement` exists
- Epic artifact slot `EPIC_DESIGN_SLICE` has an artifact instance or artifact reference

### `in_progress` gate
Epic can enter `in_progress` only when:

- Epic fact `story_work_units` exists
- at least one child Story state is `ready_for_dev`, `in_progress`, or `review`
- or active Sprint Plan status entries show at least one child story beyond BMAD `backlog`

### `done` gate
Epic can enter `done` only when:

- Epic fact `story_work_units` exists
- every child Story work-unit reference has terminal state `done`, `cancelled`, or explicitly `deferred`
- Epic fact `epic_status_summary` exists with `allStoriesTerminal = true`
- Epic artifact `EPIC_DESIGN_SLICE` is finalized for retrospective input

## Artifact Slot Definitions

| Slot key | Display name | Cardinality | Required for completion | Purpose |
|---|---|---:|---:|---|
| `EPIC_DESIGN_SLICE` | Epic Design Slice | `single` | yes | Scoped subset of Backlog `EPICS_AND_STORIES`: epic title, goal, user outcome, covered requirements, implementation notes, dependency notes, and story list. |

## Epic Work-Unit Fact Definitions

| Fact key | Value type | Cardinality | Required | Purpose |
|---|---|---:|---:|---|
| `backlog_work_unit` | `work_unit_reference` | `one` | yes | Source Backlog that materialized this Epic. |
| `epic_key` | `string` | `one` | yes | BMAD-compatible epic key, e.g. `epic-1`. |
| `epic_number` | `number` | `one` | yes | Numeric epic order from Backlog. |
| `epic_title` | `string` | `one` | yes | User-value-focused epic title. |
| `epic_goal` | `string` | `one` | yes | Goal statement describing what users can accomplish after this Epic. |
| `user_outcome` | `string` | `one` | yes | Concrete user outcome delivered by the Epic. |
| `requirements_covered` | `json` | `one` | yes | Requirements mapped to this Epic. |
| `standalone_value_statement` | `string` | `one` | yes | Explanation of how this Epic delivers standalone value without requiring future Epics. |
| `implementation_notes` | `json` | `one` | no | Technical or UX considerations copied from Backlog epic design. |
| `depends_on_epics` | `work_unit_reference` | `many` | no | Prior Epic work units this Epic may build upon. |
| `blocks_epics` | `work_unit_reference` | `many` | no | Later Epic work units that depend on this Epic. |
| `story_work_units` | `work_unit_reference` | `many` | yes | Story work units belonging to this Epic. |
| `active_sprint_plans` | `work_unit_reference` | `many` | no | Future-only graph-native Sprint Plan refs. Not used in the 12-hour MVP, where Backlog owns active working-set selection. |
| `retrospective_work_unit` | `work_unit_reference` | `one` | no | Retrospective work unit created after Epic completion. |
| `epic_status_summary` | `json` | `one` | no | Aggregated child-story status counts and derived Epic status. Required for `done`. |
| `next_recommended_work_units` | `work_unit_reference` | `many` | no | Downstream recommendations, normally Retrospective after completion. |

### `requirements_covered` schema

```ts
{
  requirementIds: string[];
  functionalRequirementIds: string[];
  nonFunctionalRequirementIds: string[];
  architectureRequirementIds: string[];
  uxDesignRequirementIds: string[];
  additionalContextRequirementIds: string[];
  epicDesignSourceRef: string;
}
```

### `implementation_notes` schema

```ts
{
  technicalNotes: string[];
  uxNotes: string[];
  architectureNotes: string[];
  riskNotes: string[];
}
```

### `epic_status_summary` schema

```ts
{
  totalStories: number;
  backlog: number;
  readyForDev: number;
  inProgress: number;
  review: number;
  done: number;
  cancelled: number;
  deferred: number;
  allStoriesTerminal: boolean;
  derivedStatus: "defined" | "in_progress" | "done";
}
```

## Workflow Context Fact Definitions

### Bound Epic facts

| Fact key | Context fact kind | Value type / target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `epic_key_ctx` | `bound_fact` | binds Epic fact `epic_key` | `one` | Materialization workflow | Epic key. |
| `epic_number_ctx` | `bound_fact` | binds Epic fact `epic_number` | `one` | Materialization workflow | Epic order. |
| `epic_title_ctx` | `bound_fact` | binds Epic fact `epic_title` | `one` | Materialization workflow | Epic title. |
| `epic_goal_ctx` | `bound_fact` | binds Epic fact `epic_goal` | `one` | Materialization workflow | Goal statement. |
| `user_outcome_ctx` | `bound_fact` | binds Epic fact `user_outcome` | `one` | Materialization workflow | User outcome. |
| `requirements_covered_ctx` | `bound_fact` | binds Epic fact `requirements_covered` | `one` | Materialization workflow | Requirement coverage. |
| `standalone_value_statement_ctx` | `bound_fact` | binds Epic fact `standalone_value_statement` | `one` | Materialization workflow | Standalone value proof. |
| `implementation_notes_ctx` | `bound_fact` | binds Epic fact `implementation_notes` | `one` | Materialization workflow | Implementation notes. |
| `depends_on_epic_refs` | `bound_fact` | binds Epic fact `depends_on_epics` | `many` | Backlog materialization | Prior Epic refs. |
| `blocks_epic_refs` | `bound_fact` | binds Epic fact `blocks_epics` | `many` | Backlog materialization | Later Epic refs. |
| `story_work_unit_refs` | `bound_fact` | binds Epic fact `story_work_units` | `many` | Backlog Story materialization | Child Story refs. |
| `active_sprint_plan_refs` | `bound_fact` | binds Epic fact `active_sprint_plans` | `many` | Future graph-native Sprint Plan selection | Active Sprint Plan refs. Not used in 12-hour MVP. |
| `retrospective_work_unit_ref` | `bound_fact` | binds Epic fact `retrospective_work_unit` | `one` | Completion workflow | Retrospective ref. |
| `epic_status_summary_ctx` | `bound_fact` | binds Epic fact `epic_status_summary` | `one` | Status workflows | Aggregated status. |
| `next_work_unit_refs` | `bound_fact` | binds Epic fact `next_recommended_work_units` | `many` | Completion workflow | Follow-up units. |

### Source and artifact context facts

| Fact key | Context fact kind | Target | Cardinality | Writer | Purpose |
|---|---|---|---:|---|---|
| `backlog_work_unit_ref` | `work_unit_reference_fact` | Backlog work unit | `one` | Backlog invoke | Source Backlog. |
| `backlog_artifact_ref` | `artifact_slot_reference_fact` | `EPICS_AND_STORIES` | `one` | Backlog invoke | Source Backlog artifact. |
| `epic_design_slice_artifact_ctx` | `artifact_slot_reference_fact` | `EPIC_DESIGN_SLICE` | `one` | Materialization workflow | Staged Epic design slice. |

## Workflow Definition: `materialize_epic_from_backlog`

| Property | Value |
|---|---|
| Workflow key | `materialize_epic_from_backlog` |
| Family | `epic` |
| Intent | `create_living_epic_instance_from_backlog_design` |
| Bound transition | `activation_to_defined` |
| Entry step | `epic_materialization_agent` |

### Step 1: `epic_materialization_agent`
- Type: `agent`
- Purpose: Create the Epic fact set and scoped design artifact from Backlog epic design.
- Reads:
  - `backlog_work_unit_ref`
  - `backlog_artifact_ref`
  - Backlog facts `epic_design`, `requirements_coverage_map`, and `story_inventory`
- Writes:
  - `epic_key_ctx`
  - `epic_number_ctx`
  - `epic_title_ctx`
  - `epic_goal_ctx`
  - `user_outcome_ctx`
  - `requirements_covered_ctx`
  - `standalone_value_statement_ctx`
  - `implementation_notes_ctx`
  - `depends_on_epic_refs`, when resolvable
  - `blocks_epic_refs`, when resolvable
  - `epic_design_slice_artifact_ctx`
- Objective:
  - Preserve the approved Backlog epic design exactly.
  - Reject technical-layer epics before materialization if Backlog validation somehow missed them.
  - Produce the scoped `EPIC_DESIGN_SLICE` artifact for inspectability and retrospective input.

### Step 2: `propagate_epic_materialization_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist Epic materialization facts and artifact.
- Propagates:
  - `backlog_work_unit_ref` → Epic fact `backlog_work_unit`
  - `epic_key_ctx` → Epic fact `epic_key`
  - `epic_number_ctx` → Epic fact `epic_number`
  - `epic_title_ctx` → Epic fact `epic_title`
  - `epic_goal_ctx` → Epic fact `epic_goal`
  - `user_outcome_ctx` → Epic fact `user_outcome`
  - `requirements_covered_ctx` → Epic fact `requirements_covered`
  - `standalone_value_statement_ctx` → Epic fact `standalone_value_statement`
  - `implementation_notes_ctx`, if present → Epic fact `implementation_notes`
  - `depends_on_epic_refs`, if present → Epic fact `depends_on_epics`
  - `blocks_epic_refs`, if present → Epic fact `blocks_epics`
  - `epic_design_slice_artifact_ctx` → `EPIC_DESIGN_SLICE`

## Workflow Definition: `start_epic_implementation`

| Property | Value |
|---|---|
| Workflow key | `start_epic_implementation` |
| Family | `epic` |
| Intent | `mark_epic_in_progress_when_child_stories_begin` |
| Bound transition | `defined_to_in_progress` |

### Behavior
- Reads child Story refs from `story_work_units` and/or active Sprint Plan status entries.
- Verifies at least one child Story has advanced beyond `backlog`.
- Writes `epic_status_summary_ctx`.
- Propagates `epic_status_summary_ctx` → Epic fact `epic_status_summary`.

## Workflow Definition: `complete_epic`

| Property | Value |
|---|---|
| Workflow key | `complete_epic` |
| Family | `epic` |
| Intent | `close_epic_when_all_child_stories_terminal` |
| Bound transition | `in_progress_to_done` |

### Step 1: `epic_completion_agent`
- Type: `agent`
- Purpose: Verify all child Stories are terminal and recommend Retrospective.
- Reads:
  - Epic fact `story_work_units`
  - referenced Story states and selected Story facts/artifacts
  - active Sprint Plan / `SPRINT_STATUS`, if present
- Writes:
  - `epic_status_summary_ctx`
  - `next_work_unit_refs`
- Objective:
  - Confirm all child Stories are terminal.
  - Summarize status and implementation/review outcomes.
  - Recommend Retrospective.

### Step 2: `propagate_epic_completion_outputs`
- Type: `action`
- Action kind: `propagation`
- Purpose: persist Epic completion facts.
- Propagates:
  - `epic_status_summary_ctx` → Epic fact `epic_status_summary`
  - `next_work_unit_refs`, if present → Epic fact `next_recommended_work_units`

## Dependency Semantics

- Epic dependencies are allowed only from later Epics to earlier Epics.
- Epic N must never require Epic N+1 to function.
- Dependencies should be represented as `depends_on_epics` and `blocks_epics` work-unit-reference facts, not only text notes.
- Story dependencies remain Story-level facts, but Epic dependency validation should fail if child Story dependencies imply a future-Epic dependency.
- Sprint Plan must respect Epic and Story dependencies when selecting parallel working sets.

## Guardrails

- Epics must organize by user value, not technical layers.
- Reject or remediate Epics such as `Database Setup`, `API Development`, `Frontend Components`, or `Deployment Pipeline` unless reframed as user-value outcomes.
- Every Epic must have a non-empty `standalone_value_statement`.
- Epic must not own Story implementation details beyond story references and design slice context.
- Epic must not own `STORY_DOCUMENT`, `CODE_CHANGE_FILESET`, or `TEST_DOCUMENT` artifacts; those belong to Story.
- Epic must not own the full `EPICS_AND_STORIES` artifact; that belongs to Backlog.
- Database/entity creation must remain just-in-time in the first Story that needs it, not an upfront Epic task.

## Implementation Reference Files
- BMAD Create Epics workflow: `.opencode/skills/bmad-create-epics-and-stories/workflow.md`
- BMAD Epic design step: `.opencode/skills/bmad-create-epics-and-stories/steps/step-02-design-epics.md`
- BMAD Story generation step: `.opencode/skills/bmad-create-epics-and-stories/steps/step-03-create-stories.md`
- BMAD Final validation step: `.opencode/skills/bmad-create-epics-and-stories/steps/step-04-final-validation.md`
- BMAD Epics template: `.opencode/skills/bmad-create-epics-and-stories/templates/epics-template.md`
- Backlog spec: `.sisyphus/drafts/bmad-work-unit-backlog-spec.md`
- Story spec: `.sisyphus/drafts/bmad-work-unit-story-spec.md`
- Sprint Plan spec: `.sisyphus/drafts/bmad-work-unit-sprint-plan-spec.md`
