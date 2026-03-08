# Epic 3: OpenCode Agents (Project + System) Design

Date: 2026-03-05
Status: Proposed (proceed with this design unless superseded)

## Goal
Enable Epic 3 execution surfaces to discover, safely present, and run OpenCode agents from:
- Project scope: `{repo-worktree}/.opencode/agents/*.md`
- System scope: `{opencodeHome}/agents/*.md`

This includes safe repository path handling, a single permission gateway, caching/indexing for fast pickers, and clear UI filtering/tabs.

## Non-Goals
- Multi-tenant hosted OpenCode home (server SaaS isolation) beyond a single-user baseline.
- An agent authoring UI for `.opencode/agents/*`.
- Inventing a new agent file format; treat `.md` + optional frontmatter as opaque content.
- Enabling runtime execution in Epic 2 preview surfaces.

## Constraints And Existing Anchors
- Epic 2 explicitly avoids runtime mutation/execution (Epic 3+ only): `docs/plans/2026-03-05-epic-2-preview-setup-transition-facts-agents-design.md`.
- Agent step runtime contract already supports `agentKind: "opencode"`: `docs/architecture/workflow-engine/agent-step-contract.md`.
- Step execution UI patterns anticipate tabbed context panels (Artifact / Variables / Logs): `docs/design/step-execution-layout-system.md`.
- Project-scoped OpenCode agents already exist in this repo: `.opencode/agents/*.md`.

## Primary Decisions (Recommended)

### A) Always Run OpenCode In The Sandbox Worktree
All OpenCode sessions are rooted at the sandbox execution worktree directory (not the host repo path).

Rationale:
- Keeps file access, `.git` state, and `.opencode/` discovery consistent with the execution sandbox.
- Enables a hard security boundary for file paths (deny anything outside worktree).

### B) Dual-Root Agent Discovery With Project-Overrides-System Precedence
Agent discovery searches both roots and merges results:
1) Project root: `{worktreePath}/.opencode/agents/**/*.md`
2) System root: `{opencodeHome}/agents/**/*.md`

If both define the same `agentId`, the project agent wins.

### C) App-Controlled `opencodeHome` (Default)
For the Epic 3 baseline, system-wide agents are read from an app-controlled per-user directory (`opencodeHome`) rather than raw OS OpenCode home (e.g. `~/.config/opencode`).

Rationale:
- Keeps Chiron in control of provenance, indexing, and disclosure.
- Avoids accidental leakage from unrelated user config.

## Data Model / Contract Additions

### Agent Step Config (Additive)
`AgentStepConfig` currently supports:

```ts
type AgentStepConfig = {
  type?: "agent"
  agentKind: "chiron" | "opencode"
  agentId: string
  model?: { provider: "openrouter" | "opencode" | "anthropic" | "openai"; modelId: string }

  message?: string
  initialPrompt?: string

  systemPromptBlock?: string

  tools?: AgentToolConfig[]
  editableVariables?: EditableVariable[]

  completionConditions?: CompletionCondition[]
}
```

Add an optional provenance hint (kept additive and backwards compatible):

```ts
agentSource?: "project" | "system" | "builtin"
```

Notes:
- `agentId` remains the OpenCode-visible identifier.
- `agentSource` is used for UI pickers and for deterministic resolution when duplicates exist.

### Agent Catalog DTO (UI-safe)
Expose a UI-safe catalog listing (no raw file bodies):

```ts
type OpenCodeAgentCatalogEntry = {
  agentId: string
  source: "project" | "system" | "builtin"
  description?: string
  mode?: string
  filePath: string
  contentHash: string
  updatedAtMs: number
}
```

## Repository Path Handling (Safety)

### Canonical Root
Use `worktreePath` as the canonical root for any path-based operation and for project agent discovery.

### Path Validation Rules
Before permitting any path-based tool operation (and before enumerating agent files), enforce:
- Resolve to `realpath()`.
- Deny if resolved path is not under `realpath(worktreePath)`.
- Deny traversal attempts (`..`) and absolute paths outside sandbox.
- Treat symlinks as untrusted: resolve symlink target and apply the same prefix check.

## Security Boundaries (Single Permission Gateway)
OpenCode is not an authority for permissions. It can request actions, but Chiron decides.

### Permission Flow
1) OpenCode runtime requests operation (file, bash, git, network).
2) Adapter converts request into a Tooling Engine permission request.
3) Tooling Engine evaluates allow/ask/deny rules with context:
   - `projectId`, `executionId`, `stepExecutionId`, `worktreePath`
4) If `ask`, UI presents an approval card; user decision is persisted and replayed per scope.
5) Adapter replies to OpenCode with the decision.

### Hard Guardrails
- Always deny any file operation outside `worktreePath`.
- Always deny git operations that imply remote mutation by default (push/force push), unless explicitly enabled by policy.

## Cache / Indexing Strategy

### Service
Introduce an `OpenCodeAgentCatalogService` responsible for scanning, parsing frontmatter, and returning catalog entries.

### Cache Keys
- Project scope cache key: `(executionId, worktreePath, lastScanFingerprint)`.
- System scope cache key: `(userId, opencodeHome, lastScanFingerprint)`.

Fingerprint recommendation:
- Per file: `(relativePath, mtimeMs, size)`.
- Whole root: hash of sorted per-file fingerprints.

### Invalidation
- TTL-based refresh (e.g. 5s-30s) plus explicit refresh on picker open.
- Optional (desktop only): file watcher on `opencodeHome/agents` to invalidate system cache.

## UI: Filtering, Tabs, And Execution Surfaces

### A) Agent Picker (Step Config / Run Controls)
Provide a tabbed picker with:
- Tabs: Project | System | Builtin
- Search: `q` text filter by `agentId` + `description`
- Badges: source + (mode) + warning when an agent declares broad permissions (display-only; policy still enforced server-side)

### B) Execution Workbench Context Panel
Add an `Agents` tab to the workbench context panel (alongside Artifact / Variables / Logs):
- "In this run": agents invoked during this execution (derived from runtime events)
- "Available": same tabbed picker

### C) Project Surfaces
Keep `/projects/$projectId/agents` as "methodology agent types" (baseline preview). Add a separate route for OpenCode filesystem agents, for example:
- `/projects/$projectId/opencode-agents`

## Likely Integration Points (Code)

### Contracts
- Modify: `docs/architecture/workflow-engine/agent-step-contract.md` (document `agentSource` as additive)
- Modify (code): wherever `AgentStepConfig` is defined (see `docs/architecture/workflow-engine/agent-step-contract.md`)

### API
- Create: `packages/api/src/routers/opencode-agents.ts` (list agents for picker)
- Modify: `packages/api/src/routers/index.ts` (mount router)

### Web
- Create: `apps/web/src/features/opencode-agents/agent-picker.tsx`
- Create: `apps/web/src/routes/projects.$projectId.opencode-agents.tsx`
- Modify (Epic 3 execution UI): wherever agent steps are configured/run, add picker + tabs.

## Acceptance Criteria
- Project agent discovery reads `.opencode/agents/*.md` from the execution worktree and surfaces them in the picker.
- System agent discovery reads `{opencodeHome}/agents/*.md` and surfaces them under the System tab.
- Project agent overrides system agent on `agentId` collision.
- Any path-based operation outside the sandbox `worktreePath` is denied.
- UI supports tab filtering (Project/System/Builtin) and `q` search.
