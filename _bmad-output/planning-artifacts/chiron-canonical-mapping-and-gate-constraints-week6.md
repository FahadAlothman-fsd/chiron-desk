# Chiron Canonical Mapping + Gate Constraints (Week 6)

Date: 2026-02-17  
Status: Working canonicalization draft (for same-day doc finalization)

## 1) Full Stack Baseline To Carry Forward

This extends the starter stack with project-critical runtime dependencies already present in repo.

### Platform and app shell

- Monorepo: Bun workspaces + Turborepo
- Frontend: React 19 + TanStack Router + TanStack Query + TanStack Form
- Desktop shell: Tauri v2
- Backend/API: Hono + oRPC
- Auth: Better-Auth
- UI/tooling: Tailwind v4, Radix primitives, OXC (oxlint + oxfmt), Lefthook/Husky

### AI and execution core (must be explicit)

- Effect-TS runtime model (`effect`) for services/layers/fibers/streams
- Vercel AI SDK (`ai`) with provider adapters:
  - `@ai-sdk/openai`
  - `@ai-sdk/anthropic`
  - `@openrouter/ai-sdk-provider`
- OpenCode integration:
  - `@opencode-ai/sdk`
  - `ai-sdk-provider-opencode-sdk`
  - project `.opencode` tool/plugin wiring
- Template layer baseline: Handlebars

### Data layer (current decision)

- ORM: Drizzle
- DB strategy for current horizon: SQLite only
- Constraint: remove active Postgres track from implementation planning and runtime assumptions

## 2) Carry-Over Decision Matrix (Dependencies + Architecture Intent)

### Keep as strategic core

- `effect` execution patterns and service boundaries
- `ai` + provider adapters + OpenCode SDK integration
- Hono + oRPC API surface
- Tauri + web shell/layout stack
- Better-Auth package boundary
- Handlebars for templating baseline

### Adapt for canonical target

- `@chiron/api` legacy workflow internals -> thin orchestration over standalone modules
- Contracts package -> Effect Schema-first canonical contracts
- DB package/scripts -> SQLite-first flows and scripts
- Testing scripts currently pinned to Postgres env vars -> SQLite-first test path

### Methodology engine boundary (revised)

- Add one new module: `packages/methodology-engine`.
- Keep gate model as two checks only:
  - `checkStartGate` (availability)
  - `checkCompletionGate` (finish eligibility)
- Do not model a standalone "transition commit service" as a separate product concept.
- Transition completion write (status/snapshot/audit) is part of workflow transition finalization flow, using methodology-engine checks and helpers.

### Defer from critical path

- AX advanced loops beyond staged recommendation flow
- Non-critical optimizer/policy enhancements
- Any module expansion not required for Week 6 gate/transition delivery

## 3) Canonical Taxonomy Mapping (Legacy + Current BMAD Sample -> Final Model)

Use this map to preserve lessons while converging definitions.

| Legacy / Migration Term | Current Contract Family | Canonical Final Term | Notes |
|---|---|---|---|
| `user-form` | workflow step | `form` | Required input collection step |
| `sandboxed-agent` | workflow step | `agent` (`agentKind=opencode`) | Same step family, runtime selected by agent kind |
| `system-agent` | workflow step | `agent` (`agentKind=chiron`) | Same step family, different runtime/profile |
| `execute-action` | workflow step | `action` | Deterministic side-effect DAG with approvals |
| `invoke-workflow` | workflow step | `invoke` | Child workflow execution + output capture |
| `display-output` | workflow step | `display` | Read-only presentation, non-mutating |
| `branch` | workflow step | `branch` | Deterministic routing using condition ADT |
| Path extraction contracts (ad-hoc) | transition evidence | typed outputs (`varType`) | Transition checks consume typed evidence, not fragile deep path assumptions |
| Status judgment by narrative review | transition policy | deterministic gate checks | Required outputs + links + dependency policy |

## 4) Gate Model (Simplified): Start + Completion

For current documentation and implementation phase, transition gating is modeled with only two gates.

### 4.1 Start Gate (availability)

A transition is `AVAILABLE` only if all are true:

- Transition edge exists in methodology for `fromStatus -> toStatus`.
- Work unit is active and not terminal/archived (unless explicitly allowed path).
- Required prerequisite links exist in graph topology (shape checks).
- Project fact constraints for that transition are satisfied.
- No hard policy denial (risk/policy lock).

### 4.2 Completion Gate (completion eligibility)

A transition is `COMMITTABLE` only if all are true:

- Required typed outputs for transition are present in execution outputs ledger.
- Required link patterns are present with required dependency strengths.
- Hard dependency blockers are clear.
- Required approvals are resolved (if policy requires approval for produced mutations).
- Gate evaluator returns no unresolved blocking findings.

Dependency-strength behavior:

- `hard`: blocks commit when missing/invalid.
- `soft`: warning only, does not block commit.
- `context`: informational only, non-blocking.

### 4.3 Transition lifecycle (canonical)

1. `UNAVAILABLE` -> Start Gate fails (block with reason codes).
2. `AVAILABLE` -> Start Gate passes; execution may begin.
3. `EXECUTING` -> workflow steps run and produce evidence.
4. `EVALUATING_COMPLETION` -> Completion Gate checks deterministic requirements.
5. `COMPLETED` -> transition applied atomically (status + audit + snapshot head updates).
6. `EXECUTED_NOT_COMPLETED` -> execution finished but completion gate failed; return unmet requirements.

### 4.4 Transition completion definition

Transition is complete only when:

- Completion Gate passes, and
- state mutation is persisted, and
- audit/event trail is persisted, and
- snapshot/slot head updates (if part of transition) are persisted.

If execution ends without commit:

- transition remains in prior status,
- unmet requirements are returned as structured diagnostics,
- remediation path is explicit (missing output type, missing link, pending approval, etc.).

Note on terminology:

- Internally, implementation may use transactional finalization helpers.
- Externally, documentation language stays: start gate + completion gate + transition completion.

## 5) Gate Failure Surfacing Requirements

UI/API must expose structured diagnostics, not free-text only:

- `code` (stable machine-readable reason)
- `scope` (`start_gate`, `completion_gate`)
- `blocking` boolean
- `required` payload (what is missing)
- `observed` payload (what was found)
- `remediation` guidance (next valid action)

## 6) Locked vs Open (Final Clarifier)

### Locked boundaries now

- Step capability contract families (`form`, `agent`, `action`, `invoke`, `branch`, `display`)
- Deterministic transition principle and typed-evidence bridge
- Auditability and explicit control invariants

### Open and being finalized now

- Exact methodology configs (statuses, transitions, gate rule sets)
- Artifact slot catalog and naming
- Workflow path definitions and mappings
- Template definitions and canonical prompt schemas
- Legacy taxonomy to canonical definitions final merge table

## 7) Immediate Documentation Outputs Needed Today

1. Canonical term dictionary (legacy -> canonical).
2. Transition rule matrix per priority work-unit types.
3. Slot catalog v1 with required output types by transition.
4. Execution and gate diagnostics contract section.
5. SQLite indexing plan for gate-hot JSON paths.

## 8) Invoke Semantics Under Methodology Layer

Workflows are transition-bound, but `invoke` can operate in two explicit modes.

### Mode A: Same-Work-Unit Fan-Out (default)

- Use when child workflows are techniques/subroutines for the same objective.
- Parent and all invoked children run under the same work unit context.
- Child runs produce namespaced outputs (`techniques.<id>.*`) aggregated back to parent evidence.
- No new work units are created.

Example:

- Brainstorming transition invokes multiple selected techniques.
- All technique runs remain under the single `brainstorming` work unit.

### Mode B: Child-Work-Unit Fan-Out (explicit)

- Use when each iteration item is a true first-class unit with its own lifecycle.
- Invoke iteration creates or binds a work unit per item, then runs target workflow per item.

Example:

- Create stories from an epic:
  - prior step collects story specs/list,
  - invoke iterates list,
  - each item triggers story activation transition (`__absent__ -> draft` or equivalent) on its own story work unit.

### Invoke design constraints

- `invoke` step config should declare `bindingMode` explicitly (`same_work_unit` or `child_work_units`).
- Completion gate for parent transition must define whether it requires:
  - aggregated outputs only (Mode A), or
  - successful child transition outcomes for each required item (Mode B).
- Failures must be item-scoped and reported with remediation for retry/skip policies.

## 9) Technique Workflows Without Static "Kind"

Technique workflows are defined as normal workflows with their own steps, but selected through transition-scoped bindings.

### 9.1 Where technique steps are defined

- Each technique has its own workflow definition and workflow steps.
- Current repo pattern already proves this (`packages/scripts/src/seeds/techniques/*.ts`).
- Parent workflow does not embed child step definitions; it references child workflow keys/ids.

### 9.2 How to avoid static `kind`

Do not add a hardcoded workflow `kind` enum. Use relation/binding tables instead.

Recommended binding model:

1. `work_unit_type_workflow_defs`
   - Associates workflow defs to owning work-unit type under a methodology version.
2. `transition_primary_workflow`
   - Exactly one primary workflow bound to a transition edge (driver workflow).
3. `transition_allowed_workflows`
   - Set of workflows that can be invoked during that transition.
4. Optional labels/tags remain metadata only, not authorization source.

### 9.3 Retrieval for agent technique selection

For current transition context `(methodologyVersion, workUnitType, fromStatus, toStatus)`:

- Query `transition_allowed_workflows` to fetch callable workflow options.
- Join workflow definitions for display fields (`id`, `displayName`, `description`).
- Return this list to selection tool.

This keeps retrieval deterministic and transition-aware, without global/static workflow classes.

### 9.4 Keep AX selection, change options source

- Keep `ax-generation` tool for selecting which workflows to run (carry-over lesson retained).
- Change options source from generic `workflows` tag filter to transition-scoped allowed-workflow query.
- Selection output should be structured (`selected_workflow_ids[]`, optional `reasoning`) and validated before invoke.

### 9.5 Structured output integration

- Use first-class structured output support in OpenCode SDK where relevant for workflow selection outputs.
- For selection step, enforce JSON schema output for chosen workflow IDs and rationale.
- If schema validation fails after retries, surface structured error and keep transition in `EXECUTED_NOT_COMPLETED` until remediated.
