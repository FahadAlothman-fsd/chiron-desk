import { FolderKanban } from "lucide-react";
import { BorderAccent } from "@/components/ui/border-accent";
import { Button } from "@/components/ui/button";

export function ProjectsEmpty() {
	const handleCreateProject = () => {
		// Placeholder per AC7a - no actual project creation in Story 1.3
		console.log("Create Project button clicked (placeholder)");
	};

	return (
		<div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed p-8 text-center">
			<div className="mx-auto flex max-w-md flex-col items-center gap-4">
				<BorderAccent className="flex h-20 w-20 items-center justify-center border border-border">
					<FolderKanban className="h-10 w-10 text-green-500" />
				</BorderAccent>
				<div className="space-y-2">
					<h3 className="font-semibold text-xl">No Projects Yet</h3>
					<p className="text-muted-foreground text-sm">
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
