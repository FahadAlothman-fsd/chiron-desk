import * as Schema from "effect/Schema";

export const CONDITION_KINDS = ["fact", "work_unit_fact", "artifact"] as const;
export const ConditionKind = Schema.Literal(...CONDITION_KINDS);
export type ConditionKind = typeof ConditionKind.Type;

export const ARTIFACT_CONDITION_OPERATORS = ["exists", "stale", "fresh"] as const;
export const ArtifactConditionOperator = Schema.Literal(...ARTIFACT_CONDITION_OPERATORS);
export type ArtifactConditionOperator = typeof ArtifactConditionOperator.Type;

export const FactConditionOperator = Schema.Literal("exists");
export type FactConditionOperator = typeof FactConditionOperator.Type;

export const WorkUnitFactConditionOperator = Schema.Literal("exists");
export type WorkUnitFactConditionOperator = typeof WorkUnitFactConditionOperator.Type;

export const RuntimeConditionMode = Schema.Literal("all", "any");
export type RuntimeConditionMode = typeof RuntimeConditionMode.Type;

export const FactCondition = Schema.Struct({
  kind: Schema.Literal("fact"),
  factDefinitionId: Schema.optional(Schema.String),
  factKey: Schema.String,
  operator: FactConditionOperator,
});
export type FactCondition = typeof FactCondition.Type;

export const WorkUnitFactCondition = Schema.Struct({
  kind: Schema.Literal("work_unit_fact"),
  factDefinitionId: Schema.optional(Schema.String),
  factKey: Schema.String,
  operator: WorkUnitFactConditionOperator,
});
export type WorkUnitFactCondition = typeof WorkUnitFactCondition.Type;

export const ArtifactCondition = Schema.Struct({
  kind: Schema.Literal("artifact"),
  slotDefinitionId: Schema.optional(Schema.String),
  slotKey: Schema.String,
  operator: ArtifactConditionOperator,
});
export type ArtifactCondition = typeof ArtifactCondition.Type;

export const RuntimeCondition = Schema.Union(
  FactCondition,
  WorkUnitFactCondition,
  ArtifactCondition,
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
