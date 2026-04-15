# Setup Invoke Phase-1 Authored Seed Spec

## Status
- Canonical phase-1 invoke-only authored seed spec
- Scope: lightweight invoke runtime validation seed
- Purpose: exercise invoke runtime end-to-end without depending on branch runtime, action steps, propagation, or real transition-gate evaluation

## Relationship to Existing Specs
- This spec does **not** replace `setup-first-bmad-mapping-spec.md`
- This spec is an intentionally lightweight phase-1 seed for invoke testing only
- The existing setup-first BMAD mapping spec remains the richer future-facing authority for a more realistic setup workflow

## Phase-1 Principles
- no branch steps
- no action steps
- no propagation assumptions
- empty transition start gates everywhere
- empty transition completion gates everywhere
- setup is permissive and orchestration-focused
- invoked children are lightweight and easy to complete
- keep real authored invoke shapes: fixed-set workflow invoke, context-fact-backed workflow invoke, fixed-set work-unit invoke, context-fact-backed work-unit invoke

---

## Core Runtime Testing Goal

This seed must make it easy to verify all of the following in project runtime:
- workflows can start and complete
- transitions can start and complete
- invoke steps can start and complete
- work-unit invoke can create downstream work units and launch their primary workflows
- workflow invoke can launch downstream workflows directly
- parent invoke steps can be completed after at least one child path completes

This seed is **not** trying to prove:
- branch routing semantics
- action-step-driven propagation
- realistic transition gate logic
- full setup-first BMAD fidelity

---

## Work Unit Types

### 1. `setup`
- key: `setup`
- cardinality: `one_per_project`
- purpose: lightweight bootstrap and orchestration parent for invoke runtime testing

### 2. `brainstorming`
- key: `brainstorming`
- cardinality: `many_per_project`
- purpose: host both workflow invoke variants and prove invoke can continue inside a downstream created work unit

### 3. `research`
- key: `research`
- cardinality: `many_per_project`
- purpose: be created from setup via context-fact-backed work-unit invoke

---

## Lifecycle Model

Each work unit type has exactly one terminal lifecycle state and one transition.

### Setup lifecycle
- states:
  - `done`
- transition:
  - `activation_to_done`

### Brainstorming lifecycle
- states:
  - `done`
- transition:
  - `activation_to_done`

### Research lifecycle
- states:
  - `done`
- transition:
  - `activation_to_done`

---

## Transition Gate Policy (Phase 1)

### Global rule
All transition gates are empty in this phase-1 seed.

This applies to:
- transition start gates
- transition completion gates

### Rationale
- transition gate condition logic will be revisited later alongside branch runtime and gate-engine overhaul
- action-step-based propagation is not implemented, so this seed must not depend on propagated facts to make transitions completable
- invoke runtime is the only behavior under test here

### Explicit consequence
Any transition may be completed once the user reaches its runtime UI without additional fact-based gating.

---

## Workflow Set

### 1. `setup_project`
- work unit type: `setup`
- role: primary
- purpose: parent runtime journey that exercises both work-unit invoke variants

### 2. `brainstorming_primary`
- work unit type: `brainstorming`
- role: primary
- purpose: downstream workflow that exercises both workflow invoke variants

### 3. `research_primary`
- work unit type: `research`
- role: primary
- purpose: minimal completable research workflow for work-unit invoke testing

### 4. `brainstorming_support`
- work unit type: `brainstorming`
- role: supporting
- purpose: tiny workflow target used by both workflow invoke variants inside brainstorming

---

## Transition Workflow Bindings

### Setup `activation_to_done`
- allowed workflows:
  - `setup_project`

### Brainstorming `activation_to_done`
- allowed workflows:
  - `brainstorming_primary`
  - `brainstorming_support`

### Research `activation_to_done`
- allowed workflows:
  - `research_primary`

---

## Fact Model

This seed uses all three fact levels explicitly:
- project facts / methodology facts
- work-unit facts
- workflow context facts

---

## A. Project Facts / Methodology Facts

These are shared project-level facts, not owned by a single work unit.

### 1. `project_knowledge_directory`
- level: project fact
- workflow fact kind: `bound_external_fact`
- type: `string`
- cardinality: `one`
- validation: repo-relative directory path

### 2. `planning_artifacts_directory`
- level: project fact
- workflow fact kind: `bound_external_fact`
- type: `string`
- cardinality: `one`
- validation: repo-relative directory path

### 3. `communication_language`
- level: project fact
- workflow fact kind: `bound_external_fact`
- type: `string`
- cardinality: `one`

### 4. `document_output_language`
- level: project fact
- workflow fact kind: `bound_external_fact`
- type: `string`
- cardinality: `one`

### 5. `repository_type`
- level: project fact
- workflow fact kind: `bound_external_fact`
- type: `string`
- cardinality: `one`

---

## B. Work-Unit Facts

### Setup work-unit facts

#### 1. `initiative_name`
- owner: `setup`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`

#### 2. `project_kind`
- owner: `setup`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`
- allowed values:
  - `greenfield`
  - `brownfield`

#### 3. `workflow_mode`
- owner: `setup`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`
- allowed values:
  - `lightweight`
  - `invoke_test`

#### 4. `requires_brainstorming`
- owner: `setup`
- workflow fact kind: `definition_backed_external_fact`
- type: `boolean`
- cardinality: `one`

#### 5. `requires_research`
- owner: `setup`
- workflow fact kind: `definition_backed_external_fact`
- type: `boolean`
- cardinality: `one`

### Brainstorming work-unit facts

#### 6. `setup_work_unit`
- owner: `brainstorming`
- workflow fact kind: `definition_backed_external_fact`
- type: JSON work-unit reference payload
- cardinality: `one`
- purpose: preserve the upstream setup linkage created by invoke

#### 7. `desired_outcome`
- owner: `brainstorming`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`

#### 8. `selected_direction`
- owner: `brainstorming`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`

### Research work-unit facts

#### 9. `setup_work_unit`
- owner: `research`
- workflow fact kind: `definition_backed_external_fact`
- type: JSON work-unit reference payload
- cardinality: `one`

#### 10. `brainstorming_work_unit`
- owner: `research`
- workflow fact kind: `definition_backed_external_fact`
- type: JSON work-unit reference payload
- cardinality: `one`
- optional in authored draft-spec items, but supported by the schema

#### 11. `research_topic`
- owner: `research`
- workflow fact kind: `definition_backed_external_fact`
- type: `string`
- cardinality: `one`

---

## C. Workflow Context Facts

## `setup_project` workflow context facts

### Form-bound workflow context facts

#### 1. `cf_setup_project_kind`
- kind: `definition_backed_external_fact`
- external fact: `setup.project_kind`
- required by form: yes

#### 2. `cf_setup_initiative_name`
- kind: `definition_backed_external_fact`
- external fact: `setup.initiative_name`
- required by form: no

#### 3. `cf_setup_workflow_mode`
- kind: `definition_backed_external_fact`
- external fact: `setup.workflow_mode`
- required by form: no

#### 4. `cf_method_project_knowledge_directory`
- kind: `bound_external_fact`
- external fact: `project_knowledge_directory`
- required by form: no

#### 5. `cf_method_planning_artifacts_directory`
- kind: `bound_external_fact`
- external fact: `planning_artifacts_directory`
- required by form: no

#### 6. `cf_method_communication_language`
- kind: `bound_external_fact`
- external fact: `communication_language`
- required by form: no

#### 7. `cf_method_document_output_language`
- kind: `bound_external_fact`
- external fact: `document_output_language`
- required by form: no

### Setup agent output workflow context facts

#### 8. `cf_setup_requires_brainstorming`
- kind: `definition_backed_external_fact`
- external fact: `setup.requires_brainstorming`

#### 9. `cf_setup_requires_research`
- kind: `definition_backed_external_fact`
- external fact: `setup.requires_research`

#### 10. `cf_project_overview_artifact`
- kind: `artifact_reference_fact`
- artifact slot: `PROJECT_OVERVIEW`
- cardinality: `one`
- purpose: agent writes the durable project-overview file reference here

### Invoke helper workflow context facts

#### 11. `cf_setup_brainstorming_draft_spec`
- kind: `work_unit_draft_spec_fact`
- target work unit: `brainstorming`
- cardinality: `many`
- selected fact definitions:
  - `setup_work_unit`
  - `desired_outcome`
  - `selected_direction`
- selected artifact slots:
  - `brainstorming_session`

#### 12. `cf_setup_research_draft_spec`
- kind: `work_unit_draft_spec_fact`
- target work unit: `research`
- cardinality: `many`
- selected fact definitions:
  - `setup_work_unit`
  - `brainstorming_work_unit`
  - `research_topic`
- selected artifact slots:
  - `research_report`

## `brainstorming_primary` workflow context facts

#### 13. `cf_brainstorming_desired_outcome`
- kind: `definition_backed_external_fact`
- external fact: `brainstorming.desired_outcome`

#### 14. `cf_brainstorming_selected_direction`
- kind: `definition_backed_external_fact`
- external fact: `brainstorming.selected_direction`

#### 15. `cf_brainstorming_support_workflows`
- kind: `workflow_reference_fact`
- cardinality: `many`
- allowed workflows:
  - `brainstorming_support`
- purpose: drive workflow + context-fact-backed invoke inside brainstorming

## `research_primary` workflow context facts

#### 16. `cf_research_topic`
- kind: `definition_backed_external_fact`
- external fact: `research.research_topic`

## `brainstorming_support` workflow context facts

#### 17. `cf_support_note`
- kind: local lightweight workflow context fact or definition-backed brainstorming helper fact
- type: `string`
- cardinality: `one`
- purpose: make the support workflow form trivially completable

---

## Artifact Slot Definitions

### 1. `PROJECT_OVERVIEW`
- owning work unit type: `setup`
- key: `project_overview`
- label: `Project Overview`
- cardinality: `one`
- purpose: lightweight durable setup summary artifact
- guidance: this is a baseline setup artifact, not a PRD, not a product brief, and not a requirements document

### 2. `brainstorming_session`
- owning work unit type: `brainstorming`
- key: `brainstorming_session`
- label: `Brainstorming Session`
- cardinality: `one`
- purpose: durable brainstorming output or notes artifact

### 3. `research_report`
- owning work unit type: `research`
- key: `research_report`
- label: `Research Report`
- cardinality: `one`
- purpose: durable research output artifact

---

## Workflow Definitions

## 1. `setup_project`

### Work unit type
- `setup`

### Role
- primary

### Step sequence

#### Step 1 — `collect_setup_baseline`
- type: `form`
- purpose: capture the minimum baseline to begin the invoke runtime journey

#### Form field contract

| sort | field key | label | context fact | required |
|---|---|---|---|---|
| 0 | `projectKind` | Project Kind | `cf_setup_project_kind` | yes |
| 1 | `initiativeName` | Initiative Name | `cf_setup_initiative_name` | no |
| 2 | `workflowMode` | Workflow Mode | `cf_setup_workflow_mode` | no |
| 3 | `projectKnowledgeDirectory` | Project Knowledge Directory | `cf_method_project_knowledge_directory` | no |
| 4 | `planningArtifactsDirectory` | Planning Artifacts Directory | `cf_method_planning_artifacts_directory` | no |
| 5 | `communicationLanguage` | Communication Language | `cf_method_communication_language` | no |
| 6 | `documentOutputLanguage` | Document Output Language | `cf_method_document_output_language` | no |

#### Step 2 — `synthesize_setup_for_invoke`
- type: `agent`
- purpose: write the minimum setup-owned outputs needed to drive downstream invoke testing

#### Agent write set
- `cf_project_overview_artifact`
- `cf_setup_requires_brainstorming`
- `cf_setup_requires_research`
- `cf_setup_brainstorming_draft_spec`
- `cf_setup_research_draft_spec`

#### Required authored behavior
- the agent creates a durable `PROJECT_OVERVIEW` file
- the agent writes the resulting artifact reference into `cf_project_overview_artifact`
- the agent creates at least one brainstorming draft-spec item with prefilled values for:
  - `desired_outcome`
  - `selected_direction`
- the agent creates at least one research draft-spec item with a prefilled value for:
  - `research_topic`

#### Step 3 — `invoke_brainstorming_fixed`
- type: `invoke`
- purpose: create a deterministic downstream brainstorming work unit from setup

#### Step 4 — `invoke_research_from_draft_spec`
- type: `invoke`
- purpose: create one-or-more downstream research work units from authored draft-spec items

### Edge sequence
- `collect_setup_baseline -> synthesize_setup_for_invoke`
- `synthesize_setup_for_invoke -> invoke_brainstorming_fixed`
- `invoke_brainstorming_fixed -> invoke_research_from_draft_spec`

---

## 2. `brainstorming_primary`

### Work unit type
- `brainstorming`

### Role
- primary

### Step sequence

#### Step 1 — `confirm_brainstorming_seed`
- type: `form`
- purpose: confirm or refine the brainstorming values prefilled by setup’s work-unit invoke

#### Form field contract

| sort | field key | label | context fact | required | prefill source |
|---|---|---|---|---|---|
| 0 | `desiredOutcome` | Desired Outcome | `cf_brainstorming_desired_outcome` | no | invoke-created brainstorming fact instance |
| 1 | `selectedDirection` | Selected Direction | `cf_brainstorming_selected_direction` | no | invoke-created brainstorming fact instance |

#### Prefill requirement
- both fields must load with the instances created through `cf_setup_brainstorming_draft_spec` during setup invoke
- the user may edit them before submitting

#### Step 2 — `invoke_support_fixed`
- type: `invoke`
- purpose: exercise workflow + fixed-set invoke inside brainstorming

#### Step 3 — `invoke_support_from_refs`
- type: `invoke`
- purpose: exercise workflow + context-fact-backed invoke inside brainstorming

### Edge sequence
- `confirm_brainstorming_seed -> invoke_support_fixed`
- `invoke_support_fixed -> invoke_support_from_refs`

---

## 3. `research_primary`

### Work unit type
- `research`

### Role
- primary

### Step sequence

#### Step 1 — `capture_research_topic`
- type: `form`
- purpose: make research work units trivial to complete

#### Form field contract

| sort | field key | label | context fact | required |
|---|---|---|---|---|
| 0 | `researchTopic` | Research Topic | `cf_research_topic` | no |

---

## 4. `brainstorming_support`

### Work unit type
- `brainstorming`

### Role
- supporting

### Step sequence

#### Step 1 — `capture_support_note`
- type: `form`
- purpose: provide a tiny completable workflow invoke target

#### Form field contract

| sort | field key | label | context fact | required |
|---|---|---|---|---|
| 0 | `supportNote` | Support Note | `cf_support_note` | no |

---

## Exact Four Invoke Step Definitions

## 1. `setup_project.invoke_brainstorming_fixed`

### Step type
- `invoke`

### Quadrant
- `work_unit × fixed_set`

### Config
- `targetKind: "work_unit"`
- `sourceMode: "fixed_set"`
- `workUnitDefinitionId: brainstorming`
- `contextFactDefinitionId: null`
- `workflowDefinitionIds: null`

### Authored invoke transitions
- transition id:
  - `brainstorming.activation_to_done`
- allowed workflow ids:
  - `brainstorming_primary`

### Required bindings
- destination `setup_work_unit` ← source `runtime`
- destination `desired_outcome` ← source `literal` or authored fixed value template
- destination `selected_direction` ← source `literal` or authored fixed value template

### Required authored behavior
- this invoke must create exactly one brainstorming work unit in the happy-path fixture
- the created work unit must already contain values for `desired_outcome` and `selected_direction`

---

## 2. `setup_project.invoke_research_from_draft_spec`

### Step type
- `invoke`

### Quadrant
- `work_unit × context_fact_backed`

### Config
- `targetKind: "work_unit"`
- `sourceMode: "context_fact_backed"`
- `contextFactDefinitionId: cf_setup_research_draft_spec`
- `workUnitDefinitionId: null`
- `workflowDefinitionIds: null`

### Authored invoke transitions
- transition id:
  - `research.activation_to_done`
- allowed workflow ids:
  - `research_primary`

### Required bindings
- destination `setup_work_unit` ← source `runtime`
- destination `brainstorming_work_unit` ← source `context_fact` when supplied by the draft-spec item
- destination `research_topic` ← source `context_fact`

### Artifact bindings
- destination `research_report` ← selected artifact slot payload from the draft-spec item when present

### Required authored behavior
- the setup agent must write at least one draft-spec item so this invoke has a non-zero target set in the happy path

---

## 3. `brainstorming_primary.invoke_support_fixed`

### Step type
- `invoke`

### Quadrant
- `workflow × fixed_set`

### Config
- `targetKind: "workflow"`
- `sourceMode: "fixed_set"`
- `workflowDefinitionIds: [brainstorming_support]`
- `contextFactDefinitionId: null`
- `workUnitDefinitionId: null`

### Bindings
- none

### Transitions
- none

### Required authored behavior
- this invoke must always resolve one support workflow target in the happy path

---

## 4. `brainstorming_primary.invoke_support_from_refs`

### Step type
- `invoke`

### Quadrant
- `workflow × context_fact_backed`

### Config
- `targetKind: "workflow"`
- `sourceMode: "context_fact_backed"`
- `contextFactDefinitionId: cf_brainstorming_support_workflows`
- `workflowDefinitionIds: null`
- `workUnitDefinitionId: null`

### Allowed referenced workflows
- `brainstorming_support`

### Required authored behavior
- seed `cf_brainstorming_support_workflows` with at least one workflow reference instance so the happy-path fixture has a non-zero target set

---

## Runtime Happy Path

### Setup runtime
1. user starts `setup_project`
2. user submits `collect_setup_baseline`
3. user completes `synthesize_setup_for_invoke`
4. user starts and completes `invoke_brainstorming_fixed`
5. user starts and completes `invoke_research_from_draft_spec`

### Brainstorming runtime
1. user opens the created brainstorming work unit
2. user sees `desired_outcome` and `selected_direction` prefilled
3. user submits `confirm_brainstorming_seed`
4. user starts and completes `invoke_support_fixed`
5. user starts and completes `invoke_support_from_refs`

### Research runtime
1. user opens the created research work unit(s)
2. user submits `capture_research_topic`
3. transition completion is allowed immediately because gates are empty

---

## Intentional Omissions in Phase 1

This seed intentionally does **not** include:
- branch steps
- action steps
- propagation behavior
- transition gate logic
- completion logic that depends on fact-condition evaluation
- richer BMAD setup routing realism

These are deferred until the later step-type implementation work and transition-gate engine refactor.

---

## Summary

This is the canonical authored seed spec for phase-1 invoke testing:
- all four invoke variants are present
- setup hosts both work-unit invoke variants
- brainstorming hosts both workflow invoke variants
- setup form is lightweight with only `project_kind` required
- setup agent writes the project-overview artifact reference and the draft specs needed by invoke
- brainstorming form fields are prefilled from invoke-created fact instances
- all transition gates are empty
- no propagation is assumed
- the seed stays focused on proving invoke runtime end-to-end
