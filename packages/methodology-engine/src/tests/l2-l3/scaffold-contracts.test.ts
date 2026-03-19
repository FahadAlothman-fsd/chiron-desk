import { describe, expect, it } from "vitest";

import * as Engine from "../../index";

describe("L2/L3 scaffold contracts", () => {
  it("exports WorkUnitService and WorkflowService contracts", () => {
    expect(Engine).toHaveProperty("WorkUnitService");
    expect(Engine).toHaveProperty("WorkflowService");
  });

  it("exports runtime resolver contracts", () => {
    expect(Engine).toHaveProperty("MethodologyRuntimeResolver");
    expect(Engine).toHaveProperty("WorkUnitRuntimeResolver");
    expect(Engine).toHaveProperty("WorkflowRuntimeResolver");
    expect(Engine).toHaveProperty("StepContractResolver");
  });
});
