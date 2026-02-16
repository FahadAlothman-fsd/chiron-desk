# Execution Layers (Locked Modules) — Cross-Cutting Snapshot

Snapshot date: 2026-02-14  
Scope: how Chiron executes methodologies (BMAD/CIS/TEA/Agile/Ralph) using the locked modules.

This doc is a temporary working snapshot. It describes responsibilities and artifacts that should be available to agents via a compact execution snapshot plus on-demand ctx tools.

## 1) Layered mental model

Chiron has three aligned planes:

- Methodology definition (user-configurable): defines what work means (work item types, statuses, transitions) and what transitions require (typed outputs + link patterns + dependency strength policy). It also maps transitions to allowed workflows.
- Procedure definitions (user-configurable): workflow definitions (step graphs) and step configs (agents, templates, tool/action declarations, branching). These are configurable, but constrained to the fixed capabilities of the step types.
- Execution engine (system, locked modules): fixed semantics for step types, variable scoping, approvals, sandboxing, provider/model resolution (no silent fallback), event transport, and observability.

The bridge between methodology + execution is a deterministic **typed outputs ledger** + **link graph**.

## 2) Determinism contracts (non-negotiable)

- No silent provider/model fallback (provider-registry returns alternatives; runtime requires explicit selection).
- Event-bus is ephemeral transport only (PubSub); it is not a persistence or replay system.
- Observability is DB-first; export is consent-gated.
- Sandbox is git-only worktree isolation.
- AX optimization is tool-driven and MiPRO+GEPA only; never auto-applies changes.
- Transition checks are based only on:
  - required typed output variable types
  - required link patterns
  - dependency strength policy (`hard` blocks, `soft` warns, `context` does not block)

## 3) Execution entities (runtime truth)

At runtime, the system produces these canonical IDs and relationships:

- `workflow_execution` — a run of a workflow definition (may be project-bound; may be child of another execution)
- `step_execution` — a run of one step within an execution (supports revisions)
- `approval` — a gating decision for side effects (tooling-engine)
- `tool_call` — an externalized side effect request/response (tooling-engine)
- `artifact_ref` — a persisted output pointing to a file (and optionally a git commit hash)

## 4) The six step types (workflow-engine)

Locked step types:

- `form`: collect user input; yields typed variables.
- `agent`: run an agent (Chiron or OpenCode); streams text/tool calls.
- `action`: execute a side effect; usually produces typed outputs (artifacts, file refs, test reports).
- `invoke`: invoke a child workflow; binds child execution; returns typed outputs.
- `branch`: conditional routing; no side effects.
- `display`: presentation-only; no side effects.

## 5) Locked modules: responsibilities + what they emit

### 5.1 workflow-engine

Responsibility:

- Orchestrate executions and step executions (sequential steps, concurrent fibers inside steps).
- Pause/resume/interrupt; manage child workflows.
- Publish lifecycle events to event-bus.

Emits/records:

- execution lifecycle state (started/completed/error)
- per-step status and metadata

### 5.2 agent-runtime

Responsibility:

- Run agents by kind: `chiron` (AI SDK) vs `opencode` (full tool-capable).
- Stream output chunks and tool-call intents.
- Provide a compact `ExecutionContextSnapshot` to the agent.

Agent context pattern:

- Snapshot is compact, immutable, step-scoped.
- Agent can fetch more via ctx tools:
  - `ctx.list(scope)`
  - `ctx.get(scope, key)`
  - `ctx.get_many(scope, keys[])`
  - `ctx.search(scope, query)`

Guardrails:

- All ctx tool calls are budgeted and audited.
- Ctx tools read from DB only (never event-bus).

### 5.3 template-engine

Responsibility:

- Strict Handlebars rendering (helpers allowlist).
- Prompt receipts: store hashes + refs for reproducibility without storing raw prompts by default.

Emits/records:

- `prompt_receipt` (hashes, template refs, model config hash, usage/cost/latency)

### 5.4 variable-service

Responsibility:

- Canonical variable storage + audit.
- Scope precedence (read): `step -> execution -> project -> global`.
- Writes default to execution scope; promotion from step scope is explicit.

Emits/records:

- `variable_history` append-only audit
- variable-change events (to event-bus)

### 5.5 tooling-engine

Responsibility:

- Central approval and execution for side effects.
- Validates requests, applies policy, obtains approvals, executes, records outcomes.

Emits/records:

- approval requests/resolutions
- tool call receipts (sanitized)

### 5.6 sandbox-engine

Responsibility:

- Per-execution git worktree lifecycle.
- Structured git primitives (status/diff/log/add/commit/etc) returning typed summaries.

Emits/records:

- worktree allocation metadata (executionId -> worktreePath)
- git metadata summaries (no raw diffs in logs)

### 5.7 provider-registry

Responsibility:

- Resolve provider/model/credentialRef with strict precedence.
- No silent fallback; return ranked alternatives.
- Record usage/quota/health.

Emits/records:

- resolved model payload (provider, modelId, capabilities, credentialRef)
- usage records (cost/token)

### 5.8 event-bus

Responsibility:

- Ephemeral transport (PubSub sliding window) for UI streaming.

Non-responsibility:

- No persistence, no replay, no policy decisions.

### 5.9 observability

Responsibility:

- DB-first durable ledger of telemetry + user feedback.
- Consent-gated export pipeline.

Emits/records:

- immutable event ledger rows correlated by executionId/stepExecutionId/toolCallId/approvalId/userId/projectId
- survey responses + bug reports

### 5.10 ax-engine

Responsibility:

- Tool-driven optimization runs for templates/signatures.
- Supported optimizers: MiPRO + GEPA only.
- Outputs are recommendations; promotion requires explicit approval.

Emits/records:

- optimization run metadata (scores, frontier summaries)
- training example references (never raw prompt content in telemetry)

## 6) Typed outputs ledger (the methodology bridge)

To keep transitions deterministic without a vague "evidence kinds" system, the runtime should record an append-only typed outputs ledger.

Minimal shape:

- `execution_outputs`
  - `executionId`
  - `stepExecutionId`
  - `workItemId?`
  - `varKey` (e.g. `prd.snapshot.v1`)
  - `varType` (e.g. `artifact_ref`, `file_ref`, `test_report`, `string`)
  - `valueRefJson` (typed pointers, not raw payload)

Methodology transition rules check only:

- required `varType`s exist for a work item (across its bound executions)
- required link patterns exist
- dependency strength policy

## 7) What agents should see vs fetch

Snapshot should include (compact):

- method frame: current work item type status semantics + possible transitions + requirements
- current work item summary: id/key/type/status/title
- satisfied/missing requirement summary: missing output types + missing link clauses
- budget + available scopes

Agents fetch via ctx tools:

- link graph slice (neighbors + strengths)
- typed outputs list (by type)
- artifact refs metadata (paths, git commit hashes)
- execution history (step summaries)
