import {
  BookOpenIcon,
  CommandIcon,
  HomeIcon,
  LayoutDashboardIcon,
  WorkflowIcon,
} from "lucide-react";

import type { SidebarNavSection } from "@/components/app-sidebar";

export function buildSidebarSections(pathname: string): SidebarNavSection[] {
  return [
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
}
