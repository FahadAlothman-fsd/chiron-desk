import {
  BookOpenIcon,
  CommandIcon,
  HomeIcon,
  LayoutDashboardIcon,
  WorkflowIcon,
} from "lucide-react";

import type { SidebarNavSection } from "@/components/app-sidebar";

export function buildSidebarSections(pathname: string): SidebarNavSection[] {
  const pathParts = pathname.split("/").filter(Boolean);
  const projectId =
    pathParts[0] === "projects" && pathParts[1] && pathParts[1] !== "new" ? pathParts[1] : null;

  const sections: SidebarNavSection[] = [
    {
      title: "Workspace",
      items: [
        {
          label: "Home",
          to: "/",
          icon: <HomeIcon className="size-4" />,
          isActive: pathname === "/",
        },
        {
          label: "Dashboard",
          to: "/dashboard",
          icon: <LayoutDashboardIcon className="size-4" />,
          isActive: pathname.startsWith("/dashboard"),
        },
      ],
    },
    {
      title: "Methodology Authoring",
      items: [
        {
          label: "Methodologies",
          to: "/methodologies",
          icon: <WorkflowIcon className="size-4" />,
          isActive: pathname.startsWith("/methodologies"),
        },
      ],
    },
    {
      title: "Project Operations",
      items: [
        {
          label: "Projects",
          to: "/projects",
          icon: <BookOpenIcon className="size-4" />,
          isActive: pathname.startsWith("/projects"),
        },
      ],
    },
    ...(projectId
      ? [
          {
            title: "Project Context",
            items: [
              {
                label: "Overview",
                to: `/projects/${projectId}`,
                icon: <LayoutDashboardIcon className="size-4" />,
                isActive: pathname === `/projects/${projectId}`,
              },
              {
                label: "Pinning",
                to: `/projects/${projectId}/pinning`,
                icon: <WorkflowIcon className="size-4" />,
                isActive: pathname.startsWith(`/projects/${projectId}/pinning`),
              },
              {
                label: "Facts",
                to: `/projects/${projectId}/facts`,
                icon: <BookOpenIcon className="size-4" />,
                isActive: pathname.startsWith(`/projects/${projectId}/facts`),
              },
              {
                label: "Work Units",
                icon: <WorkflowIcon className="size-4" />,
                to: `/projects/${projectId}/work-units`,
                isActive: pathname.startsWith(`/projects/${projectId}/work-units`),
              },
              {
                label: "Transitions",
                icon: <CommandIcon className="size-4" />,
                to: `/projects/${projectId}/transitions`,
                isActive: pathname.startsWith(`/projects/${projectId}/transitions`),
              },
              {
                label: "Agents",
                icon: <HomeIcon className="size-4" />,
                to: `/projects/${projectId}/agents`,
                isActive: pathname.startsWith(`/projects/${projectId}/agents`),
              },
            ],
          },
        ]
      : []),
    {
      title: "Planned",
      items: [
        {
          label: "Runtime Execution",
          icon: <CommandIcon className="size-4" />,
          disabled: true,
          badge: "Epic 3+",
        },
        {
          label: "Setup Workflow",
          icon: <WorkflowIcon className="size-4" />,
          disabled: true,
          badge: "Epic 3+",
        },
        {
          label: "Transition Runs",
          icon: <LayoutDashboardIcon className="size-4" />,
          disabled: true,
          badge: "Epic 3+",
        },
      ],
    },
  ];

  return sections;
}
