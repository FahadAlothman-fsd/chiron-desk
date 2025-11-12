import type { ExecuteActionStepConfig, WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";
import { resolveVariables } from "../variable-resolver";

/**
 * ExecuteActionStepHandler - Executes backend actions without user input
 * Supports set-variable, file, git, and database actions
 */
export class ExecuteActionStepHandler implements StepHandler {
	async executeStep(
		step: WorkflowStep,
		context: ExecutionContext,
		userInput?: unknown,
	): Promise<StepResult> {
		const config = step.config as ExecuteActionStepConfig;

		// Check if this step requires user confirmation
		if (config.requiresUserConfirmation) {
			// If userInput is undefined, this is the first execution - pause for confirmation
			if (userInput === undefined) {
				console.log(
					"[ExecuteActionHandler] First execution - requiring user confirmation",
				);

				// Execute actions to prepare the output
				const resolvedActions = await this.resolveActions(
					config.actions,
					context,
				);
				const output =
					config.executionMode === "parallel"
						? await this.executeParallel(resolvedActions, context)
						: await this.executeSequential(resolvedActions, context);

				return {
					output, // Return the computed output for preview
					nextStepNumber: step.nextStepNumber ?? null,
					requiresUserInput: true, // Wait for user to click Continue
				};
			}

			console.log("[ExecuteActionHandler] User confirmed - completing step");
		}

		// Execute actions (either no confirmation needed, or user already confirmed)
		const resolvedActions = await this.resolveActions(config.actions, context);

		// Execute actions based on execution mode
		const output =
			config.executionMode === "parallel"
				? await this.executeParallel(resolvedActions, context)
				: await this.executeSequential(resolvedActions, context);

		return {
			output,
			nextStepNumber: step.nextStepNumber ?? null,
			requiresUserInput: false, // Complete the step
		};
	}

	/**
	 * Resolve variables in action configurations
	 */
	private async resolveActions(
		actions: ExecuteActionStepConfig["actions"],
		context: ExecutionContext,
	): Promise<ExecuteActionStepConfig["actions"]> {
		const resolved = [];

		for (const action of actions) {
			if (action.type === "set-variable") {
				let resolvedValue = action.config.value;

				// Only resolve if it's a string (might contain {{variables}})
				if (typeof action.config.value === "string") {
					resolvedValue = resolveVariables(action.config.value, context);
				}

				resolved.push({
					...action,
					config: {
						...action.config,
						value: resolvedValue,
					},
				});
			} else {
				// For future action types (file, git, database)
				resolved.push(action);
			}
		}

		return resolved;
	}

	/**
	 * Execute actions sequentially (each action sees previous action's output)
	 */
	private async executeSequential(
		actions: ExecuteActionStepConfig["actions"],
		context: ExecutionContext,
	): Promise<Record<string, unknown>> {
		const output: Record<string, unknown> = {};

		for (const action of actions) {
			try {
				const actionOutput = await this.executeAction(action, context, output);
				Object.assign(output, actionOutput);
			} catch (error) {
				throw new Error(
					`Action ${action.type} failed at step index ${actions.indexOf(action)}: ${error}`,
				);
			}
		}

		return output;
	}

	/**
	 * Execute actions in parallel (independent execution)
	 */
	private async executeParallel(
		actions: ExecuteActionStepConfig["actions"],
		context: ExecutionContext,
	): Promise<Record<string, unknown>> {
		const promises = actions.map(async (action) => {
			try {
				return await this.executeAction(action, context, {});
			} catch (error) {
				throw new Error(`Parallel action ${action.type} failed: ${error}`);
			}
		});

		const results = await Promise.all(promises);
		return results.reduce((acc, result) => ({ ...acc, ...result }), {});
	}

	/**
	 * Execute a single action
	 */
	private async executeAction(
		action: ExecuteActionStepConfig["actions"][0],
		context: ExecutionContext,
		currentOutput: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		switch (action.type) {
			case "set-variable":
				return this.executeSetVariable(action, context);

			case "file":
				throw new Error("File actions not implemented yet (future story)");

			case "git":
				throw new Error("Git actions not implemented yet (future story)");

			case "database":
				throw new Error("Database actions not implemented yet (future story)");

			default:
				throw new Error(`Unknown action type: ${(action as any).type}`);
		}
	}

	/**
	 * Execute set-variable action
	 */
	private async executeSetVariable(
		action: Extract<
			ExecuteActionStepConfig["actions"][0],
			{ type: "set-variable" }
		>,
		context: ExecutionContext,
	): Promise<Record<string, unknown>> {
		const { variable, value } = action.config;

		// Handle nested variable paths (e.g., "metadata.complexity")
		if (variable.includes(".")) {
			return this.setNestedVariable(variable, value, context);
		}

		// Simple variable assignment
		return { [variable]: value };
	}

	/**
	 * Set nested variable path (e.g., "metadata.complexity")
	 */
	private setNestedVariable(
		path: string,
		value: unknown,
		context: ExecutionContext,
	): Record<string, unknown> {
		const keys = path.split(".");
		const rootKey = keys[0];
		const nestedPath = keys.slice(1);

		// Get existing root object or create new
		const existing =
			(context.executionVariables[rootKey] as Record<string, unknown>) || {};

		// Navigate to nested location and set value
		let current = existing;
		for (let i = 0; i < nestedPath.length - 1; i++) {
			const key = nestedPath[i];
			if (!(key in current)) {
				current[key] = {};
			}
			current = current[key] as Record<string, unknown>;
		}

		// Set final value
		current[nestedPath[nestedPath.length - 1]] = value;

		return { [rootKey]: existing };
	}
}
