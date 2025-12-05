/**
 * Timeline Browse View - Story 2.3 Task 7.3
 *
 * Displays all workflow steps in a clean list format with:
 * - Step numbers and goals
 * - Execution timestamps (startedAt, completedAt)
 * - Duration calculation
 * - Status indicators (using theme-aware CSS variables)
 * - Clicking a step returns to focused mode (for now, shows current active step)
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkflowStep {
	id: string;
	stepNumber: number;
	goal: string;
	stepType: string;
}

interface ExecutedStepInfo {
	status: "completed" | "in-progress" | "failed" | "pending";
	startedAt?: string; // ISO 8601 timestamp
	completedAt?: string; // ISO 8601 timestamp
}

interface TimelineBrowseViewProps {
	steps: WorkflowStep[];
	executedSteps: Record<string, ExecutedStepInfo>;
	/** Current active step (DB state - execution progress) */
	currentStep: number;
	/** Focused step (UI state - which step user is viewing) */
	focusedStep: number;
	onStepClick: (stepNumber: number) => void;
	onReturnToFocused: () => void;
}

export function TimelineBrowseView({
	steps,
	executedSteps,
	currentStep,
	focusedStep,
	onStepClick,
	onReturnToFocused,
}: TimelineBrowseViewProps) {
	const formatTimestamp = (timestamp?: string) => {
		if (!timestamp) return null;
		const date = new Date(timestamp);
		return date.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: true,
		});
	};

	const calculateDuration = (start?: string, end?: string) => {
		if (!start) return null;
		const startTime = new Date(start).getTime();
		const endTime = end ? new Date(end).getTime() : Date.now();
		const durationMs = endTime - startTime;

		const minutes = Math.floor(durationMs / 60000);
		const seconds = Math.floor((durationMs % 60000) / 1000);

		if (minutes > 0) {
			return `${minutes} min ${seconds > 0 ? `${seconds} sec` : ""}`;
		}
		return `${seconds} sec`;
	};

	const getStatusColor = (status: ExecutedStepInfo["status"]) => {
		switch (status) {
			case "completed":
				return "bg-accent text-accent-foreground border-border";
			case "in-progress":
				return "bg-primary/10 text-primary border-primary/20";
			case "failed":
				return "bg-destructive/10 text-destructive border-destructive/20";
			case "pending":
				return "bg-muted text-muted-foreground border-border";
		}
	};

	const getStatusLabel = (status: ExecutedStepInfo["status"]) => {
		switch (status) {
			case "completed":
				return "✅ Completed";
			case "in-progress":
				return "🔄 In Progress";
			case "failed":
				return "❌ Failed";
			case "pending":
				return "⚪ Not Started";
		}
	};

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-border border-b bg-background p-4">
				<h3 className="font-semibold text-sm">Workflow Timeline</h3>
				<p className="text-muted-foreground text-xs">
					Browse all steps and their progress
				</p>
			</div>

			{/* Steps List */}
			<div className="flex-1 overflow-auto">
				<ol className="divide-y divide-border">
					{steps.map((step) => {
						const execution = executedSteps[String(step.stepNumber)] || {
							status: "pending" as const,
						};
						const isFocused = step.stepNumber === focusedStep;
						const isCurrent = step.stepNumber === currentStep;
						const duration = calculateDuration(
							execution.startedAt,
							execution.completedAt,
						);

						return (
							<li
								key={step.id}
								className={cn(
									"cursor-pointer transition-colors hover:bg-accent/50",
									isFocused && "bg-accent",
									isCurrent && "border-l-2 border-l-primary",
								)}
								onClick={() => onStepClick(step.stepNumber)}
							>
								<div className="space-y-2 p-4">
									{/* Step Header */}
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0 flex-1">
											<div className="mb-1 flex items-center gap-2">
												<span className="font-medium text-sm">
													Step {step.stepNumber}
												</span>
												<Badge
													variant="outline"
													className={cn(
														"text-xs",
														getStatusColor(execution.status),
													)}
												>
													{getStatusLabel(execution.status)}
												</Badge>
											</div>
											<p className="text-muted-foreground text-xs leading-relaxed">
												{step.goal}
											</p>
										</div>
									</div>

									{/* Execution Metadata (if started) */}
									{execution.startedAt && (
										<div className="flex items-center gap-4 pt-1 text-muted-foreground text-xs">
											{execution.startedAt && (
												<span>
													Started: {formatTimestamp(execution.startedAt)}
												</span>
											)}
											{execution.completedAt && (
												<span>
													Completed: {formatTimestamp(execution.completedAt)}
												</span>
											)}
											{duration && <span>Duration: {duration}</span>}
										</div>
									)}
								</div>
							</li>
						);
					})}
				</ol>
			</div>

			{/* Footer: Return to Focused Mode Button */}
			<div className="border-border border-t p-4">
				<Button
					onClick={onReturnToFocused}
					className="w-full"
					variant="default"
				>
					⬆️ Focus Active Step
				</Button>
			</div>
		</div>
	);
}
