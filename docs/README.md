# Chiron Documentation

**Last Updated:** 2026-02-09  
**Status:** Active canonical index

## Source Of Truth

Use these files for current architecture and planning decisions.

- `AGENTS.md` - Project-level canonical architecture, package map, conventions, commands
- `docs/architecture/chiron-module-structure.md` - Module boundaries and execution model
- `_bmad-output/planning-artifacts/ux-design-specification.md` - Canonical UX implementation contract and visual direction
- `_bmad-output/planning-artifacts/reset-baseline-checklist.md` - Canonical reset/setup decisions before sprint planning
- `_bmad-output/planning-artifacts/epics/README.md` - Current epic planning status and next epic set location

## Active Supporting Docs

- `docs/architecture/workflow-engine/*.md` - Step contracts and workflow-engine architecture notes
- `docs/architecture/workflow-engine/agent-continuation-contract.md` - Cross-step agent session continuity contract
- `docs/architecture/modules/README.md` - Detailed module-level design docs for underdesigned/scaffold modules
- `docs/architecture/module-implementation-workflow.md` - Module implementation process
- `docs/architecture/module-observability-contract.md` - Observability requirements
- `docs/architecture/workflow-engine-parity-checklist.md` - Drift-control checklist for standalone runtime parity and API cutover
- `docs/architecture/contracts-effect-migration-checklist.md` - Drift-control checklist for contracts schema migration
- `docs/architecture/tooling-engine-permission-parity-checklist.md` - Drift-control checklist for permission model parity and integration
- `docs/architecture/workflow-versioning.md` - Workflow definition versioning vs execution revision model
- `docs/architecture/git-context-variables.md` - First-class git context variable model
- `docs/architecture/branching-strategy.md` - Branching strategy baseline and constraints
- `docs/architecture/workflow-diagram-ui-react-flow.md` - Diagram UI direction using React Flow
- `docs/architecture/pm-workflow-artifact-bridge-consideration.md` - Consideration document for linking PM entities, workflows, and evidence
- `docs/architecture/bmad-e2e-workflow-notes.md` - Session reference with integrated corrections for BMAD-style end-to-end workflow configs
- `docs/architecture/bmad-e2e-rigorous-example.md` - Rigorous target-state BMAD path example with concrete step configs and module interactions

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

## Alignment Rules

- Prefer `AGENTS.md` when a doc conflicts with code
- Treat `_bmad-output/planning-artifacts/ux-design-specification.md` and `_bmad-output/planning-artifacts/reset-baseline-checklist.md` as authoritative for frontend UX decisions
- Keep new planning artifacts under `_bmad-output/planning-artifacts/`
- Archive, do not delete, obsolete docs
