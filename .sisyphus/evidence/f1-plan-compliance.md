# F1 Plan Compliance Audit — l3-slice-1-step-core-and-form

Date: 2026-04-03
Plan: `.sisyphus/plans/l3-slice-1-step-core-and-form.md`

## Scope Matrix (Locked Items vs Implemented)

| Locked scope item | Expected by plan | Observed implementation | Status |
|---|---|---|---|
| Workflow editor route with explicit `workflowDefinitionId` | `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx` | Route exists at exact path and reads `workflowDefinitionId` from params | ✅ Present |
| Runtime step-execution detail route | `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` | Route exists with tabbed layout (`Submission & Progression`, `Writes`, `Context Fact Semantics`) and semantics copy | ✅ Present |
| Methodology router Form/editor procedures | `getEditorDefinition`, `updateWorkflowMetadata`, Form step CRUD, edge CRUD, context fact CRUD | Procedures exist in `packages/api/src/routers/methodology.ts` | ✅ Present |
| Runtime router Form commands only | `activateFirstWorkflowStepExecution`, `getRuntimeStepExecutionDetail`, `saveFormStepDraft`, `submitFormStep` | Present in `packages/api/src/routers/project-runtime.ts`; no additional non-Form runtime step commands found | ✅ Present |
| One-outgoing-edge invariant (UI + backend) | Guard in editor UI and service-level enforcement | UI guard in `workflow-editor-shell.tsx`; backend guard in `workflow-topology-mutation-service.ts` | ✅ Present |
| Form-only tiles + deferred other step types | Only Form enabled, Agent/Action/Invoke/Branch/Display deferred/disabled | `step-types-grid.tsx` enables only Form; deferred read models covered in contracts + architecture test | ✅ Present |
| Runtime schema core tables | `step_executions`, `form_step_execution_state`, `workflow_execution_context_facts` | Present in `packages/db/src/schema/runtime.ts` | ✅ Present |
| Design-time typed Form/context-fact tables | Form tables + context-fact kind tables | Present in `packages/db/src/schema/methodology.ts` | ✅ Present (with naming drift for draft-spec tables) |
| Baseline seed + separate slice-1 demo fixture | Baseline remains zero steps/edges; demo is deterministic Form->Form | Seed tests exist and assert zero baseline + demo two form steps/one edge | ✅ Present |
| First-step activation semantics | Explicit action only, idempotent, not auto-created on start/retry | Explicit activation command/service exists and checks existing step before create; no non-explicit activation command found | ✅ Present |
| Project root path persistence | `projectRootPath` accepted by create-and-pin contract and persisted to `projects.project_root_path` | UI collects/sends path, contracts include optional field, but API router input does not include `projectRootPath` and service create path does not persist it | ❌ **Missing (critical)** |

## Excluded Scope Checks (Must NOT Have)

| Excluded item | Observation | Status |
|---|---|---|
| Runtime commands for Agent/Action/Invoke/Branch/Display | No such command procedures found in runtime router; architecture test enforces Form-only runtime command set | ✅ Deferred respected |
| Branch condition authoring/evaluation in slice-1 | Edge mutations force `condition: null`; no branch runtime commands added | ✅ Deferred respected |
| Generic `saveWorkflowStep` API | No matches found for `saveWorkflowStep` | ✅ Deferred respected |
| Non-project manual fact authoring UI | Project fact detail page explicitly scopes manual authoring to project facts only; workflow/step pages do not expose project-fact mutation controls | ✅ Deferred respected |
| Auto first-step creation during transition/workflow start | Explicit first-step activation command exists; no start/retry command path invoking activation found | ✅ Deferred respected |

## Critical Divergences

1. **`projectRootPath` persistence requirement is not implemented end-to-end (blocking).**
   - Plan requirement: persist `projectRootPath` through `createAndPinProject` into `projects.project_root_path`.
   - Observed:
     - UI captures and sends `projectRootPath` (`apps/web/src/routes/projects.new.tsx`).
     - Contract allows it (`packages/contracts/src/project/project.ts`).
     - But API input omits it (`packages/api/src/routers/project.ts`, `createAndPinProjectInput` only has methodology/version/name).
     - Project creation service call path does not carry it (`packages/project-context/src/service.ts` `createProject(projectId, name?)`).

2. **Contract invariant drift for `setup_tags` placement (blocking against frozen plan).**
   - Plan requirement: keep `setup_tags` schema in a slice-1-specific contract/module, not global shared invariants.
   - Observed:
     - `SetupTags` defined in global `packages/contracts/src/shared/invariants.ts` and imported by slice-1 contract test.

3. **Workflow editor mutation wiring appears inconsistent with new procedure contracts (blocking risk).**
   - Router procedures require `versionId` + `workUnitTypeKey` + `workflowDefinitionId` (and `payload` for metadata update).
   - Editor route mutation calls pass partial/legacy-shaped payloads (e.g., create/update form/edge calls omit `versionId` and `workUnitTypeKey`; metadata save sends `workflow` object shape rather than `{ payload }`).
   - Locations:
     - Caller: `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
     - Procedure contracts: `packages/api/src/routers/methodology.ts`

## Non-blocking Notes

- Draft-spec table names differ from the exact inventory wording in plan (`..._draft_specs` vs `..._work_unit_draft_specs`), while functionality appears present.

## Verdict

**REJECT**

Reason: critical locked-scope requirements are not fully met (notably `projectRootPath` persistence), and there are blocking contract/wiring divergences versus the frozen slice-1 plan.
