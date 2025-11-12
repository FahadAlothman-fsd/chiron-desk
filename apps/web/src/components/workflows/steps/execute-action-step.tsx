import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface ExecuteActionStepProps {
	config: {
		type: "execute-action";
		actions: Array<{
			type: string;
			config: Record<string, unknown>;
		}>;
		executionMode: "sequential" | "parallel";
	};
	result?: unknown;
	loading: boolean;
	error?: string;
	onRetry?: () => void;
	onComplete?: (result: unknown) => void;
	onContinue?: () => void; // New: User confirmation callback
}

export function ExecuteActionStep({
	config,
	result,
	loading,
	error,
	onRetry,
	onComplete,
	onContinue,
}: ExecuteActionStepProps) {
	const [showSuccess, setShowSuccess] = useState(false);

	// Show success state when execution completes
	useEffect(() => {
		if (result && !error && !loading) {
			setShowSuccess(true);
		}
	}, [result, error, loading]);

	// Loading state
	if (loading) {
		return (
			<div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
				<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
				<div className="text-muted-foreground text-sm">Executing...</div>
			</div>
		);
	}

	// Success state - wait for user confirmation
	if (showSuccess && result) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
					<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
					<div className="text-green-700 text-sm dark:text-green-300">
						Action completed successfully
					</div>
				</div>
				<div className="flex justify-end">
					<Button onClick={onContinue} size="lg" className="min-w-32">
						Continue
					</Button>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<Alert variant="destructive">
				<AlertDescription className="flex flex-col gap-3">
					<div>{error}</div>
					{onRetry && (
						<Button
							variant="outline"
							size="sm"
							onClick={onRetry}
							className="w-fit"
						>
							Retry
						</Button>
					)}
				</AlertDescription>
			</Alert>
		);
	}

	// Initial state (should start executing immediately)
	return (
		<div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
			<Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
			<div className="text-muted-foreground text-sm">
				Preparing to execute...
			</div>
		</div>
	);
}
