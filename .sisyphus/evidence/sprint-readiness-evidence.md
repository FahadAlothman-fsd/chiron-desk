# Sprint Readiness Evidence

- Generated: 2026-02-23T22:44:28+03:00
- Workspace: `/home/gondilf/Desktop/projects/masters/chiron`

## Gate 1 - Install

- Command: `bun install`
- Result: PASS

```text
bun install v1.3.9 (cf6cdbbb)

Checked 639 installs across 817 packages (no changes) [13.00ms]
```

## Gate 2 - Typecheck

- Command: `bun check-types`
- Result: PASS

```text
$ turbo check-types
• turbo 2.8.10
• Packages in scope: @chiron/agent-runtime, @chiron/api, @chiron/auth, @chiron/ax-engine, @chiron/config, @chiron/contracts, @chiron/db, @chiron/env, @chiron/event-bus, @chiron/methodology-engine, @chiron/provider-registry, @chiron/sandbox-engine, @chiron/scripts, @chiron/template-engine, @chiron/tooling-engine, @chiron/variable-service, @chiron/workflow-engine, server, web
• Running check-types in 19 packages
• Remote caching disabled
web:check-types: cache miss, executing b437d737ca0aaa2b
server:check-types: cache miss, executing c6910168c500f438
web:check-types: $ tsc --noEmit
server:check-types: $ tsc -b

 Tasks:    2 successful, 2 total
Cached:    0 cached, 2 total
  Time:    2.571s
```

## Gate 3 - Lint+Format

- Command: `bun check`
- Result: PASS

```text
$ oxlint && oxfmt --check
Found 0 warnings and 0 errors.
Finished in 22ms on 54 files with 93 rules using 16 threads.
Checking formatting...

All matched files use the correct format.
Finished in 806ms on 208 files using 16 threads.
```

## Gate 4 - Test Baseline

- Command: `bun run test`
- Result: PASS

```text
$ turbo test
• turbo 2.8.10
• Packages in scope: @chiron/agent-runtime, @chiron/api, @chiron/auth, @chiron/ax-engine, @chiron/config, @chiron/contracts, @chiron/db, @chiron/env, @chiron/event-bus, @chiron/methodology-engine, @chiron/provider-registry, @chiron/sandbox-engine, @chiron/scripts, @chiron/template-engine, @chiron/tooling-engine, @chiron/variable-service, @chiron/workflow-engine, server, web
• Running test in 19 packages
• Remote caching disabled
@chiron/api:test: cache hit, replaying logs cf0dacea4a3613d3
@chiron/api:test: $ vitest run
@chiron/api:test:
@chiron/api:test:  RUN  v3.2.4 /home/gondilf/Desktop/projects/masters/chiron/packages/api
@chiron/api:test:
@chiron/api:test:  ✓ |api| src/__tests__/smoke.test.ts (1 test) 1ms
@chiron/api:test:
@chiron/api:test:  Test Files  1 passed (1)
@chiron/api:test:       Tests  1 passed (1)
@chiron/api:test:    Start at  22:10:47
@chiron/api:test:    Duration  212ms (transform 25ms, setup 0ms, collect 14ms, tests 1ms, environment 0ms, prepare 65ms)
@chiron/api:test:

 Tasks:    1 successful, 1 total
Cached:    1 cached, 1 total
  Time:    220ms >>> FULL TURBO
```

## Gate 5 - oRPC Smoke

- Command: `curl -s -X POST http://localhost:3000/rpc/healthCheck`
- Result: PASS
- Reason: Output contains `OK`

```text
{"json":"OK"}
```

## Gate 6 - SSE Smoke

- Command: `curl -N http://localhost:3000/sse/smoke 2>&1 | head -5`
- Result: PASS

```text
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
  0     0    0     0    0     0      0      0 --:--:-- --:--:-- --:--:--     0event: tick
data: {"tick":0,"ts":1771875831045}
id: 0
```

## Gate 7 - Doc Alignment

- Command: `grep -ril 'trpc' _bmad-output/planning-artifacts/*.md docs/**/*.md 2>/dev/null`
- Result: FAIL
- Reason: Command returned non-empty output

```text
_bmad-output/planning-artifacts/reset-baseline-checklist.md
docs/archive/bmm-workflow-status-v6-alpha.md
docs/archive/epic-1/STORY-1-8-FINAL-STATUS.md
docs/archive/epic-1/STORY-1-8-TEST-RESULTS.md
docs/archive/epics-v1-mastra-era/epic-1-foundation.md
docs/archive/epics-v1-mastra-era/epic-3-phase-2-planning.md
docs/archive/epics-v1-mastra-era/tech-spec-epic-1.md
docs/archive/migration-era/artifact-system-2026-01-08.md
docs/archive/migration-era/migration-plan-2026-01-08.md
docs/archive/migration-era/tech-spec-effect-workflow-engine.md
docs/archive/phase-3-solutioning/implementation-readiness-report-2025-11-03.md
docs/archive/phase-3-solutioning/next-session-context.md
docs/archive/planning-legacy/architecture/architecture-decisions.md
docs/archive/planning-legacy/architecture/chiron-modules.md
docs/archive/planning-legacy/architecture/core-execution-modules.md
docs/archive/planning-legacy/chiron-architecture-canonical-v1-week6.md
docs/archive/planning-legacy/chiron-prd-canonical-v1-week6.md
docs/archive/planning-legacy/PRD-legacy-prelock-week6.md
docs/archive/pre-epic-1-restart/1-3-project-crud-operations.md
docs/archive/pre-epic-1-restart/architecture-summary.md
```

## Final Gate Summary

- PASS: 5
- FAIL: 2
- Failing gates: 5 (oRPC smoke), 7 (doc alignment)
