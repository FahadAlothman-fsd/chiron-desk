# Story 2.6 IA Adjustment: Dashboard-First Baseline Visibility

Date: 2026-03-04
Story: 2.6 baseline operator visibility

## Problem

Current Story 2.6 implementation places baseline visibility (transition readiness, facts/provenance, diagnostics history, evidence timeline) inside the pinning route. This causes information-architecture drift:

- Dashboard is the primary project landing surface but does not show readiness visibility.
- Pinning route is now overloaded with two concerns: pin management and operational readiness interpretation.
- Operators expecting "what can I do now?" from project dashboard do not see Chiron readiness there.

## Constraints

- Keep Epic 2 boundary: read-only visibility; no runtime execution enablement.
- Preserve exact disabled rationale copy: `Workflow runtime execution unlocks in Epic 3+`.
- Keep backend authoritative and reuse current `project.getProjectDetails` + `baselinePreview` payload.
- Keep deterministic status semantics (`eligible|blocked|future` + `statusReasonCode`).

## Options Considered

### Option A - Keep Baseline In Pinning (Status Quo)

Pros:
- No migration effort.
- Existing tests remain mostly unchanged.

Cons:
- Wrong primary UX placement for operator readiness.
- Dashboard remains weak as command/decision surface.
- Pinning continues to mix concerns.

Verdict: Reject.

### Option B - Duplicate Baseline On Dashboard And Pinning

Pros:
- Fast visibility win on dashboard.
- Backward compatibility for users who already look at pinning.

Cons:
- Duplicate rendering logic and drift risk.
- Higher maintenance and test overhead.
- Ambiguous source of truth in UX.

Verdict: Reject (acceptable only as temporary transitional step).

### Option C - Dashboard-First Baseline, Pinning Focused On Pin Management (Recommended)

Pros:
- Correct IA: dashboard answers "state and next allowed paths".
- Pinning returns to clear purpose: pin/repin/lineage.
- Better user mental model and lower cognitive load.

Cons:
- Requires component extraction/move and test redistribution.

Verdict: Adopt.

## Recommended IA Split

### Project Dashboard (`projects.$projectId.index.tsx`)

Primary read-only operator visibility surface:

- Baseline summary (methodology, pin, publish, validation, setup-fact deferred notice)
- Transition readiness preview (default filtered; optional future toggle)
- Per-workflow visible-but-disabled controls with rationale
- Fact provenance panel
- Diagnostics history with explicit empty state
- Deterministic evidence timeline

### Project Pinning (`projects.$projectId.pinning.tsx`)

Pin-management workspace only:

- Active pin snapshot
- Repin controls and deterministic repin diagnostics
- Pin lineage timeline
- Lightweight pointer to dashboard readiness section

## Implementation Strategy (Low Risk)

1. Extract baseline sections from pinning route into shared components under `apps/web/src/features/projects/`.
2. Render those components in dashboard route using existing `project.getProjectDetails` query data.
3. Remove large baseline block from pinning route and replace with small dashboard link/callout.
4. Move/adjust integration tests:
   - baseline expectations into `-projects.$projectId.integration.test.tsx`
   - retain pin/repin-specific checks in `-projects.$projectId.pinning.integration.test.tsx`
5. Keep API contract unchanged (no transport changes required).

## Acceptance Mapping Notes

- Story 2.6 requirement to extend project routes is better fulfilled with dashboard-first visibility.
- Epic 2 read-only/runtime-disabled constraints remain unchanged.
- Deterministic semantics and accessibility requirements remain in force and migrate with components.

## Decision

Adopt Option C immediately: move baseline readiness visibility to the project dashboard and keep pinning focused on pin management + lineage.
