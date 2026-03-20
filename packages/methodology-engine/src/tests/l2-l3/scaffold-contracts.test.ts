import { describe, expect, it } from "vitest";

import * as Engine from "../../index";

describe("L2/L3 scaffold contracts", () => {
  it("exports L2 service contracts", () => {
    expect(Engine).toHaveProperty("WorkUnitService");
    expect(Engine).toHaveProperty("WorkflowService");
    expect(Engine).toHaveProperty("WorkUnitFactService");
    expect(Engine).toHaveProperty("WorkUnitStateMachineService");
    expect(Engine).toHaveProperty("WorkUnitArtifactSlotService");
  });

  it("exports runtime resolver contracts", () => {
    expect(Engine).toHaveProperty("MethodologyRuntimeResolver");
    expect(Engine).toHaveProperty("WorkUnitRuntimeResolver");
    expect(Engine).toHaveProperty("WorkflowRuntimeResolver");
    expect(Engine).toHaveProperty("StepContractResolver");
  });
});
