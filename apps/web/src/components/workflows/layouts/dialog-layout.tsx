/**
 * Dialog Layout - Story 2.3 Task 7.4
 *
 * Modal overlay layout for child workflows (techniques)
 * - Renders as modal dialog on top of parent workflow
 * - Parent workflow visible behind with dimmed overlay
 * - Step content rendered directly in dialog body (no Timeline wrapper)
 * - Uses WorkflowStepperWizard (bar-style stepper matching parent workflow)
 * - Return to Parent button in footer
 */

import { ArrowLeft, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { WorkflowStepperWizard } from "../steppers/wizard/workflow-stepper-wizard";
import type { StepStatus } from "../types";

interface WorkflowStep {
	id: string;
	stepNumber: number;
	goal: string; // Human-readable step purpose (DB field)
	name?: string; // Optional alias (not in DB)
}

interface DialogLayoutProps {
	/** Child workflow execution */
	execution: {
		id: string;
		workflowId: string;
		currentStepId?: string; // UUID of current step (from DB)
		status: string;
	};
	/** Workflow metadata */
	workflow: {
		displayName: string;
		description?: string;
	};
	/** All workflow steps (for multi-step stepper) */
	steps?: WorkflowStep[];
	/** Current step object (from API) */
	currentStep?: WorkflowStep;
	/** Step content from StepRenderer */
	stepContent: React.ReactNode;
	/** Dialog visibility */
	open: boolean;
	/** Close handler (pauses child execution) */
	onClose: () => void;
}

export function DialogLayout({
	execution,
	workflow,
	steps,
	currentStep,
	stepContent,
	open,
	onClose,
}: DialogLayoutProps) {
	// Show stepper if we have steps (even for single step, for consistency)
	const hasSteps = steps && steps.length > 0;

	// Get current step number from currentStep prop or find from steps array
	const currentStepNumber =
		currentStep?.stepNumber ??
		steps?.find((s) => s.id === execution.currentStepId)?.stepNumber ??
		1;

	// Derive step status for the stepper
	const getStepStatus = (stepNumber: number): StepStatus => {
		if (stepNumber < currentStepNumber) return "completed";
		if (stepNumber === currentStepNumber) return "in-progress";
		return "pending";
	};

	// Debug: Log steps info
	console.log(
		"[DialogLayout] steps:",
		steps?.length,
		"currentStepNumber:",
		currentStepNumber,
	);

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent
				className="!w-[95vw] !max-w-[95vw] flex h-[95vh] flex-col p-0"
				showCloseButton={false}
			>
				{/* Header */}
				<DialogHeader className="border-b p-6 pb-4">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<DialogTitle className="flex items-center gap-2 text-xl">
								{workflow.displayName}
								<Badge variant="outline" className="ml-2 text-xs">
									Child Workflow
								</Badge>
							</DialogTitle>
							{workflow.description && (
								<DialogDescription className="mt-1 text-sm">
									{workflow.description}
								</DialogDescription>
							)}
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8"
							onClick={onClose}
							aria-label="Close dialog"
						>
							<X className="h-4 w-4" />
						</Button>
					</div>

					{/* Bar-style stepper (same as parent workflow) */}
					{hasSteps && steps && (
						<div className="mt-6">
							<WorkflowStepperWizard
								currentStep={currentStepNumber}
								totalSteps={steps.length}
								steps={steps.map((step) => ({
									id: step.id,
									number: step.stepNumber,
									name: step.name || step.goal,
									status: getStepStatus(step.stepNumber),
								}))}
							/>
						</div>
					)}
				</DialogHeader>

				{/* Body: Step Content (no Timeline wrapper) */}
				<div className="flex-1 overflow-auto p-6">{stepContent}</div>

				{/* Footer: Return Button */}
				<div className="border-t p-4">
					<Button
						onClick={onClose}
						variant="outline"
						className="w-full"
						size="lg"
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Return to Parent Workflow
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
