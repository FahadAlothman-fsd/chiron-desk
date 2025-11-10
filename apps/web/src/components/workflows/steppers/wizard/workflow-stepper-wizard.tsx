import { cn } from "@/lib/utils";
import type { WorkflowStepperBaseProps } from "../../types";

/**
 * WorkflowStepperWizard - Horizontal progress bar for quick linear workflows
 *
 * Visual layout:
 * - Completed steps: Thin green vertical bars (w-4 h-8)
 * - Current step: Numbered box (w-8 h-8) with step name displayed
 * - Upcoming steps: Thin grey vertical bars
 *
 * Responsive: Stack vertically on mobile, horizontal on desktop
 */

export interface WorkflowStepperWizardProps extends WorkflowStepperBaseProps {
	className?: string;
}

export function WorkflowStepperWizard({
	currentStep,
	totalSteps,
	steps,
	onStepClick,
	className,
}: WorkflowStepperWizardProps) {
	const currentStepData = steps.find((s) => s.number === currentStep);

	return (
		<div className={cn("w-full space-y-4", className)}>
			{/* Progress text */}
			<div className="text-muted-foreground text-sm">
				Step {currentStep} of {totalSteps}
				{currentStepData && (
					<span className="ml-2 font-medium text-foreground">
						{currentStepData.name}
					</span>
				)}
			</div>

			{/* Progress bar */}
			<div className="flex items-center gap-2 overflow-x-auto pb-2">
				{steps.map((step) => {
					const isCompleted = step.number < currentStep;
					const isCurrent = step.number === currentStep;
					const isUpcoming = step.number > currentStep;
					const isClickable = onStepClick && step.number < currentStep;

					return (
						<div
							key={step.id}
							className={cn(
								"relative flex items-center justify-center transition-all",
								isCurrent && "h-10 w-10",
								!isCurrent && "h-8 w-1",
								isClickable && "cursor-pointer hover:opacity-80",
							)}
							onClick={() => isClickable && onStepClick(step.number)}
							onKeyDown={(e) => {
								if (isClickable && (e.key === "Enter" || e.key === " ")) {
									onStepClick(step.number);
								}
							}}
							role={isClickable ? "button" : undefined}
							tabIndex={isClickable ? 0 : undefined}
							title={!isCurrent ? step.name : undefined}
						>
							{/* Completed step: green bar */}
							{isCompleted && (
								<div className="h-full w-full rounded-sm bg-green-500" />
							)}

							{/* Current step: numbered box with border accent */}
							{isCurrent && (
								<div className="relative flex h-full w-full items-center justify-center rounded-md border-2 border-green-500 bg-background">
									<span className="font-semibold text-green-500 text-lg">
										{step.number}
									</span>
								</div>
							)}

							{/* Upcoming step: grey bar */}
							{isUpcoming && (
								<div className="h-full w-full rounded-sm bg-muted" />
							)}
						</div>
					);
				})}
			</div>

			{/* Current step goal (optional) */}
			{currentStepData?.goal && (
				<div className="text-muted-foreground text-sm italic">
					{currentStepData.goal}
				</div>
			)}
		</div>
	);
}
