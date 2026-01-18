import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";

export class InvokeWorkflowError extends Data.TaggedError("InvokeWorkflowError")<{
  readonly cause: unknown;
  readonly message: string;
}> {}

interface InvokeWorkflowConfig {
  workflowId: string;
  inputMapping?: Record<string, string>;
  outputMapping?: Record<string, string>;
  waitForCompletion?: boolean;
}

export interface InvokeWorkflowHandler {
  readonly _tag: "InvokeWorkflowHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<StepHandlerOutput, InvokeWorkflowError>;
}

export const InvokeWorkflowHandler =
  Context.GenericTag<InvokeWorkflowHandler>("InvokeWorkflowHandler");

function resolveTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
    const parts = path.split(".");
    let value: unknown = variables;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return match;
      }
    }
    if (value === undefined || value === null) return match;
    return String(value);
  });
}

export const InvokeWorkflowHandlerLive = Layer.succeed(InvokeWorkflowHandler, {
  _tag: "InvokeWorkflowHandler" as const,

  execute: (input: StepHandlerInput) =>
    Effect.gen(function* () {
      const config = input.stepConfig as unknown as InvokeWorkflowConfig;
      const variables = input.variables;
      const parentExecutionId = input.executionId;

      if (!config.workflowId) {
        return yield* Effect.fail(
          new InvokeWorkflowError({
            cause: new Error("Missing workflowId in config"),
            message: "InvokeWorkflow step requires a workflowId",
          }),
        );
      }

      const resolvedWorkflowId = resolveTemplate(config.workflowId, variables);

      const inputVariables: Record<string, unknown> = {};
      if (config.inputMapping) {
        for (const [targetKey, sourceTemplate] of Object.entries(config.inputMapping)) {
          const resolvedValue = resolveTemplate(sourceTemplate, variables);
          inputVariables[targetKey] = resolvedValue;
        }
      }

      const { executeWorkflow } = yield* Effect.tryPromise({
        try: () => import("../effect/executor"),
        catch: (error) =>
          new InvokeWorkflowError({
            cause: error,
            message: "Failed to import executor",
          }),
      });

      const userId = (variables.userId as string) || "system";
      const projectId = variables.projectId as string | undefined;

      const childExecutionId = yield* Effect.tryPromise({
        try: () =>
          executeWorkflow({
            workflowId: resolvedWorkflowId,
            userId,
            projectId,
            initialVariables: { ...variables, ...inputVariables },
            parentExecutionId,
          }),
        catch: (error) =>
          new InvokeWorkflowError({
            cause: error,
            message: `Failed to execute child workflow: ${error instanceof Error ? error.message : "Unknown error"}`,
          }),
      });

      return {
        result: {
          childExecutionId,
          workflowId: resolvedWorkflowId,
          status: "started",
        },
        variableUpdates: {
          lastChildExecutionId: childExecutionId,
        },
        requiresUserInput: false,
      };
    }),
});
