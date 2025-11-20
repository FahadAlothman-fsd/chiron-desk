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
 * AskUserChatStepConfig - Interactive chat dialog with LLM and dynamic tools
 *
 * @example
 * {
 *   agentId: "pm-agent-uuid",
 *   initialMessage: "Let's brainstorm ideas for your project!",
 *   tools: [
 *     {
 *       name: "update_summary",
 *       toolType: "ax-generation",
 *       requiredVariables: ["conversation_history"],
 *       requiresApproval: true,
 *       axSignature: {
 *         input: [
 *           { name: "conversation_history", type: "string", source: "context", description: "Chat history" },
 *           { name: "ace_context", type: "string", source: "playbook", description: "Learned patterns" }
 *         ],
 *         output: [
 *           { name: "project_description", type: "string", description: "Generated summary" },
 *           { name: "reasoning", type: "string", description: "Why this summary", internal: true }
 *         ],
 *         strategy: "ChainOfThought"
 *       }
 *     },
 *     {
 *       name: "fetch_workflow_paths",
 *       toolType: "database-query",
 *       requiredVariables: ["complexity_classification"],
 *       databaseQuery: {
 *         table: "workflow_paths",
 *         filters: [
 *           { field: "tags->>'fieldType'", operator: "eq", value: "{{detected_field_type}}" },
 *           { field: "tags->>'complexity'", operator: "eq", value: "{{complexity_classification}}" }
 *         ]
 *       }
 *     }
 *   ],
 *   completionCondition: {
 *     type: "all-tools-approved",
 *     requiredTools: ["update_summary", "update_complexity", "select_workflow_path", "generate_project_name"]
 *   },
 *   outputVariables: {
 *     project_description: "approval_states.update_summary.value",
 *     complexity_classification: "approval_states.update_complexity.value",
 *     selected_workflow_path_id: "approval_states.select_workflow_path.value",
 *     project_name: "approval_states.generate_project_name.value"
 *   }
 * }
 */
export const askUserChatStepConfigSchema = z.object({
	agentId: z.string().uuid(),
	initialMessage: z.string().optional(),
	tools: z
		.array(
			z.object({
				name: z.string(),
				toolType: z.enum(["ax-generation", "database-query", "custom"]),
				description: z.string().optional(), // Tool description for LLM (what it does)
				usageGuidance: z.string().optional(), // When/how to use this tool (injected into agent instructions)
				requiredVariables: z.array(z.string()).optional(),
				requiresApproval: z.boolean().optional(),
				requireFeedbackOnOverride: z.boolean().optional(), // Show feedback textarea when user selects non-AI option
				// Dynamic options source - fetch options from database before tool execution
				optionsSource: z
					.object({
						table: z.string(), // Table to query
						selectFields: z.array(z.string()).optional(), // Fields to fetch (default: all fields)
						distinctField: z.string().optional(), // Field to get unique values from (supports JSONB like "tags->'complexity'")
						filterBy: z.record(z.string()).optional(), // Optional filters (supports {{variable}} syntax)
						orderBy: z.string().optional(), // Field to order by
						outputVariable: z.string(), // Variable name to store fetched options
						// Display configuration - how to render options in approval cards
						displayConfig: z
							.object({
								cardLayout: z.enum(["simple", "detailed"]), // Card complexity level
								fields: z.object({
									// Core fields (required)
									value: z.string(), // JSON path to the value field (what gets submitted)
									title: z.string(), // JSON path to title field
									// Optional fields
									subtitle: z.string().optional(), // JSON path to subtitle field
									description: z.string().optional(), // JSON path to description field
									// Nested expandable sections (for detailed cards)
									sections: z
										.array(
											z.object({
												label: z.string(), // Section header ("Phases & Workflows")
												icon: z.string().optional(), // Emoji/icon prefix
												dataPath: z.string(), // JSON path to array data
												renderAs: z.enum(["list", "nested-list", "grid"]), // Render style
												collapsible: z.boolean().optional(), // Allow expand/collapse
												defaultExpanded: z.boolean().optional(), // Start expanded/collapsed
												// How to render each item in the section
												itemFields: z.object({
													title: z.string(), // Item title field
													subtitle: z.string().optional(), // Item subtitle field
													icon: z.string().optional(), // Static icon or field path
													// For nested lists (recursive)
													children: z.string().optional(), // JSON path to child array
													childFields: z
														.object({
															title: z.string(),
															icon: z.string().optional(),
														})
														.optional(),
												}),
											}),
										)
										.optional(),
								}),
							})
							.optional(),
					})
					.optional(),
				// Ax-generation specific config
				axSignature: z
					.object({
						input: z.array(
							z.object({
								name: z.string(),
								type: z.string(),
								source: z.enum(["variable", "context", "literal", "playbook"]),
								variableName: z.string().optional(), // For source: "variable"
								defaultValue: z.unknown().optional(), // For source: "literal"
								description: z.string(),
								internal: z.boolean().optional(), // If true, hidden from approval UI
							}),
						),
						output: z.array(
							z.object({
								name: z.string(),
								type: z.string(),
								description: z.string(),
								internal: z.boolean().optional(), // If true, not shown in approval
							}),
						),
						strategy: z.enum(["ChainOfThought", "Predict"]),
					})
					.optional(),
				// Database-query specific config
				databaseQuery: z
					.object({
						table: z.string(),
						filters: z.array(
							z.object({
								field: z.string(), // Supports JSONB paths like "tags->>'complexity'"
								operator: z.enum(["eq", "contains", "gt", "lt"]),
								value: z.string(), // Can use {{variable}} syntax
							}),
						),
						outputVariable: z.string(), // Variable name to store results
					})
					.optional(),
				// Custom tool specific config
				customToolHandler: z.string().optional(), // Handler function name
			}),
		)
		.optional(),
	completionCondition: z.object({
		type: z.enum([
			"user-satisfied",
			"all-tools-approved",
			"confidence-threshold",
			"max-turns",
		]),
		requiredTools: z.array(z.string()).optional(), // For "all-tools-approved"
		threshold: z.number().optional(),
		maxTurns: z.number().optional(),
	}),
	outputVariables: z.record(z.string(), z.string()).optional(), // Map output variable names to paths in execution.variables
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
