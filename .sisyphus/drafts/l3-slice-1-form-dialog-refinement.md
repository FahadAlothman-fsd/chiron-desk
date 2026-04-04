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
- The `no workflow context facts yet` empty state in the Fields tab should be note-only text with no action button and no focus-jumping behavior.
- Field cards should use the same thick-corner card chrome already used elsewhere in the app.
- Field removal should require a stacked destructive confirmation dialog rather than immediate removal or undo-only behavior.
- Field reordering should use a real drag-and-drop interaction built on a library that works cleanly with shadcn-styled cards; current registry search found no dedicated shadcn sortable component, so the recommendation is to use `dnd-kit` with shadcn card styling and a drag handle.
- Context-fact kind should be locked after creation in slice-1; changing kind requires delete + recreate.
- For `plain_value_fact`, `Value Type` remains editable after creation in slice-1.
- Changing `Value Type` must deterministically clear or reset incompatible value-semantics configuration rather than preserving stale configuration from the previous type.
- Deleting a context fact should go through a clearly destructive confirmation dialog.
- Workflow context-fact definitions should carry `guidanceJson` on the root definition row.
- The context-fact dialog `Contract` tab is limited strictly to: key, label/display name, description `{ markdown }`, fact kind, and cardinality.
- The context-fact dialog `Value Semantics` tab owns the actual definition semantics for the chosen fact kind; no kind-specific definition fields belong in `Contract`.
- `plain_value_fact` is now treated as locked for this refinement pass: `Contract` owns only key/label/description/kind/cardinality; `Value Semantics` owns value type and type-specific configuration; JSON uses the exact same card-based sub-schema UX, behavior, and labels as the methodology fact dialog.
- In the `Context Fact Definitions` left-rail section, edit and delete are explicit row-card actions; edit opens the populated edit dialog and delete opens a destructive confirmation dialog with destructive styling throughout.
- For fact kinds with inherited cardinality (`definition_backed_external_fact`, `bound_external_fact`, `artifact_reference_fact`, `work_unit_draft_spec_fact`), the cardinality rule must be explicit: if the bound underlying definition has cardinality `many`, the user may choose the context-fact cardinality; if the bound underlying definition has cardinality `one`, the cardinality field is disabled, visibly set to `One`, and a note explains why. This visibility/disable behavior applies only to non-`plain_value_fact` and non-`workflow_reference_fact` kinds.

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

## Next Locked Discussion Track
- Workflow context facts are now treated as locked enough to move on.
- Next topic is the Form step at design time with the same level of exhaustiveness:
  - exact Form dialog contents
  - exact field-binding CRUD behavior
  - exact create/update payload shape
  - exact list/empty-state/reorder/remove behavior
  - exact delete semantics and invariants
  - exact relation between Form step contract and reusable workflow context-fact definitions
- Form `Contract` is narrowed to:
  - `step key`
  - `step title`
  - `step description { markdown }`

## Form Dialog Spec (current recommendation)
### Tabs
1. `Contract`
   - Step key
   - Step title
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

### Public Procedure Shape (locked)
- Public frontend/backend procedures stay scoped to the Form-step aggregate only:
  - `createFormStep`
  - `updateFormStep`
  - `deleteFormStep`
- There are no public field-specific procedures such as:
  - `createFormField`
  - `updateFormField`
  - `deleteFormField`
  - `reorderFormField`

### Create Mode (locked)
- Opening the Form dialog in create mode does not create any persisted rows.
- The dialog is backed only by local TanStack Form state until the user clicks `Create`.
- `Create` submits the full Form-step payload and only then creates:
  - the workflow step shell row
  - zero or more field-binding child rows
- In create mode, the dialog-level footer actions are exactly:
  - `Create`
  - `Cancel`
- In create mode there is no dialog-level `Delete` action for the Form step itself.
- Field removal inside the `Fields` tab is still allowed in create mode because it only mutates local TanStack Form state before submit.
- Zero fields is allowed in create mode as long as the contract tab is valid.

### Edit Mode (locked)
- Opening the Form dialog in edit mode loads persisted contract, field bindings, and guidance into local TanStack Form state.
- Submit label is `Save`.
- In edit mode, the dialog-level footer actions are exactly:
  - `Save`
  - `Delete`
- Saving submits the full authoritative Form-step payload, including the complete ordered field-binding list.

### Form Step Storage Simplification (locked)
- Remove the separate `methodology_workflow_form_steps` table from the design.
- The Form step itself is represented only by the `methodology_workflow_steps` shell row with `type = form`.
- `methodology_workflow_form_fields` should reference `methodology_workflow_steps` directly rather than referencing a separate typed Form-step parent row.
- The Form-specific authored payload lives in the step shell plus its owned field-binding child rows; there is no extra typed Form-step row with duplicated identity fields.

### Form Step Storage Replace Map (locked implementation checklist)

#### Execution Order
1. Replace schema authority first.
2. Replace foreign keys second.
3. Rewrite DB repository shape against the new canonical parent.
4. Patch methodology-engine service/repo capability naming to the new parent model.
5. Keep public Form procedures but repoint them at canonical workflow-step identity.
6. Rewrite fixture rows and fixture tests.
7. Rewrite schema/repository/runtime tests to prove the old typed parent table is gone.

#### 1. Files To Delete / Replace / Change

##### Delete / remove from active implementation
- `packages/db/src/schema/methodology.ts`
  - Delete the `methodology_workflow_form_steps` table definition entirely.
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
  - Delete all `MethodologyWorkflowFormStepSeedRow` usage and all seeded `methodologyWorkflowFormSteps` rows.

##### Replace heavily
- `packages/db/src/repositories/form-step-repository.ts`
  - Replace the current dual-parent implementation.
  - It must stop importing/using `methodologyWorkflowFormSteps` as a real persisted parent.
  - It must use `methodologyWorkflowSteps` as the only canonical parent row for Form steps.

##### Change
- `packages/db/src/schema/methodology.ts`
  - Repoint `methodology_workflow_form_fields.formStepId` to `methodology_workflow_steps.id`.
- `packages/db/src/schema/runtime.ts`
  - Repoint `step_executions.stepDefinitionId` to `methodology_workflow_steps.id`.
- `packages/db/src/index.ts`
  - Remove exports/wiring that expose the deleted `methodologyWorkflowFormSteps` table or assume it still exists.
- `packages/db/src/tests/schema/l3-slice-1-schema.test.ts`
- `packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
- `packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/contracts/src/methodology/workflow.ts`
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

##### Likely light-touch patch points
- `packages/db/src/methodology-repository.ts`
  - Patch any helper/capability names or read-model assembly that still imply a separate typed Form-step parent.
- `packages/db/src/createMethodologyRepoLayer` provider / repo layer implementation site
  - Remove capabilities that imply `methodology_workflow_form_steps` is still authoritative.
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Only if read-model assumptions currently expect separate typed Form-step identities.

#### 2. Exact FK Changes

##### Remove these foreign keys
- `methodology_workflow_form_fields.form_step_id -> methodology_workflow_form_steps.id`
- `step_executions.step_definition_id -> methodology_workflow_form_steps.id`

##### Replace with these foreign keys
- `methodology_workflow_form_fields.form_step_id -> methodology_workflow_steps.id`
  - Invariant: referenced parent step must have `type = form`.
- `step_executions.step_definition_id -> methodology_workflow_steps.id`
  - Runtime step identity always points at the canonical workflow-step shell row.

##### Canonical parent ownership after replacement
- `methodology_workflow_steps`
  - owns step identity
  - owns `type = form`
  - owns generic step shell fields (`key`, display/title field, description json, workflow linkage)
- `methodology_workflow_form_fields`
  - owned children of the shell step
  - no intermediate typed Form-step parent table

#### 3. Exact Repository / Service Shape Changes

##### DB repository: replace the old conceptual seam
Current bad conceptual seam:
- `createWorkflowFormStep`
- `updateWorkflowFormStep`
- `deleteWorkflowFormStep`
- list/get operations centered on `methodology_workflow_form_steps`

##### New DB repository seam (locked recommendation)
- `createFormStepDefinition(input)`
- `updateFormStepDefinition(input)`
- `deleteFormStepDefinition(input)`
- `listFormStepDefinitions(workflowDefinitionId)`
- `getFormStepDefinition(stepDefinitionId)`

##### `createFormStepDefinition(input)` must do exactly this
1. Insert one shell row into `methodology_workflow_steps`:
   - `id`
   - `workflowDefinitionId`
   - `key`
   - `type = form`
   - title/display field mapped from `stepTitle`
   - `descriptionJson`
2. Insert zero or more child rows into `methodology_workflow_form_fields`:
   - `formStepId = methodology_workflow_steps.id`
   - `contextFactDefinitionId`
   - `fieldLabel`
   - `fieldKey`
   - `helpText`
   - `required`
   - `uiMultiplicityMode`
   - `order`
3. It must not insert any second parent row anywhere.

##### `updateFormStepDefinition(input)` must do exactly this
1. Update the canonical shell row in `methodology_workflow_steps`.
2. Full-replace the child field rows in `methodology_workflow_form_fields`:
   - incoming row with matching existing id → update
   - incoming row without id or without matching existing id → create
   - existing row absent from incoming ids → delete
   - final order rewritten from incoming array order
3. It must not update any second typed Form-step parent row because none should exist.

##### `deleteFormStepDefinition(input)` must do exactly this
1. Delete the shell row from `methodology_workflow_steps`.
2. Let `methodology_workflow_form_fields` delete by DB-level cascade.
3. Delete structural edges attached to that step according to workflow-topology rules.
4. Never delete workflow context-fact definitions.
5. Never assume a separate `methodology_workflow_form_steps` row exists.

##### Methodology-engine service layer

Keep conceptually:
- `FormStepDefinitionService`
- Form-scoped aggregate procedures

Patch required:
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - stop assuming a typed Form parent table exists
  - stop assuming repo capabilities named around `WorkflowFormStep` imply a second parent row
  - use canonical `stepDefinitionId` from `methodology_workflow_steps`
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
  - ensure transaction orchestration treats Form as shell row + field children only

##### Router layer

Keep:
- `createFormStep`
- `updateFormStep`
- `deleteFormStep`

Patch:
- `packages/api/src/routers/methodology.ts`
  - keep Form-scoped aggregate procedure names
  - ensure public procedure semantics target canonical workflow-step identity
  - ensure no payload/response shape depends on a second Form parent id namespace

##### Contract layer
- `packages/contracts/src/methodology/workflow.ts`
  - keep Form aggregate payload model
  - ensure no contract assumes a separate typed Form-step parent identity
  - shell parent = workflow step definition
  - child rows = form field bindings only

#### 4. Exact Tests To Update

##### Schema tests
Update:
- `packages/db/src/tests/schema/l3-slice-1-schema.test.ts`

New assertions required:
- `methodology_workflow_form_steps` is absent
- `methodology_workflow_form_fields.form_step_id` references `methodology_workflow_steps.id`
- `step_executions.step_definition_id` references `methodology_workflow_steps.id`

##### Repository tests
Update:
- `packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
- `packages/db/src/tests/repository/l3-slice-1-runtime-repositories.test.ts`

New assertions required:
- `createFormStep` inserts exactly:
  - 1 shell step row in `methodology_workflow_steps`
  - N child rows in `methodology_workflow_form_fields`
  - 0 typed Form parent rows anywhere else
- `updateFormStep` performs full replacement of child field rows
- `deleteFormStep` removes shell row and cascades child field rows
- runtime `step_executions.stepDefinitionId` points at shell step ids directly

##### Methodology-engine tests
Update:
- tests for `FormStepDefinitionService`
- tests for `WorkflowAuthoringTransactionService`

New assertions required:
- service methods use shell-step identity only
- no dependency on `methodology_workflow_form_steps`
- no repo capability names that imply duplicated parent-table ownership

##### API router tests
Update:
- methodology router tests covering `createFormStep`, `updateFormStep`, `deleteFormStep`

New assertions required:
- public procedure shape remains Form-scoped aggregate CRUD
- ids returned/read are canonical `methodology_workflow_steps.id`
- aggregate payload round-trips without any typed Form parent id assumption

##### Seed / fixture tests
Update:
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts`

New assertions required:
- fixture creates `methodology_workflow_steps` rows only
- fixture creates `methodology_workflow_form_fields` rows pointing directly at shell step ids
- no `MethodologyWorkflowFormStepSeedRow` remains
- no seeded `methodologyWorkflowFormSteps` rows remain

#### 5. Severity / Action Classification

##### Replace/remove completely
- `methodology_workflow_form_steps` table
- all schema references to it
- all fixture row types/usages for it

##### Patch heavily
- `packages/db/src/repositories/form-step-repository.ts`
- `packages/db/src/schema/runtime.ts` foreign key for `step_executions.stepDefinitionId`
- DB schema/repository/runtime tests
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts`

##### Patch lightly
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/contracts/src/methodology/workflow.ts`
- any methodology read-model assembly that still implies a separate typed Form parent

##### Probably keep
- public methodology procedures `createFormStep`, `updateFormStep`, `deleteFormStep`
- Form aggregate-only public API model
- canonical step identity centered on `methodology_workflow_steps`

### `createFormStep` Payload (locked)
```ts
{
  workflowDefinitionId: string
  stepKey: string
  stepTitle: string
  stepDescriptionJson: { markdown: string }
  fields: Array<{
    contextFactDefinitionId: string
    fieldLabel: string
    fieldKey: string
    helpText: string | null
    required: boolean
    uiMultiplicityMode?: "many" | "one"
  }>
}
```

Rules:
- `stepKey`, `stepTitle`, and `stepDescriptionJson` are required.
- `fields` may be empty.
- Field order comes from array order.
- No duplicate `contextFactDefinitionId` within one Form step.
- `uiMultiplicityMode = "one"` is allowed only when linked context-fact cardinality is `many`.
- If omitted for a many-cardinality linked fact, default is canonical `many`.

### `updateFormStep` Payload (locked)
```ts
{
  workflowDefinitionId: string
  stepDefinitionId: string
  stepKey: string
  stepTitle: string
  stepDescriptionJson: { markdown: string }
  fields: Array<{
    id?: string
    contextFactDefinitionId: string
    fieldLabel: string
    fieldKey: string
    helpText: string | null
    required: boolean
    uiMultiplicityMode?: "many" | "one"
  }>
}
```

Rules:
- Existing rows use stable optional `id` values for update matching.
- The client submits the full authoritative ordered `fields` array on every update.

### `updateFormStep` Full-Replacement Semantics (locked)
- Server loads existing field-binding rows for the target Form step.
- Server compares existing ids against incoming ids.
- Diff behavior:
  - incoming row with matching existing id → update
  - incoming row without matching existing id → create
  - existing row absent from incoming ids → delete
- Final order is rewritten from the incoming array position.
- Removal is detected by absence from the submitted list, not by a separate field-delete procedure.

### `deleteFormStep` Payload (locked)
```ts
{
  workflowDefinitionId: string
  stepDefinitionId: string
}
```

### Form-Step Delete Semantics (locked)
- Deleting a Form step means:
  - delete the workflow step shell row
  - delete all owned field-binding rows
  - delete structural edges attached to that step according to workflow-topology rules
- Deleting a Form step must not:
  - delete workflow context-fact definitions
  - delete anything shared by other steps
- Field-binding child rows should be deleted via DB-level cascade from the workflow step shell row.

### Form-Step Delete UI Behavior (locked)
- In the step list, each Form step row exposes exactly two actions:
  - `Edit`
  - `Delete`
- `Edit` opens the Form dialog in edit mode with populated persisted data.
- `Delete` opens a stacked destructive confirmation dialog.
- Confirm action label should be explicit/destructive (for example `Delete Form Step`).
- On successful delete:
  - the step disappears from the list
  - the step disappears from the graph
  - any current step inspector selection clears
- Detailed graph/edge consequence discussion is intentionally deferred until after the Form-step type is fully locked.

### Form-Level Uniqueness Rules (locked)
- `stepKey` must be unique within a workflow.
- `fieldKey` must be unique within a single Form step.

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
- Empty state A (`no workflow context facts yet`) is note-only text.
- Empty state A must not render any button, focus-jump action, deep link, or auto-open behavior.
- The empty state should direct the user into the separate workflow-level context-fact CRUD flow only by explanatory note text.
- The empty state should not auto-open, deep-link, switch focus, or provide action buttons into context-fact CRUD; it should only explain that the user must create or edit context facts from the separate `Context Facts` area.
- Empty state B (`no fields in this Form yet`) appears when workflow context facts exist but this Form has zero bound fields:
  - note text explains the user can add a field by selecting one of the workflow context facts already defined for the workflow
  - action: `Add Field`
- Empty state C (`all workflow context facts already used`) appears when every workflow context fact is already bound in the current Form:
  - inline explanatory note, not a large empty-state screen
  - message explains all current workflow context facts are already used and another context fact must be defined before another field can be added
  - `Add Field` should be disabled or immediately surface this note instead of creating an invalid duplicate row

### Add Field Flow (locked)
- Clicking `Add Field` inserts a new inline field card in local TanStack Form state.
- The first required control in the new card is the bound context-fact autocomplete.
- Only workflow context facts not already used in the current Form appear in the picker.
- After a context fact is selected, the card auto-populates defaults:
  - `fieldLabel` defaults from the context-fact display name
  - `fieldKey` defaults from the context-fact key
  - `helpText` defaults to empty
  - `required` defaults to `false`
  - `uiMultiplicityMode` defaults to canonical `many` when applicable
- There is no per-field save button; field edits persist only when the overall Form dialog is submitted.

### Field Card Layout Chrome (locked)
- Each field binding renders as a `chiron-cut-frame-thick` style thick-corner card consistent with the app's existing card language.
- Each card has exactly three main content sections:
  1. `Bound Context Fact`
  2. `Derived Runtime Behavior`
  3. `Field Settings`
- `Derived Runtime Behavior` is a textual explanatory info box only; it never renders the real runtime widget preview.
- Card chrome also contains a left-side drag handle and a destructive `Remove field` action.

### Reorder Interaction (locked)
- Field bindings are reordered with drag-and-drop.
- There is currently no direct shadcn registry sortable component in the configured `@shadcn` registry for this use case.
- Recommended implementation direction: `dnd-kit` sortable list with `chiron-cut-frame-thick` field cards and a visible left-side dots/grip handle.
- The sortable item is the whole field card, but drag initiation is allowed only from the handle, not from the whole card surface.
- Reordering updates only the in-memory TanStack Form field array until the overall Form dialog is submitted.

### Remove Field Behavior (locked)
- Clicking `Remove field` on a field card opens a stacked destructive confirmation dialog.
- Confirming removal deletes only the field-binding row from the current Form dialog state.
- Removing a field never deletes the underlying workflow context-fact definition.
- After confirmed removal, the field disappears from the list immediately, ordering re-normalizes in local dialog state, and the released context fact becomes available again for future `Add Field` actions.

### Field Validation and Error Presentation (locked)
- Validation exists both inline on the card and at whole-dialog submit time.
- Errors render under the offending control and the `Fields` tab should surface the dirty/error state when relevant.

Validation rules:
- Missing bound context fact:
  - `Select a workflow context fact.`
- Duplicate context fact in the same Form:
  - `This context fact is already used in this Form.`
- Empty field label:
  - `Field label is required.`
- Empty field key:
  - `Field key is required.`
- Duplicate field key:
  - `Field key must be unique within this Form.`
- Invalid UI multiplicity mode:
  - `UI multiplicity mode can only be configured for many-cardinality context facts.`
- Invalid field-key format:
  - field key must start with a letter and contain only lowercase letters, numbers, and underscores

Validation timing:
- duplicate context-fact selection and invalid multiplicity errors appear immediately
- text-input errors appear on blur and on submit
- on submit failure, the dialog stays open, switches to `Fields` if needed, and focuses the first invalid control

Server-side validation must mirror client validation and also reject:
- references to missing/deleted workflow context facts
- field row ids that do not belong to the current Form step during update

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

## Graph Layout Persistence And Dirty-State Rules (locked)
- Workflow step shell rows should gain `metadataJson` for editor-only UI/layout state.
- `metadataJson` is the correct place for graph-layout metadata; do **not** put node position into `configJson`.
- For slice-1, `metadataJson` should contain only graph-layout state:
  - `position: { x: number, y: number }`
- Business/domain semantics must not be stored in `metadataJson`.
- Node dragging updates only local editor state until the user explicitly saves the graph layout.
- Moving one or more nodes must surface a canvas-level dirty state and a visible `Save changes` action at the top of the canvas.
- Clicking `Save changes` should batch-persist the latest positions for all dirty nodes in one mutation.
- Reloading the workflow editor should restore saved node positions from `metadataJson.position`.
- If a step has no saved position yet, the editor may use deterministic default placement until the first save.

### Page-Level Unsaved-Changes Guard (locked)
- Unsaved graph-layout changes are page-level workflow-editor dirty state.
- If the user tries to leave the workflow-editor page with unsaved node-position changes, navigation must be blocked by a discard/leave warning.
- This guard must apply to:
  - in-app route changes
  - browser back/forward navigation
  - other page-leave paths supported by the router/app shell
- The behavior should be consistent with existing dialog discard-confirm semantics, but scoped to the whole workflow-editor page rather than a modal.
- Choosing to stay preserves local unsaved graph positions.
- Choosing to leave discards unsaved graph-layout changes only; it does not mutate persisted workflow data.

### Node Move / Save Behavior (locked)
- Dragging a node updates only in-memory editor state until the user explicitly saves.
- Moving one or more nodes should surface a canvas-level `Save changes` affordance above the graph canvas.
- Clicking `Save changes` should send the latest saved positions for all dirty nodes in one batch update.
- The persisted source of truth for graph position is `methodology_workflow_steps.metadataJson.position`.
- If the user reloads the workflow editor, the graph should restore from persisted `metadataJson.position` values.
- If a workflow step has no saved graph position yet, the editor may use deterministic default placement until the first explicit save.

## Graph Edge Model And CRUD (locked current recommendation)

### Edge Table Shape
- `methodology_workflow_edges` remains the structural edge table.
- Remove these fields from the design:
  - `conditionJson`
  - `guidanceJson`
- Do **not** add `descriptionJson` to the edge table for slice-1.
- Slice-1 edges are structural only and should contain only the canonical structural fields:
  - parent workflow identity
  - `fromStepId`
  - `toStepId`
  - `edgeKey`
  - timestamps

### Edge Geometry / Visual Direction
- Each Form node should expose:
  - one source handle at the bottom
  - one target handle at the top
- Edge visual direction should be from the bottom of the source node to the top of the target node.
- The edge arrow marker should point at the `to` node.
- Slice-1 does not persist custom edge bend/control geometry.
- React Flow should derive the visible edge path from source node position, target node position, and the source/target handles.

### Edge Create Interaction
- Edge creation should happen directly from the React Flow connect interaction.
- User interaction model:
  1. click/drag from the bottom source handle of a step node
  2. drop onto the top target handle of another step node
  3. `onConnect` creates the structural edge immediately after validation
- The default edge key should auto-generate from the current step keys:
  - `fromStep.key + "->" + toStep.key`
- The generated default edge key is editable later in the edge dialog.

### Edge Create Validation Rules
- Validate that both source and target steps exist.
- Reject self-loop edges.
- Reject a second outgoing edge from the same source step.
- Allow many incoming edges into the same target step.
- Reject duplicate exact same `fromStepId + toStepId` pair.
- Reject edges whose source and target steps do not belong to the same workflow definition.
- Enforce the one-outgoing-edge rule in both UI and backend.

### Edge Dialog (locked)
- Clicking an existing edge opens a single-surface dialog with no tabs.
- The edge dialog should support exactly these actions:
  - edit edge key
  - edit `from` step
  - edit `to` step
  - delete edge
- If the user changes `from` or `to`, edge validation must re-run before save.
- If the edge key is still in untouched/default-derived state, changing endpoints should re-derive the key from the new step keys.
- If the user manually edited the edge key, changing endpoints must not overwrite that custom key.

### Edge Delete Behavior (locked)
- Deleting an edge must use a stacked destructive confirmation dialog.
- On successful delete:
  - the edge disappears from the graph immediately
  - any inspector selection for that edge clears
  - no step rows or context-fact definitions are deleted

### Graph / Edges Replace Map (locked implementation checklist)

#### Execution Order
1. Replace graph metadata storage authority on workflow-step shell rows.
2. Simplify edge schema to structural-only fields.
3. Patch graph read/write repository methods around node positions and structural edges.
4. Patch methodology-engine topology/service logic to use the new graph metadata + structural edge rules.
5. Patch workflow-editor UI behavior for drag/save/leave-guard and edge CRUD.
6. Rewrite schema/repository/router/web tests to prove the old edge semantics are gone.

#### 1. Files To Delete / Replace / Change

##### Delete / remove from active implementation
- `packages/db/src/schema/methodology.ts`
  - remove `conditionJson` from `methodology_workflow_edges`
  - remove `guidanceJson` from `methodology_workflow_edges`
- any code path that still treats edges as carrying branch-condition semantics in slice-1

##### Replace heavily
- `apps/web/src/features/workflow-editor/workflow-canvas.tsx`
  - replace graph behavior so node drag dirties layout locally, surfaces canvas-level `Save changes`, persists only on explicit save, and creates edges through `onConnect` with source-bottom / target-top semantics.
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx`
  - replace any stale edge editing affordances/debug controls with the locked edge-inspector + edge-dialog flow only.

##### Change
- `packages/db/src/schema/methodology.ts`
  - add `metadataJson` to `methodology_workflow_steps` as editor-only layout metadata
  - keep edge table structural only
- `packages/db/src/methodology-repository.ts`
  - patch step read/write helpers to load/save `metadataJson.position`
  - patch edge CRUD helpers to stop reading/writing `conditionJson` and `guidanceJson`
- `packages/db/src/createMethodologyRepoLayer` provider / repo layer implementation site
  - ensure node-position and structural-edge capabilities are wired through the real repo layer used by app services
- `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
  - patch one-outgoing-edge validation and structural edge CRUD against the simplified edge shape
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - patch editor-definition read model to expose `metadataJson.position` and structural edges only
- `packages/api/src/routers/methodology.ts`
  - patch edge procedures and add/update graph-layout persistence procedure if not already present
- `packages/contracts/src/methodology/workflow.ts`
  - patch contracts so workflow-step read models carry layout metadata and edges are structural only
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - patch route integration to use explicit graph dirty-state, layout save, edge create/update/delete, and page-leave guard
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - patch top-of-canvas dirty/save affordance and navigation-blocking integration

##### Likely light-touch patch points
- `packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
- `apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
- any React Flow helper types or local graph mappers in `apps/web/src/features/workflow-editor/types.ts`

#### 2. Exact Schema Changes

##### Workflow step shell row
Add to `methodology_workflow_steps`:
- `metadataJson`
  - json column
  - slice-1 locked meaning: editor-only layout metadata
  - current allowed shape:
    - `{ position: { x: number, y: number } }`

Locked rules:
- do **not** put graph position into `configJson`
- do **not** put business/domain semantics into `metadataJson`
- `metadataJson` is layout-only for slice-1

##### Workflow edges table
Keep structural fields only:
- workflow identity
- `fromStepId`
- `toStepId`
- `edgeKey`
- timestamps

Remove:
- `conditionJson`
- `guidanceJson`

Do **not** add:
- `descriptionJson`
- custom edge geometry columns

#### 3. Exact Procedure / Service Shape Changes

##### Methodology router procedures
Keep conceptually:
- `createEdge`
- `updateEdge`
- `deleteEdge`

Add / patch:
- graph-layout save procedure (locked recommendation name):
  - `saveWorkflowGraphLayout`

##### `createEdge` shape (locked recommendation)
```ts
{
  workflowDefinitionId: string
  fromStepId: string
  toStepId: string
}
```

Server behavior:
1. validate both steps exist in workflow
2. reject self-loop
3. reject second outgoing edge from same source step
4. reject duplicate exact same edge pair
5. generate default `edgeKey = fromStep.key + "->" + toStep.key`
6. persist structural edge row

##### `updateEdge` shape (locked recommendation)
```ts
{
  workflowDefinitionId: string
  edgeId: string
  edgeKey: string
  fromStepId: string
  toStepId: string
}
```

Server behavior:
- re-run the same structural validation rules as create
- if edge key is still default-derived, endpoint changes may re-derive key
- if user supplied custom key, preserve custom key unless explicitly edited

##### `deleteEdge` shape (locked recommendation)
```ts
{
  workflowDefinitionId: string
  edgeId: string
}
```

##### `saveWorkflowGraphLayout` shape (locked recommendation)
```ts
{
  workflowDefinitionId: string
  positions: Array<{
    stepDefinitionId: string
    position: { x: number; y: number }
  }>
}
```

Server behavior:
- batch-update `methodology_workflow_steps.metadataJson.position`
- only touch steps belonging to the target workflow
- do not mutate edge rows
- do not mutate any business semantics

##### Methodology-engine service boundaries

Keep conceptually:
- `WorkflowTopologyMutationService`
- `WorkflowEditorDefinitionService`

Patch exact responsibilities:

`WorkflowTopologyMutationService`
- owns structural edge create/update/delete
- owns one-outgoing-edge validation
- owns self-loop / duplicate-edge / same-workflow validation
- must not own branch condition semantics in slice-1

`WorkflowEditorDefinitionService`
- assembles graph read model
- returns:
  - step shell rows with `metadataJson.position`
  - structural edge rows only
- must not expose `conditionJson` / `guidanceJson` as active edge semantics

Recommended additional service seam if needed strictly for this product behavior:
- `WorkflowGraphLayoutService`
  - owns batch save of node positions only
  - no topology semantics

Hard constraint:
- do not invent generic graph/foundation services beyond what is required for:
  - node position persistence
  - structural edge CRUD
  - page-level dirty-state save flow

##### Web/editor behavior

`workflow-canvas.tsx`
- node drag updates local graph state only
- moved nodes mark page dirty
- top-of-canvas `Save changes` persists dirty positions in batch
- edge create happens on React Flow `onConnect`
- source handle bottom / target handle top
- no implicit auto-save per drag

`workflow-editor-shell.tsx`
- owns canvas-level dirty/save affordance visibility
- owns page-level unsaved-changes navigation guard

`step-list-inspector.tsx`
- selected edge opens edge inspector/dialog path
- no debug affordances that bypass canonical edge CRUD flow

#### 4. Exact Tests To Update

##### Schema tests
Update:
- `packages/db/src/tests/schema/l3-slice-1-schema.test.ts`

New assertions required:
- `methodology_workflow_steps` has `metadataJson`
- `methodology_workflow_edges` does **not** have `conditionJson`
- `methodology_workflow_edges` does **not** have `guidanceJson`
- no edge `descriptionJson` was introduced

##### Repository tests
Update:
- `packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`

New assertions required:
- graph-layout save updates `metadataJson.position` for targeted steps only
- createEdge persists only structural fields
- updateEdge revalidates one-outgoing-edge rule
- deleteEdge removes structural edge row only

##### Methodology-engine tests
Update:
- `packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`

New assertions required:
- read model returns persisted node positions
- create/update/delete edge flows enforce:
  - one outgoing max
  - many incoming allowed
  - no self-loop
  - no duplicate exact edge pair
- no edge branch/guidance semantics leak into slice-1 services

##### Router tests
Update:
- `packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`

New assertions required:
- `createEdge`, `updateEdge`, `deleteEdge` remain structural-only
- `saveWorkflowGraphLayout` batch-persist positions correctly
- router never accepts/writes `conditionJson` or `guidanceJson`

##### Web route / integration tests
Update:
- `apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`

New assertions required:
- dragging a node marks page dirty
- `Save changes` appears after layout movement
- saving persists positions and clears dirty state
- leaving route with unsaved node moves triggers discard/leave warning
- connecting source-bottom to target-top creates edge immediately
- second outgoing edge from same source fails in UI
- many incoming edges to one target are allowed
- clicking edge opens single-surface edge dialog with:
  - edge key
  - from step
  - to step
  - delete edge

#### 5. Severity / Action Classification

##### Replace/remove completely
- edge `conditionJson`
- edge `guidanceJson`
- any slice-1 code path treating edges as branch/guidance carriers

##### Patch heavily
- `workflow-canvas.tsx`
- `workflow-editor-shell.tsx`
- `workflow-topology-mutation-service.ts`
- methodology schema + repo read/write paths for graph metadata and structural edges

##### Patch lightly
- methodology router edge procedures
- workflow-editor route integration
- local graph mapping/types
- edge selection/inspector flow

##### Probably keep
- explicit `workflowDefinitionId` route identity
- structural edge CRUD concept
- one-outgoing-edge invariant direction
- React Flow `onConnect` creation model

## Context Fact CRUD Surface Placement
- Keep context-fact CRUD in the existing `Context Fact Definitions` section of the workflow editor.
- That section should contain:
  - list of all workflow context facts in the workflow
  - create button
  - edit action per row
  - delete action per row
- Clicking create opens the context-fact create dialog.
- Clicking the explicit edit action on a row opens the context-fact edit dialog with the row's data populated.
- Clicking the explicit delete action on a row opens a destructive confirmation dialog with destructive/red styling throughout, and deletion occurs only after confirm.

### Context Fact Definitions List Row Design
- Primary line: display name / name
- Secondary line: key in muted/grey text
- Right-side badges: fact kind badge + cardinality badge
- Right-side row actions: `Edit` and `Delete`
- `Edit` opens the populated edit dialog for that context fact definition
- `Delete` opens the destructive confirm dialog

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
- For those inherited-cardinality kinds, the cardinality field must behave as follows once the target entity is selected:
  - if the underlying bound definition/entity has cardinality `many`, the cardinality control stays enabled and the user may choose the workflow context-fact cardinality
  - if the underlying bound definition/entity has cardinality `one`, the cardinality control is disabled, visibly set to `One`, and a note explains that the bound target constrains the context fact to one
  - this explicit disabled-note behavior applies only to non-`plain_value_fact` and non-`workflow_reference_fact` kinds
  - do not move bound-target selection into `Contract`

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

### Workflow Context-Fact Definition Replace Map (locked implementation checklist)

#### Actual Current Blast Radius (repo-grounded)
- `packages/contracts/src/methodology/workflow.ts`
  - still uses stale kinds/names (`plain_value`, `external_binding`, `draft_spec_field`)
  - still couples `FormStepPayload.contextFacts`
  - still carries `FormFieldInput` / `input` ownership on Form fields
- `packages/api/src/routers/methodology.ts`
  - mirrors the stale contract model in Zod
  - still exposes `contextFacts` inside Form payloads
  - still uses stale edge/description shapes
- `packages/db/src/schema/methodology.ts`
  - root context-fact table is too thin for the locked `Contract` tab ownership model
  - subtype tables still reflect stale kinds (`work_unit_reference`, `draft_spec_field`, provider/bindingKey style external binding)
- `packages/db/src/repositories/workflow-context-fact-repository.ts`
  - is a standalone side repository, not the real app-wired methodology repo seam
  - supports only create/list, not the full CRUD/read-model the product now requires
  - still encodes removed/stale kinds and stale payload shape
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - depends on optional `MethodologyRepository` capabilities that are not guaranteed by the actual repo layer
  - conceptually salvageable, but currently shaped around stale DTOs/capabilities
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - still returns `WorkflowContextFactDto[]` + `FormStepPayload`-centric `formDefinitions`, which preserves the old coupled ownership model
- `apps/web/src/features/workflow-editor/dialogs.tsx`
  - has no real context-fact create/edit dialog yet
  - Form dialog still has stale `Context Facts` tab placeholder
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - context-fact section is read-only list only; no actual CRUD actions wired to the locked dialog model
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - route currently maps stale `contextFacts` / `FormStepPayload` assumptions into local editor state

#### Execution Order
1. Replace contract authority first.
2. Replace methodology schema authority second.
3. Replace stale standalone repo seam with the real methodology-repo capability surface.
4. Patch methodology-engine services/read models to the new authority.
5. Patch router schemas and route integration.
6. Replace placeholder web context-fact CRUD surfaces with the locked dialog/list UX.
7. Rewrite tests to prove the stale ownership model is gone.

#### 1. Files To Delete / Replace / Change

##### Delete / remove from active implementation
- `packages/db/src/repositories/workflow-context-fact-repository.ts`
  - delete/retire this standalone repository seam if the app is going to continue using `MethodologyRepository` + `createMethodologyRepoLayer` as the real runtime wiring.
  - It is currently a parallel stale seam carrying the wrong kind set and partial CRUD shape.
- any active contract/router/test usage of these removed or stale forms:
  - `FormStepPayload.contextFacts`
  - `FormFieldInput`
  - standalone `inputKind`
  - active `work_unit_reference_fact`
  - `draft_spec_field` as a top-level active context-fact kind

##### Replace heavily
- `packages/contracts/src/methodology/workflow.ts`
  - replace the context-fact kind model, DTO shapes, Form payload ownership model, field-binding model, and editor read-model shapes.
- `packages/api/src/routers/methodology.ts`
  - replace the stale Zod schemas for Form/context-facts/edges so they match the locked design-time-only model.
- `apps/web/src/features/workflow-editor/dialogs.tsx`
  - replace placeholder context-fact/form tabs with the real locked dialog surfaces.
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - replace stale route mapping assumptions so it hydrates/saves context facts and Form fields from the new canonical read model.

##### Change
- `packages/db/src/schema/methodology.ts`
  - patch root context-fact definition row to carry the real `Contract`/`Guidance` ownership fields
  - patch subtype tables to the locked active kind set and subtype semantics
- `packages/db/src/methodology-repository.ts`
  - add/patch the real CRUD/read-model methods for workflow context-fact definitions on the actual app-wired repo
- `packages/db/src/index.ts`
  - remove exports for the retired standalone repo seam and export the corrected schema/repo surfaces
- `packages/methodology-engine/src/repository.ts`
  - patch the `MethodologyRepository` interface to include the real required context-fact CRUD/read-model capabilities
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - patch service contract and capability calls to the new canonical repo interface
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - patch editor read model away from `FormStepPayload.contextFacts` coupling and toward separate workflow-level context-fact definitions + Form field bindings
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - patch so Form-field binding behavior depends on linked context-fact definitions rather than owning semantic inputs locally
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
  - patch transaction orchestration so context-fact CRUD and Form CRUD use the corrected ownership model
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - patch the `Context Fact Definitions` section into the real CRUD surface (list/create/edit/delete)
- `apps/web/src/features/workflow-editor/types.ts`
  - patch local editor types to the corrected context-fact contract/read-model shape

##### Likely light-touch patch points
- `packages/methodology-engine/src/layers/live.ts`
- `packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`
- `apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`
- `packages/contracts/src/tests/l3-slice-1-contracts.test.ts`

#### 2. Exact Schema Changes

##### Root definition table: `methodology_workflow_context_fact_definitions`
Patch root row so it owns the full locked `Contract` + `Guidance` shape:
- `workflowDefinitionId`
- `factKey`
- `displayName` / label field
- `descriptionJson: { markdown: string }`
- `factKind`
- `cardinality`
- `guidanceJson` carrying human/agent markdown guidance
- timestamps

Root table must be the authority for:
- key
- label/display name
- description
- kind
- cardinality
- guidance

##### Active subtype tables to keep / patch
- `methodology_workflow_context_fact_plain_values`
- `methodology_workflow_context_fact_external_bindings`
- `methodology_workflow_context_fact_workflow_refs`
- `methodology_workflow_context_fact_artifact_refs`
- `methodology_workflow_context_fact_draft_specs`
- `methodology_workflow_context_fact_draft_spec_fields`

##### Remove from active slice-1 schema surface
- `methodology_workflow_context_fact_work_unit_refs`
  - remove from active slice-1 context-fact model because `work_unit_reference_fact` is removed from current consideration

##### Subtype semantics to patch exactly

`plain_value_fact`
- plain-values subtype must support:
  - value type = `string | number | boolean | json`
  - type-specific semantics owned in subtype data
  - JSON sub-schema entries matching methodology-fact dialog behavior

`definition_backed_external_fact` and `bound_external_fact`
- do not use generic `provider` / `bindingKey` vocabulary anymore
- store explicit authoritative target references to:
  - methodology fact definition id, or
  - current work-unit fact definition id
- external-binding subtype must be able to distinguish:
  - create-new semantics (`definition_backed_external_fact`)
  - bind/update-existing semantics (`bound_external_fact`)

`workflow_reference_fact`
- workflow-ref subtype must support:
  - one root context-fact definition with cardinality on the root row
  - one-or-many allowed workflow selections under that definition
  - no separate fake top-level kind rows per selected workflow

`artifact_reference_fact`
- artifact-ref subtype must reference exactly one artifact slot definition
  - slot cardinality is inherited from the selected slot

`work_unit_draft_spec_fact`
- draft-spec subtype must reference exactly one target work-unit definition
- draft-spec field rows must represent the included target-fact set only

##### Hard schema rules
- `descriptionJson` everywhere in this slice uses `{ markdown: string }`
- `guidanceJson` lives on the root context-fact definition row, not in subtype tables
- `Fact Kind` is locked after creation
- `Cardinality` is root-owned, except where runtime/design rules make it derived/read-only from the chosen target entity

#### 3. Exact Repository / Service / Procedure Shape Changes

##### Contracts
Replace current stale kind set:
- remove active: `plain_value`, `external_binding`, `work_unit_reference`, `draft_spec_field`

Use locked active kind set instead:
- `plain_value_fact`
- `definition_backed_external_fact`
- `bound_external_fact`
- `workflow_reference_fact`
- `artifact_reference_fact`
- `work_unit_draft_spec_fact`

##### Form contract shape corrections
- remove `FormStepPayload.contextFacts`
- remove `FormFieldInput`
- remove binding-owned semantic input configuration
- Form field bindings should only carry:
  - `contextFactDefinitionId`
  - `fieldLabel`
  - `fieldKey`
  - `helpText`
  - `required`
  - optional UI multiplicity mode when linked fact cardinality is `many`

##### Context-fact DTO/read-model shape
Patch `packages/contracts/src/methodology/workflow.ts` so context-fact DTOs/read models reflect the locked tab ownership:
- root contract fields
- kind-specific `valueSemantics`
- guidance
- derived read-only notes/preview content as read-model output, not authored contract fields

##### Methodology repository interface
Patch `packages/methodology-engine/src/repository.ts` to require real non-optional capabilities for:
- `listWorkflowContextFactsByDefinitionId`
- `createWorkflowContextFactByDefinitionId`
- `updateWorkflowContextFactByDefinitionId`
- `deleteWorkflowContextFactByDefinitionId`
- `getWorkflowEditorDefinition`

Those capabilities must be implemented by the actual app-wired repo layer, not by a parallel side repository.

##### Methodology DB repo implementation
Patch `packages/db/src/methodology-repository.ts` to implement the real context-fact CRUD and editor-definition read model:
- list workflow context facts with root + subtype semantics
- create root row + subtype row(s)
- update root row + subtype row(s)
- delete root row with cascade / dependency checks
- assemble editor-definition payload that returns:
  - workflow metadata
  - shell steps
  - structural edges
  - workflow context-fact definitions
  - Form field bindings separately from context-fact definitions

##### Methodology-engine service layer

`WorkflowContextFactDefinitionService`
- keep conceptually
- patch to the real kind set and canonical repo capabilities
- enforce:
  - no `work_unit_reference_fact`
  - no stale provider/bindingKey abstraction
  - no kind changes after creation
  - delete blocked when in use by Form bindings unless explicit design says otherwise

`WorkflowEditorDefinitionService`
- keep conceptually
- patch read model so it no longer returns `formDefinitions.payload.contextFacts`
- workflow context facts must be editor-level siblings, not Form-owned nested payloads

`FormStepDefinitionService`
- patch so Form field widgets/behavior are derived from linked context-fact definitions
- no Form-owned semantic config

##### Methodology router procedures
Keep / patch:
- `workflow.contextFact.list`
- `workflow.contextFact.create`
- `workflow.contextFact.update`
- `workflow.contextFact.delete`

Router payloads must match the locked design:
- `Contract` payload = key, label, description, kind, cardinality
- `Value Semantics` payload = kind-specific payload only
- `Guidance` payload = human/agent markdown guidance

Hard router constraints:
- no stale `work_unit_reference_fact`
- no `draft_spec_field` top-level create/update path
- no `provider` / `bindingKey` generic external-binding payloads

##### Web/editor behavior

`dialogs.tsx`
- add the real context-fact create/edit dialog with tabs:
  - `Contract`
  - `Value Semantics`
  - `Guidance`
- remove any Form-dialog `Context Facts` tab
- create/edit one context fact per dialog only

`workflow-editor-shell.tsx`
- `Context Fact Definitions` section becomes the real CRUD list surface:
  - list rows
  - create button
  - row edit action
  - row delete action

`workflow-editor route`
- hydrate and mutate context facts through dedicated workflow context-fact procedures/read models
- stop reconstructing context-fact ownership through `FormStepPayload`

#### 4. Exact Tests To Update

##### Contract tests
Update:
- `packages/contracts/src/tests/l3-slice-1-contracts.test.ts`

New assertions required:
- `FormStepPayload.contextFacts` is absent
- stale `FormFieldInput` / `inputKind` model is absent
- active kind set is exactly:
  - `plain_value_fact`
  - `definition_backed_external_fact`
  - `bound_external_fact`
  - `workflow_reference_fact`
  - `artifact_reference_fact`
  - `work_unit_draft_spec_fact`
- active `work_unit_reference_fact` is absent from slice-1 contracts

##### Schema tests
Update:
- `packages/db/src/tests/schema/l3-slice-1-schema.test.ts`

New assertions required:
- root context-fact definition table owns key/label/description/kind/cardinality/guidance
- `methodology_workflow_context_fact_work_unit_refs` is absent from active slice-1 schema expectations
- subtype tables align to the locked active kind set

##### Repository tests
Update:
- `packages/db/src/tests/repository/l3-slice-1-repositories.test.ts`
- `packages/db/src/tests/repository/workflow-context-fact-list.integration.test.ts`

New assertions required:
- create/update/delete/list for each active context-fact kind
- editor-definition read model returns context facts separately from Form payloads
- delete fails deterministically when the context fact is still bound to a Form field (unless explicitly unbound first)
- no stale `provider/bindingKey` generic model remains

##### Methodology-engine tests
Update:
- `packages/methodology-engine/src/tests/l3/l3-slice-1-workflow-editor-services.test.ts`

New assertions required:
- editor-definition service returns workflow-level context facts + separate Form field bindings
- context-fact service enforces kind lock on edit
- context-fact delete semantics are deterministic and dependency-aware
- Form field behavior derives from linked context-fact definitions only

##### Router tests
Update:
- `packages/api/src/tests/routers/l3-slice-1-methodology-router.test.ts`

New assertions required:
- workflow context-fact CRUD uses the corrected payload shapes
- stale kinds rejected/absent
- no Form-owned context-fact payloads accepted

##### Web integration tests
Update:
- `apps/web/src/tests/routes/workflow-editor-form-slice.integration.test.tsx`

New assertions required:
- `Context Fact Definitions` section supports create/edit/delete
- context-fact dialog tabs are exactly `Contract | Value Semantics | Guidance`
- Form dialog tabs are exactly `Contract | Fields | Guidance`
- no `Context Facts` tab appears inside Form dialog
- field-binding picker uses existing workflow context-fact definitions only
- field derived behavior is text-only and definition-driven

#### 5. Severity / Action Classification

##### Replace/remove completely
- `packages/db/src/repositories/workflow-context-fact-repository.ts`
- `FormStepPayload.contextFacts`
- stale active `work_unit_reference_fact`
- stale top-level `draft_spec_field` kind
- generic `provider` / `bindingKey` external-binding model
- Form dialog `Context Facts` tab

##### Patch heavily
- `packages/contracts/src/methodology/workflow.ts`
- `packages/api/src/routers/methodology.ts`
- `packages/db/src/schema/methodology.ts`
- `packages/db/src/methodology-repository.ts`
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
- `apps/web/src/features/workflow-editor/dialogs.tsx`
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
- workflow-editor route integration

##### Patch lightly
- `packages/methodology-engine/src/services/form-step-definition-service.ts`
- `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
- `apps/web/src/features/workflow-editor/types.ts`
- route/integration tests that only need renamed DTO/read-model fields

##### Probably keep
- workflow-level placement of context-fact CRUD in the left rail
- dedicated `WorkflowContextFactDefinitionService` concept
- dedicated workflow-context CRUD procedures
- context-fact-first ownership model as the active slice-1 authority

## Scope Boundaries
- INCLUDE: Form dialog redesign, context-fact-first authoring separation, tab/dirty-state behavior, and plan refinement.
- EXCLUDE: implementing later step types or widening slice-1 beyond Form/runtime core.
