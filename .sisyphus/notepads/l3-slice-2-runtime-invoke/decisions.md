# Decisions - L3 Slice 2 Runtime Invoke

## Architecture Decisions

### Aggregate Root Structure
- `invoke_step_execution_state` is the root aggregate
- Child rows (`invoke_workflow_target_execution`, `invoke_work_unit_target_execution`) link to root
- Mapping tables (`invoke_work_unit_created_fact_instance`, `invoke_work_unit_created_artifact_snapshot`) link to work-unit child rows

### Service Boundaries
- `InvokeTargetResolutionService`: resolves and deduplicates targets from `fixed_set` or `context_fact_backed`
- `InvokeWorkflowExecutionService`: materializes workflow child rows on activation
- `InvokeWorkUnitExecutionService`: materializes work-unit child rows + transactional entity creation
- `InvokeCompletionService`: completion eligibility checks + orchestrates completion
- `InvokePropagationService`: writes context-fact outputs on completion only
- `InvokeStepDetailService`: assembles invoke step detail body

### Transaction Boundaries
- Work-unit child start is one transaction creating:
  - projectWorkUnit
  - initial workUnitFactInstances
  - initial projectArtifactSnapshots
  - mapping rows
  - transitionExecution
  - workflowExecution
  - Updates invoke child row

### 2026-04-14 Compliance Rerun Decision
- Approve the L3 Slice 2 Runtime Invoke implementation as plan-compliant after re-verifying the two previously reported defects and the remaining invoke-only scope constraints.
- Treat `startInvokeWorkflowTargetAtomically(...)` and `startInvokeWorkUnitTargetAtomically(...)` as the required start boundaries for future maintenance; child-start correctness depends on keeping creation+linking inside those repository seams.
