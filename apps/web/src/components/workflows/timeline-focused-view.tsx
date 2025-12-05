/**
 * Timeline Focused View - Story 2.3 Task 7.1
 *
 * Displays ONLY the active step at 100% height with:
 * - Toggle arrows (top/bottom) to switch to browse mode
 * - Active step content occupies full vertical space
 * - All other steps completely hidden (zen focus)
 * - Child workflow indicators if step has child executions
 */

import { ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineFocusedViewProps {
	/** Current active step (DB state - execution progress) */
	currentStep: number;
	/** Focused step (UI state - which step is displayed) */
	focusedStep: number;
	/** Step goal for context */
	stepGoal?: string;
	/** Toggle to browse mode handler */
	onToggleBrowse: () => void;
	/** Step content (passed from layout) */
	children: React.ReactNode;
}

export function TimelineFocusedView({
	currentStep,
	focusedStep,
	stepGoal,
	onToggleBrowse,
	children,
}: TimelineFocusedViewProps) {
	const isViewingCurrentStep = focusedStep === currentStep;

	return (
		<div className="flex h-full flex-col">
			{/* Top Arrow: Toggle to Browse */}
			<div className="border-border border-b p-2">
				<button
					onClick={onToggleBrowse}
					className="flex w-full items-center justify-center gap-2 rounded-md p-2 text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					type="button"
					aria-label="Browse all steps"
				>
					<ChevronUp className="h-4 w-4" />
					<span className="text-xs">Browse All Steps</span>
				</button>
			</div>

			{/* Active Step Header */}
			<div className="border-border border-b bg-background px-4 py-3">
				<div className="flex items-center gap-2">
					<Badge
						variant="outline"
						className="border-primary/20 bg-primary/10 text-primary"
					>
						Step {focusedStep}
					</Badge>
					{!isViewingCurrentStep && (
						<Badge variant="secondary" className="text-xs">
							Viewing Past Step
						</Badge>
					)}
					{stepGoal && (
						<h3 className="font-semibold text-foreground text-sm">
							{stepGoal}
						</h3>
					)}
				</div>
			</div>

			{/* Step Content: Takes 100% of remaining space */}
			<div className="flex flex-1 items-center justify-center overflow-auto p-4">
				{children}
			</div>
		</div>
	);
}
