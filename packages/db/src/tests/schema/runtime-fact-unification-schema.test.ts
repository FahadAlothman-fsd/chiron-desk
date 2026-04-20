import { describe, expect, it } from "vitest";

import * as runtimeSchema from "../../schema/runtime";

describe("runtime fact unification schema", () => {
  it("adds immutable work-unit identity fields", () => {
    expect(runtimeSchema.projectWorkUnits.workUnitKey).toBeDefined();
    expect(runtimeSchema.projectWorkUnits.instanceNumber).toBeDefined();
    expect(runtimeSchema.projectWorkUnits.displayName).toBeDefined();
  });

  it("extends runtime fact tables for logical delete semantics", () => {
    expect(runtimeSchema.projectFactInstances.status).toBeDefined();
    expect(runtimeSchema.workUnitFactInstances.status).toBeDefined();
  });

  it("adds workflow-context current-state identity plus CRUD record storage", () => {
    expect(runtimeSchema.workflowExecutionContextFacts.instanceId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.workflowExecutionId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.contextFactDefinitionId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.instanceId).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.verb).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.valueJson).toBeDefined();
    expect(runtimeSchema.workflowExecutionContextFactRecords.sourceStepExecutionId).toBeDefined();
  });
});
