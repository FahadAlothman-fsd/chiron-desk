import { Effect, Schema } from "effect";
import type { WorkflowConfig, WorkflowStep } from "../schema/workflow";
import { WorkflowSchema, WorkflowStepSchema } from "../schema/workflow";

export class WorkflowDecodeError extends Error {
  readonly _tag = "WorkflowDecodeError";

  constructor(
    message: string,
    readonly causeValue: unknown,
  ) {
    super(message);
    this.name = "WorkflowDecodeError";
  }
}

export const decodeWorkflow = (
  input: unknown,
): Effect.Effect<WorkflowConfig, WorkflowDecodeError> =>
  Schema.decodeUnknown(WorkflowSchema)(input).pipe(
    Effect.mapError(
      (error) =>
        new WorkflowDecodeError(`Failed to decode workflow config: ${String(error)}`, input),
    ),
  );

export const decodeWorkflowStep = (
  input: unknown,
): Effect.Effect<WorkflowStep, WorkflowDecodeError> =>
  Schema.decodeUnknown(WorkflowStepSchema)(input).pipe(
    Effect.mapError(
      (error) => new WorkflowDecodeError(`Failed to decode workflow step: ${String(error)}`, input),
    ),
  );
