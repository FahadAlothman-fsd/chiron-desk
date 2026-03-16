---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
inputDocuments:
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/prd.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/architecture.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/ux-design-specification.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-planning/sprint-change-proposal-2026-02-21.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-layered-requirements-register-v1-week6.md
  - /home/gondilf/Desktop/projects/masters/chiron/_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-week6-doc-finalization-checklist.md
---

# chiron - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for chiron, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Operators can create and manage work units, links/dependencies, and transition lifecycle state.
FR2: Operators can execute BMAD workflows mapped to work units under pinned methodology contracts.
FR3: The system can evaluate `start_gate` and `completion_gate` deterministically and return actionable diagnostics on failure.
FR4: The system can execute invoke semantics (`same_work_unit`, `child_work_units`) with parent-child lineage evidence.
FR5: Agent steps can run on `chiron` and `opencode` runtimes and stream runtime responses.
FR6: The system can persist outputs, artifacts, and transition evidence for auditability.
FR7: Operators can access execution, transition, artifact, and graph/state visibility views.

### NonFunctional Requirements

NFR1: Transition and gate outcomes are deterministic and reproducible for equivalent input snapshots.
NFR2: Traceability evidence is append-only for transition attempts, gate evaluations, and execution outputs in the current horizon.
NFR3: Runtime supports at least 50 concurrent active workflow executions per workspace with <1% scheduler/contention-caused failures in 24-hour soak runs.
NFR4: Runtime feedback latency target is p95 <= 1000 ms and p99 <= 2500 ms under target concurrency.
NFR5: Local-first development supports reset/rebuild cycles to runnable canonical baseline in <= 10 minutes on standard internal workstations with deterministic state restoration.

### Additional Requirements

- Keep Epics 1-2 intact as foundational; redesign Epic 3+ only.
- Insert `CC-Foundation` as a prerequisite cutover epic before Epic 3 execution.
- Epic 3+ sequencing must follow: Spike -> Vertical Slice -> Hardening -> Scale-out.
- `/bmad-tea-testarch-framework` initialization occurs after Electron cutover and web+desktop+server smoke parity, not before migration.
- Story intent policy must be explicit: Epic 3 stories are Spike, Epics 4-5 are Vertical Slice, Epic 6 is Hardening, Epic 7 is Scale-out.
- Golden-path-first implementation must map across this ordered chain: brainstorming -> research -> product brief -> prd -> ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review.
- Progression gates are mandatory between phases: G3 (Spike->Slice A), G4 (Slice A->Slice B), G5 (Slice B->Hardening), G6 (Hardening->Scale-out).
- Gate G3 evidence must prove: cancellation cascade, invoke child completion/lineage, idempotent replay boundary, SSE reconnect continuity, deterministic append-only gate evidence.
- Gate G4 evidence must prove runnable planning chain with persisted/queryable outputs and actionable failure diagnostics.
- Gate G5 evidence must prove runnable full golden path with at least one success run and one intentional failure run with diagnostics.
- Gate G6 evidence must prove hardening thresholds for cancel/retry/idempotency/stream recovery, bounded concurrency behavior, and deterministic diagnostics payload stability.
- Agent-step tool surface must remain minimal and namespaced only: `chiron_context.list`, `chiron_context.get`, `chiron_context.get_many`, `chiron_context.search`, `chiron_actions.list_available`, `chiron_action.execute`.
- Context retrieval must be on-demand only; full project-state prompt injection is disallowed.
- `tooling-engine` must remain the single control plane for tool availability, policy checks, approvals, and execution authorization.
- Interface split is mandatory: MCP for external runtimes, native interface for `chiron` runtime, with one canonical internal tool contract.
- One backend process may expose oRPC control/query, SSE runtime streams, and MCP endpoint interfaces.
- Minimal versioning strategy applies now: execution-start snapshot pinning plus append-only transition/gate evidence and step attempt/revision persistence.
- Git is for checkpoint snapshots and portability; DB is the authoritative source for live orchestration/runtime state.
- Invoke contracts must remain explicit: parent->child inputs (`topic`, `goals`, `constraints`, optional `scope`, `originWorkUnitRef`) and child->parent outputs (`elicitation_summary`, `technique_results`, `decision_notes`, `recommendations`, `evidenceRefs`).
- Epic 3+ DoD policy must be embedded in stories: unit/integration test coverage, one manual hands-on scenario, one Playwright scenario, and deterministic evidence/diagnostic persistence checks.
- BMAD->Chiron mapping is baseline and may evolve only with governance: ADR update + affected story AC update + traceability refresh.
- Runtime boundary constraints are locked: only six step capabilities (`form`, `agent`, `action`, `invoke`, `branch`, `display`) and only two gate classes (`start_gate`, `completion_gate`).
- Work-unit state model is `n + 1`: `n` methodology-defined states plus reserved `__absent__` (non-existence) pseudo-state.
- Activation transitions are one-way from `__absent__` to a methodology-defined initial state and may vary by work unit.
- Transitions from any defined state back to `__absent__` are disallowed in current scope (no delete/deactivate lifecycle flow in this horizon).
- Activation uses the same transition semantics as progress transitions (`start_gate`/`completion_gate` plus transition-bound workflow authority); no separate gate class is introduced.
- Workflow binding remains scoped by `methodologyVersion + workUnitType` with transition-allowed workflow authority.
- Stack and persistence constraints for this horizon remain locked: Bun, Hono, oRPC, Effect, dual AI runtimes, Better-Auth, Drizzle, SQLite-only DB.
- Effect is not optional library usage; it is the runtime architecture posture for orchestration, service composition, and failure semantics across all implementation epics.
- Epics 1-2 backend stories must use baseline Effect constraints in AC/DoD: Tag plus Live/Test Layer service boundaries, typed TaggedError channels, and deterministic diagnostics persistence.
- Epic 3+ stories must additionally encode advanced Effect runtime constraints in AC/DoD: structured concurrency (`Fiber`/`Scope`), Supervisor coverage for long-running child-fiber orchestration, and deterministic testability (Layer substitution plus `TestClock` where applicable).
- Desktop posture constraints apply: Linux primary target, macOS secondary post-stabilization; Windows deferred post-MVP.
- Offline behavior must provide deterministic actionable diagnostics for network/provider-dependent operations with no partial transition-state commit.
- UX requirements affecting implementation include responsive desktop behavior, accessibility compliance targets, and status communication not dependent on color alone.
- Structured diagnostics must be persisted and queryable with requirement-linked evidence, including machine-readable remediation guidance.
- Methodology repin is locked for projects with persisted execution history to preserve execution/version consistency.
- Controlled version migration for projects with execution history is deferred to Epic 7 as an explicit migration workflow (not ad-hoc repin).

### FR Coverage Map

FR1: Epic 1 (foundational work-unit and transition baseline), expanded in Epic 7 (scale-out coverage).
FR2: Epic 2 (foundational execution baseline), expanded in Epics 4-5 (golden-path runnable chains) and Epic 7.
FR3: Epic 3 (deterministic gate primitives), validated through Epics 4-6 and preserved in Epic 7.
FR4: Epic 3 (invoke and lineage primitives), expanded in Epics 4-5 and hardening in Epic 6.
FR5: Epic 3 (dual-runtime primitive proof), expanded in Epics 4-5 and hardened in Epic 6.
FR6: Epic 2 (baseline persistence), deepened in Epics 3-6 for append-only evidence and diagnostic persistence.
FR7: Epic 2 (baseline operator visibility), expanded in Epics 4-7 for end-to-end operability.

### ADR and Governance Traceability (Epic 3+)

- Locked ADR constraints preserved across Epic 3-7: minimal namespaced tools, on-demand context retrieval, tooling-engine control plane, MCP/native interface split with one canonical internal tool contract, one backend process option for oRPC + SSE + MCP, minimal versioning scope, and DB live-state authority with Git checkpoints.
- Any BMAD->Chiron mapping change in Epic 3+ requires all three updates in the same change-set: ADR delta, affected story acceptance criteria update, and planning traceability refresh.
- Story-level traceability in Epic 3+ must include requirement IDs (FR/NFR), gate evidence refs (G3/G4/G5/G6 where applicable), and diagnostics evidence refs.

## Epic List

### Epic 1: Foundational Runtime and Contract Baseline (Unchanged)

Operators can define and manage work units, links/dependencies, and transition lifecycle on a stable pinned methodology/runtime baseline.

**Intent tag:** Foundation (unchanged)
**FRs covered:** FR1, FR2 (baseline), FR6 (baseline)

### Epic 2: Operator Workbench and Execution Visibility Baseline (Unchanged)

Operators can execute core flows and inspect execution, transition, and artifact state with actionable baseline visibility.

**Intent tag:** Foundation (unchanged)
**FRs covered:** FR2 (operational baseline), FR6, FR7

### CC-Foundation: Electron Cutover and Runtime Parity

Teams replace Tauri with Electron, preserve the shared renderer/server architecture, and establish stable web + desktop + server parity before Epic 3 runtime work begins.

**Intent tag:** Foundation Prerequisite
**FRs covered:** FR2 (delivery/runtime baseline), FR5 (desktop host baseline), FR7 (operator-visible parity)
**Scope guardrails:**
- Immediate Tauri removal from the active code path.
- `apps/web` remains the single renderer source.
- `apps/desktop` is shell-only (Electron main/preload/IPC).
- `apps/server` remains the shared backend runtime host.
- `core` remains thin orchestration only; no monolithic refactor is allowed in this epic.
- `/bmad-tea-testarch-framework` begins only after migration parity gates pass.

### Story CCF.1: Remove Tauri Surface From Active Code Paths

As a platform engineer,
I want to remove Tauri from active scripts, dependencies, and shell artifacts,
So that Electron becomes the single supported desktop host baseline.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `tauri-removal-diff-log`, `desktop-script-surface-log`, `desktop-dependency-cleanup-log`
- `diagnosticRefs`: `desktop-script-regression-diagnostics`, `desktop-shell-removal-diagnostics`

**Acceptance Criteria:**

**Given** the current repository still contains Tauri shell wiring
**When** CC-Foundation cutover begins
**Then** `apps/web/src-tauri/**` is removed from the active codebase
**And** Tauri-specific scripts and dependencies are removed from supported package surfaces.

**Given** desktop-related root and package scripts are inspected after cutover
**When** a contributor reviews available commands
**Then** no active command path references Tauri
**And** Electron is the only supported desktop host path.

**Given** archived or historical documentation still mentions Tauri
**When** implementation reads current runtime instructions
**Then** active guidance points to Electron-only desktop flow
**And** stale Tauri instructions are not presented as valid current execution paths.

### Story CCF.2: Add Thin Electron Shell With Secure Runtime Boundaries

As a platform engineer,
I want a thin Electron shell with secure preload boundaries,
So that desktop hosting is available without rewriting renderer or backend architecture.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `electron-shell-bootstrap-log`, `preload-boundary-log`, `desktop-runtime-model-log`
- `diagnosticRefs`: `electron-bootstrap-diagnostics`, `preload-bridge-diagnostics`, `desktop-security-baseline-diagnostics`

**Acceptance Criteria:**

**Given** `apps/desktop` is introduced as the desktop host
**When** the Electron shell boots
**Then** it hosts the existing renderer rather than duplicating UI logic
**And** `apps/web` remains the single renderer source of truth.

**Given** Electron window configuration is created
**When** desktop runtime defaults are applied
**Then** `contextIsolation` is enabled
**And** `nodeIntegration` is disabled
**And** renderer access to machine operations is only through explicit preload APIs.

**Given** the current modular architecture includes `contracts`, domain engines, and transport packages
**When** the Electron shell is added
**Then** no domain package is moved into a desktop-specific layer
**And** shell-specific code remains isolated to `apps/desktop`.

### Story CCF.3: Reconcile Runtime Parity Evidence And Defer Packaging Polish

As a release owner,
I want runtime parity evidence reconciled into one explicit checkpoint,
So that Epic 3 starts from confirmed parity while distro and release polish stay deferred.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `desktop-dev-parity-log`, `desktop-packaged-parity-log`, `web-desktop-server-smoke-log`, `runtime-bridge-proof-log`, `desktop-self-bootstrap-proof-log`
- `diagnosticRefs`: `desktop-startup-diagnostics`, `server-bootstrap-diagnostics`, `renderer-parity-diagnostics`, `deferred-packaging-polish-log`

**Acceptance Criteria:**

**Given** `CCF.2` and its approved follow-up work already implemented the Electron shell, self-bootstrap flow, packaged runtime bridge, and packaged server launch path
**When** parity readiness is reviewed
**Then** the story records the existing evidence proving deterministic web, desktop, and server runtime behavior
**And** no new runtime-parity engineering scope is invented in this story.

**Given** packaged desktop work is already functionally proven enough to unblock the next phase
**When** packaging follow-up is reviewed
**Then** remaining distro/install/release polish is explicitly deferred to a later cleanup, hardening, or release epic after the core Chiron feature epics are complete
**And** that deferred scope is not treated as a blocker for `CCF.4`.

**Given** Epic 3 readiness depends on post-cutover verification clarity
**When** this checkpoint story is closed
**Then** `CCF.4` is unblocked as the next active foundation story
**And** parity evidence references and deferred packaging notes are explicit enough that downstream work does not need to reverse-engineer the current state.

### Story CCF.4: Initialize Test Foundation After Electron Cutover

As a test architect,
I want the test architecture framework initialized only after Electron cutover parity is real,
So that automation targets the actual repo structure instead of a speculative one.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `post-cutover-testarch-init-log`, `desktop-smoke-framework-log`, `playwright-mcp-desktop-proof-log`
- `diagnosticRefs`: `testarch-bootstrap-diagnostics`, `desktop-smoke-failure-diagnostics`, `playwright-mcp-diagnostics`

**Acceptance Criteria:**

**Given** Electron cutover and runtime parity evidence are complete
**When** `/bmad-tea-testarch-framework` is initialized
**Then** it targets the real post-cutover repository structure
**And** no Tauri-specific assumptions remain in test architecture setup.

**Given** desktop runtime is available after cutover
**When** Playwright MCP validation is executed
**Then** agents can navigate and interact with the Electron-hosted application through the real desktop runtime path
**And** that interaction is recorded as gate evidence for downstream work.

**Given** baseline framework smoke checks run
**When** web, desktop, and server surfaces are exercised
**Then** the framework establishes a reusable post-cutover verification baseline for Epic 3 and later epics.

### Story CCF.5: Lock Thin Core Boundaries Before Epic 3

As an architect,
I want the thin-core boundaries explicitly locked before Epic 3 starts,
So that runtime and delivery work cannot drift into a monolithic orchestration layer.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-02`, `ADR-EF-03`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`
- `diagnosticRefs`: `boundary-violation-diagnostics`, `package-ownership-diagnostics`

**Acceptance Criteria:**

**Given** Chiron already contains dedicated packages such as `workflow-engine`, `methodology-engine`, `project-context`, and `contracts`
**When** the course correction is finalized
**Then** `core` is defined only as thin orchestration/use-case coordination
**And** domain rules remain in domain packages
**And** shared contracts remain in `packages/contracts`.

**Given** package responsibilities are reviewed before Epic 3
**When** the architecture boundaries are documented
**Then** `core` is allowed to contain orchestration, ports/interfaces, and app-level policy composition only
**And** `core` is explicitly forbidden from absorbing DB/filesystem/process adapters, Electron host code, Hono transport handlers, or React/TanStack UI code.

**Given** Epic 3 dependencies are evaluated
**When** promotion past CC-Foundation is considered
**Then** Epic 3 cannot start unless thin-core boundaries are explicitly locked and referenced in planning artifacts.

**Epic 3 gate lock (CCF.5 prerequisite evidence):**

- Epic 3 start is blocked until Story CCF.5 is complete and current.
- Required evidence for promotion: `core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`.
- Sequencing requirement: CCF.6 remains next and must preserve the CCF.5 lock semantics during planning re-baseline.

### Story CCF.6: Re-Baseline Canonical Planning Artifacts After Electron Cutover

As a planning owner,
I want the canonical BMAD planning artifacts re-baselined after Electron cutover is proven,
So that Epic 3 and later work build on the real post-cutover architecture instead of temporary correction notes.

**Story Metadata:**

- `intentTag`: `Foundation Prerequisite`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G2.5`
- `evidenceRefs`: `planning-rebaseline-log`, `prd-rebaseline-log`, `architecture-rebaseline-log`, `command-surface-rebaseline-log`
- `diagnosticRefs`: `planning-drift-diagnostics`, `canonical-doc-alignment-diagnostics`

**Acceptance Criteria:**

**Given** Electron cutover and runtime parity have been validated
**When** canonical planning artifacts are re-baselined
**Then** `/_bmad-output/planning-artifacts/prd.md` reflects Electron as the approved desktop host
**And** `/_bmad-output/planning-artifacts/architecture.md` reflects the real post-cutover runtime structure.

**Given** temporary pending course-correction notes were added during migration planning
**When** re-baseline is complete
**Then** those temporary notes are removed or replaced with final canonical wording
**And** active run/dev/build command references match the real supported repo flows.

**Given** the final post-cutover structure includes `apps/web`, `apps/desktop`, `apps/server`, thin `core`, and `packages/contracts`
**When** Epic 3 readiness is reviewed
**Then** canonical planning artifacts record those boundaries explicitly
**And** downstream epics no longer depend on temporary correction context to understand the architecture.

### CC-Foundation Retrospective

Run a structured retrospective immediately after `CCF.6` completes and before Epic 3 begins.

**Purpose:** confirm the Electron cutover actually improved the delivery footing, capture migration pain while fresh, and record any guardrails or follow-up fixes needed before runtime work expands.

**Exit requirements:**
- Document what slowed the cutover down, what accelerated it, and what should be repeated.
- Capture any remaining Electron/runtime risks that are acceptable to carry into Epic 3.
- Confirm web + desktop + server parity still holds at the time of retrospective.
- Record whether thin-core boundaries held in practice or need tightening.

### Epic 3: Runtime Primitive Spikes

Teams prove critical runtime primitives with reproducible evidence before production slice expansion.

**Intent tag:** Spike
**FRs covered:** FR3, FR4, FR5 (primitive level), FR6 (evidence persistence)

### Epic 4: Golden Path Slice A - Planning Chain

Operators can run a production-runnable planning chain: brainstorming -> research -> product brief -> prd.

**Intent tag:** Vertical Slice
**FRs covered:** FR2, FR3, FR4, FR5, FR6, FR7

### Epic 5: Golden Path Slice B - Solutioning/Delivery Chain

Operators can run a production-runnable solutioning/delivery chain: ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review.

**Intent tag:** Vertical Slice
**FRs covered:** FR2, FR3, FR4, FR5, FR6, FR7

### Epic 6: Execution Hardening

Teams validate reliability and determinism for the full 10-step golden path under retry/failure/reconnect/concurrency stress.

**Intent tag:** Hardening
**FRs covered:** FR3, FR4, FR5, FR6, FR7
**Primary NFR focus:** NFR1, NFR2, NFR3, NFR4, NFR5

### Epic 7: Scale-Out and Coverage Expansion

Teams expand validated runtime patterns across additional workflows/modules/providers while preserving deterministic controls and evidence contracts.

**Intent tag:** Scale-out
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7
**Expansion note:** include a controlled project version-migration workflow for execution-bearing projects (evidence-backed alternative to direct repin).

### Progression Acceptance Gates (Epic 3+)

- G2.5 (CC-Foundation -> Epic 3): Tauri removed from active path, Electron desktop runs in dev and packaged modes, web + desktop + server smoke parity passes, Playwright MCP desktop interaction smoke passes, `/bmad-tea-testarch-framework` is ready to initialize against the real post-cutover structure, and CCF.5 thin-core boundary lock evidence is complete (`core-boundary-decision-log`, `package-responsibility-map`, `epic3-prerequisite-architecture-log`).
- G3 (Epic 3 -> Epic 4): Spike proofs complete with reproducible evidence for cancellation cascade, invoke child completion/lineage, idempotent replay boundary, SSE reconnect continuity, and deterministic append-only gate evidence.
- G4 (Epic 4 -> Epic 5): Planning chain runnable end-to-end (brainstorming -> research -> product brief -> prd) with persisted/queryable outputs and actionable diagnostics.
- G5 (Epic 5 -> Epic 6): Full golden path runnable with at least one success run and one intentional failure run with diagnostics.
- G6 (Epic 6 -> Epic 7): Hardening thresholds met for cancel/retry/idempotency/stream recovery, bounded concurrency behavior, and deterministic diagnostics payload stability.

### Golden-Path Milestone Mapping to Epics

- CC-Foundation milestone: Electron cutover complete with stable parity across web, desktop, and server.
- Epic 3 milestone: primitive proof for brainstorming and research execution semantics.
- Epic 4 milestone: runnable planning chain (brainstorming -> research -> product brief -> prd).
- Epic 5 milestone: runnable solutioning/delivery chain (ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review).
- Epic 6 milestone: harden full 10-step path under failure/retry/reconnect/concurrency scenarios.
- Epic 7 milestone: expand hardened model across additional workflows/modules/providers.

### Effect Baseline Contract (Epics 1-2)

- ADR-EF-B01 (Service Boundaries): Epic 1-2 backend stories MUST implement orchestration and policy logic as Effect services with Tag interfaces and Live/Test Layers.
- ADR-EF-B02 (Typed Failure Semantics): Epic 1-2 backend stories MUST use typed `TaggedError` channels and persist deterministic diagnostics for validation, publish, and pinning policy outcomes.
- ADR-EF-B03 (Implementation Discipline): Epic 1-2 core backend control flows MUST avoid ad-hoc promise-chain orchestration in favor of Effect composition and testable Layer wiring.

### Epic 1-2 Story AC Addendum (Mandatory for backend stories)

For each Epic 1-2 story that introduces backend logic, acceptance criteria MUST require:

- Effect service-layer compliance (`Tag` + Live/Test `Layer` boundaries).
- Typed `TaggedError` usage for failure paths surfaced to diagnostics.
- Deterministic persistence of evidence and diagnostics relevant to the story scope.

### Effect Architecture Execution Contract (Epic 3+)

- ADR-EF-01 (Execution Model): Epic 3+ orchestration logic MUST use Effect structured concurrency (`Fiber`, `Scope`) for lifecycle control, interruption safety, and cancellation propagation.
- ADR-EF-02 (Service Boundaries): Epic 3+ orchestration services MUST expose Tag interfaces with Live/Test Layer implementations; cross-module runtime calls MUST go through interfaces.
- ADR-EF-03 (Typed Failures + Diagnostics): Runtime failure paths MUST use typed `TaggedError` channels and persist deterministic diagnostics linked to FR/NFR IDs, gate IDs, and evidence references.
- ADR-EF-04 (Deterministic Runtime Testing): Time/retry/timeout behavior MUST be verified with Effect deterministic harnesses (Layer substitution plus `TestClock` where applicable), including cancellation, interrupt, and retry assertions.
- ADR-EF-05 (Supervisor Usage): `Supervisor` is REQUIRED when stories spawn or track long-running child fibers (for observability, controlled shutdown, deterministic evidence capture); optional for trivial single-fiber paths.
- ADR-EF-06 (Dual-Rail Verification): Every Epic 3+ story MUST include: (1) Effect rail with deterministic unit/integration runtime checks, and (2) Playwright rail with end-to-end operator-visible behavior plus persisted evidence validation. Both rails MUST reference the same story intent and acceptance outcomes.

### Epic 3+ Story AC Addendum (Mandatory)

For each Epic 3+ story, acceptance criteria MUST require:

- Effect architecture compliance: `Tag` plus `Layer` service boundaries, typed `TaggedError` channels, and scoped lifecycle handling (`Fiber`/`Scope`).
- Structured concurrency checks: cancellation propagation, retry/idempotency behavior, plus `Supervisor` assertions when long-running child-fiber orchestration exists.
- Deterministic evidence persistence checks: append-only gate/transition evidence plus diagnostics payload with actionable remediation fields.
- One manual hands-on scenario.
- One Playwright scenario aligned to the same FR/gate outcomes validated by Effect tests.

### Epic 3+ Story Traceability Metadata (Mandatory)

Each Epic 3+ story MUST include a traceability metadata block containing:

- `intentTag`: one of `Spike | Vertical Slice | Hardening | Scale-out`.
- `frRefs`: list of covered FR IDs.
- `nfrRefs`: list of covered NFR IDs.
- `adrRefs`: list of applicable ADR IDs (including ADR-EF-* where relevant).
- `gateRefs`: list of applicable phase gates (`G3`, `G4`, `G5`, `G6`) for evidence and promotion.
- `evidenceRefs`: deterministic evidence artifact identifiers or paths.
- `diagnosticRefs`: persisted diagnostic artifact identifiers or paths for failure-path validation.

### Gate Promotion Consistency Rule (Epic 3+)

- A phase promotion decision MUST reference story-level `gateRefs`, `evidenceRefs`, and `diagnosticRefs`.
- A gate cannot pass on narrative summary alone; it requires persisted, queryable evidence tied to the story metadata block.
- If BMAD->Chiron mapping changes, affected stories MUST update `adrRefs`, acceptance criteria text, and FR/NFR refs in the same revision.

## Epic 1: Foundational Runtime and Contract Baseline (Unchanged)

Establish a stable methodology contract baseline so projects can execute against pinned, deterministic versions before runtime scale and hardening work.

### Story 1.1: Create Methodology Draft Baseline

As an operator,
I want to create and validate a methodology draft contract,
So that I can safely publish a deterministic methodology version.

**Acceptance Criteria:**

**Given** no existing methodology for a target key
**When** I create a methodology draft with required contract fields (`methodologyKey`, `displayName`, `workUnitTypes[]`, `transitions[]`, and `allowedWorkflowsByTransition`)
**Then** the draft is persisted in non-executable state
**And** the system reports draft validation readiness.

**Given** an invalid methodology draft payload
**When** I attempt to save the draft
**Then** the save is rejected with structured validation diagnostics
**And** no partial invalid draft state is committed.

**Given** a saved methodology draft
**When** I request draft validation details
**Then** I receive deterministic validation outcomes for equivalent inputs
**And** diagnostics are actionable for completion before publish.

**Given** a methodology draft update
**When** the change is committed
**Then** append-only draft evidence is recorded (timestamp, actor, changed fields)
**And** lineage remains queryable for audit.

### Story 1.2: Define Work Unit Types and Transition Lifecycle Rules in Methodology Draft

As an operator,
I want to define work unit types and transition lifecycle rules in a methodology draft,
So that published methodology versions provide valid deterministic execution contracts.

**Acceptance Criteria:**

**Given** an existing methodology draft
**When** I define or update a work unit type with lifecycle states and transition definitions
**Then** the draft contract is persisted in draft scope
**And** the lifecycle contract is queryable for draft validation.

**Given** a work unit type definition in methodology draft
**When** I configure cardinality policy
**Then** cardinality must be one of (`one_per_project`, `many_per_project`)
**And** the policy is persisted for activation-time gate evaluation and operator action derivation.

**Given** an existing methodology draft work unit type
**When** I define or update work-unit fact schema entries
**Then** fact schema is persisted with static typed fields (`string`, `number`, `boolean`, `json`) plus `required` and optional `default`
**And** Facts v1 explicitly disallows references or derived expressions.

**Given** an existing methodology draft
**When** I define dependency link policies for planning work units
**Then** dependency type definitions include `linkTypeKey=planning_input` with semantic meaning and strength behavior (`hard`, `soft`, `context`)
**And** dependency types remain target-neutral while transition gate requirements bind concrete `requiredLinks` selectors per transition attempt.

**Given** a lifecycle definition with duplicate state IDs, undefined state references, or duplicate transition keys
**When** I save the draft lifecycle definition
**Then** the system rejects it deterministically
**And** returns structured diagnostics without partial draft mutation.

**Given** a work unit type has invalid cardinality policy value
**When** I save the methodology draft
**Then** the system rejects the save deterministically
**And** diagnostics identify the invalid cardinality configuration.

**Given** a fact schema contains duplicate keys, unsupported types, invalid defaults, or reserved-key collisions
**When** I save the methodology draft
**Then** the system rejects the save deterministically
**And** diagnostics identify failing fact schema fields without partial draft mutation.

**Given** dependency requirements use undefined link types or disallowed strengths
**When** I save the methodology draft
**Then** the system rejects dependency policy configuration deterministically
**And** diagnostics identify invalid `linkTypeKey` or `strength` values.

**Given** a transition definition in the methodology draft
**When** I configure gate classes for that transition
**Then** only `start_gate` and `completion_gate` are accepted
**And** any other gate class is rejected with actionable diagnostics.

**Given** a transition definition in the methodology draft
**When** I define lifecycle edges involving the reserved `__absent__` pseudo-state
**Then** only one-way activation edges from `__absent__` to methodology-defined states are accepted
**And** any edge from a defined state back to `__absent__` is rejected with deterministic diagnostics.

**Given** a valid draft lifecycle contract
**When** I request transition eligibility metadata for a work unit type
**Then** I receive deterministic transition definitions and guard metadata
**And** output is stable for equivalent draft inputs.

**Given** a saved draft lifecycle change
**When** I request change evidence
**Then** append-only evidence is available for draft and publish lineage
**And** evidence remains queryable for audit.

### Story 1.3: Define Workflows Under Work Unit Scope and Bind Executable Subset to Transitions

As an operator,
I want to define workflows under a work unit type and bind only selected workflows to transitions,
So that methodology versions can include reusable draft workflows while execution remains policy-controlled.

**Acceptance Criteria:**

**Given** a methodology draft with a defined work unit type
**When** I create workflow definitions for that work unit type
**Then** workflows are persisted in draft scope independent of transition bindings
**And** unbound workflows are stored in the methodology draft catalog but not marked transition-eligible.

**Given** a workflow definition with unsupported step types
**When** I save the workflow draft
**Then** the system rejects the save deterministically
**And** diagnostics identify invalid step types and accepted set (`form`, `agent`, `action`, `invoke`, `branch`, `display`).

**Given** one or more workflows defined under a work unit type
**When** I bind a selected subset of those workflows to a specific transition
**Then** only bound workflows are marked transition-eligible
**And** unbound workflows remain in the methodology draft catalog but are not offered as executable options for that transition.

**Given** a transition has multiple bound workflows
**When** an operator initiates that transition after gate checks pass
**Then** the system presents the eligible workflow list for explicit selection
**And** only the operator-selected workflow instance is executed.

**Given** a transition with no bound workflows
**When** transition eligibility is evaluated
**Then** execution is blocked deterministically
**And** actionable diagnostics indicate missing workflow bindings.

**Given** workflow definition or binding changes in draft scope
**When** the changes are committed
**Then** append-only evidence is recorded for definition and binding mutations
**And** lineage remains queryable for publish-time audit.

### Story 1.4: Publish Validated Methodology Draft as Immutable Version

As an operator,
I want to publish a validated methodology draft as an immutable version,
So that projects can pin to a deterministic execution contract.

**Acceptance Criteria:**

**Given** a methodology draft with required contract elements completed (work unit types, transitions, work-unit fact schemas, transition workflow bindings, and workflow step-type validity)
**When** I publish the draft as version `Vn`
**Then** the system creates an immutable snapshot of the full methodology contract
**And** the snapshot is queryable by `methodologyVersion + workUnitType`.

**Given** publish validation executes for a methodology draft
**When** work-unit fact schemas are evaluated
**Then** Facts v1 constraints are enforced (static typed fields, unique keys, valid defaults, no refs/derived expressions)
**And** publish is blocked with deterministic diagnostics if any fact schema fails validation.

**Given** a draft with publish-blocking validation failures
**When** I attempt publish
**Then** publish is rejected deterministically
**And** actionable diagnostics identify blocking fields and rules
**And** no partial version state is committed.

**Given** a published version `Vn`
**When** I attempt to modify contract-defining fields for `Vn`
**Then** the system rejects mutation attempts
**And** reports immutable-version constraints with structured diagnostics.

**Given** a successful publish event
**When** I request publication evidence
**Then** append-only evidence includes actor, timestamp, sourceDraftRef, publishedVersion, and validation summary
**And** evidence remains queryable for audit and traceability.

**Given** equivalent publish input and validation context
**When** publish validation is executed repeatedly
**Then** outcomes are deterministic
**And** diagnostic payload structure is stable for equivalent failures.

### Story 1.5: Pin Project to Published Methodology Version and Preserve Pin Lineage

As an operator,
I want to pin a project to a published methodology version,
So that project execution remains stable until I explicitly repin.

**Acceptance Criteria:**

**Given** published methodology versions exist (`V1`, `V2`, ...)
**When** I pin a project to version `V1`
**Then** project execution contract resolution uses `V1`
**And** transition/workflow eligibility checks resolve only against the pinned version.

**Given** a project pinned to `V1`
**When** version `V2` is published
**Then** the project remains pinned to `V1`
**And** no implicit repin occurs.

**Given** a project pinned to `V1` and no project executions exist
**When** I explicitly repin to `V2`
**Then** subsequent execution uses `V2` contract resolution
**And** repin evidence is appended with actor, timestamp, previousVersion, and newVersion.

**Given** a project has one or more persisted executions
**When** I attempt to repin methodology version
**Then** repin is blocked deterministically to preserve execution/version consistency
**And** diagnostics explain that migration workflow support is provided in later epic scope.

**Given** a repin request to a non-existent or incompatible version
**When** the request is processed
**Then** the system rejects the request deterministically
**And** returns actionable diagnostics without partial pin-state mutation.

**Given** a project with pin history
**When** I query pin lineage
**Then** I receive append-only pin events in chronological order
**And** each event is traceable for audit.

## Epic 2: Operator Workbench and Execution Visibility Baseline (Unchanged)

Deliver a frontend-first operator workbench for methodology and project setup using the Epic 1 backend contract spine, while keeping workflow execution itself deferred to Epic 3+.

### Story 2.1: Establish Methodology Catalog, Details, and Version Entry Foundation

As an operator,
I want to browse and create methodologies, then navigate into methodology versions and draft entry points,
So that I can reliably reach the correct version workspace without using raw API calls.

**Acceptance Criteria:**

**Given** I open the methodologies page in Epic 2
**When** the page loads
**Then** I can view a deterministic list of available methodologies with basic state summary
**And** I can open a selected methodology details view from that list.

**Given** I am on the methodologies page
**When** I create a new methodology
**Then** the methodology is persisted through Epic 1 backend endpoints
**And** it appears in the list deterministically after refresh.

**Given** I open a methodology details view
**When** details are rendered
**Then** I can view methodology metadata and available versions
**And** I can navigate from details to version-specific draft entry.

**Given** I am viewing methodology versions for a methodology
**When** I create a draft version or open an existing draft
**Then** the UI persists the draft-version action through Epic 1 backend endpoints
**And** routes me to the methodology version workspace.

**Given** I navigate between methodologies, details, versions, and workspace entry points
**When** I use links, breadcrumbs, or back navigation
**Then** navigation remains deterministic and keyboard-accessible
**And** selected methodology and version context is preserved across route transitions.

**Given** methodology and version setup capabilities are visible in Epic 2 foundation views
**When** I inspect available execution actions
**Then** runtime execution controls remain visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`)
**And** the foundation flow focuses on setup and workspace entry, not runtime execution.

### Story 2.2: Build Methodology Version Workspace Baseline with React Flow Authoring

As an operator,
I want a version workspace to edit methodology contracts with React Flow-assisted authoring,
So that I can configure work units, facts, transitions, workflows, and bindings in one deterministic UI.

**Acceptance Criteria:**

**Given** I open a methodology draft version workspace from Story 2.1 navigation
**When** the workspace loads
**Then** I can view and edit core draft fields (`methodologyKey`, `displayName`, work unit definitions, work-unit fact schemas, transitions, workflow definitions, and steps)
**And** the current version status is shown as draft (non-executable).

**Given** I edit work units, transitions, workflows, steps, or transition-workflow bindings in the workspace
**When** I save changes
**Then** changes are persisted through Epic 1 backend contracts
**And** saved state reloads deterministically on refresh.

**Given** a methodology draft is loaded in the React Flow workspace
**When** I inspect graph context
**Then** I can view work unit nodes, transition edges, and workflow relationships with binding state
**And** graph state reflects persisted backend data deterministically.

**Given** workflows exist under a work unit but are not bound to a transition
**When** I inspect that transition in the workspace graph
**Then** unbound workflows remain visible in catalog context
**And** only bound workflows are shown as transition-eligible options for that transition.

**Given** I edit work-unit fact schemas and transition actions in the workspace
**When** I save or inspect action controls in Epic 2
**Then** Facts v1 constraints are enforced with actionable diagnostics and execution controls stay visible-but-disabled
**And** runtime actions include rationale (`Workflow runtime execution unlocks in Epic 3+`) while authoring remains fully usable.

### Story 2.3: Harden Validation, Publish, and Evidence UX for Methodology Contracts

As an operator,
I want a hardened validation and publish flow with evidence visibility on top of the version workspace baseline,
So that I can safely publish methodology versions and verify audit outcomes from the UI.

**Acceptance Criteria:**

**Given** a methodology draft in the Story 2.2 workspace has unresolved blocking diagnostics
**When** I attempt to publish from the UI
**Then** publish is blocked with actionable diagnostic details grouped by scope (field, work unit, transition, workflow)
**And** blocking items are linked back to editable UI context.

**Given** a methodology draft is valid for publish
**When** I publish version `Vn` from the UI
**Then** the UI returns immutable publish results with version metadata and validation summary
**And** the draft is represented as published/immutable in the workspace state.

**Given** a methodology version has been published
**When** I open publish evidence details
**Then** I can view append-only evidence fields (actor, timestamp, sourceDraftRef, publishedVersion, validation outcome)
**And** evidence records are queryable and ordered deterministically.

**Given** a user attempts to edit immutable contract fields for a published version
**When** the edit action is submitted from the UI
**Then** the backend rejects the mutation deterministically
**And** the UI renders immutable-version diagnostics without corrupting local state.

**Given** transition actions are displayed in methodology context after publish
**When** I inspect available controls in Epic 2
**Then** runtime execution controls remain visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`)
**And** publish/evidence inspection remains fully usable.

### Story 2.4: Implement Rigorous Facts and Variable Type Authoring Across Methodology and Work Units

As an operator,
I want comprehensive facts and variable authoring for methodology and work-unit scopes with strict type-aware validation,
So that contract definitions are reliable before publish and remain deterministic after publish.

**Acceptance Criteria:**

**Given** I open a methodology draft workspace after Story 2.3 validation/publish hardening
**When** I edit methodology-level fact definitions
**Then** I can create, update, and remove fact definitions with fields (`key`, `valueType`, `required`, `defaultValue`, `description`, `validation`)
**And** changes persist deterministically through backend contracts without local-state corruption.

**Given** I edit work-unit type definitions in the draft workspace
**When** I manage work-unit fact schemas
**Then** I can create, update, and remove fields (`key`, `factType`, `required`, `defaultValue`) per work-unit scope
**And** key uniqueness and scope constraints are enforced deterministically.

**Given** I select a supported fact/variable type (`string`, `number`, `boolean`, `json`)
**When** I provide default values
**Then** the UI renders type-appropriate inputs and validates compatibility inline
**And** invalid defaults return actionable diagnostics with remediation.

**Given** I save or publish a draft containing fact definitions/schemas
**When** facts violate contract rules (duplicate keys, unsupported types, reserved keys, invalid defaults)
**Then** save/publish responses include deterministic structured diagnostics
**And** publish is blocked on blocking diagnostics with links to exact editable context.

**Given** I attempt to use filesystem-oriented values in facts where supported by validation configuration
**When** I provide path-like defaults or validation constraints
**Then** policy checks (path format/normalization/safety constraints configured for the story) execute deterministically
**And** the UI surfaces actionable diagnostics for unsafe or invalid path inputs.

**Given** a methodology version is published
**When** I attempt to mutate immutable fact-contract fields from the UI
**Then** the backend rejects mutation deterministically
**And** immutable diagnostics are shown without corrupting local or cached state.

**Given** Story 2.4 facts authoring capabilities are visible in Epic 2
**When** I inspect execution controls
**Then** runtime execution controls remain visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`)
**And** facts authoring and validation remain fully usable.

### Story 2.5: Provide Project Creation and Methodology Pinning UX with Pin Lineage Visibility

As an operator,
I want to create a project and pin it to a published methodology version from the UI,
So that setup is reproducible and project behavior remains deterministic until explicit repin.

**Acceptance Criteria:**

**Given** Story 2.1 methodology setup is in place and each methodology has one or more published versions from Story 2.3
**When** I create a new project from the setup flow
**Then** I can select a methodology from a list of available methodologies
**And** I can select a version for the chosen methodology via autocomplete with latest as default.

**Given** I submit project creation with a selected methodology and version
**When** the request succeeds
**Then** the project is created with that exact methodology version pinned
**And** project detail UI displays active methodology, pinned version, and pin metadata.

**Given** I create a new project from setup
**When** I select or confirm project delivery mode
**Then** setup-fact persistence (including `project.deliveryMode`) is deferred to `WU.PROJECT_CONTEXT` workflows (`document-project` + `generate-project-context`) in Epic 3
**And** Story 2.5 remains scoped to create-and-pin UX without hardcoded setup-fact writes.

**Given** a project pinned to `V1`
**When** version `V2` is published
**Then** the project remains pinned to `V1`
**And** UI clearly shows no implicit repin occurred.

**Given** a project pinned to `V1` and no project executions exist
**When** I explicitly repin to `V2` from project settings
**Then** subsequent project contract resolution uses `V2`
**And** UI shows append-only pin lineage including actor, timestamp, previousVersion, and newVersion.

**Given** a project has one or more persisted executions
**When** I attempt to repin methodology version
**Then** repin is blocked deterministically to protect execution/version consistency
**And** UI shows actionable diagnostics that repin is locked for projects with execution history.

**Given** project settings exposes methodology pin controls
**When** I choose to repin
**Then** I can choose methodology first and then version autocomplete scoped to that methodology
**And** latest version is preselected unless I explicitly choose another compatible version.

**Given** a pin or repin request targets a non-existent or incompatible version
**When** I submit the request
**Then** the backend rejects the operation deterministically
**And** UI surfaces actionable diagnostics without local state corruption.

**Given** project setup and pin controls are visible in Epic 2
**When** I inspect execution actions for bound workflows
**Then** runtime execution controls are visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`)
**And** pinning and lineage inspection remain fully usable.

### Story 2.6: Provide Baseline Operator Visibility for Methodology, Pin, and Diagnostics State

As an operator,
I want a baseline visibility panel for methodology and project contract state,
So that I can verify setup health and evidence status before runtime execution is enabled.

**Acceptance Criteria:**

**Given** I open a project linked to a methodology
**When** I view baseline visibility
**Then** I can see active methodology, pinned version, publish state, and last validation status
**And** values are sourced from persisted backend state.

**Given** setup workflow execution is not yet enabled in Epic 2
**When** I inspect project baseline details
**Then** I see setup-facts status as deferred to `WU.PROJECT_CONTEXT` workflows (`document-project` + `generate-project-context`) in Epic 3
**And** baseline visibility remains read-only for methodology, pin, diagnostics, and work-unit readiness state.

**Given** a selected methodology version contains one or more work unit types
**When** I inspect work unit visibility in the operator panel
**Then** I can view work unit-level transitions and transition status metadata
**And** transition-eligible workflows are shown in the context of the selected work unit transition (not as project-level transitions).

**Given** work-unit instances have persisted fact values
**When** I inspect work unit details in baseline visibility
**Then** I can view fact key-value pairs with type and provenance metadata (`sourceExecutionId`, `updatedAt`)
**And** missing required facts surface warning or blocking indicators aligned to gate/readiness context.

**Given** publication and pin lineage evidence exist
**When** I open evidence sections
**Then** I can inspect append-only publish and pin events in deterministic order
**And** each event includes actor, timestamp, and reference identifiers.

**Given** diagnostics exist for setup-related operations
**When** I open diagnostics history
**Then** diagnostics are grouped by context (publish, pin, repin-policy)
**And** entries include structured fields for actionable remediation (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, and evidence reference identifiers).

**Given** setup capabilities from Stories 2.1-2.5 are in place
**When** I use baseline visibility in Story 2.6
**Then** the panel consumes existing persisted publish/pin/policy outputs
**And** Story 2.6 does not introduce new methodology-authoring validation rules.

**Given** no setup diagnostics exist yet for a new project
**When** I open diagnostics history
**Then** I see an explicit empty-state message
**And** the UI indicates diagnostics will appear after publish/pin/policy checks occur.

**Given** I select a work unit transition in baseline visibility
**When** transition readiness is previewed prior to execution enablement
**Then** the panel shows start-gate readiness derived from pinned methodology contract and current project state
**And** transitions with no start-gate conditions are shown as eligible for future execution.

**Given** a selected work unit transition has one or more transition-eligible workflows
**When** I inspect execution controls from visibility context in Epic 2
**Then** controls remain visible but disabled with rationale (`Workflow runtime execution unlocks in Epic 3+`)
**And** the UI links to configuration and validation actions instead of runtime execution.

**Given** baseline visibility is used across desktop form factors
**When** I access the panel on supported layouts
**Then** key status and evidence information remains readable and keyboard-accessible
**And** status communication does not depend on color alone.

### Story 2.7: Enforce Canonical Methodology Persistence and Establish Project-Context Module Boundary

As a platform engineer,
I want methodology design-time persistence to be canonical-table authoritative and project ownership moved into a dedicated `project-context` module,
So that Epic 3 execution work starts from coherent boundaries without `definition_extensions_json` authority drift.

**Acceptance Criteria:**

**Given** canonical methodology domains are edited through services
**When** create/update/read/delete operations execute
**Then** canonical fields persist and resolve through their defined SQLite tables
**And** `definition_extensions_json` is not used for canonical domain storage or fallback resolution.

**Given** project operations are invoked from API endpoints
**When** project create/list/get and pin/repin requests are processed
**Then** ownership flows through a dedicated `project-context` module boundary
**And** `methodology-engine` no longer owns project persistence responsibilities.

**Given** the project-context mapping is prepared for Epic 3
**When** canonical seeds are generated from BMAD sources
**Then** only `WU.PROJECT_CONTEXT` is seeded for onboarding (greenfield and brownfield)
**And** mapped workflows, steps, edges, bindings, agents, facts, templates, and artifact references are coherent and source-traceable.

**Given** transition gating for project-context is modeled in the mapping
**When** transition contracts are persisted
**Then** transition condition sets are the canonical design target
**And** legacy `transition_required_links` usage is treated as migration debt, not authority.

**Given** project-context transition lifecycle semantics are normalized for Epic 3 readiness
**When** lifecycle contract/schema updates are applied in Story 2.7
**Then** `WU.PROJECT_CONTEXT` uses a single canonical transition lifecycle (`__absent__ -> done`) for this slice
**And** start/completion gate logic is represented by phase-specific condition sets (`phase=start|completion`) rather than `gateClass` fields on transition rows.

**Given** repository boundaries are refactored for design-time correctness
**When** repository interfaces are reviewed
**Then** methodology design-time repositories are cohesive and table-authoritative
**And** no service-level multi-repository write orchestration is required for a single canonical save transaction.

**Given** regression coverage is executed in CI
**When** canonical-authority checks run
**Then** tests fail if forbidden canonical keys appear in `definition_extensions_json`
**And** roundtrip parity tests prove canonical table writes/refetch behavior for project-context mapping payloads.

## Epic 3: Onboarding-Centered Runtime Spikes (Design-Time First)

Deliver full `WU.PROJECT_CONTEXT` onboarding through a design-time-first sequence, then runtime slices, while preserving canonical authority, typed contracts, and G3 evidence quality.

Epic 3 establishes artifact persistence separation for this slice:
- methodology design-time: `methodology_artifact_slot_definitions`, `methodology_artifact_slot_templates`
- project runtime evidence: `project_artifact_snapshots`

### Story 3.1: Complete Design-Time IA and Page Shell Baseline

As an operator,
I want complete design-time page shells and route context,
So that methodology authoring surfaces are reachable and consistent before runtime unlock.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `design-shell-route-map-log`, `design-shell-nav-consistency-log`, `design-shell-state-handling-log`
- `diagnosticRefs`: `design-shell-route-diagnostics`, `design-shell-accessibility-diagnostics`

**Acceptance Criteria:**

**Given** I open methodology version workspace routes
**When** I navigate across design-time pages
**Then** Work Units (L1), Methodology Facts, Agents, Dependency Definitions, and Work Unit L2 shell routes are complete and deterministic.

**Given** empty/loading/error states occur
**When** I interact with page shells
**Then** state handling is deterministic, keyboard-accessible, and preserves context.

### Story 3.2: Complete Work Unit L2 Tabs (Overview, Workflows, Artifact Slots, Facts, State Machine)

As an operator,
I want all Work Unit L2 tabs implemented to the locked design baseline,
So that topology, contracts, and lifecycle can be authored in one coherent surface.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR1`, `FR2`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `l2-tabs-parity-log`, `artifact-slots-authoring-log`, `facts-tab-authoring-log`, `state-machine-authoring-log`
- `diagnosticRefs`: `l2-tabs-findings-diagnostics`, `state-machine-validation-diagnostics`, `artifact-slots-validation-diagnostics`

**Acceptance Criteria:**

**Given** I open Work Unit L2
**When** I switch tabs
**Then** Overview, Workflows, Artifact Slots, Facts, and State Machine tabs match the stable architecture docs routed by `docs/architecture/epic-3-authority.md`, including `docs/architecture/methodology-pages/work-units/detail-tabs.md`, `docs/architecture/methodology-pages/methodology-facts.md`, `docs/architecture/methodology-pages/artifact-slots-design-time.md`, and `docs/architecture/methodology-pages/state-machine-tab.md`.

**Given** findings are present
**When** they render in rows, inspectors, and dialogs
**Then** severity treatment and blocking semantics are consistent and deterministic.

### Story 3.3: Complete Workflow Editor and Step Dialog Surfaces

As an operator,
I want complete step authoring surfaces,
So that workflow intent is modeled with typed, validated configurations.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `workflow-editor-shell-log`, `step-dialog-parity-log`, `variable-path-mapping-log`
- `diagnosticRefs`: `step-config-schema-diagnostics`, `variable-compatibility-diagnostics`, `editor-save-diagnostics`

**Acceptance Criteria:**

**Given** I author workflow steps
**When** I use the editor and dialogs
**Then** Form, Branch, Agent, Invoke, Display, and Action dialogs support locked fields, stacked editing, and deterministic validation through the stable methodology Workflow Editor docs routed by `docs/architecture/epic-3-authority.md`.

**And** implementation follows the stable methodology Workflow Editor docs routed by `docs/architecture/epic-3-authority.md`, including `docs/architecture/methodology-pages/workflow-editor/shell.md`, the promoted step-dialog docs under `docs/architecture/methodology-pages/workflow-editor/`, and the shared pattern docs under `docs/architecture/methodology-pages/workflow-editor/` and `docs/architecture/ux-patterns/`.

**Given** variable targets are selected
**When** mappings are saved
**Then** path semantics and cardinality/type compatibility are enforced with actionable diagnostics.

### Story 3.4: Canonical Persistence and Schema Recovery Hardening

As a platform engineer,
I want canonical writes and typed contract validation hardening,
So that design-time save/publish behavior is migration-safe and drift-resistant.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR3`, `FR6`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `canonical-write-read-log`, `schema-recovery-validation-log`, `publish-contract-check-log`
- `diagnosticRefs`: `canonical-authority-diagnostics`, `contract-drift-diagnostics`, `publish-validation-diagnostics`

**Acceptance Criteria:**

**Given** design-time entities are saved
**When** persistence executes
**Then** canonical table authority is enforced and `definition_extensions_json` is never used as canonical fallback.

**Given** `*.v1` step configs and lifecycle gates are validated
**When** save/publish runs
**Then** contract drift is rejected deterministically with structured diagnostics.

### Story 3.5: Design-Time Verification Harnesses and Runtime-Entry Gate

As a release owner,
I want deterministic design-time harness coverage,
So that runtime stories cannot begin until authoring integrity is proven.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR3`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `design-harness-suite-log`, `runtime-entry-gate-report`, `design-regression-proof-log`
- `diagnosticRefs`: `design-harness-failure-diagnostics`, `runtime-entry-gate-diagnostics`

**Acceptance Criteria:**

**Given** design-time suites run
**When** canonical authority, contract drift, and diagnostics checks execute
**Then** regressions fail CI with deterministic evidence artifacts.

**Given** runtime-entry readiness is evaluated
**When** story 3.5 completes
**Then** a reusable readiness report artifact is produced and referenced by downstream stories.

### Story 3.6: OpenCode Foundation and System Harnesses Sidebar Page

As an operator,
I want OpenCode integration foundations and system-level harness management,
So that runtime harness selection is explicit, governed, and reusable.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR5`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `opencode-foundation-log`, `system-harnesses-sidebar-log`, `harness-policy-resolution-log`
- `diagnosticRefs`: `opencode-adapter-diagnostics`, `harness-config-diagnostics`, `harness-policy-diagnostics`

**Acceptance Criteria:**

**Given** system settings are opened
**When** I navigate the global sidebar
**Then** a Harnesses page exists for system-level harness configuration and visibility.

**Given** agent-step harness configuration is authored
**When** harness is set to `opencode`
**Then** selection resolves through system-governed harness configuration and policy checks.

### Story 3.7: MCP Foundation (Effect + Hono)

As a platform engineer,
I want MCP transport and contract foundations,
So that external runtime tool access uses one canonical internal contract.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR5`, `FR6`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `mcp-foundation-contract-log`, `mcp-hono-transport-log`, `native-mcp-parity-log`
- `diagnosticRefs`: `mcp-contract-diagnostics`, `mcp-policy-diagnostics`, `mcp-transport-diagnostics`

**Acceptance Criteria:**

**Given** MCP foundation services are implemented
**When** requests are processed through Hono
**Then** contract decoding, policy checks, and typed errors execute through Effect service boundaries.

**Given** tool exposure is configured
**When** MCP and native lanes are compared
**Then** both lanes resolve through the same canonical tool contract and tooling control plane.

### Story 3.8: Runtime Entry and Shared Prefix Execution (`intake.capture`, `projectType.route`)

As an operator,
I want deterministic runtime entry and shared prefix behavior,
So that onboarding begins from a stable and auditable boundary.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `onboarding-entry-log`, `shared-prefix-route-log`, `prefix-step-evidence-log`
- `diagnosticRefs`: `onboarding-entry-diagnostics`, `prefix-routing-diagnostics`

**Acceptance Criteria:**

**Given** project context onboarding starts
**When** shared prefix executes
**Then** `projectType` capture/validation and branch routing are deterministic with append-only evidence.

**Given** route conditions are invalid
**When** branching is attempted
**Then** execution is blocked with structured diagnostics and no ambiguous fallback.

### Story 3.9: Greenfield Runtime Chain

As an operator,
I want greenfield onboarding runtime completion,
So that discovery, path capture, bootstrap action, and summary behave deterministically.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `greenfield-runtime-chain-log`, `bootstrap-action-evidence-log`, `greenfield-summary-log`
- `diagnosticRefs`: `greenfield-runtime-diagnostics`, `bootstrap-side-effect-diagnostics`, `snapshot-write-diagnostics`

**Acceptance Criteria:**

**Given** greenfield path is selected
**When** runtime steps execute
**Then** discovery outputs, path validations, bootstrap actions, and summary rendering persist deterministic evidence.

**Given** artifact persistence is required
**When** onboarding outputs are recorded
**Then** runtime evidence writes to canonical `project_artifact_snapshots` with lineage metadata.

### Story 3.10: Brownfield Runtime Chain and Same-Work-Unit Invoke

As an operator,
I want brownfield discovery and conditional invoke behavior,
So that context generation occurs only when needed and remains traceable.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR3`, `FR4`, `FR5`, `FR6`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `brownfield-discovery-log`, `brownfield-route-decision-log`, `same-work-unit-invoke-log`
- `diagnosticRefs`: `brownfield-runtime-diagnostics`, `invoke-io-mapping-diagnostics`, `lineage-persistence-diagnostics`

**Acceptance Criteria:**

**Given** brownfield path is selected
**When** discovery and route decision execute
**Then** `needsContextGeneration` deterministically routes to invoke or summary path.

**Given** invoke path is selected
**When** `generate-project-context` runs in same work unit
**Then** input/output mappings, lineage, and failure semantics are deterministic and diagnostic-rich.

### Story 3.11: Runtime Resilience, Child Invoke Proof, and G3 Consolidation

As a release owner,
I want resilience and nested invoke proof consolidated with gate evidence,
So that Epic 3 can promote to Slice A on reproducible technical evidence.

**Story Metadata:**

- `intentTag`: `Spike`
- `frRefs`: `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`, `NFR5`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G3`
- `evidenceRefs`: `runtime-resilience-log`, `child-invoke-proof-log`, `g3-consolidation-bundle-log`, `g3-promotion-decision-log`
- `diagnosticRefs`: `resilience-runtime-diagnostics`, `child-invoke-diagnostics`, `g3-gate-checklist-diagnostics`

**Acceptance Criteria:**

**Given** active executions run
**When** cancellation, SSE reconnect, and replay scenarios occur
**Then** behavior is deterministic, idempotent boundaries are respected, and evidence remains append-only.

**Given** child invoke proof scenarios run
**When** nested invoke succeeds or fails
**Then** lineage and diagnostics are persisted for both paths without partial transition corruption.

**Given** Epic 3 story evidence is complete
**When** G3 consolidation executes
**Then** promotion artifacts are reproducible and gate decisions reference persisted evidence and diagnostics.

## Epic 4: Golden Path Slice A - Planning Chain

Deliver the first production-runnable planning chain increment by turning validated Epic 3 primitives into a repeatable operator flow for planning outcomes.

### Slice-A Canonical Definition

- Slice-A workflow scope is: `brainstorming -> research -> create-product-brief -> create-prd`.
- For the Slice-A fixture in this plan, planning work units execute through one-way activation-execution transitions `__absent__ -> done`.
- After setup completes, project-scope available actions are derived by evaluating `start_gate` across eligible work-unit transitions.
- Slice-A recommendation policy should rank the default path as `brainstorming -> research -> product-brief -> prd`, while still showing all currently gate-open actions.
- Optional gate conditions may surface warning state (non-blocking) for actions such as product-brief/prd when upstream planning evidence is missing; blocking conditions must still prevent execution.

### Module Mapping Timing Note

- Epic stories capture user value, constraints, evidence, and acceptance criteria.
- Concrete module/file mapping is finalized in create-story and implementation-readiness workflows (post-approval), then executed after reset according to locked stack and architecture constraints.

### Story 4.1: Run Brainstorming to Research as a Repeatable Vertical-Slice Planning Flow

As an operator,
I want to run a repeatable planning flow from brainstorming into research,
So that planning outputs are produced through real transition execution with deterministic evidence.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G4`
- `evidenceRefs`: `planning-slice-run-log`, `brainstorming-artifact-log`, `research-artifact-log`, `transition-chain-log`
- `diagnosticRefs`: `planning-slice-block-diagnostics`, `planning-slice-step-diagnostics`

**Acceptance Criteria:**

**Given** project context is complete (`WU.PROJECT_CONTEXT` via `document-project` + `generate-project-context`) and G3 promotion has passed
**When** the operator starts Slice-A planning execution
**Then** the system runs `WU.BRAINSTORMING` transition `__absent__ -> done` with exactly one selected eligible workflow for this Slice-A fixture
**And** upon completion runs `WU.RESEARCH` transition `__absent__ -> done` with exactly one selected eligible workflow for this Slice-A fixture.

**Given** Slice-A execution is active
**When** start-gate preflight is evaluated for each transition
**Then** blocked transitions surface actionable diagnostics before workflow execution
**And** pass transitions continue with deterministic execution evidence.

**Given** setup has completed for a project
**When** project cockpit available actions are derived
**Then** all gate-open planning actions are shown at project scope with one recommended next action
**And** operators can select any gate-open action even when it is not the top recommendation.

**Given** the project contains many work-unit instances and dependencies
**When** the operator opens the default project cockpit view
**Then** React Flow renders state-machine and dependency relationships with filter controls (work-unit type, status, dependency role, and actionability)
**And** the recommended next action panel remains visible while preserving access to all gate-open actions.

**Given** brainstorming execution produces mapped outputs
**When** research execution is invoked from the planning slice
**Then** required research inputs are resolved from persisted variables or explicit input mapping
**And** execution is blocked deterministically when required mappings are missing.

**Given** optional gate conditions are configured for planning actions
**When** product-brief or prd is shown before upstream planning work completes
**Then** actions may appear in warning state with clear unmet-optional-condition guidance
**And** blocking conditions remain enforced before execution can start.

**Given** Slice-A execution succeeds
**When** artifact persistence runs
**Then** brainstorming and research outputs are stored append-only with lineage/evidence references
**And** operators can inspect both artifacts and transition evidence from the workbench.

**Given** a step in the Slice-A chain fails
**When** failure handling executes
**Then** chain progression halts deterministically at the failing boundary
**And** diagnostics include remediation guidance plus restart or resume options governed by replay policy.

**Given** Slice-A implementation requirements
**When** runtime and orchestration logic is delivered
**Then** backend uses Effect service boundaries (`Tag` + `Layer`) with typed `TaggedError` channels
**And** deterministic tests verify equivalent-input reproducibility for pass/fail outcomes.

**Given** Slice-A verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms brainstorming -> research runnable flow and evidence visibility
**And** one Playwright scenario verifies transition preflight UX, execution progression, and diagnostics rendering.

### Story 4.2: Produce Product Brief from Brainstorming and Research Evidence

As an operator,
I want to generate a product brief from completed brainstorming and research outcomes,
So that planning results are consolidated into a reusable product brief artifact.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G4`
- `evidenceRefs`: `product-brief-run-log`, `product-brief-artifact-log`, `planning-input-linkage-log`, `product-brief-upstream-snapshot-set-log`, `product-brief-dependency-edge-log`
- `diagnosticRefs`: `product-brief-preflight-diagnostics`, `product-brief-input-diagnostics`, `product-brief-optional-condition-warnings`

**Acceptance Criteria:**

**Given** Slice-A brainstorming and research executions have completed with persisted outputs
**When** the operator starts product-brief execution
**Then** the system runs `WU.PRODUCT_BRIEF` transition `__absent__ -> done` for this Slice-A fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** product-brief execution starts
**When** required planning inputs are resolved
**Then** the workflow reads persisted brainstorming and research outputs through explicit variable mapping from a selected upstream snapshot set
**And** execution is blocked deterministically with actionable diagnostics if required inputs are missing or incompatible.

**Given** optional gate conditions are configured for product-brief readiness
**When** one or both upstream snapshot sets (`brainstorming`, `research`) are missing but blocking conditions pass
**Then** product-brief action appears with warning semantics describing unmet optional conditions
**And** warnings are persisted as `requiredLinks` evaluations with `linkTypeKey=planning_input` and `strength=soft`.

**Given** product-brief generation succeeds
**When** artifact persistence runs
**Then** a product-brief artifact is persisted append-only with evidence and traceability references
**And** linkage to source brainstorming and research evidence remains queryable from operator views.

**Given** a product-brief attempt uses upstream planning context
**When** dependency linkage is persisted
**Then** dependency edges are recorded from the product-brief work-unit instance to selected upstream work-unit instances (`WU.BRAINSTORMING`, `WU.RESEARCH`)
**And** each edge records `linkTypeKey=planning_input`, `effectiveStrength=soft`, and the exact upstream snapshot references used for this attempt.

**Given** `requiredLinks` are evaluated for product-brief readiness
**When** gate and linkage evaluation completes
**Then** warning or blocking outcomes are computed from selected upstream snapshot references
**And** persisted work-unit edges are derived projections for graph visibility, not the primary gate input source.

**Given** product-brief execution fails in any step
**When** failure handling runs
**Then** transition outcome is persisted with deterministic diagnostics
**And** operators can choose restart from beginning or resume from last completed checkpoint when policy allows.

**Given** Slice-A runtime requirements
**When** implementation is delivered
**Then** backend uses Effect service boundaries (`Tag` + `Layer`) with typed `TaggedError` channels
**And** deterministic tests verify equivalent-input reproducibility for pass/fail paths.

**Given** Slice-A verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms research -> product-brief runnable flow and artifact linkage visibility
**And** one Playwright scenario verifies preflight UX, execution progression, and diagnostics rendering for product-brief execution.

### Story 4.3: Generate PRD from Product Brief with Gate-Derived Actionability and Warning Semantics

As an operator,
I want to generate a PRD from the product brief while seeing clear gate-derived actionability,
So that I can continue planning confidently with deterministic guidance and evidence.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G4`
- `evidenceRefs`: `prd-run-log`, `prd-artifact-log`, `prd-input-linkage-log`, `actionability-snapshot-log`, `prd-upstream-snapshot-set-log`, `prd-dependency-edge-log`
- `diagnosticRefs`: `prd-preflight-diagnostics`, `prd-optional-condition-warnings`, `prd-step-diagnostics`

**Acceptance Criteria:**

**Given** Slice-A product-brief output exists with persisted evidence
**When** the operator starts PRD execution
**Then** the system runs `WU.PRD` transition `__absent__ -> done` for this Slice-A fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** PRD execution starts
**When** required inputs are resolved
**Then** the workflow consumes product-brief outputs through explicit mapping from a selected upstream snapshot set plus allowed work-unit facts
**And** execution is blocked deterministically with actionable diagnostics if required inputs are missing or incompatible.

**Given** project setup has persisted `project.deliveryMode`
**When** PRD classification metadata is resolved for this attempt
**Then** `classification.projectType` is derived from `project.deliveryMode`
**And** any mismatch between stored classification and project fact is surfaced with deterministic diagnostics.

**Given** optional gate conditions are configured for PRD readiness
**When** upstream planning context is incomplete but blocking conditions pass
**Then** PRD action appears with warning semantics describing unmet optional conditions
**And** warnings are persisted as `requiredLinks` evaluations with `linkTypeKey=planning_input` and `strength=soft`.

**Given** optional gate conditions are evaluated for PRD readiness
**When** warning conditions are computed
**Then** warning semantics explicitly track missing upstream snapshot sets from `WU.BRAINSTORMING`, `WU.RESEARCH`, and `WU.PRODUCT_BRIEF`
**And** warnings remain non-blocking unless a blocking gate condition fails.

**Given** PRD generation succeeds
**When** artifact persistence runs
**Then** a PRD artifact is persisted append-only with linkage to product-brief, research, and brainstorming evidence
**And** the project cockpit shows PRD completion in derived available-actions state.

**Given** a PRD attempt uses upstream planning context
**When** dependency linkage is persisted
**Then** dependency edges are recorded from the PRD work-unit instance to selected upstream work-unit instances (`WU.BRAINSTORMING`, `WU.RESEARCH`, `WU.PRODUCT_BRIEF`)
**And** each edge records `linkTypeKey=planning_input`, `effectiveStrength=soft`, and the exact upstream snapshot references used for this attempt.

**Given** `requiredLinks` are evaluated for PRD readiness
**When** gate and linkage evaluation completes
**Then** warning or blocking outcomes are computed from selected upstream snapshot references
**And** persisted work-unit edges are derived projections for graph visibility, not the primary gate input source.

**Given** PRD execution fails in any step
**When** failure handling runs
**Then** transition outcome is persisted with deterministic diagnostics
**And** operators can choose restart from beginning or resume from last completed checkpoint when policy allows.

**Given** Slice-A runtime policy for this epic
**When** planning agent steps execute in PRD workflow
**Then** the selected runtime lane is `chiron` for this slice
**And** runtime behavior preserves deterministic gate/evidence semantics across reruns.

**Given** Slice-A verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms product-brief -> prd runnable flow and warning-state actionability
**And** one Playwright scenario verifies preflight UX, warning semantics, execution progression, and diagnostics rendering for PRD execution.

### Story 4.4: Consolidate Slice-A Evidence and Record G4 Promotion Decision

As an operator,
I want a single Gate G4 decision backed by Slice-A evidence,
So that promotion to Epic 5 happens only when the planning chain is runnable, queryable, and diagnosable.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G4`
- `evidenceRefs`: `g4-evidence-bundle`, `g4-checklist-result`, `g4-decision-log`, `slice-a-traceability-snapshot`
- `diagnosticRefs`: `g4-blocking-diagnostics`, `g4-remediation-plan`, `g4-warning-summary`

**Acceptance Criteria:**

**Given** Slice-A stories 4.1-4.3 have execution evidence
**When** G4 evaluation is requested
**Then** the system assembles a deterministic evidence bundle for `brainstorming -> research -> product-brief -> prd`
**And** missing required evidence is recorded as blocking diagnostics.

**Given** G4 checklist evaluation runs
**When** criteria are computed
**Then** it verifies runnable chain completion, persisted and queryable outputs, and actionable diagnostics availability
**And** each criterion is marked `PASS` or `BLOCKED` with explicit evidence refs.

**Given** dependency policy is active
**When** G4 evidence is validated
**Then** planning-chain dependency edges are present with `linkTypeKey=planning_input` and correct `effectiveStrength`
**And** each edge includes exact upstream snapshot references used by the attempt.

**Given** optional-condition warnings were present during Slice-A
**When** G4 decision is computed
**Then** warnings are summarized separately from blockers
**And** warnings do not fail G4 unless a blocking gate condition also fails.

**Given** one or more G4 criteria are blocked
**When** gate decision is finalized
**Then** promotion to Epic 5 is denied deterministically
**And** diagnostics include criterion-mapped remediation actions.

**Given** all G4 criteria pass
**When** gate decision is finalized
**Then** promotion to Epic 5 is allowed
**And** append-only decision evidence is persisted with actor, timestamp, checklist snapshot, and bundle reference.

**Given** a G4 decision exists
**When** operator opens readiness view
**Then** criterion-level results and linked diagnostics or evidence are queryable
**And** status communication is clear without relying on color alone.

**Given** implementation requirements
**When** G4 consolidation logic is delivered
**Then** backend uses Effect service boundaries (`Tag` + `Layer`) with typed `TaggedError` channels
**And** deterministic tests verify identical decisions for equivalent evidence inputs.

**Given** verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies blocked -> fixed -> pass progression for G4
**And** one Playwright scenario verifies readiness UI, criterion diagnostics, and promotion gating behavior.

## Epic 5: Golden Path Slice B - Solutioning/Delivery Chain

Deliver the second production-runnable vertical slice for solutioning and delivery workflows: `ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review` with deterministic diagnostics, snapshot-linked dependencies, and append-only evidence.

### Slice-B Story Lifecycle Note

- `WU.STORY` is the first work unit in this delivery chain explicitly exercised as a multi-state lifecycle in Slice-B.
- Story fan-out activation uses `__absent__ -> draft` in Story 5.3.
- Follow-up transitions for story progression (`draft -> ...`) are defined in Stories 5.4 and 5.5.

### Story 5.1: Generate UX Design from PRD Snapshot-Linked Inputs

As an operator,
I want to generate UX design from a selected PRD snapshot,
So that solutioning begins from deterministic planning context with traceable dependency linkage.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `ux-design-run-log`, `ux-design-artifact-log`, `ux-input-linkage-log`, `ux-upstream-snapshot-set-log`, `ux-dependency-edge-log`
- `diagnosticRefs`: `ux-preflight-diagnostics`, `ux-input-diagnostics`, `ux-step-diagnostics`

**Acceptance Criteria:**

**Given** a Slice-A PRD output exists with persisted evidence
**When** the operator starts UX-design execution
**Then** the system runs `WU.UX_DESIGN` transition `__absent__ -> done` for this Slice-B fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** project setup has persisted `project.deliveryMode`
**When** available-actions and readiness for UX-design are derived
**Then** UX-design requirement is evaluated conditionally from that project fact
**And** non-UX delivery modes surface UX-design as optional/context rather than hard-required.

**Given** UX-design execution starts
**When** required inputs are resolved
**Then** the workflow consumes a selected PRD upstream snapshot set through explicit mapping plus allowed work-unit facts
**And** execution is blocked deterministically with actionable diagnostics if required inputs are missing or incompatible.

**Given** dependency policy is active for UX-design readiness
**When** `requiredLinks` are evaluated
**Then** dependency evaluation uses `linkTypeKey=planning_input` with `strength=hard` for PRD snapshot availability
**And** missing required PRD snapshot linkage blocks execution deterministically.

**Given** a UX-design attempt uses upstream planning context
**When** dependency linkage is persisted
**Then** a dependency edge is recorded from the `WU.UX_DESIGN` work-unit instance to the selected `WU.PRD` work-unit instance
**And** the edge records `linkTypeKey=planning_input`, `effectiveStrength=hard`, and exact upstream snapshot references used for this attempt.

**Given** UX-design generation succeeds
**When** artifact persistence runs
**Then** a UX-design artifact is persisted append-only with evidence and traceability references
**And** linkage to PRD and upstream planning evidence remains queryable from project cockpit views.

**Given** UX-design execution fails in any step
**When** failure handling runs
**Then** transition outcome is persisted with deterministic diagnostics
**And** operators can choose restart from beginning or resume from last completed checkpoint when policy allows.

**Given** Slice-B runtime policy for this story
**When** solutioning agent steps execute in UX-design workflow
**Then** the selected runtime lane remains `chiron` in this initial Story 5.1 baseline
**And** runtime behavior preserves deterministic gate and evidence semantics across reruns.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms PRD -> UX-design runnable flow and dependency linkage visibility
**And** one Playwright scenario verifies preflight UX, execution progression, and diagnostics rendering for UX-design execution.

### Story 5.2: Generate Architecture from PRD and Conditional UX Snapshot Inputs

As an operator,
I want to generate architecture from deterministic upstream snapshots,
So that solution design is traceable and correctly adapts to project delivery mode.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `architecture-run-log`, `architecture-artifact-log`, `architecture-input-linkage-log`, `architecture-upstream-snapshot-set-log`, `architecture-dependency-edge-log`
- `diagnosticRefs`: `architecture-preflight-diagnostics`, `architecture-input-diagnostics`, `architecture-conditional-link-diagnostics`

**Acceptance Criteria:**

**Given** a PRD accepted snapshot exists for the project
**When** the operator starts architecture execution
**Then** the system runs `WU.ARCHITECTURE` transition `__absent__ -> done` for this Slice-B fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** project setup has persisted `project.deliveryMode`
**When** dependency requirements are derived for architecture readiness
**Then** PRD snapshot linkage is always required with `linkTypeKey=planning_input` and `strength=hard`
**And** UX snapshot linkage is conditionally required based on delivery mode policy.

**Given** project delivery mode requires UX artifacts
**When** `requiredLinks` are evaluated
**Then** UX snapshot linkage is enforced as `linkTypeKey=planning_input` with `strength=hard`
**And** missing UX snapshot linkage blocks execution deterministically.

**Given** project delivery mode does not require UX artifacts
**When** `requiredLinks` are evaluated
**Then** UX linkage is treated as non-blocking (`soft` or `context` per policy)
**And** any missing UX linkage is surfaced as warning diagnostics rather than a block.

**Given** architecture execution starts
**When** required inputs are resolved
**Then** the workflow consumes selected PRD snapshots and conditionally selected UX snapshots through explicit mapping plus allowed work-unit facts
**And** execution is blocked deterministically with actionable diagnostics when required inputs are missing or incompatible.

**Given** an architecture attempt uses upstream context
**When** dependency linkage is persisted
**Then** dependency edges are recorded from `WU.ARCHITECTURE` to selected upstream work-unit instances (`WU.PRD` and conditionally `WU.UX_DESIGN`)
**And** each edge records `linkTypeKey=planning_input`, `effectiveStrength`, and exact upstream snapshot references used for this attempt.

**Given** architecture generation succeeds
**When** artifact persistence runs
**Then** an architecture artifact is persisted append-only with traceability references
**And** linkage to upstream planning and solutioning evidence remains queryable from cockpit views.

**Given** architecture execution fails in any step
**When** failure handling runs
**Then** transition outcome is persisted with deterministic diagnostics
**And** operators can choose restart from beginning or resume from last completed checkpoint when policy allows.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms `PRD -> Architecture` runnable flow under both UX-required and UX-optional modes
**And** one Playwright scenario verifies conditional dependency behavior, preflight UX, and diagnostics rendering for architecture execution.

### Story 5.3: Run Create-Epics-Stories with Canonical Child Work-Unit Fan-Out

As an operator,
I want to run `create-epics-stories` from architecture and planning snapshots,
So that backlog output is produced and story work-unit instances are created with deterministic lineage.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `create-epics-stories-run-log`, `backlog-artifact-log`, `story-fanout-lineage-log`, `story-activation-log`, `fanout-dependency-edge-log`
- `diagnosticRefs`: `create-epics-stories-preflight-diagnostics`, `fanout-input-diagnostics`, `fanout-child-outcome-diagnostics`

**Acceptance Criteria:**

**Given** accepted PRD and architecture snapshots exist for the project
**When** the operator starts `create-epics-stories`
**Then** the system runs `WU.BACKLOG` transition `__absent__ -> done` for this Slice-B fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** dependency policy is active for backlog creation
**When** `requiredLinks` are evaluated
**Then** PRD and architecture snapshot linkages are enforced as `linkTypeKey=planning_input` with `strength=hard`
**And** missing required snapshot linkages block execution deterministically.

**Given** `create-epics-stories` produces story items for fan-out
**When** `bindingMode=child_work_units` invoke executes
**Then** each fan-out item invokes the same child workflow key `create-story` with item-specific mapped inputs
**And** each created `WU.STORY` instance uses activation transition `__absent__ -> draft` for this delivery-chain fixture
**And** each child creation persists append-only lineage (`parentWorkUnitRef`, `parentExecutionId`, `childWorkUnitRef`, `childExecutionId`, `invokeStepRef`).

**Given** child fan-out executes for story items
**When** invoke and child outcome policy are evaluated
**Then** each item records deterministic success/failure outcome with diagnostics
**And** parent completion behavior follows configured child outcome policy with evidence.

**Given** backlog and story outputs are persisted
**When** dependency linkage is recorded
**Then** dependency edges are recorded from `WU.BACKLOG` to upstream instances (`WU.PRD`, `WU.ARCHITECTURE`) and from each `WU.STORY` to `WU.BACKLOG`
**And** each edge records `linkTypeKey=planning_input`, `effectiveStrength`, and exact upstream snapshot references used for this attempt.

**Given** fan-out execution fails for one or more child items
**When** failure handling runs
**Then** deterministic diagnostics identify failing item scopes and remediation
**And** operator recovery options follow retry/replay policy without duplicating successful child instances.

**Given** Slice-B runtime policy for this story
**When** planning agent steps execute in `create-epics-stories`
**Then** runtime behavior preserves deterministic gate and evidence semantics across reruns
**And** the story proves canonical `child_work_units` behavior for this delivery chain.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms `Architecture -> create-epics-stories -> story fan-out` runnable flow
**And** one Playwright scenario verifies fan-out progression, child-lineage visibility, and diagnostics rendering.

### Story 5.4: Execute Create-Story for Story Progression from Draft to Ready-for-Dev

As an operator,
I want to run `create-story` on initialized story work units,
So that each story is elaborated to implementation-ready state with explicit dependency semantics.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `create-story-run-log`, `create-story-artifact-log`, `story-readiness-log`, `story-dependency-policy-log`
- `diagnosticRefs`: `create-story-preflight-diagnostics`, `create-story-step-diagnostics`, `story-readiness-diagnostics`

**Acceptance Criteria:**

**Given** story work-unit instances exist in `draft` from Story 5.3 fan-out
**When** the operator starts `create-story` on a selected story
**Then** the system runs `WU.STORY` transition `draft -> ready-for-dev` for this Slice-B fixture using exactly one selected eligible workflow
**And** start-gate preflight must pass before execution begins.

**Given** dependency policy is active for story readiness
**When** `requiredLinks` are evaluated
**Then** dependency linkage to parent backlog context is evaluated with `linkTypeKey=planning_input`
**And** missing hard-required linkage blocks execution deterministically.

**Given** `create-story` execution starts
**When** story elaboration steps run
**Then** story acceptance criteria, dependency declarations, and traceability metadata are persisted append-only
**And** readiness diagnostics are produced deterministically when required fields are missing.

**Given** inter-story dependencies are declared during `create-story`
**When** dependency strengths are evaluated (`hard`, `soft`, `context`)
**Then** hard unmet dependencies place the story in blocked readiness state
**And** soft/context dependencies are surfaced as warning/informational diagnostics.

**Given** `create-story` succeeds
**When** transition completion persists
**Then** story state moves to `ready-for-dev`
**And** append-only evidence links transition outcome, refined story artifact, and readiness diagnostics.

**Given** `create-story` fails in any step
**When** failure handling runs
**Then** state remains at the last committed lifecycle boundary
**And** operators can choose restart or resume per replay policy without duplicate transition commits.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms `initialize-story -> create-story` progression to `ready-for-dev`
**And** one Playwright scenario verifies readiness gating, dependency warnings/blocks, and diagnostics rendering for `create-story`.

### Story 5.5: Execute Dev-Story for Story Progression from Ready-for-Dev to Review

As an operator,
I want to run `dev-story` on ready-for-dev story work units,
So that implementation outcomes are produced for review with deterministic runtime evidence.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `dev-story-run-log`, `dev-story-artifact-log`, `dev-story-transition-log`, `dev-story-runtime-log`
- `diagnosticRefs`: `dev-story-preflight-diagnostics`, `dev-story-step-diagnostics`, `dev-story-policy-diagnostics`

**Acceptance Criteria:**

**Given** story work-unit instances are in `ready-for-dev`
**When** the operator starts `dev-story` on a selected story
**Then** the system runs `WU.STORY` transition `ready-for-dev -> review` for this Slice-B fixture
**And** start-gate preflight must pass before execution begins.

**Given** `dev-story` execution starts
**When** runtime lane is selected for implementation steps
**Then** implementation agent steps run on `opencode` for this story
**And** policy and evidence boundaries remain deterministic under the same gate semantics.

**Given** `dev-story` executes code-impacting steps
**When** side-effect steps run
**Then** approvals and policy checks are enforced before protected actions
**And** deterministic diagnostics are persisted for rejected or failed actions.

**Given** `dev-story` succeeds
**When** transition completion persists
**Then** story state moves to `review`
**And** append-only evidence links story transition outcome, generated artifacts, and runtime diagnostics.

**Given** `dev-story` fails in any step
**When** failure handling runs
**Then** state remains at the last committed lifecycle boundary
**And** operators can choose restart or resume per replay policy without duplicate transition commits.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms `ready-for-dev -> review` progression for at least one story instance
**And** one Playwright scenario verifies preflight UX, execution progression, and diagnostics rendering for `dev-story`.

### Story 5.6: Execute Code-Review for Story Promotion from Review to Done

As an operator,
I want to run `code-review` on story work units in review,
So that acceptance decisions are deterministic and only approved stories reach `done`.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `code-review-run-log`, `review-decision-log`, `story-promotion-log`, `review-diagnostics-log`
- `diagnosticRefs`: `code-review-preflight-diagnostics`, `code-review-findings-diagnostics`, `code-review-promotion-diagnostics`

**Acceptance Criteria:**

**Given** story work-unit instances are in `review`
**When** the operator starts `code-review`
**Then** the system runs `WU.STORY` transition `review -> done` for stories that pass review criteria
**And** preflight and completion-gate diagnostics remain deterministic.

**Given** code-review detects blocking findings
**When** completion-gate evaluation runs
**Then** promotion to `done` is denied deterministically
**And** remediation diagnostics are persisted with criterion-level findings.

**Given** code-review produces non-blocking findings only
**When** completion-gate evaluation runs
**Then** story promotion to `done` proceeds
**And** warning diagnostics remain attached to evidence for audit.

**Given** code-review execution fails unexpectedly
**When** failure handling runs
**Then** story state remains at `review`
**And** restart or resume options follow replay policy without duplicate transition commits.

**Given** Slice-B verification requirements
**When** validation is executed
**Then** one manual hands-on scenario confirms `review -> done` promotion and blocked-remediation behavior
**And** one Playwright scenario verifies review diagnostics visibility and transition outcomes.

### Story 5.7: Consolidate Slice-B Evidence and Record G5 Promotion Decision

As an operator,
I want a single Gate G5 decision backed by Slice-B evidence,
So that promotion to Epic 6 happens only when the full solutioning/delivery chain is runnable with deterministic diagnostics.

**Story Metadata:**

- `intentTag`: `Vertical Slice`
- `frRefs`: `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G5`
- `evidenceRefs`: `g5-evidence-bundle`, `g5-checklist-result`, `g5-decision-log`, `slice-b-traceability-snapshot`
- `diagnosticRefs`: `g5-blocking-diagnostics`, `g5-remediation-plan`, `g5-warning-summary`

**Acceptance Criteria:**

**Given** Slice-B stories 5.1-5.6 have execution evidence
**When** G5 evaluation is requested
**Then** the system assembles a deterministic evidence bundle for `ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review`
**And** missing required evidence is recorded as blocking diagnostics.

**Given** G5 checklist evaluation runs
**When** criteria are computed
**Then** it verifies full chain runnable completion, persisted/queryable outputs, deterministic diagnostics, and story-state progression (`__absent__ -> draft -> ready-for-dev -> review -> done`)
**And** each criterion is marked `PASS` or `BLOCKED` with explicit evidence refs.

**Given** dependency policy is active in Slice-B
**When** G5 evidence is validated
**Then** required dependency evaluations and persisted edges are present with `linkTypeKey=planning_input`, expected strengths, and exact upstream snapshot refs
**And** conditional UX dependency behavior is validated against `project.deliveryMode` evidence.

**Given** one or more G5 criteria are blocked
**When** gate decision is finalized
**Then** promotion to Epic 6 is denied deterministically
**And** diagnostics include criterion-mapped remediation actions.

**Given** all G5 criteria pass
**When** gate decision is finalized
**Then** promotion to Epic 6 is allowed
**And** append-only decision evidence is persisted with actor, timestamp, checklist snapshot, and bundle reference.

**Given** a G5 decision exists
**When** operator opens readiness view
**Then** criterion-level results and linked diagnostics/evidence are queryable
**And** status communication is clear without relying on color alone.

**Given** implementation requirements
**When** G5 consolidation logic is delivered
**Then** backend uses Effect service boundaries (`Tag` + `Layer`) with typed `TaggedError` channels
**And** deterministic tests verify identical decisions for equivalent evidence inputs.

**Given** verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies blocked -> fixed -> pass progression for G5
**And** one Playwright scenario verifies readiness UI, criterion diagnostics, and promotion gating behavior.

## Epic 6: Execution Hardening

Harden the validated golden path under interruption, retry, reconnect, and concurrency pressure so deterministic diagnostics and evidence remain stable before scale-out.

### Story 6.1: Harden Runtime Control Loops for Cancel, Retry, Resume, and Reconnect

As an operator,
I want runtime control actions to behave predictably under failure and recovery scenarios,
So that workflow execution remains stable under real-world interruptions.

**Story Metadata:**

- `intentTag`: `Hardening`
- `frRefs`: `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `hardening-control-matrix-log`, `cancel-resume-retry-log`, `reconnect-recovery-log`, `state-consistency-log`
- `diagnosticRefs`: `control-loop-diagnostics`, `idempotency-diagnostics`, `recovery-diagnostics`

**Acceptance Criteria:**

**Given** active parent and child executions exist
**When** cancel is triggered at parent scope
**Then** cancellation propagates deterministically across active child executions
**And** append-only evidence records terminal states with lineage correlation.

**Given** an execution fails at step level
**When** operator selects retry from start or resume from last checkpoint
**Then** runtime enforces idempotency boundaries and checkpoint policy deterministically
**And** no duplicate transition commit is produced for the same boundary.

**Given** an execution stream disconnect occurs during runtime
**When** client reconnects
**Then** stream recovery resumes from persisted cursor without duplicated terminal outcomes
**And** reconnect diagnostics and evidence remain queryable.

**Given** control requests race (double submit, replay, reconnect overlap)
**When** runtime receives competing requests
**Then** only one valid control outcome is committed
**And** rejected requests return deterministic diagnostics.

**Given** hardening verification requirements
**When** validation runs
**Then** one manual hands-on scenario covers cancel, resume, and retry with child fan-out
**And** one Playwright scenario covers disconnect/reconnect and control-race behavior with deterministic assertions.

### Story 6.2: Stabilize Diagnostics Contract and Evidence Integrity Under Failure Pressure

As an operator,
I want diagnostics and evidence payloads to remain schema-stable across equivalent failures,
So that remediation and audit workflows are reliable.

**Story Metadata:**

- `intentTag`: `Hardening`
- `frRefs`: `FR3`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `diagnostics-schema-stability-log`, `failure-classification-log`, `evidence-integrity-log`
- `diagnosticRefs`: `schema-drift-diagnostics`, `evidence-integrity-diagnostics`

**Acceptance Criteria:**

**Given** equivalent failure classes are replayed across runs
**When** diagnostics are emitted
**Then** payload schema remains stable (`code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, evidence refs)
**And** classification remains deterministic for equivalent inputs.

**Given** evidence persistence runs under failures and retries
**When** append-only writes are validated
**Then** no evidence mutation or backfill rewrite occurs
**And** chronology remains monotonic and queryable.

**Given** operators inspect diagnostics across slices
**When** readiness and run history views are queried
**Then** linked evidence and remediation remain navigable at criterion-level granularity
**And** warning vs blocking semantics remain consistent.

**Given** hardening verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies diagnostics schema stability across equivalent failure classes
**And** one Playwright scenario verifies diagnostics/evidence navigation and warning/blocking consistency.

### Story 6.3: Validate Bounded Concurrency and Runtime Feedback Targets

As an operator,
I want the runtime to remain stable under bounded concurrent execution,
So that throughput scales without losing deterministic behavior.

**Story Metadata:**

- `intentTag`: `Hardening`
- `frRefs`: `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR3`, `NFR4`, `NFR1`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `concurrency-soak-log`, `runtime-latency-log`, `contention-failure-log`
- `diagnosticRefs`: `concurrency-diagnostics`, `latency-threshold-diagnostics`

**Acceptance Criteria:**

**Given** bounded concurrent executions are scheduled for soak runs
**When** runtime executes within configured limits
**Then** contention-caused failures remain within accepted threshold
**And** failure diagnostics classify root cause deterministically.

**Given** runtime feedback events are measured under load
**When** latency metrics are computed
**Then** p95/p99 targets are evaluated with persisted measurement evidence
**And** threshold breaches emit actionable diagnostics.

**Given** concurrency hardening verification runs
**When** validation completes
**Then** one manual scenario verifies multi-execution behavior and evidence visibility
**And** one Playwright scenario verifies operator-facing responsiveness and diagnostic surfacing under load.

### Story 6.4: Establish AX Optimization and Feedback Loop Baseline

As an operator,
I want optimization and feedback loops running before scale-out,
So that prompt and workflow quality can improve with evidence-backed iteration during hardening.

**Story Metadata:**

- `intentTag`: `Hardening`
- `frRefs`: `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `ax-baseline-scorecard-log`, `feedback-survey-log`, `optimization-decision-log`, `optimization-rollback-log`
- `diagnosticRefs`: `optimization-diagnostics`, `feedback-quality-diagnostics`, `rollout-guardrail-diagnostics`

**Acceptance Criteria:**

**Given** hardened workflows have baseline run evidence
**When** AX optimization evaluation is run
**Then** candidate prompts/configs are compared against baseline with deterministic scorecards
**And** optimization decisions are persisted append-only with evidence references.

**Given** operators submit post-run feedback surveys
**When** feedback is captured
**Then** feedback is linked to execution and artifact snapshot references
**And** feedback quality diagnostics are persisted for unusable or incomplete submissions.

**Given** optimized variants are selected for rollout
**When** rollout guardrails are evaluated
**Then** staged rollout and rollback paths are enforced deterministically
**And** violations emit actionable diagnostics with automatic fallback evidence.

**Given** optimization-loop verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies baseline vs candidate evaluation plus guarded rollout/rollback behavior
**And** one Playwright scenario verifies survey capture, feedback linkage, and optimization decision visibility.

### Story 6.5: Consolidate Hardening Evidence and Record G6 Promotion Decision

As an operator,
I want a single Gate G6 decision backed by hardening and optimization evidence,
So that promotion to Epic 7 occurs only after runtime stability and learning-loop readiness are proven.

**Story Metadata:**

- `intentTag`: `Hardening`
- `frRefs`: `FR3`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `g6-evidence-bundle`, `g6-checklist-result`, `g6-decision-log`, `hardening-traceability-snapshot`
- `diagnosticRefs`: `g6-blocking-diagnostics`, `g6-remediation-plan`, `g6-warning-summary`

**Acceptance Criteria:**

**Given** hardening stories 6.1-6.4 have execution evidence
**When** G6 evaluation is requested
**Then** the system assembles deterministic hardening evidence for cancel/retry/idempotency/reconnect, diagnostics stability, bounded concurrency, and optimization-loop baseline
**And** missing required evidence is recorded as blocking diagnostics.

**Given** G6 checklist evaluation runs
**When** criteria are computed
**Then** each criterion is marked `PASS` or `BLOCKED` with explicit evidence refs
**And** promotion is denied unless all mandatory hardening criteria pass.

**Given** all G6 criteria pass
**When** gate decision is finalized
**Then** promotion to Epic 7 is allowed
**And** append-only decision evidence is persisted with actor, timestamp, checklist snapshot, and bundle reference.

**Given** G6 readiness verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies blocked -> fixed -> pass progression for G6
**And** one Playwright scenario verifies readiness UI, criterion diagnostics, and promotion gating behavior.

## Epic 7: Scale-Out and Coverage Expansion

Expand the hardened orchestration model across broader workflows, dependency graphs, and migration paths while preserving deterministic diagnostics and evidence contracts.

### Story 7.1: Expand Workflow Coverage Across Additional BMAD Work Units

As an operator,
I want the hardened execution model applied to additional BMAD work-unit workflows,
So that more of the methodology can run with the same deterministic guarantees.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR1`, `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `scale-workflow-coverage-log`, `coverage-transition-log`, `coverage-diagnostics-log`
- `diagnosticRefs`: `coverage-gap-diagnostics`, `coverage-policy-diagnostics`

**Acceptance Criteria:**

**Given** hardened runtime controls are in place
**When** additional methodology workflows are enabled
**Then** transition and gate semantics remain deterministic and evidence-complete
**And** newly enabled workflows publish coverage diagnostics for missing contracts or bindings.

**Given** expanded workflow set executes in project context
**When** operators inspect available actions
**Then** derived actions and recommendations remain stable and explainable
**And** readiness diagnostics remain actionable at criterion level.

**Given** scale-out verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies expanded workflow coverage with deterministic outcomes
**And** one Playwright scenario verifies available-action derivation and diagnostics visibility for newly enabled workflows.

### Story 7.2: Scale Project Graph UX with Layered Views and Filters

As an operator,
I want large project graphs to remain usable,
So that I can reason about work-unit state machines, dependencies, and actionability at scale.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR1`, `FR6`, `FR7`
- `nfrRefs`: `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `graph-scale-ux-log`, `filter-state-log`, `actionability-overlay-log`
- `diagnosticRefs`: `graph-scale-diagnostics`, `filter-consistency-diagnostics`

**Acceptance Criteria:**

**Given** a project has many work-unit instances and edges
**When** operator opens project cockpit
**Then** React Flow supports layered views (state-machine, dependency, actionability) with deterministic filters
**And** filter/search state remains shareable and reproducible.

**Given** graph scale increases
**When** operator navigates or applies filters
**Then** interaction responsiveness remains within accepted UX thresholds
**And** recommended-next-action panel remains visible without hiding gate-open actions.

**Given** graph-scale verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies layered graph analysis on a high-instance project
**And** one Playwright scenario verifies filter determinism, actionability overlays, and cockpit responsiveness.

### Story 7.3: Provide Controlled Methodology Version Migration for Execution-Bearing Projects

As an operator,
I want a controlled migration workflow when projects already have execution history,
So that I can move to newer methodology versions without unsafe direct repin.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR1`, `FR2`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `version-migration-run-log`, `migration-plan-log`, `migration-decision-log`, `migration-edge-log`
- `diagnosticRefs`: `migration-preflight-diagnostics`, `migration-compatibility-diagnostics`, `migration-remediation-diagnostics`

**Acceptance Criteria:**

**Given** a project has persisted executions and cannot direct-repin
**When** operator starts migration workflow
**Then** system generates a deterministic migration plan from current pinned version to target version
**And** plan includes compatibility checks, required remediations, and evidence references.

**Given** migration validation passes
**When** operator confirms migration
**Then** migration is applied through controlled steps with append-only evidence
**And** lineage from pre-migration and post-migration states remains queryable.

**Given** migration validation fails
**When** operator reviews diagnostics
**Then** promotion to target version is blocked deterministically
**And** remediation guidance is persisted with criterion-level findings.

**Given** migration verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies safe migration for an execution-bearing project
**And** one Playwright scenario verifies migration diagnostics, decisioning, and lineage visibility.

### Story 7.4: Map and Execute BMAD Course-Correction Workflow Path

As an operator,
I want course-correction to be mapped and executable as a first-class workflow path,
So that major delivery changes can be handled deterministically with traceable impact decisions.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR2`, `FR3`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `course-correction-run-log`, `course-correction-impact-log`, `course-correction-decision-log`
- `diagnosticRefs`: `course-correction-trigger-diagnostics`, `course-correction-impact-diagnostics`

**Acceptance Criteria:**

**Given** a project enters significant change conditions
**When** course-correction trigger facts and gates are evaluated
**Then** course-correction appears as a derived available action with deterministic rationale
**And** trigger diagnostics include blocking/warning semantics and evidence references.

**Given** operator runs course-correction
**When** impact analysis completes
**Then** affected work units/artifacts are identified with explicit stale-risk findings
**And** impact outputs are persisted append-only with traceability links.

**Given** course-correction recommends revalidation actions
**When** operator accepts recommendations
**Then** downstream revalidation actions are opened as deterministic next actions
**And** recommendation lineage remains queryable from project cockpit views.

**Given** course-correction verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies trigger -> impact -> recommendation flow
**And** one Playwright scenario verifies derived action surfacing and impact diagnostics visibility.

### Story 7.5: Orchestrate Impact Revalidation and Traceability Refresh

As an operator,
I want impacted artifacts and workflows to be revalidated after course-correction,
So that system state and planning artifacts remain trustworthy.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR2`, `FR3`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `impact-revalidation-run-log`, `staleness-evaluation-log`, `traceability-refresh-log`
- `diagnosticRefs`: `impact-revalidation-diagnostics`, `staleness-diagnostics`, `traceability-mismatch-diagnostics`

**Acceptance Criteria:**

**Given** course-correction impact outputs exist
**When** revalidation orchestration runs
**Then** affected artifacts/work units are re-evaluated using snapshot-linked dependency policy
**And** stale vs acceptable outcomes are persisted with deterministic diagnostics.

**Given** impacted planning artifacts are revalidated
**When** traceability refresh executes
**Then** FR/NFR/ADR references are updated consistently across affected stories and evidence logs
**And** traceability mismatches are surfaced with criterion-level remediation diagnostics.

**Given** revalidation identifies blocking impact
**When** gate-readiness is recomputed
**Then** blocked actions remain non-executable until remediation succeeds
**And** allowed actions include clear reasoning for temporary restrictions.

**Given** impact-revalidation verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies stale-impact detection and successful revalidation closure
**And** one Playwright scenario verifies staleness diagnostics and traceability-refresh visibility.

### Story 7.6: Consolidate Scale-Out Evidence and Record Release Readiness

As an operator,
I want a final scale-out readiness decision from expanded coverage evidence,
So that release decisions are grounded in deterministic runtime, diagnostics, and migration behavior.

**Story Metadata:**

- `intentTag`: `Scale-out`
- `frRefs`: `FR1`, `FR2`, `FR3`, `FR4`, `FR5`, `FR6`, `FR7`
- `nfrRefs`: `NFR1`, `NFR2`, `NFR3`, `NFR4`
- `adrRefs`: `ADR-EF-B01`, `ADR-EF-B02`, `ADR-EF-01`, `ADR-EF-03`, `ADR-EF-04`, `ADR-EF-05`, `ADR-EF-06`
- `gateRefs`: `G6`
- `evidenceRefs`: `scaleout-evidence-bundle`, `scaleout-checklist-result`, `scaleout-readiness-log`, `scaleout-traceability-snapshot`
- `diagnosticRefs`: `scaleout-blocking-diagnostics`, `scaleout-warning-summary`, `scaleout-remediation-plan`

**Acceptance Criteria:**

**Given** scale-out stories 7.1-7.5 have execution evidence
**When** release readiness is evaluated
**Then** system assembles deterministic scale-out evidence bundle covering coverage expansion, graph usability, migration safety, and course-correction/revalidation readiness
**And** each readiness criterion is marked `PASS` or `BLOCKED` with explicit evidence refs.

**Given** one or more readiness criteria are blocked
**When** decision is finalized
**Then** release promotion is denied deterministically
**And** remediation actions are recorded with criterion-level diagnostics.

**Given** readiness criteria pass
**When** decision is finalized
**Then** release readiness is approved with append-only decision evidence
**And** evidence remains queryable for post-release audit and future course-correction baselines with traceability completeness checks.

**Given** scale-out readiness verification requirements
**When** validation is executed
**Then** one manual hands-on scenario verifies blocked -> fixed -> release-ready progression
**And** one Playwright scenario verifies final readiness UI, criterion diagnostics, and release decision evidence visibility.

## Open Decisions Checklist (Pre-Implementation)

- [x] **PRD lifecycle lock:** Confirmed PRD lifecycle model (`__absent__ -> draft -> review -> done`) and aligned `create-prd`/`edit-prd`/`validate-prd` transition bindings.
  - **Default:** `create-prd` = `__absent__ -> draft`; `validate-prd` = `draft -> review` and `review -> done` (mode-driven); `edit-prd` = `review -> draft`; `validate-impact-prd` = `done -> review`.
- [x] **Course-correction trigger contract:** Confirmed canonical trigger facts and thresholds for opening course-correction actions.
  - **Default:** open course-correction when `course_correction_required=true` or any hard dependency staleness check fails; persist affected snapshot refs and severity in trigger evidence.
- [x] **Dependency operand binding schema:** Confirmed transition-level `requiredLinks` operand selectors while keeping dependency type definitions target-neutral.
  - **Default:** dependency types remain semantic-only; each `requiredLinks` entry binds its operand selector in the transition (`snapshotSet` preferred, work-unit selector optional).
- [x] **Snapshot staleness policy:** Confirmed default staleness policy (`pinned_for_attempt`) and warning/blocking rules for optional vs hard dependencies.
  - **Default:** `pinned_for_attempt`; hard staleness blocks, soft staleness warns, context staleness informs; each decision records compared snapshot refs.
- [x] **Cardinality enforcement behavior:** Confirmed runtime behavior for repeated activation attempts on `one_per_project` work-unit types.
  - **Default:** deny second activation deterministically, return existing instance reference, and provide navigate/resume action in diagnostics.

## Story Dependency Matrix

### Epic 1

- `1.1` dependsOn `[]`
- `1.2` dependsOn `[1.1]`
- `1.3` dependsOn `[1.2]`
- `1.4` dependsOn `[1.3]`
- `1.5` dependsOn `[1.4]`

### Epic 2

- `2.1` dependsOn `[1.2]`
- `2.2` dependsOn `[2.1, 1.3]`
- `2.3` dependsOn `[2.1, 1.4]`
- `2.4` dependsOn `[1.5, 2.1]`
- `2.5` dependsOn `[2.1, 2.3, 2.4]`

### Epic 3

- `3.1` dependsOn `[1.5, 2.5, cc-foundation-retrospective]`
- `3.2` dependsOn `[3.1]`
- `3.3` dependsOn `[3.1]`
- `3.4` dependsOn `[3.2, 3.3]`
- `3.5` dependsOn `[3.1, 3.2, 3.3, 3.4]`

### CC-Foundation

- `CCF.1` dependsOn `[2.5]`
- `CCF.2` dependsOn `[CCF.1]`
- `CCF.3` dependsOn `[CCF.2]`
- `CCF.4` dependsOn `[CCF.3]`
- `CCF.5` dependsOn `[CCF.4]`
- `CCF.6` dependsOn `[CCF.5]`
- `cc-foundation-retrospective` dependsOn `[CCF.6]`

### Epic 4

- `4.1` dependsOn `[3.5]`
- `4.2` dependsOn `[4.1]`
- `4.3` dependsOn `[4.2]`
- `4.4` dependsOn `[4.1, 4.2, 4.3]`

### Epic 5

- `5.1` dependsOn `[4.4]`
- `5.2` dependsOn `[5.1]`
- `5.3` dependsOn `[5.2]`
- `5.4` dependsOn `[5.3]`
- `5.5` dependsOn `[5.4]`
- `5.6` dependsOn `[5.5]`
- `5.7` dependsOn `[5.1, 5.2, 5.3, 5.4, 5.5, 5.6]`

### Epic 6

- `6.1` dependsOn `[5.7]`
- `6.2` dependsOn `[5.7]`
- `6.3` dependsOn `[5.7]`
- `6.4` dependsOn `[6.1, 6.2]`
- `6.5` dependsOn `[6.1, 6.2, 6.3, 6.4]`

### Epic 7

- `7.1` dependsOn `[6.5]`
- `7.2` dependsOn `[6.5]`
- `7.3` dependsOn `[6.5]`
- `7.4` dependsOn `[7.1]`
- `7.5` dependsOn `[7.4]`
- `7.6` dependsOn `[7.1, 7.2, 7.3, 7.4, 7.5]`

### Parallelization Guidance

- `2.2` and `2.3` can run in parallel after `2.1`.
- `CCF.2` implementation and `CCF.3` evidence reconciliation can overlap once shell baseline exists, but distro/install/release polish and the remaining desktop + headless server packaging/release work are explicitly deferred out of the Epic 3 critical path until after core feature delivery.
- `3.2` and `3.3` can run in parallel after `3.1`.
- `6.1`, `6.2`, and `6.3` can run in parallel after `5.7`.
- `7.1`, `7.2`, and `7.3` can run in parallel after `6.5`.
