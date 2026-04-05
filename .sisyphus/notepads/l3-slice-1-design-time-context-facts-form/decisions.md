## 2026-04-05

- Mirrored the graph-node styling primitives directly inside `step-list-inspector.tsx` instead of changing shared type constants or `workflow-canvas.tsx`, preserving the existing source-of-truth files while making the left rail visually consistent.
- Applied the heavy cut-frame treatment only to step list items and the selected step inspector card; edge inspector styling was left unchanged because the request targeted step surfaces specifically.
