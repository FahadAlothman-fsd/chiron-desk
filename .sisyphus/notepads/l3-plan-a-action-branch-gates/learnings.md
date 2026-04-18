# L3 Plan A — Action + Branch + Narrow Gate Alignment

## Learnings & Conventions

### Project Structure
- Monorepo with Turborepo
- Packages: contracts, db, methodology-engine, workflow-engine, api, core
- Apps: web (React + TanStack Router), server (Hono + oRPC)
- Runtime: Bun
- Database: SQLite/Turso with Drizzle ORM
- Effect-TS for functional programming patterns

### Key Patterns
- Contracts in `packages/contracts/src/`
- Schema in `packages/db/src/schema/`
- Repositories in `packages/db/src/runtime-repositories/`
- Services in `packages/methodology-engine/src/services/` and `packages/workflow-engine/src/services/`
- Routers in `packages/api/src/routers/`
- Web routes in `apps/web/src/routes/`

### Plan A Boundaries
- Action: propagation-only, whole-step authoring
- Branch: runtime persistence with explicit save-selection
- Gates: narrow operator extension only
- Deferred to Plan B: fact unification, raw-write hardening, richer invoke payload

## Decisions Log

### 2026-04-17 — T11 action web surfaces
- Action editor hydration must merge the base workflow step list with per-step Action definition queries before the shared shell snapshots `initialSteps`; otherwise existing Action rows collapse to empty fallback payloads.
- Action runtime affordances should stay server-authoritative: render `runAction`, `retryAction`, and `completionSummary` disabled reasons directly from the runtime DTO instead of recomputing Action eligibility in the client.

### 2026-04-17T02:45Z — T13 regression hardening
- Gate/branch overlap needs an explicit regression for minimal invoke-produced draft-spec reference payloads so Plan A `exists` checks do not accidentally start depending on richer Plan-B-style nested `facts/artifacts/instance` payloads.
- Transition-gate decoding should keep coercing unknown operators back to the locked `exists | equals` Plan A subset; make that fallback explicit in tests instead of relying on implicit defaults.
- Invoke completion coverage should assert negative shape guarantees too: downstream context facts stay reference-only (`projectWorkUnitId`, fact instance IDs, artifact snapshot IDs) and must not leak richer nested draft-spec payloads.

### 2026-04-17T04:16Z — T13 F2 blocker fix pass
- Plan A authoring alignment is safest when the subset is enforced in every decode boundary, not just runtime evaluation: contracts, API zod payloads, methodology-engine validation, and repository rehydration all need the same `exists | equals` branch operator contract.
- Action authoring also needs a pre-runtime invariant that at least one propagation action remains enabled; otherwise runtime completion semantics and authored payloads diverge.

### 2026-04-17T02:41Z — setup start gate seed loosened
- Canonical setup transition start condition sets now seed `groupsJson: []`, preserving the row itself while removing preconditions so setup can start without requiring `project_kind` first.

### 2026-04-17T11:06Z — item-level target binding without action redesign
- The minimal backward-compatible way to preserve grouped action UX is to keep action-level target metadata as the default and add an optional item-level target override in methodology persistence. Runtime can then resolve effective targets per item while existing actions continue to behave exactly as before.
- `affectedTargetsJson` was already the right runtime persistence boundary; enriching it with per-item presence state avoided any new runtime tables while still giving detail/web surfaces enough information to render missing vs resolved targets.
