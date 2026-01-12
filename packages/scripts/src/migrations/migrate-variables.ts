import {
	and,
	db,
	eq,
	variableHistory,
	variables,
	workflowExecutions,
} from "@chiron/db";

type VariableSource =
	| "input"
	| "step"
	| "system"
	| "parent"
	| "child-propagation"
	| "migration";

interface MigrationStats {
	executionsProcessed: number;
	variablesMigrated: number;
	errors: Array<{ executionId: string; error: string }>;
}

async function migrateVariables(): Promise<MigrationStats> {
	const stats: MigrationStats = {
		executionsProcessed: 0,
		variablesMigrated: 0,
		errors: [],
	};

	console.log("Starting variable migration...");

	const executions = await db
		.select({
			id: workflowExecutions.id,
			variables: workflowExecutions.variables,
		})
		.from(workflowExecutions);

	console.log(`Found ${executions.length} workflow executions to process`);

	for (const execution of executions) {
		try {
			const varsJson = execution.variables as Record<string, unknown> | null;
			if (!varsJson || Object.keys(varsJson).length === 0) {
				continue;
			}

			for (const [name, value] of Object.entries(varsJson)) {
				const existing = await db
					.select()
					.from(variables)
					.where(
						and(
							eq(variables.executionId, execution.id),
							eq(variables.name, name),
						),
					)
					.limit(1);

				if (existing.length > 0) {
					continue;
				}

				const source: VariableSource = "migration";
				const [inserted] = await db
					.insert(variables)
					.values({
						executionId: execution.id,
						name,
						value,
						source,
					})
					.returning();

				if (inserted) {
					await db.insert(variableHistory).values({
						variableId: inserted.id,
						previousValue: null,
						newValue: value,
						source,
					});
					stats.variablesMigrated++;
				}
			}

			stats.executionsProcessed++;
			if (stats.executionsProcessed % 100 === 0) {
				console.log(
					`Processed ${stats.executionsProcessed} executions, migrated ${stats.variablesMigrated} variables`,
				);
			}
		} catch (error) {
			stats.errors.push({
				executionId: execution.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	console.log("\nMigration complete!");
	console.log(`Executions processed: ${stats.executionsProcessed}`);
	console.log(`Variables migrated: ${stats.variablesMigrated}`);
	if (stats.errors.length > 0) {
		console.log(`Errors: ${stats.errors.length}`);
		for (const err of stats.errors) {
			console.log(`  - ${err.executionId}: ${err.error}`);
		}
	}

	return stats;
}

migrateVariables()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error("Migration failed:", err);
		process.exit(1);
	});
