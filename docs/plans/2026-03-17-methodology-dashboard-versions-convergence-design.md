# Methodology Dashboard + Versions Convergence Design

Date: 2026-03-17  
Status: approved-for-implementation

## Context

The methodology dashboard (`/methodologies/:methodologyId`) was made version-first, but the versions index page (`/methodologies/:methodologyId/versions`) still duplicates major dashboard responsibilities (ledger + draft controls). This creates avoidable maintenance and drift risk.

## Goal

Keep one canonical page UX (dashboard) while preserving route compatibility and nested version child routes.

## Approved Direction (Approach A)

1. **Canonical page:** `/methodologies/:methodologyId` (dashboard)
2. **Compatibility route:** keep `/methodologies/:methodologyId/versions` file for route stability and child nesting, but do not maintain a distinct second page UX
3. **Behavior migration:** move Create Draft + Open Existing Draft controls to dashboard
4. **API contract ownership:** server returns `pinnedProjectCount` and `isEditable` (and optional reason) for each version summary, removing UI-side derivation
5. **No `packages/core` extraction in this slice** (YAGNI) because behavior is page-local and not yet multi-consumer

## Route Surface After Convergence

Within methodology context, the target surfaces are:

1. `/methodologies/:methodologyId` (dashboard, canonical)
2. `/methodologies/:methodologyId/versions/:versionId`
3. `/methodologies/:methodologyId/versions/:versionId/facts`
4. `/methodologies/:methodologyId/versions/:versionId/work-units`
5. `/methodologies/:methodologyId/versions/:versionId/work-units/:workUnitKey`
6. `/methodologies/:methodologyId/versions/:versionId/agents`
7. `/methodologies/:methodologyId/versions/:versionId/dependency-definitions`

`/methodologies/:methodologyId/versions` remains as compatibility/index shell only (no independently maintained UX contract).

## UI Contract

### Dashboard (`/methodologies/:methodologyId`)

- Summary strip (latest active, latest draft, total versions)
- Version ledger
- Draft controls:
  - `Create Draft`
  - `Open Existing Draft`
- Row actions:
  - `Open`
  - `Edit version` when editable
  - `Locked` when immutable

### Versions index compatibility route (`/versions`)

- Exact path should avoid diverging logic:
  - either render shared dashboard content, or
  - redirect to `/methodologies/:methodologyId`
- Must continue to host nested child routes through `Outlet`

## API Contract Changes

For methodology details/version summaries returned to UI:

- `pinnedProjectCount: number`
- `isEditable: boolean`
- `editabilityReason?: "editable" | "pinned" | "archived"`

Server logic:

- `isEditable = status !== "archived" && pinnedProjectCount === 0`
- `editabilityReason = archived ? "archived" : pinnedProjectCount > 0 ? "pinned" : "editable"`

## Non-goals

- No extraction to `packages/core` in this change
- No route-tree re-architecture for child pages
- No lifecycle/publish model redesign

## Acceptance Criteria

1. Dashboard contains draft controls previously found on versions index.
2. Dashboard ledger uses server-provided editability metadata (no client-side pin reduce logic).
3. Versions index no longer has independent duplicated page logic.
4. Nested `/versions/:versionId/...` pages continue to work.
5. Existing Story 3.1 checks and e2e remain green.

## Testing Expectations

- Route integration tests for dashboard controls + editability rendering
- Versions route integration test for compatibility behavior (shared/redirect) and child passthrough
- API router tests validating returned editability metadata
- Monorepo checks and Playwright suite green
