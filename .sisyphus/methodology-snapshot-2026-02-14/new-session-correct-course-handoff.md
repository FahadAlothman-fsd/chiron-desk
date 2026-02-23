# New Session Handoff: Correct-Course Preparation

Date: 2026-02-17  
Status: Ready for new BMAD session  
Goal: run Correct Course with fresh context and decide implementation path quickly.

## Starter baseline for restart

- Use Better T Stack starter as baseline shell reference: `https://www.better-t-stack.dev/new?add=fumadocs,lefthook,mcp,oxlint,skills,tauri,turborepo`
- Treat current repository as source of reusable assets/contracts, not as mandatory legacy to refactor line-by-line.

## What we locked conceptually (methodology layer)

- Three-plane model:
  - Methodology definitions (configurable)
  - Workflow/procedure definitions (configurable)
  - Execution engine semantics (locked contracts)
- Work units + state-machine transitions as primary primitive.
- Artifact slots (methodology-defined namespaced keys) with immutable snapshots.
- Deterministic transition evaluator:
  - required slot outputs
  - required link patterns
  - dependency strength policy
  - project facts checks
- Activation as pseudo-transition (`__absent__ -> initial`).
- Impact/staleness represented as overlays (`suspect`/`stale`) with optional transition mapping.
- Workflow execution as event spine for auditable mutations.

Reference docs created in this session:
- `.sisyphus/methodology-snapshot-2026-02-14/methodology-primitives-wireframe.md`
- `.sisyphus/methodology-snapshot-2026-02-14/bmad-full-prototype-config.md`
- `.sisyphus/methodology-snapshot-2026-02-14/execution-layers.md`

## Non-BMAD code carry-over recommendations (preliminary)

Keep:
- `apps/web` shell/layout/component system (high reuse value)
- `apps/server/src/index.ts` thin entry composition
- `packages/workflow-engine` execution patterns + tests as reference
- `packages/agent-runtime` adapter architecture + stream handling patterns
- `docs/architecture/**` active contracts (especially workflow-engine and module docs)

Keep but rewire:
- `packages/api` router boundaries; rebind to new methodology/work-unit core
- `packages/contracts` evolve to Effect Schema boundaries

Drop/defer from active v1 path:
- mostly-stub module packages until methodology core lands (`tooling-engine`, `event-bus`, `variable-service`, `template-engine`, `provider-registry`, `sandbox-engine`, `ax-engine` implementation internals)
- legacy workflow-engine service internals under API legacy paths
- archive docs for active decision-making

## UI/layout/design assets to preserve

Must keep:
- Typography/theme system in `apps/web/src/index.css`:
  - CommitMono font baseline
  - OKLCH token architecture
  - CARBON-green dark accents
  - sharp corner style (`--radius: 0rem`)
- Shell/layout scaffolding:
  - `apps/web/src/routes/_authenticated.tsx`
  - `apps/web/src/components/app-sidebar.tsx`
  - `apps/web/src/components/layouts/project-layout.tsx`
- Workflow UX patterns:
  - `apps/web/src/components/workflows/layouts/*`
  - `apps/web/src/components/workflows/timeline*.tsx`
  - `apps/web/src/components/workflows/workflow-path-selector-card.tsx` (good guidance-card pattern)

Likely rebuild domain-coupled pieces:
- old step renderer and execution-domain-coupled workflow components once new methodology core is in place

## Decision posture for upcoming Correct Course

- Scope decision to make: full rewrite vs targeted core reset.
- Current recommendation trend: targeted core reset (keep shell + docs contracts, rebuild methodology/work-unit/transition core).
- Database decision to discuss explicitly in Correct Course:
  - SQLite for portability (acceptable if schema rebuilt now)
  - Keep query/index design explicit for JSON-heavy paths.

## Oracle synthesis (week 6->10 execution strategy)

Bottom line:
- Keep the current shell and API surface stable, then "strangle" internals by moving execution + permissions + tool-running into standalone Effect modules with DB-backed adapters and controlled cutover.

Week-by-week (recommended):
1) Week 6 - freeze shell contract and define runtime facade in API
   - Lock UI/API contract at workflow router and agent stream endpoint.
   - Add internal `WorkflowRuntime` facade with current executor behind it for swap-ready cutover.
2) Week 7 - extract tooling engine to package boundary
   - Move tool execution + permission flow into `packages/tooling-engine`.
   - Keep approval UI payloads backward compatible during transition.
3) Week 8 - switch to workflow-engine runtime with persistence adapter
   - Make workflow-engine state persistence explicit (DB-backed adapter Layer).
   - Pilot one workflow path via facade switch; keep legacy fallback flag.
4) Week 9 - restart safety and idempotency hardening
   - Ensure paused approvals and step attempts survive process restarts.
   - Keep DB as source-of-truth; stream buses are best-effort transport.
5) Week 10 - consolidate and delete legacy internals
   - Remove/quarantine legacy API workflow-engine internals once parity passes.
   - Unify event flow and update architecture docs to match new boundaries.

Risk controls from synthesis:
- Hard rollback switch between legacy/new runtime until parity is proven.
- Use parity checklists as explicit release gates.
- Preserve step/variable/approval durability in DB before removing legacy paths.

## Prompt to use in new BMAD session (Correct Course)

```text
We need a Correct Course decision for Chiron implementation strategy from week 6 to week 10.

Context to use as source-of-truth in this repo:
1) docs/architecture/modules/*.md (locked module contracts)
2) docs/architecture/workflow-engine/*.md (locked step contracts)
3) docs/architecture/method-workitem-execution-contract.md
4) docs/architecture/method-workitem-execution-examples.md
5) .sisyphus/methodology-snapshot-2026-02-14/methodology-primitives-wireframe.md
6) .sisyphus/methodology-snapshot-2026-02-14/bmad-full-prototype-config.md
7) .sisyphus/methodology-snapshot-2026-02-14/execution-layers.md

Task:
- Run a strict Correct Course for implementation planning.
- Decide between:
  A) targeted core reset (keep frontend shell/layout + rebuild methodology/work-unit core), or
  B) broader rewrite.
- Include DB decision (SQLite vs Postgres) based on our current state: no critical migration constraints, but JSON-heavy workload.

Expected output:
1) Decision summary with explicit rationale and risks.
2) 4-week execution plan (week 6->10) with milestones and cut lines.
3) Carry-over boundaries: exactly what stays, what is rewritten, what is deferred.
4) First implementation slice to start immediately (vertical slice) including acceptance criteria.
5) Risk controls and fallback plan if schedule slips.

Constraints:
- Keep methodology layer first-class (work units, transitions, slots, snapshots, gates).
- Respect locked workflow step contracts.
- Minimize user intervention during high-velocity execution.
```
