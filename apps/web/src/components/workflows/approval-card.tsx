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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/utils/trpc";

/**
 * ApprovalCard - Inline approval UI for AI-generated content
 *
 * Story 1.6: Human-in-the-loop approval gates for Athena's tool outputs.
 * Users can approve or reject with feedback, triggering ACE learning.
 *
 * Features:
 * - Shows generated content with reasoning
 * - Collapsible reasoning section
 * - Approve/Reject actions
 * - Feedback input for rejections
 * - Loading states during API calls
 * - Read-only state after approval
 */

interface ApprovalCardProps {
	executionId: string;
	agentId: string;
	toolName: string;
	generatedValue: Record<string, unknown>;
	reasoning?: string;
	isApproved?: boolean;
	isRejected?: boolean;
}

export function ApprovalCard({
	executionId,
	agentId,
	toolName,
	generatedValue,
	reasoning,
	isApproved = false,
	isRejected = false,
}: ApprovalCardProps) {
	const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
	const [showFeedbackInput, setShowFeedbackInput] = useState(false);
	const [feedback, setFeedback] = useState("");
	const queryClient = useQueryClient();

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
		await approveMutation.mutateAsync({
			executionId,
			toolName,
			approvedValue: generatedValue,
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
				{/* Generated Content */}
				<div className="space-y-2">
					{Object.entries(generatedValue).map(([key, value]) => {
						// Skip internal fields
						if (key === "reasoning") return null;

						return (
							<div key={key} className="space-y-1">
								<div className="font-medium text-muted-foreground text-sm capitalize">
									{key.replace(/_/g, " ")}
								</div>
								<div className="rounded-md border bg-background p-3">
									{typeof value === "string"
										? value
										: JSON.stringify(value, null, 2)}
								</div>
							</div>
						);
					})}
				</div>

				{/* Reasoning (Collapsible) */}
				{reasoning && (
					<div className="border-t pt-3">
						<button
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
							placeholder="Example: The summary is too technical, please focus more on user benefits..."
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
