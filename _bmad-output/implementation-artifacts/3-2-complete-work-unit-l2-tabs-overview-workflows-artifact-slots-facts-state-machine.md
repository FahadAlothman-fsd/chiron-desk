# Story 3.2: Work Unit L2 Authoring Surface and Backend Ownership

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an operator,
I want all Work Unit L2 tabs implemented to the locked design baseline,
so that topology, contracts, and lifecycle can be authored in one coherent surface with proper backend ownership boundaries.

## Story Metadata

- **Story Key:** 3-2-work-unit-l2-authoring-surface-and-backend-ownership
- **Epic:** 3 - Onboarding-Centered Runtime Spikes (Design-Time First)
- **Intent Tag:** Spike
- **FR Coverage:** FR1, FR2, FR7
- **NFR Coverage:** NFR1, NFR5
- **ADR Refs:** ADR-EF-B01, ADR-EF-B02, ADR-EF-03, ADR-EF-06
- **Gate Refs:** G3
- **Evidence Refs:** 
  - `l2-tabs-parity-log`
  - `artifact-slots-authoring-log`
  - `facts-tab-authoring-log`
  - `state-machine-authoring-log`
  - `l2-backend-ownership-log`
  - `l2-api-namespace-log`
- **Diagnostic Refs:**
  - `l2-tabs-findings-diagnostics`
  - `state-machine-validation-diagnostics`
  - `artifact-slots-validation-diagnostics`
  - `l2-referential-cleanup-diagnostics`

---

## Acceptance Criteria (Gherkin)

### AC 1: Overview Tab Implementation
**Given** the Work Unit L2 page is loaded
**When** the Overview tab is selected
**Then** the following locked sections are displayed:
- Focused mini-graph with direct inbound and outbound dependencies
- Dependency summary counts plus link-type badges
- Artifact slots summary with "Manage artifact slots" action
- Core summary chips for facts, workflows, states, transitions, and findings
- Quick actions: "Open details", "Open Relationship View", "Add fact", "Add workflow"

### AC 2: Facts Tab Implementation (List/Table-First, No Row Expansion)
**Given** a work unit with facts exists
**When** the Facts tab is selected
**Then** the following locked elements are displayed:
- List-first/table-first view aligned with **methodology-facts** style
- Same dialog-first CRUD behavior as methodology facts
- Fact types: string, number, boolean, array, object, **work unit** (new)
- **For work unit type facts**: additional column/field showing **dependency type** selector
  - Dependency type links to `dependency definitions` (e.g., "planning_input", "consumes", "extends")
  - This connects work units together
  - Shows related work unit type badge
- Dialog-first CRUD: "+ Add Fact", "Edit", "Delete" (same patterns as methodology facts)
- **NO row expansion** in this slice
- Findings treatment consistent with shared diagnostics patterns
- Alignment with Methodology Facts semantics for type, validation, and cardinality

### AC 3: Workflows Tab Implementation (Binding Ownership in State Machine)
**Given** a work unit with workflows exists
**When** the Workflows tab is selected
**Then** the following locked elements are displayed:
- Page-level "+ Add Workflow" action button
- Summary strip showing total, bound, unbound, and findings counts
- Searchable and filterable workflow rows table
- **Read-only** "bound transitions" visibility in row/details context
- Accordion-style row expansion showing description, data-channel summary, findings
- "Open Workflow Editor" action per row for deep editing
- Workflow bindings are authored in State Machine transition editing (not in Workflows tab)

### AC 4: State Machine Tab Implementation (Inner Tabs: States + Transitions)
**Given** a work unit with lifecycle states exists
**When** the State Machine tab is selected
**Then** the following locked elements are displayed:
- **Two inner tabs**: "States" and "Transitions"
- Page title "STATE MACHINE"
- Page-level "+ Add State" and "+ Add Transition" actions
- Summary strip showing states, transitions, allowed workflows count, and findings count
- Searchable and filterable transitions list
- Transition rows with gate mode (all/any), allowed workflows count, findings, and "Details" action
- Clicking "Details" navigates to **Transition Details Page** (not a dialog)

### AC 4a: Transition Details Page (Tabbed Interface)
**Given** the user clicks on a transition "Details" action
**When** the Transition Details Page loads
**Then** the page displays **4 tabs**:
- **Overview Tab**: Basic transition info (from/to states, label, description), status summary, usage statistics
- **Gate Policy Tab**: Fact-based condition set editor with:
  - Root evaluation mode (all/any)
  - List of fact conditions with type-specific check operators
  - Group nesting (one level deep)
  - Real-time preview/simulation
- **Binding Tab**: Simple list of allowed workflows (just workflow IDs)
  - Add/remove workflows
  - Shows workflow status (ready/draft/invalid)
  - At least one workflow required (warning if empty)
- **Diagnostics Tab**: Validation results, condition check results, simulation history

### AC 4b: Gate Policy - Fact-Based Condition Sets
**Given** the Gate Policy tab is selected
**When** editing conditions
**Then** only **fact-based conditions** are available:
- **Fact Check**: Check fact values using operators:
  - is defined / is not defined
  - equals / not equals
  - contains / starts with / ends with (strings)
  - greater than / less than / between (numbers)
  - is true / is false (booleans)
  - is empty / is not empty / length equals (arrays)
- **Condition Groups**: ALL or ANY grouping (one level nesting max)
- **Severity**: blocking (default) or warning per condition

### AC 4c: Workflow Bindings - Simple List
**Given** the Binding tab is selected
**When** viewing allowed workflows
**Then** it displays a **simple list** (no execution modes, no primary/secondary):
- List of workflow IDs allowed for this transition
- Add workflow to list
- Remove workflow from list
- Shows count of bound workflows
- Status: "Ready" if at least one workflow bound, "Unbound" warning if none
**And** at execution time, operator selects one workflow from the list to run

### AC 5: State Deletion Behavior (Warn, Not Block)
**Given** a state with impacted transitions exists
**When** the user attempts to delete the state
**Then** a confirmation dialog is displayed that:
- Lists impacted transitions explicitly
- Offers **disconnect option** (nulling state refs where model supports it) as primary non-destructive choice
- Optionally offers explicit transition cleanup/delete path as operator choice
- Does **NOT** hard-block the deletion
- Surfaces warning severity with clear impact disclosure

### AC 6: Unbound Transition Behavior (Warning, Not Blocking)
**Given** a transition with no allowed workflows exists
**When** the transition is displayed in the transitions list
**Then** an "Unbound" badge is shown
**And** the severity is **warning** (not blocking)
**And** an inline quick-fix "Add workflow" is available
**And** clicking "Add workflow" navigates to the Transition Details Page on the Binding tab
**And** clicking the transition row opens the Transition Details Page on the Overview tab

### AC 7: Artifact Slots Tab Implementation (Templates Inside Slot Dialog)
**Given** a work unit with artifact slots exists
**When** the Artifact Slots tab is selected
**Then** the following locked elements are displayed:
- Page title "ARTIFACT SLOTS (DESIGN-TIME)"
- Page-level "+ Add Slot" action button
- Searchable and filterable slot table
- Row fields: slot key, cardinality, template count, rules summary, actions
- Row expansion with concise context
- Templates are managed **inside Slot Details dialog** as a nested templates table
- **NO separate Templates page/tab** in Story 3.2 baseline
- Stacked dialog editing (Basics, Rules, Templates levels)

### AC 8: Tab Switching and Context Preservation
**Given** a work unit is selected from L1
**When** switching between Overview, Facts, Workflows, State Machine, and Artifact Slots tabs
**Then** the selected work-unit context is preserved
**And** tab order is stable: Overview → Facts → Workflows → State Machine → Artifact Slots
**And** State Machine inner tab order is stable: States → Transitions
**And** empty, loading, and error states preserve work-unit identity context

### AC 9: Backend L2 API Namespace Ownership
**Given** the backend services are implemented
**When** API procedures are exposed
**Then** deep work-unit internals are under nested namespace:
- `methodology.version.workUnit.fact.*`
- `methodology.version.workUnit.workflow.*`
- `methodology.version.workUnit.stateMachine.state.*`
- `methodology.version.workUnit.stateMachine.transition.*`
- `methodology.version.workUnit.stateMachine.transition.conditionSet.*`
- `methodology.version.workUnit.stateMachine.transition.binding.*`
- `methodology.version.workUnit.artifactSlot.*`
- `methodology.version.workUnit.artifactSlot.template.*`

### AC 10: Transaction-Safe L1→L2 Orchestration
**Given** L1 publish/clone operations orchestrate multiple L2 mutations
**When** these operations execute
**Then** they run within a shared transaction context
**And** partial writes are prevented
**And** explicit referential cleanup strategy is enforced

---

## In Scope

### Frontend (L2 Tab Surfaces)
1. **Overview Tab**: Mini-graph, dependency summary, artifact slots summary, quick actions
2. **Facts Tab**: List/table-first, methodology-facts style + extra columns, dialog-first CRUD, NO row expansion
3. **Workflows Tab**: Workflow definition CRUD, routing to workflow editor, read-only bound transitions visibility
4. **State Machine Tab**: States and Transitions inner tabs, state/transition authoring, gate policy, workflow bindings
5. **Artifact Slots Tab**: Slot-first table, templates inside Slot Details dialog (nested table), NO separate templates page

### Backend (L2 Service Ownership)
1. **New Services**:
   - `work-unit-fact-service.ts` - L2 work-unit fact CRUD
   - `work-unit-state-machine-service.ts` - State, transition, condition set, binding CRUD
   - `work-unit-artifact-slot-service.ts` - Artifact slot and template CRUD

2. **Updated Services**:
   - `work-unit-service.ts` - Add nested namespace routing and L2 orchestration
   - `workflow-service.ts` - Move to L2 ownership under work-unit namespace
   - `live.ts` - Add L2 service Layer composition
   - `index.ts` - Export new L2 services

3. **Contracts**:
   - Create `artifact-slot.ts` - Artifact slot and template contracts
   - Update `fact.ts` - Add work-unit-scoped fact variants
   - **Update `lifecycle.ts`** - Add state-machine scoped inputs:
     - Transition CRUD inputs
     - **Fact-based condition set types** (no link requirements)
     - State deletion impact handling
   - Update `index.ts` - Export new L2 contracts

4. **API Router**:
   - Update `methodology.ts` - Add nested `methodology.version.workUnit.*` L2 procedures, keep compatibility aliases

5. **Persistence**:
   - Update `schema/methodology.ts` - Add artifact-slot definitions/templates tables, update lifecycle transition nullability for disconnect option
   - Update `methodology-repository.ts` - Add repository operations for L2 domains
   - Ensure `methodology-tx.ts` supports L2 services within shared transaction context

### Key Behaviors
- **Facts Tab**: Methodology-facts style behavior + one new fact type:
  - **"work unit"** type with dependency type selector for connecting work units
  - Example: Select dependency definition "planning_input" to require WU.PROJECT_CONTEXT
  - **NOTE: JSON Sub-schema Value Types** - When a fact has type "json", the sub-schema field "value types" are: string, number, boolean, array, **work unit**. **No object value type** (no nested JSON). The "work unit" value type behaves identically to the "work unit" fact type (dependency selector included).
- State deletion: warn (not block), list impacted transitions, allow disconnect option, optional cleanup path
- Unbound transitions: warning severity, "Unbound" badge, quick-fix "Add workflow" navigates to Transition Details Page
- **Transition editing: dedicated Transition Details Page with 4 tabs** (Overview, Gate Policy, Binding, Diagnostics) - NOT a dialog
- **Gate Policy: fact-based conditions only** (no link/work unit requirements)
  - Condition types: Fact Check (is defined, equals, matches, etc.)
  - Group nesting: one level deep (ALL/ANY)
  - Real-time preview/simulation
- **Workflow bindings: simple list of workflow IDs** (no execution modes, no primary/secondary)
  - Just a list - operator picks one at execution time
  - Warning if list is empty
- Artifact templates inside Slot Details dialog (not separate tab/page)

## Out of Scope

1. Full Workflow Editor step authoring (separate story)
2. Runtime execution controls, SSE/MCP execution loops
3. Project onboarding flows, brownfield/greenfield runtime chains
4. Non-methodology project surfaces
5. Deep agent runtime/provider registry UX beyond harness selection
6. Replacing canonical methodology editing contracts at L1
7. Manual edits to generated route-tree artifacts
8. File-level runtime audit expansion (deferred)
9. Story-level fan-out and child work-unit creation (Epic 5)

---

## Tasks / Subtasks

### Execution Mode Lock (approved)
- [x] Implementation strategy locked to **backend foundation first**, then UI tab slices one-by-one.
- [x] UI tab execution order locked: **Overview → Facts → Workflows → State Machine → Artifact Slots**.
- [x] At each tab boundary, stop and lock **behavior + look/layout + UX interactions** before coding that tab.
- [x] Overview starts with **simple ASCII wireframes** before implementation.
- [x] Do not implement all tabs in a single pass; complete tests + commit per tab slice.
- [x] Canonical execution plan: `docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md`.
- [x] Design-time work-unit fact table name locked to **`work_unit_fact_definitions`** (separate from methodology-level fact definitions).

### Backend Foundation (Slice 1 - Low-Risk)
- [x] Pre-Implementation Cleanup Gate (must complete before Slice 1)
  - [x] Remove deprecated fact `required` persistence/typing/projection usage for methodology + work-unit fact definitions.
  - [x] Align canonical seed scope to metadata-only pre-L2 baseline (no project-context lifecycle/workflow seeding yet).
  - [x] Complete and verify plan in `docs/plans/2026-03-20-story-3-2-pre-implementation-cleanup-plan.md`.
- [x] Task 1.1: Create artifact-slot contracts and schema (AC: 9)
  - [x] Include completed baseline schema migration context before new deferred work:
    - `work_unit_lifecycle_states`, `work_unit_lifecycle_transitions`, `transition_condition_sets`
    - gate class derived from condition-set phase in authoring surfaces
    - workflow I/O contracts removed from active model
  - [x] Align fact persistence split naming before L2 tab implementation:
    - methodology-level facts remain in `methodology_fact_definitions`
    - work-unit-scoped design-time facts move/use `work_unit_fact_definitions`
  - [x] Create `packages/contracts/src/methodology/artifact-slot.ts`
  - [x] Update `packages/db/src/schema/methodology.ts` with artifact-slot tables
  - [x] Add repository methods in `packages/db/src/methodology-repository.ts`
  - [x] Add targeted tests for artifact-slot CRUD paths

### Backend State Machine & Workflow Ownership (Slice 2)
- [x] Task 2.1: Create state-machine nested contracts and service (AC: 9)
  - [x] Update `packages/contracts/src/methodology/lifecycle.ts` with state-machine inputs
  - [x] Create `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
  - [x] Implement state CRUD with deletion impact handling
  - [x] Implement transition CRUD with unbound detection
  - [x] Implement condition set and binding CRUD
- [x] Task 2.2: Create work-unit fact service (AC: 9)
  - [x] Update `packages/contracts/src/methodology/fact.ts` with work-unit-scoped variants
  - [x] Create `packages/methodology-engine/src/services/work-unit-fact-service.ts`
- [x] Task 2.3: Update API router with L2 nested paths (AC: 9)
  - [x] Add `methodology.version.workUnit.fact.*` procedures
  - [x] Add `methodology.version.workUnit.workflow.*` procedures
  - [x] Add `methodology.version.workUnit.stateMachine.*` procedures
  - [x] Add `methodology.version.workUnit.artifactSlot.*` procedures
  - [x] Keep compatibility aliases during transition

### Frontend Overview Tab (Slice 3)
- [ ] Task 3.1: Implement Overview Tab Core Structure (AC: 1)
  - [x] Overview command surface rendered in L2 detail route with four cards (Facts, Workflows, State Machine, Artifact Slots)
  - [x] Summary counts surfaced for facts, workflows, states, transitions, and artifact slots
  - [x] Quick action buttons wired for add-flow entry points
  - [x] Keymap helper (`?`/`Shift+/`) implemented with toggle behavior and viewport-anchored bottom-right menu
  - [x] UX override applied: no mini-graph in Overview for current approved design direction

### Frontend Facts Tab (Slice 4)
- [x] Task 4.1: Implement Facts Tab (AC: 2)
  - [x] List/table-first view (methodology-facts style)
  - [x] Extra columns for L2 metadata
  - [x] Dialog-first CRUD (NO row expansion)
  - [x] Integration with `methodology.version.workUnit.fact.*` API

### Frontend Workflows Tab (Slice 5)
- [ ] Task 5.1: Implement Workflows Tab (AC: 3)
  - [ ] Workflow list with read-only bound transitions
  - [ ] Summary strip with counts
  - [ ] Search and filter functionality
  - [ ] Row expansion (accordion)
  - [ ] Workflow Editor routing
  - [ ] Integration with `methodology.version.workUnit.workflow.*` API

### Frontend State Machine Tab (Slice 6)
- [ ] Task 6.1: Implement State Machine Tab Shell (AC: 4, 8)
  - [ ] Inner tabs: States and Transitions
  - [ ] Summary strip with counts
  - [ ] Page-level actions
- [ ] Task 6.2: Implement States Inner Tab (AC: 4, 5)
  - [ ] State list/table
  - [ ] State creation dialog
  - [ ] State deletion with impact dialog (warn, not block)
  - [ ] Disconnect vs cleanup options
- [ ] Task 6.3: Implement Transitions Inner Tab (AC: 4, 6)
  - [ ] Transition list with gate mode and allowed workflows count
  - [ ] Unbound badge and warning treatment
  - [ ] Quick-fix "Add workflow" action
  - [ ] "Details" action navigates to Transition Details Page
- [ ] Task 6.4: Implement Transition Details Page (AC: 4a, 4b, 4c)
  - [ ] Create route: `/transitions/:transitionId`
  - [ ] Overview Tab: Basic info, status, usage stats
  - [ ] Gate Policy Tab: Fact-based condition set editor
    - [ ] Fact check operators (is defined, equals, matches, etc.)
    - [ ] ALL/ANY group nesting
    - [ ] Real-time preview
  - [ ] Binding Tab: Simple workflow list (add/remove)
  - [ ] Diagnostics Tab: Validation results
  - [ ] Integration with `methodology.version.workUnit.stateMachine.transition.*` API

### Frontend Artifact Slots Tab (Slice 7)
- [ ] Task 7.1: Implement Artifact Slots Tab (AC: 7)
  - [ ] Slot table with cardinality and templates count
  - [ ] Summary with slot counts
  - [ ] Add Slot action
  - [ ] Row expansion
- [ ] Task 7.2: Implement Slot Details Dialog (AC: 7)
  - [ ] Stacked dialog: Basics, Rules, Templates
  - [ ] Nested templates table inside dialog
  - [ ] Template CRUD within slot context
  - [ ] Integration with `methodology.version.workUnit.artifactSlot.*` API

### Frontend Shell and Integration (Slice 8)
- [ ] Task 8.1: Implement L2 Tab Shell (AC: 8)
  - [ ] Tab navigation shell with stable ordering
  - [ ] Selected work-unit context preservation
  - [ ] Loading/empty/error state handling
  - [x] Route integration from L1 to dedicated detail route (`.../work-units/$workUnitKey`) via list actions
- [ ] Task 8.2: Findings and Diagnostics (AC: 1-7)
  - [ ] Shared findings components
  - [ ] Severity display (error, warning, info)
  - [ ] Inline and aggregate findings
  - [ ] Consistent with `diagnostics-visual-treatment.md`

### Testing and Verification (Slice 9)
- [ ] Task 9.1: Backend Tests
  - [ ] Unit tests for new L2 services
  - [ ] API router tests for nested procedures
  - [ ] Repository tests for artifact-slot and state-machine operations
- [ ] Task 9.2: Frontend Tests
  - [ ] Route integration tests
  - [ ] Component tests for tab surfaces
  - [ ] State deletion dialog tests
  - [ ] Unbound transition behavior tests
- [ ] Task 9.3: E2E Verification
  - [ ] Manual hands-on scenario: L1 → L2 → all tabs → state delete → transition binding
  - [ ] Playwright scenario: Tab navigation, state deletion warning, unbound transition quick-fix

---

## Dev Notes

### Backend Architecture Decisions

#### 1. L1 vs L2 Ownership Boundaries
- **Keep methodology version as publish/release aggregate root** (L1 remains narrow)
- **Move deep work-unit internals into L2 ownership** under nested namespace:
  - `methodology.version.workUnit.fact.*`
  - `methodology.version.workUnit.workflow.*`
  - `methodology.version.workUnit.stateMachine.state.*`
  - `methodology.version.workUnit.stateMachine.transition.*`
  - `methodology.version.workUnit.artifactSlot.*`
  - `methodology.version.workUnit.artifactSlot.template.*`

Note: Transitions contain embedded gate policy (fact conditions) and allowedWorkflowIds array. No separate conditionSet or binding procedures.

#### 2. L1 Narrow Scope
- Version lifecycle + publication
- Methodology-level facts/agents/dependency definitions
- Shallow work-unit metadata only

#### 3. L2 Deep Ownership
- Work-unit facts
- Work-unit workflows
- Work-unit state machine (states/transitions/condition sets/bindings)
- Artifact slots

#### 4. Transaction Integrity
- L1 publish/clone orchestration must pass shared transaction context into L2 mutation services
- Use `MethodologyTx` boundary for atomic L1→L2 operations
- Prevent partial writes when L1 operations invoke multiple L2 mutations

#### 5. Referential Cleanup Strategy
- L2 child entities cascade on parent work-unit/version deletion where appropriate
- FK cascade semantics on L2 child tables scoped to work units/versions
- Explicit disconnect option for state deletion (nulling state refs)

#### 6. Compatibility During Migration
- Preserve compatibility aliases during migration from `updateDraftLifecycle`/`updateDraftWorkflows` paths
- Mark old paths as transitional for L2-owned domains
- Remove only after web migration is complete

### Technical Requirements

#### Stack Constraints
- **Frontend**: React + TanStack Router + shadcn/ui
- **State Management**: TanStack Query with stable query keys
- **Backend**: Hono + oRPC + Effect
- **Database**: SQLite with Drizzle ORM
- **Testing**: Bun test + Playwright

#### Database Schema Alignment
- Work with `work_unit_types` table for work unit definitions
- Facts align with `methodology_facts` schema (work-unit-scoped)
- Artifact slots use `methodology_artifact_slot_definitions` and `methodology_artifact_slot_templates`
  - Slot fields: `key`, `display_name`, `description_json`, `guidance_json`, `cardinality(single|fileset)`, optional `rules_json`
  - Template fields: `slot_definition_id`, `key`, `display_name`, `description_json`, `guidance_json`, `content`
  - Excluded in v1: `purpose`, `allowed_namespaces_json`, `default_content_json`, separate persisted `variables`
- State machine uses transition condition sets (not legacy `transition_required_links`)
- Update `to_state_id` nullability to support state deletion disconnect option

#### Key Implementation Patterns
- Dialog-first CRUD for Facts and Artifact Slots (not inline editing)
- Stacked dialog editing for Artifact Slots (Level 1-3) and State Machine transitions
- Accordion row expansion for concise context in lists
- Summary strips for aggregate counts at page level
- Warn (not block) for state deletion with impact disclosure
- Warning (not blocking) for unbound transitions

### File/Service Planning Section

#### A) Services and Layer Composition

**Create:**
- `packages/methodology-engine/src/services/work-unit-fact-service.ts`
- `packages/methodology-engine/src/services/work-unit-state-machine-service.ts`
- `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts`

**Update:**
- `packages/methodology-engine/src/services/work-unit-service.ts`
- `packages/methodology-engine/src/services/workflow-service.ts`
- `packages/methodology-engine/src/layers/live.ts`
- `packages/methodology-engine/src/index.ts`

#### B) Contracts

**Create:**
- `packages/contracts/src/methodology/artifact-slot.ts`

**Update:**
- `packages/contracts/src/methodology/fact.ts` (work-unit-scoped variants)
- `packages/contracts/src/methodology/lifecycle.ts` (state-machine scoped inputs, transition cleanup intent)
- `packages/contracts/src/methodology/index.ts`

#### C) API Router

**Update:**
- `packages/api/src/routers/methodology.ts`
  - Add nested `methodology.version.workUnit.*` L2 procedures
  - Keep compatibility aliases during transition
  - Mark `updateDraftLifecycle`/`updateDraftWorkflows` as transitional

#### D) Persistence

**Update:**
- `packages/db/src/schema/methodology.ts`
  - Add artifact-slot definitions/templates tables
  - Update lifecycle transition nullability for state-delete disconnect
- `packages/db/src/methodology-repository.ts`
  - Add repository operations for L2 domains
- `packages/methodology-engine/src/ports/methodology-tx.ts`
  - Ensure L2 services run within shared transaction context

#### E) Frontend Routes and Components

**Update/Create:**
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` (L2 container)
- `apps/web/src/features/methodologies/work-unit-l2/`
  - `OverviewTab.tsx`
  - `FactsTab.tsx`
  - `WorkflowsTab.tsx`
  - `StateMachineTab.tsx` (with States and Transitions inner tabs)
  - `ArtifactSlotsTab.tsx`
- `apps/web/src/features/methodologies/work-unit-l2/components/`
  - `StateDeletionDialog.tsx`
  - `SlotDetailsDialog.tsx`
  - `MiniDependencyGraph.tsx`
- `apps/web/src/features/methodologies/transitions/`
  - `TransitionDetailsPage.tsx` (main page with 4 tabs: Overview, Gate Policy, Binding, Diagnostics)
  - `tabs/OverviewTab.tsx`
  - `tabs/GatePolicyTab.tsx` (fact condition editor)
  - `tabs/BindingTab.tsx` (simple workflow list)
  - `tabs/DiagnosticsTab.tsx`
  - `components/FactConditionEditor.tsx`
  - `components/ConditionList.tsx`

### Existing Implementation Snapshot (from Story 3.1)

**Current State:**
- L1 Work Units overview page implemented at `/methodologies/:methodologyId/versions/:versionId/work-units`
- L2 route shell exists at `/methodologies/:methodologyId/versions/:versionId/work-units/:workUnitKey`
- Author hub provides navigation to L1 surfaces
- Shallow work-unit API exists: `methodology.version.workUnit.list/create/get/updateMeta/delete`
- Facts, Agents, Dependency Definitions have dedicated pages with dialog-first CRUD

**Story 3.1 Gaps Now Closed in 3.2:**
- No L2 work-unit fact operations
- No state-machine authoring surfaces
- No artifact slot management
- Workflow bindings owned elsewhere (now moved to State Machine)

### CRUD Contracts By Surface

#### Facts Tab
- **Pattern**: List/table-first, **methodology-facts style**, dialog-first CRUD, NO row expansion
- **Fact Types**: string, number, boolean, array, object, **work unit** (with dependency type selector)
- **Work Unit Type**: Select dependency definition to connect work units (e.g., "planning_input", "consumes")
- **Create**: Dialog with Contract + Guidance tabs
- **Read**: Table with name, key, type, validation, findings columns
  - For work unit type: shows dependency type badge
- **Update**: Edit dialog
- **Delete**: Confirmation dialog

#### Workflows Tab
- **Pattern**: Workflow definition CRUD, routing to Workflow Editor
- **Create**: "+ Add Workflow" opens workflow creation flow
- **Read**: List with bound/unbound status, row expansion
- **Update**: "Open Workflow Editor" for deep editing
- **Delete**: Confirmation with impact check
- **Note**: Binding is read-only here; binding ownership in State Machine

#### State Machine Tab

**States Inner Tab:**
- **Create**: "+ Add State" dialog
- **Read**: List of states with usage counts
- **Update**: Edit state dialog
- **Delete**: Impact dialog with disconnect vs cleanup options (warn, not block)

**Transitions Inner Tab:**
- **Create**: "+ Add Transition" → opens Transition Details Page with empty form
- **Read**: List with gate mode (all/any), allowed workflows count, findings
- **Update**: Click "Details" → Transition Details Page with 4 tabs (Overview, Gate Policy, Binding, Diagnostics)
- **Delete**: Confirmation dialog
- **Special**: Unbound transitions (no workflows) show warning badge + "Add workflow" quick-fix

#### Artifact Slots Tab
- **Pattern**: Slot-first, templates inside Slot Details dialog
- **Create**: "+ Add Slot" → Slot Details dialog (Level 1 Basics)
- **Read**: Table with key, cardinality, template count
- **Update**: Edit in Slot Details dialog
- **Delete**: Confirmation
- **Templates**: Nested table inside Slot Details (Level 3), NOT separate page

### UI Behavior Contract

#### L2 Tabs
1. **Overview**: Summarizes and routes, not full editor
2. **Facts**: List/table-first, methodology-facts style + extra columns, NO row expansion
3. **Workflows**: Workflow catalog + routing, read-only binding visibility
4. **State Machine**: States + Transitions inner tabs
   - **Transition Details Page** (not dialog): 4 tabs (Overview, Gate Policy, Binding, Diagnostics)
   - **Gate Policy**: Fact-based conditions only (no link requirements)
   - **Binding**: Simple list of workflow IDs (no execution modes)
5. **Artifact Slots**: Slot-first, templates nested inside Slot Details

#### State Deletion
- **Severity**: Warning (not blocking)
- **Impact Disclosure**: List all impacted transitions explicitly
- **Primary Option**: Disconnect (null state refs)
- **Secondary Option**: Cleanup (delete impacted transitions)
- **Confirmation Required**: Yes, with clear impact enumeration

#### Unbound Transition
- **Severity**: Warning (not blocking)
- **Visual**: "Unbound" badge on transition row (0 workflows allowed)
- **Quick-Fix**: "Add workflow" inline action
- **Action Result**: Navigates to Transition Details Page, Binding tab

### Architecture Compliance

**Must Follow:**
1. `docs/architecture/methodology-pages/work-units/detail-tabs.md` - L2 tab model
2. `docs/architecture/methodology-pages/artifact-slots-design-time.md` - Artifact Slots authority
3. `docs/architecture/methodology-pages/state-machine-tab.md` - State Machine authority
4. `docs/architecture/methodology-pages/methodology-facts.md` - Facts semantics
5. `docs/architecture/ux-patterns/diagnostics-visual-treatment.md` - Findings treatment
6. `docs/architecture/epic-3-authority.md` - Epic 3 routing authority
7. `docs/plans/2026-03-19-story-3-2-l2-methodology-engine-design.md` - Backend ownership

**Component Boundaries:**
- Overview: summarizes and routes
- Facts: durable work-unit fact contracts
- Workflows: workflow catalog context and routing
- State Machine: lifecycle states, transitions, gate policy, workflow bindings (ownership)
- Artifact Slots: design-time artifact-slot contracts

### Testing Requirements

#### Backend Tests
- Unit tests for `work-unit-fact-service.ts`
- Unit tests for `work-unit-state-machine-service.ts` (including state deletion impact)
- Unit tests for `work-unit-artifact-slot-service.ts`
- API router tests for nested L2 procedures
- Repository tests for artifact-slot and state-machine operations
- Transaction integration tests for L1→L2 orchestration

#### Frontend Tests
- Route integration tests for L2 tab navigation
- Component tests for Facts tab (list/table-first, no row expansion)
- Component tests for State Machine tab (inner tabs, state deletion dialog)
- Component tests for unbound transition behavior (warning badge, quick-fix)
- Component tests for Artifact Slots (templates inside dialog)

#### E2E Verification
- **Manual Scenario**: 
  1. Navigate L1 → Select work unit → Open L2
  2. Visit all 5 tabs
  3. Create a state with transitions
  4. Delete state (verify warning + impact list + disconnect option)
  5. Create unbound transition (verify warning badge)
  6. Click "Add workflow" (verify navigates to Transition Details Page)
  7. Navigate to Gate Policy tab (verify fact-based condition editor)
- **Playwright Scenario**: Automated version of manual scenario

#### Validation Commands
```bash
# Backend tests
bun run --cwd packages/methodology-engine test -- src/tests/l2/*.test.ts
bun run --cwd packages/api test -- src/tests/routers/methodology.test.ts

# Frontend tests
bun run --cwd apps/web test -- 'src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units*.integration.test.tsx'
bun run --cwd apps/web test -- 'src/tests/features/methodologies/work-unit-l2*.test.tsx'

# Type checks
bun run check-types
bun run --cwd apps/web check-types

# Lint/format
bun run check

# E2E
bunx playwright test tests/e2e/story-3-2-l2-authoring.spec.ts
```

---

## Definition of Done

### 1) Backend Completion
- [ ] All new L2 services created (`work-unit-fact-service`, `work-unit-state-machine-service`, `work-unit-artifact-slot-service`)
- [ ] API router exposes nested `methodology.version.workUnit.*` procedures
- [ ] Contracts updated with work-unit-scoped variants
- [ ] Schema updated with artifact-slot tables and transition nullability
- [ ] Transaction context supports L1→L2 orchestration
- [ ] Compatibility aliases preserved during migration

### 2) Frontend Tab Completion
- [ ] Overview tab displays mini-graph, summary chips, quick actions
- [x] Facts tab is list/table-first with methodology-facts style + extra columns, NO row expansion
- [ ] Workflows tab shows workflow catalog with read-only allowed workflows visibility
- [ ] State Machine tab has States + Transitions inner tabs
- [ ] **Transition Details Page** with 4 tabs (Overview, Gate Policy, Binding, Diagnostics)
- [ ] Gate Policy tab with **fact-based condition editor** (no link requirements)
- [ ] Binding tab with **simple workflow list** (add/remove workflows)
- [ ] State deletion shows warning (not block) with impact list and disconnect option
- [ ] Unbound transitions show warning badge and quick-fix "Add workflow"
- [ ] Artifact Slots tab shows slot-first table, templates inside Slot Details dialog

### 3) Integration and Routing
- [ ] L2 shell preserves selected work-unit context across tab switches
- [ ] Tab order is stable and deterministic
- [ ] Navigation from L1 to L2 works correctly
- [ ] Empty/loading/error states are implemented

### 4) Behavior Compliance
- [ ] State deletion: warn, list impacts, offer disconnect (primary) and cleanup (secondary)
- [ ] Unbound transitions: warning severity, badge visible, quick-fix opens transition dialog on binding tab
- [ ] Workflow bindings: authored in State Machine (not Workflows tab)
- [ ] Artifact templates: inside Slot Details (not separate page)

### 5) Testing and Evidence
- [ ] Backend unit tests pass for all new services
- [ ] API router tests pass for L2 procedures
- [ ] Frontend component tests pass for tab surfaces
- [ ] Manual hands-on scenario completed and documented
- [ ] Playwright scenario passes
- [ ] All validation commands pass

### 6) Documentation
- [ ] Evidence pack complete with all required logs
- [ ] Dev agent record updated with model, debug logs, completion notes, file list

---

## Evidence Pack

### Required Evidence Artifacts

1. **l2-tabs-parity-log**: Screenshots/notes proving all 5 tabs render correctly
2. **artifact-slots-authoring-log**: Evidence of slot CRUD and nested template management
3. **facts-tab-authoring-log**: Evidence of list/table-first facts authoring without row expansion
4. **state-machine-authoring-log**: Evidence of States + Transitions inner tabs, gate policy editing
5. **l2-backend-ownership-log**: API namespace verification showing `methodology.version.workUnit.*` procedures
6. **l2-api-namespace-log**: Documentation of nested API structure

### Diagnostic Artifacts

1. **l2-tabs-findings-diagnostics**: Findings treatment consistency across tabs
2. **state-machine-validation-diagnostics**: State/transition validation behavior
3. **artifact-slots-validation-diagnostics**: Slot and template validation
4. **l2-referential-cleanup-diagnostics**: State deletion impact handling and cleanup verification

---

## References

### Source Documents
- [Source: _bmad-output/implementation-artifacts/3-1-complete-design-time-ia-and-page-shell-baseline.md]
- [Source: docs/plans/2026-03-19-story-3-2-l2-methodology-engine-design.md]
- [Source: docs/architecture/methodology-pages/work-units/detail-tabs.md]
- [Source: docs/architecture/methodology-pages/state-machine-tab.md]
- [Source: docs/architecture/methodology-pages/artifact-slots-design-time.md]
- [Source: docs/architecture/methodology-pages/work-units/overview.md]
- [Source: docs/architecture/methodology-pages/methodology-facts.md]
- [Source: docs/architecture/epic-3-authority.md]
- [Source: docs/architecture/ux-patterns/diagnostics-visual-treatment.md]
- [Source: docs/architecture/chiron-module-structure.md]

### Planning Documents
- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Functional Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Backend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
- [Source: docs/plans/2026-03-20-story-3-2-l2-implementation-plan.md]
- [Source: docs/plans/2026-03-20-story-3-2-overview-command-surface-design.md]
- [Source: docs/plans/2026-03-20-story-3-2-overview-command-surface-implementation-plan.md]
- [Source: docs/plans/2026-03-20-story-3-2-pre-implementation-cleanup-plan.md]
- [Source: docs/plans/2026-03-20-story-3-2-artifact-slots-implementation-plan.md]

### Implementation Files (from Story 3.1)
- [Source: apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx]
- [Source: apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx]
- [Source: packages/methodology-engine/src/services/work-unit-service.ts]
- [Source: packages/methodology-engine/src/services/workflow-service.ts]
- [Source: packages/api/src/routers/methodology.ts]

---

## Dev Agent Record

### Agent Model Used

- `opencode/gpt-5.3-codex` (Hephaestus)

### Debug Log References

- Migration verification and cleanup pass logs (repo searches + targeted tests) covering:
  - lifecycle table rename migration (`work_unit_lifecycle_states`, `work_unit_lifecycle_transitions`, `transition_condition_sets`)
  - transition gate policy authority shift (derived from condition-set phase in authoring surfaces)
  - workflow I/O contract removal from active code/docs
- Focused validation runs:
  - `apps/web`: `version-workspace.integration.test.tsx`, `version-workspace.persistence.test.ts`
  - `packages/api`: `src/tests/routers/methodology.test.ts`
  - `packages/methodology-engine`: lifecycle/version validation suites
  - `packages/db`: lifecycle and methodology repository integration suites

### Completion Notes List

- Completed pre-artifact-slot migration baseline for Story 3.2 prerequisites:
  - Renamed lifecycle/condition-set persistence tables to the approved names.
  - Removed workflow-level I/O contracts from active model surfaces and docs.
  - Removed `gateClass` as editable/stored authoring input; methodology authoring now derives gate class from condition-set phases.
  - Updated API/repository/contracts/seeds/tests to align with table/column changes.
- Verified no remaining old lifecycle table names or workflow I/O contract terms in active `*.{ts,tsx,md,sql}` surfaces.
- Verified methodology workspace authoring tests remain green after gate derivation shift.
- Remaining Story 3.2 scope now centered on deferred implementation:
  - remaining backend L2 services + nested API + UI tabs (Overview/Facts/Workflows/State Machine/Artifact Slots).
- Completed cleanup-gate verification and Task 1.1 backend foundation for artifact slots:
  - verified cleanup gate suites (db/api/engine/scripts) remain green with required-field deprecation and metadata-only seed scope.
  - added artifact-slot contracts (`packages/contracts/src/methodology/artifact-slot.ts`) and export wiring.
  - added artifact-slot definition/template schema tables in DB schema.
  - implemented repository methods for replacing and reading work-unit scoped artifact slots with nested templates.
  - added repository integration coverage proving nested template persistence and retrieval.
- Added nested work-unit API namespace surface and artifact-slot route behavior:
  - `methodology.version.workUnit.fact.*`, `.workflow.*`, `.stateMachine.*`, and `.artifactSlot.*` paths now exist on router aliases.
  - added artifact-slot replace/list behavior through `MethodologyVersionBoundaryService` with repository-backed persistence.
  - added router integration test coverage validating nested namespace exposure and artifact-slot round-trip.
- Added L2 service-contract scaffolding for pending backend slices:
  - created `work-unit-fact-service.ts`, `work-unit-state-machine-service.ts`, and `work-unit-artifact-slot-service.ts` contracts/tags.
  - exported new service contracts from methodology-engine index and validated scaffold export tests.
  - attempted to wire artifact-slot live layer into L1 aggregate, then reverted after runtime dependency failure in API router tests; service remains exported and available for explicit composition.
- Completed Task 2 state-machine/fact ownership implementation slice:
  - expanded lifecycle contracts with work-unit scoped state-machine mutation inputs for states, transitions, condition-sets, and bindings.
  - expanded fact contracts with work-unit scoped get/replace inputs.
  - implemented `work-unit-state-machine-service.ts` list/upsert/delete flows plus transition binding updates through workflow authoring path.
  - implemented `work-unit-fact-service.ts` list/replace flows mapped to authoring snapshot and lifecycle update APIs.
  - added L2-L3 tests for state deletion disconnect behavior, binding replacement routing, and work-unit fact replacement.
- Completed Story 3.2 Overview command-surface and routing stabilization slice:
  - implemented Overview tab command-card surface and count summaries in work-unit detail route.
  - implemented detail keymap helper with keyboard toggle (`?`/`Shift+/`) and `Escape` close behavior.
  - fixed duplicate breadcrumb rendering in detail page by adding shell-level breadcrumb visibility control.
  - fixed keymap positioning root cause (class conflict between `fixed` and `chiron-frame-flat`) and anchored helper to viewport bottom-right.
- Reworked L1 work-units page to clearer list-first surface:
  - removed graph/contracts/diagnostics layout from L1 work-units shell.
  - added metadata-first columns (cardinality, human guidance, agent guidance) plus explicit row actions.
  - wired row-level “View details” navigation to dedicated work-unit detail route and retained row-level edit action.
- Started Facts tab UI slice with approved keymap and badge treatment:
  - added `work-unit-l2/FactsTab.tsx` table-first surface (Fact / Type / Validation / Guidance / Actions).
  - implemented dialog-first add/edit/delete behavior without row expansion.
  - rendered dependency as validation badge (`DEP: ...`) and expanded semantic badge colors for type/validation/dependency.
  - wired Facts tab rendering in L2 detail route and route-level `F` hotkey to open create dialog.
  - removed newly introduced Facts-tab `useEffect` patterns and switched to render-derived/event-driven state flow.

### File List

#### Backend Files Created/Updated
- `packages/methodology-engine/src/services/work-unit-fact-service.ts` (create)
- `packages/methodology-engine/src/services/work-unit-state-machine-service.ts` (create)
- `packages/methodology-engine/src/services/work-unit-artifact-slot-service.ts` (create)
- `packages/methodology-engine/src/services/work-unit-service.ts` (update)
- `packages/methodology-engine/src/services/workflow-service.ts` (update)
- `packages/methodology-engine/src/services/methodology-version-service.ts` (update)
- `packages/methodology-engine/src/layers/live.ts` (update)
- `packages/methodology-engine/src/index.ts` (update)
- `packages/methodology-engine/src/repository.ts` (update)
- `packages/contracts/src/methodology/artifact-slot.ts` (create)
- `packages/contracts/src/methodology/fact.ts` (update)
- `packages/contracts/src/methodology/lifecycle.ts` (update)
- `packages/contracts/src/methodology/index.ts` (update)
- `packages/api/src/routers/methodology.ts` (update)
- `packages/db/src/schema/methodology.ts` (update)
- `packages/db/src/methodology-repository.ts` (update)

> Note: As of this in-progress update, backend L2 contracts/services/router foundations are implemented and validated; remaining work is UI tab behavior slices and end-to-end evidence/verification.

> Note: Overview command-surface UX is implemented and validated, with explicit product-direction override to omit mini-graph. Facts tab slice is complete (list/dialog behavior, work-unit dependency selector/autocomplete, API-backed work-unit fact mutations, and destructive delete UX); Workflows/State Machine/Artifact Slots behaviors and full story evidence pack remain pending.

#### Frontend Files Created/Updated
- `apps/web/src/features/methodologies/work-units-list-view.tsx` (update)
- `apps/web/src/features/methodologies/workspace-shell.tsx` (update)
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.tsx` (update)
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` (update)
- `apps/web/src/features/methodologies/work-unit-l2/OverviewTab.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/FactsTab.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/WorkflowsTab.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/ArtifactSlotsTab.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/components/StateDeletionDialog.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/components/SlotDetailsDialog.tsx` (create)
- `apps/web/src/features/methodologies/work-unit-l2/components/MiniDependencyGraph.tsx` (create)
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.transitions.$transitionId.tsx` (create)
- `apps/web/src/features/methodologies/transitions/TransitionDetailsPage.tsx` (create)
- `apps/web/src/features/methodologies/transitions/tabs/OverviewTab.tsx` (create)
- `apps/web/src/features/methodologies/transitions/tabs/GatePolicyTab.tsx` (create)
- `apps/web/src/features/methodologies/transitions/tabs/BindingTab.tsx` (create)
- `apps/web/src/features/methodologies/transitions/tabs/DiagnosticsTab.tsx` (create)
- `apps/web/src/features/methodologies/transitions/components/FactConditionEditor.tsx` (create)
- `apps/web/src/features/methodologies/transitions/components/ConditionList.tsx` (create)

#### Test Files Created/Updated
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.work-units.integration.test.tsx` (update)
- `apps/web/src/tests/routes/methodologies.$methodologyId.versions.$versionId.shell-routes.integration.test.tsx` (update)
- `packages/db/src/tests/repository/methodology-repository.integration.test.ts` (update)
- `packages/api/src/tests/routers/methodology.test.ts` (update)
- `packages/methodology-engine/src/tests/l2-l3/scaffold-contracts.test.ts` (update)
- `packages/methodology-engine/src/tests/l2-l3/work-unit-l2-services.test.ts` (create)
- Test files for frontend L2 components (create)
- Playwright E2E spec for Story 3.2 (create)
