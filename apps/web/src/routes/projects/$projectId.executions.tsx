/**
 * Project Executions Page
 *
 * Lists all workflow executions for a project with:
 * - Status badges (active, paused, completed, failed)
 * - Workflow name and description
 * - Start/completion timestamps
 * - Click to navigate to execution view
 */

import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	CheckCircle,
	Clock,
	ExternalLink,
	Loader2,
	Pause,
	Play,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/projects/$projectId/executions")({
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
				<div className="space-y-4">
					{executions.map((execution) => (
						<ExecutionCard
							key={execution.id}
							execution={execution}
							projectId={projectId}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface ExecutionCardProps {
	execution: {
		id: string;
		workflowId: string;
		workflowName: string;
		workflowDescription: string | null;
		status: string;
		startedAt: string | undefined;
		completedAt: string | undefined;
		workflowTags: unknown;
		workflowMetadata: unknown;
	};
	projectId: string;
}

function ExecutionCard({ execution, projectId }: ExecutionCardProps) {
	const navigate = useNavigate();

	const getStatusIcon = (status: string) => {
		switch (status) {
			case "active":
				return <Play className="h-4 w-4 text-blue-500" />;
			case "paused":
				return <Pause className="h-4 w-4 text-amber-500" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-500" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-destructive" />;
			default:
				return <Clock className="h-4 w-4 text-muted-foreground" />;
		}
	};

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case "active":
				return "default" as const;
			case "paused":
				return "secondary" as const;
			case "completed":
				return "outline" as const;
			case "failed":
				return "destructive" as const;
			default:
				return "outline" as const;
		}
	};

	const formatDate = (dateStr: string | undefined) => {
		if (!dateStr) return "—";
		const date = new Date(dateStr);
		return date.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Extract phase from workflow tags
	const phase =
		typeof execution.workflowTags === "object" &&
		execution.workflowTags !== null &&
		"phase" in execution.workflowTags
			? (execution.workflowTags as { phase: string }).phase
			: null;

	return (
		<Card
			className="cursor-pointer transition-colors hover:bg-accent/50"
			onClick={() =>
				navigate({
					to: "/projects/$projectId/workflow/$executionId",
					params: { projectId, executionId: execution.id },
				})
			}
		>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="flex items-center gap-2 text-lg">
							{execution.workflowName}
							{phase && (
								<Badge variant="outline" className="text-xs">
									Phase {phase}
								</Badge>
							)}
						</CardTitle>
						{execution.workflowDescription && (
							<CardDescription className="mt-1">
								{execution.workflowDescription}
							</CardDescription>
						)}
					</div>
					<Badge
						variant={getStatusBadgeVariant(execution.status)}
						className="flex items-center gap-1.5"
					>
						{getStatusIcon(execution.status)}
						{execution.status.charAt(0).toUpperCase() +
							execution.status.slice(1)}
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between text-muted-foreground text-sm">
					<div className="flex items-center gap-4">
						<span>Started: {formatDate(execution.startedAt)}</span>
						{execution.completedAt && (
							<span>Completed: {formatDate(execution.completedAt)}</span>
						)}
					</div>
					<Button variant="ghost" size="sm" className="gap-1">
						<ExternalLink className="h-3.5 w-3.5" />
						View
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
