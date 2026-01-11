import { Data } from "effect";

export class WorkflowNotFoundError extends Data.TaggedError(
	"WorkflowNotFoundError",
)<{
	readonly workflowId: string;
}> {}

export class ExecutionNotFoundError extends Data.TaggedError(
	"ExecutionNotFoundError",
)<{
	readonly executionId: string;
}> {}

export class MaxStepsExceededError extends Data.TaggedError(
	"MaxStepsExceededError",
)<{
	readonly executionId: string;
	readonly maxSteps: number;
}> {}

export type WorkflowError =
	| WorkflowNotFoundError
	| ExecutionNotFoundError
	| MaxStepsExceededError;

export class StepTimeoutError extends Data.TaggedError("StepTimeoutError")<{
	readonly stepId: string;
	readonly timeoutMs: number;
}> {}

export class StepValidationError extends Data.TaggedError(
	"StepValidationError",
)<{
	readonly stepId: string;
	readonly message: string;
}> {}

export class UnknownStepTypeError extends Data.TaggedError(
	"UnknownStepTypeError",
)<{
	readonly stepType: string;
}> {}

export type StepError =
	| StepTimeoutError
	| StepValidationError
	| UnknownStepTypeError;

export class VariableNotFoundError extends Data.TaggedError(
	"VariableNotFoundError",
)<{
	readonly variableName: string;
	readonly executionId: string;
}> {}

export class VariableValidationError extends Data.TaggedError(
	"VariableValidationError",
)<{
	readonly variableName: string;
	readonly message: string;
}> {}

export type VariableError = VariableNotFoundError | VariableValidationError;

export class AgentStreamError extends Data.TaggedError("AgentStreamError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class ToolExecutionError extends Data.TaggedError("ToolExecutionError")<{
	readonly toolName: string;
	readonly message: string;
	readonly cause?: unknown;
}> {}

export class ApprovalRejectedError extends Data.TaggedError(
	"ApprovalRejectedError",
)<{
	readonly stepId: string;
	readonly reason?: string;
}> {}

export type AgentError =
	| AgentStreamError
	| ToolExecutionError
	| ApprovalRejectedError;

export type AllWorkflowErrors =
	| WorkflowError
	| StepError
	| VariableError
	| AgentError;
