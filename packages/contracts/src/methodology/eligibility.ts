import { Schema } from "effect";
import { GateClass } from "./lifecycle.js";
import { TransitionConditionSet } from "./lifecycle.js";

export const WorkflowEligibilityDiagnostic = Schema.Struct({
  code: Schema.NonEmptyString,
  blocking: Schema.Boolean,
  required: Schema.String,
  observed: Schema.String,
  remediation: Schema.String,
});
export type WorkflowEligibilityDiagnostic = typeof WorkflowEligibilityDiagnostic.Type;

export const TransitionEligibility = Schema.Struct({
  transitionKey: Schema.NonEmptyString,
  fromState: Schema.String,
  toState: Schema.NonEmptyString,
  gateClass: GateClass,
  conditionSets: Schema.Array(TransitionConditionSet),
  eligibleWorkflowKeys: Schema.Array(Schema.NonEmptyString),
  workflowSelectionRequired: Schema.Boolean,
  workflowBlocked: Schema.Boolean,
  workflowDiagnostics: Schema.Array(WorkflowEligibilityDiagnostic),
});
export type TransitionEligibility = typeof TransitionEligibility.Type;

export const GetTransitionEligibilityInput = Schema.Struct({
  versionId: Schema.NonEmptyString,
  workUnitTypeKey: Schema.NonEmptyString,
  currentState: Schema.optional(Schema.String),
});
export type GetTransitionEligibilityInput = typeof GetTransitionEligibilityInput.Type;

export const GetTransitionEligibilityOutput = Schema.Struct({
  workUnitTypeKey: Schema.NonEmptyString,
  currentState: Schema.String,
  eligibleTransitions: Schema.Array(TransitionEligibility),
});
export type GetTransitionEligibilityOutput = typeof GetTransitionEligibilityOutput.Type;
