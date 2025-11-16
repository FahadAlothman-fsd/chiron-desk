import { Check, Loader2, Sparkles } from "lucide-react";
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
 * ProjectNameSelectorCard - Custom approval UI for project name selection
 *
 * Story 1.6: Presents AI-generated project name suggestions with custom option.
 * User can select a suggested name or provide their own (with validation).
 *
 * Features:
 * - Radio buttons for suggested names
 * - Each suggestion shows reasoning/description
 * - "Use custom name" option with input field
 * - Real-time validation (kebab-case, 3-50 chars)
 * - Approve button after selection
 */

interface NameSuggestion {
	name: string;
	reasoning: string;
	recommended?: boolean;
}

interface ProjectNameSelectorCardProps {
	executionId: string;
	agentId: string;
	toolName: string;
	suggestions: NameSuggestion[];
	isApproved?: boolean;
}

export function ProjectNameSelectorCard({
	executionId,
	agentId,
	toolName,
	suggestions,
	isApproved = false,
}: ProjectNameSelectorCardProps) {
	const [selectedOption, setSelectedOption] = useState<string>(
		suggestions.find((s) => s.recommended)?.name || suggestions[0]?.name || "",
	);
	const [customName, setCustomName] = useState("");
	const [customNameError, setCustomNameError] = useState("");

	// Approval mutation
	const approveMutation = trpc.workflows.approveToolCall.useMutation({
		onSuccess: () => {
			toast.success("Project name selected!");
		},
		onError: (error) => {
			toast.error(`Selection failed: ${error.message}`);
		},
	});

	// Validate custom name
	function validateCustomName(name: string): boolean {
		if (name.length === 0) {
			setCustomNameError("");
			return false;
		}

		if (name.length < 3) {
			setCustomNameError("Name must be at least 3 characters");
			return false;
		}

		if (name.length > 50) {
			setCustomNameError("Name must be at most 50 characters");
			return false;
		}

		if (!/^[a-z0-9-]+$/.test(name)) {
			setCustomNameError(
				"Name must be kebab-case (lowercase, numbers, hyphens only)",
			);
			return false;
		}

		if (name.startsWith("-") || name.endsWith("-")) {
			setCustomNameError("Name cannot start or end with a hyphen");
			return false;
		}

		if (name.includes("--")) {
			setCustomNameError("Name cannot contain consecutive hyphens");
			return false;
		}

		setCustomNameError("");
		return true;
	}

	function handleCustomNameChange(value: string) {
		setCustomName(value);
		validateCustomName(value);

		// Auto-select custom option when user starts typing
		if (value.length > 0) {
			setSelectedOption("custom");
		}
	}

	async function handleApprove() {
		let finalName: string;

		if (selectedOption === "custom") {
			if (!validateCustomName(customName)) {
				toast.error("Please fix the custom name validation errors");
				return;
			}
			finalName = customName;
		} else {
			finalName = selectedOption;
		}

		if (!finalName) {
			toast.error("Please select a project name");
			return;
		}

		await approveMutation.mutateAsync({
			executionId,
			toolName,
			approvedValue: {
				project_name: finalName,
			},
		});
	}

	const isLoading = approveMutation.isPending;
	const canSubmit =
		selectedOption === "custom"
			? !customNameError && customName.length > 0
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
						📝 Project Name Suggestions
					</span>
					{isApproved && (
						<span className="font-normal text-green-600 text-sm">
							Selected ✓
						</span>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				<RadioGroup
					value={selectedOption}
					onValueChange={(value) => {
						setSelectedOption(value);
						// Clear custom name error when switching away from custom
						if (value !== "custom") {
							setCustomNameError("");
						}
					}}
					disabled={isApproved || isLoading}
				>
					{/* AI Suggestions */}
					{suggestions.map((suggestion, idx) => (
						<div
							key={suggestion.name}
							className={`cursor-pointer rounded-lg border p-4 transition-all${selectedOption === suggestion.name ? "border-blue-500 bg-blue-50 dark:bg-blue-950" : "border-border"}
								${suggestion.recommended ? "border-yellow-500 shadow-sm" : ""}
								${isApproved ? "opacity-60" : "hover:border-blue-300"}
							`}
							onClick={() => {
								if (!isApproved && !isLoading) {
									setSelectedOption(suggestion.name);
								}
							}}
						>
							<div className="flex items-start gap-3">
								<RadioGroupItem
									value={suggestion.name}
									id={suggestion.name}
									className="mt-1"
								/>
								<div className="min-w-0 flex-1">
									<Label
										htmlFor={suggestion.name}
										className="flex cursor-pointer items-center gap-2 font-semibold text-base"
									>
										<code className="font-mono">{suggestion.name}</code>
										{suggestion.recommended && (
											<Sparkles className="h-4 w-4 text-yellow-500" />
										)}
									</Label>
									<p className="mt-1 text-muted-foreground text-sm">
										{suggestion.reasoning}
									</p>
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
									Use custom name instead
								</Label>

								{/* Custom Input Field */}
								<div className="space-y-2">
									<Input
										value={customName}
										onChange={(e) => handleCustomNameChange(e.target.value)}
										placeholder="my-custom-project-name"
										disabled={isApproved || isLoading}
										className={`font-mono ${
											customNameError
												? "border-red-500 focus-visible:ring-red-500"
												: ""
										}`}
										onClick={(e) => {
											e.stopPropagation(); // Prevent radio selection on input click
										}}
									/>

									{/* Validation Message */}
									{customNameError ? (
										<p className="text-red-600 text-sm">{customNameError}</p>
									) : (
										<p className="text-muted-foreground text-xs">
											Must be kebab-case, 3-50 characters (lowercase, numbers,
											hyphens only)
										</p>
									)}

									{/* Live Preview */}
									{customName && !customNameError && (
										<div className="rounded-md border border-green-200 bg-green-50 p-2 dark:border-green-800 dark:bg-green-950">
											<p className="flex items-center gap-2 text-green-700 text-sm dark:text-green-300">
												<Check className="h-4 w-4" />
												Valid project name: <code>{customName}</code>
											</p>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>
				</RadioGroup>
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
