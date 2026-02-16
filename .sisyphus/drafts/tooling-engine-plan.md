# Tooling Engine Plan

**Status:** Final
**Decisions Resolved:** 2026-02-08
**Date:** 2026-02-08
**Module:** `@chiron/tooling-engine` → `packages/tooling-engine/`

## Overview

Central execution unit for all side effects in the system. Two consumers:
1. **Agent-runtime** — AI agents call tools during execution (update-variable, ax-generation, custom)
2. **Workflow-engine** — Action steps execute operations (git, file, directory, env, variable, artifact, snapshot)

This is primarily an **extraction** from `packages/api/src/services/workflow-engine/effect/` with proper Effect-ification — not greenfield.

---

## 1. Error Types

All errors use `Data.TaggedError`. Union type `ToolingEngineError` covers both Tool + Action paths.

```typescript
export type ToolingEngineError =
	| ToolArgsValidationError      // Tool argument schema validation failed
	| ActionArgsValidationError    // Action argument validation failed
	| UnknownToolError             // Tool name not found in registry
	| UnknownToolTypeError         // Tool type not recognized
	| UnknownActionKindError       // Action kind not recognized
	| ApprovalDeniedError          // User rejected the approval
	| ApprovalTimeoutError         // Approval timed out waiting for user
	| ApprovalNotFoundError        // Approval ID doesn't exist
	| ApprovalAlreadyResolvedError // Approval was already resolved (double submit)
	| ApprovalInvalidDecisionError // Malformed approval decision
	| ExecutionFailedError         // Tool/action execution failed
	| SandboxViolationError        // Operation violates sandbox policy
	| TemplateRenderError          // Handlebars template rendering failed
```

### Key error fields:
- **ApprovalDeniedError/TimeoutError**: `subject` field is discriminated union `{ _tag: "Tool" | "Action" }` so both paths share the same error types
- **ExecutionFailedError**: Includes `stdout`, `stderr`, `exitCode` for shell/git operations
- **SandboxViolationError**: First-class error (not hidden inside ExecutionFailed)

---

## 2. Effect Services Architecture

### Primary Services (Tags)

| Tag | Responsibility | Dependencies |
|-----|---------------|-------------|
| **ToolingEngine** | Main orchestrator — validate → evaluate permission → execute | ToolRegistry, ActionRegistry, PermissionService, ApprovalGateway, ToolingEvents |
| **ToolRegistry** | Tool registration, lookup, schema validation, execution | (none — constructed at Layer build time) |
| **ActionRegistry** | Action registration, validation, execution | TemplateRenderer, SandboxPolicy |
| **PermissionService** | Pure policy: per-tool rules (allow/ask/deny) + pattern matching → auto-approve or require user | ToolingEvents |
| **ApprovalGateway** | Deferred resolution for async user approvals (DB-backed) | ToolingEvents, ApprovalRepo, Clock |

### Supporting Services (Tags)

| Tag | Responsibility | Notes |
|-----|---------------|-------|
| **ToolingEvents** | Publish tool/action/approval events to Stream (bridges to EventBus) | |
| **SandboxPolicy** | Pure checks: allowed paths, allowed commands | **Lives in tooling-engine.** Rules come from sandbox-git at Layer composition time. |
| **TemplateRenderer** | Handlebars rendering behind a Tag (no direct handlebars imports) | |
| **ToolingIdGen** | Generate toolCallId / approvalId | |
| **ApprovalRepo** | DB persistence for approval requests (read/write approval_requests table) | Approval state = workflow state. See §3. |

### ToolingEngine Tag Interface

```typescript
export interface ToolingEngine {
	// Agent-runtime entry point (satisfies tooling-bridge)
	validateToolArgs: (toolConfig: ToolConfig, args: Record<string, unknown>) => Effect<void, ToolingEngineError>
	evaluateToolApproval: (params: {
		toolConfig: ToolConfig
		args: Record<string, unknown>
		context: ToolExecutionContext
		toolCallId?: string
		userId?: string
	}) => Effect<{ status: "pending" | "approved"; toolCallId: string }, ToolingEngineError>
	executeTool: (toolName: string, toolType: ToolType, args: Record<string, unknown>, context: ToolExecutionContext, options?: { targetVariable?: string; toolCallId?: string; userId?: string }) => Effect<ToolExecutionResult, ToolingEngineError>

	// Workflow-engine entry point (satisfies action-service)
	executeAction: (action: ActionConfig, context: ActionExecutionContext) => Effect<ActionExecutionResult, ToolingEngineError>
}
```

---

## 3. Permission & Approval Flow (OpenCode-Inspired, DB-backed)

> **Design Decision DD-002**: Adopts OpenCode's `allow | ask | deny` per-tool permission model.
> See `docs/design/design-decisions.md` for full rationale and OpenCode source analysis.

### Permission Model (replaces trust × risk matrix)

```typescript
type Action = "allow" | "ask" | "deny"
type Rule = { permission: string; pattern: string; action: Action }
type Ruleset = Rule[]
type Reply = "once" | "always" | "reject"
```

**Resolution:** Merge all rulesets flat, `findLast` match wins (last rule takes precedence). Wildcard `*` matching on both permission name AND argument patterns. Default = `"ask"`.

**Preset profiles:**
- `builder` — all `allow` except `action.env`
- `planner` — write tools `deny`, read tools `allow`
- `cautious` — all `ask`

**Config hierarchy** (most specific wins):
1. Per-workflow-step config
2. Per-agent profile
3. Per-project config
4. User global config
5. System defaults

### Architecture: DB for durability, Deferred for in-process sync

- **DB** (`approval_requests` table): Source of truth for approval state + audit trail
- **In-memory** (`Ref<HashMap<ApprovalId, Deferred>>`): Sync primitive for blocking/unblocking Effect fibers
- **Approved rules** persisted to DB: `"always"` replies survive restarts (unlike OpenCode's in-memory approach)

### Flow:
1. Agent calls `evaluateToolApproval` → PermissionService evaluates rules for tool+pattern
2. If `allow` → write `allowed` row to DB → return `{ status: 'allowed', toolCallId }` immediately
3. If `deny` → throw `DeniedError` immediately (no DB row)
4. If `ask` (needs user):
   - Write `pending` row to DB (executionId, stepId, permission, patterns, args)
   - Create `Deferred<Reply>` in memory
   - Store in `Ref<HashMap<approvalId, Deferred>>`
   - Emit `PermissionAsked` event to UI
   - Return `{ status: 'pending', toolCallId }`
5. Agent later calls `executeTool(..., { toolCallId })`:
   - Check DB first (may have been resolved during restart)
   - If still pending → `ApprovalGateway.awaitReply(toolCallId)` blocks on Deferred with `Effect.timeoutFail`
   - `once` → proceed to execute this call only
   - `always` → add patterns to approved ruleset + auto-resolve ALL matching pending requests
   - `reject` → `RejectedError` + cascade reject all pending for same session
   - Timeout → `ApprovalTimeoutError`
6. User resolves via tRPC → `ApprovalGateway.reply({ requestId, reply, message? })`
   - Update DB row
   - If `always`: persist patterns to approved rules table
   - Complete Deferred in memory
   - Emit `PermissionReplied` event

### DB Schema (approval_requests table):
```sql
approval_requests (
  id              text PRIMARY KEY,           -- approvalId (= toolCallId or generated)
  execution_id    text NOT NULL,              -- FK to workflow_executions
  step_id         text NOT NULL,              -- FK to step within execution
  permission      text NOT NULL,              -- permission name (e.g., 'action.git', 'custom')
  patterns        jsonb NOT NULL,             -- argument patterns being evaluated
  action          text NOT NULL DEFAULT 'ask',-- 'allow' | 'ask' | 'deny'
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'replied'
  reply           text,                       -- 'once' | 'always' | 'reject' (null while pending)
  args            jsonb,                      -- tool/action arguments snapshot
  payload         jsonb,                      -- UI display payload
  message         text,                       -- user's feedback/correction message
  resolved_by     text,                       -- userId who replied
  resolved_at     timestamp with time zone,
  created_at      timestamp with time zone NOT NULL DEFAULT now()
)
-- Indexes: execution_id, status, created_at
```

### Recovery on restart:
- Query DB for `pending` approval rows tied to active executions
- Load `always`-approved rules from DB into in-memory ruleset
- Recreate Deferreds for any still-pending requests
- Workflow execution resume picks up where it left off

### Key constraints:
- Always reuse provided `toolCallId` (don't generate new ID between evaluate and execute)
- Remove entries from gateway map on resolve AND on timeout/failure (prevent memory leaks)
- Emit "asked" before returning pending; emit "replied" only after Deferred completion
- DB write happens BEFORE Deferred creation (crash safety)
- `"reject"` cascades: rejects ALL pending requests for the same session (matches OpenCode behavior)

---

## 4. Tools vs Actions Split

Two separate entry points, shared cross-cutting concerns.

### Tools (called BY AI agents):
- Types: `update-variable`, `ax-generation`, `custom`, `action`
- Flow: validateToolArgs → evaluateToolApproval → executeTool
- Always go through approval gating
- Registered in `ToolRegistry`

### Actions (executed BY workflow steps):
- Kinds: `git`, `file`, `directory`, `env`, `variable`, `artifact`, `snapshot`
- Flow: validateAction → (optional approval) → executeAction
- Approval is optional per action config (`requiresApproval?`)
- Registered in `ActionRegistry`
- DAG dependency resolution stays in workflow-engine (tooling-engine executes one action at a time)

### Stubbed action kinds (behind Tags, implemented by future modules):
- `git` → delegates to `GitOps` Tag (provided by future `@chiron/sandbox-git`)
- `artifact` → delegates to `ArtifactStore` Tag (provided by future artifact system)
- `snapshot` → delegates to `SnapshotStore` Tag (provided by future artifact system)
- `variable`, `file`, `directory`, `env` → implemented directly in tooling-engine

### Shared plumbing (one implementation for both):
- Approval gating (ApprovalService + ApprovalGateway)
- Audit logging
- Event emission (ToolingEvents)
- Sandbox/policy checks

---

## 5. File Structure

```
packages/tooling-engine/
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── AGENTS.md                              # Module spec (like agent-runtime has)
├── src/
│   ├── index.ts                           # Public exports
│   ├── errors.ts                          # All Data.TaggedError types
│   │
│   ├── schema/                            # Effect Schema definitions (NOT Zod)
│   │   ├── tool-schemas.ts                # Per-tool-type input validation schemas
│   │   ├── action-schemas.ts              # Per-action-kind input validation schemas
│   │   └── approval-schemas.ts            # Approval request/decision schemas
│   │
│   ├── services/                          # Tags (pure contracts)
│   │   ├── ToolingEngine.ts
│   │   ├── ToolRegistry.ts
│   │   ├── ActionRegistry.ts
│   │   ├── PermissionService.ts           # Rule evaluation + ask/reply flow
│   │   ├── ApprovalGateway.ts
│   │   ├── ApprovalRepo.ts               # DB persistence for approval state
│   │   ├── ToolingEvents.ts
│   │   ├── SandboxPolicy.ts
│   │   ├── TemplateRenderer.ts
│   │   ├── ToolingIdGen.ts
│   │   ├── GitOps.ts                      # STUB Tag — sandbox-git provides Live later
│   │   ├── ArtifactStore.ts               # STUB Tag — artifact system provides Live later
│   │   └── SnapshotStore.ts               # STUB Tag — artifact system provides Live later
│   │
│   ├── live/                              # Layers (wiring + impl)
│   │   ├── ToolingEngineLive.ts
│   │   ├── ToolRegistryLive.ts
│   │   ├── ActionRegistryLive.ts
│   │   ├── PermissionServiceLive.ts       # Rule evaluation, last-match-wins, wildcard matching
│   │   ├── ApprovalGatewayLive.ts         # Deferred + Ref<HashMap> + ApprovalRepo
│   │   ├── ApprovalRepoLive.ts            # Drizzle-backed approval persistence
│   │   ├── ToolingEventsLive.ts
│   │   ├── SandboxPolicyLive.ts
│   │   ├── TemplateRendererLive.ts
│   │   ├── ToolingIdGenLive.ts
│   │   ├── GitOpsStub.ts                  # Stub: Effect.fail("sandbox-git not wired")
│   │   ├── ArtifactStoreStub.ts           # Stub: Effect.fail("artifact system not wired")
│   │   └── SnapshotStoreStub.ts           # Stub: Effect.fail("artifact system not wired")
│   │
│   ├── tools/                             # Tool handler definitions
│   │   ├── types.ts                       # ToolHandler interface
│   │   ├── update-variable.ts
│   │   ├── ax-generation.ts
│   │   ├── custom.ts
│   │   └── index.ts                       # Exports all tool handlers for registry
│   │
│   ├── actions/                           # Action handler definitions
│   │   ├── types.ts                       # ActionHandler interface
│   │   ├── git.ts                         # Delegates to GitOps Tag
│   │   ├── file.ts                        # Direct impl
│   │   ├── directory.ts                   # Direct impl
│   │   ├── env.ts                         # Direct impl
│   │   ├── variable.ts                    # Direct impl (extracted from workflow-engine)
│   │   ├── artifact.ts                    # Delegates to ArtifactStore Tag
│   │   ├── snapshot.ts                    # Delegates to SnapshotStore Tag
│   │   └── index.ts                       # Exports all action handlers for registry
│   │
│   ├── approval/                          # Approval subsystem internals
│   │   ├── types.ts                       # Internal DTOs (approval payloads for UI)
│   │   └── events.ts                      # ToolApprovalRequested/Resolved event types
│   │
│   └── __tests__/
│       ├── tool-approval-flow.test.ts     # Ported from legacy
│       ├── tool-registry.test.ts
│       ├── action-registry.test.ts
│       └── approval-gateway.test.ts
```

---

## 6. Contract Types for @chiron/contracts

### Move TO contracts (shared, stable):
- `ToolType`, `ToolConfig`
- `ActionKind`, `ActionConfig` (per-kind shapes)
- `ToolExecutionContext`, `ToolExecutionResult`
- `ActionExecutionContext`, `ActionExecutionResult`
- `PermissionAction`, `PermissionRule`, `PermissionRuleset`, `PermissionReply`
- `PermissionRequest`, `PermissionPreset`
- Event payloads: `PermissionAsked`, `PermissionReplied`
- `ToolCallId`, `ApprovalId` as branded strings

### Keep INTERNAL to tooling-engine:
- Effect Schema validation definitions (tool-schemas.ts, action-schemas.ts, approval-schemas.ts)
- Registry definition types (handler signatures, internal metadata)
- Sandbox rule configuration structures
- Audit/approval persistence models (DB row shapes)
- Stub Tag interfaces (GitOps, ArtifactStore, SnapshotStore) — these move to their respective modules when built

---

## 7. Wiring

### Agent-runtime consumption:
- `tooling-bridge.ts` becomes a thin adapter: `Effect.service(ToolingEngine)` + forward calls
- Depends only on `ToolingEngine` Tag + contracts types

### Workflow-engine consumption:
- `action-service.ts` calls `ToolingEngine.executeAction(actionConfig, ctx)`
- DAG dependency resolution stays in workflow-engine
- Depends only on `ToolingEngine` Tag

### Server-level layer composition (packages/api):
```typescript
export const ToolingEngineLayer =
	ToolRegistryLive.pipe(
		Layer.merge(ActionRegistryLive),
		Layer.merge(ApprovalGatewayLive),
		Layer.merge(ApprovalServiceLive),
		Layer.merge(ApprovalRepoLive),      // DB-backed approval persistence
		Layer.merge(ToolingEventsLive),
		Layer.merge(ToolingIdGenLive),
		Layer.merge(TemplateRendererLive),
		Layer.merge(SandboxPolicyLive),
		Layer.merge(GitOpsStub),             // Replaced by sandbox-git later
		Layer.merge(ArtifactStoreStub),      // Replaced by artifact system later
		Layer.merge(SnapshotStoreStub),      // Replaced by artifact system later
		Layer.provide(ToolingEngineLive),
	)
```

### tRPC approval endpoint:
- Depends on `ApprovalGateway` Tag
- Calls `resolveApproval({ approvalId, decision })`

---

## 8. Legacy File → New File Extraction Map

| Legacy File (packages/api/src/services/...) | Destination |
|----------------------------------------------|-------------|
| workflow-engine/effect/tooling-engine.ts | tooling-engine/src/live/ToolingEngineLive.ts |
| workflow-engine/effect/tool-builder.ts | tooling-engine/src/live/ToolRegistryLive.ts + tools/*.ts |
| workflow-engine/effect/tool-approval-gateway.ts | tooling-engine/src/live/ApprovalGatewayLive.ts |
| workflow-engine/effect/approval-service.ts | tooling-engine/src/live/ApprovalServiceLive.ts |
| workflow-engine/step-handlers/execute-action-effect-handler.ts | tooling-engine/src/actions/*.ts (split by kind) |
| workflow-engine/effect/sandboxed-agent-handler.ts | tooling-engine/src/live/ToolRegistryLive.ts (tool building logic) |
| workflow-engine/effect/tool-approval-flow.test.ts | tooling-engine/src/__tests__/tool-approval-flow.test.ts |

| Stub File (packages/) | Action |
|------------------------|--------|
| agent-runtime/src/tooling-bridge.ts | Replace stubs with `Effect.service(ToolingEngine)` forwarding |
| workflow-engine/src/services/action-service.ts | Replace variable-only impl with `ToolingEngine.executeAction` forwarding |

---

## 9. Implementation Phases

### Phase 1: Foundation (parallelizable)
1. Update `@chiron/contracts` with unified tool/action/approval types
2. Scaffold `packages/tooling-engine` (package.json, tsconfig, tsdown)
3. Create `errors.ts` with all tagged error types
4. Create all service Tags in `services/` (contracts only, no impl)
5. Create Effect Schema definitions in `schema/` (migrate from Zod during extraction)
6. Create stub Tags + Layers for GitOps, ArtifactStore, SnapshotStore

### Phase 2: Core Services (sequential)
7. Implement `ApprovalRepoLive` (Drizzle-backed approval_requests table)
8. Implement `ApprovalGatewayLive` (Deferred + Ref<HashMap> + DB persistence)
9. Implement `PermissionServiceLive` (rule evaluation, last-match-wins, wildcard matching, preset profiles)
10. Implement `ToolRegistryLive` (Effect Schema validation + execution dispatch)

### Phase 3: Handlers (parallelizable)
11. Port tool handlers: update-variable, ax-generation, custom
12. Port action handlers: variable (from workflow-engine), file, directory, env (direct impl)
13. Create delegating action handlers: git → GitOps, artifact → ArtifactStore, snapshot → SnapshotStore

### Phase 4: Orchestrator + Integration
14. Implement `ActionRegistryLive` (action validation + dispatch)
15. Implement `ToolingEngineLive` (main orchestrator: validate → approve → execute)
16. Wire agent-runtime (replace tooling-bridge.ts stubs with ToolingEngine Tag consumption)
17. Wire workflow-engine (replace action-service.ts stubs with ToolingEngine Tag consumption)
18. Wire server layer composition in packages/api

### Phase 5: Tests + Verification
19. Port tool-approval-flow integration test (from legacy)
20. Add tool-registry unit tests (Effect Schema validation)
21. Add action-registry unit tests
22. Add approval-gateway unit tests (DB-backed + Deferred)
23. Verify `bun run build` passes for packages/tooling-engine
24. Verify `bun check` passes (OXC lint/format)

---

## Resolved Decisions

| Question | Decision | Rationale |
|----------|----------|-----------|
| SandboxPolicy location | **In tooling-engine**, rules from sandbox-git at Layer time | Policy enforcement belongs where execution happens. sandbox-git provides workspace boundaries. |
| Approval persistence | **DB-backed** (approval state = workflow state) | Approvals are part of workflow context. Must survive restarts. Deferred is sync primitive only. |
| Git/artifact/snapshot actions | **Stub behind Tags** (GitOps, ArtifactStore, SnapshotStore) | Clean interface now. sandbox-git and artifact system provide real Layers later. Zero rework. |
| Schema validation | **Effect Schema now** (migrate from Zod during extraction) | Consistency with Effect-first architecture. No tech debt. |
| Permission model | **OpenCode-inspired `allow\|ask\|deny`** per-tool rules with pattern matching (DD-002) | Replaces trust × risk matrix. Battle-tested, simpler, users already understand it. |
| Single approval gateway | **One DB-backed gateway in tooling-engine** | Replaces dual gateways (workflow-engine in-memory + tooling-engine DB). Single source of truth. |
