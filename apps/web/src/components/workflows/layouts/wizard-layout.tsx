/**
 * Wizard Layout - Story 2.3 Task 7 (Bonus)
 *
 * Linear workflow layout with horizontal stepper:
 * - Stepper at top showing all steps
 * - Step content rendered directly (no split pane)
 * - No Timeline wrapper (simpler than artifact-workbench)
 *
 * Used by workflows with metadata.layoutType = "wizard"
 * Examples: workflow-init, project setup flows
 */

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  goal: string; // Human-readable step purpose (DB field, displayed as "name")
  name?: string; // Optional alias
}

interface WorkflowExecution {
  id: string;
  currentStep: number;
  status: string;
  executedSteps: Record<
    string,
    {
      status: "completed" | "in-progress" | "failed" | "pending";
    }
  >;
}

export interface WizardLayoutProps {
  /** Workflow execution state */
  execution: WorkflowExecution;
  /** All workflow steps */
  steps: WorkflowStep[];
  /** Step content from StepRenderer */
  stepContent: React.ReactNode;
}

export function WizardLayout({ execution, steps, stepContent }: WizardLayoutProps) {
  const _currentStepData = steps.find((s) => s.stepNumber === execution.currentStep);

  return (
    <div className="flex h-full flex-col">
      {/* Horizontal Stepper */}
      <div className="border-border border-b bg-background px-8 py-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const isActive = step.stepNumber === execution.currentStep;
              const isCompleted = step.stepNumber < execution.currentStep;
              const _stepStatus =
                execution.executedSteps[String(step.stepNumber)]?.status || "pending";

              return (
                <div key={step.id} className="flex flex-1 items-center">
                  {/* Step Circle */}
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 font-medium text-sm transition-colors",
                        isActive && "border-primary bg-primary text-primary-foreground",
                        isCompleted &&
                          "border-accent-foreground bg-accent-foreground text-background",
                        !isActive &&
                          !isCompleted &&
                          "border-muted-foreground bg-background text-muted-foreground",
                      )}
                    >
                      {isCompleted ? <Check className="h-5 w-5" /> : step.stepNumber}
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p
                        className={cn(
                          "truncate font-medium text-sm",
                          isActive && "text-primary",
                          isCompleted && "text-accent-foreground",
                          !isActive && !isCompleted && "text-muted-foreground",
                        )}
                      >
                        {step.name || step.goal}
                      </p>
                    </div>
                  </div>

                  {/* Connector Line */}
                  {idx < steps.length - 1 && (
                    <div
                      className={cn(
                        "mx-4 h-0.5 flex-1 transition-colors",
                        isCompleted ? "bg-accent-foreground" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content - centered and adaptive width */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-8">{stepContent}</div>
    </div>
  );
}
