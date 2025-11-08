import { createFileRoute } from "@tanstack/react-router";
import { trpc } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";
import { ProjectsEmpty } from "@/components/projects/projects-empty";
import { ProjectsList } from "@/components/projects/projects-list";

export const Route = createFileRoute("/_authenticated/")({
	component: HomeComponent,
});

function HomeComponent() {
	const projectsQuery = useQuery(trpc.projects.list.queryOptions());

	if (projectsQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<p className="text-muted-foreground">Loading projects...</p>
			</div>
		);
	}

	if (projectsQuery.isError) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
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
		<div className="container mx-auto max-w-4xl">
			{projects.length === 0 ? (
				<ProjectsEmpty />
			) : (
				<ProjectsList projects={projects} />
			)}
		</div>
	);
}
