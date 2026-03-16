# Chiron Module Lock Matrix v1 (Week 6)

Date: 2026-02-18
Status: Active lock matrix for reset + rebuild

## Contract Strategy (Answer to "story-level only?")

Yes, contracts can be derived from documentation, but do not defer all contract definition to story-level implementation.

Use this split:

1. **Lock contract boundaries now (docs + base Effect schemas)**
   - module interfaces
   - key JSON payload shapes
   - transition/gate semantics
2. **Implement and tighten per story**
   - add concrete schema refinements
   - add decoders/validators in runtime paths
   - add contract tests

This prevents architecture drift during high-velocity story implementation.

## Lock States

- `Locked`: boundary and dependency direction fixed.
- `Near-Lock`: boundary fixed, internals still being finalized.
- `Open`: unresolved decision(s) still blocking implementation.

## Module Lock Matrix

| Module | Primary Role | Lock State | Dependency Direction (target) | What is locked now | What remains to lock | Owner | Lock By |
|---|---|---|---|---|---|---|---|
| `apps/server` | Hono transport + oRPC + SSE bridge | Locked | depends on `@chiron/api` only for app logic | Hono+oRPC+SSE is canonical transport | endpoint naming details | Dev Lead | Week 6 |
| `packages/api` | composition boundary | Near-Lock | depends on contracts/workflow-engine/auth/db; avoid deep runtime internals | API should be transport/composition, not runtime internals | remove direct `agent-runtime/*` internal coupling | Architect + Dev | Week 6 |
| `packages/contracts` | Effect schema contracts | Near-Lock | foundational, imported by all backend modules | contract-first direction, core schemas added | tighten remaining broad JSON schemas + decoder entrypoints | Architect + Dev | Week 6 |
| `packages/db` | SQLite persistence | Near-Lock | depends on contracts | SQLite-only decision locked | finalize methodology tables + transition binding tables + script updates | Dev | Week 6 |
| `packages/methodology-engine` (new) | work units/transitions/gates/slots | Near-Lock | depends on contracts/db/variable-service | module boundary and responsibilities locked | add package + service interfaces + first implementation slice | Architect + Dev | Week 6 |
| `packages/workflow-engine` | step orchestration runtime | Locked | depends on contracts + runtime/tooling/variable/event services | 6-step contract boundary locked | swap in methodology-gated transition flow | Dev | Week 7 |
| `packages/agent-runtime` | model execution runtime (AI SDK + OpenCode) | Near-Lock | depends on contracts + provider-registry | dual runtime executor role locked | provider resolution should come from registry only | Dev | Week 7 |
| `packages/provider-registry` | provider/model policy + selection | Near-Lock | depends on contracts/db | ownership of provider policy/capabilities/credentials locked | implement runtime services and accounting path | Architect + Dev | Week 7 |
| `packages/tooling-engine` | approval/policy side-effect orchestration | Near-Lock | depends on contracts + sandbox/provider/variable | boundary responsibility locked | implement action execution policy path | Dev | Week 7 |
| `packages/sandbox-engine` | worktree + git service | Near-Lock | depends on contracts | git boundary ownership locked (adapter inside sandbox) | move `simple-git` ownership here + implement service | Dev | Week 7 |
| `packages/variable-service` | scoped variable operations | Near-Lock | depends on contracts/db/event-bus | variable boundary direction locked | unify scopes with methodology variable definitions | Dev | Week 7 |
| `packages/template-engine` | prompt/template compose + receipts | Near-Lock | depends on contracts/variable-service | boundary role locked | implement strict compose/receipt path | Dev | Week 8 |
| `packages/event-bus` | ephemeral event transport | Locked | depends on contracts/effect | ephemeral-only transport decision locked | implementation extraction + integration | Dev | Week 8 |
| `packages/ax-engine` | optimization/recommendation engine | Near-Lock | depends on contracts/provider-registry | separate module + explicit promotion policy locked | defer advanced loops; implement minimal recommendation path later | Dev | Week 9 |
| `packages/auth` | auth boundary | Locked | depends on db | Better-Auth boundary stable | minimal alignment updates only | Dev | Week 6 |
| `packages/scripts` | seed/import tooling | Near-Lock | depends on db/auth/contracts | BMAD seed folder + mapping scaffolds added | switch metadata bridge to real transition-binding tables | Dev | Week 7 |
| `apps/web` | frontend shell + workflow UX | Near-Lock (deferred) | depends on api contracts | typography/aesthetic/frontend stack direction locked | defer major implementation until backend spine stabilizes | UX + Dev | Week 8 start |

## Hard Rules During Migration

1. No new cross-module concrete imports that violate target dependency direction.
2. No third gate type; only `start_gate` and `completion_gate`.
3. No second DB track; SQLite only for this horizon.
4. No direct git operations outside sandbox/tooling boundary.
5. Contracts evolve by story, but boundary contract shape cannot drift without matrix update.

## Immediate Next Stories from Matrix

1. API decoupling story: remove deep `agent-runtime/*` imports from `packages/api`.
2. DB story: implement methodology + transition binding tables in SQLite schema.
3. Methodology-engine story: scaffold package + gate service interfaces.
4. Sandbox story: move git adapter ownership into sandbox-engine.
