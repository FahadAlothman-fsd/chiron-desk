# F4 Scope Fidelity — Anti-Scope-Creep Validation

## Verdict

**❌ REJECT**

## Scope fidelity findings

### 1) Non-Form runtime commands / later-step runtime work

- ✅ `project-runtime` router only adds Form-step runtime procedures:
  - `activateFirstWorkflowStepExecution`
  - `getRuntimeStepExecutionDetail`
  - `saveFormStepDraft`
  - `submitFormStep`
  - File: `packages/api/src/routers/project-runtime.ts`
- ✅ `workflow-engine` command path explicitly enforces Form-only runtime submissions:
  - `if (step.stepType !== "form") ... "runtime commands are Form-only in slice-1"`
  - File: `packages/workflow-engine/src/services/form-step-execution-service.ts`
- ✅ No accidental runtime command procedures found for Agent/Action/Invoke/Branch/Display.

### 2) Branch conditions / branching implementation

- ✅ No branch execution command logic was added.
- ✅ Edge mutation keeps condition payload deferred (`condition: null`) and enforces single outgoing edge slice rule.
  - File: `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
- ✅ No evidence of Branch runtime command handlers in changed runtime services.

### 3) Shared step core slice-agnostic

- ✅ Shared core services are step-type agnostic where expected:
  - `StepExecutionLifecycleService` (`stepType: string`)
  - `StepProgressionService` (graph/topology traversal)
  - `StepExecutionTransactionService` (lifecycle + context + progression orchestration)
  - Files under: `packages/workflow-engine/src/services/step-*.ts`
- ✅ Form-specific behavior is isolated to Form service/commands (`FormStepExecutionService`).

### 4) Manual authoring scope

- ✅ Manual authoring is explicitly constrained to project fact detail UI.
  - `Manual authoring (project facts only)` appears in:
    - `apps/web/src/routes/projects.$projectId.facts.$factDefinitionId.tsx`
- ✅ Project-fact mutation actions (`add/set/replace`) found only on project fact detail route (plus tests), not workflow/step runtime pages.

### 5) projectRootPath create-project changes

- ✅ Present in contracts:
  - `projectRootPath` added to `CreateAndPinProjectInput`
  - File: `packages/contracts/src/project/project.ts`
- ✅ Present in web create-project UX and tests:
  - input, normalization, validation, payload mapping
  - Files:
    - `apps/web/src/routes/projects.new.tsx`
    - `apps/web/src/tests/routes/projects.new.integration.test.tsx`
- ❌ **Missing in API create-and-pin router input + handling**:
  - `createAndPinProjectInput` in `packages/api/src/routers/project.ts` does not accept `projectRootPath`
  - `createProject(...)` invocation does not forward `projectRootPath`

## Why this is REJECT

The anti-scope-creep checks pass (no accidental Branch/Display/Action/Invoke/Agent runtime implementation, manual authoring remains project-fact-only, shared step core remains slice-agnostic). However, the required `projectRootPath` create-project change is incomplete end-to-end at API boundary.

Given MUST-DO included confirming `projectRootPath` create-project changes are present, this validation cannot approve.

**Final: REJECT**.
