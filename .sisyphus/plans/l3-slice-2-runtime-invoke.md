# L3 Slice 2 Runtime Invoke

## TL;DR
> **Summary**: Implement invoke-only runtime support for the locked 2x2 invoke matrix (`workflow | work_unit` × `fixed_set | context_fact_backed`) with step-execution-detail UI, invoke runtime tables, transactional child-start flows, and completion-time context-fact propagation.
> **Deliverables**:
> - invoke-specific runtime contracts, procedures, services, and DB tables
> - invoke body in runtime step execution detail page
> - workflow/work-unit child start flows with idempotent transactions
> - completion-time propagation into `workflow_reference_fact` and `work_unit_draft_spec_fact`
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: Contracts → DB schema → services/procedures → detail query → step execution UI

## Context
### Original Request
- Create the **invoke-only runtime plan** now.
- Keep branch runtime as a separate later plan.
- Do **not** delete the draft files yet.

### Interview Summary
- Final output must be split into **two separate plans**: invoke runtime and branch runtime.
- Current focus is invoke runtime only.
- Invoke follows the locked design-time 2x2 matrix:
  - target kinds: `workflow | work_unit`
  - source modes: `fixed_set | context_fact_backed`
- Source mode determines **target resolution**.
- Invoke runtime tables determine **execution tracking**.
- Invoke step completion determines **context-fact propagation**.
- Human-readable labels/status text are primary in UI; IDs are supplementary only.
- Workflow-target invoke:
  - completion allowed when **at least one invoked workflow execution has completed**
  - completion propagates `{ workflowDefinitionId, workflowExecutionId }` into `workflow_reference_fact`
- Work-unit-target invoke:
  - completion allowed when **at least one transition for one invoked work unit has completed**
  - completion propagates `{ projectWorkUnitId, workUnitFactInstanceIds[], artifactSnapshotIds[] }` into `work_unit_draft_spec_fact`
- Work-unit child start must create real project-domain entities transactionally:
  - `projectWorkUnit`
  - initial `workUnitFactInstance`s
  - initial `projectArtifactSnapshot`s
  - `transitionExecution`
  - `workflowExecution`
- Context-fact propagation happens only on invoke-step completion, not during child start.
- Invoke step detail page is the primary runtime UI surface; detailed workflow execution page redesign is deferred.

### Metis Review (gaps addressed)
- **Frozen target set**: resolve targets once on step activation, materialize child rows once, and do not re-resolve later.
- **Zero-target behavior**: invoke step is blocked with explicit reason `No invoke targets resolved`; `complete step` disabled.
- **Duplicate-target behavior**: `InvokeTargetResolutionService` canonicalizes and deduplicates resolved targets before child-row creation.
- **Completion semantics**: invoke completion remains an explicit generic `completeStepExecution(...)` action, never automatic.
- **Sibling behavior after parent completion**: unfinished child workflow/transition paths are not cancelled or mutated by invoke-step completion; completion only propagates references and completes the parent step.
- **Idempotency**: both start mutations key idempotency by invoke child row identity, not by best-effort lookup.

## Work Objectives
### Core Objective
Add invoke-only runtime support that lets users inspect, start, monitor, and complete invoke steps from the step execution detail page while keeping execution tracking in invoke runtime tables and writing business-visible outputs to context facts only on completion.

### Deliverables
- Runtime contracts for invoke detail body and invoke-start mutation outputs.
- DB schema for invoke aggregate root, workflow/work-unit child rows, and work-unit created-entity mapping rows.
- Invoke procedures:
  - extended `getRuntimeStepExecutionDetail(projectId, stepExecutionId)`
  - `startInvokeWorkflowTarget(projectId, stepExecutionId, invokeWorkflowTargetExecutionId)`
  - `startInvokeWorkUnitTarget(projectId, stepExecutionId, invokeWorkUnitTargetExecutionId, workflowDefinitionId)`
  - reuse generic `completeStepExecution(...)` for invoke completion
- Services:
  - `InvokeStepDetailService`
  - `InvokeTargetResolutionService`
  - `InvokeWorkflowExecutionService`
  - `InvokeWorkUnitExecutionService`
  - `InvokeCompletionService`
  - `InvokePropagationService`
- Step execution detail invoke UI.

### Definition of Done
- `getRuntimeStepExecutionDetail(...)` returns an invoke-specific body for invoke steps.
- Workflow-target invoke supports: not started, active, completed, failed/unavailable rows with correct actions.
- Work-unit-target invoke supports: blocked, not started, active, completed rows with correct actions.
- `startInvokeWorkflowTarget(...)` and `startInvokeWorkUnitTarget(...)` are idempotent and transactional.
- Invoke completion fails unless the target-kind-specific completion rule is satisfied.
- Invoke completion propagates only references into the correct workflow context fact kind.
- Invoke runtime tables are the active ledger; context facts are not written until completion.
- No invoke-specific stream is required in v1.

### Must Have
- Frozen resolved target set at step activation.
- Separate invoke aggregate root under `invoke_step_execution_state`.
- Child rows linked to `invoke_step_execution_state`, not directly to `step_executions`.
- Human-readable-first UI.
- Explicit disabled reasons for blocked actions.

### Must NOT Have
- No branch runtime work in this plan.
- No workflow execution page redesign in this plan.
- No invoke-specific SSE/streaming in v1.
- No context-fact propagation during child start.
- No duplication of invoke target kind/source mode in runtime root row unless later justified.
- No partial work-unit entity creation surviving failed start mutations.

## Verification Strategy
> All technical verification is agent-executed. After the verification wave completes, present the results to the user and wait for explicit approval before treating the invoke runtime work as fully complete.
- Test decision: tests-after using existing Vitest/unit/integration patterns
- QA policy: every task includes service/query/UI verification scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Runtime Surface Inventory
### Pages
- **Alter** `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - add invoke body for `stepType = invoke`
  - shared shell: step name, type icon, state, target kind, source mode, completion rule, complete-step action
  - workflow child rows:
    - label
    - status (`not_started | active | completed | failed | unavailable`)
    - active child step label when active
    - start/open actions
  - work-unit child rows:
    - work unit label
    - transition label
    - workflow label
    - current work-unit state label
    - status (`not_started | blocked | active | completed | failed | unavailable`)
    - blocked reason
    - available primary workflows when startable
    - start/open actions
  - propagation preview block
- **Out of scope for now**: detailed workflow execution page redesign; only note future React Flow canvas work.

### Procedures
- **Query** `getRuntimeStepExecutionDetail(projectId, stepExecutionId)`
  - reason: single page-load source for invoke step detail
  - output must include invoke body when `stepType = invoke`
- **Mutation** `startInvokeWorkflowTarget(projectId, stepExecutionId, invokeWorkflowTargetExecutionId)`
  - reason: start one specific workflow child row
  - output:
    - `invokeWorkflowTargetExecutionId`
    - `workflowExecutionId`
    - `result: started | already_started`
- **Mutation** `startInvokeWorkUnitTarget(projectId, stepExecutionId, invokeWorkUnitTargetExecutionId, workflowDefinitionId)`
  - reason: start one specific work-unit child row/path
  - output:
    - `invokeWorkUnitTargetExecutionId`
    - `projectWorkUnitId`
    - `transitionExecutionId`
    - `workflowExecutionId`
    - `result: started | already_started`
- **Mutation** existing `completeStepExecution(...)`
  - reason: invoke completion is explicit generic step completion; invoke-specific propagation runs inside completion flow
- **Streams** none in v1

### Services
- `InvokeStepDetailService`
  - assemble invoke step detail body
  - resolve labels, statuses, action availability, completion summary, propagation preview
- `InvokeTargetResolutionService`
  - resolve and deduplicate targets from `fixed_set` or `context_fact_backed`
- `InvokeWorkflowExecutionService`
  - materialize workflow child rows on activation
  - idempotent workflow child start behavior
- `InvokeWorkUnitExecutionService`
  - materialize work-unit child rows on activation
  - transactional creation of project-domain entities on child start
  - blocked/available logic for work-unit transitions and primary workflow selection
- `InvokeCompletionService`
  - completion eligibility checks
  - orchestrates completion + propagation
- `InvokePropagationService`
  - writes context-fact outputs on completion only

### DB Tables
- `invoke_step_execution_state`
  - root invoke aggregate
  - fields:
    - `id`: PK, ID/string, not null
    - `stepExecutionId`: unique FK to `step_executions`, ID/string, not null
    - `invokeStepDefinitionId`: FK to invoke step definition, ID/string, not null
    - `createdAt`: timestamp, not null
    - `updatedAt`: timestamp, not null
- `invoke_workflow_target_execution`
  - one row per resolved workflow target
  - fields:
    - `id`: PK, ID/string, not null
    - `invokeStepExecutionStateId`: FK to invoke root, ID/string, not null
    - `workflowDefinitionId`: resolved workflow definition, ID/string, not null
    - `workflowExecutionId`: nullable ID/string; null means not started yet
    - `resolutionOrder`: nullable integer; expected to be populated on child-row creation
    - `createdAt`: timestamp, not null
    - `updatedAt`: timestamp, not null
- `invoke_work_unit_target_execution`
  - one row per resolved work-unit target/path
  - fields:
    - `id`: PK, ID/string, not null
    - `invokeStepExecutionStateId`: FK to invoke root, ID/string, not null
    - `projectWorkUnitId`: nullable ID/string; null means not created/resolved yet
    - `workUnitDefinitionId`: ID/string, not null
    - `transitionDefinitionId`: ID/string, not null
    - `transitionExecutionId`: nullable ID/string; null means transition not started yet
    - `workflowDefinitionId`: nullable ID/string; null means no workflow selected/launched yet
    - `workflowExecutionId`: nullable ID/string; null means no child workflow started yet
    - `createdAt`: timestamp, not null
    - `updatedAt`: timestamp, not null
- `invoke_work_unit_created_fact_instance`
  - mapping row for each created work-unit fact instance
  - fields:
    - `id`: PK, ID/string, not null
    - `invokeWorkUnitTargetExecutionId`: FK to work-unit invoke child row, ID/string, not null
    - `factDefinitionId`: ID/string, not null
    - `workUnitFactInstanceId`: ID/string, not null
    - `createdAt`: timestamp, not null
- `invoke_work_unit_created_artifact_snapshot`
  - mapping row for each created artifact snapshot
  - fields:
    - `id`: PK, ID/string, not null
    - `invokeWorkUnitTargetExecutionId`: FK to work-unit invoke child row, ID/string, not null
    - `artifactSlotDefinitionId`: ID/string, not null
    - `artifactSnapshotId`: ID/string, not null
    - `createdAt`: timestamp, not null

## Execution Strategy
### Parallel Execution Waves
Wave 1: contracts + schema + repository/service interfaces
Wave 2: child-start services + completion/propagation services + procedures
Wave 3: detail query + step execution detail UI + integration tests

### Dependency Matrix
- Task 1 blocks all downstream work
- Task 2 blocks 3-8
- Task 3 blocks 4-8
- Task 4 blocks 7-8
- Task 5 blocks 7-8
- Task 6 blocks 8
- Task 7 blocks 8

### Agent Dispatch Summary
- Wave 1 → deep / unspecified-high
- Wave 2 → deep / unspecified-high
- Wave 3 → visual-engineering / unspecified-high

## TODOs
- [ ] 1. Lock invoke runtime contracts and query shapes

  **What to do**: Update invoke runtime contracts so invoke is a first-class runtime step body and command surface. Define typed outputs for `getRuntimeStepExecutionDetail(...)`, `startInvokeWorkflowTarget(...)`, and `startInvokeWorkUnitTarget(...)` using the exact human-readable-first read-model and command outputs agreed in discussion.
  **Must NOT do**: Do not add branch runtime contracts here. Do not introduce invoke streaming. Do not make command mutations return the full page body.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: contracts freeze every downstream runtime surface.
  - Skills: [`effect-best-practices`] - Reason: typed service/contract boundaries should align with Effect service design.
  - Omitted: [`effect-review`] - Reason: not a review pass.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-8 | Blocked By: none

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/contracts/src/runtime/executions.ts`
  - Pattern: `packages/contracts/src/methodology/workflow.ts`
  - Router consumer: `packages/api/src/routers/project-runtime.ts`

  **Acceptance Criteria**:
  - [ ] Invoke step detail has a typed invoke body for `stepType = invoke`.
  - [ ] `startInvokeWorkflowTarget` output is exactly `{ invokeWorkflowTargetExecutionId, workflowExecutionId, result }`.
  - [ ] `startInvokeWorkUnitTarget` output is exactly `{ invokeWorkUnitTargetExecutionId, projectWorkUnitId, transitionExecutionId, workflowExecutionId, result }`.
  - [ ] Human-readable-first labels are represented in the invoke detail read model; IDs are secondary fields only.

  **QA Scenarios**:
  ```
  Scenario: Invoke runtime contracts compile and round-trip
    Tool: Bash
    Steps: Run `bunx vitest run packages/contracts/src/tests/l3-runtime-invoke-contracts.test.ts`
    Expected: PASS; invoke detail/query/mutation payloads match the locked invoke runtime shape
    Evidence: .sisyphus/evidence/task-1-invoke-contracts.txt

  Scenario: Command outputs stay narrow and idempotent-aware
    Tool: Bash
    Steps: Re-run the same suite and assert start-mutation outputs expose IDs + result enum only, not full invoke body payloads
    Expected: PASS; command surfaces remain command-oriented
    Evidence: .sisyphus/evidence/task-1-invoke-contracts-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-contracts): lock invoke runtime step surfaces` | Files: `packages/contracts/src/**`

- [ ] 2. Add invoke runtime schema and mapping tables

  **What to do**: Add the invoke runtime aggregate root and child tables to `packages/db/src/schema/runtime.ts` and related schema tests: `invoke_step_execution_state`, `invoke_workflow_target_execution`, `invoke_work_unit_target_execution`, `invoke_work_unit_created_fact_instance`, and `invoke_work_unit_created_artifact_snapshot`.
  **Must NOT do**: Do not store target kind/source mode redundantly in the invoke root row. Do not link child rows directly to `step_executions`. Do not make `resolutionOrder` required at schema level.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: schema authority and FK layout must be exact.
  - Skills: [`effect-best-practices`] - Reason: service/repo layering depends on the right aggregate structure.
  - Omitted: [`effect-review`] - Reason: focused schema work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3-8 | Blocked By: 1

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/db/src/schema/runtime.ts`
  - Pattern: `packages/db/src/tests/schema/runtime-schema.test.ts`

  **Acceptance Criteria**:
  - [ ] Invoke aggregate root stores `stepExecutionId` + `invokeStepDefinitionId` and timestamps.
  - [ ] Workflow/work-unit child rows link to `invokeStepExecutionStateId`.
  - [ ] Work-unit mapping tables exist for created fact instances and artifact snapshots.
  - [ ] `resolutionOrder` is nullable at schema level.

  **QA Scenarios**:
  ```
  Scenario: Invoke runtime schema matches the locked aggregate design
    Tool: Bash
    Steps: Run `bunx vitest run packages/db/src/tests/schema/l3-runtime-invoke-schema.test.ts`
    Expected: PASS; invoke root/child/mapping tables, nullability, and FK relationships match the plan
    Evidence: .sisyphus/evidence/task-2-invoke-schema.txt

  Scenario: Child rows cannot bypass the invoke aggregate root
    Tool: Bash
    Steps: Re-run the same suite and assert child rows require valid `invokeStepExecutionStateId` and cannot link directly to generic step IDs
    Expected: PASS; invoke aggregate boundary is enforced in schema
    Evidence: .sisyphus/evidence/task-2-invoke-schema-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-db): add invoke runtime tables and mappings` | Files: `packages/db/src/schema/**`, `packages/db/src/tests/schema/**`

- [ ] 3. Implement invoke aggregate repositories and target resolution

  **What to do**: Add repository seams for invoke root/child/mapping tables and implement `InvokeTargetResolutionService` so targets are resolved once on step activation, deduplicated, assigned `resolutionOrder`, and frozen for the life of the invoke step.
  **Must NOT do**: Do not re-resolve targets after activation. Do not leave duplicate target materialization behavior ambiguous. Do not mix child creation into target resolution.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: lifecycle and deduplication semantics must be frozen here.
  - Skills: [`effect-best-practices`] - Reason: service/repo split and idempotent semantics.
  - Omitted: [`effect-review`] - Reason: implementation pass.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4-8 | Blocked By: 2

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/workflow-engine/src/repositories/step-execution-repository.ts`
  - Pattern: `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`

  **Acceptance Criteria**:
  - [ ] Invoke aggregate root is created when an invoke step activates.
  - [ ] Workflow/work-unit child rows are materialized on step activation, before child execution starts.
  - [ ] Duplicate resolved targets are deduplicated canonically.
  - [ ] Zero resolved targets produce a blocked invoke step with explicit reason.

  **QA Scenarios**:
  ```
  Scenario: Target resolution materializes frozen child rows on activation
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-target-resolution.test.ts`
    Expected: PASS; activation creates invoke child rows once, assigns `resolutionOrder`, and freezes the resolved set
    Evidence: .sisyphus/evidence/task-3-invoke-resolution.txt

  Scenario: Duplicate and zero-target cases are handled deterministically
    Tool: Bash
    Steps: Re-run the same suite with duplicate and zero-target fixtures
    Expected: PASS; duplicates collapse deterministically and zero targets block completion with explicit reason
    Evidence: .sisyphus/evidence/task-3-invoke-resolution-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke): add aggregate repositories and target resolution` | Files: `packages/workflow-engine/src/**`, `packages/db/src/**`

- [ ] 4. Implement workflow child start flow

  **What to do**: Implement `InvokeWorkflowExecutionService` and `startInvokeWorkflowTarget(...)` so workflow-target invoke children start idempotently from a pre-materialized child row and record `workflowExecutionId` transactionally.
  **Must NOT do**: Do not accept loose workflow definition IDs as the authoritative row identity. Do not create duplicate child workflow executions for active/completed rows.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: idempotent runtime command behavior is critical.
  - Skills: [`effect-best-practices`] - Reason: transactional service boundaries and typed errors.
  - Omitted: [`effect-review`] - Reason: implementation pass.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7-8 | Blocked By: 3

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Pattern: `packages/api/src/routers/project-runtime.ts`

  **Acceptance Criteria**:
  - [ ] `startInvokeWorkflowTarget` takes `invokeWorkflowTargetExecutionId`, not a loose target definition lookup.
  - [ ] Existing started child rows return `result = already_started` without duplication.
  - [ ] Newly started rows persist `workflowExecutionId` and `resolutionOrder`.

  **QA Scenarios**:
  ```
  Scenario: Workflow child start is idempotent
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-workflow-start.test.ts`
    Expected: PASS; first call returns `started`, repeated call returns `already_started` with the same workflow execution ID
    Evidence: .sisyphus/evidence/task-4-invoke-workflow-start.txt

  Scenario: Missing or foreign child row fails safely
    Tool: Bash
    Steps: Re-run the same suite with invalid child-row IDs
    Expected: PASS; mutation fails without creating orphan child executions
    Evidence: .sisyphus/evidence/task-4-invoke-workflow-start-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke): add workflow child start flow` | Files: `packages/workflow-engine/src/**`, `packages/api/src/**`

- [ ] 5. Implement work-unit child start flow and mapping-row creation

  **What to do**: Implement `InvokeWorkUnitExecutionService` and `startInvokeWorkUnitTarget(...)` so work-unit-target invoke child start is one transaction that creates/resolves the project work unit, initial work-unit fact instances, initial artifact snapshots, mapping rows, transition execution, and child workflow execution, then updates the invoke child row.
  **Must NOT do**: Do not delay project work-unit fact/artifact creation until invoke completion. Do not allow partial domain entity creation to survive failed starts. Do not start blocked transitions or invalid workflow selections.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: this is the highest-risk transactional path in invoke runtime.
  - Skills: [`effect-best-practices`] - Reason: transactional orchestration and idempotent service boundaries.
  - Omitted: [`effect-review`] - Reason: implementation pass.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 6-8 | Blocked By: 3

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Pattern: `packages/db/src/runtime-repositories/artifact-repository.ts`

  **Acceptance Criteria**:
  - [ ] `startInvokeWorkUnitTarget` takes `invokeWorkUnitTargetExecutionId` + selected `workflowDefinitionId`.
  - [ ] Work-unit child start creates project-domain entities and execution entities in one transaction.
  - [ ] Mapping rows capture the exact created fact-instance IDs and artifact-snapshot IDs.
  - [ ] Existing started child rows return `result = already_started` without duplication.
  - [ ] Blocked transitions and invalid workflow selections fail before creation.

  **QA Scenarios**:
  ```
  Scenario: Work-unit child start creates full domain + execution path transactionally
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-workunit-start.test.ts`
    Expected: PASS; work unit, fact instances, artifact snapshots, transition execution, workflow execution, and mapping rows are all created and linked in one successful start
    Evidence: .sisyphus/evidence/task-5-invoke-workunit-start.txt

  Scenario: Partial failure rolls everything back
    Tool: Bash
    Steps: Re-run the same suite with an injected failure after fact/artifact creation but before child-row update
    Expected: PASS; no partial work-unit domain or execution entities survive the failed start
    Evidence: .sisyphus/evidence/task-5-invoke-workunit-start-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke): add work-unit child start flow` | Files: `packages/workflow-engine/src/**`, `packages/db/src/**`, `packages/api/src/**`

- [ ] 6. Implement invoke completion and propagation

  **What to do**: Implement `InvokeCompletionService` and `InvokePropagationService` so invoke completion re-checks target-kind-specific completion rules, propagates only references into the appropriate workflow context fact kind, and then completes the generic step execution.
  **Must NOT do**: Do not propagate during active execution. Do not create duplicate propagation rows on completion retry. Do not treat work-unit child entity creation as part of propagation.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: completion semantics and propagation idempotency are core runtime behavior.
  - Skills: [`effect-best-practices`] - Reason: separate creation vs propagation service boundaries.
  - Omitted: [`effect-review`] - Reason: implementation pass.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 7-8 | Blocked By: 4,5

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Pattern: `packages/workflow-engine/src/services/step-context-mutation-service.ts`

  **Acceptance Criteria**:
  - [ ] Workflow-target invoke completes only when at least one child workflow execution is completed.
  - [ ] Work-unit-target invoke completes only when at least one child transition path is completed.
  - [ ] Workflow propagation writes `{ workflowDefinitionId, workflowExecutionId }` to `workflow_reference_fact`.
  - [ ] Work-unit propagation writes `{ projectWorkUnitId, workUnitFactInstanceIds[], artifactSnapshotIds[] }` to `work_unit_draft_spec_fact`.
  - [ ] If explicit output selections exist, only those IDs are propagated; otherwise all available IDs are propagated.
  - [ ] Completion retry is idempotent.

  **QA Scenarios**:
  ```
  Scenario: Invoke completion propagates correct reference outputs
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-completion.test.ts`
    Expected: PASS; workflow/work-unit invoke completion writes the correct context-fact references only after completion criteria are met
    Evidence: .sisyphus/evidence/task-6-invoke-completion.txt

  Scenario: Completion retry does not duplicate propagation
    Tool: Bash
    Steps: Re-run the same suite with repeated completion calls
    Expected: PASS; second completion is idempotent and does not duplicate context-fact outputs
    Evidence: .sisyphus/evidence/task-6-invoke-completion-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke): add completion and propagation flow` | Files: `packages/workflow-engine/src/**`, `packages/api/src/**`

- [ ] 7. Extend step detail query with invoke body and actions

  **What to do**: Extend `getRuntimeStepExecutionDetail(...)` and implement `InvokeStepDetailService` so invoke step detail returns the full typed invoke body: shared shell fields, workflow/work-unit child rows, action availability, blocked reasons, completion summary, and propagation preview.
  **Must NOT do**: Do not make IDs the primary visible fields. Do not split invoke into a separate page. Do not add invoke streaming.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: query shape is the runtime contract for the UI.
  - Skills: [`effect-best-practices`] - Reason: read-model assembly from multiple services.
  - Omitted: [`effect-review`] - Reason: implementation pass.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8 | Blocked By: 4,5,6

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - Pattern: `packages/api/src/routers/project-runtime.ts`

  **Acceptance Criteria**:
  - [ ] Invoke body is returned from the existing step detail query for invoke steps.
  - [ ] Workflow/work-unit child rows expose human-readable labels and action availability.
  - [ ] Propagation preview is included.
  - [ ] Disabled reasons are explicit for blocked actions and incomplete completion criteria.

  **QA Scenarios**:
  ```
  Scenario: Step detail query returns invoke-specific body
    Tool: Bash
    Steps: Run `bunx vitest run packages/workflow-engine/src/tests/runtime/runtime-invoke-step-detail.test.ts`
    Expected: PASS; invoke steps return the full invoke body with correct child rows, actions, and propagation preview
    Evidence: .sisyphus/evidence/task-7-invoke-detail.txt

  Scenario: Human-readable-first display fields are present
    Tool: Bash
    Steps: Re-run the same suite and assert labels/status text are primary while IDs remain secondary/optional
    Expected: PASS; query shape supports the intended invoke UI convention
    Evidence: .sisyphus/evidence/task-7-invoke-detail-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke): add invoke step detail query body` | Files: `packages/workflow-engine/src/**`, `packages/api/src/**`

- [ ] 8. Implement invoke step execution detail UI

  **What to do**: Update `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` so invoke steps render the agreed invoke section, including shared shell, workflow/work-unit rows, primary workflow selection for startable work-unit rows, propagation preview, and complete-step behavior.
  **Must NOT do**: Do not redesign the workflow execution page here. Do not foreground raw IDs. Do not depend on invoke-specific streams.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: step execution detail is the main human-facing invoke runtime surface.
  - Skills: [`effect-best-practices`] - Reason: keep UI aligned with query/action contracts and result handling.
  - Omitted: [`web-design-guidelines`] - Reason: not the main focus unless UI polish is needed later.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification Wave | Blocked By: 7

  **References**:
  - Authority: `.sisyphus/drafts/l3-slice-2-runtime-invoke-branch.md`
  - Pattern: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Pattern: `packages/contracts/src/runtime/executions.ts`

  **Acceptance Criteria**:
  - [ ] Invoke step execution detail renders workflow/work-unit invoke children with the agreed state/action matrix.
  - [ ] Human-readable labels/status text are primary; IDs are supplementary only.
  - [ ] Workflow rows support start/open behavior.
  - [ ] Work-unit rows support primary-workflow selection, start/open behavior, and blocked reasons.
  - [ ] Page invalidates/refetches step detail after successful start/complete mutations.

  **QA Scenarios**:
  ```
  Scenario: Invoke step detail UI supports workflow and work-unit interactions
    Tool: Bash
    Steps: Run `bunx vitest run apps/web/src/tests/routes/runtime-invoke-step-detail.test.tsx`
    Expected: PASS; invoke section renders the correct controls and responds to state changes after refetch
    Evidence: .sisyphus/evidence/task-8-invoke-ui.txt

  Scenario: Blocked and already-started states are rendered correctly
    Tool: Bash
    Steps: Re-run the same suite with blocked work-unit rows and already-started child rows
    Expected: PASS; blocked rows suppress start, already-started rows show open actions and no duplicate-start affordance
    Evidence: .sisyphus/evidence/task-8-invoke-ui-error.txt
  ```

  **Commit**: YES | Message: `feat(runtime-invoke-ui): add invoke step detail experience` | Files: `apps/web/src/routes/**`, `apps/web/src/tests/routes/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

  **Verification Scenarios**:
  ```
  Scenario: F1 Plan Compliance Audit
    Tool: task/oracle
    Steps: Review the final invoke implementation against this plan only; confirm invoke runtime pages, procedures, services, tables, lifecycle, and propagation behavior match the locked decisions with no branch/runtime scope creep.
    Expected: PASS; oracle reports no plan deviations or identifies exact deviations to fix.
    Evidence: .sisyphus/evidence/f1-invoke-plan-compliance.txt

  Scenario: F2 Code Quality Review
    Tool: task/unspecified-high
    Steps: Review the final invoke implementation for code quality, Effect service boundaries, transaction safety, idempotency, naming clarity, and avoidance of duplicated ledger/business-state logic.
    Expected: PASS; reviewer reports no blocking code-quality issues or lists exact fixes.
    Evidence: .sisyphus/evidence/f2-invoke-code-quality.txt

  Scenario: F3 Real Manual QA
    Tool: task/unspecified-high (+ playwright if UI)
    Steps: Exercise invoke step detail end-to-end for workflow and work-unit targets: not-started, active, completed, blocked, already-started, and completion propagation paths; capture screenshots and mutation results.
    Expected: PASS; UI actions, disabled reasons, refetch behavior, and completion propagation all behave exactly as specified.
    Evidence: .sisyphus/evidence/f3-invoke-manual-qa.txt

  Scenario: F4 Scope Fidelity Check
    Tool: task/deep
    Steps: Review changed files and verify the work stayed invoke-only: no branch runtime implementation, no workflow execution page redesign, no invoke streaming, no redundant source-mode ledger split.
    Expected: PASS; final diff stays within invoke runtime scope and respects the plan guardrails.
    Evidence: .sisyphus/evidence/f4-invoke-scope-fidelity.txt
  ```

## Commit Strategy
- Commit 1: lock invoke runtime contracts.
- Commit 2: add invoke runtime schema and mapping tables.
- Commit 3: add invoke repositories and frozen target resolution.
- Commit 4: add workflow/work-unit child start flows.
- Commit 5: add invoke completion and propagation.
- Commit 6: extend invoke detail query.
- Commit 7: add invoke step detail UI.

## Success Criteria
- Invoke runtime is implemented as a separate runtime concern from branch runtime.
- All four invoke variants share the same architectural split: source mode resolves targets, invoke tables track execution, completion propagates context outputs.
- Workflow-target invoke behaves consistently across fixed-set and context-fact-backed sources.
- Work-unit-target invoke behaves consistently across fixed-set and context-fact-backed sources.
- Work-unit child start creates real project-domain entities transactionally.
- Completion propagates only references into workflow context facts.
- Step execution detail is the primary invoke runtime UI surface and uses human-readable display first.
