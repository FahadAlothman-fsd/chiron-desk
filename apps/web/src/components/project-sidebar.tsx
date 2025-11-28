import { useParams } from "@tanstack/react-router";
import {
	Brain,
	FileText,
	LayoutDashboard,
	ListTodo,
	Settings,
	Sparkles,
} from "lucide-react";

import { NavProject } from "@/components/nav-project";
import { NavUser } from "@/components/nav-user";
import { ProjectSwitcher } from "@/components/project-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

// Navigation items for project context
function getNavItems(projectId: string) {
	return [
		{
			title: "Dashboard",
			url: `/projects/${projectId}`,
			icon: LayoutDashboard,
		},
		{
			title: "Workflows",
			url: "#",
			icon: Sparkles,
			items: [
				{
					title: "Brainstorming",
					url: `/projects/${projectId}/workflows/brainstorming`,
				},
				{
					title: "Research",
					url: `/projects/${projectId}/workflows/research`,
				},
				{
					title: "Planning",
					url: `/projects/${projectId}/workflows/planning`,
				},
			],
		},
		{
			title: "Artifacts",
			url: "#",
			icon: FileText,
			items: [
				{
					title: "PRD",
					url: `/projects/${projectId}/artifacts/prd`,
				},
				{
					title: "Architecture",
					url: `/projects/${projectId}/artifacts/architecture`,
				},
				{
					title: "Tech Spec",
					url: `/projects/${projectId}/artifacts/tech-spec`,
				},
			],
		},
		{
			title: "Agents",
			url: "#",
			icon: Brain,
			items: [
				{
					title: "Analyst",
					url: `/projects/${projectId}/agents/analyst`,
				},
				{
					title: "PM",
					url: `/projects/${projectId}/agents/pm`,
				},
				{
					title: "Architect",
					url: `/projects/${projectId}/agents/architect`,
				},
			],
		},
		{
			title: "Backlog",
			url: `/projects/${projectId}/backlog`,
			icon: ListTodo,
		},
		{
			title: "Settings",
			url: `/projects/${projectId}/settings`,
			icon: Settings,
		},
	];
}

// User data (placeholder - should come from auth context)
const userData = {
	name: "Developer",
	email: "dev@chiron.ai",
	avatar: "",
};

export function ProjectSidebar({
	...props
}: React.ComponentProps<typeof Sidebar>) {
	const { projectId } = useParams({ strict: false });

	const navItems = projectId ? getNavItems(projectId) : [];

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<ProjectSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavProject items={navItems} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={userData} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
