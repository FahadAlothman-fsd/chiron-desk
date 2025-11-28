import * as fs from "node:fs";
import * as path from "node:path";
import type { ExecuteActionStepConfig, WorkflowStep } from "@chiron/db";
import { db, eq, projects } from "@chiron/db";
import simpleGit from "simple-git";
import type { ExecutionContext } from "../execution-context";
import type { StepHandler, StepResult } from "../step-handler";
import { resolveVariables } from "../variable-resolver";

/**
 * ExecuteActionStepHandler - Executes backend actions without user input
 * Supports set-variable, file, git, and database actions
 *
 * Story 1.8: Added git init and database update operations
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
				let resolvedValue = (action as any).config.value;

				// Only resolve if it's a string (might contain {{variables}})
				if (typeof (action as any).config.value === "string") {
					resolvedValue = resolveVariables(
						(action as any).config.value,
						context,
					);
				}

				resolved.push({
					...action,
					config: {
						...(action as any).config,
						value: resolvedValue,
					},
				});
			} else if (action.type === "git") {
				// Resolve directory path for git operations
				const gitAction = action as any;
				const resolvedPath = resolveVariables(gitAction.config?.path, context);
				resolved.push({
					...action,
					config: {
						...gitAction.config,
						path: resolvedPath,
					},
				});
			} else if (action.type === "database") {
				// Resolve variables in database action columns and where clause
				const dbAction = action as any;
				const resolvedColumns: Record<string, unknown> = {};
				const resolvedWhere: Record<string, unknown> = {};

				// Resolve column values
				if (dbAction.config?.columns) {
					for (const [key, value] of Object.entries(dbAction.config.columns)) {
						if (typeof value === "string") {
							resolvedColumns[key] = resolveVariables(value, context);
						} else {
							resolvedColumns[key] = value;
						}
					}
				}

				// Resolve where clause values
				if (dbAction.config?.where) {
					for (const [key, value] of Object.entries(dbAction.config.where)) {
						if (typeof value === "string") {
							resolvedWhere[key] = resolveVariables(value, context);
						} else {
							resolvedWhere[key] = value;
						}
					}
				}

				resolved.push({
					...action,
					config: {
						...dbAction.config,
						columns: resolvedColumns,
						where: resolvedWhere,
					},
				});
			} else {
				// For future action types (file)
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
		_currentOutput: Record<string, unknown>,
	): Promise<Record<string, unknown>> {
		switch (action.type) {
			case "set-variable":
				return this.executeSetVariable(action as any, context);

			case "file":
				throw new Error("File actions not implemented yet (future story)");

			case "git":
				return this.executeGitAction(action as any, context);

			case "database":
				return this.executeDatabaseAction(action as any, context);

			default:
				throw new Error(`Unknown action type: ${(action as any).type}`);
		}
	}

	/**
	 * Execute set-variable action
	 */
	private async executeSetVariable(
		action: { type: "set-variable"; config: { variable: string; value: any } },
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
		variablePath: string,
		value: unknown,
		context: ExecutionContext,
	): Record<string, unknown> {
		const keys = variablePath.split(".");
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

	/**
	 * Story 1.8: Execute git action (git init)
	 */
	private async executeGitAction(
		action: {
			type: "git";
			config: { operation: string; path: string };
		},
		_context: ExecutionContext,
	): Promise<Record<string, unknown>> {
		const { operation, path: projectPath } = action.config;

		// Pre-flight check: Verify git is installed
		const gitInstalled = await this.isGitInstalled();
		if (!gitInstalled) {
			throw new Error(
				"Git is not installed or not accessible. Please install git and try again.",
			);
		}

		switch (operation) {
			case "init": {
				// Create directory if it doesn't exist
				if (!fs.existsSync(projectPath)) {
					await fs.promises.mkdir(projectPath, { recursive: true });
					console.log(
						`[ExecuteActionHandler] Created directory: ${projectPath}`,
					);
				}

				// Initialize git repository (idempotent - safe to run on existing repos)
				const git = simpleGit(projectPath);
				await git.init();
				console.log(
					`[ExecuteActionHandler] Git initialized at: ${projectPath}`,
				);

				return {
					git_initialized: true,
					git_path: projectPath,
				};
			}

			default:
				throw new Error(`Unknown git operation: ${operation}`);
		}
	}

	/**
	 * Check if git is installed and accessible
	 */
	private async isGitInstalled(): Promise<boolean> {
		try {
			const git = simpleGit();
			const version = await git.version();
			console.log(`[ExecuteActionHandler] Git version: ${version.installed}`);
			return version.installed !== undefined;
		} catch (error) {
			console.error("[ExecuteActionHandler] Git check failed:", error);
			return false;
		}
	}

	/**
	 * Story 1.8: Execute database action (update project record)
	 */
	private async executeDatabaseAction(
		action: {
			type: "database";
			config: {
				table: string;
				operation: string;
				columns: Record<string, unknown>;
				where: Record<string, unknown>;
			};
		},
		_context: ExecutionContext,
	): Promise<Record<string, unknown>> {
		const { table, operation, columns, where } = action.config;

		console.log(
			`[ExecuteActionHandler] Database action: ${operation} on ${table}`,
		);
		console.log("[ExecuteActionHandler] Columns:", columns);
		console.log("[ExecuteActionHandler] Where:", where);

		switch (operation) {
			case "update": {
				// Currently only supporting projects table
				if (table !== "projects") {
					throw new Error(`Database table "${table}" not supported yet`);
				}

				// Validate where clause has id
				if (!where.id) {
					throw new Error("Database update requires 'id' in where clause");
				}

				// Build the update object
				const updateData: Record<string, unknown> = {};

				// Map column names to database fields
				for (const [key, value] of Object.entries(columns)) {
					updateData[key] = value;
				}

				// Add updatedAt timestamp
				updateData.updatedAt = new Date();

				// Execute update
				const [updatedProject] = await db
					.update(projects)
					.set(updateData as any)
					.where(eq(projects.id, where.id as string))
					.returning();

				if (!updatedProject) {
					throw new Error(`Project with id ${where.id} not found`);
				}

				console.log(
					`[ExecuteActionHandler] Updated project: ${updatedProject.id}`,
				);

				return {
					database_updated: true,
					updated_record_id: updatedProject.id,
				};
			}

			default:
				throw new Error(`Unknown database operation: ${operation}`);
		}
	}
}
