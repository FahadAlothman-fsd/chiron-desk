# L3 Plan B — Fact Unification + Runtime Validation

## TL;DR
> **Summary**: Follow Plan A with a bounded system plan that unifies design-time and runtime fact shapes, introduces one shared decode/normalize/validate pipeline, hardens all approved fact write boundaries, upgrades `work_unit_draft_spec_fact` to the richer nested payload, and closes the agent/MCP/runtime fact CRUD audit. Preserve the existing storage model unless compatibility testing proves storage itself is blocking correctness.
> **Deliverables**:
> - Canonical fact value/instance model spanning methodology facts, runtime facts, and workflow-context facts
> - Shared runtime decode → normalize → validate pipeline
> - Hardening of agent/MCP/form/project-runtime/context write boundaries
> - Richer invoke `work_unit_draft_spec_fact` payload with compatibility policy
> - Fact CRUD surface inventory, remediation matrix, and no-bypass regression proof
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: Inventory/fixtures → Canonical model → Shared pipeline → Boundary hardening → Invoke payload upgrade → Audit closure

## Context
### Original Request
- Generate Plan B as the follow-on to Plan A.
- Discuss how design-time and runtime fact shapes will be unified and what can be normalized.
- Make sure Plan A explicitly points at Plan B as the next system plan.

### Prerequisite
- **Plan A first**: `.sisyphus/plans/l3-plan-a-action-branch-gates.md`
- Plan B assumes Action and runtime Branch exist already and treats their new fact-touching surfaces as part of the hardening inventory rather than reopening their feature semantics.

### Audit Summary
- Design-time fact contracts are mostly sound.
- Core runtime storage tables are mostly sound.
- The real systemic problem is cross-layer `valueJson` shape drift and the lack of a centralized decode/normalize/validate path.
- Agent-step, MCP, and project-runtime write boundaries still accept raw/unknown values with weak runtime enforcement of methodology fact rules.
- Existing invoke propagation is correct within its current flat-shape assumptions, but the richer `work_unit_draft_spec_fact` payload is deferred to this plan.

### Metis Review (gaps addressed)
- Keep storage intact unless compatibility fixtures prove storage is itself blocking correctness.
- Start with fixtures and surface inventory before enforcement changes.
- Define one canonical runtime fact model and one shared pipeline; do not harden boundaries independently with ad hoc logic.
- Treat richer `work_unit_draft_spec_fact` payload work as a bounded subtrack, not a general invoke redesign.
- Add explicit read-compatibility policy for legacy rows before turning on hard rejection.
- Close with a no-bypass audit proving every approved fact write path uses the shared pipeline.

## Work Objectives
### Core Objective
Unify fact interpretation and validation across design time and runtime by defining a canonical runtime fact model, routing all approved fact writes through one decode/normalize/validate pipeline, and converging read/write surfaces on that model without rewriting the underlying storage layout.

### Deliverables
- Canonical fact model and compatibility policy in `packages/contracts`
- Shared runtime fact codec/normalizer/validator in `packages/workflow-engine`
- Hardened write boundaries in MCP, agent-step, form/context mutation, and project-runtime fact APIs
- Richer invoke `work_unit_draft_spec_fact` payload and compatibility handling in `packages/workflow-engine` and `packages/contracts`
- Fact CRUD surface inventory with remediation ownership and regression proof

### Canonical Runtime Fact Model (locked for Plan B)
1. **Design-time remains the authority** for fact type, cardinality, validation rules, and context-fact kind.
2. **Underlying fact-type canonical values**:
   - `string` → direct string
   - `number` → direct number
   - `boolean` → direct boolean
   - `json` → direct JSON value
   - `work_unit` → canonical object `{ projectWorkUnitId: string }`
3. **Project facts / work-unit facts**:
   - canonical domain value uses the underlying fact-type canonical value
   - for work-unit references, `referencedProjectWorkUnitId` remains storage-authoritative where that column exists; codecs expose `{ projectWorkUnitId }`
4. **Workflow context fact kinds**:
   - `plain_value_fact` → underlying fact-type canonical value
   - `definition_backed_external_fact` / `bound_external_fact` → `{ instanceId: string | null, value: <underlying fact-type canonical value> }`
   - `workflow_reference_fact` → `{ workflowDefinitionId: string, workflowExecutionId: string }`
   - `artifact_reference_fact` → `{ artifactSnapshotId: string, artifactSlotDefinitionId: string | null, relativePath: string, gitCommitHash: string | null, gitBlobHash: string | null }`
   - `work_unit_draft_spec_fact` → `{ instance: { projectWorkUnitId: string, workUnitDefinitionId: string }, facts: Array<{ factDefinitionId: string, workUnitFactInstanceId: string | null, value: unknown }>, artifacts: Array<{ artifactSlotDefinitionId: string, artifactSnapshotId: string, relativePath: string | null, gitCommitHash: string | null, gitBlobHash: string | null }> }`
5. **Normalization policy allowed in Plan B**:
   - alias key normalization
   - scalar→object lifting where required by the canonical model
   - default filling for missing nullable metadata fields only
   - null/empty stripping only when explicitly declared in tests
   - no destructive coercion of incompatible values
6. **Compatibility policy**:
   - legacy rows must remain decodable
   - after a boundary is hardened, that boundary writes only canonical shapes
   - no DB-wide backfill/migration is included unless fixture evidence proves decode-on-read is insufficient

### Definition of Done (verifiable conditions with commands)
- `bunx vitest run packages/contracts/src/tests/fact-canonical-model.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-codec-compatibility.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-validation-service.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-fact-write-validation.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/context-fact-mutation-validation.test.ts`
- `bunx vitest run packages/api/src/tests/routers/runtime-fact-boundary-validation.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-payload-compat.test.ts`
- `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-audit-no-bypass.test.ts`
- `bun run check-types`
- `bun run test`
- `bun run build`

### Must Have
- One canonical runtime fact model used by all approved fact write boundaries.
- Legacy persisted fact rows remain decodable under explicit compatibility tests.
- New writes from hardened boundaries emit canonical shapes only.
- Methodology-defined fact validation rules are enforced at runtime where writes occur.
- The richer nested `work_unit_draft_spec_fact` payload is implemented with an explicit old/new compatibility policy.
- A finite inventory exists for all fact CRUD mutation surfaces and each surface is either hardened or explicitly deferred with rationale.
- A no-bypass regression proves approved write paths cannot persist raw/unvalidated fact payloads directly.

### Must NOT Have
- No replacement of `valueJson` storage with typed DB columns in this plan.
- No broad feature redesign of Action, Branch, or transition gates beyond what canonical fact handling requires.
- No generic operator-system rewrite.
- No speculative repository rewrites for style consistency.
- No broad UI redesign unrelated to fact boundary enforcement.
- No silent destructive normalization.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: fixtures first, enforcement second, then repo-wide regression.
- QA policy: every task below includes exact compatibility and failure-path checks.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Locked Architecture Decisions
1. Plan B is the explicit follow-on to Plan A and must not reopen Plan A feature semantics.
2. The DB storage model stays unless compatibility fixtures prove decode-on-read cannot safely support legacy rows.
3. One shared runtime pipeline owns decoding, normalization, validation, and canonical serialization for approved fact write paths.
4. Boundary hardening proceeds one family at a time, never all at once.
5. Richer invoke `work_unit_draft_spec_fact` payload work is bounded to payload shape + compatibility, not a general invoke redesign.
6. The CRUD audit is fact-surface scoped only: project facts, work-unit facts, workflow-context facts, agent-step writes, MCP writes, and related runtime mutation APIs.

### Deferred Beyond Plan B
- Replacing JSON storage with typed DB columns
- Full operator-system convergence beyond fact-shape normalization needs
- Generic JSON query/subfield engine redesign
- Non-fact domain CRUD audit/remediation

### Parallel Execution Waves
Wave 1: inventory + fixture matrix + canonical contracts
Wave 2: shared pipeline + boundary hardening families
Wave 3: invoke payload upgrade + audit closure + repo-wide regression

### Dependency Matrix (full, all tasks)
- T1 inventory → blocks T2-T10
- T2 canonical contracts/model → blocks T3-T10
- T3 compatibility fixture matrix → blocks T4-T10
- T4 shared runtime fact pipeline → blocks T5-T10
- T5 harden workflow-context mutation boundaries → blocks T8-T10
- T6 harden agent/MCP boundaries → blocks T8-T10
- T7 harden project/work-unit runtime fact boundaries → blocks T8-T10
- T8 richer invoke draft-spec payload + compatibility → blocks T9-T10
- T9 no-bypass audit closure → blocks T10 and Final Verification
- T10 repo-wide regression and compatibility proof → blocks Final Verification

### Agent Dispatch Summary
- Wave 1 → 3 tasks → deep / unspecified-high
- Wave 2 → 4 tasks → deep
- Wave 3 → 3 tasks → deep / unspecified-high

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [ ] 1. Inventory all fact CRUD and mutation surfaces

  **What to do**: Produce the authoritative inventory of all approved fact mutation surfaces across project facts, work-unit facts, workflow-context facts, agent-step writes, MCP writes, form/context mutation, invoke propagation, and any new Plan A surfaces. Each surface must be tagged as: harden in Plan B, preserve read-only compatibility, or explicitly defer.
  **Must NOT do**: Do not change behavior in this task. Do not start hardening before the inventory is complete.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: the inventory must align with actual service/repository seams.
  - Omitted: [`hono`] - Reason: transport details are secondary to mutation ownership.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T2-T10 | Blocked By: none

  **References**:
  - Plan A: `.sisyphus/plans/l3-plan-a-action-branch-gates.md`
  - Agent-step write path: `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - Context mutation seam: `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - Runtime repositories: `packages/db/src/runtime-repositories/**`
  - Runtime router: `packages/api/src/routers/project-runtime.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-crud-surface-inventory.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Fact surface inventory stays complete
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-crud-surface-inventory.test.ts --reporter=verbose | tee .sisyphus/evidence/task-1-fact-inventory.log`
    Expected: PASS; every approved fact mutation surface is listed with owner and disposition
    Evidence: .sisyphus/evidence/task-1-fact-inventory.log

  Scenario: No surprise mutation surfaces remain
    Tool: Bash
    Steps: run the same suite filtered to search/assertion fixtures for unclassified mutation seams
    Expected: PASS; test fails if an approved fact write path exists outside the inventory
    Evidence: .sisyphus/evidence/task-1-fact-inventory-guard.log
  ```

  **Commit**: YES | Message: `test(facts): inventory mutation surfaces` | Files: `packages/**`

- [ ] 2. Lock the canonical fact model and compatibility policy

  **What to do**: Encode the canonical runtime fact model, allowed normalizations, and legacy compatibility policy in contracts/tests. This task freezes the shapes and policies listed above so every boundary hardening step implements the same model.
  **Must NOT do**: Do not harden write paths yet. Do not redesign DB storage in this task.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: the model must line up with the repo’s schema and runtime contracts.
  - Omitted: [`effect-review`] - Reason: this is definition work, not review.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T3-T10 | Blocked By: T1

  **References**:
  - Design-time fact contracts: `packages/contracts/src/methodology/fact.ts`
  - Workflow context fact contracts: `packages/contracts/src/methodology/workflow.ts`
  - Runtime fact contracts: `packages/contracts/src/runtime/facts.ts`, `packages/contracts/src/runtime/executions.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/contracts/src/tests/fact-canonical-model.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Legacy and canonical shapes are both declared explicitly
    Tool: Bash
    Steps: run `bunx vitest run packages/contracts/src/tests/fact-canonical-model.test.ts --reporter=verbose | tee .sisyphus/evidence/task-2-fact-model.log`
    Expected: PASS; the canonical model, allowed normalizations, and compatibility policy are all explicit in contracts/tests
    Evidence: .sisyphus/evidence/task-2-fact-model.log

  Scenario: Disallowed destructive normalization is rejected
    Tool: Bash
    Steps: run the same suite filtered to invalid normalization fixtures
    Expected: PASS; incompatible values are rejected rather than coerced silently
    Evidence: .sisyphus/evidence/task-2-fact-model-invalid.log
  ```

  **Commit**: YES | Message: `feat(facts): lock canonical model and compat policy` | Files: `packages/contracts/src/**`

- [ ] 3. Add the legacy/canonical fixture matrix

  **What to do**: Create the golden fixture matrix covering legacy shapes, canonical shapes, invalid shapes, and boundary-specific malformed inputs for every approved fact family and context-fact kind.
  **Must NOT do**: Do not enable rejection yet. Do not hardcode boundary-specific custom parsing logic into the fixtures.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-best-practices`] - Reason: fixtures must be reusable across the shared pipeline and boundary tests.
  - Omitted: [`vercel-react-best-practices`] - Reason: no UI in this task.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T4-T10 | Blocked By: T2

  **References**:
  - Canonical model from T2
  - Existing invoke propagation: `packages/workflow-engine/src/services/invoke-propagation-service.ts`
  - Existing external prefill: `packages/workflow-engine/src/services/workflow-context-external-prefill-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-codec-compatibility.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Fixture matrix covers legacy, canonical, and invalid payloads
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-codec-compatibility.test.ts --reporter=verbose | tee .sisyphus/evidence/task-3-fact-fixtures.log`
    Expected: PASS; all supported fact families and context-fact kinds have explicit legacy/canonical/invalid fixtures
    Evidence: .sisyphus/evidence/task-3-fact-fixtures.log

  Scenario: Old and new draft-spec payload fixtures coexist explicitly
    Tool: Bash
    Steps: run the same suite filtered to `work_unit_draft_spec_fact` fixtures
    Expected: PASS; both flat and richer nested draft-spec payload fixtures are present and classified by compatibility policy
    Evidence: .sisyphus/evidence/task-3-draft-spec-fixtures.log
  ```

  **Commit**: YES | Message: `test(facts): add legacy and canonical fixture matrix` | Files: `packages/workflow-engine/src/tests/**`

- [ ] 4. Implement the shared runtime fact pipeline

  **What to do**: Add the shared decode → normalize → validate → canonicalize pipeline used by approved fact write paths and compatibility reads. The pipeline must consume methodology fact definitions/context-fact kinds and emit canonical runtime values plus explicit validation errors.
  **Must NOT do**: Do not harden all boundaries in this task. Do not bypass methodology definitions.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this is the core service/layer of Plan B.
  - Omitted: [`hono`] - Reason: transport adapters come later.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T5-T10 | Blocked By: T3

  **References**:
  - Methodology fact contracts: `packages/contracts/src/methodology/fact.ts`
  - Workflow context fact contracts: `packages/contracts/src/methodology/workflow.ts`
  - Runtime fact service: `packages/workflow-engine/src/services/runtime-fact-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-validation-service.test.ts`
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-codec-compatibility.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Shared pipeline canonicalizes approved legacy shapes
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-codec-compatibility.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-fact-codec.log`
    Expected: PASS; approved legacy payload variants decode to the locked canonical shapes
    Evidence: .sisyphus/evidence/task-4-fact-codec.log

  Scenario: Shared pipeline rejects invalid values with explicit errors
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-validation-service.test.ts --reporter=verbose | tee .sisyphus/evidence/task-4-fact-validation.log`
    Expected: PASS; invalid values fail consistently with explicit validation errors
    Evidence: .sisyphus/evidence/task-4-fact-validation.log
  ```

  **Commit**: YES | Message: `feat(facts): add shared runtime normalization pipeline` | Files: `packages/workflow-engine/src/**`

- [ ] 5. Harden workflow-context mutation boundaries

  **What to do**: Route workflow-context fact writes through the shared pipeline in form submission, step-context mutation, Plan A Action/Branch runtime writes, and any workflow-context replacement paths.
  **Must NOT do**: Do not harden project/work-unit runtime fact APIs in this task. Do not add special-case validation outside the shared pipeline.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: these are workflow-engine boundary seams.
  - Omitted: [`web-design-guidelines`] - Reason: no UI changes required here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8-T10 | Blocked By: T4

  **References**:
  - Context mutation seam: `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - Step transaction seam: `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - Form/runtime services in `packages/workflow-engine/src/services/**`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/context-fact-mutation-validation.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Workflow-context writes use the shared pipeline
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/context-fact-mutation-validation.test.ts --reporter=verbose | tee .sisyphus/evidence/task-5-context-mutation.log`
    Expected: PASS; workflow-context write paths canonicalize valid inputs and reject invalid ones consistently
    Evidence: .sisyphus/evidence/task-5-context-mutation.log

  Scenario: Legacy context rows remain readable after hardening
    Tool: Bash
    Steps: run the same suite filtered to legacy-row compatibility fixtures
    Expected: PASS; legacy persisted context values still decode under the compatibility policy
    Evidence: .sisyphus/evidence/task-5-context-compat.log
  ```

  **Commit**: YES | Message: `feat(facts): harden workflow context mutation boundaries` | Files: `packages/workflow-engine/src/**`

- [ ] 6. Harden agent-step and MCP write boundaries

  **What to do**: Replace raw/unknown value handling in agent-step and MCP write paths with the shared pipeline and explicit runtime validation against methodology fact definitions/context-fact kinds.
  **Must NOT do**: Do not leave `Schema.Unknown` / raw `valueJson` as the final enforcement point. Do not create agent-only validation logic.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: these are high-risk correctness boundaries.
  - Omitted: [`opencode-sdk`] - Reason: not harness integration.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8-T10 | Blocked By: T4

  **References**:
  - MCP tools contract: `packages/contracts/src/mcp/tools.ts`
  - Agent-step write service: `packages/workflow-engine/src/services/runtime/agent-step-context-write-service.ts`
  - Agent-step MCP service: `packages/workflow-engine/src/services/runtime/agent-step-mcp-service.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-fact-write-validation.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Agent/MCP writes reject invalid fact payloads consistently
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/agent-step-fact-write-validation.test.ts --reporter=verbose | tee .sisyphus/evidence/task-6-agent-mcp-validation.log`
    Expected: PASS; invalid values fail at the boundary with explicit errors instead of reaching persistence
    Evidence: .sisyphus/evidence/task-6-agent-mcp-validation.log

  Scenario: Valid agent/MCP writes are canonicalized before persistence
    Tool: Bash
    Steps: run the same suite filtered to valid write fixtures
    Expected: PASS; accepted values are canonicalized through the shared pipeline before apply/write
    Evidence: .sisyphus/evidence/task-6-agent-mcp-canonical.log
  ```

  **Commit**: YES | Message: `feat(facts): harden agent and mcp write boundaries` | Files: `packages/contracts/src/**`, `packages/workflow-engine/src/**`

- [ ] 7. Harden project and work-unit runtime fact boundaries

  **What to do**: Route project-runtime and work-unit-runtime fact mutations through the shared pipeline, including API/service validation and repository-facing canonicalization.
  **Must NOT do**: Do not redesign repository storage contracts beyond what canonical writes require. Do not add separate validation frameworks per route.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: these are service/router/repository seams that must stay consistent.
  - Omitted: [`hono`] - Reason: transport is secondary to validation consistency.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8-T10 | Blocked By: T4

  **References**:
  - Runtime router: `packages/api/src/routers/project-runtime.ts`
  - Project fact repository: `packages/db/src/runtime-repositories/project-fact-repository.ts`
  - Work-unit fact repository: `packages/db/src/runtime-repositories/work-unit-fact-repository.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/api/src/tests/routers/runtime-fact-boundary-validation.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: Project/work-unit fact APIs enforce runtime validation uniformly
    Tool: Bash
    Steps: run `bunx vitest run packages/api/src/tests/routers/runtime-fact-boundary-validation.test.ts --reporter=verbose | tee .sisyphus/evidence/task-7-runtime-fact-boundaries.log`
    Expected: PASS; project/work-unit fact mutations reject invalid payloads and canonicalize valid ones through the shared pipeline
    Evidence: .sisyphus/evidence/task-7-runtime-fact-boundaries.log

  Scenario: Legacy runtime fact rows remain readable under the compatibility policy
    Tool: Bash
    Steps: run the same suite filtered to compatibility fixtures
    Expected: PASS; existing persisted rows still decode correctly after boundary hardening
    Evidence: .sisyphus/evidence/task-7-runtime-fact-compat.log
  ```

  **Commit**: YES | Message: `feat(facts): harden project and work-unit fact boundaries` | Files: `packages/api/src/**`, `packages/db/src/runtime-repositories/**`, `packages/workflow-engine/src/**`

- [ ] 8. Upgrade `work_unit_draft_spec_fact` to the richer nested payload with compatibility

  **What to do**: Upgrade the invoke/runtime ecosystem to emit and consume the richer nested `work_unit_draft_spec_fact` payload, while preserving explicit read compatibility with the flat legacy payload according to the locked compatibility policy.
  **Must NOT do**: Do not redesign invoke execution semantics. Do not make this task a general invoke-runtime rewrite.

  **Recommended Agent Profile**:
  - Category: `deep`
  - Skills: [`effect-best-practices`] - Reason: this change spans contracts, propagation, and downstream consumers.
  - Omitted: [`visual-engineering`] - Reason: payload compatibility is the main concern.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T9-T10 | Blocked By: T5, T6, T7

  **References**:
  - Current invoke propagation: `packages/workflow-engine/src/services/invoke-propagation-service.ts`
  - Workflow contracts: `packages/contracts/src/methodology/workflow.ts`
  - Runtime execution contracts: `packages/contracts/src/runtime/executions.ts`

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-payload-compat.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: New nested draft-spec payload is emitted canonically
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/invoke-draft-spec-payload-compat.test.ts --reporter=verbose | tee .sisyphus/evidence/task-8-draft-spec-upgrade.log`
    Expected: PASS; invoke propagation writes the richer nested payload in canonical form for hardened write paths
    Evidence: .sisyphus/evidence/task-8-draft-spec-upgrade.log

  Scenario: Legacy flat draft-spec payload still decodes under compatibility policy
    Tool: Bash
    Steps: run the same suite filtered to legacy payload fixtures
    Expected: PASS; old persisted flat payloads remain readable until compatibility is explicitly retired later
    Evidence: .sisyphus/evidence/task-8-draft-spec-compat.log
  ```

  **Commit**: YES | Message: `feat(facts): upgrade draft spec payload with compat` | Files: `packages/contracts/src/**`, `packages/workflow-engine/src/**`

- [ ] 9. Close the fact CRUD audit and prove no bypass remains

  **What to do**: Reconcile the inventory from T1 with the hardened surfaces from T5-T8 and add the final no-bypass audit proof. Every approved mutation surface must either use the shared pipeline or be explicitly deferred with rationale.
  **Must NOT do**: Do not leave uncategorized mutation surfaces. Do not close the audit on prose alone; it needs executable proof.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`effect-best-practices`] - Reason: this is systems closure across multiple packages.
  - Omitted: [`web-design-guidelines`] - Reason: not UI focused.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T10 and Final Verification | Blocked By: T8

  **References**:
  - Inventory from T1
  - Hardened boundaries from T5-T8

  **Acceptance Criteria**:
  - [ ] `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-audit-no-bypass.test.ts`
  - [ ] `bun run check-types`

  **QA Scenarios**:
  ```
  Scenario: No approved fact write path bypasses the shared pipeline
    Tool: Bash
    Steps: run `bunx vitest run packages/workflow-engine/src/tests/runtime/fact-audit-no-bypass.test.ts --reporter=verbose | tee .sisyphus/evidence/task-9-no-bypass.log`
    Expected: PASS; approved mutation surfaces all route through the shared decode/normalize/validate path or are explicitly deferred
    Evidence: .sisyphus/evidence/task-9-no-bypass.log

  Scenario: Deferred surfaces are explicit and finite
    Tool: Bash
    Steps: run the same suite filtered to defer-rationale fixtures
    Expected: PASS; any deferred surfaces are named explicitly with owner and rationale rather than silently skipped
    Evidence: .sisyphus/evidence/task-9-deferred-surfaces.log
  ```

  **Commit**: YES | Message: `test(facts): close crud audit and prove no bypass` | Files: `packages/**`

- [ ] 10. Run repo-wide compatibility and regression verification

  **What to do**: Run the targeted Plan B suites first, then repo-wide typecheck/test/build. Confirm Plan A surfaces still work under the new canonical fact pipeline and compatibility policy.
  **Must NOT do**: Do not merge Plan B while any legacy compatibility or no-bypass proof is red.

  **Recommended Agent Profile**:
  - Category: `unspecified-high`
  - Skills: [`web-design-guidelines`] - Reason: final regression should catch user-facing fallout from boundary hardening too.
  - Omitted: [`opencode-sdk`] - Reason: unrelated.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Verification | Blocked By: T9

  **References**:
  - Root scripts: `package.json`
  - All T1-T9 suites

  **Acceptance Criteria**:
  - [ ] `bun run check-types`
  - [ ] `bun run test`
  - [ ] `bun run build`

  **QA Scenarios**:
  ```
  Scenario: Targeted Plan B suites are green before repo-wide verification
    Tool: Bash
    Steps: run the Plan B targeted vitest commands in order, then `bun run check-types && bun run test && bun run build | tee .sisyphus/evidence/task-10-plan-b-repo-verification.log`
    Expected: PASS; canonicalization, compatibility, boundary hardening, invoke payload upgrade, and audit closure all stay green through repo-wide verification
    Evidence: .sisyphus/evidence/task-10-plan-b-repo-verification.log

  Scenario: Plan A remains compatible under Plan B enforcement
    Tool: Bash
    Steps: rerun the relevant Plan A suites for Action, Branch, and gate alignment after Plan B changes
    Expected: PASS; Plan A feature behavior remains intact while using the hardened fact pipeline and canonical shapes
    Evidence: .sisyphus/evidence/task-10-plan-a-compat.log
  ```

  **Commit**: YES | Message: `test(facts): verify compatibility and regression closure` | Files: `packages/**`, `apps/**`

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI fallout needs checking)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Prefer 7-10 atomic commits aligned to proof-oriented deltas: inventory, model, fixtures, shared pipeline, boundary family hardening, draft-spec upgrade, audit closure, final verification.
- Never mix boundary hardening with speculative storage redesign.
- Keep each boundary family independently revertible.

## Success Criteria
- Design-time and runtime fact interpretation use one canonical model.
- Approved fact write paths no longer persist raw/unvalidated payloads directly.
- Methodology-defined fact validation is enforced consistently at runtime.
- Legacy rows remain readable under an explicit compatibility policy.
- The richer nested `work_unit_draft_spec_fact` payload is live without breaking legacy reads.
- The fact CRUD audit is closed with executable no-bypass proof.
