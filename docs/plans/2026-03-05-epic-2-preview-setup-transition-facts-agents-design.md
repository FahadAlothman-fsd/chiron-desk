# Epic 2 Preview: Setup Transition + Empty Facts + Populated Agents

Date: 2026-03-05

## Goal
In Epic 2 preview surfaces (project-scoped lists + baseline preview), ensure:
- Setup transition is shown as `eligible` (transition available) when seeded bindings include a valid workflow.
- Project facts are empty (no schemas, no persisted values) in preview.
- Agents list is populated (deterministic list of agent type keys).

## Non-Goals
- Executing workflows, persisting setup facts, or mutating runtime state (Epic 3+).
- Replacing normalized lifecycle/workflow persistence (normalized tables remain canonical when present).
- Expanding/renaming the `baselinePreview` response contract.

## Current State (Observed)
- `orpc.project.getProjectDetails` already returns `baselinePreview` (additive) when a project has a methodology pin.
- Story seed (`packages/scripts/src/story-seed.mjs`) upserts methodology definitions/versions (including `definitionExtensions`) but does not seed normalized lifecycle tables.
- `EligibilityService.getTransitionEligibility` currently depends on normalized lifecycle rows; when those rows are missing, it returns zero eligible transitions.
- As a result, transition preview statuses in `baselinePreview.transitionPreview.transitions` degrade to `future` for seed-only versions.
- Agents list in `/projects/$projectId/agents` uses `baselinePreview.projectionSummary.agents`, which is derived from the draft projection agent types; seed currently sets `agentTypes: []`.

## Primary Decision (Recommended)
Keep the project details contract stable and minimize blast radius by:
1) Seeding deterministic `agentTypes` into existing seed `definitionExtensions`.
2) Adding an engine-level eligibility fallback for seed-only environments:
   - When normalized lifecycle rows are absent, derive eligibility from `version.definitionExtensions`.

This preserves deterministic semantics and avoids router-local policy duplication.

## Design

### A) Seed: Deterministic Agents, Facts Remain Empty
- File: `packages/scripts/src/story-seed-fixtures.ts`
- Update `buildStory22DefinitionExtensions()` to set:
  - `agentTypes` to a deterministic list of objects with at least `{ key: string, persona: string }`.
  - Keep `factSchemas: []` for all work unit types so:
    - `baselinePreview.projectionSummary.facts` is empty.
    - `baselinePreview.facts` (active work unit context facts) is empty.

Notes:
- The web agents page only needs keys (`projectionSummary.agents` maps `agentTypes[].key`).
- Seed ordering must be deterministic (pre-sorted by key, or sorted during projection mapping).

### B) Engine: Eligibility Fallback When Normalized Lifecycle Is Missing
- File: `packages/methodology-engine/src/eligibility-service.ts`
- Keep current normalized-first algorithm.
- Add a fallback path that activates only when normalized lifecycle does not exist for the version.

Fallback trigger:
- If `lifecycleRepo.findWorkUnitTypes(versionId)` returns an empty list, treat the version as "seed-only" for eligibility.

Fallback derivation:
- Read `version.definitionExtensions` as a record.
- Locate `workUnitTypes[]` entry matching `input.workUnitTypeKey`.
- Derive eligible transitions from that entry's `lifecycleTransitions[]` filtered by `currentState`:
  - `currentState` defaults to `"__absent__"`.
  - Treat `fromState` of `null`/`undefined`/`"__absent__"` as absent.
- Gate classes:
  - Emit only `start_gate` and `completion_gate` transitions (skip other values to preserve the eligibility contract).
- Workflow eligibility:
  - Use `transitionWorkflowBindings[transitionKey]` + `workflows[].key` from `definitionExtensions`.
  - Deterministically compute:
    - `NO_WORKFLOW_BOUND` if no binding exists.
    - `UNRESOLVED_WORKFLOW_BINDING` for bound keys missing from workflows.
    - `eligibleWorkflowKeys` as unique resolved bound keys, sorted.
    - `workflowSelectionRequired` when multiple eligible keys and not blocked.

Determinism requirements:
- Sort `eligibleTransitions` by `transitionKey`.
- Sort diagnostics by `code` then `observed` (match existing ordering).

### C) Router/Contract: No Changes
- File: `packages/api/src/routers/project.ts`
- Keep the current `baselinePreview` DTO shape.
- `baselinePreview.transitionPreview.transitions` will become `eligible` for setup transitions once eligibility fallback returns them.

## Acceptance Criteria
- Setup transition (e.g. `WU.SETUP:__absent____to__done`) appears in project transition preview as:
  - `status: "eligible"`
  - `statusReasonCode: "HAS_ALLOWED_WORKFLOW"`
  - workflows list includes seeded workflow key(s) and remains `enabled: false` with Epic 3+ rationale.
- Facts page (`/projects/$projectId/facts`) renders empty (no rows) for seeded preview.
- Agents page (`/projects/$projectId/agents`) renders a deterministic list of agent keys derived from seeded `agentTypes`.

## Risks / Guardrails
- Fallback must not activate when normalized lifecycle exists; normalized-first remains canonical.
- Seed-only fallback must not introduce new contract fields or runtime mutations.
- Skip unsupported gate classes in fallback to avoid invalid eligibility output.
