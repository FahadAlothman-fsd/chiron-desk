import { SandboxedAgentStep } from "./steps/sandboxed-agent-step";
import { UserFormStep } from "./steps/user-form-step";
import { DisplayOutputStep } from "./steps/display-output-step";
import { ExecuteActionStep } from "./steps/execute-action-step";
import { InvokeWorkflowStep } from "./steps/invoke-workflow-step";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  goal?: string;
  stepType: string;
  config: Record<string, unknown>;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  projectId: string;
  currentStep: number;
  status: string;
  variables: Record<string, unknown>;
  executedSteps: Record<string, unknown>;
}

export interface StepRendererProps {
  /** Current step configuration */
  step: WorkflowStep;
  /** Workflow execution state */
  execution: WorkflowExecution;
  /** Project ID for context */
  projectId: string;
  /** Dialog handler for child workflow execution (invoke steps) */
  onExecuteWorkflow?: (workflowId: string) => void;
  /** Handler to navigate to a child execution (for viewing completed workflows) */
  onViewExecution?: (executionId: string) => void;
}

export function StepRenderer({
  step,
  execution,
  projectId,
  onExecuteWorkflow,
  onViewExecution,
}: StepRendererProps) {
  // Check if step is complete (for agent steps with tools)
  const isStepComplete =
    step.stepType === "agent" && step.config?.tools && Array.isArray(step.config.tools)
      ? (step.config.tools as Array<{ name: string }>).every((tool) => {
          const approvalStates = execution.variables?.approval_states as Record<
            string,
            { status: string }
          >;
          const toolState = approvalStates?.[tool.name];
          return toolState?.status === "approved";
        })
      : false;

  switch (step.stepType) {
    case "agent":
      return (
        <SandboxedAgentStep
          stepConfig={step.config}
          executionId={execution.id}
          stepId={step.id}
          stepGoal={step.goal}
          stepNumber={step.stepNumber}
          stepName={step.name}
          isStepComplete={isStepComplete}
        />
      );

    case "invoke":
      return (
        <InvokeWorkflowStep
          config={step.config}
          variables={execution.variables}
          onExecuteWorkflow={onExecuteWorkflow}
          onViewExecution={onViewExecution}
        />
      );

    case "form":
      return <UserFormStep stepConfig={step.config} executionId={execution.id} />;

    case "display":
      return <DisplayOutputStep stepConfig={step.config} variables={execution.variables} />;

    case "action":
      return (
        <ExecuteActionStep
          stepConfig={step.config}
          executionId={execution.id}
          projectId={projectId}
        />
      );

    default:
      return (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <div className="text-center">
            <p className="font-medium text-lg">Step type "{step.stepType}" not supported</p>
            <p className="mt-2 text-sm">Please implement a handler for this step type</p>
          </div>
        </div>
      );
  }
}
