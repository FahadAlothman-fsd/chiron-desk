# L3 Plan D — UI Foundation Rulebook

## TL;DR
> **Summary**: Establish shared UI architecture rules before per-level polish: state ownership, streaming lifecycle, form conventions, component modularity, command palette contracts, and technical-id display policy.
> **Depends on**: Plan B + Plan C stabilization
> **Effort**: M

## Rulebook Targets
- **State**: Introduce Zustand only where shared client-state complexity justifies it.
- **Forms**: Standardize TanStack Form patterns and shared validation helpers.
- **Streaming**: One unified stream lifecycle contract (status/retry/error/reconnect).
- **Components**: Enforce modular reusable patterns for repeated UI structures.
- **IDs**: Never present raw IDs as primary UX information.
- **Command Palette**: Centralized command registry + handler composition.

## Must Have
- Shared technical-identifier display primitive.
- Shared streaming utility abstraction for runtime screens.
- Shared TanStack Form utility/convention module.
- Consistency checklist to gate level-specific UI plans.

## Must NOT Have
- No route-by-route redesign yet.
- No design-token overhaul unrelated to consistency goals.
- No broad animation rollout in this foundation plan.

## TODOs
- [ ] 1. Define and codify rulebook (docs + lint/test guardrails where possible).
- [ ] 2. Implement shared ID display component and adopt in pilot surfaces.
- [ ] 3. Implement shared streaming lifecycle helper and adopt in pilot runtime surfaces.
- [ ] 4. Implement shared TanStack Form helpers and adopt in pilot editor/runtime forms.
- [ ] 5. Refactor command palette orchestration into registry-driven handlers.
- [ ] 6. Validate checklist compliance for level plans.

## Acceptance Gates
- rulebook document committed and referenced by level plans
- pilot screens use shared ID + form + streaming utilities
- command palette core flows still pass route integration tests
