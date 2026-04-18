# Issues & Blockers

## Active Issues

### 2026-04-17T03:04Z — T13 follow-up verification status
- `bun run check-types` still fails outside T13 scope in `apps/server/src/index.ts`, `apps/server/src/mcp/route.ts`, `packages/agent-runtime/src/opencode-harness-service.ts`, `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`, `packages/sandbox-engine/src/services/sandbox-git-service.ts`, and several agent/runtime guidance services. The Plan-A-touched invoke files fixed in T13 no longer appear in the root failure set.
- `bun run test` still fails outside T13 scope in `packages/methodology-engine/src/tests/versioning/version-service.test.ts` (publish/versioning expectations) and two long-running seed tests in `packages/scripts/src/tests/seeding/l3-brainstorming-demo-fixture.test.ts` and `packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts` (timeouts at 5000ms).
- Resolved in T13 follow-up: stale deferred/boundary/query-key/desktop packaging tests now align with current Plan A Action + Branch + Invoke surfaces.

### 2026-04-17T03:18Z — T13 continued root-hardening pass
- Fixed additional repo-surface typing and stale test harness issues in `apps/server`, `packages/agent-runtime`, `packages/db`, and `packages/workflow-engine` (SSE harness error shaping, MCP structuredContent narrowing, harness config typing, harness binding JSON typing, invoke target typing, and several agent-step/runtime exact-optional fixes).
- Resolved more stale tests: web runtime query-key separation and methodology-engine L3 workflow-editor service wiring now pass.
- Remaining blockers are narrower but still active: root `check-types` is still blocked mainly by `packages/sandbox-engine/src/services/sandbox-git-service.ts` plus downstream server/runtime consumers, and root `test` is still blocked mainly by `packages/methodology-engine/src/tests/versioning/version-service.test.ts` publish-flow fixtures/expectations.

### 2026-04-17T04:16Z — T13 F2 blocker verification status
- Scoped fixes and targeted regressions passed for contracts, methodology-engine, db condition-validator coverage, and the web Action editor route.
- Root `bun run check-types` still fails outside this strict Plan A slice in `apps/server/src/mcp/route.ts`, `packages/agent-runtime/src/opencode-harness-service.ts`, `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`, `packages/sandbox-engine/src/services/sandbox-git-service.ts`, and several workflow-engine agent-step runtime services.
- Root `bun run test` still fails outside this slice in `apps/desktop/src/tests/packaging/server-build-config.test.ts` (missing built server artifact) and a resulting web worker `EPIPE`; root `bun run build` passes.

### 2026-04-17T04:24Z — T13 branch web authoring subset lock
- Branch authoring in web now filters operator exposure to the Plan A subset only; targeted web route coverage passes for `workflow-editor-invoke-branch.integration` plus the unaffected `action-step-editor` regression.

### 2026-04-17T03:17Z — setup branch seed insertion blocker
- The unresolved `route-setup-followups` branch step was not an ID-authoring mismatch in `setup-invoke-phase-1-fixture.ts`; the seeded branch rows already matched both draft and active step IDs.
- Actual blocker: `packages/scripts/src/manual-seed.mjs` inserted runtime workflow steps but omitted branch-step, branch-route, branch-group, and branch-condition runtime fixture tables, so repo joins for `getWorkflowEditorDefinition` / `getBranchStepDefinition` could not resolve setup branch definitions after seeding.

### 2026-04-17T03:28Z — setup action seed insertion blocker
- The unresolved `propagate-setup-context` action step was also already authored correctly for both draft and active in `setup-invoke-phase-1-fixture.ts`; the break was in manual runtime-fixture persistence.
- `packages/scripts/src/manual-seed.mjs` omitted action-step, action-row, and action-item runtime fixture tables, and the row filter lacked explicit `actionStepId` / `actionRowId` coverage, so design-time action-step resolution could not load seeded setup action definitions reliably.

### 2026-04-17T03:28Z — propagation persisted only synthetic ids
- Runtime action propagation was rewriting external context facts with synthetic `generated:*` ids but never creating backing fact-instance rows, so setup propagation looked successful in action-execution tables while leaving `project_fact_instances` / `work_unit_fact_instances` empty.
- Fixed by persisting missing external instances during action execution for both `definition_backed_external_fact` and `bound_external_fact`, then rewriting workflow context facts with the real persisted instance ids; artifact-reference propagation stayed unchanged.

### 2026-04-17T04:27Z — setup propagation target collision
- Root cause was setup fixture authoring: `requires_brainstorming`, `requires_research`, and `branch_note` were three item rows hanging off one propagation action row, so runtime correctly reused one action-level affected-target set for all three items.
- Fixed at authoring level by splitting those logical targets into separate setup action rows/context-fact mappings and promoting `branch_note` to a definition-backed setup fact so branch-note routing can keep using propagated external-fact context without changing runtime action semantics.

### 2026-04-17T11:06Z — per-item propagation target binding
- Actual fix replaced the split-action workaround with optional item-level `targetContextFactDefinitionId` persistence and runtime fallback to the action-level target. Grouped actions can now keep one visual/action group while sibling items resolve distinct target facts.
- Runtime now computes/persists affected targets per item, stores real ids after external-fact materialization, and detail/web payloads expose item-level target presence (`exists|missing`) without changing artifact propagation semantics.

### 2026-04-17T08:34Z — definition-backed preview false missing
- False `Missing` badges came from preview-only detail rendering treating every external target like a bound target and requiring `factInstanceId` even for definition-backed facts that already had usable context values and can be created at run time.
- Fixed preview heuristics so definition-backed targets show `exists` when a usable context value row is present, while bound targets stay strict on existing bindings; web item cards now expose each item target context key and render stronger green/rose target-state emphasis without changing grouped action structure.

## Resolved Issues

### 2026-04-17T00:24Z - T13 strict-scope verification note
- Strict Plan A scope remains Action + Branch + narrow gate overlap only. Harness/MCP/sandbox work and agent-runtime hardening remain deferred and out of scope for strict Plan A.
- Latest verification outcome at repo root: `bun run check-types` failed, `bun run test` failed, `bun run build` passed.
- Current root failures are out-of-scope or external to strict Plan A and should not block T13 closure for the scoped Action/Branch/gate slice. Concrete failing paths observed in the latest verification set include `apps/server/src/mcp/route.ts`, `packages/agent-runtime/src/opencode-harness-service.ts`, `packages/db/src/runtime-repositories/agent-step-execution-harness-binding-repository.ts`, `packages/sandbox-engine/src/services/sandbox-git-service.ts`, `packages/workflow-engine/src/services/runtime/agent-step-*`, and desktop test `apps/desktop/src/tests/packaging/server-build-config.test.ts` which still expects a built server artifact.
- Targeted Plan A suites remained green: `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-alignment.test.ts`, `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts`, `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "action runtime"`, `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "branch runtime"`, `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts`, `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx --reporter=verbose`, `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx --reporter=verbose`, and `bunx vitest run apps/web/src/tests/routes/runtime-branch-step-detail.test.tsx`.
