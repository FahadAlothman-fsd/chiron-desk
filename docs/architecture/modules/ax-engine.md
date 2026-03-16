# AX Engine Module Design

**Package:** `@chiron/ax-engine`  
**Status:** Planned (scaffold-only package)

## Purpose

Run optimization loops for prompt/tool-generation quality and return governed recommendations.

For phase 1, AX is approved as a manual-first tool path (`ax-generation`) in runtime executions.
The policy and target service shape in this document are architecture authority, not proof that the runtime path is wired today.

Chiron uses `@ax-llm/ax` as the DSPy-style optimization framework for TypeScript.

Before implementation starts, engineers must refresh live `@ax-llm/ax` APIs and examples against current upstream docs and package exports. This document locks Chiron policy, not a guaranteed snapshot of the live library surface.

## Current Reality

- Standalone package is scaffold-only.
- Runtime wiring through `tooling-engine`, `agent-runtime`, and `template-engine` is still planned, not implemented.
- DB persistence described here is planned architecture from the March 8 AX design docs, not current schema reality.
- Prototype concepts exist outside this package.
- This doc is allowed to be ahead of code because it defines the canonical AX policy baseline, but implementation engineers must treat the repo as scaffold-only until concrete package and schema work lands.

## MVP Responsibilities

- Register optimization signatures/targets.
- Execute optimization from explicit tool calls (`ax-generation`) and approved scheduled runs.
- Produce staged recommendations (never auto-apply).
- Record run metadata, evidence, and telemetry.
- Expose recommendation lookup for explicit promotion decisions.

## Locked Policy Baseline (2026-02-09)

### Trigger Policy

- MVP trigger mode is **manual-first**.
- Optional scheduled runs are allowed only for approved signatures with stable datasets.
- Fully automatic trigger-on-every-failure is out-of-scope for MVP.

### Scope Policy (Phase 1)

- AX runs only through the tool path used by runtime flows.
- Primary invocation path: agent-runtime -> tooling-engine -> ax-engine.
- AX does not become a global autonomous optimizer in MVP.

### Input/Output Contract

- AX operates on versioned template/signature references, not ad-hoc prompt strings.
- Optimization outputs are recommendations (`PromptVariant` + score metadata), not auto-applied runtime mutations.
- Promotion of a recommendation to active runtime config requires explicit approval.

### Variant Policy (Locked)

- Workflow/runtime consumption defaults to **one selected recommendation** per run for UX simplicity.
- Candidate sets are optimizer artifacts and may contain multiple variants.
- Multi-candidate sets are most common for `gepa` (Pareto/tradeoff outputs).
- `mipro` may still emit multiple candidates internally, but default exposure remains single selected output unless advanced mode is enabled.
- ACE-style agentic candidate patterns are deferred with ACE support and are out-of-scope for phase 1.

### Optimization Planes (User-Configurable)

- **Objective plane:** optimize for quality, cost, latency, tool success, or weighted multi-objective mixes.
- **Scope plane:** step-signature scope in MVP (workflow/project scopes staged for later).
- **Trigger plane:** manual, scheduled, and suggested (suggested must still be approved).
- **Rollout plane:** shadow -> canary -> promoted.
- **Budget plane:** hard caps for run time, token budget, and cost budget.

### Optimizer Selection Policy (Locked For Phase 1)

Phase 1 supports two optimizer profiles with explicit selection conditions:

- **MiPRO** (`mipro`)
  - Primary for single-objective optimization (for example accuracy/consistency-focused tasks).
  - Phase 1 requirement baseline: optimization runs require a metric and a training example set (small sets are acceptable).
  - Typical fit includes classification/constrained extraction signatures, but MiPRO is not limited to classification-only tasks.
- **GEPA** (`gepa`)
  - Primary for balancing competing objectives (quality vs cost vs latency).
  - Use when trade-offs are explicit and a frontier-style recommendation set is needed.

ACE (`ace`) is deferred to a future phase pending dedicated agent-loop integration design.

Other prototype optimizer types (`opro`, `promptbreeder`) remain out-of-scope for phase 1.

### Rollout Safety

- Recommended variants are staged before production use.
- Keep baseline prompt variant available for immediate rollback.
- Track run telemetry (quality score, usage/cost, latency) for each recommendation.

## Effect Service Graph (Locked)

- `AxRegistry` - signature and variant metadata lifecycle.
- `AxResolver` - resolves datasets, context bindings, and template references.
- `AxOptimizer` - provider-backed optimization executor.
- `AxEngine` - orchestration facade used by tooling-engine.

### Optimizer Driver Extensibility (Locked)

AX optimizer implementations must be pluggable via a driver boundary.

- Driver key: `optimizerType`
- Required driver capabilities:
  - `canHandle(signature)`
  - `prepare(runConfig, dataset)`
  - `execute(runConfig)`
  - `toVariantArtifacts(result)`
- New optimizers are added by registering a new driver, without changing core orchestration semantics.

Each service is expressed as Effect `Tag` + `Live`/`Test` layers with typed `TaggedError` channels.

## Lifecycle (Locked)

Signature/variant lifecycle:

- `draft` -> `staged` -> `promoted` -> `deprecated`

Run lifecycle:

- `queued` -> `running` -> `completed | failed | cancelled`

## Tool Availability Scopes (Future/Phase 2+)

To support future agentic optimizer workflows (including ACE-style memory/playbook patterns), tools can be exposed with scoped availability:

- `call`: single invocation only
- `step`: available for one step execution attempt
- `session`: available for the chat/session lifetime
- `execution`: available for the workflow execution lifetime

AX-related tools should support session scope where policy permits (for playbook/memory continuity in future agentic optimizer phases).

Promotion rules:

- Promotion requires explicit approval and evidence threshold checks.
- Rollback must be one-step and deterministic to prior promoted baseline.

## Phase 2 Responsibilities

- ACE integration after agent-loop architecture is locked.
- Advanced objective policy features (for example dynamic weight tuning and frontier curation).
- Feedback loop using user corrections and execution quality signals.
- Tight integration with template-engine versioned templates.

## Persistence Mapping (MVP)

- Planned persistence includes template registry tables plus AX signature, binding, run, variant, and project-selection tables described in the March 8 AX design docs.
- Current repo reality does not yet include those AX or template tables in `packages/db/src/schema/`, so this section is a target-state mapping, not an implemented inventory.
- Prompt/template lineage is still expected to come from template-engine references and prompt receipts once the related schema and runtime wiring exist.

If additional metadata is required, extend optimization persistence with additive tables (no destructive migration).

## Effect Service Shape (Target)

- `optimize(signatureId, datasetRef, constraints?) -> Effect<OptimizationResult>`
- `recommend(signatureId, context) -> Effect<PromptVariant>`
- `recordFeedback(feedbackEvent) -> Effect<void>`
- `promote(signatureId, variantId, approvalContext) -> Effect<PromotionResult>`
- `rollback(signatureId, targetVariantId, reason) -> Effect<void>`

## Dependencies

- `@chiron/contracts`
- `@chiron/provider-registry`
- `@chiron/template-engine` (target rename: `@chiron/template-engine`)
- `@chiron/db`
- `@chiron/tooling-engine`

## Decision Lock (2026-02-11)

### Optimizer Scope (Phase 1)

- Phase 1 supports `mipro` and `gepa` only.
- `ace` is deferred pending dedicated agent-loop integration design.
- AX remains registry-driven so future optimizer drivers can be added without orchestration refactors.

### AX + DSPy Positioning

- Chiron standardizes on `@ax-llm/ax` as the DSPy-style optimization layer for TypeScript signatures.
- In this module, "AX" references that `@ax-llm/ax` stack and its optimizer model.

### Default Objective Weights by Signature Class

- Structured/extraction: quality 0.55, cost 0.20, latency 0.15, stability 0.10.
- Generative/drafting: quality 0.50, faithfulness 0.25, cost 0.15, latency 0.10.
- Agentic/tool-use: task-success 0.50, safety 0.25, cost 0.15, latency 0.10.
- In phase 1, weighted objective optimization is GEPA-primary; MiPRO remains single-objective-first and ACE is deferred.

### Suggested Trigger Default

- Suggested optimization triggers are opt-in by default at project scope.

### Promotion Evidence Thresholds (Profile Defaults)

- Fast: >=30 evals and >=3% improvement with no safety regression.
- Balanced: >=100 evals and >=5% improvement with no guardrail regression.
- Rigorous: >=300 evals and >=8% improvement, stable across two consecutive runs.

## Observability Surface (Locked)

### Key Events

- `ax.optimize.start`
- `ax.optimize.complete`
- `ax.optimize.failure`
- `ax.recommend.select`
- `ax.promote.request`
- `ax.promote.complete`
- `ax.rollback.execute`

### Critical Metrics

- `module_requests_total` (optimize/recommend/promote/rollback)
- `module_failures_total` (run and promotion failures)
- `module_operation_duration_ms` (AX operation latency)
- `ax_engine_optimize_total`
- `ax_engine_optimize_failed_total`
- `ax_engine_variant_generated_total`
- `ax_engine_promote_total`

### Required Span Names

- `module.ax-engine.optimize`
- `module.ax-engine.recommend`
- `module.ax-engine.promote`
- `module.ax-engine.rollback`

### Sensitive Data Rules

- Do not log raw training example content.
- Do not log rendered prompt variant bodies.
- Persist and export hashes/ids plus aggregate scores and telemetry only.

## Open Decisions

- None for phase 1.
