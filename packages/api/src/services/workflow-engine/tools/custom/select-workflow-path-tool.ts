import type { AskUserChatStepConfig } from "@chiron/db";
import type { ExecutionContext } from "../../execution-context";

/**
 * Select Workflow Path Tool
 *
 * Custom tool that presents workflow path options to the user.
 * Suspends execution to render path selection cards in the UI.
 *
 * Story 1.6: After complexity classification, this tool shows the user
 * available workflow paths (quick-flow, method, enterprise) with
 * descriptions and recommendations.
 *
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

type ToolConfig = NonNullable<AskUserChatStepConfig["tools"]>[number];

/**
 * Build workflow path selection tool
 *
 * This tool validates that workflow paths have been fetched from the database,
 * then returns them formatted for the frontend to display as selection cards.
 *
 * @param config - Tool configuration
 * @param context - Execution context
 * @returns Mastra tool definition
 */
export async function buildSelectPathTool(
	config: ToolConfig,
	context: ExecutionContext,
): Promise<{
	name: string;
	description: string;
	execute: (input: unknown) => Promise<unknown>;
}> {
	return {
		name: config.name || "select_workflow_path",
		description: "Present workflow path options for user selection",
		execute: async (input: unknown) => {
			// Validate that workflow paths have been fetched
			const availablePaths = context.executionVariables
				.available_workflow_paths as Array<Record<string, unknown>> | undefined;

			if (!availablePaths || availablePaths.length === 0) {
				throw new Error(
					"Cannot select workflow path: No paths available. Run fetch_workflow_paths first.",
				);
			}

			console.log(
				`[SelectPathTool] Presenting ${availablePaths.length} workflow paths`,
			);

			// Format paths for frontend display
			const pathCards = availablePaths.map((path) => ({
				id: path.id,
				name: path.name,
				description: path.description,
				tags: path.tags,
				isRecommended: determineRecommendation(path, context),
				reasons: generateRecommendationReasons(path, context),
			}));

			// Return structure for approval/selection UI
			return {
				type: "path_selection_required",
				tool_name: config.name || "select_workflow_path",
				available_paths: pathCards,
				complexity: context.executionVariables.complexity_classification,
			};
		},
	};
}

/**
 * Determine if a path is recommended based on complexity
 *
 * @param path - Workflow path record
 * @param context - Execution context
 * @returns Whether this path is recommended
 */
function determineRecommendation(
	path: Record<string, unknown>,
	context: ExecutionContext,
): boolean {
	const complexity = context.executionVariables
		.complexity_classification as string;
	const pathTags = path.tags as Record<string, unknown> | undefined;

	if (!pathTags || !complexity) {
		return false;
	}

	// Match complexity classification with path tags
	return pathTags.complexity === complexity;
}

/**
 * Generate reasons why a path is or isn't recommended
 *
 * @param path - Workflow path record
 * @param context - Execution context
 * @returns Array of reason strings
 */
function generateRecommendationReasons(
	path: Record<string, unknown>,
	context: ExecutionContext,
): string[] {
	const complexity = context.executionVariables
		.complexity_classification as string;
	const pathTags = path.tags as Record<string, unknown> | undefined;
	const reasons: string[] = [];

	if (!pathTags) {
		return reasons;
	}

	// Check complexity match
	if (pathTags.complexity === complexity) {
		reasons.push(`Matches your project complexity (${complexity})`);
	} else {
		reasons.push(
			`Designed for ${pathTags.complexity} complexity (you have ${complexity})`,
		);
	}

	// Check field type match
	const fieldType = context.executionVariables.detected_field_type as string;
	if (fieldType && pathTags.fieldType === fieldType) {
		reasons.push(`Optimized for ${fieldType} projects`);
	}

	return reasons;
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
