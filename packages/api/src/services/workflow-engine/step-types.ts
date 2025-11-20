/**
 * Step Types Map - Centralized type map for compile-time type safety
 * Story 1.5: Real implementations for execute-action and ask-user handlers
 */

import type { StepHandler } from "./step-handler";
import { AskUserChatStepHandler } from "./step-handlers/ask-user-chat-handler";
import { AskUserStepHandler } from "./step-handlers/ask-user-handler";
import { ExecuteActionStepHandler } from "./step-handlers/execute-action-handler";

// Placeholder handlers for Story 1.4 (actual implementations in future stories)
// These handlers will auto-advance using nextStepNumber
class PlaceholderStepHandler implements StepHandler {
	constructor(private stepType: string) {}

	async executeStep(step: any, _context: any, _userInput?: unknown) {
		console.warn(
			`Placeholder handler for step type: ${this.stepType} (step ${step.stepNumber})`,
		);

		return {
			output: {},
			nextStepNumber: step.nextStepNumber ?? null,
			requiresUserInput: false, // Auto-advance
		};
	}
}

/**
 * STEP_HANDLERS - Centralized registry for type safety
 * Add new step types here as they are implemented
 */
export const STEP_HANDLERS = {
	"ask-user": new AskUserStepHandler(),
	"ask-user-chat": new AskUserChatStepHandler(),
	"llm-generate": new PlaceholderStepHandler("llm-generate"),
	branch: new PlaceholderStepHandler("branch"),
	"approval-checkpoint": new PlaceholderStepHandler("approval-checkpoint"),
	"execute-action": new ExecuteActionStepHandler(),
	"invoke-workflow": new PlaceholderStepHandler("invoke-workflow"),
	"display-output": new PlaceholderStepHandler("display-output"),
	"question-set": new PlaceholderStepHandler("question-set"),
} as const;

/**
 * Derive StepType union from STEP_HANDLERS keys
 * This ensures compile-time type safety
 */
export type StepType = keyof typeof STEP_HANDLERS;

/**
 * Type guard to check if a string is a valid step type
 */
export function isValidStepType(type: string): type is StepType {
	return type in STEP_HANDLERS;
}
