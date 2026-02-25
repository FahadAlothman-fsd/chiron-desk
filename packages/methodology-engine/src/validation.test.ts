import { describe, expect, it } from "vitest";
import type { MethodologyVersionDefinition } from "@chiron/contracts/methodology/version";
import { validateDraftDefinition } from "./validation";

const BASE_DEFINITION = {
  workUnitTypes: [{ key: "task" }],
  agentTypes: [],
  transitions: [{ transitionKey: "start" }],
  transitionWorkflowBindings: {},
} as const;

describe("validateDraftDefinition", () => {
  it("returns a blocking diagnostic for unsupported workflow step types", () => {
    const definition = {
      ...BASE_DEFINITION,
      workflows: [
        {
          key: "wf-a",
          steps: [{ key: "s1", type: "unsupported" }],
          edges: [],
        },
      ],
    } as unknown as MethodologyVersionDefinition;

    const result = validateDraftDefinition(definition, "2026-01-01T00:00:00.000Z");

    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.code === "INVALID_WORKFLOW_STEP_TYPE" && d.blocking),
    ).toBe(true);
  });

  it("reports unresolved workflow bindings deterministically", () => {
    const definition: MethodologyVersionDefinition = {
      ...BASE_DEFINITION,
      workflows: [
        {
          key: "wf-a",
          steps: [{ key: "s1", type: "form" }],
          edges: [],
        },
      ],
      transitionWorkflowBindings: {
        missing_transition: ["wf-a"],
        start: ["wf-missing"],
      },
    };

    const result = validateDraftDefinition(definition, "2026-01-01T00:00:00.000Z");

    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain("UNRESOLVED_TRANSITION_BINDING");
    expect(codes).toContain("UNRESOLVED_WORKFLOW_BINDING");
    expect(result.valid).toBe(false);
  });

  it("reports deterministic branch and routing diagnostics", () => {
    const definition: MethodologyVersionDefinition = {
      ...BASE_DEFINITION,
      workflows: [
        {
          key: "wf-a",
          steps: [
            { key: "start", type: "branch" },
            { key: "x", type: "action" },
            { key: "end", type: "display" },
          ],
          edges: [
            { fromStepKey: null, toStepKey: "start", edgeKey: "entry" },
            { fromStepKey: "start", toStepKey: "x", condition: { when: "a" } },
            { fromStepKey: "x", toStepKey: "end" },
            { fromStepKey: "x", toStepKey: null },
          ],
        },
      ],
      transitionWorkflowBindings: { start: ["wf-a"] },
    };

    const result = validateDraftDefinition(definition, "2026-01-01T00:00:00.000Z");
    const codes = result.diagnostics.map((d) => d.code);

    expect(codes).toContain("BRANCH_REQUIRES_MIN_TWO_OUTGOING");
    expect(codes).toContain("AMBIGUOUS_NON_BRANCH_ROUTING");
    expect(codes).toContain("TERMINAL_EDGE_MISSING_KEY");
  });

  it("reports degenerate edges and dead workflow nodes", () => {
    const definition: MethodologyVersionDefinition = {
      ...BASE_DEFINITION,
      workflows: [
        {
          key: "wf-a",
          steps: [
            { key: "entry", type: "form" },
            { key: "live", type: "action" },
            { key: "dead", type: "display" },
          ],
          edges: [
            { fromStepKey: null, toStepKey: "entry", edgeKey: "entry" },
            { fromStepKey: "entry", toStepKey: "live", edgeKey: "next" },
            { fromStepKey: "live", toStepKey: null, edgeKey: "done" },
            { fromStepKey: null, toStepKey: null, edgeKey: "bad" },
          ],
        },
      ],
      transitionWorkflowBindings: { start: ["wf-a"] },
    };

    const result = validateDraftDefinition(definition, "2026-01-01T00:00:00.000Z");
    const codes = result.diagnostics.map((d) => d.code);

    expect(codes).toContain("DEGENERATE_WORKFLOW_EDGE");
    expect(codes).toContain("UNREACHABLE_WORKFLOW_STEP");
  });
});
