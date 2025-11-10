import type { StepHandler } from "./step-handler";
import { UnknownStepTypeError } from "./step-handler";
import { STEP_HANDLERS } from "./step-types";

/**
 * Step Registry - Maps step types to handler implementations
 * Initialized from STEP_HANDLERS type map for type safety
 */

class StepRegistry {
	private handlers: Map<string, StepHandler>;

	constructor() {
		this.handlers = new Map();
		this.initializeFromTypeMap();
	}

	/**
	 * Initialize registry from centralized STEP_HANDLERS type map
	 */
	private initializeFromTypeMap() {
		for (const [stepType, handler] of Object.entries(STEP_HANDLERS)) {
			this.handlers.set(stepType, handler);
		}
	}

	/**
	 * Get handler for a step type
	 * @throws UnknownStepTypeError if handler not found
	 */
	getHandler(stepType: string): StepHandler {
		const handler = this.handlers.get(stepType);

		if (!handler) {
			// Log warning for unknown step types
			console.warn(
				`Unknown step type: ${stepType}. Will auto-advance using nextStepNumber.`,
			);
			throw new UnknownStepTypeError(stepType);
		}

		return handler;
	}

	/**
	 * Register a new handler (for runtime extensibility)
	 */
	register(stepType: string, handler: StepHandler): void {
		this.handlers.set(stepType, handler);
	}

	/**
	 * Check if a step type is registered
	 */
	has(stepType: string): boolean {
		return this.handlers.has(stepType);
	}

	/**
	 * Get all registered step types
	 */
	getRegisteredTypes(): string[] {
		return Array.from(this.handlers.keys());
	}
}

// Export singleton instance
export const stepRegistry = new StepRegistry();
