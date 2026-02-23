# Chiron PRD Canonical v1 (Week 6)

Date: 2026-02-18
Status: Canonical PRD for reset + reimplementation

## 1) Product Vision

Chiron is a methodology-first orchestration platform for AI-assisted software delivery. It turns BMAD workflows into executable, auditable runs where planning and execution remain synchronized through work units, transitions, and deterministic gates.

## 2) Primary Outcomes

1. Reduce planning-to-implementation cycle time.
2. Preserve traceability from requirement -> decision -> execution output.
3. Minimize manual coordination friction during high-velocity delivery.
4. Enable repeatable methodology execution with low user intervention.

## 3) Core Product Model

### Work units

- First-class entities representing planning/execution objects (PRD, architecture, story, research, etc.).
- Each work unit has:
  - type
  - state
  - links/dependencies
  - slots/snapshots

### Transitions

- All state change flows through transitions.
- Transition lifecycle uses two gates only:
  - `start_gate`: can execution begin?
  - `completion_gate`: can state transition complete?

### Workflows

- Workflows are scoped to `methodologyVersion + workUnitType`.
- Transition authority is controlled by allowed workflow bindings per transition.

### Step system

- Only six step capabilities are valid:
  - `form`, `agent`, `action`, `invoke`, `branch`, `display`

## 4) Runtime and Backend Stack (Locked)

- Bun + Turborepo
- Hono (HTTP + SSE streaming transport)
- tRPC (typed API)
- Effect (orchestration/services/layers)
- AI SDK + OpenCode SDK (dual runtime)
- SQLite + Drizzle (current horizon)
- Better-Auth

## 5) Frontend Direction (Locked for later implementation)

- Primary font: `Commit Mono`
- Accent/flair font: `Geist Pixel`
- Visual direction: Bloomberg-terminal influence + maximalist curated assets + minimal interaction structure
- Planned additions:
  - work-unit graph views via React Flow
  - power-user keyboard workflows via TanStack Hotkeys

## 6) Functional Requirements (Condensed)

1. Create/manage work units and transitions.
2. Execute BMAD workflows mapped to work units.
3. Enforce deterministic gates with actionable diagnostics.
4. Support invoke semantics:
  - `same_work_unit`
  - `child_work_units`
5. Support dual agent runtime execution and streaming responses.
6. Persist outputs, artifacts, and transition evidence for auditability.
7. Provide operator-facing state views (execution, transitions, artifacts, graph).

## 7) Non-Functional Requirements (Condensed)

1. Deterministic and reproducible transition outcomes.
2. Strong traceability and audit history (append-only where applicable).
3. Stable runtime under concurrent workflow runs.
4. Clear failure diagnostics and remediation guidance.
5. Fast local development and reset/rebuild ergonomics.

## 8) Scope Boundaries (Current Horizon)

### In scope

- Methodology engine core (work units/transitions/slots/snapshots/gates)
- Workflow runtime wiring to methodology gates
- Transition-workflow binding model
- Seeded BMAD workflow map and step configuration baseline
- Backend-first implementation slices

### Deferred

- Advanced AX optimization loops and rollout mechanics
- Non-critical admin customization surfaces
- Non-essential UI polish before backend parity

## 9) Delivery Strategy (Week 6 -> Week 10)

1. Lock docs/contracts and archive non-canonical references.
2. Reset scaffold on Better-T-Stack baseline.
3. Implement backend vertical slice (`WU.SETUP` + `WU.BRAINSTORMING`).
4. Expand to transition binding and story execution slices.
5. Implement frontend against stabilized backend contracts.

## 10) Canonical Companion Docs

- `chiron-foundational-docs-lock-v1-week6.md`
- `chiron-module-lock-matrix-v1-week6.md`
- `chiron-complete-schemas-v2-week6.md`
- `bmad-work-unit-catalog-v1-week6.md`
- `bmad-to-chiron-step-config-resolved-v1-week6.md`
