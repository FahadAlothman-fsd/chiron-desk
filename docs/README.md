# Chiron Documentation

**Last Updated:** 2026-03-16  
**Status:** Active canonical index

## Source Of Truth

Use these files for current architecture and planning decisions.

- `docs/architecture/epic-3-authority.md` - Epic 3 routing authority, promotion status, stale-doc handling, and precedence rules
- `docs/architecture/chiron-module-structure.md` - Module boundaries and execution model
- `docs/architecture/modules/README.md` - Detailed module design docs for scaffold-only and underdesigned packages
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Canonical UX implementation contract and visual direction
- `_bmad-output/planning-artifacts/reset-baseline-checklist.md` - Canonical reset/setup decisions before sprint planning
- `_bmad-output/planning-artifacts/epics.md` - Current epic planning status, sequencing, and story-level acceptance criteria, not surface-level contract authority

For Epic 3 work, start with `docs/architecture/epic-3-authority.md`, then follow the stable `docs/architecture/...` path it lists for the surface you are changing. Use dated plans only when that authority doc says a surface has not been promoted yet.

## Active Supporting Docs

- Current methodology design-time page docs under `docs/architecture/methodology-pages/`, especially `docs/architecture/methodology-pages/versions.md`, `docs/architecture/methodology-pages/work-units/`, and `docs/architecture/methodology-pages/workflow-editor/`; use `docs/architecture/epic-3-authority.md` to resolve which docs are canonical, contextual-only, or stale for a given surface
- Technical/runtime-only workflow-engine docs remain under `docs/architecture/workflow-engine/`
- `docs/architecture/module-implementation-workflow.md` - Module implementation process
- `docs/architecture/module-observability-contract.md` - Observability requirements
- `docs/architecture/workflow-engine-parity-checklist.md` - Drift-control checklist for standalone runtime parity and API cutover
- `docs/architecture/contracts-effect-migration-checklist.md` - Drift-control checklist for contracts schema migration
- `docs/architecture/tooling-engine-permission-parity-checklist.md` - Drift-control checklist for permission model parity and integration
- `docs/architecture/workflow-versioning.md` - Workflow definition versioning vs execution revision model
- `docs/architecture/git-context-variables.md` - First-class git context variable model
- `docs/architecture/branching-strategy.md` - Branching strategy baseline and constraints
- `docs/architecture/frontend-better-result-guidelines.md` - Frontend error-handling conventions using better-result
- `docs/architecture/workflow-diagram-ui-react-flow.md` - Diagram UI direction using React Flow
- `docs/architecture/pm-workflow-artifact-bridge-consideration.md` - Consideration document for linking PM entities, workflows, and evidence
- `docs/architecture/bmad-e2e-workflow-notes.md` - Session reference with integrated corrections for BMAD-style end-to-end workflow configs

## Archived And Historical Paths

These are preserved for history and thesis traceability. Do not use them as implementation truth.

- `docs/archive/pre-epic-1-restart/`
- `docs/archive/phase-1-discovery/`
- `docs/archive/phase-3-solutioning/`
- `docs/archive/epic-1/`
- `docs/archive/epics-v1-mastra-era/`
- `docs/archive/story-1-6-handoffs/`

## Superseded Docs Still In Active Path

The following files are intentionally kept in place for historical context but are no longer canonical.

- `docs/schema-design.md` - Superseded by current implementation in `packages/db/src/schema/` and canonical architecture docs
- `docs/migration-plan.md` - Migration-era plan document, not current execution plan
- `docs/tech-specs/artifact-system.md` - Legacy technical spec; not the current implementation source of truth
- `docs/architecture/workflow-engine/invoke-cross-work-unit-pattern.md` - Historical pre-lock invoke pattern; superseded by `docs/architecture/methodology-pages/workflow-editor/invoke-step.md` and `docs/plans/2026-03-12-invoke-facts-artifact-slots-design.md`
- `docs/architecture/workflow-engine/agent-continuation-contract.md` - Contextual continuation draft; not current implementation authority until reconciled with promoted `agent.v1` and `invoke.v1`
- `docs/architecture/project-context-only-bmad-mapping-draft.md` - BMAD-source-only draft with outdated step shapes; not canonical Epic 3 authority
- `docs/architecture/bmad-e2e-rigorous-example.md` - Historical walkthrough with pre-lock invoke/output examples; use only as contextual lineage, not as current step-contract authority

## Alignment Rules

- Prefer stable `docs/architecture/...` docs for planned behavior, and prefer code plus package-local docs for implementation reality
- Treat `_bmad-output/planning-artifacts/ux-design-specification.md` and `_bmad-output/planning-artifacts/reset-baseline-checklist.md` as authoritative for frontend UX decisions
- Keep new planning artifacts under `_bmad-output/planning-artifacts/`
- Archive, do not delete, obsolete docs
