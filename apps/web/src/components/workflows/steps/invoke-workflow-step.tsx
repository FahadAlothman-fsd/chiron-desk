import type { InvokeWorkflowStepConfig } from "@chiron/db";
import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";

/**
 * InvokeWorkflowStep - Workflows List UI Component
 * Story 2.3 Task 6: Displays child workflows with execution status
 *
 * Shows list of workflows to invoke with:
 * - Status indicators (Pending, Running, Completed, Failed)
 * - [Execute] button to launch child workflow dialog
 * - Progress indicators (ideas count, etc.)
 * - Support for parallel execution
 */

interface InvokeWorkflowStepProps {
	config: InvokeWorkflowStepConfig;
	variables: Record<string, unknown>;
	onExecuteWorkflow?: (workflowId: string) => void;
}

interface ChildExecutionMetadata {
	id: string;
	workflowId: string;
	workflowName: string;
	status: "idle" | "active" | "paused" | "completed" | "failed";
	createdAt: string;
	generatedIdeasSnapshot?: unknown[];
}

type WorkflowStatus = "pending" | "running" | "completed" | "failed";

export function InvokeWorkflowStep({
	config,
	variables,
	onExecuteWorkflow,
}: InvokeWorkflowStepProps) {
	const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(
		null,
	);

	// Get workflow IDs to invoke from config
	const workflowIdsToInvoke = variables[
		config.workflowsToInvoke.replace(/{{|}}/g, "").trim()
	] as string[];

	// Fetch workflow details for all workflow IDs
	const { data: workflowsData } = trpc.workflows.getByIds.useQuery(
		{
			workflowIds: workflowIdsToInvoke || [],
		},
		{
			enabled: !!workflowIdsToInvoke && workflowIdsToInvoke.length > 0,
		},
	);

	// Get child execution metadata from parent variables
	const childMetadata = (variables._child_metadata ||
		[]) as ChildExecutionMetadata[];
	const failedChildren = (variables._failed_children || []) as Array<{
		id: string;
		workflowName: string;
		error: string;
	}>;

	// Poll for real-time child execution status updates
	const { data: liveChildExecutions } =
		trpc.workflows.getExecutionsByIds.useQuery(
			{
				executionIds: childMetadata.map((c) => c.id),
			},
			{
				enabled: childMetadata.length > 0,
				refetchInterval: 2000, // Poll every 2 seconds for status updates
			},
		);

	// Merge live status into child metadata
	const updatedChildMetadata = childMetadata.map((child) => {
		const liveData = liveChildExecutions?.find((e) => e.id === child.id);
		return liveData
			? {
					...child,
					status: liveData.status as ChildExecutionMetadata["status"],
					error: liveData.error,
				}
			: child;
	});

	if (!workflowIdsToInvoke || !Array.isArray(workflowIdsToInvoke)) {
		return (
			<Card>
				<CardContent className="pt-6">
					<p className="text-muted-foreground">
						No workflows configured to invoke.
					</p>
				</CardContent>
			</Card>
		);
	}

	// Map workflow IDs to their display info and execution status
	const workflowItems = workflowIdsToInvoke.map((workflowId) => {
		const childExecution = updatedChildMetadata.find(
			(child) => child.workflowId === workflowId,
		);
		const failed = failedChildren.find(
			(child) => child.workflowId === workflowId,
		);
		const workflowInfo = workflowsData?.find((w) => w.id === workflowId);

		// Determine status
		let status: WorkflowStatus = "pending";
		if (failed) {
			status = "failed";
		} else if (childExecution) {
			if (childExecution.status === "completed") {
				status = "completed";
			} else if (
				childExecution.status === "active" ||
				childExecution.status === "paused"
			) {
				status = "running";
			}
		}

		return {
			workflowId,
			workflowName:
				childExecution?.workflowName ||
				failed?.workflowName ||
				workflowInfo?.displayName ||
				workflowInfo?.name ||
				"Unknown Workflow",
			workflowDescription: workflowInfo?.description,
			status,
			childExecution,
			failedInfo: failed,
		};
	});

	const handleExecute = (workflowId: string) => {
		if (onExecuteWorkflow) {
			onExecuteWorkflow(workflowId);
		}
	};

	const toggleExpanded = (workflowId: string) => {
		setExpandedWorkflowId(
			expandedWorkflowId === workflowId ? null : workflowId,
		);
	};

	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Execute Brainstorming Techniques</CardTitle>
					<p className="text-muted-foreground text-sm">
						Click Execute to start each technique. Techniques can run in
						parallel.
					</p>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{workflowItems.map((item) => (
							<WorkflowListItem
								key={item.workflowId}
								item={item}
								isExpanded={expandedWorkflowId === item.workflowId}
								onExecute={() => handleExecute(item.workflowId)}
								onToggleExpand={() => toggleExpanded(item.workflowId)}
							/>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Summary */}
			<div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
				<div className="text-sm">
					<span className="text-muted-foreground">Progress: </span>
					<span className="font-medium text-foreground">
						{workflowItems.filter((item) => item.status === "completed").length}{" "}
						/ {workflowItems.length} completed
					</span>
				</div>
				{failedChildren.length > 0 && (
					<div className="text-destructive text-sm">
						{failedChildren.length} failed
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * Individual workflow list item
 */
interface WorkflowListItemProps {
	item: {
		workflowId: string;
		workflowName: string;
		status: WorkflowStatus;
		childExecution?: ChildExecutionMetadata;
		failedInfo?: { error: string };
	};
	isExpanded: boolean;
	onExecute: () => void;
	onToggleExpand: () => void;
}

function WorkflowListItem({
	item,
	isExpanded,
	onExecute,
	onToggleExpand,
}: WorkflowListItemProps) {
	const { status, workflowName, childExecution, failedInfo } = item;

	// Status icon and color (using CSS variables for dark theme support)
	const statusConfig = {
		pending: {
			icon: Circle,
			color: "text-muted-foreground",
			label: "Not started",
			bgColor: "bg-muted/30",
			borderColor: "border-border",
		},
		running: {
			icon: Loader2,
			color: "text-primary",
			label: "Running",
			bgColor: "bg-primary/10",
			borderColor: "border-primary/30",
			animate: true,
		},
		completed: {
			icon: CheckCircle2,
			color: "text-accent-foreground",
			label: "Completed",
			bgColor: "bg-accent",
			borderColor: "border-accent-foreground/20",
		},
		failed: {
			icon: XCircle,
			color: "text-destructive",
			label: "Failed",
			bgColor: "bg-destructive/10",
			borderColor: "border-destructive/30",
		},
	};

	const config = statusConfig[status];
	const StatusIcon = config.icon;

	// Ideas count (if available)
	const ideasCount = childExecution?.generatedIdeasSnapshot?.length;

	return (
		<div
			className={`rounded-lg border ${config.borderColor} ${config.bgColor} transition-all hover:bg-accent/50`}
		>
			<div className="flex items-center justify-between p-4">
				{/* Left: Status Icon + Name */}
				<div className="flex items-center gap-3">
					<StatusIcon
						className={`h-5 w-5 ${config.color} ${config.animate ? "animate-spin" : ""}`}
					/>
					<div>
						<h3 className="font-medium text-foreground">{workflowName}</h3>
						<p className="text-muted-foreground text-xs">{config.label}</p>
					</div>
				</div>

				{/* Right: Stats + Actions */}
				<div className="flex items-center gap-4">
					{/* Ideas count (if completed) */}
					{status === "completed" && ideasCount !== undefined && (
						<div className="text-accent-foreground text-sm">
							<span className="font-medium">{ideasCount}</span> ideas
						</div>
					)}

					{/* Execute button (if pending or failed) */}
					{(status === "pending" || status === "failed") && (
						<Button onClick={onExecute} size="sm" variant="default">
							{status === "failed" ? "Retry" : "Execute"}
						</Button>
					)}

					{/* Resume button (if running/paused) */}
					{status === "running" && (
						<Button onClick={onExecute} size="sm" variant="outline">
							Resume
						</Button>
					)}

					{/* View details (if completed/failed) */}
					{(status === "completed" || status === "failed") && (
						<Button
							onClick={onToggleExpand}
							size="sm"
							variant="ghost"
							className="text-xs"
						>
							{isExpanded ? "Hide" : "Details"}
						</Button>
					)}
				</div>
			</div>

			{/* Expanded details */}
			{isExpanded && (
				<div className="border-border border-t bg-background p-4">
					{status === "failed" && failedInfo && (
						<div className="space-y-2">
							<h4 className="font-medium text-destructive text-sm">Error</h4>
							<p className="text-muted-foreground text-sm">
								{failedInfo.error}
							</p>
						</div>
					)}

					{status === "completed" && childExecution && (
						<div className="space-y-2">
							<h4 className="font-medium text-foreground text-sm">
								Generated Ideas
							</h4>
							{childExecution.generatedIdeasSnapshot &&
							childExecution.generatedIdeasSnapshot.length > 0 ? (
								<ul className="list-inside list-disc space-y-1 text-muted-foreground text-sm">
									{childExecution.generatedIdeasSnapshot.map((idea, idx) => (
										<li key={idx}>{String(idea)}</li>
									))}
								</ul>
							) : (
								<p className="text-muted-foreground text-sm">
									No ideas generated
								</p>
							)}
						</div>
					)}
				</div>
			)}
		</div>
	);
}
