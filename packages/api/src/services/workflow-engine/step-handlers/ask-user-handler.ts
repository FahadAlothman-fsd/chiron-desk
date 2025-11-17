import * as fs from "node:fs";
import * as path from "node:path";
import type { AskUserStepConfig, WorkflowStep } from "@chiron/db";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";

/**
 * AskUserStepHandler - Captures user input with validation
 * Supports path, string, boolean, number, and choice response types
 */
export class AskUserStepHandler implements StepHandler {
	async executeStep(
		step: WorkflowStep,
		_context: ExecutionContext,
		userInput?: unknown,
	): Promise<StepResult> {
		const config = step.config as AskUserStepConfig;

		console.log(
			"[AskUserHandler] executeStep called with userInput:",
			userInput,
			"type:",
			typeof userInput,
		);

		// If no user input provided, wait for user
		if (userInput === undefined || userInput === null) {
			console.log(
				"[AskUserHandler] No user input - returning requiresUserInput: true",
			);
			return {
				output: {},
				nextStepNumber: step.nextStepNumber ?? null,
				requiresUserInput: true,
			};
		}

		console.log(
			"[AskUserHandler] User input provided - validating and continuing",
		);

		// Validate user input based on response type
		const validatedInput = await this.validateInput(userInput, config);

		// Store validated input in variable
		return {
			output: { [config.responseVariable]: validatedInput },
			nextStepNumber: step.nextStepNumber ?? null,
			requiresUserInput: false,
		};
	}

	/**
	 * Validate user input based on response type
	 */
	private async validateInput(
		userInput: unknown,
		config: AskUserStepConfig,
	): Promise<unknown> {
		switch (config.responseType) {
			case "path":
				return this.validatePath(userInput as string, config);

			case "string":
				return this.validateString(userInput as string, config);

			case "boolean":
				return this.validateBoolean(userInput);

			case "number":
				return this.validateNumber(userInput, config);

			case "choice":
				return this.validateChoice(userInput as string, config);

			default:
				throw new Error(
					`Unsupported response type: ${(config as any).responseType}`,
				);
		}
	}

	/**
	 * Validate path input
	 */
	private async validatePath(
		inputPath: string,
		config: AskUserStepConfig,
	): Promise<string> {
		// Check required
		if (config.validation?.required && !inputPath) {
			throw new ValidationError("Path is required");
		}

		if (!inputPath) {
			return inputPath;
		}

		// Check if absolute path
		if (!path.isAbsolute(inputPath)) {
			throw new ValidationError("Path must be absolute");
		}

		// Block directory traversal
		if (inputPath.includes("..")) {
			throw new ValidationError("Directory traversal not allowed");
		}

		// Check parent directory exists
		const parentDir = path.dirname(inputPath);
		try {
			const parentStat = await fs.promises.stat(parentDir);
			if (!parentStat.isDirectory()) {
				throw new ValidationError(
					`Parent directory does not exist: ${parentDir}`,
				);
			}
		} catch (error: any) {
			if (error.code === "ENOENT") {
				throw new ValidationError(
					`Parent directory does not exist: ${parentDir}`,
				);
			}
			throw error;
		}

		// Check write permissions to parent directory
		try {
			await fs.promises.access(parentDir, fs.constants.W_OK);
		} catch (_error) {
			throw new ValidationError("No write permission to parent directory");
		}

		// If mustExist is true, check that the path itself exists
		if (config.pathConfig?.mustExist) {
			try {
				await fs.promises.stat(inputPath);
			} catch (error: any) {
				if (error.code === "ENOENT") {
					throw new ValidationError(`Path does not exist: ${inputPath}`);
				}
				throw error;
			}
		}

		return inputPath;
	}

	/**
	 * Validate string input
	 */
	private validateString(input: string, config: AskUserStepConfig): string {
		// Check required
		if (config.validation?.required && !input) {
			throw new ValidationError("Input is required");
		}

		if (!input) {
			return input;
		}

		// Check min length
		if (
			config.validation?.minLength &&
			input.length < config.validation.minLength
		) {
			throw new ValidationError(
				`Input must be at least ${config.validation.minLength} characters`,
			);
		}

		// Check max length
		if (
			config.validation?.maxLength &&
			input.length > config.validation.maxLength
		) {
			throw new ValidationError(
				`Input must be at most ${config.validation.maxLength} characters`,
			);
		}

		// Check pattern
		if (config.validation?.pattern) {
			const regex = new RegExp(config.validation.pattern);
			if (!regex.test(input)) {
				throw new ValidationError("Input does not match required pattern");
			}
		}

		return input;
	}

	/**
	 * Validate boolean input
	 */
	private validateBoolean(input: unknown): boolean {
		if (typeof input === "boolean") {
			return input;
		}

		// Try to parse string boolean
		if (typeof input === "string") {
			const lower = input.toLowerCase();
			if (lower === "true" || lower === "yes" || lower === "1") {
				return true;
			}
			if (lower === "false" || lower === "no" || lower === "0") {
				return false;
			}
		}

		throw new ValidationError("Input must be a boolean value");
	}

	/**
	 * Validate number input
	 */
	private validateNumber(input: unknown, config: AskUserStepConfig): number {
		let num: number;

		if (typeof input === "number") {
			num = input;
		} else if (typeof input === "string") {
			num = Number.parseFloat(input);
			if (Number.isNaN(num)) {
				throw new ValidationError("Input must be a valid number");
			}
		} else {
			throw new ValidationError("Input must be a number");
		}

		// Check min
		if (config.validation?.min !== undefined && num < config.validation.min) {
			throw new ValidationError(
				`Number must be at least ${config.validation.min}`,
			);
		}

		// Check max
		if (config.validation?.max !== undefined && num > config.validation.max) {
			throw new ValidationError(
				`Number must be at most ${config.validation.max}`,
			);
		}

		return num;
	}

	/**
	 * Validate choice input (future implementation)
	 */
	private validateChoice(input: string, config: AskUserStepConfig): string {
		// Check required
		if (config.validation?.required && !input) {
			throw new ValidationError("Selection is required");
		}

		return input;
	}
}

/**
 * Validation error with user-friendly message
 */
export class ValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ValidationError";
	}
}
