import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AskUserChatStep } from "@/components/workflows/steps/ask-user-chat-step";
import { WorkbenchLayout } from "@/components/workflows/workbench-layout";
import { ArtifactPreview } from "@/components/workflows/artifact-preview";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/projects/$projectId/workflow/$executionId",
)({
	component: WorkflowExecutionPage,
});

/**
 * Universal Workflow Execution Page
 *
 * Story 2.2: Generic workflow execution route that supports all workflow types
 * Uses the Workbench Layout for artifact-generating workflows
 *
 * Route: /projects/:projectId/workflow/:executionId
 *
 * This route replaces the hardcoded /initialize route and supports:
 * - Brainstorming workflow (Story 2.2)
 * - PRD generation (Future)
 * - Architecture design (Future)
 * - Story creation (Future)
 */
function WorkflowExecutionPage() {
	const { projectId, executionId } = Route.useParams();
	const navigate = useNavigate();

	// Fetch workflow execution state using tRPC hook for proper cache management
	const {
		data: executionData,
		isLoading,
		error,
	} = trpc.workflows.getExecution.useQuery(
		{ executionId },
		{
			refetchInterval: (query) => {
				// Poll every 2 seconds if workflow is running
				const data = query.state.data;
				return data?.execution?.status === "running" ? 2000 : false;
			},
		},
	);

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading workflow...</span>
				</div>
			</div>
		);
	}

	if (error || !executionData) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h2 className="font-semibold text-xl">Workflow not found</h2>
					<p className="mt-2 text-muted-foreground">
						{error instanceof Error
							? error.message
							: "The workflow execution doesn't exist."}
					</p>
					<Button
						className="mt-4"
						onClick={() =>
							navigate({ to: "/projects/$projectId", params: { projectId } })
						}
					>
						Back to Project
					</Button>
				</div>
			</div>
		);
	}

	// Extract execution data - getExecution returns { execution, workflow, currentStep }
	const { execution, workflow, currentStep } = executionData;

	// Determine if this workflow uses the Workbench Layout
	// Workflows that generate artifacts (methods, some utilities) use the workbench
	// Techniques and initializers typically don't need the workbench
	const usesWorkbench =
		workflow?.tags?.type === "method" ||
		workflow?.tags?.type === "utility" ||
		workflow?.outputArtifactType !== null;

	if (!usesWorkbench) {
		// Non-workbench workflows render their steps directly (legacy behavior)
		return (
			<LegacyWorkflowExecution
				execution={execution}
				currentStep={currentStep}
			/>
		);
	}

	// Workbench-based workflow execution
	return (
		<div className="h-screen w-full p-4">
			<WorkbenchLayout
				chatContent={
					<WorkbenchChatInterface
						execution={execution}
						currentStep={currentStep}
						projectId={projectId}
					/>
				}
				artifactContent={
					<ArtifactPreview execution={execution} workflow={workflow} />
				}
				defaultChatSize={60}
				showArtifact={true}
			/>
		</div>
	);
}

/**
 * Chat interface for workbench-based workflows
 * Renders the current step (typically ask-user-chat for Step 1)
 */
function WorkbenchChatInterface({
	execution,
	currentStep,
	projectId,
}: {
	execution: any;
	currentStep: any;
	projectId: string;
}) {
	if (!currentStep) {
		return (
			<div className="flex h-full items-center justify-center text-muted-foreground">
				No active step
			</div>
		);
	}

	// Check if step is complete (all tools approved)
	const isStepComplete = currentStep.config?.tools?.every((tool: any) => {
		const approvalStates = (execution?.variables as Record<string, any>)
			?.approval_states;
		const toolState = approvalStates?.[tool.name];
		return toolState?.status === "approved";
	});

	// Render step based on type
	switch (currentStep.stepType) {
		case "ask-user-chat":
			return (
				<AskUserChatStep
					stepConfig={currentStep.config}
					executionId={execution.id}
					stepGoal={currentStep.goal}
					stepNumber={currentStep.stepNumber}
					stepName={currentStep.name}
					isStepComplete={isStepComplete}
				/>
			);
		// Future step types can be added here
		default:
			return (
				<div className="flex h-full items-center justify-center text-muted-foreground">
					Step type "{currentStep.stepType}" not supported in workbench
				</div>
			);
	}
}

/**
 * Legacy workflow execution (non-workbench)
 * Used for workflows that don't need the split-pane layout
 */
function LegacyWorkflowExecution({
	execution,
	currentStep,
}: {
	execution: any;
	currentStep: any;
}) {
	return (
		<div className="mx-auto max-w-4xl p-8">
			<Card className="p-6">
				<p className="text-muted-foreground">
					Legacy workflow execution (non-workbench). Step{" "}
					{currentStep?.stepNumber || "?"} of type{" "}
					{currentStep?.stepType || "unknown"}.
				</p>
			</Card>
		</div>
	);
}
