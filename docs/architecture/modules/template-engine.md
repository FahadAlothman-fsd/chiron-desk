# Template Engine Module Design

**Package:** `@chiron/template-engine`  
**Status:** Planned (scaffold-only package)

## Purpose

Provide one canonical template/rendering boundary for prompts and artifacts.

This module owns rendering and composition behavior for:

- system prompts
- initial agent prompts
- artifact templates

Variable storage and scope semantics remain in `@chiron/variable-service`.

## Boundary (Locked)

- **Template Engine owns:** template lookup, rendering, helpers, composition diagnostics, prompt receipts.
- **Variable Service owns:** read/write/merge/revert of variable state.
- **Workflow/Runtime owns:** when composition is triggered.

## Prompt Audit And Reproducibility (Locked)

Use a prompt-receipt model, not heavy duplication.

### Receipt Principle

- Reuse existing persisted chat/checkpoint content where possible.
- Store references + hashes + runtime config as the reproducibility envelope.

### Receipt Minimum Fields

- `executionId`, `stepExecutionId`, `chatSessionId`, `callIndex`
- `promptRole` (`system`, `user`, `artifact`, `instruction`)
- `templateId`, `templateVersion`
- `contextHash`
- `systemPromptHash` (and optional text when policy requires)
- `inputMessageRefs` (message ids or sequence range)
- `model/provider`, tool config hash, generation params
- output refs (assistant message id/checkpoint id), usage/cost/latency

### System Prompt Rule

- Persist system prompt deterministically per model call via receipt hash.
- If rendered system prompt content changes, create a new receipt entry.
- Session metadata may keep "latest system prompt" for convenience, but receipts are the audit source.

## MVP Responsibilities

- Template registry with id/version lookup.
- Handlebars-based renderer with constrained helper set.
- Compose API for prompt + artifact rendering.
- Prompt receipt emission interface for persistence layer.

## Effect Service Shape (Target)

- `compose(templateRef, context, options?) -> Effect<ComposeResult, TemplateEngineError>`
- `render(templateText, context, options?) -> Effect<string, TemplateEngineError>`
- `recordPromptReceipt(receipt) -> Effect<void, TemplateEngineError>`

## Helper And Strictness Policy (Locked)

- Runtime rendering uses strict mode by default.
- Preview/editor rendering may use relaxed mode, but must return diagnostics for unresolved keys.
- Helper allowlist for phase 1:
  - flow helpers: `if`, `unless`, `each`, `with`
  - comparison helpers: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`
  - boolean helpers: `and`, `or`, `not`
  - fallback helpers: `default`, `coalesce`
- No arbitrary code execution helpers are allowed.

## Prompt Text Retention Policy (Locked)

- Prompt receipts always store hashes (`systemPromptHash`, `contextHash`) and references.
- Full rendered system prompt text is **not** stored by default.
- Full text retention is opt-in via policy for approved debugging/compliance contexts only.
- When full text retention is enabled, apply bounded retention and redaction rules.

## Observability Surface (Locked)

### Key Events

- `template.compose.start`
- `template.compose.success`
- `template.compose.failure`
- `template.helper.denied`
- `template.receipt.record`
- `template.strict.violation`

### Critical Metrics

- `module_requests_total` (compose/render/receipt operations)
- `module_failures_total` (render/lookup/helper violations)
- `module_operation_duration_ms` (compose/render latency)
- `template_engine_helper_denied_total`
- `template_engine_receipt_recorded_total`
- `template_engine_strict_violations_total`

### Required Span Names

- `module.template-engine.compose`
- `module.template-engine.render`
- `module.template-engine.receipt.record`

### Sensitive Data Rules

- Do not log rendered prompt text.
- Do not log context values.
- Emit template identifiers, hashes, and diagnostics metadata only.

## Open Decisions

- None for phase 1.
