import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";
import { ExecuteActionStepHandler } from "./execute-action-handler";

export class ExecuteActionError extends Data.TaggedError("ExecuteActionError")<{
  readonly cause: unknown;
  readonly operation: string;
  readonly message: string;
}> {}

export interface ExecuteActionConfig {
  readonly actions: readonly {
    readonly type: string;
    readonly config?: Record<string, unknown>;
  }[];
  readonly executionMode: "sequential" | "parallel";
  readonly requiresUserConfirmation?: boolean;
}

export interface ExecuteActionHandlerOutput extends StepHandlerOutput {
  readonly requiresUserInput: boolean;
  readonly preview?: boolean;
}

export interface ExecuteActionHandler {
  readonly _tag: "ExecuteActionHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<ExecuteActionHandlerOutput, ExecuteActionError>;
}

export const ExecuteActionHandler =
  Context.GenericTag<ExecuteActionHandler>("ExecuteActionHandler");

const legacyHandler = new ExecuteActionStepHandler();

export const ExecuteActionHandlerLive = Layer.succeed(ExecuteActionHandler, {
  _tag: "ExecuteActionHandler" as const,

  execute: (input: StepHandlerInput, userInput?: unknown) =>
    Effect.tryPromise({
      try: async () => {
        const step = {
          id: input.executionId,
          workflowId: "",
          stepNumber: 1,
          goal: "",
          stepType: "execute-action" as const,
          config: input.stepConfig,
          nextStepNumber: null,
          createdAt: new Date(),
        };

        const context = {
          executionId: input.executionId,
          workflowId: "",
          projectId: "",
          userId: "",
          executionVariables: input.variables,
          systemVariables: {},
        };

        const result = await legacyHandler.executeStep(step, context, userInput);

        return {
          result: result.output,
          variableUpdates: result.output as Record<string, unknown>,
          requiresUserInput: result.requiresUserInput ?? false,
          preview: (result.output as Record<string, unknown>)?.preview as boolean | undefined,
        };
      },
      catch: (error) =>
        new ExecuteActionError({
          cause: error,
          operation: "execute",
          message: error instanceof Error ? error.message : String(error),
        }),
    }),
});

export function createLegacyExecuteActionHandler() {
  return {
    async executeStep(
      step: { config: unknown; nextStepNumber: number | null },
      context: { executionVariables: Record<string, unknown> },
      userInput?: unknown,
    ) {
      const input: StepHandlerInput = {
        stepConfig: step.config as Record<string, unknown>,
        variables: context.executionVariables,
        executionId: "",
      };

      const program = Effect.provide(
        Effect.flatMap(ExecuteActionHandler, (handler) => handler.execute(input, userInput)),
        ExecuteActionHandlerLive,
      );

      const result = await Effect.runPromise(program);

      return {
        output: result.result,
        nextStepNumber: step.nextStepNumber ?? null,
        requiresUserInput: result.requiresUserInput,
      };
    },
  };
}
