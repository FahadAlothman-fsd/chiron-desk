# L3 Agent Step Design And Runtime Plan

## TL;DR
> **Summary**: Implement the Agent step as a dedicated L3 slice on top of the already-complete context-facts/Form baseline, with a workflow-editor design-time dialog, execution-bound OpenCode runtime, thin MCP transport, single-stream timeline UX, and shared context/write semantics grounded in the six locked workflow context fact kinds.
> **Deliverables**:
> - Decision-complete design-time Agent-step authoring model, schema, repositories, services, procedures, and dialog UX, including AI Elements `ModelSelector` usage in the Agent dialog
> - Runtime Agent-step state/binding/applied-write persistence, session lifecycle, timeline/history loading, and step-execution UX
> - Thin Chiron MCP route with three v1 tools: `read_step_snapshot`, `read_context_value`, `write_context_value`
> - `HarnessService` abstraction in `packages/agent-runtime` with an `OpencodeHarnessService` implementation and managed server/session lifecycle
> - `packages/sandbox-engine` git truth/query seam for artifact-backed reads/writes
> - Typed oRPC procedures and one step-execution-scoped SSE stream for timeline/tool activity, with AI Elements `PromptInput` and model-selection primitives as the runtime UX baseline
> **Effort**: XL
> **Parallel**: YES - 5 waves + 1 checkpoint gate
> **Critical Path**: 1 → 2/3 → 4 → Checkpoint M1 → 5/6 → 7/8 → 9/10 → 11

## Context
### Original Request
- Deliver a dedicated implementation plan for the Agent step only.
- Use `.sisyphus/plans/l3-step-definition-execution-final.md` as the architecture baseline for where Agent-step design/runtime had previously landed.
- Use the `opencode/gentle-eagle` worktree as reference for MCP + OpenCode server/config behavior.
- Finish design time first, then runtime.

### Interview Summary
- Slice-1 context-facts/Form design time is already complete and authoritative via `.sisyphus/plans/l3-slice-1-design-time-context-facts-form.md`; Agent step is additive, not a rebuild of L3 foundations.
- Immediate v1 MCP scope is three tools only: `read_step_snapshot`, `read_context_value`, `write_context_value`. `request_context_access` is explicitly deferred.
- All six workflow context fact kinds are both readable and writable for Agent steps; differences are in read/write semantics per kind/cardinality, not in permission.
- Design-time Agent-step authoring stays inside the existing workflow editor with one large dialog using TanStack Form, tab dirty indicators, discard confirmation, shadcn `Switch` toggles, AI Elements `ModelSelector` in the Harness & Model tab, and scrollable Read/Write tabs.
- Design-time read scope persists only explicit reads; inferred reads are derived from the write set and never persisted.
- Write scope uses one card per workflow context fact, searchable combobox add, drag-and-drop order, automatic numeric order display, and requirement chips keyed to required context facts.
- Runtime does **not** auto-start the OpenCode session when the step execution is created. The step execution page begins in a `not_started` state with disabled composer and a `Start Session` CTA.
- Runtime source of truth for timeline/tool history is the OpenCode session. Chiron does not create a second chat log table in v1.
- Runtime side panel is one collapsible panel with **Read** and **Write** tabs; progression lives under the Write tab.
- Writes remain conceptually proposals, but in v1 they are auto-approved and immediately mutate context facts.
- Only one step-execution-scoped SSE stream is used in v1, and it is primarily for OpenCode-derived timeline/tool activity. Read/write/progression state updates via query invalidation.
- `HarnessService` must be the public Chiron-facing abstraction, with `OpencodeHarnessService` as the current implementation. `harnessId` resolves internally.
- The repo’s actual convention is `Context.Tag`, not `Effect.Service`, across methodology-engine and workflow-engine. New Agent-step services should follow that convention.
- The git truth seam required for artifact-backed operations is **not implemented yet** and should live in `packages/sandbox-engine`, not `packages/workflow-engine`.

### Metis Review (gaps addressed)
- Freeze explicit state-machine guards for `not_started | starting_session | active_streaming | active_idle | disconnected_or_error | completed`.
- Reuse the immutable methodology version boundary already present in runtime instead of inventing a separate Agent-step definition snapshot table.
- Make `startAgentStepSession` idempotent when a bound or binding session already exists.
- Treat write-item order as presentation/bootstrap ordering only; exposure gating is determined exclusively by requirement satisfaction.
- Persist only **successful applied writes**, never rejected or malformed MCP write attempts.
- Keep `apps/server` MCP transport thin; all MCP business rules live in workflow-engine services.
- Use a fake harness/test adapter before the real OpenCode adapter in tests.
- Do not let artifact/git truth live in Agent services; route it through a new sandbox-engine git query seam.

## Work Objectives
### Core Objective
Implement the Agent step so design-time authoring, runtime session lifecycle, MCP read/write behavior, and OpenCode harness integration all operate through one coherent boundary model: normalized context-fact contracts, thin transport, runtime state split from harness binding, and a future-proof harness abstraction that currently targets OpenCode.

### Deliverables
- Agent-step design-time schema, repositories, read models, mutation services, and dialog UX inside the workflow editor.
- Runtime Agent-step state/binding/applied-write tables and repository seams.
- MCP domain services for snapshot/read/write behavior using the locked six-kind semantics.
- `packages/agent-runtime` harness abstraction (`HarnessService`) and OpenCode implementation (`OpencodeHarnessService`) with managed server/client lifecycle.
- `packages/sandbox-engine` git truth/query seam used by artifact-backed read/write behavior.
- Typed runtime procedures and one step-execution-scoped SSE stream for timeline/tool activity.
- Runtime web Agent-step UX using AI Elements `PromptInput` and provider-grouped model selection behavior.

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/l3-agent-step-contracts.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-agent-step-design-schema.test.ts packages/db/src/tests/repository/l3-agent-step-design-repositories.test.ts`
- `bunx vitest run packages/methodology-engine/src/tests/l3/agent-step-definition-services.test.ts`
- `bunx vitest run packages/api/src/tests/routers/l3-agent-step-design-time-router.test.ts`
- `bunx vitest run packages/db/src/tests/schema/l3-agent-step-runtime-schema.test.ts packages/db/src/tests/repository/l3-agent-step-runtime-repositories.test.ts`
- `bunx vitest run packages/sandbox-engine/src/tests/git-query-service.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-runtime-services.test.ts packages/workflow-engine/src/tests/runtime/agent-step-mcp-services.test.ts`
- `bunx vitest run packages/agent-runtime/src/tests/harness/harness-service-contract.test.ts packages/agent-runtime/src/tests/opencode/opencode-harness-service.test.ts`
- `bunx vitest run packages/api/src/tests/routers/project-runtime-agent-step.test.ts`
- `bunx vitest run apps/web/src/tests/routes/runtime-agent-step-detail.test.tsx`
- `bunx playwright test tests/e2e/agent-step-runtime.spec.ts`
- `bun run check-types`

### Must Have
- Agent-step authoring remains inside the existing workflow editor route and uses one large dialog with tabs: `Overview | Objective & Instructions | Harness & Model | Read Scope | Write Scope | Completion & Runtime Policy | Guidance`.
- Inferred reads are derived from the write set and never persisted.
- Supported read modes are derived from fact kind/source kind and never persisted.
- Only one write card/item may exist per workflow context fact definition.
- Write item requirements depend on context facts broadly and are satisfied when at least one instance/value of the depended-on context fact exists.
- Runtime does **not** auto-start the OpenCode session on step activation. The user must explicitly click `Start Session`.
- Runtime page uses exactly one step-execution-scoped SSE stream in v1, and that stream is primarily for OpenCode-derived timeline/tool activity.
- Runtime side panel is one collapsible panel with `Read` and `Write` tabs; progression lives under the `Write` tab.
- Runtime persistence is split between Chiron-owned state and harness/OpenCode binding state.
- Exactly one active harness binding row may exist per `step_execution_id`.
- Bootstrap/system initialization is applied exactly once per bound session.
- Only successful applied writes are persisted in `agent_step_execution_applied_writes`.
- `HarnessService` is the only public runtime dependency from workflow-engine into agent-runtime.
- Git truth/query seam is added in `packages/sandbox-engine`, not workflow-engine.
- `apps/server` MCP route stays thin and delegates to workflow-engine MCP services.
- `startAgentStepSession` is idempotent when a session is already bound or binding.
- Changing agent/provider/model after session start applies to the **next turn**, not retroactively to previous turns.
- `completed` disables composer input and `Start Session` for that execution in v1.
- Side-panel refresh happens only after successful write-tool completion, never after failed/rejected writes.
- Runtime executes against the immutable methodology version already pinned by the project/workflow execution; no extra Agent-step definition snapshot table is introduced.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No `request_context_access` implementation in v1.
- No separate top-level Agent authoring page.
- No stacked write-item dialog in the design-time Agent-step form.
- No persisted inferred reads.
- No persisted read-mode flags.
- No second live stream for read/write/progression in v1.
- No separate Chiron-native runtime message table or generic interaction/event log in v1.
- No repo/file deletion behavior hidden behind `artifact_reference_fact.remove`; it means remove-from-tracking only.
- No continuation-style injections beyond the initial bootstrap in v1.
- No OpenCode SDK imports outside `packages/agent-runtime`.
- No git truth/query logic embedded directly in Agent-step services or MCP route code.
- No speculative over-classification of provider/model errors beyond normalized harness/OpenCode execution errors.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: tests-after, but in vertical slices with contract/repository/service/API/UI verification before moving forward.
- Exception: one explicit human checkpoint occurs after Wave 2 to validate the design-time experience before runtime work starts.
- QA policy: every task below includes exact commands and evidence paths.
- Harness strategy: use a fake harness adapter in tests before the real OpenCode adapter.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. **Three-tool MCP v1**: implement only `read_step_snapshot`, `read_context_value`, and `write_context_value`; defer `request_context_access`.
2. **Bootstrap only**: inject the initial bootstrap/system-style objective + rules at session start; defer all later continuation injections.
3. **Single SSE stream**: one step-execution-scoped SSE stream per page, primarily for OpenCode-derived timeline/tool activity.
4. **Session start is explicit**: step activation creates the step execution but not the OpenCode session; user clicks `Start Session`.
5. **State split**: runtime Chiron-owned state is separate from harness/OpenCode binding state.
6. **Applied writes only**: persist only successful, valid, auto-approved writes that actually updated context facts.
7. **Write order semantics**: `order` is presentation/bootstrap ordering only; gating is determined solely by requirement satisfaction.
8. **Immutable runtime definition boundary**: runtime resolves against the already-pinned methodology version; later draft edits do not alter live executions.
9. **Harness abstraction**: `HarnessService` is the public Chiron-facing seam; `OpencodeHarnessService` is the current implementation.
10. **Git seam**: artifact/git truth lives in `packages/sandbox-engine` and is reused by Agent and later Action-step behavior.

### Procedure → Service → Repository Boundary
- Procedure rule: auth/validation/error mapping only; call exactly one top-level service method.
- Service rule: `Context.Tag`-style narrow services that compose repositories and existing shared seams.
- Transaction rule: top-level mutation/orchestration stays in `WorkflowAuthoringTransactionService` for design time and `StepExecutionTransactionService` for runtime writes.

### Parallel Execution Waves
Wave 1: contracts + design-time schema/repos + runtime schema/repos
Wave 2: design-time services + minimal OpenCode discovery + design-time API/UI
Checkpoint M1: hard human design-time validation + Metis review gate before runtime
Wave 3: harness contract + fake harness + sandbox-engine git seam + workflow-engine runtime/MCP services
Wave 4: full OpenCode runtime harness adapter + runtime API/SSE
Wave 5: runtime web UX + end-to-end verification + cleanup

### Dependency Matrix
- 1 blocks 2-11
- 2 blocks 3-11
- 3 blocks 4-11
- 4 blocks M1
- M1 blocks 5-11
- 5 blocks 7-11
- 6 blocks 7-11
- 8 blocks 7,9-11
- 7 blocks 9-11
- 9 blocks 10-11
- 10 blocks 11

### Agent Dispatch Summary
- Wave 1 → 3 tasks → deep
- Wave 2 → 2 tasks → deep / visual-engineering
- Checkpoint M1 → 1 gate → human + metis
- Wave 3 → 4 tasks → deep
- Wave 4 → 2 tasks → deep / unspecified-high
- Wave 5 → 1 task → visual-engineering

## TODOs
> Implementation + Test = ONE task. Never separate.
> Every task must encode the already-locked design/runtime architecture and reuse existing repo seams where required.

- [ ] 1. Freeze Agent-step contracts, MCP envelopes, runtime state machine, and deferred scope

  **What to do**: Add/lock typed contracts for the Agent-step design-time payloads, runtime detail payloads, runtime procedure inputs/outputs, normalized SSE event envelope, MCP read/write/snapshot inputs/outputs, and typed error contracts. Encode the locked runtime state machine (`not_started | starting_session | active_streaming | active_idle | disconnected_or_error | completed`), three-tool MCP v1 scope, single-SSE-stream rule, and “applied writes only” semantics. Make the provider/model errors normalized harness/OpenCode execution errors rather than speculative provider-specific families.
  **Must NOT do**: Do not implement storage, services, or UI in this task. Do not reintroduce `request_context_access` into v1 contracts. Do not invent a second live stream or a Chiron-native message log contract.

  **Recommended Agent Profile**:
  - Category: `deep` — Reason: this freezes the architecture surface every later task depends on.
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: typed contracts and error surfaces must align with existing Context.Tag/Effect patterns.
  - Omitted: [`opencode-sdk`] — Reason: no adapter implementation yet.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2-11 | Blocked By: none

  **References**:
  - Plan baseline: `.sisyphus/plans/l3-step-definition-execution-final.md`
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`
  - Existing context fact contracts: `packages/contracts/src/methodology/workflow.ts`
  - Existing runtime detail route surface: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

  **Acceptance Criteria**:
  - [ ] Agent-step design-time payload contract is frozen and matches the locked dialog model.
  - [ ] MCP contracts expose only the three v1 tools and their normalized envelopes.
  - [ ] Runtime state machine is encoded with explicit allowed transitions and no extra states.
  - [ ] Normalized SSE envelope exists and is independent of speculative raw OpenCode event names.

  **QA Scenarios**:
  ```
  Scenario: Contract and state machine freeze
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/l3-agent-step-contracts.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-agent-contracts.log`
    Expected: PASS; output proves three-tool MCP scope, state-machine transitions, runtime detail payloads, and no request_context_access in v1
    Evidence: .sisyphus/evidence/task-1-agent-contracts.log

  Scenario: SSE envelope categories are stable
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/l3-agent-step-sse-envelope.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-agent-sse-contract.log`
    Expected: PASS; output proves typed SSE envelope categories exist for timeline/session/tool activity without a second live state stream
    Evidence: .sisyphus/evidence/task-1-agent-sse-contract.log
  ```

  **Commit**: YES | Message: `feat(agent): lock contracts and runtime states` | Files: `packages/contracts/src/**`, `packages/contracts/src/tests/**`

- [ ] 2. Add Agent-step design-time schema and repositories

  **What to do**: Add the four locked design-time tables: `methodology_workflow_agent_steps`, `methodology_workflow_agent_step_explicit_read_grants`, `methodology_workflow_agent_step_write_items`, and `methodology_workflow_agent_step_write_item_requirements`. Implement repository support for loading/saving the Agent-step child row, explicit reads, write cards, and required-context dependencies. Enforce uniqueness and self-dependency guardrails. Keep inferred reads and read-mode derivation out of persistence.
  **Must NOT do**: Do not persist inferred reads. Do not store read-mode flags. Do not store write-item dependencies as write-item ids.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: repositories must fit the repo’s current seam style and validation patterns.
  - Omitted: [`opencode-sdk`] — Reason: no harness work here.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 3-11 | Blocked By: 1

  **References**:
  - Existing methodology repository seam: `packages/methodology-engine/src/repository.ts`
  - Existing step-type schema direction: `packages/db/src/schema/methodology.ts`
  - Existing form-step pattern: `packages/methodology-engine/src/services/form-step-definition-service.ts`

  **Acceptance Criteria**:
  - [ ] All four design-time Agent-step tables exist with the locked fields and constraints.
  - [ ] Requirements table points to required context-fact definition ids, not write-item ids.
  - [ ] Duplicate explicit reads, duplicate write cards, and self-dependency are rejected deterministically.

  **QA Scenarios**:
  ```
  Scenario: Design-time Agent schema lock
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/l3-agent-step-design-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-agent-design-schema.log`
    Expected: PASS; output confirms all four tables, field constraints, and no inferred-read persistence
    Evidence: .sisyphus/evidence/task-2-agent-design-schema.log

  Scenario: Design-time repository integrity
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-agent-step-design-repositories.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-agent-design-repos.log`
    Expected: PASS; output proves create/update/delete plus duplicate/self-dependency rejection
    Evidence: .sisyphus/evidence/task-2-agent-design-repos.log
  ```

  **Commit**: YES | Message: `feat(agent): add design-time schema and repos` | Files: `packages/db/src/schema/**`, `packages/methodology-engine/src/repository.ts`, `packages/db/src/tests/**`

- [ ] 3. Implement Agent-step design-time services and extend workflow authoring transactions

  **What to do**: Add `AgentStepEditorDefinitionService` and `AgentStepDefinitionService` in repo-consistent `Context.Tag` style. Reuse `WorkflowEditorDefinitionService` as the base read surface and extend `WorkflowAuthoringTransactionService.applyMutation(...)` with Agent-step create/update/delete slots so step shell changes and Agent-step child-table writes occur transactionally. Implement pure helpers for inferred-read derivation, read-mode derivation, write-order normalization, and requirement validation.
  **Must NOT do**: Do not bypass `WorkflowAuthoringTransactionService`. Do not reimplement generic workflow metadata or editor-read seams already present. Do not leak OpenCode concerns into methodology-engine.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: this is the key service-boundary and transaction-integration work.
  - Omitted: [`opencode-sdk`] — Reason: metadata discovery stays behind HarnessService.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 4-11 | Blocked By: 2

  **References**:
  - `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`

  **Acceptance Criteria**:
  - [ ] `getAgentStepDefinition` returns the full locked edit model with inferred reads and derived mode previews.
  - [ ] `createAgentStep` / `updateAgentStep` / `deleteAgentStep` are handled transactionally through the existing authoring transaction seam.
  - [ ] Agent-step payload invariants are enforced with typed errors.

  **QA Scenarios**:
  ```
  Scenario: Agent-step definition services compose correctly
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/l3/agent-step-definition-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-agent-design-services.log`
    Expected: PASS; output proves inferred reads, write-card normalization, and transactional create/update/delete behavior
    Evidence: .sisyphus/evidence/task-3-agent-design-services.log

  Scenario: Workflow authoring transaction reuses Agent step service
    Tool: Bash
    Steps: run `bunx vitest run packages/methodology-engine/src/tests/l3/agent-step-authoring-transaction.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-agent-authoring-tx.log`
    Expected: PASS; output proves create/update/delete Agent-step mutations flow through WorkflowAuthoringTransactionService
    Evidence: .sisyphus/evidence/task-3-agent-authoring-tx.log
  ```

  **Commit**: YES | Message: `feat(agent): add design-time services and tx wiring` | Files: `packages/methodology-engine/src/services/**`, `packages/methodology-engine/src/tests/**`

- [ ] 4. Wire design-time procedures and implement the Agent-step dialog UX

  **What to do**: Add/extend methodology API procedures for `getAgentStepDefinition`, `discoverAgentStepHarnessMetadata`, `createAgentStep`, `updateAgentStep`, and `deleteAgentStep`. In the same wave, add the minimal `HarnessService.discoverMetadata` + `OpencodeHarnessService.discoverMetadata` path needed to make real design-time harness discovery work. Implement the 7-tab Agent-step dialog in the workflow editor with TanStack Form, dirty indicators, discard confirmation, AI Elements `ModelSelector` in the Harness & Model tab, toggle-driven Read Scope table, inline Write Scope cards, drag-and-drop ordering, and Guidance tab. Keep the save path as one full payload mutation.
  **Must NOT do**: Do not add design-time streams. Do not split save into per-tab mutations. Do not reintroduce stacked write-item dialogs. Do not implement runtime session/send/history/stream behavior in this task; discovery-only OpenCode integration is the maximum scope here.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`, `web-design-guidelines`, `effect-best-practices`] — Reason: this is equal parts form architecture and UI ergonomics.
  - Omitted: [`turborepo`] — Reason: no monorepo pipeline redesign needed.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 5-11 | Blocked By: 3

  **References**:
  - Existing workflow editor route: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
  - Existing editor shell/dialog patterns: `apps/web/src/features/workflow-editor/**`
  - AI Elements docs: `https://elements.ai-sdk.dev/components/model-selector`
  - AI Elements registry config: `apps/web/components.json`

  **Acceptance Criteria**:
  - [ ] The Agent-step dialog exactly matches the locked 7-tab structure.
  - [ ] Read Scope shows explicit vs inferred rows correctly.
  - [ ] Write Scope uses combobox + cards + drag-and-drop + chips and no stacked child dialog.
  - [ ] Real design-time harness discovery returns agent/provider/model metadata through the same public HarnessService seam runtime will later use.
  - [ ] Save uses one full payload mutation and dirty/discard handling works.

  **QA Scenarios**:
  ```
  Scenario: Design-time Agent dialog UX matches locked model
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/workflow-editor-agent-step.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-4-agent-editor-ui.log`
    Expected: PASS; output proves tabs, toggles, inferred-read badges, drag-drop order, and discard dialog behavior
    Evidence: .sisyphus/evidence/task-4-agent-editor-ui.log

  Scenario: Design-time Agent procedures stay thin and payload-based
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/l3-agent-step-design-time-router.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-agent-design-router.log`
    Expected: PASS; output proves one full payload mutation and no piecemeal save procedures
    Evidence: .sisyphus/evidence/task-4-agent-design-router.log

  Scenario: Minimal OpenCode discovery works for design time
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-discovery-only.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-opencode-discovery.log`
    Expected: PASS; output proves discovery-only server startup, metadata fetch, normalized agent/provider/model data, and deterministic cleanup without runtime session/send/stream support
    Evidence: .sisyphus/evidence/task-4-opencode-discovery.log
  ```

  **Commit**: YES | Message: `feat(agent): add design-time dialog and procedures` | Files: `packages/api/src/routers/**`, `apps/web/components.json`, `apps/web/src/features/workflow-editor/**`, `apps/web/src/tests/**`

### Checkpoint M1 — Human Design-Time Validation Gate
> This is a hard gate, not an implementation task. Runtime Waves 3-5 do not start until this checkpoint is passed.
- Validate the design-time Agent-step experience in the running app after Wave 2.
- Confirm real harness discovery, tab structure, read/write UX, drag-and-drop ordering, and save/discard behavior feel correct.
- Immediately after human validation, run a focused Metis review on the implemented design-time slice to surface drift before runtime work begins.
- Continue into runtime only after explicit approval.

- [ ] 5. Add runtime schema, repositories, and normalized state split

  **What to do**: Add the runtime Agent-step persistence set: `agent_step_execution_state`, `agent_step_execution_harness_binding`, and `agent_step_execution_applied_writes`, while reusing existing `step_executions`. Keep Chiron-owned state separate from harness binding, and make `agent_step_execution_applied_writes` persist only successful applied writes. Add repository seams for runtime state, harness binding, and applied writes.
  **Must NOT do**: Do not add a Chiron-native messages table, generic interaction log, or second state stream table. Do not persist rejected writes.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: runtime state split and persistence semantics are core architectural constraints.
  - Omitted: [`opencode-sdk`] — Reason: no adapter implementation yet.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7-11 | Blocked By: 1

  **References**:
  - Existing runtime schema patterns: `packages/db/src/schema/runtime.ts`
  - Existing runtime repo patterns: `packages/db/src/runtime-repositories/**`
  - Existing step execution seam: `packages/workflow-engine/src/repositories/step-execution-repository.ts`

  **Acceptance Criteria**:
  - [ ] Runtime state table contains only Chiron-owned Agent-step state.
  - [ ] Harness binding table contains only OpenCode/harness-specific binding/session data.
  - [ ] Applied writes table persists only successful context-fact updates.

  **QA Scenarios**:
  ```
  Scenario: Runtime Agent schema split is correct
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/schema/l3-agent-step-runtime-schema.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-agent-runtime-schema.log`
    Expected: PASS; output confirms state/binding/applied-writes split and absence of a generic chat/event table
    Evidence: .sisyphus/evidence/task-5-agent-runtime-schema.log

  Scenario: Applied writes persist only on successful update
    Tool: Bash
    Steps: run `bunx vitest run packages/db/src/tests/repository/l3-agent-step-runtime-repositories.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-agent-runtime-repos.log`
    Expected: PASS; output proves rejected/invalid writes do not create applied-write rows
    Evidence: .sisyphus/evidence/task-5-agent-runtime-repos.log
  ```

  **Commit**: YES | Message: `feat(agent): add runtime state schema and repos` | Files: `packages/db/src/schema/**`, `packages/db/src/runtime-repositories/**`, `packages/db/src/tests/**`

- [ ] 6. Implement sandbox-engine git truth/query seam

  **What to do**: Add the new git/repo truth seam in `packages/sandbox-engine` for the minimum v1 needs: detect whether the configured root is a git repo, validate/normalize repo-relative paths, resolve commit hashes, resolve blob hashes, and support artifact-backed file membership/identity checks. Return typed not-a-git-repo and path-invalid errors. Use this seam from Agent artifact reads/writes indirectly; do not embed git logic in Agent services.
  **Must NOT do**: Do not put this seam in workflow-engine. Do not expand into worktree/branch orchestration in this slice beyond what is strictly needed for current artifact/git truth.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: this is a reusable infra seam with strong error/validation boundaries.
  - Omitted: [`opencode-sdk`] — Reason: git seam is independent of OpenCode.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7-11 | Blocked By: 1

  **References**:
  - Existing sandbox package root: `packages/sandbox-engine/`
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`
  - Prototype dependency notes: `gentle-eagle` findings summarized in the draft

  **Acceptance Criteria**:
  - [ ] The git seam lives in `packages/sandbox-engine`.
  - [ ] It can detect absence of a git repo and fail with a typed domain error.
  - [ ] It can validate repo-relative paths and resolve commit/blob hashes for artifact-backed operations.

  **QA Scenarios**:
  ```
  Scenario: Sandbox git query seam resolves repo truth deterministically
    Tool: Bash
    Steps: run `bunx vitest run packages/sandbox-engine/src/tests/git-query-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-sandbox-git.log`
    Expected: PASS; output proves git-root detection, path validation, commit/blob lookup, and typed not-a-repo handling
    Evidence: .sisyphus/evidence/task-6-sandbox-git.log
  ```

  **Commit**: YES | Message: `feat(sandbox): add git query seam` | Files: `packages/sandbox-engine/src/**`, `packages/sandbox-engine/src/tests/**`

- [ ] 7. Implement workflow-engine runtime domain and MCP services with a fake harness first

  **What to do**: Add the Agent runtime services in `packages/workflow-engine` using `Context.Tag` and existing shared seams. Implement `AgentStepExecutionDetailService`, `AgentStepTimelineService`, `AgentStepSessionCommandService`, `AgentStepEventStreamService`, `AgentStepSnapshotService`, `AgentStepContextReadService`, `AgentStepContextWriteService`, and optional `AgentStepMcpService` facade. Reuse `StepExecutionDetailService`, `StepExecutionLifecycleService`, `StepProgressionService`, `StepContextQueryService`, `StepContextMutationService`, and `StepExecutionTransactionService`. Build and test first against a fake `HarnessService` implementation before the real OpenCode adapter.
  **Must NOT do**: Do not leak OpenCode SDK types into workflow-engine. Do not bypass shared context/progression/transaction seams. Do not hard-lock speculative OpenCode stream internals into the domain contracts.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: this is the core runtime orchestration and MCP-domain boundary work.
  - Omitted: [`opencode-sdk`] — Reason: fake harness first.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 8-11 | Blocked By: 5, 6

  **References**:
  - Existing shared runtime seams: `packages/workflow-engine/src/services/step-execution-detail-service.ts`, `packages/workflow-engine/src/services/step-progression-service.ts`, `packages/workflow-engine/src/services/step-context-query-service.ts`, `packages/workflow-engine/src/services/step-context-mutation-service.ts`, `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Runtime route shell: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`

  **Acceptance Criteria**:
  - [ ] Runtime detail service returns the full Agent-step page DTO including side-panel data and progression summary.
  - [ ] MCP read/write/snapshot services implement the locked three-tool v1 semantics.
  - [ ] Session start/send/selection commands follow the locked runtime state machine and idempotency rules.
  - [ ] Applied writes are persisted only after successful valid writes.
  - [ ] Write exposure gating is determined solely by requirement satisfaction and not by presentation/bootstrap order.

  **QA Scenarios**:
  ```
  Scenario: Agent runtime services respect state machine and idempotency
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-runtime-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-agent-runtime-services.log`
    Expected: PASS; output proves not_started/start/idle/streaming/error/completed transitions, idempotent session start, and next-turn selection updates
    Evidence: .sisyphus/evidence/task-7-agent-runtime-services.log

  Scenario: MCP domain services enforce read/write contracts
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-mcp-services.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-agent-mcp-services.log`
    Expected: PASS; output proves read mode dispatch, valid write application, newlyExposedWriteItems diffing, and no persistence on invalid writes
    Evidence: .sisyphus/evidence/task-7-agent-mcp-services.log

  Scenario: Write order does not gate exposure
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-write-exposure.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-agent-exposure.log`
    Expected: PASS; output proves exposure is driven only by satisfied requirements and not by presentation/bootstrap order
    Evidence: .sisyphus/evidence/task-7-agent-exposure.log
  ```

  **Commit**: YES | Message: `feat(agent): add runtime domain and mcp services` | Files: `packages/workflow-engine/src/services/**`, `packages/workflow-engine/src/tests/runtime/**`

- [ ] 8. Freeze HarnessService contract and add fake harness adapter in agent-runtime

  **What to do**: Expand the already-introduced `HarnessService` abstraction in `packages/agent-runtime` from discovery-only into the full v1 method family (`discoverMetadata`, `startSession`, `sendMessage`, `getTimelinePage`, `streamSessionEvents`) and provide a fake test adapter that exercises runtime services without OpenCode. Keep all shapes normalized to Chiron-facing DTOs/errors.
  **Must NOT do**: Do not leak OpenCode SDK types through `HarnessService`. Do not put MCP business logic into agent-runtime.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`, `effect-solutions`] — Reason: this is the abstraction contract all runtime services will depend on.
  - Omitted: [`opencode-sdk`] — Reason: this task is abstraction + fake adapter only.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7,9-11 | Blocked By: 1

  **References**:
  - `packages/agent-runtime/`
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`

  **Acceptance Criteria**:
  - [ ] `HarnessService` exists as the only public runtime dependency from workflow-engine into agent-runtime.
  - [ ] A fake harness implementation can drive runtime service tests without OpenCode.
  - [ ] Harness errors are normalized to Chiron-facing typed errors.
  - [ ] Discovery DTOs are frozen early and reused unchanged by the later OpenCode runtime adapter.

  **QA Scenarios**:
  ```
  Scenario: Harness abstraction contract holds without OpenCode
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/harness/harness-service-contract.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-harness-contract.log`
    Expected: PASS; output proves discovery/session/send/timeline/stream methods work behind the unified HarnessService seam
    Evidence: .sisyphus/evidence/task-8-harness-contract.log
  ```

  **Commit**: YES | Message: `feat(agent): freeze harness contract and fake adapter` | Files: `packages/agent-runtime/src/**`, `packages/agent-runtime/src/tests/harness/**`

- [ ] 9. Implement OpencodeHarnessService and managed server/session lifecycle

  **What to do**: Extend the already-implemented discovery-only OpenCode path into the full `OpencodeHarnessService` runtime implementation using `@opencode-ai/sdk`, with internal helpers like `OpencodeServerManagerService` and `OpencodeClientFactoryService`. Start managed OpenCode servers with MCP configured to the Chiron `/mcp` route using the execution-scoped query-param binding. Normalize session creation, send, history, and stream behavior to the `HarnessService` contract. Keep assumptions about exact raw OpenCode stream event names soft until verified in tests.
  **Must NOT do**: Do not expose OpenCode SDK types outside agent-runtime. Do not hard-wire assumptions that were not actually verified in `gentle-eagle`. Do not let agent-runtime own Chiron MCP business semantics.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`opencode-sdk`, `effect-best-practices`, `hono`] — Reason: this is the adapter and lifecycle seam where OpenCode specifics belong.
  - Omitted: [`turborepo`] — Reason: no monorepo pipeline redesign needed.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 10-11 | Blocked By: 8

  **References**:
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`
  - `gentle-eagle` code paths noted in the draft: `apps/server/src/mcp/route.ts`, `packages/agent-runtime/src/opencode-sdk-repository.ts`
  - Dependency baseline: `@modelcontextprotocol/sdk`, `@hono/mcp`, `hono`, `zod`, `@opencode-ai/sdk`

  **Acceptance Criteria**:
  - [ ] Managed OpenCode server startup uses MCP config with execution-scoped query params.
  - [ ] Discovery/session/send/history/stream methods all normalize back to `HarnessService` DTOs.
  - [ ] Server/client resources are cleaned up deterministically.
  - [ ] Raw OpenCode event naming/order is normalized at the adapter boundary and not leaked directly upward.

  **QA Scenarios**:
  ```
  Scenario: OpenCode harness adapter manages lifecycle correctly
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-harness-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-opencode-harness.log`
    Expected: PASS; output proves bound MCP config uses query params, discovery server cleanup works, and runtime send/history/stream paths normalize correctly
    Evidence: .sisyphus/evidence/task-9-opencode-harness.log

  Scenario: Degraded OpenCode behavior is normalized safely
    Tool: Bash
    Steps: run `bunx vitest run packages/agent-runtime/src/tests/opencode/opencode-harness-degraded-mode.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-opencode-degraded.log`
    Expected: PASS; output proves timeline/history/stream/discovery failures are surfaced as normalized harness errors without leaking raw SDK-specific semantics
    Evidence: .sisyphus/evidence/task-9-opencode-degraded.log
  ```

  **Commit**: YES | Message: `feat(agent): add opencode harness adapter` | Files: `packages/agent-runtime/src/**`, `packages/agent-runtime/src/tests/opencode/**`

- [ ] 10. Wire runtime API procedures, MCP transport, and one SSE stream

  **What to do**: Add/extend the runtime API/router surface for `getAgentStepExecutionDetail`, `getAgentStepTimelinePage`, `startAgentStepSession`, `sendAgentStepMessage`, `updateAgentStepTurnSelection`, `completeAgentStepExecution`, and `streamAgentStepSessionEvents`. Implement one step-execution-scoped oRPC SSE stream. Keep `apps/server` MCP route thin and delegate to workflow-engine MCP services. Use the latest compatible versions of the MCP/OpenCode dependency set when implementing.
  **Must NOT do**: Do not add a second live stream for read/write/progression. Do not let the server route own MCP business logic. Do not add `request_context_access` in v1.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`hono`, `effect-best-practices`, `opencode-sdk`] — Reason: this is transport, runtime procedure wiring, and stream integration.
  - Omitted: [`turborepo`] — Reason: no monorepo pipeline redesign needed.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: 11 | Blocked By: 7, 8, 9

  **References**:
  - Existing stream procedure pattern: `packages/api/src/routers/project-runtime.ts`
  - Existing frontend EventSource hook: `apps/web/src/lib/use-sse.ts`
  - MCP route baseline from prototype summarized in the draft

  **Acceptance Criteria**:
  - [ ] Runtime procedures match the locked request/response contracts.
  - [ ] Only one step-execution-scoped SSE stream exists for the page in v1.
  - [ ] MCP transport stays thin and delegates to workflow-engine services.
  - [ ] Runtime page creates exactly one SSE/EventSource subscription per mounted page instance.

  **QA Scenarios**:
  ```
  Scenario: Runtime agent-step procedures and stream contracts hold
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-agent-step.test.ts --reporter=verbose | tee .sisyphus/evidence/task-10-agent-runtime-router.log`
    Expected: PASS; output proves the locked query/mutation/stream contracts, idempotent start behavior, and single-SSE-stream rule
    Evidence: .sisyphus/evidence/task-10-agent-runtime-router.log

  Scenario: Start-session reload/rebind behavior is idempotent
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/project-runtime-agent-step-rebind.test.ts --reporter=verbose | tee .sisyphus/evidence/task-10-agent-runtime-rebind.log`
    Expected: PASS; output proves reload/retry does not create duplicate bindings or duplicate sessions when one is already bound or binding
    Evidence: .sisyphus/evidence/task-10-agent-runtime-rebind.log
  ```

  **Commit**: YES | Message: `feat(agent): wire runtime procedures and mcp transport` | Files: `packages/api/src/routers/**`, `apps/server/src/**`, `packages/api/src/tests/routers/**`

- [ ] 11. Implement runtime web Agent-step UX

  **What to do**: Implement the Agent-step runtime section inside the existing step execution detail page using AI Elements `PromptInput` as the composer baseline and provider-grouped searchable model-selection behavior aligned with `ModelSelector`. Render the runtime states (`not_started`, `starting_session`, `active_streaming`, `active_idle`, `disconnected_or_error`, `completed`), disabled/blurred composer before session start, Start Session CTA, one collapsible Read/Write side panel, and timeline/tool cards that distinguish harness tools vs MCP tools as far as the OpenCode message/tool parts make possible. Use query invalidation to refresh side-panel state after successful Chiron write-tool completion.
  **Must NOT do**: Do not add a second live stream for side-panel state. Do not auto-start sessions on step activation. Do not invent a separate large completion panel outside the Write tab.

  **Recommended Agent Profile**:
  - Category: `visual-engineering`
  - Skills: [`vercel-react-best-practices`, `web-design-guidelines`] — Reason: this is the highest-sensitivity runtime UX surface in the whole slice.
  - Omitted: [`opencode-sdk`] — Reason: frontend consumes normalized procedures/stream, not SDK directly.

  **Parallelization**: Can Parallel: NO | Wave 5 | Blocks: none | Blocked By: 10

  **References**:
  - Existing route shell: `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
  - Existing SSE hook: `apps/web/src/lib/use-sse.ts`
  - AI Elements docs: `https://elements.ai-sdk.dev/components/prompt-input`, `https://elements.ai-sdk.dev/components/model-selector`
  - AI Elements registry config: `apps/web/components.json`
  - Plan authority: `.sisyphus/plans/l3-agent-step-design-runtime.md`

  **Acceptance Criteria**:
  - [ ] Runtime page matches the locked six-state behavior model.
  - [ ] Composer is disabled/blurred until Start Session succeeds.
  - [ ] Read/Write side panel is collapsible and progression lives under Write.
  - [ ] Runtime page uses one SSE stream and query invalidation for side-panel refresh.
  - [ ] Changing agent/provider/model after session start affects the next turn only.

  **QA Scenarios**:
  ```
  Scenario: Agent-step runtime page matches locked user journey
    Tool: Bash
    Steps: run `bunx vitest run apps/web/src/tests/routes/runtime-agent-step-detail.test.tsx --reporter=verbose | tee .sisyphus/evidence/task-11-agent-runtime-ui.log`
    Expected: PASS; output proves not_started/start_session/idle/streaming/error/completed states, disabled composer before start, and Write-tab progression placement
    Evidence: .sisyphus/evidence/task-11-agent-runtime-ui.log

  Scenario: End-to-end Agent-step session start and write propagation
    Tool: Playwright
    Steps: run `bunx playwright test tests/e2e/agent-step-runtime.spec.ts --reporter=line | tee .sisyphus/evidence/task-11-agent-runtime-e2e.log`
    Expected: PASS; output proves Start Session creates session, bootstrap works, timeline streams, successful Chiron writes refresh side-panel state, and manual completion behaves correctly
    Evidence: .sisyphus/evidence/task-11-agent-runtime-e2e.log

  Scenario: Runtime next-turn model change does not mutate previous turns
    Tool: Playwright
    Steps: run `bunx playwright test tests/e2e/agent-step-runtime-next-turn-selection.spec.ts --reporter=line | tee .sisyphus/evidence/task-11-agent-runtime-next-turn.log`
    Expected: PASS; output proves provider/model changes after session start apply only to subsequent turns and previously rendered turn metadata remains unchanged
    Evidence: .sisyphus/evidence/task-11-agent-runtime-next-turn.log
  ```

  **Commit**: YES | Message: `feat(agent): add runtime agent-step experience` | Files: `apps/web/components.json`, `apps/web/src/routes/**`, `apps/web/src/features/**`, `apps/web/src/tests/**`, `tests/e2e/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must approve. Present consolidated results to user and get explicit okay before marking work complete.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
  - Tool: `task(subagent_type="oracle")`
  - Steps: review the implemented changes against `.sisyphus/plans/l3-agent-step-design-runtime.md`; verify design-time dialog structure, runtime state split, three-tool MCP scope, single-SSE-stream rule, explicit session start, HarnessService abstraction, sandbox-engine git seam, and no request_context_access in v1.
  - Expected: oracle approves or returns an actionable variance list with no ambiguous findings.
  - Evidence: `.sisyphus/evidence/f1-agent-plan-compliance.md`
- [ ] F2. Code Quality Review — unspecified-high
  - Tool: `task(category="unspecified-high")`
  - Steps: review changed files for boundary violations, transaction misuse, OpenCode leakage outside agent-runtime, direct git logic outside sandbox-engine, and duplicate runtime stream patterns.
  - Expected: reviewer approves or returns a file-by-file findings list.
  - Evidence: `.sisyphus/evidence/f2-agent-code-quality.md`
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
  - Tool: `task(category="unspecified-high")` + `playwright`
  - Steps: execute the locked user journey: create/edit Agent step, explicit Start Session, `noReply`/`push` start paths, timeline streaming, harness vs MCP tool cards, successful write refresh, side-panel progression, and manual completion path.
  - Expected: all journeys pass with no scope leakage and no hidden second stream.
  - Evidence: `.sisyphus/evidence/f3-agent-real-qa.md` and Playwright traces under `test-results/**/trace.zip`
- [ ] F4. Scope Fidelity Check — deep
  - Tool: `task(category="deep")`
  - Steps: verify the implementation does not include deferred scope such as request_context_access, continuation injections beyond bootstrap, a second live stream, a generic interaction log, or git logic outside sandbox-engine.
  - Expected: deep review confirms implementation stayed within current Agent-step slice scope.
  - Evidence: `.sisyphus/evidence/f4-agent-scope-fidelity.md`

## Commit Strategy
- Commit 1: lock Agent-step contracts, state machine, stream contracts, and deferred-scope boundaries
- Commit 2: add design-time Agent-step schema/repos/services and wire authoring transaction reuse
- Commit 3: freeze harness contract + discovery-only adapter
- Commit 4: add design-time API and dialog UX
- Commit 5: add runtime state/binding/applied-write schema plus sandbox-engine git seam
- Commit 6: add workflow-engine runtime/MCP services with fake harness tests
- Commit 7: extend OpenCode harness adapter to full runtime lifecycle
- Commit 8: wire runtime API/SSE and runtime web UX

## Success Criteria
- Agent-step design time is fully authorable inside the workflow editor with the locked 7-tab dialog and one full save payload.
- Runtime step execution does not auto-start the session; Start Session is explicit and uses the selected agent/provider/model.
- OpenCode session history is the only runtime source of truth for chat/tool history; no second Chiron-native chat log exists.
- Runtime uses one step-execution-scoped SSE stream for timeline/tool activity and query invalidation for side-panel refresh.
- All three v1 MCP tools (`read_step_snapshot`, `read_context_value`, `write_context_value`) are implemented through thin transport and workflow-engine domain services.
- All six workflow context fact kinds follow the locked read/write semantics.
- Only successful applied writes are persisted.
- Harness/OpenCode binding state is separate from Chiron-owned Agent-step runtime state.
- The git truth/query seam exists in `packages/sandbox-engine` and is used by artifact-backed Agent behavior.
- Workflow-engine remains OpenCode-agnostic and agent-runtime remains the only OpenCode-aware package.
