import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ChevronsUpDown, FolderKanban, Home, Plus } from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { trpcClient } from "@/utils/trpc";

export function ProjectSwitcher() {
	const { isMobile } = useSidebar();
	const navigate = useNavigate();
	const { projectId } = useParams({ strict: false });

	// Fetch all projects
	const { data: projectsData } = useQuery({
		queryKey: ["projects", "list"],
		queryFn: async () => {
			return trpcClient.projects.list.query();
		},
	});

	// Get active projects (status = "active")
	const activeProjects =
		projectsData?.projects.filter((p) => p.status === "active") ?? [];

	// Find current project
	const currentProject = activeProjects.find((p) => p.id === projectId);

	const handleProjectSwitch = (id: string) => {
		navigate({
			to: "/projects/$projectId",
			params: { projectId: id },
		});
	};

	const handleCreateProject = () => {
		navigate({ to: "/" });
	};

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<FolderKanban className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{currentProject?.name ?? "Select Project"}
								</span>
								<span className="truncate text-xs">
									{currentProject ? "Active" : "No project selected"}
								</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-72 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="px-2 text-xs text-muted-foreground">
							Projects
						</DropdownMenuLabel>
						{activeProjects.length === 0 ? (
							<DropdownMenuItem disabled className="text-muted-foreground">
								No active projects
							</DropdownMenuItem>
						) : (
							activeProjects.map((project, index) => (
								<DropdownMenuItem
									key={project.id}
									onClick={() => handleProjectSwitch(project.id)}
									className="flex items-center gap-3 px-2 py-2"
								>
									<div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-muted/50">
										<FolderKanban className="size-4" />
									</div>
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium">{project.name}</div>
										{project.path && (
											<div
												className="truncate text-xs text-muted-foreground"
												title={project.path}
											>
												{project.path.split("/").slice(-2).join("/")}
											</div>
										)}
									</div>
									{index < 9 && (
										<DropdownMenuShortcut className="ml-2 shrink-0">
											{"\u2318"}
											{index + 1}
										</DropdownMenuShortcut>
									)}
								</DropdownMenuItem>
							))
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleCreateProject}
							className="flex items-center gap-3 px-2 py-2"
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-dashed">
								<Plus className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								New Project
							</div>
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => navigate({ to: "/" })}
							className="flex items-center gap-3 px-2 py-2"
						>
							<div className="flex size-8 shrink-0 items-center justify-center rounded-md border">
								<Home className="size-4" />
							</div>
							<div className="font-medium text-muted-foreground">
								All Projects
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
