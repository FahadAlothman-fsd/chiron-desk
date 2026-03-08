# AX Integration (Phase 1) + AX Signature Registry Design

**Date:** 2026-03-08

## Bottom Line

Chiron phase 1 should integrate AX as a first-class module (`@chiron/ax-engine`) instead of relying on plain AI SDK/MCP tool calls, because the core requirement is a governed optimization lifecycle: stable targets, evidence-backed runs, staged recommendations, explicit promotion/rollback, and reproducibility envelopes.

This design introduces an **ax-signature registry** and related persistence tables connected to **templates**, **workflow steps**, **projects**, and **runs**, in a low-risk, additive migration order.

## Context And Constraints (Canonical)

This design aligns with:

- `docs/architecture/modules/ax-engine.md`
  - Manual-first triggers in phase 1
  - Primary invocation path: `agent-runtime -> tooling-engine -> ax-engine`
  - Operates on versioned references, not ad-hoc prompt strings
  - Outputs are recommendations, never auto-applied
  - Lifecycle: signature `draft -> staged -> promoted -> deprecated`; runs `queued -> running -> completed|failed|cancelled`
  - Phase 1 optimizer profiles: `mipro` and `gepa`

- `docs/architecture/modules/template-engine.md`
  - Prompt receipts for audit/reproducibility
  - Do not persist full rendered prompt text by default (hashes/refs only)

Current repo reality:

- `packages/ax-engine/src/index.ts` and `packages/workflow-engine/src/index.ts` are scaffold-only.
- Current DB schema (`packages/db/src/schema/*.ts`) does not yet include template or optimization tables.

## Why An AX Optimizer Module (Vs Plain AI SDK/MCP Tools)

Plain AI SDK/MCP tooling solves *invocation*, not *optimization governance*.

AX as a module provides (phase-1 required):

- **Registry-driven targets**: stable identity for "what we are optimizing" (signatures/bindings), independent from any one run.
- **Comparable evaluation artifacts**: run metadata, optimizer type, metric bundles, and variant scores.
- **Promotion safety**: recommendations are staged; using a new variant requires explicit approval and canary/rollback.
- **Reproducibility envelope**: references + hashes + config snapshots (without storing sensitive prompt bodies).
- **Service boundaries**: encapsulates optimizer drivers and keeps runtime execution modules simple and deterministic.

If AX is not a module, optimization becomes ad-hoc prompt edits embedded in workflow configs or agent instructions, with weak auditability and no systematic rollback.

## Scope Decision For Phase 1 (Chosen Default)

**Default assumption:** promotions are **project-scoped** for phase 1 (lowest blast radius).

- Rollout states apply per project: `shadow -> canary -> promoted`.
- A project can opt into a variant for a specific step signature without affecting other projects.

If global (methodology-wide) promotion becomes the requirement later, add a separate global selection table and define precedence rules (project selection overrides global).

## Data Model (Phase 1)

### Design Principles

- Additive-only migrations.
- Keep link points stable and deterministic.
- Avoid hard dependencies on runtime execution tables that do not exist yet.
- Do not store full rendered prompt text in AX persistence by default; store patches + hashes.

### Table Set

#### 1) Template Registry (Minimal)

Even if `@chiron/template-engine` is scaffold-only, phase 1 needs a versioned template reference to satisfy "AX operates on versioned template/signature references".

- `template_definitions`
  - `id` (pk)
  - `key` (unique)
  - `kind` (`system` | `step_prompt` | `artifact`)
  - `created_at`, `updated_at`

- `template_versions`
  - `id` (pk)
  - `template_id` (fk -> `template_definitions.id`)
  - `version` (string)
  - `body` (text)
  - `body_hash` (text)
  - `created_at`
  - unique(`template_id`, `version`)

#### 2) AX Signature Registry

- `ax_signatures`
  - `id` (pk)
  - `key` (unique)
  - `display_name`
  - `status` (`draft` | `staged` | `promoted` | `deprecated`)
  - `signature_class` (`structured` | `generative` | `agentic`)
  - `signature_json` (json text; signature definition)
  - `created_at`, `updated_at`

#### 3) AX Signature Bindings (Connects Signatures To Workflow Steps + Templates)

Bindings are the crucial join between methodology definitions (workflow step identity) and template versions (baseline prompt) so optimization has a stable target.

- `ax_signature_bindings`
  - `id` (pk)
  - `signature_id` (fk -> `ax_signatures.id`)
  - `methodology_version_id` (fk -> `methodology_versions.id`)
  - `workflow_id` (fk -> `methodology_workflows.id`)
  - `workflow_step_id` (fk -> `methodology_workflow_steps.id`)
  - `base_template_version_id` (fk -> `template_versions.id`, **nullable** for phased adoption)
  - `binding_status` (`active` | `disabled`)
  - `created_at`, `updated_at`
  - unique(`workflow_step_id`, `signature_id`)

#### 4) Optimization Runs (Connects To Projects + Runs)

- `ax_optimization_runs`
  - `id` (pk)
  - `signature_binding_id` (fk -> `ax_signature_bindings.id`)
  - `project_id` (fk -> `projects.id`, nullable)
  - `project_execution_id` (fk -> `project_executions.id`, nullable)
  - `optimizer_type` (`mipro` | `gepa`)
  - `objective_profile_json` (json; includes budgets, weights, constraints)
  - `status` (`queued` | `running` | `completed` | `failed` | `cancelled`)
  - `metrics_json` (json; aggregate scores and telemetry only)
  - `artifact_ref` (text; file path or blob ref)
  - `created_at`, `started_at`, `completed_at`

#### 5) Prompt Variants (Optimizer Outputs)

Variants are stored as **patches/deltas** against a baseline template version.

- `ax_prompt_variants`
  - `id` (pk)
  - `signature_binding_id` (fk -> `ax_signature_bindings.id`)
  - `base_template_version_id` (fk -> `template_versions.id`)
  - `patch_json` (json; delta representation)
  - `variant_hash` (text)
  - `created_at`

- `ax_run_variants`
  - `run_id` (fk -> `ax_optimization_runs.id`)
  - `variant_id` (fk -> `ax_prompt_variants.id`)
  - `score_json` (json; per-objective)
  - `rank` (int nullable)
  - `selected` (bool)
  - pk(`run_id`, `variant_id`)

#### 6) Active Selection / Promotion State (Project-Scoped)

- `ax_project_signature_selections`
  - `id` (pk)
  - `project_id` (fk -> `projects.id`)
  - `signature_binding_id` (fk -> `ax_signature_bindings.id`)
  - `active_variant_id` (fk -> `ax_prompt_variants.id`)
  - `rollout_state` (`shadow` | `canary` | `promoted`)
  - `actor_id` (text nullable)
  - `evidence_ref` (text)
  - `created_at`, `updated_at`
  - unique(`project_id`, `signature_binding_id`)

### Key Relationship Graph

- Methodology step to signature binding:
  - `methodology_workflow_steps.id` -> `ax_signature_bindings.workflow_step_id`

- Template baseline to binding/variant:
  - `template_versions.id` -> `ax_signature_bindings.base_template_version_id`
  - `template_versions.id` -> `ax_prompt_variants.base_template_version_id`

- Project run context to optimization run:
  - `project_executions.id` -> `ax_optimization_runs.project_execution_id`

- Project selection to active variant:
  - `projects.id` -> `ax_project_signature_selections.project_id`

## Service Boundaries (Phase 1)

### `@chiron/ax-engine`

Owns:

- Signature registry lifecycle (`ax_signatures`)
- Binding lifecycle (`ax_signature_bindings`)
- Run lifecycle + telemetry (`ax_optimization_runs`)
- Variant persistence (`ax_prompt_variants`, `ax_run_variants`)
- Promotion/selection persistence (`ax_project_signature_selections`)

Does NOT own:

- Template rendering
- Prompt receipts
- Workflow step execution

### `@chiron/template-engine`

Owns:

- Template registry and version lookup
- Rendering/composition
- Prompt receipt emission/persistence

AX stores only references/hashes/patches needed to reproduce and audit.

### `@chiron/tooling-engine`

Owns:

- Tool registry + approval gating
- The manual-first trigger path for `ax-generation`

`tooling-engine` calls `ax-engine` only after explicit approval.

### Runtime Consumption Path (When Implemented)

At workflow step execution time:

1. Resolve the step's `ax_signature_binding`.
2. Resolve the project's `ax_project_signature_selection` (if any).
3. Provide template-engine the base template version + optional variant patch.
4. Compose prompt; template-engine emits prompt receipts per its policy.

## Migration Order (Low Risk)

All steps are additive and can land before runtime consumption is wired.

1. Add template tables (`template_definitions`, `template_versions`).
2. Add AX registry (`ax_signatures`, `ax_signature_bindings`).
3. Add run/variant tables (`ax_optimization_runs`, `ax_prompt_variants`, `ax_run_variants`).
4. Add selection table (`ax_project_signature_selections`).
5. Wire `ax-generation` tool path to create runs + record outputs (still manual-first).

## Risk Controls

- Keep `base_template_version_id` nullable in bindings initially to avoid blocking adoption.
- Enforce deterministic uniqueness (one binding per step/signature; one active selection per project/binding).
- Do not persist rendered prompt text in AX tables; rely on template-engine receipts/hashes.
- Keep baseline always available for immediate rollback.

## Out Of Scope (Phase 1)

- Fully automated triggers (trigger-on-every-failure)
- ACE-style agentic optimization loops
- Rich dataset pipelines and feedback ingestion (beyond storing run metadata)
- Runtime execution persistence tables (workflow/step runs) if not already present

