import { useState } from "react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Check, Loader2, Star, AlertTriangle } from "lucide-react";
import { trpc } from "@/utils/trpc";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * WorkflowPathSelectorCard - Custom approval UI for workflow path selection
 *
 * Story 1.6: Presents workflow paths as selectable cards with AI recommendations.
 * User can select recommended path or choose alternative.
 *
 * Features:
 * - Recommended path highlighted with star ⭐
 * - Alternative paths with warning if not ideal ⚠
 * - Shows "why recommended" reasoning
 * - Shows "what you'll get" deliverables
 * - Radio button selection
 * - Approve button after selection
 */

interface WorkflowPath {
	id: string;
	name: string;
	displayName: string;
	description: string;
	tags: {
		complexity?: string;
		fieldType?: string;
	};
	deliverables?: string[];
}

interface SelectionReasoning {
	recommendedPathId: string;
	reasons: string[];
	warnings?: Record<string, string[]>; // pathId -> warning messages
}

interface WorkflowPathSelectorCardProps {
	executionId: string;
	agentId: string;
	toolName: string;
	availablePaths: WorkflowPath[];
	reasoning?: SelectionReasoning;
	isApproved?: boolean;
}

export function WorkflowPathSelectorCard({
	executionId,
	agentId,
	toolName,
	availablePaths,
	reasoning,
	isApproved = false,
}: WorkflowPathSelectorCardProps) {
	const [selectedPathId, setSelectedPathId] = useState<string>(
		reasoning?.recommendedPathId || availablePaths[0]?.id || "",
	);

	// Approval mutation
	const approveMutation = trpc.workflows.approveToolCall.useMutation({
		onSuccess: () => {
			toast.success("Workflow path selected! Continuing...");
		},
		onError: (error) => {
			toast.error(`Selection failed: ${error.message}`);
		},
	});

	async function handleApprove() {
		const selectedPath = availablePaths.find((p) => p.id === selectedPathId);
		if (!selectedPath) {
			toast.error("Please select a workflow path");
			return;
		}

		await approveMutation.mutateAsync({
			executionId,
			toolName,
			approvedValue: {
				selected_workflow_path_id: selectedPathId,
				selected_workflow_path_name: selectedPath.name,
			},
		});
	}

	const isLoading = approveMutation.isPending;
	const recommendedPathId =
		reasoning?.recommendedPathId || availablePaths[0]?.id;

	// Get complexity icon
	function getComplexityIcon(complexity?: string) {
		switch (complexity) {
			case "quick-flow":
				return "🚀";
			case "method":
				return "⚖️";
			case "enterprise":
				return "🏢";
			default:
				return "📋";
		}
	}

	return (
		<Card
			className={`
			${isApproved ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
		`}
		>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-lg">
					<span>
						{isApproved && (
							<Check className="inline h-5 w-5 text-green-600 mr-2" />
						)}
						Select Workflow Path
					</span>
					{isApproved && (
						<span className="text-sm text-green-600 font-normal">
							Selected ✓
						</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				<RadioGroup
					value={selectedPathId}
					onValueChange={setSelectedPathId}
					disabled={isApproved || isLoading}
				>
					{availablePaths.map((path) => {
						const isRecommended = path.id === recommendedPathId;
						const warnings = reasoning?.warnings?.[path.id] || [];
						const hasWarnings = warnings.length > 0;

						return (
							<div
								key={path.id}
								className={`
									border rounded-lg p-4 cursor-pointer transition-all
									${selectedPathId === path.id ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-border"}
									${isRecommended ? "border-yellow-500 shadow-md" : ""}
									${isApproved ? "opacity-60" : "hover:border-blue-300"}
								`}
								onClick={() => {
									if (!isApproved && !isLoading) {
										setSelectedPathId(path.id);
									}
								}}
							>
								<div className="flex items-start gap-3">
									{/* Radio Button */}
									<RadioGroupItem
										value={path.id}
										id={path.id}
										className="mt-1"
									/>

									{/* Path Content */}
									<div className="flex-1 min-w-0">
										{/* Path Header */}
										<div className="flex items-center gap-2 mb-2">
											<Label
												htmlFor={path.id}
												className="text-base font-semibold cursor-pointer flex items-center gap-2"
											>
												<span>
													{getComplexityIcon(path.tags?.complexity)}{" "}
													{path.displayName}
												</span>
												{isRecommended && (
													<Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
												)}
											</Label>
										</div>

										{/* Path Description */}
										<p className="text-sm text-muted-foreground mb-3">
											{path.description}
										</p>

										{/* Recommended Reasons */}
										{isRecommended && reasoning?.reasons && (
											<div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
												<div className="text-sm font-medium mb-2">
													Best for your project because:
												</div>
												<ul className="text-sm space-y-1">
													{reasoning.reasons.map((reason, idx) => (
														<li key={idx} className="flex items-start gap-2">
															<Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
															<span>{reason}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										{/* Warnings for Non-Recommended */}
										{!isRecommended && hasWarnings && (
											<div className="mb-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-md border border-orange-200 dark:border-orange-800">
												<div className="text-sm font-medium mb-2 flex items-center gap-2">
													<AlertTriangle className="h-4 w-4 text-orange-600" />
													May not be ideal because:
												</div>
												<ul className="text-sm space-y-1">
													{warnings.map((warning, idx) => (
														<li key={idx} className="flex items-start gap-2">
															<span className="text-orange-600">⚠</span>
															<span>{warning}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										{/* Deliverables */}
										{path.deliverables && path.deliverables.length > 0 && (
											<div className="mt-3 p-3 bg-muted/50 rounded-md">
												<div className="text-sm font-medium mb-2">
													What you'll get:
												</div>
												<ul className="text-sm space-y-1">
													{path.deliverables.map((deliverable, idx) => (
														<li key={idx} className="flex items-start gap-2">
															<span className="text-blue-600">•</span>
															<span>{deliverable}</span>
														</li>
													))}
												</ul>
											</div>
										)}

										{/* Tags */}
										<div className="flex gap-2 mt-3">
											{path.tags?.complexity && (
												<Badge variant="secondary">
													{path.tags.complexity.replace("-", " ")}
												</Badge>
											)}
											{path.tags?.fieldType && (
												<Badge variant="secondary">{path.tags.fieldType}</Badge>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</RadioGroup>
			</CardContent>

			{/* Actions */}
			{!isApproved && (
				<CardFooter>
					<Button
						onClick={handleApprove}
						disabled={isLoading || !selectedPathId}
						className="w-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Selecting...
							</>
						) : (
							<>
								<Check className="h-4 w-4 mr-2" />
								Continue with Selected Path
							</>
						)}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
