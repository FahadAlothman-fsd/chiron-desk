# Chiron UX Design Specification

> Status Notice (2026-02-23): Superseded.
> Canonical UX spec is `_bmad-output/planning-artifacts/ux-design-specification.md`.
> Keep this file for historical reference only; do not use it for new implementation decisions.

_Created on 2025-11-01 by fahad_
_Generated using BMad Method - Create UX Design Workflow v1.0_

---

## Executive Summary

**Project Vision:**

Chiron is a visual orchestration platform that transforms BMAD's proven CLI methodology into a PM-grade multi-agent system. The platform coordinates multiple AI coding agents across structured workflows while preserving human expertise at the center of decision-making.

**Target Users:**
- Primary: Intermediate/expert software engineers building complex systems (Level 2-4 projects)
- Secondary: Technical PMs coordinating AI-driven development

**Core Experience:**
Multi-agent orchestration with PM-grade visibility - engineers coordinate 2+ AI agents in parallel through visual dashboards while maintaining full control and context awareness.

**Platform:** Desktop application (Tauri) with React + TypeScript + Tailwind CSS + shadcn/ui

**UX Complexity Assessment:** High complexity
- Multiple user roles (6 core agents: Analyst, PM, Architect, DEV, SM, UX Designer)
- Complex multi-phase workflows (4-phase BMAD methodology)
- Real-time multi-agent coordination
- Rich interaction patterns (4 universal chat primitives)
- Multi-screen application with state synchronization

---

## 1. Design System Foundation

### 1.1 Design System Choice

**Selected: shadcn/ui Component Registry Pattern**

**Rationale:**

shadcn/ui is the ideal foundation for Chiron because it aligns perfectly with the project's technical requirements and UX philosophy:

**Technical Alignment:**
- **Already specified in PRD:** Tech stack locked to React + TypeScript + Tailwind CSS + shadcn/ui
- **Copy-paste philosophy:** Components are copied into your codebase (not npm package), giving full control for customization
- **Registry pattern:** Not tightly coupled to Radix UI - can use different primitive libraries (Radix UI, React Aria, etc.)
- **TypeScript-first:** Fully typed components with excellent DX for React + TypeScript projects
- **Tailwind CSS integration:** Uses CSS variables + Tailwind utilities for theming, matching Chiron's styling approach

**UX Philosophy Match:**
- **Customizable, not prescriptive:** shadcn/ui provides starting points, not locked designs - perfect for Chiron's pattern-driven UX where we need specialized interfaces
- **Accessible by default:** WCAG 2.1 Level AA compliance out-of-box (when using accessible primitives)
- **Modern aesthetic:** Clean, minimal design that won't compete with Chiron's specialized workflow interfaces
- **Component composition:** Easily compose custom components from primitives (critical for 4 chat interaction patterns)

**What shadcn/ui Provides:**
- **50+ components:** Buttons, forms, modals, dialogs, dropdowns, navigation, data tables, cards, tooltips, popovers, etc.
- **Theming system:** CSS variables + Tailwind config for light/dark mode and custom color palettes
- **Icon library:** Lucide React icons (consistent, customizable SVG icons)
- **Responsive patterns:** Mobile-first components with breakpoint utilities

**Customization Approach:**
- **Base components from shadcn/ui:** Button, Dialog, Card, Tabs, Select, Input, Textarea, Dropdown, Tooltip, Popover
- **Custom pattern components:** Multi-Agent Dashboard, Story Kanban, Artifact Workbench, Chat Primitives (built on shadcn/ui primitives)
- **Theming:** CSS variables for colors + Tailwind config for spacing, typography, breakpoints

**Version:** Latest stable (v4.x with Tailwind v4 support)

**Design System Decision:** Use shadcn/ui as component foundation, customize extensively for Chiron's specialized Bloomberg-terminal aesthetic

---

## 2. Core User Experience

### 2.1 Defining Experience

**Core Experience: Bloomberg Terminal for AI Agent Orchestration**

Chiron transforms multi-agent coordination from chaotic CLI juggling into a professional, data-dense visual command center. The defining experience is **technical mastery meets visual clarity** - users feel like they're operating a sophisticated control system, not wrestling with fragmented tools.

**Key Experience Pillars:**

1. **Radar-Based Agent Visualization**
   - Circular progress tracker showing all active agents as colored cursors
   - Cursor color indicates status (green=running, red=failed, yellow=awaiting input)
   - Position around circle shows progress toward workflow completion
   - Side queue shows upcoming agents grouped by workflow phase
   - **Inspiration:** Air traffic control meets project management

2. **Unified Grid System**
   - Horizontal borders align across all dashboard sections
   - Agent table rows sync with activity log entries
   - Metrics panels sit on same baseline as story cards
   - Creates cohesive "single pane of glass" feeling
   - **Inspiration:** Bloomberg Terminal's aligned data windows

3. **Technical Typography & Monospace Aesthetic**
   - All data uses monospace fonts for precise alignment
   - Agent IDs: `DEV-1`, `PM-2`, `ARCH-1` (technical identifiers)
   - Workflow names: `STORY IMPLEMENTATION`, `PRD GENERATION` (command-style labels)
   - Code-style prefixes: `</A>`, `/COMMAND`, `#` for headers
   - **Inspiration:** Terminal interfaces, hacker aesthetic

4. **Corner Border Treatments**
   - L-shaped brackets define section boundaries
   - Thick-corner borders on agent avatars (inspired by stepper UI)
   - "+" marks in red at section corners for expandable areas
   - Extended borders that break out of containers (blueprint style)
   - **Inspiration:** Technical drawings, CAD interfaces

5. **Status-Driven Color Coding**
   - Table rows colored by semantic status (green=active, yellow=attention, red=error)
   - Agent-specific signature colors for identity (not status)
   - Minimal use of color - intentional and meaningful
   - **Inspiration:** Terminal color schemes, system monitoring tools

### 2.2 Novel UX Patterns

Chiron introduces **9 novel UX patterns** that transform AI-agent interaction and workflow orchestration:

#### Core Interaction Primitives (Chat Interface Patterns)

**Pattern 1: Sequential Dependencies (Wizard/Chain Pattern)**
- **What it is:** Multi-step workflows where each step depends on previous selection, revealing complexity progressively
- **Visual Design:** Collapsed completed steps → Expanded current step → Greyed future steps
- **Actions per step:** [Answer] [Clarify] [Ignore] or context-specific actions
- **Why it's novel:** Composable wizard pattern that handles conditional logic trees, not just linear forms
- **Use cases:**
  - Project setup (workflow-init)
  - Epic creation with dependencies
  - Git conflict resolution flows
  - Story refinement (define epic → select stories → acceptance criteria → estimate)
- **State tracking:** Progress bar shows completion, can jump back to modify earlier steps

**Pattern 2: Parallel Independence (Checklist/Queue Pattern)**
- **What it is:** Independent items handled in any order with completion state tracking
- **Visual Design:** REQUIRE ACTION (N) | COMPLETED (N) | ANSWERED (N) | IGNORED (N) sections
- **Actions per item:** [Answer] [Clarify] [Ignore] [Restore] or context-specific actions
- **Why it's novel:** Flexible checklist with ignore/restore capability, not just binary done/not-done
- **Use cases:**
  - Acceptance criteria validation (mark each as done/pending)
  - Multi-agent task queue (assign independent tasks to agents)
  - Code review feedback (address comments in any order)
  - Feature flags (toggle multiple independent features)
  - Epic story breakdown (work on stories in any order)
- **State tracking:** Can ignore optional items with feedback, restore later if needed

**Pattern 3: Structured Exploration (Curated Options with Deep-Dive)**
- **What it is:** Present curated options with conversational exploration before commitment
- **Visual Design:** Option cards with description + [Explore] [Select] [Reject] actions
- **Modes:** Select-one (radio) or select-multiple (checkbox)
- **Why it's novel:** Enables research before selection - not just "pick one and move on"
- **Use cases:**
  - Tech stack selection (database, UI library, auth provider with tradeoff discussions)
  - Architecture patterns (microservices vs monolith vs serverless)
  - Code refactoring strategies (agent suggests 3 approaches, user explores each)
  - Elicitation method selection (5 Whys, SCAMPER, Tree of Thoughts)
  - Agent assignment (who should handle this task?)
  - Workflow selection (what should we do next?)
- **Exploration dialog:** Opens focused conversation with agent, can compare multiple options, ask "why/why not"

**Pattern 4: Focused Dialogs (Context-Preserving Deep-Dive)**
- **What it is:** Open focused dialog for complex actions while preserving main chat context
- **Visual Design:** Modal/drawer with agent conversation, reasoning, tool calls, actions at bottom
- **Actions:** ✓ Accept | ↻ Continue Discussion | ✗ Cancel | context-specific actions
- **Why it's novel:** Isolates complex interactions without polluting main conversation timeline
- **Use cases:**
  - Answer/Clarify (Questions): Provide answer or refine question phrasing
  - Code Explanation: Select code block → explain in dialog with deep-dive
  - Diff Review: Click diff hunk → see context, related changes, impact
  - Error Investigation: Click error → stack trace, suggested fixes, similar issues
  - Dependency Analysis: Click function → callers, callees, impact radius
  - Artifact Section Editing: Select PRD section → structured editor with agent help
  - Conflict Resolution: Agent collision → discuss and resolve with both agents
- **Context sync:** All dialog interactions sync back to main chat timeline

#### Visual & Layout Patterns

**Pattern 5: Agent Radar + Status Queue**
- **What it is:** Circular progress visualization with agents as moving cursors + vertical queue sidebar
- **Why it's novel:** Combines temporal (progress around circle) and sequential (queue list) views in one interface
- **Use case:** Multi-Agent Dashboard - see all 6 agents at a glance with progress and upcoming work
- **Visual cues:** Cursor color = status (green/red/yellow), position = progress, side queue = upcoming

**Pattern 6: Cross-Section Border Alignment**
- **What it is:** Horizontal grid lines extend across multiple dashboard sections, creating unified layout
- **Why it's novel:** Most dashboards use isolated cards; Chiron connects sections visually through shared baselines
- **Use case:** Agent Allocation table aligns with Activity Log and Chat Terminal
- **Impact:** Creates "single pane of glass" feeling - everything on one unified grid

**Pattern 7: Thick-Corner Agent Avatars**
- **What it is:** Agent icons with borders where corners are thick and sides are thin
- **Why it's novel:** Creates distinctive visual identity without heavy borders everywhere
- **Use case:** Agent avatars in radar, sidebar, chat headers
- **Inspiration:** Technical drawing corner brackets, blueprint aesthetic

**Pattern 8: Grid Select + List Select Duality**
- **What it is:** 3-column icon grid for visual options, vertical list for text-heavy options
- **Why it's novel:** Same selection pattern adapts presentation based on content type
- **Use cases:**
  - Grid: Chat interaction pattern selection (4 primitives with icons)
  - List: Workflow queue (text-heavy task names with metadata)
- **Visual design:** Grid uses icons + `/` prefix labels, List uses `</A>` prefixes + right-aligned icons

**Pattern 9: Terminal-Style Activity Log**
- **What it is:** Monospace timestamped log with agent prefixes, status indicators, and loading bars
- **Why it's novel:** Brings developer console aesthetic into PM interface
- **Use case:** Real-time agent execution visibility (tool calls, file access, errors)
- **Format:** `# 2025-06-17 14:23 UTC` headers, `> [AGNT:name] :: ACTION >> status`, mixed-character loading bars

---

## 3. Visual Foundation

### 3.1 Color System

**Design Philosophy:**
Chiron uses a **dual-layer color strategy**: neutral base palettes (CARBON/CAMO) provide professional backdrop, while agent signature colors and semantic status colors add meaning without visual noise.

**Inspired by:** Francesco Michelini F/23 color palettes - sophisticated earth tones with intentional accent colors

---

#### Base System Palettes

**Dark Mode: CARBON**
```
Primary:   #101010 (Deep black - backgrounds)
Secondary: #797872 (Medium gray - borders, inactive text)
Tertiary:  #CDC9B9 (Light beige - active text, labels)
```

**Usage:**
- `#101010` → Main background, card backgrounds
- `#797872` → Borders, dividers, placeholder text, inactive states
- `#CDC9B9` → Primary text, labels, active UI elements

**Light Mode: CAMO**
```
Primary:   #E3E4D5 (Light beige - backgrounds)
Secondary: #A6A77E (Muted olive - borders, inactive text)
Tertiary:  #474741 (Dark charcoal - active text, labels)
```

**Usage:**
- `#E3E4D5` → Main background, card backgrounds
- `#A6A77E` → Borders, dividers, placeholder text, inactive states
- `#474741` → Primary text, labels, active UI elements

**Rationale:** Both palettes use neutral earth tones that create a calm, professional backdrop without competing with agent signature colors or semantic status indicators.

---

#### Agent Signature Colors

Each of Chiron's 6 core agents has a unique signature color for identity and branding:

**Analyst → TERRAIN Greens**
```
Primary: #3C4236 (Dark forest green)
Accent:  #8D9784 (Medium sage green)
Light:   #BCC89C (Light moss green)
```
- **Mythology Name:** Hermes
- **Mythology Name:** Mimir
- **Role:** Research, exploration, data gathering
- **Color Rationale:** Earthy greens represent growth, discovery, natural exploration

**PM → ALERT Red**
```
Primary: #FE5344 (Vibrant coral red)
```
- **Mythology Name:** Athena
- **Role:** Strategy, planning, command
- **Color Rationale:** Commanding red represents authority, decision-making, action

**Architect → WINTER Blue-Gray**
```
Primary: #5D6C6A (Cool blue-gray)
```
- **Mythology Name:** Daedalus
- **Role:** Structure, design, technical blueprints
- **Color Rationale:** Cool technical color represents precision, logic, systematic thinking

**DEV → FLUO Neon Green**
```
Primary: #C4FF58 (Bright neon yellow-green)
```
- **Mythology Name:** Hephaestus
- **Mythology Name:** Osiris
- **Role:** Execution, implementation, building
- **Color Rationale:** High-energy neon represents activity, execution, getting things done

**SM (Scrum Master) → CAMO Neutral**
```
Primary: #A6A77E (Muted olive)
```
- **Mythology Name:** Hestia
- **Mythology Name:** Chronos
- **Role:** Coordination, workflow management, facilitation
- **Color Rationale:** Balanced neutral represents harmony, coordination, smooth flow

**UX Designer → DAWN Coral**
```
Primary: #F16D50 (Warm coral orange)
```
- **Mythology Name:** Aphrodite
- **Mythology Name:** Ariadne
- **Role:** Design, aesthetics, user experience
- **Color Rationale:** Creative warm color represents innovation, beauty, human-centered design

**Agent Color Application:**
- **Avatar borders:** Thick-corner border in agent's signature color
- **Name labels:** Agent name displayed in signature color
- **Chat responses:** Agent messages use readable variant of signature color
  - Dark mode: Lighter tint for readability
  - Light mode: Darker shade for readability
- **Status indicators:** Combines signature color with semantic status (e.g., green border + agent color fill)

---

#### Semantic Status Colors

Universal status colors used across the entire system:

**Success / Active / Running**
```
Color: #22C55E (Tailwind green-500)
Usage: Active workflows, successful operations, running agents
Visual: Green cursor on radar, green table rows, green checkmarks
```

**Error / Failed / Critical**
```
Color: #EF4444 (Tailwind red-500)
Usage: Failed workflows, error states, critical alerts
Visual: Red cursor on radar, red table rows, red error icons
```

**Warning / Paused / Attention Needed**
```
Color: #F59E0B (Tailwind amber-500)
Usage: Paused workflows, warnings, awaiting human input
Visual: Yellow cursor on radar, yellow table rows, yellow warning icons
```

**Info / Idle / Queued**
```
Color: #3B82F6 (Tailwind blue-500)
Usage: Idle agents, queued workflows, informational messages
Visual: Blue badges, blue info icons, blue highlights
```

**Neutral / Disabled / Inactive**
```
Color: #6B7280 (Tailwind gray-500)
Usage: Disabled states, inactive elements, neutral information
Visual: Gray text, gray borders, disabled buttons
```

**Color Accessibility:**
- All status colors meet WCAG 2.1 Level AA contrast requirements
- Status never relies on color alone - always paired with icons, labels, or patterns
- Colorblind-safe palette (tested with deuteranopia, protanopia, tritanopia simulators)

---

#### Bento Box Highlight Arsenal

Vibrant accent colors reserved for **sparingly applied highlights**:

```
Coral:      #FF9B9B
Sky Blue:   #7FCDCD
Mint:       #7FE5B8
Orange:     #FF9B6B
```

**Usage Guidelines:**
- **Data visualization:** Chart lines, graph accents, metric highlights
- **Phase badges:** Visual indicators for 4-phase BMAD methodology
- **Special highlights:** Call-to-action elements, feature announcements
- **Gradient accents:** Subtle gradients on text or decorative elements (like bento box "ONE SMALL STEEP")

**Application Rules:**
- Maximum 1-2 highlight colors per screen
- Use sparingly - these are attention-grabbers
- Never use for critical status information (use semantic colors instead)
- Good for: Celebration moments, special features, visual interest

---

#### Color System Summary

**Total Palette:**
- 2 base palettes (6 colors total: CARBON dark + CAMO light)
- 6 agent signature colors
- 5 semantic status colors
- 4 highlight accent colors
- **Grand total: 21 defined colors**

**Dark Mode Primary Colors:** CARBON base + agent colors + semantic colors
**Light Mode Primary Colors:** CAMO base + agent colors + semantic colors (same semantic/agent colors work in both modes)

**Interactive Visualizations:**

- Color Theme Explorer: [ux-color-themes.html](./ux-color-themes.html)

---

## 4. Design Direction

### 4.1 Chosen Design Approach

**Selected Direction: D8 Ops Variant (Execution-Balanced Mission Control)**

This specification preserves the locked visual direction and converts it into implementation-ready rules without scope expansion.

**Direction Contract:**

1. **Execution-first primary focus**
   - In active runs, the center surface is the `Active Step Pane`.
   - Secondary context (`Diagnostics`, `Work Unit Queue`, `Timeline`, `Evidence`) is collapsible and progressively disclosed.
2. **Single system grammar across pages**
   - Sharp borders, explicit separators, compact-to-layered density, deterministic state semantics.
   - No separate visual language per page type.
3. **Cadence-aware context model**
   - Daily use defaults to execution orchestration.
   - Methodology refinement is intentional/episodic and uses the same semantic system.
4. **Branch-aware timeline behavior**
   - Default timeline is compact summary rail.
   - On fork detection, escalate to branch-lane view with deterministic references.
5. **Tooling governance visibility**
   - Governed executions (agent tool calls and action-step calls) render explicit lifecycle and decision outcomes.

**Page Archetype Emphasis (same direction, different primary pane):**

- `Execution Cockpit`: Active step primary, context secondary.
- `Project/Work Unit Overview`: graph/state projection primary.
- `Forensics/Debug`: diagnostics + timeline primary.
- `Methodology Refinement`: configuration editors primary.

**Interactive Mockups:**

- Design Direction Showcase: [ux-design-directions.html](./ux-design-directions.html)

---

## 5. User Journey Flows

### 5.1 Critical User Paths

The following critical paths define implementation behavior and coverage.

#### Path 1 - Methodology Publish and Share (episodic)

1. User edits work-unit/transition/gate/workflow binding configuration.
2. System validates configuration deterministically.
3. If validation fails, user receives typed diagnostics + remediation.
4. If validation passes, user publishes immutable methodology version and share metadata.
5. Audit lineage is persisted and queryable.

#### Path 2 - Deterministic Transition Control (execution default)

1. User selects transition from current work-unit state.
2. System evaluates gates deterministically.
3. If blocked, UI shows `required` vs `observed` and remediation options.
4. If pass, transition proceeds either:
   - directly (no workflow required), or
   - through configured workflow execution path.
5. Transition evidence and next valid action are surfaced.

#### Path 3 - Step Execution (transition-bound or standalone)

1. Active step opens in step-focused pane.
2. User/system executes step-type behavior (`form`, `agent`, `action`, `invoke`, `branch`, `display`).
3. Context is injected as needed (including `@mentions` in input/chat contexts).
4. State transitions render deterministically (`loading`, `blocked`, `failed`, `success`).
5. Outcomes persist with evidence links and next action.

#### Path 4 - Tool Governance Decision Loop (cross-path)

1. Tool/action call enters governance lifecycle.
2. Policy evaluation and user decision (`approve`, `reject`, `request refinement`) are explicit.
3. Rejected/refined calls re-enter proposal flow with audit trail.
4. Blocked policy constraints remain distinct from user rejection.

#### Path 5 - Branch and Forensics Escalation

1. Run stays on timeline summary rail by default.
2. On fork detection, branch lane panel opens.
3. User inspects branch outcomes by stable IDs/evidence references.
4. Recovery paths (`retry`, `resume`, remediation) remain available from diagnostics context.

---

## 6. Component Library

### 6.1 Component Strategy

**Foundation:** shadcn-compatible component system (Radix baseline; Base UI by governed exception).

**Custom component groups (implementation-critical):**

1. Methodology builder: `MethodologyWorkspaceShell`, editors, validation and publish/share panels.
2. Execution runtime: `ActiveStepPane`, step panel registry, step-type panels.
3. Evidence and diagnostics: unified `DiagnosticsEvidencePanel`.
4. Projection surfaces: graph canvas, projection switch, queue panel, timeline/branch components.
5. Focus modes: zen-focused shell and context drawer stack.

#### Architecture -> UX Interface Contracts

##### A) Agent Radar Semantics Contract

**Purpose:** consistent multi-agent run awareness, whether rendered as radar panel or equivalent queue/stream fallback.

**Required input fields:**
- `executionId`, `runId`, `agentId`, `agentKind`, `state`, `queuePosition`, `updatedAt`
- optional: `blockedReasonCode`, `failedCode`, `awaitingDecision`

**Rendering rules:**
- State uses canonical semantics (`normal/loading/blocked/failed/success`).
- `blocked` and `failed` are visually and behaviorally distinct.
- If radar surface is collapsed/unavailable, equivalent semantics are shown in queue/activity representation.

##### B) Artifact Workbench Interaction Contract

**Purpose:** deterministic review and reuse of generated artifacts during and after runs.

**Required input fields:**
- `artifactId`, `artifactType`, `executionId`, `stepAttemptId`, `version`, `status`, `references[]`

**Core interactions:**
- open artifact, compare versions, accept/reject where applicable, attach artifact as context, trace to source attempt.

**State constraints:**
- Loading/blocked/failed/success states are explicit for artifact operations.
- All artifact decisions preserve lineage and evidence links.

##### C) Graph/State Projection Contract

**Purpose:** stable orchestration visibility across projections.

**Projection modes:**
- `state-machine`, `dependency`, `actionability`

**Required node/edge fields:**
- nodes: `workUnitId`, `currentState`, `eligibleTransitions`, `blockersCount`, `activeExecutionCount`
- edges: `dependencyType`, `strength`, `status`

**Behavior contract:**
- Switching projection changes view emphasis only, never semantic meaning.
- Node state and transition eligibility remain deterministic and referenceable.

##### D) Failure Diagnostics Payload Rendering Contract

**Purpose:** ensure diagnostics are actionable, stable, and testable across all surfaces.

**Required payload fields:**
- `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`
- references: `executionId`, `transitionAttemptId`, `stepAttemptId`, related artifact IDs

**Rendering contract:**
- `blocked`: shows unmet condition (`required` vs `observed`) + remediation.
- `failed`: shows terminal attempt context + recovery options.
- Equivalent payloads render equivalent UX structure and actions.

---

## 7. UX Pattern Decisions

### 7.1 Consistency Rules

#### Cross-Surface Consistency Rules

1. One state model everywhere: `normal`, `loading`, `blocked`, `failed`, `success`.
2. Triple state encoding is mandatory: icon + label + semantic color.
3. Command and visible-control paths must produce equivalent outcomes.
4. Secondary context is collapsible and progressively disclosed.
5. Tool-governance outcomes are explicit (`approved`, `rejected`, `refine_requested`, `blocked`).

#### State Behavior Definitions by Critical Surface

| Surface | Loading | Blocked | Failed | Success |
| --- | --- | --- | --- | --- |
| Active Step Pane | step in progress, stream visible | prerequisite or governance condition unmet, remediation visible | terminal attempt failure, retry/resume options shown | step output persisted, next action shown |
| Tool Governance Card | policy/user decision pending | policy constraint prevents execution | governed call failed during execution | call completed with persisted result |
| Work Unit Queue | queue refresh/rank recalculating | upstream dependency unmet | queue transition/update error | readiness and ordering updated |
| Graph/State Projection | projection/state refresh | transition ineligible due to blockers | projection data/render failure | projection synchronized and actionable |
| DiagnosticsEvidence Panel | diagnostics/evidence retrieval | missing required context for full diagnostics | diagnostics fetch/render failure | diagnostics + evidence links available |
| Branch Timeline | branch summary/lane loading | branch branch-data incomplete due to unmet refs | branch tracking failed | branch lanes synchronized with stable references |

#### Error Distinction Rules

- `blocked` = currently ineligible (not terminal).
- `failed` = terminal attempt failure.
- `rejected` (user-governance decision) is distinct from `blocked`.

---

## 8. Responsive Design & Accessibility

### 8.1 Responsive Strategy

Chiron is desktop-first with deterministic responsive degradation.

#### Breakpoint and Panel Strategy

- `xl/2xl`: multi-panel cockpit (active step + at least one secondary context panel)
- `lg`: active step primary + one secondary visible + additional drawers
- `md`: single primary pane + context sheets
- `sm/xs`: single-pane mode with segmented context access

#### Responsive Constraints

1. Semantic meaning does not change by breakpoint.
2. Context collapse order is deterministic (aux -> timeline -> evidence -> diagnostics detail).
3. Active step remains primary in execution contexts.
4. Branch timeline escalation remains available on all breakpoints.

#### Accessibility Baseline

- WCAG 2.2 AA target.
- Keyboard parity for command and visual paths.
- Explicit focus management for drawers/modals.
- Live updates announced with bounded/throttled `aria-live` behavior.

---

## 9. Implementation Guidance

### 9.1 Completion Summary

This specification now addresses implementation-readiness blockers without redesigning product scope.

#### Completed Readiness Outcomes

1. Placeholder sections 4.1/5.1/6.1/7.1/8.1/9.1 are replaced with implementation-oriented content.
2. FR-to-UX traceability is explicit for FR1..FR7.
3. Architecture-to-UX interface contracts are defined for radar, workbench, graph/state projections, and diagnostics payload rendering.
4. Appendix references now point to canonical planning-artifact sources.
5. Critical surfaces include explicit non-happy-path state behavior definitions.

#### FR -> UX Traceability Matrix

| FR | Screen/Surface Mapping | Component Mapping | Required State/Behavior Mapping |
| --- | --- | --- | --- |
| FR1 | Execution Cockpit, Project Overview, Work Unit Overview | `WorkUnitGraphCanvas`, `WorkUnitQueuePanel`, transition editors | readiness/eligibility states explicit; deterministic lifecycle display |
| FR2 | Methodology Workspace + Execution Cockpit | `MethodologyValidationPanel`, `PublishSharePanel`, `StepRendererRegistry` | pinned methodology context visible for runs and transitions |
| FR3 | Transition control + Diagnostics surfaces | `DiagnosticsEvidencePanel`, state badges, transition controls | deterministic gate decisions with `required` vs `observed`, explicit blocked remediation |
| FR4 | Active Step Pane + Invoke/Branch surfaces | `InvokeStepPanel`, `BranchAwareTimelinePanel` | explicit invoke mode rendering, parent-child lineage, branch escalation |
| FR5 | Agent/runtime execution surfaces | `AgentStepPanel`, tool governance cards, stream components | runtime provenance visible; deterministic streaming and terminal states |
| FR6 | Diagnostics/evidence/forensics surfaces | `DiagnosticsEvidencePanel`, artifact views, timeline refs | append-only evidence links with stable execution/attempt identifiers |
| FR7 | Cockpit + Overview + Forensics | graph/queue/timeline/diagnostics stack | operator can inspect execution, transitions, artifacts, and graph/state with stable refs |

#### Explicit Hard-Blocker Clarifications

- **FR3 (gates/diagnostics):** blocked decisions always show `required` vs `observed` and remediation actions.
- **FR4 (invoke semantics):** UI always shows `same_work_unit` vs `child_work_units` semantics and lineage mappings.
- **FR6 (evidence visibility):** diagnostics, artifacts, and variable snapshots remain cross-linked with stable IDs across surfaces.

---

## Appendix

### Related Documents

- Implementation Readiness Report: `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-planning/implementation-readiness-report-2026-02-22.md`
- Product Requirements (canonical): `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/prd.md`
- Architecture (canonical): `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/architecture.md`
- Epics (canonical): `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/epics.md`
- Product Brief (historical context): `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-planning/product-brief-chiron-2025-10-26.md`
- UX Pattern Index: `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/design/ux-patterns-index.md`
- Structured Exploration Lists: `/home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/design/ux-pattern-structured-exploration-lists.md`

### Core Interactive Deliverables

This UX Design Specification was created through visual collaboration:

- **Color Theme Visualizer**: /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/design-exploration/mockups/ux-color-themes.html
  - Interactive HTML showing all color theme options explored
  - Live UI component examples in each theme
  - Side-by-side comparison and semantic color usage

- **Design Direction Mockups**: /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/design-exploration/ux-design-directions.html
  - Interactive HTML with 6-8 complete design approaches
  - Full-screen mockups of key screens
  - Design philosophy and rationale for each direction

### BMAD Agent -> Chiron Naming Map (Config Extraction Reference)

Source of truth for BMAD agent config location:

- `/home/gondilf/Desktop/projects/masters/chiron/_bmad/_config/agent-manifest.csv`

Use this map to resolve Chiron names to BMAD agent configuration files.

| BMAD Agent Key | BMAD Display Name | Chiron Name | BMAD Config Path |
| --- | --- | --- | --- |
| `bmad-master` | BMad Master | Odin | `_bmad/core/agents/bmad-master.md` |
| `analyst` | Mary | Mimir | `_bmad/bmm/agents/analyst.md` |
| `pm` | John | Athena | `_bmad/bmm/agents/pm.md` |
| `architect` | Winston | Daedalus | `_bmad/bmm/agents/architect.md` |
| `dev` | Amelia | Osiris | `_bmad/bmm/agents/dev.md` |
| `sm` | Bob | Chronos | `_bmad/bmm/agents/sm.md` |
| `ux-designer` | Sally | Ariadne | `_bmad/bmm/agents/ux-designer.md` |
| `quick-flow-solo-dev` | Barry | Hermes | `_bmad/bmm/agents/quick-flow-solo-dev.md` |
| `quinn` | Quinn | Maat | `_bmad/bmm/agents/quinn.md` |
| `qa` | Quinn | Themis | `_bmad/bmm/agents/qa.md` |
| `tech-writer` | Paige | Thoth | `_bmad/bmm/agents/tech-writer/tech-writer.md` |
| `tea` | Murat | Drona | `_bmad/tea/agents/tea.md` |
| `brainstorming-coach` | Carson | Carson | `_bmad/cis/agents/brainstorming-coach.md` |
| `creative-problem-solver` | Dr. Quinn | Odysseus | `_bmad/cis/agents/creative-problem-solver.md` |
| `design-thinking-coach` | Maya | Brigid | `_bmad/cis/agents/design-thinking-coach.md` |
| `innovation-strategist` | Victor | Prometheus | `_bmad/cis/agents/innovation-strategist.md` |
| `presentation-master` | Caravaggio | Bragi | `_bmad/cis/agents/presentation-master.md` |
| `storyteller` | Sophia | Anansi | `_bmad/cis/agents/storyteller/storyteller.md` |

### Version History

| Date       | Version | Changes                         | Author |
| ---------- | ------- | ------------------------------- | ------ |
| 2025-11-01 | 1.0     | Initial UX Design Specification | fahad  |

---

_This UX Design Specification was created through collaborative design facilitation, not template generation. All decisions were made with user input and are documented with rationale._
