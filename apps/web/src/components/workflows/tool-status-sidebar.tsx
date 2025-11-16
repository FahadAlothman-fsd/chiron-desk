import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	CheckCircle2,
	Circle,
	Clock,
	XCircle,
	AlertCircle,
	Loader2,
} from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * ToolStatusSidebar - Accordion-based tool progress with inline approval cards
 *
 * Redesigned for Story 1.6: Cleaner two-column layout where tools are
 * collapsible sections in the sidebar, with approval cards appearing
 * inside the accordion instead of cluttering the chat.
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

interface ToolStatusSidebarProps {
	tools: ToolConfig[];
	approvalStates?: Record<string, ApprovalState>;
	executionVariables?: Record<string, unknown>;
	executionId: string;
	agentId: string;
	className?: string;
}

type ToolStatus =
	| "not_started"
	| "executing"
	| "awaiting_approval"
	| "approved"
	| "rejected"
	| "blocked";

export function ToolStatusSidebar({
	tools,
	approvalStates = {},
	executionVariables = {},
	executionId,
	agentId,
	className = "",
}: ToolStatusSidebarProps) {
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
				return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
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

	// Auto-expand tools with pending approvals
	const defaultOpenItems = tools
		.filter((t) => getToolStatus(t) === "awaiting_approval")
		.map((t) => t.name);

	return (
		<Card className={`${className} overflow-hidden`}>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center justify-between text-base">
					<span>Tool Execution Progress</span>
					<span className="text-sm font-normal text-muted-foreground">
						{approvedCount}/{totalTools}
					</span>
				</CardTitle>
				{/* Progress Bar */}
				<div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
					<div
						className="h-full bg-green-500 transition-all duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
			</CardHeader>

			<CardContent className="p-0">
				<Accordion
					type="multiple"
					defaultValue={defaultOpenItems}
					className="w-full"
				>
					{tools.map((tool) => {
						const status = getToolStatus(tool);
						const missingPrereqs = getMissingPrerequisites(tool);
						const approvalState = approvalStates[tool.name];
						const rejectionCount = approvalState?.rejection_count || 0;

						return (
							<AccordionItem
								key={tool.name}
								value={tool.name}
								className="border-b-0"
							>
								<AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex items-center gap-3 w-full">
										{/* Status Icon */}
										<div className="flex-shrink-0">{getStatusIcon(status)}</div>

										{/* Tool Info */}
										<div className="flex-1 min-w-0 text-left">
											<div className="flex items-center gap-2 mb-1">
												<span className="text-sm font-medium truncate">
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
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4">
									{/* Tool Description */}
									<p className="text-sm text-muted-foreground mb-3">
										{tool.description}
									</p>

									{/* Available Options (if fetched from database) */}
									{(() => {
										// Check if there are options available for this tool
										// Look for {tool.name}_options or complexity_options pattern
										const optionsKey = Object.keys(executionVariables).find(
											(key) =>
												key.includes("options") &&
												(key.includes(tool.name.replace("update_", "")) ||
													key.includes("complexity")),
										);

										if (optionsKey) {
											const options = executionVariables[optionsKey];
											if (
												Array.isArray(options) &&
												options.length > 0 &&
												status !== "approved"
											) {
												return (
													<div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
														<div className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
															Available Options
														</div>
														<div className="space-y-1">
															{options.map((option: any, idx: number) => (
																<div
																	key={idx}
																	className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded"
																>
																	{typeof option === "object" && option.name
																		? `${option.name}${option.description ? ` - ${option.description}` : ""}`
																		: typeof option === "object"
																			? JSON.stringify(option)
																			: String(option)}
																</div>
															))}
														</div>
													</div>
												);
											}
										}
										return null;
									})()}

									{/* Blocked Message */}
									{status === "blocked" && missingPrereqs.length > 0 && (
										<div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-md mb-3">
											<div className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
												Blocked
											</div>
											<div className="text-xs text-orange-700 dark:text-orange-300">
												Waiting for:{" "}
												{missingPrereqs
													.map((v) => v.replace(/_/g, " "))
													.join(", ")}
											</div>
										</div>
									)}

									{/* Rejection Feedback */}
									{status === "rejected" &&
										approvalState?.rejection_history &&
										approvalState.rejection_history.length > 0 && (
											<div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md mb-3">
												<div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
													Last Rejection
												</div>
												<div className="text-xs text-red-700 dark:text-red-300 italic">
													{
														approvalState.rejection_history[
															approvalState.rejection_history.length - 1
														].feedback
													}
												</div>
											</div>
										)}

									{/* Awaiting Approval Message (no card - that's in the chat) */}
									{status === "awaiting_approval" && approvalState && (
										<div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
											<div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
												Pending Your Approval
											</div>
											<div className="text-xs text-yellow-700 dark:text-yellow-300">
												Review and approve in the chat to continue
											</div>
										</div>
									)}

									{/* Approved Content Summary */}
									{status === "approved" && approvalState && (
										<div className="mt-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
											<div className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
												✓ Approved
											</div>
											<div className="space-y-2">
												{Object.entries(approvalState.value).map(
													([key, value]) => {
														// Skip internal fields
														if (key === "reasoning") return null;

														return (
															<div key={key} className="space-y-1">
																<div className="text-xs font-medium text-green-900 dark:text-green-100 capitalize">
																	{key.replace(/_/g, " ")}
																</div>
																<div className="text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900 p-2 rounded">
																	{typeof value === "string"
																		? value
																		: JSON.stringify(value, null, 2)}
																</div>
															</div>
														);
													},
												)}
											</div>
										</div>
									)}
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>
			</CardContent>
		</Card>
	);
}
