import { describe, expect, it } from "vitest";

import * as methodologySchema from "../../schema/methodology";

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

describe("l3 agent-step design schema", () => {
  it("adds the locked agent-step child row to workflow steps", () => {
    expect(methodologySchema.methodologyWorkflowAgentSteps.stepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.objective).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.instructionsMarkdown).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.harness).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.agentKey).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.modelJson).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowAgentSteps.completionRequirementsJson,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.sessionStart).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.continuationMode).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.liveStreamCount).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.bootstrapPromptNoReply).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.nativeMessageLog).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentSteps.persistedWritePolicy).toBeDefined();

    const foreignKey = getInlineForeignKey(methodologySchema.methodologyWorkflowAgentSteps);
    expect(foreignKey).toBeDefined();
    if (!foreignKey) {
      throw new Error("Expected methodologyWorkflowAgentSteps.stepId foreign key");
    }

    expect(getTableName(foreignKey.reference().foreignTable)).toBe("methodology_workflow_steps");
  });

  it("persists only explicit reads without inferred or mode flags", () => {
    expect(
      methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants.agentStepId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants.contextFactDefinitionId,
    ).toBeDefined();

    expect("inferredRead" in methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants).toBe(
      false,
    );
    expect("readMode" in methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants).toBe(
      false,
    );
    expect("methodologyWorkflowAgentStepInferredReadGrants" in methodologySchema).toBe(false);

    const stepForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants,
    );
    const factForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepExplicitReadGrants,
      1,
    );

    expect(getTableName(stepForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_agent_steps",
    );
    expect(getTableName(factForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
  });

  it("stores one write card per context fact with requirement dependencies by fact definition", () => {
    expect(methodologySchema.methodologyWorkflowAgentStepWriteItems.agentStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentStepWriteItems.writeItemId).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowAgentStepWriteItems.contextFactDefinitionId,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentStepWriteItems.contextFactKind).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentStepWriteItems.label).toBeDefined();
    expect(methodologySchema.methodologyWorkflowAgentStepWriteItems.sortOrder).toBeDefined();

    expect(
      methodologySchema.methodologyWorkflowAgentStepWriteItemRequirements.writeItemRowId,
    ).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowAgentStepWriteItemRequirements.contextFactDefinitionId,
    ).toBeDefined();
    expect(
      "requiredWriteItemId" in methodologySchema.methodologyWorkflowAgentStepWriteItemRequirements,
    ).toBe(false);

    const writeItemStepForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepWriteItems,
    );
    const writeItemFactForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepWriteItems,
      1,
    );
    const requirementWriteItemForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepWriteItemRequirements,
    );
    const requirementFactForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowAgentStepWriteItemRequirements,
      1,
    );

    expect(getTableName(writeItemStepForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_agent_steps",
    );
    expect(getTableName(writeItemFactForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
    expect(getTableName(requirementWriteItemForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_agent_step_write_items",
    );
    expect(getTableName(requirementFactForeignKey?.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
  });
});
