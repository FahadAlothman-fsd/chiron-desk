# Slice-A Seeding Issues & Blockers

## Active Blockers
- None currently

## Resolved Issues
- None yet

## Watch List
- Ensure no workflow steps/edges are accidentally seeded
- Ensure condition sets and bindings don't get description/guidance
- Ensure no canonical payload lands in definition_extensions_json

## 2026-03-26 Task 3 Notes
- No active blockers encountered while refactoring dual-version seeding scaffolding and table module wiring.

## 2026-03-26 Task 4 Notes
- No active blockers encountered.
- Watchpoint verified in tests: draft and active versions now assert equal L1 canonical payloads (excluding row/version identity fields) to guard against future drift.

## 2026-03-26 Task 5 Notes
- No active blockers encountered while seeding Slice-A methodology agents.
- Added regression guardrails in integrity tests to fail if extra BMAD catalog agents appear, if metadata ownership shapes drift, or if persona/prompt content leaks `_bmad/` or `.md` source-path instructions.

## 2026-03-26 Task 6 Notes
- No active blockers encountered while seeding the `WU.SETUP` L2 packet.
- Guardrail added: integrity tests now fail if setup L2 rows drift from locked semantics (single done state, single activation→done transition, `setup_project` bound, `generate_project_context` unbound, fact-based completion gate).
- Watchpoint reconfirmed: setup L2 seeding intentionally keeps `methodology_workflow_steps` and `methodology_workflow_edges` empty.

## 2026-03-26 Task 7 Notes
- No active blockers encountered while seeding the `WU.BRAINSTORMING` L2 packet.
- Added deterministic integrity checks to block regressions on brainstorming workflow binding semantics (`brainstorming` bound; 10 advanced-elicitation workflows unbound).
- Added schema guardrails for brainstorming facts to prevent reintroduction of legacy `objective` and to enforce list-valued nested subfields on `selected_directions` and `constraints`.

## 2026-03-26 Task 8 Notes
- No active blockers encountered while seeding shared `WU.RESEARCH` L2 foundations.
- Watchpoint verified: research workflows (`market_research`, `domain_research`, `technical_research`) and research transition-workflow bindings remain intentionally unseeded for Task 9.
- Watchpoint verified: no workflow step/edge rows added; `methodology_workflow_steps` and `methodology_workflow_edges` remain empty.

## 2026-03-26 Task 9 Notes
- No active blockers encountered while seeding research workflow rows and transition-workflow bindings.
- Watchpoint verified: no research workflow step/edge rows were introduced.
- Guardrail verified via AST search: transition bindings and transition condition sets still have no `descriptionJson`/`guidanceJson` fields.

## 2026-03-26T06:24:45+03:00 Task 10 Notes
- No active blockers encountered while hardening deterministic integrity assertions.
- Observation: existing seed output already satisfied strengthened invariants; changes were assertion tightening only.
- Residual watchpoint: if future slices add canonical tables or workflow inventory, this test will fail by design until expected deterministic counts/order are intentionally updated.

## 2026-03-26T06:34:47+03:00 Task 11 Notes
- Added integration coverage without new blockers in test code changes.
- Verification blocker observed when running `bun run db:seed:test:reset`: local DB schema is behind current seed expectations (`methodology_agent_types.description_json` missing), and `drizzle-kit push` surfaced an interactive rename/create prompt before the seed run.
- Residual watchpoint: seed-reset verification remains environment-dependent until the target database schema is migrated to the current canonical column set.

## 2026-03-26T14:45:07+03:00 Task 11 Verification-Fix Notes
- Root cause confirmed: stale root `local.db` schema drift caused interactive drizzle rename prompt and downstream seed insert failure for `description_json`.
- Applied targeted mitigation in root `db:seed:test:reset` script: remove `local.db` before `db:push` so schema is created from current code without prompt.
- Residual watchpoint: this intentionally resets local test DB state for this command path; users relying on persistent data in `local.db` should use non-reset seed commands.

## 2026-03-26T14:55:42+03:00 F4 Scope Fidelity Audit
- **VERDICT: REJECT**
- In-scope delivered evidence confirmed:
  - Dual-version + Slice-A-only seeding metadata and table map are present (`packages/scripts/src/seed/methodology/index.ts`).
  - Setup + brainstorming + research L2 packets are present with deterministic per-version IDs and rows (`packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`).
  - Deterministic integrity and integration coverage exists for workflow inventory, reseed behavior, dual versions, extension guardrail, and step/edge absence (`packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`, `packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`).
  - Fresh verification passed: `bunx vitest run ...manual-seed-fixtures...methodology-seed-integrity...seed-error-handling...methodology-seed-integration` and `bun run db:seed:test:reset`.
  - AST checks found no non-empty seed arrays for deferred rows (`MethodologyWorkflowStepSeedRow[]`, `MethodologyWorkflowEdgeSeedRow[]`, `MethodologyTransitionRequiredLinkSeedRow[]`).
- **Blocking mismatch (scope-fidelity failure):**
  - Locked template semantic requires list-valued facts to render via iteration/block syntax; brainstorming template still interpolates list-valued fields as scalar expressions (`{{workUnit.facts.constraints.must_have}}`, `{{workUnit.facts.constraints.must_avoid}}`, `{{workUnit.facts.constraints.timebox_notes}}`, `{{workUnit.facts.selected_directions.primary_directions}}`, `{{workUnit.facts.selected_directions.quick_wins}}`, `{{workUnit.facts.selected_directions.breakthrough_concepts}}`) instead of `#each` loops (`packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts:1158`).
- Remediation recommendation (required before approval):
  - Update brainstorming artifact template rendering for all list-valued nested fields to block/iteration form (`#each`) and add explicit integrity assertions that fail on scalar interpolation regressions for those list-valued fields.

## 2026-03-26T14:56:19+03:00 F1 Plan Compliance Audit
- Verdict: REJECT
- Blocking finding 1: Task 2 is not fully compliant. The frontend route/editor layer still models and serializes condition-set guidance even though the plan locks condition sets and transition bindings to own neither `description` nor `guidance`. Evidence: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` includes `conditionSet.guidance` in fingerprints and mutation payloads, and `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx` still carries `guidance`/`description` gate draft state.
- Blocking finding 2: Definition of Done is not met because `bun run check` fails. Output reports format issues in 10 files, including `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`, `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`, and `packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`.
- Supporting evidence: `bunx vitest run ...manual-seed-fixtures.test.ts ...methodology-seed-integrity.test.ts ...seed-error-handling.test.ts ...methodology-seed-integration.test.ts` passed (27 tests); `bun run check-types` passed; `bun run db:seed:test:reset` passed after deleting `local.db` before `db:push`.

## 2026-03-26T16:46:43+03:00 Final-Wave Frontend Remediation Notes
- No active blocker encountered while removing condition-set and transition-binding guidance/description handling in frontend L2 authoring and baseline preview consumption paths.
- Verification caveat remains repository-global: `bun run check` still fails due pre-existing formatting drift in untouched `packages/scripts/**` files; targeted lint/format checks on changed frontend files pass.

## 2026-03-26T16:51:59+03:00 Final-Wave Brainstorming Template Iteration Fix Notes
- No active blocker encountered while replacing scalar interpolation with `#each` iteration for required list-valued nested brainstorming fields.
- Deterministic integrity checks now explicitly guard against regression to scalar interpolation for all six locked list-valued paths.
- Repository-wide verification caveat persists: `bun run check` fails from pre-existing formatting drift in multiple unrelated files already dirty in the workspace; `bun run check-types` and targeted seeding vitest suite pass.

## 2026-03-26T16:59:19+03:00 Final-Wave DoD Formatting Blocker Resolution Notes
- Blocker resolved: repository-wide `bun run check` now exits 0 after applying formatter-only writes with `bun run format`.
- No functional blockers surfaced during this pass; `bun run check-types` also exits 0 after formatting cleanup.
- Residual watchpoint: workspace still contains pre-existing non-format feature/test changes unrelated to this formatting sweep.

## 2026-03-26T17:09:58+03:00 F4 Scope Fidelity Check — deep (Re-run)
- **VERDICT: APPROVE**
- Re-validated prior blocker resolution: brainstorming artifact template now uses iteration for list-valued nested fields and no longer uses forbidden scalar interpolation for `constraints.must_have`, `constraints.must_avoid`, `constraints.timebox_notes`, `selected_directions.primary_directions`, `selected_directions.quick_wins`, `selected_directions.breakthrough_concepts` (`packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts:1169`).
- Re-validated guardrails in integrity tests: explicit positive `#each` assertions plus negative scalar interpolation assertions for the six required list-valued fields (`packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts:1231-1249`).
- Re-validated ownership boundaries: transition condition sets and transition-workflow bindings carry neither `description` nor `guidance` in contracts, schema, seed builders, and integrity assertions (`packages/contracts/src/methodology/lifecycle.ts`, `packages/db/src/schema/methodology.ts:344-502`, `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts:258-260,491-492,509-510,521-522`).
- Re-validated no step/edge scope creep: seeded workflow steps and workflow edges remain empty (`packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts:1767-1768`; integrity assertions at `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts:761-762`).
- Fresh verification rerun passed: `bun run check`, `bun run check-types`, targeted seeding vitest suite, and `bun run db:seed:test:reset`.

## 2026-03-26T17:10:04+03:00 F1 Re-Audit
- Verdict: APPROVE
- Previous blocker check: frontend condition-set/transition-binding guidance leakage is resolved in the rechecked frontend surfaces; condition sets and bindings are now modeled/serialized without description/guidance fields.
- Previous blocker check: `bun run check` now exits 0, so the prior formatting gate failure is resolved.
- Fresh verification in this re-audit: `bun run check-types`, `bun run check`, targeted seeding Vitest DoD command, and `bun run db:seed:test:reset` all exit 0.
- Scope note: `bun test` was not run in this gate and is not a Definition of Done requirement for this plan.

## 2026-03-26T17:47:50+03:00 F3 Real Manual QA Final-Wave Gate
- **VERDICT: REJECT**
- Frontend scope re-audited from diffs and source reads confirms condition-set/binding guidance-path removals are implemented in touched files:
  - Removed transition gate guidance/description authoring and serialization in `apps/web/src/features/methodologies/work-unit-l2/StateMachineTab.tsx`.
  - Removed condition-set `guidance` typing/serialization from `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`.
  - Removed condition-set/workflow guidance projection and rendering in `apps/web/src/features/projects/baseline-visibility.tsx`, `apps/web/src/routes/projects.$projectId.index.tsx`, and `apps/web/src/routes/projects.$projectId.transitions.tsx`.
- Fresh verification gates pass: `bun run check-types`, `bun run check`, and LSP diagnostics clean for all touched frontend TSX files above.
- Practical manual QA attempt executed with Playwright on a live local web runtime:
  - Started app and reached authenticated flows by creating a new operator account (login placeholders/accounts initially rejected).
  - Attempted to reach methodology work-unit state-machine surface; blocked because creating a new work unit failed server-side (`/rpc/methodology/version/workUnit/create` returned HTTP 500), preventing end-to-end validation of transition dialog render behavior in runtime.
  - Validated project dashboard and transitions routes rendering surfaces; both repeatedly emitted backend HTTP 500 errors from `/rpc/project/getProjectDetails`, leaving baseline/transition content in fallback/no-data states.
  - In fallback states, no `Workflow guidance`/`Transition guidance` UI blocks were present.
- Blocking finding:
  - Environment/runtime blocker prevents full manual confirmation of user-facing flow integrity for the affected state-machine + baseline transition readiness paths (repeated backend 500s on required APIs).

## 2026-03-26T17:45:20+03:00 F2 Code Quality Review — deep-category final-wave gate
- **VERDICT: APPROVE**
- Blocking findings: None.
- Former blocker closure revalidated:
  - Ownership leakage closed: transition condition sets and transition-workflow bindings remain without `description`/`guidance` ownership in seeded canonical rows, with integrity assertions enforcing absence.
  - List-iteration semantics closed: brainstorming template uses `#each`/block rendering for required list-valued nested fields; scalar interpolation regressions are explicitly blocked by integrity assertions.
- Fresh verification evidence (all pass): `bun run check-types`, `bun run check`, `bunx vitest run packages/scripts/src/tests/seeding/manual-seed-fixtures.test.ts packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts packages/scripts/src/tests/seeding/seed-error-handling.test.ts packages/scripts/src/tests/seeding/methodology-seed-integration.test.ts`, plus clean LSP diagnostics for changed TS/TSX surfaces.

## 2026-03-26T18:53:05+03:00 work_unit canonicalization task notes
- No active blocker in implementation scope; required `work_unit` support is wired through contracts/API/frontend/seed and downstream engine/project unions.
- Intermediate verification issue resolved: `bun run check-types` initially failed because `StateMachineTab` still restricted fact types to four legacy values; fixed by widening local `FactOption.factType` union to include `work_unit`.
- Residual watchpoint: workspace contains many unrelated pre-existing modifications; this change set was verified with targeted tests plus global `bun run check-types` and `bun run check` to ensure no regressions in touched surfaces.
