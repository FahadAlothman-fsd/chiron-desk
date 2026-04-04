# Draft: L3 Slice 1 Implementation Triage

## Main Objective (locked)
- Do **not** let triage collapse into cleanup-only work.
- The real target remains:
  - **FULL CRUD FOR CONTEXT FACTS IN THE WORKFLOW EDITOR**
  - **FULL FORM CRUD AND RUNTIME FEATURES**
- Therefore triage must classify current implementation into:
  1. keep as reusable foundation
  2. patch in place where the model is wrong/incomplete
  3. delete/replace where the implementation drifted in the wrong conceptual direction

## Repo State Snapshot
- Branch: `feat/effect-migration` ahead of remote by 2 commits.
- Slice-1 implementation work is mixed with planning artifacts and some unrelated desktop/server/package churn.
- Current git status includes both tracked modifications and many untracked slice-1 files.

## KEEP AS-IS — good and aligned
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx` — keep route identity and overall editor entry point; patch internals later if needed, but keep explicit `workflowDefinitionId` route.
- `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx` — keep workflow launch wiring to explicit editor route.
- `apps/web/src/features/workflow-editor/step-types-grid.tsx` — keep Form-only enablement and deferred/disabled later-step tiles.
- `apps/web/src/features/workflow-editor/step-list-inspector.tsx` — keep the list/inspector replacement seam; patch presentation details only.
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` — keep the shell, left-rail layout seam, React Flow canvas seam, and one-outgoing-edge guard.
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` — keep workflow execution detail as the explicit first-step activation surface.
- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` — keep the dedicated runtime step-detail route and tabbed shape.
- `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts` — keep the backend one-outgoing-edge invariant seam.
- `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts` — keep explicit/idempotent first-step activation seam.
- `packages/workflow-engine/src/services/step-execution-detail-service.ts` — keep step-detail read-model seam and tab-based structure.
- `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts` — keep as shared runtime foundation.
- `packages/workflow-engine/src/services/step-progression-service.ts` — keep as shared runtime foundation, but patch behavior if needed.
- `packages/workflow-engine/src/services/step-context-query-service.ts` — keep as shared runtime foundation.
- `packages/workflow-engine/src/services/step-context-mutation-service.ts` — keep as shared runtime foundation.
- `packages/workflow-engine/src/services/step-execution-transaction-service.ts` — keep transaction seam; patch semantics instead of replacing seam.
- `packages/db/src/runtime-repositories/step-execution-repository.ts` — keep runtime repo seam.
- `packages/db/src/schema/runtime.ts` additions for `step_executions`, `form_step_execution_state`, `workflow_execution_context_facts` — keep table direction.
- `packages/db/src/schema/methodology.ts` additions for typed Form/context-fact tables — keep typed-table direction.
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts` — keep demo-fixture concept and file as the non-baseline slice-1 seed path.

## PATCH IN PLACE — real code exists but model/spec is now wrong or incomplete
- `apps/web/src/features/workflow-editor/dialogs.tsx` — patch heavily: remove Form `Context Facts` tab, add `Guidance`, implement real field-binding CRUD, context-fact-first semantics, dirty indicators, scroll-region behavior.
- `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx` — patch context-fact definition list into full CRUD surface (create/edit/delete, row-click edit, destructive delete flow, content-sized sections, scroll regions, remove debug-ish affordances if still present).
- `apps/web/src/routes/projects.new.tsx` — keep UI, patch validation/copy only if needed; backend persistence must catch up.
- `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx` — patch compact step summary + activation/result state so it does not feel half-deferred after activation.
- `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx` — patch tab contents and wording to match refined meanings of submission/progression/context writes/authoritative writes/context-fact semantics.
- `apps/web/src/routes/projects.$projectId.facts.tsx` — patch project-fact list UX to make manual project-fact authoring practical and explicit.
- `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx` — patch guidance/copy and any missing affordances, but keep route and mutation structure.
- `packages/contracts/src/methodology/workflow.ts` — patch Form payload and context-fact contracts to reflect context-fact-first ownership, refined kind semantics, removal/deferment decisions, and field-binding rules.
- `packages/api/src/routers/methodology.ts` — patch payload schemas and procedure behavior to stop encoding the stale “Form owns context facts” model.
- `packages/methodology-engine/src/services/form-step-definition-service.ts` — patch to follow field-binding-over-context-fact-definition model.
- `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts` — patch to follow refined `Contract` / `Value Semantics` / `Guidance` ownership.
- `packages/methodology-engine/src/services/workflow-editor-definition-service.ts` — patch read model to surface refined context-fact and Form authoring needs cleanly.
- `packages/workflow-engine/src/services/form-step-execution-service.ts` — patch away from key-prefix shortcuts (`project.*`) toward true context-fact-definition-driven behavior.
- `packages/workflow-engine/src/services/step-progression-service.ts` / `step-execution-transaction-service.ts` — patch if later-step deferred/default semantics are currently too eager.
- `packages/api/src/routers/project.ts` — patch to actually accept and persist `projectRootPath`.
- `packages/project-context` service/repo seams (not yet fully inspected in detail here, but implicated by project create flow) — patch to propagate `projectRootPath` end-to-end.
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts` — patch fixture contents to match the refined context-fact model once finalized.
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts` — patch expectations to match refined fixture design.

## DELETE / REPLACE — drifted in the wrong conceptual direction
- `packages/contracts/src/shared/invariants.ts` entry `SetupTags` — remove from shared invariants and replace with slice-1-local contract placement.
- Any Form contract shape that treats workflow context-fact definitions as inline-owned by the Form (`FormStepPayload.contextFacts` or equivalent) — replace with workflow-level context-fact definitions + Form field bindings.
- Form-dialog `Context Facts` tab in `apps/web/src/features/workflow-editor/dialogs.tsx` — remove entirely; replace with workflow-level context-fact CRUD surface.
- `work_unit_reference_fact` in current slice-1 refinement/testing scope — remove from active slice-1 expectations/examples unless a later explicit reintroduction is approved.
- Any stale free-standing `inputKind` field/enum shaping Form behavior — remove/replace with behavior derived from linked context-fact definition.
- Any debug/test-only editor affordances that distort canonical UX (for example quick-connect/duplicate-edge controls if still exposed in normal editor UI) — remove from the user-facing authoring surface.

## Commit Triage — what is the “good shit” worth committing

### Commit now / keep staged (foundation worth preserving)
- Workflow-editor route and launch wiring:
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.tsx`
  - `apps/web/src/routes/methodologies.$methodologyId.versions.$versionId.work-units.$workUnitKey.workflow-editor.$workflowDefinitionId.tsx`
- Workflow-editor shell foundations:
  - `apps/web/src/features/workflow-editor/workflow-editor-shell.tsx`
  - `apps/web/src/features/workflow-editor/step-types-grid.tsx`
  - `apps/web/src/features/workflow-editor/step-list-inspector.tsx`
  - visual assets under `apps/web/public/visuals/workflow-editor/`
- Runtime route foundations:
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`
- Step-core backend foundations:
  - `packages/workflow-engine/src/services/workflow-execution-step-command-service.ts`
  - `packages/workflow-engine/src/services/step-execution-detail-service.ts`
  - `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`
  - `packages/workflow-engine/src/services/step-progression-service.ts`
  - `packages/workflow-engine/src/services/step-context-query-service.ts`
  - `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - `packages/workflow-engine/src/services/step-execution-transaction-service.ts`
  - `packages/workflow-engine/src/repositories/step-execution-repository.ts`
- Methodology-engine authoring foundations:
  - `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
  - `packages/methodology-engine/src/services/workflow-editor-definition-service.ts`
  - `packages/methodology-engine/src/services/form-step-definition-service.ts`
  - `packages/methodology-engine/src/services/workflow-context-fact-definition-service.ts`
  - `packages/methodology-engine/src/services/workflow-authoring-transaction-service.ts`
- DB table/repository foundations:
  - typed methodology schema changes
  - runtime schema changes
  - `packages/db/src/runtime-repositories/step-execution-repository.ts`
- API/runtime procedure foundations:
  - `packages/api/src/routers/project-runtime.ts`
  - slice-1 router tests that validate the new procedure surface

### Keep unstaged or commit separately only after patching
- `apps/web/src/features/workflow-editor/dialogs.tsx` — too central and currently conceptually wrong; do not bless it unchanged.
- `packages/contracts/src/methodology/workflow.ts` — do not freeze until the context-fact-first model is corrected.
- `packages/api/src/routers/methodology.ts` — tightly coupled to the stale form/context-fact payload model; patch before blessing.
- `packages/workflow-engine/src/services/form-step-execution-service.ts` — patch semantics before blessing.
- `packages/contracts/src/shared/invariants.ts` — remove/relocate `SetupTags` before blessing.
- `packages/scripts/src/seed/methodology/setup/slice-1-demo-fixture.ts` — patch once refined fixture content is final.
- `packages/scripts/src/tests/seeding/l3-slice-1-demo-fixture.test.ts` — patch alongside fixture.
- `apps/web/src/routes/projects.new.tsx` plus `packages/api/src/routers/project.ts` — treat as one end-to-end patch set; do not separately bless half the flow.

### Keep out of slice-1 commit grouping / likely separate or unrelated
- `apps/desktop/**` changes
- `apps/server/src/index.ts` / server package churn unless directly required by slice-1
- package manifest churn not directly required by the slice objective
- `.sisyphus/evidence/**`, `.sisyphus/notepads/**`, snapshots like `page-snapshot.md`, `workflows-snapshot.md`

## Guidance For The Next Planning Move
- The next plan should not be a cleanup-only plan.
- It should be a **slice-1 implementation-correction plan** whose core workstreams are:
  1. finish/repair workflow-editor context-fact CRUD
  2. finish/repair Form CRUD and runtime behavior
  3. preserve good shared foundations already implemented
  4. explicitly delete/replace the stale ownership model where needed
