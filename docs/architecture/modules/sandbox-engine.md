# Sandbox Engine Module Design

**Package:** `@chiron/sandbox-engine`  
**Status:** Planned (scaffold-only package)

## Purpose

Provide execution isolation primitives. Git worktree handling is one service inside a broader sandbox boundary.

## Naming Rationale

`sandbox-engine` better reflects the module boundary than `sandbox-git`, because isolation concerns extend beyond git-only behavior.

## MVP Responsibilities

- Worktree lifecycle per execution (`create`, `resolve`, `cleanup`).
- Path isolation guarantees for agent file operations.
- First-class Git service for core software-development operations used by Chiron workflows.
- Sandbox metadata API (`executionId -> worktreePath/gitRef`).

## Git Capability Scope (Phase 1)

Sandbox Engine owns Git primitives used by workflow actions and tooling calls:

- repository bootstrap and identity checks (`init`, `status`, `isRepo`)
- branch and ref management (`branch create/switch/list`, `checkout`, `ref resolve`)
- change introspection (`status`, `diff`, `log`, `show`)
- commit lifecycle (`add`, `commit`, `tag`, lightweight amend policy)
- integration operations (`merge`, `rebase`, `cherry-pick`) with structured conflict output
- workspace safety helpers (`stash`, `restore`, guarded cleanups)

Remote-destructive operations remain policy-gated by tooling-engine (for example force push).

## Phase 2 Responsibilities

- Merge/rebase orchestration helpers.
- Conflict introspection and structured conflict reporting.
- Additional sandbox policy services (filesystem/process/network constraints if needed).

## Effect Service Shape (Target)

- `prepareExecutionSandbox(executionId, projectId) -> Effect<SandboxContext>`
- `resolveSandbox(executionId) -> Effect<SandboxContext>`
- `cleanupSandbox(executionId) -> Effect<void>`
- `git` service under sandbox context (branch/ref/status/diff/commit/merge/rebase/cherry-pick/stash)

## Effectful Design (Locked)

### Service Graph (Tags)

- `SandboxEngine` - lifecycle facade (`prepare`, `resolve`, `cleanup`)
- `SandboxGitService` - git primitive executor under sandbox context
- `SandboxStore` - sandbox context persistence and lookup
- `SandboxEvents` - event publisher for sandbox/git lifecycle events
- `SandboxPolicy` - optional guardrails (path constraints, operation constraints)

### Layering Strategy

- `SandboxEngineLive` composes:
  - `SandboxGitServiceLive`
  - `SandboxStoreLive`
  - `SandboxEventsLive`
  - optional `SandboxPolicyLive`
- `SandboxEngineTest` composes deterministic in-memory/fake adapters for tests.

### Typed Error Channels

- `SandboxNotFoundError`
- `SandboxInitError`
- `SandboxCleanupError`
- `GitOperationError`
- `GitConflictError`
- `SandboxPolicyViolationError`
- `SandboxPathViolationError`

### Contract Schemas

- `SandboxContext` (executionId, projectId, worktreePath, branch, headSha, status)
- `GitOperationRequest` / `GitOperationResult`
- `GitConflictSummary`
- `SandboxLifecycleEvent`

### Execution Pattern

Each operation follows the same Effect pipeline:

1. Resolve sandbox context
2. Validate policy/path constraints
3. Execute git primitive via adapter
4. Emit structured event
5. Persist updated sandbox metadata
6. Return typed result

### Dependency Inversion Rule

- Concrete git/process libraries must stay behind `SandboxGitService`.
- Consumers depend on service interfaces/Tags, not concrete implementations.

## Testing Guardrails (Locked)

To avoid infringing on agent responsibilities and prevent boundary drift:

- Runtime/agent code must not call concrete git libraries directly.
- Git capability tests should verify calls flow through Tooling Engine -> Sandbox Engine.
- Contract tests should enforce typed errors and event emission on all git operations.
- Integration tests should verify sandbox isolation per execution and deterministic cleanup.

## Dependency And Boundary Rules (Locked)

- Sandbox Engine owns execution/worktree isolation lifecycle.
- Sandbox Engine owns Git primitive execution used by Chiron.
- Tooling Engine owns action orchestration and policy/approval.
- Tooling Engine may call Sandbox Engine services; Sandbox Engine must not depend on Tooling Engine.
- Agent Runtime and Workflow Engine consume sandbox behavior only through Tooling Engine-facing actions.
- Cross-module calls should follow dependency inversion (contracts/interfaces), not direct concrete imports.

## Integration Note (Current Drift)

- `@chiron/workflow-engine` currently has limited inline git action behavior in `services/action-service.ts`.
- Target architecture is to route git-related actions through Tooling Engine -> Sandbox Engine.
- Inline git behavior in workflow-engine should be treated as transitional and removed during migration parity work.

## OpenCode Integration Note

- For OpenCode sessions, changed-file truth should come from OpenCode session/file APIs (diff/status/history endpoints).
- Project-level OpenCode plugins are optional enhancements for per-command telemetry and enforcement.
- Chiron should persist a normalized edited-file ledger independent of plugin availability.

## Rename Strategy (Completed)

- Package has been renamed to `@chiron/sandbox-engine`.
- Historical references to `sandbox-git` are transitional documentation artifacts only.

## Dependencies

- `@chiron/contracts`
- `@chiron/event-bus`

## Decision Lock (2026-02-11)

- Phase 1 implementation scope is git-backed sandboxing only.
- Sandbox Engine executes git primitives and worktree lifecycle operations.
- Tooling Engine owns orchestration, approval, and policy/risk gating.
- Merge orchestration remains in Tooling Engine action flows; Sandbox Engine provides primitive operations and typed results.
- Non-git sandbox backends (for example Docker/VM/process isolation) are deferred to a future phase behind the same Sandbox Engine service boundary.

## Observability Surface (Locked)

### Key Events

- `sandbox.prepare.start`
- `sandbox.prepare.success`
- `sandbox.prepare.failure`
- `sandbox.git.operation`
- `sandbox.git.conflict`
- `sandbox.cleanup.success`
- `sandbox.policy.violation`

### Critical Metrics

- `module_requests_total` (sandbox lifecycle and git operations)
- `module_failures_total` (init, cleanup, git, policy failures)
- `module_operation_duration_ms` (prepare/resolve/cleanup/git op latency)
- `sandbox_engine_git_operations_total`
- `sandbox_engine_git_conflicts_total`
- `sandbox_engine_active_sandboxes`

### Required Span Names

- `module.sandbox-engine.prepare`
- `module.sandbox-engine.resolve`
- `module.sandbox-engine.git.operation`
- `module.sandbox-engine.cleanup`

### Sensitive Data Rules

- Do not log file contents, diffs, or prompt text.
- Use redacted or hashed path fields for workspace paths.
- Conflict reporting should emit counts and typed summaries, not raw merge file bodies.

## Open Decisions

- None for phase 1.
