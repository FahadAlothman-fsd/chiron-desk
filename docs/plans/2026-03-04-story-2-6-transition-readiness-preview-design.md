# Story 2.6 Design: Transition Readiness Preview Before First Execution

Date: 2026-03-04
Story: 2.6 (baseline operator visibility for methodology, pin, diagnostics, and transition/workflow preview)

## Goal
Implement everything needed up to the exact boundary before first workflow execution: a read-only baseline visibility projection that shows transition/workflow readiness in project context, including per-workflow disabled execute controls and deterministic diagnostics/evidence.

## Non-Goals
- Execute workflows or mutate runtime state (execution remains Epic 3+).
- Persist setup facts through `WU.SETUP/setup-project` in this story.
- Add new methodology authoring validation rules.
- Introduce an alternate diagnostics contract.

## Hardening Constraints
- Scope guard: deliver projection + list preview first; graph enhancement must consume the same projection and stay minimal in this story.
- Data provenance must be explicit per field: persisted source vs computed eligibility vs synthetic preview diagnostic.
- `statusReasonCode` is mandatory for every transition item and must be rendered (not hidden/internal).
- Disabled workflow actions must be keyboard-discoverable using an `aria-disabled` pattern with visible rationale text.
- Preview controls are non-mutating in Epic 2: interacting with disabled controls must produce zero execution/setup mutation requests.
- `baselinePreview` is additive/backward-compatible on project details; existing consumers of `{ project, pin, lineage }` continue to work.
- Status communication must use color + text + glyph together; color-only communication is not allowed.
- Story 2.6 preview components should use project-owned visual assets for status glyphs, not generic Lucide icons.

## Baseline (Already Implemented)
- Story 2.5 already provides project details with active methodology pin snapshot and pin lineage.
- Story 2.5 already renders runtime controls as visible-but-disabled with Epic 3 rationale.
- API project details currently returns `{ project, pin, lineage }` but not transition/readiness projection.

## Module Boundaries (Hard)
- `apps/web`: render list + graph projections, keyboard-accessible controls, deterministic status semantics.
- `packages/api`: transport and projection composition endpoint(s); no business policy duplication.
- `packages/methodology-engine`: eligibility/readiness derivation and deterministic diagnostics shaping.
- `packages/contracts`: canonical schemas for transition eligibility/readiness projection.

## Primary Design (Recommended)
### 1) Project-Derived Preview Projection
Add a read-only projection to project details (or a project preview endpoint) that returns:
- Baseline summary: active methodology, pinned version, publish state, latest validation summary.
- Transition preview by selected work-unit context: transition metadata and allowed workflows.
- Readiness diagnostics and evidence references in deterministic order.

Field provenance (required):
- Persisted: `summary.methodologyKey`, `summary.pinnedVersion`, publish/validation summary, evidence timeline rows.
- Computed: transition `status` and `eligible`/`blocked`/`future` derivation from current context + bindings.
- Synthetic preview diagnostics: `MISSING_PREVIEW_PREREQUISITE_FACT` and related preview-only reasoning labels.

### 2) Progressive Visibility Model (List + Graph)
Render only context-relevant slices, not all methodology work units at once:
- Current context work units and transitions from current state.
- Reachable transition paths with explicit status labels (`eligible`, `blocked`, `future`).
- Workflow list under each transition, with per-item disabled execute controls.
- `Show future paths` toggle defaults to off; when on, include `future` transitions without changing status semantics.

Graph and list must be equivalent views of the same projection so state semantics do not drift.

### 3) Transition and Workflow Preview Semantics
For each transition preview item:
- Show `fromState`, `toState`, `gateClass`, and `requiredLinks` metadata.
- Show allowed workflows for that transition (from transition-workflow bindings).
- Render one disabled action button per workflow list item with exact text rationale: `Workflow runtime execution unlocks in Epic 3+`.
- Use focusable `aria-disabled` controls (not hard-disabled-only buttons) so keyboard users can discover rationale and helper text.

### 3.1) Status Visual Token Table (Required, Bitmap/3D Pixel)

Each transition status row must render a deterministic visual triad: semantic color, explicit label text, and project-owned glyph.

| Status | Label | Color treatment | Glyph asset | Notes |
|---|---|---|---|---|
| `eligible` | `Eligible` | terrain/mint semantic tint + success border accent | `/visuals/chiron-status/asset-34.svg` | same canonical Chiron entity glyph, success color state |
| `blocked` | `Blocked` | dawn/alert semantic tint + warning border accent | `/visuals/chiron-status/asset-34.svg` | same canonical glyph, blocked color state + reason code |
| `future` | `Future` | winter/slate semantic tint + muted border accent | `/visuals/chiron-status/asset-34.svg` | same canonical glyph, future path color state |

Implementation notes:
- Use semantic status token classes/variables (single source mapping), not ad-hoc per-component color classes.
- Keep reason-code helper copy visible near the status badge.
- Preserve non-color semantics for all statuses (label text remains required).
- Optional secondary motif for section headers/context chips: `/visuals/chiron-status/asset-13.svg` (never replaces status label text).
- List and graph must both consume the same status visual mapping primitive for `asset-34` and state-color variants.

### 3.2) Asset-First Iconography Rule

- For Story 2.6 preview surfaces, use Chiron status assets under `apps/web/public/visuals/chiron-status/` for status glyphs.
- Avoid importing generic Lucide icons in new preview components unless no project asset can satisfy the use case.
- If fallback is required, document the exception in the PR notes and keep status semantics unchanged.

Asset sourcing notes (from UX appendix registry):
- Source pack root: `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst`
- Canonical source files:
  - `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst/SVG/asset-34.svg`
  - `/home/gondilf/Desktop/Bitmap Dreams Color Edition_by Vanzyst/Bitmap Dreams Color Edition_by Vanzyst/SVG/asset-13.svg`
- Vendor these into repo before implementation:
  - `apps/web/public/visuals/chiron-status/asset-34.svg`
  - `apps/web/public/visuals/chiron-status/asset-13.svg`

### 4) Readiness Status Rules for Story 2.6
Use deterministic preview statuses without execution:
- `eligible`: transition is in current-state context and has at least one valid allowed workflow.
- `blocked`: transition is in context but has no valid allowed workflow or has unresolved/missing prerequisites in preview diagnostics.
- `future`: transition has no start-gate constraints or is visible as future path in current projection.

Each transition preview item includes a stable `statusReasonCode` to prevent semantic ambiguity:
- `HAS_ALLOWED_WORKFLOW`
- `NO_WORKFLOW_BOUND`
- `UNRESOLVED_WORKFLOW_BINDING`
- `MISSING_PREVIEW_PREREQUISITE_FACT`
- `FUTURE_NO_START_GATE`
- `FUTURE_NOT_IN_CURRENT_CONTEXT`

`statusReasonCode` is required and must always be displayed in deterministic helper copy/tooling text.

Note: Story 2.6 remains preview-only. Runtime gate evaluation and attempt persistence stay in Epic 3.

### 5) WU.SETUP Intro Bridge (Preview Only)
Include `WU.SETUP` in preview to bridge into Epic 3 onboarding:
- Show setup transition preview states in project context.
- Support deterministic blocked preview when expected project fact prerequisites are missing.
- Do not execute setup workflow or write setup facts in this story.

### 6) Diagnostics and Evidence Contract
Diagnostics stay grouped by `publish`, `pin`, and `repin-policy` with stable fields:
- `code`, `scope`, `blocking`, `required`, `observed`, `remediation`, `timestamp`, `evidenceRef`.

Evidence timeline remains append-only and deterministically ordered with actor/timestamp/reference identifiers.

## Data Contract Sketch (Draft)
```ts
type ProjectBaselinePreview = {
  isPreview: true
  summary: {
    methodologyKey: string
    pinnedVersion: string
    publishState: "published" | "unpublished" | "unknown"
    validationStatus: "pass" | "warn" | "fail" | "unknown"
  }
  transitionPreview: {
    workUnitTypeKey: string
    currentState: string | "__absent__"
    transitions: Array<{
      transitionKey: string
      fromState?: string
      toState: string
      gateClass: "start_gate" | "completion_gate"
      status: "eligible" | "blocked" | "future"
      statusReasonCode:
        | "HAS_ALLOWED_WORKFLOW"
        | "NO_WORKFLOW_BOUND"
        | "UNRESOLVED_WORKFLOW_BINDING"
        | "MISSING_PREVIEW_PREREQUISITE_FACT"
        | "FUTURE_NO_START_GATE"
        | "FUTURE_NOT_IN_CURRENT_CONTEXT"
      requiredLinks: Array<{
        linkTypeKey: string
        strength?: "hard" | "soft" | "context"
        required?: boolean
      }>
      diagnostics: Array<{
        code: string
        scope: string
        blocking: boolean
        required: string
        observed: string
        remediation?: string
        timestamp: string
        evidenceRef?: string
      }>
      workflows: Array<{
        workflowKey: string
        enabled: false
        disabledReason: "Workflow runtime execution unlocks in Epic 3+"
        helperText: "Execution is enabled in Epic 3 after start-gate preflight."
      }>
    }>
  }
}
```

## Error Handling
- If preview data cannot be resolved, show deterministic transport/domain diagnostics and preserve existing project shell content.
- If no diagnostics exist yet, show explicit empty-state message: diagnostics appear after publish/pin/policy checks.
- Keep `blocked` and `failed` labels distinct in UI semantics and keyboard-announced text.

## Testing Strategy
- API tests for projection shape, deterministic ordering, and disabled workflow action rationale.
- UI integration tests for:
  - progressive projection (only relevant transitions/workflows shown)
  - `Show future paths` toggle defaults off and deterministically reveals only `future` transitions when enabled
  - per-workflow disabled execute controls with exact rationale text
  - disabled controls are keyboard discoverable via `aria-disabled` + helper text
  - each status row renders color + label + asset glyph from the required token table
  - per-transition `statusReasonCode` mapping is stable and consistent with rendered status labels
  - blocked vs eligible vs future status rendering semantics
  - empty diagnostics state messaging
  - keyboard navigation and non-color-only status communication
- Regression tests ensuring Story 2.5 pin snapshot/lineage surfaces remain intact.

## Delivery Sequence (Story 2.6)
1. Land projection + list preview (authoritative source of truth).
2. Land graph as a thin consumer of the same projection adapter.
3. Verify list/graph semantic parity and no execution side effects.

## Rollout and Follow-On
- Story 2.6 establishes preview parity and interaction shape.
- Epic 3 reuses these list/graph affordances, flips enabled behavior behind start-gate preflight, and persists execution attempts.
