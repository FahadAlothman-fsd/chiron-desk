# Agent Step Config (Harness-Aware) Design

Date: 2026-03-11  
Status: Proposed

## Goal
Define a best-fit schema for configuring agent-driven workflow steps across multiple harnesses (`chiron` and `opencode`) with:

- One step contract (`agent.v1`) that works for both harnesses.
- Deterministic prompt composition (identity + step overlay + context capsules + task prompt).
- Harness-specific agent selection sources.
- Step-level tool surface, approvals, and completion policy as the single source of truth.

This design is intended to align with:

- `docs/architecture/workflow-engine/agent-step-contract.md`
- `docs/architecture/modules/template-engine.md`
- `docs/architecture/modules/provider-registry.md`
- `docs/plans/2026-03-05-opencode-agents-epic3-design.md`

## Non-Goals
- Inventing a new OpenCode agent file format (treat `.md` + optional frontmatter as opaque).
- Moving permission enforcement into the UI (policy is server-side).
- Introducing new infrastructure for prompt storage beyond the existing prompt-receipt direction.

## Key Decisions
### 1) One Contract, Adapter-Scoped Differences
`agent.v1` remains harness-agnostic. Harness differences are handled by:

- Adapter-side resolution (how `agentId` is resolved/loaded).
- A small, namespaced `harnessConfig.<agentKind>` object for harness-only knobs.

### 2) Two-Lane Instruction Injection (Recommended)
Use two distinct channels:

- **SYSTEM overlay** (`systemPromptBlock`) for behavioral constraints, tool/approval rules, output discipline.
- **USER task prompt** (`initialPrompt`) for the step's immediate request.

Rationale: keeps "policy" high-priority and stable while keeping "task" visible as user intent.

### 3) Step Config Is The Source Of Truth For Tools + Completion
The step declares:

- the tool list and gating/approval fields
- completion conditions

The harness runtime cannot expand privileges; it can only request within the declared surface.

## Proposed Schema
This is the canonical `agent.v1` config shape stored in `methodology_workflow_steps.config_json`.

```ts
type AgentStepConfigV1 = {
  contract: "agent.v1"

  // Harness selection
  agentKind: "chiron" | "opencode"

  // Agent selection (resolver input; adapter decides load source)
  agentId: string
  agentSource?: "project" | "system" | "builtin" // UI/picker hint + deterministic tie-breaker

  // Model hint (non-secret). Final resolution uses provider-registry precedence.
  modelHint?: { provider?: string; modelId?: string }

  // UI-only (never sent to the model unless duplicated in prompt fields)
  message?: string
  guidanceJson?: {
    human?: { markdown?: string }
    agent?: { markdown?: string }
  }

  // Prompt composition (templated)
  prompt?: {
    // SYSTEM overlay: step-scoped behavioral constraints and rules.
    systemPromptBlock?: string

    // First USER message for the step: the task request.
    initialPrompt?: string

    // Deterministic context capsules (invoke outputs, facts, evidence, etc.)
    contextAttachments?: Array<{
      variable: string
      role?: "system" | "user" // default "system"
      format?: "json" | "text" // default inferred
      label?: string
    }>

    // Optional continuation contract
    continuityKey?: string
    continuityMode?: "new" | "continue" // default "continue"
  }

  // Tool surface + approvals
  tools?: AgentToolConfig[]
  toolPolicy?: {
    ref?: string            // optional shared defaults (e.g. progressive unlock)
    serverEnforced?: boolean // default true
  }

  editableVariables?: EditableVariable[]

  completionConditions?: CompletionCondition[]

  // Harness-only knobs (namespaced; ignored by other harness)
  harnessConfig?: {
    chiron?: Record<string, unknown>
    opencode?: {
      runRoot?: "sandboxWorktree" | "hostRepo" // default sandboxWorktree
      opencodeHomeMode?: "appManaged" | "nativeHome" // default appManaged
    }
  }
}
```

Notes:

- Template rendering is handled by VariableService/TemplateEngine (Handlebars). The step config stores templates, not rendered text.
- `agentSource` is a deterministic resolver input (and UI hint), not a security boundary.

## Harness-Specific Agent Selection
### `agentKind: "chiron"`
Source of truth: Chiron DB agent types (for example `methodology_agent_types.key`).

- `agentId` resolves to a DB row key.
- Prompt identity content is loaded from DB (`promptTemplateJson` or equivalent) and composed with step overlays.

### `agentKind: "opencode"`
Source of truth: OpenCode agent catalog (filesystem), rooted in the execution sandbox.

Resolution and precedence (per Epic 3):

1) Project root: `{worktreePath}/.opencode/agents/**/*.md`
2) System root: `{opencodeHome}/agents/**/*.md`

If both define the same `agentId`, the project agent wins. `agentSource` may be used to force a specific root for deterministic debugging, but default behavior is "project overrides system".

Hard guardrails:

- Any path-based access must be restricted under `worktreePath` (deny outside sandbox).
- Symlink targets must be resolved and re-checked against `worktreePath`.

Open decision (needs explicit product call):

- Whether OpenCode agent file content is the runtime source of truth, or whether Chiron imports/freezes the content into DB.

Default recommendation: treat filesystem content as runtime source of truth for `opencode`, and capture `contentHash`/metadata in prompt receipts for audit and reproducibility.

## Tool Policy
### Where Policy Lives
- Concrete tool list and per-tool requirements live in the step config (`tools[]`).
- `toolPolicy.ref` is optional and only supplies shared defaults/hints (for example "progressive unlock" UI policy).

### Enforcement
- Tool execution is always mediated by the server permission gateway.
- Step config defines what can be requested; the Tooling Engine defines what is allowed/asked/denied at runtime.

### Tool Gating
Support deterministic gating based on:

- `requiredVariables` (unlock when prerequisites set)
- `requiresApproval` (execution gated by approval system)

If adopting the BMAD progressive-unlock model, express it as:

- per-tool `requiredVariables` and "lock when target variable is already set" behavior
- plus an optional `toolPolicy.ref` that standardizes UI behavior (hide/disable + explain)

## Guidance (Human vs Agent)
- `message` and `guidanceJson` are UI surfaces (human-facing, and optionally agent-facing in the UI).
- Nothing in guidance is implicitly injected into the model; only `prompt.*` fields are injected.

If you want guidance to influence the agent, include it explicitly in `systemPromptBlock` or `initialPrompt`.

## Prompt Composition
This composition is executed at run start (and again on each model call if needed), and recorded via prompt receipts.

Recommended deterministic composition:

1) Load agent identity prompt (by harness resolver):
   - `chiron`: DB agent type prompt template
   - `opencode`: resolved filesystem agent content
2) Render and append `prompt.systemPromptBlock` (SYSTEM overlay)
3) Render and append `prompt.contextAttachments` as labeled capsules (role default SYSTEM)
4) Send first USER message as rendered `prompt.initialPrompt`

### System Overlay vs Message Append (Tradeoffs)
System overlay (`systemPromptBlock`):

- Pros: highest priority; best for tool/approval rules and "do not claim done" constraints; stable across long runs and continuation.
- Cons: requires receipt/hash tracking to preserve auditability; overuse can bloat system prompt.

User message append (`initialPrompt`):

- Pros: clearly represents step intent; works well with chat history; encourages predictable behavior when the agent identity is stable.
- Cons: lower priority than system; not appropriate for hard safety/policy constraints.

Recommendation: two-lane approach.

## Validation Requirements
At publish time and run start, validate:

- `contract === "agent.v1"` and `agentKind` is known.
- `agentId` resolves in the selected harness catalog.
- Templates compile (Handlebars) and variable references are allowed (strict by default for runtime composition).
- `tools[]` conform to the shared `AgentToolConfig` contract.
- `completionConditions[]` are present and deterministic (no "silent done").
- Unknown keys are rejected except under `harnessConfig.<agentKind>`.

## Observability / Audit
Follow the prompt-receipt direction from `docs/architecture/modules/template-engine.md`:

- Store hashes and references for composed system prompt and context.
- Record tool config hash, model/provider selection, and outputs.
- Do not retain full rendered prompt text by default; enable text retention only via explicit policy.

## Open Questions
1) OpenCode agent content authority: runtime filesystem vs DB-frozen import.
2) Whether `agentSource` is purely a UI hint or allowed as a strict resolver directive (recommend: hint + debug only).
3) Whether to standardize a small set of `toolPolicy.ref` values now, or defer until there are 2+ concrete distinct policies.
