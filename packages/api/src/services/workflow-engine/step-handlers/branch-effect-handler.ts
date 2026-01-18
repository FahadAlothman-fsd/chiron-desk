import { Context, Data, Effect, Layer } from "effect";
import type { StepHandlerInput, StepHandlerOutput } from "../effect/step-registry";

export class BranchError extends Data.TaggedError("BranchError")<{
  readonly cause: unknown;
  readonly message: string;
}> {}

export interface BranchCondition {
  readonly variable: string;
  readonly operator: "equals" | "not-equals" | "contains" | "greater-than" | "less-than";
  readonly value: unknown;
  readonly targetStepNumber: number;
}

export interface BranchConfig {
  readonly conditions: readonly BranchCondition[];
  readonly defaultStepNumber: number;
}

export interface BranchHandlerOutput extends StepHandlerOutput {
  readonly nextStepNumber: number;
}

export interface BranchHandler {
  readonly _tag: "BranchHandler";
  execute: (input: StepHandlerInput) => Effect.Effect<BranchHandlerOutput, BranchError>;
}

export const BranchHandler = Context.GenericTag<BranchHandler>("BranchHandler");

function evaluateCondition(
  condition: BranchCondition,
  variables: Record<string, unknown>,
): boolean {
  const variableValue = variables[condition.variable];

  switch (condition.operator) {
    case "equals":
      return variableValue === condition.value;
    case "not-equals":
      return variableValue !== condition.value;
    case "contains":
      if (typeof variableValue === "string" && typeof condition.value === "string") {
        return variableValue.includes(condition.value);
      }
      if (Array.isArray(variableValue)) {
        return variableValue.includes(condition.value);
      }
      return false;
    case "greater-than":
      return Number(variableValue) > Number(condition.value);
    case "less-than":
      return Number(variableValue) < Number(condition.value);
    default:
      return false;
  }
}

export const BranchHandlerLive = Layer.succeed(BranchHandler, {
  _tag: "BranchHandler" as const,

  execute: (input: StepHandlerInput) =>
    Effect.gen(function* () {
      const config = input.stepConfig as unknown as BranchConfig;

      if (!config || !Array.isArray(config.conditions)) {
        return yield* Effect.fail(
          new BranchError({
            cause: new Error("Invalid branch config"),
            message: "Branch step requires a config with conditions array and defaultStepNumber",
          }),
        );
      }

      if (typeof config.defaultStepNumber !== "number") {
        return yield* Effect.fail(
          new BranchError({
            cause: new Error("Missing defaultStepNumber"),
            message: "Branch step requires a defaultStepNumber",
          }),
        );
      }

      for (const condition of config.conditions) {
        if (evaluateCondition(condition, input.variables)) {
          return {
            result: { matchedCondition: condition.variable },
            nextStepNumber: condition.targetStepNumber,
          };
        }
      }

      return {
        result: { matchedCondition: "default" },
        nextStepNumber: config.defaultStepNumber,
      };
    }),
});
