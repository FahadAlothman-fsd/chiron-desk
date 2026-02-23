# Chiron Design Decisions

> Status Notice (2026-02-23): For frontend UX implementation, this document is historical context only.
> Canonical UX and visual-system source of truth is `_bmad-output/planning-artifacts/ux-design-specification.md` plus `_bmad-output/planning-artifacts/reset-baseline-checklist.md`.

> Living document. Records key design choices made during development.

---

## DD-001: Geist Pixel as Default Font Family

**Date:** 2026-02-08
**Status:** Accepted

### Decision

Adopt **Commit Mono + Geist Pixel** as the locked typography system for Chiron's desktop UI.

### Font Family Stack

| Use | Font | CSS Variable |
|---|---|---|
| **Primary UI** | Commit Mono | `--font-commit-mono` |
| **Accent / Signifiers** | Geist Pixel Square | `--font-geist-pixel-square` |
| **Alternate pixel variants** | Grid, Circle, Triangle, Line | Available via stylistic alternates |

### Details

- **Package:** local/bundled font assets
- **Import:** project CSS font-face declarations for Commit Mono + Geist Pixel variants
- **Variants:** 5 Geist Pixel sub-families — Square (default), Grid, Circle, Triangle, Line
- **Glyphs:** 480 glyphs, 7 stylistic sets, 32 languages
- **Metrics:** tuned line-height and spacing for Commit Mono dominant reading surfaces
- **Horizontal:** Semi-monospaced — consistent widths across similar glyphs

### Rationale

Chiron is a developer-facing workflow orchestration tool. Commit Mono provides high legibility in dense operational interfaces, while Geist Pixel adds a distinctive technical accent for labels and identity cues. This balance preserves readability and the mission-control visual signature.

### Integration Notes

- **Package:** `geist` v1.7.0+ (zero deps) — includes Sans, Mono, and all Pixel variants
- **Tauri advantage:** Fonts bundled with app binary — no network fetch, no FOUT
- **CSS import:** `import 'geist/font/pixel/square.css'` (or JS: `import { GeistPixelSquare } from 'geist/font/pixel'`)
- **Tailwind v4:** `@theme { --font-sans: var(--font-geist-pixel-square); --font-mono: var(--font-geist-mono); }`
- **shadcn/ui:** Inherits from Tailwind font config, wrap root in font variable classes
- **Usage guidance:** Pixel variants best for headlines, display, navigation — use Geist Sans for body copy if needed
- **Alternative package:** `@fontsource/geist` for tree-shaking and font subsetting

---

## DD-002: OpenCode-Inspired Permission Model for Tooling Engine

**Date:** 2026-02-08
**Status:** Accepted (pending implementation)

### Decision

Adopt OpenCode's `allow | ask | deny` per-tool permission model with pattern matching, adapted for Chiron's tool/action taxonomy. **Replaces** the previously planned trust × risk matrix.

### OpenCode's Model (reference implementation)

From `packages/opencode/src/permission/next.ts` in [anomalyco/opencode](https://github.com/anomalyco/opencode):

```typescript
// Core types
type Action = "allow" | "ask" | "deny"
type Rule = { permission: string; pattern: string; action: Action }
type Ruleset = Rule[]
type Reply = "once" | "always" | "reject"
```

**Key mechanics:**
- **Config format:** Simple `{ "*": "ask", "bash": "allow" }` or nested `{ bash: { "*": "ask", "git *": "allow" } }`
- **Resolution:** Merge all rulesets flat, `findLast` match wins (last rule takes precedence)
- **Pattern matching:** Wildcard `*` (zero or more chars), `?` (exactly one char) on both permission name AND argument patterns
- **Approval flow:** `deny` → throw `DeniedError`, `ask` → create Promise + publish event to UI, `allow` → proceed
- **Reply options:** `once` (approve this call), `always` (add to approved ruleset + auto-resolve matching), `reject` (reject + cascade reject all session pending)
- **State:** In-memory pending map + approved rules per-project
- **Tool grouping:** Edit tools (edit/write/patch/multiedit) all map to `"edit"` permission
- **Disabled check:** Blanket deny rule (pattern=`*`, action=`deny`) disables entire tool

### Chiron's Adaptation

**Permission names** map to Chiron's tool/action taxonomy:

| Chiron Permission | Maps To | Default |
|---|---|---|
| `update-variable` | Variable mutation tool | `allow` |
| `ax-generation` | Prompt optimization tool | `allow` |
| `action.git` | Git operations | `ask` |
| `action.file` | File read/write | `ask` |
| `action.directory` | Directory operations | `ask` |
| `action.env` | Environment variable access | `deny` |
| `action.variable` | Workflow variable mutation | `allow` |
| `action.artifact` | Artifact creation/update | `allow` |
| `action.snapshot` | Snapshot creation | `allow` |
| `custom` | Custom tool execution | `ask` |

**Preset profiles** (like OpenCode's Build/Plan agents):

| Profile | Description | Default Actions |
|---|---|---|
| `builder` | Full access (like OpenCode Build) | All `allow` except `action.env` |
| `planner` | Read-only analysis (like OpenCode Plan) | Write tools `deny`, read tools `allow` |
| `cautious` | Everything requires approval | All `ask` |

**Effect integration:**

```typescript
// Permission as an Effect Service
const PermissionService = Effect.Tag<{
  evaluate: (permission: string, patterns: string[], ...rulesets: Ruleset[]) => Effect<Rule>
  ask: (request: PermissionRequest) => Effect<void, DeniedError | RejectedError>
  reply: (requestId: string, reply: Reply) => Effect<void>
  disabled: (permission: string, ...rulesets: Ruleset[]) => boolean
}>()
```

**Single approval gateway:** DB-backed for audit + in-memory Deferred for synchronous rendezvous. Replaces both the workflow-engine and tooling-engine approval gateways.

**Config hierarchy** (adapted from OpenCode's precedence model):
1. Per-workflow-step config (most specific)
2. Per-agent profile (builder/planner/cautious)
3. Per-project config
4. User global config
5. System defaults (least specific)

**Reply persistence:** `"always"` replies are stored in DB (unlike OpenCode's in-memory-only approach), surviving server restarts. Scoped per-project.

### What We're NOT Adopting

- Trust × risk matrix (overengineered, replaced by per-tool rules)
- Separate approval status enums (unified to `allow | ask | deny`)
- Dual approval gateways (single gateway in tooling-engine)

---

## DD-003: Effect-Native Contracts Package

**Date:** 2026-02-08
**Status:** Accepted (pending implementation)

### Decision

Migrate `@chiron/contracts` from plain TypeScript types to **Effect Schema** definitions. Export both the Schema and the inferred type from each definition.

### Rationale

Every consumer of `@chiron/contracts` already depends on Effect. Each package independently defines its own decode schemas for the same shapes — duplicated validation logic. Effect Schema in contracts eliminates this duplication and establishes the canonical shape at the source.

### Pattern

```typescript
// Before (plain TS)
export type AgentKind = "chiron" | "opencode"

// After (Effect Schema)
export const AgentKind = Schema.Literal("chiron", "opencode")
export type AgentKind = Schema.Schema.Type<typeof AgentKind>
```

### Impact

- Effect becomes a peer dependency of `@chiron/contracts`
- All consumers update from `import type { X }` to `import { X, XSchema }` where needed
- Decode boundaries at package edges reuse contract schemas instead of redefining

---

## DD-004: Unified Permission Terminology

**Date:** 2026-02-08
**Status:** Accepted (pending implementation)

### Decision

Standardize all permission and approval language across the codebase:

| Concept | Standard Term | Replaces |
|---|---|---|
| Permission actions | `allow \| ask \| deny` | `approved/pending/rejected`, `none/text/selector/confirm` |
| User reply | `once \| always \| reject` | `approved/rejected`, `ApprovalResolution` |
| Error types | `DeniedError`, `RejectedError` | `ApprovalError`, various |
| Tool outcome | `allowed \| asked \| denied \| executed \| error` | `pending/approved/executed/error` |

This aligns with OpenCode's vocabulary, which users of coding AI tools already understand.

---

## DD-005: Template Engine Module Boundary

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Adopt **Template Engine** as the canonical module boundary (`@chiron/template-engine`).

### Boundary

- Template Engine owns template lookup, rendering, helper policy, and composition for:
  - system prompts
  - initial agent prompts
  - artifact templates
- Variable Service owns variable state/scopes/history and does not own template rendering.
- Workflow/runtime services decide when composition is triggered.

### Rationale

Template behavior currently exists in multiple places. A single boundary prevents drift and keeps variable persistence concerns separate from rendering concerns.

---

## DD-006: Prompt Receipt Audit Standard

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Use **prompt receipts** as the reproducibility envelope for each model call, while reusing existing chat/checkpoint persistence for message content.

### What Gets Stored

- references: `executionId`, `stepExecutionId`, `chatSessionId`, `inputMessageRefs`
- template lineage: `templateId`, `templateVersion`
- integrity: `contextHash`, `systemPromptHash`
- runtime config: provider/model/tools/params
- output refs and telemetry: assistant message/checkpoint refs, usage/cost/latency

### System Prompt Rule

- System prompt is tracked per model call via receipt hash.
- If system prompt content changes, emit a new receipt.
- Session metadata may keep latest system prompt for convenience, but receipts are audit source-of-truth.

### Rationale

Chiron already stores chat messages and stream checkpoints. Receipts avoid heavy duplication while making replay and audit deterministic.

---

## DD-007: AX Engine Phase-1 Scope And Governance

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Phase-1 AX usage is constrained to tool-path execution (`ax-generation`) within runtime workflows.

### Boundaries

- Invocation path: `agent-runtime -> tooling-engine -> ax-engine`.
- AX produces staged recommendations only.
- Promotion requires explicit approval; rollback path is mandatory.
- No autonomous always-on optimizer in MVP.

### Optimization Planes

- Objective: quality/cost/latency/tool-success (single or weighted)
- Trigger: manual-first, scheduled optional, suggested gated
- Rollout: shadow/canary/promoted
- Budget: runtime/token/cost caps

### Extensibility Rule

AX optimizers are integrated through a pluggable driver interface keyed by optimizer type, so new optimizers can be added without rewriting orchestration logic.

### Tool Availability Rule

AX and related memory/playbook tooling may use broader availability scopes (`call`, `step`, `session`, `execution`) rather than one-shot invocation only, with policy-gated session/execution scope.

### Optimizer Profiles (Phase 1)

- `mipro` for classification/constrained extraction style signatures
- `gepa` for multi-objective tradeoff optimization
- `ace` for long-running agent/task optimization loops

Other prototype optimizers are deferred out of phase 1 scope.

### Variant Exposure Rule

- Chiron defaults to a single selected recommendation result per AX run.
- Candidate sets are retained for audit/governance and are surfaced as advanced detail.
- GEPA commonly produces multi-candidate tradeoff sets; MiPRO/ACE default UX remains single selected result.

### Rationale

This keeps AX immediately useful while preventing scope creep and unsafe automatic mutations during initial implementation.

---

## DD-008: Workflow I/O Contract Rollout Strategy

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Keep workflow execution variable-centric in phase 1 (form/action/invoke wiring), and introduce explicit top-level workflow input/output contracts as an additive phase-2 capability.

### Phase-1 Behavior

- Workflow-level I/O remains implicit through step configs and execution variables.
- `form` steps collect runtime inputs.
- `action`/`invoke` outputs populate execution variables/artifacts.

### Phase-2 Additive Extension

- Add optional workflow-level `inputSchema`, `outputSchema`, and `exports` mapping.
- Preserve backward compatibility for existing variable-driven workflows.
- Validate boundary contracts at execution start/completion when present.

### Rationale

Current flow is functional and already used broadly; additive boundary contracts improve discoverability and validation without blocking immediate implementation work.

---

## DD-009: Module Coupling Review Gate (Pre-Implementation)

**Date:** 2026-02-09
**Status:** Accepted

### Concern

Several core modules are closely related (`workflow-engine`, `agent-runtime`, `tooling-engine`, `event-bus`, `variable-service`, `template-engine`, `provider-registry`, `sandbox-engine`, `ax-engine`). There is risk of circular dependencies and DI complexity if boundaries are not validated before implementation.

### Decision

Before implementation epics begin, run a dedicated module-coupling pass to validate dependency directions and decide whether tightly-coupled modules should be merged or kept separate.

### Gate Criteria

- No circular package dependencies in target module graph.
- Clear ownership per module with explicit interface boundaries.
- Dependency inversion used at boundaries (contracts/interfaces first).
- If two modules cannot be separated without constant bidirectional calls, merge decision is allowed and documented.

### Scope

This review is a required gate for the next session before final implementation sequencing.

---

## DD-010: Sandbox Engine Owns Git Primitives

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Sandbox Engine is not limited to worktree setup. It owns the core Git primitive capability surface used by Chiron runtime actions.

### Boundary

- Sandbox Engine: isolation lifecycle + git primitives.
- Tooling Engine: orchestration + permission/policy + approval.
- Workflow/agent runtime: consume git through tooling-engine-facing paths only.

### Rationale

Keeping Git primitives in one module reduces drift, avoids duplicated git logic across runtime layers, and prevents circular dependency pressure between workflow execution and action policy systems.

---

## DD-011: OpenCode Git Observability Hybrid Strategy

**Date:** 2026-02-09
**Status:** Accepted

### Decision

For OpenCode-backed executions, use a hybrid strategy:

- **Source of truth for file changes:** OpenCode APIs (session diff/status/history surfaces)
- **Granular command observability/control:** optional project-level OpenCode plugin hooks

### Boundary

- Chiron should not rely only on plugin hooks for correctness.
- Plugin hooks are used for richer per-command telemetry and policy behavior.
- Persisted edited-file records in Chiron are derived from deterministic OpenCode session/file APIs.

### Rationale

OpenCode provides strong built-in session and diff endpoints, while hook coverage can vary by execution path. This hybrid model preserves correctness and still enables fine-grained observability.

---

## DD-012: Provider Registry Credential Scope And Runtime Policy Split

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Provider credentials are user-level only. Model/runtime configuration is resolved by precedence, and runtime retry/limits behavior is split between registry policy and runtime enforcement.

### Rules

- Credentials are stored encrypted per user and never scoped at project/execution/step levels.
- Model configuration precedence: `system -> project -> execution -> step` (non-secret config only).
- Outage handling baseline uses OpenCode-style exponential backoff.
- Provider Registry owns retry profiles, health policy, and quota decisions.
- Agent Runtime executes calls/retries and reports usage telemetry back to registry.

### Rationale

This keeps secret handling simple and safe while allowing contextual model behavior without duplicating provider policy logic in runtime or UI layers.

---

## DD-013: Template Engine Strictness And Prompt Retention Policy

**Date:** 2026-02-09
**Status:** Accepted

### Decision

Template rendering is strict-by-default at runtime, with a constrained helper allowlist, and prompt receipts use hash-first retention.

### Rules

- Runtime: strict mode on unresolved variables.
- Preview/editor: relaxed mode allowed with diagnostics.
- Helper allowlist for phase 1 includes flow/comparison/boolean/fallback helpers only.
- No arbitrary code execution helpers.
- Prompt receipts store hashes and references by default.
- Full rendered system prompt text is opt-in and policy-gated with bounded retention.

### Rationale

This protects runtime determinism and safety while preserving enough observability for debugging and reproducibility.
