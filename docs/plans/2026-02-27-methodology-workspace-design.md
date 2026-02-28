# Story 2.1 Methodology Workspace Design

Date: 2026-02-27
Owner: Scrum Master (design handoff)
Status: Approved-for-planning (defaulted to graph-first interaction model)

## 1) Goal and Scope

Implement the Epic 2 Story 2.1 operator workbench experience for methodology draft authoring and validation:

- Edit core draft contract fields (`methodologyKey`, `displayName`, work units, fact schemas, transitions, workflow definitions, transition bindings)
- Persist edits via Epic 1 typed backend contracts
- Provide deterministic validation diagnostics and block publish while blockers exist
- Publish valid draft to immutable version and display evidence summary
- Keep runtime execution explicitly out of scope for Epic 2

## 2) Interaction Model Decision

Selected model: **Graph-first**.

Rationale:

- Transition-binding reasoning is spatial and benefits from central graph context
- Keeps operator mental model aligned with work units/transitions as first-class entities
- Supports fast inspect/edit loop via right-side inspector without navigation churn

## 3) Alternative Approaches and Trade-offs

### Approach A (recommended): Graph-first workspace

- Central React Flow canvas, left catalog/navigation, right inspector/validation tabs
- Pros: best for transition/binding comprehension; fast expert workflow
- Cons: denser layout, requires careful responsive behavior

### Approach B: Form-first with graph as secondary tab

- Contract forms dominate; graph in separate tab or collapsible panel
- Pros: easiest implementation and straightforward validation mapping
- Cons: weaker transition mental model and slower binding operations

### Approach C: Split-equal permanent dual pane

- Graph and forms always visible equally
- Pros: predictable and explicit
- Cons: cramped on common desktop widths; high visual noise and reduced focus

## 4) Screen Blueprint

## 4.1 Layout Regions

1. Top command bar
   - Methodology identity (`displayName`, key), unsaved indicator, global status chip (`normal/loading/blocked/failed/success`)
   - Actions: Save Draft, Validate, Publish Draft
   - Persistent non-executable banner: "Draft authoring only. Runtime execution unlocks in Epic 3+."

2. Left rail (catalog + structure)
   - Work Unit list/tree
   - Workflow catalog list (bound/unbound badges)
   - Quick filters + search

3. Center canvas (React Flow)
   - Nodes: work units
   - Edges: transitions
   - Transition selection drives inspector context
   - Disabled runtime controls are visible with blocked rationale text

4. Right inspector stack
   - Tabs: Transition, Work Unit, Fact Schema, Validation
   - Field-level editors with inline diagnostics
   - Binding matrix details for selected transition

5. Bottom evidence/diagnostics drawer (collapsible)
   - Structured diagnostics table (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`)
   - Publish result summary panel for immutable version + evidence refs

## 4.2 Mobile/Small Viewport Behavior

- Keep desktop as primary target, but preserve usability:
  - Collapse left rail into drawer
  - Inspector becomes slide-over panel
  - Diagnostics drawer defaults to full-screen sheet when opened

## 5) Component Tree and Contract Sketch

```text
MethodologyWorkspaceRoute
  -> MethodologyWorkspaceShell
     -> WorkspaceTopBar
     -> DraftNonExecutableBanner
     -> WorkspaceLayout
        -> MethodologyCatalogRail
           -> WorkUnitTree
           -> WorkflowCatalogList
        -> MethodologyGraphCanvas (React Flow)
           -> WorkUnitNode
           -> TransitionEdge
           -> GraphSelectionController
        -> MethodologyInspectorPanel
           -> TransitionInspectorTab
              -> WorkflowBindingMatrixPanel
              -> TransitionRuleEditorPanel
           -> WorkUnitInspectorTab
              -> WorkUnitTypeEditorPanel
           -> FactSchemaInspectorTab
              -> FactSchemaEditor
           -> ValidationInspectorTab
              -> MethodologyValidationPanel
     -> PublishSharePanel
     -> DiagnosticsDrawer
```

Key props/events (selected):

- `MethodologyWorkspaceShell`
  - props: `methodologyId`, `initialView?`
  - events: `onSaveDraft`, `onValidateDraft`, `onPublishDraft`

- `MethodologyGraphCanvas`
  - props: `nodes`, `edges`, `selectedTransitionId`, `selectedWorkUnitId`
  - events: `onNodesChange`, `onEdgesChange`, `onSelectTransition`, `onSelectWorkUnit`

- `WorkflowBindingMatrixPanel`
  - props: `transitionId`, `boundWorkflowIds`, `eligibleWorkflowCatalog`
  - events: `onBindWorkflow`, `onUnbindWorkflow`

- `FactSchemaEditor`
  - props: `schema`, `diagnostics`
  - events: `onAddField`, `onUpdateField`, `onRemoveField`, `onValidateField`

- `MethodologyValidationPanel`
  - props: `diagnostics`, `isBlocking`
  - events: `onJumpToField`, `onAcknowledgeNonBlocking`

- `PublishSharePanel`
  - props: `publishState`, `immutableVersion?`, `evidenceSummary?`
  - events: `onPublish`

## 6) Data Flow and State Model

Query/mutation strategy (TanStack Query v5 + typed oRPC client):

1. Load draft query
   - Fetch methodology draft + graph + bindings + validation snapshot

2. Local edit state
   - Controlled form state in inspector/editors
   - Controlled graph state in React Flow (`useNodesState`, `useEdgesState`)

3. Persist mutations
   - Save work-unit edits, transition edits, workflow binding updates, fact schema edits
   - After settle/success: targeted `invalidateQueries` and deterministic refetch

4. Validation mutation/query
   - Trigger explicit validate action
   - Store structured diagnostics and project to inline + panel surfaces

5. Publish mutation
   - Guard: disabled when blocking diagnostics exist
   - On success: show immutable version + evidence summary; keep runtime action controls blocked/deferred

## 7) Hotkey Plan (TanStack-aligned behavior)

Initial hotkeys for Story 2.1:

- `Ctrl/Cmd+S`: Save draft
- `Ctrl/Cmd+Enter`: Validate draft
- `/`: Focus catalog search
- `D`: Toggle diagnostics drawer

Rules:

- Every hotkey has an equivalent visible control
- Show hotkeys in tooltips/command hints
- Disable hotkeys when their actions are blocked and show rationale

## 8) React Flow Execution Plan

- Use `@xyflow/react` controlled patterns (`useNodesState`, `useEdgesState`)
- Encode node/edge metadata with strict TypeScript domain types
- Keep selection as single source of truth for inspector tabs
- Binding UI behavior:
  - Selected transition shows bound eligible workflows as executable-for-transition
  - Unbound workflows remain visible in catalog with non-executable status in that transition context
- No runtime execution controls enabled in this story

## 9) Error Handling and UX Semantics

- Triple-encoded critical states (icon + label + semantic color)
- Diagnostics always include: what happened, why, remediation, and preservation/safety note
- Distinguish blocked vs failed clearly:
  - blocked = user-actionable constraint
  - failed = operation fault/retry path
- Preserve unsaved local edit state where safe during failed network operations

## 10) Testing Strategy

Unit tests:

- Fact schema rules (typed fields, unique keys, valid defaults, no refs/derived expressions)
- Binding visibility semantics (bound executable vs unbound catalog-only)
- Publish guard logic with blocking diagnostics

Integration/component tests:

- Persist-edit-refresh determinism for core draft entities
- Validation mapping from backend diagnostics to field-level UI
- Publish success rendering (immutable version + evidence summary)
- Hotkey parity and blocked-action behavior

Verification commands:

- `bun check`
- `bun check-types`
- `bun run test` (workspace/validation/publish suites)

## 11) Non-goals (Story 2.1)

- No runtime workflow execution
- No Epic 3+ orchestration features
- No broad visual redesign outside established UX tokens/system

## 12) Handoff Notes

- This design is ready to convert into implementation plan tasks.
- Priority execution order:
  1) shell + data loading
  2) graph + selection/inspector wiring
  3) editors + validations
  4) save/validate/publish flow
  5) diagnostics polish + hotkeys + tests
