import { db, miproTrainingExamples } from "@chiron/db";
import { eq, desc } from "drizzle-orm";

/**
 * MiPRO Data Collector Service
 *
 * Collects approved AI outputs for future offline optimization with MiPRO.
 * MiPRO (Multi-prompt Iterative Refinement Optimization) will use this data
 * to optimize prompts and improve AI output quality.
 *
 * Unlike ACE (online learning from rejections), MiPRO does batch optimization
 * using approved examples to find optimal prompt formulations.
 *
 * @see docs/research/ax-optimizers-comparison-mipro-gepa-ace.md
 * @see docs/architecture/STORY-1-6-ARCHITECTURE-SUMMARY.md
 */

export type MiproTrainingInput = {
	conversation_history?: string;
	ace_context?: string;
	variables: Record<string, unknown>;
};

export type MiproScorerResults = {
	answerRelevancy?: number;
	completeness?: number;
	accuracy?: number;
};

export type RejectionHistoryItem = {
	feedback: string;
	rejectedAt: string;
	previousOutput: unknown;
};

export class MiProCollector {
	/**
	 * Save approved output as MiPRO training example
	 *
	 * Called when user approves an AI-generated output.
	 * Stores the input + expected output pair for future optimization.
	 *
	 * @param toolName - Tool that generated the output (e.g., "update_summary")
	 * @param agentId - Agent UUID
	 * @param input - Input that led to approved output
	 * @param expectedOutput - User-approved output
	 * @param rejectionHistory - Previous rejections before approval
	 * @param scorerResults - Quality scores from Mastra evals
	 */
	async saveApprovedOutput(
		toolName: string,
		agentId: string,
		input: MiproTrainingInput,
		expectedOutput: Record<string, unknown>,
		rejectionHistory: RejectionHistoryItem[] = [],
		scorerResults: MiproScorerResults = {},
	): Promise<void> {
		await db.insert(miproTrainingExamples).values({
			toolName,
			agentId,
			input: input as any,
			expectedOutput: expectedOutput as any,
			rejectionHistory: rejectionHistory as any,
			scorerResults: scorerResults as any,
		});
	}

	/**
	 * Get training examples for a specific tool (for MiPRO optimization)
	 *
	 * @param toolName - Tool name to query
	 * @param limit - Maximum number of examples to return
	 * @returns Array of training examples
	 */
	async getTrainingExamples(toolName: string, limit = 100) {
		const examples = await db
			.select()
			.from(miproTrainingExamples)
			.where(eq(miproTrainingExamples.toolName, toolName))
			.orderBy(desc(miproTrainingExamples.createdAt))
			.limit(limit);

		return examples;
	}

	/**
	 * Get training examples for an agent across all tools
	 *
	 * @param agentId - Agent UUID
	 * @param limit - Maximum number of examples to return
	 * @returns Array of training examples
	 */
	async getTrainingExamplesByAgent(agentId: string, limit = 100) {
		const examples = await db
			.select()
			.from(miproTrainingExamples)
			.where(eq(miproTrainingExamples.agentId, agentId))
			.orderBy(desc(miproTrainingExamples.createdAt))
			.limit(limit);

		return examples;
	}

	/**
	 * Get count of training examples (for monitoring)
	 *
	 * @param toolName - Optional: filter by tool name
	 * @param agentId - Optional: filter by agent ID
	 * @returns Count of examples
	 */
	async getExampleCount(toolName?: string, agentId?: string): Promise<number> {
		let query = db.select().from(miproTrainingExamples);

		if (toolName) {
			query = query.where(eq(miproTrainingExamples.toolName, toolName)) as any;
		}

		if (agentId) {
			query = query.where(eq(miproTrainingExamples.agentId, agentId)) as any;
		}

		const results = await query;
		return results.length;
	}

	/**
	 * Format examples for MiPRO optimizer (future implementation)
	 *
	 * MiPRO expects examples in format: { input, expected_output }
	 * This method prepares data for offline optimization.
	 *
	 * @param examples - Raw training examples from database
	 * @returns Formatted examples for MiPRO
	 */
	formatForMiPRO(examples: any[]) {
		return examples.map((example) => ({
			input: example.input,
			expected_output: example.expectedOutput,
			metadata: {
				toolName: example.toolName,
				createdAt: example.createdAt,
				rejectionCount: example.rejectionHistory?.length || 0,
				scorerResults: example.scorerResults,
			},
		}));
	}
}
