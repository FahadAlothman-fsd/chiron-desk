import { Schema } from "effect";
import { AgentTypeDefinition } from "./agent.js";
import { FactSchema } from "./fact.js";

export const GateClass = Schema.Literal("start_gate", "completion_gate");
export type GateClass = typeof GateClass.Type;

export const CardinalityPolicy = Schema.Literal("one_per_project", "many_per_project");
export type CardinalityPolicy = typeof CardinalityPolicy.Type;

export const LifecycleState = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
});
export type LifecycleState = typeof LifecycleState.Type;

export const TransitionRequiredLink = Schema.Struct({
  linkTypeKey: Schema.NonEmptyString,
  strength: Schema.optional(Schema.Literal("hard", "soft", "context")),
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
});
export type TransitionRequiredLink = typeof TransitionRequiredLink.Type;

export const LifecycleTransition = Schema.Struct({
  transitionKey: Schema.NonEmptyString,
  fromState: Schema.optional(Schema.String), // null/undefined = __absent__
  toState: Schema.NonEmptyString,
  gateClass: GateClass,
  requiredLinks: Schema.Array(TransitionRequiredLink),
});
export type LifecycleTransition = typeof LifecycleTransition.Type;

// FactSchema imported from ./fact.ts — no duplicate definition

export const WorkUnitTypeDefinition = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  cardinality: CardinalityPolicy,
  lifecycleStates: Schema.Array(LifecycleState),
  lifecycleTransitions: Schema.Array(LifecycleTransition),
  factSchemas: Schema.Array(FactSchema),
});
export type WorkUnitTypeDefinition = typeof WorkUnitTypeDefinition.Type;

export const UpdateDraftLifecycleInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypes: Schema.Array(WorkUnitTypeDefinition),
  agentTypes: Schema.optionalWith(Schema.Array(AgentTypeDefinition), { default: () => [] }),
});
export type UpdateDraftLifecycleInput = typeof UpdateDraftLifecycleInput.Type;
