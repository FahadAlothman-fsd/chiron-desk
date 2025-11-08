import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { ModelsDataTable } from "@/components/models/data-table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/models")({
	component: ModelsPage,
});

function ModelsPage() {
	// Use OpenRouter public API for all 341+ models (no API key needed)
	const modelsQuery = useQuery(trpc.models.listFromOpenRouter.queryOptions());

	if (modelsQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="flex items-center gap-2">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span className="text-muted-foreground">Loading models...</span>
				</div>
			</div>
		);
	}

	if (modelsQuery.isError) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-center space-y-2">
					<p className="text-destructive">Failed to load models</p>
					<button
						onClick={() => modelsQuery.refetch()}
						className="text-sm text-muted-foreground underline"
					>
						Retry
					</button>
				</div>
			</div>
		);
	}

	const models = modelsQuery.data?.models ?? [];

	if (models.length === 0) {
		return (
			<div className="container mx-auto max-w-6xl">
				<div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
					<div className="space-y-2">
						<h3 className="text-xl font-semibold">No Models Available</h3>
						<p className="text-sm text-muted-foreground">
							Failed to load models from OpenRouter. Please try again later.
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-4 py-6">
			<div>
				<h1 className="text-2xl font-semibold">LLM Models</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Browse {models.length} available language models from OpenRouter
				</p>
			</div>
			<ModelsDataTable data={models} />
		</div>
	);
}
