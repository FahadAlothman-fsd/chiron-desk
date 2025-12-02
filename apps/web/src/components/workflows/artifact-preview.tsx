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
					<h4 className="mb-3 font-semibold text-sm text-muted-foreground">
						Session Goals
					</h4>
					{goals && goals.length > 0 ? (
						<div className="space-y-2.5">
							{goals.map((goal: string, idx: number) => (
								<div
									key={idx}
									className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/50 p-3 text-sm dark:border-green-800/50 dark:bg-green-900/10"
								>
									<div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 text-xs font-semibold dark:bg-green-900/40 dark:text-green-400">
										{idx + 1}
									</div>
									<p className="flex-1 leading-relaxed text-green-900 dark:text-green-100">
										{goal}
									</p>
								</div>
							))}
						</div>
					) : (
						<div className="space-y-2">
							<div className="animate-pulse rounded-md border border-dashed border-yellow-300 bg-yellow-50/50 p-3 text-yellow-700 text-sm dark:border-yellow-700 dark:bg-yellow-500/5 dark:text-yellow-400">
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
					<h4 className="mb-2 font-semibold text-sm text-muted-foreground">
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
							<div className="animate-pulse rounded-md border border-dashed border-yellow-300 bg-yellow-50/50 p-3 text-yellow-700 text-sm dark:border-yellow-700 dark:bg-yellow-500/5 dark:text-yellow-400">
								Techniques will be recommended based on your goals
							</div>
							<p className="text-muted-foreground text-xs italic">
								{getVariableDescription("selected_techniques")}
							</p>
						</div>
					)}
				</div>

				{/* Session Status Footer */}
				<div className="mt-6 rounded-md border-l-4 border-blue-500 bg-blue-50/50 p-3 dark:bg-blue-500/5">
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
