import { cn } from "@/lib/utils";
import type { WorkflowStepDefinition, WorkflowStepperBaseProps } from "../../types";

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
  const currentStepIndex = steps.findIndex((s) => s.number === currentStep);

  // Split steps: completed + current on left, upcoming on right
  const leftSteps = steps.slice(0, currentStepIndex + 1);
  const rightSteps = steps.slice(currentStepIndex + 1);

  const renderStep = (step: WorkflowStepDefinition, showTooltip = true) => {
    const isCompleted = step.number < currentStep;
    const isCurrent = step.number === currentStep;
    const isUpcoming = step.number > currentStep;
    const isClickable = onStepClick && step.number < currentStep;

    return (
      <div
        key={step.id}
        className="group relative"
        onClick={() => isClickable && onStepClick(step.number)}
        onKeyDown={(e) => {
          if (isClickable && (e.key === "Enter" || e.key === " ")) {
            onStepClick(step.number);
          }
        }}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        {/* Tooltip on hover for non-current steps */}
        {showTooltip && !isCurrent && (
          <div className="-top-10 -translate-x-1/2 pointer-events-none absolute left-1/2 z-10 transform whitespace-nowrap border border-border bg-popover px-2 py-1 text-popover-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100">
            {step.name}
          </div>
        )}

        {/* Step Element */}
        <div
          className={cn(
            "flex items-center justify-center border border-muted-foreground transition-all",
            isCurrent &&
              "h-8 w-8 border-primary bg-primary font-medium text-primary-foreground text-sm",
            isCompleted && "h-8 w-4 border-muted-foreground bg-[oklch(0.75_0.08_142)]",
            isUpcoming && "h-8 w-4 border-muted-foreground bg-muted",
            isClickable && "cursor-pointer hover:opacity-80",
          )}
        >
          {isCurrent && step.number}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Stepper: Left (completed + current + name) and Right (upcoming) */}
      <div className="flex items-center justify-between gap-4">
        {/* Left side: Completed + Current + Step Name */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">{leftSteps.map((step) => renderStep(step))}</div>
          {/* Current step name */}
          {currentStepData && (
            <span className="font-normal text-foreground text-sm">{currentStepData.name}</span>
          )}
        </div>

        {/* Right side: Upcoming steps */}
        <div className="flex items-center gap-2">{rightSteps.map((step) => renderStep(step))}</div>
      </div>
    </div>
  );
}
