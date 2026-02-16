import { describe, expect, it } from "bun:test";
import { validateWorkflowDecodeBoundary } from "./decode-boundary";

describe("decode-boundary", () => {
  it("accepts valid workflow-step payloads", async () => {
    await expect(
      validateWorkflowDecodeBoundary({
        workflowId: "wf-decode-valid",
        workflowName: "Decode Boundary Valid",
        steps: [
          {
            id: "step-form-1",
            stepType: "form",
            config: {
              fields: [
                {
                  key: "projectName",
                  type: "string",
                  label: "Project Name",
                  validation: { required: true },
                },
              ],
            },
          },
          {
            id: "step-display-1",
            stepType: "display",
            config: {
              template: "Project {{projectName}} initialized",
            },
          },
        ],
      }),
    ).resolves.toBeUndefined();
  });

  it("fails on malformed step payloads", async () => {
    await expect(
      validateWorkflowDecodeBoundary({
        workflowId: "wf-decode-invalid",
        workflowName: "Decode Boundary Invalid",
        steps: [
          {
            id: "step-form-bad",
            stepType: "form",
            config: {
              fields: [
                {
                  key: "projectName",
                },
              ],
            },
          },
        ],
      }),
    ).rejects.toThrow("Workflow decode boundary failed");
  });
});
