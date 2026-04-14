# Setup-First BMAD Mapping Spec for Chiron

## Status
- Proposed implementation-ready spec
- Scope: `WU.SETUP` only
- Purpose: derive a Chiron-native setup work unit from BMAD's real starting behaviors

## Current Code Authority

This spec is derived from current code, not stale docs.

Primary authority surfaces:
- `packages/contracts/src/methodology/workflow.ts`
- `packages/methodology-engine/src/services/branch-step-definition-service.ts`
- `packages/methodology-engine/src/services/invoke-step-definition-service.ts`
- `packages/db/src/schema/methodology.ts`
- `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
- `packages/scripts/src/seed/methodology/setup/brainstorming-demo-fixture.ts`

Implementation note:
- current code truth for agent steps is persisted through `methodologyWorkflowAgentSteps` with required `objective` and required `instructionsMarkdown`
- current workflow-editor read model still treats `agent` as deferred at the generic workflow contract layer, but the seed/runtime storage and runtime services already use the concrete agent-step schema

## Core Decision

`WU.SETUP` is the canonical **bootstrap + baseline discovery + routing** layer.

It must **not** become a shadow product brief, shadow research workflow, or embedded brainstorming session.

Setup owns:
- project bootstrap inputs
- brownfield baseline discovery
- durable setup outputs
- routing signals for downstream work

Setup does **not** own:
- target users
- value proposition
- success metrics
- product narrative
- market framing
- external evidence gathering
- ideation/divergence
- requirements definition

Those belong downstream.

---

## BMAD-to-Chiron Boundary Mapping

### BMAD responsibilities that map into `WU.SETUP`

1. **Config/bootstrap concerns** from `bmad-init`
   - communication language
   - document output language
   - output/pathing roots

2. **Brownfield documentation/bootstrap** from `bmad-document-project`
   - initial scan
   - full rescan
   - deep-dive scan
   - existing project context discovery

3. **Durable context generation** from `bmad-generate-project-context`
   - project-context / durable setup artifact generation

### BMAD responsibilities that stay downstream

- `bmad-brainstorming` → `WU.BRAINSTORMING`
- market/domain/technical research → `WU.RESEARCH`
- `bmad-product-brief` → downstream planning/intake work unit
- `bmad-create-prd` → downstream PRD work unit

---

## Work Unit Contract

### Key
- `setup`

### Cardinality
- `one_per_project`

### Purpose
- establish enough durable project baseline that downstream work units stop rediscovering the project

### Completion meaning
- project baseline is established
- setup artifact(s) are durable
- downstream routing signals are explicit

---

## Lifecycle

### States
- `done`

### Transition
- `activation_to_done`

### Completion gates

The setup transition completion set should require:
- `initiative_name`
- `project_kind`
- `project_knowledge_directory`
- `planning_artifacts_directory`
- `communication_language`
- `document_output_language`
- `workflow_mode`
- `scan_level`

Conditional gate:
- if `workflow_mode = deep_dive`, require `deep_dive_target`

Recommended soft gate, not hard gate:
- durable setup artifact exists (`PROJECT_OVERVIEW`)

---

## Fact Model

`project_root_directory` is **not** a setup fact.

Reason:
- it already belongs to the project record
- all setup paths are repo-relative
- duplicating it as a setup fact introduces drift risk

### Section 1 — Project / methodology facts

These facts live at the shared project/methodology layer.

Setup may capture them, confirm them, or populate them, but they are not setup-local facts.

This section includes both:
- project/methodology bootstrap facts needed by setup
- project/methodology baseline facts produced by setup discovery

#### 1. `project_knowledge_directory`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- external source: methodology fact definition
- fact type: `string`
- cardinality: `one`
- validation: repo-relative directory path

#### 2. `planning_artifacts_directory`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- external source: methodology fact definition
- fact type: `string`
- cardinality: `one`
- validation: repo-relative directory path

#### 3. `communication_language`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- external source: methodology fact definition
- fact type: `string`
- cardinality: `one`
- validation: allowed values or freeform string per methodology fact definition

#### 4. `document_output_language`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- external source: methodology fact definition
- fact type: `string`
- cardinality: `one`
- validation: allowed values or freeform string per methodology fact definition

#### 5. `repository_type`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- fact type: `string`
- cardinality: `one`
- description: detected repository shape for the current project baseline
- guidance: classify repo shape conservatively from actual structure; do not invent architecture labels unsupported by the repo
- validation: allowed values to be locked during implementation (`single_package`, `monorepo`, `docs_only`, `unknown` minimum baseline)

#### 6. `project_parts`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- fact type: `json`
- cardinality: `many`
- description: structured inventory of meaningful project parts discovered during setup that downstream workflows may target independently
- guidance: create one entry per meaningful project area, not one entry per file or folder. A project part should represent something downstream work might reason about on its own: an app, package, service, docs area, infra area, workflow surface, or integration boundary. Keep keys stable and repo-oriented. Example entries: `web-app`, `server-api`, `shared-contracts`, `seed-methodology`, `docs-architecture`.
- shape:
```json
{
  "key": "stable machine key",
  "name": "human-readable name",
  "kind": "app | package | service | library | docs | infra | workflow_surface | unknown",
  "path": "repo-relative path",
  "summary": "short purpose summary"
}
```

Nested field contract:
- `key`
  - required
  - lowercase kebab-case
  - stable across rescans unless the part itself is renamed
- `name`
  - required
  - user-facing display name
- `kind`
  - required
  - allowed values:
    - `app`
    - `package`
    - `service`
    - `library`
    - `docs`
    - `infra`
    - `workflow_surface`
    - `unknown`
- `path`
  - required
  - repo-relative only
  - should normally reference a directory root; file paths are allowed only for thin surfaces that truly collapse to one file
  - validation:
    - trim whitespace
    - disallow absolute paths
    - prevent traversal
- `summary`
  - required
  - one short explanation of what this part is responsible for

#### 7. `technology_stack_by_part`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- fact type: `json`
- cardinality: `many`
- description: structured mapping of technologies used by each project part
- guidance: preserve traceability to `project_parts` via `project_part_key` and only record technologies you can justify from the repo/docs. Example: `{ "project_part_key": "web-app", "layer": "frontend", "technology": "React", "role": "ui-framework" }`.
- shape:
```json
{
  "project_part_key": "string",
  "layer": "string",
  "technology": "string",
  "role": "string",
  "notes": "string"
}
```

#### 8. `existing_documentation_inventory`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- fact type: `json`
- cardinality: `many`
- description: inventory of existing durable documentation discovered during setup
- guidance: include only documentation that materially helps downstream work. Prefer stable repo-relative paths and classify docs by purpose rather than by storage folder alone. Example: architecture docs, onboarding guides, ADRs, API docs, runbooks.
- shape:
```json
{
  "path": "repo-relative path",
  "kind": "architecture | onboarding | api | adr | runbook | planning | reference | unknown",
  "audience": "human | ai | mixed",
  "summary": "short summary"
}
```

Nested field contract:
- `path`
  - required
  - repo-relative
  - usually a file path, but directory paths are allowed for doc sets
  - validation:
    - trim whitespace
    - disallow absolute paths
    - prevent traversal
- `kind`
  - required
  - allowed values:
    - `architecture`
    - `onboarding`
    - `api`
    - `adr`
    - `runbook`
    - `planning`
    - `reference`
    - `unknown`
- `audience`
  - required
  - allowed values:
    - `human`
    - `ai`
    - `mixed`
- `summary`
  - required
  - concise explanation of what the doc helps answer

#### 9. `integration_points`
- owner: methodology/project-global fact
- fact kind in workflows: `bound_external_fact`
- fact type: `json`
- cardinality: `many`
- description: structured list of system boundaries or interfaces that matter for downstream work
- guidance: capture only durable integration surfaces, not incidental imports or function calls. Example: frontend → API boundary, server → database boundary, auth provider integration, external webhook consumer, MCP/tooling integration.
- shape:
```json
{
  "name": "integration name",
  "kind": "api | database | auth | queue | file_system | external_service | tooling | unknown",
  "source_part_key": "project part key",
  "target": "target system or part",
  "notes": "short notes"
}
```

Nested field contract:
- `name`
  - required
  - human-readable identifier for the integration surface
- `kind`
  - required
  - allowed values:
    - `api`
    - `database`
    - `auth`
    - `queue`
    - `file_system`
    - `external_service`
    - `tooling`
    - `unknown`
- `source_part_key`
  - required
  - must reference an existing `project_parts.key`
- `target`
  - required
  - freeform but durable identifier for the thing on the other side of the boundary
- `notes`
  - optional but strongly recommended
  - brief explanation of the integration contract or why it matters downstream

### Section 2 — Setup work-unit facts

These facts belong to the `setup` work unit itself.

They cover:
- setup-owned bootstrap inputs
- setup execution-mode inputs
- setup-owned agent-derived routing outputs

#### 10. `initiative_name`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `string`
- cardinality: `one`
- validation: none

#### 11. `project_kind`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `string`
- cardinality: `one`
- validation: allowed values `greenfield | brownfield`

#### 12. `workflow_mode`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `string`
- cardinality: `one`
- validation: allowed values `initial_scan | full_rescan | deep_dive`

#### 13. `scan_level`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `string`
- cardinality: `one`
- validation: allowed values `quick | deep | exhaustive`

#### 14. `deep_dive_target`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `json`
- cardinality: `one`
- description: structured selector for a focused setup scan target when the user wants a deep dive instead of a whole-project baseline pass
- guidance: use this only when `workflow_mode = deep_dive`. The target must stay repo-relative and should identify the smallest meaningful scope to inspect in detail. Prefer directory targets for subsystems/packages and file targets for single critical documents/configs. Example directory target: “scan only `apps/web` as a UI-heavy project part.” Example file target: “scan only `docs/architecture/methodology-bmad-setup-mapping.md` to refresh setup context.”
- validation: JSON schema with repo-relative path validation on `target_path`
- shape:
```json
{
  "target_type": "package | directory | file | doc_set | workflow_surface",
  "target_path": "repo-relative path",
  "target_name": "human-readable label",
  "target_scope": "structure | docs | workflow | mixed"
}
```

Nested field contract:
- `target_type`
  - required
  - allowed values:
    - `package` — a package/app/service style unit
    - `directory` — a repo-relative folder subtree
    - `file` — one repo-relative file
    - `doc_set` — a documentation-oriented directory or doc cluster
    - `workflow_surface` — a workflow-specific implementation surface spanning multiple files
- `target_path`
  - required
  - repo-relative only
  - path validation:
    - trim whitespace
    - disallow absolute paths
    - prevent traversal
  - semantics by `target_type`:
    - `package`, `directory`, `doc_set` → should resolve to a directory-like target
    - `file` → should resolve to a single file
    - `workflow_surface` → may point to a representative root path or anchor file for the surface
- `target_name`
  - required
  - human-readable display label for prompts/artifacts
- `target_scope`
  - required
  - allowed values:
    - `structure` — focus on code/module structure
    - `docs` — focus on existing documentation
    - `workflow` — focus on workflow/authoring/runtime seams
    - `mixed` — intentionally combine multiple lenses

### Setup-owned agent-derived routing outputs

These are not user-entered bootstrap inputs.

They are setup-owned output signals produced by the setup analysis/agent step after baseline discovery.

#### 15. `requires_brainstorming`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `boolean`
- cardinality: `one`
- description: signal that setup found enough ambiguity or open option space to justify an explicit brainstorming pass
- guidance: set to `true` only when widening the solution space would materially improve downstream work; do not use as a generic “uncertain” flag

#### 16. `requires_product_brief`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `boolean`
- cardinality: `one`
- description: signal that setup established project baseline but product intent is still insufficiently defined for downstream planning
- guidance: set to `true` when a downstream product-brief-style workflow is still needed to define audience, value, scope framing, or intent

#### 17. `requires_research`
- owner: current work unit (`setup`)
- fact kind in workflows: `definition_backed_external_fact`
- fact type: `boolean`
- cardinality: `one`
- description: signal that setup uncovered unanswered questions that require explicit evidence gathering before downstream planning or execution
- guidance: set to `true` when setup can identify the gap but should not answer it without a dedicated research work unit

### Section 3 — Setup workflow context facts

These facts are not durable project baseline themselves.

They exist to let the setup workflow branch and invoke downstream work in a typed way.

They should reference facts defined in **Section 1** and **Section 2**, not redefine those facts inline.

#### 18. `brainstorming_workflows`
- owner: workflow-level helper fact
- fact kind: `workflow_reference_fact`
- fact type: workflow reference
- cardinality: `many`
- purpose: selectable brainstorming support/primary workflows for invoke targeting

#### 19. `research_workflows`
- owner: workflow-level helper fact
- fact kind: `workflow_reference_fact`
- fact type: workflow reference
- cardinality: `many`
- purpose: selectable research workflows for invoke targeting

#### 20. `brainstorming_draft_spec`
- owner: workflow-level helper fact
- fact kind: `work_unit_draft_spec_fact`
- cardinality: `many`
- explicit target work unit: `brainstorming`
- selected fact definitions:
  - `setup_work_unit`
  - `objectives`
  - `desired_outcome`
  - `constraints`
  - `session_notes_file`
  - `estimated_research_effort`
- selected artifact slots:
  - `brainstorming_session`

#### 21. `research_draft_spec`
- owner: workflow-level helper fact
- fact kind: `work_unit_draft_spec_fact`
- cardinality: `many`
- explicit target work unit: `research`
- selected fact definitions:
  - `setup_work_unit`
  - `brainstorming_work_unit`
  - `research_topic`
  - `research_goals`
  - `scope_notes`
- selected artifact slots:
  - `research_report`

#### 22. `project_overview_artifact`
- owner: workflow-level helper fact
- fact kind: `artifact_reference_fact`
- cardinality: `one`
- artifact slot: `PROJECT_OVERVIEW`

---

## Workflow Set

### 1. `setup_project`
- primary workflow
- transition bound by default
- owns setup completion

### 2. `document_project`
- supporting workflow
- setup-owned
- brownfield scan/bootstrap support workflow
- derived from BMAD `document-project`

### 3. `generate_project_context`
- supporting workflow
- setup-owned
- durable context generation support workflow

### 4. `route_setup_follow_ups`
- optional supporting workflow if we want a visible routing flow
- otherwise fold its behavior into branch + invoke steps inside `setup_project`

Recommendation:
- do **not** create a separate routing workflow initially
- use branch + invoke inside `setup_project`

### Future stub: `propagate_setup_outputs`
- step type: `action`
- status: document-only stub
- include in spec intent, **not** in current seed data
- rationale: current code still treats `action` as deferred/non-authorable, so setup should not rely on it for the first seed implementation
- future purpose:
  - propagate setup outputs into project-level facts/artifacts with a dedicated typed mutation step
  - perform explicit post-agent propagation/synchronization once `action.v1` is implemented

---

## Primary Workflow Spec: `setup_project`

### Step 1 — `collect_setup_baseline`
- type: `form`
- purpose: capture the stable baseline inputs once

#### Seed-ready form field contract

| sort | field key | label | context fact | required | notes |
|---|---|---|---|---|---|
| 0 | `initiativeName` | Initiative Name | `cf_setup_initiative_name` | yes | canonical project/initiative name for setup |
| 1 | `projectKind` | Project Kind | `cf_setup_project_kind` | yes | `greenfield` or `brownfield` |
| 2 | `projectKnowledgeDirectory` | Project Knowledge Directory | `cf_setup_project_knowledge_directory` | yes | repo-relative documentation/context root |
| 3 | `planningArtifactsDirectory` | Planning Artifacts Directory | `cf_setup_planning_artifacts_directory` | yes | repo-relative planning output root |
| 4 | `communicationLanguage` | Communication Language | `cf_method_communication_language` | yes | language for interactive collaboration |
| 5 | `documentOutputLanguage` | Document Output Language | `cf_method_document_output_language` | yes | language for generated durable artifacts |
| 6 | `workflowMode` | Workflow Mode | `cf_setup_workflow_mode` | yes | determines setup execution pattern |
| 7 | `scanLevel` | Scan Level | `cf_setup_scan_level` | yes | controls breadth/depth of setup scan |
| 8 | `deepDiveTarget` | Deep Dive Target | `cf_setup_deep_dive_target` | conditional | required only when `workflow_mode = deep_dive` |

#### Form behavior notes
- `deepDiveTarget` should stay hidden or disabled unless `workflow_mode = deep_dive`
- all field bindings reference workflow context facts, which in turn reference facts defined in Section 1 and Section 2
- no field in this step should bind directly to `project_root_directory`

### Step 2 — `synthesize_setup_baseline`
- type: `agent`
- purpose: analyze baseline inputs and produce discovered project context + routing signals

#### Agent objective only
Use **objective** as the authoritative authored intent surface.

Current code constraint:
- persisted agent steps still require `instructionsMarkdown`

Setup-specific rule:
- the authored semantic source is `objective`
- `instructionsMarkdown` is implementation shim text only until the schema/editor are simplified
- setup should not rely on bespoke instruction prose for meaning that is not already present in the objective and declared read/write contracts

#### Agent writes
- `repository_type`
- `project_parts`
- `technology_stack_by_part`
- `existing_documentation_inventory`
- `integration_points`
- `requires_brainstorming`
- `requires_product_brief`
- `requires_research`
- `PROJECT_OVERVIEW`

#### Seed-ready objective
`Analyze the setup baseline, determine the real project shape, produce durable project context, and emit downstream routing signals. If the project is brownfield, synthesize a concise but high-signal baseline from the existing repo and documentation. Populate only setup-owned outputs and shared project baseline facts needed for downstream workflows. Do not invent product strategy, user segments, value proposition, success metrics, or requirements.`

#### Seed-ready instructionsMarkdown (implementation shim)
`Use the captured setup baseline facts plus any discoverable repo/documentation context to classify the project, inventory meaningful project parts, map technology stack by part, inventory durable documentation, identify meaningful integration points, and write routing recommendations. Produce a PROJECT_OVERVIEW artifact that summarizes the setup baseline and what should happen next. Keep outputs grounded in the available project context and limit writes to the declared write set.`

#### Explicit read set
- `cf_setup_initiative_name`
- `cf_setup_project_kind`
- `cf_setup_project_knowledge_directory`
- `cf_setup_planning_artifacts_directory`
- `cf_setup_workflow_mode`
- `cf_setup_scan_level`
- `cf_setup_deep_dive_target`
- `cf_method_communication_language`
- `cf_method_document_output_language`

#### Explicit write set
- `cf_method_repository_type`
- `cf_method_project_parts`
- `cf_method_technology_stack_by_part`
- `cf_method_existing_documentation_inventory`
- `cf_method_integration_points`
- `cf_setup_requires_brainstorming`
- `cf_setup_requires_product_brief`
- `cf_setup_requires_research`
- `cf_project_overview_artifact`

#### Objective boundary
The agent should produce:
- baseline project context
- brownfield discovery synthesis
- next-step routing recommendation

The agent should **not** produce:
- target users
- commercial framing
- value proposition
- success metrics
- detailed requirements

#### Agent persisted configuration
- `objective`: required, setup-authored source of truth
- `instructionsMarkdown`: required by current schema, but should remain thin and derivative
- `completionRequirementsJson`: should require `cf_setup_requires_brainstorming`, `cf_setup_requires_product_brief`, `cf_setup_requires_research`, and `cf_project_overview_artifact`
- explicit read grants: exactly the explicit read set above
- write items: exactly the explicit write set above, each with stable `writeItemId`

#### Suggested write item ids
- `repository_type`
- `project_parts`
- `technology_stack_by_part`
- `existing_documentation_inventory`
- `integration_points`
- `requires_brainstorming`
- `requires_product_brief`
- `requires_research`
- `PROJECT_OVERVIEW`

### Step 3 — `branch_need_document_project`
- type: `branch`
- purpose: decide whether the setup run must first perform a brownfield/documentation scan before any downstream work creation

#### Branch fact scope
Branch inspects workflow-level context facts only.

#### Routes

##### Route A — `needs_brownfield_scan`
- target: `invoke_document_project`
- mode: `all`
- conditions:
  - `cf_setup_project_kind` `equals` `brownfield`
  - OR `cf_setup_workflow_mode` `equals` `full_rescan`
  - OR `cf_setup_workflow_mode` `equals` `deep_dive`

##### Default route
- target: `branch_need_brainstorming`

### Step 4 — `invoke_document_project`
- type: `invoke`
- invoke target: `workflow`
- source mode: `fixed_set`
- selected workflow: `document_project`
- workflowDefinitionIds: `[document_project]`

Purpose:
- run brownfield scan/bootstrap support

#### Seed-ready invoke config
- `targetKind`: `workflow`
- `sourceMode`: `fixed_set`
- `workflowDefinitionIds`: `[document_project]`
- authored bindings: none
- authored transitions: none

Edge after completion:
- `invoke_document_project -> branch_need_brainstorming`

### Step 5 — `branch_need_brainstorming`
- type: `branch`
- purpose: decide whether setup should create downstream brainstorming work units

#### Routes

##### Route A — `needs_brainstorming`
- target: `invoke_brainstorming_work`
- mode: `all`
- conditions:
  - `cf_setup_requires_brainstorming` `equals` `true`

##### Default route
- target: `branch_need_research`

### Step 6 — `invoke_brainstorming_work`
- type: `invoke`
- invoke target: `work_unit`
- source mode: `context_fact_backed`
- draft spec source: `brainstorming_draft_spec`

Purpose:
- create one or more downstream brainstorming work units from setup

Bindings:
- current setup work unit → target brainstorming `setup_work_unit`
- setup routing/baseline outputs can inform brainstorming objective generation

#### Seed-ready invoke config
- `targetKind`: `work_unit`
- `sourceMode`: `context_fact_backed`
- `contextFactDefinitionId`: `cf_setup_brainstorming_draft_spec`
- required bindings:
  - destination `setup_work_unit` ← source `runtime`
- activation transitions:
  - use authored `workflowDefinitionIds` on transitions to constrain which brainstorming workflows may be created from this invoke
- note:
  - current work-unit invoke code selects downstream workflow ids from activation transitions, not from a separate workflow-reference context fact

Edge after completion:
- `invoke_brainstorming_work -> branch_need_research`

### Step 7 — `branch_need_research`
- type: `branch`
- purpose: decide whether setup should create downstream research work units

#### Routes

##### Route A — `needs_research`
- target: `invoke_research_work`
- mode: `all`
- conditions:
  - `cf_setup_requires_research` `equals` `true`

##### Default route
- target: `branch_need_context_generation`

### Step 8 — `invoke_research_work`
- type: `invoke`
- invoke target: `work_unit`
- source mode: `context_fact_backed`
- draft spec source: `research_draft_spec`

Purpose:
- create one or more downstream research work units from setup

Bindings:
- current setup work unit → target research `setup_work_unit`
- optional branching linkage from invoked brainstorming results if available later

#### Seed-ready invoke config
- `targetKind`: `work_unit`
- `sourceMode`: `context_fact_backed`
- `contextFactDefinitionId`: `cf_setup_research_draft_spec`
- required bindings:
  - destination `setup_work_unit` ← source `runtime`
- optional future binding:
  - downstream `brainstorming_work_unit` may be supplied from runtime-created brainstorming refs when that chaining is implemented
- activation transitions:
  - use authored `workflowDefinitionIds` on transitions to constrain which research workflows may be created from this invoke

Edge after completion:
- `invoke_research_work -> branch_need_context_generation`

### Step 9 — `branch_need_context_generation`
- type: `branch`
- purpose: decide whether the durable project context generation workflow should run before setup completes

#### Routes

##### Route A — `needs_context_generation`
- target: `invoke_generate_project_context`
- mode: `all`
- conditions:
  - `cf_project_overview_artifact` `exists`

##### Default route
- target: `complete_setup`

### Step 10 — `invoke_generate_project_context`
- type: `invoke`
- invoke target: `workflow`
- source mode: `fixed_set`
- selected workflow: `generate_project_context`

#### Seed-ready invoke config
- `targetKind`: `workflow`
- `sourceMode`: `fixed_set`
- `workflowDefinitionIds`: `[generate_project_context]`
- authored bindings: none
- authored transitions: none

Edge after completion:
- `invoke_generate_project_context -> complete_setup`

### Workflow context-fact matrix for `setup_project`

#### Group 3A — Form-bound workflow context facts
- `cf_setup_initiative_name`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `initiative_name`
- `cf_setup_project_kind`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `project_kind`
- `cf_setup_project_knowledge_directory`
  - kind: `bound_external_fact`
  - external fact: methodology fact `project_knowledge_directory`
- `cf_setup_planning_artifacts_directory`
  - kind: `bound_external_fact`
  - external fact: methodology fact `planning_artifacts_directory`
- `cf_setup_workflow_mode`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `workflow_mode`
- `cf_setup_scan_level`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `scan_level`
- `cf_setup_deep_dive_target`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `deep_dive_target`
- `cf_method_communication_language`
  - kind: `bound_external_fact`
  - external fact: methodology fact `communication_language`
- `cf_method_document_output_language`
  - kind: `bound_external_fact`
  - external fact: methodology fact `document_output_language`

#### Group 3B — Agent read/write workflow context facts
- `cf_method_repository_type`
  - kind: `bound_external_fact`
  - external fact: methodology fact `repository_type`
- `cf_method_project_parts`
  - kind: `bound_external_fact`
  - external fact: methodology fact `project_parts`
- `cf_method_technology_stack_by_part`
  - kind: `bound_external_fact`
  - external fact: methodology fact `technology_stack_by_part`
- `cf_method_existing_documentation_inventory`
  - kind: `bound_external_fact`
  - external fact: methodology fact `existing_documentation_inventory`
- `cf_method_integration_points`
  - kind: `bound_external_fact`
  - external fact: methodology fact `integration_points`
- `cf_setup_requires_brainstorming`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `requires_brainstorming`
- `cf_setup_requires_product_brief`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `requires_product_brief`
- `cf_setup_requires_research`
  - kind: `definition_backed_external_fact`
  - external fact: current setup fact `requires_research`
- `cf_project_overview_artifact`
  - kind: `artifact_reference_fact`
  - artifact slot: `PROJECT_OVERVIEW`

#### Group 3C — Branch-visible routing workflow context facts

The branch step should make decisions only from workflow context facts, not by reading work-unit facts directly.

- `cf_setup_project_kind`
- `cf_setup_workflow_mode`
- `cf_setup_requires_brainstorming`
- `cf_setup_requires_product_brief`
- `cf_setup_requires_research`
- `cf_project_overview_artifact`

Branch design note:
- current branch semantics choose exactly one next route
- therefore setup should use multiple branch steps in sequence when it may need to create both brainstorming and research work in one run
- do **not** model setup fan-out as one branch with mutually exclusive routes if both downstream invokes may be needed

#### Group 3D — Invoke helper workflow context facts
- `cf_setup_document_project_workflow`
  - kind: `workflow_reference_fact`
  - cardinality: `one`
  - allowed workflows: `document_project`
- `cf_setup_generate_project_context_workflow`
  - kind: `workflow_reference_fact`
  - cardinality: `one`
  - allowed workflows: `generate_project_context`
- `cf_setup_brainstorming_draft_spec`
  - kind: `work_unit_draft_spec_fact`
  - target work unit: `brainstorming`
  - selected facts/artifacts: as defined above
- `cf_setup_research_draft_spec`
  - kind: `work_unit_draft_spec_fact`
  - target work unit: `research`
  - selected facts/artifacts: as defined above

Purpose:
- create/update durable AI/project-context output from the setup baseline

### Step 11 — `complete_setup`
- type: `agent` or terminal no-op completion step depending on editor/runtime conventions
- purpose: finalize setup and satisfy completion transition contract

---

## Why branch + invoke belong in setup

The user explicitly wants setup to showcase that one workflow can create a lot of downstream project structure.

This spec supports that while keeping setup bounded:
- setup itself stays baseline-oriented
- branch decides which downstream creation paths to take
- invoke performs the actual workflow/work-unit fan-out
- brainstorming and research remain separate work units even if setup creates them

So setup can create a lot of things **without becoming those things**.

---

## Required seed/documentation updates

### Update current setup seed facts
- add `communication_language`
- add `document_output_language`
- add `requires_research`
- remove any setup-level duplication of `project_root_directory`

### Update current setup runtime fixture
- expand from current thin `form -> agent` slice
- add:
  - branch step
  - workflow invoke(s)
  - work-unit invoke(s)
  - draft spec helper facts

### Intentional implementation gap
- current live setup seeds/tests still treat `project_knowledge_directory` and `planning_artifacts_directory` as setup work-unit facts
- this spec intentionally moves them to project/methodology-global ownership
- when implementation starts, update seeds/tests consistently instead of mixing the two ownership models

### Update setup artifact semantics
`PROJECT_OVERVIEW` should be redefined as:
- baseline context artifact
- not product brief
- not requirements artifact

### Update setup agent contract
- objective remains authoritative
- instructions field remains schema-required for now, but should stay thin and derivative until code cleanup removes it from meaningful setup authoring

---

## Guardrails

If setup starts producing:
- target users
- product narrative
- success metrics
- detailed requirements

then setup has become a shadow product brief and the mapping is wrong.

If setup requires external evidence gathering to complete, that work should split into research.

If brainstorming becomes mandatory for all setup runs, setup is too broad.

---

## Summary

This spec defines a Chiron-native setup work unit derived from BMAD reality:

- no literal BMAD setup workflow exists
- Chiron setup should absorb bootstrap + baseline discovery + routing
- brainstorming and research can be invoked from setup without being collapsed into setup
- product brief remains downstream
- branch + invoke are the correct primitives for showcasing multi-work-unit creation in one setup workflow
