## 2026-04-05

- Mirrored the graph-node styling primitives directly inside `step-list-inspector.tsx` instead of changing shared type constants or `workflow-canvas.tsx`, preserving the existing source-of-truth files while making the left rail visually consistent.
- Applied the heavy cut-frame treatment only to step list items and the selected step inspector card; edge inspector styling was left unchanged because the request targeted step surfaces specifically.
- Removed edge-level `conditionJson` from contracts, repository writes/reads, validation, and API schemas instead of silently ignoring it, because branch routing is moving to a dedicated route-table model and stale condition payloads would otherwise round-trip inconsistently.
- Kept edge descriptions by replacing edge `guidanceJson` storage with schema-level `description_markdown`, then continued exposing `descriptionJson: { markdown }` in slice-1 DTOs so existing editor surfaces stay stable.
