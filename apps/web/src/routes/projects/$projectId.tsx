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
	Map,
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
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/projects/$projectId")({
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

	// Check for active brainstorming execution specifically
	const { data: executionData } = useQuery({
		queryKey: ["workflows", "execution", "project", projectId],
		queryFn: async () => {
			const result = await trpcClient.workflows.getExecutionByProject.query({
				projectId,
			});
			// Only return execution if it's for the brainstorming workflow
			if (result?.execution && result?.workflow?.name === "brainstorming") {
				return result;
			}
			return null;
		},
		enabled: !!projectId,
	});

	// Get Phase 0 workflows (Discovery)
	const { data: phaseWorkflows, isLoading: workflowsLoading } = useQuery({
		queryKey: ["workflows", "phase", "0"],
		queryFn: async () => {
			return trpcClient.workflows.getByPhase.query({ phase: "0" });
		},
	});

	// Execute workflow mutation
	const executeWorkflow = useMutation({
		mutationFn: async (input: { workflowId: string; projectId: string }) => {
			return trpcClient.workflows.execute.mutate(input);
		},
		onSuccess: (data) => {
			toast.success("Workflow started!");
			// Navigate to universal workflow execution page (Story 2.2)
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

	const handleStartBrainstorming = () => {
		// Check if there's already an active execution
		if (executionData?.execution) {
			// Navigate to existing execution
			navigate({
				to: "/projects/$projectId/workflow/$executionId",
				params: { projectId, executionId: executionData.execution.id },
			});
			return;
		}

		// Find the brainstorming workflow from Phase 0
		const brainstormingWorkflow = phaseWorkflows?.workflows.find(
			(w) =>
				w.name === "brainstorming" || w.displayName?.includes("Brainstorm"),
		);

		if (brainstormingWorkflow) {
			executeWorkflow.mutate({
				workflowId: brainstormingWorkflow.id,
				projectId,
			});
		} else {
			toast.error("Brainstorming workflow not found");
		}
	};

	if (projectLoading || workflowsLoading) {
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

	// Determine current phase (for now, always Phase 0 for new projects)
	const currentPhase = PHASES[0];
	const brainstormingWorkflow = phaseWorkflows?.workflows.find(
		(w) => w.name === "brainstorming" || w.displayName?.includes("Brainstorm"),
	);

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
							<Map className="h-3.5 w-3.5" />
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
							<Brain className="h-6 w-6 text-primary" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-lg">Brainstorming Session</h3>
							<p className="text-muted-foreground">
								Kick off your project by defining the core topic, goals, and
								scope with AI assistance.
							</p>
						</div>
					</div>
					<Button
						onClick={handleStartBrainstorming}
						disabled={!brainstormingWorkflow || executeWorkflow.isPending}
						size="lg"
						className="w-full sm:w-auto"
					>
						{executeWorkflow.isPending ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Starting...
							</>
						) : executionData?.execution ? (
							<>
								<Play className="mr-2 h-4 w-4" />
								Continue Brainstorming
							</>
						) : (
							<>
								<Play className="mr-2 h-4 w-4" />
								Start Brainstorming
							</>
						)}
					</Button>
				</CardContent>
			</Card>

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
										<Map className="h-4 w-4 text-muted-foreground" />
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
									<div className="h-2 w-2 rounded-full bg-amber-500" />
									<span className="font-medium">
										Phase {currentPhase.id}: {currentPhase.name}
									</span>
								</div>
								<p className="pl-4 text-muted-foreground text-sm">
									Ready to start
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
							/>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

/**
 * Collapsible phase item that shows workflows when expanded
 * Filters workflows by the project's workflow path if available
 */
function PhaseItem({
	phase,
	currentPhaseId,
	workflowPathId,
	projectId,
}: {
	phase: (typeof PHASES)[number];
	currentPhaseId: string;
	workflowPathId: string | null | undefined;
	projectId: string;
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
							isActive
								? "bg-primary text-primary-foreground"
								: isCompleted
									? "bg-green-500 text-white"
									: "bg-muted text-muted-foreground"
						}`}
					>
						{isCompleted ? "✓" : phase.id}
					</div>

					{/* Phase info */}
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<span
								className={`font-medium ${
									isActive
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
									{workflows.length} workflow{workflows.length !== 1 ? "s" : ""}
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
									isCompleted
										? "bg-green-500"
										: isActive
											? "bg-primary"
											: "bg-transparent"
								}`}
								style={{
									width: isCompleted ? "100%" : isActive ? "0%" : "0%",
								}}
							/>
						</div>
						<p className="mt-1 text-right text-muted-foreground text-xs">
							{isCompleted ? "100%" : "0%"}
						</p>
					</div>

					{/* Expand indicator */}
					<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
				</button>
			</CollapsibleTrigger>

			<CollapsibleContent>
				<div className="ml-12 space-y-1 border-muted border-l-2 py-2 pl-4">
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
						workflows.map((workflow) => (
							<div
								key={workflow.id}
								className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-accent"
							>
								<Sparkles className="h-4 w-4 text-muted-foreground" />
								<div className="flex-1">
									<p className="font-medium text-sm">
										{workflow.displayName || workflow.name}
									</p>
									{workflow.description && (
										<p className="line-clamp-1 text-muted-foreground text-xs">
											{workflow.description}
										</p>
									)}
								</div>
								<Button
									variant="ghost"
									size="sm"
									className="h-7 px-2"
									disabled={isPending || executeWorkflow.isPending}
									onClick={() => executeWorkflow.mutate(workflow.id)}
								>
									{executeWorkflow.isPending ? (
										<Loader2 className="mr-1 h-3 w-3 animate-spin" />
									) : (
										<Play className="mr-1 h-3 w-3" />
									)}
									Start
								</Button>
							</div>
						))
					)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
