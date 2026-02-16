# Variable Service Module Design

**Package:** `@chiron/variable-service`  
**Status:** Planned (scaffold-only package, inline implementation exists)

## Purpose

Own variable storage, resolution, and scoped state semantics for workflows/executions.

## Current Reality

- Standalone package is scaffold-only.
- Inline service in `@chiron/workflow-engine` supports `get/set/merge/resolveTemplate/resolveObject`.
- Persistence and audit are represented in DB (`variables`, `variable_history`) but not fully unified in standalone runtime.

## MVP Responsibilities

- Canonical variable operations: `get`, `set`, `merge`, `resolveTemplate`, `resolveObject`.
- Scope model for `global`, `project`, `execution`, and `step` with deterministic precedence.
- Emit variable-change events to event bus.
- Preserve audit records through DB adapter.

## Phase 2 Responsibilities

- Project/global scope layering.
- Revert helpers based on `variable_history`.
- Schema-aware typed variables for critical keys.

## Effect Service Shape (Target)

- `get(key, scope?) -> Effect<Option<Value>>`
- `set(key, value, source) -> Effect<void>`
- `merge(values, source) -> Effect<void>`
- `resolveTemplate(template, context?) -> Effect<string>`

## Locked Policy Baseline (2026-02-09)

- **Read fallback order:** `step -> execution -> project -> global` (first match wins)
- **Write default:** if scope is omitted, write to `execution`
- **Write permissions:**
  - `step` and `execution`: allowed during runtime
  - `project` and `global`: explicit operations only, policy-gated
- **Lifetime semantics:**
  - `step`: scoped to a single step execution attempt
  - `execution`: scoped to one workflow execution
  - `project/global`: persistent scopes
- **Promotion rule:** step outputs are staged in step scope, only explicit outputs are promoted to execution scope
- **Template mode:** strict mode by default for runtime execution; relaxed mode only for previews/tooling
- **Merge semantics:** scalar replace, object deep merge, array replace

## Revert Coupling (Impact-Aware)

- Variable state participates in revert classification.
- If no persisted boundary is crossed after target checkpoint, revert is `session_rewind` (no new step revision).
- If persisted variable/tool/action/git/approval effects are crossed, revert is `step_revision`.
- Reverts preserve history and append audit entries; they do not delete prior records.

## Dependencies

- `@chiron/contracts` (variable payload schemas)
- `@chiron/event-bus`
- `@chiron/db` (live adapter)

## Observability Surface (Locked)

### Key Events

- `variable.get`
- `variable.set`
- `variable.merge`
- `variable.promote`
- `variable.revert`
- `variable.scope.violation`
- `variable.template.resolve`

### Critical Metrics

- `module_requests_total` (get/set/merge/resolve operations)
- `module_failures_total` (scope, decode, persistence failures)
- `module_operation_duration_ms` (operation latency)
- `variable_service_scope_violations_total`
- `variable_service_promote_total`
- `variable_service_revert_total`

### Required Span Names

- `module.variable-service.get`
- `module.variable-service.set`
- `module.variable-service.merge`
- `module.variable-service.resolve-template`

### Sensitive Data Rules

- Do not log variable values.
- Emit variable keys, scopes, and type metadata only.
- Redact free-text variable payloads before persistence/export.

## Open Decisions

- None for phase 1.
