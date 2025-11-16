import type { AskUserChatStepConfig } from "@chiron/db";
import { db } from "@chiron/db";
import { createTool } from "@mastra/core/tools";
import { sql } from "drizzle-orm";
import { z } from "zod";
import type { ExecutionContext } from "../execution-context";

/**
 * Database-Query Tool Builder
 *
 * Builds Mastra tools that query the database with configurable filters.
 * Supports:
 * - Dynamic table selection
 * - JSONB path queries (e.g., tags->>'complexity')
 * - Variable substitution in filter values ({{variable}} syntax)
 * - Multiple filter operators (eq, contains, gt, lt)
 *
 * Story 1.6: Used for fetch_workflow_paths tool to query workflow paths
 * filtered by fieldType and complexity classification.
 *
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

type ToolConfig = NonNullable<AskUserChatStepConfig["tools"]>[number];

/**
 * Build a database query tool from config
 *
 * @param config - Tool configuration from step config
 * @param context - Execution context with variables
 * @returns Mastra tool created with createTool()
 */
export async function buildDatabaseQueryTool(
	config: ToolConfig,
	context: ExecutionContext,
): Promise<ReturnType<typeof createTool>> {
	if (!config.databaseQuery) {
		throw new Error(
			`Tool ${config.name} is type "database-query" but missing databaseQuery config`,
		);
	}

	const queryConfig = config.databaseQuery;

	return createTool({
		id: config.name,
		description:
			config.description || `Query ${queryConfig.table} table with filters`,
		inputSchema: z.object({}),
		outputSchema: z.object({}),
		execute: async ({ context: toolContext }) => {
			// Resolve filter values (replace {{variable}} with actual values)
			const resolvedFilters = resolveFilters(queryConfig.filters, context);

			// Build and execute query
			const results = await executeQuery(queryConfig.table, resolvedFilters);

			console.log(
				`[DatabaseQueryTool] Query ${queryConfig.table} returned ${results.length} results`,
			);

			// Store results in output variable
			return {
				[queryConfig.outputVariable]: results,
			};
		},
	});
}

/**
 * Resolve filter values by replacing {{variable}} with execution variable values
 *
 * @param filters - Filter configurations
 * @param context - Execution context
 * @returns Resolved filters with actual values
 */
function resolveFilters(
	filters: NonNullable<ToolConfig["databaseQuery"]>["filters"],
	context: ExecutionContext,
): Array<{ field: string; operator: string; value: string }> {
	return filters.map((filter) => {
		let resolvedValue = filter.value;

		// Replace {{variable}} with actual value
		const variableMatch = /\{\{([^}]+)\}\}/.exec(filter.value);
		if (variableMatch) {
			const variableName = variableMatch[1].trim();
			const variableValue = context.executionVariables[variableName];

			if (variableValue === undefined) {
				throw new Error(
					`Variable "${variableName}" not found in execution variables (required for filter)`,
				);
			}

			resolvedValue = String(variableValue);
		}

		return {
			field: filter.field,
			operator: filter.operator,
			value: resolvedValue,
		};
	});
}

/**
 * Execute database query with resolved filters
 *
 * Builds dynamic SQL query using Drizzle's sql`` template
 * Supports JSONB path queries like tags->>'complexity'
 *
 * @param table - Table name to query
 * @param filters - Resolved filters
 * @returns Query results
 */
async function executeQuery(
	table: string,
	filters: Array<{ field: string; operator: string; value: string }>,
): Promise<Array<Record<string, unknown>>> {
	// Validate table name (security - prevent SQL injection)
	const allowedTables = [
		"workflow_paths",
		"workflows",
		"agents",
		"projects",
		"app_config",
	];

	if (!allowedTables.includes(table)) {
		throw new Error(
			`Table "${table}" is not allowed for database queries. Allowed: ${allowedTables.join(", ")}`,
		);
	}

	// Build WHERE clause from filters
	const whereClauses: string[] = [];
	const values: unknown[] = [];

	for (let i = 0; i < filters.length; i++) {
		const filter = filters[i];
		const paramIndex = i + 1;

		// Build condition based on operator
		switch (filter.operator) {
			case "eq":
				whereClauses.push(`${filter.field} = $${paramIndex}`);
				values.push(filter.value);
				break;

			case "contains":
				whereClauses.push(`${filter.field} LIKE $${paramIndex}`);
				values.push(`%${filter.value}%`);
				break;

			case "gt":
				whereClauses.push(`${filter.field} > $${paramIndex}`);
				values.push(filter.value);
				break;

			case "lt":
				whereClauses.push(`${filter.field} < $${paramIndex}`);
				values.push(filter.value);
				break;

			default:
				throw new Error(`Unsupported filter operator: ${filter.operator}`);
		}
	}

	// Build complete query
	const whereClause =
		whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

	const query = sql.raw(`SELECT * FROM ${table} ${whereClause}`);

	// Execute query using Drizzle
	const results = await db.execute(query);

	return results.rows as Array<Record<string, unknown>>;
}

/**
 * Validate required variables exist before tool execution
 *
 * @param requiredVariables - List of required variable names
 * @param context - Execution context
 * @returns Validation result with missing variables if any
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
