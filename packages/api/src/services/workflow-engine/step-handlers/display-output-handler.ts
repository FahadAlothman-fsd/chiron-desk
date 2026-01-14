import type { DisplayOutputStepConfig, WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";

/**
 * DisplayOutputStepHandler - Displays information to the user and waits for acknowledgment.
 * Pauses execution so the user can read the output before proceeding/completing.
 */
export class DisplayOutputStepHandler implements StepHandler {
  async executeStep(
    step: WorkflowStep,
    _context: ExecutionContext,
    userInput?: unknown,
  ): Promise<StepResult> {
    const _config = step.config as DisplayOutputStepConfig;

    // If we have userInput (any truthy value), it means the user clicked "Continue"
    if (userInput) {
      return {
        output: {},
        nextStepNumber: step.nextStepNumber ?? null,
        requiresUserInput: false, // Complete the step
      };
    }

    // Otherwise, pause and wait for user acknowledgment
    return {
      output: {},
      nextStepNumber: step.nextStepNumber ?? null,
      requiresUserInput: true,
    };
  }
}
