import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: "initializing" | "active" | "archived" | "failed";
  createdAt: Date;
}

interface ProjectsListProps {
  projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const navigate = useNavigate();

  const handleProjectClick = (project: Project) => {
    if (project.status === "initializing") {
      // Resume initialization workflow
      navigate({
        to: "/projects/$projectId/initialize",
        params: { projectId: project.id },
      });
    } else if (project.status === "active") {
      // Go to project dashboard
      navigate({
        to: "/projects/$projectId",
        params: { projectId: project.id },
      });
    }
    // Don't navigate if archived or failed (show status only)
  };

  const getStatusBadge = (status: Project["status"]) => {
    switch (status) {
      case "initializing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Initializing
          </Badge>
        );
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-2xl">Projects</h2>
        <Button onClick={() => navigate({ to: "/new-project" })} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>
      <div className="grid gap-4">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => handleProjectClick(project)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleProjectClick(project);
              }
            }}
            role="button"
            tabIndex={0}
            className="cursor-pointer rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-medium">{project.name}</h3>
              {getStatusBadge(project.status)}
            </div>
            {project.description && (
              <p className="mt-1 text-muted-foreground text-sm">{project.description}</p>
            )}
            <p className="mt-2 text-muted-foreground text-xs">
              Created {new Date(project.createdAt).toLocaleDateString()}
            </p>
            {project.status === "initializing" && (
              <p className="mt-1 text-blue-600 text-xs dark:text-blue-400">Click to resume setup</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
