interface Project {
	id: string;
	name: string;
	description: string | null;
	createdAt: Date;
}

interface ProjectsListProps {
	projects: Project[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-2xl">Projects</h2>
				<p className="text-muted-foreground text-sm">
					{projects.length} {projects.length === 1 ? "project" : "projects"}
				</p>
			</div>
			<div className="grid gap-4">
				{projects.map((project) => (
					<div
						key={project.id}
						className="rounded-lg border p-4 transition-colors hover:bg-accent"
					>
						<h3 className="font-medium">{project.name}</h3>
						{project.description && (
							<p className="mt-1 text-muted-foreground text-sm">
								{project.description}
							</p>
						)}
						<p className="mt-2 text-muted-foreground text-xs">
							Created {new Date(project.createdAt).toLocaleDateString()}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
