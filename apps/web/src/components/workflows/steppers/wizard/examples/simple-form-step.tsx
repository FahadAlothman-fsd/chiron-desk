import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkflowStepDefinition } from "../../../types";
import { WizardStepContainer } from "../wizard-step-container";

/**
 * SimpleFormStep - Example step content component
 * Demonstrates how to use WizardStepContainer with a simple form
 */

export interface SimpleFormStepProps {
	step: WorkflowStepDefinition;
	onComplete: (data: { projectName: string }) => void;
	onBack?: () => void;
}

export function SimpleFormStep({
	step,
	onComplete,
	onBack,
}: SimpleFormStepProps) {
	const [projectName, setProjectName] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async () => {
		setIsSubmitting(true);

		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 500));

		onComplete({ projectName });
		setIsSubmitting(false);
	};

	const canContinue = projectName.trim().length > 0;

	return (
		<WizardStepContainer
			step={step}
			onNext={handleSubmit}
			onBack={onBack}
			isLoading={isSubmitting}
			canContinue={canContinue}
		>
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="projectName">Project Name</Label>
					<Input
						id="projectName"
						placeholder="Enter project name"
						value={projectName}
						onChange={(e) => setProjectName(e.target.value)}
						disabled={isSubmitting}
					/>
					<p className="text-muted-foreground text-sm">
						Give your project a descriptive name
					</p>
				</div>
			</div>
		</WizardStepContainer>
	);
}
