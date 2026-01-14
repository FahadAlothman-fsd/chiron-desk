import { createFileRoute } from "@tanstack/react-router";
import { ProjectsEmpty } from "@/components/projects/projects-empty";
import { ProjectsList } from "@/components/projects/projects-list";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/")({
  component: HomeComponent,
});

function HomeComponent() {
  const projectsQuery = trpc.projects.list.useQuery();

  if (projectsQuery.isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">Loading projects...</p>
      </div>
    );
  }

  if (projectsQuery.isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-destructive">Failed to load projects</p>
      </div>
    );
  }

  const projects = (projectsQuery.data?.projects ?? []) as Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }>;

  return (
    <div className="container mx-auto my-auto max-w-4xl">
      {projects.length === 0 ? <ProjectsEmpty /> : <ProjectsList projects={projects} />}
    </div>
  );
}
