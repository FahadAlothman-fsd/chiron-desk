import type { BranchRouteConditionPayload } from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer, Option } from "effect";

import { ValidationDecodeError } from "../errors";

export interface ConditionOperator {
  readonly key: string;
  readonly label: string;
  readonly requiresComparison: boolean;
  readonly supportsOperand: (operand: ResolvedConditionOperand) => boolean;
  readonly validateComparison: (comparison: unknown, operand: ResolvedConditionOperand) => boolean;
}

export type ResolvedConditionOperandType =
  | "string"
  | "number"
  | "boolean"
  | "work_unit"
  | "workflow_reference"
  | "artifact_reference"
  | "json_object";

export type ResolvedConditionOperand = {
  readonly operandType: ResolvedConditionOperandType;
  readonly cardinality: "one" | "many";
  readonly freshnessCapable: boolean;
};

const hasComparableValue = (comparison: unknown): boolean =>
  typeof comparison === "object" &&
  comparison !== null &&
  "value" in comparison &&
  typeof (comparison as { value?: unknown }).value !== "undefined";

const hasStringComparableValue = (comparison: unknown): boolean => {
  if (!hasComparableValue(comparison)) {
    return false;
  }

  return typeof (comparison as { value?: unknown }).value === "string";
};

const hasBooleanComparableValue = (comparison: unknown): boolean => {
  if (!hasComparableValue(comparison)) {
    return false;
  }

  return typeof (comparison as { value?: unknown }).value === "boolean";
};

const hasNumericComparableValue = (comparison: unknown): boolean => {
  if (typeof comparison !== "object" || comparison === null || !("value" in comparison)) {
    return false;
  }

  const value = (comparison as { value?: unknown }).value;
  return typeof value === "number" && Number.isFinite(value);
};

const hasNumericRange = (comparison: unknown): boolean => {
  if (typeof comparison !== "object" || comparison === null) {
    return false;
  }

  if (!("min" in comparison && "max" in comparison)) {
    return false;
  }

  const min = (comparison as { min?: unknown }).min;
  const max = (comparison as { max?: unknown }).max;

  return (
    typeof min === "number" &&
    typeof max === "number" &&
    Number.isFinite(min) &&
    Number.isFinite(max) &&
    min <= max
  );
};

const hasNoComparison = (comparison: unknown): boolean =>
  typeof comparison === "undefined" || comparison === null;

const isStringOperand = (operand: ResolvedConditionOperand) => operand.operandType === "string";
const isNumberOperand = (operand: ResolvedConditionOperand) => operand.operandType === "number";
const isWorkUnitOperand = (operand: ResolvedConditionOperand) =>
  operand.operandType === "work_unit";
const isJsonObjectOperand = (operand: ResolvedConditionOperand) =>
  operand.operandType === "json_object";
const isArtifactReferenceOperand = (operand: ResolvedConditionOperand) =>
  operand.operandType === "artifact_reference";
const supportsFreshness = (operand: ResolvedConditionOperand) => operand.freshnessCapable;

const hasComparableValueForOperand = (
  comparison: unknown,
  operand: ResolvedConditionOperand,
): boolean => {
  if (operand.operandType === "number") {
    return hasNumericComparableValue(comparison);
  }

  if (operand.operandType === "boolean") {
    return hasBooleanComparableValue(comparison);
  }

  return hasComparableValue(comparison);
};

export const BuiltInConditionOperators: readonly ConditionOperator[] = [
  {
    key: "exists",
    label: "Exists",
    requiresComparison: false,
    supportsOperand: () => true,
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
  {
    key: "equals",
    label: "Equals",
    requiresComparison: true,
    supportsOperand: (operand) =>
      !isArtifactReferenceOperand(operand) && !isJsonObjectOperand(operand),
    validateComparison: (comparison, operand) => hasComparableValueForOperand(comparison, operand),
  },
  {
    key: "contains",
    label: "Contains",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparableValue(comparison),
  },
  {
    key: "starts_with",
    label: "Starts With",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparableValue(comparison),
  },
  {
    key: "ends_with",
    label: "Ends With",
    requiresComparison: true,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasStringComparableValue(comparison),
  },
  {
    key: "gt",
    label: "Greater Than",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparableValue(comparison),
  },
  {
    key: "gte",
    label: "Greater Than Or Equal",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparableValue(comparison),
  },
  {
    key: "lt",
    label: "Less Than",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparableValue(comparison),
  },
  {
    key: "lte",
    label: "Less Than Or Equal",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericComparableValue(comparison),
  },
  {
    key: "between",
    label: "Between",
    requiresComparison: true,
    supportsOperand: (operand) => isNumberOperand(operand),
    validateComparison: (comparison) => hasNumericRange(comparison),
  },
  {
    key: "exists_in_repo",
    label: "Exists In Repo",
    requiresComparison: false,
    supportsOperand: (operand) => isStringOperand(operand),
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
  {
    key: "fresh",
    label: "Fresh",
    requiresComparison: false,
    supportsOperand: (operand) => supportsFreshness(operand),
    validateComparison: (comparison) => hasNoComparison(comparison),
  },
  {
    key: "current_state",
    label: "Current State",
    requiresComparison: true,
    supportsOperand: (operand) => isWorkUnitOperand(operand),
    validateComparison: (comparison) => hasStringComparableValue(comparison),
  },
];

export class ConditionRegistry extends Context.Tag("ConditionRegistry")<
  ConditionRegistry,
  {
    readonly getOperator: (key: string) => Option.Option<ConditionOperator>;
    readonly listOperatorsForOperand: (
      operand: ResolvedConditionOperand,
    ) => readonly ConditionOperator[];
    readonly registerOperator: (operator: ConditionOperator) => void;
  }
>() {}

export const ConditionRegistryLive = Layer.sync(ConditionRegistry, () => {
  const operators = new Map(BuiltInConditionOperators.map((operator) => [operator.key, operator]));

  return ConditionRegistry.of({
    getOperator: (key) => Option.fromNullable(operators.get(key)),
    listOperatorsForOperand: (operand) =>
      [...operators.values()].filter((operator) => operator.supportsOperand(operand)),
    registerOperator: (operator) => {
      operators.set(operator.key, operator);
    },
  });
});

export class ConditionValidator extends Context.Tag("ConditionValidator")<
  ConditionValidator,
  {
    readonly validateCondition: (
      condition: BranchRouteConditionPayload,
      operand: ResolvedConditionOperand,
    ) => Effect.Effect<void, ValidationDecodeError>;
    readonly validateConditionSet: (
      conditions: ReadonlyArray<{
        readonly condition: BranchRouteConditionPayload;
        readonly operand: ResolvedConditionOperand;
      }>,
    ) => Effect.Effect<void, ValidationDecodeError>;
  }
>() {}

export const ConditionValidatorLive = Layer.effect(
  ConditionValidator,
  Effect.gen(function* () {
    const registry = yield* ConditionRegistry;

    const validateCondition = (
      condition: BranchRouteConditionPayload,
      operand: ResolvedConditionOperand,
    ) =>
      Effect.gen(function* () {
        const operator = yield* registry.getOperator(condition.operator).pipe(
          Option.match({
            onNone: () =>
              Effect.fail(
                new ValidationDecodeError({
                  message: `Unsupported branch condition operator '${condition.operator}'`,
                }),
              ),
            onSome: Effect.succeed,
          }),
        );

        if (!operator.supportsOperand(operand)) {
          return yield* new ValidationDecodeError({
            message: `Branch condition operator '${condition.operator}' does not support the selected operand`,
          });
        }

        if (
          operator.requiresComparison &&
          !operator.validateComparison(condition.comparisonJson, operand)
        ) {
          return yield* new ValidationDecodeError({
            message: `Branch condition operator '${condition.operator}' requires valid comparison data`,
          });
        }

        if (
          !operator.requiresComparison &&
          !operator.validateComparison(condition.comparisonJson, operand)
        ) {
          return yield* new ValidationDecodeError({
            message: `Branch condition operator '${condition.operator}' received invalid comparison data`,
          });
        }
      });

    const validateConditionSet = (
      conditions: ReadonlyArray<{
        readonly condition: BranchRouteConditionPayload;
        readonly operand: ResolvedConditionOperand;
      }>,
    ) =>
      Effect.forEach(
        conditions,
        ({ condition, operand }) => validateCondition(condition, operand),
        {
          discard: true,
        },
      );

    return ConditionValidator.of({ validateCondition, validateConditionSet });
  }),
).pipe(Layer.provide(ConditionRegistryLive));
