import { z } from "zod";

// ============================================
// ZOD SCHEMAS FOR WORKFLOW STEP CONFIGURATIONS
// These schemas provide runtime validation for JSONB step configs
// TypeScript types are inferred from these schemas for type safety
// ============================================

/**
 * AskUserStepConfig - Captures user input via form field
 *
 * @example
 * {
 *   question: "What is your project name?",
 *   responseType: "string",
 *   responseVariable: "project_name",
 *   validation: {
 *     required: true,
 *     minLength: 3,
 *     maxLength: 50
 *   }
 * }
 */
export const askUserStepConfigSchema = z.object({
	question: z.string(),
	responseType: z.enum([
		"string",
		"text",
		"number",
		"boolean",
		"choice",
		"path",
	]),
	responseVariable: z.string(),
	validation: z
		.object({
			required: z.boolean().optional(),
			minLength: z.number().optional(),
			maxLength: z.number().optional(),
			pattern: z.string().optional(),
		})
		.optional(),
	choices: z
		.object({
			options: z.array(z.string()),
			allowCustom: z.boolean().optional(),
		})
		.optional(),
});

/**
 * AskUserChatStepConfig - Interactive chat dialog with LLM
 *
 * @example
 * {
 *   systemPrompt: "You are a helpful brainstorming assistant",
 *   initialMessage: "Let's brainstorm ideas for your project!",
 *   outputVariable: "brainstorm_results",
 *   completionCondition: {
 *     type: "user-satisfied"
 *   }
 * }
 */
export const askUserChatStepConfigSchema = z.object({
	systemPrompt: z.string(),
	initialMessage: z.string(),
	outputVariable: z.string(),
	completionCondition: z.object({
		type: z.enum(["user-satisfied", "confidence-threshold", "max-turns"]),
		threshold: z.number().optional(),
		maxTurns: z.number().optional(),
	}),
});

/**
 * ExecuteActionStepConfig - Execute system actions
 *
 * @example
 * {
 *   actions: [
 *     { type: "set-variable", key: "foo", value: "bar" },
 *     { type: "database", operation: "insert", table: "projects" }
 *   ]
 * }
 */
export const executeActionStepConfigSchema = z.object({
	actions: z.array(
		z.object({
			type: z.enum(["set-variable", "file", "git", "database"]),
			// Type-specific fields can be extended here
			// For MVP, we accept any additional properties
		}),
	),
});

/**
 * LLMGenerateStepConfig - Generate content using LLM
 *
 * @example
 * {
 *   llmTask: {
 *     type: "classification",
 *     prompt: "Classify this project type",
 *     options: ["greenfield", "brownfield"]
 *   },
 *   outputVariable: "project_type"
 * }
 */
export const llmGenerateStepConfigSchema = z.object({
	llmTask: z.object({
		type: z.enum(["classification", "structured", "generation"]),
		// Type-specific fields can be extended here
	}),
	outputVariable: z.string(),
});

/**
 * DisplayOutputStepConfig - Show message to user
 *
 * @example
 * {
 *   contentTemplate: "Project {{project_name}} created successfully!"
 * }
 */
export const displayOutputStepConfigSchema = z.object({
	contentTemplate: z.string(), // Handlebars template
});

/**
 * Union schema for all step config types
 * Use this for runtime validation of any step config
 */
export const stepConfigSchema = z.union([
	askUserStepConfigSchema,
	askUserChatStepConfigSchema,
	executeActionStepConfigSchema,
	llmGenerateStepConfigSchema,
	displayOutputStepConfigSchema,
]);

// ============================================
// TYPESCRIPT TYPES (Inferred from Zod schemas)
// ============================================

export type AskUserStepConfig = z.infer<typeof askUserStepConfigSchema>;
export type AskUserChatStepConfig = z.infer<typeof askUserChatStepConfigSchema>;
export type ExecuteActionStepConfig = z.infer<
	typeof executeActionStepConfigSchema
>;
export type LLMGenerateStepConfig = z.infer<typeof llmGenerateStepConfigSchema>;
export type DisplayOutputStepConfig = z.infer<
	typeof displayOutputStepConfigSchema
>;
export type StepConfig = z.infer<typeof stepConfigSchema>;
