# Story 3.2 Facts Tab Design (Kickoff)

**Status:** Draft (planning kickoff)
**Last Updated:** 2026-03-20

## Goal

Implement the Work Unit L2 **Facts** tab as a list-first, dialog-first authoring surface that mirrors methodology-facts ergonomics while adding the Story 3.2 work-unit-specific semantics (notably **work unit** fact type + dependency-type linkage).

## Locked constraints from Story 3.2

- Table-first/list-first surface (no row expansion).
- Dialog-first CRUD (`+ Add Fact`, `Edit`, `Delete`).
- Facts semantics aligned with methodology facts for guidance/validation patterns.
- Work-unit-specific type support:
  - top-level fact type includes `work unit`.
  - json sub-schema value types include `work unit` (and exclude nested object value type).
  - dependency-type selector is required for work-unit value flow semantics.
- Findings/diagnostics treatment must remain consistent with shared diagnostics style.

## Current implementation baseline

- Work-unit detail route already supports tab routing and Overview command surface:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
- Existing methodology-facts authoring pattern is mature and reusable:
  - `apps/web/src/features/methodologies/methodology-facts.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.facts.tsx`
- Nested L2 alias namespace exists (`methodology.version.workUnit.fact.*`), but currently aliases legacy fact procedures; this should be treated as a planning risk for true work-unit scoped persistence.

## Approaches considered

### Approach A (recommended): Reuse methodology-facts primitives with L2 adapter layer

- Build `FactsTab.tsx` as a work-unit-scoped shell around reusable inventory/editor logic.
- Add a lightweight adapter that maps L2 work-unit fact contracts to existing fact editor value model.
- Keep list and dialog interactions consistent with methodology facts; add incremental fields for work-unit semantics.

**Pros:** fastest convergence, visual/UX consistency, lower regression risk.
**Cons:** requires careful adapter boundaries to avoid leaking methodology-level assumptions.

### Approach B: Build dedicated WorkUnitFacts UI from scratch

- New table + dialog stack purpose-built for work-unit facts.

**Pros:** full control over work-unit-specific semantics.
**Cons:** duplicates proven behavior and likely diverges from methodology-facts UX.

### Approach C: Hybrid (reuse table only, new dialog editor)

- Reuse inventory table; create new dialog implementation for work-unit-only fields.

**Pros:** moderate reuse while allowing custom authoring controls.
**Cons:** medium complexity and higher maintenance than Approach A.

## Recommended design

Use **Approach A** with strict adapter boundaries:

1. **Facts inventory surface**
   - Columns: Fact, Type, Validation, Default, Guidance, Dependency Type (work-unit only), Findings, Actions.
   - No row expansion.
2. **Dialog authoring**
   - Same contract/guidance flow as methodology-facts.
   - Fact type set includes `work unit`.
   - Work-unit type enables dependency definition selector.
   - Json sub-key value type set includes `work unit` and excludes nested object values.
3. **Mutation flow**
   - L2-tab operations target `methodology.version.workUnit.fact.*` namespace only.
   - Query invalidation scoped to the active methodology version/work-unit detail route.
4. **Findings integration**
   - Findings rendered with existing diagnostics visual treatment patterns (no bespoke severity model).

## Risks and mitigations

1. **Risk:** L2 fact API aliases still point to methodology-level procedures.
   - **Mitigation:** include an early contract/API validation task in implementation plan; fail fast with test if work-unit scoping is not honored.
2. **Risk:** Existing fact editor model lacks first-class `work unit` type in all branches.
   - **Mitigation:** add explicit type-level tests before UI wiring.
3. **Risk:** Route-level state updates can desync active tab/search state.
   - **Mitigation:** integration tests on detail route tab and dialog open/close behavior.

## Definition of ready (for implementation)

- Facts-tab behavior contract approved:
  - table-first, dialog-first, no row expansion.
  - dependency selector behavior for work-unit types.
- API scoping constraints acknowledged in implementation tasks.
- Test-first execution path documented in implementation plan.
