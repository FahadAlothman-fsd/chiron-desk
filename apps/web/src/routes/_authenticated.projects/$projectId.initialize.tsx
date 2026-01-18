import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { WorkflowStepperWizard } from "@/components/workflows/steppers/wizard/workflow-stepper-wizard";
import { SandboxedAgentStep } from "@/components/workflows/steps/sandboxed-agent-step";
import { UserFormStep } from "@/components/workflows/steps/user-form-step";
import { DisplayOutputStep } from "@/components/workflows/steps/display-output-step";
import { ExecuteActionStep } from "@/components/workflows/steps/execute-action-step";
import type { WorkflowStepDefinition } from "@/components/workflows/types";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/projects/$projectId/initialize")({
  component: InitializePage,
});

function InitializePage() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const [viewingStepNumber, setViewingStepNumber] = useState<number | null>(null);

  // Get project
  const { data: projectData } = useQuery({
    queryKey: ["projects", "get", projectId],
    queryFn: async () => {
      return trpcClient.projects.get.query({ id: projectId });
    },
  });
  const project = projectData?.project;

  // Get workflow execution for this project (Story 2.1: query by projectId instead of executionId)
  const { data: executionsData, refetch: refetchExecution } = useQuery({
    queryKey: ["workflows", "executionByProject", projectId],
    queryFn: async () => {
      return trpcClient.workflows.getExecutionByProject.query({
        projectId,
      });
    },
    enabled: !!projectId,
    refetchInterval: 2000, // Poll for step transitions
  });

  // Redirect if project is already active AND workflow is completed
  // Don't redirect if there's still a workflow execution in progress (e.g., display-output step)
  useEffect(() => {
    if (project?.status === "active" && executionsData?.execution?.status === "completed") {
      navigate({
        to: "/projects/$projectId",
        params: { projectId },
      });
    }
  }, [project?.status, executionsData?.execution?.status, navigate, projectId]);

  // Get workflow details
  const { data: workflowData } = useQuery({
    queryKey: ["workflows", "getById", project?.initializerWorkflowId],
    queryFn: async () => {
      return trpcClient.workflows.getById.query({
        id: project?.initializerWorkflowId!,
      });
    },
    enabled: !!project?.initializerWorkflowId,
  });

  // Get all workflow steps for step count and history
  const { data: workflowStepsData } = useQuery({
    queryKey: ["workflows", "getSteps", project?.initializerWorkflowId],
    queryFn: async () => {
      return trpcClient.workflows.getSteps.query({
        workflowId: project?.initializerWorkflowId!,
      });
    },
    enabled: !!project?.initializerWorkflowId,
  });

  // Submit step mutation
  const submitStep = useMutation({
    mutationFn: async (input: any) => {
      return trpcClient.workflows.submitStep.mutate(input);
    },
    onSuccess: () => {
      refetchExecution();
    },
    onError: (error: any) => {
      toast.error("Step submission failed", {
        description: error.message,
      });
    },
  });

  // Continue workflow mutation (for auto-executing execute-action steps)
  const continueWorkflow = useMutation({
    mutationFn: async (input: { executionId: string; userId: string }) => {
      return trpcClient.workflows.continue.mutate(input);
    },
    onSuccess: () => {
      refetchExecution();
    },
    onError: (error: any) => {
      toast.error("Workflow execution failed", {
        description: error.message,
      });
    },
  });

  // Auto-execute execute-action steps on mount
  useEffect(() => {
    if (!project || !executionsData || !workflowData || continueWorkflow.isPending) {
      return;
    }

    const { execution, currentStep } = executionsData;

    // Only auto-execute if step is execute-action and status is idle
    if (currentStep?.stepType === "execute-action" && execution.status === "idle") {
      continueWorkflow.mutate({
        executionId: execution.id,
      });
    }
  }, [project, executionsData, workflowData, continueWorkflow.isPending, continueWorkflow.mutate]);

  if (!project || !executionsData || !workflowData || !workflowStepsData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading workflow...</span>
        </div>
      </div>
    );
  }

  const { execution, currentStep: currentStepData } = executionsData;
  const _workflow = workflowData;
  const allWorkflowSteps = workflowStepsData.steps;
  const currentStepNumber = currentStepData?.stepNumber || 1;

  // Build steps for stepper from actual workflow steps
  const steps: WorkflowStepDefinition[] = allWorkflowSteps.map((step) => ({
    id: step.id,
    number: step.stepNumber,
    name: step.goal,
    goal: step.goal,
    status:
      step.stepNumber < currentStepNumber
        ? "completed"
        : step.stepNumber === currentStepNumber
          ? "in-progress"
          : "pending",
  }));

  // Determine which step to display (viewing history or current)
  const displayStepNumber = viewingStepNumber ?? currentStepNumber;
  const displayStepData =
    viewingStepNumber !== null
      ? allWorkflowSteps.find((s) => s.stepNumber === viewingStepNumber)
      : currentStepData;
  const isViewingHistory = viewingStepNumber !== null;
  const isViewingCompletedStep = isViewingHistory && viewingStepNumber < currentStepNumber;

  // Safety check: if displayStepData is null, show error
  if (!displayStepData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6">
        <div className="text-center">
          <h2 className="font-semibold text-lg text-red-500">Error: Step data not found</h2>
          <p className="mt-2 text-muted-foreground">
            Could not find step data for step {displayStepNumber}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden p-6">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-8 overflow-hidden">
        {/* Workflow Stepper */}
        <WorkflowStepperWizard
          currentStep={displayStepNumber}
          totalSteps={allWorkflowSteps.length}
          steps={steps}
          onStepClick={(stepNumber) => {
            // Only allow clicking completed steps
            if (stepNumber < currentStepNumber) {
              setViewingStepNumber(stepNumber);
            }
          }}
        />

        {/* Back to Current Step Button */}
        {isViewingHistory && (
          <div className="flex items-center justify-center">
            <Button variant="outline" size="sm" onClick={() => setViewingStepNumber(null)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Current Step
            </Button>
          </div>
        )}

        {/* Step Content Container - Full height for chat, width adapts to step type */}
        <div
          className={`flex min-h-0 flex-col rounded-lg border bg-card p-6 shadow-sm ${
            displayStepData?.stepType === "ask-user" ? "mx-auto max-w-2xl" : "flex-1"
          }`}
        >
          {/* Read-only banner for completed steps */}
          {isViewingCompletedStep && (
            <div className="mb-4 rounded-md bg-muted p-3 text-center text-muted-foreground text-sm">
              You are viewing a completed step in read-only mode. Changes cannot be made.
            </div>
          )}

          {displayStepData?.stepType === "execute-action" && (
            <ExecuteActionStep
              config={displayStepData.config as any}
              loading={
                !isViewingHistory && (continueWorkflow.isPending || execution.status === "active")
              }
              result={
                isViewingCompletedStep
                  ? execution.executedSteps?.[displayStepNumber]?.output || {}
                  : execution.variables
              }
              error={!isViewingHistory ? execution.error || undefined : undefined}
              onRetry={
                !isViewingHistory
                  ? () => {
                      continueWorkflow.mutate({
                        executionId: execution.id,
                      });
                    }
                  : undefined
              }
              onContinue={
                !isViewingHistory
                  ? () => {
                      submitStep.mutate({
                        executionId: execution.id,
                        userInput: {},
                      });
                    }
                  : undefined
              }
              onComplete={
                !isViewingHistory
                  ? () => {
                      refetchExecution();
                    }
                  : undefined
              }
            />
          )}

          {displayStepData?.stepType === "user-form" && !isViewingHistory && (
            <UserFormStep
              config={displayStepData.config as any}
              loading={submitStep.isPending}
              error={submitStep.error?.message}
              onSubmit={(value) => {
                submitStep.mutate({
                  executionId: execution.id,
                  userInput: value,
                });
              }}
            />
          )}

          {displayStepData?.stepType === "sandboxed-agent" && (
            <SandboxedAgentStep
              executionId={execution.id}
              stepConfig={displayStepData.config as any}
              stepGoal={displayStepData.goal}
              readOnly={isViewingCompletedStep}
              onComplete={() => {
                refetchExecution();
              }}
            />
          )}

          {displayStepData?.stepType === "user-form" && isViewingCompletedStep && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm">Step Goal</h3>
                <p className="text-muted-foreground text-sm">{displayStepData.goal}</p>
              </div>
              <div>
                <h3 className="font-medium text-sm">User Response</h3>
                <div className="mt-2 rounded-md bg-muted p-3">
                  <pre className="text-sm">
                    {JSON.stringify(
                      execution.executedSteps?.[displayStepNumber]?.output || {},
                      null,
                      2,
                    )}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {displayStepData?.stepType === "display-output" && (
            <DisplayOutputStep
              config={displayStepData.config as any}
              variables={execution.variables}
              onContinue={
                !isViewingHistory
                  ? () => {
                      submitStep.mutate({
                        executionId: execution.id,
                        userInput: "continue",
                      });
                    }
                  : undefined
              }
            />
          )}

          {!displayStepData && (
            <div className="text-center text-muted-foreground">
              <p>Loading step...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
