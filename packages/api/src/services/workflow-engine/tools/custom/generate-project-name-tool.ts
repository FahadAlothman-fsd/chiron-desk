import { ax } from "@ax-llm/ax";
import type { AskUserChatStepConfig } from "@chiron/db";
import type { ExecutionContext } from "../../execution-context";

/**
 * Generate Project Name Tool
 *
 * Uses Ax signature with Predict strategy to generate 3-5 kebab-case
 * project name suggestions based on the project description.
 *
 * Story 1.6: Final step in conversational initialization - suggests
 * meaningful project names that users can select or customize.
 *
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

type ToolConfig = NonNullable<AskUserChatStepConfig["tools"]>[number];

/**
 * Build project name generation tool
 *
 * Uses Ax Predict strategy (no ChainOfThought) for quick name generation.
 * Validates all suggestions follow kebab-case pattern.
 *
 * @param config - Tool configuration
 * @param context - Execution context
 * @returns Mastra tool definition
 */
export async function buildGenerateProjectNameTool(
	config: ToolConfig,
	context: ExecutionContext,
): Promise<{
	name: string;
	description: string;
	execute: (input: unknown) => Promise<unknown>;
}> {
	// Build Ax signature for name generation
	const signature = ax(`
    project_description:string "Project summary" ->
    name_suggestions:string "Comma-separated kebab-case names (3-5 suggestions)"
  `);

	signature.setDescription(
		`Generate 3-5 project name suggestions in kebab-case format.
    
    Requirements:
    - Lowercase letters, numbers, and hyphens only
    - Length: 3-50 characters per name
    - Clear and descriptive
    - Related to project description
    
    Format: Return comma-separated names like "healthcare-task-hub,nurse-shift-manager,medical-workflow-system"`,
	);

	return {
		name: config.name || "generate_project_name",
		description: "Generate project name suggestions",
		execute: async (input: unknown) => {
			// Get project description from variables
			const projectDescription = context.executionVariables
				.project_description as string;

			if (!projectDescription) {
				throw new Error(
					"Cannot generate project names: project_description not found",
				);
			}

			console.log(
				"[GenerateProjectNameTool] Generating names for:",
				projectDescription.substring(0, 100),
			);

			// TODO: Call Ax generator with AI model
			// For now, generate mock suggestions
			const mockSuggestions = generateMockNames(projectDescription);

			// Validate all suggestions
			const validatedSuggestions = mockSuggestions.filter((name) =>
				validateProjectName(name),
			);

			if (validatedSuggestions.length === 0) {
				throw new Error("No valid project name suggestions generated");
			}

			console.log(
				`[GenerateProjectNameTool] Generated ${validatedSuggestions.length} valid suggestions`,
			);

			// Return approval structure
			return {
				type: "approval_required",
				tool_name: config.name || "generate_project_name",
				generated_value: {
					suggestions: validatedSuggestions,
					custom_option_enabled: true,
				},
			};
		},
	};
}

/**
 * Generate mock project names (placeholder for Ax generation)
 *
 * In production, this will be replaced with actual Ax generator call.
 *
 * @param description - Project description
 * @returns Array of name suggestions
 */
function generateMockNames(description: string): string[] {
	// Extract key words from description
	const words = description
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter((w) => w.length > 3);

	// Generate names by combining words
	const suggestions: string[] = [];

	if (words.length >= 2) {
		suggestions.push(`${words[0]}-${words[1]}`);
	}

	if (words.length >= 3) {
		suggestions.push(`${words[0]}-${words[2]}`);
		suggestions.push(`${words[1]}-${words[2]}`);
	}

	// Add some generic suggestions
	suggestions.push(`${words[0]}-app`);
	suggestions.push(`${words[0]}-platform`);

	// Limit to 5 suggestions
	return suggestions.slice(0, 5);
}

/**
 * Validate project name follows kebab-case pattern
 *
 * Requirements:
 * - Pattern: ^[a-z0-9-]+$
 * - Length: 3-50 characters
 * - No leading/trailing hyphens
 * - No consecutive hyphens
 *
 * @param name - Project name to validate
 * @returns Whether name is valid
 */
export function validateProjectName(name: string): boolean {
	// Check basic pattern
	if (!/^[a-z0-9-]+$/.test(name)) {
		return false;
	}

	// Check length
	if (name.length < 3 || name.length > 50) {
		return false;
	}

	// Check no leading/trailing hyphens
	if (name.startsWith("-") || name.endsWith("-")) {
		return false;
	}

	// Check no consecutive hyphens
	if (name.includes("--")) {
		return false;
	}

	return true;
}

/**
 * Validate custom user-provided project name
 *
 * @param name - Custom name from user
 * @returns Validation result with error message if invalid
 */
export function validateCustomProjectName(name: string): {
	valid: boolean;
	error?: string;
} {
	if (!name || name.trim().length === 0) {
		return { valid: false, error: "Project name is required" };
	}

	const trimmed = name.trim();

	if (!/^[a-z0-9-]+$/.test(trimmed)) {
		return {
			valid: false,
			error: "Use lowercase letters, numbers, and hyphens only",
		};
	}

	if (trimmed.length < 3) {
		return {
			valid: false,
			error: "Project name must be at least 3 characters",
		};
	}

	if (trimmed.length > 50) {
		return {
			valid: false,
			error: "Project name must be at most 50 characters",
		};
	}

	if (trimmed.startsWith("-") || trimmed.endsWith("-")) {
		return {
			valid: false,
			error: "Project name cannot start or end with a hyphen",
		};
	}

	if (trimmed.includes("--")) {
		return {
			valid: false,
			error: "Project name cannot contain consecutive hyphens",
		};
	}

	return { valid: true };
}

/**
 * Validate required variables exist before tool execution
 *
 * @param requiredVariables - List of required variable names
 * @param context - Execution context
 * @returns Validation result
 */
export function validateRequiredVariables(
	requiredVariables: string[] | undefined,
	context: ExecutionContext,
): { valid: boolean; missingVariables?: string[] } {
	if (!requiredVariables || requiredVariables.length === 0) {
		return { valid: true };
	}

	const missing = requiredVariables.filter(
		(varName) => !(varName in context.executionVariables),
	);

	if (missing.length > 0) {
		return { valid: false, missingVariables: missing };
	}

	return { valid: true };
}
