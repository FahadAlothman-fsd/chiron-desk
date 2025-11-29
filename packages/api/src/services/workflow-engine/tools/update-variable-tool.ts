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
	context: ExecutionContext,
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
		// Support common types: string, number, boolean, enum
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

			console.log(
				`[UpdateVariableTool] ${config.name} called with value:`,
				input.value,
			);

			// If requires approval, return approval state structure
			if (config.requiresApproval) {
				return {
					status: "awaiting_approval",
					value: input.value,
					reasoning: input.reasoning,
				};
			}

			// Otherwise, directly return the value (will be auto-saved)
			return {
				value: input.value,
				reasoning: input.reasoning,
			};
		},
	});
}
