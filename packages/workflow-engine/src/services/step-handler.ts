import { Effect } from "effect";
import type { WorkflowStep } from "../schema/workflow";

export type StepHandlerInput = {
  executionId: string;
  step: WorkflowStep;
  variables: Record<string, unknown>;
  userInput?: unknown;
};

export type StepHandlerOutput = {
  outputVariables?: Record<string, unknown>;
  nextStepId?: string | null;
  requiresUserInput?: boolean;
};

export type StepHandler<R = never> = (
  input: StepHandlerInput,
) => Effect.Effect<StepHandlerOutput, unknown, R>;
