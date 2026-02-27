# Chiron Architecture Canonical v1 (Week 6)

Date: 2026-02-21
Status: Canonical architecture reference for reset + rebuild (updated after Correct Course resequencing)

## 1) Architectural Core

Chiron is an Effect-based orchestration platform with a methodology-first domain model.

Core concepts:

- work units (typed planning/execution entities)
- transitions (state changes)
- gates (`start_gate`, `completion_gate` only)
- slots/snapshots (typed artifact state)
- transition-bound workflow execution

## 2) Execution Boundary Contracts

### Locked step capabilities

- `form`
- `agent`
- `action`
- `invoke`
- `branch`
- `display`

### Gate semantics

- `start_gate`: availability to begin transition execution.
- `completion_gate`: eligibility to complete transition and persist state change.

No additional gate class is allowed in this horizon.

## 3) Module Responsibilities (Canonical)

- `workflow-engine`
  - orchestrates step execution and transition lifecycle.
- `methodology-engine`
  - owns work-unit/transition/slot/gate domain services.
- `agent-runtime`
  - executes Chiron and OpenCode runtime adapters.
- `provider-registry`
  - owns provider/model policy, resolution, and usage policy boundaries.
- `tooling-engine`
  - side-effect policy/approval orchestration.
- `sandbox-engine`
  - worktree + git boundary (`simple-git` adapter implementation in this module).
- `variable-service`
  - scoped variable operations and resolution support.
- `template-engine`
  - template compose/render/prompt receipt responsibilities.
- `event-bus`
  - ephemeral event transport.
- `ax-engine`
  - optimization/recommendation engine with explicit promotion flow.

## 4) Dependency Direction (Canonical)

- `contracts` at the center as shared Effect Schema boundary.
- `api` is transport/composition boundary, not runtime-internal orchestrator.
- `provider-registry` policy is upstream of `agent-runtime` and `ax-engine`.
- `workflow-engine` consumes service interfaces, not concrete cross-module internals.

## 5) Persistence and Data Model

- DB: SQLite-only in this implementation horizon.
- ORM: Drizzle.
- Methodology schema model follows:
  - methodology/version definitions
  - work-unit types and transitions
  - workflow definition and transition-allowed bindings
  - transition attempts + gate evaluations
  - execution outputs ledger
- slot definitions/snapshot versions/heads
- variable definitions + values/history

### 5.1) Project Pin Persistence (Decision In Progress)

- Current pointer storage is still under active ADR review while Story 1.5 is prepared.
- Options being evaluated:
  - Inline pointer on `projects` (for example `projects.pinnedMethodologyVersionId`).
  - Dedicated pointer table (`project_methodology_pins`) with one active row per project.
- Working implementation direction is currently the dedicated pointer table to reduce later migration refactor churn and keep methodology-pin concerns decoupled from project identity.
- This direction is provisional until ADR/story acceptance criteria are finalized.
- Independent of pointer placement, append-only pin lineage events and deterministic diagnostics remain mandatory.

## 6) Workflow Binding Model

- Workflows scoped by `methodologyVersion + workUnitType`.
- Transitions define allowed executable workflows.
- Invoke modes:
  - `same_work_unit` for techniques/subroutines
  - `child_work_units` for lifecycle fan-out entities

## 6.1) Agent Model v1 (Canonical)

- Agents are methodology-scoped profiles (persona + default runtime settings), not standalone executable units.
- Each profile is identified by a stable key within a methodology version and defines default prompt/config values.
- `agent` steps reference a methodology agent profile key and inherit defaults.
- `agent` steps may override prompt/model/tools/timeout for that step only; step overrides never mutate profile defaults.
- Effective runtime config precedence is:
  - methodology agent profile defaults
  - step overrides
  - runtime caps/policies (if configured)

### Non-goals in this horizon

- No agent-level input/output contracts.
- No step-binding constraints beyond the existing step type system.
- No hardcoded runtime restriction matrix inside agent definitions.

### Watch-outs

- Prevent override sprawl; profile defaults should remain the primary source of behavior.
- Keep provider/model/tool safety policy enforcement in provider/tooling/runtime layers.

## 7) Streaming and Runtime Transport

- Hono is the streaming/transport edge for execution updates.
- SSE/event streams deliver live agent/step/runtime signals.
- oRPC remains the typed control/query surface.

## 8) Migration/Cutover Posture

- Backend-first cutover.
- Frontend wiring follows stabilized backend contracts.
- Historical docs retained in archive, non-canonical for implementation decisions.

## 9) Runtime Tooling and State Decisions (Current Horizon)

## 9.1) Agent-Step Tool Surface (Minimal)

- Agent-step tool exposure is intentionally minimal and namespaced.
- Baseline context/action tools are:
  - `chiron_context.list`
  - `chiron_context.get`
  - `chiron_context.get_many`
  - `chiron_context.search`
  - `chiron_actions.list_available`
  - `chiron_action.execute`
- Tool model is flat namespaced tools, not nested tool trees.

## 9.2) Context Retrieval Model

- Agent steps do not receive full project state payloads by default.
- Runtime provides compact execution snapshot context at step start.
- Additional state is retrieved on demand through context tools with scoped, auditable reads.

## 9.3) Tooling Interface Split

- External agent kinds consume tooling via MCP interface.
- `chiron` runtime consumes native in-process tool interface.
- `tooling-engine` is the single control plane for tool availability, policy checks, approval requirements, and execution authorization.
- `agent-runtime` resolves delivery format (MCP vs native) from one canonical internal tool contract.

## 9.4) Runtime Transport Topology

- One backend runtime process may expose multiple interfaces:
  - oRPC control/query
  - SSE runtime streams
  - MCP endpoint(s)
- This interface split does not require separate backend products.

## 9.5) Minimal Versioning Strategy (v1)

- Freeze execution context at run start (execution snapshot + pinned methodology/workflow revision references).
- Persist transition attempts and gate outcomes as append-only runtime evidence.
- Persist step execution attempts/revisions for retry and diagnostics.
- Advanced full-state event sourcing and broad live cross-execution synchronization are deferred.

## 9.6) Git and Project State

- Git is used for project checkpoint snapshots and artifact history portability.
- Database remains operational source of truth for live orchestration/runtime state.
- Project portability uses `.chiron` manifest/checkpoint metadata; restore target is checkpointed project state, not in-memory in-flight execution internals.

## 10) Delivery Sequencing Model (Correct Course 2026-02-21)

### 10.1) Foundational Baseline (Unchanged)

- Epics 1-2 remain foundational and intact.
- Epic 3+ planning and implementation must build on Epic 1-2 contracts, runtime boundaries, and locked ADRs without redefining foundations.

### 10.2) Epic 3+ Progressive Delivery Model

From Epic 3 onward, delivery is intentionally resequenced from abstraction-first to progressive runnable capability slices:

- Epic 3: Runtime Primitive Spikes (`Spike` intent)
- Epic 4: Golden Path Slice A - Planning Chain (`Vertical Slice` intent)
- Epic 5: Golden Path Slice B - Solutioning/Delivery Chain (`Vertical Slice` intent)
- Epic 6: Execution Hardening (`Hardening` intent)
- Epic 7: Scale-Out and Coverage Expansion (`Scale-out` intent)

Story policy from Epic 3 onward:

- Epic 3 stories are spike stories.
- Epics 4-5 stories are vertical-slice stories.
- Epic 6 stories are hardening stories.
- Epic 7 stories are scale-out stories.

### 10.3) Golden-Path-First Implementation Policy

- Implementation priority is a hands-on runnable flow before broad abstraction layers.
- Abstractions are promoted only after runnable evidence validates primitives, reliability, and diagnostics.
- Golden-path milestones are:
  - Epic 3 proof stage: brainstorming + research primitives proven.
  - Epic 4 runnable planning chain: brainstorming -> research -> product brief -> prd.
  - Epic 5 runnable full delivery chain: ux-design -> architecture -> create-epics-stories -> create-story -> dev-story -> code-review.
  - Epic 6 hardens the full 10-step path under concurrency/failure/retry stress.
  - Epic 7 expands coverage across additional workflows/modules/providers.

### 10.4) Progression Gates (Go/No-Go)

Progression from Epic 3 onward is gated by explicit runnable evidence.

- Gate G3 (Epic 3 -> Epic 4): all spike proofs complete with reproducible evidence for:
  - cancellation cascade,
  - invoke child completion/lineage,
  - idempotent replay boundary,
  - SSE reconnect continuity,
  - deterministic append-only gate evidence.
- Gate G4 (Epic 4 -> Epic 5): planning chain is runnable end-to-end with persisted/queryable outputs and actionable failure diagnostics.
- Gate G5 (Epic 5 -> Epic 6): full golden path is runnable with at least one successful run and one intentional failure run with diagnostics.
- Gate G6 (Epic 6 -> Epic 7): hardening thresholds validated for cancel/retry/idempotency/stream recovery, bounded concurrency behavior, and deterministic diagnostics payload stability.

No gate pass means no epic promotion.

### 10.5) Locked ADR Preservation (Carried Forward Unchanged)

The following locked ADR decisions remain authoritative and are preserved through resequencing:

- Minimal namespaced tool surface.
- On-demand context retrieval (no full-state prompt injection).
- `tooling-engine` as tool control plane.
- MCP for external runtimes and native interface for `chiron` runtime.
- One backend process may expose oRPC + SSE + MCP.
- Minimal versioning scope now; advanced versioning deferred.
- Git checkpoints/portability with DB authoritative for live orchestration state.

### 10.6) BMAD -> Chiron Mapping Governance (Controlled Evolution)

- BMAD -> Chiron mapping is a baseline model from Epic 3 onward, not a frozen contract.
- Mapping evolution is allowed only through controlled governance:
  - ADR update,
  - affected story acceptance-criteria update,
  - traceability update across planning artifacts.
- Uncontrolled mapping drift is disallowed.

### 10.7) Architecture-Level Risks and Tradeoffs from Resequencing

Tradeoffs accepted:

- Early local optimization risk: vertical-slice-first implementation can create temporary duplication before later consolidation.
- Deferred abstraction debt: some cross-cutting abstractions intentionally emerge later, increasing near-term refactor surface.
- Gate overhead: explicit evidence gates add process cost, but this is intentional to reduce hidden runtime risk.
- Coverage skew risk: prioritizing golden path may delay long-tail workflow/provider coverage until scale-out.

Primary risks introduced:

- Inconsistent evidence quality across teams/stories may produce false gate confidence.
- Partial hardening before scale pressure can mask non-golden-path failure modes.
- Rapid post-gate expansion (Epic 7) can outpace diagnostic and operability maturity.

Mitigation posture:

- Gate artifacts must be reproducible, persisted, and reviewable.
- Story DoD from Epic 3 onward includes unit/integration tests, one manual hands-on scenario, and one Playwright scenario.
- Hardening (Epic 6) remains a strict prerequisite to scale-out.

### 10.8) Implementation Boundary: Now vs Defer Later

Implement now (required in current horizon):

- Epic 3-7 resequencing and gate-driven promotion policy.
- Golden-path-first runnable flows through planning and solutioning/delivery chains.
- Gate evidence model and diagnostic readiness criteria.
- Locked ADR constraints in section 9.
- Mapping governance controls (ADR + AC + traceability) for any mapping changes.

Defer later (explicitly out of current horizon):

- Broad abstraction/generalization not justified by runnable evidence.
- Advanced full-state event sourcing and broad live cross-execution synchronization.
- Advanced versioning model beyond snapshot pinning + append-only evidence.
- Non-golden-path scale expansion before hardening gates are satisfied.
