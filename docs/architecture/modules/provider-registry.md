# Provider Registry Module Design

**Package:** `@chiron/provider-registry`  
**Status:** Planned (scaffold-only package)

## Purpose

Centralize provider/model catalogs, credentials, and policy enforcement by runtime family.

## Runtime Families

- `ai-sdk`
- `opencode`
- `ax`

Each runtime can expose different provider compatibility and capabilities.

## MVP Responsibilities

- Provider catalog per runtime family.
- Model capability metadata (streaming, tool calls, context length, pricing references).
- User credential bindings with encrypted storage.
- Resolution API: given runtime + model preference, return usable provider/model config.

## Locked Policy Baseline (2026-02-09)

### Runtime Families (Authoritative)

- `ai-sdk`: provider-backed model loading for Chiron runtime agents.
- `opencode`: OpenCode runtime sessions/tools.
- `ax`: optimization runs and model evaluation loops.

### Credential Source Priority

1. User-scoped encrypted credential in DB (`appConfig` and future provider-binding tables)

Credentials are user-level only. Project/execution/step scopes do not own credentials.
The same user credential for a provider (for example OpenRouter) is reused across compatible runtimes (`ai-sdk`, `ax`, `opencode`) where policy allows.

### Model Configuration Precedence

- `system -> project -> execution -> step`

This precedence applies to non-secret model/runtime configuration only (for example model selection, retry profile, timeout, token limits, objective profile).

### Model Resolution Rules

- Preferred model format is `provider:modelId`.
- If provider is omitted, resolve using runtime defaults after applying config precedence (`system -> project -> execution -> step`).
- Reject unresolved provider/model combinations for the selected runtime family.
- Return a normalized resolved model payload including provider, model id, capabilities, and credential reference.
- Provider-order lists are recommendation ranking metadata for UI and explicit user choice; they are not automatic failover behavior.

### Security Rules

- Secrets are never returned to callers; only references/availability state.
- Registry enforces runtime/provider compatibility before execution.
- Policy checks (allowlist/denylist/spend controls) are centralized in registry decisions, not duplicated in UI.

### Outage/Error Handling Baseline

- Use OpenCode-style exponential backoff for retry behavior.
- Registry owns retry-profile configuration and provider health policy.
- Runtime executes retries using registry-provided policy on the selected provider/model.
- Chiron does not perform automatic cross-provider or cross-model fallback.
- On provider/model failure, registry returns ranked alternatives and failure metadata; runtime requires explicit user selection to switch.

### Interactive Runtime Selection (Locked)

- For `ax-generation` calls, UI shows the resolved provider/model and source scope before execution; user may override before run.
- For Chiron agent steps (`ai-sdk`), model picker starts from resolved defaults and can be changed during the conversation.
- Agent-step model changes apply immediately to the current step and may be persisted to execution scope for subsequent steps when the user chooses persist behavior.
- Step-scoped overrides still take highest precedence when present.

### Limits And Quota Ownership

- Provider Registry owns allow/throttle/block policy decisions for usage and spend limits.
- Agent Runtime enforces call-time behavior and reports usage telemetry back to registry.

## Phase 2 Responsibilities

- Usage and latency metering by user/project/execution.
- Cost estimation and spend controls.
- Health awareness and alternative recommendation policy (provider outages, rate limits) without automatic failover.

## Current Split (Drift Source)

- Provider/model logic is currently split between:
  - `@chiron/agent-runtime` (`ai-provider-service`, provider adapters)
  - `@chiron/api` (`models` and `settings` routers/services)
- Provider Registry is the target consolidation boundary for this logic.

## Effect Service Shape (Target)

- `resolve(runtime, modelHint, userContext) -> Effect<ResolvedModel>`
- `listProviders(runtime, userContext, filters?) -> Effect<ProviderCatalogEntry[]>`
- `listModels(runtime, filters?) -> Effect<ModelCatalogEntry[]>`
- `setCredential(userId, provider, secretRef) -> Effect<void>`
- `testCredential(userId, provider, secretRef) -> Effect<CredentialTestResult>`
- `getPolicyDecision(runtime, provider, model, context) -> Effect<ProviderPolicyDecision>`
- `getRetryPolicy(runtime, provider, model, context) -> Effect<RetryPolicy>`
- `checkQuota(userId, runtime, provider, model, usageIntent) -> Effect<QuotaDecision>`
- `recordUsage(event) -> Effect<void>`

## Model Selector Contract (Locked)

For selector UIs, the provider-registry is authoritative.

- UI asks provider-registry: "for runtime X and user Y, what can I use?"
- Provider-registry returns:
  - providers
  - models
  - capabilities
  - availability status (credential present, policy blocked, deprecated)
- UI renders the returned catalog and availability state only.

### Boundary Rules

- Selector UIs must not pull catalog visibility from `@chiron/agent-runtime` directly.
- Selector UIs must not implement provider policy/credential logic.
- `@chiron/provider-registry` is source-of-truth for:
  - catalog
  - access and policy/credential availability
  - runtime compatibility (`ai-sdk`, `opencode`, `ax`)
- `@chiron/agent-runtime` consumes resolved selections and does not decide catalog visibility.

## Dependencies

- `@chiron/contracts`
- `@chiron/db`

## Observability Surface (Locked)

### Key Events

- `provider.resolve.start`
- `provider.resolve.success`
- `provider.resolve.failure`
- `provider.quota.check`
- `provider.usage.recorded`

### Critical Metrics

- `module_requests_total` (resolve/quota/check usage requests)
- `module_failures_total` (resolution/policy failures)
- `module_operation_duration_ms` (resolve and policy evaluation latency)
- `provider_registry_quota_blocked_total`
- `provider_registry_usage_tokens_total`
- `provider_registry_usage_cost_usd`

### Required Span Names

- `module.provider-registry.resolve`
- `module.provider-registry.quota.check`
- `module.provider-registry.usage.record`

### Sensitive Data Rules

- Never log credential values or secret material.
- Emit credential availability/state only.
- Redact free-text error payloads from provider SDKs before persistence/export.

## Open Decisions

- None for phase 1.
