# Draft: L3 Slice 1 Form Dialog Refinement

## Requirements (confirmed)
- Refine slice-1 so the Form step is a good feature, not a stub.
- Workflow context facts should be defined at the workflow-editor level and reused by the Form step.
- The Form step should link to workflow context facts rather than defining context facts inline.
- Re-think the Form create/edit dialog structure and tab model.
- Reuse the existing L1/L2 dirty-indicator and dialog patterns instead of ad-hoc slice-1 behavior.

## Technical Decisions
- Treat the current stubbed Form dialog implementation as drift from the intended slice-1 design, not as the target design.
- Remove inline context-fact authoring responsibility from the Form dialog; move it to a dedicated workflow-editor context-fact-definition surface.
- Form field behavior should be derived from linked workflow context-fact definitions.
- Lock the Form step dialog tabs to `Contract`, `Fields`, and `Guidance` only.
- The `Fields` tab should own ordered field bindings to workflow context-fact definitions plus per-binding presentation/requirement overrides.
- `Context Facts` must not be a Form-dialog tab; workflow context-fact CRUD belongs at the workflow-editor level.
- Cardinality belongs to workflow context-fact definitions/CRUD, not to Form field bindings.
- Field rows should be card-based inline editors inside the `Fields` tab; no stacked add/edit dialog is needed for slice-1 field rows.
- The field-row region must become viewport-bounded and scrollable using the same dialog scroll-region pattern already used in L1/L2 dialogs.
- `required` is owned by the Form field binding.
- `fieldKey` should auto-derive from the bound context-fact key by default, with editable override allowed.
- Form-field bindings may define a UI multiplicity mode only when the linked workflow context fact has cardinality `many`; that mode may narrow `many -> one`, but may not widen `one -> many`.
- If the Fields tab has no reusable workflow context-fact options, the user should go through a separate workflow-level context-fact creation flow rather than inline creation inside the field-binding flow.
- Within a single Form step definition, a workflow context fact may be bound to at most one field binding. The same context fact may still be reused by a different Form step definition.
- The Fields tab empty/fully-bound state must not deep-link or auto-open context-fact CRUD; it should only instruct the user to use the separate `Context Facts` area manually.
- Context-fact kind should be locked after creation in slice-1; changing kind requires delete + recreate.
- For `plain_value_fact`, `Value Type` remains editable after creation in slice-1.
- Changing `Value Type` must deterministically clear or reset incompatible value-semantics configuration rather than preserving stale configuration from the previous type.
- Deleting a context fact should go through a clearly destructive confirmation dialog.
- Workflow context-fact definitions should carry `guidanceJson` on the root definition row.
- The context-fact dialog `Contract` tab is limited strictly to: key, label/display name, description `{ markdown }`, fact kind, and cardinality.
- The context-fact dialog `Value Semantics` tab owns the actual definition semantics for the chosen fact kind; no kind-specific definition fields belong in `Contract`.
- `plain_value_fact` is now treated as locked for this refinement pass: `Contract` owns only key/label/description/kind/cardinality; `Value Semantics` owns value type and type-specific configuration; JSON uses the exact same card-based sub-schema UX, behavior, and labels as the methodology fact dialog.

## Research Findings
- `apps/web/src/features/workflow-editor/dialogs.tsx` currently hardcodes `Contract *` and renders `Fields authoring coming in slice-2` plus `Context facts authoring coming in slice-2`, which conflicts with the intended slice-1 scope.
- `packages/contracts/src/methodology/workflow.ts` currently puts both `fields` and `contextFacts` inside `FormStepPayload`, which weakens the desired separation between workflow-level context-fact definitions and Form-level field bindings.
- Existing L1/L2 dialogs already implement per-tab dirty indicators and discard flows in `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx`, `ArtifactSlotsTab.tsx`, and `StateMachineTab.tsx`.
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` already has a separate `Context Fact Definitions` section, which is the right conceptual home for reusable workflow context-fact definitions.
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx:138-147` still renders a top strip of raw GeoForm codes (`45`, `58`, etc.) in the left rail; this is drift and should be removed.
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx` currently uses a simple `mt-3 grid gap-2 p-2` block and does not yet make the step-list region viewport-aware or efficiently sized to content.
- The current left rail uses extra vertical spacing and fixed-feeling panels; it should become denser, with section cards taking only the space they need and internal lists becoming scrollable when long.
- Existing scrollable dialog patterns already exist and should be reused instead of inventing a slice-1-only pattern:
  - `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx:811-841` uses `DialogContent ... max-h-[calc(100dvh-2rem)] flex-col overflow-hidden` with inner `min-h-0 flex-1 overflow-y-auto`
  - `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx:1376-1465` uses the same viewport-bounded scroll-region pattern for tab content
  - `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx:853-896` uses `max-h-[calc(90vh-16rem)] overflow-y-auto` for long inner editor sections

## Open Questions
- Should `fieldKey` be user-authored or auto-derived from the bound context-fact key by default with optional override?

## Form Dialog Spec (current recommendation)
### Tabs
1. `Contract`
   - Step key
   - Step label
   - Step description `{ markdown }`
2. `Fields`
    - Ordered list of field bindings
    - Add-field action opens a picker over existing workflow context-fact definitions
    - Each binding row is edited inline as a card
    - The field-card region becomes scrollable when dialog content exceeds viewport height
    - Each binding row shows linked fact key, kind, cardinality, and derived input preview
    - Each binding row supports: context-fact selector, label, field key, help text, reorder, remove
3. `Guidance`
   - Human guidance `{ markdown }`
   - Agent guidance `{ markdown }`

### Fields Tab Row Design
- Primary identity block:
  - bound context-fact selector (autocomplete)
  - resolved context-fact label or key
  - fact kind badge
  - cardinality badge
- Derived behavior block:
  - read-only summary of resolved input behavior from the linked context-fact type
  - read-only summary of where options/references come from when applicable
- Binding fields block:
  - label input
  - field key input
  - help text input/textarea
- Ordering/actions block:
  - drag-and-drop reorder affordance for the overall field list
  - remove binding

### Confirmed Field Binding Properties
- bound context fact
- label
- field key
- help text
- required
- UI multiplicity mode (allowed only when linked context fact cardinality is `many`; may narrow `many -> one`, never widen `one -> many`)
- order (managed at the form list level via drag and drop)

### Explicit Non-Properties Of The Form Field Binding
- cardinality (owned by workflow context-fact definition)
- context-fact kind (owned by workflow context-fact definition)
- option-source semantics (owned by workflow context-fact definition)
- reference-source semantics (owned by workflow context-fact definition)

### Form Field UI Multiplicity Rule (locked)
- The workflow context-fact definition remains the canonical owner of true cardinality.
- A Form-field binding may add a **UI multiplicity mode** only when the linked workflow context fact has cardinality `many`.
- That UI multiplicity mode is a presentation/runtime narrowing only:
  - allowed: `many -> one`
  - allowed: `many -> many`
  - forbidden: `one -> many`
- This means a reusable many-cardinality context fact can be rendered by a specific Form binding as either:
  - a single-value UI over one chosen/entered instance, or
  - a full many-value UI.
- The binding must never claim that a cardinality-`one` context fact can behave as many.
- Runtime validation must still enforce the canonical context-fact cardinality even when the Form binding narrows the UI.
- The binding-level UI multiplicity choice does not create a second context-fact definition and does not change value-semantics ownership.

### Context-Fact Selection Rules
- A given `contextFactDefinitionId` may appear only once within a single Form step's field-binding list.
- The selector must exclude or disable context facts already bound in the current Form step.
- Reuse across different Form steps is explicitly allowed.

### Empty-State Flow For The Fields Tab
- If no workflow context-fact definitions exist yet, the field-binding area should show a dedicated empty state rather than an inline creator.
- The empty state should direct the user into the separate workflow-level context-fact CRUD flow.
- The empty state should not auto-open or deep-link into context-fact CRUD; it should only explain that the user must create or edit context facts from the separate `Context Facts` area.
- The same instructional empty state should appear when all existing context facts are already bound in the current Form step.

### Field Key Behavior
- default value auto-derives from the selected context-fact key
- author may override it explicitly
- changing the bound context fact should re-derive the field key only if the current field key is still in its untouched/default-derived state; once manually overridden, it must remain stable until the user edits it again

### Derived Input Behavior Rules
- boolean one → toggle/checkbox
- string one with allowed values → select
- string one without allowed values → single-line text
- string many with allowed values → repeatable multi-select/tag list
- json one → structured JSON editor or constrained sub-schema editor
- json many → repeatable structured rows
- external binding/path-shaped facts → path-oriented input behavior from fact validation rules
- workflow/work-unit/artifact references → reference picker driven by seeded/runtime source data
- draft-spec → nested structured editor based on draft-spec field definitions

### Dirty-State Rules
- `Contract *` only when contract fields are dirty
- `Fields *` only when field bindings/overrides/order are dirty
- `Guidance *` only when guidance fields are dirty
- overall dialog dirty state is the OR of the three tab states
- close with dirty state opens the standard discard-confirm flow already used in L1/L2 dialogs
- the scrollable `Fields` region should follow the existing L1/L2 dialog pattern rather than a new bespoke layout

## Workflow Editor Left Rail Refinement
- Remove the raw GeoForm code strip from the top of the left rail entirely.
- Reduce vertical gaps between left-rail sections.
- `STEP LIST & INSPECTOR` and `CONTEXT FACT DEFINITIONS` should size to content first, not consume large empty space by default.
- When either list grows long, the list region inside that section should become scrollable.
- Prefer a `flex` / `min-h-0` left-rail composition with per-section scroll regions over large empty fixed-height boxes.

## Context Fact CRUD Surface Placement
- Keep context-fact CRUD in the existing `Context Fact Definitions` section of the workflow editor.
- That section should contain:
  - list of all workflow context facts in the workflow
  - create button
  - edit action per row
  - delete action per row
- Clicking create opens the context-fact create dialog.
- Clicking a row opens the context-fact edit dialog.
- Delete should be triggered from the edit dialog and should open a destructive confirmation dialog.

### Context Fact Definitions List Row Design
- Primary line: display name / name
- Secondary line: key in muted/grey text
- Right-side badges: fact kind badge + cardinality badge
- Whole row is clickable and opens the edit dialog

## Context Fact Dialog Spec (current recommendation)
### Tabs
1. `Contract`
   - fact key
   - label/display name
   - description `{ markdown }`
   - fact kind
   - cardinality
2. `Value Semantics`
   - value type / shape
   - type-specific behavior
   - allowed values / JSON sub-schema / path validation / reference target config depending on fact kind
3. `Guidance`
   - human guidance `{ markdown }`
   - agent guidance `{ markdown }`

### Contract Tab Ownership
- key
- label/display name
- description `{ markdown }`
- fact kind
- cardinality

### Contract Tab Hard Boundary
- The `Contract` tab owns only the five fields above.
- It must not contain value type selectors, default values, allowed-values editors, path rules, external binding configuration, reference-target configuration, or draft-spec field definitions.
- Its job is only to define the reusable identity + top-level shape of the context fact.

### Contract Tab Field Rules
- `Fact Kind` is editable on create only and locked on edit.
- `Cardinality` is configured here because it is part of the reusable context-fact definition contract and remains editable on edit.
- In create mode, `Fact Kind` and `Cardinality` should be presented together as paired contract selectors because both define the core shape of the context fact before the `Value Semantics` tab can be interpreted correctly.
- `Description` uses `{ markdown }` shape.
- For fact kinds whose multiplicity is inherited from a selected target entity (`definition_backed_external_fact`, `bound_external_fact`, `artifact_reference_fact`, `work_unit_draft_spec_fact`), the target selection should still live in `Value Semantics`, not in `Contract`.
- For those inherited-cardinality kinds, `Contract` should keep the cardinality field but treat it as derived/read-only once the target entity is selected; do not move bound-target selection into `Contract`.

### Value Semantics Tab Ownership
- The `Value Semantics` tab owns the actual definition semantics for the selected fact kind.
- `plain_value_fact`
  - scalar/json type
  - allowed values if relevant
  - JSON sub-schema if relevant
- `bound_external_fact`
  - external target/binding source
- `definition_backed_external_fact`
  - external definition reference and rules inherited from it
- `workflow_reference_fact`
  - referenced workflow definition target rules
- `work_unit_reference_fact`
  - removed from the current refinement/testing consideration
- `artifact_reference_fact`
  - referenced artifact slot rules
- `work_unit_draft_spec_fact`
  - draft-spec target work-unit type and field definitions

### External Fact Kinds: Locked Distinction
- `definition_backed_external_fact` is for authoring a workflow context fact whose shape is inherited from an existing external fact definition and whose later Action-step persistence creates a new instance of that bound fact definition.
- `bound_external_fact` is for binding to existing fact instances of a selected external fact definition and whose later Action-step persistence updates the selected bound instance.
- For `bound_external_fact`, runtime selection should default to the already-existing instance attached to the current work unit when such an instance exists.
- In slice-1, the external-definition picker options for both kinds are limited to:
  - methodology facts
  - current work unit fact definitions
- The selected external fact definition is the authority for shape and cardinality constraints; the workflow context-fact definition does not re-author those semantics locally.
- Current repo-grounded examples to reuse in explanation/prototypes should come from:
  - `_bmad` references to `planning_artifacts`, `project_knowledge`, and `project-root` discovery paths
  - `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts` facts such as `project_root_directory`, `project_knowledge_directory`, `planning_artifacts_directory`, `objectives`, `constraints`, `research_goals`, and `setup_work_unit`

### `_bmad`-Grounded External-Fact Examples
- `project_root_path` should not be modeled as a workflow/project fact because the canonical repo root already lives on `projects.project_root_path`.
- Any fact whose semantics are a file/directory path should be stored and edited relative to `projects.project_root_path`, not as an absolute filesystem path.
- Any file/folder selector outside the create-project page should be constrained to remain within `projects.project_root_path`; absolute paths and traversal outside the root are invalid.
- The strongest setup-work-unit facts evidenced by `_bmad/bmm/1-analysis/bmad-document-project/` are:
  - `workflow_mode`: `string`, cardinality `one`, allowed values `initial_scan | full_rescan | deep_dive`
  - `scan_level`: `string`, cardinality `one`, allowed values `quick | deep | exhaustive`
  - `requires_brainstorming`: plain boolean setup work-unit fact definition, cardinality `one`
  - `deep_dive_target`: single `json` setup work-unit fact definition, cardinality `one`, with sub-keys `target_type: string`, `target_path: string` (path relative to project root), `target_name: string`, `target_scope: string`
- The strongest project facts evidenced by `_bmad/bmm/1-analysis/bmad-document-project/` are:
  - `repository_type`: `string`, cardinality `one`, allowed values `monolith | monorepo | multi_part` — this stays the first concrete `bound_external_fact` example
  - `project_parts`: `json`, cardinality `many`, with sub-keys `part_id: string`, `root_path: string` (path relative to project root), `project_type_id: string`
  - `technology_stack_by_part`: `json`, cardinality `many`, with sub-keys `part_id: string`, `framework: string`, `language: string`, `version: string`, `database: string`, `dependencies: string`
  - `existing_documentation_inventory`: `json`, cardinality `many`, with sub-keys `path: string` (directory validation, relative to project root), `doc_type: string`, `related_part_id: string`
  - `integration_points`: `json`, cardinality `many`, with sub-keys `from_part_id: string`, `to_part_id: string`, `integration_type: string`, `details: string`
- The `_bmad` evidence for these comes from:
  - `documentation-requirements.csv` project-type taxonomy
  - `workflows/full-scan-instructions.md` repository/parts/stack/docs/integration discovery
  - `templates/project-scan-report-schema.json` run-mode / scan-level contracts
  - `workflows/deep-dive-instructions.md` deep-dive target shape

### Example Choice Rationale
- Use `_bmad` reusable setup/run contracts like `workflow_mode`, `scan_level`, `requires_brainstorming`, and `deep_dive_target` when explaining `definition_backed_external_fact` because they define reusable shape before a specific run instance exists.
- Use `_bmad` discovered project-state values like `repository_type`, `project_parts`, `technology_stack_by_part`, `existing_documentation_inventory`, and `integration_points` when explaining `bound_external_fact` because they represent concrete per-project or per-run bindings to actual discovered instances.

### `bound_external_fact` Runtime Default-Selection Rule
- `bound_external_fact` represents binding to an existing instance, so runtime selector UX should default to the already-existing instance attached to the current work unit when available.
- This default-selection behavior is an intentional distinction from `definition_backed_external_fact`, which starts from inherited-shape authoring for creating a new fact instance rather than selecting an existing bound one.
- If no existing instance is available yet (which is expected for early setup flows), `bound_external_fact` should not silently change meaning or auto-behave like `definition_backed_external_fact`.
- In that zero-instance case, the bound selector should show an explicit empty state and instruct the operator to manually create the needed project-fact instance first through the Project Facts flow, then return and bind/select it.
- Slice-1 should therefore rely on the already-planned manual project-fact creation path rather than adding inline create-new behavior inside `bound_external_fact` selection.

### `definition_backed_external_fact` Value Semantics Tab (locked direction)
- The `Value Semantics` tab for `definition_backed_external_fact` should have four deterministic sections in this order:
  1. `External Fact Definition`
  2. `Inherited Shape Preview`
  3. `Runtime Behavior`
  4. `Persistence Note`
- `External Fact Definition`
  - autocomplete selector over eligible external fact definitions only:
    - methodology facts
    - current work-unit fact definitions
  - each option should show:
    - display name
    - fact key
    - source badge: `Methodology Fact` or `Current Work Unit Fact`
  - once selected, the context-fact definition stores the selected external fact definition identity as the authoritative source of shape.
- `Inherited Shape Preview`
  - read-only preview only; no local re-authoring of the inherited field/value contract
  - preview should show:
    - resolved value type or structured shape
    - cardinality inherited from the selected external fact definition
    - allowed values / path validation / work-unit reference semantics when applicable
  - if the selected external fact definition is a work-unit fact of type `work unit`, the preview should say runtime input becomes a selector over instances of that work-unit type.
- `Runtime Behavior`
  - read-only explanatory block stating what the Form/Agent runtime will do with this kind:
    - Form step: author a workflow-context value using the exact inherited shape
    - Agent step: write payload uses the same inherited shape
    - Action step: persistence creates a new instance of the selected external fact definition
  - this section is explanatory only; it is not a configuration area.
- `Persistence Note`
  - read-only note stating that later persistence does **not** update an existing instance
  - instead it creates a **new** fact instance using the selected external definition as the target contract.

### Concrete Example: `definition_backed_external_fact` using `workflow_mode`
- Example selected external fact definition: `workflow_mode`
- source: setup work-unit fact definition
- inherited type: `string`
- inherited cardinality: `one`
- inherited allowed values:
  - `initial_scan`
  - `full_rescan`
  - `deep_dive`
- resulting Value Semantics tab behavior:
  - selector shows `Workflow Mode` / `workflow_mode` with source badge `Current Work Unit Fact`
  - preview shows `String`, `One`, and the three allowed values
  - runtime behavior note explains that the Form field will render as a single-select using those allowed values
  - persistence note explains that Action will create a new `workflow_mode` fact instance rather than update an existing one.

### `bound_external_fact` Value Semantics Tab (locked direction)
- The `Value Semantics` tab for `bound_external_fact` should have four deterministic sections in this order:
  1. `External Fact Definition`
  2. `Existing Instance Selection Behavior`
  3. `Inherited Shape Preview`
  4. `Persistence Note`
- `External Fact Definition`
  - autocomplete selector over eligible external fact definitions only:
    - methodology facts
    - current work-unit fact definitions
  - each option should show:
    - display name
    - fact key
    - source badge: `Methodology Fact` or `Current Work Unit Fact`
  - once selected, the context-fact definition stores the selected external fact definition identity as the authoritative source of binding target semantics.
- `Existing Instance Selection Behavior`
  - read-only explanatory block describing runtime selector behavior
  - if an instance of the selected fact definition is already attached to the current work unit, runtime should default-select that instance
  - if multiple eligible instances exist, runtime shows selector/search UI constrained by the selected external fact definition and cardinality
  - if zero eligible instances exist, runtime shows an explicit empty state and instructs the operator to create the needed project-fact instance first via Project Facts, then return and bind/select it
  - this kind must not silently change into `definition_backed_external_fact` and must not inline-create a new instance from inside the bound selector in slice-1
- `Inherited Shape Preview`
  - read-only preview only; no local re-authoring of the bound instance contract
  - preview should show:
    - resolved value type or structured shape of the selected external fact definition
    - cardinality inherited from the selected external fact definition
    - allowed values / path validation / work-unit reference semantics when applicable
  - if the selected external fact definition is a work-unit fact of type `work unit`, the preview should say runtime selection becomes a picker over existing instances of that work-unit type
- `Persistence Note`
  - read-only note stating that later persistence updates the selected existing fact instance(s)
  - it does **not** create a new instance when using `bound_external_fact`

### Concrete Example: `bound_external_fact` using `repository_type`
- Example selected external fact definition: `repository_type`
- source: project fact definition
- inherited type: `string`
- inherited cardinality: `one`
- inherited allowed values:
  - `monolith`
  - `monorepo`
  - `multi_part`
- resulting Value Semantics tab behavior:
  - selector shows `Repository Type` / `repository_type` with source badge `Methodology Fact` or `Project Fact` according to the final source contract
  - existing-instance behavior note explains:
    - if the project already has a `repository_type` instance, runtime defaults to that instance
    - if no instance exists yet, runtime shows empty state and directs the operator to create the project fact first in Project Facts
  - preview shows `String`, `One`, and the three allowed values
  - persistence note explains that Action updates the selected `repository_type` fact instance rather than creating a new one.

### `workflow_reference_fact` Value Semantics Tab (locked direction)
- `workflow_reference_fact` cardinality is owned by the `Contract` tab exactly like `plain_value_fact`; it may be `one` or `many` and is not inherited from an external definition.
- The `Value Semantics` tab for `workflow_reference_fact` should have three deterministic sections in this order:
  1. `Allowed Workflows`
  2. `Selected Workflow Set`
  3. `Runtime Behavior`
- `Allowed Workflows`
  - autocomplete selector over workflows defined in the current work unit only
  - each option should show:
    - workflow display name
    - workflow key
    - workflow definition identity (read-only supporting metadata)
  - selecting an option adds that workflow to the allowed set for this context fact
  - duplicate selections are not allowed
- `Selected Workflow Set`
  - read-only/list-management section showing all workflows currently selected as allowed values
  - each row should show:
    - workflow display name
    - workflow key
    - remove action
  - list ordering should be stable and visible because runtime autocomplete uses this set as its option source
- `Runtime Behavior`
  - read-only explanatory block stating:
    - Form step shows an autocomplete selector whose options are exactly the workflows chosen in `Allowed Workflows`
    - if cardinality is `one`, runtime allows selecting one workflow
    - if cardinality is `many`, runtime allows selecting multiple workflows
    - the stored workflow-context value is the selected workflow definition reference(s), not copied workflow metadata

### Concrete Example: `workflow_reference_fact` temporary test-only direction
- `workflow_reference_fact` is more appropriate for the brainstorming work unit than the setup work unit.
- For slice-1 refinement/testing, it should be introduced only as a temporary seeded example to exercise context-fact-kind CRUD and runtime Form behavior.
- That temporary seeded example must be explicitly documented as removable after user validation/testing.
- It should not be treated as part of the stable agreed setup-work-unit fact list.
- The temporary slice-1 test seed should add exactly **two stub workflows** under the setup work unit so `workflow_reference_fact` can exercise allowed-workflow selection behavior with more than one option.

### `workflow_reference_fact` Additional Rules To Consider
- The allowed-workflow selector is limited to workflows in the current work unit; no cross-work-unit workflow selection in slice-1.
- If an allowed workflow is later deleted or becomes invalid, the context-fact definition should surface that as invalid configuration in editor read models rather than silently dropping it.
- Runtime selection uses only the allowed set chosen in `Value Semantics`; it does not dynamically expose every workflow in the current work unit.
- This kind is being refined primarily to ensure full context-fact CRUD is real and complete; it should not force expansion of the stable setup workflow scope.

### `work_unit_reference_fact` Scope Decision
- `work_unit_reference_fact` is removed from the current refinement/testing consideration.
- Rationale: the current BMAD-grounded examples and the current slice-1 priority already cover the needed relationship behaviors through existing work-unit facts and external-fact flows, so this kind does not currently justify its own design surface.
- It should receive no temporary seeded example, no runtime behavior definition, and no further CRUD attention in this refinement pass.

### `artifact_reference_fact` Value Semantics Tab (locked direction)
- `artifact_reference_fact` binds to exactly one artifact slot definition.
- The `Value Semantics` tab for `artifact_reference_fact` should have three deterministic sections in this order:
  1. `Artifact Slot Definition`
  2. `Selected Slot Preview`
  3. `Runtime Behavior`
- `Artifact Slot Definition`
  - autocomplete selector over artifact slot definitions in the current work unit only
  - each option should show:
    - slot display name
    - slot key
    - slot cardinality badge: `single` or `fileset`
  - the context fact may bind to one and only one artifact slot definition
- `Selected Slot Preview`
  - read-only preview showing:
    - slot display name
    - slot key
    - slot cardinality (`single` or `fileset`)
  - cardinality for `artifact_reference_fact` is inherited from the selected artifact slot definition rather than freely authored as an independent semantic rule
- `Runtime Behavior`
  - Form step should render a file selector
  - if slot cardinality is `single`, runtime allows selecting exactly one file
  - if slot cardinality is `fileset`, runtime allows selecting multiple files
  - selected file paths must be stored relative to `projects.project_root_path`, never as absolute paths
  - selected file paths must validate as remaining within `projects.project_root_path`; out-of-root selections are rejected
  - if the platform/system file picker cannot hard-constrain browsing to the repo root, post-selection normalization/validation still enforces the repo-root boundary
  - runtime should show the currently selected file or file list after selection so the user can verify what was chosen

### `artifact_reference_fact` Additional Rules To Consider
- This kind is file-oriented, not directory-oriented.
- Duplicate file selections in a `fileset` should be removed deterministically.
- Removing a selected file from a `fileset` should be supported before submit.
- Re-selecting a file for `single` replaces the prior selected file.

### `work_unit_draft_spec_fact` Value Semantics Tab (locked direction)
- `work_unit_draft_spec_fact` is used to author a draft specification for a selected work-unit definition.
- Cardinality for `work_unit_draft_spec_fact` is inherited from the selected work-unit definition/target and should be treated as derived/read-only in `Contract` after target selection.
- The `Value Semantics` tab for `work_unit_draft_spec_fact` should have three deterministic sections in this order:
  1. `Target Work Unit Definition`
  2. `Included Facts`
  3. `Runtime Behavior`
- `Target Work Unit Definition`
  - autocomplete selector over work-unit definitions
  - selecting a work-unit definition sets the target for the draft spec
  - once selected, the chosen work-unit definition becomes the source of:
    - available fact rows in `Included Facts`
    - derived cardinality behavior for this context fact
- `Included Facts`
  - show all facts of the selected work-unit definition as structured rows
  - include a search/filter control above the list so large work-unit fact sets remain usable
  - each row should show enough identity to understand what is being included:
    - fact display name
    - fact key
    - fact type/shape summary
    - if fact type is `work unit`, also show the dependency/work-unit type it references
    - cardinality
  - each row has a checkbox toggle
  - if checked, that fact is included in the draft spec
  - if unchecked, that fact is excluded from the draft spec
  - included facts are stored by fact-definition identity, not by copied labels
  - if the selected work-unit definition changes, the included-facts selection must reset/recompute against the new definition rather than silently preserving stale references
- `Runtime Behavior`
  - Form step runtime renders editors only for the included facts from the selected work-unit definition
  - if derived cardinality is `one`, the user fills one draft-spec row
  - if derived cardinality is `many`, runtime shows a `+` action to add another draft-spec row and each row contains the included facts
  - this kind is being refined only for context-fact/Form CRUD right now; Invoke-step consumption semantics are deferred to a later plan

### `work_unit_draft_spec_fact` Additional Rules To Consider
- Facts should remain ordered consistently with the selected work-unit definition unless a later explicit ordering rule is introduced.
- If a previously included fact is deleted or becomes invalid on the target work-unit definition, the editor read model should surface invalid configuration rather than silently dropping it.
- This kind should not pull Invoke-step implementation scope into the current refinement; only authoring and Form runtime behavior need to be nailed down now.

### Priority Note
- The primary goal of the current plan/refinement pass is complete CRUD for workflow context facts (design time and runtime), with complete Form-step CRUD as the paired consumer surface.
- If sequencing pressure appears, context-fact CRUD should be treated as the higher-priority foundation because Form-step behavior derives from those definitions.

### Value Semantics Tab Detailed Behavior
- The tab body changes by context-fact kind while the tab itself stays stable.
- Nothing kind-specific should leak back into the `Contract` tab.
- `plain_value_fact`
  - show `Value Type` selector: `string | number | boolean | json`
  - `Value Type` is editable on both create and edit for `plain_value_fact`
  - after `Value Type` is chosen, render only the configuration fields for that type
  - `string`
    - optional `Default Value`
    - required `Validation Mode`: `none | allowed_values | path`
    - if `Validation Mode = allowed_values`, show ordered `Allowed Values` editor
    - if `Validation Mode = path`, show `Path Kind`: `file | directory`
  - `boolean`
    - optional `Default Value`: `unset | true | false`
    - no further validation controls in slice-1
  - `number`
    - optional `Default Value`
    - no further min/max/step controls in slice-1
  - `json`
    - show `JSON Sub-schema Entries` editor for this single fact
    - each sub-schema entry contains:
      - `Sub-key`
      - `Display Name`
      - `Value Type`: `string | boolean | number`
      - `Default Value`
      - if sub-key `Value Type = string`, `String Validation`: `none | allowed_values | path`
      - if sub-key `String Validation = allowed_values`, ordered `Allowed Values` editor
      - if sub-key `String Validation = path`, `Path Kind`: `file | directory`
      - if sub-key `String Validation = path`, path normalization/safety toggles:
        - `Trim Whitespace`
        - `Disallow Absolute`
        - `Prevent Traversal`
    - sub-key names must be unique within the fact definition
    - at least one sub-key is required for JSON facts
    - nested objects are not supported in slice-1
    - arrays / per-sub-key many-cardinality are not part of this exact methodology-fact-style JSON editor pattern
- `bound_external_fact`
  - configure binding provider/source and target binding key
- `definition_backed_external_fact`
  - choose external definition reference and surface inherited rules
- `workflow_reference_fact`
  - configure workflow-definition reference semantics
- `work_unit_reference_fact`
  - configure work-unit-type reference semantics
- `artifact_reference_fact`
  - configure artifact-slot reference semantics
- `work_unit_draft_spec_fact`
  - choose target work-unit definition and toggle which of its facts are included in the draft spec

### `plain_value_fact` Value-Type Edit Rules
- `Fact Kind` stays locked after creation, but `Value Type` remains editable when the kind is `plain_value_fact`.
- Editing `Value Type` must update the same context-fact definition rather than forcing delete + recreate.
- When `Value Type` changes, incompatible semantics are cleared immediately:
  - switching away from `string` clears string-only validation settings (`allowed values`, `path`, and path safety toggles)
  - switching away from `json` clears JSON sub-schema entries
  - switching to `boolean` coerces default value to boolean-state UI; invalid prior defaults are dropped
  - switching to `number` keeps only defaults that parse as finite numbers; otherwise clear the default
  - switching to `string` keeps only a plain string default and starts with `Value Validation Type = none`
- Form fields bound to this context fact continue to reference the same definition row; their derived input behavior updates from the revised `plain_value_fact` value type.

### Cardinality Edit Rules
- `Cardinality` remains editable after creation; only `Fact Kind` is locked.
- Editing `Cardinality` updates the same context-fact definition rather than forcing delete + recreate.
- In design time, `Cardinality` changes only the contract-level multiplicity rule for runtime instance generation / allowed instance counts.
- In design time, editing `Cardinality` does **not** create multiple value-semantics rows, does **not** duplicate JSON sub-schema entries, and does **not** change the single definition editor structure.
- The same `Value Semantics` definition applies whether the context fact cardinality is `one` or `many`.
- Runtime slices may later interpret `one` vs `many` when generating instances and validating submitted values, but that is downstream runtime behavior, not additional design-time semantics authoring.
- Exception: for inherited-cardinality kinds (`definition_backed_external_fact`, `bound_external_fact`, `artifact_reference_fact`, `work_unit_draft_spec_fact`), cardinality is not freely authored; it is derived from the selected target entity and should be displayed read-only after target selection.

### JSON Sub-Schema Decision For `plain_value_fact`
- Do not invent a brand-new arbitrary JSON-schema authoring model for slice-1 workflow context facts.
- Reuse the same constrained JSON sub-key semantics already present in `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx`.
- The UX should also follow the same methodology-fact create/edit dialog pattern visually and structurally: a scrollable list of bordered card rows, one card per JSON sub-key, with an explicit `Add JSON Key` action and a per-card `Remove Key` action.
- Each JSON sub-field supports:
  - key
  - display name
  - value type: `string | boolean | number`
  - default value
  - validation for `string` only:
    - none
    - allowed values
    - path (`file | directory`, with normalization/safety rules)
- This means the JSON sub-schema editor for workflow context facts should mirror the methodology/work-unit fact editor's constrained field model rather than allowing nested arbitrary JSON schemas in slice-1.

### JSON Sub-Schema UX Shape
- The `json` branch of the `Value Semantics` tab should render a `JSON Sub-schema Keys` section using card-based inline editors, not a compact table and not stacked modal dialogs.
- Each JSON sub-key card should contain:
  - sub-key display name
  - sub-key key name
  - sub-key value type
  - default value
  - string validation controls when the primitive type is `string`
  - path normalization/safety toggles when string validation type is `path`
  - remove button aligned to the card actions area
- The list of JSON sub-key cards should live inside the same viewport-bounded scroll-region pattern already reused elsewhere in slice-1 dialogs.
- The create/edit workflow for JSON sub-keys should be entirely inline within the `Value Semantics` tab.
- The visual and interaction model should intentionally match the methodology fact JSON editor so users do not learn two different JSON-subschema authoring experiences.
- The labels should also match exactly, including `JSON Sub-schema Keys`, `Add JSON Key`, `Key Display Name`, `Key Name`, `Default Value`, `Value Type`, `Value Validation Type`, `Path Kind`, `Allowed Values`, and `Remove Key`.

### Guidance Storage Decision
- `guidanceJson` should live on `methodology_workflow_context_fact_definitions`.
- Rationale: current methodology definition tables in `packages/db/src/schema/methodology.ts` already consistently carry `guidanceJson`, so workflow context-fact definitions should follow the same root-row pattern.
- Subtype tables should carry only kind-specific semantic configuration unless a later slice proves a subtype-specific guidance need.

### Guidance Tab Ownership
- human markdown guidance
- agent markdown guidance

## Cross-Kind Consistency Sweep (locked normalization)

### Global Tab Ownership
- `Contract` owns only:
  - key
  - label/display name
  - description `{ markdown }`
  - fact kind
  - cardinality
- `Value Semantics` owns all kind-specific semantics, selected target entities, inherited-shape previews, inclusion toggles, and runtime-behavior notes.
- `Guidance` owns only:
  - human guidance `{ markdown }`
  - agent guidance `{ markdown }`
- No kind-specific configuration should leak into `Guidance`.
- No guidance fields should leak into `Contract` or `Value Semantics`.

### Authored vs Derived Rule
- `Authored` means directly configured by the user in this context-fact definition.
- `Derived` means inherited from a selected target entity or computed from authored configuration.
- If a kind binds to a target entity whose shape/cardinality is authoritative, the target selection remains in `Value Semantics` and the derived fields stay read-only there (or read-only in `Contract` when displayed as top-level contract information).

### Kind-by-Kind Normalization

#### `plain_value_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind, cardinality
- `Value Semantics`
  - authored:
    - value type: `string | number | boolean | json`
    - type-specific semantics (`allowed values`, `path`, JSON sub-schema, defaults)
  - derived:
    - runtime widget summary from value type + cardinality + validation settings
- `Guidance`
  - authored:
    - human guidance `{ markdown }`
    - agent guidance `{ markdown }`
- Form runtime widget
  - `string` + no allowed values + one → single-line text input
  - `string` + allowed values + one → select/autocomplete
  - `string` + allowed values + many → repeatable multi-select/tag picker
  - `string` + path validation + one → path/file-or-directory picker constrained relative to project root
  - `string` + path validation + many → repeatable path picker list constrained relative to project root
  - `boolean` + one → checkbox/toggle
  - `boolean` + many → repeatable boolean rows if ever surfaced; not a special semantics editor
  - `number` + one → numeric input
  - `number` + many → repeatable numeric rows
  - `json` + one → constrained structured editor using the JSON sub-schema entries
  - `json` + many → repeatable structured rows using the same sub-schema per row

#### `definition_backed_external_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind
  - cardinality: derived/read-only after target external definition is selected
- `Value Semantics`
  - authored:
    - selected external fact definition
  - derived:
    - inherited shape
    - inherited cardinality
    - runtime behavior notes
    - persistence note = create new instance later
- `Guidance`
  - authored: human guidance + agent guidance markdown
- Form runtime widget
  - same widget as the selected external fact definition’s shape
  - examples:
    - string enum external definition → select/autocomplete
    - path-valued external definition → path picker constrained relative to project root
    - work-unit-valued external definition → selector over work-unit instances of the referenced type
    - structured/json external definition → structured editor matching the inherited shape

#### `bound_external_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind
  - cardinality: derived/read-only after target external definition is selected
- `Value Semantics`
  - authored:
    - selected external fact definition
  - derived:
    - existing-instance selection behavior
    - inherited shape
    - inherited cardinality
    - persistence note = update existing instance(s)
- `Guidance`
  - authored: human guidance + agent guidance markdown
- Form runtime widget
  - existing-instance selector
  - one → single autocomplete/select over existing eligible instances
  - many → multi-select over existing eligible instances
  - zero-instance case → explicit empty state with instruction to manually create the needed project fact first via Project Facts

#### `workflow_reference_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind, cardinality
- `Value Semantics`
  - authored:
    - allowed workflow set from workflows defined in the current work unit
  - derived:
    - runtime option source = exactly that selected set
    - runtime behavior notes
- `Guidance`
  - authored: human guidance + agent guidance markdown
- Form runtime widget
  - autocomplete/select over the allowed workflow set only
  - one → single workflow selection
  - many → multi-select workflow selection

#### `artifact_reference_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind
  - cardinality: derived/read-only after artifact slot definition is selected
- `Value Semantics`
  - authored:
    - selected artifact slot definition
  - derived:
    - slot cardinality (`single | fileset`)
    - runtime file-selection behavior
- `Guidance`
  - authored: human guidance + agent guidance markdown
- Form runtime widget
  - system/native-style file picker plus post-selection validation
  - `single` → exactly one file
  - `fileset` → multi-file selection
  - selected files stored as paths relative to project root only
  - out-of-root selections rejected
  - duplicate files in filesets removed deterministically
  - user order is not preserved / not semantically important

#### `work_unit_draft_spec_fact`
- `Contract`
  - authored: key, label/display name, description, fact kind
  - cardinality: derived/read-only after target work-unit definition is selected
- `Value Semantics`
  - authored:
    - selected target work-unit definition
    - inclusion toggles for which facts from that work-unit definition are included in the draft spec
  - derived:
    - included fact row metadata
    - derived cardinality from target
    - runtime behavior notes
- `Guidance`
  - authored: human guidance + agent guidance markdown
- Form runtime widget
  - structured editor over the included facts of the selected work-unit definition
  - one → one draft-spec row
  - many → `+` add-row behavior creating additional draft-spec rows with the same included fact set
  - included-facts list UI uses checkbox rows + search/filter in design time

### Removed Kind From Current Consideration
- `work_unit_reference_fact` is removed from the current refinement/testing consideration and should not influence the slice-1 CRUD/runtime design surface.

### Runtime Widget Summary Rule
- Form-field bindings do not choose their own widget type.
- Widget type is always derived from the linked workflow context-fact definition according to the matrices above.
- Form-field bindings only contribute presentation overrides (`label`, `fieldKey`, `helpText`, `required`, order).

### Binding-Level UI Multiplicity Normalization (current recommendation)
- Binding-level UI multiplicity affects only the **interaction affordance** for a field whose linked context fact has canonical cardinality `many`.
- It never changes:
  - the context-fact definition’s canonical cardinality
  - the value-semantics definition
  - the runtime storage contract
  - the persistence/write rules
- The normalization rule is:
  - canonical `one` → UI must stay `one`
  - canonical `many` → binding may choose either `one` or `many`

#### Family 1: Entry-Style Editors
- Use this family when the runtime UI is about **authoring value content directly** rather than choosing from an existing option pool.
- Examples:
  - `plain_value_fact` string/number/boolean rows when rendered repeatably
  - `plain_value_fact` JSON structured rows
  - `work_unit_draft_spec_fact` draft-spec row blocks
- Canonical `many` + binding UI mode `many`
  - runtime shows repeatable row/block UI
  - explicit `+ Add another` affordance is visible
  - each row can be removed independently before submit
  - submit payload contains a collection of authored values/rows
- Canonical `many` + binding UI mode `one`
  - runtime shows exactly one entry block
  - no `+ Add another` affordance
  - user authors at most one value/row through this field binding
  - submit payload is still normalized through the canonical many-cardinality pipeline as a single-item collection
- Canonical `one`
  - runtime shows exactly one entry block
  - no repeat/add affordance
  - submit payload is a single value in the canonical one-cardinality pipeline

#### Family 2: Selector-Style Editors
- Use this family when the runtime UI is about **selecting from an existing allowed set / existing instances / files**.
- Examples:
  - `plain_value_fact` string enum / allowed-values pickers
  - `definition_backed_external_fact` when inherited shape resolves to a select-like widget
  - `bound_external_fact` existing-instance selectors
  - `workflow_reference_fact` allowed-workflow selectors
  - `artifact_reference_fact` file selection UI
- Canonical `many` + binding UI mode `many`
  - runtime shows multi-select behavior
  - selected items accumulate in a visible selected-items region under/within the control
  - individual selected items can be removed before submit
  - submit payload contains a collection of selected values/references/files
- Canonical `many` + binding UI mode `one`
  - runtime shows single-select behavior only
  - user may choose at most one item through this field binding
  - submit payload is still normalized through the canonical many-cardinality pipeline as a single-item collection
- Canonical `one`
  - runtime shows single-select behavior only
  - no multi-select affordance is allowed
  - submit payload is a single selected value/reference/file

#### Cross-Family Submission Rule
- Binding-level UI multiplicity narrowing changes only what the user can do in that field.
- It does **not** reinterpret the underlying context fact as a different kind of fact.
- Therefore:
  - many rendered as one → store/validate as one selected/authored instance inside a many-cardinality collection contract
  - many rendered as many → store/validate as a normal many-cardinality collection contract
  - one rendered as one → store/validate as a normal one-cardinality contract

#### Cross-Family Empty-State Rule
- Empty-state behavior still comes from the widget family and fact kind, not from UI multiplicity alone.
- Example:
  - `bound_external_fact` with zero existing instances still shows the explicit "create the project fact first" empty state whether the binding UI multiplicity mode is `one` or `many`.

#### Cross-Family Validation Rule
- UI multiplicity mode may narrow user input affordances, but runtime validation must still reject any payload that violates the canonical context-fact contract.
- No binding may widen a canonical `one` fact into a many-value submission path.

### Default Widget-Family Mapping (locked)

#### `plain_value_fact`
- Default family depends on value type / validation mode.
- Default `entry-style` cases:
  - `string` with free-text semantics
  - `number`
  - `boolean`
  - `json`
- Default `selector-style` cases:
  - `string` with `allowed values`
  - `string` with `path` validation
- Rationale: plain values are authored directly unless their semantics explicitly convert them into constrained picking from an allowed set or filesystem target.

#### `definition_backed_external_fact`
- Default family is inherited from the selected external fact definition.
- If the inherited external shape is direct authored data, use `entry-style`.
- If the inherited external shape is enum/select/reference/path-like, use `selector-style`.
- Rationale: this kind exists to inherit authoritative shape; it must not invent a local widget family.

#### `bound_external_fact`
- Default family = `selector-style`.
- Rationale: it binds to existing instance(s), so runtime behavior is inherently selection-oriented even when the zero-instance case falls into an empty state.

#### `workflow_reference_fact`
- Default family = `selector-style`.
- Rationale: runtime chooses from the allowed workflow set configured in `Value Semantics`.

#### `artifact_reference_fact`
- Default family = `selector-style`.
- Rationale: runtime chooses files from the repo/filesystem boundary rather than authoring freeform artifact payloads inline.

#### `work_unit_draft_spec_fact`
- Default family = `entry-style`.
- Rationale: runtime authors structured draft-spec content directly rather than selecting existing draft-spec instances.

### Implementer Shortcut Rule
- Use `entry-style` by default when the user is authoring value content.
- Use `selector-style` by default when the user is choosing from an existing allowed set, existing instances, or files.
- Inherited kinds follow the authoritative target’s family instead of making a local guess.

### Context Fact Dialog Dirty-State Rules
- `Contract *` only when contract fields are dirty
- `Value Semantics *` only when kind/type-specific semantics are dirty
- `Guidance *` only when guidance is dirty
- overall dialog dirty state is the OR of the tab states
- close with dirty state uses the same discard-confirm behavior already established in L1/L2 dialogs

## Scope Boundaries
- INCLUDE: Form dialog redesign, context-fact-first authoring separation, tab/dirty-state behavior, and plan refinement.
- EXCLUDE: implementing later step types or widening slice-1 beyond Form/runtime core.
