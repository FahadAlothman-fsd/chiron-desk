# Story 2.6 Implementation Plan: Transition Readiness Preview (Pre-Execution Boundary)

Date: 2026-03-04
Inputs:
- `docs/plans/2026-03-04-story-2-6-transition-readiness-preview-design.md`
- `_bmad-output/implementation-artifacts/2-6-provide-baseline-operator-visibility-for-methodology-pin-and-diagnostics-state.md`

## Objective
Deliver Story 2.6 as a read-only baseline projection that stops exactly before first workflow execution:
- show transition/workflow preview for project context
- show per-workflow execute controls as disabled list actions
- preserve Epic 2 boundary (`Workflow runtime execution unlocks in Epic 3+`)
- improve graph/list progressive visibility from a single derived projection
- ship list projection first, then graph as a thin consumer in same story

## Scope Lock
- In scope: projection, readiness preview, deterministic diagnostics/evidence rendering, progressive visibility, disabled execute affordances.
- Out of scope: runtime execution, setup-fact writes, execution attempts, completion-gate persistence.

## Hardening Rules (Must Hold)
1. `baselinePreview` stays additive and backward-compatible on `getProjectDetails`.
2. Every transition includes `statusReasonCode` and UI must render it deterministically.
3. Disabled execute actions must be keyboard-discoverable (`aria-disabled` + helper text).
4. One shared adapter derives both list and graph models from `baselinePreview`.
5. Projection field provenance is documented and test-covered (persisted vs computed vs synthetic preview).
6. Story 2.6 preview UI uses bitmap/3D pixel project assets for status glyphs (not new generic Lucide status icons).

## Implementation Strategy
Use a vertical slice from contracts -> methodology-engine -> api -> web, reusing Story 2.5 project surfaces.

## Asset Source and Vendor Paths
- Source pack root: `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst`
- Source files:
  - `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst/SVG/asset-34.svg`
  - `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst/SVG/asset-13.svg`
- Repo vendor targets:
  - `apps/web/public/visuals/chiron-status/asset-34.svg` (canonical status entity glyph)
  - `apps/web/public/visuals/chiron-status/asset-13.svg` (secondary motif)

---

## Task 0: Vendor Canonical Bitmap Assets

### Files
- `apps/web/public/visuals/chiron-status/asset-34.svg` (new)
- `apps/web/public/visuals/chiron-status/asset-13.svg` (new)

### Changes
1. Copy canonical SVG sources from the UX appendix registry paths into repo vendor targets.
2. Keep original geometry; no destructive simplification in Story 2.6.
3. Record source provenance in PR notes (source pack + file path) for traceability.

### Done Criteria
- Both SVG files exist at vendor targets and load from web routes.

---

## Task 1: Extend Preview Contracts

### Files
- `packages/contracts/src/methodology/eligibility.ts`
- `packages/contracts/src/methodology/index.ts`
- `packages/contracts/src/index.ts`

### Changes
1. Add preview-level types/schemas for transition presentation:
   - `TransitionPreviewStatus`: `eligible | blocked | future`
   - `TransitionStatusReasonCode`:
     - `HAS_ALLOWED_WORKFLOW`
     - `NO_WORKFLOW_BOUND`
     - `UNRESOLVED_WORKFLOW_BINDING`
     - `MISSING_PREVIEW_PREREQUISITE_FACT`
     - `FUTURE_NO_START_GATE`
     - `FUTURE_NOT_IN_CURRENT_CONTEXT`
2. Extend eligibility/preview schema to include:
   - `isPreview: true`
   - per-transition `status` + `statusReasonCode`
   - per-workflow disabled action metadata with exact reason copy.
3. Export added schema/types from methodology and root indexes.
4. Document field provenance in contract comments where helpful:
   - persisted fields
   - computed fields
   - synthetic preview diagnostics.

### Done Criteria
- Contracts compile and are importable from API and web layers.
- Preview contract enforces deterministic reason codes.

---

## Task 2: Build Methodology-Engine Baseline Preview Projection

### Files
- `packages/methodology-engine/src/eligibility-service.ts`
- `packages/methodology-engine/src/version-service.ts`
- `packages/methodology-engine/src/version-service.test.ts`
- `packages/methodology-engine/src/eligibility-service.test.ts`

### Changes
1. Keep existing eligibility selection by state context; enrich output with:
   - `status`
   - `statusReasonCode`
   - workflow list entries prepared for disabled execute affordance.
2. Add preview-only bridge behavior for `WU.SETUP` prerequisites:
   - if expected prerequisite fact is absent in preview context, emit deterministic blocked diagnostic code `MISSING_PREVIEW_PREREQUISITE_FACT`.
   - do not perform runtime gate execution or writes.
3. Add a read-only fact/provenance source path for preview derivation:
   - prefer existing repository methods if available;
   - otherwise add explicit read-only accessor (for example, project/work-unit fact rows with `sourceExecutionId`, `updatedAt`) without introducing write paths.
4. In version service, compose `ProjectBaselinePreview` from existing persisted sources:
   - project + active pin + pin lineage
   - publication evidence / validation summary
   - transition/workflow preview from eligibility service
5. Keep deterministic sort guarantees:
   - transitions sorted by `transitionKey`
   - workflows sorted by key
   - evidence/diagnostics timeline sorted by timestamp with stable tie-breakers.
6. Ensure each transition always receives a non-null `statusReasonCode`.

### Done Criteria
- Service returns full preview object with `isPreview: true`.
- Reason codes are deterministic across equal inputs.
- Provenance mapping is explicit in code-level docs/helpers.

---

## Task 3: Expose Preview via Project API

### Files
- `packages/api/src/routers/project.ts`
- `packages/api/src/routers/index.ts` (only if route wiring changes)
- `packages/api/src/routers/project.test.ts` (new)

### Changes
1. Preferred: enrich `getProjectDetails` response with a `baselinePreview` field.
   - Keep existing `{ project, pin, lineage }` fields for compatibility.
   - Make `baselinePreview` additive/optional for safe rollout.
2. Map domain errors using existing deterministic `mapEffectError` behavior.
3. Ensure response diagnostics fields remain stable and include `evidenceRef` naming.

### Done Criteria
- API returns baseline preview in one call.
- Existing callers of project details do not break.

---

## Task 4: Implement Project Dashboard Preview UI (List + Graph)

### Files
- `apps/web/src/routes/projects.$projectId.index.tsx`
- `apps/web/src/features/projects/deterministic-diagnostics.ts`
- `apps/web/src/features/projects/project-transition-preview.tsx` (new)
- `apps/web/src/features/projects/project-transition-preview-graph.ts` (new, derived projection helpers)
- `apps/web/src/features/projects/project-transition-preview-graph.tsx` (new, optional if graph component split is needed)
- `apps/web/src/features/projects/project-status-glyph.tsx` (new, bitmap/3D pixel status glyph mapping)
- `apps/web/public/visuals/chiron-status/asset-34.svg` (new, vendored)
- `apps/web/public/visuals/chiron-status/asset-13.svg` (new, vendored)

### Changes
1. Render baseline summary from `baselinePreview.summary` (publish + validation included).
2. Render transition list for selected work-unit context:
   - show `from -> to`, gate class, status chip, reason code-aware helper copy
   - render status glyph from a single canonical asset (`/visuals/chiron-status/asset-34.svg`) with state-color variants for `eligible`, `blocked`, and `future`
   - optional accent motif can use `/visuals/chiron-status/asset-13.svg` in headers/chips, never as a status-label replacement
   - show required links and preview diagnostics
3. Render workflow list under each transition:
   - one disabled action per workflow list item
   - exact reason text: `Workflow runtime execution unlocks in Epic 3+`
   - helper text: `Execution is enabled in Epic 3 after start-gate preflight.`
   - use `aria-disabled` pattern so controls remain keyboard-discoverable
4. Add `Show future paths` toggle:
   - default off
   - when enabled, reveal only `future` transitions
   - same semantics in list and graph projections.
5. Graph enhancement:
   - derive nodes/edges from same preview projection adapter used by list
   - avoid rendering all methodology work units by default
   - progressively reveal based on current project context and toggle state.
   - reuse same canonical status glyph mapping as list to preserve bitmap/3D pixel visual language.
6. Shared rendering contract:
   - list and graph must both import the same status-visual mapping primitive (canonical `asset-34` + state-token variants).
   - per-view ad-hoc status icon/color logic is not allowed.

### Done Criteria
- List and graph render from one shared adapter over one projection shape.
- Disabled execute controls are visible per workflow item and keyboard focusable/readable.

---

## Task 5: Add Deterministic Tests

### Files
- `packages/api/src/routers/project.test.ts` (new)
- `apps/web/src/routes/-projects.$projectId.integration.test.tsx`
- `apps/web/src/routes/-projects.$projectId.pinning.integration.test.tsx` (regression coverage if needed)
- `packages/methodology-engine/src/eligibility-service.test.ts`
- `packages/methodology-engine/src/version-service.test.ts`

### Test Cases
1. API projection shape includes:
   - `isPreview: true`
   - `status`, `statusReasonCode`
   - workflow disabled reason copy
   - diagnostics key set with `evidenceRef`.
2. UI integration:
   - default dashboard still renders project + pin summary
   - transition/workflow preview appears with disabled per-workflow controls
   - `Show future paths` defaults off; reveals `future` on toggle
   - list and graph expose equivalent transition/workflow/status semantics from the same fixture input
   - list and graph both render the same canonical glyph (`asset-34`) and status-color mapping per status
   - empty diagnostics messaging for new projects
   - blocked/failed semantics are distinct and text-announced.
   - `statusReasonCode` helper copy is rendered and deterministic.
   - disabled workflow controls are keyboard-discoverable (`aria-disabled`) with rationale text.
   - interacting with disabled preview controls triggers no execution/setup mutation requests.
3. Engine determinism:
   - same inputs -> same transition/workflow ordering
   - stable reason-code emission for blocked/future/eligible scenarios.
4. Fixture-driven readiness previews:
   - include `WU.SETUP` preview fixtures with `project.deliveryMode` present/absent to validate `MISSING_PREVIEW_PREREQUISITE_FACT` behavior.
   - include at least one future-eligible transition fixture with no start-gate constraints.

### UX Risk-to-Test Traceability (Advanced Elicitation Capture)
- P0: Preview-only boundary ambiguity -> assert all workflow actions are `aria-disabled`, rationale copy exact-match, and no execute mutation call occurs.
- P0: List/graph drift -> assert identical transition keys, statuses, reason codes, and workflow counts in both views for same fixture + toggle state.
- P0: Missing reason visibility -> assert every transition row renders non-empty `statusReasonCode` helper text.
- P0: Future-path overload -> assert `Show future paths` defaults off and reveals only `future` transitions when enabled.
- P1: Ordering instability -> assert deterministic sorting for transitions/workflows/evidence timeline across repeat renders.
- P1: Synthetic vs persisted confusion -> assert preview diagnostics are labeled as preview-derived while persisted evidence retains actor/timestamp/ref semantics.
- P1: Accessibility regression -> assert non-color-only status semantics (`glyph + label + semantic color`) and keyboard reachability for disabled actions.

### AC Coverage Quick Map
- AC1/AC5/AC6/AC8: summary + evidence + diagnostics rendering tests.
- AC2/AC10: preview-only boundary and disabled execute rationale tests.
- AC3/AC9: transition metadata + readiness preview + future-path toggle tests.
- AC4: fact/provenance and missing-prerequisite diagnostics tests.
- AC7: regression assertions to ensure reuse of existing persisted outputs and no new authoring validation pathways.
- AC11: keyboard accessibility + non-color-only status semantics tests.

### Done Criteria
- New tests pass and Story 2.5 behavior remains intact.

---

## Verification Commands
Run in repo root:

```bash
bun check
bun check-types
bun test --filter @chiron/methodology-engine
bun test --filter @chiron/api
bun test --filter @chiron/web
```

If workspace filtering differs, use project-standard equivalents (same intent: lint/format, typecheck, engine/api/web tests).

## Risks and Mitigations
- Risk: preview semantics diverge between list and graph.
  - Mitigation: single projection adapter shared by both renderers.
- Risk: confusing preview vs runnable state.
  - Mitigation: explicit `isPreview`, disabled actions, and fixed Epic 3 rationale copy.
- Risk: over-coupling to future execution internals.
  - Mitigation: keep projection read-only and avoid attempt persistence fields.
- Risk: synthetic preview diagnostics are mistaken for persisted facts.
  - Mitigation: provenance tags and explicit preview labeling in API/UI.

## Handoff Notes
- This plan is ready for implementation execution.
- Recommended execution order is Task 1 -> 2 -> 3 -> 4 -> 5.
- No commit was created in this step.
