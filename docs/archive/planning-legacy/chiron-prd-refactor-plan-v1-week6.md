# Chiron PRD Refactor Plan v1 (Week 6)

Date: 2026-02-18
Status: Locked PRD rewrite plan (execute before epic/story generation)

## 1) Keep in PRD

- Product intent: methodology-first orchestration platform.
- User outcomes: faster planning-to-implementation loops, reduced manual coordination overhead.
- Multi-agent model: Chiron analysis + OpenCode execution.
- Desktop-first orientation with Tauri.

## 2) Rewrite in PRD

- Execution model section:
  - replace mixed/legacy descriptions with work-unit + transition + two-gate model.
- Persistence section:
  - SQLite-only for current horizon.
- Workflow model section:
  - 6-step contract only.
- Planning artifacts section:
  - map workflows to work units and transitions.
- Scope/timeline section:
  - backend-first implementation sequencing and hard cut lines.

## 3) Remove or Move to Historical Notes

- Mastra-era migration-specific implementation details.
- Legacy epic sequencing and stale roadmaps.
- Any DB assumptions that conflict with SQLite lock.

## 4) Required PRD Additions

- Explicit work-unit taxonomy reference.
- Transition gate semantics (start/completion only).
- Invoke modes (`same_work_unit`, `child_work_units`).
- Provider-runtime-policy split summary.
- Backend and frontend lock summaries.

## 5) Acceptance Criteria for PRD Lock

1. No contradiction with `chiron-foundational-docs-lock-v1-week6.md`.
2. All major sections map to module lock matrix.
3. No stale migration path language in active PRD body.
4. PRD directly usable for epic/story generation next session.
