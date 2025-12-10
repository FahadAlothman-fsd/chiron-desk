/**
 * Project Executions Page
 *
 * Lists all workflow executions for a project using the
 * reusable WorkflowExecutionCard component.
 *
 * Features:
 * - Status badges (active, paused, completed, failed)
 * - Step progress dots and tool progress bar
 * - Expandable details view with step/tool breakdown
 * - Click to navigate to execution view
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	type ExecutionInfo,
	WorkflowExecutionCard,
	type WorkflowInfo,
} from "@/components/workflows/workflow-execution-card";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/executions",
)({
	component: ProjectExecutionsPage,
});

function ProjectExecutionsPage() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();

	// Fetch all executions for this project
	const { data, isLoading, error } = useQuery({
		queryKey: ["workflows", "executions", "project", projectId],
		queryFn: async () => {
			return trpcClient.workflows.getExecutionsByProject.query({
				projectId,
				includeChildren: false, // Only show parent executions
			});
		},
		enabled: !!projectId,
	});

	// Fetch step/tool progress for active executions
	const activeExecutionIds =
		data?.executions
			.filter((e) => e.status === "active" || e.status === "paused")
			.map((e) => e.id) ?? [];

	const { data: liveExecutions } = useQuery({
		queryKey: ["workflows", "executions", "live", activeExecutionIds],
		queryFn: async () => {
			return trpcClient.workflows.getExecutionsByIds.query({
				executionIds: activeExecutionIds,
			});
		},
		enabled: activeExecutionIds.length > 0,
		refetchInterval: 2000, // Poll every 2 seconds for active executions
	});

	const executions = data?.executions ?? [];

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading executions...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="text-center">
					<XCircle className="mx-auto h-12 w-12 text-destructive" />
					<h2 className="mt-4 font-semibold text-lg">
						Failed to load executions
					</h2>
					<p className="mt-2 text-muted-foreground text-sm">
						{error instanceof Error ? error.message : "Unknown error"}
					</p>
				</div>
			</div>
		);
	}

	// Map executions to WorkflowExecutionCard props
	const executionItems = executions.map((execution) => {
		// Get live data for active executions
		const liveData = liveExecutions?.find((e) => e.id === execution.id);

		const workflow: WorkflowInfo = {
			id: execution.workflowId,
			name: execution.workflowName,
			displayName: execution.workflowName,
			description: execution.workflowDescription ?? undefined,
		};

		const executionInfo: ExecutionInfo = {
			id: execution.id,
			status: execution.status as ExecutionInfo["status"],
			startedAt: execution.startedAt,
			completedAt: execution.completedAt,
			stepProgress: liveData?.stepProgress ?? null,
			toolProgress: liveData?.toolProgress ?? null,
		};

		return { workflow, execution: executionInfo };
	});

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="font-bold text-2xl tracking-tight">
					Workflow Executions
				</h1>
				<p className="text-muted-foreground">
					View and manage all workflow executions for this project
				</p>
			</div>

			{executions.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-12">
						<Clock className="h-12 w-12 text-muted-foreground" />
						<h3 className="mt-4 font-semibold text-lg">No executions yet</h3>
						<p className="mt-2 text-center text-muted-foreground text-sm">
							Start a workflow from the dashboard to see executions here.
						</p>
						<Button
							className="mt-4"
							onClick={() =>
								navigate({
									to: "/projects/$projectId",
									params: { projectId },
								})
							}
						>
							Go to Dashboard
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{executionItems.map(({ workflow, execution }) => (
						<WorkflowExecutionCard
							key={execution.id}
							workflow={workflow}
							execution={execution}
							variant="card"
							onClick={() =>
								navigate({
									to: "/projects/$projectId/workflow/$executionId",
									params: { projectId, executionId: execution.id },
								})
							}
							onResume={() =>
								navigate({
									to: "/projects/$projectId/workflow/$executionId",
									params: { projectId, executionId: execution.id },
								})
							}
							onView={() =>
								navigate({
									to: "/projects/$projectId/workflow/$executionId",
									params: { projectId, executionId: execution.id },
								})
							}
							showTimestamps={true}
						/>
					))}
				</div>
			)}
		</div>
	);
}
