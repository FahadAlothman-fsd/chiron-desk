/**
 * WorkflowExecutionCard - Reusable component for displaying workflow execution status
 *
 * Used in:
 * - Invoke-workflow step (technique list)
 * - Executions page
 * - Dashboard phase progress
 *
 * Features:
 * - Status indicators (pending, running, paused, completed, failed)
 * - Step progress dots (● completed, ◐ current, ○ pending)
 * - Tool progress bar with count
 * - Collapsed/expanded views
 * - Inline expansion with step details
 */

import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Circle,
  CircleCheck,
  CircleDot,
  Loader2,
  Play,
  RotateCcw,
  X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { trpcClient } from "@/utils/trpc";

// ============================================================================
// Types
// ============================================================================

export type ExecutionStatus = "pending" | "running" | "paused" | "completed" | "failed";

export interface WorkflowInfo {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  /** Total step count (for showing empty dots when no execution) */
  stepCount?: number;
}

export interface StepProgress {
  current: number;
  total: number;
  completed: number;
}

export interface ToolProgress {
  approved: number;
  total: number;
}

export interface ExecutionInfo {
  id: string;
  status: "idle" | "active" | "paused" | "completed" | "failed";
  error?: string | null;
  startedAt?: string;
  completedAt?: string;
  stepProgress?: StepProgress | null;
  toolProgress?: ToolProgress | null;
}

export interface WorkflowExecutionCardProps {
  /** Workflow information */
  workflow: WorkflowInfo;

  /** Execution state (null/undefined = not started) */
  execution?: ExecutionInfo | null;

  /** Display variant */
  variant?: "compact" | "card";

  /** Start expanded */
  defaultExpanded?: boolean;

  /** Action handlers */
  onExecute?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onView?: () => void;

  /** Click handler for navigation */
  onClick?: () => void;

  /** Show timestamps in expanded view */
  showTimestamps?: boolean;

  /** Additional class names */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map execution status to display status
 */
function getDisplayStatus(execution?: ExecutionInfo | null): ExecutionStatus {
  if (!execution) return "pending";

  switch (execution.status) {
    case "active":
      return "running";
    case "paused":
      return "paused";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}

/**
 * Status configuration for visual styling
 */
const STATUS_CONFIG = {
  pending: {
    icon: Circle,
    color: "text-muted-foreground",
    bgColor: "bg-muted/30",
    borderColor: "border-border",
    label: "Not started",
    animate: false,
  },
  running: {
    icon: CircleDot,
    color: "text-primary",
    bgColor: "bg-primary/5",
    borderColor: "border-primary/30",
    label: "Running",
    animate: true,
  },
  paused: {
    icon: CircleDot,
    color: "text-amber-500",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/30",
    label: "Paused",
    animate: false,
  },
  completed: {
    icon: CircleCheck,
    color: "text-green-500",
    bgColor: "bg-green-500/5",
    borderColor: "border-green-500/30",
    label: "Completed",
    animate: false,
  },
  failed: {
    icon: X,
    color: "text-destructive",
    bgColor: "bg-destructive/5",
    borderColor: "border-destructive/30",
    label: "Failed",
    animate: false,
  },
} as const;

/**
 * Format timestamp for display
 */
function formatTimestamp(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Status icon with animation support
 */
function StatusIcon({ status, className }: { status: ExecutionStatus; className?: string }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <Icon className={cn("h-5 w-5", config.color, config.animate && "animate-pulse", className)} />
  );
}

/**
 * Step progress dots visualization
 * Shows: ● completed, ◐ current (animated), ○ pending
 */
function StepDots({
  stepProgress,
  stepCount,
  status,
}: {
  stepProgress?: StepProgress | null;
  stepCount?: number;
  status: ExecutionStatus;
}) {
  // Determine total steps to show
  const total = stepProgress?.total ?? stepCount;

  // If no step info available, don't show dots
  if (!total || total === 0) return null;

  const completed = stepProgress?.completed ?? 0;

  // Determine current step (the one being worked on)
  // For pending (no execution), no current step
  const currentStep = status === "pending" ? 0 : status === "completed" ? total : completed + 1;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum <= completed;
        const isCurrent = stepNum === currentStep && status !== "completed" && status !== "pending";

        return (
          <div
            key={stepNum}
            className={cn(
              "h-2 w-2 rounded-full transition-colors",
              isCompleted && "bg-green-500",
              isCurrent && status === "running" && "animate-pulse bg-primary",
              isCurrent && status === "paused" && "bg-amber-500",
              isCurrent && status === "failed" && "bg-destructive",
              !isCompleted && !isCurrent && "bg-muted-foreground/30",
            )}
            title={`Step ${stepNum}`}
          />
        );
      })}
    </div>
  );
}

/**
 * Tool progress bar
 */
function ToolProgressBar({ toolProgress }: { toolProgress?: ToolProgress | null }) {
  if (!toolProgress || toolProgress.total === 0) return null;

  const { approved, total } = toolProgress;
  const percent = Math.round((approved / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-muted-foreground text-xs">
        {approved}/{total} tools
      </span>
    </div>
  );
}

/**
 * Progress summary text
 */
function ProgressSummary({
  stepProgress,
  toolProgress,
  status,
}: {
  stepProgress?: StepProgress | null;
  toolProgress?: ToolProgress | null;
  status: ExecutionStatus;
}) {
  if (status === "pending") return null;

  const parts: string[] = [];

  if (stepProgress && stepProgress.total > 0) {
    if (status === "completed") {
      parts.push("Completed");
    } else {
      parts.push(`Step ${stepProgress.current}/${stepProgress.total}`);
    }
  }

  if (toolProgress && toolProgress.total > 0 && status !== "completed") {
    parts.push(`${toolProgress.approved}/${toolProgress.total} tools`);
  }

  if (parts.length === 0) {
    return <span className="text-muted-foreground text-xs">{STATUS_CONFIG[status].label}</span>;
  }

  return <span className="text-muted-foreground text-xs">{parts.join(" • ")}</span>;
}

/**
 * Action button based on status
 */
function ActionButton({
  status,
  onExecute,
  onResume,
  onRetry,
  onView,
  isExpanded,
  onToggleExpand,
  canExpand,
}: {
  status: ExecutionStatus;
  onExecute?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
  onView?: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  canExpand: boolean;
}) {
  // Helper to stop propagation for button clicks
  const handleClick = (handler?: () => void) => (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handler?.();
  };

  switch (status) {
    case "pending":
      return onExecute ? (
        <Button onClick={handleClick(onExecute)} size="sm" variant="default">
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Execute
        </Button>
      ) : null;

    case "running":
    case "paused":
      return (
        <div className="flex items-center gap-2">
          {canExpand && (
            <Button
              onClick={handleClick(onToggleExpand)}
              size="sm"
              variant="ghost"
              className="gap-1"
            >
              Details
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {onResume && (
            <Button onClick={handleClick(onResume)} size="sm" variant="outline">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Resume
            </Button>
          )}
        </div>
      );

    case "completed":
      return (
        <div className="flex items-center gap-2">
          {canExpand && (
            <Button
              onClick={handleClick(onToggleExpand)}
              size="sm"
              variant="ghost"
              className="gap-1"
            >
              Details
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {onView && (
            <Button onClick={handleClick(onView)} size="sm" variant="outline">
              <Play className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          )}
        </div>
      );

    case "failed":
      return (
        <div className="flex items-center gap-2">
          {canExpand && (
            <Button
              onClick={handleClick(onToggleExpand)}
              size="sm"
              variant="ghost"
              className="gap-1"
            >
              Details
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {onRetry && (
            <Button onClick={handleClick(onRetry)} size="sm" variant="destructive">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ============================================================================
// Expanded View Components
// ============================================================================

interface StepDetail {
  stepNumber: number;
  stepId: string;
  name: string;
  status: "completed" | "waiting" | "failed" | "pending";
  tools: Array<{
    name: string;
    status: "approved" | "rejected" | "pending";
  }>;
}

/**
 * Expanded details view showing steps and tools
 */
function ExpandedDetails({
  executionId,
  startedAt,
  completedAt,
  error,
  showTimestamps,
}: {
  executionId: string;
  startedAt?: string;
  completedAt?: string;
  error?: string | null;
  showTimestamps?: boolean;
}) {
  // Fetch detailed execution data when expanded
  const { data: detailsData, isLoading } = useQuery({
    queryKey: ["execution", "details", executionId],
    queryFn: async () => {
      return trpcClient.workflows.getExecutionDetails.query({ executionId });
    },
    enabled: !!executionId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const steps = detailsData?.steps ?? [];

  return (
    <div className="space-y-3 border-border border-t pt-3">
      {/* Timestamps */}
      {showTimestamps && (startedAt || completedAt) && (
        <div className="text-muted-foreground text-xs">
          {startedAt && <span>Started: {formatTimestamp(startedAt)}</span>}
          {startedAt && completedAt && <span className="mx-2">•</span>}
          {completedAt && <span>Ended: {formatTimestamp(completedAt)}</span>}
        </div>
      )}

      {/* Error message for failed */}
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-destructive text-sm">{error}</div>
      )}

      {/* Steps list */}
      {steps.length > 0 && (
        <div className="space-y-2">
          <div className="font-medium text-sm">Steps</div>
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <StepDetailRow
                key={step.stepNumber}
                step={step}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual step row in expanded view
 */
function StepDetailRow({ step, isLast }: { step: StepDetail; isLast: boolean }) {
  const statusIcon = {
    completed: <CircleCheck className="h-3.5 w-3.5 text-green-500" />,
    waiting: <CircleDot className="h-3.5 w-3.5 animate-pulse text-primary" />,
    failed: <X className="h-3.5 w-3.5 text-destructive" />,
    pending: <Circle className="h-3.5 w-3.5 text-muted-foreground/50" />,
  };

  return (
    <div className="flex items-start gap-2">
      {/* Tree line */}
      <div className="flex flex-col items-center">
        <div className="flex h-5 w-5 items-center justify-center">{statusIcon[step.status]}</div>
        {!isLast && <div className="h-full w-px bg-border" />}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-2">
        <div className="font-medium text-sm">{step.name}</div>
        {step.tools.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {step.tools.map((tool) => (
              <span
                key={tool.name}
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs",
                  tool.status === "approved" && "bg-green-500/10 text-green-500",
                  tool.status === "rejected" && "bg-destructive/10 text-destructive",
                  tool.status === "pending" && "bg-muted text-muted-foreground",
                )}
              >
                {tool.name}{" "}
                {tool.status === "approved" ? "✓" : tool.status === "rejected" ? "✗" : ""}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowExecutionCard({
  workflow,
  execution,
  variant = "compact",
  defaultExpanded = false,
  onExecute,
  onResume,
  onRetry,
  onView,
  onClick,
  showTimestamps = true,
  className,
}: WorkflowExecutionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const status = getDisplayStatus(execution);
  const config = STATUS_CONFIG[status];

  // Can expand if has an execution (running, paused, completed, or failed)
  const canExpand = !!execution && status !== "pending";

  const displayName = workflow.displayName || workflow.name;

  // Determine step progress to show
  // For pending: we need to fetch workflow steps to show empty dots
  const stepProgress = execution?.stepProgress;

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        config.borderColor,
        config.bgColor,
        onClick && "cursor-pointer",
        variant === "card" && "p-4",
        variant === "compact" && "p-3",
        className,
      )}
      onClick={onClick}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status + Info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <StatusIcon status={status} className="mt-0.5 shrink-0" />

          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium text-foreground">{displayName}</h3>
            {workflow.description && (
              <p className="truncate text-muted-foreground text-sm">{workflow.description}</p>
            )}
          </div>
        </div>

        {/* Right: Progress + Action */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Progress indicators */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <StepDots
                stepProgress={stepProgress}
                stepCount={workflow.stepCount}
                status={status}
              />
              <ProgressSummary
                stepProgress={stepProgress}
                toolProgress={execution?.toolProgress}
                status={status}
              />
            </div>
            {status !== "pending" && status !== "completed" && execution?.toolProgress && (
              <ToolProgressBar toolProgress={execution.toolProgress} />
            )}
          </div>

          {/* Action button */}
          <ActionButton
            status={status}
            onExecute={onExecute}
            onResume={onResume}
            onRetry={onRetry}
            onView={onView}
            isExpanded={isExpanded}
            onToggleExpand={() => setIsExpanded(!isExpanded)}
            canExpand={canExpand}
          />
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && canExpand && execution && (
        <ExpandedDetails
          executionId={execution.id}
          startedAt={execution.startedAt}
          completedAt={execution.completedAt}
          error={execution.error}
          showTimestamps={showTimestamps}
        />
      )}
    </div>
  );
}
