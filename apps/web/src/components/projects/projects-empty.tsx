import { useNavigate } from "@tanstack/react-router";
import { FolderKanban, Plus } from "lucide-react";
import { BorderAccent } from "@/components/ui/border-accent";
import { Button } from "@/components/ui/button";

export function ProjectsEmpty() {
  const navigate = useNavigate();

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
        <Button onClick={() => navigate({ to: "/new-project" })} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>
    </div>
  );
}
