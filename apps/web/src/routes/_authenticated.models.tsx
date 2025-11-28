import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { ModelsDataTable } from "@/components/models/data-table";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/models")({
	component: ModelsPage,
});

function ModelsPage() {
	const modelsQuery = trpc.models.list.useQuery();

	if (modelsQuery.isLoading) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="flex items-center gap-2">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span className="text-muted-foreground">Loading models...</span>
				</div>
			</div>
		);
	}

	if (modelsQuery.isError) {
		return (
			<div className="flex min-h-[400px] items-center justify-center">
				<div className="space-y-2 text-center">
					<p className="text-destructive">Failed to load models</p>
					<button
						onClick={() => modelsQuery.refetch()}
						className="text-muted-foreground text-sm underline"
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
					<div className="space-y-3">
						<h3 className="font-semibold text-xl">No Models Available</h3>
						<p className="text-muted-foreground text-sm">
							Add your OpenRouter API key under Settings to list the models your
							account can access.
						</p>
						<Link
							to="/settings"
							className="font-medium text-primary text-sm underline"
						>
							Go to Settings
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto space-y-4 py-6">
			<div>
				<h1 className="font-semibold text-2xl">LLM Models</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Browse {models.length} available language models from OpenRouter
				</p>
			</div>
			<ModelsDataTable data={models} />
		</div>
	);
}
