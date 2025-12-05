/**
 * Hook to fetch workflows
 * Story 2.3 Task 6: Used by InvokeWorkflowStep to display workflow names
 */
export function useWorkflows() {
	// For now, return a simple query
	// TODO: Implement actual tRPC endpoint when workflows API is available
	return {
		data: [] as Array<{ id: string; displayName: string }>,
		isLoading: false,
	};
}
