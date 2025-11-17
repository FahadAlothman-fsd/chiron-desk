import { useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

/**
 * ApprovalCardSelector - Card-based selector UI for AI-generated choices
 *
 * Story 1.6: Human-in-the-loop approval gates with visual card selection.
 * Used when a tool has optionsSource configured (e.g., complexity, workflow paths).
 *
 * Features:
 * - Visual card selector for available options
 * - AI's recommendation is pre-selected
 * - User can override AI's choice before approving
 * - Shows reasoning for AI's recommendation
 * - Collapsible reasoning section
 * - Approve/Reject actions
 * - Feedback input for rejections
 */

interface Option {
	value: string;
	name: string;
	description: string;
}

interface ApprovalCardSelectorProps {
	executionId: string;
	agentId: string;
	toolName: string;
	generatedValue: Record<string, unknown>; // AI's recommended choice
	availableOptions: Option[]; // All available options from database
	reasoning?: string;
	isApproved?: boolean;
	isRejected?: boolean;
}

export function ApprovalCardSelector({
	executionId,
	agentId,
	toolName,
	generatedValue,
	availableOptions,
	reasoning,
	isApproved = false,
	isRejected = false,
}: ApprovalCardSelectorProps) {
	const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
	const [showFeedbackInput, setShowFeedbackInput] = useState(false);
	const [feedback, setFeedback] = useState("");
	const queryClient = useQueryClient();

	// Extract AI's recommended value from generatedValue
	// The generatedValue object may contain multiple fields (e.g., classification + reasoning)
	// We need to find the field that matches one of the available option values
	// For update_complexity: { complexity_classification: "method", reasoning: "..." }
	// For select_workflow_path: { selected_path_id: "abc123", ... }
	const aiRecommendedValue = (() => {
		// Try to find a value in generatedValue that matches an available option
		for (const value of Object.values(generatedValue)) {
			const valueStr = value as string;
			if (availableOptions.some((opt) => opt.value === valueStr)) {
				return valueStr;
			}
		}
		// Fallback: use first value (old behavior)
		return Object.values(generatedValue)[0] as string;
	})();

	// Debug logging
	console.log("[ApprovalCardSelector] Props:", {
		toolName,
		generatedValue,
		aiRecommendedValue,
		availableOptions: availableOptions.map((o) => o.value),
	});

	// User's selected value (initialized to AI's recommendation)
	const [selectedValue, setSelectedValue] =
		useState<string>(aiRecommendedValue);

	// Debug: Log when selectedValue changes
	console.log("[ApprovalCardSelector] selectedValue:", selectedValue);

	// Approval mutation
	const approveMutation = trpc.workflows.approveToolCall.useMutation({
		onSuccess: () => {
			toast.success("Approved! Athena will continue...");
			// Invalidate chat messages to show approval confirmation
			queryClient.invalidateQueries({
				queryKey: [
					["workflows", "getChatMessages"],
					{ input: { executionId } },
				],
			});
		},
		onError: (error) => {
			toast.error(`Approval failed: ${error.message}`);
		},
	});

	// Rejection mutation
	const rejectMutation = trpc.workflows.rejectToolCall.useMutation({
		onSuccess: () => {
			toast.success("Feedback received! Athena will regenerate...");
			setFeedback("");
			setShowFeedbackInput(false);
		},
		onError: (error) => {
			toast.error(`Rejection failed: ${error.message}`);
		},
	});

	async function handleApprove() {
		// Submit the user's selected value (which might differ from AI's recommendation)
		const approvedValue = {
			[Object.keys(generatedValue)[0]]: selectedValue,
		};

		await approveMutation.mutateAsync({
			executionId,
			toolName,
			approvedValue,
		});
	}

	async function handleReject() {
		if (!feedback.trim()) {
			toast.error(
				"Please provide feedback explaining why you're rejecting this.",
			);
			return;
		}

		await rejectMutation.mutateAsync({
			executionId,
			toolName,
			feedback,
			agentId,
		});
	}

	const isLoading = approveMutation.isPending || rejectMutation.isPending;
	const isReadOnly = isApproved || isRejected;
	const displayToolName = toolName
		.replace(/_/g, " ")
		.replace(/\b\w/g, (l) => l.toUpperCase());

	// Find the selected option details
	const selectedOption = availableOptions.find(
		(opt) => opt.value === selectedValue,
	);

	return (
		<Card
			className={`
			${isApproved ? "border-green-500 bg-green-50 dark:bg-green-950" : ""}
			${isRejected ? "border-red-500 bg-red-50 dark:bg-red-950" : ""}
		`}
		>
			<CardHeader>
				<CardTitle className="flex items-center justify-between text-lg">
					<span>
						{isApproved && (
							<Check className="mr-2 inline h-5 w-5 text-green-600" />
						)}
						{isRejected && <X className="mr-2 inline h-5 w-5 text-red-600" />}
						{displayToolName}
					</span>
					{isApproved && (
						<span className="font-normal text-green-600 text-sm">
							Approved ✓
						</span>
					)}
					{isRejected && (
						<span className="font-normal text-red-600 text-sm">Rejected</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Card Selector */}
				{isReadOnly ? (
					// Read-only: Show selected option as static card
					<div className="space-y-2">
						<div className="font-medium text-muted-foreground text-sm">
							Selected Option
						</div>
						<div className="rounded-lg border-2 border-green-500 bg-background p-4">
							<div className="mb-1 font-semibold text-base">
								{selectedOption?.name}
							</div>
							<div className="text-muted-foreground text-sm">
								{selectedOption?.description}
							</div>
						</div>
					</div>
				) : (
					// Interactive: Show radio group with cards
					<div className="space-y-3">
						<div className="font-medium text-sm">
							Athena recommends:{" "}
							<span className="text-primary">
								{
									availableOptions.find(
										(opt) => opt.value === aiRecommendedValue,
									)?.name
								}
							</span>
						</div>

						<RadioGroup value={selectedValue} onValueChange={setSelectedValue}>
							{availableOptions.map((option) => {
								const isAiRecommendation = option.value === aiRecommendedValue;
								const isSelected = option.value === selectedValue;

								return (
									<div key={option.value} className="relative">
										<RadioGroupItem
											value={option.value}
											id={`option-${option.value}`}
											className="peer sr-only"
										/>
										<Label
											htmlFor={`option-${option.value}`}
											className={`flex cursor-pointer flex-col rounded-lg border-2 p-4 transition-all${
												isSelected
													? "border-primary bg-primary/5"
													: "border-border hover:border-primary/50"
											}
											`}
										>
											<div className="flex items-start justify-between gap-2">
												<div className="flex-1">
													<div className="mb-1 font-semibold text-base">
														{option.name}
														{isAiRecommendation && (
															<span className="ml-2 font-normal text-primary text-xs">
																⭐ AI Recommendation
															</span>
														)}
													</div>
													<div className="text-muted-foreground text-sm">
														{option.description}
													</div>
												</div>
												{isSelected && (
													<Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
												)}
											</div>
										</Label>
									</div>
								);
							})}
						</RadioGroup>
					</div>
				)}

				{/* Reasoning (Collapsible) */}
				{reasoning && (
					<div className="border-t pt-3">
						<button
							type="button"
							onClick={() => setIsReasoningExpanded(!isReasoningExpanded)}
							className="flex w-full items-center gap-2 font-medium text-muted-foreground text-sm transition-colors hover:text-foreground"
						>
							{isReasoningExpanded ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
							<span>Reasoning</span>
						</button>

						{isReasoningExpanded && (
							<div className="mt-2 rounded-md bg-muted/50 p-3 text-muted-foreground text-sm">
								{reasoning}
							</div>
						)}
					</div>
				)}

				{/* Feedback Input (shown when rejecting) */}
				{showFeedbackInput && !isReadOnly && (
					<div className="space-y-2 border-t pt-3">
						<label className="font-medium text-sm">
							Why are you rejecting this? (This helps Athena improve)
						</label>
						<Textarea
							value={feedback}
							onChange={(e) => setFeedback(e.target.value)}
							placeholder="Example: This complexity level doesn't match the project scope..."
							className="min-h-[80px]"
							disabled={isLoading}
						/>
					</div>
				)}
			</CardContent>

			{/* Actions */}
			{!isReadOnly && (
				<CardFooter className="flex gap-2">
					{!showFeedbackInput ? (
						<>
							<Button
								onClick={handleApprove}
								disabled={isLoading}
								className="flex-1"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Approving...
									</>
								) : (
									<>
										<Check className="mr-2 h-4 w-4" />
										Accept
									</>
								)}
							</Button>
							<Button
								onClick={() => setShowFeedbackInput(true)}
								variant="destructive"
								disabled={isLoading}
								className="flex-1"
							>
								<X className="mr-2 h-4 w-4" />
								Reject & Explain
							</Button>
						</>
					) : (
						<>
							<Button
								onClick={handleReject}
								disabled={isLoading || !feedback.trim()}
								variant="destructive"
								className="flex-1"
							>
								{isLoading ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Submitting...
									</>
								) : (
									"Submit Feedback"
								)}
							</Button>
							<Button
								onClick={() => {
									setShowFeedbackInput(false);
									setFeedback("");
								}}
								variant="outline"
								disabled={isLoading}
							>
								Cancel
							</Button>
						</>
					)}
				</CardFooter>
			)}
		</Card>
	);
}
