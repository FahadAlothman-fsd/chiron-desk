import { describe, expect, it } from "vitest";

import * as runtimeSchema from "../../schema/runtime";

const drizzleNameSymbol = Symbol.for("drizzle:Name");
const drizzleInlineForeignKeysSymbol = Symbol.for("drizzle:SQLiteInlineForeignKeys");

function getTableName(table: unknown): string {
  return (table as Record<symbol, string | undefined>)[drizzleNameSymbol] ?? "";
}

function getInlineForeignKey(table: unknown, index = 0) {
  return (
    table as Record<symbol, Array<{ reference: () => { foreignTable: unknown } }> | undefined>
  )[drizzleInlineForeignKeysSymbol]?.[index];
}

describe("l3 runtime invoke schema", () => {
  it("adds the invoke aggregate root and child tables", () => {
    expect(runtimeSchema.invokeStepExecutionState).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedFactInstance).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot).toBeDefined();
  });

  it("keeps the invoke root focused on step execution + invoke definition identity", () => {
    expect(runtimeSchema.invokeStepExecutionState.stepExecutionId).toBeDefined();
    expect(runtimeSchema.invokeStepExecutionState.invokeStepDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeStepExecutionState.createdAt).toBeDefined();
    expect(runtimeSchema.invokeStepExecutionState.updatedAt).toBeDefined();

    expect("targetKind" in runtimeSchema.invokeStepExecutionState).toBe(false);
    expect("sourceMode" in runtimeSchema.invokeStepExecutionState).toBe(false);

    const stepExecutionFk = getInlineForeignKey(runtimeSchema.invokeStepExecutionState, 0);
    const invokeDefinitionFk = getInlineForeignKey(runtimeSchema.invokeStepExecutionState, 1);

    expect(getTableName(stepExecutionFk?.reference().foreignTable)).toBe("step_executions");
    expect(getTableName(invokeDefinitionFk?.reference().foreignTable)).toBe(
      "methodology_workflow_invoke_steps",
    );
  });

  it("links workflow child rows to the invoke root and keeps resolutionOrder nullable", () => {
    expect(runtimeSchema.invokeWorkflowTargetExecution.invokeStepExecutionStateId).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution.workflowDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution.workflowExecutionId).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution.resolutionOrder).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution.createdAt).toBeDefined();
    expect(runtimeSchema.invokeWorkflowTargetExecution.updatedAt).toBeDefined();

    expect("stepExecutionId" in runtimeSchema.invokeWorkflowTargetExecution).toBe(false);
    expect(runtimeSchema.invokeWorkflowTargetExecution.resolutionOrder.notNull).toBe(false);

    const rootFk = getInlineForeignKey(runtimeSchema.invokeWorkflowTargetExecution, 0);
    const definitionFk = getInlineForeignKey(runtimeSchema.invokeWorkflowTargetExecution, 1);
    const executionFk = getInlineForeignKey(runtimeSchema.invokeWorkflowTargetExecution, 2);

    expect(getTableName(rootFk?.reference().foreignTable)).toBe("invoke_step_execution_state");
    expect(getTableName(definitionFk?.reference().foreignTable)).toBe("methodology_workflows");
    expect(getTableName(executionFk?.reference().foreignTable)).toBe("workflow_executions");
  });

  it("links work-unit child rows to the invoke root instead of generic step executions", () => {
    expect(runtimeSchema.invokeWorkUnitTargetExecution.invokeStepExecutionStateId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.projectWorkUnitId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.workUnitDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.transitionDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.transitionExecutionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.workflowDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.workflowExecutionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.createdAt).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitTargetExecution.updatedAt).toBeDefined();

    expect("stepExecutionId" in runtimeSchema.invokeWorkUnitTargetExecution).toBe(false);

    const rootFk = getInlineForeignKey(runtimeSchema.invokeWorkUnitTargetExecution, 0);
    const projectWorkUnitFk = getInlineForeignKey(runtimeSchema.invokeWorkUnitTargetExecution, 1);
    const workUnitDefinitionFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitTargetExecution,
      2,
    );
    const transitionDefinitionFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitTargetExecution,
      3,
    );
    const transitionExecutionFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitTargetExecution,
      4,
    );
    const workflowDefinitionFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitTargetExecution,
      5,
    );
    const workflowExecutionFk = getInlineForeignKey(runtimeSchema.invokeWorkUnitTargetExecution, 6);

    expect(getTableName(rootFk?.reference().foreignTable)).toBe("invoke_step_execution_state");
    expect(getTableName(projectWorkUnitFk?.reference().foreignTable)).toBe("project_work_units");
    expect(getTableName(workUnitDefinitionFk?.reference().foreignTable)).toBe(
      "methodology_work_unit_types",
    );
    expect(getTableName(transitionDefinitionFk?.reference().foreignTable)).toBe(
      "work_unit_lifecycle_transitions",
    );
    expect(getTableName(transitionExecutionFk?.reference().foreignTable)).toBe(
      "transition_executions",
    );
    expect(getTableName(workflowDefinitionFk?.reference().foreignTable)).toBe(
      "methodology_workflows",
    );
    expect(getTableName(workflowExecutionFk?.reference().foreignTable)).toBe("workflow_executions");
  });

  it("adds mapping rows for created fact instances and artifact snapshots", () => {
    expect(
      runtimeSchema.invokeWorkUnitCreatedFactInstance.invokeWorkUnitTargetExecutionId,
    ).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedFactInstance.factDefinitionId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedFactInstance.workUnitFactInstanceId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedFactInstance.createdAt).toBeDefined();

    expect(
      runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot.invokeWorkUnitTargetExecutionId,
    ).toBeDefined();
    expect(
      runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot.artifactSlotDefinitionId,
    ).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot.artifactSnapshotId).toBeDefined();
    expect(runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot.createdAt).toBeDefined();

    const factTargetFk = getInlineForeignKey(runtimeSchema.invokeWorkUnitCreatedFactInstance, 0);
    const factDefinitionFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitCreatedFactInstance,
      1,
    );
    const factInstanceFk = getInlineForeignKey(runtimeSchema.invokeWorkUnitCreatedFactInstance, 2);
    const artifactTargetFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot,
      0,
    );
    const artifactSlotFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot,
      1,
    );
    const artifactSnapshotFk = getInlineForeignKey(
      runtimeSchema.invokeWorkUnitCreatedArtifactSnapshot,
      2,
    );

    expect(getTableName(factTargetFk?.reference().foreignTable)).toBe(
      "invoke_work_unit_target_execution",
    );
    expect(getTableName(factDefinitionFk?.reference().foreignTable)).toBe(
      "work_unit_fact_definitions",
    );
    expect(getTableName(factInstanceFk?.reference().foreignTable)).toBe("work_unit_fact_instances");
    expect(getTableName(artifactTargetFk?.reference().foreignTable)).toBe(
      "invoke_work_unit_target_execution",
    );
    expect(getTableName(artifactSlotFk?.reference().foreignTable)).toBe(
      "methodology_artifact_slot_definitions",
    );
    expect(getTableName(artifactSnapshotFk?.reference().foreignTable)).toBe(
      "project_artifact_snapshots",
    );
  });
});
