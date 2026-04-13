import { describe, expect, it } from "vitest";

import { WORKFLOW_CONTEXT_FACT_KINDS } from "../../../../contracts/src/methodology/workflow";
import * as methodologySchema from "../../schema/methodology";
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

describe("l3 slice-1 schema", () => {
  it("removes the typed form parent table and points form fields at workflow steps", () => {
    expect("methodologyWorkflowFormSteps" in methodologySchema).toBe(false);

    expect(methodologySchema.methodologyWorkflowFormFields.id).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.formStepId).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.key).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.label).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.valueType).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.required).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.inputJson).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.descriptionJson).toBeDefined();
    expect(methodologySchema.methodologyWorkflowFormFields.sortOrder).toBeDefined();

    const formFieldForeignKey = getInlineForeignKey(
      methodologySchema.methodologyWorkflowFormFields,
    );
    expect(formFieldForeignKey).toBeDefined();
    if (!formFieldForeignKey) {
      throw new Error("Expected methodologyWorkflowFormFields.formStepId foreign key");
    }
    const formFieldReference = formFieldForeignKey.reference();

    expect(getTableName(formFieldReference.foreignTable)).toBe("methodology_workflow_steps");
  });

  it("keeps context-fact contract and guidance ownership on the root definition row", () => {
    expect(methodologySchema.methodologyWorkflowContextFactDefinitions.factKey).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDefinitions.factKind).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDefinitions.label).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDefinitions.descriptionJson,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDefinitions.cardinality).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDefinitions.guidanceJson).toBeDefined();
  });

  it("supports exactly the six active workflow context-fact kinds", () => {
    expect(WORKFLOW_CONTEXT_FACT_KINDS).toHaveLength(6);
    expect(WORKFLOW_CONTEXT_FACT_KINDS).toEqual([
      "plain_value_fact",
      "definition_backed_external_fact",
      "bound_external_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ]);

    expect(methodologySchema.methodologyWorkflowContextFactPlainValues).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactPlainValues.validationJson,
    ).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactExternalBindings).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactWorkflowReferences).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactArtifactReferences).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDraftSpecs).toBeDefined();
    expect(methodologySchema.methodologyWorkflowContextFactDraftSpecFields).toBeDefined();
    expect(
      methodologySchema.methodologyWorkflowContextFactDraftSpecFields.workUnitFactDefinitionId,
    ).toBeDefined();
    expect("fieldKey" in methodologySchema.methodologyWorkflowContextFactDraftSpecFields).toBe(
      false,
    );
    expect("valueType" in methodologySchema.methodologyWorkflowContextFactDraftSpecFields).toBe(
      false,
    );
    expect("required" in methodologySchema.methodologyWorkflowContextFactDraftSpecFields).toBe(
      false,
    );
    expect(
      "descriptionJson" in methodologySchema.methodologyWorkflowContextFactDraftSpecFields,
    ).toBe(false);
    expect("methodologyWorkflowContextFactWorkUnitReferences" in methodologySchema).toBe(false);
    expect(WORKFLOW_CONTEXT_FACT_KINDS).not.toContain("work_unit_reference_fact");
  });

  it("stores latest-only form payload state per step execution", () => {
    expect(runtimeSchema.formStepExecutionState.stepExecutionId).toBeDefined();
    expect(runtimeSchema.formStepExecutionState.draftPayloadJson).toBeDefined();
    expect(runtimeSchema.formStepExecutionState.submittedPayloadJson).toBeDefined();
    expect(runtimeSchema.formStepExecutionState.lastDraftSavedAt).toBeDefined();
    expect(runtimeSchema.formStepExecutionState.submittedAt).toBeDefined();

    expect("draftValuesJson" in runtimeSchema.formStepExecutionState).toBe(false);
    expect("submittedSnapshotJson" in runtimeSchema.formStepExecutionState).toBe(false);

    const stepExecutionForeignKey = getInlineForeignKey(runtimeSchema.formStepExecutionState);
    expect(stepExecutionForeignKey).toBeDefined();
    if (!stepExecutionForeignKey) {
      throw new Error("Expected formStepExecutionState.stepExecutionId foreign key");
    }

    expect(getTableName(stepExecutionForeignKey.reference().foreignTable)).toBe("step_executions");
  });

  it("stores workflow context facts by definition with ordered current instances", () => {
    expect(runtimeSchema.workflowExecutionContextFacts.workflowExecutionId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.contextFactDefinitionId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.instanceOrder).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.valueJson).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.sourceStepExecutionId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.createdAt).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFacts.updatedAt).toBeDefined();

    expect("factKey" in runtimeSchema.workflowExecutionContextFacts).toBe(false);
    expect("factKind" in runtimeSchema.workflowExecutionContextFacts).toBe(false);

    const contextFactDefinitionForeignKey = getInlineForeignKey(
      runtimeSchema.workflowExecutionContextFacts,
      1,
    );
    expect(contextFactDefinitionForeignKey).toBeDefined();
    if (!contextFactDefinitionForeignKey) {
      throw new Error("Expected workflowExecutionContextFacts.contextFactDefinitionId foreign key");
    }

    expect(getTableName(contextFactDefinitionForeignKey.reference().foreignTable)).toBe(
      "methodology_workflow_context_fact_definitions",
    );
  });
});
