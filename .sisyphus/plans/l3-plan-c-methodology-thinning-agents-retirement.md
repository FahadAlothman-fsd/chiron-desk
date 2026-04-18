# L3 Plan C — Methodology Layer Thinning + Agents Table Retirement

## TL;DR
> **Summary**: Thin the methodology-version boundary so version acts as context/guard, not the primary owner of domain mutations. Normalize design-time services around stable seams, and retire legacy agents-table usage in favor of harness configuration paths already used by Agent-step.
> **Depends on**: Plan B completion (`l3-plan-b-fact-unification-runtime-validation.md`)
> **Effort**: L

## Objectives
- Centralize draft/version guard and authoring-context loading.
- Reduce duplicated `findVersionById + draft` checks across design-time services.
- Move toward service ownership by domain seam (workflow, work-unit, step-definition, state machine).
- Retire agents-table dependency from active flows; use harness configuration authority.

## Must Have
- Single reusable draft/version guard service.
- Clear service boundaries with minimal `MethodologyVersionService` orchestration glue.
- Agents-table path removed or compatibility-shimmed with deprecation markers.
- No API contract regressions for methodology authoring routes.

## Must NOT Have
- No broad UI refactors in this plan.
- No behavior redesign of Agent-step runtime flows.
- No opportunistic repository rewrites outside thinning scope.

## TODOs
- [ ] 1. Add characterization tests for current version-boundary behavior.
- [ ] 2. Introduce centralized draft/version authoring-context guard.
- [ ] 3. Refactor design-time services to consume shared guard/context.
- [ ] 4. Thin `MethodologyVersionService` orchestration to boundary-level responsibilities.
- [ ] 5. Remove/retire agents-table usage in active authoring/runtime handoffs.
- [ ] 6. Run targeted regression + build verification and publish migration notes.

## Acceptance Gates
- `bun run check-types`
- `bun run build`
- targeted methodology router/service suites pass
- explicit proof that agents-table path is no longer required for active flows
