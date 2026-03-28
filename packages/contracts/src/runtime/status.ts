import * as Schema from "effect/Schema";

export const TRANSITION_EXECUTION_STATUSES = ["active", "completed", "superseded"] as const;
export const TransitionExecutionStatus = Schema.Literal(...TRANSITION_EXECUTION_STATUSES);
export type TransitionExecutionStatus = typeof TransitionExecutionStatus.Type;

export const WORKFLOW_EXECUTION_STATUSES = [
  "active",
  "completed",
  "superseded",
  "parent_superseded",
] as const;
export const WorkflowExecutionStatus = Schema.Literal(...WORKFLOW_EXECUTION_STATUSES);
export type WorkflowExecutionStatus = typeof WorkflowExecutionStatus.Type;

export const RUNTIME_CANDIDATE_AVAILABILITIES = ["available", "blocked"] as const;
export const RuntimeCandidateAvailability = Schema.Literal(...RUNTIME_CANDIDATE_AVAILABILITIES);
export type RuntimeCandidateAvailability = typeof RuntimeCandidateAvailability.Type;
