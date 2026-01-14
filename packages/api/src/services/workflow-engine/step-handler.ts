import type { WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "./execution-context";

/**
 * Step Handler Interface
 * All step type handlers must implement this interface
 */
export interface StepHandler {
  /**
   * Execute a workflow step
   * @param step - The workflow step to execute
   * @param context - Execution context with variables
   * @param userInput - User input for this step (if requiresUserInput)
   * @returns Step result with output and next step number
   */
  executeStep(
    step: WorkflowStep,
    context: ExecutionContext,
    userInput?: unknown,
  ): Promise<StepResult>;
}

/**
 * Result of step execution
 */
export interface StepResult {
  // Output data to be merged into execution variables
  output: Record<string, unknown>;

  // Next step number (null = end of workflow, or use step.nextStepNumber)
  nextStepNumber: number | null;

  // Does this step require user input? (pause execution if true)
  requiresUserInput: boolean;
}

/**
 * Unrecognized step type error
 */
export class UnknownStepTypeError extends Error {
  constructor(stepType: string) {
    super(`No handler registered for step type: ${stepType}`);
    this.name = "UnknownStepTypeError";
  }
}
