import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { trpcClient } from "@/utils/trpc";

/**
 * Artifact preview pane - renders template with variable highlighting
 * Fetches template and delegates to specific preview components
 */
interface ArtifactPreviewProps {
	execution: any;
	workflow: any;
}

export function ArtifactPreview({ execution, workflow }: ArtifactPreviewProps) {
	// Fetch template
	const { data: templateData, isLoading } = useQuery({
		queryKey: ["workflow-template", workflow?.outputTemplateId],
		queryFn: async () => {
			if (!workflow?.outputTemplateId) return null;
			return trpcClient.workflows.getTemplate.query({
				templateId: workflow.outputTemplateId,
			});
		},
		enabled: !!workflow?.outputTemplateId,
	});

	// Show loading state while fetching template
	if (isLoading && workflow?.outputTemplateId) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// No template configured
	if (!templateData) {
		return (
			<div className="space-y-4 p-6">
				<div>
					<h3 className="mb-2 font-semibold text-lg">Artifact Preview</h3>
					<p className="text-muted-foreground text-sm">
						Live preview of your session results
					</p>
				</div>
				<div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
					<p className="text-center text-muted-foreground">
						No template configured for this workflow
					</p>
				</div>
			</div>
		);
	}

	// Route to specific preview component based on artifact type
	switch (templateData.artifactType) {
		case "brainstorming":
			return (
				<BrainstormingPreview
					execution={execution}
					templateData={templateData}
				/>
			);
		// Future artifact types can be added here
		// case "prd":
		//   return <PRDPreview execution={execution} templateData={templateData} />;
		// case "architecture":
		//   return <ArchitecturePreview execution={execution} templateData={templateData} />;
		default:
			return (
				<div className="space-y-4 p-6">
					<div>
						<h3 className="mb-2 font-semibold text-lg">
							{templateData.displayName}
						</h3>
						<p className="text-muted-foreground text-sm">
							Live preview of your session as you progress
						</p>
					</div>
					<div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
						<p className="text-center text-muted-foreground">
							Preview not available for artifact type:{" "}
							{templateData.artifactType}
						</p>
					</div>
				</div>
			);
	}
}

/**
 * Brainstorming session preview component
 * Renders the brainstorming template with highlighted missing variables
 */
interface BrainstormingPreviewProps {
	execution: any;
	templateData: any;
}

function BrainstormingPreview({
	execution,
	templateData,
}: BrainstormingPreviewProps) {
	const variables = execution.variables || {};
	const approvalStates = variables.approval_states || {};

	// Extract variables from approval states (following the outputVariables mapping)
	// For update-variable tools, the value IS the variable itself (not nested)
	// For ax-generation tools, the value is an object with fields
	const topic =
		variables.session_topic || // Saved after approval
		(typeof approvalStates.update_topic?.value === "string"
			? approvalStates.update_topic.value
			: approvalStates.update_topic?.value?.session_topic) ||
		null;
	const goals =
		variables.stated_goals ||
		approvalStates.update_goals?.value?.stated_goals ||
		approvalStates.update_goals?.value ||
		null;
	const techniques =
		variables.selected_techniques ||
		approvalStates.select_techniques?.value?.selected_techniques ||
		approvalStates.select_techniques?.value ||
		null;

	// Get variable descriptions from template metadata
	const getVariableDescription = (varName: string): string => {
		const varMeta = templateData?.templateVariables?.find(
			(v: any) => v.name === varName,
		);
		return varMeta?.description || "";
	};

	return (
		<div className="space-y-6 p-6">
			<div>
				<h3 className="mb-2 font-semibold text-lg">
					{templateData.displayName}
				</h3>
				<p className="text-muted-foreground text-sm">
					Live preview of your session as you progress
				</p>
			</div>

			{/* Render template structure with React components */}
			<div className="space-y-6">
				{/* Topic Section */}
				<div>
					<h4 className="mb-2 font-semibold text-base">
						Brainstorming Session:{" "}
						{topic ? (
							<span className="rounded bg-green-100 px-2 py-0.5 text-green-900 dark:bg-green-900/20 dark:text-green-400">
								{topic}
							</span>
						) : (
							<span className="animate-pulse rounded bg-yellow-200/20 px-2 py-1 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-400">
								[Topic pending...]
							</span>
						)}
					</h4>
					{!topic && (
						<p className="text-muted-foreground text-xs italic">
							{getVariableDescription("session_topic")}
						</p>
					)}
				</div>

				{/* Goals Section */}
				<div>
					<h4 className="mb-3 font-semibold text-muted-foreground text-sm">
						Session Goals
					</h4>
					{goals && goals.length > 0 ? (
						<div className="space-y-2.5">
							{goals.map((goal: string, idx: number) => (
								<div
									key={idx}
									className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm dark:border-green-800/50 dark:bg-green-900/10"
								>
									<div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700 text-xs dark:bg-green-900/40 dark:text-green-400">
										{idx + 1}
									</div>
									<p className="flex-1 text-green-900 leading-relaxed dark:text-green-100">
										{goal}
									</p>
								</div>
							))}
						</div>
					) : (
						<div className="space-y-2">
							<div className="animate-pulse rounded-md border border-yellow-300 border-dashed bg-yellow-50/50 p-3 text-sm text-yellow-700 dark:border-yellow-700 dark:bg-yellow-500/5 dark:text-yellow-400">
								Goals will appear here once you discuss them with the agent
							</div>
							<p className="text-muted-foreground text-xs italic">
								{getVariableDescription("stated_goals")}
							</p>
						</div>
					)}
				</div>

				{/* Techniques Section */}
				<div>
					<h4 className="mb-2 font-semibold text-muted-foreground text-sm">
						Selected Techniques
					</h4>
					{techniques && techniques.length > 0 ? (
						<div className="space-y-2">
							{techniques.map((techniqueId: string, idx: number) => {
								// Try to find the technique details from technique_options
								const techniqueOptions = variables.technique_options || [];
								const technique = techniqueOptions.find(
									(t: any) => t.id === techniqueId,
								);

								return (
									<div
										key={idx}
										className="rounded-md border bg-card p-3 text-sm"
									>
										<div className="font-medium">
											{technique?.displayName || techniqueId}
										</div>
										{technique?.description && (
											<div className="mt-1 text-muted-foreground text-xs">
												{technique.description}
											</div>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<div className="space-y-2">
							<div className="animate-pulse rounded-md border border-yellow-300 border-dashed bg-yellow-50/50 p-3 text-sm text-yellow-700 dark:border-yellow-700 dark:bg-yellow-500/5 dark:text-yellow-400">
								Techniques will be recommended based on your goals
							</div>
							<p className="text-muted-foreground text-xs italic">
								{getVariableDescription("selected_techniques")}
							</p>
						</div>
					)}
				</div>

				{/* Captured Ideas Section - Story 2.3 Task 8 */}
				<CapturedIdeasSection variables={variables} />

				{/* Session Status Footer */}
				<div className="mt-6 rounded-md border-blue-500 border-l-4 bg-blue-50/50 p-3 dark:bg-blue-500/5">
					<p className="text-blue-900 text-xs dark:text-blue-300">
						💡 <strong>Tip:</strong> Chat with the agent to define your topic,
						goals, and select brainstorming techniques. This preview will update
						in real-time as you progress.
					</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Captured Ideas Section - Story 2.3 Task 8
 * Generic display of aggregated child workflow outputs
 * Works for ANY invoke-workflow step, not just techniques
 */
interface CapturedIdeasSectionProps {
	variables: Record<string, any>;
}

function CapturedIdeasSection({ variables }: CapturedIdeasSectionProps) {
	const capturedIdeas = variables.captured_ideas as
		| Record<string, any>
		| undefined;

	// If no captured ideas yet, show empty state
	if (!capturedIdeas || Object.keys(capturedIdeas).length === 0) {
		return (
			<div>
				<h4 className="mb-2 font-semibold text-muted-foreground text-sm">
					Captured Ideas
				</h4>
				<div className="space-y-2">
					<div className="animate-pulse rounded-md border border-yellow-300 border-dashed bg-yellow-50/50 p-3 text-sm text-yellow-700 dark:border-yellow-700 dark:bg-yellow-500/5 dark:text-yellow-400">
						Results will appear here as workflows complete
					</div>
					<p className="text-muted-foreground text-xs italic">
						Execute workflows in Step 2 to see aggregated outputs
					</p>
				</div>
			</div>
		);
	}

	// Display aggregated outputs grouped by child workflow
	return (
		<div>
			<h4 className="mb-3 font-semibold text-muted-foreground text-sm">
				Captured Ideas ({Object.keys(capturedIdeas).length} workflows completed)
			</h4>
			<div className="space-y-4">
				{Object.entries(capturedIdeas).map(
					([workflowId, data]: [string, any]) => {
						const output = data.output || [];
						const workflowName = data.workflowName || "Unknown Workflow";
						const completedAt = data.completedAt
							? new Date(data.completedAt).toLocaleTimeString("en-US", {
									hour: "2-digit",
									minute: "2-digit",
								})
							: null;

						// Handle different output types (array, object, string)
						const outputItems = Array.isArray(output) ? output : [output];

						return (
							<div
								key={workflowId}
								className="rounded-lg border border-blue-200 bg-blue-50/30 p-4 dark:border-blue-800/50 dark:bg-blue-900/10"
							>
								{/* Workflow Header with Badge */}
								<div className="mb-3 flex items-center justify-between">
									<div className="flex items-center gap-2">
										<span className="inline-block rounded-full bg-blue-600 px-3 py-1 font-semibold text-sm text-white">
											{workflowName}
										</span>
										<span className="text-muted-foreground text-xs">
											{outputItems.length}{" "}
											{outputItems.length === 1 ? "insight" : "ideas"}
										</span>
									</div>
									{completedAt && (
										<span className="text-muted-foreground text-xs">
											Completed {completedAt}
										</span>
									)}
								</div>

								{/* Output Display */}
								{outputItems.length > 0 ? (
									<div className="space-y-2">
										{outputItems.map((item: any, idx: number) => {
											// Handle different output formats
											// 1. String → display directly
											// 2. Q&A object (Five Whys) → show question and answer
											// 3. Other objects → try common fields or stringify
											if (typeof item === "string") {
												return (
													<div
														key={idx}
														className="flex items-start gap-3 rounded-md bg-white p-3 text-sm shadow-sm dark:bg-gray-900/50"
													>
														<div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-xs dark:bg-blue-900/40 dark:text-blue-400">
															{idx + 1}
														</div>
														<p className="flex-1 text-gray-900 leading-relaxed dark:text-gray-100">
															{item}
														</p>
													</div>
												);
											}

											// Q&A format (question + answer object)
											// Display as insight with question context and answer
											if (item.question && item.answer) {
												return (
													<div
														key={idx}
														className="rounded-md bg-white p-3 shadow-sm dark:bg-gray-900/50"
													>
														<div className="mb-2 flex items-start gap-3">
															<div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-xs dark:bg-blue-900/40 dark:text-blue-400">
																{idx + 1}
															</div>
															<p className="flex-1 text-muted-foreground text-sm italic">
																{item.question}
															</p>
														</div>
														<div className="ml-8 font-medium text-gray-900 leading-relaxed dark:text-gray-100">
															{item.answer}
														</div>
													</div>
												);
											}

											// Fallback for other object types
											const displayText =
												item.text ||
												item.idea ||
												item.value ||
												item.name ||
												JSON.stringify(item);

											return (
												<div
													key={idx}
													className="flex items-start gap-3 rounded-md bg-white p-3 text-sm shadow-sm dark:bg-gray-900/50"
												>
													<div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-xs dark:bg-blue-900/40 dark:text-blue-400">
														{idx + 1}
													</div>
													<p className="flex-1 text-gray-900 leading-relaxed dark:text-gray-100">
														{displayText}
													</p>
												</div>
											);
										})}
									</div>
								) : (
									<p className="text-muted-foreground text-sm italic">
										No output from this workflow
									</p>
								)}
							</div>
						);
					},
				)}
			</div>
		</div>
	);
}
