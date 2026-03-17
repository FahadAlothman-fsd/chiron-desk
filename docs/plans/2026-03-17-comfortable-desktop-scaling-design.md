# Comfortable Desktop Scaling Design (1080p/1440p)

## Goal

Improve perceived readability and visual density on desktop displays (especially 1080p and 1440p) by applying a **comfortable** global scale that makes text, controls, and spacing feel less tiny without introducing per-page maintenance burden.

## Decision Summary

- **Chosen approach:** Global fluid desktop scaling (recommended option)
- **Intensity:** Comfortable (~10–15% perceived increase)
- **Scope:** `apps/web` shell and shared UI primitives via global CSS tokens/root scale
- **Non-goals:** No per-screenpoint hardcoded page-specific hacks; no device-specific branching

## UX Contract

1. 1080p should feel slightly roomier and easier to read than current baseline.
2. 1440p should no longer feel sparse/tiny; controls should be comfortably targetable.
3. The layout should preserve hierarchy and not overflow dialogs/tables.
4. The scaling should remain fluid as viewport changes, with upper and lower clamps.

## Proposed Technical Design

### 1) Root-level fluid scale

Use a viewport-clamped root font-size in `apps/web/src/index.css`:

- Keep baseline close to current for smaller desktops.
- Increase gradually into 1080p/1440p territory.
- Cap at comfortable maximum to avoid oversized UI.

This propagates through existing rem-based typography, spacing, and component sizing with minimal code churn.

### 2) Shell rhythm reinforcement

Adjust key app-shell paddings/gaps (header/body) so enlarged text still has balanced whitespace.

Target file:
- `apps/web/src/components/app-shell.tsx`

Only adjust container utility classes if needed after root scaling; avoid one-off component overrides.

### 3) Command palette + sidebar validation

Validate that recent Story 3.1 surfaces remain visually coherent under the new scale:

- command palette content density
- sidebar line lengths and active-state legibility

No behavior changes required, only visual fit checks.

## Accessibility and Performance

- Respect user zoom preferences; root scaling complements (does not replace) browser zoom.
- No new effects/hooks required.
- No extra runtime computation beyond CSS clamp.

## Test & Verification Strategy

1. Existing integration tests continue to pass (no behavior regression).
2. Type checks and repo checks pass.
3. Manual visual QA at 1920×1080 and 2560×1440 confirms comfortable scale target.

Verification commands:

```bash
bun run --cwd apps/web test -- src/tests/features/methodologies/command-palette.integration.test.tsx
bun run --cwd apps/web test -- src/tests/features/methodologies/commands.test.ts
bun run --cwd apps/web check-types
bun run check
```
