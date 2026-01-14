import type { InvokeWorkflowStepConfig } from "@chiron/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/utils/trpc";
import {
  type ExecutionInfo,
  WorkflowExecutionCard,
  type WorkflowInfo,
} from "../workflow-execution-card";

/**
 * InvokeWorkflowStep - Workflows List UI Component
 * Story 2.3 Task 6: Displays child workflows with execution status
 *
 * Uses the reusable WorkflowExecutionCard component to show:
 * - Status indicators (Pending, Running, Completed, Failed)
 * - Step progress dots and tool progress bar
 * - [Execute] button to launch child workflow dialog
 * - Expandable details view
 * - Support for parallel execution
 */

interface InvokeWorkflowStepProps {
  config: InvokeWorkflowStepConfig;
  variables: Record<string, unknown>;
  onExecuteWorkflow?: (workflowId: string) => void;
  onViewExecution?: (executionId: string) => void;
}

interface ChildExecutionMetadata {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "idle" | "active" | "paused" | "completed" | "failed";
  createdAt: string;
  generatedIdeasSnapshot?: unknown[];
  stepProgress?: { current: number; total: number; completed: number } | null;
  toolProgress?: { approved: number; total: number } | null;
}

export function InvokeWorkflowStep({
  config,
  variables,
  onExecuteWorkflow,
  onViewExecution,
}: InvokeWorkflowStepProps) {
  // Get workflow IDs to invoke from config
  const workflowIdsToInvoke = variables[
    config.workflowsToInvoke.replace(/{{|}}/g, "").trim()
  ] as string[];

  // Fetch workflow details for all workflow IDs
  const { data: workflowsData } = trpc.workflows.getByIds.useQuery(
    {
      workflowIds: workflowIdsToInvoke || [],
    },
    {
      enabled: !!workflowIdsToInvoke && workflowIdsToInvoke.length > 0,
    },
  );

  // Get child execution metadata from parent variables
  const childMetadata = (variables._child_metadata || []) as ChildExecutionMetadata[];
  const failedChildren = (variables._failed_children || []) as Array<{
    id: string;
    workflowId: string;
    workflowName: string;
    error: string;
  }>;

  // Poll for real-time child execution status updates
  const { data: liveChildExecutions } = trpc.workflows.getExecutionsByIds.useQuery(
    {
      executionIds: childMetadata.map((c) => c.id),
    },
    {
      enabled: childMetadata.length > 0,
      refetchInterval: 2000, // Poll every 2 seconds for status updates
    },
  );

  // Merge live status into child metadata
  const updatedChildMetadata = childMetadata.map((child) => {
    const liveData = liveChildExecutions?.find((e) => e.id === child.id);
    if (!liveData) return child;

    return {
      ...child,
      status: liveData.status as ChildExecutionMetadata["status"],
      error: liveData.error,
      stepProgress: liveData.stepProgress,
      toolProgress: liveData.toolProgress,
    };
  });

  if (!workflowIdsToInvoke || !Array.isArray(workflowIdsToInvoke)) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">No workflows configured to invoke.</p>
        </CardContent>
      </Card>
    );
  }

  // Map workflow IDs to WorkflowExecutionCard props
  const workflowItems = workflowIdsToInvoke.map((workflowId) => {
    const childExecution = updatedChildMetadata.find((child) => child.workflowId === workflowId);
    const failed = failedChildren.find((child) => child.workflowId === workflowId);
    const workflowInfo = workflowsData?.find((w) => w.id === workflowId);

    // Build workflow info
    const workflow: WorkflowInfo = {
      id: workflowId,
      name:
        childExecution?.workflowName ||
        failed?.workflowName ||
        workflowInfo?.name ||
        "Unknown Workflow",
      displayName:
        childExecution?.workflowName ||
        failed?.workflowName ||
        workflowInfo?.displayName ||
        workflowInfo?.name,
      description: workflowInfo?.description ?? undefined,
      stepCount: workflowInfo?.stepCount,
    };

    // Build execution info (null if not started)
    let execution: ExecutionInfo | null = null;

    if (failed) {
      // Failed execution
      execution = {
        id: failed.id,
        status: "failed",
        error: failed.error,
      };
    } else if (childExecution) {
      // Has execution record
      execution = {
        id: childExecution.id,
        status: childExecution.status,
        startedAt: childExecution.createdAt,
        stepProgress: childExecution.stepProgress,
        toolProgress: childExecution.toolProgress,
      };
    }

    return { workflow, execution };
  });

  const handleExecute = (workflowId: string) => {
    if (onExecuteWorkflow) {
      onExecuteWorkflow(workflowId);
    }
  };

  // Calculate summary stats
  const completedCount = workflowItems.filter(
    (item) => item.execution?.status === "completed",
  ).length;
  const failedCount = failedChildren.length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Execute Brainstorming Techniques</CardTitle>
          <p className="text-muted-foreground text-sm">
            Click Execute to start each technique. Techniques can run in parallel.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflowItems.map(({ workflow, execution }) => (
              <WorkflowExecutionCard
                key={workflow.id}
                workflow={workflow}
                execution={execution}
                variant="compact"
                onExecute={() => handleExecute(workflow.id)}
                onResume={() => handleExecute(workflow.id)}
                onRetry={() => handleExecute(workflow.id)}
                onView={
                  execution?.id && onViewExecution ? () => onViewExecution(execution.id) : undefined
                }
                showTimestamps={true}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
        <div className="text-sm">
          <span className="text-muted-foreground">Progress: </span>
          <span className="font-medium text-foreground">
            {completedCount} / {workflowItems.length} completed
          </span>
        </div>
        {failedCount > 0 && <div className="text-destructive text-sm">{failedCount} failed</div>}
      </div>
    </div>
  );
}
