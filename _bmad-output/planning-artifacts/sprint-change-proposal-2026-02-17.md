# Sprint Change Proposal: Week 6->10 Implementation Strategy (Methodology-First)

**Date:** 2026-02-17  
**Author:** BMAD Correct Course Workflow  
**Status:** PROPOSED  
**Classification:** Major (core architecture reset within locked contracts)  
**Decision Window:** Week 6 -> Week 10  
**Restart Baseline:** https://www.better-t-stack.dev/new?add=fumadocs,lefthook,mcp,oxlint,skills,tauri,turborepo

---

## 1) Issue Summary

Chiron has reached a strategy inflection point between Week 6 and Week 10.

- The codebase contains valuable production shell assets (web layout, route shell, Tauri integration, adapter structure) and locked architecture contracts.
- The methodology/work-unit core is not yet first-class in runtime, while several module packages remain stub-only or partially wired.
- Existing planning artifacts are mixed-era: old PRD assumptions, migration-era tech-specs, and archived epics. This creates execution drift and sequencing ambiguity.

### Trigger

Need a strict course-correction decision for implementation strategy:

- **A)** Targeted core reset: keep frontend shell/layout and locked contracts, rebuild methodology/work-unit core.
- **B)** Broader rewrite.

### Problem Statement

If implementation continues without reset boundaries, the team risks spending Weeks 6-10 in integration churn rather than landing a deterministic, auditable methodology-first core (work units, transitions, slots, snapshots, gates) under locked step contracts.

---

## 2) Impact Analysis

### Epic / Story / Status Impact

From current sprint status and planning artifacts:

- Epic 2 has migration work done, but execution path remains inconsistent (`2-3` blocked while migration tracks evolved).
- Epic 3+ are largely backlog and no longer aligned to current architecture reality.
- `epics/README.md` confirms Mastra-era epics were archived and new epics are pending.

**Impact:** Planning artifacts require explicit resequencing around methodology-first core delivery, not continuation of legacy epic assumptions.

### Artifact and Contract Impact

1. **Locked, must preserve**
   - `docs/architecture/modules/*.md` (module boundaries and policy locks)
   - `docs/architecture/workflow-engine/*.md` (step contracts)
   - `docs/architecture/method-workitem-execution-contract.md`
   - `docs/architecture/method-workitem-execution-examples.md`

2. **Current drift points**
   - Prior migration tech-spec includes historical step taxonomy variants that diverge from locked 6-step contracts.
   - Legacy API workflow-engine internals still coexist with package-level workflow engine migration target.
   - Planning docs and status files do not yet represent methodology primitives as the primary execution spine.

### Technical Impact

- Transition enforcement must move to deterministic gate checks on typed outputs + dependency/link policy.
- Snapshot + slot model must be promoted from concept to primary persisted runtime structure.
- Variable/template/event/tooling/provider/sandbox boundaries must be implemented as modules, not ad-hoc internal glue.

### Risk Impact

- **Primary risk:** trying to “fix everything in place” creates hidden coupling and unpredictable regressions.
- **Secondary risk:** broader rewrite could consume all remaining timeline with low visible progress.

---

## 3) Recommended Approach

## Decision

**Choose A: Targeted Core Reset (keep shell/layout + rebuild methodology/work-unit core).**

### Rationale

1. Preserves already-good product surface and UX shell while replacing unstable core internals.
2. Aligns directly with locked contracts and methodology-first constraints.
3. Produces highest probability of Week 10 delivery with auditable deterministic behavior.
4. Avoids overreach and uncertainty of a full broader rewrite.

### Why Not B (Broader Rewrite)

- Rebuilds solved surface area (shell/layout/routing) with little thesis value gain.
- Increases schedule risk and integration unknowns.
- Delays critical path: transition evaluator + slots/snapshots + gate enforcement.

### DB Decision

**Use SQLite as primary DB for Week 6-10 implementation.**

Rationale:

- Current architecture/contracts and local dev workflows already assume SQLite.
- JSON-heavy workload (slot payload metadata, transition evidence, gate diagnostics) is better served by JSONB + indexing and query flexibility.
- No migration lock-in currently means this is the correct time to standardize on the stronger long-term runtime store.

Trade-off acknowledged:

- SQLite would reduce setup friction short-term, but raises medium-term risk for query semantics, indexing strategy, and future multi-execution observability needs.

---

## 4) Detailed Change Proposals

### 4.1 Carry-Over Boundaries (Exact)

### Keep (unchanged in principle)

- Frontend shell/layout structure (navigation shell, app frame, current UX scaffolding).
- Tauri app shell and desktop packaging flow.
- Locked architecture docs and step contracts.
- Agent runtime dual-adapter direction (`chiron` + `opencode`) as boundary pattern.
- Existing repository/package topology (monorepo structure).

### Rewrite (targeted core)

- Methodology/work-unit persistence core:
  - methodology ledgers
  - work-unit types and instances
  - links/dependencies
  - slot snapshots and immutable heads
  - transition evaluator (start guard + commit gate)
- Execution bridge for typed outputs to transition checks.
- Runtime orchestration composition for variable/template/tooling/provider/sandbox/event-bus via locked module boundaries.
- API slice for work-unit lifecycle and execution-gate surfaces.

### Defer (post Week 10 unless cut-line passes early)

- AX optimization execution loops beyond manual recommendation path.
- Advanced observability export pipeline (keep DB-first telemetry only).
- Expanded admin customizer UX for full methodology CRUD.
- Non-critical legacy cleanup outside core runtime path.

### 4.2 Artifact-Level Old -> New Proposals

1. **Implementation Strategy**
   - **Old:** Continue mixed migration track with partial legacy coexistence.
   - **New:** Targeted core reset track with explicit keep/rewrite/defer boundaries and week-gated cut lines.

2. **Sprint Status Model**
   - **Old:** Story sequence still anchored to prior migration-era epics.
   - **New:** Introduce Week 6-10 track stories centered on methodology core first, with legacy work marked deferred/non-blocking.

3. **Architecture Execution Semantics**
   - **Old:** Mixed step taxonomy references in historical artifacts.
   - **New:** Enforce locked step contracts only: `form`, `agent`, `action`, `invoke`, `branch`, `display`.

4. **Methodology Layer Representation**
   - **Old:** Conceptual in docs, partial in implementation.
   - **New:** First-class runtime primitives with deterministic transition checks on required slots/links/output types.

5. **Database Direction**
   - **Old:** implicit/ambiguous in current course-correction context.
   - **New:** explicit Postgres-first for Week 6-10 delivery.

### 4.3 Four-Week Execution Plan (Week 6 -> Week 10)

### Week 6: Contract Freeze + Core Skeleton

Milestones:

- Freeze implementation contract: locked step contracts + methodology primitives.
- Create methodology DB schema and adapters (Postgres): ledgers, work units, links, slots, snapshots, transition rules.
- Add feature flag for new core path (parallel-safe with legacy path).

Cut line if behind by >2 days:

- Reduce initial work-unit coverage to one type (`story`) and one transition lane only.

### Week 7: Deterministic Transition Engine

Milestones:

- Implement start-guard + commit-gate evaluator.
- Implement typed output ledger + required link checks.
- Wire gate diagnostics API for actionable failure reasons.

Cut line if behind:

- Defer stale/suspect overlay automation; keep overlay tagging read-only.

### Week 8: Workflow Runtime Integration (Locked Steps)

Milestones:

- Bind evaluator to workflow execution lifecycle.
- Ensure step handlers respect locked contracts and non-mutating display behavior.
- Implement minimal-intervention flow (auto-continue safe steps, prompt only on approvals/missing required inputs).

Cut line if behind:

- Keep parallel invoke optimizations deferred; ship sequential-first correctness.

### Weeks 9-10: Hardening + Cutover

Milestones:

- Ship one vertical slice fully end-to-end (see 4.4).
- Add rollback switch (legacy executor fallback for non-slice flows).
- Stabilize tests, update sprint-status and handoff docs, remove only proven-safe legacy paths.

Cut line if behind:

- Preserve legacy runtime for non-critical flows through Week 10, while shipping methodology-core slice as production path.

### 4.4 First Implementation Slice (Start Immediately)

**Slice Name:** Story Transition Gate Vertical Slice

Scope:

- Single work-unit type: `story`.
- Single transition path: `ready -> in_progress -> review`.
- One execution path that produces gate-required outputs and commits transition.

Acceptance Criteria:

1. Running the slice creates a `work_item_execution` and immutable execution context snapshot.
2. At least one `agent` or `action` step produces typed output records in execution output ledger.
3. Transition `in_progress -> review` is blocked unless required output types and required links exist.
4. On success, transition commits and snapshot head updates are persisted atomically.
5. UI shows gate failure reasons and required remediation without manual log inspection.
6. User intervention is required only for explicit approval gates or missing required inputs.

---

## 5) Implementation Handoff

### Scope Classification

**Major** (core runtime behavior + planning/execution contract realignment)

### Routing and Ownership

- **PM/Architect:** Own strategy execution, cut-line decisions, and architecture integrity checks.
- **Dev Team:** Build methodology core, transition evaluator, runtime integration, and vertical slice delivery.
- **PO/SM:** Maintain sprint-status updates, acceptance checks, and sequencing discipline.

### Risk Controls

1. Weekly architecture gate review against locked contracts (no drift accepted).
2. Feature flag isolation for new core path to protect delivery while integrating.
3. Deterministic parity checks on transition outcomes before cutover.
4. No expansion to deferred scope unless current week milestones are green.

### Fallback Plan if Schedule Slips

- **Slip at Week 7:** keep only story-type lane + mandatory gates, defer broader type coverage.
- **Slip at Week 8:** keep sequential invoke path and defer advanced continuation/parallel optimizations.
- **Slip at Week 9/10:** ship vertical slice as production path, retain legacy runtime for non-slice workflows behind explicit toggle.

### Success Criteria by Week 10

- Methodology layer is first-class in runtime (work units, transitions, slots, snapshots, gates).
- Locked workflow-step contracts are respected in active execution path.
- One end-to-end vertical slice is stable and demonstrably low-intervention.
- Course-corrected plan is reflected in sprint tracking and team handoff artifacts.

---

## Final Recommendation

Proceed with **A) targeted core reset** and **SQLite** as the Week 6-10 implementation strategy. This provides the highest confidence path to deliver methodology-first correctness, preserve existing UX value, and minimize user interruption during high-velocity execution.

---

## Revision 1 (User Feedback): SQLite + Selective Code Deletion

### Updated DB Position

Yes - **SQLite with JSON-key indexing is possible** and can work for this plan if we constrain the design.

Revised recommendation:

- Use **SQLite-first for Week 6-10** for speed and lower local operational friction.
- Keep schema and query patterns **Postgres-portable** from day one (no SQLite-only semantics in core domain queries).
- Add explicit indexes for hottest JSON access paths plus generated/derived columns where needed.

Required guardrails:

1. Define a fixed set of gate-critical lookup keys (for transitions, slot heads, dependency checks) and index only those.
2. Avoid deeply ad-hoc JSON predicates in hot paths; move repeated lookups to typed columns/materialized metadata fields.
3. Add query-budget tests for transition evaluator paths to catch regressions early.
4. Keep a migration adapter boundary ready for Postgres if write/read pressure outgrows SQLite.

### Updated Position on Deleting Existing Code

The strategy is sound **if deletion is selective and contract-protected**.

Recommended execution policy:

- Keep architecture/docs/design files as immutable reference contracts.
- Archive legacy mental models and outdated plans.
- Delete only implementation code that is either:
  - superseded by locked contracts, or
  - unreachable/dead in active runtime paths, or
  - duplicate of the new methodology-core path.

Do not delete immediately:

1. Keep legacy runtime behind a feature flag as a fallback until vertical slice parity is proven.
2. Delete in phases after parity gates pass (tests + deterministic transition checks + slice acceptance criteria).
3. Preserve rollback checkpoints per week (tag/branch points) before each deletion wave.

### Revised Risk View

- SQLite risk is acceptable if JSON access is constrained/indexed and core evaluator queries are disciplined.
- Full immediate code purge is high-risk; phased deletion with fallback flag is low-risk and schedule-safe.

### Revised Final Recommendation

Proceed with **A) targeted core reset**, adopt **SQLite-first with indexed JSON-key strategy**, and execute a **phased legacy code deletion plan** guarded by parity and rollback checkpoints.

---

## Revision 2 (User Decision): SQLite-Only for Current Horizon

User direction updated:

- For current implementation horizon, use **SQLite exclusively**.
- Remove Postgres migration considerations from active planning scope.

SQLite-only implementation constraints:

1. Transition/gate-critical lookups must use indexed JSON paths or derived indexed columns.
2. Avoid unbounded ad-hoc JSON querying in hot paths.
3. Keep deterministic evaluator query patterns fixed and benchmarked.
4. Treat database strategy as settled for Week 6-10; no parallel DB track.

This revision supersedes prior Postgres-oriented language in this proposal for the current planning window.
