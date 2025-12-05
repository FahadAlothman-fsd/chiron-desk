/**
 * Workflow Layout Renderer - Story 2.3 Task 7.6
 *
 * Top-level component that routes workflows to the correct layout based on metadata.layoutType:
 * - "wizard" → WizardLayout (linear steps with stepper)
 * - "artifact-workbench" → ArtifactWorkbenchLayout (Timeline + ArtifactPreview)
 * - "dialog" → DialogLayout (modal overlay for child workflows)
 *
 * Architecture:
 * 1. Receives workflow, execution, and current step data
 * 2. Renders StepRenderer to get step content
 * 3. Passes step content to appropriate layout component
 * 4. Layout decides presentation (Timeline wrapper, stepper, etc.)
 */

import { ArtifactWorkbenchLayout } from "./layouts/artifact-workbench-layout";
import { DialogLayout } from "./layouts/dialog-layout";
import { WizardLayout } from "./layouts/wizard-layout";

interface WorkflowStep {
	id: string;
	stepNumber: number;
	goal: string;
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
	outputArtifactType?: string | null;
	tags?: {
		type?: string;
		[key: string]: unknown;
	};
	metadata?: {
		layoutType?: "wizard" | "artifact-workbench" | "dialog";
		[key: string]: unknown;
	};
}

export interface WorkflowLayoutRendererProps {
	/** Workflow definition */
	workflow: Workflow;
	/** Workflow execution state */
	execution: WorkflowExecution;
	/** All workflow steps */
	steps: WorkflowStep[];
	/** Current step data */
	currentStep: WorkflowStep;
	/** Project ID (for StepRenderer) */
	projectId: string;
	/** Step content (pre-rendered by parent) - deprecated for artifact-workbench */
	stepContent?: React.ReactNode;
	/** Handler for execute workflow (invoke-workflow steps) */
	onExecuteWorkflow?: (workflowId: string) => void;
	/** Dialog props (only for dialog layout) */
	dialogProps?: {
		open: boolean;
		onClose: () => void;
	};
}

export function WorkflowLayoutRenderer({
	workflow,
	execution,
	steps,
	currentStep,
	projectId,
	stepContent,
	onExecuteWorkflow,
	dialogProps,
}: WorkflowLayoutRendererProps) {
	// PRIORITY: If dialogProps provided, this is a child workflow - use DialogLayout
	// This takes precedence over metadata.layoutType
	if (dialogProps) {
		return (
			<DialogLayout
				execution={execution}
				workflow={workflow}
				steps={steps}
				stepContent={stepContent!}
				open={dialogProps.open}
				onClose={dialogProps.onClose}
			/>
		);
	}

	// Determine layout type from metadata for parent/standalone workflows
	const layoutType = workflow.metadata?.layoutType || "artifact-workbench";

	// Route to appropriate layout
	switch (layoutType) {
		case "wizard":
			return (
				<WizardLayout
					execution={execution}
					steps={steps}
					stepContent={stepContent!}
				/>
			);

		case "artifact-workbench":
			return (
				<ArtifactWorkbenchLayout
					execution={execution}
					workflow={workflow}
					steps={steps}
					projectId={projectId}
					onExecuteWorkflow={onExecuteWorkflow}
				/>
			);

		case "dialog":
			// Dialog without dialogProps - fallback to step content only
			console.warn(
				"Dialog layout specified but no dialogProps provided, rendering step content directly",
			);
			return <div className="h-full p-8">{stepContent}</div>;

		default:
			console.warn(
				`Unknown layout type: ${layoutType}, falling back to wizard`,
			);
			return (
				<WizardLayout
					execution={execution}
					steps={steps}
					stepContent={stepContent!}
				/>
			);
	}
}
