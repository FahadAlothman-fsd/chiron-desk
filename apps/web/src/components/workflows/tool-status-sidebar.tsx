import {
	AlertCircle,
	CheckCircle2,
	Circle,
	Clock,
	FileText,
	Loader2,
	User,
	XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/utils/trpc";

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
	usageGuidance?: string; // Added for instructions view
	optionsSource?: {
		table: string;
		distinctField?: string;
		filterBy?: Record<string, unknown>;
		orderBy?: string;
		outputVariable: string;
	};
}

interface ApprovalState {
	status: "pending" | "approved" | "rejected";
	value: Record<string, unknown>;
	reasoning?: string;
	rejection_history?: Array<{ feedback: string; timestamp: string }>;
	rejection_count?: number;
	createdAt?: string;
}

interface ToolStatusSidebarProps {
	tools: ToolConfig[];
	approvalStates?: Record<string, ApprovalState>;
	executionVariables?: Record<string, unknown>;
	executionId: string;
	agentId: string;
	className?: string;
	stepGoal?: string; // Goal of the current step
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
	stepGoal,
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

	// Auto-expand tools with pending approvals
	const defaultOpenItems = tools
		.filter((t) => getToolStatus(t) === "awaiting_approval")
		.map((t) => t.name);

	// Fetch agent details (for persona)
	const { data: agentData } = trpc.agents.getById.useQuery(
		{ id: agentId },
		{ enabled: !!agentId, refetchInterval: false },
	);
	const agent = agentData?.agent;

	// Calculate a hash or simple indicator of approval state to trigger refetches
	// When approval count changes, we know the execution state has advanced
	const approvalHash = `${approvedCount}-${Object.keys(approvalStates).length}`;

	// Fetch resolved instructions (for system prompt)
	// Pass approvalHash as a dependency key to force React Query to refetch when it changes
	// This ensures the backend re-calculates the active tools list
	const { data: instructionsData } =
		trpc.agents.getResolvedInstructions.useQuery(
			{ agentId, executionId },
			{
				enabled: !!agentId && !!executionId,
				refetchInterval: false,
			},
		);

	const resolvedInstructions = instructionsData?.instructions;

	// Use useEffect to manually invalidate query when approval state changes
	// This is necessary because React Query might not treat approvalHash as a query key dependency
	// if we don't include it in the input, so we force invalidation.
	const utils = trpc.useContext();

	useEffect(() => {
		if (agentId && executionId) {
			utils.agents.getResolvedInstructions.invalidate({ agentId, executionId });
		}
	}, [approvalHash, agentId, executionId, utils]);

	return (
		<Card className={`${className} flex flex-col overflow-hidden`}>
			<Tabs defaultValue="progress" className="flex h-full flex-col">
				<CardHeader className="flex-shrink-0 pb-3">
					<div className="flex items-center justify-between">
						<CardTitle className="text-base">Agent Status</CardTitle>
						<TabsList className="h-7 w-auto">
							<TabsTrigger
								value="progress"
								className="h-5 px-2 text-xs data-[state=active]:bg-background"
							>
								Progress
							</TabsTrigger>
							<TabsTrigger
								value="instructions"
								className="h-5 px-2 text-xs data-[state=active]:bg-background"
							>
								Instructions
							</TabsTrigger>
						</TabsList>
					</div>

					{/* Progress Bar (Only visible in progress tab via CSS logic or always visible as summary) */}
					{/* Let's keep it always visible as a nice summary header */}
					<div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
						<span>Completion</span>
						<span>
							{approvedCount}/{totalTools} Tools
						</span>
					</div>
					<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full bg-green-500 transition-all duration-500"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</CardHeader>

				<CardContent className="flex-1 overflow-hidden p-0">
					<TabsContent
						value="progress"
						className="h-full overflow-y-auto overflow-x-hidden m-0 border-0"
					>
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
											<div className="flex w-full items-center gap-3">
												{/* Status Icon */}
												<div className="flex-shrink-0">
													{getStatusIcon(status)}
												</div>

												{/* Tool Info */}
												<div className="min-w-0 flex-1 text-left">
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
												</div>
											</div>
										</AccordionTrigger>
										<AccordionContent className="px-4 pb-4">
											{/* Tool Description */}
											<p className="mb-3 text-muted-foreground text-sm">
												{tool.description}
											</p>

											{/* Available Options */}
											{(() => {
												if (!tool.optionsSource) return null;
												const optionsVarName =
													tool.optionsSource.outputVariable;
												const options = executionVariables[optionsVarName];

												if (
													Array.isArray(options) &&
													options.length > 0 &&
													status !== "approved"
												) {
													return (
														<div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
															<div className="mb-2 font-medium text-blue-900 text-sm dark:text-blue-100">
																Available Options
															</div>
															<div className="space-y-1">
																{options.map((option: any, idx: number) => (
																	<div
																		key={idx}
																		className="break-words rounded bg-blue-100 px-2 py-1 text-blue-700 text-xs dark:bg-blue-900 dark:text-blue-300"
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
												return null;
											})()}

											{/* Blocked Message */}
											{status === "blocked" && missingPrereqs.length > 0 && (
												<div className="mb-3 rounded-md border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-950">
													<div className="mb-1 font-medium text-orange-900 text-sm dark:text-orange-100">
														Blocked
													</div>
													<div className="text-orange-700 text-xs dark:text-orange-300">
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
													<div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
														<div className="mb-1 font-medium text-red-900 text-sm dark:text-red-100">
															Last Rejection
														</div>
														<div className="text-red-700 text-xs italic dark:text-red-300">
															{
																approvalState.rejection_history[
																	approvalState.rejection_history.length - 1
																].feedback
															}
														</div>
													</div>
												)}

											{/* Awaiting Approval Message */}
											{status === "awaiting_approval" && approvalState && (
												<div className="mt-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-950">
													<div className="mb-1 font-medium text-sm text-yellow-900 dark:text-yellow-100">
														Pending Your Approval
													</div>
													<div className="text-xs text-yellow-700 dark:text-yellow-300">
														Review and approve in the chat to continue
													</div>
												</div>
											)}

											{/* Approved Content Summary */}
											{status === "approved" && approvalState && (
												<div className="mt-2 rounded-md border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
													<div className="mb-2 font-medium text-green-900 text-sm dark:text-green-100">
														✓ Approved
													</div>
													<div className="space-y-2">
														{Object.entries(approvalState.value).map(
															([key, value]) => {
																if (key === "reasoning") return null;
																return (
																	<div key={key} className="space-y-1">
																		<div className="font-medium text-green-900 text-xs capitalize dark:text-green-100">
																			{key.replace(/_/g, " ")}
																		</div>
																		<div className="rounded bg-green-100 p-2 text-green-700 text-xs dark:bg-green-900 dark:text-green-300">
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
					</TabsContent>

					<TabsContent
						value="instructions"
						className="h-full overflow-y-auto p-4 m-0 border-0"
					>
						<div className="space-y-6">
							{/* Agent Persona */}
							{agent && (
								<div className="space-y-2">
									<h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
										<User className="h-3 w-3" />
										Agent Persona
									</h3>
									<div className="rounded-md bg-primary/5 p-3 text-sm border border-primary/10">
										<div className="font-medium mb-1">{agent.role}</div>
										<div className="text-muted-foreground text-xs">
											{agent.description}
										</div>
									</div>
								</div>
							)}

							{/* Core Instructions (Collapsible) */}
							{resolvedInstructions && (
								<div className="space-y-2">
									<h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
										<FileText className="h-3 w-3" />
										Core Instructions
									</h3>
									<Accordion type="single" collapsible className="w-full">
										<AccordionItem value="instructions" className="border-none">
											<AccordionTrigger className="py-2 px-3 rounded-md bg-muted/30 hover:bg-muted/50 text-xs font-medium hover:no-underline">
												View System Prompt
											</AccordionTrigger>
											<AccordionContent className="px-0 pb-0 pt-2">
												<div className="rounded-md bg-muted p-3 overflow-x-auto">
													<pre className="text-[10px] leading-relaxed whitespace-pre-wrap font-mono text-muted-foreground">
														{resolvedInstructions}
													</pre>
												</div>
											</AccordionContent>
										</AccordionItem>
									</Accordion>
								</div>
							)}

							{/* Active Guidelines Section */}
							<div className="space-y-2">
								<h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
									Active Guidelines
								</h3>
								<div className="space-y-3">
									{tools.map((tool) => {
										const status = getToolStatus(tool);
										const isRelevant =
											status === "not_started" ||
											status === "executing" ||
											status === "awaiting_approval" ||
											status === "rejected";

										if (!isRelevant) return null;

										return (
											<div
												key={tool.name}
												className={`rounded-md border p-3 text-sm transition-colors ${
													status === "executing"
														? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
														: status === "rejected"
															? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
															: "bg-card"
												}`}
											>
												<div className="mb-1 flex items-center justify-between font-medium">
													<span>
														{tool.name
															.replace(/_/g, " ")
															.replace(/\b\w/g, (l) => l.toUpperCase())}
													</span>
													{status === "executing" && (
														<Badge className="bg-blue-500 text-[10px] hover:bg-blue-600">
															Active
														</Badge>
													)}
													{status === "rejected" && (
														<Badge
															variant="destructive"
															className="text-[10px]"
														>
															Retrying
														</Badge>
													)}
												</div>
												<p className="text-muted-foreground text-xs leading-relaxed">
													{tool.usageGuidance || tool.description}
												</p>
											</div>
										);
									})}
									{/* Fallback if all tools are approved */}
									{tools.every((t) => getToolStatus(t) === "approved") && (
										<div className="flex items-center gap-2 text-green-600 text-sm">
											<CheckCircle2 className="h-4 w-4" />
											<span>All guidelines satisfied. Step complete.</span>
										</div>
									)}
								</div>
							</div>
						</div>
					</TabsContent>
				</CardContent>
			</Tabs>
		</Card>
	);
}
