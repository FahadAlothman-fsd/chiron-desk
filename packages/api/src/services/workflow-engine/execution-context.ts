/**
 * Execution Context - Minimal context for step handlers
 * Handlers import services (db, llmClient) directly as needed
 */

export interface ExecutionContext {
	// Level 1: System variables (highest precedence)
	systemVariables: {
		current_user_id: string;
		execution_id: string;
		project_id: string | null;
		date: string;
		timestamp: string;
	};

	// Level 2: Execution variables (user inputs + LLM outputs + system-executed values)
	// This is the workflow state accumulator
	executionVariables: Record<string, unknown>;

	// Level 3: Step outputs (from executedSteps JSONB)
	stepOutputs: Record<number, unknown>;

	// Level 4: Default values (from step config) - lowest precedence
	defaultValues: Record<string, unknown>;
}

/**
 * Build execution context from workflow execution state
 */
export function buildExecutionContext(params: {
	executionId: string;
	userId: string;
	projectId?: string | null;
	variables: Record<string, unknown>;
	executedSteps: Record<
		number,
		{
			status: "completed" | "failed" | "skipped";
			output?: unknown;
		}
	>;
	defaultValues?: Record<string, unknown>;
}): ExecutionContext {
	// Extract step outputs from executedSteps
	const stepOutputs: Record<number, unknown> = {};
	for (const [stepNum, stepData] of Object.entries(params.executedSteps)) {
		if (stepData.output !== undefined) {
			stepOutputs[Number(stepNum)] = stepData.output;
		}
	}

	return {
		systemVariables: {
			current_user_id: params.userId,
			execution_id: params.executionId,
			project_id: params.projectId || null,
			date: new Date().toISOString().split("T")[0], // YYYY-MM-DD
			timestamp: new Date().toISOString(),
		},
		executionVariables: params.variables,
		stepOutputs,
		defaultValues: params.defaultValues || {},
	};
}
