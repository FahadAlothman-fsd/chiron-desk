import type {
  BranchRouteConditionPayload,
  WorkflowContextFactKind,
} from "@chiron/contracts/methodology/workflow";
import { Context, Effect, Layer, Option } from "effect";

import { ValidationDecodeError } from "../errors";

export interface ConditionOperator {
  readonly key: string;
  readonly label: string;
  readonly supportedFactKinds: readonly WorkflowContextFactKind[];
  readonly requiresComparison: boolean;
  readonly validateComparison: (comparison: unknown) => boolean;
}

const hasComparableValue = (comparison: unknown): boolean =>
  typeof comparison === "object" &&
  comparison !== null &&
  "value" in comparison &&
  typeof (comparison as { value?: unknown }).value !== "undefined";

const hasComparableValues = (comparison: unknown): boolean =>
  typeof comparison === "object" &&
  comparison !== null &&
  "values" in comparison &&
  Array.isArray((comparison as { values?: unknown }).values);

export const BuiltInConditionOperators: readonly ConditionOperator[] = [
  {
    key: "equals",
    label: "Equals",
    supportedFactKinds: [
      "plain_value_fact",
      "definition_backed_external_fact",
      "bound_external_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: true,
    validateComparison: hasComparableValue,
  },
  {
    key: "notEquals",
    label: "Not Equals",
    supportedFactKinds: [
      "plain_value_fact",
      "definition_backed_external_fact",
      "bound_external_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: true,
    validateComparison: hasComparableValue,
  },
  {
    key: "contains",
    label: "Contains",
    supportedFactKinds: [
      "plain_value_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: true,
    validateComparison: hasComparableValue,
  },
  {
    key: "in",
    label: "In",
    supportedFactKinds: [
      "plain_value_fact",
      "definition_backed_external_fact",
      "bound_external_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: true,
    validateComparison: hasComparableValues,
  },
  {
    key: "isEmpty",
    label: "Is Empty",
    supportedFactKinds: [
      "plain_value_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: false,
    validateComparison: () => true,
  },
  {
    key: "isNotEmpty",
    label: "Is Not Empty",
    supportedFactKinds: [
      "plain_value_fact",
      "workflow_reference_fact",
      "artifact_reference_fact",
      "work_unit_draft_spec_fact",
    ],
    requiresComparison: false,
    validateComparison: () => true,
  },
];

export class ConditionRegistry extends Context.Tag("ConditionRegistry")<
  ConditionRegistry,
  {
    readonly getOperator: (key: string) => Option.Option<ConditionOperator>;
    readonly listOperatorsForFactKind: (
      factKind: WorkflowContextFactKind,
    ) => readonly ConditionOperator[];
    readonly registerOperator: (operator: ConditionOperator) => void;
  }
>() {}

export const ConditionRegistryLive = Layer.sync(ConditionRegistry, () => {
  const operators = new Map(BuiltInConditionOperators.map((operator) => [operator.key, operator]));

  return ConditionRegistry.of({
    getOperator: (key) => Option.fromNullable(operators.get(key)),
    listOperatorsForFactKind: (factKind) =>
      [...operators.values()].filter((operator) => operator.supportedFactKinds.includes(factKind)),
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
    ) => Effect.Effect<void, ValidationDecodeError>;
    readonly validateConditionSet: (
      conditions: readonly BranchRouteConditionPayload[],
    ) => Effect.Effect<void, ValidationDecodeError>;
  }
>() {}

export const ConditionValidatorLive = Layer.effect(
  ConditionValidator,
  Effect.gen(function* () {
    const registry = yield* ConditionRegistry;

    const validateCondition = (condition: BranchRouteConditionPayload) =>
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

        if (!operator.supportedFactKinds.includes(condition.contextFactKind)) {
          return yield* new ValidationDecodeError({
            message:
              `Branch condition operator '${condition.operator}' does not support fact kind ` +
              `'${condition.contextFactKind}'`,
          });
        }

        if (operator.requiresComparison && !operator.validateComparison(condition.comparisonJson)) {
          return yield* new ValidationDecodeError({
            message: `Branch condition operator '${condition.operator}' requires valid comparison data`,
          });
        }

        if (
          !operator.requiresComparison &&
          !operator.validateComparison(condition.comparisonJson)
        ) {
          return yield* new ValidationDecodeError({
            message: `Branch condition operator '${condition.operator}' received invalid comparison data`,
          });
        }
      });

    const validateConditionSet = (conditions: readonly BranchRouteConditionPayload[]) =>
      Effect.forEach(conditions, validateCondition, { discard: true });

    return ConditionValidator.of({ validateCondition, validateConditionSet });
  }),
).pipe(Layer.provide(ConditionRegistryLive));
