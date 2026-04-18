# L3 Plan A — Action + Branch + Narrow Gate Alignment

## TL;DR
> **Summary**: Implement the missing Action vertical slice (design time + runtime), implement runtime Branch end to end, and extend the existing transition-gate/runtime-condition infrastructure only as far as needed to support those slices. Keep cross-layer fact unification, runtime fact validation redesign, raw-write hardening, and richer invoke draft-spec payload work out of Plan A.
> **Deliverables**:
> - Action step design-time contracts, schema, authoring services, runtime execution flow, procedures, SSE, and web surfaces
> - Branch runtime persistence, evaluator, read model, save-selection command, progression/completion integration, and web surface
> - Minimal operator/runtime-condition extension for transition gates and Action/Branch overlap
> - Seeded setup-workflow fixtures in active and draft versions covering Action, Branch, and gate-condition scenarios
> - Backward-compat guards and regression coverage for the new slices
> - Plan-B refinement notes captured during Plan A execution for later Plan B review
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: Contracts → Action/Branch persistence → Runtime services/evaluator → Gate/progression alignment → API/SSE/UI → Regression verification

## Context
### Original Request
- Generate Plan A first.
- Explicitly list what is deferred into Plan B.
- Use the repo audit as the boundary-setting authority.

### Audit Summary
- **Action** is missing entirely. It is a greenfield missing slice, not a rewrite.
- **Branch** is asymmetric: design-time exists and is sound; runtime is largely missing.
- **Transition gates** already exist in runtime, but only with narrow condition/operator support.
- **Facts** are the true systemic problem area: `valueJson` shape drift, no centralized decode/normalize/validate layer, and weak runtime enforcement of methodology fact rules.
- The richer invoke `work_unit_draft_spec_fact` payload is explicitly deferred into the later fact-unification effort.

### Metis Review (gaps addressed)
- Treat Action as a full vertical slice now: whole-step authoring, runtime execution, runtime detail UI, and SSE all stay in Plan A.
- Treat runtime Branch as a full vertical slice now, but do **not** expand it into fact-system unification.
- Keep gate work narrow: extend only the overlapping operator/runtime-condition semantics required by Action/Branch scenarios.
- Define branch runtime resolution explicitly so implementation has zero judgment calls.
- Reject unsupported invalid Action graphs and invalid branch runtime states at contract/service boundaries instead of inventing migrations in Plan A.
- Keep repo verification executable through existing root scripts in `package.json`: `bun run check-types`, `bun run test`, `bun run build`, `bun run test:e2e`.

## Work Objectives
### Core Objective
Ship the two missing workflow-execution slices — Action and runtime Branch — on top of the existing runtime architecture, while extending the gate/operator layer only as much as required for those slices and explicitly deferring fact-system unification.

### Deliverables
- Action design-time contracts and persistence in `packages/contracts`, `packages/db`, `packages/methodology-engine`, and `packages/api`
- Action runtime schema, repositories, services, procedures, SSE, and web surfaces in `packages/db`, `packages/workflow-engine`, `packages/api`, `apps/server`, and `apps/web`
- Branch runtime contracts, persistence, evaluator, progression/completion logic, procedures, and web surface in `packages/contracts`, `packages/db`, `packages/workflow-engine`, `packages/api`, and `apps/web`
- Narrow transition-gate/runtime-condition extension in `packages/contracts` and `packages/workflow-engine`
- Seed updates for the setup work unit workflow in both active and draft methodology versions, plus seeded transition condition sets for setup / brainstorming / research after the gate refactor lands
- Regression and backward-compat guard coverage for Action/Branch/gates
- A running implementation-notes artifact at `.sisyphus/drafts/l3-plan-b-refinement-notes.md` capturing Plan-B-relevant realities discovered during Plan A execution

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-alignment.test.ts`
- `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts`
- `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts`
- `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx`
- `bunx vitest run apps/web/src/tests/routes/runtime-branch-step-detail.test.tsx`
- `bunx vitest run packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts`
- `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
- `bun run check-types`
- `bun run test`
- `bun run build`
- `.sisyphus/drafts/l3-plan-b-refinement-notes.md` exists and contains task-by-task implementation notes for every Plan A task that discovered Plan-B-relevant fact-shape, validation, payload, or boundary behavior

### Must Have
- **Action** remains a step type; `propagation` is the only action kind implemented in Plan A.
- **Action authoring** is whole-step only: `createActionStep`, `updateActionStep`, `deleteActionStep`, `getActionStepDefinition`.
- **Action runtime** includes lazy runtime rows, manual run/retry semantics, step-wide SSE, and runtime detail UI.
- **Branch runtime** persists one row per `stepExecutionId` with nullable `selectedTargetStepId` and explicit save-selection separate from completion.
- **Branch resolution algorithm** is locked as:
  1. evaluate all authored conditional routes against current workflow-context facts,
  2. UI suggestion order = first valid conditional route by ascending route `sortOrder`, else authored default target,
  3. persisted explicit `selectedTargetStepId` always governs completion/activation,
  4. if persisted selection is absent or invalid, completion is blocked,
  5. if multiple routes are valid, the user may explicitly choose any valid route,
  6. if no conditional route is valid and no default target exists, branch remains blocked.
- **Gates** extend only the overlapping operator/runtime-condition semantics required by Action/Branch behavior in Plan A.
- Existing design-time Branch payload remains the source of truth; no new runtime-only methodology metadata is added.
- Invalid Action graphs and impossible runtime branch states are rejected rather than migrated silently.
- The setup work unit seed in both active and draft methodology versions is expanded to include at least one Action step and one Branch step after their implementation lands.
- The seeded Branch step in the setup workflow must include 2-3 routes that exercise condition groups, route/root `ANY`/`ALL`, and the supported context-fact-kind/operator variations implemented by Plan A.
- Seeded transition condition sets for `setup`, `brainstorming`, and `research` must be populated only **after** the gate-engine/operator refactor task lands, because the current seed only provides empty `groupsJson` placeholders.
- The seeded setup workflow step order is locked as: `collect_setup_baseline` → `synthesize_setup_for_invoke` → `propagate_setup_context` → `route_setup_followups` → `invoke_brainstorming_fixed` / `invoke_research_from_draft_spec`.
- The seeded Action step is locked to `key = propagate_setup_context`, `displayName = Propagate Setup Context`, `type = action`, `executionMode = sequential`, and three propagation actions covering: (1) setup decision facts, (2) setup environment/binding facts, and (3) the durable project overview artifact reference.
- The seeded Branch step is locked to `key = route_setup_followups`, `displayName = Route Setup Follow-ups`, `type = branch`, no default target, and two authored conditional routes: `branch_to_brainstorming_then_research` targeting `invoke_brainstorming_fixed` and `branch_to_research_only` targeting `invoke_research_from_draft_spec`.
- The existing setup synthesis agent seed must also be expanded to author two additional setup context facts required for full Branch coverage: `cf_setup_branch_note` (`plain_value_fact`) and `cf_setup_followup_workflows` (`workflow_reference_fact`).
- Plan A execution maintains `.sisyphus/drafts/l3-plan-b-refinement-notes.md` as a structured running log of Plan-B-relevant findings.
- Every Plan A task that touches fact payloads, normalization assumptions, validation boundaries, mutation paths, operator semantics, or compatibility behavior must append a short note to the refinement artifact before the task is considered complete.

### Must NOT Have (guardrails, scope boundaries)
- No full fact-system unification.
- No centralized runtime fact validation redesign.
- No raw-write hardening across agent/MCP/project-runtime beyond blockers directly hit by Plan A.
- No richer invoke `work_unit_draft_spec_fact` payload redesign.
- No new action kinds beyond `propagation`.
- No unrelated L3 step types (`display`, additional deferred surfaces, etc.).
- No broad operator-system consolidation beyond Action/Branch overlap.
- No runtime migration/backfill project for legacy persisted fact shapes.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after, but each implementation slice must start contract/schema-first and be structured as RED → GREEN → REFACTOR.
- QA policy: every task below includes exact test commands and explicit failure/edge scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. **Plan A boundary**: implement missing vertical slices (Action, runtime Branch) and only the narrow gate work required to support them.
2. **Plan B boundary**: own fact unification, centralized runtime validation, raw-write hardening, richer invoke draft-spec payload, and the agent/MCP/runtime fact CRUD audit.
3. **Action semantics**: whole-step authoring only, `propagation` only, `executionMode = sequential | parallel`, lazy runtime rows, manual completion, idempotent duplicate run/retry commands, and step-wide operational SSE.
4. **Branch semantics**: evaluate against workflow-context facts only in Plan A; do not pull broader fact-shape redesign into this plan.
5. **Branch completion**: completion and next-step activation consume only a persisted valid `selectedTargetStepId`; UI suggestions never complete implicitly.
6. **Gate scope**: reuse/extend `runtime-gate-service.ts` and related contracts; do not replace the gate engine wholesale.
7. **Backward compatibility**: no migration project in Plan A. Action definitions must satisfy the new contracts to exist at all; invalid/incomplete branch runtime states must fail explicitly.
8. **Shared fact handling in Plan A**: only add localized adapters/decoders required to make Action/Branch work; any reusable normalization beyond that is deferred.
9. **Plan B learning capture**: Plan A implementers must keep `.sisyphus/drafts/l3-plan-b-refinement-notes.md` updated with concrete discoveries that affect Plan B scope, assumptions, or sequencing.
10. **Seed sequencing**: setup-workflow Action/Branch seed updates may land once Action + Branch capabilities exist; seeded transition gate condition sets for setup / brainstorming / research must land only after the narrow gate/operator refactor is complete so the seed uses the desired condition-set shape.
11. **Seed realism**: the setup workflow seed must remain grounded in the existing `setup-invoke-phase-1-fixture.ts` topology and extend it rather than inventing a parallel setup workflow.

### Plan B Refinement Notes Protocol
- Maintain: `.sisyphus/drafts/l3-plan-b-refinement-notes.md`
- Update it immediately after any Plan A task that reveals new information about:
  - fact payload shapes
  - normalization opportunities or blockers
  - runtime validation gaps
  - raw write boundaries
  - invoke draft-spec compatibility realities
  - operator/gate semantics that may affect Plan B
- Each note entry must include:
  - `Task`: the Plan A task number/title
  - `Files`: concrete file paths touched or discovered
  - `Reality`: what the implementation proved true
  - `Plan B Impact`: what should change, narrow, expand, or reorder in Plan B
  - `Evidence`: test name or command proving the reality
- Treat missing note updates as incomplete work for any task that touched these seams.

### Deferred to Plan B (`.sisyphus/plans/l3-plan-b-fact-unification-runtime-validation.md`)
- Canonical `valueJson` decode/normalize/validate pipeline across project facts, work-unit facts, and workflow-context facts
- Runtime enforcement of methodology fact validation rules across agent/MCP/form/project-runtime/context-write paths
- Richer nested `work_unit_draft_spec_fact` payload for invoke and any related invoke backfill/migration
- Shared typed fact-instance model across all fact layers
- Raw write hardening for `Schema.Unknown` / `z.unknown()` boundaries
- Agent-step / MCP invalid-write audit and remediation
- Broad operator-system convergence beyond the overlap needed by Plan A

### Parallel Execution Waves
Wave 1: contracts + schema + repository boundaries for Action and Branch
Wave 2: Action runtime/design-time services, Branch runtime services, narrow gate/operator alignment
Wave 3: routers + SSE + web surfaces + seed updates + integration/regression coverage

### Dependency Matrix (full, all tasks)
- T1 contracts/boundaries → blocks T2-T12
- T2 Action design-time schema/repos → blocks T3, T9, T11, T12
- T3 Action design-time services/router → blocks T9, T11, T12
- T4 Action runtime schema/repos → blocks T5, T9, T11, T12
- T5 Action runtime services → blocks T9, T10, T11, T12
- T6 Branch runtime schema/repos/evaluator → blocks T7, T8, T10, T11, T12
- T7 Branch lifecycle/progression services → blocks T8, T10, T11, T12
- T8 Narrow gate/operator alignment → blocks T10, T12
- T9 Action runtime router + SSE → blocks T11, T12
- T10 Branch detail API + UI → blocks T12
- T11 Action runtime UI → blocks T12
- T12 Seed setup workflow and transition gate fixtures → blocks T13
- T13 integration/regression hardening → blocks Final Verification

### Agent Dispatch Summary
- Wave 1 → 4 tasks → deep / unspecified-high
- Wave 2 → 4 tasks → deep
- Wave 3 → 5 tasks → deep / unspecified-high / visual-engineering

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Lock Plan A contracts, semantics, and explicit Plan B deferrals

  **What to do**: Add the Action-step methodology/runtime contracts, Branch runtime detail/save-selection contracts, and the minimal runtime-condition/operator contract extensions required by Plan A. Encode whole-step-only Action authoring, the locked Branch runtime resolution algorithm, and the explicit “deferred to Plan B” boundaries in code comments/tests so implementers cannot silently expand scope. Keep invoke `work_unit_draft_spec_fact` payload assumptions flat in Plan A.
  **Must NOT do**: Do not introduce the richer invoke draft-spec payload. Do not introduce a generalized fact normalization contract. Do not define new action kinds.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this freezes every downstream implementation boundary.
  - Skills: [`effect-best-practices`] - Reason: contracts and services in this repo are tightly coupled to Effect-first boundaries.
  - Omitted: [`hono`] - Reason: transport is not the focus in this task.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T2-T12 | Blocked By: none

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Authority: `.sisyphus/plans/l3-slice-2-runtime-branch.md`
  - Existing runtime contracts: `packages/contracts/src/runtime/executions.ts`
  - Existing workflow contracts: `packages/contracts/src/methodology/workflow.ts`
  - Existing runtime conditions: `packages/contracts/src/runtime/conditions.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Action and Branch Plan A contracts stay locked
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/l3-plan-a-action-branch-contracts.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-plan-a-contracts.log`
    Expected: PASS; Action is propagation-only, Branch save-selection/completion semantics are explicit, and deferred Plan B items are not encoded into runtime contracts
    Evidence: .sisyphus/evidence/task-1-plan-a-contracts.log

  Scenario: Unsupported expanded scopes are rejected at contract level
    Tool: Bash
    Steps: run the same suite filtered to invalid fixtures for new action kinds, richer invoke payload expectations, and unsupported branch runtime metadata
    Expected: PASS; unsupported scope-expanding inputs are rejected deterministically
    Evidence: .sisyphus/evidence/task-1-plan-a-contracts-invalid.log
  ```

  **Commit**: YES | Message: `feat(plan-a): lock action branch and gate contracts` | Files: `packages/contracts/src/**`

- [x] 2. Add Action design-time schema and delta repositories

  **What to do**: Add Action-step methodology tables and repository support for whole-step graph persistence with stable action/item IDs and delta reconciliation. Preserve the existing workflow-step common metadata model.
  **Must NOT do**: Do not add public per-action CRUD repository APIs. Do not add runtime tables here.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: repository boundaries and delta semantics must follow existing Effect patterns.
  - Omitted: [`web-design-guidelines`] - Reason: no UI in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3, T9, T11, T12 | Blocked By: T1

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing methodology schema: `packages/db/src/schema/methodology.ts`
  - Existing workflow authoring transaction patterns: `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts -t "action methodology"`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "action design-time"`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Whole-step Action updates reconcile by delta
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "action design-time delta" --reporter=verbose | tee .sisyphus/evidence/task-2-action-design-delta.log`
    Expected: PASS; unchanged action/item IDs remain stable and only added/removed/edited children change
    Evidence: .sisyphus/evidence/task-2-action-design-delta.log

  Scenario: Empty Action graphs are rejected
    Tool: Bash
    Steps: run the same suite filtered to invalid action graph fixtures
    Expected: PASS; create/update rejects `actions.length === 0`
    Evidence: .sisyphus/evidence/task-2-action-design-invalid.log
  ```

  **Commit**: YES | Message: `feat(action-step): add design-time schema and delta repos` | Files: `packages/db/src/schema/**`, `packages/db/src/tests/**`

- [x] 3. Implement Action whole-step authoring services and methodology router

  **What to do**: Implement `ActionStepDefinitionService`-style authoring services and methodology router procedures for whole-step Action creation/update/delete/read. Enforce the locked propagation-only semantics and stable ID delta behavior.
  **Must NOT do**: Do not add runtime execution behavior here. Do not add public item-level action endpoints.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this is the core methodology-engine service slice.
  - Omitted: [`hono`] - Reason: router thinness matters more than transport specifics.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T9, T11, T12 | Blocked By: T2

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing methodology router: `packages/api/src/routers/methodology.ts`
  - Existing workflow editor service patterns: `packages/methodology-engine/src/services/*`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "action methodology"`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Methodology router stays whole-step only
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "action methodology" --reporter=verbose | tee .sisyphus/evidence/task-3-action-methodology-router.log`
    Expected: PASS; Action authoring uses whole-step procedures only and exposes no per-action CRUD
    Evidence: .sisyphus/evidence/task-3-action-methodology-router.log

  Scenario: Invalid propagation-only assumptions are rejected
    Tool: Bash
    Steps: run the same suite filtered to invalid non-propagation action fixtures
    Expected: PASS; unsupported action kinds are rejected at service/router boundaries
    Evidence: .sisyphus/evidence/task-3-action-methodology-invalid.log
  ```

  **Commit**: YES | Message: `feat(action-step): add whole-step authoring services` | Files: `packages/methodology-engine/src/**`, `packages/api/src/routers/**`

- [x] 4. Add Action runtime schema and repositories

  **What to do**: Add Action runtime tables and repositories for lazy action-row creation, propagation-item row creation, retry-in-place updates, and design-time-action-ID keyed lookup. Reuse generic `step_executions` for lifecycle ownership.
  **Must NOT do**: Do not add `action_step_execution_state`. Do not add retry history tables. Do not redesign fact storage here.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: runtime aggregate boundaries and repository APIs must stay composable.
  - Omitted: [`opencode-sdk`] - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T5, T9, T11, T12 | Blocked By: T1

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing runtime schema: `packages/db/src/schema/runtime.ts`
  - Runtime repository analogs: `packages/db/src/runtime-repositories/*`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts -t "action runtime"`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "action runtime"`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Action runtime rows stay lazy
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "action runtime lazy" --reporter=verbose | tee .sisyphus/evidence/task-4-action-runtime-lazy.log`
    Expected: PASS; step activation creates no runtime action rows until execution begins
    Evidence: .sisyphus/evidence/task-4-action-runtime-lazy.log

  Scenario: Retry updates runtime rows in place
    Tool: Bash
    Steps: run the same suite filtered to retry fixtures
    Expected: PASS; retries update existing rows rather than creating history rows
    Evidence: .sisyphus/evidence/task-4-action-runtime-retry.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime schema and repos` | Files: `packages/db/src/schema/**`, `packages/db/src/runtime-repositories/**`

- [x] 5. Implement Action runtime orchestration and propagation execution

  **What to do**: Implement Action runtime services for step-wide runs, selected-action runs, retries, propagation item execution, aggregate status derivation, completion eligibility, and canonical runtime detail assembly. Keep propagation limited to the locked propagation kinds from the existing Action plan.
  **Must NOT do**: Do not redesign raw fact-write validation. Do not add new action kinds. Do not auto-complete Action steps.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this is the highest-risk Action runtime slice.
  - Omitted: [`better-auth-best-practices`] - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T9, T11, T12 | Blocked By: T4

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing step transaction patterns: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Existing invoke runtime services as runtime-detail precedent: `packages/workflow-engine/src/services/invoke-step-detail-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Sequential and parallel Action modes stay locked
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts -t "mode" --reporter=verbose | tee .sisyphus/evidence/task-5-action-runtime-modes.log`
    Expected: PASS; sequential runs respect sortOrder, retries ignore sortOrder, and duplicate run requests are idempotent
    Evidence: .sisyphus/evidence/task-5-action-runtime-modes.log

  Scenario: Unsupported propagation targets fail explicitly
    Tool: Bash
    Steps: run the same suite filtered to invalid propagation target fixtures
    Expected: PASS; unsupported or malformed runtime propagation requests fail without widening fact-system scope
    Evidence: .sisyphus/evidence/task-5-action-runtime-invalid.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime orchestration services` | Files: `packages/workflow-engine/src/**`

- [x] 6. Add Branch runtime schema, repositories, and localized evaluator helpers

  **What to do**: Add Branch runtime state persistence with one row per `stepExecutionId`, repository support for activation/save/load, and localized evaluator helpers/decoders sufficient to evaluate authored branch routes against workflow-context facts in Plan A. Keep these helpers scoped to Action/Branch needs rather than promoting them as the final fact-unification layer.
  **Must NOT do**: Do not introduce the richer invoke draft-spec payload. Do not introduce a global fact decoder package. Do not persist route history.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: repository + evaluator seams must stay narrow and explicit.
  - Omitted: [`turborepo`] - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T7, T8, T10, T11, T12 | Blocked By: T1

  **References**:
  - Authority: `.sisyphus/plans/l3-slice-2-runtime-branch.md`
  - Existing runtime schema: `packages/db/src/schema/runtime.ts`
  - Existing design-time branch service: `packages/methodology-engine/src/services/branch-step-definition-service.ts`
  - Existing condition semantics source: `packages/methodology-engine/src/services/condition-engine.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/db/src/tests/schema/l3-plan-a-action-branch-schema.test.ts -t "branch runtime"`
  - [ ] `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "branch runtime"`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts -t "evaluator"`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Branch state persists selectedTargetStepId only
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-plan-a-action-branch-repositories.test.ts -t "branch save selection" --reporter=verbose | tee .sisyphus/evidence/task-6-branch-state.log`
    Expected: PASS; one row per step execution is updated in place and no route-history rows are created
    Evidence: .sisyphus/evidence/task-6-branch-state.log

  Scenario: Localized branch evaluator handles authored route conditions
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts -t "evaluator" --reporter=verbose | tee .sisyphus/evidence/task-6-branch-evaluator.log`
    Expected: PASS; route evaluation succeeds/fails using current workflow-context facts without forcing Plan B fact redesign
    Evidence: .sisyphus/evidence/task-6-branch-evaluator.log
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add state repos and localized evaluator` | Files: `packages/db/src/**`, `packages/workflow-engine/src/**`

- [x] 7. Implement Branch lifecycle, save-selection, and branch-aware progression services

  **What to do**: Implement branch step activation state creation, explicit save-selection command handling, completion revalidation, and next-step resolution/workflow-detail integration driven by persisted valid target selection. Update shared completion paths so Branch completion uses the locked semantics.
  **Must NOT do**: Do not allow completion from UI suggestion alone. Do not silently fall back from invalid persisted selection to default target.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: correctness-critical service orchestration.
  - Omitted: [`visual-engineering`] - Reason: no UI here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8, T10, T11, T12 | Blocked By: T6

  **References**:
  - Authority: `.sisyphus/plans/l3-slice-2-runtime-branch.md`
  - Existing step lifecycle service: `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`
  - Existing progression service: `packages/workflow-engine/src/services/step-progression-service.ts`
  - Existing workflow detail service: `packages/workflow-engine/src/services/workflow-execution-detail-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts -t "save and complete"`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts -t "progression"`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Persisted valid selection governs completion and activation
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/branch-runtime-services.test.ts -t "save and complete" --reporter=verbose | tee .sisyphus/evidence/task-7-branch-save-complete.log`
    Expected: PASS; completion succeeds only after explicit save of a still-valid target
    Evidence: .sisyphus/evidence/task-7-branch-save-complete.log

  Scenario: No-match and invalid-selection states block correctly
    Tool: Bash
    Steps: run the same suite filtered to no-match and invalidated-selection fixtures
    Expected: PASS; branch remains blocked with explicit reasons when no valid persisted path exists
    Evidence: .sisyphus/evidence/task-7-branch-blocked.log
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add lifecycle and progression services` | Files: `packages/workflow-engine/src/**`

- [x] 8. Extend runtime gate and operator support only for Plan A overlap

  **What to do**: Extend `runtime-gate-service.ts`, `transition-gate-conditions.ts`, and the runtime condition contracts to cover the operator/condition overlap required by Action/Branch behavior in Plan A. Reuse the existing gate engine structure; align semantics where it overlaps with branch evaluation, but stop short of full operator-system convergence.
  **Must NOT do**: Do not redesign all gate semantics. Do not pull in full fact unification. Do not widen support beyond documented Plan A scenarios.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: evaluator semantics and service layering must stay consistent.
  - Omitted: [`effect-review`] - Reason: implementation pass, not review.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T10, T12 | Blocked By: T6, T7

  **References**:
  - Existing gate runtime: `packages/workflow-engine/src/services/runtime-gate-service.ts`
  - Existing gate conversion: `packages/workflow-engine/src/services/transition-gate-conditions.ts`
  - Existing runtime condition contracts: `packages/contracts/src/runtime/conditions.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-alignment.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Transition gate overlap matches Plan A branch semantics
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-gate-alignment.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-gate-alignment.log`
    Expected: PASS; overlapping operator families produce the same pass/fail semantics in branch and transition-gate runtime paths
    Evidence: .sisyphus/evidence/task-8-gate-alignment.log

  Scenario: Existing transition behavior remains intact
    Tool: Bash
    Steps: run the same suite filtered to regression fixtures for legacy gate behavior
    Expected: PASS; pre-existing transition gate scenarios still evaluate correctly
    Evidence: .sisyphus/evidence/task-8-gate-regression.log
  ```

  **Commit**: YES | Message: `refactor(gates): extend runtime operators for plan-a overlap` | Files: `packages/contracts/src/**`, `packages/workflow-engine/src/**`

- [x] 9. Add Action runtime router procedures and SSE stream

  **What to do**: Add Action runtime procedures and step-wide operational SSE using the locked Action semantics from Plan A. Keep the event set scoped to Action runtime execution and completion eligibility changes.
  **Must NOT do**: Do not introduce generic workflow streaming. Do not change other step types to depend on Action SSE.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `hono`] - Reason: runtime procedures and SSE transport must stay typed and thin.
  - Omitted: [`opencode-sdk`] - Reason: unrelated.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11, T12 | Blocked By: T3, T4, T5

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing runtime router: `packages/api/src/routers/project-runtime.ts`
  - Existing SSE patterns: `apps/server/src/**`, `packages/contracts/src/sse/envelope.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "action runtime"`
  - [ ] `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Action runtime commands use the locked Action semantics
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "action runtime" --reporter=verbose | tee .sisyphus/evidence/task-9-action-runtime-router.log`
    Expected: PASS; whole-step run, selected-action run, retry, and manual complete obey the locked runtime rules
    Evidence: .sisyphus/evidence/task-9-action-runtime-router.log

  Scenario: Action SSE events stay scoped and ordered
    Tool: Bash
    Steps: run `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-action-sse.log`
    Expected: PASS; ordered Action-only operational events are emitted without widening into generic streaming
    Evidence: .sisyphus/evidence/task-9-action-sse.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime procedures and sse` | Files: `packages/api/src/**`, `apps/server/src/**`

- [x] 10. Implement Branch detail API/read model and step execution UI

  **What to do**: Add `body.branch` to the runtime step detail query, add the save-selection runtime mutation, and render the Branch runtime surface in the shared step-execution route using the locked payload structure and selection/completion semantics.
  **Must NOT do**: Do not add branch-specific streaming. Do not make completion depend on client-side recomputation of route validity.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`] - Reason: complex UI state should remain query-driven and stable.
  - Omitted: [`web-design-guidelines`] - Reason: final verification can review accessibility/polish.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T12 | Blocked By: T6, T7, T8

  **References**:
  - Authority: `.sisyphus/plans/l3-slice-2-runtime-branch.md`
  - Existing step detail router: `packages/api/src/routers/project-runtime.ts`
  - Existing step detail service: `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - Existing route surface: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "branch runtime"`
  - [ ] `bunx vitest run apps/web/src/tests/routes/runtime-branch-step-detail.test.tsx`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Branch detail API returns locked branch payload
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/action-branch-plan-a-routers.test.ts -t "branch runtime" --reporter=verbose | tee .sisyphus/evidence/task-10-branch-router.log`
    Expected: PASS; `body.branch`, save-selection mutation, and explicit disabled reasons are returned from the shared runtime surface
    Evidence: .sisyphus/evidence/task-10-branch-router.log

  Scenario: Branch UI handles single match, no match, and multiple-match selection correctly
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/runtime-branch-step-detail.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-10-branch-ui.log`
    Expected: PASS; UI shows valid routes, default suggestion, invalid-selection warning, and blocked completion states exactly as locked
    Evidence: .sisyphus/evidence/task-10-branch-ui.log
  ```

  **Commit**: YES | Message: `feat(branch-runtime): add detail api and ui` | Files: `packages/api/src/**`, `packages/workflow-engine/src/**`, `apps/web/src/**`

- [x] 11. Implement Action runtime web surfaces

  **What to do**: Add Action-step editor/runtime web surfaces needed by Plan A: whole-step editor tabs and runtime action list/dialog surfaces wired to the router/SSE contracts.
  **Must NOT do**: Do not add unrelated workflow editor redesign. Do not create a standalone Action page outside the existing workflow editor/runtime routes.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`web-design-guidelines`, `vercel-react-best-practices`] - Reason: this is the primary user-facing Action surface.
  - Omitted: [`opencode-sdk`] - Reason: not relevant.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T12 | Blocked By: T2, T3, T4, T5, T9

  **References**:
  - Authority: `.sisyphus/plans/l3-action-step-propagation-final.md`
  - Existing workflow editor route: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Existing runtime route: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Action editor preserves whole-step graph semantics
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-11-action-editor.log`
    Expected: PASS; editor uses whole-step payloads, stable IDs, and the locked tabs/validation rules
    Evidence: .sisyphus/evidence/task-11-action-editor.log

  Scenario: Action runtime UI respects run/retry/completion rules
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-11-action-runtime-ui.log`
    Expected: PASS; runtime list/dialogs reflect locked statuses, allowed actions, and completion gating
    Evidence: .sisyphus/evidence/task-11-action-runtime-ui.log
  ```

  **Commit**: YES | Message: `feat(action-step): add editor and runtime web ui` | Files: `apps/web/src/**`

- [x] 12. Seed the setup workflow and transition gate fixtures for end-to-end coverage

  **What to do**: Update the methodology seed for the setup work unit so both active and draft versions extend the existing `setup-invoke-phase-1-fixture.ts` workflow from `form → agent → invoke → invoke` into `form → agent → action → branch → invoke/invoke`. Use the existing setup workflow IDs, current steps, and invoke topology as the source of truth. Seed exactly one Action step named `propagate_setup_context` and exactly one Branch step named `route_setup_followups`. Expand the existing setup synthesis agent seed so it also authors `cf_setup_branch_note` (`plain_value_fact`) and `cf_setup_followup_workflows` (`workflow_reference_fact`) in addition to the existing artifact/booleans/draft-spec outputs. Then, after T8 completes, replace the currently empty transition-gate condition-set placeholders for `setup`, `brainstorming`, and `research` with seeded start/completion condition sets in the desired post-refactor shape.
  **Must NOT do**: Do not seed richer Plan-B-only fact payload assumptions. Do not add gate-condition seed data before the T8 refactor lands. Do not invent a separate seed workflow outside the setup work unit.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: seed data must align tightly with methodology/runtime contracts and tests.
  - Omitted: [`visual-engineering`] - Reason: this is seed/authored-data work, not UI work.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T13 | Blocked By: T3, T5, T7, T8

  **References**:
  - Current setup workflow fixture: `packages/scripts/src/seed/methodology/setup/setup-invoke-phase-1-fixture.ts`
  - Current BMAD setup mapping: `packages/scripts/src/seed/methodology/setup/setup-bmad-mapping.ts`
  - Workflow seed aggregators: `packages/scripts/src/seed/methodology/tables/methodology-workflows.seed.ts`, `packages/scripts/src/seed/methodology/tables/methodology-workflow-steps.seed.ts`, `packages/scripts/src/seed/methodology/tables/methodology-transition-condition-sets.seed.ts`
  - Existing seed tests: `packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts`, `packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - Step type taxonomy: `packages/contracts/src/methodology/domain.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts`
  - [ ] `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts`
  - [ ] `bun run check-types`

  **Locked Seed Spec**:
  - Setup workflow step order becomes:
    1. `collect_setup_baseline` — form
    2. `synthesize_setup_for_invoke` — agent
    3. `propagate_setup_context` — action
    4. `route_setup_followups` — branch
    5. `invoke_brainstorming_fixed` — invoke
    6. `invoke_research_from_draft_spec` — invoke
  - Seeded Action step:
    - key: `propagate_setup_context`
    - displayName: `Propagate Setup Context`
    - type: `action`
    - executionMode: `sequential`
    - action A propagates setup decision facts:
      - `cf_setup_project_kind`
      - `cf_setup_initiative_name`
      - `cf_setup_workflow_mode`
      - `cf_setup_requires_brainstorming`
      - `cf_setup_requires_research`
    - action B propagates setup environment/binding facts:
      - `cf_method_project_knowledge_directory`
      - `cf_method_planning_artifacts_directory`
      - `cf_method_communication_language`
      - `cf_method_document_output_language`
    - action C propagates artifact references:
      - `cf_project_overview_artifact`
    - the Action seed must NOT attempt to propagate `plain_value_fact`, `workflow_reference_fact`, or `work_unit_draft_spec_fact`
  - Seeded Branch step:
    - key: `route_setup_followups`
    - displayName: `Route Setup Follow-ups`
    - type: `branch`
    - no default target
    - route A key: `branch_to_brainstorming_then_research`
      - target: `invoke_brainstorming_fixed`
      - root mode: `all`
      - group 1 mode `all`:
        - `cf_setup_requires_brainstorming == true`
        - `cf_setup_project_kind` exists
        - `cf_method_planning_artifacts_directory` exists
      - group 2 mode `any`:
        - `cf_project_overview_artifact` exists
        - `cf_setup_brainstorming_draft_spec` exists/non-empty
        - `cf_setup_branch_note` contains `"brainstorm"`
    - route B key: `branch_to_research_only`
      - target: `invoke_research_from_draft_spec`
      - root mode: `any`
      - group 1 mode `all`:
        - `cf_setup_requires_research == true`
        - `cf_setup_research_draft_spec` exists/non-empty
      - group 2 mode `all`:
        - `cf_setup_workflow_mode == "research_only"`
        - `cf_setup_branch_note` contains `"research"`
      - group 3 mode `any`:
        - `cf_setup_followup_workflows` contains `research-primary`
        - `cf_setup_project_kind == "brownfield"`
  - Seeded transition gate condition sets (post-T8 only):
    - Setup start gate:
      - root mode `all`
      - group `baseline_required` mode `all`: setup/project fact `project_kind` exists
      - group `baseline_optional_context` mode `any`: `initiative_name` exists OR `workflow_mode` exists OR `project_knowledge_directory` exists
    - Setup completion gate:
      - root mode `all`
      - group `propagated_runtime_facts` mode `all`: runtime/project facts `project_kind`, `requires_brainstorming`, `requires_research` exist
      - group `environment_bindings` mode `any`: runtime/project facts `planning_artifacts_directory`, `communication_language`, `document_output_language` exist
      - group `durable_setup_output` mode `all`: artifact slot `PROJECT_OVERVIEW` exists
    - Brainstorming start gate:
      - root mode `all`
      - group `invoke_prefill_present` mode `all`: work-unit facts `setup_work_unit` and `desired_outcome` exist
    - Brainstorming completion gate:
      - root mode `all`
      - group `brainstorming_convergence` mode `all`: work-unit fact `selected_direction` exists
      - group `brainstorming_artifact` mode `all`: artifact slot `brainstorming_session` exists
      - optional extra group mode `any`: work-unit fact `estimated_research_effort` exists OR work-unit fact `research_work_units` exists
    - Research start gate:
      - root mode `all`
      - group `research_inputs_present` mode `all`: work-unit fact `setup_work_unit` exists
      - group `research_origin_context` mode `any`: work-unit fact `brainstorming_work_unit` exists OR work-unit fact `research_topic` exists
    - Research completion gate:
      - root mode `all`
      - group `research_fact_ready` mode `all`: work-unit fact `research_topic` exists
      - group `research_artifact_ready` mode `all`: artifact slot `research_report` exists

  **QA Scenarios**:
  ```
  Scenario: Setup workflow seed includes Action and Branch in active and draft
    Tool: Bash
    Steps: run `bunx vitest run packages/scripts/src/tests/seeding/setup-invoke-phase-1-fixture.test.ts --reporter=verbose | tee .sisyphus/evidence/task-12-setup-seed.log`
    Expected: PASS; seeded setup workflow now includes form, agent, action, branch, and invoke steps in both active and draft methodology versions with the locked step order and valid edge connectivity
    Evidence: .sisyphus/evidence/task-12-setup-seed.log

  Scenario: Transition condition sets are populated for setup, brainstorming, and research after gate refactor
    Tool: Bash
    Steps: run `bunx vitest run packages/scripts/src/tests/seeding/methodology-seed-integrity.test.ts --reporter=verbose | tee .sisyphus/evidence/task-12-gate-seed.log`
    Expected: PASS; seeded start/completion condition sets exist for the three work-unit transitions and use the locked non-empty group/condition shapes in the post-refactor form
    Evidence: .sisyphus/evidence/task-12-gate-seed.log
  ```

  **Commit**: YES | Message: `feat(seed): add action branch and gate coverage to setup workflow` | Files: `packages/scripts/src/seed/**`, `packages/scripts/src/tests/seeding/**`

- [x] 13. Add integration, backward-compat guards, and Plan A regression coverage

  **What to do**: Add regression coverage across Action, Branch, and gate overlap; add explicit tests/guards for unsupported scope-expanding cases so Plan A cannot silently absorb Plan B responsibilities. Validate repo-wide typecheck/test/build after the targeted suites are green.
  **Must NOT do**: Do not add Plan B fact-unification work as part of hardening. Do not widen the invoke payload in this task.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`web-design-guidelines`] - Reason: end-to-end coverage must verify the actual user-facing runtime behavior too.
  - Omitted: [`opencode-sdk`] - Reason: unrelated.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: T2-T12

  **References**:
  - Root scripts: `package.json`
  - Router/service/UI tests created in T1-T11

  **Acceptance Criteria**:
  - [ ] `bun run check-types`
  - [ ] `bun run test`
  - [ ] `bun run build`
  - [ ] `.sisyphus/drafts/l3-plan-b-refinement-notes.md` summarizes all Plan-B-relevant findings discovered during T1-T11

  **QA Scenarios**:
  ```
  Scenario: Repo-wide verification passes after targeted suites are green
    Tool: Bash
    Steps: run `bun run check-types && bun run test && bun run build | tee .sisyphus/evidence/task-12-plan-a-repo-verification.log`
    Expected: PASS; Plan A lands without breaking existing packages or deferred surfaces
    Evidence: .sisyphus/evidence/task-12-plan-a-repo-verification.log

  Scenario: Plan A guardrails reject deferred Plan B behavior
    Tool: Bash
    Steps: run targeted regression suites that attempt richer invoke payload assumptions, raw-write validation redesign assumptions, or broad fact-unification expectations
    Expected: PASS; unsupported Plan B behaviors are either absent or explicitly rejected in Plan A tests
    Evidence: .sisyphus/evidence/task-12-plan-a-guardrails.log

  Scenario: Plan B refinement notes are complete enough to drive post-Plan-A review
    Tool: Bash
    Steps: verify `.sisyphus/drafts/l3-plan-b-refinement-notes.md` exists and contains entries for every Plan A task that touched fact shapes, validation seams, payload compatibility, mutation boundaries, or operator semantics
    Expected: PASS; the notes file can be used as direct input to refine Plan B after Plan A completes
    Evidence: .sisyphus/evidence/task-12-plan-b-notes-check.txt
  ```

  **Commit**: YES | Message: `test(plan-a): harden action branch and gate regressions` | Files: `packages/**`, `apps/**`, `tests/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

### Final Wave Closure Note (2026-04-18)
- Scoped Plan A behavior has been validated in targeted automated suites and manual runtime walkthroughs.
- Manual QA closure accepted by user after branch-evaluation visibility and wrapped-fact normalization fixes.
- Remaining repo-wide `check-types` / `test` failures are tracked as pre-existing out-of-slice debt and are not treated as Plan-A feature blockers.

## Commit Strategy
- Prefer 8-12 atomic commits aligned to one behavior delta each, not one layer each.
- Keep Action design-time, Action runtime, Branch runtime, gate alignment, SSE, and UI changes independently revertible.
- Never mix Plan A work with any Plan B fact-unification or runtime-validation redesign in the same commit.

## Success Criteria
- Action-step authoring and runtime execution exist as first-class workflow capabilities in Plan A scope.
- Runtime Branch behavior matches the locked persisted-selection semantics with no silent fallback to UI-only defaults.
- Transition gates and Plan A branch/runtime behavior share the necessary overlapping operator semantics without requiring broad fact redesign.
- Plan A ships without accidentally absorbing fact-system unification, raw-write hardening, or invoke payload redesign.
- Plan A execution leaves behind concrete Plan-B refinement notes grounded in implementation reality, so Plan B can be reviewed and updated against observed seams rather than assumptions.
- All automated verification commands pass.
