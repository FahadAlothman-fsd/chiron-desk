import type { CoreTool } from "ai";
import { tool } from "ai";
import { Data, Effect } from "effect";
import { type ZodSchema, z } from "zod";
import type { WorkflowEventBus } from "./event-bus";
import type { VariableService } from "./variable-service";

export class ToolBuilderError extends Data.TaggedError("ToolBuilderError")<{
  readonly cause: unknown;
  readonly toolName: string;
  readonly operation: "build" | "execute" | "validate";
}> {}

export type ToolType = "update-variable" | "ax-generation" | "snapshot-artifact" | "custom";

export type ApprovalMode = "none" | "text" | "selector" | "confirm";
export type RiskLevel = "safe" | "moderate" | "dangerous";

export interface ToolApprovalConfig {
  mode: ApprovalMode;
  riskLevel: RiskLevel;
  selectorOptions?: string[];
  textPlaceholder?: string;
  confirmMessage?: string;
  defaultValue?: string;
}

export interface ToolConfig {
  name: string;
  type: ToolType;
  description: string;
  inputSchema: ZodSchema;
  approval: ToolApprovalConfig;
  execute?: (args: unknown, context: ToolExecutionContext) => Promise<unknown>;
}

export interface ToolExecutionContext {
  executionId: string;
  stepId: string;
  variableService: VariableService;
  eventBus: WorkflowEventBus;
}

export interface ToolExecutionResult {
  success: boolean;
  output: unknown;
  error?: string;
  approvalUsed?: {
    autoApprove: boolean;
    reason: string;
  };
}

const updateVariableSchema = z.object({
  variableName: z.string().describe("Name of the variable to update"),
  value: z.unknown().describe("New value for the variable"),
  reason: z.string().optional().describe("Reason for the update"),
});

const snapshotArtifactSchema = z.object({
  artifactId: z.string().describe("ID of the artifact to snapshot"),
  format: z.enum(["json", "markdown", "text"]).optional().describe("Output format"),
});

const axGenerationSchema = z.object({
  prompt: z.string().describe("Generation prompt"),
  templateId: z.string().optional().describe("Template ID to use"),
  variables: z.record(z.unknown()).optional().describe("Template variables"),
});

function createUpdateVariableTool(
  context: ToolExecutionContext,
): CoreTool<typeof updateVariableSchema, ToolExecutionResult> {
  return tool({
    description:
      "Update a workflow variable with a new value. Use this to store results, state changes, or computed values.",
    parameters: updateVariableSchema,
    execute: async (args) => {
      const effect = Effect.gen(function* () {
        yield* context.eventBus.publish({
          _tag: "ToolCallStarted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "update-variable",
          args,
        });

        yield* context.variableService.set(
          context.executionId,
          args.variableName,
          args.value,
          "tool",
          args.reason ?? "Updated via AI tool call",
        );

        yield* context.eventBus.publish({
          _tag: "ToolCallCompleted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "update-variable",
          result: { success: true, variableName: args.variableName },
        });

        return {
          success: true,
          output: { variableName: args.variableName, updated: true },
        };
      });

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              output: null,
              error: String(error),
            }),
          ),
        ),
      );

      return result as ToolExecutionResult;
    },
  });
}

function createSnapshotArtifactTool(
  context: ToolExecutionContext,
): CoreTool<typeof snapshotArtifactSchema, ToolExecutionResult> {
  return tool({
    description:
      "Read the current state of an artifact. Use this to inspect documents, configurations, or generated content.",
    parameters: snapshotArtifactSchema,
    execute: async (args) => {
      const effect = Effect.gen(function* () {
        yield* context.eventBus.publish({
          _tag: "ToolCallStarted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "snapshot-artifact",
          args,
        });

        const artifact = yield* context.variableService.get(
          context.executionId,
          `artifact:${args.artifactId}`,
        );

        yield* context.eventBus.publish({
          _tag: "ToolCallCompleted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "snapshot-artifact",
          result: { success: true, artifactId: args.artifactId },
        });

        return {
          success: true,
          output: artifact ?? null,
        };
      });

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              output: null,
              error: String(error),
            }),
          ),
        ),
      );

      return result as ToolExecutionResult;
    },
  });
}

function createAxGenerationTool(
  context: ToolExecutionContext,
): CoreTool<typeof axGenerationSchema, ToolExecutionResult> {
  return tool({
    description:
      "Generate content using ax optimization. Useful for structured output generation with templates.",
    parameters: axGenerationSchema,
    execute: async (args) => {
      const effect = Effect.gen(function* () {
        yield* context.eventBus.publish({
          _tag: "ToolCallStarted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "ax-generation",
          args,
        });

        yield* context.eventBus.publish({
          _tag: "ToolCallCompleted",
          executionId: context.executionId,
          stepId: context.stepId,
          toolName: "ax-generation",
          result: {
            success: true,
            note: "ax-generation placeholder - full implementation in future story",
          },
        });

        return {
          success: true,
          output: {
            generated: true,
            prompt: args.prompt,
            note: "ax-generation placeholder",
          },
        };
      });

      const result = await Effect.runPromise(
        effect.pipe(
          Effect.catchAll((error) =>
            Effect.succeed({
              success: false,
              output: null,
              error: String(error),
            }),
          ),
        ),
      );

      return result as ToolExecutionResult;
    },
  });
}

export function validateToolArgs(
  config: ToolConfig,
  args: unknown,
): Effect.Effect<unknown, ToolBuilderError> {
  return Effect.try({
    try: () => config.inputSchema.parse(args),
    catch: (error) =>
      new ToolBuilderError({
        cause: error,
        toolName: config.name,
        operation: "validate",
      }),
  });
}

export function buildToolsFromConfig(
  toolConfigs: ToolConfig[],
  context: ToolExecutionContext,
): Effect.Effect<Record<string, CoreTool>, ToolBuilderError> {
  return Effect.try({
    try: () => {
      const tools: Record<string, CoreTool> = {};

      for (const config of toolConfigs) {
        switch (config.type) {
          case "update-variable":
            tools[config.name] = createUpdateVariableTool(context);
            break;

          case "snapshot-artifact":
            tools[config.name] = createSnapshotArtifactTool(context);
            break;

          case "ax-generation":
            tools[config.name] = createAxGenerationTool(context);
            break;

          case "custom":
            if (config.execute) {
              tools[config.name] = tool({
                description: config.description,
                parameters: config.inputSchema as z.ZodType<Record<string, unknown>>,
                execute: async (args) => {
                  try {
                    const result = await config.execute!(args, context);
                    return { success: true, output: result };
                  } catch (error) {
                    return {
                      success: false,
                      output: null,
                      error: String(error),
                    };
                  }
                },
              });
            }
            break;
        }
      }

      return tools;
    },
    catch: (error) =>
      new ToolBuilderError({
        cause: error,
        toolName: "unknown",
        operation: "build",
      }),
  });
}

export function executeTool(
  toolName: string,
  toolType: ToolType,
  args: unknown,
  context: ToolExecutionContext,
): Effect.Effect<ToolExecutionResult, ToolBuilderError> {
  return Effect.gen(function* () {
    yield* context.eventBus.publish({
      _tag: "ToolCallStarted",
      executionId: context.executionId,
      stepId: context.stepId,
      toolName,
      args,
    });

    const result = yield* Effect.tryPromise({
      try: async () => {
        switch (toolType) {
          case "update-variable": {
            const parsed = updateVariableSchema.parse(args);
            await Effect.runPromise(
              context.variableService.set(
                context.executionId,
                parsed.variableName,
                parsed.value,
                "tool",
                parsed.reason ?? "Updated via tool execution",
              ),
            );
            return {
              success: true,
              output: { variableName: parsed.variableName, updated: true },
            };
          }

          case "snapshot-artifact": {
            const parsed = snapshotArtifactSchema.parse(args);
            const value = await Effect.runPromise(
              context.variableService.get(context.executionId, `artifact:${parsed.artifactId}`),
            );
            return { success: true, output: value ?? null };
          }

          case "ax-generation": {
            const parsed = axGenerationSchema.parse(args);
            return {
              success: true,
              output: {
                generated: true,
                prompt: parsed.prompt,
                note: "ax-generation placeholder",
              },
            };
          }

          default:
            return {
              success: false,
              output: null,
              error: `Unknown tool type: ${toolType}`,
            };
        }
      },
      catch: (error) => new ToolBuilderError({ cause: error, toolName, operation: "execute" }),
    });

    yield* context.eventBus.publish({
      _tag: "ToolCallCompleted",
      executionId: context.executionId,
      stepId: context.stepId,
      toolName,
      result,
    });

    return result as ToolExecutionResult;
  });
}

export const DEFAULT_TOOL_CONFIGS: ToolConfig[] = [
  {
    name: "update_variable",
    type: "update-variable",
    description: "Update a workflow variable with a new value",
    inputSchema: updateVariableSchema,
    approval: { mode: "none", riskLevel: "moderate" },
  },
  {
    name: "snapshot_artifact",
    type: "snapshot-artifact",
    description: "Read the current state of an artifact",
    inputSchema: snapshotArtifactSchema,
    approval: { mode: "none", riskLevel: "safe" },
  },
  {
    name: "ax_generate",
    type: "ax-generation",
    description: "Generate content using ax optimization",
    inputSchema: axGenerationSchema,
    approval: { mode: "confirm", riskLevel: "moderate" },
  },
];
