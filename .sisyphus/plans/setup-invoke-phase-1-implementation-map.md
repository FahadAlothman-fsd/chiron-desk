# Setup Invoke Phase-1 Seed Implementation Map

## Status
- Implementation map for `setup-invoke-phase-1-seed-spec.md`
- Purpose: translate the authored seed spec into concrete file changes across the existing methodology seed pipeline
- Scope: seed files, seed aggregators, and seeding tests only

## Relationship to Existing Files
- Primary authored seed authority: `.sisyphus/plans/setup-invoke-phase-1-seed-spec.md`
- This implementation map does **not** replace `setup-first-bmad-mapping-spec.md`
- This implementation map assumes the existing seed architecture remains intact and we extend it rather than invent a parallel seeding system

---

## Guiding Implementation Decision

Implement this phase-1 seed by:
- extending `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` for canonical work-unit / transition / workflow scaffolding
- adding a **new lightweight invoke fixture** beside the brainstorming demo fixture
- wiring that fixture into the table-level seed exports where workflow steps, edges, context facts, invoke rows, and agent rows are collected
- adding dedicated seed tests for the new fixture

### Do not do this
- do not overwrite `brainstorming-demo-fixture.ts`
- do not repurpose the current richer brainstorming fixture into the new setup invoke fixture
- do not mutate the existing setup-first BMAD mapping spec to fit phase 1

### Why
- the current brainstorming demo fixture already tests a different, richer runtime slice
- the new invoke-only seed is a separate canonical testing surface
- keeping it separate prevents regressions and avoids mixing phase-1 invoke simplifications into the richer future-oriented setup mapping

---

## Seed File Inventory and Responsibilities

## 1. `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`

### Responsibility in phase 1
This file remains the canonical home for:
- work-unit type rows
- lifecycle state rows
- lifecycle transition rows
- transition condition-set rows
- artifact slot definition rows
- canonical workflow rows
- transition workflow binding rows

### Required changes

#### A. Work-unit types
Confirm the following work-unit types exist and are exported for both draft and active methodology versions:
- `setup`
- `brainstorming`
- `research`

These already exist today, so no new work-unit type family is expected.

#### B. Lifecycle states and transitions
Confirm or adapt the canonical lifecycle rows so that all three work-unit families use:
- state: `done`
- transition: `activation_to_done`

These also already exist, so the likely work is not creating new transitions but making sure the phase-1 tests explicitly rely on these existing canonical ids.

#### C. Transition condition sets
Modify the transition condition-set builders for:
- setup
- brainstorming
- research

So that phase-1 transitions have:
- empty start condition groups
- empty completion condition groups

This is one of the most important implementation changes because the new phase-1 seed spec explicitly requires empty gates everywhere.

#### D. Artifact slot definitions
Ensure these slot definitions exist and are exported for both methodology versions:
- setup: `PROJECT_OVERVIEW`
- brainstorming: `brainstorming_session`
- research: `research_report`

If any already exist under slightly different ids/keys, reuse them rather than creating semantically duplicate slots.

#### E. Workflow rows
Ensure the canonical workflow builders expose these workflow definitions:
- `setup_project`
- `brainstorming_primary`
- `research_primary`
- `brainstorming_support`

This is the main place where new workflow rows may need to be added.

#### F. Transition workflow bindings
Update the binding builders so the transitions allow exactly:

##### Setup `activation_to_done`
- `setup_project`

##### Brainstorming `activation_to_done`
- `brainstorming_primary`
- `brainstorming_support`

##### Research `activation_to_done`
- `research_primary`

### Validation target
After implementation, this file should still be the single source of truth for canonical methodology rows used by the table-level seed modules.

---

## 2. `packages/scripts/src/seed/methodology/setup/brainstorming-demo-fixture.ts`

### Responsibility in phase 1
Keep this file unchanged unless a shared helper extraction becomes absolutely necessary.

### Rule
Treat the existing brainstorming demo fixture as:
- existing runtime-fixture coverage
- a pattern reference
- **not** the implementation target for the new lightweight invoke-only seed

### What to copy conceptually
Reuse its established seeding pattern for:
- `methodology_workflow_steps`
- `methodology_workflow_edges`
- `methodologyWorkflowContextFactDefinitions`
- `methodologyWorkflowContextFactWorkflowReferences`
- `methodologyWorkflowContextFactDraftSpecs`
- `methodologyWorkflowContextFactDraftSpecSelections`
- `methodologyWorkflowAgentSteps`
- `methodologyWorkflowInvokeSteps`
- `methodologyWorkflowInvokeBindings`
- `methodologyWorkflowInvokeTransitions`

### What not to copy literally
- do not reuse its exact fact inventory
- do not reuse its invoke graph
- do not reuse its four-step structure
- do not fold setup invoke testing into the brainstorming demo fixture itself

---

## 3. `packages/scripts/src/seed/methodology/setup/` → add new fixture file

### New file to add
`packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts`

### This new file should own
- all workflow-step rows for the phase-1 invoke-only seed
- all workflow-edge rows for the phase-1 invoke-only seed
- all workflow context-fact definition rows for the phase-1 invoke-only seed
- all workflow-reference context fact rows for the phase-1 invoke-only seed
- all draft-spec context fact rows and selections for the phase-1 invoke-only seed
- all agent-step rows for the phase-1 invoke-only seed
- all invoke-step rows, invoke bindings, and invoke transition rows for the phase-1 invoke-only seed
- workflow metadata patches that set entry steps for the new workflows

### Required exported shape
Mirror the structural style used by `brainstorming-demo-fixture.ts`.

The new fixture should export something like:
- `setupInvokePhase1FixtureSeedRows`
- `setupInvokePhase1FixtureSeedRowsAllVersions`

### Required workflows in this file

#### `setup_project`
Must seed:
- step 1: form `collect_setup_baseline`
- step 2: agent `synthesize_setup_for_invoke`
- step 3: invoke `invoke_brainstorming_fixed`
- step 4: invoke `invoke_research_from_draft_spec`

#### `brainstorming_primary`
Must seed:
- step 1: form `confirm_brainstorming_seed`
- step 2: invoke `invoke_support_fixed`
- step 3: invoke `invoke_support_from_refs`

#### `research_primary`
Must seed:
- step 1: form `capture_research_topic`

#### `brainstorming_support`
Must seed:
- step 1: form `capture_support_note`

### Required workflow metadata patches
Each of the four workflows must have an explicit `entryStepId` in metadata.

---

## 4. Workflow context-fact implementation inside the new fixture

### `setup_project` context facts to seed

#### Form-bound facts
- `cf_setup_project_kind`
- `cf_setup_initiative_name`
- `cf_setup_workflow_mode`
- `cf_method_project_knowledge_directory`
- `cf_method_planning_artifacts_directory`
- `cf_method_communication_language`
- `cf_method_document_output_language`

#### Agent output facts
- `cf_setup_requires_brainstorming`
- `cf_setup_requires_research`
- `cf_project_overview_artifact`

#### Invoke helper facts
- `cf_setup_brainstorming_draft_spec`
- `cf_setup_research_draft_spec`

### `brainstorming_primary` context facts to seed
- `cf_brainstorming_desired_outcome`
- `cf_brainstorming_selected_direction`
- `cf_brainstorming_support_workflows`

### `research_primary` context facts to seed
- `cf_research_topic`

### `brainstorming_support` context facts to seed
- `cf_support_note`

### Important authored rule
The fixture must seed the **definitions** of these workflow context facts, not just the step rows that reference them.

---

## 5. Agent-step implementation inside the new fixture

## `setup_project.synthesize_setup_for_invoke`

### Required persisted authored fields
Seed a real `methodologyWorkflowAgentSteps` row with:
- `objective`
- `instructionsMarkdown`
- `completionRequirementsJson`
- harness / agent key fields consistent with current seed conventions

### Required explicit write set
Its write items must include:
- `cf_project_overview_artifact`
- `cf_setup_requires_brainstorming`
- `cf_setup_requires_research`
- `cf_setup_brainstorming_draft_spec`
- `cf_setup_research_draft_spec`

### Required authored semantic behavior
The seeded objective/instructions must make clear that the agent:
- creates the `PROJECT_OVERVIEW` artifact reference
- writes at least one brainstorming draft-spec item with:
  - `desired_outcome`
  - `selected_direction`
- writes at least one research draft-spec item with:
  - `research_topic`

### Completion requirements
Because this is phase 1 and runtime-lightweight:
- require only the outputs the invoke flow truly depends on
- do **not** require a giant setup baseline inventory

Recommended completion requirements:
- `cf_project_overview_artifact`
- `cf_setup_brainstorming_draft_spec`
- `cf_setup_research_draft_spec`

---

## 6. Invoke-step implementation inside the new fixture

All four authored invoke variants must be expressed in `methodologyWorkflowInvokeSteps`.

## A. `setup_project.invoke_brainstorming_fixed`

### Rows required
- one step row of type `invoke`
- one invoke-step row with:
  - `targetKind: workflow?` → no, `work_unit`
  - `sourceMode: fixed_set`
  - `workUnitDefinitionId` targeting brainstorming

### Bindings required
Seed `methodologyWorkflowInvokeBindings` rows for:
- `setup_work_unit` from `runtime`
- `desired_outcome` from literal or authored fixed value source
- `selected_direction` from literal or authored fixed value source

### Transition rows required
Seed one `methodologyWorkflowInvokeTransitions` row that:
- points to `brainstorming.activation_to_done`
- restricts allowed workflow ids to `brainstorming_primary`

## B. `setup_project.invoke_research_from_draft_spec`

### Rows required
- one step row of type `invoke`
- one invoke-step row with:
  - `targetKind: work_unit`
  - `sourceMode: context_fact_backed`
  - `contextFactDefinitionId: cf_setup_research_draft_spec`

### Bindings required
Seed rows for:
- `setup_work_unit` from runtime
- `brainstorming_work_unit` from context fact when present
- `research_topic` from context fact

### Artifact mapping required
- `research_report` from selected artifact-slot payload when present in draft-spec item

### Transition rows required
One invoke transition row targeting:
- `research.activation_to_done`
- allowed workflow ids: `research_primary`

## C. `brainstorming_primary.invoke_support_fixed`

### Rows required
- one step row of type `invoke`
- one invoke-step row with:
  - `targetKind: workflow`
  - `sourceMode: fixed_set`
  - `workflowDefinitionIds: [brainstorming_support]`

### Bindings/transitions
- no invoke bindings
- no invoke transitions

## D. `brainstorming_primary.invoke_support_from_refs`

### Rows required
- one step row of type `invoke`
- one invoke-step row with:
  - `targetKind: workflow`
  - `sourceMode: context_fact_backed`
  - `contextFactDefinitionId: cf_brainstorming_support_workflows`

### Supporting workflow-reference fact rows
- seed the workflow-reference context fact definition
- seed at least one allowed workflow reference row pointing to `brainstorming_support`

---

## 7. Table-level seed aggregator files to update

These files should pull in the new fixture rows where appropriate.

## `packages/scripts/src/seed/methodology/tables/methodology-workflow-steps.seed.ts`

### Current state
- currently exports only `setupWorkflowStepSeedRows`

### Required update
Concatenate in the new fixture’s workflow-step rows.

### Target shape
Export should include:
- existing canonical rows from `setup-bmad-mapping.ts`
- `setupInvokePhase1FixtureSeedRowsAllVersions.flatMap((rows) => rows.methodology_workflow_steps)` or equivalent flattened source

## `packages/scripts/src/seed/methodology/tables/methodology-workflow-edges.seed.ts`

### Required update
Concatenate in the new fixture’s workflow-edge rows.

## `packages/scripts/src/seed/methodology/tables/methodology-workflows.seed.ts`

### Likely update
Only update if the four new workflows are not already generated canonically in `setup-bmad-mapping.ts`.

Preferred approach:
- generate these workflow rows canonically in `setup-bmad-mapping.ts`
- avoid fixture-owned workflow row duplication

## Additional table files
Update or create the corresponding table seed exports for any workflow-owned rows that are currently centralized elsewhere, such as:
- workflow context fact definitions
- workflow context fact plain values / external bindings / workflow references / draft specs / draft-spec selections
- workflow agent steps
- workflow agent explicit read grants
- workflow agent write items / write requirements
- workflow invoke steps
- workflow invoke bindings
- workflow invoke transitions

Implementation rule:
- follow the same aggregation pattern used by the brainstorming demo fixture rows today
- do not invent a second aggregation style

---

## 8. Tests to add or update

## A. Add a new fixture-focused seed test

### New file
`packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts`

### What it must verify
- the fixture exports the expected four workflows
- `setup_project` has 4 steps: `form`, `agent`, `invoke`, `invoke`
- `brainstorming_primary` has 3 steps: `form`, `invoke`, `invoke`
- `research_primary` has 1 form step
- `brainstorming_support` has 1 form step
- all four invoke quadrants are present across the fixture
- setup includes both draft-spec helper facts
- brainstorming includes the support-workflow reference fact
- brainstorming fixed work-unit invoke includes bindings that prefill `desired_outcome` and `selected_direction`
- setup agent write surfaces include `cf_project_overview_artifact`

## B. Update seed integration tests if needed

Files to inspect/update:
- `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
- `packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`
- `packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts`

### Expected work
- ensure the new fixture rows are included in global seed integrity checks
- ensure there are no duplicate ids/keys across the richer brainstorming fixture and the new setup invoke fixture

## C. Preserve existing brainstorming fixture test

### File
`packages/scripts/src/tests/seeding/l3-brainstorming-demo-fixture.test.ts`

### Rule
- keep this test green
- do not repurpose it into the new fixture test
- only update it if shared aggregators now include extra rows that alter expected counts globally

---

## 9. Id and naming conventions

### Recommended fixture id prefix
Use a dedicated prefix, not the existing brainstorming fixture prefix.

Recommended base:
- `seed:l3-setup-invoke:...`

Examples:
- `seed:l3-setup-invoke:setup:mver_bmad_v1_active:step:collect-setup-baseline`
- `seed:l3-setup-invoke:brainstorming:mver_bmad_v1_active:step:confirm-brainstorming-seed`

### Why
- avoids collision with `seed:l3-brainstorming:...`
- makes test snapshots and seed integrity failures easy to interpret

---

## 10. Recommended implementation order

### Wave 1 — canonical methodology scaffolding
1. update `setup-bmad-mapping.ts` workflow rows / transition bindings / empty condition sets
2. confirm artifact-slot definitions

### Wave 2 — new fixture authoring
3. add `setup-invoke-phase-1-fixture.ts`
4. seed workflow context facts, steps, edges, agent rows, invoke rows, bindings, invoke transitions

### Wave 3 — table wiring
5. wire fixture rows into table-level seed export files

### Wave 4 — tests
6. add `setup-invoke-phase-1-fixture.test.ts`
7. update integrity/integration tests as needed

---

## 11. Guardrails

Do not add in phase 1:
- branch steps
- action steps
- propagation assumptions
- non-empty transition gates
- additional work-unit families beyond setup/brainstorming/research
- richer BMAD baseline-discovery condition logic

Do preserve in phase 1:
- all four invoke quadrants
- separate work-unit vs workflow invoke surfaces
- invoke-created brainstorming prefills
- project-overview artifact reference written by the setup agent
- real transition ids and workflow bindings

---

## 12. End State Definition

Implementation is correctly mapped when:
- the canonical methodology rows exist for the four target workflows and three transitions
- a new setup-invoke fixture seeds all authored rows for the phase-1 journey
- table-level seed exports include those rows
- dedicated fixture tests prove the expected step graph, fact graph, and four invoke variants
- no existing richer fixture is overwritten or semantically downgraded
