import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { StepRenderer } from "@/components/workflows/step-renderer";
import { WorkflowLayoutRenderer } from "@/components/workflows/workflow-layout-renderer";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute(
	"/_authenticated/projects/$projectId/workflow/$executionId",
)({
	component: WorkflowExecutionPage,
});

/**
 * Universal Workflow Execution Page - Story 2.3 Task 7.7
 *
 * Updated to use new layout system with WorkflowLayoutRenderer
 * Supports all three layout types:
 * - wizard: Linear flow with stepper (workflow-init)
 * - artifact-workbench: Timeline + ArtifactPreview (brainstorming)
 * - dialog: Modal overlay for child workflows (techniques)
 *
 * Route: /projects/:projectId/workflow/:executionId
 */
function WorkflowExecutionPage() {
	const { projectId, executionId } = Route.useParams();
	const navigate = useNavigate();
	const [dialogChildExecutionId, setDialogChildExecutionId] = useState<
		string | null
	>(null);
	const [pendingWorkflowId, setPendingWorkflowId] = useState<string | null>(
		null,
	)

	// Fetch workflow execution state using tRPC hook for proper cache management
	const {
		data: executionData,
		isLoading,
		error,
		refetch: refetchExecution,
	} = trpc.workflows.getExecution.useQuery(
		{ executionId },
		{
			refetchInterval: (query) => {
				// Poll every 2 seconds if workflow is running
				const data = query.state.data;
				return data?.execution?.status === "running" ? 2000 : false;
			},
		},
	)

	// tRPC client for mutations
	const trpcClient = trpc.useContext().client;

	// Create and start child workflow mutation
	const createChildWorkflow = useMutation({
		mutationFn: async (input: {
			parentExecutionId: string;
			workflowId: string;
			projectId: string;
			mappedVariables?: Record<string, unknown>;
		}) => {
			return trpcClient.workflows.createAndStartChild.mutate(input);
		},
		onSuccess: (childData) => {
			refetchExecution();
			// Open dialog to show running child workflow
			setDialogChildExecutionId(childData.id);
			setPendingWorkflowId(null);
		},
		onError: (error: Error) => {
			toast.error("Failed to start workflow", {
				description: error.message,
			})
			setPendingWorkflowId(null);
		},
	})

	// Fetch child execution data if dialog is open
	const { data: childExecutionData } = trpc.workflows.getExecution.useQuery(
		{ executionId: dialogChildExecutionId! },
		{
			enabled: !!dialogChildExecutionId,
			refetchInterval: 2000,
		},
	)

	// Fetch workflow details for confirmation dialog
	const { data: pendingWorkflowData } = trpc.workflows.getByIds.useQuery(
		{ workflowIds: pendingWorkflowId ? [pendingWorkflowId] : [] },
		{
			enabled: !!pendingWorkflowId,
		},
	)

	if (isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					<span>Loading workflow...</span>
				</div>
			</div>
		)
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
		)
	}

	// Extract execution data - getExecution returns { execution, workflow, currentStep, steps }
	const { execution, workflow, currentStep, steps } = executionData;

	// Safety check: if no current step or steps, show error
	if (!currentStep || !steps || steps.length === 0) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h2 className="font-semibold text-xl">Workflow not ready</h2>
					<p className="mt-2 text-muted-foreground">
						This workflow execution hasn't been started yet or has no steps
						configured.
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
		)
	}

	// Handler for opening child workflow confirmation dialog
	const handleExecuteWorkflow = (workflowId: string) => {
		// Check if child already exists and is running
		const childMetadata = execution.variables._child_metadata as Array<{
			id: string;
			workflowId: string;
		}>

		const existingChild = childMetadata?.find(
			(child) => child.workflowId === workflowId,
		)

		if (existingChild) {
			// Child already exists, open it directly
			setDialogChildExecutionId(existingChild.id);
		} else {
			// No child exists, show confirmation dialog
			setPendingWorkflowId(workflowId);
		}
	}

	// Handler for confirming workflow start
	const handleConfirmStart = () => {
		if (!pendingWorkflowId) return;

		// Calculate mapped variables from current step config
		const currentStepConfig = currentStep.config as any;
		const variableMapping = currentStepConfig?.variableMapping || {};

		const mappedVariables: Record<string, unknown> = {};
		for (const [childVar, parentVarRef] of Object.entries(variableMapping)) {
			const varName = (parentVarRef as string).replace(/{{|}}/g, "").trim();
			mappedVariables[childVar] = execution.variables[varName];
		}

		createChildWorkflow.mutate({
			parentExecutionId: execution.id,
			workflowId: pendingWorkflowId,
			projectId: projectId,
			mappedVariables,
		})
	}

	// Render step content
	const stepContent = (
		<StepRenderer
			step={currentStep}
			execution={execution}
			projectId={projectId}
			onExecuteWorkflow={handleExecuteWorkflow}
		/>
	)

	return (
        <div className="h-screen w-full p-4">
            {/* Parent workflow layout */}
            <WorkflowLayoutRenderer
				workflow={workflow}
				execution={execution}
				steps={steps}
				currentStep={currentStep}
				projectId={projectId}
				stepContent={stepContent}
				onExecuteWorkflow={handleExecuteWorkflow}
			/>
            {/* Child workflow dialog (if open) */}
            {dialogChildExecutionId &&
				childExecutionData &&
				childExecutionData.currentStep && (
					<WorkflowLayoutRenderer
						workflow={childExecutionData.workflow}
						execution={childExecutionData.execution}
						steps={childExecutionData.steps}
						currentStep={childExecutionData.currentStep}
						projectId={projectId}
						stepContent={
							<StepRenderer
								step={childExecutionData.currentStep}
								execution={childExecutionData.execution}
								projectId={projectId}
							/>
						}
						dialogProps={{
							open: true,
							onClose: () => setDialogChildExecutionId(null),
						}}
					/>
				)}
            {/* Confirmation dialog for starting child workflow */}
            {pendingWorkflowId &&
				(() => {
					// Get workflow details
					const currentStepConfig = currentStep.config as any;
					const variableMapping = currentStepConfig?.variableMapping || {};

					// Calculate mapped variables
					const mappedVariables: Record<string, unknown> = {};
					for (const [childVar, parentVarRef] of Object.entries(
						variableMapping,
					)) {
						const varName = (parentVarRef as string)
							.replace(/{{|}}/g, "")
							.trim()
						mappedVariables[childVar] = execution.variables[varName];
					}

					return (
						<Dialog
							open={!!pendingWorkflowId}
							onOpenChange={() => setPendingWorkflowId(null)}
						>
							<DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
								<DialogHeader>
									<DialogTitle className="flex items-center gap-2">
										<AlertCircle className="h-5 w-5 text-primary" />
										Confirm Workflow Execution
									</DialogTitle>
									<DialogDescription>
										Review the workflow details and variables that will be
										passed
									</DialogDescription>
								</DialogHeader>

								<div className="space-y-4">
									<div>
										<h4 className="mb-2 font-medium text-sm">Workflow</h4>
										{pendingWorkflowData && pendingWorkflowData.length > 0 ? (
											<>
												<p className="font-medium">
													{pendingWorkflowData[0].displayName ||
														pendingWorkflowData[0].name}
												</p>
												{pendingWorkflowData[0].description && (
													<p className="mt-1 text-muted-foreground text-sm">
														{pendingWorkflowData[0].description}
													</p>
												)}
											</>
										) : (
											<p className="font-medium text-muted-foreground">
												Loading workflow details...
											</p>
										)}
										<p className="mt-1 text-muted-foreground text-xs">
											ID: {pendingWorkflowId}
										</p>
									</div>

									<div>
										<h4 className="mb-2 font-medium text-sm">
											Variables to be passed
										</h4>
										<div className="space-y-3 rounded-md bg-muted p-4">
											{Object.entries(mappedVariables).map(([key, value]) => (
												<div key={key}>
													<p className="mb-1 font-medium text-sm">{key}:</p>
													<p className="whitespace-pre-wrap text-muted-foreground text-sm">
														{Array.isArray(value)
															? value
																	.map((item, i) => "${i + 1}. ${item}")
																	.join("\n")
															: String(value)}
													</p>
												</div>
											))}
										</div>
									</div>
								</div>

								<DialogFooter>
									<Button
										variant="outline"
										onClick={() => setPendingWorkflowId(null)}
										disabled={createChildWorkflow.isPending}
									>
										Cancel
									</Button>
									<Button
										onClick={handleConfirmStart}
										disabled={createChildWorkflow.isPending}
									>
										{createChildWorkflow.isPending ? (
											<>
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
												Starting...
											</>
										) : (
											"Start Workflow"
										)}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>
					)
				})()}
        </div>
    )
}
