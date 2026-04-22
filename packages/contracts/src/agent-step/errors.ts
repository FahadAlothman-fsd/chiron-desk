import * as Schema from "effect/Schema";

export const AgentStepHarnessOperation = Schema.Literal(
  "start_session",
  "send_message",
  "stream_events",
  "update_turn_selection",
  "complete_step",
);
export type AgentStepHarnessOperation = typeof AgentStepHarnessOperation.Type;

const AgentStepErrorMcpToolName = Schema.Literal(
  "read_step_execution_snapshot",
  "read_context_fact_schema",
  "read_context_fact_instances",
  "read_attachable_targets",
  "create_context_fact_instance",
  "update_context_fact_instance",
  "remove_context_fact_instance",
  "delete_context_fact_instance",
);

export const AGENT_STEP_NORMALIZED_ERROR_TAGS = [
  "AgentStepStateTransitionError",
  "HarnessExecutionError",
  "OpenCodeExecutionError",
  "McpToolValidationError",
  "McpWriteRequirementError",
  "SingleLiveStreamContractError",
] as const;

export class AgentStepStateTransitionError extends Schema.TaggedError<AgentStepStateTransitionError>()(
  "AgentStepStateTransitionError",
  {
    fromState: Schema.NonEmptyString,
    toState: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export class HarnessExecutionError extends Schema.TaggedError<HarnessExecutionError>()(
  "HarnessExecutionError",
  {
    operation: AgentStepHarnessOperation,
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export class OpenCodeExecutionError extends Schema.TaggedError<OpenCodeExecutionError>()(
  "OpenCodeExecutionError",
  {
    operation: AgentStepHarnessOperation,
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {}

export class McpToolValidationError extends Schema.TaggedError<McpToolValidationError>()(
  "McpToolValidationError",
  {
    toolName: AgentStepErrorMcpToolName,
    message: Schema.String,
  },
) {}

export class McpWriteRequirementError extends Schema.TaggedError<McpWriteRequirementError>()(
  "McpWriteRequirementError",
  {
    toolName: Schema.Literal(
      "create_context_fact_instance",
      "update_context_fact_instance",
      "remove_context_fact_instance",
      "delete_context_fact_instance",
    ),
    writeItemId: Schema.NonEmptyString,
    unsatisfiedContextFactDefinitionIds: Schema.Array(Schema.NonEmptyString),
    message: Schema.String,
  },
) {}

export class SingleLiveStreamContractError extends Schema.TaggedError<SingleLiveStreamContractError>()(
  "SingleLiveStreamContractError",
  {
    stepExecutionId: Schema.NonEmptyString,
    message: Schema.String,
  },
) {}

export const AgentStepNormalizedError = Schema.Union(
  AgentStepStateTransitionError,
  HarnessExecutionError,
  OpenCodeExecutionError,
  McpToolValidationError,
  McpWriteRequirementError,
  SingleLiveStreamContractError,
);
export type AgentStepNormalizedError = typeof AgentStepNormalizedError.Type;
