# Methodology Design-Time Pages (Tentative) — Progressive Lock

Date: 2026-03-11
Owner: Product + UX + Engineering + QA
Status: Locked baseline for Story 3-1 readiness (all core methodology pages and L2 tabs now aligned)

**Supersession note (2026-03-16):** Active implementation authority has been promoted into stable docs under `docs/architecture/` and routed by `docs/architecture/epic-3-authority.md`. This document is preserved as historical design rationale and source baseline for promoted surfaces.

## 1) Scope and sequencing

This document captures a **progressive lock** for methodology-layer design-time UX.

- Locked now (design baseline): Work Units (L1 + core L2), Methodology Facts, Agents, Dependency Definitions, Workflow Editor shell, and step dialogs (Form/Branch/Agent/Invoke/Display/Action).
- Locked in this pass: Artifact Slots tab depth, Work Unit Facts tab baseline, State Machine tab baseline.
- Remaining future refinement: methodology version dashboard redesign details.

This order is intentional so we do not lose decisions while Story 3-1 scope is still being shaped.

---

## 2) Non-negotiable guardrails (from Epic 2 lessons)

1. **Canonical Rule remains absolute**: if a canonical table exists, it is authoritative.
2. No extension blob fallback as authority (`definition_extensions_json` must not become canonical again).
3. Schema evolution is allowed only through explicit versioned contracts + validation/migration.
4. Design-time and execution-time surfaces must stay semantically separate.
5. Step contracts remain versioned and typed (`*.v1`), with deterministic validation and no schema drift.

---

## 3) Locked page: Work Units (L1)

## 3.1 Page goal

Provide a clear, low-confusion L1 topology for methodology work units with fast discovery and deterministic CRUD entry points.

## 3.2 IA / layout

1. **Center canvas**: Work Unit graph (L1 only)
2. **Right rail (outside canvas)**: searchable Work Unit index/list
3. **Contextual inspector**: selected node summary + quick actions
4. **Tabs**: used to switch contexts cleanly (avoid mixing concerns on one surface)

## 3.3 Locked behaviors

- Click in list → auto-focus/select node on graph
- Selection sync in both directions (list ⇄ graph)
- Focused node must be visually distinct from non-focused nodes
- Node is a larger container (not a compact chip)
- Keyboard + click parity for core actions

## 3.4 Node content (design-time)

Each Work Unit container node shows:

- identity: display name + key
- description with toggle: **Human | Agent**
- cardinality/usage indicator using icon semantics (avoid raw jargon labels in primary UI)
- lightweight signals/counters: states, transitions, gates, diagnostics
- quick actions/shortcuts entry points

Notes:
- “active” runtime language is not used on this design-time card.
- This is not the project execution card.

## 3.5 Interaction labels (locked vocabulary)

- **Open Details** = object metadata/inspector level
- **Open Relationship View** = topology/transition relationship context

## 3.6 L1 CRUD baseline

- Create work unit
- Read via graph + searchable rail + inspector
- Update metadata and approved L1 properties
- Delete/archive with explicit impact confirmation

## 3.7 Diagnostics presentation for this page

Default model: **Unified Findings**

- severities: Error / Warning / Note
- blocking context: save and/or publish
- precise location: page/entity/field
- deterministic message + suggested fix action

## 3.8 Canonical mapping intent (to be detailed in implementation plan)

For every L1 action, define table-level write/read mapping before implementation:

- create/update/delete work unit
- selection/focus state handling (UI only)
- diagnostics source/mapping

No extension-authority shortcuts allowed.

## 3.9 Work Units Page (L1) — locked wireframe (design-time)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ WORK UNITS (L1)                                                            [+ Add Work Unit] │
│ Tabs: [Graph] [Contracts] [Diagnostics]                                                      │
├───────────────────────────────────────────────────────────────┬─────────────────────────────┤
│ CANVAS (Graph)                                                │ WORK UNIT LIST              │
│                                                               │ [ Search work units... ]    │
│  ┌──────────────────────────────────────────────────────────┐  │                             │
│  │ ◈ WU.PROJECT_CONTEXT                           [⋯] [✎]  │  │ • WU.SETUP                 │
│  │ Key: wu.project_context                                   │  │ • WU.PROJECT_CONTEXT  ←    │
│  │──────────────────────────────────────────────────────────│  │ • WU.DELIVERY              │
│  │ Description: [ Human | Agent ]                           │  │                             │
│  │ ─ Human: Capture project context for planning...         │  │ Click item → focus in      │
│  │ ─ Agent : Structured context object for workflows...     │  │ canvas                      │
│  │                                                          │  │                             │
│  │ Usage Scope                                               │  │ SELECTED SUMMARY            │
│  │ [◎ Single Slot]   or   [◌ Multi Slot]                   │  │ Name: WU.PROJECT_CONTEXT    │
│  │                                                          │  │ Key : wu.project_context    │
│  │ Signals                                                   │  │ [Open details]              │
│  │ [◉ States: 4] [⇄ Transitions: 7] [⛨ Gates: 3] [⚠ Diag: 1]│  │ [Open Relationship View]    │
│  │                                                          │  │                             │
│  │ Shortcuts                                                 │  │                             │
│  │ ⌘↵ Open details  ⌘G Open relationship view  ⌘F Focus from list│ │                             │
│  └──────────────────────────────────────────────────────────┘  │                             │
└───────────────────────────────────────────────────────────────┴─────────────────────────────┘
```

### Behavior locks

- `+ Add Work Unit` lives outside the canvas at page-header level.
- List selection and graph selection are bi-directional and always in sync.
- Selecting an item in the list auto-focuses the node in canvas.
- Focused node is visually distinct; non-focused nodes are visibly de-emphasized.
- Design-time semantics only (no runtime status language on this page).
- Node content must include Human/Agent description toggle and usage-scope icon semantics.
- Signals are always visible on the node: states, transitions, gates, diagnostics.
- Action vocabulary is fixed: `Open details` and `Open Relationship View`.
- Keyboard + click parity:
  - `⌘/Ctrl+F` focus search
  - `⌘↵` open details
  - `⌘G` open relationship view

### Component responsibilities (current structure)

- **Canvas (Graph)**
  - Render L1 work-unit container nodes only.
  - Support pan/zoom and smooth auto-focus when selecting from the list.
  - Keep relationship noise low at L1; deeper relationship editing is opened via `Open Relationship View`.

- **Right rail (Work Unit List)**
  - Provide searchable/filterable index of all work units.
  - Drive selection + focus in canvas.
  - Optionally surface lightweight health hints (small diagnostics indicator).

- **Selected summary (right rail)**
  - Show selected node identity, key context, and primary actions.
  - Keep action surface minimal: `Open details`, `Open Relationship View`.

- **Header + tabs**
  - Keep `+ Add Work Unit` as a page-level action outside the canvas.
  - Provide context switching (`Graph`, `Contracts`, `Diagnostics`) without mixing concerns.

### Spacing & density guidance (rough ranges, not exact tokens)

- **Page shell spacing:** medium-to-generous breathing room around major regions.
- **Canvas to right-rail separation:** clear visual split with enough gutter to avoid blending.
- **Node internal spacing:** moderate spacing between sections so labels, description, scope, and signals are easy to scan.
- **List density:** compact-to-medium rows (fast scanning, no crowding).
- **Inspector spacing:** medium spacing between content blocks; compact spacing inside each block.
- **Tab/header rhythm:** compact-to-medium vertical spacing so controls feel grouped but not cramped.

### Interaction/behavior expectations (expanded)

- Selecting from list must center/focus the node and make it visually primary.
- Selecting on canvas must immediately update list highlight and selected summary.
- Only one primary selection at a time (no ambiguous dual-active state).
- Focus transition should be noticeable but brief (short pulse/attention cue).
- Keyboard flows must mirror click outcomes (same state transitions, same destination views).
- Empty states must be actionable (clear CTA to add first work unit).
- Loading/error states must preserve context and selection where possible.

### Findings visual treatment (locked)

- **Warnings** use a yellow severity treatment.
- **Errors** use a red severity treatment.
- **Notes** use a neutral/info severity treatment (non-blocking by default).
- Both warning/error surfaces use a **subtle diagonal-line background pattern** (striped texture) as part of their container style.
- Notes use a softer treatment than warning/error; diagonal texture is optional but if used must remain low-contrast.
- This styling applies consistently across list rows, inspector findings, and dialog-level findings banners.

---

## 4) Methodology Facts page (document current vs next)

This section captures what is already working now and what we are intentionally adding/changing next.

### 4.1 Current page direction (keep)

Current direction is largely good and remains **dialog-first CRUD**.

What exists today and should stay:
- Dialog-based create/edit flow
- Contract + guidance style authoring flow
- Human + Agent guidance/description fields
- Validation-type-aware editing flow (different controls by validation type)

### 4.2 Current shape (summary)

```text
┌──────────────────────────────────────────────────────────────┐
│ METHODOLOGY FACTS                                            │
│ [ + Add Fact ]                                               │
├──────────────────────────────────────────────────────────────┤
│ Fact list/table                                               │
│ - Name / Key / Type / Validation                              │
│ - Row action: Edit (opens dialog)                             │
└──────────────────────────────────────────────────────────────┘

Create/Edit Fact Dialog
┌──────────────────────────────────────────────────────────────┐
│ Step 1: Contract                                               │
│ - Display name, key, type, default, validation config         │
│ Step 2: Guidance                                               │
│ - Human guidance, Agent guidance, description                 │
│ Actions: Cancel / Save                                        │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Additions we are locking next

1. Add explicit **Cardinality** capability (`single | set`) for all fact types.
2. Support this consistently across:
   - methodology-level facts
   - work-unit-level facts
3. Keep JSON-schema support, but improve authoring ergonomics and clarity.

### 4.4 Changes requested to current behavior

- Keep overall UX shape; do **not** redesign this page from scratch.
- Add list semantics as a first-class fact attribute (not a workaround).
- Ensure validation and diagnostics clearly represent cardinality expectations (`single` vs `set`).
- Keep language and controls design-time oriented (no runtime leakage).

### 4.5 Behavior locks (Facts page)

- Dialog remains the primary create/edit interaction.
- Save behavior is deterministic and diagnostics-driven.
- Findings are shown with clear severity and blocking state where relevant.
- Fact key uniqueness and type/validation compatibility are enforced.
- Cardinality changes (`single` ↔ `set`) must revalidate dependent config immediately.
- Warning/Error findings follow the locked visual treatment:
  - warning = yellow + diagonal-line background
  - error = red + diagonal-line background
- Selector UX for relational fields uses a rich dropdown pattern:
  - primary line: entity name/label
  - subtitle line: short description/context
  - applies to Work Unit and Link Type selectors where shown in fact/dependency authoring.
- `work_unit`-typed facts can carry semantic dependency metadata (link type/reference semantics).
- Dependency policy enforcement does not live on facts; it lives in:
  - transition gate condition sets (work-unit level), and
  - branch conditions (workflow level).

### 4.6 Open items (intentionally deferred)

- Final micro-UX for JSON-schema authoring surface is not fully locked yet.

---

## 5) Agents page (locked baseline)

## 5.1 Page goal

Provide methodology-level design-time authoring for agents using a **card-first catalog** with dialog-based CRUD, while keeping runtime execution concerns out of scope.

## 5.2 Locked page shape (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ AGENTS                                                                     [+ Add Agent]   │
│ Tabs: [Catalog] [Contracts] [Diagnostics]                                                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search agents... ] [Filter: role] [Sort: updated]                                          │
│                                                                                            │
│  ┌────────────────────────────┐  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │ (avatar)  Mimir Analyst   │  │ (avatar)  Thoth Writer     │  │ (avatar)  OpenCode     │ │
│  │ key: mimir                │  │ key: thoth                │  │ key: opencode           │ │
│  │ role: analyst             │  │ role: writer              │  │ role: executor          │ │
│  │ findings: ⚠1              │  │ findings: ✓               │  │ findings: ⛔1 ⚠2         │ │
│  │ [Open details] [Edit]     │  │ [Open details] [Edit]     │  │ [Open details] [Edit]   │ │
│  └────────────────────────────┘  └────────────────────────────┘  └────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘

Create/Edit Agent Dialog
┌──────────────────────────────────────────────────────────────┐
│ AGENT METADATA                                                │
│ Name / Key / Role / Avatar selector (v1 compatible)         │
│                                                              │
│ Description: [ Human | Agent ]                              │
│ Guidance (authoring notes)                                  │
│                                                              │
│ Prompt fields (design-time):                                │
│ - System prompt                                              │
│ - Instructions                                               │
│                                                              │
│ Findings area (severity-styled)                             │
│ Actions: Cancel / Save                                      │
└──────────────────────────────────────────────────────────────┘
```

## 5.3 Behavior locks (Agents page)

- Card layout is the default catalog presentation (not plain table).
- Avatar is visible on each card (avatar assignment logic may evolve later).
- `+ Add Agent` is page-level and outside card grid.
- Create/edit/delete are dialog-driven in this phase.
- Required fields are validated before save (name/key/role + prompt essentials).
- Prompt authoring fields are explicit: `system prompt` and `instructions`.
- Search/filter update the visible card set deterministically.
- Selection/detail actions are unambiguous and keyboard-accessible.
- MCP and model options are consumed from **system-level configuration**, then selected/applied at methodology level.
- Provider/model registry work is explicitly scheduled for Epic 3 to support agent-step execution end-to-end.

## 5.4 Component responsibilities

- **Agent card grid**
  - Fast scan of agent identity, role, findings summary, and primary actions.
  - Clear distinction between open-view action and edit action.

- **Dialog editor**
  - Owns metadata edits and prompt-field edits.
  - Surfaces findings inline with severity styling.

- **Diagnostics integration**
  - Show per-agent summary on cards.
  - Show full actionable findings inside dialog when editing.

## 5.5 Spacing & density guidance (rough)

- Card grid density: medium (readable, not sparse).
- Card internal spacing: compact-to-medium.
- Dialog section spacing: medium with clear grouping of metadata vs prompt fields.
- Findings banners: compact but high-contrast for warning/error.

## 5.6 Out of scope for this lock

- Dedicated full Agent Details page.
- Runtime execution configuration UX.
- Advanced prompt composition tooling beyond core fields.

## 5.7 Architecture constraints (locked)

- **System-level authority for MCPs and models**
  - Provider/model definitions and MCP server catalogs are configured at system level.
  - Methodology agents reference/select from those configured options; they do not define provider catalogs ad hoc.

- **Provider registry timing**
  - Provider registry implementation is part of Epic 3 execution-layer readiness.
  - Rationale: agent-step execution depends on deterministic provider/model resolution.

- **Living prompt editor support**
  - Prompt template editor must support inserting methodology-level variables (living prompt model alignment).
  - Variable insertion must be guided and validated (avoid free-form unresolved placeholders).

## 5.8 Form validation behavior (locked)

- Diagnostics include both:
  - page/dialog findings summaries, and
  - standard inline form validation behavior.
- Inputs with errors must show:
  - field-level visual error state,
  - error label/message near the input,
  - clear association with the same underlying finding/rule.
- Warnings may be non-blocking; errors are blocking when tied to required contract validity.

## 5.9 Living prompt variable insertion UX (locked)

Prompt fields (`system prompt`, `instructions`, template text) support structured variable insertion.

### Variable categories shown in picker

- **Project** (`project.*`)
  - Project-level facts and work-unit references.
  - Example: `project.facts.projectType`.

- **Self** (`self.*`)
  - Current work unit facts in the active workflow context.
  - Example: `self.facts.goal`.

- **Context** (`context.*`)
  - Workflow-local variables defined/updated through step execution.
  - Example: `context.sessionTopic`.

- **Step objectives** (`step_objectives`)
  - Runtime objective payload used by agent-step prompt composition.

### Authoring behavior

- Variable insertion can be done via picker or quick token insertion.
- Tokens are rendered in template form (e.g., `{{project.facts.projectType}}`).
- Picker shows variable path + short description + source category.
- Inline validation flags unresolved/unknown variables immediately.

### Validation rules

- Unknown variable path => error (blocking for save when required by contract).
- Type mismatch against expected contract/fact type => error.
- Deprecated/unsupported variable => warning with migration hint.
- Field-level error style + findings panel must stay in sync.

---

## 6) Work Unit Graph Detail (L2) — Overview tab (locked)

L2 tab set currently targeted:
- Overview
- Facts
- Workflows
- State Machine (Transitions)
- Artifact Slots

Overview tab is now locked with the following sections:

1. **Focused mini-graph**
   - Selected work unit centered.
   - Direct inbound/outbound dependencies visible.
   - Clicking a neighboring node pivots focus.

2. **Dependency summary**
   - Counts: inbound, outbound, total.
   - Link-type badges (methodology-level definitions).

3. **Artifact slots summary**
   - Slot count + status indicators.
   - Quick list of slot keys/types.
   - Action: `Manage artifact slots`.

4. **Core summary chips**
   - Facts / Workflows / States / Transitions / Findings.

5. **Quick actions**
   - Open details
   - Open Relationship View
   - Add fact
   - Add workflow

6. **Language policy**
   - Design-time only; no runtime execution wording.

## 6.1) Work Unit Graph Detail (L2) — Workflows tab (locked)

### Purpose

Provide a list-first workflow overview for the selected work unit, with inline expansion for context and a clear route to the deeper Workflow Editor page.

### Locked page shape (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOWS                                                                  [+ Add Workflow] │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                    │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Summary: [Total: 6] [Bound: 4] [Unbound: 2] [⛔1 ⚠3 ℹ2]                                  │
│ [ Search workflows... ] [Filter: all/bound/unbound/findings ]                             │
│                                                                                            │
│ ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ▸ document-project      Steps:7   Bound:3   ⛔0 ⚠1   [View] [Edit]                   │ │
│ │ ▾ generate-context      Steps:5   Bound:1   ⛔1 ⚠0   [View] [Edit]                   │ │
│ │    Description: Generates structured project context output.                          │ │
│ │    Bound transitions: setup -> context-ready                                          │ │
│ │    Data channels: facts + artifact slots                                              │ │
│ │    Findings: ⛔ Missing required prerequisite facts                                    │ │
│ │    Actions: [Open Workflow Editor] [View Diagnostics]                                 │ │
│ │ ▸ setup-intake          Steps:4   Bound:0   ⛔0 ⚠2   [View] [Edit]                   │ │
│ └────────────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Behavior locks

- Overview is list-first with accordion row expansion (no persistent side rail here).
- `Bound` = count of lifecycle transitions linked to the workflow.
- `Unbound` = workflow exists but has no transition bindings yet.
- Row expansion shows concise operational context (description, bindings, data-channel summary, findings).
- `Open Workflow Editor` is the primary path for deep editing.
- `+ Add Workflow` is page-level and outside row content.
- Findings and severity styling follow the shared diagnostics rules.

### Component responsibilities

- **Summary strip**
  - Instant health/readiness view for workflows in this work unit.

- **Workflow rows**
  - Provide scan-friendly metadata and direct actions.

- **Accordion expansion**
  - Show enough context to decide whether to route into deep editing.

- **Diagnostics entrypoints**
  - Provide quick visibility of blocking vs non-blocking issues and route to details.

## 6.2) Workflow Editor page (deeper page) — shell lock

### Purpose

Provide the primary graph-authoring surface for workflow steps/edges, with fast selection summary on the left and intensive step editing in dialogs.

### Locked shell (ASCII)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Left actions...]                     WORKFLOW / generate-context                    [Cancel] [Save] │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────┐  ┌───────────────────────────────────────────────────────────────┐ │
│ │ STEP TYPE                    │  │ GRAPH EDITOR                                                   │ │
│ │ (2x3 grid)                   │  │                                                               │ │
│ │ ┌──────────┬──────────┬────┐ │  │   [Start]───[Agent Step]───[Branch]───[Invoke]              │ │
│ │ │ FORM   + │ AGENT  + │... │ │  │                │                    ╲                         │ │
│ │ ├──────────┼──────────┼────┤ │  │              [Action]                [Display]               │ │
│ │ │ ACTION + │ INVOKE + │... │ │  │                                                               │ │
│ │ └──────────┴──────────┴────┘ │  │ Select node/edge → updates left selected-summary panel        │ │
│ │                               │  │ Drag/drop OR click (+) to add step                            │ │
│ │ SELECTED SUMMARY              │  │                                                               │ │
│ │ Type: agent                   │  │ Actions on selected: [Edit] [Details] [Delete]               │ │
│ │ Key : gather_context          │  │                                                               │ │
│ │ Data: facts + artifact slots  │  │                                                               │ │
│ │ Findings: ⚠1                  │  │                                                               │ │
│ │ [Open Step Dialog]            │  │                                                               │ │
│ └──────────────────────────────┘  │ [pan] [zoom-] [100%] [zoom+] [fit] [snap] [run/view]          │ │
│                                   │ (sticky at bottom INSIDE graph container)                      │ │
│                                   └───────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Behavior locks

- Header follows the reference structure:
  - left: utility actions
  - center: workflow identity/title
  - right: `Cancel` and `Save`
- Step Type panel is a 2x3 grid for the six step types (`form`, `agent`, `action`, `invoke`, `branch`, `display`).
- Selecting a graph step highlights its corresponding step type tile.
- Step type tiles retain `+` affordance to add a new step of that type.
- Add step supports two modes: drag/drop and click-to-add.
- Selecting node/edge updates left selected-summary panel.
- Selected node/edge has expanded/highlighted visual state.
- Deep step configuration editing opens in dialog; left panel remains summary-oriented.
- Graph toolbar is inside the graph container and sticky to its bottom.

## 6.3) Shared variable target model for step authoring (Form/Branch baseline)

### Model intent

Separate **where a value comes from** from **where it is stored** so form/branch design remains automatable and reusable across Chiron.

Each field/condition reference uses:
- `sourcePath` (read/prefill source)
- `fieldKey` (context variable key used later as `context.<fieldKey>`)
- `cardinality` (`single` | `set`) on stored field contract

### Namespaces (current lock)

- `project.*`
  - `project.facts.<factKey>`
  - `project.workUnits.<workUnitKey>`
  - `project.workUnits.<workUnitKey>.facts.<factKey>`

- `self.*`
  - `self.facts.<factKey>`

- `context.*`
  - `context.<fieldKey>` (workflow-local variables reusable by later steps)

### Type and cardinality rules

- For `project.*` and `self.*` fact targets:
  - type is inherited from canonical definition.
- For `context.*` fields:
  - type is declared in step config/contract.
- Cardinality is modeled as `single | set` and validated for compatibility with source/target.

### Reuse behavior lock

- Later form steps can read/update `context.*` fields created by earlier form steps in the same workflow execution path.

---

## 6.4) Step dialog lock (pair 1): Form + Branch

### 6.4.1 Form step dialog

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — FORM                                                            │
│ Tabs: [Overview] [Fields] [Guidance]                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview                                                                     │
│ - Step Key                                                                   │
│ - Step Name                                                                  │
│ - Submit Label                                                               │
│                                                                              │
│ Fields                                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────┐  │
│ │ Label         Field Key      Kind      Source Path                    │  │
│ │ Project Type  projectType    project   project > facts > projectType  │  │
│ │ Target WUs    targetWUs      project   project > workUnits            │  │
│ │ Goal          goal           self      self > facts > goal             │  │
│ └──────────────────────────────────────────────────────────────────────────┘  │
│ [ + Add Field ] [Edit selected]                                              │
│                                                                              │
│ Field editing uses stacked dialog (recommended pattern):                      │
│ - Level 1: Field Basics (label, fieldKey, kind, sourcePath, required)       │
│ - Level 2: Type/Cardinality (type when needed, single|set)                  │
│ - Level 3: Validation (none/path/allowed-values/json-schema)                │
│                                                                              │
│ JSON-specific rule:                                                           │
│ - If valueType = json, user can define `valueSchema` in Validation level.   │
│ - `valueSchema` is stored with the field config (schema object/json text).   │
│ - UI offers a schema editor area in the stacked dialog (not inline in table).│
│                                                                              │
│ Path representation rule:                                                     │
│ - UI shows segmented path (e.g., project > facts > projectType).            │
│ - Persisted value uses canonical dot path (e.g., project.facts.projectType).│
│                                                                              │
│ Guidance                                                                     │
│ - Human guidance                                                             │
│ - Agent guidance                                                             │
│                                                                              │
│ Findings + inline field errors                                               │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.4.2 Branch step dialog

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — BRANCH                                                          │
│ Tabs: [Overview] [Conditions] [Guidance]                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Overview                                                                     │
│ - Step Key                                                                   │
│ - Step Name                                                                  │
│ - Root mode: [ALL | ANY]                                                     │
│ - Default route                                                              │
│                                                                              │
│ Conditions Preview                                                           │
│ - Rules: 5    Groups: 1    Max UI depth: 2                                  │
│ - Uses: project.facts.projectType, context.intakeMode, project.workUnits    │
│                                                                              │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — BRANCH                                                          │
│ Tabs: [Overview] [Conditions] [Guidance]                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│ Conditions (nested builder)                                                  │
│ Root Group: ALL                                                              │
│  1) project > facts > projectType             [equals]       "greenfield"   │
│  2) context > intakeMode                     [in]           ["guided"]      │
│  3) project > workUnits                      [size >]       0                │
│  4) Group [ANY]                                                             │
│     4.1 self > facts > goal                  [not empty]                    │
│     4.2 project > workUnits > WU.SETUP > facts > status [equals] "ready"   │
│                                                                              │
│ [ + Add Condition ]   [ + Add Group ]                                        │
│                                                                              │
│ Condition variable selector uses rich hierarchical dropdown.                 │
│ Operators are type-aware from resolved variable type.                        │
│                                                                              │
│ Guidance                                                                     │
│ - Human guidance                                                             │
│ - Agent guidance                                                             │
│                                                                              │
│ Findings + inline condition errors                                           │
│ Actions: [Cancel] [Save]                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 6.4.3 Interaction lock

- Use stacked dialogs for advanced pickers/builders (path selection, nested condition editing).
- Base step dialog stays focused; advanced edits open as child stack dialogs.
- Unsaved changes persist across tab switches.
- Dirty-state indicator is visible while there are unsaved edits.
- Dirty state clears only on Save or explicit Discard.
- Branch can target direct paths (project/self/work-unit/context), not only form-created context keys.
- Nested groups are supported; UI intentionally optimizes for one to two levels deep.
- Path persistence uses canonical dot notation; segmented path picker is UI-only representation.

### 6.4.4 Branch condition matrix (locked)

Target kinds supported directly:
- `project.facts.<factKey>`
- `self.facts.<factKey>`
- `project.workUnits`
- `project.workUnits.<workUnitKey>`
- `project.workUnits.<workUnitKey>.facts.<factKey>`
- `context.<fieldKey>`

Operators by resolved type/cardinality:

- `string` (single):
  - `equals`, `not_equals`, `contains`, `starts_with`, `ends_with`, `in`, `empty`, `not_empty`

- `number` (single):
  - `equals`, `not_equals`, `gt`, `gte`, `lt`, `lte`, `between`

- `boolean` (single):
  - `is_true`, `is_false`, `equals`

- `json` (single):
  - `exists`, `not_exists`, `equals` (strict)
  - `json_path_exists` (optional v1.1)

- `ref` (single work-unit reference):
  - `equals`, `not_equals`, `is_set`, `not_set`

- `set` cardinality (any set-typed path):
  - `contains`, `not_contains`, `size_eq`, `size_gt`, `size_lt`, `empty`, `not_empty`

## 6.5) Step dialog lock (pair 2): Agent (config foundation)

This section locks the **configuration model** first (before ASCII CRUD wireframes).

### 6.5.1 Agent step top-level config (`agent.v1`)

```ts
type AgentStepConfigV1 = {
  stepConfigVersion: "agent.v1";

  harness: "chiron" | "opencode";

  agent: {
    id: string;
    source?: "methodology" | "project" | "system" | "builtin";
    modelOverride?: { provider: string; model: string };
  };

  instructions: {
    stepInstructions: string;
    instructionPlacement?: "system_merge" | "message"; // default system_merge
    // step_objectives are implicitly injected when present in template context
  };

  tools: {
    context: ContextToolPolicy;
    actions: ActionsToolPolicy;
    action: ActionToolPolicy;
  };

  completion: {
    conditions: Array<"agent-done" | "all-tools-approved" | "all-variables-set" | "manual">;
  };

  harnessConfig?: Record<string, unknown>;
  guidance?: { human?: string; agent?: string };
};
```

### 6.5.2 Three-tool MCP model (locked)

- `context` tool: **read-only scoped visibility** for this step.
- `actions` tool: **read-only step action catalog** (what agent can do and schemas).
- `action` tool: **execute one allowed action** from the step catalog.

This is step-scoped capability, not harness-global tool mutation.

### 6.5.3 Tool policies

```ts
type ContextToolPolicy = {
  enabled: boolean;
  allowedSelectors: Array<
    | "project.facts"
    | "self.facts"
    | "project.workUnits"
    | "project.workUnitFacts"
    | "artifact.snapshots"
  >;
  selectorParams?: {
    projectFactKeys?: string[];
    selfFactKeys?: string[];
    workUnitKeys?: string[];
    workUnitFactKeysByWorkUnit?: Record<string, string[]>;
    artifactSlots?: string[];
    latestOnly?: boolean;
    includePaths?: boolean;
    includeMetadata?: boolean;
  };
  maxPayloadBytes?: number;
};

type ActionsToolPolicy = {
  enabled: boolean;
  catalog: StepActionDefinition[];
};

type ActionToolPolicy = {
  enabled: boolean;
  enforceAllowList: true;
  dryRunSupported?: boolean;
};
```

### 6.5.4 Step action definitions (locked direction)

```ts
type StepActionDefinition = UpdateVariableAction | AxGenerationAction | ArtifactSyncAction;

type ActionAvailability = {
  usageMode: "single_use" | "multi_use";
  onConsume: "remove_from_catalog" | "keep_visible";
  rerunPolicy: "forbid" | "require_user_approval" | "allow";
};

type UpdateVariableAction = {
  actionId: string;
  kind: "update-variable";
  label?: string;
  description?: string;
  targetVariable: string;
  // typing/cardinality/schema are inferred from declared variable/fact registry
  // for targetVariable (no per-action duplication by default)
  valueFrom?: { mode: "literal"; value: unknown } | { mode: "variable"; variablePath: string };
  requiredVariables?: string[]; // progressive unlocking
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};

type AxGenerationAction = {
  actionId: string;
  kind: "ax-generation";
  label?: string;
  description?: string;
  axSignatureRef: { id: string; version?: string }; // from ax-registry
  targetVariable: string;
  requiredVariables?: string[]; // progressive unlocking
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};

type ArtifactSyncAction = {
  actionId: string;
  kind: "artifact-sync";
  label?: string;
  description?: string;
  slotKey: string;
  syncMode: "template-upsert" | "fileset-sync" | "snapshot-refresh";
  sourceVariable?: string;      // optional, e.g. rendered markdown/json path
  resultVariable?: string;      // optional receipt/snapshot ref target
  requiredVariables?: string[];
  availability?: ActionAvailability;
  requiresApproval?: boolean;
};
```

### 6.5.5 Progressive unlocking (locked)

Actions are progressively unlocked by `requiredVariables`.

Example (brainstorming `conduct-session`):
- `set_topic` unlocked initially.
- `set_goals` requires `context.sessionTopic`.
- `generate_options` requires `context.sessionTopic` + `context.statedGoals`.

### 6.5.6 Write-scope lock

- Agent does **not** get broad write access to all context/facts.
- `action` writes are limited to declared `targetVariable` of the selected step action.
- writes outside allow-listed action targets are rejected.

### 6.5.7 AX registry note

- AX tools are referenced from the AX registry (`axSignatureRef` in step action config).
- AX registry schema/persistence is documented in:
  - `docs/plans/2026-03-08-ax-integration-design.md`
  - `docs/plans/2026-03-08-ax-signature-registry-implementation-plan.md`

## 6.6) Agent step dialog CRUD wireframes (locked)

### 6.6.1 Tab model

- Overview
- Instructions
- Context Access
- Actions Catalog
- Completion & Guidance

### 6.6.2 Dialog shell (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — AGENT                                         ● Unsaved        [Cancel] [Save] │
│ Tabs: [Overview] [Instructions] [Context Access] [Actions Catalog] [Completion & Guidance] │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.6.3 Overview tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key            [ conduct_session ]                                    │
│ Step Name           [ Conduct Session ]                                    │
│ Harness             [ chiron | opencode ]                                  │
│ Agent Source        [ methodology | project | system | builtin ]           │
│ Agent               [ mimir_analyst ]                                      │
│ Model Override      [ off | provider/model ]                               │
│                                                                            │
│ Summary chips: [Context Selectors: 3] [Actions: 4] [Locked: 2]            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.6.4 Instructions tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUCTIONS                                                               │
│ Placement          [ system_merge | message ]                              │
│                                                                            │
│ Step Instructions                                                           │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ Analyze session and capture structured outputs...                     │ │
│ │ Use {{step_objectives}} when present in template context.             │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│ [Insert Variable] [Preview Rendered]                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

Note (locked): this field upgrades to a rich-text/template editor later (same family as system prompt authoring UX), but v1 can start with plain textarea + variable insertion.

### 6.6.5 Context Access tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CONTEXT ACCESS                                                             │
│ [ + Add Selector ]                                                         │
│                                                                            │
│ • project.facts            (projectType, projectRootPath)                 │
│ • self.facts               (intakeMode)                                   │
│ • artifact.snapshots       (slot: brief_notes, latestOnly=true)           │
│                                                                            │
│ Limits: maxPayloadBytes [ 120000 ]                                         │
│ Options: [includePaths] [includeMetadata]                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.6.6 Actions Catalog tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ACTIONS CATALOG                                                            │
│ [ + Add Action ]                                                           │
│                                                                            │
│ Action ID            Kind             Target Variable      Unlock   Usage    │
│ set_topic            update-variable  self.facts.topic     always   once     │
│ set_goals            update-variable  context.statedGoals  needs topic once  │
│ generate_options     ax-generation    context.options      needs goals multi │
│ sync_artifacts       artifact-sync    self/artifact slot   always   multi     │
│                                                                            │
│ Execution Policy                                                           │
│ enforceAllowList: [on]   dryRunSupported: [off]                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.6.7 Completion & Guidance tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ COMPLETION & GUIDANCE                                                      │
│ Completion Conditions                                                      │
│ [x] all-variables-set   [x] agent-done   [ ] manual                        │
│                                                                            │
│ Human Guidance                                                              │
│ [ Keep brainstorming flow disciplined and explicit... ]                    │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Use context/actions/action tools in that order... ]                      │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.6.8 Expected behavior (locked)

- Unsaved edits persist while switching tabs; dirty indicator remains until Save/Discard.
- `context` tool is read-only and only exposes selectors configured in this step.
- `actions` returns only this step’s catalog and unlock status by `requiredVariables`.
- `action` executes only allow-listed catalog entries; writes are constrained to declared targets.
- Progressive unlock is deterministic and visible in Actions Catalog.
- Action availability is per action definition:
  - `single_use` actions can be consumed and removed from catalog.
  - `multi_use` actions remain callable.
  - rerun of consumed single-use actions can be blocked or require explicit user approval.
- Advanced picker/edit operations use stacked dialogs (selector builder, action editor).

## 6.7) Step dialog lock (pair 3): Invoke (simplified)

### 6.7.1 Invoke config (`invoke.v1`) — locked direction

```ts
type InvokeStepConfigV1 = {
  stepConfigVersion: "invoke.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  // UI labels: self | child
  // persisted compatibility: same_work_unit | child_work_units
  targetScope: "self" | "child";

  // how workflow is selected
  workflowSelectorMode: "fixed" | "variable" | "iterate";

  // fixed selector
  fixedWorkflow?: { workflowKey?: string; workflowId?: string };

  // variable selector (workflow_ref single)
  workflowRefVariable?: string;

  // iterate selector (set<workflow_ref> or set<object>)
  iterate?: {
    itemsVariable: string;
    itemAlias: string;
    itemWorkflowRefField?: string;
    itemChildWorkUnitTypeField?: string;
  };

  runMode: "sequential" | "parallel";
  parallelLimit?: number;
  waitForChildCompletion: boolean;
  errorPolicy: "fail" | "continue" | "pause";

  // child mode options
  childWorkUnitType?: string;
  childActivationTransition?: string;
  childRefsOutputVariable?: string; // usually set<work_unit_ref>

  guidance?: { human?: string; agent?: string };
};
```

### 6.7.2 Invoke dialog shell (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — INVOKE                                          ● Unsaved      [Cancel] [Save] │
│ Tabs: [Overview] [Workflow Source] [Execution] [Output & Child Capture] [Guidance]        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.3 Overview tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key              [ run_brainstorming_invokes ]                        │
│ Step Name             [ Run Brainstorming Invokes ]                        │
│ Target Scope          [ self | child ]                                     │
│                                                                            │
│ Summary chips:                                                             │
│ [Selector: iterate] [Run: parallel] [On Error: continue]                  │
│ [Child Refs Capture: enabled]                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.4 Workflow Source tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ WORKFLOW SOURCE                                                            │
│ Selector Mode: ( ) fixed   ( ) variable   (●) iterate                      │
│                                                                            │
│ if fixed:                                                                  │
│   Fixed Workflow      [ Select workflow key/id ]                           │
│                                                                            │
│ if variable:                                                               │
│   Workflow Ref Var    [ context.selectedWorkflowRef ]                      │
│   (type: workflow_ref, cardinality: single)                                │
│                                                                            │
│ if iterate:                                                                │
│   Items Variable      [ context.selectedElicitationWorkflowRefs ]          │
│   Item Alias          [ wf ]                                               │
│   Item Ref Field      [ workflowRef ] (optional, for object items)         │
│   (items type: set<workflow_ref> or set<object with workflowRef>)          │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.5 Execution tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION                                                                  │
│ Run Mode               [ sequential | parallel ]                           │
│ Parallel Limit         [ 4 ]                                               │
│ Wait For Completion    [x]                                                 │
│ Error Policy           [ fail | continue | pause ]                         │
│                                                                            │
│ Child options (when Target Scope=child):                                   │
│ Child Work Unit Type   [ brainstorming ]                                   │
│ Child Activation       [ draft_to_ready ]                                  │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.6 Output & Child Capture tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OUTPUT & CHILD CAPTURE                                                     │
│ Child refs output variable (child mode):                                   │
│ [ context.invokedBrainstormingChildren ]                                   │
│                                                                            │
│ Data communication policy (v1):                                            │
│ - workflow-to-workflow communication is through facts + artifact slots     │
│ - no dedicated IO contract/mapping editor in invoke v1                     │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.7.7 Guidance tab (ASCII)

```text
┌──────────────────────────────────────────────────────────────┐
│ GUIDANCE                                      ● Unsaved      │
│ Human Guidance                                               │
│ [ Use child delegation only when brainstorming is necessary ]│
│                                                              │
│ Agent Guidance                                               │
│ [ Validate workflow-ref typing before invoke execution ]     │
└──────────────────────────────────────────────────────────────┘
```

### 6.7.8 Expected behavior (locked)

- `targetScope` controls in-place invoke (`self`) vs child delegation (`child`).
- `workflowSelectorMode` supports fixed, variable, and iterate selection.
- Iteration over workflows is supported via `iterate` + set<workflow_ref> inputs.
- v1 removes dedicated IO contract/mapping editor from invoke.
- Parent/child communication in v1 is through facts and artifact slots.
- In `child` mode, child refs are captured to `childRefsOutputVariable` for later access.
- Unsaved changes persist across tabs; dirty indicator remains until Save/Discard.
- Advanced pickers (workflow/variable selectors) use stacked dialogs.


## 6.8) Step dialog lock (pair 4): Display (locked)

### 6.8.1 Display config (`display.v1`) — locked direction

```ts
type DisplayStepConfigV1 = {
  stepConfigVersion: "display.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  presentationMode: "single" | "tabs";

  // Plate-style JSON document payload
  contentSchemaVersion: number;
  content?: Record<string, unknown>;
  tabs?: Array<{
    key: string;
    title: string;
    content: Record<string, unknown>;
  }>;

  navigation?: {
    nextStep?: string;
  };

  guidance?: {
    human?: string;
    agent?: string;
  };
};
```

### 6.8.2 Display dialog shell (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — DISPLAY                                         ● Unsaved      [Cancel] [Save] │
│ Tabs: [Overview] [Content] [Navigation & Guidance]                                        │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.8.3 Content tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ CONTENT                                                                    │
│ Presentation Mode     [ single | tabs ]                                    │
│                                                                            │
│ if single:                                                                  │
│   [ Main display content editor ]                                           │
│   [Insert Variable] [Preview Rendered]                                     │
│                                                                            │
│ if tabs:                                                                    │
│   Tabs list:                                                                │
│   - results      | Results      | [Edit] [Delete]                          │
│   - diagnostics  | Diagnostics  | [Edit] [Delete]                          │
│   - next_steps   | Next Steps   | [Edit] [Delete]                          │
│   [ + Add Tab ]                                                             │
│                                                                            │
│   Edit/Add Tab opens stacked dialog:                                       │
│   - Level 1: tab metadata (key/title)                                      │
│   - Level 2: tab content editor                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.8.4 Navigation & Guidance tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ NAVIGATION & GUIDANCE                                                      │
│ Next Step (optional): [ step_key_here ]                                    │
│                                                                            │
│ Human Guidance                                                              │
│ [ Explain what the user should do next... ]                                │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Keep display output concise and actionable... ]                           │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.8.5 Variable and editor policy (locked)

- Allowed template variables in display content:
  - `context.*`
  - `project.*`
  - `self.*`
- Display interpolation is read-only (no variable mutation).
- Content is stored as Plate-style JSON with `contentSchemaVersion` for migration safety.
- v1 editor can start simple, but target direction is rich editor parity with prompt authoring patterns.

### 6.8.6 CRUD behavior (locked)

- Create: open same dialog with empty/default values.
- Edit: open same dialog prefilled.
- Delete: confirmation dialog.
- In tabs mode, row-level `Edit`/`Add Tab` use stacked dialogs for focused editing.
- Unsaved changes persist across tab switches.
- Dirty-state indicator remains visible until Save or explicit Discard.


## 6.9) Step dialog lock (pair 5): Action (locked)

### 6.9.1 Action config (`action.v1`) — minimal locked direction

```ts
type ActionStepConfigV1 = {
  stepConfigVersion: "action.v1";

  overview: {
    stepKey: string;
    stepName: string;
    title?: string;
    message?: string;
  };

  runMode: "sequential" | "parallel";
  parallelLimit?: number; // used when runMode=parallel
  errorPolicy: "fail" | "continue";

  actions: ActionOp[];

  guidance?: {
    human?: string;
    agent?: string;
  };
};

type ActionOp = UpdateVariableOp | ArtifactSyncOp | AxGenerateOp;

type BaseActionOp = {
  actionId: string;
  label?: string;
  description?: string;
  requires?: string[];      // progressive unlock prerequisites
  dependsOn?: string[];     // explicit action ordering
  requiresApproval?: boolean;
  receiptAs?: string;       // optional operation receipt metadata path
};

type UpdateVariableOp = BaseActionOp & {
  kind: "update-variable";
  operation: "set" | "append" | "merge" | "remove";
  targetVariable: string;   // context.* | self.* | project.*
  valueFrom:
    | { mode: "literal"; value: unknown }
    | { mode: "variable"; variablePath: string };
  // type/cardinality/schema are inferred from declared variable/fact registry
};

type ArtifactSyncOp = BaseActionOp & {
  kind: "artifact-sync";
  operation: "sync";
  slotKey: string;
  syncMode: "template-upsert" | "fileset-sync" | "snapshot-refresh";
  sourceVariable?: string;
  changedPathsVariable?: string;
};

type AxGenerateOp = BaseActionOp & {
  kind: "ax-generate";
  signatureRef: { id: string; version?: string };
  inputBindings: Record<string, string>; // signature input -> variable path
  outputTarget: string;
  reviewPolicy?: "single_pass" | "feedback_rerun";
  feedbackVariable?: string;
  maxReruns?: number;
};
```

### 6.9.2 Action dialog shell (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ EDIT STEP — ACTION                                       ● Unsaved         [Cancel] [Save] │
│ Tabs: [Overview] [Actions] [Execution] [Guidance]                                       │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ (tab content area)                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.9.3 Overview tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ OVERVIEW                                                                   │
│ Step Key            [ persist_story_state ]                                │
│ Step Name           [ Persist Story State ]                                │
│                                                                            │
│ Summary chips:                                                             │
│ [Actions: 4] [Run: sequential] [Error: fail] [Approvals: 1]               │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.9.4 Actions tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ACTIONS                                                                     │
│ [ + Add Action ]                                                            │
│                                                                              │
│ Action ID            Kind            Target/Slot              Unlock        │
│ set_status           update-variable self.facts.status        always        │
│ sync_story_doc       artifact-sync   slot: story_doc          needs status  │
│ gen_summary          ax-generate     context.storySummary     needs sync    │
│                                                                              │
│ [Edit] [Duplicate] [Delete] on each row                                     │
│                                                                              │
│ Edit/Add opens stacked dialog:                                               │
│ - Level 1: basics + kind                                                     │
│ - Level 2: kind-specific config                                              │
│ - Level 3: guards (requires/dependsOn/approval/receiptAs)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.9.5 Execution tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ EXECUTION                                                                  │
│ Run Mode          [ sequential | parallel ]                                │
│ Parallel Limit    [ 3 ]                                                     │
│ Error Policy      [ fail | continue ]                                       │
│                                                                            │
│ Execution graph preview (dependsOn)                                        │
│ set_status -> sync_story_doc -> gen_summary                                │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.9.6 Guidance tab (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ GUIDANCE                                                                   │
│ Human Guidance                                                              │
│ [ Keep mutations deterministic and review approvals before apply... ]       │
│                                                                            │
│ Agent Guidance                                                              │
│ [ Prefer update-variable + artifact-sync; use ax-generate when needed ]    │
└────────────────────────────────────────────────────────────────────────────┘
```

### 6.9.7 Expected behavior (locked)

- Action step is deterministic and non-chat (no freeform agent loop).
- `requires` drives progressive unlock of actions.
- `dependsOn` defines explicit execution order; cycles are validation errors.
- `update-variable` writes only to declared variable layers (`context`, `self`, `project`).
- `artifact-sync` requires a valid pre-defined slot key.
- `ax-generate` is signature-driven and bounded (supports optional feedback rerun policy).
- Unsaved changes persist across tab switches.
- Dirty-state indicator remains visible until Save/Discard.


## 6.10) Work Unit Graph Detail (L2) — Artifact Slots tab (locked)

### 6.10.1 Scope boundary (locked)

- This tab is **methodology design-time** only.
- It defines artifact slot contracts for a work unit.
- Runtime snapshot history/details are execution concerns and are not the primary surface of this tab.

### 6.10.2 Artifact slot schemas (locked direction)

```sql
-- Design-time slot definitions (per methodology version + work unit type)
methodology_artifact_slot_definitions (
  id UUID PK,
  methodology_version_id UUID NOT NULL,
  work_unit_type_key TEXT NOT NULL,
  slot_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description_json JSONB NULL,
  cardinality TEXT NOT NULL CHECK (cardinality IN ('single','set')),
  git_tracking_required BOOLEAN NOT NULL DEFAULT TRUE,
  include_globs_json JSONB NULL,
  exclude_globs_json JSONB NULL,
  output_path_strategy_json JSONB NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(methodology_version_id, work_unit_type_key, slot_key)
);

-- Slot-owned templates
methodology_artifact_slot_templates (
  id UUID PK,
  slot_definition_id UUID NOT NULL,
  template_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description_json JSONB NULL,
  content_format TEXT NOT NULL CHECK (content_format IN ('markdown','json','text','plate_json')),
  content_body TEXT NULL,
  content_json JSONB NULL,
  template_schema_version INT NOT NULL DEFAULT 1,
  allowed_variable_namespaces_json JSONB NOT NULL,
  render_policy_json JSONB NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('primary_output','supplemental','agent_hint','regeneration_seed')),
  sort_order INT NOT NULL DEFAULT 0,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  UNIQUE(slot_definition_id, template_key, purpose)
);

-- Execution-time snapshots (runtime evidence header)
project_artifact_snapshots (
  id UUID PK,
  project_id UUID NOT NULL,
  work_unit_instance_id UUID NOT NULL,
  slot_definition_id UUID NOT NULL,
  snapshot_seq INT NOT NULL,
  snapshot_kind TEXT NOT NULL CHECK (snapshot_kind IN ('template_render','fileset_sync','manual_sync')),
  source_json JSONB NULL,
  summary_json JSONB NULL,
  metadata_json JSONB NULL,
  created_at TIMESTAMP NOT NULL,
  UNIQUE(project_id, work_unit_instance_id, slot_definition_id, snapshot_seq)
);
```

Runtime note:
- `project_artifact_snapshot_files` is intentionally deferred from baseline and treated as optional follow-up when file-level runtime audit/query pressure is proven.

### 6.10.3 Artifact Slots tab wireframe (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ ARTIFACT SLOTS (DESIGN-TIME)                                                [+ Add Slot]   │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search slots... ] [Filter: cardinality] [Filter: templates]                             │
│                                                                                            │
│ Slot Key            Cardinality   Templates   Rules Summary                   Actions       │
│ story_doc           single        1           output path configured          [Edit]        │
│ architecture_doc    single        1           output path configured          [Edit]        │
│ code_changes        set           0/optional  include/exclude globs           [Edit]       │
│                                                                                            │
│ Row expand:                                                                                │
│ - description                                                                              │
│ - template attachments (purpose/order/required)                                            │
│ - include/exclude summary                                                                   │
│ - findings                                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.10.4 Add/Edit slot dialog (stacked)

- **Level 1 — Basics:** `slot_key`, `display_name`, description, `cardinality` (`single|set`), git-tracking note.
- **Level 2 — Rules:** include/exclude globs, output path strategy.
- **Level 3 — Templates:** attach templates, set `purpose`, `sort_order`, `required`.

### 6.10.5 Execution behaviors (locked)

Three update paths are supported and must converge through the same mutation/snapshot pipeline:

1. Deterministic fileset capture via Action step (`artifact-sync`, git-derived changed paths).
2. Agent-driven edits followed by explicit sync to Chiron (`artifact-sync` with slot + path inputs).
3. Template-based artifact creation/update via Action step (render + upsert snapshot).

### 6.10.6 Gate/staleness behavior (locked)

- Cross-story overlap/staleness checks are enforced via transition condition sets (gate logic), not ad-hoc detector authority.
- Git-aware gate conditions compare snapshot commit/hash references.
- Reassessment outcomes are persisted as facts/evidence and evaluated by gates to clear or keep block states deterministically.


## 6.11) Work Unit Graph Detail (L2) — Facts tab (locked)

### 6.11.1 Purpose

Provide deterministic work-unit-local fact contract authoring that stays aligned with methodology-level fact semantics while preserving clear scope boundaries (`self` vs `project` vs `context`).

### 6.11.2 Facts tab wireframe (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ FACTS (WORK UNIT SCOPE)                                                      [+ Add Fact]   │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search facts... ] [Filter: type] [Filter: cardinality] [Filter: findings]               │
│                                                                                            │
│ Fact Key             Type       Cardinality   Validation         Findings      Actions      │
│ intakeMode           string     single        allowed-values     ⚠1            [Edit]       │
│ statedGoals          string     set           none               ✓             [Edit]       │
│ contextEnvelope      json       single        json-schema        ⛔1            [Edit]      │
│                                                                                            │
│ Row expand:                                                                                │
│ - Human/Agent guidance                                                                      │
│ - default behavior and required flag                                                        │
│ - canonical source mapping (self/project/context eligibility)                               │
│ - findings and suggested fixes                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.11.3 Behavior locks

- Work-unit facts are authored here as canonical work-unit schema contracts.
- Key uniqueness is enforced within the work-unit scope and validated against naming rules.
- `cardinality` is first-class (`single | set`) and required for every fact contract.
- `json` fact types support schema authoring and schema validation before save.
- Selector inputs for related entities (work unit/link type references) use rich dropdowns (name + subtitle).
- Findings are deterministic and severity-coded; errors block save, warnings do not.
- Canonical authority mapping is explicit: this tab writes canonical tables, never extension payload blobs.

### 6.11.4 Add/Edit fact dialog (stacked)

- **Level 1 — Contract:** `display_name`, `fact_key`, `value_type`, `cardinality`, required/default.
- **Level 2 — Validation:** none/path/allowed-values/json-schema with type-compatibility checks.
- **Level 3 — Guidance:** human guidance, agent guidance, description.

### 6.11.5 Data-path and namespace policy (locked)

- Fact contracts authored here are for durable work-unit scope (`self.facts.*`).
- Cross-work-unit/project reads are referenced through selectors, not by redefining external authority.
- Runtime workflow-local temporary fields remain `context.*` and are not promoted to durable facts by default.


## 6.12) Work Unit Graph Detail (L2) — State Machine tab (locked)

### 6.12.1 Purpose

Define lifecycle states and transitions for the selected work unit with deterministic gate policy and explicit workflow binding visibility.

### 6.12.2 State Machine tab wireframe (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ STATE MACHINE (TRANSITIONS)                                                   [+ Add State] │
│ Tabs: [Overview] [Facts] [Workflows] [State Machine] [Artifact Slots]                     │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Summary: [States: 5] [Transitions: 7] [Bound Workflows: 6] [⛔1 ⚠2 ℹ1]                    │
│ [ Search transitions... ] [Filter: from-state] [Filter: to-state] [Filter: bound/unbound] │
│                                                                                            │
│ Transition                 Gate Mode   Workflow Binding          Findings   Actions         │
│ draft -> ready             all         setup-intake              ✓          [Edit]          │
│ ready -> context-ready     all         generate-context          ⚠1         [Edit]          │
│ context-ready -> done      any         publish-context           ⛔1         [Edit]          │
│                                                                                            │
│ Row expand:                                                                                │
│ - gate condition set preview (all/any + nested groups)                                    │
│ - dependency/link requirements used by the gate                                            │
│ - bound workflow references and readiness notes                                            │
│ - diagnostics with direct fix links                                                        │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.12.3 Behavior locks

- States and transitions are canonical lifecycle contracts, not runtime status projections.
- Transition gate policy authority lives in canonical transition condition sets.
- Workflow bindings are explicit per transition; unbound transitions are surfaced as readiness findings.
- Gate expressions support nested groups with bounded UI depth and deterministic serialization.
- Transition edits trigger impact diagnostics on dependent workflows and link requirements.
- Severity styling follows shared rules (warning yellow+diagonal, error red+diagonal).

### 6.12.4 Transition editor (stacked)

- **Level 1 — Basics:** `from_state`, `to_state`, label/description.
- **Level 2 — Gate policy:** root mode (`all|any`), condition groups, required links, blocking semantics.
- **Level 3 — Workflow binding:** bind/unbind workflow refs and readiness metadata.

### 6.12.5 Schema recovery lock

- Transition configs and bindings stay under typed/versioned contracts.
- Save/publish validation rejects contract drift and incomplete gate schemas.
- No fallback to extension blobs for transition/workflow authority.


## 7) Canonical table changes (locked direction)

### 7.1 Dependency definitions authority update

- Keep methodology-level dependency definition table: `methodology_link_type_definitions`.
- `link type` remains semantic relationship definition (e.g., depends_on/informs/blocks).
- Transition condition sets remain enforcement authority (`all`/`any` + nested conditions) for:
  - required vs optional
  - blocking vs warning/info effect
  - phase-specific gating behavior

Decision impact:
- `allowed_strengths_json` is treated as legacy/deprecation candidate in this direction (not policy authority).
- Strength taxonomy (`hard|soft|context`) is not the primary policy mechanism going forward.

### 7.2 Artifact model simplification (v1 direction)

Adopt a baseline model with two design-time tables plus one runtime evidence table:

1. **Design-time table**: `methodology_artifact_slot_definitions` (new)
   - Defines slot intent and structure at methodology level.
   - No `required` flag on slot definition (requirement belongs to transition conditions).

2. **Design-time table**: `methodology_artifact_slot_templates` (new)
   - Defines slot-owned template contracts and rendering hints.
   - Keeps template semantics in methodology authority, not runtime records.

3. **Execution-time table**: `project_artifact_snapshots` (new)
   - Immutable artifact output records.
   - Must include stable stream identity (project/work-unit/slot/version) for deterministic history and latest lookup.

Deferred from baseline:
- `project_artifact_snapshot_files` stays optional (v1.1+) and is added only when file-level runtime audit/query requirements are confirmed.
- No separate `artifacts` table for now.

Rationale:
- Keeps methodology design-time and project runtime concerns clearly separated.
- Preserves deterministic runtime evidence without premature schema complexity.

## 8) Dependency Type Definitions page (methodology level)

This is a first-class methodology page at the same level as Work Units, Methodology Facts, and Agents.

### 8.1 Page goal

Define semantic dependency/link types once at methodology level, then reuse them in work-unit relationships and transition conditions.

### 8.2 Locked page shape (ASCII)

```text
┌────────────────────────────────────────────────────────────────────────────────────────────┐
│ DEPENDENCY DEFINITIONS                                                  [+ Add Link Type] │
│ Tabs: [Definitions] [Usage] [Diagnostics]                                                 │
├──────────────────────────────────────────────────────────────────────────┬─────────────────┤
│ LINK TYPE LIST                                                          │ SELECTED DETAIL │
│ [ Search link types... ]                                                │                 │
│                                                                          │ Key: depends_on │
│ • depends_on                                                             │ Label: Depends On │
│ • informs                                                                │ Description: Requires upstream context. │
│ • blocks                                                                 │                 │
│ • references                                                             │ Used by: 12 links │
│                                                                          │ Inbound: 5      │
│ Select row → load detail                                                 │ Outbound: 7     │
│                                                                          │                 │
│                                                                          │ [Edit] [Archive]│
└──────────────────────────────────────────────────────────────────────────┴─────────────────┘
```

### 8.3 Behavior locks

- Link types are semantic definitions only.
- Enforcement policy lives in transition condition sets (`all`/`any` + nested conditions).
- No strength taxonomy as primary policy mechanism.
- Keys are unique per methodology version.
- Editing a link type triggers deterministic diagnostics on impacted usages.
- Link type selection uses rich dropdown options (name + description subtitle), not plain key-only rows.

### 8.4 Shared selector pattern (locked)

- **Work Unit selector** and **Link Type selector** use the same control style:
  - searchable dropdown
  - option primary text = display name
  - option secondary text = short description/subtitle
  - selected value displays concise name, with description available on expand/hover.

### 8.5 Field direction (current canonical + near-term evolution)

Current canonical fields in `methodology_link_type_definitions`:
- `key`
- `description_json`
- `allowed_strengths_json` (legacy/deprecation candidate)

Near-term direction:
- keep semantic fields (`key`, description)
- move policy semantics to transition conditions
- treat `allowed_strengths_json` as transitional/legacy while migrating

---

## 9) Open decisions (next pass)

1. Methodology version dashboard redesign details.
2. Optional UX enhancement pass for JSON-schema editing ergonomics.

---

## 10) Immediate next step

1. Convert this locked design baseline into implementation-ready stories for Epic 3.
2. Keep canonical authority and typed step-contract validation as explicit acceptance criteria.
3. Resume and close Epic 2 retrospective synthesis/readiness workflow using this finalized baseline.
