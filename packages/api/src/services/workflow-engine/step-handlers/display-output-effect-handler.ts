import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";

export class DisplayOutputError extends Data.TaggedError("DisplayOutputError")<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export interface DisplayOutputConfig {
  readonly outputTemplate?: string;
  readonly contentTemplate?: string;
  readonly outputType?: "info" | "warning" | "error" | "success";
  readonly requiresAcknowledgment?: boolean;
}

export interface DisplayOutputHandlerOutput extends StepHandlerOutput {
  readonly requiresUserInput: boolean;
  readonly renderedOutput?: string;
  readonly outputType?: string;
}

export interface DisplayOutputHandler {
  readonly _tag: "DisplayOutputHandler";
  execute: (
    input: StepHandlerInput,
    userInput?: unknown,
  ) => Effect.Effect<DisplayOutputHandlerOutput, DisplayOutputError>;
}

export const DisplayOutputHandler =
  Context.GenericTag<DisplayOutputHandler>("DisplayOutputHandler");

function resolveTemplate(template: string, variables: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
    const value = variables[varName];
    if (value === undefined || value === null) return `{{${varName}}}`;
    return String(value);
  });
}

export const DisplayOutputHandlerLive = Layer.succeed(DisplayOutputHandler, {
  _tag: "DisplayOutputHandler" as const,

  execute: (input: StepHandlerInput, userInput?: unknown) =>
    Effect.gen(function* () {
      const config = input.stepConfig as unknown as DisplayOutputConfig;
      const template = config.outputTemplate ?? config.contentTemplate ?? "";

      if (!template || typeof template !== "string") {
        return yield* Effect.fail(
          new DisplayOutputError({
            cause: new Error("Missing outputTemplate/contentTemplate in config"),
            message: "DisplayOutput step requires an output template",
          }),
        );
      }

      const renderedOutput = resolveTemplate(template, input.variables);
      const outputType = config.outputType ?? "info";
      const requiresAck = config.requiresAcknowledgment !== false;

      if (requiresAck && !userInput) {
        return {
          result: { rendered: renderedOutput, type: outputType },
          renderedOutput,
          outputType,
          requiresUserInput: true,
        };
      }

      return {
        result: { rendered: renderedOutput, type: outputType },
        renderedOutput,
        outputType,
        requiresUserInput: false,
      };
    }),
});
