# @chiron/provider-registry

Runtime-aware provider and model catalog service (planned).

## What This Package Contains

- `src/index.ts` - scaffold export

## Current State

- Standalone package is scaffold-only
- Provider/model logic is currently split across API model services, agent-runtime adapters, and user settings

## Intended Scope

- Provider catalog per runtime family (`ai-sdk`, `opencode`, `ax`)
- Runtime-aware model compatibility and capability metadata
- User/provider credential bindings
- Usage, latency, and cost tracking
- Spend controls and access policy enforcement

## Consumers

- `@chiron/agent-runtime` (provider routing + model resolution)
- `@chiron/ax-engine` (optimizer model selection)
- Settings/model-selector UI
- Workflow validation and planning checks
