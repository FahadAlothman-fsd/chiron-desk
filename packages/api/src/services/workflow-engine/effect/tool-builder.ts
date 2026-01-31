import { type Tool, tool } from "ai";
import { randomUUID } from "node:crypto";
import { Data, Effect } from "effect";
import { type ZodSchema, z } from "zod";
import type { WorkflowEvent } from "./event-bus";

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
  targetVariable?: string;
  execute?: (args: unknown, context: ToolExecutionContext) => Promise<unknown>;
}

export type VariableSourceType =
  | "input"
  | "step"
  | "system"
  | "parent"
  | "child-propagation"
  | "migration";

export interface ToolVariableService {
  set: (
    executionId: string,
    name: string,
    value: unknown,
    source: VariableSourceType,
    stepNumber?: number,
  ) => Effect.Effect<unknown, unknown>;
  get: (executionId: string, name: string) => Effect.Effect<unknown, unknown>;
}

export interface ToolEventBus {
  publish: (event: WorkflowEvent) => Effect.Effect<boolean, unknown>;
}

export interface ToolExecutionContext {
  executionId: string;
  stepId: string;
  variableService: ToolVariableService;
  eventBus: ToolEventBus;
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
  variables: z.record(z.string(), z.unknown()).optional().describe("Template variables"),
});

function createUpdateVariableTool(config: ToolConfig, context: ToolExecutionContext): Tool {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema as z.ZodObject<z.ZodRawShape>,
    execute: async (args) => {
      const effect = executeTool(config.name, config.type, args, context, {
        targetVariable: config.targetVariable,
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

function createSnapshotArtifactTool(config: ToolConfig, context: ToolExecutionContext): Tool {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema as z.ZodObject<z.ZodRawShape>,
    execute: async (args) => {
      const effect = executeTool(config.name, config.type, args, context);

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

function createAxGenerationTool(config: ToolConfig, context: ToolExecutionContext): Tool {
  return tool({
    description: config.description,
    inputSchema: config.inputSchema as z.ZodObject<z.ZodRawShape>,
    execute: async (args) => {
      const effect = executeTool(config.name, config.type, args, context);

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
): Effect.Effect<Record<string, Tool>, ToolBuilderError> {
  return Effect.try({
    try: () => {
      const tools: Record<string, Tool> = {};

      for (const config of toolConfigs) {
        switch (config.type) {
          case "update-variable":
            tools[config.name] = createUpdateVariableTool(config, context);
            break;

          case "snapshot-artifact":
            tools[config.name] = createSnapshotArtifactTool(config, context);
            break;

          case "ax-generation":
            tools[config.name] = createAxGenerationTool(config, context);
            break;

          case "custom":
            if (config.execute) {
              tools[config.name] = tool({
                description: config.description,
                inputSchema: config.inputSchema as z.ZodObject<z.ZodRawShape>,
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
  options?: { targetVariable?: string; toolCallId?: string },
): Effect.Effect<ToolExecutionResult, ToolBuilderError> {
  return Effect.gen(function* () {
    const toolCallId = options?.toolCallId ?? randomUUID();
    yield* context.eventBus
      .publish({
        _tag: "ToolCallStarted",
        executionId: context.executionId,
        stepId: context.stepId,
        toolName,
        toolType,
        toolCallId,
        args,
      })
      .pipe(Effect.catchAll(() => Effect.succeed(true)));

    const result = yield* Effect.tryPromise<ToolExecutionResult, ToolBuilderError>({
      try: async () => {
        switch (toolType) {
          case "update-variable": {
            const parsed = updateVariableSchema.parse(args);
            const variableName = options?.targetVariable ?? parsed.variableName;
            await Effect.runPromise(
              context.variableService.set(context.executionId, variableName, parsed.value, "step"),
            );
            return {
              success: true,
              output: { variableName, updated: true },
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

    yield* context.eventBus
      .publish({
        _tag: "ToolCallCompleted",
        executionId: context.executionId,
        stepId: context.stepId,
        toolName,
        toolType,
        toolCallId,
        result,
      })
      .pipe(Effect.catchAll(() => Effect.succeed(true)));

    return result;
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
