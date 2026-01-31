/**
 * Artifact Workbench Layout - Story 2.3 Task 7.5
 *
 * Self-contained split-pane layout for artifact-generating workflows:
 * - Left pane: Timeline (focused/browse modes) wrapping step content
 * - Right pane: ArtifactPreview (internally created from execution)
 * - Resizable divider with localStorage persistence
 *
 * This layout is used by workflows with metadata.layoutType = "artifact-workbench"
 * Examples: brainstorming, PRD generation, architecture design
 */

import { useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ArtifactPreview } from "../artifact-preview";
import { StepRenderer } from "../step-renderer";
import { Timeline } from "../timeline";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  goal: string;
  stepType: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  projectId: string;
  currentStep: number;
  status: string;
  variables: Record<string, unknown>;
  executedSteps: Record<
    string,
    {
      status: "completed" | "in-progress" | "failed" | "pending";
      startedAt?: string;
      completedAt?: string;
      output?: unknown;
    }
  >;
}

interface Workflow {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  outputArtifactType?: string;
}

export interface ArtifactWorkbenchLayoutProps {
  /** Workflow execution state */
  execution: WorkflowExecution;
  /** Workflow definition */
  workflow: Workflow;
  /** All workflow steps */
  steps: WorkflowStep[];
  /** Project ID (needed for StepRenderer) */
  projectId: string;
  /** Step content from StepRenderer (rendered in Timeline) - DEPRECATED, will render internally */
  stepContent?: React.ReactNode;
  /** Default timeline panel size (0-100) */
  defaultTimelineSize?: number;
  /** Initial timeline mode */
  defaultTimelineMode?: "focused" | "browse";
  /** Handler for execute workflow (invoke steps) */
  onExecuteWorkflow?: (workflowId: string) => void;
  /** Handler to navigate to a child execution (for viewing completed workflows) */
  onViewExecution?: (executionId: string) => void;
}

export function ArtifactWorkbenchLayout({
  execution,
  workflow,
  steps,
  projectId,
  stepContent: _deprecatedStepContent,
  defaultTimelineSize = 60,
  defaultTimelineMode = "focused",
  onExecuteWorkflow,
  onViewExecution,
}: ArtifactWorkbenchLayoutProps) {
  const [timelineMode, setTimelineMode] = useState<"focused" | "browse">(defaultTimelineMode);
  const [timelinePanelSize, setTimelinePanelSize] = useState(defaultTimelineSize);

  // Find current step number from currentStepId (DB state - actual execution progress)
  const currentStepNumber =
    steps.find((step) => step.id === execution.currentStepId)?.stepNumber || 1;

  // Focused step (UI state - which step user is viewing)
  const [focusedStep, setFocusedStep] = useState<number>(currentStepNumber);

  // Get the focused step data
  const focusedStepData = steps.find((s) => s.stepNumber === focusedStep);

  // Extract child executions if step is invoke
  const childExecutions =
    (execution.variables._child_metadata as Array<{
      workflowName: string;
      status: "idle" | "active" | "paused" | "completed" | "failed";
    }>) || [];

  // Map child execution statuses for Timeline display
  const mappedChildExecutions = childExecutions.map((child) => ({
    workflowName: child.workflowName,
    status:
      child.status === "active" || child.status === "paused"
        ? ("running" as const)
        : child.status === "completed"
          ? ("completed" as const)
          : child.status === "failed"
            ? ("failed" as const)
            : ("pending" as const),
  }));

  return (
    <div className="h-full w-full">
      <ResizablePanelGroup
        direction="horizontal"
        className="h-full rounded-lg border"
        onLayout={(sizes) => {
          setTimelinePanelSize(sizes[0] || defaultTimelineSize);
          localStorage.setItem("artifact-workbench-timeline-size", String(sizes[0]));
        }}
      >
        {/* Left Pane: Timeline */}
        <ResizablePanel defaultSize={timelinePanelSize} minSize={30} maxSize={70}>
          <Timeline
            mode={timelineMode}
            steps={steps}
            currentStep={currentStepNumber}
            focusedStep={focusedStep}
            executedSteps={execution.executedSteps}
            onModeChange={setTimelineMode}
            onStepChange={setFocusedStep}
            childExecutions={mappedChildExecutions}
          >
            {/* Step content rendered inside Timeline (focused mode) */}
            {focusedStepData && (
              <StepRenderer
                step={focusedStepData}
                execution={execution}
                projectId={projectId}
                onExecuteWorkflow={onExecuteWorkflow}
                onViewExecution={onViewExecution}
              />
            )}
          </Timeline>
        </ResizablePanel>

        {/* Resizable Divider */}
        <ResizableHandle withHandle />

        {/* Right Pane: Artifact Preview (self-contained) */}
        <ResizablePanel defaultSize={100 - timelinePanelSize} minSize={30}>
          <div className="flex h-full flex-col overflow-auto">
            <div className="sticky top-0 z-10 border-border border-b bg-background px-4 py-3">
              <h2 className="font-semibold text-lg">Artifact Preview</h2>
              <p className="text-muted-foreground text-sm">Live preview of your session results</p>
            </div>
            <div>
              <ArtifactPreview execution={execution} workflow={workflow} />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
