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

describe("l3 agent-step runtime schema", () => {
  it("adds the runtime state, harness binding, and applied-writes tables", () => {
    expect(runtimeSchema.agentStepExecutionState).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites).toBeDefined();

    expect("agentStepExecutionMessages" in runtimeSchema).toBe(false);
    expect("agentStepExecutionEventLog" in runtimeSchema).toBe(false);
  });

  it("keeps chiron-owned execution state separate from harness binding data", () => {
    expect(runtimeSchema.agentStepExecutionState.stepExecutionId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionState.state).toBeDefined();
    expect(runtimeSchema.agentStepExecutionState.bootstrapAppliedAt).toBeDefined();
    expect(runtimeSchema.agentStepExecutionState.createdAt).toBeDefined();
    expect(runtimeSchema.agentStepExecutionState.updatedAt).toBeDefined();

    expect("sessionId" in runtimeSchema.agentStepExecutionState).toBe(false);
    expect("serverInstanceId" in runtimeSchema.agentStepExecutionState).toBe(false);

    const foreignKey = getInlineForeignKey(runtimeSchema.agentStepExecutionState);
    expect(getTableName(foreignKey?.reference().foreignTable)).toBe("step_executions");
  });

  it("stores harness session binding data without mixing in chiron runtime state", () => {
    expect(runtimeSchema.agentStepExecutionHarnessBinding.stepExecutionId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.harnessId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.bindingState).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.sessionId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.serverInstanceId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.serverBaseUrl).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.selectedAgentKey).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.selectedModelJson).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.createdAt).toBeDefined();
    expect(runtimeSchema.agentStepExecutionHarnessBinding.updatedAt).toBeDefined();

    expect("state" in runtimeSchema.agentStepExecutionHarnessBinding).toBe(false);
    expect("bootstrapAppliedAt" in runtimeSchema.agentStepExecutionHarnessBinding).toBe(false);

    const foreignKey = getInlineForeignKey(runtimeSchema.agentStepExecutionHarnessBinding);
    expect(getTableName(foreignKey?.reference().foreignTable)).toBe("step_executions");
  });

  it("stores only successful applied write history rows scoped to the step execution", () => {
    expect(runtimeSchema.agentStepExecutionAppliedWrites.stepExecutionId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.writeItemId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.contextFactDefinitionId).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.contextFactKind).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.instanceOrder).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.appliedValueJson).toBeDefined();
    expect(runtimeSchema.agentStepExecutionAppliedWrites.createdAt).toBeDefined();

    expect("status" in runtimeSchema.agentStepExecutionAppliedWrites).toBe(false);
    expect("rejectedReason" in runtimeSchema.agentStepExecutionAppliedWrites).toBe(false);

    const foreignKey = getInlineForeignKey(runtimeSchema.agentStepExecutionAppliedWrites);
    expect(getTableName(foreignKey?.reference().foreignTable)).toBe("step_executions");
  });
});
