# L3 Plan G — Agent-Step Runtime + UI Refinement

## TL;DR
> **Summary**: Refine Agent-step behavior and UX around dynamic context safety, stream/write observability, and operator clarity at session start.
> **Depends on**: Plan B (fact hardening) + Plan D (UI rulebook)
> **Effort**: L

## Objectives
- Prevent invalid dynamic context mutations (especially draft-spec/key drift).
- Improve real-time linkage between stream events, tool calls, and persisted writes.
- Improve agent session-start guidance about MCP capabilities/constraints.
- Polish Agent-step runtime UI clarity and flow.

## Must Have
- Hardened runtime validation for dynamic context-key additions.
- Deterministic write-list/tool-call correlation in runtime UI.
- Session bootstrap guidance contract for agent MCP tool behavior.
- Consistent streaming/status UX for Agent-step execution views.

## Must NOT Have
- No broad harness protocol redesign outside this scope.
- No reintroduction of weak raw-write acceptance paths.

## TODOs
- [ ] 1. Add characterization tests for current dynamic context mutation edge-cases.
- [ ] 2. Enforce runtime validation preventing unauthorized key insertion.
- [ ] 3. Normalize stream-to-write correlation model and UI rendering.
- [ ] 4. Add/standardize session-start MCP guidance payload and UI exposure.
- [ ] 5. Refine Agent-step runtime screens with Plan D conventions.
- [ ] 6. Validate e2e agent-step execution + write safety flows.

## Acceptance Gates
- agent-step runtime/service/router tests pass
- invalid dynamic key writes are rejected deterministically
- stream/tool/write linkage visible and consistent in runtime UI
- no regression in existing agent-step execution journeys
