import { Check, ChevronDown, ChevronUp, Loader2, Sparkles } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/utils/trpc";

/**
 * SelectionWithCustomCard - Generic approval UI for selecting from AI suggestions or providing custom value
 *
 * Story 1.6: Presents AI-generated suggestions with option to provide custom value.
 * User can select a suggested option or provide their own (with optional validation).
 *
 * Features:
 * - Radio buttons for AI suggestions
 * - Each suggestion shows reasoning/description
 * - "Use custom value" option with input field
 * - Configurable validation function
 * - Approve button after selection
 *
 * Use cases: project names, file names, API endpoints, class names, etc.
 */

interface Suggestion {
	value: string;
	label?: string;
	reasoning?: string;
	recommended?: boolean;
}

interface ValidationConfig {
	minLength?: number;
	maxLength?: number;
	pattern?: RegExp;
	patternMessage?: string;
	customValidator?: (value: string) => string | null; // Returns error message or null
}

interface SelectionWithCustomCardProps {
	executionId: string;
	agentId: string;
	toolName: string;
	title: string;
	suggestions: Suggestion[];
	customInputLabel?: string;
	customInputPlaceholder?: string;
	valueField: string; // Field name to save (e.g., "project_name", "file_name")
	validation?: ValidationConfig;
	isApproved?: boolean;
}

export function SelectionWithCustomCard({
	executionId,
	agentId,
	toolName,
	title,
	suggestions,
	customInputLabel = "Use custom value instead",
	customInputPlaceholder = "my-custom-value",
	valueField,
	validation,
	isApproved = false,
}: SelectionWithCustomCardProps) {
	const [isSelectionExpanded, setIsSelectionExpanded] = useState(false);
	const [selectedOption, setSelectedOption] = useState<string>(
		suggestions.find((s) => s.recommended)?.value ||
			suggestions[0]?.value ||
			"",
	);
	const [customValue, setCustomValue] = useState("");
	const [customValueError, setCustomValueError] = useState("");

	// Approval mutation
	const approveMutation = trpc.workflows.approveToolCall.useMutation({
		onSuccess: () => {
			// Derive success message from title (remove emoji and "Suggestions" suffix)
			const cleanTitle = title.replace(/[^\w\s-]/g, "").trim();
			const successMsg = cleanTitle.endsWith("Suggestions")
				? `${cleanTitle.replace("Suggestions", "").trim()} selected!`
				: `${cleanTitle} confirmed!`;
			toast.success(successMsg);
		},
		onError: (error) => {
			toast.error(`Selection failed: ${error.message}`);
		},
	});

	// Validate custom value
	function validateCustomValue(value: string): boolean {
		if (value.length === 0) {
			setCustomValueError("");
			return false;
		}

		// Apply configured validation
		if (validation) {
			if (validation.minLength && value.length < validation.minLength) {
				setCustomValueError(
					`Must be at least ${validation.minLength} characters`,
				);
				return false;
			}

			if (validation.maxLength && value.length > validation.maxLength) {
				setCustomValueError(
					`Must be at most ${validation.maxLength} characters`,
				);
				return false;
			}

			if (validation.pattern && !validation.pattern.test(value)) {
				setCustomValueError(validation.patternMessage || "Invalid format");
				return false;
			}

			if (validation.customValidator) {
				const error = validation.customValidator(value);
				if (error) {
					setCustomValueError(error);
					return false;
				}
			}
		}

		setCustomValueError("");
		return true;
	}

	function handleCustomValueChange(value: string) {
		setCustomValue(value);
		validateCustomValue(value);

		// Auto-select custom option when user starts typing
		if (value.length > 0) {
			setSelectedOption("custom");
		}
	}

	async function handleApprove() {
		let finalValue: string;

		if (selectedOption === "custom") {
			if (!validateCustomValue(customValue)) {
				toast.error("Please fix the validation errors");
				return;
			}
			finalValue = customValue;
		} else {
			finalValue = selectedOption;
		}

		if (!finalValue) {
			toast.error("Please make a selection");
			return;
		}

		await approveMutation.mutateAsync({
			executionId,
			toolName,
			approvedValue: {
				[valueField]: finalValue,
			},
		});
	}

	const isLoading = approveMutation.isPending;
	const canSubmit =
		selectedOption === "custom"
			? !customValueError && customValue.length > 0
			: !!selectedOption;

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
							<Check className="mr-2 inline h-5 w-5 text-green-600" />
						)}
						{title}
					</span>
					{isApproved && (
						<span className="font-normal text-green-600 text-sm">
							Selected ✓
						</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Selection Accordion when approved */}
				{isApproved && (
					<div className={isSelectionExpanded ? "pb-3" : ""}>
						<button
							type="button"
							onClick={() => setIsSelectionExpanded(!isSelectionExpanded)}
							className="flex w-full items-center gap-2 font-medium text-sm transition-colors hover:text-foreground"
						>
							{isSelectionExpanded ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
							<span>Selected Value</span>
						</button>
					</div>
				)}

				{/* Selection - Hidden when approved and collapsed */}
				{(!isApproved || isSelectionExpanded) && (
					<RadioGroup
						value={selectedOption}
						onValueChange={(value) => {
							setSelectedOption(value);
							// Clear custom name error when switching away from custom
							if (value !== "custom") {
								setCustomValueError("");
							}
						}}
						disabled={isApproved || isLoading}
					>
						{/* AI Suggestions */}
						{suggestions.map((suggestion, _idx) => (
							<div
								key={suggestion.value}
								className={`cursor-pointer rounded-lg border p-4 transition-all${selectedOption === suggestion.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-border"}
								${suggestion.recommended ? "border-yellow-500 shadow-sm" : ""}
								${isApproved ? "opacity-60" : "hover:border-blue-300"}
							`}
								onClick={() => {
									if (!isApproved && !isLoading) {
										setSelectedOption(suggestion.value);
									}
								}}
							>
								<div className="flex items-start gap-3">
									<RadioGroupItem
										value={suggestion.value}
										id={suggestion.value}
										className="mt-1"
									/>
									<div className="min-w-0 flex-1">
										<Label
											htmlFor={suggestion.value}
											className="flex cursor-pointer items-center gap-2 font-semibold text-base"
										>
											<code className="font-mono">
												{suggestion.label || suggestion.value}
											</code>
											{suggestion.recommended && (
												<Sparkles className="h-4 w-4 text-yellow-500" />
											)}
										</Label>
										{suggestion.reasoning && (
											<p className="mt-1 text-muted-foreground text-sm">
												{suggestion.reasoning}
											</p>
										)}
									</div>
								</div>
							</div>
						))}

						{/* Separator */}
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<span className="w-full border-t" />
							</div>
							<div className="relative flex justify-center text-xs uppercase">
								<span className="bg-background px-2 text-muted-foreground">
									Or
								</span>
							</div>
						</div>

						{/* Custom Name Option */}
						<div
							className={`cursor-pointer rounded-lg border p-4 transition-all${selectedOption === "custom" ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-border"}
							${isApproved ? "opacity-60" : "hover:border-blue-300"}
						`}
							onClick={() => {
								if (!isApproved && !isLoading) {
									setSelectedOption("custom");
								}
							}}
						>
							<div className="flex items-start gap-3">
								<RadioGroupItem value="custom" id="custom" className="mt-1" />
								<div className="min-w-0 flex-1 space-y-3">
									<Label
										htmlFor="custom"
										className="cursor-pointer font-semibold text-base"
									>
										{customInputLabel}
									</Label>

									{/* Custom Input Field */}
									<div className="space-y-2">
										<Input
											value={customValue}
											onChange={(e) => handleCustomValueChange(e.target.value)}
											placeholder={customInputPlaceholder}
											disabled={isApproved || isLoading}
											className={`font-mono ${
												customValueError
													? "border-red-500 focus-visible:ring-red-500"
													: ""
											}`}
											onClick={(e) => {
												e.stopPropagation(); // Prevent radio selection on input click
											}}
										/>

										{/* Validation Message */}
										{customValueError && (
											<p className="text-red-600 text-sm">{customValueError}</p>
										)}

										{/* Live Preview */}
										{customValue && !customValueError && (
											<div className="rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950">
												<p className="flex items-center gap-2 text-green-700 text-sm dark:text-green-300">
													<Check className="h-4 w-4" />
													Valid: <code>{customValue}</code>
												</p>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					</RadioGroup>
				)}
			</CardContent>

			{/* Actions */}
			{!isApproved && (
				<CardFooter>
					<Button
						onClick={handleApprove}
						disabled={isLoading || !canSubmit}
						className="w-full"
					>
						{isLoading ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								Saving...
							</>
						) : (
							<>
								<Check className="mr-2 h-4 w-4" />
								Accept Selected Name
							</>
						)}
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
