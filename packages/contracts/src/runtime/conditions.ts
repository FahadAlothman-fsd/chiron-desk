import * as Schema from "effect/Schema";

export const CONDITION_KINDS = ["fact", "work_unit_fact", "artifact", "work_unit"] as const;
export const ConditionKind = Schema.Literal(...CONDITION_KINDS);
export type ConditionKind = typeof ConditionKind.Type;

const PositiveInteger = Schema.Number.pipe(
  Schema.filter((value) => Number.isInteger(value) && value > 0),
);

const NonEmptyStateKeys = Schema.Array(Schema.NonEmptyString).pipe(
  Schema.filter((value) => value.length > 0),
);

export const ARTIFACT_CONDITION_OPERATORS = ["exists", "stale", "fresh"] as const;
export const ArtifactConditionOperator = Schema.Literal(...ARTIFACT_CONDITION_OPERATORS);
export type ArtifactConditionOperator = typeof ArtifactConditionOperator.Type;

export const FACT_CONDITION_OPERATORS = ["exists", "equals"] as const;
export const FactConditionOperator = Schema.Literal(...FACT_CONDITION_OPERATORS);
export type FactConditionOperator = typeof FactConditionOperator.Type;

export const WORK_UNIT_FACT_CONDITION_OPERATORS = ["exists", "equals"] as const;
export const WorkUnitFactConditionOperator = Schema.Literal(...WORK_UNIT_FACT_CONDITION_OPERATORS);
export type WorkUnitFactConditionOperator = typeof WorkUnitFactConditionOperator.Type;

export const WORK_UNIT_CONDITION_OPERATORS = [
  "work_unit_instance_exists",
  "work_unit_instance_exists_in_state",
] as const;
export const WorkUnitConditionOperator = Schema.Literal(...WORK_UNIT_CONDITION_OPERATORS);
export type WorkUnitConditionOperator = typeof WorkUnitConditionOperator.Type;

export const RuntimeConditionMode = Schema.Literal("all", "any");
export type RuntimeConditionMode = typeof RuntimeConditionMode.Type;

// Plan A keeps runtime value handling intentionally narrow. `subFieldKey` and `comparisonJson`
// support the current branch/gate overlap only; canonical draft-spec normalization, shared typed
// fact-instance decoding, and broader operator convergence are deferred to Plan B.
export const FactCondition = Schema.Struct({
  kind: Schema.Literal("fact"),
  factDefinitionId: Schema.optional(Schema.String),
  factKey: Schema.String,
  subFieldKey: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  operator: FactConditionOperator,
  isNegated: Schema.optional(Schema.Boolean),
  comparisonJson: Schema.optional(Schema.NullOr(Schema.Unknown)),
});
export type FactCondition = typeof FactCondition.Type;

export const WorkUnitFactCondition = Schema.Struct({
  kind: Schema.Literal("work_unit_fact"),
  factDefinitionId: Schema.optional(Schema.String),
  factKey: Schema.String,
  subFieldKey: Schema.optional(Schema.NullOr(Schema.NonEmptyString)),
  operator: WorkUnitFactConditionOperator,
  isNegated: Schema.optional(Schema.Boolean),
  comparisonJson: Schema.optional(Schema.NullOr(Schema.Unknown)),
});
export type WorkUnitFactCondition = typeof WorkUnitFactCondition.Type;

export const ArtifactCondition = Schema.Struct({
  kind: Schema.Literal("artifact"),
  slotDefinitionId: Schema.optional(Schema.String),
  slotKey: Schema.String,
  operator: ArtifactConditionOperator,
  isNegated: Schema.optional(Schema.Boolean),
});
export type ArtifactCondition = typeof ArtifactCondition.Type;

export const WorkUnitCondition = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("work_unit"),
    workUnitTypeKey: Schema.NonEmptyString,
    operator: Schema.Literal("work_unit_instance_exists"),
    minCount: Schema.optionalWith(PositiveInteger, { default: () => 1 }),
    isNegated: Schema.optional(Schema.Boolean),
  }),
  Schema.Struct({
    kind: Schema.Literal("work_unit"),
    workUnitTypeKey: Schema.NonEmptyString,
    operator: Schema.Literal("work_unit_instance_exists_in_state"),
    stateKeys: NonEmptyStateKeys,
    minCount: Schema.optionalWith(PositiveInteger, { default: () => 1 }),
    isNegated: Schema.optional(Schema.Boolean),
  }),
);
export type WorkUnitCondition = typeof WorkUnitCondition.Type;

export const RuntimeCondition = Schema.Union(
  FactCondition,
  WorkUnitFactCondition,
  ArtifactCondition,
  WorkUnitCondition,
);
export type RuntimeCondition = typeof RuntimeCondition.Type;

export const RuntimeConditionTree = Schema.suspend(
  (): Schema.Schema.AnyNoContext =>
    Schema.Struct({
      mode: RuntimeConditionMode,
      conditions: Schema.Array(RuntimeCondition),
      groups: Schema.Array(RuntimeConditionTree),
    }),
);
export type RuntimeConditionTree = Schema.Schema.Type<typeof RuntimeConditionTree>;

export const RuntimeConditionEvaluation = Schema.Struct({
  condition: RuntimeCondition,
  met: Schema.Boolean,
  reason: Schema.optional(Schema.String),
  expectedValueJson: Schema.optional(Schema.Unknown),
  currentValueJson: Schema.optional(Schema.Unknown),
});
export type RuntimeConditionEvaluation = typeof RuntimeConditionEvaluation.Type;

export const RuntimeConditionEvaluationTree = Schema.suspend(
  (): Schema.Schema.AnyNoContext =>
    Schema.Struct({
      mode: RuntimeConditionMode,
      met: Schema.Boolean,
      reason: Schema.optional(Schema.String),
      conditions: Schema.Array(RuntimeConditionEvaluation),
      groups: Schema.Array(RuntimeConditionEvaluationTree),
    }),
);
export type RuntimeConditionEvaluationTree = typeof RuntimeConditionEvaluationTree.Type;
