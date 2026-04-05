## 2026-04-05

- Workflow-editor step chrome already has a canonical visual language in `apps/web/src/features/workflow-editor/workflow-canvas.tsx`: `chiron-cut-frame-heavy` + `--frame-bg`/`--frame-border`/`--frame-corner` CSS variables + per-step-type accent and badge classes.
- The workflow editor design system is token-driven from `apps/web/src/index.css`; frame treatments should be customized by CSS variables rather than ad-hoc hardcoded borders.
- Typography and spacing in the workflow editor consistently use pixel headings (`font-geist-pixel-square`), uppercase tracking, and 2/3 spacing increments (`gap-2`, `gap-3`, `p-2`, `p-3`).
