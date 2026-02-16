import { describe, expect, it } from "bun:test";
import { Effect } from "effect";
import { decodeWorkflow, WorkflowDecodeError } from "./decode";

describe("decodeWorkflow", () => {
  it("decodes a valid workflow config", async () => {
    const workflow = {
      id: "wf-1",
      name: "Test Workflow",
      steps: [
        {
          type: "display",
          id: "step-1",
          content: {
            type: "doc",
            children: [{ type: "p", children: [{ text: "ok" }] }],
          },
        },
      ],
    };

    const result = await Effect.runPromise(decodeWorkflow(workflow));
    expect(result.id).toBe("wf-1");
    expect(result.steps.length).toBe(1);
  });

  it("fails for invalid workflow config", async () => {
    const invalidWorkflow = {
      id: "wf-invalid",
      name: "Broken",
      steps: [
        {
          type: "form",
          id: "step-1",
          fields: "not-an-array",
        },
      ],
    };

    const error = await Effect.runPromise(Effect.flip(decodeWorkflow(invalidWorkflow)));
    expect(error).toBeInstanceOf(WorkflowDecodeError);
    expect(error.message).toContain("Failed to decode workflow config");
  });
});
