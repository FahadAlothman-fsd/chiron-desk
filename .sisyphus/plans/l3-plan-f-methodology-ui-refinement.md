# L3 Plan F — Methodology UI/UX Refinement (L1/L2/L3 Navigation)

## TL;DR
> **Summary**: Refine methodology authoring UX for clarity and speed across all three levels, with consistent navigation, modular components, and reduced cognitive load.
> **Depends on**: Plan D rulebook (+ Plan C if service/API names changed)
> **Effort**: L

## Objectives
- Make layer transitions and route structure intuitive.
- Improve visual hierarchy and reduce “where am I?” confusion.
- Standardize authoring components/forms across level surfaces.
- Preserve behavior while improving discoverability and guidance.

## Must Have
- Consistent shell/breadcrumb/section model across methodology levels.
- Shared component patterns for repeated authoring blocks.
- TanStack Form conventions applied to edited screens.
- Technical IDs demoted to secondary/debug-only placement.

## Must NOT Have
- No major schema or domain behavior changes.
- No one-off UX forks that violate Plan D rulebook.

## TODOs
- [ ] 1. Perform level-by-level navigation and information architecture audit.
- [ ] 2. Normalize page shells and section composition across L1/L2/L3.
- [ ] 3. Extract repeated editor blocks to modular reusable components.
- [ ] 4. Apply form and identifier conventions from Plan D.
- [ ] 5. Validate authoring flows with route integration tests.

## Acceptance Gates
- methodology route integration suites pass
- consistent shell + component patterns visible across levels
- reduced navigation friction for common authoring journeys
