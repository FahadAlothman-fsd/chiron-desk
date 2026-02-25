import { Schema } from "effect";
import { GateClass } from "./lifecycle.js";
import { DependencyStrength } from "./dependency.js";

export const RequiredLinkEligibility = Schema.Struct({
  linkTypeKey: Schema.NonEmptyString,
  strength: DependencyStrength,
  required: Schema.Boolean,
});
export type RequiredLinkEligibility = typeof RequiredLinkEligibility.Type;

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
  requiredLinks: Schema.Array(RequiredLinkEligibility),
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
