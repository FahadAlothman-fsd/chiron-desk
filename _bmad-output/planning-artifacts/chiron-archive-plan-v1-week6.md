# Chiron Archive Plan v1 (Week 6)

Date: 2026-02-18
Status: Proposed archive actions (documentation scope only)
Purpose: reduce ambiguity by separating active implementation docs from historical references.

## 1) Archive Policy

- Do not delete historical docs.
- Archive by moving to explicit historical folders and marking as non-canonical.
- Preserve traceability from archived docs to the active canonical set.

## 2) Keep Active (Do Not Archive)

- `docs/architecture/modules/*.md`
- `docs/architecture/workflow-engine/*.md`
- `docs/architecture/method-workitem-execution-contract.md`
- `docs/architecture/method-workitem-execution-examples.md`
- `.sisyphus/methodology-snapshot-2026-02-14/*.md`
- Week 6 locked docs listed in `_bmad-output/planning-artifacts/chiron-foundational-docs-lock-v1-week6.md`

## 3) Archive Candidates (High Confidence)

### A. Legacy migration-era planning docs

- `_bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-01-10.md`
- `_bmad-output/planning-artifacts/bmm-workflow-status.yaml` (if replaced by current sprint-status model)

### B. Superseded mapping baseline

- `_bmad-output/planning-artifacts/bmad-to-chiron-workflow-mapping-v0-week6.md`

### C. Older pre-lock planning artifacts (review before archive)

- `_bmad-output/planning-artifacts/product-brief-chiron-2025-10-26.md`
- `_bmad-output/planning-artifacts/research/*` (legacy-only subsets)
- `_bmad-output/planning-artifacts/design/*` (legacy-only subsets)
- `_bmad-output/planning-artifacts/architecture/*` (Mastra-era and superseded migration notes)

## 4) Proposed Archive Locations

- `docs/archive/planning-legacy/`
- `docs/archive/migration-era/`
- `docs/archive/mapping-superseded/`

## 5) Archiving Acceptance Criteria

1. Every archived file has a replacement reference to active doc(s).
2. No active implementation decision depends on an archived file.
3. Canonical index is updated after each archive move.
4. Historical docs remain searchable and traceable.

## 6) Archive Execution Sequence

1. Archive superseded mapping baseline first (`v0` mapping file).
2. Archive migration-era spec/proposals next.
3. Archive older design/research artifacts after quick relevance review.
4. Publish updated canonical index and confirm no broken references.

## 7) Archive Execution Log (This Session)

Completed now:

1. Moved superseded mapping baseline:
   - from `_bmad-output/planning-artifacts/bmad-to-chiron-workflow-mapping-v0-week6.md`
   - to `docs/archive/mapping-superseded/bmad-to-chiron-workflow-mapping-v0-week6.md`
2. Moved migration-era tech spec:
   - from `_bmad-output/planning-artifacts/tech-spec-effect-workflow-engine.md`
   - to `docs/archive/migration-era/tech-spec-effect-workflow-engine.md`
3. Moved older sprint change proposal:
   - from `_bmad-output/planning-artifacts/sprint-change-proposal-2026-01-10.md`
   - to `docs/archive/migration-era/sprint-change-proposal-2026-01-10.md`

Remaining archive candidates still require relevance check before move.
