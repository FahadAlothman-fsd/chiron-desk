# L3 Plan E — Project Runtime UI/UX Refinement

## TL;DR
> **Summary**: Refine project runtime experience toward guidance-first clarity: quick overview of what is running now, lower click-depth, clearer execution state, and less technical noise.
> **Depends on**: Plan D rulebook
> **Effort**: L

## Objectives
- Make runtime overview immediately actionable.
- Surface “current running status” and next meaningful actions clearly.
- Reduce raw technical IDs and internal terminology in primary views.
- Apply consistent form/stream/component conventions from Plan D.

## Must Have
- Runtime dashboards and detail pages prioritize human-readable labels.
- Stream-connected surfaces show clear status/reconnect/error affordances.
- Cross-route runtime navigation requires fewer steps for common workflows.

## Must NOT Have
- No backend behavior changes unless required for UX correctness.
- No feature expansion beyond runtime clarity/refinement.

## TODOs
- [ ] 1. Establish runtime UX information hierarchy and content audit.
- [ ] 2. Refactor overview and active-execution surfaces for guidance-first flow.
- [ ] 3. Normalize runtime detail screens with shared components/forms/streaming utilities.
- [ ] 4. Remove/promote technical metadata (IDs/debug fields) to secondary affordances.
- [ ] 5. Validate navigation efficiency and regression-test core runtime journeys.

## Acceptance Gates
- runtime route tests pass
- no primary UI sections require raw IDs to understand state
- walkthrough confirms reduced click-depth for top runtime workflows
