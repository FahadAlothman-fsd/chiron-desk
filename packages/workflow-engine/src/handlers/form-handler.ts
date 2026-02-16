import { Effect } from "effect";
import type { FormStepConfig } from "../schema/form";
import type { StepHandler } from "../services/step-handler";

export const makeFormHandler = (): StepHandler => (input) =>
  Effect.gen(function* () {
    const step = input.step as FormStepConfig;
    if (!input.userInput || typeof input.userInput !== "object") {
      return {
        requiresUserInput: true,
      };
    }

    const payload = input.userInput as Record<string, unknown>;
    const outputVariables: Record<string, unknown> = {};

    for (const field of step.fields) {
      const value = payload[field.key];
      const required = Boolean(field.validation?.required);

      if (required && (value === undefined || value === null || value === "")) {
        return {
          requiresUserInput: true,
        };
      }

      const outputKey = field.outputVariable ?? field.key;
      if (value !== undefined) {
        outputVariables[outputKey] = value;
      }
    }

    return {
      outputVariables,
      requiresUserInput: false,
    };
  });
