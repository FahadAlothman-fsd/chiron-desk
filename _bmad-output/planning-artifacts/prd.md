---
workflow: edit-prd
classification:
  domain: general
  projectType: desktop_app
  format: bmad-standard
date: 2026-02-18
inputDocuments:
- /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-planning/sprint-change-proposal-2026-02-21.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/architecture.md
stepsCompleted:
  - step-e-01-discovery
  - step-e-02-review
  - step-e-03-edit
lastEdited: 2026-02-21
editHistory:
  - date: 2026-02-21
    summary: Applied approved course-correction sequencing assumptions with no scope expansion.
  - date: 2026-02-21
    summary: Applied quick PRD structure and requirement-clarity fixes aligned to epics and architecture.
  - date: 2026-02-21
    summary: Clarified desktop client-server posture and platform rollout assumptions.
  - date: 2026-02-21
    summary: Added minimal traceability mapping, NFR verification notes, and deferred-by-design guardrails.
  - date: 2026-02-21
    summary: Tightened condensed FR verification anchors and clarified mapping as non-exclusive.
  - date: 2026-02-21
    summary: Applied quick precision fixes for outcome measurability, desktop acceptance checks, and reset/rebuild SLO.
  - date: 2026-02-21
    summary: Polished outcomes, journeys, rollout gating language, and verification phrasing.
  - date: 2026-02-21
    summary: Added designer flow cues, aligned format metadata, and strengthened companion-doc linkage guidance.
---

# Chiron PRD Canonical v1 (Week 6)

Date: 2026-02-18
Status: Canonical PRD for reset + reimplementation

Pending course-correction note (2026-03-14): desktop runtime wording in this PRD still reflects the pre-cutover Tauri posture. It remains temporarily canonical for product scope, but desktop-host implementation details must be re-baselined to Electron after `CC-Foundation` stories complete and runtime parity is verified.

## 1) Executive Summary

### Product Vision

Chiron is a methodology-first orchestration platform for AI-assisted software delivery. It turns BMAD workflows into executable, auditable runs where planning and execution remain synchronized through work units, transitions, and deterministic gates.

Current delivery posture is a desktop application with a client-server architecture. The product scope remains unchanged, but the desktop host is currently under approved migration from Tauri to Electron via `CC-Foundation`; after those stories complete, this PRD must be updated again to reflect the live Electron architecture precisely.

## 2) Primary Outcomes

1. Achieve faster planning-to-implementation flow, with first-run time-to-first-runnable-workflow <= 20 minutes and onboarding completion >= 80% in internal dogfood cohorts.
2. Maintain end-to-end traceability from requirement -> decision -> execution output through append-only transition/gate/execution evidence and queryable lineage.
3. Reduce manual coordination friction during high-velocity delivery by providing deterministic, ordered next-action recommendations with machine-readable reasons for 100% of `start_gate`-eligible transitions in operator mission-control views.
4. Sustain repeatable methodology execution with low user intervention by meeting golden-path evidence gates (G3-G6) before promotion and maintaining stable concurrent runtime behavior.

## 3) User Journeys

1. Trigger: a methodology definition needs to be published. Action: a methodology builder defines versioned work-unit types, transitions, gates, and workflow bindings. Outcome: immutable methodology contracts are published for project use.
2. Trigger: a project needs controlled execution progress. Action: an operator creates a methodology-pinned project and advances work units through deterministic transitions. Outcome: progress is auditable, and gate blocks return actionable diagnostics.
3. Trigger: planning-to-delivery execution must run end to end. Action: an operator runs and monitors the golden-path workflow chain. Outcome: execution evidence is persisted with audit-ready traceability from planning through delivery.

## 3.1) Outcome -> Journey -> FR Mapping (Condensed, Non-Exclusive)

- Outcome 1 (cycle time) -> Journey 3 -> FR2, FR5
- Outcome 2 (traceability) -> Journey 3 -> FR6
- Outcome 3 (coordination friction) -> Journey 2 -> FR3, FR7
- Outcome 4 (repeatability) -> Journeys 1 and 3 -> FR2, FR3, FR4

## 3.2) Designer Flow Cues (Non-Binding)

- Journey 1 (methodology publish): Entry: methodology version draft. Primary interaction: define/update types, transitions, gates, and bindings. Decision and feedback: publish-readiness validation and typed errors. Exit state: immutable published version with audit record.
- Journey 2 (deterministic transition control): Entry: project mission-control context. Primary interaction: select and execute next transition action. Decision and feedback: gate pass/fail reasons with remediation guidance. Exit state: deterministic state advance, or blocked transition with persisted evidence.
- Journey 3 (golden-path execution): Entry: execution launch context for planning-to-delivery chain. Primary interaction: run and monitor workflow timeline. Decision and feedback: runtime stream status, failure diagnostics, and operator controls (retry/approve/cancel). Exit state: persisted outputs/evidence and traceable completion status.

## 4) Core Product Model

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

## 5) Runtime and Backend Stack (Locked)

- Bun + Turborepo
- Hono (HTTP + SSE streaming transport)
- oRPC (typed API)
- Effect (orchestration/services/layers)
- AI SDK + OpenCode SDK (dual runtime)
- SQLite + Drizzle (current horizon)
- Better-Auth

## 6) Frontend Direction (Locked for later implementation)

- Primary font: `Commit Mono`
- Accent/flair font: `Geist Pixel`
- Visual direction: Bloomberg-terminal influence + maximalist curated assets + minimal interaction structure
- Planned additions:
  - work-unit graph views via React Flow
  - power-user keyboard workflows via TanStack Hotkeys

## 6.1) Desktop Application and Platform Rollout Assumptions

### platform_support

- Primary target in current horizon: Linux.
- Secondary target after Linux stabilization and milestone gate evidence: macOS.
- Windows is explicitly deferred until post-MVP and only after Linux + macOS stability evidence is established.

### system_integration

- Desktop client integrates with local project workspaces and local runtime tooling boundaries.
- Client-server boundary remains explicit: desktop UI consumes backend control/query and stream interfaces; orchestration and policy enforcement remain server-side.

### update_strategy

- Current horizon uses controlled release updates aligned to milestone gates.
- Automated update-channel sophistication is deferred until after baseline platform stability.
- Acceptance check (current horizon): release updates are promoted only after gate evidence for the corresponding milestone is recorded and reviewable.

### offline_capabilities

- Local project metadata, artifacts, and previously persisted evidence remain locally accessible.
- Network/provider-dependent runtime operations may be limited while offline and must surface explicit diagnostics.
- Acceptance check (current horizon): when offline, network/provider-dependent operations fail with deterministic, operator-actionable diagnostics and no partial transition-state commit.

## 7) Functional Requirements (Condensed)

1. Operators can create and manage work units, links/dependencies, and transition lifecycle state.
2. Operators can execute BMAD workflows mapped to work units under pinned methodology contracts.
3. The system can evaluate `start_gate` and `completion_gate` deterministically and return actionable diagnostics on failure.
4. The system can execute invoke semantics:
   - `same_work_unit`
   - `child_work_units`
5. Agent steps can run on `chiron` and `opencode` runtimes and stream runtime responses.
6. The system can persist outputs, artifacts, and transition evidence for auditability.
7. Operators can access execution, transition, artifact, and graph/state visibility views.

### FR Verification Anchors (Condensed)

- FR1 verification anchor: create/update/query checks confirm deterministic work-unit, link/dependency, and transition-lifecycle persistence.
- FR2 verification anchor: pinned-methodology workflow execution succeeds for mapped work-unit transitions.
- FR3 verification anchor: repeated equivalent gate evaluations return identical pass/fail results and actionable diagnostics payloads.
- FR4 verification anchor: invoke runs demonstrate `same_work_unit` and `child_work_units` behavior with parent-child lineage evidence.
- FR5 verification anchor: `chiron` and `opencode` agent-step runs both execute and stream runtime responses with persisted run evidence.
- FR6 verification anchor: execution outputs, artifacts, and transition evidence are queryable by stable execution/transition identifiers.
- FR7 verification anchor: operator-facing API/UI views expose execution status, transitions, artifacts, and graph/state with stable references.

Detailed requirement expansions are defined in `_bmad-output/planning-artifacts/epics.md` (FR/NFR/AR inventories and story ACs) and constrained by `_bmad-output/planning-artifacts/architecture.md` (canonical runtime and sequencing policies).

## 8) Non-Functional Requirements (Condensed)

1. Transition and gate outcomes are deterministic and reproducible for equivalent input snapshots. Verification method: deterministic replay checks with equivalent snapshots produce equivalent gate and transition outcomes.
2. Traceability evidence is append-only for transition attempts, gate evaluations, and execution outputs in the current horizon. Verification method: ledger/audit checks confirm append-only behavior and complete lineage references.
3. Runtime supports at least 50 concurrent active workflow executions per workspace with <1% scheduler/contention-caused failures in 24-hour soak runs. Verification method: 24-hour soak testing at target concurrency reports scheduler/contention failure rate below threshold.
4. Runtime feedback latency target is p95 <= 1000 ms and p99 <= 2500 ms under target concurrency. Verification method: runtime stream telemetry reports p95/p99 propagation latency against these thresholds.
5. Local-first development supports reset/rebuild cycles to runnable canonical baseline in <= 10 minutes on standard internal development workstations, with deterministic state restoration through canonical bootstrap paths. Verification method: documented reset/rebuild flow and timing checks restore canonical baseline state with reproducible results within threshold.

Detailed NFR thresholds and verification criteria are defined in `_bmad-output/planning-artifacts/epics.md` and constrained by `_bmad-output/planning-artifacts/architecture.md`.

## 9) Scope Boundaries (Current Horizon)

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

## 10) Delivery Strategy (Week 6 -> Week 10)

1. Lock docs/contracts and archive non-canonical references.
2. Reset scaffold on Better-T-Stack baseline.
3. Deliver Epics 1-2 as foundational capability groundwork (unchanged by this correction).
4. From Epic 3 onward, follow progressive sequencing: Spike -> Vertical Slice -> Hardening -> Scale-out.
5. Require golden-path-first validation from Epic 3 onward before expanding abstraction or coverage.
6. Treat BMAD -> Chiron mapping as baseline and evolve it only through controlled ADR and traceability updates.
7. Continue backend-first implementation slices, then implement frontend against stabilized backend contracts.

Deferred by design: broad abstraction/generalization, advanced versioning/event-sourcing, and non-golden-path scale expansion remain deferred until evidence gates and hardening criteria are satisfied.

## 11) Canonical Companion Docs

Downstream artifacts (epics, stories, implementation plans, and QA assets) should keep direct references to these documents whenever deriving requirements, constraints, acceptance checks, and traceability links.

- `chiron-foundational-docs-lock-v1-week6.md`
- `chiron-module-lock-matrix-v1-week6.md`
- `chiron-complete-schemas-v2-week6.md`
- `bmad-work-unit-catalog-v1-week6.md`
- `bmad-to-chiron-step-config-resolved-v1-week6.md`
