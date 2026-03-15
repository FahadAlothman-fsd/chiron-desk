# Agent-Driven Testing Governance

Date: 2026-03-15

## Purpose

Define how agent-driven validation fits into the testing lifecycle **without modifying `_bmad/` workflows**.

This governance complements (not replaces) deterministic automated testing.

## Scope

- Monorepo apps and packages:
  - `apps/web`
  - `apps/desktop`
  - `apps/server`
  - `packages/*`
- Review/validation stage policy for stories and pull requests.

## Non-Goals

- No changes to BMAD internals under `@_bmad/`.
- No replacement of deterministic test gates with agentic checks.

## Lifecycle Position

Target operating model:

1. **create-story**
   - Defines acceptance criteria (AC), scope, and test expectations.
2. **dev-story**
   - Implements feature + deterministic tests.
   - Runs local deterministic gates before handoff.
3. **code-review**
   - Verifies AC coverage and deterministic evidence.
   - Runs agent-driven validation after deterministic checks pass.

## Gate Order (Mandatory)

Agent-driven validation is only allowed after deterministic gates are green.

### Gate A — Deterministic (blocking)

- Unit/integration suites (Vitest / Effect-Vitest where applicable)
- Layout guardrail:

```bash
bun run test:layout:guardrail
```

- Workspace deterministic validation:

```bash
bun run test
```

### Gate B — Browser deterministic (blocking when e2e is in scope)

```bash
bun run test:e2e
```

### Gate C — Agent-driven review validation (initially advisory)

- Story-driven scenario walkthroughs via Playwright MCP/session-based execution.
- Produces evidence artifacts and notes tied to AC IDs.
- Must not override failures from Gate A/B.

## Story Review Requirements

For each reviewed story/PR, provide:

1. Deterministic evidence
   - Commands run
   - Pass/fail summary
   - Relevant artifact links (reports/traces/logs)
2. AC mapping
   - AC list with status (`pass`, `fail`, `partial`, `not-tested`)
3. Agent-driven notes
   - Scenario tested
   - Observed behavior
   - Risk classification (`low`, `medium`, `high`)
   - Follow-up actions

## Evidence Template

Use this structure in review notes (PR comment or linked markdown):

```md
## Validation Summary

### Deterministic Gates
- `bun run test:layout:guardrail` → PASS
- `bun run test` → PASS
- `bun run test:e2e` → PASS/NOT_IN_SCOPE

### AC Coverage
- AC-1: PASS (deterministic + agent-driven)
- AC-2: PASS (deterministic only)
- AC-3: PARTIAL (agent-driven found UX ambiguity)

### Agent-Driven Validation
- Scenario: <name>
- Result: PASS/FAIL/PARTIAL
- Notes: <key observations>
- Artifacts: <trace/screenshot/video/report links>

### Risks / Follow-ups
- <item>
```

## Ownership by Layer

- `apps/web`: browser/component/E2E journeys and UI behavior
- `apps/desktop`: Electron-specific runtime boundary checks (boot/preload/IPC/packaged launch)
- `apps/server`: service/API/integration behavior
- `packages/contracts`: contract/schema compatibility
- `packages/*`: core unit/integration correctness

## Rollout Plan (Epics 6–7)

### Epic 6 (Advisory)

- Keep deterministic gates blocking.
- Run agent-driven validation as **non-blocking advisory** in code review.
- Collect false-positive/false-negative calibration data.

### Late Epic 6 / Early Epic 7 (Progressive enforcement)

- Promote stable agent-driven checks to required review evidence.
- Keep deterministic gates as the hard blocker.
- Enforce evidence presence via CI/policy outside `_bmad` (scripts/checks/branch protection).

## Integration Constraint

BMAD command wrappers currently pass through to `_bmad` workflow definitions.
Therefore:

- Process enforcement is implemented in repository policy/docs/scripts/CI configuration.
- BMAD workflow semantics remain unchanged unless `_bmad` is intentionally revised later.
