# Module Observability Contract (Effect + OpenTelemetry)

This document is mandatory for all module implementations.

Every module must implement observability from day 1 and must be reviewed against this contract before a module is marked complete.

## Scope

Applies to all core modules:

- `workflow-engine`
- `agent-runtime`
- `tooling-engine`
- `variable-service`
- `event-bus`
- `provider-registry`
- `template-engine`
- `sandbox-engine`

And any new module added later.

## Required Signals

Each module must emit all four signals:

1. Logs (structured)
2. Metrics
3. Traces
4. Supervisor-based fiber monitoring

## Required Attributes (Common Keys)

All logs/metrics/traces must include as many of these as applicable:

- `module.name`
- `module.operation`
- `workflow.execution_id`
- `workflow.id`
- `workflow.step_id`
- `workflow.step_type`
- `agent.kind`
- `agent.id`
- `tool.name`
- `tool.call_id`
- `project.id`
- `user.id`
- `error.type`
- `error.message`

## Logging Contract

- Use Effect logging APIs from module services only.
- Logs must be structured and machine-readable.
- Minimum log points:
  - operation start
  - operation success
  - operation failure
  - external call start/end/failure
  - decode failure at boundary

## Metrics Contract

Minimum metrics for every module:

- `module_requests_total` (counter)
- `module_failures_total` (counter)
- `module_operation_duration_ms` (histogram)

Module-specific metrics should be added where relevant (example: `approval_wait_ms`, `agent_tool_calls_total`).

## Tracing Contract

- Every public module operation must open a span.
- Nested operations must use child spans.
- External I/O must be inside dedicated spans.
- Errors must be recorded on active spans.

### Naming Convention

- Root span: `module.<module-name>.<operation>`
- Child spans: `module.<module-name>.<operation>.<sub-op>`

Examples:

- `module.workflow-engine.execute`
- `module.workflow-engine.step.run`
- `module.agent-runtime.run`
- `module.tooling-engine.execute-tool`

## Supervisor Contract

- Long-running module flows must run under an Effect `Supervisor`.
- Supervisor snapshots must be exportable for debugging stuck fibers.
- At minimum, monitor:
  - active fiber count
  - long-running fibers over threshold

## Boundary Rules (Non-Negotiable)

- Decode all external input at boundaries (`unknown` -> typed via Effect Schema).
- Emit observability events at boundary decode failures.
- Do not emit ad-hoc strings as errors without structured attributes.

## Layering Rules

- Module internals depend on Effect service Tags.
- OpenTelemetry exporter wiring belongs in composition layers (app/server), not inside module internals.
- Modules must remain exporter-agnostic.

## Definition of Done (Observability Gate)

A module is not complete until all checks pass:

1. Public operations have spans.
2. Structured logs exist for start/success/failure.
3. Required metrics are emitted.
4. Boundary decode failures are observable.
5. Supervisor coverage exists for long-running flows.
6. Unit tests verify key observability behavior.

## Implementation Checklist (Use During Every Module Build)

- [ ] Added module span names and attributes
- [ ] Added structured log points
- [ ] Added base metrics + module metrics
- [ ] Added boundary decode + failure logging
- [ ] Added supervisor wiring for long-running fibers
- [ ] Added tests for observability hooks
- [ ] Reviewed this document before merge

## Module Testing and Isolation Guidance

The architecture is intentionally designed for isolated module testing:

- Services use Effect Tags + Layers, so dependencies can be replaced with test layers.
- Time-based logic can be tested deterministically with `TestClock`.
- State and async coordination can be tested with Effect test utilities.
- External SDKs stay behind service interfaces, enabling module-only tests.

This is a core speed multiplier: bugs found in app-level tests can be reproduced and fixed at module scope with deterministic tests.

## References

- Effect software guide: https://www.effect.solutions/
- Effect quick start: https://www.effect.solutions/quick-start
- Agent-guided setup instructions: https://www.effect.solutions/quick-start#agent-guided-setup
- Effect Solutions CLI:
  - Install: `bun add -g effect-solutions@latest`
  - Topics list: `effect-solutions list`
  - Show topics: `effect-solutions show project-setup tsconfig`
- Effect logging: https://effect.website/docs/observability/logging/
- Effect metrics: https://effect.website/docs/observability/metrics/
- Effect tracing: https://effect.website/docs/observability/tracing/
- Effect supervisor: https://effect.website/docs/observability/supervisor/
- Effect TestClock: https://effect.website/docs/testing/testclock/
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/concepts/semantic-conventions/
