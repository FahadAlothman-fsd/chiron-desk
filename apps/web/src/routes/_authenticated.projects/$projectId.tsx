import { useMutation, useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Outlet,
	useMatch,
	useNavigate,
} from "@tanstack/react-router";
import {
	Brain,
	ChevronDown,
	Loader2,
	Map as MapIcon,
	Play,
	Rocket,
	Sparkles,
	Target,
} from "lucide-react";
import { toast } from "sonner";
import { ProjectLayout } from "@/components/layouts/project-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	WorkflowExecutionCard,
	type ExecutionInfo,
	type WorkflowInfo,
} from "@/components/workflows/workflow-execution-card";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/projects/$projectId")({
	component: ProjectLayoutWrapper,
});

/**
 * Layout component for /projects/$projectId routes.
 * Wraps all project routes with the sidebar layout.
 */
function ProjectLayoutWrapper() {
	const { projectId } = Route.useParams();

	// Fetch project for the layout (name for breadcrumbs)
	const { data: projectData } = useQuery({
		queryKey: ["projects", "get", projectId],
		queryFn: async () => {
			return trpcClient.projects.get.query({ id: projectId });
		},
	});

	// Check if we're on a child route that should NOT have the sidebar
	const initializeMatch = useMatch({
		from: "/projects/$projectId/initialize",
		shouldThrow: false,
	});
	const selectInitializerMatch = useMatch({
		from: "/projects/$projectId/select-initializer",
		shouldThrow: false,
	});

	const isInitializerRoute = initializeMatch || selectInitializerMatch;

	// Initializer routes don't need the sidebar
	if (isInitializerRoute) {
		return <Outlet />;
	}

	// All other project routes get the sidebar layout
	return (
		<ProjectLayout projectName={projectData?.project?.name}>
			<ProjectDashboardOrOutlet />
		</ProjectLayout>
	);
}

/**
 * Renders the dashboard at /projects/$projectId or child routes via Outlet
 */
function ProjectDashboardOrOutlet() {
	// Story 2.2: Render child routes if they exist, otherwise show dashboard
	// Check if we're at the exact /projects/$projectId route or a child route
	const params = Route.useParams();
	const location = window.location.pathname;
	const projectPath = `/projects/${params.projectId}`;

	// If the current path is exactly the project path, show dashboard
	// Otherwise, a child route is active and should be rendered via Outlet
	if (location === projectPath) {
		return <ProjectDashboard />;
	}

	// Render child route (like /workflow/$executionId)
	return <Outlet />;
}

// Phase definitions for the workflow
const PHASES = [
	{ id: "0", name: "Discovery", description: "Define topic, goals, and scope" },
	{ id: "1", name: "Analysis", description: "Deep-dive research and analysis" },
	{ id: "2", name: "Planning", description: "Strategic planning phase" },
	{
		id: "3",
		name: "Solutioning",
		description: "Design and architecture solutions",
	},
	{
		id: "4",
		name: "Implementation",
		description: "Build and deploy the solution",
	},
];

function ProjectDashboard() {
	const { projectId } = Route.useParams();
	const navigate = useNavigate();

	// Get project details
	const { data: projectData, isLoading: projectLoading } = useQuery({
		queryKey: ["projects", "get", projectId],
		queryFn: async () => {
			return trpcClient.projects.get.query({ id: projectId });
		},
	});
	const project = projectData?.project;
	const workflowPath = projectData?.workflowPath;

	// Get next recommended workflow based on workflow path
	const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
		queryKey: ["workflows", "nextRecommended", projectId, workflowPath?.id],
		queryFn: async () => {
			if (!workflowPath?.id) return null;
			return trpcClient.workflows.getNextRecommendedWorkflow.query({
				projectId,
				workflowPathId: workflowPath.id,
			});
		},
		enabled: !!projectId && !!workflowPath?.id,
	});

	// Get all executions for this project (for phase progress display)
	const { data: executionsData } = useQuery({
		queryKey: ["workflows", "executions", "project", projectId],
		queryFn: async () => {
			return trpcClient.workflows.getExecutionsByProject.query({
				projectId,
				includeChildren: false,
			});
		},
		enabled: !!projectId,
	});

	// Create a map of workflowId -> execution for quick lookup
	const executionsByWorkflowId = new Map(
		(executionsData?.executions ?? []).map((e) => [e.workflowId, e]),
	);

	// Execute workflow mutation
	const executeWorkflow = useMutation({
		mutationFn: async (input: { workflowId: string; projectId: string }) => {
			return trpcClient.workflows.execute.mutate(input);
		},
		onSuccess: (data) => {
			toast.success("Workflow started!");
			navigate({
				to: "/projects/$projectId/workflow/$executionId",
				params: { projectId, executionId: data.executionId },
			});
		},
		onError: (error: unknown) => {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			toast.error("Failed to start workflow", {
				description: errorMessage,
			});
		},
	});

	// Handler for starting/continuing the recommended workflow
	const handleStartRecommendedWorkflow = () => {
		// If there's an active execution, navigate to it
		if (recommendedData?.activeExecution) {
			navigate({
				to: "/projects/$projectId/workflow/$executionId",
				params: {
					projectId,
					executionId: recommendedData.activeExecution.id,
				},
			});
			return;
		}

		// Otherwise start a new execution
		if (recommendedData?.nextWorkflow) {
			executeWorkflow.mutate({
				workflowId: recommendedData.nextWorkflow.id,
				projectId,
			});
		}
	};

	if (projectLoading || recommendedLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading project...</span>
				</div>
			</div>
		);
	}

	if (!project) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h2 className="font-semibold text-xl">Project not found</h2>
					<p className="mt-2 text-muted-foreground">
						The project you're looking for doesn't exist.
					</p>
					<Button className="mt-4" onClick={() => navigate({ to: "/" })}>
						Back to Projects
					</Button>
				</div>
			</div>
		);
	}

	// Determine current phase from recommended data or default to 0
	const currentPhaseNum = recommendedData?.currentPhase ?? 0;
	const currentPhase = PHASES[currentPhaseNum] || PHASES[0];
	const nextWorkflow = recommendedData?.nextWorkflow;
	const hasActiveExecution = !!recommendedData?.activeExecution;
	const allWorkflowsCompleted =
		!nextWorkflow && (recommendedData?.completedCount ?? 0) > 0;

	return (
		<div className="mx-auto max-w-5xl space-y-6">
			{/* Project Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl tracking-tight">{project.name}</h1>
					{project.description && (
						<p className="mt-1 text-muted-foreground">{project.description}</p>
					)}
				</div>
				<div className="flex flex-col items-end gap-2">
					{workflowPath && (
						<Badge variant="outline" className="flex items-center gap-1.5">
							<MapIcon className="h-3.5 w-3.5" />
							{workflowPath.displayName}
						</Badge>
					)}
					<Badge variant="secondary" className="flex items-center gap-1.5">
						<Target className="h-3.5 w-3.5" />
						Phase {currentPhase.id}: {currentPhase.name}
					</Badge>
				</div>
			</div>

			{/* Next Recommended Action Card */}
			{nextWorkflow ? (
				<Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
					<CardHeader>
						<div className="flex items-center gap-2">
							<Rocket className="h-5 w-5 text-primary" />
							<CardTitle>Next Recommended Action</CardTitle>
						</div>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-start gap-4">
							<div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
								<Sparkles className="h-6 w-6 text-primary" />
							</div>
							<div className="flex-1">
								<h3 className="font-semibold text-lg">
									{nextWorkflow.displayName || nextWorkflow.name}
								</h3>
								<p className="text-muted-foreground">
									{nextWorkflow.description ||
										`Continue with Phase ${nextWorkflow.phase}: ${PHASES[nextWorkflow.phase]?.name || "Workflow"}`}
								</p>
							</div>
						</div>
						<Button
							onClick={handleStartRecommendedWorkflow}
							disabled={executeWorkflow.isPending}
							size="lg"
							className="w-full sm:w-auto"
						>
							{executeWorkflow.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Starting...
								</>
							) : hasActiveExecution ? (
								<>
									<Play className="mr-2 h-4 w-4" />
									Continue {nextWorkflow.displayName || nextWorkflow.name}
								</>
							) : (
								<>
									<Play className="mr-2 h-4 w-4" />
									Start {nextWorkflow.displayName || nextWorkflow.name}
								</>
							)}
						</Button>
					</CardContent>
				</Card>
			) : allWorkflowsCompleted ? (
				<Card className="border-green-500/20 bg-gradient-to-r from-green-500/5 to-green-500/10">
					<CardHeader>
						<div className="flex items-center gap-2">
							<Target className="h-5 w-5 text-green-500" />
							<CardTitle>All Workflows Completed!</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							You've completed all workflows in your workflow path.
							Congratulations!
						</p>
					</CardContent>
				</Card>
			) : (
				<Card className="border-muted bg-muted/20">
					<CardHeader>
						<div className="flex items-center gap-2">
							<Rocket className="h-5 w-5 text-muted-foreground" />
							<CardTitle className="text-muted-foreground">
								No Workflows Available
							</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground">
							No workflows are configured for this workflow path yet.
						</p>
					</CardContent>
				</Card>
			)}

			{/* Dashboard Grid */}
			<div className="grid gap-6 md:grid-cols-2">
				{/* Current State Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Target className="h-4 w-4" />
							Current State
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{workflowPath && (
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<MapIcon className="h-4 w-4 text-muted-foreground" />
										<span className="font-medium">
											{workflowPath.displayName}
										</span>
									</div>
									{workflowPath.description && (
										<p className="pl-6 text-muted-foreground text-sm">
											{workflowPath.description}
										</p>
									)}
								</div>
							)}
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<div
										className={`h-2 w-2 rounded-full ${allWorkflowsCompleted ? "bg-green-500" : "bg-amber-500"}`}
									/>
									<span className="font-medium">
										Phase {currentPhase.id}: {currentPhase.name}
									</span>
								</div>
								<p className="pl-4 text-muted-foreground text-sm">
									{allWorkflowsCompleted
										? "Completed"
										: hasActiveExecution
											? "In progress"
											: recommendedData?.completedCount
												? `${recommendedData.completedCount} workflow${recommendedData.completedCount !== 1 ? "s" : ""} completed`
												: "Ready to start"}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Active Agents Card */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Brain className="h-4 w-4" />
							Active Agents
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<span className="text-sm">Analyst</span>
								<Badge variant="outline" className="text-xs">
									Idle
								</Badge>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm">PM</span>
								<Badge variant="outline" className="text-xs">
									Idle
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Phase Progress */}
			<Card>
				<CardHeader>
					<CardTitle>Phase Progress</CardTitle>
					<CardDescription>
						Track your journey through the BMAD methodology
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-2">
						{PHASES.map((phase) => (
							<PhaseItem
								key={phase.id}
								phase={phase}
								currentPhaseId={currentPhase.id}
								workflowPathId={project.workflowPathId}
								projectId={projectId}
								executionsByWorkflowId={executionsByWorkflowId}
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

// Type for execution data
type WorkflowExecution = {
	id: string;
	workflowId: string;
	workflowName: string;
	status: string;
	startedAt: string | undefined;
	completedAt: string | undefined;
};

/**
 * Collapsible phase item that shows workflows when expanded
 * Filters workflows by the project's workflow path if available
 */
function PhaseItem({
	phase,
	currentPhaseId,
	workflowPathId,
	projectId,
	executionsByWorkflowId,
}: {
	phase: (typeof PHASES)[number];
	currentPhaseId: string;
	workflowPathId: string | null | undefined;
	projectId: string;
	executionsByWorkflowId: Map<string, WorkflowExecution>;
}) {
	const navigate = useNavigate();
	const isActive = phase.id === currentPhaseId;
	const isCompleted =
		Number.parseInt(phase.id, 10) < Number.parseInt(currentPhaseId, 10);
	const isPending =
		Number.parseInt(phase.id, 10) > Number.parseInt(currentPhaseId, 10);

	// Fetch workflows for this phase, filtered by workflow path if available
	const { data: workflowsData, isLoading } = useQuery({
		queryKey: ["workflows", "phase", phase.id, "path", workflowPathId],
		queryFn: async () => {
			if (workflowPathId) {
				// Use the path-filtered endpoint
				return trpcClient.workflows.getByPhaseAndPath.query({
					phase: phase.id,
					workflowPathId,
				});
			}
			// Fallback to all workflows for this phase (no path selected)
			return trpcClient.workflows.getByPhase.query({ phase: phase.id });
		},
	});

	// Execute workflow mutation
	const executeWorkflow = useMutation({
		mutationFn: async (workflowId: string) => {
			return trpcClient.workflows.execute.mutate({
				workflowId,
				projectId,
			});
		},
		onSuccess: (data) => {
			toast.success("Workflow started!");
			navigate({
				to: "/projects/$projectId/workflow/$executionId",
				params: { projectId, executionId: data.executionId },
			});
		},
		onError: (error: any) => {
			toast.error("Failed to start workflow", {
				description: error.message,
			});
		},
	});

	const workflows = workflowsData?.workflows ?? [];

	// Get active execution IDs for live progress polling
	const activeExecutionIds = workflows
		.map((w) => executionsByWorkflowId.get(w.id))
		.filter((e) => e && (e.status === "active" || e.status === "paused"))
		.map((e) => e!.id);

	// Poll for live progress on active executions
	const { data: liveExecutions } = useQuery({
		queryKey: ["workflows", "executions", "live", phase.id, activeExecutionIds],
		queryFn: async () => {
			return trpcClient.workflows.getExecutionsByIds.query({
				executionIds: activeExecutionIds,
			});
		},
		enabled: activeExecutionIds.length > 0,
		refetchInterval: 2000, // Poll every 2 seconds
	});

	// Calculate progress based on completed executions
	const completedInPhase = workflows.filter((w) => {
		const exec = executionsByWorkflowId.get(w.id);
		return exec?.status === "completed";
	}).length;
	const totalInPhase = workflows.length;
	const progressPercent =
		totalInPhase > 0 ? Math.round((completedInPhase / totalInPhase) * 100) : 0;
	const phaseFullyCompleted =
		totalInPhase > 0 && completedInPhase === totalInPhase;
	const phaseHasProgress = completedInPhase > 0;

	return (
		<Collapsible defaultOpen={isActive}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={`flex w-full items-center gap-4 rounded-lg p-3 text-left transition-colors hover:bg-accent ${
						isActive ? "bg-primary/5" : ""
					}`}
				>
					{/* Phase indicator */}
					<div
						className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-medium text-sm ${
							phaseFullyCompleted
								? "bg-green-500 text-white"
								: isActive
									? "bg-primary text-primary-foreground"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{phaseFullyCompleted ? "✓" : phase.id}
					</div>

					{/* Phase info */}
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span
								className={`font-medium ${
									phaseFullyCompleted
										? "text-green-600"
										: isActive
											? "text-primary"
											: isPending
												? "text-muted-foreground"
												: ""
								}`}
							>
								Phase {phase.id}: {phase.name}
							</span>
							{workflows.length > 0 && (
								<Badge variant="secondary" className="text-xs">
									{completedInPhase}/{workflows.length} workflow
									{workflows.length !== 1 ? "s" : ""}
								</Badge>
							)}
						</div>
						<p className="text-muted-foreground text-sm">{phase.description}</p>
					</div>

					{/* Progress bar */}
					<div className="w-24 shrink-0">
						<div className="h-2 overflow-hidden rounded-full bg-muted">
							<div
								className={`h-full transition-all ${
									phaseFullyCompleted
										? "bg-green-500"
										: phaseHasProgress
											? "bg-primary"
											: "bg-transparent"
								}`}
								style={{
									width: `${progressPercent}%`,
								}}
							/>
						</div>
						<p className="mt-1 text-right text-muted-foreground text-xs">
							{progressPercent}%
						</p>
					</div>

					{/* Expand indicator */}
					<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
				</button>
			</CollapsibleTrigger>

			<CollapsibleContent>
				<div className="ml-12 space-y-2 border-muted border-l-2 py-2 pl-4">
					{isLoading ? (
						<div className="flex items-center gap-2 py-2 text-muted-foreground text-sm">
							<Loader2 className="h-3 w-3 animate-spin" />
							Loading workflows...
						</div>
					) : workflows.length === 0 ? (
						<p className="py-2 text-muted-foreground text-sm italic">
							No workflows available for this phase
						</p>
					) : (
						workflows.map((workflow) => {
							const baseExecution = executionsByWorkflowId.get(workflow.id);
							// Get live progress data if available
							const liveData = liveExecutions?.find(
								(e) => e.id === baseExecution?.id,
							);

							// Build workflow info
							const workflowInfo: WorkflowInfo = {
								id: workflow.id,
								name: workflow.name,
								displayName: workflow.displayName ?? undefined,
								description: workflow.description ?? undefined,
							};

							// Build execution info (null if not started)
							let executionInfo: ExecutionInfo | null = null;
							if (baseExecution) {
								executionInfo = {
									id: baseExecution.id,
									status: baseExecution.status as ExecutionInfo["status"],
									startedAt: baseExecution.startedAt,
									completedAt: baseExecution.completedAt,
									stepProgress: liveData?.stepProgress ?? null,
									toolProgress: liveData?.toolProgress ?? null,
								};
							}

							return (
								<WorkflowExecutionCard
									key={workflow.id}
									workflow={workflowInfo}
									execution={executionInfo}
									variant="compact"
									onExecute={() => executeWorkflow.mutate(workflow.id)}
									onResume={() =>
										baseExecution &&
										navigate({
											to: "/projects/$projectId/workflow/$executionId",
											params: {
												projectId,
												executionId: baseExecution.id,
											},
										})
									}
									onView={() =>
										baseExecution &&
										navigate({
											to: "/projects/$projectId/workflow/$executionId",
											params: {
												projectId,
												executionId: baseExecution.id,
											},
										})
									}
									showTimestamps={false}
								/>
							);
						})
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
