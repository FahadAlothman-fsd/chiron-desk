# F4 Scope Fidelity Check — L3 Implementation (Round 2)

## Verdict

**REJECT**

## Blocking Check from Round 1

### 1) Deferred mode placeholder removed?
- **FAIL** — deferred placeholder is still present.
- Evidence:
  - `packages/workflow-engine/src/services/workflow-execution-detail-service.ts:136`
    - `mode: "deferred"`
  - `packages/workflow-engine/src/services/workflow-execution-detail-service.ts:137`
    - `"Workflow step runtime details are coming later in the L3 slice."`

Because this blocking issue remains, the scope-fidelity gate does not pass.

---

## Deferred-Scope Exclusion Checks

### No seed-data authoring
- PASS — no `seed`/`authoring` matches in:
  - `packages/methodology-engine/src/services/*.ts`
  - `packages/workflow-engine/src/services/*.ts`

### No human-in-the-loop Agent review / deferred waiting
- **FAIL** — deferred waiting placeholder still emitted in workflow execution detail service (see blocking check above).

### No pause/resume/cancel lifecycle expansion
- PASS — no `pause|paused|resume|resumed|cancel|cancelled|canceled|timed_out|aborted` in runtime schema.
- Runtime statuses remain scoped:
  - `packages/db/src/schema/runtime.ts:94` → workflow execution status enum: `active | completed | superseded | parent_superseded`
  - `packages/db/src/schema/runtime.ts:136` → step execution state enum: `active | completed | failed | superseded`

### No generic interaction logging
- PASS — no `interaction_log`, `event_log`, or `agent_events` matches in `*.ts`/`*.sql` across repository.

### No step segments table
- PASS — no `agent_step_execution_segments`, `step_segments`, or `execution_segments` matches in DB runtime schema.

### No automatic first-step creation
- PASS — transition start path creates transition + workflow execution only:
  - `packages/workflow-engine/src/services/transition-execution-command-service.ts:359-368`
- Explicit activation source constraint remains:
  - `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts:75`
    - activation allowed only for `"workflow_execution_page"` in that path.

### No shared-server multi-step MCP config
- PASS — OpenCode adapter remains one-instance-per-step:
  - `packages/agent-runtime/src/opencode/opencode-session-service.ts:254`
    - `instancesByStep` map keyed by `stepExecutionId`
  - `packages/agent-runtime/src/opencode/opencode-session-service.ts:290-293`
    - reuses existing instance only for same `stepExecutionId`
  - `packages/agent-runtime/src/opencode/opencode-session-service.ts:306-308`
    - server created with that `stepExecutionId`
  - `packages/agent-runtime/src/opencode/opencode-mcp-config-service.ts:41-49`
    - config generated per `stepExecutionId`

### No non-typed generic `saveWorkflowStep`
- PASS — no `saveWorkflowStep` in production router.
- Typed procedures present in design-time router:
  - `saveFormStep`, `saveAgentStep`, `saveActionStep`, `saveInvokeStep`, `saveBranchStep`, `saveDisplayStep`
  - evidence in `packages/api/src/routers/l3-design-time-router.ts:364-445`

---

## Required-Scope Inclusion Checks

### All six step types present
- PASS — `packages/db/src/schema/runtime.ts:134`
  - `form`, `agent`, `action`, `invoke`, `branch`, `display`

### Workflow-centric design-time services present
- PASS:
  - `packages/methodology-engine/src/services/workflow-editor-read-service.ts`
  - `packages/methodology-engine/src/services/workflow-step-mutation-service.ts`
  - `packages/methodology-engine/src/services/workflow-topology-mutation-service.ts`
  - `packages/methodology-engine/src/services/step-definition-resolver-service.ts`
  - `packages/methodology-engine/src/services/typed-step-services.ts`

### Execution-centric runtime services present
- PASS:
  - `packages/workflow-engine/src/services/step-execution-lifecycle-service.ts`
  - `packages/workflow-engine/src/services/step-progression-service.ts`
  - `packages/workflow-engine/src/services/step-context-query-service.ts`
  - `packages/workflow-engine/src/services/step-context-mutation-service.ts`
  - `packages/workflow-engine/src/services/form-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/agent-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/action-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/invoke-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/branch-step-runtime-service.ts`
  - `packages/workflow-engine/src/services/display-step-runtime-service.ts`

### Shared context/lifecycle/progression boundaries present
- PASS:
  - Context: `step-context-query-service.ts`, `step-context-mutation-service.ts`
  - Lifecycle/progression: `step-execution-lifecycle-service.ts`, `step-progression-service.ts`

### Harness-agnostic Agent runtime present
- PASS — harness abstraction surface present:
  - `packages/agent-runtime/src/harness/harness-catalog-service.ts`
  - `packages/agent-runtime/src/harness/harness-instance-service.ts`
  - `packages/agent-runtime/src/harness/harness-session-service.ts`
  - `packages/agent-runtime/src/harness/harness-activity-stream-service.ts`
  - `packages/agent-runtime/src/harness/harness-messaging-service.ts`
  - `packages/agent-runtime/src/harness/harness-mcp-binding-service.ts`
  - `packages/agent-runtime/src/harness/harness-tool-observation-service.ts`

### OpenCode adapter with one server per step
- PASS — see `instancesByStep` + `stepExecutionId` evidence above.

### Thin API procedures present
- PASS:
  - Design-time router delegates to services (`WorkflowStepMutationService`, typed step design services):
    - `packages/api/src/routers/l3-design-time-router.ts:332-455`
  - Runtime router delegates to runtime services (`StepExecutionLifecycleService`, `FormStepRuntimeService`, etc.):
    - `packages/api/src/routers/l3-runtime-router.ts:246-449`

### Web surfaces present
- PASS:
  - `apps/web/src/routes/projects.$projectId.workflow-editor.tsx`
  - `apps/web/src/routes/projects.$projectId.workflow-executions.$workflowExecutionId.tsx`
  - `apps/web/src/routes/projects.$projectId.step-executions.$stepExecutionId.tsx`

---

## Final Decision

Round 2 remains **REJECT**. The prior blocking issue is **not fixed** because deferred mode/waiting placeholder output is still present in `workflow-execution-detail-service.ts`.
