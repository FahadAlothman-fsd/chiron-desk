import type { AskUserChatStepConfig } from "@chiron/db";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import type { ExecutionContext } from "../execution-context";

/**
 * Update Variable Tool Builder
 *
 * Simple tool that lets the agent directly set a variable value.
 * No AX signatures, no complex logic - just a direct variable update.
 *
 * Flow:
 * 1. Agent analyzes conversation
 * 2. Agent calls update_summary with { value: "TaskFlow is a..." }
 * 3. Tool creates approval gate
 * 4. User approves
 * 5. Variable is set
 *
 * This is much simpler than using AX signatures!
 */

type ToolConfig = NonNullable<AskUserChatStepConfig["tools"]>[number];

export async function buildUpdateVariableTool(
	config: ToolConfig,
	_context: ExecutionContext,
): Promise<ReturnType<typeof createTool>> {
	if (!config.targetVariable) {
		throw new Error(
			`Tool ${config.name} is type "update-variable" but missing targetVariable config`,
		);
	}

	const targetVariable = config.targetVariable;

	// Build Zod schema from valueSchema config
	let valueSchema: z.ZodType<any> = z.string(); // Default to string

	if (config.valueSchema) {
		// Support common types: string, number, boolean, enum, array
		switch (config.valueSchema.type) {
			case "string":
				valueSchema = z.string();
				break;
			case "number":
				valueSchema = z.number();
				break;
			case "boolean":
				valueSchema = z.boolean();
				break;
			case "enum":
				if (config.valueSchema.values && config.valueSchema.values.length > 0) {
					valueSchema = z.enum(
						config.valueSchema.values as [string, ...string[]],
					);
				}
				break;
			case "array":
				// Support arrays with item type specification
				if (config.valueSchema.items) {
					const itemType = config.valueSchema.items.type;

					if (itemType === "string") {
						valueSchema = z.array(z.string());
					} else if (itemType === "number") {
						valueSchema = z.array(z.number());
					} else if (itemType === "boolean") {
						valueSchema = z.array(z.boolean());
					} else if (
						itemType === "object" &&
						config.valueSchema.items.properties
					) {
						// NEW: Support array of objects
						// Example: [{ constraint: string, whatIf: string, ideas: string[] }]
						const itemObjectShape: Record<string, z.ZodType<any>> = {};

						for (const [key, propConfig] of Object.entries(
							config.valueSchema.items.properties,
						)) {
							let propSchema: z.ZodType<any> = z.string(); // Default

							switch (propConfig.type) {
								case "string":
									propSchema = z.string();
									break;
								case "number":
									propSchema = z.number();
									break;
								case "boolean":
									propSchema = z.boolean();
									break;
								case "array":
									// Support nested arrays (e.g., ideas: string[])
									propSchema = z.array(z.string());
									break;
							}

							// Handle optional vs required properties
							const isRequired =
								config.valueSchema.items.required?.includes(key);
							if (!isRequired) {
								propSchema = propSchema.optional();
							}

							itemObjectShape[key] = propSchema;
						}

						valueSchema = z.array(z.object(itemObjectShape));
					} else {
						// Fallback: array of strings
						valueSchema = z.array(z.string());
					}
				} else {
					// No items specified, default to array of strings
					valueSchema = z.array(z.string());
				}
				break;
			case "object": {
				// NEW: Support object type with property definitions
				// Handles shallow objects (1 level deep) with primitive properties
				const objectShape: Record<string, z.ZodType<any>> = {};

				if (config.valueSchema.properties) {
					// Build Zod shape from properties definition
					for (const [key, propConfig] of Object.entries(
						config.valueSchema.properties,
					)) {
						let propSchema: z.ZodType<any> = z.string(); // Default

						switch (propConfig.type) {
							case "string":
								propSchema = z.string();
								break;
							case "number":
								propSchema = z.number();
								break;
							case "boolean":
								propSchema = z.boolean();
								break;
							case "array":
								// Support array of strings for object properties
								propSchema = z.array(z.string());
								break;
						}

						// Handle optional vs required properties
						const isRequired = config.valueSchema.required?.includes(key);
						if (!isRequired) {
							propSchema = propSchema.optional();
						}

						objectShape[key] = propSchema;
					}
				}

				// Create base object schema
				let objectSchema = z.object(objectShape);

				// Handle additionalProperties (dynamic keys)
				// Example: Mind Mapping sub-branches { [branchName: string]: string[] }
				if (config.valueSchema.additionalProperties) {
					const additionalPropType =
						config.valueSchema.additionalProperties.type;

					if (additionalPropType === "array") {
						// Support dynamic keys with array values
						objectSchema = objectSchema.catchall(z.array(z.string()));
					} else if (additionalPropType === "string") {
						objectSchema = objectSchema.catchall(z.string());
					}
					// TODO: Support other additionalProperties types as needed
				}

				valueSchema = objectSchema;

				// TODO: Future extensions:
				// - Nested object validation (2+ levels deep)
				// - Union types (string | number)
				// - Map/Set types
				// - Schema versioning/migration
				break;
			}
		}

		// Add description if provided
		if (config.valueSchema.description) {
			valueSchema = valueSchema.describe(config.valueSchema.description);
		}
	}

	return createTool({
		id: config.name,
		description:
			config.description ||
			`Update ${targetVariable} variable with a new value`,
		inputSchema: z.object({
			value: valueSchema,
			reasoning: z
				.string()
				.optional()
				.describe("Why this value is appropriate (optional)"),
		}),
		outputSchema: z.object({
			value: z.any(),
			reasoning: z.string().optional(),
		}),
		execute: async ({ context: toolContext }) => {
			const input = toolContext as { value: any; reasoning?: string };

			// Validate input against schema
			// Mastra's createTool automatically validates inputSchema, but we parse here
			// to ensure the value is correctly typed for downstream use
			const inputSchema = z.object({
				value: valueSchema,
				reasoning: z.string().optional(),
			});
			const parsed = inputSchema.parse(input);

			console.log(
				`[UpdateVariableTool] ${config.name} called with value:`,
				parsed.value,
			);

			// If requires approval, return approval state structure
			if (config.requiresApproval) {
				return {
					status: "awaiting_approval",
					value: parsed.value,
					reasoning: parsed.reasoning,
				};
			}

			// Otherwise, directly return the value (will be auto-saved)
			return {
				value: parsed.value,
				reasoning: parsed.reasoning,
			};
		},
	});
}
