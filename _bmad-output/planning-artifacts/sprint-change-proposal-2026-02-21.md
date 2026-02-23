# Sprint Change Proposal

Date: 2026-02-21
Workflow: correct-course
Mode: Incremental

## 1. Issue Summary

- Trigger: Mid-implementation sequencing problem from Epic 3 onward.
- Problem: Epic 3+ plan is abstraction-heavy and too large, delaying runnable value and primitive discovery.
- Constraint: Keep Epics 1-2 as foundational and intact.
- Requirement: Re-sequence Epic 3+ into capability slices with runnable golden path progression.

## 2. Impact Analysis

### Epic Impact

- Epics 1-2 remain valid and unchanged.
- Existing post-E2 epics require resequencing and reframing by intent.
- Existing broad Epic 3 scope is split into narrower, evidence-driven slices.

### Artifact Impact

- `epics.md`: requires structural update for Epic 3+ names, story intent, and progression gates.
- `prd.md`: requires delivery sequencing/governance refresh (mapping evolution policy and post-E2 DoD policy).
- `architecture.md`: requires epic promotion gate criteria alignment to runtime constraints.
- `sprint-status.yaml`: requires epic/story structure alignment after approval.

### Constraint Preservation (Locked ADRs)

- Minimal namespaced agent tools.
- On-demand context retrieval (no full project-state prompt injection).
- `tooling-engine` as control plane.
- MCP external runtimes + native Chiron runtime.
- One backend process may expose tRPC + SSE + MCP.
- Minimal versioning scope (execution snapshot pinning + append-only evidence).
- Git as checkpoint/portability layer; DB as live orchestration truth.

## 3. Recommended Approach

Use a hybrid correction strategy:

1. Keep MVP and Epics 1-2 unchanged.
2. Replace Epic 3+ abstraction-first decomposition with capability slices:
   - Spike
   - Vertical Slice
   - Hardening
   - Scale-out
3. Gate progression between epics using explicit runnable evidence.
4. Enforce story-level quality policy from Epic 3 onward.

Why this approach:

- Produces runnable value earlier.
- Forces risky primitive proof before broader rollout.
- Reduces rework from premature abstraction.
- Preserves architecture constraints and governance discipline.

## 4. Detailed Change Proposals

### 4.1 Revised Epic Structure (Epic 3 Onward)

Old:

- Epic 3: Workflow Engine Step Kernel (All Step Types + Agent MVP)
- Epic 4: Runtime Safety, Feedback, and Recovery
- Epic 5: Agent Optimization, Provider Governance, and AX Loop
- Epic 6: Operator Experience and Accessibility
- Epic 7: Full Observability and Operational Hardening

New:

- Epic 3: Runtime Primitive Spikes (Intent: Spike)
- Epic 4: Golden Path Slice A - Planning Chain (Intent: Vertical Slice)
- Epic 5: Golden Path Slice B - Solutioning/Delivery Chain (Intent: Vertical Slice)
- Epic 6: Execution Hardening (Intent: Hardening)
- Epic 7: Scale-Out and Coverage Expansion (Intent: Scale-out)

### 4.2 Story Intent Policy (Epic 3+)

- Epic 3 stories must be Spike stories.
- Epic 4-5 stories must be Vertical Slice stories.
- Epic 6 stories must be Hardening stories.
- Epic 7 stories must be Scale-out stories.

### 4.3 Definition of Done Policy (Epic 3+)

Every Epic 3+ story DoD must include:

- Unit/integration tests
- One manual hands-on scenario
- One Playwright scenario

Note: Keep strategy and quality gates now; defer framework scaffolding until epic finalization is complete.

### 4.4 BMAD-to-Chiron Mapping Governance (Epic 3+)

- Mapping is a baseline model, not a frozen contract, from Epic 3 onward.
- Any mapping change requires:
  - ADR update
  - Affected story AC update
  - Traceability refresh

### 4.5 Progression Acceptance Gates

- Gate G3 (Epic 3 -> Epic 4): all spike proofs complete with reproducible evidence:
  - cancellation cascade
  - invoke child completion/lineage
  - idempotent replay boundary
  - SSE reconnect continuity
  - deterministic append-only gate evidence

- Gate G4 (Epic 4 -> Epic 5): runnable planning chain:
  - brainstorming -> research -> product brief -> prd
  - outputs persisted and queryable
  - failure diagnostics actionable

- Gate G5 (Epic 5 -> Epic 6): runnable full golden path:
  - ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review
  - at least one successful run and one intentional failure run with diagnostics

- Gate G6 (Epic 6 -> Epic 7): hardening quality thresholds met:
  - cancel/retry/idempotency/stream recovery validated
  - concurrency behavior within defined bounds
  - deterministic diagnostics payload stability

### 4.6 Golden-Path Milestone Mapping

- Epic 3 (proof stage):
  - brainstorming, research (primitive proof level)

- Epic 4 (production runnable):
  - brainstorming, research, product brief, prd

- Epic 5 (production runnable):
  - ux-design, architecture, create-epics-stories, create-story, dev-story, code-review

- Epic 6:
  - harden full 10-step path under concurrency/failure/retry scenarios

- Epic 7:
  - scale path across additional workflows/modules/providers

## 5. Implementation Handoff

### PM/Architect

- Update epic sequencing and acceptance-gate definitions in planning artifacts.
- Record ADR deltas for mapping and sequencing governance.

### PO/SM

- Re-slice backlog/story ordering to match new Epic 3+ progression.
- Update sprint tracking and dependencies in `sprint-status.yaml`.

### Dev Team

- Implement spike stories first and collect evidence artifacts.
- Deliver vertical slices before broad capability expansion.
- Enforce new DoD requirements for all Epic 3+ stories.

### Success Criteria

- Golden path is runnable by Epic 5.
- Hardening criteria are measurable and satisfied before scale-out.
- Mapping changes remain traceable (ADR + AC + traceability updates).
