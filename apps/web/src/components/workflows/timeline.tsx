/**
 * Timeline - Story 2.3 Task 7.1
 *
 * Main timeline component for artifact-workbench layout
 * Manages focused/browse mode switching and wraps step content
 *
 * - Focused mode (default): Active step at 100% height, others hidden
 * - Browse mode: Accordion of all steps with timestamps for navigation
 * - Used ONLY in artifact-workbench layout (not wizard or dialog)
 */

import { TimelineBrowseView } from "./timeline-browse-view";
import { TimelineFocusedView } from "./timeline-focused-view";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  goal: string;
  stepType: string;
}

interface ExecutedStepInfo {
  status: "completed" | "in-progress" | "failed" | "pending";
  startedAt?: string;
  completedAt?: string;
}

export interface TimelineProps {
  /** Current viewing mode */
  mode: "focused" | "browse";
  /** All workflow steps */
  steps: WorkflowStep[];
  /** Current active step number (DB state - actual execution progress) */
  currentStep: number;
  /** Focused step number (UI state - which step user is viewing) */
  focusedStep?: number;
  /** Executed steps metadata from workflow_executions.executedSteps JSONB */
  executedSteps: Record<string, ExecutedStepInfo>;
  /** Mode change handler */
  onModeChange: (mode: "focused" | "browse") => void;
  /** Step focus handler (changes which step is displayed, not execution state) */
  onStepChange?: (stepNumber: number) => void;
  /** Child workflow states (for invoke steps) */
  childExecutions?: Array<{
    workflowName: string;
    status: "pending" | "running" | "completed" | "failed";
  }>;
  /** Step content from layout (rendered in focused mode) */
  children: React.ReactNode;
}

export function Timeline({
  mode,
  steps,
  currentStep,
  focusedStep,
  executedSteps,
  onModeChange,
  onStepChange,
  childExecutions,
  children,
}: TimelineProps) {
  // Use focusedStep if provided, otherwise default to currentStep
  const displayStep = focusedStep ?? currentStep;
  const displayStepData = steps.find((s) => s.stepNumber === displayStep);

  // Debug: Log if step data not found
  if (!displayStepData) {
    console.warn("[Timeline] Display step not found:", {
      displayStep,
      currentStep,
      focusedStep,
      stepsCount: steps.length,
      steps: steps.map((s) => ({ stepNumber: s.stepNumber, goal: s.goal })),
    });
  }

  const handleStepClick = (stepNumber: number) => {
    // Change focused step (UI state) and switch to focused mode
    if (onStepChange) {
      onStepChange(stepNumber);
    }
    onModeChange("focused");
  };

  if (mode === "browse") {
    return (
      <TimelineBrowseView
        steps={steps}
        executedSteps={executedSteps}
        currentStep={currentStep}
        focusedStep={displayStep}
        onStepClick={handleStepClick}
        onReturnToFocused={() => onModeChange("focused")}
      />
    );
  }

  // Focused mode
  return (
    <TimelineFocusedView
      currentStep={currentStep}
      focusedStep={displayStep}
      stepGoal={displayStepData?.goal}
      onToggleBrowse={() => onModeChange("browse")}
    >
      {children}
    </TimelineFocusedView>
  );
}
