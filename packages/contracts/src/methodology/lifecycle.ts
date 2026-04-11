import * as Schema from "effect/Schema";
import { AgentTypeDefinition } from "./agent.js";
import { FactSchema } from "./fact.js";
import { AudienceGuidance, GuidanceMarkdownContent } from "./guidance.js";

export const GateClass = Schema.Literal("start_gate", "completion_gate");
export type GateClass = typeof GateClass.Type;

export const CardinalityPolicy = Schema.Literal("one_per_project", "many_per_project");
export type CardinalityPolicy = typeof CardinalityPolicy.Type;

export const LifecycleState = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(AudienceGuidance),
});
export type LifecycleState = typeof LifecycleState.Type;

export const TransitionCondition = Schema.Struct({
  kind: Schema.NonEmptyString,
  required: Schema.optionalWith(Schema.Boolean, { default: () => true }),
  config: Schema.Unknown,
  rationale: Schema.optional(Schema.String),
});
export type TransitionCondition = typeof TransitionCondition.Type;

export const TransitionConditionGroupMode = Schema.Literal("all", "any");
export type TransitionConditionGroupMode = typeof TransitionConditionGroupMode.Type;

export const TransitionConditionGroup = Schema.Struct({
  key: Schema.NonEmptyString,
  mode: TransitionConditionGroupMode,
  conditions: Schema.Array(TransitionCondition),
});
export type TransitionConditionGroup = typeof TransitionConditionGroup.Type;

export const TransitionConditionSetPhase = Schema.Literal("start", "completion");
export type TransitionConditionSetPhase = typeof TransitionConditionSetPhase.Type;

export const TransitionConditionSetMode = Schema.Literal("all", "any");
export type TransitionConditionSetMode = typeof TransitionConditionSetMode.Type;

export const TransitionConditionSet = Schema.Struct({
  key: Schema.NonEmptyString,
  phase: TransitionConditionSetPhase,
  mode: TransitionConditionSetMode,
  groups: Schema.Array(TransitionConditionGroup),
});
export type TransitionConditionSet = typeof TransitionConditionSet.Type;

export const LifecycleTransition = Schema.Struct({
  transitionId: Schema.optional(Schema.NonEmptyString),
  transitionKey: Schema.NonEmptyString,
  fromState: Schema.optional(Schema.String), // null/undefined = __absent__
  toState: Schema.NonEmptyString,
  description: Schema.optional(GuidanceMarkdownContent),
  guidance: Schema.optional(AudienceGuidance),
  conditionSets: Schema.Array(TransitionConditionSet),
});
export type LifecycleTransition = typeof LifecycleTransition.Type;

// FactSchema imported from ./fact.ts — no duplicate definition

export const WorkUnitTypeDefinition = Schema.Struct({
  id: Schema.optional(Schema.NonEmptyString),
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(AudienceGuidance),
  cardinality: CardinalityPolicy,
  lifecycleStates: Schema.Array(LifecycleState),
  lifecycleTransitions: Schema.Array(LifecycleTransition),
  factSchemas: Schema.Array(FactSchema),
});
export type WorkUnitTypeDefinition = typeof WorkUnitTypeDefinition.Type;

export const CreateMethodologyWorkUnitTypeInput = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(AudienceGuidance),
  cardinality: Schema.optional(CardinalityPolicy),
});
export type CreateMethodologyWorkUnitTypeInput = typeof CreateMethodologyWorkUnitTypeInput.Type;

export const CreateMethodologyWorkUnitInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitType: CreateMethodologyWorkUnitTypeInput,
});
export type CreateMethodologyWorkUnitInput = typeof CreateMethodologyWorkUnitInput.Type;

export const UpdateMethodologyWorkUnitTypeInput = Schema.Struct({
  key: Schema.NonEmptyString,
  displayName: Schema.optional(Schema.String),
  description: Schema.optional(Schema.Union(GuidanceMarkdownContent, Schema.String)),
  guidance: Schema.optional(AudienceGuidance),
  cardinality: Schema.optional(CardinalityPolicy),
});
export type UpdateMethodologyWorkUnitTypeInput = typeof UpdateMethodologyWorkUnitTypeInput.Type;

export const UpdateMethodologyWorkUnitInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitKey: Schema.NonEmptyString,
  workUnitType: UpdateMethodologyWorkUnitTypeInput,
});
export type UpdateMethodologyWorkUnitInput = typeof UpdateMethodologyWorkUnitInput.Type;

export const UpdateDraftLifecycleInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypes: Schema.Array(WorkUnitTypeDefinition),
  agentTypes: Schema.optionalWith(Schema.Array(AgentTypeDefinition), { default: () => [] }),
});
export type UpdateDraftLifecycleInput = typeof UpdateDraftLifecycleInput.Type;

export const GetWorkUnitStateMachineInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
});
export type GetWorkUnitStateMachineInput = typeof GetWorkUnitStateMachineInput.Type;

export const UpsertWorkUnitLifecycleStateInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  state: LifecycleState,
});
export type UpsertWorkUnitLifecycleStateInput = typeof UpsertWorkUnitLifecycleStateInput.Type;

export const DeleteWorkUnitLifecycleStateStrategy = Schema.Literal("disconnect", "cleanup");
export type DeleteWorkUnitLifecycleStateStrategy = typeof DeleteWorkUnitLifecycleStateStrategy.Type;

export const DeleteWorkUnitLifecycleStateInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  stateKey: Schema.NonEmptyString,
  strategy: Schema.optionalWith(DeleteWorkUnitLifecycleStateStrategy, {
    default: () => "disconnect",
  }),
});
export type DeleteWorkUnitLifecycleStateInput = typeof DeleteWorkUnitLifecycleStateInput.Type;

export const UpsertWorkUnitLifecycleTransitionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  transition: Schema.Struct({
    transitionKey: Schema.NonEmptyString,
    fromState: Schema.optional(Schema.String), // null/undefined = __absent__
    toState: Schema.NonEmptyString,
    description: Schema.optional(GuidanceMarkdownContent),
    guidance: Schema.optional(AudienceGuidance),
  }),
});
export type UpsertWorkUnitLifecycleTransitionInput =
  typeof UpsertWorkUnitLifecycleTransitionInput.Type;

export const SaveWorkUnitLifecycleTransitionDialogInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  transition: Schema.Struct({
    transitionKey: Schema.NonEmptyString,
    fromState: Schema.optional(Schema.String),
    toState: Schema.NonEmptyString,
    description: Schema.optional(GuidanceMarkdownContent),
    guidance: Schema.optional(AudienceGuidance),
  }),
  conditionSets: Schema.Array(TransitionConditionSet),
  workflowKeys: Schema.Array(Schema.NonEmptyString),
});
export type SaveWorkUnitLifecycleTransitionDialogInput =
  typeof SaveWorkUnitLifecycleTransitionDialogInput.Type;

export const DeleteWorkUnitLifecycleTransitionInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  transitionKey: Schema.NonEmptyString,
});
export type DeleteWorkUnitLifecycleTransitionInput =
  typeof DeleteWorkUnitLifecycleTransitionInput.Type;

export const ReplaceWorkUnitTransitionConditionSetsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  transitionKey: Schema.NonEmptyString,
  conditionSets: Schema.Array(TransitionConditionSet),
});
export type ReplaceWorkUnitTransitionConditionSetsInput =
  typeof ReplaceWorkUnitTransitionConditionSetsInput.Type;

export const ReplaceWorkUnitTransitionBindingsInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  transitionKey: Schema.NonEmptyString,
  workflowKeys: Schema.Array(Schema.NonEmptyString),
});
export type ReplaceWorkUnitTransitionBindingsInput =
  typeof ReplaceWorkUnitTransitionBindingsInput.Type;
