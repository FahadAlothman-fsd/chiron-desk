# Chiron Foundational Docs Lock v1 (Week 6)

Date: 2026-02-18
Status: Locked for reset preparation
Intent: freeze architecture and implementation foundations before new epics/stories session

## 1) Session Execution Rule

- This session is documentation-only.
- No implementation/code migration work is started from this lock.
- Epics/stories will be generated in a new session against this locked foundation.

## 2) Canonical Source-of-Truth Set

### A. Core architecture contracts (must remain authoritative)

- `docs/architecture/modules/*.md`
- `docs/architecture/workflow-engine/*.md` (runtime/technical only after the Epic 3 re-home)
- `docs/architecture/methodology-pages/workflow-editor/*.md`
- `docs/architecture/methodology-pages/work-units/*.md`
- `docs/architecture/method-workitem-execution-contract.md`
- `docs/architecture/method-workitem-execution-examples.md`

### B. Methodology snapshots to preserve lessons

- `.sisyphus/methodology-snapshot-2026-02-14/methodology-primitives-wireframe.md`
- `.sisyphus/methodology-snapshot-2026-02-14/bmad-full-prototype-config.md`
- `.sisyphus/methodology-snapshot-2026-02-14/execution-layers.md`
- `.sisyphus/methodology-snapshot-2026-02-14/new-session-correct-course-handoff.md`

### C. Locked implementation decisions from this session

- `_bmad-output/planning-artifacts/chiron-north-star-non-negotiables-week6-tuesday.md`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-canonical-mapping-and-gate-constraints-week6.md`
- `_bmad-output/planning-artifacts/chiron-transition-workflow-binding-spec-week6.md`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-complete-schemas-v2-week6.md`
- `_bmad-output/planning-artifacts/chiron-effect-schema-contract-status-week6.md`
- `_bmad-output/planning-artifacts/bmad-work-unit-catalog-v1-week6.md`
- `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-stubs-v1-week6.md`
- `_bmad-output/planning-artifacts/bmad-to-chiron-step-config-resolved-v1-week6.md`
- `_bmad-output/planning-artifacts/bmad-agent-system-prompts-v1-week6.md`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-backend-stack-lock-v1-week6.md`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-frontend-lock-v1-week6.md`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/foundation-locks/chiron-module-lock-matrix-v1-week6.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`

### D. Seed planning artifacts (historical input to rebuild)

- `_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-workflow-definitions-v1.json`
- `_bmad-output/planning-artifacts/archive/2026-02-reset/legacy-seeds/chiron-seed-transition-allowed-workflows-v1.json`

These broad seed JSONs are preserved as lineage only. They are not the current active seed truth after the shift to progressive slice-based seeding.

## 3) Explicitly Superseded in This Session

- `docs/archive/mapping-superseded/bmad-to-chiron-workflow-mapping-v0-week6.md`
  - Keep for lineage only; use step-config-resolved and work-unit catalog docs as active references.

## 4) Locked Foundational Decisions

1. DB horizon: SQLite-only.
2. Transition model: two gates only (`start_gate`, `completion_gate`).
3. Step system: `form`, `agent`, `action`, `invoke`, `branch`, `display`.
4. Workflow ownership: `methodologyVersion + workUnitType`.
5. Transition execution authority: transition allowed-workflow mapping.
6. Invoke modes: `same_work_unit`, `child_work_units`.
7. Git adapter boundary: sandbox-engine/tooling-engine path.
8. Backend-first execution; frontend implementation follows backend spine.
9. Frontend design lock:
   - primary font `Commit Mono`
   - accent font `Geist Pixel`
   - Bloomberg-terminal influence + maximalist assets + minimal interaction structure.

## 5) Pre-Epics/Stories Exit Criteria

- Canonical source set above is accepted.
- No unresolved foundational ambiguity on stack, module boundaries, or transition model.
- Archive plan is approved (see companion archive document).
- Next session can start directly at epic/story creation.
