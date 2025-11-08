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
				<h2 className="text-2xl font-semibold">Projects</h2>
				<p className="text-sm text-muted-foreground">
					{projects.length} {projects.length === 1 ? "project" : "projects"}
				</p>
			</div>
			<div className="grid gap-4">
				{projects.map((project) => (
					<div
						key={project.id}
						className="rounded-lg border p-4 hover:bg-accent transition-colors"
					>
						<h3 className="font-medium">{project.name}</h3>
						{project.description && (
							<p className="mt-1 text-sm text-muted-foreground">
								{project.description}
							</p>
						)}
						<p className="mt-2 text-xs text-muted-foreground">
							Created {new Date(project.createdAt).toLocaleDateString()}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}
