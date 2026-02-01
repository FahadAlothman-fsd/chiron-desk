# Provider Registry — TODO Spec

This module will centralize provider policy, model catalogs, usage, and cost accounting.
Implementation is intentionally deferred; this file captures the plan.

## Goals (TODO)

- [ ] Define provider registry contract (Effect Tag + Layer)
- [ ] Model catalog per provider (OpenAI, Anthropic, OpenRouter, OpenCode)
- [ ] Per-agentKind provider views (`chiron`, `opencode`, future)
- [ ] Credentials management (per-user, global across projects)
- [ ] Usage tracking (tokens, requests, latency)
- [ ] Cost estimation per model (pricing tables)
- [ ] Spend caps / quotas (per-user, with optional per-project overrides)
- [ ] Provider health status (rate limit, outages)
- [ ] Audit log of provider usage

## Consumers (TODO)

- [ ] `@chiron/agent-runtime` (model selection + provider routing)
- [ ] `@chiron/ax-engine` (optimization runs + model availability)
- [ ] UI settings + model selector
- [ ] Workflow validation (disallow unavailable models)

## Data Sources (TODO)

- [ ] Provider config table (keys + allowed models)
- [ ] Pricing table (per provider/model)
- [ ] Usage ledger (per session/execution)

## Security (TODO)

- [ ] Enforce provider access policy (per-user)
- [ ] Reject requests exceeding spend caps
- [ ] Mask API keys in logs

## Integration Milestones (TODO)

- [ ] MVP: static catalog + per-user provider keys
- [ ] Phase 2: usage + spend estimates
- [ ] Phase 3: quotas + health signals
