import { describe, expect, it } from "bun:test";
import { Effect, Layer } from "effect";
import { z } from "zod";
import { WorkflowEventBus, WorkflowEventBusLive } from "./event-bus";
import {
  buildToolsFromConfig,
  DEFAULT_TOOL_CONFIGS,
  executeTool,
  type ToolConfig,
  type ToolExecutionContext,
  validateToolArgs,
} from "./tool-builder";
import { VariableService } from "./variable-service";

const mockVariableService = {
  _tag: "VariableService" as const,
  get: (executionId: string, name: string) =>
    Effect.succeed(name === "artifact:test-artifact" ? { content: "test" } : null),
  set: (executionId: string, name: string, value: unknown, source: string, reason?: string) =>
    Effect.succeed({ id: "var-1", name, value, source }),
  getAll: (executionId: string) => Effect.succeed({}),
  resolve: (executionId: string, template: string) => Effect.succeed(template),
  delete: (executionId: string, name: string) => Effect.succeed(undefined),
  getHistory: (executionId: string, name: string) => Effect.succeed([]),
};

const mockEventBus = {
  _tag: "WorkflowEventBus" as const,
  publish: (event: any) => Effect.succeed(true),
  stream: {} as any,
};

const createMockContext = (): ToolExecutionContext => ({
  executionId: "test-exec",
  stepId: "test-step",
  variableService: mockVariableService as any,
  eventBus: mockEventBus as any,
});

describe("ToolBuilder", () => {
  describe("validateToolArgs", () => {
    it("should validate correct args against schema", async () => {
      const config: ToolConfig = {
        name: "test-tool",
        type: "update-variable",
        description: "Test tool",
        inputSchema: z.object({
          variableName: z.string(),
          value: z.unknown(),
        }),
        approval: { mode: "none", riskLevel: "safe" },
      };

      const result = await Effect.runPromise(
        validateToolArgs(config, { variableName: "test", value: 123 }),
      );

      expect(result).toEqual({ variableName: "test", value: 123 });
    });

    it("should reject invalid args", async () => {
      const config: ToolConfig = {
        name: "test-tool",
        type: "update-variable",
        description: "Test tool",
        inputSchema: z.object({
          variableName: z.string(),
          value: z.unknown(),
        }),
        approval: { mode: "none", riskLevel: "safe" },
      };

      const result = await Effect.runPromiseExit(
        validateToolArgs(config, { invalidField: "test" }),
      );

      expect(result._tag).toBe("Failure");
    });
  });

  describe("buildToolsFromConfig", () => {
    it("should build tools from default configs", async () => {
      const context = createMockContext();

      const result = await Effect.runPromise(buildToolsFromConfig(DEFAULT_TOOL_CONFIGS, context));

      expect(Object.keys(result)).toContain("update_variable");
      expect(Object.keys(result)).toContain("snapshot_artifact");
      expect(Object.keys(result)).toContain("ax_generate");
    });

    it("should build update-variable tool", async () => {
      const context = createMockContext();
      const configs: ToolConfig[] = [
        {
          name: "my_update",
          type: "update-variable",
          description: "Update a variable",
          inputSchema: z.object({
            variableName: z.string(),
            value: z.unknown(),
          }),
          approval: { mode: "none", riskLevel: "moderate" },
        },
      ];

      const result = await Effect.runPromise(buildToolsFromConfig(configs, context));

      expect(result.my_update).toBeDefined();
      expect(result.my_update.description).toBe(
        "Update a workflow variable with a new value. Use this to store results, state changes, or computed values.",
      );
    });

    it("should build snapshot-artifact tool", async () => {
      const context = createMockContext();
      const configs: ToolConfig[] = [
        {
          name: "my_snapshot",
          type: "snapshot-artifact",
          description: "Read artifact",
          inputSchema: z.object({
            artifactId: z.string(),
          }),
          approval: { mode: "none", riskLevel: "safe" },
        },
      ];

      const result = await Effect.runPromise(buildToolsFromConfig(configs, context));

      expect(result.my_snapshot).toBeDefined();
    });

    it("should build custom tool with execute function", async () => {
      const context = createMockContext();
      const configs: ToolConfig[] = [
        {
          name: "custom_tool",
          type: "custom",
          description: "A custom tool",
          inputSchema: z.object({
            input: z.string(),
          }),
          approval: { mode: "confirm", riskLevel: "moderate" },
          execute: async (args: any) => ({
            processed: args.input.toUpperCase(),
          }),
        },
      ];

      const result = await Effect.runPromise(buildToolsFromConfig(configs, context));

      expect(result.custom_tool).toBeDefined();
      expect(result.custom_tool.description).toBe("A custom tool");
    });
  });

  describe("executeTool", () => {
    it("should execute update-variable tool", async () => {
      const context = createMockContext();

      const result = await Effect.runPromise(
        executeTool(
          "update_variable",
          "update-variable",
          { variableName: "testVar", value: "testValue" },
          context,
        ),
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ variableName: "testVar", updated: true });
    });

    it("should execute snapshot-artifact tool", async () => {
      const context = createMockContext();

      const result = await Effect.runPromise(
        executeTool(
          "snapshot_artifact",
          "snapshot-artifact",
          { artifactId: "test-artifact" },
          context,
        ),
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ content: "test" });
    });

    it("should execute ax-generation tool (placeholder)", async () => {
      const context = createMockContext();

      const result = await Effect.runPromise(
        executeTool("ax_generate", "ax-generation", { prompt: "Generate something" }, context),
      );

      expect(result.success).toBe(true);
      expect((result.output as any).note).toBe("ax-generation placeholder");
    });

    it("should return error for unknown tool type", async () => {
      const context = createMockContext();

      const result = await Effect.runPromise(executeTool("unknown", "unknown" as any, {}, context));

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown tool type");
    });
  });

  describe("DEFAULT_TOOL_CONFIGS", () => {
    it("should have correct risk levels", () => {
      const updateVar = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "update_variable");
      const snapshot = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "snapshot_artifact");
      const axGen = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "ax_generate");

      expect(updateVar?.approval.riskLevel).toBe("moderate");
      expect(snapshot?.approval.riskLevel).toBe("safe");
      expect(axGen?.approval.riskLevel).toBe("moderate");
    });

    it("should have correct approval modes", () => {
      const updateVar = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "update_variable");
      const snapshot = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "snapshot_artifact");
      const axGen = DEFAULT_TOOL_CONFIGS.find((c) => c.name === "ax_generate");

      expect(updateVar?.approval.mode).toBe("none");
      expect(snapshot?.approval.mode).toBe("none");
      expect(axGen?.approval.mode).toBe("confirm");
    });
  });
});
