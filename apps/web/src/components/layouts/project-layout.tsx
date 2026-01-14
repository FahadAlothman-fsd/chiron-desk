import { useLocation } from "@tanstack/react-router";
import { type ReactNode, useMemo } from "react";

import { ProjectSidebar } from "@/components/project-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface ProjectLayoutProps {
  children: ReactNode;
  projectName?: string;
}

export function ProjectLayout({ children, projectName }: ProjectLayoutProps) {
  const location = useLocation();

  // Generate breadcrumbs from URL path
  const breadcrumbs = useMemo(() => {
    const pathParts = location.pathname.split("/").filter(Boolean);
    const crumbs: { label: string; href?: string }[] = [];

    // Skip "projects" and project ID, start from the page name
    if (pathParts.length >= 2) {
      // Add project name as first crumb
      crumbs.push({
        label: projectName || "Project",
        href: `/projects/${pathParts[1]}`,
      });

      // Add remaining path parts
      for (let i = 2; i < pathParts.length; i++) {
        const part = pathParts[i];
        const href = `/${pathParts.slice(0, i + 1).join("/")}`;
        const label = part.charAt(0).toUpperCase() + part.slice(1);

        if (i === pathParts.length - 1) {
          // Last item is current page (no link)
          crumbs.push({ label });
        } else {
          crumbs.push({ label, href });
        }
      }
    }

    return crumbs;
  }, [location.pathname, projectName]);

  return (
    <SidebarProvider>
      <ProjectSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <BreadcrumbItem key={crumb.label}>
                  {index > 0 && <BreadcrumbSeparator />}
                  {crumb.href ? (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
