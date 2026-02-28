# Sprint Change Proposal - 2026-02-28

## 1) Issue Summary

- Trigger story: Epic 2, Story 2.1 (`2-1-build-methodology-workspace-ui-for-draft-authoring-and-validation`)
- Identified issue: Story sequencing starts at deep workspace authoring before prerequisite navigation and methodology/version entry surfaces exist.
- Impact symptom: team can build internals without a coherent operator journey (`methodologies -> methodology -> versions -> version workspace`).
- Root cause category: planning decomposition and sequencing mismatch (not architecture or stack incompatibility).

## 2) Impact Analysis

### Epic and Story Impact

- Epic 2 objective remains valid and unchanged.
- Story boundary adjustments are required inside Epic 2:
  - Story 2.1 must provide navigation and creation foundations.
  - Story 2.2 must absorb baseline version-workspace authoring + graph editing context.
  - Story 2.3 keeps validation/publish/evidence hardening on top of 2.2.
  - Stories 2.4 and 2.5 remain functionally aligned, with dependency notes clarified.

### Artifact Impact

- `_bmad-output/planning-artifacts/epics.md`: revise Story 2.1-2.3 definitions and acceptance criteria focus.
- `_bmad-output/implementation-artifacts/sprint-status.yaml`: reset Story 2.1 readiness state due material scope change.
- `_bmad-output/implementation-artifacts/2-1-build-methodology-workspace-ui-for-draft-authoring-and-validation.md`: mark superseded and regenerate from revised epics.
- Additional story context files for 2.2+ should be generated after revised sequencing is accepted.

### Technical Impact

- No changes to locked stack, architecture boundaries, or Epic 1 contracts.
- No changes to Epic 3+ runtime deferment policy.
- Primary effect is implementation order and story contract clarity.

## 3) Recommended Approach

- Selected approach: **Hybrid (Direct Adjustment + Targeted Rollback of Story Context Artifacts)**

### Option A - Direct Adjustment (selected core)

- Edit Epic 2 story definitions and acceptance criteria sequencing.
- Keep Epic objective intact.
- Benefits: minimal churn, low risk, immediate clarity.

### Option B - Potential Rollback (targeted, selected supplement)

- Revoke `ready-for-dev` on outdated Story 2.1 context file.
- Regenerate Story 2.1 and Story 2.2 context from corrected epics.
- Benefits: avoids implementing stale context.

### Option C - PRD MVP Review (not selected)

- Not required; MVP intent and FR coverage remain valid.

### Effort / Risk / Timeline

- Effort: Moderate (planning artifacts + story context regeneration)
- Risk: Low technical risk, medium coordination risk if stale context remains active
- Timeline: 0.5-1 day for artifact correction and regenerated story context approval

## 4) Detailed Change Proposals

### A) Epics/Stories (`epics.md`)

#### Story 2.1

- Before: workspace-first draft authoring and validation focus.
- After: **Methodology Catalog + Details + Version Entry Foundation**, explicitly including:
  - methodology list view
  - methodology creation (`create methodology`)
  - methodology details shell
  - versions list and draft version creation/opening
  - navigation route into version workspace
- Justification: removes dependency dead-end and establishes usable operator flow.

#### Story 2.2

- Before: React Flow graph and binding management focus.
- After: **Version Workspace Baseline + Graph/Binding Management**:
  - version details workspace shell
  - baseline authoring for work units/facts/transitions/workflows/steps
  - React Flow interaction depth and transition inspection semantics
- Justification: preserves original graph intent while moving deep workspace scope to correct sequence stage.

#### Story 2.3

- Before: validation, publish, and evidence UX.
- After: same functional scope, explicitly framed as hardening on top of Story 2.2 workspace baseline.
- Justification: keeps validation/publish maturity work in the correct dependency order.

#### Stories 2.4-2.5

- Keep scope, add explicit dependency notes consuming outputs from 2.1-2.3.

### B) Sprint Status (`sprint-status.yaml`)

- Keep `epic-2: in-progress`.
- Change Story 2.1 status from `ready-for-dev` to `backlog` pending regenerated context from revised epics.
- Keep Stories 2.2-2.5 as `backlog`.
- Justification: current 2.1 context no longer matches approved corrected scope.

### C) Implementation Story Context Artifacts

- Mark current Story 2.1 implementation artifact as superseded by this proposal.
- Re-run create-story for revised Story 2.1 after epics edits are committed.
- Re-run create-story for revised Story 2.2 next, then proceed in order.

## 5) Implementation Handoff

- Scope classification: **Moderate**
- Recipients: Scrum Master (planning artifact updates), Product Owner (story acceptance sign-off), Dev Team (execute regenerated story contexts)

### Responsibilities

- SM:
  - Apply approved edits to `epics.md` and `sprint-status.yaml`
  - Archive/supersede stale story context file
  - Regenerate Story 2.1 and 2.2 context files
- PO:
  - Validate revised story intent and sequencing
- Dev Team:
  - Implement in corrected order (2.1 -> 2.2 -> 2.3 -> 2.4 -> 2.5)

### Success Criteria

- Epic 2 story sequence clearly maps to operator journey and dependency order.
- Story 2.1 explicitly contains methodology create/list/details/versions entry foundations.
- Story 2.2 and 2.3 contain non-overlapping, dependency-safe scopes.
- `sprint-status.yaml` reflects corrected readiness states.
- Regenerated story context files are approved and ready for implementation.
