import {
	AlertCircle,
	CheckCircle2,
	Circle,
	Clock,
	Loader2,
	XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * ToolStatusPanel - Shows execution progress of all tools in the step
 *
 * Story 1.6: Visual checklist showing which tools have completed,
 * which are pending approval, and which are blocked by prerequisites.
 *
 * Status Icons:
 * - ⚪ Not Started (Circle)
 * - ⏳ Executing (Loader2 spinning)
 * - 🎯 Awaiting Approval (Clock)
 * - ✅ Approved (CheckCircle2)
 * - 🚫 Blocked (AlertCircle + prerequisite list)
 * - ❌ Rejected (XCircle)
 */

interface ToolConfig {
	name: string;
	description: string;
	requiresApproval: boolean;
	requiredVariables?: string[];
}

interface ApprovalState {
	status: "pending" | "approved" | "rejected";
	value: Record<string, unknown>;
	reasoning?: string;
	rejection_history?: Array<{ feedback: string; timestamp: string }>;
	rejection_count?: number;
}

interface ToolStatusPanelProps {
	tools: ToolConfig[];
	approvalStates?: Record<string, ApprovalState>;
	executionVariables?: Record<string, unknown>;
	className?: string;
}

type ToolStatus =
	| "not_started"
	| "executing"
	| "awaiting_approval"
	| "approved"
	| "rejected"
	| "blocked";

export function ToolStatusPanel({
	tools,
	approvalStates = {},
	executionVariables = {},
	className = "",
}: ToolStatusPanelProps) {
	function getToolStatus(tool: ToolConfig): ToolStatus {
		const approvalState = approvalStates[tool.name];

		// Check if tool is blocked by missing prerequisites
		if (tool.requiredVariables && tool.requiredVariables.length > 0) {
			const missingVars = tool.requiredVariables.filter(
				(varName) =>
					!(varName in executionVariables) &&
					!Object.values(approvalStates).some(
						(state) => state.value && varName in state.value,
					),
			);

			if (missingVars.length > 0) {
				return "blocked";
			}
		}

		// Check approval state
		if (!approvalState) {
			return "not_started";
		}

		if (approvalState.status === "approved") {
			return "approved";
		}

		if (approvalState.status === "rejected") {
			return "rejected";
		}

		if (approvalState.status === "pending") {
			return "awaiting_approval";
		}

		return "not_started";
	}

	function getStatusIcon(status: ToolStatus) {
		switch (status) {
			case "not_started":
				return <Circle className="h-4 w-4 text-muted-foreground" />;
			case "executing":
				return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
			case "awaiting_approval":
				return <Clock className="h-4 w-4 text-yellow-500" />;
			case "approved":
				return <CheckCircle2 className="h-4 w-4 text-green-500" />;
			case "rejected":
				return <XCircle className="h-4 w-4 text-red-500" />;
			case "blocked":
				return <AlertCircle className="h-4 w-4 text-orange-500" />;
		}
	}

	function getStatusBadge(status: ToolStatus) {
		const badgeConfig: Record<
			ToolStatus,
			{ label: string; variant: "default" | "secondary" | "destructive" }
		> = {
			not_started: { label: "Not Started", variant: "secondary" },
			executing: { label: "Executing", variant: "default" },
			awaiting_approval: { label: "Awaiting Approval", variant: "default" },
			approved: { label: "Approved", variant: "default" },
			rejected: { label: "Rejected", variant: "destructive" },
			blocked: { label: "Blocked", variant: "destructive" },
		};

		const config = badgeConfig[status];
		return (
			<Badge variant={config.variant} className="text-xs">
				{config.label}
			</Badge>
		);
	}

	function getMissingPrerequisites(tool: ToolConfig): string[] {
		if (!tool.requiredVariables || tool.requiredVariables.length === 0) {
			return [];
		}

		return tool.requiredVariables.filter(
			(varName) =>
				!(varName in executionVariables) &&
				!Object.values(approvalStates).some(
					(state) => state.value && varName in state.value,
				),
		);
	}

	const totalTools = tools.length;
	const approvedCount = tools.filter(
		(t) => getToolStatus(t) === "approved",
	).length;
	const progress = totalTools > 0 ? (approvedCount / totalTools) * 100 : 0;

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-base">
					<span>Tool Execution Progress</span>
					<span className="font-normal text-muted-foreground text-sm">
						{approvedCount}/{totalTools}
					</span>
				</CardTitle>
				{/* Progress Bar */}
				<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full bg-green-500 transition-all duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{tools.map((tool) => {
					const status = getToolStatus(tool);
					const missingPrereqs = getMissingPrerequisites(tool);
					const approvalState = approvalStates[tool.name];
					const rejectionCount = approvalState?.rejection_count || 0;

					return (
						<TooltipProvider key={tool.name}>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="flex cursor-pointer items-start gap-3 rounded-md p-2 transition-colors hover:bg-muted/50">
										{/* Status Icon */}
										<div className="mt-0.5">{getStatusIcon(status)}</div>

										{/* Tool Info */}
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center gap-2">
												<span className="truncate font-medium text-sm">
													{tool.name
														.replace(/_/g, " ")
														.replace(/\b\w/g, (l) => l.toUpperCase())}
												</span>
												{getStatusBadge(status)}
												{rejectionCount > 0 && (
													<Badge variant="destructive" className="text-xs">
														{rejectionCount} rejection
														{rejectionCount > 1 ? "s" : ""}
													</Badge>
												)}
											</div>
											<p className="line-clamp-1 text-muted-foreground text-xs">
												{tool.description}
											</p>

											{/* Blocked Message */}
											{status === "blocked" && missingPrereqs.length > 0 && (
												<div className="mt-1 text-orange-600 text-xs dark:text-orange-400">
													Waiting for:{" "}
													{missingPrereqs
														.map((v) => v.replace(/_/g, " "))
														.join(", ")}
												</div>
											)}

											{/* Rejection Feedback */}
											{status === "rejected" &&
												approvalState?.rejection_history &&
												approvalState.rejection_history.length > 0 && (
													<div className="mt-1 text-red-600 text-xs italic dark:text-red-400">
														Last feedback:{" "}
														{
															approvalState.rejection_history[
																approvalState.rejection_history.length - 1
															].feedback
														}
													</div>
												)}
										</div>
									</div>
								</TooltipTrigger>
								<TooltipContent side="right" className="max-w-xs">
									<div className="space-y-1">
										<div className="font-medium">{tool.description}</div>
										{tool.requiresApproval && (
											<div className="text-muted-foreground text-xs">
												Requires user approval
											</div>
										)}
										{tool.requiredVariables &&
											tool.requiredVariables.length > 0 && (
												<div className="text-muted-foreground text-xs">
													Prerequisites:{" "}
													{tool.requiredVariables
														.map((v) => v.replace(/_/g, " "))
														.join(", ")}
												</div>
											)}
									</div>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					);
				})}
			</CardContent>
		</Card>
	);
}
