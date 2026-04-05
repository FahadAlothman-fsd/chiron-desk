## 2026-04-05

- Workflow-editor step chrome already has a canonical visual language in `apps/web/src/features/workflow-editor/workflow-canvas.tsx`: `chiron-cut-frame-heavy` + `--frame-bg`/`--frame-border`/`--frame-corner` CSS variables + per-step-type accent and badge classes.
- The workflow editor design system is token-driven from `apps/web/src/index.css`; frame treatments should be customized by CSS variables rather than ad-hoc hardcoded borders.
- Typography and spacing in the workflow editor consistently use pixel headings (`font-geist-pixel-square`), uppercase tracking, and 2/3 spacing increments (`gap-2`, `gap-3`, `p-2`, `p-3`).
- `methodology_workflow_edges` no longer needs JSON storage for either branch conditions or edge descriptions in slice-1; plain `description_markdown` is sufficient for the surviving edge-inspector copy path.
- The repository already has `extractMarkdown()` and can reuse it to bridge persisted `description_markdown` <-> contract `descriptionJson` without introducing a new edge-specific parser.
