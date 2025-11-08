import { FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ProjectsEmpty() {
	const handleCreateProject = () => {
		// Placeholder per AC7a - no actual project creation in Story 1.3
		console.log("Create Project button clicked (placeholder)");
	};

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4">
				<div className="flex h-20 w-20 items-center justify-center rounded-lg border bg-muted">
					<FolderKanban className="h-10 w-10 text-muted-foreground" />
				</div>
				<div className="space-y-2">
					<h3 className="text-xl font-semibold">No Projects Yet</h3>
					<p className="text-sm text-muted-foreground">
						Create your first project to start using Chiron's AI workflows.
					</p>
				</div>
				<Button onClick={handleCreateProject} size="lg">
					Create Project
				</Button>
			</div>
		</div>
	);
}
