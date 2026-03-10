import {
  BookOpenIcon,
  FolderKanbanIcon,
  HomeIcon,
  LayoutDashboardIcon,
  PackageIcon,
  PinIcon,
  SettingsIcon,
  WaypointsIcon,
  WrenchIcon,
} from "lucide-react";

import type { SidebarNavSection } from "@/components/app-sidebar";

export type SidebarScopeMode = "system" | "methodology" | "project";

type SidebarContext = {
  projectId?: string | null;
  methodologyId?: string | null;
};

export function buildSidebarSections(
  pathname: string,
  scope: SidebarScopeMode,
  context: SidebarContext = {},
): SidebarNavSection[] {
  const projectId = context.projectId ?? null;
  const methodologyId = context.methodologyId ?? null;

  if (scope === "system") {
    return [
      {
        title: "System",
        items: [
          {
            label: "Home",
            to: "/",
            icon: <HomeIcon className="size-4" />,
            isActive: pathname === "/",
          },
          {
            label: "Methodologies",
            to: "/methodologies",
            icon: <WaypointsIcon className="size-4" />,
            isActive: pathname.startsWith("/methodologies"),
          },
          {
            label: "Projects",
            to: "/projects",
            icon: <FolderKanbanIcon className="size-4" />,
            isActive: pathname.startsWith("/projects"),
          },
          {
            label: "Harnesses",
            icon: <WrenchIcon className="size-4" />,
            disabled: true,
          },
          {
            label: "Settings",
            icon: <SettingsIcon className="size-4" />,
            disabled: true,
          },
        ],
      },
    ];
  }

  if (scope === "methodology") {
    return [
      {
        title: "Methodology",
        items: [
          {
            label: "Dashboard",
            to: methodologyId ? `/methodologies/${methodologyId}` : "/methodologies",
            icon: <LayoutDashboardIcon className="size-4" />,
            isActive:
              methodologyId !== null
                ? pathname === `/methodologies/${methodologyId}`
                : pathname === "/methodologies",
          },
          {
            label: "Versions",
            to: methodologyId ? `/methodologies/${methodologyId}/versions` : "/methodologies",
            icon: <PackageIcon className="size-4" />,
            isActive:
              methodologyId !== null
                ? pathname.startsWith(`/methodologies/${methodologyId}/versions`)
                : false,
          },
          {
            label: "Methodology Facts",
            icon: <BookOpenIcon className="size-4" />,
            disabled: true,
          },
          {
            label: "Work Units",
            icon: <WaypointsIcon className="size-4" />,
            disabled: true,
          },
          {
            label: "Artifact Templates",
            icon: <FolderKanbanIcon className="size-4" />,
            disabled: true,
          },
        ],
      },
    ];
  }

  return [
    {
      title: "Project",
      items: [
        {
          label: "Dashboard",
          to: projectId ? `/projects/${projectId}` : "/projects",
          icon: <LayoutDashboardIcon className="size-4" />,
          isActive: projectId ? pathname === `/projects/${projectId}` : pathname === "/projects",
        },
        {
          label: "Project Facts",
          to: projectId ? `/projects/${projectId}/facts` : "/projects",
          icon: <BookOpenIcon className="size-4" />,
          isActive: projectId ? pathname.startsWith(`/projects/${projectId}/facts`) : false,
        },
        {
          label: "Work Units",
          to: projectId ? `/projects/${projectId}/work-units` : "/projects",
          icon: <WaypointsIcon className="size-4" />,
          isActive: projectId ? pathname.startsWith(`/projects/${projectId}/work-units`) : false,
        },
        {
          label: "Artifacts",
          icon: <FolderKanbanIcon className="size-4" />,
          disabled: true,
        },
        {
          label: "Runs / History",
          icon: <PackageIcon className="size-4" />,
          disabled: true,
        },
        {
          label: "Pin / Methodology",
          to: projectId ? `/projects/${projectId}/pinning` : "/projects",
          icon: <PinIcon className="size-4" />,
          isActive: projectId ? pathname.startsWith(`/projects/${projectId}/pinning`) : false,
        },
      ],
    },
  ];
}
