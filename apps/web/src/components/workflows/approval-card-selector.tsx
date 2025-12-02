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
import { getValueByPath } from "@/lib/json-path";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";
import { OptionCard } from "./option-card";

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

import type { DisplayConfig } from "./option-card";

interface ApprovalCardSelectorProps {
	executionId: string;
	agentId: string;
	toolName: string;
	generatedValue: Record<string, unknown>; // AI's recommended choice
	availableOptions: Array<Record<string, unknown>>; // All available options from database
	displayConfig?: DisplayConfig; // How to render the options
	requireFeedbackOnOverride?: boolean; // Show feedback when user overrides AI
	reasoning?: string;
	isApproved?: boolean;
	isRejected?: boolean;
	createdAt?: string;
}

export function ApprovalCardSelector({
	executionId,
	agentId,
	toolName,
	generatedValue,
	availableOptions,
	displayConfig,
	requireFeedbackOnOverride = false,
	reasoning,
	isApproved = false,
	isRejected = false,
	createdAt,
}: ApprovalCardSelectorProps) {
	const [isReasoningExpanded, setIsReasoningExpanded] = useState(false);
	const [showFeedbackInput, setShowFeedbackInput] = useState(false);
	const [feedback, setFeedback] = useState("");
	const queryClient = useQueryClient();

	// Deduplicate available options by ID or value (defense against backend duplicates)
	const uniqueOptions = availableOptions.reduce(
		(acc: Record<string, unknown>[], option) => {
			// Try multiple unique identifier fields in order of preference
			const uniqueKey =
				(option as any).id || // Database records have id
				(displayConfig
					? getValueByPath(option, displayConfig.fields.value)
					: (option as any).value) || // Tags/options have value field
				JSON.stringify(option); // Fallback to full object serialization

			// Check if we already have an option with this key
			const exists = acc.some((o) => {
				const existingKey =
					(o as any).id ||
					(displayConfig
						? getValueByPath(o, displayConfig.fields.value)
						: (o as any).value) ||
					JSON.stringify(o);
				return existingKey === uniqueKey;
			});

			if (!exists) {
				acc.push(option);
			}

			return acc;
		},
		[],
	);

	// Detect if this is a multi-select field (value is an array)
	const isMultiSelect = Object.values(generatedValue).some((val) =>
		Array.isArray(val),
	);

	// Extract AI's recommended value(s) from generatedValue
	// Use displayConfig to know which field contains the value to match
	const aiRecommendedValue = (() => {
		if (displayConfig) {
			// Try to find a value in generatedValue that matches an available option
			// by extracting the value field from each option using displayConfig
			for (const value of Object.values(generatedValue)) {
				// Handle arrays (multi-select)
				if (Array.isArray(value)) {
					return value as string[];
				}

				const valueStr = value as string;
				if (
					uniqueOptions.some((opt) => {
						const optValue = getValueByPath(opt, displayConfig.fields.value);
						return optValue === valueStr;
					})
				) {
					return valueStr;
				}
			}
		} else {
			// Legacy: Try to match old Option interface (value, name, description)
			for (const value of Object.values(generatedValue)) {
				if (Array.isArray(value)) {
					return value as string[];
				}

				const valueStr = value as string;
				const optValue = (uniqueOptions[0] as any)?.value;
				if (optValue !== undefined) {
					if (uniqueOptions.some((opt: any) => opt.value === valueStr)) {
						return valueStr;
					}
				}
			}
		}
		// Fallback: use first value
		const firstVal = Object.values(generatedValue)[0];
		return Array.isArray(firstVal)
			? (firstVal as string[])
			: (firstVal as string);
	})();

	// Debug logging
	console.log("[ApprovalCardSelector] Props:", {
		toolName,
		generatedValue,
		aiRecommendedValue,
		displayConfig,
		availableOptions,
		availableOptionsCount: availableOptions?.length,
		uniqueOptionsCount: uniqueOptions?.length,
		availableOptionsIds: availableOptions?.map((opt: any) => opt.id),
		uniqueOptionsIds: uniqueOptions?.map((opt: any) => opt.id),
	});

	// User's selected value(s) (initialized to AI's recommendation)
	const [selectedValue, setSelectedValue] = useState<string | string[]>(
		aiRecommendedValue,
	);

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
			// CRITICAL: Invalidate execution to refresh variables (for blocked tool detection)
			queryClient.invalidateQueries({
				queryKey: [["workflows", "getExecution"], { input: { executionId } }],
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
		// Find the key in generatedValue that matches an available option value
		// This ensures we use the correct output field (e.g., complexity_classification, selected_techniques)
		// and not internal fields like "reasoning"
		const outputFieldKey = Object.keys(generatedValue).find((key) => {
			const fieldValue = generatedValue[key];

			// For arrays (multi-select), check if any value matches
			if (Array.isArray(fieldValue)) {
				return fieldValue.some((val) =>
					uniqueOptions.some((opt) => {
						const optValue = displayConfig
							? getValueByPath(opt, displayConfig.fields.value)
							: (opt as any).value;
						return optValue === val;
					}),
				);
			}

			// For single values
			return uniqueOptions.some((opt) => {
				const optValue = displayConfig
					? getValueByPath(opt, displayConfig.fields.value)
					: (opt as any).value;

				return optValue === (fieldValue as string);
			});
		});

		if (!outputFieldKey) {
			throw new Error(
				"Could not find output field in generatedValue matching available options",
			);
		}

		const approvedValue = {
			[outputFieldKey]: selectedValue,
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
	const selectedOption = uniqueOptions.find((opt) => {
		if (displayConfig) {
			return getValueByPath(opt, displayConfig.fields.value) === selectedValue;
		}
		return (opt as any).value === selectedValue;
	});

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
				{createdAt && (
					<div className="mt-1 text-muted-foreground text-xs">
						{new Date(createdAt).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				)}
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Card Selector - Show all options, disabled when read-only */}
				{displayConfig ? (
					// Use generic OptionCard component with displayConfig
					<div className="space-y-3">
						{uniqueOptions.map((option, index) => {
							const optionValue = getValueByPath<string>(
								option,
								displayConfig.fields.value,
							);

							// Handle multi-select vs single-select
							const isAiRecommendation = isMultiSelect
								? Array.isArray(aiRecommendedValue) &&
									aiRecommendedValue.includes(optionValue)
								: optionValue === aiRecommendedValue;

							const isSelected = isMultiSelect
								? Array.isArray(selectedValue) &&
									selectedValue.includes(optionValue)
								: optionValue === selectedValue;

							// Use option.id if available, otherwise fall back to index
							const uniqueKey = (option as any).id || `option-${index}`;

							return (
								<OptionCard
									key={uniqueKey}
									option={option}
									displayConfig={displayConfig}
									isSelected={isSelected}
									isRecommended={isAiRecommendation}
									onSelect={() => {
										if (isMultiSelect) {
											// Toggle selection in array
											setSelectedValue((prev) => {
												const arr = Array.isArray(prev) ? prev : [];
												if (arr.includes(optionValue)) {
													return arr.filter((v) => v !== optionValue);
												} else {
													return [...arr, optionValue];
												}
											});
										} else {
											// Single select
											setSelectedValue(optionValue || "");
										}
									}}
									disabled={isReadOnly}
									isMultiSelect={isMultiSelect}
								/>
							);
						})}
					</div>
				) : (
					// LEGACY: Fallback for old Option interface (no displayConfig)
					<div className="space-y-3">
						{!isReadOnly && (
							<div className="font-medium text-sm">
								Athena recommends:{" "}
								<span className="text-primary">
									{
										(
											uniqueOptions.find(
												(opt: any) => opt.value === aiRecommendedValue,
											) as any
										)?.name
									}
								</span>
							</div>
						)}

						<div className="space-y-2">
							{uniqueOptions.map((option: any) => (
								<div
									key={option.value}
									onClick={
										isReadOnly
											? undefined
											: () => setSelectedValue(option.value)
									}
									onKeyDown={
										isReadOnly
											? undefined
											: (e) => {
													if (e.key === "Enter" || e.key === " ") {
														setSelectedValue(option.value);
													}
												}
									}
									role="radio"
									aria-checked={option.value === selectedValue}
									aria-disabled={isReadOnly}
									tabIndex={isReadOnly ? -1 : 0}
									className={cn(
										"rounded-lg border-2 p-4 transition-all",
										// Interactive styles only when not read-only
										!isReadOnly && "cursor-pointer",
										// Selected state
										option.value === selectedValue &&
											"border-primary bg-primary/5",
										// Non-selected: different styles for read-only vs interactive
										option.value !== selectedValue &&
											isReadOnly &&
											"opacity-60",
										option.value !== selectedValue &&
											!isReadOnly &&
											"border-border hover:border-primary/50",
									)}
								>
									<div className="font-semibold text-base">
										{option.name}
										{option.value === aiRecommendedValue && !isReadOnly && (
											<span className="ml-2 text-primary text-xs">
												⭐ AI Recommendation
											</span>
										)}
									</div>
									<div className="text-muted-foreground text-sm">
										{option.description}
									</div>
								</div>
							))}
						</div>
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
