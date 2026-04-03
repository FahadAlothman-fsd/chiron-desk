import { describe, expect, it } from "vitest";

import {
  methodologyWorkflowContextFactArtifactReferences,
  methodologyWorkflowContextFactDefinitions,
  methodologyWorkflowContextFactDraftSpecFields,
  methodologyWorkflowContextFactDraftSpecs,
  methodologyWorkflowContextFactExternalBindings,
  methodologyWorkflowContextFactPlainValues,
  methodologyWorkflowContextFactWorkUnitReferences,
  methodologyWorkflowContextFactWorkflowReferences,
  methodologyWorkflowFormFields,
  methodologyWorkflowFormSteps,
} from "../../schema/methodology";
import {
  formStepExecutionState,
  stepExecutions,
  workflowExecutionContextFacts,
} from "../../schema/runtime";

describe("l3 slice-1 schema", () => {
  it("exposes design-time form tables", () => {
    expect(methodologyWorkflowFormSteps.id).toBeDefined();
    expect(methodologyWorkflowFormSteps.workflowId).toBeDefined();
    expect(methodologyWorkflowFormSteps.key).toBeDefined();
    expect(methodologyWorkflowFormSteps.label).toBeDefined();
    expect(methodologyWorkflowFormSteps.descriptionJson).toBeDefined();
    expect(methodologyWorkflowFormSteps.createdAt).toBeDefined();
    expect(methodologyWorkflowFormSteps.updatedAt).toBeDefined();

    expect(methodologyWorkflowFormFields.id).toBeDefined();
    expect(methodologyWorkflowFormFields.formStepId).toBeDefined();
    expect(methodologyWorkflowFormFields.key).toBeDefined();
    expect(methodologyWorkflowFormFields.label).toBeDefined();
    expect(methodologyWorkflowFormFields.valueType).toBeDefined();
    expect(methodologyWorkflowFormFields.required).toBeDefined();
    expect(methodologyWorkflowFormFields.inputJson).toBeDefined();
    expect(methodologyWorkflowFormFields.descriptionJson).toBeDefined();
    expect(methodologyWorkflowFormFields.sortOrder).toBeDefined();
  });

  it("exposes all 7 typed context-fact design-time tables", () => {
    expect(methodologyWorkflowContextFactDefinitions).toBeDefined();
    expect(methodologyWorkflowContextFactPlainValues).toBeDefined();
    expect(methodologyWorkflowContextFactExternalBindings).toBeDefined();
    expect(methodologyWorkflowContextFactWorkflowReferences).toBeDefined();
    expect(methodologyWorkflowContextFactWorkUnitReferences).toBeDefined();
    expect(methodologyWorkflowContextFactArtifactReferences).toBeDefined();
    expect(methodologyWorkflowContextFactDraftSpecs).toBeDefined();
    expect(methodologyWorkflowContextFactDraftSpecFields).toBeDefined();
  });

  it("exposes runtime step-core tables", () => {
    expect(stepExecutions.id).toBeDefined();
    expect(stepExecutions.workflowExecutionId).toBeDefined();
    expect(stepExecutions.stepDefinitionId).toBeDefined();
    expect(stepExecutions.stepType).toBeDefined();
    expect(stepExecutions.status).toBeDefined();
    expect(stepExecutions.activatedAt).toBeDefined();
    expect(stepExecutions.completedAt).toBeDefined();
    expect(stepExecutions.progressionData).toBeDefined();

    expect(formStepExecutionState.id).toBeDefined();
    expect(formStepExecutionState.stepExecutionId).toBeDefined();
    expect(formStepExecutionState.draftValuesJson).toBeDefined();
    expect(formStepExecutionState.submittedSnapshotJson).toBeDefined();
    expect(formStepExecutionState.submittedAt).toBeDefined();

    expect(workflowExecutionContextFacts.id).toBeDefined();
    expect(workflowExecutionContextFacts.workflowExecutionId).toBeDefined();
    expect(workflowExecutionContextFacts.factKey).toBeDefined();
    expect(workflowExecutionContextFacts.factKind).toBeDefined();
    expect(workflowExecutionContextFacts.valueJson).toBeDefined();
    expect(workflowExecutionContextFacts.sourceStepExecutionId).toBeDefined();
  });
});
