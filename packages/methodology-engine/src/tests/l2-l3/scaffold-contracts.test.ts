import { describe, expect, it } from "vitest";
import { Effect } from "effect";

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

  it("defines explicit workflow seam CRUD contracts", () => {
    const workflowService = Engine.WorkflowService.of({
      listWorkUnitWorkflows: () => Effect.succeed([]),
      createWorkUnitWorkflow: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          diagnostics: { valid: true, diagnostics: [] },
        }),
      updateWorkUnitWorkflow: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          diagnostics: { valid: true, diagnostics: [] },
        }),
      deleteWorkUnitWorkflow: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          diagnostics: { valid: true, diagnostics: [] },
        }),
      updateWorkflowDefinition: () => Effect.void,
    });

    expect(typeof workflowService.listWorkUnitWorkflows).toBe("function");
    expect(typeof workflowService.createWorkUnitWorkflow).toBe("function");
    expect(typeof workflowService.updateWorkUnitWorkflow).toBe("function");
    expect(typeof workflowService.deleteWorkUnitWorkflow).toBe("function");
    expect((workflowService as Record<string, unknown>).replaceTransitionBindings).toBeUndefined();
  });

  it("defines explicit work-unit seam metadata ownership contracts", () => {
    const workUnitService = Engine.WorkUnitService.of({
      createMetadata: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          validation: { valid: true, diagnostics: [] },
        }),
      updateMetadata: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          validation: { valid: true, diagnostics: [] },
        }),
      deleteWorkUnit: () =>
        Effect.succeed({
          version: {
            id: "ver-1",
            methodologyId: "method-1",
            version: "v1",
            status: "draft",
            displayName: "Draft",
            definitionExtensions: null,
            createdAt: new Date(),
            retiredAt: null,
          },
          validation: { valid: true, diagnostics: [] },
        }),
    });

    expect(typeof (workUnitService as Record<string, unknown>).createMetadata).toBe("function");
    expect(typeof workUnitService.updateMetadata).toBe("function");
    expect(typeof (workUnitService as Record<string, unknown>).deleteWorkUnit).toBe("function");
  });
});
