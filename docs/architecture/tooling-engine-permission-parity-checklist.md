# Tooling Engine Permission Parity Checklist

**Last Updated:** 2026-02-09  
**Status:** Active drift-control checklist

This checklist tracks implementation parity for the OpenCode-inspired permission model in `@chiron/tooling-engine` and its integrations.

## Current Gap (Verified)

- Tooling-engine package is scaffold-level while plan-level architecture is detailed.
- Agent runtime tooling bridge is placeholder and does not enforce final permission flow.
- Approval behavior is split across legacy and new paths.

## Target Behavior

1. One permission gateway model for all tool/action execution paths.
2. Ruleset model uses `allow | ask | deny` with wildcard pattern matching.
3. Reply model supports `once | always | reject`.
4. Permission decisions are persisted and auditable.
5. Both `@chiron/agent-runtime` and `@chiron/workflow-engine` consume the same tooling-engine permission service.

## Invariants To Enforce

- **Single Gateway:** no competing approval/permission systems for the same execution path.
- **Deterministic Resolution:** last matching rule wins for `(permission, pattern)`.
- **Replayable Audit:** request, decision, and execution outcome are recorded.
- **Session Consistency:** reject behavior handles all pending requests for that session consistently.

## Implementation Checklist

### A) Contracts And Schema

- [ ] Ensure permission contracts exist in `@chiron/contracts` (`PermissionAction`, `PermissionRule`, `PermissionRuleset`, `PermissionReply`).
- [ ] Ensure tooling-engine request/reply payloads use contract schemas.

### B) Core Permission Service

- [ ] Implement permission evaluator with wildcard matching and last-match-wins.
- [ ] Implement `ask` flow with `Deferred` pending request tracking.
- [ ] Implement reply handling for `once`, `always`, and `reject`.
- [ ] Implement `always` behavior that persists allow rules for future matching.

### C) Persistence And Audit

- [ ] Persist permission requests and replies in DB (dedicated requests table if needed).
- [ ] Persist audit records (decision actor, timestamp, context, outcome).
- [ ] Persist user/project permission settings and presets.

### D) Integration Wiring

- [ ] `@chiron/agent-runtime` tooling bridge forwards through tooling-engine service.
- [ ] `@chiron/workflow-engine` action execution forwards through tooling-engine service.
- [ ] Remove legacy duplicate approval paths once parity is achieved.

### E) API And Security

- [ ] Add/verify authenticated endpoints for permission reply flows.
- [ ] Add rate limiting and abuse guards for permission endpoints.
- [ ] Enforce timeout behavior for pending permission requests.

### F) Test Gates

- [ ] Rule resolution tests (exact, wildcard, precedence, default).
- [ ] `once|always|reject` behavior tests (including cascade semantics).
- [ ] Persistence tests for request/reply/audit records.
- [ ] End-to-end tests via agent-runtime and workflow-engine integration paths.

## Cutover Gate

Cut over only when all are true:

- [ ] Tooling-engine permission service is used by both runtime and workflow action paths.
- [ ] Legacy duplicate approval logic is removed or fully disabled.
- [ ] Security checks for permission APIs are in place.
- [ ] Integration and regression tests pass.

## Ownership

- Permission model implementation: `@chiron/tooling-engine`
- Runtime integration: `@chiron/agent-runtime`, `@chiron/workflow-engine`
- API/security integration: `@chiron/api`
- Persistence/audit schema support: `@chiron/db`
