import type { DisplayOutputStepConfig } from "@chiron/db";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DisplayOutputStepProps {
	config: DisplayOutputStepConfig;
	variables: Record<string, unknown>;
	onContinue?: () => void;
}

// Simple template engine
function renderTemplate(template: string, variables: Record<string, unknown>) {
	return template.replace(/{{([^}]+)}}/g, (_, key) => {
		const value = variables[key];

		// If value is undefined/null, return placeholder
		if (value == null) {
			return `{{${key}}}`;
		}

		// If value is an object with a property matching the key name, extract it
		// This handles cases like: project_name: {project_name: "actual value"}
		if (typeof value === "object" && !Array.isArray(value)) {
			const objValue = value as Record<string, unknown>;
			if (key in objValue && typeof objValue[key] === "string") {
				return objValue[key] as string;
			}
		}

		// Otherwise, convert to string
		return String(value);
	});
}

export function DisplayOutputStep({
	config,
	variables,
	onContinue,
}: DisplayOutputStepProps) {
	const navigate = useNavigate();
	const { projectId } = useParams({ from: "/projects/$projectId/initialize" });

	const content = useMemo(() => {
		try {
			// Use simple replacement instead of Handlebars for now
			return renderTemplate(config.contentTemplate, variables);
		} catch (error) {
			return `Error rendering content: ${error instanceof Error ? error.message : "Unknown error"}`;
		}
	}, [config.contentTemplate, variables]);

	const handleContinue = () => {
		if (onContinue) {
			onContinue();
		} else {
			// Fallback for viewing history
			navigate({
				to: "/projects/$projectId",
				params: { projectId },
			});
		}
	};

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col space-y-6">
			<Card>
				<CardContent className="pt-6">
					<Streamdown className="prose dark:prose-invert max-w-none">
						{content}
					</Streamdown>
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Button onClick={handleContinue}>Continue to Project</Button>
			</div>
		</div>
	);
}
