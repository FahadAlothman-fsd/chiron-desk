# L3 Action Step Propagation Final Plan

## TL;DR
> **Summary**: Implement the final L3 Action step architecture as a whole-step, Effect-driven execution surface where Action is an extensible step type and `propagation` is the first concrete action kind. The slice covers design-time whole-step authoring, lazy runtime execution rows, item-level propagation into runtime facts/artifacts, step-wide operational streaming, and runtime recovery for missing bound targets.
> **Deliverables**:
> - Whole-step Action definition contracts, schema, authoring services, and typed router procedures
> - Runtime Action execution tables, repositories, services, procedures, and SSE event stream
> - Action step editor UI, runtime action list UI, per-action result dialogs, and completion gating
> - Propagation implementation for `definition_backed_external_fact`, `bound_external_fact`, and `artifact_reference_fact`
> - Automated verification for delta persistence, lazy row creation, sequential/parallel execution rules, recovery flow, and stream events
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: 1 → 2/3 → 4/5/6 → 7/8 → 9

## Context
### Original Request
- Plan the final Action-step slice as the last missing connective tissue between workflow context and project runtime.
- Restrict the first action kind to propagation of eligible context facts into runtime facts/artifacts.
- Make the Action step holistic across design time and runtime so Chiron can later add more action kinds without redesigning the step type.

### Interview Summary
- **Action is a step type; propagation is one action kind.** The Action step must stay extensible for future kinds such as worktree setup, directory creation, and artifact materialization.
- Design-time authoring is **whole-step only**: `createActionStep`, `updateActionStep`, `deleteActionStep`, `getActionStepDefinition`. No public action CRUD endpoints and no reorder endpoint.
- `createActionStep` and `updateActionStep` both require `actions.length >= 1`. The payload carries the full `actions[]` graph, but persistence is **delta-based**, not replace-all.
- Action-step dialog tabs are locked to: `Overview`, `Actions`, `Execution`, `Guidance`.
- Action step owns one step-wide `executionMode: sequential | parallel`; there are **no action groups**.
- Description/guidance live on the common workflow step definition record, not on action rows or Action-specific tables.
- Runtime uses the existing workflow execution and step execution pages. Step execution shows a **flat list of actions**, an action-wide run button, and per-action dialogs with `Planned`, `Current Result`, `Affected Targets`, and `Recovery`.
- Generic `step_executions` owns step lifecycle. Do **not** add an `action_step_execution_state` table.
- Runtime rows are **lazy**: only create `action_step_execution_actions` and `action_step_execution_propagation_items` when the whole step runs or an individual action runs.
- Action-row status: `running | succeeded | needs_attention`.
- Propagation-item status: `running | succeeded | failed | needs_attention`.
- Completion is **manual**. The common Complete Step button appears when **at least one action has succeeded**. Actions may remain unrun.
- Allowed propagation kinds in this slice: `definition_backed_external_fact`, `bound_external_fact`, `artifact_reference_fact`.
- Excluded from Action: `plain_value_fact`, `workflow_reference_fact`, `work_unit_draft_spec_fact`.
- `bound_external_fact` updates an existing external fact instance.
- `definition_backed_external_fact` can create a new external fact instance and, after bind/prefill/creation, later propagations may update that bound created instance.
- Do **not** confuse external fact cardinality with workflow context fact cardinality.
- If the external fact type cardinality is `one` and an external instance already exists at project runtime, workflow activation should prefill the workflow context fact `instanceId` and `valueJson` from that external instance.
- If the external fact type cardinality is `many`, `definition_backed_external_fact` must never auto-bind on workflow activation, and propagation must always create a new external instance.
- Bound propagation does **not** track stale historical target values. The important failure is a **missing/deleted bound target**, which must surface item-level recovery via `recreateBoundTargetFromContextValue` using the current context fact value.
- After Action-step propagation creates a new external instance, the workflow context fact must store the created external `instanceId` so later edits and propagations target that created instance.
- Runtime commands use **design-time action definition IDs**, because run commands create runtime action rows.
- In sequential mode, manual run commands still obey `sortOrder`; retry does not.
- Streaming is **step-wide operational SSE**, not token/chat streaming.
- After bind/prefill/creation, runtime condition evaluation must resolve from workflow context fact instance `valueJson`, not by re-reading the external instance on every check.
- Any workflow-activation prefill or upstream runtime support outside the Action-step boundary must be treated as a prerequisite assumption to validate and implement if missing.
- Stored value shapes must be validated and normalized across project facts, project work-unit facts, and workflow context facts so the same underlying fact type uses a coherent structure across those layers.

### Metis Review (gaps addressed)
- Lock stable design-time action IDs and nested item IDs so update deltas reconcile without destroy/recreate churn.
- Define exact duplicate-run / already-running / already-succeeded semantics so commands are idempotent and testable.
- Keep `resultSummaryJson` intentionally small and stream a separate item-level result event for detailed payloads.
- Reuse existing route/router/repo/layer patterns already in the repo rather than inventing a new framework.
- Add explicit tests for disabled actions, lazy row creation, sequential order enforcement, retry freedom, missing-bound-target recovery, and stream event ordering.
- Treat workflow-activation prefill/runtime-binding behavior for `definition_backed_external_fact` as an assumption to validate; if missing, implement it inside this slice before relying on it.

## Work Objectives
### Core Objective
Implement the final L3 Action-step slice so Chiron can author, execute, and inspect Action steps as first-class workflow steps using whole-step authoring, lazy runtime materialization, propagation into runtime facts/artifacts, per-action runtime dialogs, and step-wide operational streaming.

### Deliverables
- Design-time contracts and schema for Action steps, actions, propagation actions, and propagation items.
- Methodology-engine whole-step Action authoring services with delta persistence and invariants.
- Runtime schema and repositories for `action_step_execution_actions` and `action_step_execution_propagation_items`.
- Workflow-engine runtime services for Action-step orchestration and propagation execution.
- Validation and, if necessary, implementation of prerequisite runtime support for activation-time prefill/binding of `definition_backed_external_fact` when external fact cardinality is `one`.
- Runtime procedures and SSE stream in `packages/api` / `apps/server`.
- Web Action-step editor UI and runtime action list/dialog UI.
- Tests covering contracts, repositories, services, routers, routes, SSE events, and end-to-end user flows.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/action-step-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/action-step-schema.test.ts`
- `bunx vitest run packages/db/src/tests/repository/action-step-runtime-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/propagation-action-runtime-service.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/definition-backed-external-runtime-lifecycle.test.ts`
- `bunx vitest run packages/api/src/tests/routers/action-step-methodology-router.test.ts`
- `bunx vitest run packages/api/src/tests/routers/action-step-runtime-router.test.ts`
- `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts`
- `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx`
- `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx`
- `bunx playwright test tests/e2e/action-step-propagation.spec.ts`
- `bun run check-types`

### Must Have
- Action remains a step type with a flat `actions[]` collection and future action-kind extensibility.
- `createActionStep` and `updateActionStep` both reject empty `actions[]`.
- Whole-step create/update payloads persist children via **delta reconciliation**, not replace-all.
- Generic `step_executions` owns step lifecycle; no Action-specific step-state table.
- Runtime action/item rows are created lazily only when execution begins.
- `bound_external_fact` propagation updates an existing external fact instance.
- `definition_backed_external_fact` propagation may create a new external fact instance and then persist that created external `instanceId` back onto the workflow context fact for later updates.
- External fact cardinality and workflow context fact cardinality are separate concerns.
- If external fact cardinality is `one` and an external instance already exists, workflow-activation prefill of workflow context `instanceId` + `valueJson` must be validated and relied on only once that assumption is confirmed or implemented.
- If external fact cardinality is `many`, `definition_backed_external_fact` must never auto-bind on activation and propagation must always create a new external instance.
- After bind/prefill/creation, runtime condition evaluation resolves from workflow context fact `valueJson`, not by directly re-reading external runtime state on every check.
- Sequential mode enforces `sortOrder` for whole-step runs and manual run commands.
- Retry commands do **not** enforce `sortOrder`.
- Complete Step becomes available only when at least one action has succeeded and no action is currently running.
- Bound-target recovery uses `recreateBoundTargetFromContextValue` on the current context value.
- SSE stream emits the locked event set with the locked payload shapes.
- Stored value shapes are verified and normalized across project facts, project work-unit facts, and workflow context facts for each supported underlying fact type used by Action propagation.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No action groups.
- No separate public action CRUD procedures.
- No separate public propagation-specific CRUD procedures.
- No `action_step_execution_state` table duplicating generic step lifecycle.
- No automatic step completion.
- No `pending` status.
- No runtime history table for retries in this slice.
- No stale historical target-version tracking for bound propagation.
- No new action kinds beyond `propagation` in this slice.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after with contract-first verification and strict router/service/repo/UI coverage.
- QA policy: every task below includes exact commands and evidence paths.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. **Action is a step type**; `propagation` is the first action kind.
2. **Whole-step authoring only**: all Action editing flows through `createActionStep` / `updateActionStep`.
3. **Delta persistence**: action/item graphs are reconciled by stable IDs, not replaced wholesale.
4. **No redundant step-state table**: generic `step_executions` owns step lifecycle.
5. **Lazy runtime rows**: runtime action/item rows only appear once run commands start execution.
6. **Completion gate**: manual completion requires at least one succeeded action and zero currently running actions.
7. **Action statuses**: `running | succeeded | needs_attention`.
8. **Propagation item statuses**: `running | succeeded | failed | needs_attention`.
9. **Stream contract**: one SSE stream per step execution with the six locked event types.
10. **Bound recovery**: missing/deleted bound targets surface item-level recovery via explicit recreate/rebind command.
11. **Definition-backed lifecycle**: external-cardinality-`one` may prefill/bind on activation, external-cardinality-`many` never auto-binds, and post-create propagation stores the created external `instanceId` back into workflow context.
12. **Condition resolution source**: runtime conditions resolve from workflow context fact `valueJson` after bind/prefill/create; Action-step propagation is the outward synchronization seam.

### Defaults Applied
- Disabled actions count toward the structural `actions.length >= 1` invariant, but are excluded from runtime run selection and do not contribute to completion eligibility.
- Stable action IDs and propagation item IDs are preserved across reorder/edit operations inside the same workflow version; updates must not rewrite unchanged IDs.
- `completeActionStepExecution` is rejected while any action row is `running`.
- Duplicate `startActionStepExecution`, `runActionStepActions`, or `retryActionStepActions` requests targeting already-running actions resolve as idempotent no-ops returning current state, not duplicate execution rows.
- `resultSummaryJson` is intentionally compact and list-friendly; full detail remains in `resultJson` and the canonical detail query.
- SSE bootstrap stays incremental-only; UI loads the full snapshot through `getActionStepExecutionDetail` first, then applies stream events.
- Workflow-activation prefill for definition-backed external facts is treated as a prerequisite assumption to validate; if the runtime slice does not already provide it, implement it in this slice before relying on Action-step semantics.
- Cross-layer fact value shapes are treated as a validation requirement; if project facts, work-unit facts, and workflow context facts store divergent shapes for the same underlying fact type, normalize them in this slice.

### Parallel Execution Waves
Wave 1: contracts + schema + repository boundaries
Wave 2: methodology-engine whole-step authoring + workflow-engine runtime services
Wave 3: runtime procedures + SSE + server integration
Wave 4: web editor/runtime pages + E2E + cleanup

### Dependency Matrix (full, all tasks)
- 1 blocks 2-9
- 2 blocks 4-9
- 3 blocks 4-9
- 4 blocks 6-9
- 5 blocks 6-9
- 6 blocks 7-9
- 7 blocks 8-9
- 8 blocks 9

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 3 tasks → deep / unspecified-high
- Wave 2 → 2 tasks → deep
- Wave 3 → 2 tasks → deep / unspecified-high
- Wave 4 → 2 tasks → visual-engineering / unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Lock Action-step contracts and stream schemas

  **What to do**: Add Action-step design-time and runtime contracts covering whole-step create/update payloads, runtime command payloads, action/item statuses, and the six SSE event payloads. Encode the create/update invariants (`actions.length >= 1`, unique `actionKey`, unique action `sortOrder`, non-empty propagation items, unique `contextFactDefinitionId` per propagation action, unique item `sortOrder`, workflow ownership of referenced context fact definitions, allowed context fact kinds only). Explicitly contract the runtime split between `bound_external_fact` and `definition_backed_external_fact`, including external-cardinality-aware prefill rules, create-vs-update behavior, post-create rebinding of created `instanceId`s into workflow context, condition evaluation from workflow context `valueJson`, and cross-layer value-shape normalization. Define compact `resultSummaryJson` and detailed `resultJson` payload shapes.
  **Must NOT do**: Do not implement repositories or UI here. Do not reintroduce public action CRUD or propagation-specific CRUD contracts.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: all downstream implementation depends on these exact contracts.
  - Skills: [`effect-best-practices`] - Reason: service/stream payloads must align with the repo’s typed Effect patterns.
  - Omitted: [`opencode-sdk`] - Reason: no harness adapter work in this slice.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-9 | Blocked By: none

  **References**:
  - Plan baseline: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Existing workflow contracts: `packages/contracts/src/methodology/workflow.ts`
  - Existing runtime contracts: `packages/contracts/src/runtime/executions.ts`
  - Existing SSE contract precedent: `packages/contracts/src/sse/envelope.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/contracts/src/tests/action-step-contracts.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Contract invariants reject invalid action graphs
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/action-step-contracts.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-action-contracts.log`
    Expected: PASS; empty actions arrays, duplicate action keys/sortOrders, duplicate propagation item keys, invalid context fact kinds, and cross-workflow context fact references are rejected deterministically
    Evidence: .sisyphus/evidence/task-1-action-contracts.log

  Scenario: Stream payload schemas stay locked
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/action-step-contracts.test.ts -t "stream" --reporter=verbose | tee .sisyphus/evidence/task-1-action-stream-contracts.log`
    Expected: PASS; all six event types decode with the expected envelope and payload fields, including `resultSummaryJson` on `action-status-changed`
    Evidence: .sisyphus/evidence/task-1-action-stream-contracts.log

  Scenario: Definition-backed lifecycle contracts stay locked
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/action-step-contracts.test.ts -t "definition_backed" --reporter=verbose | tee .sisyphus/evidence/task-1-definition-backed-contracts.log`
    Expected: PASS; external-cardinality-`one` prefill rules, external-cardinality-`many` no-auto-bind rules, post-create `instanceId` rebinding, and workflow-context-first condition resolution remain explicit in the contracts
    Evidence: .sisyphus/evidence/task-1-definition-backed-contracts.log
  ```

  **Commit**: YES | Message: `feat(action-step): lock contracts and event schemas` | Files: `packages/contracts/src/**`

- [ ] 2. Add Action-step design-time schema and repositories

  **What to do**: Extend methodology schema for `methodology_workflow_action_steps`, `methodology_workflow_action_step_actions`, `methodology_workflow_action_propagation_actions`, and `methodology_workflow_action_propagation_items`. Ensure `guidanceJson`/description stay on the common step definition. Implement repository support for whole-step graph reconciliation using stable action/item IDs and delta persistence.
  **Must NOT do**: Do not add separate action CRUD repository APIs that imply public per-action endpoints. Do not duplicate `contextFactKind` in propagation items.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: repository/layer structure should mirror existing typed step patterns.
  - Omitted: [`opencode-sdk`] - Reason: no runtime harness work here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-9 | Blocked By: 1

  **References**:
  - Existing methodology schema: `packages/db/src/schema/methodology.ts`
  - Existing workflow authoring transaction patterns: `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
  - Existing agent-step schema analogs: `packages/db/src/schema/methodology.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/schema/action-step-schema.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/action-step-design-time-repositories.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Whole-step update applies deltas instead of replace-all
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/action-step-design-time-repositories.test.ts -t "delta" --reporter=verbose | tee .sisyphus/evidence/task-2-action-design-delta.log`
    Expected: PASS; unchanged action/item IDs are preserved, added children are inserted, removed children are deleted, and unchanged children are not recreated
    Evidence: .sisyphus/evidence/task-2-action-design-delta.log

  Scenario: Design-time schema rejects invalid nested graphs
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/action-step-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-action-schema.log`
    Expected: PASS; schema enforces whole-step ownership, non-empty action arrays, and nested propagation-item constraints
    Evidence: .sisyphus/evidence/task-2-action-schema.log
  ```

  **Commit**: YES | Message: `feat(action-step): add design-time schema and delta repositories` | Files: `packages/db/src/schema/**`, `packages/db/src/tests/**`

- [ ] 3. Add Action-step runtime schema and repositories

  **What to do**: Add runtime schema for `action_step_execution_actions` and `action_step_execution_propagation_items`. Implement repositories for lazy action-row creation, lazy propagation-item creation, action summary updates, propagation item updates-in-place for retry, and lookup by `stepExecutionId` + design-time action IDs. Validate whether current runtime storage already supports definition-backed activation prefills/bindings; if not, implement the prerequisite runtime support needed to store prefills and created external `instanceId`s coherently. Reuse existing runtime fact/artifact repositories for actual propagation writes.
  **Must NOT do**: Do not add `action_step_execution_state`. Do not add history/attempt tables. Do not duplicate `contextFactDefinitionId` on runtime propagation rows.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: runtime rows and repo APIs must stay normalized and composable.
  - Omitted: [`opencode-sdk`] - Reason: unrelated to harness integration.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-9 | Blocked By: 1

  **References**:
  - Existing runtime schema: `packages/db/src/schema/runtime.ts`
  - Runtime repo analogs: `packages/db/src/runtime-repositories/*`
  - Artifact runtime patterns: `packages/db/src/runtime-repositories/artifact-repository.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/db/src/tests/schema/action-step-runtime-schema.test.ts`
  - [ ] `bunx vitest run packages/db/src/tests/repository/action-step-runtime-repositories.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Lazy runtime row creation is preserved
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/action-step-runtime-repositories.test.ts -t "lazy" --reporter=verbose | tee .sisyphus/evidence/task-3-action-runtime-lazy.log`
    Expected: PASS; generic step activation creates no action/action-item rows, whole-step run creates only needed action rows, and individual runs create only selected rows
    Evidence: .sisyphus/evidence/task-3-action-runtime-lazy.log

  Scenario: Retry updates same propagation item row
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/action-step-runtime-repositories.test.ts -t "retry" --reporter=verbose | tee .sisyphus/evidence/task-3-action-runtime-retry.log`
    Expected: PASS; retries mutate the same propagation item row instead of writing history rows, and successful action rows are not recreated
    Evidence: .sisyphus/evidence/task-3-action-runtime-retry.log

  Scenario: Definition-backed activation prefill support is present
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/action-step-runtime-repositories.test.ts -t "prefill" --reporter=verbose | tee .sisyphus/evidence/task-3-action-runtime-prefill.log`
    Expected: PASS; if external cardinality is `one` and an external instance exists, runtime can persist/read the prefilling of workflow context `instanceId` and `valueJson`; if that support was absent, this task adds it
    Evidence: .sisyphus/evidence/task-3-action-runtime-prefill.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime action execution schema and repos` | Files: `packages/db/src/schema/**`, `packages/db/src/runtime-repositories/**`, `packages/db/src/tests/**`

- [ ] 4. Implement whole-step Action authoring services

  **What to do**: Implement `ActionStepDefinitionService`, `ActionStepDefinitionResolverService`, and `PropagationActionDefinitionService` using Effect services. `getActionStepDefinition` must return the full Action-step graph; create/update must reconcile nested actions/items by delta. Validation must enforce the eight locked whole-step invariants and reuse the workflow context-fact list source instead of inventing a new helper query.
  **Must NOT do**: Do not add public action CRUD methods. Do not implement runtime execution here.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this is the main Effect service decomposition for methodology-engine.
  - Omitted: [`hono`] - Reason: transport concerns are not the focus.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6-9 | Blocked By: 2

  **References**:
  - Methodology router precedent: `packages/api/src/routers/methodology.ts`
  - Workflow editor service patterns: `packages/methodology-engine/src/services/*`
  - Step dialog precedent: `apps/web/src/features/workflow-editor/agent-step-dialog.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Whole-step save preserves stable IDs and deltas
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts -t "delta" --reporter=verbose | tee .sisyphus/evidence/task-4-action-definition-delta.log`
    Expected: PASS; existing action/item IDs remain stable across reorder/edit, and only added/changed/removed children are persisted
    Evidence: .sisyphus/evidence/task-4-action-definition-delta.log

  Scenario: Disabled actions are retained but excluded from runtime eligibility
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/action-step-definition-services.test.ts -t "disabled" --reporter=verbose | tee .sisyphus/evidence/task-4-action-definition-disabled.log`
    Expected: PASS; disabled actions remain in the design-time graph while runtime-eligibility metadata excludes them from run selection
    Evidence: .sisyphus/evidence/task-4-action-definition-disabled.log
  ```

  **Commit**: YES | Message: `feat(action-step): add whole-step authoring services` | Files: `packages/methodology-engine/src/**`

- [ ] 5. Implement Action runtime services and propagation execution

  **What to do**: Implement `ActionStepRuntimeService`, `PropagationActionRuntimeService`, `PropagationFactCommitService`, `PropagationArtifactCommitService`, and `ActionStepExecutionDetailService`. Whole-step runs and manual run commands must create lazy rows, obey mode rules, apply action/item aggregate statuses, and expose canonical detail read models for the flat action list and per-action dialogs. Runtime must validate/implement the prerequisite activation-prefill behavior for `definition_backed_external_fact` with external cardinality `one`, must never auto-bind for external cardinality `many`, must always create a new external instance for definition-backed-many propagation, and must persist created external `instanceId`s back to workflow context for later updates. Recovery must create/rebind a deleted bound target from the current context fact value. Duplicate run/retry requests against already-running targets must be idempotent no-ops.
  **Must NOT do**: Do not add a generic step-level Action state table. Do not add historical target-version conflict tracking. Do not auto-complete the step.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this is the highest-risk service-boundary work in the slice.
  - Omitted: [`opencode-sdk`] - Reason: no harness integration here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7-9 | Blocked By: 3

  **References**:
  - Runtime layer composition precedent: `packages/workflow-engine/src/layers/live.ts`
  - Existing runtime service patterns: `packages/workflow-engine/src/services/runtime/*`
  - Existing runtime repos: `packages/db/src/runtime-repositories/*`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/propagation-action-runtime-service.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Sequential and parallel mode semantics stay locked
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/action-step-runtime-services.test.ts -t "mode" --reporter=verbose | tee .sisyphus/evidence/task-5-action-runtime-modes.log`
    Expected: PASS; sequential whole-step runs stop on first non-successful action, manual run commands cannot skip ahead in sequential mode, and retry ignores sortOrder in both modes
    Evidence: .sisyphus/evidence/task-5-action-runtime-modes.log

  Scenario: Missing bound target surfaces recovery correctly
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/propagation-action-runtime-service.test.ts -t "recovery" --reporter=verbose | tee .sisyphus/evidence/task-5-propagation-recovery.log`
    Expected: PASS; missing/deleted bound target produces item `needs_attention`, emits the recovery-required condition, and explicit recreate/rebind updates the same propagation item row
    Evidence: .sisyphus/evidence/task-5-propagation-recovery.log

  Scenario: Definition-backed runtime lifecycle stays locked
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/definition-backed-external-runtime-lifecycle.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-definition-backed-lifecycle.log`
    Expected: PASS; external-cardinality-`one` prefills from existing runtime external state, external-cardinality-`many` never auto-binds, propagation for definition-backed-many always creates a new external instance, and successful create writes the new external `instanceId` back onto workflow context for later outward sync
    Evidence: .sisyphus/evidence/task-5-definition-backed-lifecycle.log

  Scenario: Condition evaluation resolves from workflow context valueJson
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/definition-backed-external-runtime-lifecycle.test.ts -t "condition resolution" --reporter=verbose | tee .sisyphus/evidence/task-5-definition-backed-condition-resolution.log`
    Expected: PASS; after bind/prefill/create, runtime condition evaluation reads workflow context fact `valueJson` instead of re-reading the external instance on every check
    Evidence: .sisyphus/evidence/task-5-definition-backed-condition-resolution.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime action and propagation services` | Files: `packages/workflow-engine/src/**`

- [ ] 6. Add methodology and runtime router procedures

  **What to do**: Add the locked design-time procedures (`createActionStep`, `updateActionStep`, `deleteActionStep`, `getActionStepDefinition`) and runtime procedures (`getActionStepExecutionDetail`, `startActionStepExecution`, `completeActionStepExecution`, `runActionStepActions`, `retryActionStepActions`, `recreateBoundTargetFromContextValue`). Ensure command payloads are minimal, `actionIds` are design-time action definition IDs, and duplicate/invalid action IDs are handled deterministically.
  **Must NOT do**: Do not expose extra helper procedures for context fact options. Do not add public item-level retry/run commands.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-best-practices`] - Reason: routers must stay thin and typed.
  - Omitted: [`hono`] - Reason: this task is router ownership rather than transport implementation detail.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8-9 | Blocked By: 4, 5

  **References**:
  - Methodology router precedent: `packages/api/src/routers/methodology.ts`
  - Runtime router precedent: `packages/api/src/routers/project-runtime.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-step-methodology-router.test.ts`
  - [ ] `bunx vitest run packages/api/src/tests/routers/action-step-runtime-router.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Design-time whole-step router stays whole-step only
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/action-step-methodology-router.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-action-methodology-router.log`
    Expected: PASS; no public action CRUD routes exist, `getActionStepDefinition` returns the whole graph, and context-fact option sourcing stays external to Action-specific helpers
    Evidence: .sisyphus/evidence/task-6-action-methodology-router.log

  Scenario: Runtime action commands use design-time action IDs
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/action-step-runtime-router.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-action-runtime-router.log`
    Expected: PASS; run/retry commands accept non-empty design-time action definition ID arrays, reject duplicates/unknown IDs deterministically, and preserve sequential-order constraints on run commands only
    Evidence: .sisyphus/evidence/task-6-action-runtime-router.log
  ```

  **Commit**: YES | Message: `feat(action-step): add methodology and runtime procedures` | Files: `packages/api/src/routers/**`, `packages/api/src/tests/routers/**`

- [ ] 7. Implement Action-step SSE stream and server wiring

  **What to do**: Implement `streamActionStepExecutionEvents` using the existing SSE envelope/transport patterns. Emit the six locked event types with the locked payload shapes, guarantee ordering per action/item mutation, and keep the stream incremental-only so the UI combines `getActionStepExecutionDetail` snapshot loading with live updates.
  **Must NOT do**: Do not emit full read models on every event. Do not introduce token/chat-style streaming semantics.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `hono`] - Reason: event schemas and transport wiring must stay thin and deterministic.
  - Omitted: [`opencode-sdk`] - Reason: no agent harness transport involved.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8-9 | Blocked By: 5, 6

  **References**:
  - SSE envelope precedent: `packages/contracts/src/sse/envelope.ts`
  - Existing SSE hook precedent: `apps/web/src/lib/use-sse.ts`
  - Agent event stream precedent: `packages/workflow-engine/src/services/runtime/agent-step-event-stream-service.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Event payloads and ordering stay locked
    Tool: Bash
    Steps: run `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-action-sse.log`
    Expected: PASS; the six event types are emitted with the expected payload fields and ordered consistently with the underlying action/item mutations
    Evidence: .sisyphus/evidence/task-7-action-sse.log

  Scenario: Completion eligibility event tracks success gating
    Tool: Bash
    Steps: run `bunx vitest run apps/server/src/tests/sse/action-step-events.test.ts -t "eligibility" --reporter=verbose | tee .sisyphus/evidence/task-7-action-sse-eligibility.log`
    Expected: PASS; `step-completion-eligibility-changed` flips to true only after at least one action succeeds and no action remains running
    Evidence: .sisyphus/evidence/task-7-action-sse-eligibility.log
  ```

  **Commit**: YES | Message: `feat(action-step): add runtime event streaming` | Files: `apps/server/src/**`, `packages/contracts/src/sse/**`

- [ ] 8. Implement Action-step editor and runtime web surfaces

  **What to do**: Build the Action-step dialog in the workflow editor with tabs `Overview`, `Actions`, `Execution`, `Guidance`; implement design-time stacked-dialog authoring for actions and propagation items; implement runtime flat action list, action-wide run button, per-action dialogs, and completion gating in the common step execution section. Runtime must consume `getActionStepExecutionDetail` plus the SSE stream and display disabled/unrun/attention states according to the locked rules.
  **Must NOT do**: Do not create a separate Action route. Do not invent action groups or token-style progress UI.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`web-design-guidelines`, `vercel-react-best-practices`] - Reason: this task is the main UI surface and needs crisp state handling.
  - Omitted: [`opencode-sdk`] - Reason: frontend should consume backend procedures/streams only.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 9 | Blocked By: 4, 6, 7

  **References**:
  - Workflow editor route: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Runtime routes: `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`, `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Dialog precedent: `apps/web/src/features/workflow-editor/agent-step-dialog.tsx`
  - SSE hook precedent: `apps/web/src/lib/use-sse.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx`
  - [ ] `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Action-step editor saves whole graph with nested deltas
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/action-step-editor.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-8-action-editor.log`
    Expected: PASS; the editor submits the whole Action-step payload, preserves existing action/item IDs during edit, and reflects the locked tabs and validation rules
    Evidence: .sisyphus/evidence/task-8-action-editor.log

  Scenario: Runtime action list and dialogs follow the locked model
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/action-step-execution.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-8-action-runtime-ui.log`
    Expected: PASS; the runtime page shows a flat action list, action-wide run button, per-action dialogs with Planned/Current Result/Affected Targets/Recovery sections, and completion gating in the common step section
    Evidence: .sisyphus/evidence/task-8-action-runtime-ui.log
  ```

  **Commit**: YES | Message: `feat(action-step): add editor and runtime web surfaces` | Files: `apps/web/src/**`

- [ ] 9. End-to-end hardening and slice verification

  **What to do**: Add end-to-end coverage across design-time authoring, lazy runtime row creation, whole-step run, manual per-action run, retry, deleted-target recovery, stream-driven UI updates, and manual completion. Validate the prerequisite workflow-activation assumptions for definition-backed-one prefilling and cross-layer value-shape coherence; if those assumptions fail in the current runtime, implement the missing support in this slice rather than leaving the Action behavior implicit. Ensure disabled actions, duplicate commands, and completion-while-running restrictions are enforced. Remove any stale draft assumptions from docs/tests and make the slice green.
  **Must NOT do**: Do not expand into new action kinds or action groups. Do not weaken stream or status contracts for convenience.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`web-design-guidelines`] - Reason: end-to-end verification must confirm the exact UI and runtime behaviors.
  - Omitted: [`opencode-sdk`] - Reason: not relevant to this slice.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: 8

  **References**:
  - Existing e2e directory: `tests/e2e/*`
  - Runtime route tests: `apps/web/src/tests/routes/*`
  - Router/service tests from tasks 5-8

  **Acceptance Criteria** (agent-executable only):
  - [ ] `bunx playwright test tests/e2e/action-step-propagation.spec.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Full action-step propagation user journey
    Tool: Playwright
    Steps: create/update an Action step with multiple propagation actions; start a workflow execution; activate the Action step; confirm no runtime action rows exist before run; run the step; inspect per-action dialogs; resolve a missing bound target through recovery; complete the step after at least one successful action
    Expected: PASS; lazy row creation, action/item statuses, recovery flow, and completion gating all match the locked architecture
    Evidence: .sisyphus/evidence/task-9-action-e2e.trace.zip

  Scenario: Manual commands respect sequential/parallel rules
    Tool: Playwright
    Steps: in sequential mode attempt to manually run a later action before earlier actions; then retry selected actions out of order; repeat in parallel mode with free-form action selection
    Expected: PASS; sequential run commands cannot skip ahead, retry ignores sortOrder, and parallel mode allows selected action execution freely
    Evidence: .sisyphus/evidence/task-9-action-mode-e2e.trace.zip

  Scenario: Definition-backed prefill and cross-layer shape normalization
    Tool: Playwright
    Steps: activate a workflow using a definition-backed external fact where external cardinality is `one` and an external instance already exists; verify the workflow context prefills `instanceId` and `valueJson`; run a create path for external cardinality `many`; confirm the created external `instanceId` is written back to workflow context; inspect resulting project fact / work-unit fact / workflow context shapes for coherence
    Expected: PASS; activation prefill occurs only for external-cardinality-`one`, no auto-bind occurs for external-cardinality-`many`, created instance IDs are rebound into workflow context, and stored value shapes remain uniform across the three runtime layers
    Evidence: .sisyphus/evidence/task-9-definition-backed-prefill.trace.zip
  ```

  **Commit**: YES | Message: `test(action-step): harden propagation execution flow` | Files: `tests/e2e/**`, `apps/web/src/tests/**`, related test files

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - Tool: `task(subagent_type="oracle")`
  - Steps: review the implementation against `.sisyphus/plans/l3-action-step-propagation-final.md`; verify whole-step authoring only, no action groups, no Action-specific step-state table, lazy runtime rows, locked status enums, and stream event contracts.
  - Expected: oracle approves or returns an actionable variance list with no ambiguous findings.
  - Evidence: `.sisyphus/evidence/f1-action-plan-compliance.md`
- [ ] F2. Code Quality Review — unspecified-high
  - Tool: `task(category="unspecified-high")`
  - Steps: review changed files for Effect service quality, layer hygiene, redundant state duplication, and API surface creep.
  - Expected: reviewer approves or returns a file-by-file findings list.
  - Evidence: `.sisyphus/evidence/f2-action-code-quality.md`
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Tool: `task(category="unspecified-high")` + `playwright`
  - Steps: exercise the end-to-end authoring/runtime journey, including disabled actions, lazy row creation, deleted-target recovery, SSE updates, and manual completion.
  - Expected: all journeys pass with no contract drift.
  - Evidence: `.sisyphus/evidence/f3-action-real-qa.md` and Playwright traces under `test-results/**/trace.zip`
- [ ] F4. Scope Fidelity Check — deep
  - Tool: `task(category="deep")`
  - Steps: verify implementation did not add action groups, token streaming, redundant step-state tables, retry history tables, or extra action kinds.
  - Expected: deep review confirms the slice stayed within the locked Action-step propagation scope.
  - Evidence: `.sisyphus/evidence/f4-action-scope-fidelity.md`

## Commit Strategy
- Commit after each task or tightly related task pair using the messages specified under each TODO.
- Keep contracts/schema separate from service/runtime and UI/SSE commits.
- Do not mix whole-step authoring changes with runtime streaming changes in the same commit.

## Success Criteria
- Action-step authoring is whole-step only and persists nested deltas without replace-all churn.
- Action remains an extensible step type while only `propagation` is implemented in this slice.
- Runtime row creation is lazy and truthful to actual execution.
- Bound-target recovery works through explicit recreate/rebind using the current context fact value.
- Manual completion becomes available only after at least one action succeeds and no action is currently running.
- Stream event payloads match the locked contracts and keep the runtime UI in sync without full-read-model spam.
