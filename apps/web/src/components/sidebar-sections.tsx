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
  methodologyVersionId?: string | null;
  methodologyVersionLabel?: string | null;
};

export function buildSidebarSections(
  pathname: string,
  scope: SidebarScopeMode,
  context: SidebarContext = {},
): SidebarNavSection[] {
  const projectId = context.projectId ?? null;
  const methodologyId = context.methodologyId ?? null;
  const methodologyVersionId = context.methodologyVersionId ?? null;
  const methodologyVersionLabel = context.methodologyVersionLabel ?? null;

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
    const sections: SidebarNavSection[] = [
      {
        title: "Overview",
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
        ],
      },
    ];

    if (methodologyId && methodologyVersionId && methodologyVersionLabel) {
      sections.push({
        title: methodologyVersionLabel,
        items: [
          {
            label: "Workspace",
            to: `/methodologies/${methodologyId}/versions/${methodologyVersionId}`,
            icon: <LayoutDashboardIcon className="size-4" />,
            isActive:
              pathname === `/methodologies/${methodologyId}/versions/${methodologyVersionId}`,
          },
          {
            label: "Facts",
            to: `/methodologies/${methodologyId}/versions/${methodologyVersionId}/facts`,
            icon: <BookOpenIcon className="size-4" />,
            isActive: pathname.startsWith(
              `/methodologies/${methodologyId}/versions/${methodologyVersionId}/facts`,
            ),
          },
          {
            label: "Work Units",
            to: `/methodologies/${methodologyId}/versions/${methodologyVersionId}/work-units`,
            icon: <WaypointsIcon className="size-4" />,
            isActive: pathname.startsWith(
              `/methodologies/${methodologyId}/versions/${methodologyVersionId}/work-units`,
            ),
          },
          {
            label: "Agents",
            to: `/methodologies/${methodologyId}/versions/${methodologyVersionId}/agents`,
            icon: <WrenchIcon className="size-4" />,
            isActive: pathname.startsWith(
              `/methodologies/${methodologyId}/versions/${methodologyVersionId}/agents`,
            ),
          },
          {
            label: "Dependency Definitions",
            to: `/methodologies/${methodologyId}/versions/${methodologyVersionId}/dependency-definitions`,
            icon: <PackageIcon className="size-4" />,
            isActive: pathname.startsWith(
              `/methodologies/${methodologyId}/versions/${methodologyVersionId}/dependency-definitions`,
            ),
          },
        ],
      });
    }

    return sections;
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
          label: "Guidance",
          to: projectId ? `/projects/${projectId}/transitions` : "/projects",
          icon: <WaypointsIcon className="size-4" />,
          isActive: projectId
            ? pathname.startsWith(`/projects/${projectId}/transitions`) ||
              pathname.startsWith(`/projects/${projectId}/transition-executions`)
            : false,
        },
        {
          label: "Active Workflows",
          to: projectId ? `/projects/${projectId}/workflows` : "/projects",
          icon: <PackageIcon className="size-4" />,
          isActive: projectId
            ? pathname.startsWith(`/projects/${projectId}/workflows`) ||
              pathname.startsWith(`/projects/${projectId}/workflow-executions`)
            : false,
        },
        {
          label: "Artifacts",
          icon: <FolderKanbanIcon className="size-4" />,
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
