import { Effect } from "effect";
import type { BranchStepConfig } from "../schema/branch";
import type { StepHandler } from "../services/step-handler";

type Condition = BranchStepConfig["branches"][number]["when"];

const getValue = (variables: Record<string, unknown>, path: string) => {
  const parts = path.split(".");
  let current: unknown = variables;
  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const evaluate = (condition: Condition, variables: Record<string, unknown>): boolean => {
  switch (condition.op) {
    case "exists":
      return getValue(variables, condition.var) !== undefined;
    case "equals":
      return getValue(variables, condition.var) === condition.value;
    case "contains": {
      const value = getValue(variables, condition.var);
      return typeof value === "string" && value.includes(condition.value);
    }
    case "gt":
      return Number(getValue(variables, condition.var)) > condition.value;
    case "gte":
      return Number(getValue(variables, condition.var)) >= condition.value;
    case "lt":
      return Number(getValue(variables, condition.var)) < condition.value;
    case "lte":
      return Number(getValue(variables, condition.var)) <= condition.value;
    case "and":
      return condition.all.every((nestedCondition: Condition) =>
        evaluate(nestedCondition, variables),
      );
    case "or":
      return condition.any.some((nestedCondition: Condition) =>
        evaluate(nestedCondition, variables),
      );
    case "not":
      return !evaluate(condition.cond, variables);
    default:
      return false;
  }
};

export const makeBranchHandler = (): StepHandler => (input) =>
  Effect.gen(function* () {
    const step = input.step as BranchStepConfig;
    const variables = input.variables ?? {};

    for (const branch of step.branches) {
      if (evaluate(branch.when, variables)) {
        return {
          nextStepId: branch.next.stepId ?? null,
          requiresUserInput: false,
        };
      }
    }

    return {
      nextStepId: step.defaultNext?.stepId ?? null,
      requiresUserInput: false,
    };
  });
